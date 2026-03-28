"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATARS, type AvatarId, type AvatarPersona } from "@/lib/tavus/personas";

const LANGUAGES = [
  { code: "multilingual", label: "Auto-detect",  flag: "🌐" },
  { code: "en",           label: "English",       flag: "🇺🇸" },
  { code: "es",           label: "Español",       flag: "🇪🇸" },
  { code: "vi",           label: "Tiếng Việt",    flag: "🇻🇳" },
  { code: "ar",           label: "العربية",       flag: "🇸🇦" },
  { code: "tl",           label: "Tagalog",       flag: "🇵🇭" },
  { code: "ko",           label: "한국어",         flag: "🇰🇷" },
  { code: "zh",           label: "中文",           flag: "🇨🇳" },
  { code: "fa",           label: "فارسی",         flag: "🇮🇷" },
  { code: "uk",           label: "Українська",    flag: "🇺🇦" },
];

export default function AvatarsPage() {
  const router = useRouter();
  const [launching, setLaunching] = useState<AvatarId | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<Record<string, boolean>>({});
  const [selectedLang, setSelectedLang] = useState("multilingual");

  const avatarList = Object.values(AVATARS) as AvatarPersona[];

  // Fetch live configuration status from the debug endpoint
  useEffect(() => {
    fetch("/api/tavus/debug")
      .then((r) => r.json())
      .then((data: { avatars: { id: string; configured: boolean }[] }) => {
        const status: Record<string, boolean> = {};
        data.avatars.forEach((a) => { status[a.id] = a.configured; });
        setAvatarStatus(status);
      })
      .catch(() => {});
  }, []);

  const handleLaunch = async (avatarId: AvatarId) => {
    setLaunching(avatarId);
    const sessionId = `demo-${avatarId}-${Date.now()}`;
    try {
      const res = await fetch("/api/tavus/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, avatarId, language: selectedLang }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { tavusSessionUrl?: string };
      if (!data.tavusSessionUrl) throw new Error("No URL returned");
      // Pass the Tavus URL directly so intercept doesn't need a second API call
      router.push(
        `/intercept?sessionId=${encodeURIComponent(sessionId)}&avatarId=${avatarId}&tavusUrl=${encodeURIComponent(data.tavusSessionUrl)}`
      );
    } catch {
      // Persona not configured or API error — show demo placeholder
      router.push(`/intercept?avatarId=${avatarId}&demo=true`);
    }
    // setLaunching intentionally not cleared — we navigate away
  };

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">NOCE Navigator Suite</p>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2rem" }}>
          Meet your support team.
        </h1>
        <p className="mt-2 text-base font-light" style={{ color: "var(--text-secondary)" }}>
          Five AI counselors, each trained for a different part of your journey.
        </p>
      </div>

      {/* Language selector */}
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Student language</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLang(lang.code)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  background: isSelected ? "rgba(126,184,176,0.15)" : "rgba(255,255,255,0.35)",
                  border: isSelected
                    ? "1.5px solid rgba(126,184,176,0.5)"
                    : "1.5px solid rgba(255,255,255,0.6)",
                  color: isSelected ? "var(--teal-dark)" : "var(--text-secondary)",
                  fontWeight: isSelected ? 500 : 300,
                  boxShadow: isSelected ? "0 2px 8px rgba(126,184,176,0.15)" : "none",
                  cursor: "pointer",
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Avatar grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
        {avatarList.map((persona) => {
          const isLaunching = launching === persona.id;
          // Use live status from debug endpoint; fall back to static check if not loaded yet
          const configured =
            persona.id in avatarStatus
              ? avatarStatus[persona.id]
              : !!(persona.replicaId && persona.personaId);

          return (
            <div
              key={persona.id}
              className="glass flex flex-col gap-4 p-5 transition-all duration-200"
              style={{ borderTop: `3px solid ${persona.accentColor}`, borderRadius: "16px" }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${persona.accentColor}25, var(--shadow-glass)`;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              {/* Avatar row */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${persona.accentColor}, ${persona.accentColor}99)`,
                    boxShadow: `0 4px 16px ${persona.accentColor}40`,
                  }}
                >
                  {persona.name[0]}
                </div>
                <div className="min-w-0">
                  <span
                    className="font-medium text-base block"
                    style={{ color: "var(--text-primary)", fontFamily: "Instrument Sans, sans-serif", fontWeight: 500 }}
                  >
                    {persona.name}
                  </span>
                  <p className="text-xs font-light" style={{ color: "var(--text-muted)" }}>
                    {persona.role}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="flex-1 text-sm leading-relaxed font-light" style={{ color: "var(--text-secondary)" }}>
                {persona.description}
              </p>

              {/* Target population */}
              <div>
                <p className="eyebrow mb-1.5" style={{ fontSize: "10px" }}>Target population</p>
                <span className="chip chip-teal">{persona.targetPopulation}</span>
              </div>

              {/* Status + launch */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Live config status badge */}
                {configured ? (
                  <span className="chip chip-green" style={{ fontSize: "10px" }}>● Ready</span>
                ) : (
                  <span
                    className="chip"
                    style={{
                      background: "rgba(192,136,48,0.08)",
                      border: "1px solid rgba(192,136,48,0.2)",
                      color: "var(--risk-med)",
                      fontSize: "10px",
                    }}
                  >
                    ○ Not configured
                  </span>
                )}

                <button
                  type="button"
                  disabled={isLaunching}
                  onClick={() => handleLaunch(persona.id)}
                  className="btn-glass-primary inline-flex items-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${persona.accentColor}dd, ${persona.accentColor}99)`,
                    padding: "7px 16px",
                    fontSize: "12px",
                    opacity: isLaunching ? 0.7 : 1,
                    minWidth: "140px",
                    justifyContent: "center",
                  }}
                >
                  {isLaunching ? (
                    <>
                      <svg
                        className="animate-spin"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    "Launch conversation →"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p
        className="text-xs leading-relaxed px-4 py-3 rounded-xl font-light"
        style={{
          color: "var(--text-muted)",
          background: "rgba(255,255,255,0.35)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        Each avatar has a unique persona and knowledge base configured in the Tavus dashboard.
        Update persona IDs in{" "}
        <code style={{ fontFamily: "monospace", color: "var(--lavender-dark)" }}>
          lib/tavus/personas.ts
        </code>{" "}
        as you create each one. Test configuration at{" "}
        <code style={{ fontFamily: "monospace", color: "var(--lavender-dark)" }}>
          /api/tavus/debug
        </code>.
      </p>
    </div>
  );
}
