import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { getSessionSnapshot } from "../services/sessionSnapshot";
import { sendCallbackSms } from "../services/twilio";
import { getIo } from "../socket/io";

const router = Router();

const requestBodySchema = z.object({
  sessionId: z.string().cuid(),
  counselorName: z.string().optional().default("Jimmy"),
});

// POST /v1/callback/request
router.post(
  "/request",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = requestBodySchema.parse(req.body);

      const session = await prisma.studentSession.findUnique({
        where: { id: body.sessionId },
      });

      if (!session) {
        return res.status(404).json({
          ok: false,
          error: { message: "Session not found" },
        });
      }

      let callback = await prisma.callbackRequest.create({
        data: {
          sessionId: session.id,
          counselorName: body.counselorName,
          status: "PENDING",
        },
      });

      if (session.studentPhone) {
        const result = await sendCallbackSms({
          to: session.studentPhone,
          counselorName: body.counselorName,
        });

        if (!result.mock) {
          callback = await prisma.callbackRequest.update({
            where: { id: callback.id },
            data: {
              smsSent: result.sent,
              status: result.sent ? "SENT_SMS" : "PENDING",
              smsError: result.error,
            },
          });
        } else {
          callback = await prisma.callbackRequest.update({
            where: { id: callback.id },
            data: {
              smsSent: false,
              smsError: result.error,
            },
          });
        }
      }

      const snapshot = await getSessionSnapshot(session.id);

      if (snapshot) {
        try {
          const io = getIo();
          const nsp = io.of("/chat");
          nsp.to("staff").emit("callback:requested", {
            snapshot,
          });
        } catch {
          // ignore if sockets not available
        }
      }

      return res.status(201).json({
        callbackRequest: callback,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: {
            message: "Validation error",
            details: err.flatten(),
          },
        });
      }
      next(err);
    }
  },
);

export default router;

