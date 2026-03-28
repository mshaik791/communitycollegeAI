import { z } from "zod";

import { prisma } from "../db/prisma";
import type {
  ChatSendPayload,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";
import type { Server, Socket } from "socket.io";

const chatSendSchema = z.object({
  sessionId: z.string().cuid(),
  sender: z.enum(["STUDENT", "STAFF"]),
  text: z.string().min(1),
});

const SESSION_ROOM_PREFIX = "session:";
const STAFF_ROOM = "staff";

export function initChatNamespace(
  io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
) {
  const nsp = io.of("/chat");

  nsp.on("connection", (socket: Socket) => {
    socket.on("student:join", (payload) => {
      try {
        const parsed = z.object({ sessionId: z.string().cuid() }).parse(payload);
        const room = `${SESSION_ROOM_PREFIX}${parsed.sessionId}`;
        socket.join(room);
        socket.data.role = "STUDENT";
        socket.data.sessionId = parsed.sessionId;
      } catch {
        // ignore invalid join
      }
    });

    socket.on("staff:join", () => {
      socket.join(STAFF_ROOM);
      socket.data.role = "STAFF";
    });

    socket.on("chat:send", async (payload: ChatSendPayload) => {
      try {
        const { sessionId, sender, text } = chatSendSchema.parse(payload);

        // Ensure session exists
        const session = await prisma.studentSession.findUnique({
          where: { id: sessionId },
          select: { id: true },
        });
        if (!session) {
          return;
        }

        const message = await prisma.chatMessage.create({
          data: {
            sessionId,
            sender,
            text,
          },
        });

        const msgPayload = {
          id: message.id,
          sessionId: message.sessionId,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
          text: message.text,
        };

        const room = `${SESSION_ROOM_PREFIX}${sessionId}`;

        nsp.to(room).emit("chat:message", msgPayload);
        nsp.to(STAFF_ROOM).emit("chat:message", msgPayload);
      } catch {
        // ignore invalid payloads
      }
    });
  });
}

