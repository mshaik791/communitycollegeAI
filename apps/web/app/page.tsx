"use client";

import Link from "next/link";
import { AVATARS } from "@/lib/tavus/personas";

const avatarImpact: Record<string, string> = {
  navi: "Converts registrations into enrollments by eliminating setup friction.",
  sofi: "Resolves myGateway, Canvas & OTP issues before they cause drops.",
  marco: "Intercepts withdrawal intent after hours using motivational interviewing.",
  luna: "Replaces click-through orientation with real comprehension checks.",
  alex: "Connects students to childcare, transport, food, and financial aid.",
};

export default function HomePage() {
  const avatarList = Object.values(AVATARS);

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── 1. STICKY NAV ── */}
      <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-8 py-3">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-semibold border border-white/30"
            style={{
              background: "linear-gradient(135deg, #7eb8b0, #9b8ec4)",
              boxShadow: "0 2px 12px rgba(126,184,176,0.35)",
            }}
          >
            SR
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[#2d2438]">Navigator Suite</span>
            <span className="text-[10px] text-[#9a8fa0]">Student Retention Platform</span>
          </div>
        </div>

        {/* Center: Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {["Platform", "Avatars", "Integrations", "ROI"].map((label) => (
            <button
              key={label}
              type="button"
              className="text-sm text-[#9a8fa0] px-4 py-1.5 rounded-lg hover:bg-white/50 hover:text-[#2d2438] transition-all cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="pill-live">
            <span className="dot-live" />
            Live
          </div>
          <Link
            href="/portal"
            className="px-5 py-2 rounded-xl text-sm font-medium text-white border border-white/30 transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, rgba(126,184,176,0.9), rgba(155,142,196,0.9))",
              boxShadow: "0 4px 16px rgba(126,184,176,0.25)",
            }}
          >
            See it live →
          </Link>
        </div>
      </nav>

      {/* ── 2. HERO ── */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-16 relative">
        {/* Ambient blobs */}
        <div
          className="absolute w-80 h-64 -top-10 -left-16 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(126,184,176,0.18), transparent 70%)", filter: "blur(50px)" }}
        />
        <div
          className="absolute w-72 h-56 top-0 -right-10 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(155,142,196,0.14), transparent 70%)", filter: "blur(50px)" }}
        />

        {/* Eyebrow */}
        <div className="relative z-10 flex items-center gap-2 mb-5">
          <div className="w-6 h-px bg-[#7eb8b0] opacity-50" />
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7eb8b0]">
            AI-Powered Student Retention
          </span>
          <div className="w-6 h-px bg-[#7eb8b0] opacity-50" />
        </div>

        {/* H1 */}
        <h1
          className="font-serif relative z-10 mb-5 tracking-[-0.01em] max-w-2xl"
          style={{ fontSize: "54px", lineHeight: 1.08 }}
        >
          Stop dropouts<br />
          before they{" "}
          <em className="italic text-[#9b8ec4]">happen.</em>
        </h1>

        {/* Subtext */}
        <p className="relative z-10 text-base font-light leading-[1.85] text-[#7a6d85] max-w-xl mb-8">
          Navigator Suite intercepts at-risk students the moment they consider withdrawing —
          using AI video counselors, real-time staff alerts, and deep integrations with your
          existing systems.
        </p>

        {/* Buttons */}
        <div className="relative z-10 flex gap-3 items-center mb-10 flex-wrap">
          <Link
            href="/portal"
            className="px-7 py-3.5 rounded-xl text-sm font-medium text-white border border-white/30 transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, rgba(126,184,176,0.9), rgba(155,142,196,0.9))",
              boxShadow: "0 6px 24px rgba(126,184,176,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            See a live interception →
          </Link>
          <Link
            href="/staff"
            className="px-7 py-3.5 rounded-xl text-sm font-light text-[#7a6d85] transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(255,255,255,0.85)",
              boxShadow: "0 2px 12px rgba(155,142,196,0.08)",
            }}
          >
            Staff dashboard →
          </Link>
        </div>

        {/* Trust bar */}
        <div
          className="relative z-10 inline-flex items-center gap-6 px-5 py-3.5 glass rounded-2xl flex-wrap"
        >
          {[
            { color: "rgba(126,184,176,0.15)", text: "#4a9e95", label: "Integrates with Starfish & Banner" },
            { color: "rgba(155,142,196,0.12)", text: "#7c5cbf", label: "FERPA · SOC 2 · HIPAA compliant" },
            { color: "rgba(240,160,112,0.15)", text: "#c08830", label: "9 languages supported" },
            { color: "rgba(224,128,128,0.12)", text: "#c05050", label: "Deploy in days, not months" },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-2">
              {i > 0 && <div className="w-px h-4 bg-[rgba(200,190,220,0.3)]" />}
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                style={{ background: item.color, color: item.text }}
              >
                ✦
              </div>
              <span className="text-xs text-[#7a6d85]">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. STATS BAND ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto px-8 mb-16">
        {[
          {
            bar: "linear-gradient(90deg, #7eb8b0, #a8d4d0)",
            num: "68%",
            label: "Avg. retention improvement",
            sub: "Of intercepted students stay enrolled",
          },
          {
            bar: "linear-gradient(90deg, #9b8ec4, #b8aed8)",
            num: "$2.5M",
            label: "FTES revenue recovered",
            sub: "From Navi alone, per year",
          },
          {
            bar: "linear-gradient(90deg, #f0a070, #e8c090)",
            num: "<90s",
            label: "AI response time",
            sub: "From withdrawal click to counselor",
          },
          {
            bar: "linear-gradient(90deg, #e08080, #e8a0a0)",
            num: "48%",
            label: "Never enroll after registering",
            sub: "The gap Navi was built to close",
          },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="w-full h-[3px] rounded-full mb-4" style={{ background: s.bar }} />
            <div className="font-serif text-4xl text-[#2d2438] mb-1">{s.num}</div>
            <div className="text-xs text-[#9a8fa0] mb-1">{s.label}</div>
            <div className="text-[11px] text-[#b0a4ba] font-light">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 4. HOW IT WORKS ── */}
      <section className="max-w-5xl mx-auto px-8 mb-20">
        <p className="eyebrow mb-3">How it works</p>
        <h2 className="font-serif text-4xl mb-2">
          Intercept. Understand.
        </h2>
        <h2 className="font-serif text-4xl italic text-[#9b8ec4] mb-6">Retain.</h2>
        <p className="font-light text-sm leading-loose text-[#7a6d85] max-w-xl mb-9">
          Navigator Suite sits inside your existing student systems. When a student signals
          dropout risk, the platform activates immediately — no manual monitoring required.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              num: "01",
              color: "rgba(126,184,176,0.12)",
              textColor: "#4a9e95",
              title: "Risk is detected automatically",
              body: "When a student clicks withdraw, misses logins, or triggers a Starfish risk flag — Navigator Suite intercepts in real time, before the dropout is recorded.",
            },
            {
              num: "02",
              color: "rgba(155,142,196,0.1)",
              textColor: "#7c5cbf",
              title: "An AI counselor starts a conversation",
              body: "One of 5 specialized AI video avatars engages the student immediately — identifying the real barrier (work, finances, tech, mental health) and offering targeted resources.",
            },
            {
              num: "03",
              color: "rgba(240,160,112,0.12)",
              textColor: "#c08830",
              title: "Staff get the full picture instantly",
              body: "Your navigators see live alerts, detected barrier codes, conversation transcripts, and risk scores — logged automatically to Starfish. No dual entry. No lag.",
            },
          ].map((step) => (
            <div key={step.num} className="glass rounded-2xl p-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold mb-4"
                style={{ background: step.color, color: step.textColor }}
              >
                {step.num}
              </div>
              <h3 className="font-serif text-lg text-[#2d2438] mb-3">{step.title}</h3>
              <p className="text-sm font-light leading-loose text-[#7a6d85]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. NAVIGATOR SUITE AVATARS ── */}
      <section className="max-w-5xl mx-auto px-8 mb-20">
        <p className="eyebrow mb-3">The Navigator Suite</p>
        <h2 className="font-serif text-4xl mb-1">Five AI counselors.</h2>
        <h2 className="font-serif text-4xl italic text-[#9b8ec4] mb-4">
          One for every dropout risk.
        </h2>
        <p className="font-light text-sm leading-loose text-[#7a6d85] max-w-xl mb-9">
          Each avatar is trained on a specific barrier type, speaks 9 languages,
          and escalates to human staff when needed.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {avatarList.map((persona) => (
            <div
              key={persona.id}
              className="glass rounded-2xl p-5 text-center relative transition-all duration-200 cursor-pointer hover:-translate-y-1"
              style={{
                ["--hover-shadow" as string]: "0 12px 40px rgba(155,142,196,0.15)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(155,142,196,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: persona.accentColor, borderRadius: "16px 16px 0 0" }}
              />

              {/* Avatar circle */}
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${persona.accentColor}, ${persona.accentColor}cc)`,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }}
              >
                {persona.name[0]}
              </div>

              <div className="font-serif text-lg text-[#2d2438] mb-1">{persona.name}</div>
              <div className="text-[11px] font-light text-[#9a8fa0] mb-3 leading-relaxed">
                {persona.role}
              </div>

              <div
                className="inline-block px-3 py-1 rounded-full text-[10px] font-medium mb-3"
                style={{
                  background: "rgba(126,184,176,0.1)",
                  border: "1px solid rgba(126,184,176,0.25)",
                  color: "#4a9e95",
                }}
              >
                {persona.targetPopulation.length > 28
                  ? persona.targetPopulation.slice(0, 28) + "…"
                  : persona.targetPopulation}
              </div>

              <p className="text-[11px] font-light text-[#7a6d85] leading-relaxed">
                {avatarImpact[persona.id] ?? ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. INTEGRATIONS ── */}
      <section className="max-w-5xl mx-auto px-8 mb-20">
        <p className="eyebrow mb-3">Integrations</p>
        <h2 className="font-serif text-4xl mb-1">Works with the systems</h2>
        <h2 className="font-serif text-4xl italic text-[#9b8ec4] mb-4">you already use.</h2>
        <p className="font-light text-sm leading-loose text-[#7a6d85] max-w-xl mb-9">
          Navigator Suite plugs into your existing stack in days — not months. No rip-and-replace.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: "🎓",
              bg: "rgba(126,184,176,0.12)",
              name: "EAB Starfish",
              desc: "Barrier codes, outcomes, and follow-up actions logged automatically after every AI conversation. No dual entry for your navigators.",
            },
            {
              icon: "🏛",
              bg: "rgba(155,142,196,0.1)",
              name: "Ellucian Banner",
              desc: "Student records and enrollment data flow into risk scoring — so the platform knows who to flag before they click withdraw.",
            },
            {
              icon: "📚",
              bg: "rgba(240,160,112,0.12)",
              name: "Canvas LMS",
              desc: "Login patterns and assignment submissions feed the real-time risk engine — catching disengagement early.",
            },
            {
              icon: "💬",
              bg: "rgba(126,184,176,0.1)",
              name: "SMS via Twilio",
              desc: "Navigators send avatar conversation links directly to students via text — the most effective outreach channel for community college populations.",
            },
            {
              icon: "📹",
              bg: "rgba(155,142,196,0.08)",
              name: "Zoom live handoff",
              desc: "When AI determines a student needs a human, it generates a Zoom session routed to the right counselor in under 60 seconds.",
            },
            {
              icon: "🌐",
              bg: "rgba(224,128,128,0.1)",
              name: "Your website",
              desc: "Avatars embed on any page via iframe — registration confirmation, myGateway login, department pages — wherever students need support.",
            },
          ].map((intg) => (
            <div key={intg.name} className="glass rounded-2xl p-6 flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: intg.bg }}
              >
                {intg.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-[#2d2438] mb-1.5">{intg.name}</div>
                <div className="text-xs font-light text-[#7a6d85] leading-relaxed">{intg.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. ROI SECTION ── */}
      <section className="max-w-5xl mx-auto px-8 mb-20">
        <p className="eyebrow mb-3">Return on investment</p>
        <h2 className="font-serif text-4xl mb-1">One avatar pays for</h2>
        <h2 className="font-serif text-4xl italic text-[#9b8ec4] mb-8">the entire platform.</h2>

        <div className="glass-strong rounded-3xl p-10 relative">
          {/* Ambient blob */}
          <div
            className="absolute w-64 h-48 -top-10 -left-10 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(rgba(126,184,176,0.2), transparent 70%)",
              filter: "blur(30px)",
            }}
          />

          <div className="relative grid md:grid-cols-[1fr_1px_1fr] gap-10 md:gap-16 items-center">
            {/* Left */}
            <div>
              <div className="font-serif text-6xl text-[#2d2438] mb-2">$2.5M</div>
              <p className="text-sm font-light text-[#7a6d85] leading-loose max-w-xs">
                Projected annual FTES revenue recovered — from Navi alone, converting just 10%
                of students who register but never enroll.
              </p>
              <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(200,190,220,0.25)" }}>
                <div className="text-xs text-[#9a8fa0] mb-1">Platform investment</div>
                <div className="font-serif text-3xl text-[#2d2438]">$300K / year</div>
                <div className="text-xs font-light text-[#7a6d85] mt-1">
                  Full Navigator Suite · All 5 avatars · Unlimited sessions
                </div>
              </div>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block w-px self-stretch" style={{ background: "rgba(200,190,220,0.3)" }} />

            {/* Right */}
            <div>
              <div className="text-sm font-medium text-[#2d2438] mb-4">What&apos;s included</div>
              {[
                "5 specialized AI video avatars, each with unique persona and knowledge base",
                "Real-time risk detection and automatic Starfish logging",
                "Staff dashboard with live alerts, session queue, and chat inbox",
                "Analytics command center — retention rates, barrier trends, demographics",
                "9 language support · FERPA · SOC 2 · HIPAA compliant",
                "Banner, Starfish, Canvas, Twilio, Zoom integrations included",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm font-light text-[#7a6d85] leading-relaxed mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7eb8b0] mt-2 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. BOTTOM CTA ── */}
      <section className="max-w-5xl mx-auto px-8 mb-20">
        <div className="glass-strong rounded-3xl p-14 text-center relative overflow-hidden">
          {/* Blobs */}
          <div
            className="absolute w-72 h-52 -top-14 -left-10 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(rgba(126,184,176,0.15), transparent 70%)", filter: "blur(40px)" }}
          />
          <div
            className="absolute w-60 h-48 -bottom-10 -right-10 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(rgba(155,142,196,0.12), transparent 70%)", filter: "blur(40px)" }}
          />

          <p className="eyebrow relative mb-4">Ready to see it in action?</p>
          <h2
            className="font-serif relative leading-tight mb-4"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
          >
            Watch a live dropout<br />
            get intercepted in real time.
          </h2>
          <p className="text-base font-light leading-loose text-[#7a6d85] max-w-lg mx-auto mb-8 relative">
            See the full journey — from withdrawal click to AI counselor conversation to staff
            alert — in under two minutes.
          </p>
          <div className="flex gap-4 justify-center relative flex-wrap">
            <Link
              href="/portal"
              className="px-8 py-4 rounded-xl text-base font-medium text-white border border-white/30 transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(126,184,176,0.9), rgba(155,142,196,0.9))",
                boxShadow: "0 6px 24px rgba(126,184,176,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              Launch student demo →
            </Link>
            <Link
              href="/staff"
              className="px-8 py-4 rounded-xl text-base font-light text-[#7a6d85] transition-all hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "0 2px 12px rgba(155,142,196,0.08)",
              }}
            >
              Open staff dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. FOOTER ── */}
      <footer
        className="py-6 px-8 max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4"
        style={{ borderTop: "1px solid rgba(200,190,220,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-semibold"
            style={{ background: "linear-gradient(135deg, #7eb8b0, #9b8ec4)" }}
          >
            SR
          </div>
          <span className="text-xs font-light text-[#b0a4ba]">
            Navigator Suite · Student Retention Platform
          </span>
        </div>
        <div className="flex gap-5">
          <span className="text-xs font-light text-[#b0a4ba]">Powered by Tavus AI</span>
          <span className="text-xs font-light text-[#b0a4ba]">FERPA · SOC 2 · HIPAA</span>
          <span className="text-xs font-light text-[#b0a4ba]">© 2026</span>
        </div>
      </footer>

    </div>
  );
}
