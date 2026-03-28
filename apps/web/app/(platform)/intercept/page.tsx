"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { AVATARS, type AvatarId } from "@/lib/tavus/personas";
import { TavusEmbed } from "@/components/TavusEmbed";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionData {
  session: {
    id: string;
    createdAt: string;
    updatedAt: string;
    studentName: string | null;
    status: string;
    riskScore: number;
    sentimentStart: number | null;
    sentimentEnd: number | null;
    withdrawIntent: boolean;
    withdrawPrevented: boolean | null;
    chatRecommended: boolean;
    transcriptText: string | null;
    summaryText: string | null;
  };
  barriers: { id: string; code: string; severity: string; notes: string | null }[];
  chatMessages: {
    id: string;
    createdAt: string;
    sender: "STUDENT" | "STAFF";
    text: string;
  }[];
  callback: {
    id: string;
    status: string;
    counselorName: string;
  } | null;
}

type SocketInstance = Socket<
  {
    "student:join": (payload: { sessionId: string }) => void;
    "staff:join": () => void;
    "chat:send": (payload: { sessionId: string; sender: "STUDENT" | "STAFF"; text: string }) => void;
  },
  {
    "chat:message": (msg: {
      id: string;
      sessionId: string;
      createdAt: string;
      sender: "STUDENT" | "STAFF";
      text: string;
    }) => void;
    "session:update": (snapshot: SessionData) => void;
    "alert:high_risk": (p: { sessionId: string; riskScore: number; studentName: string | null }) => void;
    "chat:recommended": (p: { sessionId: string }) => void;
    "callback:requested": (p: { snapshot: SessionData }) => void;
  }
>;

// ── Session hook (unchanged) ───────────────────────────────────────────────

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

function useInterceptSession(sessionId: string | null) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    api
      .get<SessionData>(`/session/${sessionId}`)
      .then((res) => { if (isMounted) setData(res); })
      .catch((e) => { if (isMounted) setError(e instanceof Error ? e.message : "Failed to load session"); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const socket: SocketInstance = io(`${SOCKET_URL}/chat`, { transports: ["websocket"] });
    socket.on("connect", () => socket.emit("student:join", { sessionId }));
    socket.on("chat:message", (msg) => {
      setData((prev) => prev ? { ...prev, chatMessages: [msg, ...prev.chatMessages].slice(0, 20) } : prev);
    });
    socket.on("session:update", (snapshot) => setData(snapshot));
    socket.on("callback:requested", (payload) => setData(payload.snapshot));
    socket.on("chat:recommended", () => {
      setData((prev) => prev ? { ...prev, session: { ...prev.session, chatRecommended: true } } : prev);
    });
    return () => { socket.disconnect(); };
  }, [sessionId]);

  return { data, loading, error };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function InterceptPage() {
  const search = useSearchParams();
  const sessionId = search.get("sessionId");
  const avatarId = (search.get("avatarId") ?? "sofi") as AvatarId;
  const autostart = search.get("autostart") === "true";
  const isDemo = search.get("demo") === "true";

  const persona = AVATARS[avatarId] ?? AVATARS["sofi"];

  // If the avatar hub already obtained the Tavus URL, use it immediately
  const tavusUrlParam = search.get("tavusUrl");
  const initialTavusUrl = tavusUrlParam ? decodeURIComponent(tavusUrlParam) : null;

  const { data, loading, error } = useInterceptSession(sessionId);

  const [tavusUrl, setTavusUrl] = useState<string | null>(initialTavusUrl);
  const [connecting, setConnecting] = useState(false);
  const [markingRetained, setMarkingRetained] = useState(false);

  const riskScore = data?.session.riskScore ?? 0;
  const topBarrier = data?.barriers[0] ?? null;

  const riskLabel = useMemo(() => {
    if (riskScore >= 71) return "High";
    if (riskScore >= 40) return "Moderate";
    return "Low";
  }, [riskScore]);

  const riskColor =
    riskScore >= 71 ? "var(--risk-high)" : riskScore >= 40 ? "var(--risk-med)" : "var(--risk-low)";

  // Auto-start Tavus only when autostart=true, not in demo mode, and no URL was pre-fetched
  useEffect(() => {
    if (!autostart || isDemo || initialTavusUrl) return;

    const startSession = async () => {
      setConnecting(true);
      try {
        const res = await fetch("/api/tavus/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionId ?? "demo-" + avatarId,
            avatarId: avatarId ?? "sofi",
          }),
        });
        const d = await res.json() as { tavusSessionUrl?: string };
        if (d.tavusSessionUrl) setTavusUrl(d.tavusSessionUrl);
      } catch (e) {
        console.error("Tavus start failed", e);
      } finally {
        setConnecting(false);
      }
    };

    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    // Fixed overlay that sits below the NavBar (56px) and fills the rest of the viewport
    <div
      style={{
        position: "fixed",
        inset: 0,
        top: "56px",
        zIndex: 10,
        display: "flex",
      }}
    >
      {/* ── LEFT PANEL (70%) ── */}
      <div className="relative" style={{ width: "70%", background: "#f0eff5" }}>
        {/* Overlay bar — floats above the video */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex h-14 items-center justify-between px-4"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.55)",
          }}
        >
          {/* Avatar identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, ${persona.accentColor}, ${persona.accentColor}cc)`,
                boxShadow: `0 2px 8px ${persona.accentColor}50`,
              }}
            >
              {persona.name[0]}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: "#2d2438", fontFamily: "Instrument Sans, sans-serif" }}>
                {persona.name}
              </div>
              <div className="text-xs font-light" style={{ color: "#7a6d85" }}>
                {persona.role}
              </div>
            </div>
            {(connecting || tavusUrl) && (
              <div className="pill-live" style={{ fontSize: "10px", padding: "3px 10px" }}>
                <span className="dot-live" />
                {connecting ? "Connecting…" : "Live"}
              </div>
            )}
          </div>

          {/* Risk badge */}
          {riskScore > 0 && (
            <div
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{
                color: riskColor,
                background: `${riskScore >= 71 ? "rgba(192,80,80,0.08)" : riskScore >= 40 ? "rgba(192,136,48,0.08)" : "rgba(74,158,149,0.08)"}`,
                border: `1px solid ${riskScore >= 71 ? "rgba(192,80,80,0.2)" : riskScore >= 40 ? "rgba(192,136,48,0.2)" : "rgba(74,158,149,0.2)"}`,
              }}
            >
              Risk: {riskScore}
            </div>
          )}
        </div>

        {/* Video / loading / placeholder — fills full panel, overlay sits on top */}
        <div className="absolute inset-0">
          {connecting ? (
            /* Connecting loading state */
            <div
              className="h-full flex flex-col items-center justify-center gap-5"
              style={{ background: "linear-gradient(145deg, #f5f0fa 0%, #f0f7f6 100%)" }}
            >
              {/* Pulsing circle */}
              <div className="relative flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-full"
                  style={{
                    background: `${persona.accentColor}18`,
                    border: `2px solid ${persona.accentColor}40`,
                    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                  }}
                />
                <div
                  className="absolute w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${persona.accentColor}, ${persona.accentColor}cc)` }}
                >
                  {persona.name[0]}
                </div>
              </div>
              <h2
                className="italic text-center"
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "22px",
                  color: "#2d2438",
                }}
              >
                Connecting you with {persona.name}...
              </h2>
              <p className="text-sm font-light" style={{ color: "#7a6d85" }}>
                Your AI counselor will appear in a moment.
              </p>
            </div>
          ) : tavusUrl ? (
            /* Live Tavus session */
            <TavusEmbed url={tavusUrl} sessionId={sessionId} />
          ) : isDemo ? (
            /* Demo placeholder — persona not configured */
            <div
              className="h-full flex flex-col items-center justify-center gap-5"
              style={{ background: "linear-gradient(145deg, #f5f0fa 0%, #f0f7f6 100%)" }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${persona.accentColor}, ${persona.accentColor}cc)`,
                  boxShadow: `0 0 0 6px ${persona.accentColor}20, 0 0 0 12px ${persona.accentColor}0a`,
                }}
              >
                {persona.name[0]}
              </div>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "32px",
                  color: "#2d2438",
                }}
              >
                {persona.name}
              </h2>
              <p className="font-light text-sm" style={{ color: "#9a8fa0" }}>{persona.role}</p>
              <p
                className="text-xs font-light text-center max-w-xs px-4"
                style={{ color: "#b0a4ba", lineHeight: 1.7 }}
              >
                Configure this avatar&apos;s persona ID in{" "}
                <code style={{ fontFamily: "monospace", color: "var(--lavender-dark)", fontSize: "11px" }}>
                  lib/tavus/personas.ts
                </code>{" "}
                to activate
              </p>
            </div>
          ) : (
            /* Idle state — no sessionId yet */
            <div
              className="h-full flex items-center justify-center"
              style={{ background: "linear-gradient(145deg, #f5f0fa, #f0f7f6)" }}
            >
              <p className="text-sm font-light" style={{ color: "#9a8fa0" }}>
                {loading ? "Loading session..." : error ? error : "Waiting for session..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR (30%) ── */}
      <div
        className="flex flex-col overflow-y-auto gap-5 p-5"
        style={{
          width: "30%",
          background: "rgba(255,255,255,0.42)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255,255,255,0.62)",
        }}
      >
        {/* Session header */}
        <div>
          <p className="eyebrow mb-1">Session</p>
          <p className="text-xs font-mono mb-1.5" style={{ color: "var(--text-muted)" }}>
            {sessionId ? sessionId.slice(0, 20) + "…" : "Demo session"}
          </p>
          <span className="chip chip-teal" style={{ fontSize: "10px" }}>
            {data?.session.status ?? "STARTED"}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(200,190,220,0.2)" }} />

        {/* Risk meter */}
        <div>
          <p className="eyebrow mb-2">Risk level</p>
          <div
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "40px",
              lineHeight: 1,
              color: riskColor,
              marginBottom: "4px",
            }}
          >
            {riskScore}
          </div>
          <p className="text-xs font-light mb-3" style={{ color: "var(--text-muted)" }}>
            {riskLabel}
          </p>
          {/* Progress bar */}
          <div
            className="w-full rounded-full"
            style={{ height: "4px", background: "rgba(200,190,220,0.2)" }}
          >
            <div
              className="rounded-full transition-all duration-700"
              style={{
                height: "4px",
                width: `${Math.min(Math.max(riskScore, 0), 100)}%`,
                background: "linear-gradient(90deg, var(--teal), var(--risk-med), var(--risk-high))",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(200,190,220,0.2)" }} />

        {/* Detected barriers */}
        <div>
          <p className="eyebrow mb-2">What we&apos;re hearing</p>
          {data?.barriers && data.barriers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.barriers.map((b) => (
                <span key={b.id} className="chip chip-lavender">
                  {b.code.replace("_", " ")}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="dot-live" style={{ width: "5px", height: "5px" }} />
              <p className="text-xs font-light" style={{ color: "var(--text-faint)" }}>
                Listening...
              </p>
            </div>
          )}
        </div>

        {/* Suggested resource */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(126,184,176,0.08)",
            border: "1px solid rgba(126,184,176,0.2)",
          }}
        >
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--teal-dark)" }}>
            Suggested resource
          </p>
          <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {topBarrier
              ? `Based on ${topBarrier.code.toLowerCase().replace("_", " ")}, we suggest a targeted campus resource.`
              : "Once we detect a barrier, we'll suggest a concrete resource for you."}
          </p>
        </div>

        {/* Spacer pushes actions to bottom */}
        <div className="flex-1" />

        {/* Actions */}
        <div
          className="flex flex-col gap-2.5 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.55)" }}
        >
          {/* Request callback */}
          <button
            type="button"
            className="btn-glass-primary w-full justify-center"
            style={{ fontSize: "13px", padding: "11px 20px" }}
          >
            Request callback
          </button>

          {/* Mark as retained */}
          <button
            type="button"
            disabled={!sessionId || markingRetained}
            className="w-full justify-center rounded-xl text-sm font-medium text-white transition-all"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "11px 20px",
              background: "linear-gradient(135deg, #7eb8b0, #4a9e95)",
              border: "1px solid rgba(255,255,255,0.35)",
              boxShadow: "0 4px 16px rgba(126,184,176,0.3)",
              opacity: !sessionId || markingRetained ? 0.5 : 1,
              cursor: !sessionId ? "not-allowed" : "pointer",
            }}
            onClick={async () => {
              if (!sessionId) return;
              setMarkingRetained(true);
              try {
                await api.post(`/session/${sessionId}/event`, {
                  type: "STATUS",
                  status: "COMPLETED",
                  withdrawPrevented: true,
                });
              } finally {
                setMarkingRetained(false);
              }
            }}
          >
            {markingRetained ? "Marking…" : "Mark as Retained ✓"}
          </button>

          {/* Last resort link */}
          <div className="text-center pt-1">
            <button
              type="button"
              className="text-xs font-light transition-opacity hover:opacity-60"
              style={{
                color: "var(--text-faint)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Continue with withdrawal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
