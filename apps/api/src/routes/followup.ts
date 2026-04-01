import { Router } from "express";
import { prisma } from "../db/prisma";
import { getIo } from "../socket/io";

const router = Router();

/** POST /v1/session/:id/followup — schedule a follow-up call */
router.post("/session/:id/followup", async (req, res) => {
  const { id } = req.params;
  const { scheduledFor, counselorName, notes } = req.body as {
    scheduledFor: string;
    counselorName: string;
    notes?: string;
  };

  try {
    const followUp = await prisma.followUp.create({
      data: {
        sessionId: id,
        scheduledFor: new Date(scheduledFor),
        counselorName: counselorName ?? "Navigator",
        notes: notes ?? null,
      },
    });

    try {
      getIo().to("staff").emit("followup:scheduled", { sessionId: id, followUp });
    } catch {
      // Socket not initialized — non-fatal
    }

    return res.json(followUp);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Follow-up create error:", error);
    return res.status(500).json({ error: "Failed to schedule follow-up" });
  }
});

/** GET /v1/session/:id/followups — list follow-ups for a session */
router.get("/session/:id/followups", async (req, res) => {
  const { id } = req.params;
  try {
    const followUps = await prisma.followUp.findMany({
      where: { sessionId: id },
      orderBy: { scheduledFor: "asc" },
    });
    return res.json(followUps);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Follow-up list error:", error);
    return res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
});

/** PATCH /v1/followup/:id/complete — mark a follow-up as completed */
router.patch("/followup/:id/complete", async (req, res) => {
  const { id } = req.params;
  try {
    const followUp = await prisma.followUp.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return res.json(followUp);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Follow-up complete error:", error);
    return res.status(500).json({ error: "Failed to update follow-up" });
  }
});

export default router;
