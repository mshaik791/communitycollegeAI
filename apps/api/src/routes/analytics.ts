import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";

const router = Router();

const summaryQuerySchema = z.object({
  range: z.enum(["7d", "30d", "all"]).optional().default("7d"),
});

const sessionsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 50))
    .pipe(z.number().int().positive().max(200)),
});

function parseRange(range: string | undefined): Date | null {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

// GET /v1/analytics/summary
router.get(
  "/summary",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { range } = summaryQuerySchema.parse(req.query);
      const since = parseRange(range);

      const whereSessions: Prisma.StudentSessionWhereInput = since
        ? { createdAt: { gte: since } }
        : {};

      // Total sessions & avg risk
      const [count, avgRisk, statusCounts] = await Promise.all([
        prisma.studentSession.count({ where: whereSessions }),
        prisma.studentSession.aggregate({
          _avg: { riskScore: true },
          where: whereSessions,
        }),
        prisma.studentSession.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: whereSessions,
        }),
      ]);

      const totalSessions = count;
      const avgRiskScore = avgRisk._avg.riskScore ?? 0;

      const sessionsByStatus = statusCounts.reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.status] = row._count._all;
          return acc;
        },
        {},
      );

      // Risk buckets: define thresholds (low < 30, 30-59 medium, >= 60 high)
      const sessionsForBuckets = await prisma.studentSession.findMany({
        where: whereSessions,
        select: { riskScore: true },
      });

      let low = 0;
      let medium = 0;
      let high = 0;
      for (const s of sessionsForBuckets) {
        if (s.riskScore >= 60) high += 1;
        else if (s.riskScore >= 30) medium += 1;
        else low += 1;
      }

      // Top barriers
      const whereBarriers: Prisma.BarrierEventWhereInput = since
        ? { createdAt: { gte: since } }
        : {};

      const barrierCounts = await prisma.barrierEvent.groupBy({
        by: ["code"],
        _count: { _all: true },
        where: whereBarriers,
      });

      const topBarriers = barrierCounts
        .map((b) => ({ code: b.code, count: b._count._all }))
        .sort((a, b) => b.count - a.count);

      // Avg time to first staff message (seconds)
      const sessionsWithMessages = await prisma.studentSession.findMany({
        where: whereSessions,
        select: {
          id: true,
          createdAt: true,
          chatMessages: {
            orderBy: { createdAt: "asc" },
            select: { createdAt: true, sender: true },
          },
        },
      });

      let totalDeltaSeconds = 0;
      let sessionsWithStaff = 0;
      for (const s of sessionsWithMessages) {
        const firstStaff = s.chatMessages.find((m) => m.sender === "STAFF");
        const startTime = s.chatMessages[0]?.createdAt ?? s.createdAt;
        if (firstStaff) {
          const deltaMs =
            firstStaff.createdAt.getTime() - startTime.getTime();
          if (deltaMs >= 0) {
            totalDeltaSeconds += deltaMs / 1000;
            sessionsWithStaff += 1;
          }
        }
      }

      const avgTimeToFirstStaffMessage =
        sessionsWithStaff > 0 ? totalDeltaSeconds / sessionsWithStaff : 0;

      // Languages breakdown
      const languageCounts = await prisma.studentSession.groupBy({
        by: ["language"],
        _count: { _all: true },
        where: whereSessions,
      });
      const languages = languageCounts.reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.language] = row._count._all;
          return acc;
        },
        {},
      );

      // Withdraw prevented count
      const withdrawPreventedCount = await prisma.studentSession.count({
        where: {
          ...whereSessions,
          withdrawPrevented: true,
        },
      });

      return res.json({
        totalSessions,
        sessionsByStatus,
        avgRiskScore,
        riskBuckets: { low, medium, high },
        topBarriers,
        avgTimeToFirstStaffMessage,
        languages,
        withdrawPreventedCount,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/analytics/sessions?limit=50
router.get(
  "/sessions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = sessionsQuerySchema.parse(req.query);

      const sessions = await prisma.studentSession.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          language: true,
          persona: true,
          status: true,
          riskScore: true,
          sentimentStart: true,
          sentimentEnd: true,
          withdrawIntent: true,
          withdrawPrevented: true,
        },
      });

      return res.json({ sessions });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

