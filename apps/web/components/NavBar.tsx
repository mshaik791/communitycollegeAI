"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Platform" },
  { href: "/portal", label: "For Students" },
  { href: "/avatars", label: "Avatars" },
  { href: "/staff", label: "Staff" },
  { href: "/analytics", label: "Analytics" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="glass-nav sticky top-0 z-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #7eb8b0, #9b8ec4)",
              boxShadow: "0 4px 12px rgba(126,184,176,0.4)",
            }}
          >
            SR
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Student Retention
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              NOCE Demo
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  color: isActive ? "var(--lavender-dark)" : "var(--text-secondary)",
                  background: isActive ? "rgba(255,255,255,0.55)" : "transparent",
                  border: isActive ? "1px solid rgba(255,255,255,0.7)" : "1px solid transparent",
                  fontFamily: "Instrument Sans, sans-serif",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="pill-live">
          <span className="dot-live" />
          Live
        </div>
      </nav>
    </header>
  );
}
