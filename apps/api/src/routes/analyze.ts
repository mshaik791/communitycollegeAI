import { Router } from "express";
import { prisma } from "../db/prisma";
import { getIo } from "../socket/io";
import { getSessionSnapshot } from "../services/sessionSnapshot";
import { sendCounselorAlert } from "../services/emailAlert";
import { logToStarfish } from "../services/starfish";
import {
  analyzeTranscript,
  extractPerceptionText,
  formatTranscript,
  type TavusConversationData,
} from "./tavus-webhook";

const router = Router();

/**
 * POST /v1/session/:id/analyze
 * Manually trigger Claude analysis for a session.
 * Optionally fetch the transcript and perception data from Tavus
 * if a conversationId is provided.
 */
router.post("/session/:id/analyze", async (req, res) => {
  const { id } = req.params;
  const { tavusConversationId } = req.body as { tavusConversationId?: string };

  try {
    const session = await prisma.studentSession.findUnique({
      where: { id },
      include: { barrierEvents: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    let transcriptText = session.transcriptText ?? null;
    let perceptionText = session.perceptionData ?? "";

    // Fetch fresh data from Tavus if a conversation ID was provided
    if (tavusConversationId) {
      const tavusRes = await fetch(
        `https://tavusapi.com/v2/conversations/${tavusConversationId}`,
        {
          headers: {
            "x-api-key": process.env.TAVUS_API_KEY ?? "",
            "Content-Type": "application/json",
          },
        },
      );

      if (tavusRes.ok) {
        const tavusData = (await tavusRes.json()) as TavusConversationData;

        // Transcript — use fresh if we don't already have one
        if (!transcriptText) {
          const raw = tavusData.transcript ?? tavusData.transcription;
          if (raw) transcriptText = formatTranscript(raw);
        }

        // Always try to enrich with fresh perception data
        const freshPerception = extractPerceptionText(tavusData);
        if (freshPerception) perceptionText = freshPerception;

        // eslint-disable-next-line no-console
        console.log(`Perception data fetched for session ${id}:`, !!freshPerception);
      } else {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch Tavus conversation:", await tavusRes.text());
      }
    }

    if (!transcriptText) {
      return res.status(400).json({
        error: "No transcript available. Provide a tavusConversationId or ensure the session has transcriptText.",
      });
    }

    // Run Claude analysis with perception data
    const analysis = await analyzeTranscript(transcriptText, id, perceptionText || undefined);

    const fullSummary = [
      analysis.caseSummary,
      "",
      "NEXT STEPS:",
      ...analysis.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");

    // Persist to DB
    await prisma.studentSession.update({
      where: { id },
      data: {
        transcriptText,
        riskScore: analysis.riskScore,
        summaryText: fullSummary,
        status: "COMPLETED",
        perceptionData: perceptionText || null,
        emotionalInsight: analysis.emotionalInsight || null,
        ...(tavusConversationId ? { tavusConversationId } : {}),
      },
    });

    // Upsert barriers — avoids duplicate-key errors when re-analyzing the same session
    for (const b of analysis.barriers ?? []) {
      await prisma.barrierEvent.upsert({
        where: { sessionId_code: { sessionId: id, code: b.code } },
        update: { severity: b.severity, notes: b.notes ?? null },
        create: { sessionId: id, code: b.code, severity: b.severity, notes: b.notes ?? null },
      });
    }

    // Fire-and-forget: email alert + Starfish logging
    sendCounselorAlert({
      sessionId: id,
      riskScore: analysis.riskScore,
      riskLabel: analysis.riskLabel,
      studentName: session.studentName,
      caseSummary: analysis.caseSummary,
      barriers: analysis.barriers,
      nextSteps: analysis.nextSteps,
      emotionalInsight: analysis.emotionalInsight ?? null,
      urgency: analysis.urgency,
    }).catch(console.error);

    logToStarfish({
      sessionId: id,
      studentName: session.studentName,
      riskScore: analysis.riskScore,
      barriers: analysis.barriers,
      caseSummary: analysis.caseSummary,
      nextSteps: analysis.nextSteps,
    }).catch(console.error);

    // Push real-time update to staff dashboard
    try {
      const io = getIo();
      const snapshot = await getSessionSnapshot(id);
      if (snapshot) io.to("staff").emit("session:update", snapshot);
      io.to("staff").emit("analysis:complete", {
        sessionId: id,
        riskScore: analysis.riskScore,
        riskLabel: analysis.riskLabel,
        barriers: analysis.barriers,
        nextSteps: analysis.nextSteps,
        caseSummary: analysis.caseSummary,
        urgency: analysis.urgency,
        strengths: analysis.strengths,
        recommendedAvatar: analysis.recommendedAvatar,
        emotionalInsight: analysis.emotionalInsight,
        perceptionHighlights: analysis.perceptionHighlights,
      });
    } catch {
      // Socket not initialized — non-fatal
    }

    return res.json({ success: true, analysis, sessionId: id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Analysis error:", error);
    return res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
