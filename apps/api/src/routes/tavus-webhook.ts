/*
  Tavus Webhook Handler
  ─────────────────────
  Tavus fires callbacks to the URL passed as `callback_url` when creating a
  conversation (POST /v2/conversations).

  Events handled:
    application.transcription_ready   — full transcript in properties.transcript
    application.perception_analysis   — visual/emotional analysis in properties
    system.replica_joined             — avatar entered the call (logged only)
    system.shutdown                   — call ended (logged only)

  Local dev: run `ngrok http 4000` and set TAVUS_WEBHOOK_URL in apps/web/.env.local
  Production: set TAVUS_WEBHOOK_URL to your public API domain
*/

import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db/prisma";
import { getIo } from "../socket/io";
import { getSessionSnapshot } from "../services/sessionSnapshot";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────

export type TavusPerception = {
  user_appearance?: string;
  userAppearance?: string;
  environment?: string;
  user_behavior_and_gaze?: string;
  userBehaviorAndGaze?: string;
  behavior?: string;
  emotional_arc?: string;
  emotionalArc?: string;
  emotional_arc_and_interaction?: string;
};

export type TavusConversationData = {
  transcript?: unknown;
  transcription?: unknown;
  perception_analysis?: TavusPerception;
  perceptionAnalysis?: TavusPerception;
  raven_analysis?: TavusPerception;
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** Build readable conversation text from a raw Tavus transcript array */
export function formatTranscript(raw: unknown): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    return raw
      .filter((t: { role: string }) => t.role !== "system")
      .map((t: { role: string; content: string }) =>
        `${t.role === "assistant" ? "Counselor" : "Student"}: ${t.content}`,
      )
      .join("\n");
  }
  return String(raw);
}

/** Pull perception sections out of a Tavus response object */
export function extractPerceptionText(data: TavusConversationData): string {
  const perception =
    data.perception_analysis ??
    data.perceptionAnalysis ??
    data.raven_analysis ??
    null;

  if (!perception) return "";

  const sections: string[] = [];

  const appearance = perception.user_appearance ?? perception.userAppearance;
  if (appearance) sections.push(`USER APPEARANCE:\n${appearance}`);

  if (perception.environment) sections.push(`ENVIRONMENT:\n${perception.environment}`);

  const behavior =
    perception.user_behavior_and_gaze ??
    perception.userBehaviorAndGaze ??
    perception.behavior;
  if (behavior) sections.push(`BEHAVIOR & GAZE:\n${behavior}`);

  const emotional =
    perception.emotional_arc ??
    perception.emotionalArc ??
    perception.emotional_arc_and_interaction;
  if (emotional) sections.push(`EMOTIONAL ARC:\n${emotional}`);

  return sections.join("\n\n");
}

// ── GET — browser reachability check ──────────────────────────────────────

router.get("/webhook/tavus", (_req, res) => {
  res.json({
    ok: true,
    message: "Tavus webhook endpoint is live",
    events_handled: [
      "application.transcription_ready",
      "application.perception_analysis",
      "system.replica_joined",
      "system.shutdown",
    ],
  });
});

// ── POST — main webhook handler ────────────────────────────────────────────

router.post("/webhook/tavus", (req, res) => {
  // Tavus requires an immediate 200 — acknowledge before any async work
  res.json({ status: "success" });

  const { conversation_id, event_type, properties } = req.body as {
    conversation_id: string;
    event_type: string;
    properties?: Record<string, unknown>;
  };

  // eslint-disable-next-line no-console
  console.log(`Tavus webhook: ${event_type} | conversation: ${conversation_id}`);

  // Handle asynchronously without blocking the response
  void handleWebhookEvent(conversation_id, event_type, properties ?? {});
});

// ── Async event processing ─────────────────────────────────────────────────

async function handleWebhookEvent(
  conversation_id: string,
  event_type: string,
  properties: Record<string, unknown>,
) {
  try {
    // ── Transcript ready — main retention flow ──────────────────────────
    if (event_type === "application.transcription_ready") {
      const rawTranscript = properties.transcript ?? [];
      const transcriptText = formatTranscript(rawTranscript);

      if (!transcriptText.trim()) {
        // eslint-disable-next-line no-console
        console.log("Empty transcript for conversation:", conversation_id);
        return;
      }

      // eslint-disable-next-line no-console
      console.log(`Transcript ready — length: ${transcriptText.length} chars`);

      // Find the session (by tavusConversationId, or fall back to most recent)
      let session = await prisma.studentSession.findFirst({
        where: { tavusConversationId: conversation_id },
        include: { barrierEvents: true },
      });

      if (!session) {
        session = await prisma.studentSession.findFirst({
          where: { status: "STARTED" },
          orderBy: { createdAt: "desc" },
          include: { barrierEvents: true },
        });
      }

      if (!session) {
        // eslint-disable-next-line no-console
        console.log("No session found for conversation:", conversation_id);
        return;
      }

      // Save transcript immediately so staff can see it even if analysis is slow
      await prisma.studentSession.update({
        where: { id: session.id },
        data: { transcriptText, tavusConversationId: conversation_id },
      });

      // Run Claude analysis (perception text may arrive separately via perception_analysis)
      const perceptionText = session.perceptionData ?? "";
      const analysis = await analyzeTranscript(transcriptText, session.id, perceptionText || undefined);

      const fullSummary = [
        analysis.caseSummary,
        "",
        "NEXT STEPS:",
        ...analysis.nextSteps.map((s: string, i: number) => `${i + 1}. ${s}`),
      ].join("\n");

      await prisma.studentSession.update({
        where: { id: session.id },
        data: {
          riskScore: analysis.riskScore,
          summaryText: fullSummary,
          status: "COMPLETED",
          emotionalInsight: analysis.emotionalInsight || null,
        },
      });

      // Save detected barriers (upsert avoids duplicate-key errors on re-analysis)
      for (const b of analysis.barriers ?? []) {
        await prisma.barrierEvent.upsert({
          where: { sessionId_code: { sessionId: session!.id, code: b.code } },
          update: { severity: b.severity, notes: b.notes ?? null },
          create: { sessionId: session!.id, code: b.code, severity: b.severity, notes: b.notes ?? null },
        });
      }

      // Push real-time update to staff dashboard
      try {
        const io = getIo();
        const snapshot = await getSessionSnapshot(session.id);
        if (snapshot) io.to("staff").emit("session:update", snapshot);
        io.to("staff").emit("analysis:complete", {
          sessionId: session.id,
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

      // eslint-disable-next-line no-console
      console.log(`✅ Analysis complete | session: ${session.id} | risk: ${analysis.riskScore}`);
    }

    // ── Perception analysis — save visual/emotional data ────────────────
    if (event_type === "application.perception_analysis") {
      // eslint-disable-next-line no-console
      console.log("Perception analysis received for:", conversation_id);

      const session = await prisma.studentSession.findFirst({
        where: { tavusConversationId: conversation_id },
      });

      if (session) {
        await prisma.studentSession.update({
          where: { id: session.id },
          data: { perceptionData: JSON.stringify(properties) },
        });
        // eslint-disable-next-line no-console
        console.log("✅ Perception data saved for session:", session.id);
      }
    }

    // ── Informational events (log only) ─────────────────────────────────
    if (event_type === "system.replica_joined") {
      // eslint-disable-next-line no-console
      console.log("Replica joined conversation:", conversation_id);
    }

    if (event_type === "system.shutdown") {
      const reason = (properties.shutdown_reason as string | undefined) ?? "unknown";
      // eslint-disable-next-line no-console
      console.log(`Conversation shutdown: ${conversation_id} | reason: ${reason}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Webhook processing error:", error);
  }
}

// ── Claude analysis (exported for reuse in analyze.ts) ────────────────────

export interface AnalysisResult {
  riskScore: number;
  riskLabel: string;
  studentLanguage: string;
  caseSummary: string;
  emotionalInsight: string;
  barriers: { code: string; severity: string; notes: string }[];
  nextSteps: string[];
  urgency: string;
  strengths: string;
  recommendedAvatar: string;
  perceptionHighlights: string;
}

export async function analyzeTranscript(
  transcriptText: string,
  _sessionId: string,
  perceptionText?: string,
): Promise<AnalysisResult> {
  const prompt = `You are an expert student retention analyst at NOCE community college in Anaheim, California.

You have received data from a conversation between an AI counselor and a student who was considering withdrawing from their classes.

This data includes:
1. The conversation transcript
2. AI perception analysis of the student's visual behavior and emotional state during the call (from computer vision — Raven-1)

Use BOTH sources together for a more accurate and human assessment.
The perception data reveals non-verbal cues the transcript cannot capture.

CONVERSATION TRANSCRIPT:
${transcriptText || "No transcript available yet."}

${perceptionText ? `AI PERCEPTION ANALYSIS (visual + emotional data from the session):
${perceptionText}` : ""}

Instructions:
- If the transcript is not in English, translate internally then analyze
- Always respond in English
- Use perception data to enrich your assessment — emotional arc, gaze patterns, and behavior are strong indicators of genuine distress vs surface-level concern
- Note the language the student spoke

Respond ONLY with valid JSON, no other text:
{
  "riskScore": <number 0-100, where 100 = certain dropout>,
  "riskLabel": "<Low|Moderate|High|Critical>",
  "studentLanguage": "<language the student primarily spoke>",
  "caseSummary": "<2-3 sentences in plain English. Include student situation, main concern, and emotional state from both transcript AND visual perception data>",
  "emotionalInsight": "<1-2 sentences specifically from the perception analysis — what did their body language and emotional arc reveal that the words alone did not? If no perception data, write 'No visual data available for this session.'>",
  "barriers": [
    {
      "code": "<WORK|FAMILY|FINANCIAL|MENTAL_HEALTH|TRANSPORT|HEALTH|DIGITAL_LITERACY|IMMIGRATION_FEAR|MOTIVATION|OTHER>",
      "severity": "<LOW|MEDIUM|HIGH>",
      "notes": "<specific detail from transcript or perception data>"
    }
  ],
  "nextSteps": [
    "<concrete step for counselor — be specific, e.g. 'Call student within 24 hours about CARE emergency fund'>",
    "<second step>",
    "<third step>"
  ],
  "urgency": "<ROUTINE|FOLLOW_UP_SOON|URGENT|CRISIS>",
  "strengths": "<positive factors from both transcript and visual behavior that could help retain this student>",
  "recommendedAvatar": "<Navi|Sofi|Marco|Luna|Alex and why>",
  "perceptionHighlights": "<2-3 key observations from the visual/emotional data most relevant to retention risk. If no perception data, write 'No visual data available.'>"
}`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  const clean = content.text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as AnalysisResult;
}

export default router;
