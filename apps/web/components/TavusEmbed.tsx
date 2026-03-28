"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

interface TavusEmbedProps {
  sessionId?: string | null;
  /** When provided, renders this URL directly — skips the internal start-session flow */
  url?: string | null;
}

interface TavusStartResponse {
  tavusSessionUrl: string;
}

const isDev = process.env.NODE_ENV === "development";

export function TavusEmbed({ sessionId, url: externalUrl }: TavusEmbedProps) {
  const [internalUrl, setInternalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUrl = externalUrl ?? internalUrl;

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tavus/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error(`Failed to start Tavus session (${res.status})`);
      const data = (await res.json()) as TavusStartResponse;
      setInternalUrl(data.tavusSessionUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start Tavus session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="w-full h-full overflow-hidden" style={{ borderRadius: 0 }}>
        {activeUrl ? (
          <iframe
            src={activeUrl}
            title="Tavus session"
            className="h-full w-full border-0"
            allow="camera *; microphone *; autoplay *; display-capture *; fullscreen *"
            allowFullScreen
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg, #f5f0fa, #f0f7f6)" }}
          >
            <p className="text-sm font-light" style={{ color: "#7a6d85" }}>
              Tavus session not started.
            </p>
            {sessionId && (
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="btn-glass-primary"
                style={{ fontSize: "12px", padding: "8px 20px" }}
              >
                {loading ? "Starting..." : "Start Tavus Session"}
              </button>
            )}
            {error && (
              <p className="text-xs" style={{ color: "var(--risk-high)" }}>{error}</p>
            )}
          </div>
        )}
      </div>

      {isDev && sessionId ? (
        <details className="mt-1 rounded-xl border border-dashed px-3 py-2 text-xs" style={{ borderColor: "rgba(155,142,196,0.2)", background: "rgba(255,255,255,0.4)" }}>
          <summary className="cursor-pointer select-none text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            Demo Controls
          </summary>
          <p className="mt-1 text-[10px] font-light" style={{ color: "var(--text-faint)" }}>
            Simulate API events for live demos via{" "}
            <code style={{ fontFamily: "monospace", color: "var(--lavender-dark)" }}>/v1/session/:id/event</code>.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DemoButton label="Low Risk" payload={{ type: "RISK", riskScore: 10 }} sessionId={sessionId} />
            <DemoButton label="Medium Risk" payload={{ type: "RISK", riskScore: 45 }} sessionId={sessionId} />
            <DemoButton label="High Risk" payload={{ type: "RISK", riskScore: 85 }} sessionId={sessionId} />
            <DemoButton label="Barrier: Work" payload={{ type: "BARRIER", code: "WORK", severity: "MEDIUM" }} sessionId={sessionId} />
            <DemoButton label="Barrier: Mental Health" payload={{ type: "BARRIER", code: "MENTAL_HEALTH", severity: "HIGH" }} sessionId={sessionId} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

interface DemoButtonProps {
  label: string;
  sessionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

function DemoButton({ label, sessionId, payload }: DemoButtonProps) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    setOk(false);
    try {
      await api.post(`/session/${sessionId}/event`, payload);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      // ignore for demo
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all"
      style={{
        background: "rgba(255,255,255,0.6)",
        border: "1px solid rgba(200,190,220,0.3)",
        color: "var(--text-secondary)",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {label}
      {ok ? <Badge variant="success">✓</Badge> : null}
    </button>
  );
}
