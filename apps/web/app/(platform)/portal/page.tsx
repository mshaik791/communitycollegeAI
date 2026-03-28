"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATARS, type AvatarId, type AvatarPersona } from "@/lib/tavus/personas";
import { api } from "@/lib/api";

interface StartSessionResponse {
  sessionId: string;
  createdAt: string;
}

const avatarList = Object.values(AVATARS) as AvatarPersona[];

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

export default function PortalPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<AvatarId>("marco");
  const [selectedLang, setSelectedLang] = useState("multilingual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPersona = AVATARS[selectedId];

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<StartSessionResponse>("/session/start", {
        language: selectedLang,
        persona: selectedId,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sr_sessionId", res.sessionId);
      }
      router.push(
        `/intercept?sessionId=${encodeURIComponent(res.sessionId)}&avatarId=${selectedId}&autostart=true&lang=${selectedLang}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[80vh] w-full items-start justify-center pt-8">
      {/* Ambient blobs */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-96 h-96 blur-3xl opacity-25"
        style={{ background: "radial-gradient(ellipse, rgba(126,184,176,0.5) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 blur-3xl opacity-20"
        style={{ background: "radial-gradient(ellipse, rgba(155,142,196,0.5) 0%, transparent 70%)" }}
      />

      {/* Card */}
      <div className="glass-strong relative z-10 w-full max-w-md p-8 flex flex-col gap-6">

        {/* Avatar showcase row */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex -space-x-2">
            {avatarList.map((p) => (
              <div
                key={p.id}
                title={p.name}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white"
                style={{
                  background: `linear-gradient(135deg, ${p.accentColor}, ${p.accentColor}cc)`,
                  boxShadow: `0 2px 8px ${p.accentColor}30`,
                }}
              >
                {p.name[0]}
              </div>
            ))}
          </div>
          <p className="eyebrow">5 AI counselors ready to help</p>
        </div>

        {/* Heading */}
        <div className="text-center flex flex-col gap-1.5">
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "32px",
              color: "#2d2438",
              lineHeight: 1.15,
            }}
          >
            A support system that actually listens.
          </h1>
        </div>

        {/* Body */}
        <p
          className="text-sm text-center leading-loose"
          style={{ color: "var(--text-secondary)", fontWeight: 300 }}
        >
          Before making any decision about your enrollment, you deserve to talk to someone
          who understands what you&apos;re going through. Our AI counselors are available 24/7 —
          in your language, with no judgment.
        </p>

        {/* Language selector */}
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-center">Choose your language</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
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

        {/* Avatar selector pills */}
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-center">Who would you like to talk to?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {avatarList.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left"
                  style={{
                    background: isSelected ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)",
                    border: isSelected
                      ? `1.5px solid ${p.accentColor}60`
                      : "1.5px solid rgba(255,255,255,0.6)",
                    boxShadow: isSelected ? `0 2px 12px ${p.accentColor}20` : "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Small avatar circle */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${p.accentColor}, ${p.accentColor}cc)`,
                    }}
                  >
                    {p.name[0]}
                  </div>
                  <div>
                    <div
                      className="text-xs font-medium leading-tight"
                      style={{ color: isSelected ? p.accentColor : "var(--text-primary)" }}
                    >
                      {p.name}
                    </div>
                    <div className="text-[10px] font-light leading-tight" style={{ color: "var(--text-faint)" }}>
                      {p.role.split(" ").slice(0, 2).join(" ")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-center" style={{ color: "var(--risk-high)" }}>{error}</p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="btn-glass-primary w-full justify-center py-4"
          style={{ opacity: loading ? 0.7 : 1, fontSize: "14px" }}
        >
          {loading
            ? "Connecting..."
            : `Talk to ${selectedPersona?.name ?? "a counselor"} now →`}
        </button>

        {/* Reassurance */}
        <div className="reassure justify-center">
          <span>Confidential</span>
          <span>Available 24/7</span>
          <span>No judgment</span>
        </div>
      </div>
    </div>
  );
}
