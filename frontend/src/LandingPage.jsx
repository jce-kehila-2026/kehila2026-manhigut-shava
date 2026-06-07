import { useState, useEffect, useCallback } from "react";
import { useLang } from "./LanguageContext";

/* ══════════════════════════════════════════
   60-30-10 Palette
   60%  warm white / cream backgrounds
   30%  professional soft blue
   10%  coral accent (from the megaphone)
══════════════════════════════════════════ */
const C = {
  bg:        "#fdf9f7",
  bgSoft:    "#f0ebe5",
  bgWarm:    "#e8ddd6",
  blue:      "#4472b8",
  blueL:     "#6da3d4",
  blueD:     "#1d4896",
  bluePale:  "#daeaf8",
  blueGhost: "#f0f6fb",
  coral:     "#e8735a",
  coralL:    "#f5a08c",
  coralD:    "#c4503a",
  coralGhost:"#fdecea",
  ink:       "#111827",
  inkMid:    "#374151",
  inkLight:  "#6b7280",
  white:     "#ffffff",
};

/* ── Inject fonts + keyframes once ── */
if (!document.getElementById("lp-css")) {
  const s = document.createElement("style");
  s.id = "lp-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    .lp-root { font-family:'Plus Jakarta Sans',system-ui,sans-serif; color:${C.ink}; }
    .lp-root h1,.lp-root h2,.lp-root h3 { font-family:'Playfair Display',Georgia,serif; }

    @keyframes lp-overlay-out {
      0%   { transform:translateX(0); }
      100% { transform:translateX(110%); }
    }
    @keyframes lp-wave-sweep {
      0%   { transform:translateX(-160%) skewX(-4deg); opacity:1; }
      100% { transform:translateX(160%) skewX(-4deg); opacity:1; }
    }
    @keyframes lp-masc-in {
      from { opacity:0; transform:translateX(-50px) scale(0.94); }
      to   { opacity:1; transform:none; }
    }
    @keyframes lp-text-in {
      from { opacity:0; transform:translateX(40px); }
      to   { opacity:1; transform:none; }
    }
    @keyframes lp-fade-up {
      from { opacity:0; transform:translateY(24px); }
      to   { opacity:1; transform:none; }
    }
    @keyframes lp-float-a {
      0%,100% { transform:translateY(0)   rotate(-2deg); }
      50%     { transform:translateY(-14px) rotate(1.5deg); }
    }
    @keyframes lp-float-b {
      0%,100% { transform:translateY(-4px) rotate(2deg); }
      50%     { transform:translateY(-20px) rotate(-1deg); }
    }
    @keyframes lp-float-c {
      0%,100% { transform:translateY(0); }
      50%     { transform:translateY(-10px) rotate(-1.5deg); }
    }
    @keyframes lp-masc-float {
      0%,100% { transform:translateY(0); }
      50%     { transform:translateY(-8px); }
    }
    @keyframes lp-ring {
      0%   { transform:scale(0.2); opacity:0.7; }
      100% { transform:scale(2.6); opacity:0; }
    }
    @keyframes lp-btn-ripple {
      0%   { transform:scale(0); opacity:0.55; }
      100% { transform:scale(4.5); opacity:0; }
    }
    @keyframes lp-grad-flow {
      0%,100% { background-position:0% 50%; }
      50%     { background-position:100% 50%; }
    }
    @keyframes lp-intro-logo {
      from { opacity:0; transform:translateY(14px); }
      to   { opacity:1; transform:none; }
    }
    @keyframes lp-card-in {
      from { opacity:0; transform:translateY(16px) scale(0.92); }
      to   { opacity:1; transform:none; }
    }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════
   INTRO OVERLAY — cinematic wave wipe
══════════════════════════════════════ */
function IntroOverlay({ onDone }) {
  const [phase, setPhase] = useState(0);
  // 0 → show logo  1 → waves sweep  2 → overlay slides off

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 1550);
    const t3 = setTimeout(onDone, 2400);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: `linear-gradient(135deg, ${C.blueD} 0%, ${C.blue} 55%, ${C.blueL} 100%)`,
        animation: phase === 2 ? "lp-overlay-out 0.9s cubic-bezier(0.76,0,0.24,1) forwards" : "none",
        overflow: "hidden",
      }}
    >
      {/* Sweeping wave strips */}
      {phase >= 1 && [
        { w: "55%", opacity: 0.18, delay: "0s",     dur: "0.75s" },
        { w: "40%", opacity: 0.12, delay: "0.12s",  dur: "0.80s" },
        { w: "30%", opacity: 0.22, delay: "0.22s",  dur: "0.70s" },
      ].map((wv, i) => (
        <div
          key={i}
          style={{
            position: "absolute", top: "-8%", bottom: "-8%",
            width: wv.w, left: "-55%",
            background: `rgba(255,255,255,${wv.opacity})`,
            borderRadius: "50% / 8%",
            animation: `lp-wave-sweep ${wv.dur} ${wv.delay} cubic-bezier(0.4,0,0.6,1) forwards`,
          }}
        />
      ))}

      {/* Centre logo */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14,
          opacity: phase >= 1 ? 0 : 1,
          transition: "opacity 0.35s ease",
          animation: phase === 0 ? "lp-intro-logo 0.6s 0.1s ease both" : "none",
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: "rgba(255,255,255,0.12)",
          border: "2px solid rgba(255,255,255,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </div>
        <h2 style={{
          fontSize: "clamp(22px,4vw,40px)", fontWeight: 900,
          color: C.white, letterSpacing: "-0.02em", margin: 0, textAlign: "center",
          fontFamily: "'Playfair Display',Georgia,serif",
        }}>
          The Movement
        </h2>
        <p style={{
          fontSize: 11, color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.24em", textTransform: "uppercase", margin: 0,
        }}>
          for Equal Leadership
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   SOUND WAVES from the megaphone
══════════════════════════════════ */
function SoundWaves({ visible }) {
  if (!visible) return null;
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 24, height: 24,
            borderRadius: "50%",
            border: `2px solid rgba(68,114,184,${0.65 - i * 0.12})`,
            top: "28%", right: "12%",
            transform: "translate(50%,-50%)",
            animation: `lp-ring 2.2s ${i * 0.55}s ease-out infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

/* ══════════════════════════════════
   FLOATING FEATURE CARD
══════════════════════════════════ */
function FloatCard({ icon, label, desc, style: extraStyle, anim, dur, delay, visible }) {
  return (
    <div
      style={{
        position: "absolute",
        background: C.white,
        borderRadius: 16,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(68,114,184,0.13), 0 2px 8px rgba(0,0,0,0.05)",
        border: `1px solid ${C.bluePale}`,
        display: "flex", alignItems: "center", gap: 10,
        whiteSpace: "nowrap",
        animation: visible
          ? `${anim} ${dur} ${delay} ease-in-out infinite, lp-card-in 0.5s ${delay} ease both`
          : "none",
        opacity: visible ? undefined : 0,
        zIndex: 4,
        ...extraStyle,
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: C.blueGhost,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.blue,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.2 }}>{label}</p>
        {desc && <p style={{ fontSize: 11, color: C.inkLight, margin: 0 }}>{desc}</p>}
      </div>
    </div>
  );
}

/* ─── SVG mini-icons for cards ─── */
const Icons = {
  mentor: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  lead:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  comm:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  activ:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
  grad:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  net:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

/* ══════════════════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════════════════ */
export default function LandingPage({ onLogin }) {
  const { t, isRTL, lang, setLang } = useLang();
  const [introComplete, setIntroDone]   = useState(false);
  const [heroReady,     setHeroReady]   = useState(false);
  const [rippling,      setRippling]    = useState(false);

  /* Unlock body scroll for landing page */
  useEffect(() => {
    document.body.style.overflow    = "auto";
    document.body.style.height      = "auto";
    document.documentElement.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) { root.style.height = "auto"; root.style.overflow = "visible"; }
    return () => {
      document.body.style.overflow    = "";
      document.body.style.height      = "";
      document.documentElement.style.overflow = "";
      if (root) { root.style.height = ""; root.style.overflow = ""; }
    };
  }, []);

  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    setTimeout(() => setHeroReady(true), 100);
  }, []);

  const handleJoin = useCallback(() => {
    setRippling(true);
    setTimeout(() => { setRippling(false); onLogin(); }, 700);
  }, [onLogin]);

  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div className="lp-root" style={{ background: C.bg, minHeight: "100vh", overflowX: "hidden", direction: dir }}>

      {/* ── Cinematic intro ── */}
      {!introComplete && <IntroOverlay onDone={handleIntroDone} />}

      {/* ═══════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════ */}
      <section style={{
        minHeight: "100vh",
        display: "flex", alignItems: "stretch",
        position: "relative", overflow: "hidden",
        background: `linear-gradient(160deg, ${C.bg} 0%, ${C.blueGhost} 60%, ${C.bluePale} 100%)`,
      }}>

        {/* ── Language switcher (top bar) ── */}
        <div style={{
          position: "absolute", top: 24,
          [isRTL ? "left" : "right"]: 32,
          display: "flex", alignItems: "center", gap: 8, zIndex: 10,
        }}>
          {["he","en","ar"].map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              style={{
                padding: "6px 14px", borderRadius: 999, border: "none",
                background: lang === code ? C.blue : "rgba(68,114,184,0.1)",
                color: lang === code ? C.white : C.blue,
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.06em", textTransform: "uppercase",
                transition: "all 0.2s",
              }}
            >{code}</button>
          ))}
        </div>

        {/* ── LEFT: Mascot column ── */}
        <div style={{
          flex: "0 0 44%", maxWidth: 520,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          position: "relative", paddingTop: 60,
          animation: heroReady ? "lp-masc-in 0.85s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>

          {/* Soft blue glow behind mascot */}
          <div style={{
            position: "absolute", bottom: "5%", left: "10%",
            width: "80%", height: "60%",
            background: `radial-gradient(ellipse, ${C.bluePale} 0%, transparent 70%)`,
            borderRadius: "50%", filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Mascot image */}
          <img
            src="/mascot.png"
            alt="Movement mascot"
            style={{
              width: "clamp(260px,38vw,480px)",
              objectFit: "contain",
              objectPosition: "bottom",
              display: "block",
              position: "relative", zIndex: 2,
              animation: heroReady ? "lp-masc-float 5s 1s ease-in-out infinite" : "none",
              filter: "drop-shadow(0 20px 40px rgba(68,114,184,0.18))",
            }}
          />

          {/* Sound waves from megaphone */}
          <SoundWaves visible={heroReady} />

          {/* Floating cards — left side */}
          <FloatCard
            icon={Icons.comm} label="Community" desc="1,200+ members"
            anim="lp-float-a" dur="4.5s" delay="0.6s" visible={heroReady}
            style={{ top: "18%", left: "4%", animation: heroReady ? "lp-float-a 4.5s 0.6s ease-in-out infinite, lp-card-in 0.5s 0.3s ease both" : "none" }}
          />
          <FloatCard
            icon={Icons.grad} label="Graduate Network" desc="JCE & beyond"
            anim="lp-float-c" dur="5s" delay="0.9s" visible={heroReady}
            style={{ bottom: "22%", left: "2%", animation: heroReady ? "lp-float-c 5s 0.9s ease-in-out infinite, lp-card-in 0.5s 0.5s ease both" : "none" }}
          />
        </div>

        {/* ── RIGHT: Hero text column ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(2rem,6vw,5rem)",
          paddingTop: 80,
          position: "relative",
          animation: heroReady ? "lp-text-in 0.85s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>

          {/* Floating cards — right side */}
          <FloatCard
            icon={Icons.lead} label="Leadership" desc="Develop your voice"
            anim="lp-float-b" dur="4.8s" delay="0.4s" visible={heroReady}
            style={{ top: "15%", right: "8%", animation: heroReady ? "lp-float-b 4.8s 0.4s ease-in-out infinite, lp-card-in 0.5s 0.2s ease both" : "none" }}
          />
          <FloatCard
            icon={Icons.mentor} label="Mentorship" desc="1:1 guidance"
            anim="lp-float-a" dur="4.2s" delay="0.7s" visible={heroReady}
            style={{ top: "38%", right: "4%", animation: heroReady ? "lp-float-a 4.2s 0.7s ease-in-out infinite, lp-card-in 0.5s 0.4s ease both" : "none" }}
          />

          {/* Eyebrow */}
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.coral,
            letterSpacing: "0.22em", textTransform: "uppercase",
            marginBottom: "1rem",
            animation: heroReady ? "lp-fade-up 0.6s 0.35s ease both" : "none",
          }}>
            The Movement for Equal Leadership
          </p>

          {/* Main headline */}
          <h1 style={{
            fontSize: "clamp(32px,4.5vw,62px)",
            fontWeight: 900, lineHeight: 1.1,
            color: C.ink, margin: "0 0 1.4rem",
            animation: heroReady ? "lp-fade-up 0.7s 0.45s ease both" : "none",
          }}>
            Every leader<br />
            <span style={{ color: C.blue }}>starts with</span>{" "}
            <span style={{
              color: C.coral,
              fontStyle: "italic",
            }}>a voice.</span>
          </h1>

          {/* Supporting text */}
          <p style={{
            fontSize: "clamp(15px,1.5vw,18px)",
            color: C.inkMid, lineHeight: 1.75,
            maxWidth: 480, marginBottom: "2.5rem",
            animation: heroReady ? "lp-fade-up 0.7s 0.55s ease both" : "none",
          }}>
            We connect young women leaders, graduates, and future women politicians
            through mentorship, networking, and shared opportunity — because
            equal leadership starts in the community.
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex", gap: 14, flexWrap: "wrap",
            alignItems: "center",
            animation: heroReady ? "lp-fade-up 0.7s 0.65s ease both" : "none",
          }}>
            {/* Primary — coral */}
            <button
              onClick={handleJoin}
              style={{
                position: "relative", overflow: "hidden",
                background: C.coral, color: C.white, border: "none",
                padding: "16px 38px", borderRadius: 999,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: `0 8px 28px rgba(232,115,90,0.38)`,
                transition: "transform 0.2s, box-shadow 0.2s",
                letterSpacing: "0.01em",
              }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 36px rgba(232,115,90,0.50)`; }}
              onMouseOut={e  => { e.currentTarget.style.transform = "";               e.currentTarget.style.boxShadow = `0 8px 28px rgba(232,115,90,0.38)`; }}
            >
              {rippling && (
                <span style={{
                  position: "absolute", inset: 0, margin: "auto",
                  width: 10, height: 10, borderRadius: "50%",
                  background: "rgba(255,255,255,0.45)",
                  animation: "lp-btn-ripple 0.65s ease-out forwards",
                }} />
              )}
              Join the Movement
            </button>

            {/* Secondary — blue outline */}
            <button
              onClick={onLogin}
              style={{
                background: "transparent", color: C.blue,
                border: `2px solid ${C.blue}`,
                padding: "14px 32px", borderRadius: 999,
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s", letterSpacing: "0.01em",
              }}
              onMouseOver={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.color = C.white; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={e  => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.blue; e.currentTarget.style.transform = ""; }}
            >
              Explore Community
            </button>

            {/* Website link */}
            <a
              href="https://ywp-online.my.canva.site/manhigot2026"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: C.inkLight, fontSize: 13, fontWeight: 500,
                textDecoration: "none", transition: "color 0.2s",
              }}
              onMouseOver={e => e.currentTarget.style.color = C.blue}
              onMouseOut={e  => e.currentTarget.style.color = C.inkLight}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"/></svg>
              Our website
            </a>
          </div>

          {/* Bottom floating cards */}
          <FloatCard
            icon={Icons.activ} label="Activism" desc="Make change happen"
            anim="lp-float-c" dur="4.6s" delay="1s" visible={heroReady}
            style={{ bottom: "12%", left: "6%", animation: heroReady ? "lp-float-c 4.6s 1s ease-in-out infinite, lp-card-in 0.5s 0.6s ease both" : "none" }}
          />
          <FloatCard
            icon={Icons.net} label="Networking" desc="Grow your circle"
            anim="lp-float-b" dur="5.2s" delay="0.8s" visible={heroReady}
            style={{ bottom: "18%", right: "12%", animation: heroReady ? "lp-float-b 5.2s 0.8s ease-in-out infinite, lp-card-in 0.5s 0.7s ease both" : "none" }}
          />
        </div>

        {/* Decorative bottom wave divider */}
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none" width="100%" height="80">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill={C.bg} />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════
          SECTION 2 — FEATURES
      ═══════════════════════════════════ */}
      <section style={{ background: C.bg, padding: "6rem clamp(1.5rem,6vw,5rem)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            What we offer
          </p>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3.5vw,44px)", fontWeight: 900, color: C.ink, marginBottom: "1rem" }}>
            Built for women who lead.
          </h2>
          <p style={{ textAlign: "center", color: C.inkLight, fontSize: 16, maxWidth: 560, margin: "0 auto 4rem", lineHeight: 1.7 }}>
            A platform built specifically for women who are shaping the future — politically, professionally, and socially.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
            gap: "1.5rem",
          }}>
            {[
              {
                icon: Icons.mentor,
                title: "Mentorship",
                body: "Connect with experienced women leaders who've walked the path before you. Structured 1:1 guidance tailored to your goals.",
                accent: C.blue,
              },
              {
                icon: Icons.lead,
                title: "Leadership Development",
                body: "Workshops, resources, and opportunities to sharpen your political and professional leadership skills.",
                accent: C.coral,
              },
              {
                icon: Icons.comm,
                title: "Community Feed",
                body: "A private, supportive space to share wins, ask questions, and build real relationships with fellow members.",
                accent: C.blue,
              },
              {
                icon: Icons.net,
                title: "Networking",
                body: "Search members by profession, city, and expertise. Send help requests and expand your professional circle.",
                accent: C.coral,
              },
              {
                icon: Icons.activ,
                title: "Civic Activism",
                body: "Stay informed on opportunities in politics, advocacy, and public service — and get connected to the right doors.",
                accent: C.blue,
              },
              {
                icon: Icons.grad,
                title: "Graduate Support",
                body: "A network that follows you beyond graduation. Alumni support, job connections, and lifelong community.",
                accent: C.coral,
              },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          SECTION 3 — STATS BANNER
      ═══════════════════════════════════ */}
      <section style={{
        background: `linear-gradient(135deg, ${C.blueD} 0%, ${C.blue} 55%, ${C.blueL} 100%)`,
        backgroundSize: "300% 300%",
        animation: "lp-grad-flow 8s ease infinite",
        padding: "4.5rem clamp(1.5rem,6vw,5rem)",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
          gap: "2rem", textAlign: "center",
        }}>
          {[
            { num: "1,200+", label: "Members" },
            { num: "150+",   label: "Mentors" },
            { num: "40+",    label: "Cities" },
            { num: "3",      label: "Languages" },
          ].map((s) => (
            <div key={s.label}>
              <p style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 900, color: C.white, margin: "0 0 6px", letterSpacing: "-0.02em", fontFamily: "'Playfair Display',Georgia,serif" }}>
                {s.num}
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════
          SECTION 4 — FINAL CTA
      ═══════════════════════════════════ */}
      <section style={{
        background: C.bg, padding: "6rem clamp(1.5rem,6vw,5rem)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Mascot small */}
          <img
            src="/mascot.png" alt=""
            style={{ width: 120, marginBottom: "1.5rem", filter: "drop-shadow(0 8px 20px rgba(68,114,184,0.18))" }}
          />
          <p style={{ fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Ready to lead?
          </p>
          <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.ink, marginBottom: "1.25rem" }}>
            Your voice belongs<br />in the room.
          </h2>
          <p style={{ fontSize: 16, color: C.inkLight, lineHeight: 1.75, marginBottom: "2.5rem" }}>
            Join hundreds of women who are building networks, finding mentors,
            and stepping into leadership — together.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleJoin}
              style={{
                background: C.coral, color: C.white, border: "none",
                padding: "17px 44px", borderRadius: 999,
                fontSize: 16, fontWeight: 700, cursor: "pointer",
                boxShadow: `0 8px 28px rgba(232,115,90,0.4)`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(232,115,90,0.52)"; }}
              onMouseOut={e  => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 28px rgba(232,115,90,0.4)"; }}
            >
              Join the Movement
            </button>
            <button
              onClick={onLogin}
              style={{
                background: "transparent", color: C.inkMid,
                border: `2px solid ${C.bgWarm}`, padding: "15px 32px",
                borderRadius: 999, fontSize: 15, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = C.bgWarm; e.currentTarget.style.color = C.inkMid; }}
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          FOOTER
      ═══════════════════════════════════ */}
      <footer style={{
        background: C.ink, color: "rgba(255,255,255,0.45)",
        padding: "2.5rem clamp(1.5rem,6vw,5rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralD})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>
            The Movement for Equal Leadership
          </span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a href="https://ywp-online.my.canva.site/manhigot2026" target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
            onMouseOver={e => e.currentTarget.style.color = C.coralL}
            onMouseOut={e  => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
          >
            Our website
          </a>
          <span style={{ fontSize: 13 }}>© 2026</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Feature card (section 2) ── */
function FeatureCard({ icon, title, body, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.white,
        borderRadius: 20,
        padding: "2rem 1.75rem",
        border: `1px solid ${hov ? accent + "44" : C.bluePale}`,
        boxShadow: hov
          ? `0 16px 48px rgba(68,114,184,0.13), 0 2px 8px rgba(0,0,0,0.04)`
          : `0 2px 12px rgba(0,0,0,0.04)`,
        transform: hov ? "translateY(-4px)" : "none",
        transition: "all 0.25s ease",
        cursor: "default",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: hov ? accent + "14" : C.blueGhost,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, marginBottom: "1.25rem",
        transition: "background 0.25s",
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: "0.65rem" }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: C.inkLight, lineHeight: 1.75, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}
