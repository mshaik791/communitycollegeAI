"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/lib/api";

interface AnalyticsSummary {
  totalSessions: number;
  sessionsByStatus: Record<string, number>;
  avgRiskScore: number;
  riskBuckets: { low: number; medium: number; high: number };
  topBarriers: { code: string; count: number }[];
  avgTimeToFirstStaffMessage: number;
  languages: Record<string, number>;
  withdrawPreventedCount: number;
}

const RISK_COLORS = ["#4a9e95", "#c08830", "#c05050", "#9b8ec4"];
const PIE_COLORS = ["#4a9e95", "#c08830", "#c05050"];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETED": return "status-completed";
    case "ESCALATED": return "status-escalated";
    case "STARTED": return "status-started";
    default: return "chip";
  }
}

function riskClass(score: number): string {
  if (score >= 71) return "risk-high";
  if (score >= 40) return "risk-med";
  return "risk-low";
}

const tooltipStyle = {
  background: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(200,190,220,0.3)",
  borderRadius: "12px",
  fontSize: 11,
  color: "var(--text-secondary)",
  backdropFilter: "blur(16px)",
  boxShadow: "var(--shadow-glass)",
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let canceled = false;
    const fetchSummary = () => {
      api.get<AnalyticsSummary>("/analytics/summary?range=7d")
        .then((data) => { if (!canceled) { setSummary(data); setError(null); } })
        .catch((e) => { if (!canceled) setError(e instanceof Error ? e.message : "Failed to load analytics"); });
    };
    fetchSummary();
    const id = setInterval(() => { setTick((t) => t + 1); fetchSummary(); }, 5000);
    return () => { canceled = true; clearInterval(id); };
  }, []);

  const riskBucketData = useMemo(
    () => summary ? [
      { name: "Low", value: summary.riskBuckets.low },
      { name: "Medium", value: summary.riskBuckets.medium },
      { name: "High", value: summary.riskBuckets.high },
    ] : [],
    [summary],
  );

  const barrierData = useMemo(
    () => summary?.topBarriers.map((b) => ({ name: b.code.replace("_", " "), value: b.count })) ?? [],
    [summary],
  );

  const statusData = useMemo(
    () => summary ? Object.entries(summary.sessionsByStatus).map(([status, count]) => ({ status, count })) : [],
    [summary],
  );

  const languageData = useMemo(
    () => summary ? Object.entries(summary.languages).map(([language, count]) => ({ language, count })) : [],
    [summary],
  );

  interface RecentSessionRow {
    id: string;
    createdAt: string;
    status: string;
    riskScore: number;
    withdrawPrevented: boolean | null;
    topBarriers?: string;
  }

  interface SessionSnapshotDrilldown {
    session: AnalyticsSummary["languages"] & {
      id: string;
      createdAt: string;
      updatedAt: string;
      studentName: string | null;
      studentEmail: string | null;
      studentPhone: string | null;
      status: string;
      riskScore: number;
      withdrawPrevented: boolean | null;
      summaryText: string | null;
      transcriptText: string | null;
    };
    barriers: { id: string; code: string; severity: string; notes: string | null }[];
    callback: { id: string; status: string; counselorName: string } | null;
  }

  const [recent, setRecent] = useState<RecentSessionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<SessionSnapshotDrilldown | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  useEffect(() => {
    api.get<{ sessions: any[] }>("/analytics/sessions?limit=25").then((res) => {
      setRecent(res.sessions.map((s) => ({ id: s.id, createdAt: s.createdAt, status: s.status, riskScore: s.riskScore, withdrawPrevented: s.withdrawPrevented })));
    }).catch(() => {});
  }, []);

  const handleOpenDrilldown = (id: string) => {
    setSelectedId(id);
    api.get<SessionSnapshotDrilldown>(`/session/${id}`).then((snapshot) => {
      setDrilldown(snapshot);
      const topBarriers = snapshot.barriers.length > 0
        ? Array.from(new Set(snapshot.barriers.map((b) => b.code.replace("_", " ")))).join(", ")
        : undefined;
      setRecent((prev) => prev.map((r) => r.id === id ? { ...r, topBarriers } : r));
      setDrilldownOpen(true);
    }).catch(() => {});
  };

  const liveLabel = useMemo(() => `Live · every 5s · tick ${tick}`, [tick]);

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">President&apos;s View</p>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", lineHeight: 1.2 }}>
            Retention Command Center
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
            Real-time analytics for college leadership · Last 7 days
          </p>
        </div>
        <div className="pill-live shrink-0">
          <span className="dot-live" />
          {liveLabel}
        </div>
      </div>

      {error && (
        <p className="text-xs px-4 py-2 rounded-xl" style={{ color: "var(--risk-high)", background: "rgba(192,80,80,0.06)", border: "1px solid rgba(192,80,80,0.15)" }}>
          {error}
        </p>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {[
          { bar: "var(--lavender)", icon: "📊", label: "Total Sessions (7d)", value: summary?.totalSessions ?? "—" },
          { bar: "var(--teal)", icon: "🛡", label: "Withdraw Prevented", value: summary?.withdrawPreventedCount ?? "—" },
          { bar: "var(--risk-med)", icon: "⚡", label: "Avg. Risk Score", value: summary ? summary.avgRiskScore.toFixed(1) : "—", sub: "0–100 composite" },
          { bar: "var(--teal-dark)", icon: "⏱", label: "Avg Time to Staff", value: summary ? `${Math.round(summary.avgTimeToFirstStaffMessage)}s` : "—", sub: "From first student message" },
        ].map((kpi) => (
          <div key={kpi.label} className="stat-glass">
            <div className="stat-bar" style={{ background: kpi.bar }} />
            <div className="text-lg mb-1">{kpi.icon}</div>
            <div className="stat-num">{kpi.value}</div>
            <div className="stat-lbl">{kpi.label}</div>
            {kpi.sub && <div className="stat-sub">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Risk distribution */}
        <div className="glass p-5">
          <div className="mb-4" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "12px" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.1rem" }}>Risk distribution</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>Share of sessions by risk bucket</p>
          </div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskBucketData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {riskBucketData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontFamily: "Instrument Sans, sans-serif", fontSize: 11, color: "var(--text-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top barriers */}
        <div className="glass p-5">
          <div className="mb-4" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "12px" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.1rem" }}>Top barriers</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>Most common reasons students consider leaving</p>
          </div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barrierData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,190,220,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--text-muted)", fontFamily: "Instrument Sans" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="var(--lavender)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent sessions table */}
      <div>
        <div className="mb-4" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "12px" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.3rem" }}>Recent sessions</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>Click any row to view session detail</p>
        </div>
        <div className="glass overflow-hidden" style={{ padding: 0 }}>
          <table className="calm-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Created</th>
                <th>Risk</th>
                <th>Top barrier(s)</th>
                <th>Status</th>
                <th>Prevented?</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", fontWeight: 300 }}>No sessions yet.</td>
                </tr>
              ) : (
                recent.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      cursor: "pointer",
                      background: selectedId === r.id
                        ? "rgba(155,142,196,0.08)"
                        : i % 2 === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)",
                    }}
                    onClick={() => handleOpenDrilldown(r.id)}
                  >
                    <td style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text-faint)" }}>
                      {r.id.slice(0, 10)}…
                    </td>
                    <td style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={riskClass(r.riskScore)} style={{ fontFamily: "Instrument Sans, sans-serif" }}>{r.riskScore}</span>
                    </td>
                    <td style={{ fontWeight: 300 }}>{r.topBarriers ?? "—"}</td>
                    <td>
                      <span className={statusBadgeClass(r.status)}>{r.status}</span>
                    </td>
                    <td>
                      {r.withdrawPrevented === true ? (
                        <span className="chip chip-green">Yes</span>
                      ) : r.withdrawPrevented === false ? (
                        <span className="chip chip-rose">No</span>
                      ) : (
                        <span style={{ color: "var(--text-faint)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom charts */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="glass p-5">
          <div className="mb-4" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "12px" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.1rem" }}>Sessions by status</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>Lifecycle of withdrawal conversations</p>
          </div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,190,220,0.2)" />
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: "var(--text-muted)", fontFamily: "Instrument Sans" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-5">
          <div className="mb-4" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "12px" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.1rem" }}>Languages served</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>Distribution of session language codes</p>
          </div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={languageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,190,220,0.2)" />
                <XAxis dataKey="language" tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "Instrument Sans" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--teal-dark)" radius={[4, 4, 0, 0]}>
                  {languageData.map((entry, index) => (
                    <Cell key={entry.language} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Drilldown modal */}
      {drilldown && drilldownOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "rgba(45,36,56,0.4)", backdropFilter: "blur(12px)" }}
        >
          <div className="glass-strong w-full max-w-xl overflow-y-auto p-6" style={{ maxHeight: "80vh" }}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.3rem" }}>
                  {drilldown.session.studentName || "Session detail"}
                </h2>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                  {drilldown.session.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownOpen(false)}
                className="rounded-xl p-2 transition-colors"
                style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.7)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.6)" }}>
                <p className="eyebrow mb-2">Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
                  {drilldown.session.summaryText || "No summary captured yet."}
                </p>
              </div>

              <details className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.5)" }}>
                <summary className="cursor-pointer text-sm font-medium" style={{ color: "var(--text-secondary)", fontFamily: "Instrument Sans, sans-serif" }}>
                  Transcript
                </summary>
                <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "DM Mono, monospace", fontWeight: 300 }}>
                  {drilldown.session.transcriptText || "No transcript captured yet."}
                </pre>
              </details>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.5)" }}>
                  <p className="eyebrow mb-2">Escalation outcome</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
                    {drilldown.session.withdrawPrevented === true
                      ? "✅ Withdrawal prevented — student remained enrolled."
                      : drilldown.session.withdrawPrevented === false
                      ? "Student proceeded with withdrawal."
                      : "Outcome not recorded yet."}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.5)" }}>
                  <p className="eyebrow mb-2">Callback status</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
                    {drilldown.callback
                      ? `${drilldown.callback.status} (counselor ${drilldown.callback.counselorName})`
                      : "No callback requested."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
