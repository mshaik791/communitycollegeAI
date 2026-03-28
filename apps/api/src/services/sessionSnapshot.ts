import { prisma } from "../db/prisma";

export async function getSessionSnapshot(sessionId: string) {
  const session = await prisma.studentSession.findUnique({
    where: { id: sessionId },
    include: {
      barrierEvents: {
        orderBy: { createdAt: "asc" },
      },
      chatMessages: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      callbackRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    return null;
  }

  const lastCallback = session.callbackRequests[0] ?? null;

  return {
    session: {
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      studentPhone: session.studentPhone,
      language: session.language,
      persona: session.persona,
      status: session.status,
      riskScore: session.riskScore,
      sentimentStart: session.sentimentStart,
      sentimentEnd: session.sentimentEnd,
      withdrawIntent: session.withdrawIntent,
      withdrawPrevented: session.withdrawPrevented,
      chatRecommended: session.chatRecommended,
      transcriptText: session.transcriptText,
      summaryText: session.summaryText,
      emotionalInsight: session.emotionalInsight,
    },
    barriers: session.barrierEvents,
    chatMessages: session.chatMessages,
    callback: lastCallback,
  };
}

export type SessionSnapshot = Awaited<ReturnType<typeof getSessionSnapshot>>;

