"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionListItem {
  id: string;
  createdAt: string;
  status: string;
  riskScore: number;
  withdrawPrevented: boolean | null;
  studentName?: string | null;
  callbackRequested?: boolean;
  chatRecommended?: boolean;
}

interface SessionSnapshot {
  session: {
    id: string;
    createdAt: string;
    updatedAt: string;
    studentName: string | null;
    studentEmail: string | null;
    studentPhone: string | null;
    language: string;
    persona: string;
    status: string;
    riskScore: number;
    sentimentStart: number | null;
    sentimentEnd: number | null;
    withdrawIntent: boolean;
    withdrawPrevented: boolean | null;
    chatRecommended: boolean;
    transcriptText: string | null;
    summaryText: string | null;
    emotionalInsight: string | null;
  };
  barriers: { id: string; createdAt: string; code: string; severity: string; notes: string | null }[];
  chatMessages: {
    id: string;
    createdAt: string;
    sender: "STUDENT" | "STAFF";
    text: string;
  }[];
  callback: { id: string; status: string; counselorName: string } | null;
}

interface AnalysisPayload {
  sessionId: string;
  riskScore: number;
  riskLabel: string;
  barriers: { code: string; severity: string; notes: string }[];
  nextSteps: string[];
  caseSummary: string;
  urgency: string;
  strengths: string;
  recommendedAvatar: string;
  emotionalInsight?: string;
  perceptionHighlights?: string;
}

interface FollowUpItem {
  id: string;
  sessionId: string;
  scheduledFor: string;
  counselorName: string;
  notes: string | null;
  status: string;
  completedAt: string | null;
}

type StaffSocket = Socket<
  {
    "student:join": (p: { sessionId: string }) => void;
    "staff:join": () => void;
    "chat:send": (p: { sessionId: string; sender: "STUDENT" | "STAFF"; text: string }) => void;
  },
  {
    "chat:message": (msg: { id: string; sessionId: string; createdAt: string; sender: "STUDENT" | "STAFF"; text: string }) => void;
    "session:update": (snapshot: SessionSnapshot) => void;
    "alert:high_risk": (p: { sessionId: string; riskScore: number; studentName: string | null }) => void;
    "chat:recommended": (p: { sessionId: string }) => void;
    "callback:requested": (p: { snapshot: SessionSnapshot }) => void;
    "analysis:complete": (p: AnalysisPayload) => void;
    "session:name_captured": (p: { sessionId: string; studentName: string }) => void;
    "followup:scheduled": (p: { sessionId: string; followUp: FollowUpItem }) => void;
  }
>;

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function riskChipClass(score: number): string {
  if (score >= 71) return "chip chip-rose";
  if (score >= 40) return "chip chip-amber";
  return "chip chip-teal";
}

function riskLabel(score: number): string {
  if (score >= 71) return "HIGH";
  if (score >= 40) return "MED";
  return "OK";
}

function riskColor(score: number): string {
  if (score >= 71) return "var(--risk-high)";
  if (score >= 40) return "var(--risk-med)";
  return "var(--risk-low)";
}

function buildCaseSummary(snapshot: SessionSnapshot): string {
  const { session, barriers } = snapshot;
  const riskScore = session.riskScore ?? 0;
  const barrierOrder = ["MENTAL_HEALTH","FINANCIAL","WORK","FAMILY","TRANSPORT","HEALTH","DIGITAL_LITERACY","IMMIGRATION_FEAR","MOTIVATION","OTHER"];
  const uniqueCodes = Array.from(new Set(barriers.map((b) => b.code))).sort((a, b) => barrierOrder.indexOf(a) - barrierOrder.indexOf(b));
  const topCodes = uniqueCodes.slice(0, 2);
  const reasonLabels: Record<string, string> = {
    WORK: "work schedule changes", FAMILY: "family and childcare responsibilities",
    TRANSPORT: "transportation challenges", HEALTH: "health concerns",
    MENTAL_HEALTH: "mental health and stress", DIGITAL_LITERACY: "digital literacy and technology access",
    FINANCIAL: "financial pressure and cost of attendance", IMMIGRATION_FEAR: "immigration-related fear or uncertainty",
    MOTIVATION: "motivation and feeling disconnected from classes", OTHER: "other personal factors",
  };
  const reasonPhrase = topCodes.length > 0
    ? topCodes.map((code) => reasonLabels[code] ?? code.toLowerCase().replace("_", " ")).join(" and ")
    : "factors that have not yet been fully captured";
  let rLabel = "moderate";
  if (riskScore >= 71) rLabel = "high";
  else if (riskScore <= 25) rLabel = "low";
  const recsMap: Record<string, string> = {
    WORK: "offer flexible or online sections", FAMILY: "connect to childcare assistance",
    TRANSPORT: "highlight remote options", HEALTH: "coordinate with health services",
    MENTAL_HEALTH: "connect immediately with counseling", DIGITAL_LITERACY: "offer tutoring and lab access",
    FINANCIAL: "schedule a financial aid review", IMMIGRATION_FEAR: "connect to an immigration-safe advisor",
    MOTIVATION: "connect to advising and peer mentoring", OTHER: "offer a counselor callback",
  };
  const recommendations = Array.from(new Set(topCodes.map((code) => recsMap[code] ?? recsMap.OTHER))).slice(0, 3);
  const recPhrase = recommendations.length > 0 ? recommendations.join("; ") : "offer a counselor follow-up";
  return `${session.studentName || "Student"} is considering withdrawal due to ${reasonPhrase}. Risk: ${riskScore} (${rLabel}). Recommended: ${recPhrase}`;
}

/** Parse "NEXT STEPS:\n1. step\n2. step" section out of summaryText */
function parseNextSteps(summaryText: string | null): string[] {
  if (!summaryText) return [];
  const marker = "NEXT STEPS:";
  const idx = summaryText.indexOf(marker);
  if (idx === -1) return [];
  const stepsBlock = summaryText.slice(idx + marker.length).trim();
  return stepsBlock
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

/** Parse the summary part (before NEXT STEPS) */
function parseSummaryBody(summaryText: string | null): string {
  if (!summaryText) return "";
  const idx = summaryText.indexOf("NEXT STEPS:");
  return (idx === -1 ? summaryText : summaryText.slice(0, idx)).trim();
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StaffDashboardPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SessionSnapshot | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoStaff, setDemoStaff] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [analyzingSession, setAnalyzingSession] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [perceptionHighlights, setPerceptionHighlights] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const socketRef = useRef<StaffSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Show toast briefly
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Load session list
  useEffect(() => {
    api.get<{ sessions: { id: string; createdAt: string; status: string; riskScore: number; withdrawPrevented: boolean | null }[] }>("/analytics/sessions?limit=50")
      .then((res) => {
        const mapped: SessionListItem[] = res.sessions.map((s) => ({
          id: s.id, createdAt: s.createdAt, status: s.status,
          riskScore: s.riskScore, withdrawPrevented: s.withdrawPrevented,
        }));
        setSessions(mapped);
        if (mapped.length && !selectedId) setSelectedId(mapped[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load sessions"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load selected session detail
  useEffect(() => {
    if (!selectedId) return;
    setLoadingSession(true);
    setError(null);
    setCompletedSteps({});
    setPerceptionHighlights(null);
    setFollowUps([]);
    setShowFollowUpForm(false);
    // Fetch follow-ups for this session
    fetch(`/api/session/${selectedId}/followups`)
      .then((r) => r.json())
      .then((data: FollowUpItem[]) => setFollowUps(Array.isArray(data) ? data : []))
      .catch(() => {});
    api.get<SessionSnapshot>(`/session/${selectedId}`)
      .then((snapshot) => {
        setSelected(snapshot);
        setSessions((prev) => prev.map((s) => s.id === snapshot.session.id
          ? { ...s, studentName: snapshot.session.studentName, riskScore: snapshot.session.riskScore, callbackRequested: !!snapshot.callback, chatRecommended: snapshot.session.chatRecommended }
          : s));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load session"))
      .finally(() => setLoadingSession(false));
  }, [selectedId]);

  // Socket listeners
  useEffect(() => {
    const socket: StaffSocket = io(`${SOCKET_URL}/chat`, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("staff:join"));

    socket.on("chat:message", (msg) => {
      setSelected((prev) => prev && prev.session.id === msg.sessionId
        ? { ...prev, chatMessages: [...prev.chatMessages, msg] } : prev);
      if (demoStaff && msg.sender === "STUDENT") {
        socket.emit("chat:send", { sessionId: msg.sessionId, sender: "STAFF", text: "Thanks for sharing that. A counselor will follow up shortly." });
      }
    });

    socket.on("session:update", (snapshot) => {
      setSelected((prev) => prev && prev.session.id === snapshot.session.id ? snapshot : prev);
      setSessions((prev) => prev.map((s) => s.id === snapshot.session.id
        ? { ...s, studentName: snapshot.session.studentName, riskScore: snapshot.session.riskScore, status: snapshot.session.status, chatRecommended: snapshot.session.chatRecommended, callbackRequested: !!snapshot.callback }
        : s));
    });

    socket.on("alert:high_risk", (payload) => {
      setSessions((prev) => prev.map((s) => s.id === payload.sessionId ? { ...s, riskScore: payload.riskScore } : s));
    });

    socket.on("chat:recommended", (payload) => {
      setSessions((prev) => prev.map((s) => s.id === payload.sessionId ? { ...s, chatRecommended: true } : s));
    });

    socket.on("callback:requested", (payload) => {
      const snap = payload.snapshot;
      setSelected((prev) => prev && prev.session.id === snap.session.id ? snap : prev);
      setSessions((prev) => prev.map((s) => s.id === snap.session.id ? { ...s, callbackRequested: true } : s));
    });

    // Live analysis results from Claude
    socket.on("analysis:complete", (payload) => {
      setSessions((prev) => prev.map((s) =>
        s.id === payload.sessionId ? { ...s, riskScore: payload.riskScore } : s
      ));
      if (payload.perceptionHighlights) {
        setPerceptionHighlights(payload.perceptionHighlights);
      }
      // If the completed session is selected, trigger a re-fetch for fresh data
      setSelectedId((prev) => {
        if (prev === payload.sessionId) {
          setTimeout(() => setSelectedId(payload.sessionId), 0);
        }
        return prev;
      });
      const toastMsg = payload.perceptionHighlights
        ? `Analysis complete · ${payload.perceptionHighlights}`
        : `Claude analysis complete — Risk: ${payload.riskScore} (${payload.riskLabel})`;
      showToast(toastMsg);
    });

    socket.on("session:name_captured", (payload) => {
      setSessions((prev) => prev.map((s) =>
        s.id === payload.sessionId ? { ...s, studentName: payload.studentName } : s
      ));
      setSelected((prev) => prev && prev.session.id === payload.sessionId
        ? { ...prev, session: { ...prev.session, studentName: payload.studentName } }
        : prev
      );
    });

    socket.on("followup:scheduled", (payload) => {
      if (payload.sessionId === selectedId) {
        setFollowUps((prev) => [...prev, payload.followUp]);
      }
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [demoStaff, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selected?.chatMessages.length]);

  // KPI counters
  const openSessions = sessions.length;
  const highRiskCount = sessions.filter((s) => s.riskScore >= 71).length;
  const pendingCallbacks = sessions.filter((s) => s.callbackRequested).length;

  const handleSendStaffMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !selected || !socketRef.current) return;
    socketRef.current.emit("chat:send", { sessionId: selected.session.id, sender: "STAFF", text: trimmed });
  };

  // Manual Claude analysis trigger
  const handleAnalyzeSession = async () => {
    if (!selected) return;
    const conversationId = window.prompt(
      "Enter the Tavus conversation ID for this session:\n(Leave blank to analyze existing transcript)",
    );
    if (conversationId === null) return; // cancelled
    setAnalyzingSession(true);
    setAnalyzeError(null);
    setPerceptionHighlights(null);
    try {
      const res = await fetch(`/api/session/${selected.session.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tavusConversationId: conversationId || undefined }),
      });
      const data = await res.json() as {
        success?: boolean;
        error?: string;
        analysis?: {
          riskScore: number;
          riskLabel: string;
          emotionalInsight?: string;
          perceptionHighlights?: string;
        };
        sessionId?: string;
      };
      if (!res.ok || !data.success) {
        setAnalyzeError(data.error ?? "Analysis failed");
        return;
      }
      if (data.analysis?.perceptionHighlights) {
        setPerceptionHighlights(data.analysis.perceptionHighlights);
      }
      const toastMsg = data.analysis?.perceptionHighlights
        ? `Analysis complete · ${data.analysis.perceptionHighlights}`
        : `Claude analysis complete — Risk: ${data.analysis?.riskScore} (${data.analysis?.riskLabel})`;
      showToast(toastMsg);
      // Refresh session data
      setSelectedId(selected.session.id);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzingSession(false);
    }
  };

  const [draft, setDraft] = useState("");

  const riskScore = selected?.session.riskScore ?? 0;
  const rLabel = useMemo(() => {
    if (riskScore >= 71) return "High";
    if (riskScore >= 40) return "Medium";
    if (riskScore <= 5) return "Low";
    return "Elevated";
  }, [riskScore]);

  const nextSteps = parseNextSteps(selected?.session.summaryText ?? null);
  const summaryBody = parseSummaryBody(selected?.session.summaryText ?? null);

  return (
    <div className="flex w-full flex-col gap-6">

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(126,184,176,0.4)",
            color: "var(--teal-dark)",
            boxShadow: "0 4px 24px rgba(126,184,176,0.2)",
            maxWidth: "360px",
          }}
        >
          ✦ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2rem" }}>Staff Dashboard</h1>
          <p className="mt-1 text-sm font-light" style={{ color: "var(--text-secondary)" }}>
            Live student sessions, risk alerts, and chat inbox
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={demoStaff}
            onChange={(e) => setDemoStaff(e.target.checked)}
            className="h-3.5 w-3.5 rounded"
            style={{ accentColor: "var(--teal-dark)" }}
          />
          Demo auto-reply
        </label>
      </div>

      {error && (
        <p className="text-xs px-4 py-2 rounded-xl" style={{ color: "var(--risk-high)", background: "rgba(192,80,80,0.06)", border: "1px solid rgba(192,80,80,0.15)" }}>
          {error}
        </p>
      )}

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { bar: "var(--teal)", label: "Open Sessions", value: openSessions, color: "var(--text-primary)" },
          { bar: "var(--risk-high)", label: "High Risk", value: highRiskCount, color: highRiskCount > 0 ? "var(--risk-high)" : "var(--text-primary)" },
          { bar: "var(--risk-med)", label: "Pending Callbacks", value: pendingCallbacks, color: pendingCallbacks > 0 ? "var(--risk-med)" : "var(--text-primary)" },
        ].map((kpi) => (
          <div key={kpi.label} className="stat-glass">
            <div className="stat-bar" style={{ background: kpi.bar }} />
            <div className="stat-num" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="stat-lbl">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,2.1fr)_minmax(0,3fr)]">

        {/* ── Left: session list ── */}
        <div className="glass flex flex-col overflow-hidden" style={{ maxHeight: "36rem" }}>
          <div className="shrink-0 px-5 py-4" style={{ borderBottom: "1px solid rgba(200,190,220,0.15)" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.1rem" }}>
              Active Sessions ({sessions.length})
            </h2>
            <p className="text-xs mt-0.5 font-light" style={{ color: "var(--text-faint)" }}>
              Click a session to view details
            </p>
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto p-3">
            {sessions.length === 0 ? (
              <p className="px-2 py-3 text-xs font-light" style={{ color: "var(--text-faint)" }}>
                No active sessions yet.
              </p>
            ) : (
              sessions.map((s) => {
                const isSelected = s.id === selectedId;
                const leftColor = s.riskScore >= 71 ? "var(--risk-high)" : s.riskScore >= 40 ? "var(--risk-med)" : "var(--teal)";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="flex flex-col items-start gap-1.5 text-left rounded-xl px-3 py-2.5 transition-all"
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
                      border: `1px solid ${isSelected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"}`,
                      borderLeft: `3px solid ${leftColor}`,
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "Instrument Sans, sans-serif" }}>
                        {s.studentName || "Anonymous student"}
                      </span>
                      <span className={riskChipClass(s.riskScore)} style={{ fontSize: "10px", padding: "2px 8px" }}>
                        {riskLabel(s.riskScore)}
                      </span>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {s.callbackRequested && <span className="chip chip-amber" style={{ fontSize: "10px", padding: "2px 8px" }}>CALLBACK</span>}
                        {s.chatRecommended && <span className="chip chip-teal" style={{ fontSize: "10px", padding: "2px 8px" }}>CHAT REC</span>}
                      </div>
                      <span className="text-xs font-light" style={{ color: "var(--text-faint)" }}>{relativeTime(s.createdAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: session detail ── */}
        <div className="glass-strong p-6 flex flex-col gap-4" style={{ maxHeight: "36rem", overflowY: "auto" }}>
          {loadingSession && !selected ? (
            <p className="text-sm font-light" style={{ color: "var(--text-faint)" }}>Loading session…</p>
          ) : !selected ? (
            <p className="text-sm font-light" style={{ color: "var(--text-faint)" }}>Select a session from the left.</p>
          ) : (
            <>
              {/* Student info + risk score */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.2rem" }}>
                    {selected.session.studentName || "Anonymous student"}
                  </h2>
                  <p className="text-xs mt-0.5 font-light" style={{ color: "var(--text-muted)" }}>
                    {selected.session.studentEmail || "No email"} · {selected.session.studentPhone || "No phone"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", lineHeight: 1, color: riskColor(riskScore) }}
                  >
                    {riskScore}
                  </span>
                  <span className="text-xs uppercase tracking-wide font-light" style={{ color: "var(--text-faint)" }}>{rLabel} risk</span>
                </div>
              </div>

              {/* Risk bar */}
              <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(200,190,220,0.2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(Math.max(riskScore, 0), 100)}%`, background: "linear-gradient(90deg, var(--teal), var(--risk-med), var(--risk-high))" }}
                />
              </div>

              {/* Barriers */}
              <div>
                <p className="eyebrow mb-2">Detected barriers</p>
                {selected.barriers.length === 0 ? (
                  <p className="text-xs font-light" style={{ color: "var(--text-faint)" }}>No barriers detected yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.barriers.map((b) => (
                      <span key={b.id} className="chip chip-lavender">
                        {b.code.replace("_", " ")}
                        {b.notes && (
                          <span style={{ opacity: 0.6, marginLeft: 4 }}>· {b.severity}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Case summary + Analyze button */}
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.6)" }}>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="eyebrow">Case summary</p>
                  <div className="flex gap-2">
                    {/* Analyze with Claude */}
                    <button
                      type="button"
                      disabled={analyzingSession}
                      className="btn-glass-primary"
                      style={{
                        padding: "5px 12px",
                        fontSize: "11px",
                        background: analyzingSession
                          ? "rgba(155,142,196,0.4)"
                          : "linear-gradient(135deg, rgba(126,184,176,0.85), rgba(155,142,196,0.85))",
                      }}
                      onClick={handleAnalyzeSession}
                    >
                      {analyzingSession ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          Analyzing…
                        </span>
                      ) : "✦ Analyze with Claude"}
                    </button>
                    {/* Fallback local summary */}
                    <button
                      type="button"
                      disabled={generatingSummary}
                      className="btn-glass-secondary"
                      style={{ padding: "5px 12px", fontSize: "11px" }}
                      onClick={async () => {
                        if (!selected) return;
                        setGeneratingSummary(true);
                        try {
                          const summary = buildCaseSummary(selected);
                          await api.post(`/session/${selected.session.id}/event`, { type: "SUMMARY", summaryText: summary });
                          setSelected((prev) => prev ? { ...prev, session: { ...prev.session, summaryText: summary } } : prev);
                        } finally { setGeneratingSummary(false); }
                      }}
                    >
                      {generatingSummary ? "Generating…" : "Quick summary"}
                    </button>
                  </div>
                </div>

                {analyzeError && (
                  <p className="text-xs mb-2" style={{ color: "var(--risk-high)" }}>{analyzeError}</p>
                )}

                <p className="text-xs leading-relaxed font-light" style={{ color: "var(--text-secondary)" }}>
                  {summaryBody || selected.session.summaryText || "No case summary yet. Click 'Analyze with Claude' to generate an AI-powered analysis."}
                </p>
              </div>

              {/* Emotional Insight (from Raven-1 perception analysis) */}
              {(selected.session.emotionalInsight || perceptionHighlights) && (
                <div>
                  <p className="eyebrow mb-2" style={{ color: "var(--lavender-dark)" }}>Emotional insight</p>
                  <div style={{
                    background: "rgba(155,142,196,0.08)",
                    border: "1px solid rgba(155,142,196,0.2)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                  }}>
                    <p style={{
                      fontSize: "12px",
                      fontStyle: "italic",
                      color: "var(--text-primary)",
                      lineHeight: 1.7,
                      fontWeight: 300,
                    }}>
                      &ldquo;{selected.session.emotionalInsight ?? perceptionHighlights}&rdquo;
                    </p>
                    <p style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      marginTop: "6px",
                      fontWeight: 400,
                    }}>
                      Based on visual behavior analysis (Raven-1)
                    </p>
                  </div>
                </div>
              )}

              {/* Perception Highlights (shown immediately after manual analysis) */}
              {perceptionHighlights && !selected.session.emotionalInsight && (
                <div>
                  <p className="eyebrow mb-2" style={{ color: "var(--lavender-dark)" }}>Perception highlights</p>
                  <div style={{
                    background: "rgba(155,142,196,0.06)",
                    border: "1px solid rgba(155,142,196,0.15)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                  }}>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.7, fontWeight: 300 }}>
                      {perceptionHighlights}
                    </p>
                  </div>
                </div>
              )}

              {/* Next Steps (from Claude analysis) */}
              {nextSteps.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "rgba(126,184,176,0.06)", border: "1px solid rgba(126,184,176,0.2)" }}>
                  <p className="eyebrow mb-3" style={{ color: "var(--teal-dark)" }}>Recommended next steps</p>
                  <div className="flex flex-col gap-2">
                    {nextSteps.map((step, i) => {
                      const done = completedSteps[i] ?? false;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCompletedSteps((prev) => ({ ...prev, [i]: !done }))}
                          className="flex items-start gap-2.5 text-left w-full group"
                        >
                          {/* Circle checkbox */}
                          <div
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all"
                            style={{
                              background: done ? "rgba(74,158,149,0.15)" : "rgba(255,255,255,0.6)",
                              border: `1.5px solid ${done ? "var(--teal-dark)" : "rgba(126,184,176,0.4)"}`,
                            }}
                          >
                            {done && (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--teal-dark)" strokeWidth="2" strokeLinecap="round">
                                <polyline points="2,6 5,9 10,3" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-xs leading-relaxed font-light"
                            style={{
                              color: done ? "var(--text-faint)" : "var(--text-secondary)",
                              textDecoration: done ? "line-through" : "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {step}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Follow-up scheduling */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p className="eyebrow">Follow-up calls</p>
                  <button
                    type="button"
                    onClick={() => setShowFollowUpForm((v) => !v)}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "rgba(126,184,176,0.1)", border: "1px solid rgba(126,184,176,0.25)", color: "var(--teal-dark)", cursor: "pointer" }}
                  >
                    + Schedule
                  </button>
                </div>

                {showFollowUpForm && (
                  <div style={{ background: "rgba(255,255,255,0.5)", borderRadius: 12, padding: 12, border: "1px solid rgba(255,255,255,0.7)", marginBottom: 8 }}>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      style={{ width: "100%", marginBottom: 6, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(200,190,220,0.3)", background: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                    />
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      style={{ width: "100%", marginBottom: 6, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(200,190,220,0.3)", background: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                    />
                    <textarea
                      placeholder="Notes for this call…"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      style={{ width: "100%", marginBottom: 6, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(200,190,220,0.3)", background: "rgba(255,255,255,0.7)", resize: "none", height: 60, boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!followUpDate || !followUpTime || !selectedId) return;
                        const scheduledFor = new Date(`${followUpDate}T${followUpTime}`);
                        await fetch(`/api/session/${selectedId}/followup`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ scheduledFor, counselorName: "Navigator", notes: followUpNotes }),
                        });
                        setShowFollowUpForm(false);
                        setFollowUpDate("");
                        setFollowUpTime("");
                        setFollowUpNotes("");
                        const r = await fetch(`/api/session/${selectedId}/followups`);
                        const data = await r.json() as FollowUpItem[];
                        setFollowUps(Array.isArray(data) ? data : []);
                      }}
                      style={{ width: "100%", padding: 7, borderRadius: 8, fontSize: 12, background: "linear-gradient(135deg,#7eb8b0,#9b8ec4)", color: "#fff", border: "none", cursor: "pointer" }}
                    >
                      Schedule call
                    </button>
                  </div>
                )}

                {followUps.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {followUps.map((fu) => (
                      <div
                        key={fu.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 10px", borderRadius: 8,
                          background: fu.status === "COMPLETED" ? "rgba(74,158,149,0.08)" : "rgba(255,255,255,0.5)",
                          border: `1px solid ${fu.status === "COMPLETED" ? "rgba(74,158,149,0.2)" : "rgba(255,255,255,0.7)"}`,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                            {new Date(fu.scheduledFor).toLocaleDateString()} at {new Date(fu.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {fu.notes && <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{fu.notes}</div>}
                        </div>
                        {fu.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/followup/${fu.id}/complete`, { method: "PATCH" });
                              const r = await fetch(`/api/session/${selectedId}/followups`);
                              const data = await r.json() as FollowUpItem[];
                              setFollowUps(Array.isArray(data) ? data : []);
                            }}
                            style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(74,158,149,0.1)", border: "1px solid rgba(74,158,149,0.2)", color: "var(--teal-dark)", cursor: "pointer" }}
                          >
                            Mark done ✓
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat thread */}
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Chat thread</p>
                <div
                  className="flex flex-col gap-2 overflow-y-auto rounded-xl px-3 py-3"
                  style={{ height: "7rem", background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.6)" }}
                >
                  {selected.chatMessages.length === 0 ? (
                    <p className="text-xs font-light" style={{ color: "var(--text-faint)" }}>No messages yet.</p>
                  ) : (
                    selected.chatMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender === "STAFF" ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[72%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                          style={
                            m.sender === "STAFF"
                              ? { background: "rgba(155,142,196,0.15)", border: "1px solid rgba(155,142,196,0.2)", color: "var(--lavender-dark)" }
                              : { background: "rgba(126,184,176,0.12)", border: "1px solid rgba(126,184,176,0.2)", color: "var(--teal-dark)" }
                          }
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleSendStaffMessage(draft); setDraft(""); }
                    }}
                    placeholder="Type a message to the student…"
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      backdropFilter: "blur(12px)",
                      color: "var(--text-primary)",
                    }}
                    disabled={!selected || !socketRef.current}
                  />
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    style={{ padding: "8px 16px", fontSize: "12px" }}
                    onClick={() => { handleSendStaffMessage(draft); setDraft(""); }}
                    disabled={!draft.trim() || !selected || !socketRef.current}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
