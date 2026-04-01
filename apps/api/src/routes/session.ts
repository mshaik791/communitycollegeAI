import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
const SESSION_STATUSES = ["STARTED", "IN_PROGRESS", "COMPLETED", "ESCALATED", "WITHDRAWN"] as const;
const BARRIER_CODES = ["WORK", "FAMILY", "TRANSPORT", "HEALTH", "MENTAL_HEALTH", "DIGITAL_LITERACY", "FINANCIAL", "IMMIGRATION_FEAR", "MOTIVATION", "OTHER"] as const;
const BARRIER_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

import { prisma } from "../db/prisma";
import { getSessionSnapshot } from "../services/sessionSnapshot";
import { getIo } from "../socket/io";

const router = Router();

const sessionIdParamSchema = z.object({
  sessionId: z.string().cuid(),
});

const startBodySchema = z.object({
  language: z.string().optional(),
  persona: z.string().optional(),
});

const profileBodySchema = z.object({
  studentName: z.string().optional(),
  studentEmail: z.string().email().optional(),
  studentPhone: z.string().optional(),
});

const eventBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("BARRIER"),
    code: z.enum(BARRIER_CODES),
    severity: z.enum(BARRIER_SEVERITIES),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("RISK"),
    riskScore: z.number().int(),
  }),
  z.object({
    type: z.literal("SENTIMENT"),
    sentimentStart: z.number().int().min(0).max(100).optional(),
    sentimentEnd: z.number().int().min(0).max(100).optional(),
  }),
  z.object({
    type: z.literal("TRANSCRIPT"),
    transcriptText: z.string(),
  }),
  z.object({
    type: z.literal("SUMMARY"),
    summaryText: z.string(),
  }),
  z.object({
    type: z.literal("STATUS"),
    status: z.enum(SESSION_STATUSES),
    withdrawPrevented: z.boolean().optional(),
  }),
]);

function validationError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        message: "Validation error",
        details: error.flatten(),
      },
    });
  }
  return null;
}

// POST /v1/session/start
router.post(
  "/start",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = startBodySchema.parse(req.body);

      const created = await prisma.studentSession.create({
        data: {
          language: body.language ?? "en",
          persona: body.persona ?? "sofia",
          status: "STARTED",
        },
      });

      return res.status(201).json({
        sessionId: created.id,
        createdAt: created.createdAt,
      });
    } catch (err) {
      if (validationError(res, err)) return;
      next(err);
    }
  },
);

// POST /v1/session/:sessionId/profile
router.post(
  "/:sessionId/profile",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = sessionIdParamSchema.parse(req.params);
      const body = profileBodySchema.parse(req.body);

      const updated = await prisma.studentSession.update({
        where: { id: params.sessionId },
        data: {
          studentName: body.studentName ?? undefined,
          studentEmail: body.studentEmail ?? undefined,
          studentPhone: body.studentPhone ?? undefined,
        },
      });

      const snapshot = await getSessionSnapshot(updated.id);
      return res.json(snapshot);
    } catch (err) {
      if (validationError(res, err)) return;
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as any).code === "P2025"
      ) {
        return res.status(404).json({
          ok: false,
          error: { message: "Session not found" },
        });
      }
      next(err);
    }
  },
);

// POST /v1/session/:sessionId/event
router.post(
  "/:sessionId/event",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = sessionIdParamSchema.parse(req.params);
      const body = eventBodySchema.parse(req.body);

      // Ensure session exists
      const existing = await prisma.studentSession.findUnique({
        where: { id: params.sessionId },
      });
      if (!existing) {
        return res.status(404).json({
          ok: false,
          error: { message: "Session not found" },
        });
      }

      switch (body.type) {
        case "BARRIER":
          await prisma.barrierEvent.create({
            data: {
              sessionId: params.sessionId,
              code: body.code,
              severity: body.severity,
              notes: body.notes,
            },
          });
          break;
        case "RISK":
          {
            const isHighRisk = body.riskScore >= 71;
            const updated = await prisma.studentSession.update({
              where: { id: params.sessionId },
              data: {
                riskScore: body.riskScore,
                status: isHighRisk ? "ESCALATED" : existing.status,
              },
            });

            if (isHighRisk) {
              try {
                const io = getIo();
                const nsp = io.of("/chat");
                nsp.to("staff").emit("alert:high_risk", {
                  sessionId: updated.id,
                  riskScore: updated.riskScore,
                  studentName: updated.studentName ?? null,
                });
              } catch {
                // socket layer not available; ignore
              }
            }
          }
          break;
        case "SENTIMENT":
          await prisma.studentSession.update({
            where: { id: params.sessionId },
            data: {
              sentimentStart:
                body.sentimentStart !== undefined
                  ? body.sentimentStart
                  : existing.sentimentStart,
              sentimentEnd:
                body.sentimentEnd !== undefined
                  ? body.sentimentEnd
                  : existing.sentimentEnd,
            },
          });
          break;
        case "TRANSCRIPT":
          await prisma.studentSession.update({
            where: { id: params.sessionId },
            data: { transcriptText: body.transcriptText },
          });
          break;
        case "SUMMARY":
          await prisma.studentSession.update({
            where: { id: params.sessionId },
            data: { summaryText: body.summaryText },
          });
          break;
        case "STATUS":
          await prisma.studentSession.update({
            where: { id: params.sessionId },
            data: {
              status: body.status,
              withdrawPrevented:
                body.withdrawPrevented !== undefined
                  ? body.withdrawPrevented
                  : existing.withdrawPrevented,
            },
          });
          break;
        default:
          break;
      }

      const snapshot = await getSessionSnapshot(params.sessionId);
      return res.json(snapshot);
    } catch (err) {
      if (validationError(res, err)) return;
      next(err);
    }
  },
);

// POST /v1/session/:sessionId/trigger-chat
router.post(
  "/:sessionId/trigger-chat",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = sessionIdParamSchema.parse(req.params);

      const updated = await prisma.studentSession.update({
        where: { id: params.sessionId },
        data: {
          chatRecommended: true,
        },
      });

      try {
        const io = getIo();
        const nsp = io.of("/chat");
        const room = `session:${updated.id}`;
        nsp.to(room).emit("chat:recommended", {
          sessionId: updated.id,
        });
      } catch {
        // ignore if socket not initialized
      }

      const snapshot = await getSessionSnapshot(updated.id);
      return res.json(snapshot);
    } catch (err) {
      if (validationError(res, err)) return;
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as any).code === "P2025"
      ) {
        return res.status(404).json({
          ok: false,
          error: { message: "Session not found" },
        });
      }
      next(err);
    }
  },
);

// GET /v1/session/:sessionId
router.get(
  "/:sessionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = sessionIdParamSchema.parse(req.params);
      const snapshot = await getSessionSnapshot(params.sessionId);

      if (!snapshot) {
        return res.status(404).json({
          ok: false,
          error: { message: "Session not found" },
        });
      }

      return res.json(snapshot);
    } catch (err) {
      if (validationError(res, err)) return;
      next(err);
    }
  },
);

// POST /v1/session/:id/capture-name — called by Tavus tool when student says their name
router.post("/:id/capture-name", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { first_name, full_name } = req.body as { first_name?: string; full_name?: string };

  const studentName = (full_name ?? first_name ?? "").trim();
  if (!studentName) {
    return res.status(400).json({ error: "No name provided" });
  }

  try {
    await prisma.studentSession.update({
      where: { id },
      data: { studentName },
    });

    try {
      getIo().to("staff").emit("session:name_captured", { sessionId: id, studentName });
    } catch {
      // Socket not initialized — non-fatal
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Student name captured: "${studentName}" for session: ${id}`);
    return res.json({ ok: true, studentName });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Name capture error:", error);
    return res.status(500).json({ error: "Failed to save student name" });
  }
});

export default router;

