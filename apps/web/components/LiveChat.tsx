"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

type Sender = "STUDENT" | "STAFF";

interface ChatMessage {
  id: string;
  createdAt: string;
  sender: Sender;
  text: string;
}

interface SessionChatResponse {
  chatMessages: ChatMessage[];
}

interface LiveChatProps {
  sessionId: string | null;
}

export function LiveChat({ sessionId }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [staffTyping, setStaffTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Initial load from API
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    api
      .get<SessionChatResponse>(`/session/${sessionId}`)
      .then((res) => {
        const cms = res.chatMessages as ChatMessage[] | undefined;
        if (cms) setMessages(cms.slice().reverse());
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Socket connection
  useEffect(() => {
    if (!sessionId) return;
    setConnecting(true);
    const socket = io(`${SOCKET_URL}/chat`, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("student:join", { sessionId });
      setConnecting(false);
    });

    socket.on("chat:message", (msg: any) => {
      setMessages((prev) => [...prev, msg as ChatMessage]);
      if (msg.sender === "STAFF") {
        setStaffTyping(true);
        setTimeout(() => setStaffTyping(false), 1200);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !sessionId || !socketRef.current) return;
    socketRef.current.emit("chat:send", {
      sessionId,
      sender: "STUDENT",
      text: trimmed,
    });
    setInput("");
  };

  const disabled = !sessionId || !socketRef.current;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Live chat</CardTitle>
        <CardDescription>Conversations between the student and staff.</CardDescription>
      </CardHeader>
      <CardContent className="flex h-64 flex-col gap-2">
        <div className="flex-1 overflow-y-auto rounded-md bg-slate-900/80 px-3 py-2 text-xs">
          {loading ? (
            <p className="text-slate-500">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-slate-500">No messages yet. Say hello to get started.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`mb-1 flex ${
                  m.sender === "STUDENT" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-2 py-1 ${
                    m.sender === "STUDENT"
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  <p className="text-[0.75rem]">{m.text}</p>
                </div>
              </div>
            ))
          )}
          {staffTyping ? (
            <p className="mt-1 text-[0.7rem] text-slate-400">Staff is typing…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={sessionId ? "Type a message…" : "Waiting for session…"}
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus-visible:border-indigo-500"
            disabled={disabled}
          />
          <Button
            size="sm"
            variant="primary"
            onClick={handleSend}
            disabled={disabled || !input.trim()}
          >
            Send
          </Button>
        </div>
        {connecting && (
          <p className="text-[0.7rem] text-slate-500">
            Connecting to live chat…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

