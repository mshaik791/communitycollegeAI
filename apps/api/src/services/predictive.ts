import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db/prisma";

// Suppress unused variable — Anthropic kept for future predictive AI scoring
const _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runPredictiveAnalysis(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("🔮 Running predictive dropout analysis...");

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Sessions that started but never got an AI analysis
  const unanalyzedSessions = await prisma.studentSession.findMany({
    where: {
      status: "STARTED",
      riskScore: 0,
      createdAt: { gte: sevenDaysAgo },
    },
    include: { barrierEvents: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // High-risk sessions with no follow-up scheduled
  const highRiskNoFollowUp = await prisma.studentSession.findMany({
    where: {
      riskScore: { gte: 70 },
      status: "COMPLETED",
      followUps: { none: {} },
      createdAt: { gte: sevenDaysAgo },
    },
    include: { barrierEvents: true, followUps: true },
  });

  // eslint-disable-next-line no-console
  console.log(`  Found ${unanalyzedSessions.length} sessions needing analysis`);
  // eslint-disable-next-line no-console
  console.log(`  Found ${highRiskNoFollowUp.length} high-risk sessions with no follow-up`);

  // Flag unanalyzed sessions based on behavioural signals
  for (const session of unanalyzedSessions) {
    const hourCreated = new Date(session.createdAt).getHours();
    const isLateNight = hourCreated >= 22 || hourCreated <= 6;
    const isStale = session.createdAt < twentyFourHoursAgo;

    if (isLateNight || isStale) {
      const predictiveScore = isLateNight && isStale ? 55 : 35;
      const reason = [
        isLateNight ? "Late-night contact attempt." : "",
        isStale ? "No follow-through after initial contact." : "",
      ]
        .filter(Boolean)
        .join(" ");

      await prisma.studentSession.update({
        where: { id: session.id },
        data: {
          riskScore: predictiveScore,
          summaryText: `[PREDICTIVE FLAG] Session shows early risk signals: ${reason} Recommend proactive outreach.`,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`  🚩 Flagged session ${session.id} | Predictive score: ${predictiveScore}`);
    }
  }

  // Log high-risk sessions needing a follow-up call
  if (highRiskNoFollowUp.length > 0) {
    // eslint-disable-next-line no-console
    console.log("  ⚠️  HIGH RISK WITH NO FOLLOW-UP:");
    for (const s of highRiskNoFollowUp) {
      // eslint-disable-next-line no-console
      console.log(`    - ${s.id} | Risk: ${s.riskScore} | ${s.studentName ?? "Anonymous"} | ${s.createdAt.toLocaleDateString()}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log("✅ Predictive analysis complete");
}
