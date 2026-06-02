import { useState, useEffect, useRef } from "react";

/* ─── Design tokens ─── */
const C = {
  navy:    "#0c1a35",
  deep:    "#0f2044",
  royal:   "#1a3a8f",
  blue:    "#2563eb",
  blueMid: "#3b82f6",
  sky:     "#38bdf8",
  pale:    "#bfdbfe",
  white:   "#f8faff",
  muted:   "#64748b",
  border:  "rgba(37,99,235,0.13)",
};

/* ─── Scroll-reveal hook ─── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function reveal(visible, delay = 0, dir = "up") {
  const transforms = {
    up:    visible ? "translateY(0)"   : "translateY(30px)",
    left:  visible ? "translateX(0)"   : "translateX(-30px)",
    right: visible ? "translateX(0)"   : "translateX(30px)",
  };
  return {
    opacity:    visible ? 1 : 0,
    transform:  transforms[dir] ?? transforms.up,
    filter:     visible ? "blur(0)" : "blur(4px)",
    transition: `opacity 0.65s ${delay}s ease, transform 0.65s ${delay}s ease, filter 0.65s ${delay}s ease`,
  };
}

/* ─── Inline SVG icons (no emojis) ─── */
const Icon = {
  search:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  send:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>,
  users:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shield:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  chart:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  mobile:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>,
  feed:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>,
  check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>,
  arrowL:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>,
  lock:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  female:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c2.67 0 8 1.34 8 4v2H4v-2c0-2.66 5.33-4 8-4z"/><path d="M11 17h2v5h-2z"/><path d="M9 20h6v2H9z"/></svg>,
};

/* ─── Animated counter ─── */
function Counter({ target, suffix = "", visible }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const num = parseInt(target.replace(/\D/g, ""), 10);
    const duration = 1400;
    const steps = 40;
    const inc = num / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= num) { setCount(num); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [visible, target]);
  const raw = parseInt(target.replace(/\D/g, ""), 10);
  const plus = target.includes("+");
  return <span>{visible ? count : 0}{plus && count >= raw ? "+" : ""}{suffix}</span>;
}

/* ─── NAV ─── */
function Nav({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 3rem", height: 62,
      background: scrolled ? "rgba(12,26,53,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(18px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
      transition: "background 0.35s, backdrop-filter 0.35s",
      direction: "rtl",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <div style={{
          width: 34, height: 34,
          background: "linear-gradient(135deg, #2563eb, #38bdf8)",
          borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", boxShadow: "0 4px 14px rgba(56,189,248,0.3)",
        }}>
          <Icon.female />
        </div>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>מנהיגות שווה</div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>רשת הבוגרות</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
        {[["#about","אודות"], ["#features","תכונות"], ["#how","איך זה עובד"]].map(([href, label]) => (
          <a key={href} href={href} style={{
            color: "rgba(255,255,255,0.6)", textDecoration: "none",
            fontSize: "0.86rem", fontWeight: 500, padding: "6px 12px", borderRadius: 8,
            transition: "color 0.2s, background 0.2s",
          }}
            onMouseOver={e => { e.target.style.color = "#fff"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseOut={e => { e.target.style.color = "rgba(255,255,255,0.6)"; e.target.style.background = "transparent"; }}
          >{label}</a>
        ))}
        <button onClick={onLogin} style={{
          marginRight: "0.5rem",
          background: "linear-gradient(135deg, #2563eb, #38bdf8)",
          color: "#fff", padding: "8px 20px", borderRadius: 9, border: "none",
          fontWeight: 700, fontSize: "0.86rem", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
          transition: "transform 0.2s, box-shadow 0.2s",
          fontFamily: "inherit",
        }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(37,99,235,0.5)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.4)"; }}
        >כניסה / הרשמה</button>
      </div>
    </nav>
  );
}

/* ─── Floating mesh dots ─── */
function MeshDots() {
  const dots = useRef(Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    dur: 7 + Math.random() * 10,
    delay: Math.random() * 5,
    opacity: 0.08 + Math.random() * 0.15,
  }))).current;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {dots.map(d => (
        <div key={d.id} style={{
          position: "absolute", left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size, borderRadius: "50%",
          background: "rgba(255,255,255,1)", opacity: d.opacity,
          animation: `meshFloat ${d.dur}s ${d.delay}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes meshFloat {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(6px,-16px) scale(1.4); }
        }
      `}</style>
    </div>
  );
}

/* ─── HERO ─── */
function Hero({ onLogin }) {
  const [statsRef, statsVisible] = useReveal(0.3);

  return (
    <section style={{
      minHeight: "100vh",
      background: `
        radial-gradient(ellipse at 65% 35%, rgba(37,99,235,0.38) 0%, transparent 52%),
        radial-gradient(ellipse at 20% 75%, rgba(56,189,248,0.18) 0%, transparent 45%),
        linear-gradient(168deg, #06080f 0%, #0c1a35 38%, #14265a 75%, #1a3a8f 100%)
      `,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "10rem 2rem 7rem",
      position: "relative", overflow: "hidden",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <MeshDots />

      {/* Grid lines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }} />

      {/* Central glow */}
      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 720, height: 480,
        background: "radial-gradient(ellipse, rgba(37,99,235,0.2) 0%, transparent 65%)",
        pointerEvents: "none",
        animation: "glowPulse 6s ease-in-out infinite",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "0.5rem",
        background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.28)",
        color: "#7dd3fc", fontSize: "0.7rem", fontWeight: 700,
        padding: "6px 16px", borderRadius: 99, marginBottom: "2.4rem",
        letterSpacing: "0.12em", textTransform: "uppercase",
        position: "relative", zIndex: 1,
        animation: "heroFadeUp 0.7s ease both",
      }}>
        <span style={{ width: 6, height: 6, background: "#38bdf8", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 8px #38bdf8", animation: "pulseDot 2s ease infinite" }} />
        פלטפורמה פנימית מאובטחת &nbsp;·&nbsp; בוגרות בלבד
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: "clamp(3.2rem, 8vw, 6rem)", fontWeight: 900,
        color: "#fff", lineHeight: 1.03, marginBottom: "1.8rem",
        position: "relative", zIndex: 1,
        letterSpacing: "-0.03em",
        animation: "heroFadeUp 0.75s 0.1s ease both",
      }}>
        רשת נשים.<br />
        <span style={{
          background: "linear-gradient(100deg, #60a5fa 0%, #38bdf8 50%, #a78bfa 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          כוח אמיתי.
        </span>
      </h1>

      {/* Subheadline */}
      <p style={{
        maxWidth: 520, color: "rgba(191,219,254,0.78)",
        fontSize: "1.08rem", lineHeight: 1.8,
        marginBottom: "3.2rem", position: "relative", zIndex: 1,
        animation: "heroFadeUp 0.75s 0.2s ease both",
      }}>
        רשת פרטית לבוגרות התנועה למנהיגות שווה.
        מצאי מומחיות, שלחי בקשות עזרה ובני קשרים מקצועיים
        עם הגנת פרטיות מלאה.
      </p>

      {/* CTAs */}
      <div style={{
        display: "flex", gap: "0.9rem", flexWrap: "wrap",
        justifyContent: "center", position: "relative", zIndex: 1,
        animation: "heroFadeUp 0.75s 0.32s ease both",
      }}>
        <button onClick={onLogin} style={{
          background: "linear-gradient(135deg, #2563eb, #38bdf8)",
          color: "#fff", padding: "15px 36px", borderRadius: 12, border: "none",
          fontSize: "1rem", fontWeight: 700, cursor: "pointer",
          boxShadow: "0 6px 30px rgba(37,99,235,0.45)",
          transition: "transform 0.22s, box-shadow 0.22s",
          letterSpacing: "0.01em", fontFamily: "inherit",
        }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 40px rgba(37,99,235,0.55)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 30px rgba(37,99,235,0.45)"; }}
        >
          הצטרפי עכשיו &nbsp;→
        </button>
        <button onClick={onLogin} style={{
          background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.88)",
          padding: "15px 30px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          fontSize: "1rem", fontWeight: 500, cursor: "pointer",
          transition: "background 0.2s, border-color 0.2s", fontFamily: "inherit",
        }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
        >
          כניסה לחשבון
        </button>
        <a
          href="https://ywp-online.my.canva.site/manhigot2026"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "rgba(255,255,255,0.05)", color: "rgba(191,219,254,0.8)",
            padding: "15px 26px", borderRadius: 12,
            border: "1px solid rgba(191,219,254,0.2)",
            fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s, color 0.2s",
            textDecoration: "none", fontFamily: "inherit",
          }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(191,219,254,0.45)"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(191,219,254,0.2)"; e.currentTarget.style.color = "rgba(191,219,254,0.8)"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          אתר התנועה
        </a>
      </div>

      {/* Animated stats */}
      <div ref={statsRef} style={{
        display: "flex", gap: "0", marginTop: "6rem",
        position: "relative", zIndex: 1,
        animation: "heroFadeUp 0.75s 0.5s ease both",
        flexWrap: "wrap", justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, overflow: "hidden",
      }}>
        {[
          { target: "500+", label: "בוגרות" },
          { target: "10+",  label: "שנות פעילות" },
          { target: "100%", label: "פרטי ומאובטח" },
        ].map(({ target, label }, i) => (
          <div key={i} style={{
            textAlign: "center", padding: "1.5rem 3rem",
            borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
          }}>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>
              <Counter target={target} visible={statsVisible} />
            </div>
            <div style={{ color: "rgba(191,219,254,0.5)", fontSize: "0.72rem", marginTop: "0.35rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes heroFadeUp { from { opacity:0; transform:translateY(24px); filter:blur(4px); } to { opacity:1; transform:translateY(0); filter:blur(0); } }
        @keyframes glowPulse  { 0%,100% { opacity:0.7; transform:translate(-50%,-50%) scale(1); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1.1); } }
        @keyframes pulseDot   { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;0,800;0,900&display=swap');
      `}</style>
    </section>
  );
}

/* ─── Wave divider ─── */
function Wave({ to }) {
  return (
    <div style={{ display: "block", lineHeight: 0, overflow: "hidden", marginBottom: -2, background: C.deep }}>
      <svg viewBox="0 0 1440 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" height="70" width="100%">
        <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill={to} />
      </svg>
    </div>
  );
}

/* ─── ABOUT ─── */
function About() {
  const [leftRef, leftVis] = useReveal();
  const [rightRef, rightVis] = useReveal(0.12);

  return (
    <section id="about" style={{
      background: C.white, padding: "8rem 3rem",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>

          {/* Text */}
          <div ref={leftRef} style={reveal(leftVis, 0, "right")}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: C.blue, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
              אודות הפלטפורמה
            </div>
            <h2 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 900, color: C.navy, marginBottom: "1.3rem", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              הקשר שלא<br />ידעת שאת צריכה
            </h2>
            <p style={{ color: C.muted, fontSize: "0.98rem", lineHeight: 1.82, marginBottom: "1.4rem" }}>
              מנהיגות שווה היא תנועה בת עשור שמשתפת נשים מוכשרות ממגוון תחומים לקדם מנהיגות מגדרית שוויונית בישראל.
            </p>
            <p style={{ color: C.muted, fontSize: "0.98rem", lineHeight: 1.82, marginBottom: "2.2rem" }}>
              הפלטפורמה הזו נבנתה כדי לחבר את הבוגרות — מקום אחד למצוא עזרה מקצועית, לשתף עדכונים, ולצמוח יחד.
            </p>
            <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
              {["קהילה", "פרטיות", "מקצועיות"].map(label => (
                <span key={label} style={{
                  background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)",
                  color: C.blue, padding: "7px 18px", borderRadius: 99,
                  fontSize: "0.83rem", fontWeight: 700,
                }}>{label}</span>
              ))}
            </div>
          </div>

          {/* Visual card */}
          <div ref={rightRef} style={reveal(rightVis, 0.15, "left")}>
            <div style={{ position: "relative", paddingBottom: "2rem", paddingLeft: "2rem" }}>
              {/* Shadow card */}
              <div style={{
                position: "absolute", bottom: 0, left: 0,
                width: "88%", height: "84%",
                background: "linear-gradient(135deg, #1a3a8f, #2563eb)",
                borderRadius: 20, opacity: 0.22,
                transform: "rotate(-3.5deg)",
              }} />
              {/* Main card */}
              <div style={{
                position: "relative", background: "#fff",
                borderRadius: 20, padding: "2rem",
                boxShadow: "0 24px 64px rgba(15,31,61,0.12)",
                border: "1px solid rgba(37,99,235,0.09)",
              }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.blue, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2rem" }}>
                  חברת קהילה
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.2rem", fontWeight: 900, color: "#fff", flexShrink: 0,
                  }}>מ</div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.95rem", marginBottom: 2 }}>מיכל לוי</div>
                    <div style={{ fontSize: "0.78rem", color: C.muted }}>עורכת דין · תל אביב</div>
                  </div>
                  <span style={{
                    marginRight: "auto", background: "#dcfce7", border: "1px solid #bbf7d0",
                    color: "#166534", fontSize: "0.67rem", fontWeight: 700,
                    padding: "3px 10px", borderRadius: 99,
                  }}>פעילה</span>
                </div>
                <p style={{ fontSize: "0.84rem", color: C.muted, lineHeight: 1.68, marginBottom: "1.3rem" }}>
                  "מצאתי שותפה עסקית ממחזור 3 תוך 24 שעות דרך הפלטפורמה. פשוט ממש."
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {["משפט", "יזמות", "ליטיגציה"].map(s => (
                    <span key={s} style={{
                      background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.15)",
                      color: C.blue, fontSize: "0.7rem", fontWeight: 600,
                      padding: "3px 10px", borderRadius: 8,
                    }}>{s}</span>
                  ))}
                </div>
                {/* Connection badge */}
                <div style={{
                  marginTop: "1.2rem", paddingTop: "1rem",
                  borderTop: "1px solid rgba(37,99,235,0.08)",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  fontSize: "0.78rem", color: C.blue, fontWeight: 600,
                }}>
                  <Icon.check />
                  12 קשרים פעילים ברשת
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURES ─── */
const FEATURES = [
  { Icon: Icon.search,  title: "חיפוש חכם",        desc: "חפשי לפי שם, מקצוע, עיר, או קטגוריה. תוצאות מיידיות עם פילטרים מדויקים." },
  { Icon: Icon.send,    title: "בקשות עזרה",        desc: "שלחי פנייה ישירה לבוגרת. פרטי קשר נחשפים רק לאחר אישור." },
  { Icon: Icon.feed,    title: "פיד קהילתי",        desc: "שתפי עדכונים, הצלחות והזדמנויות. כל הקהילה בזרם אחד חי." },
  { Icon: Icon.chart,   title: "לוח מנהל",          desc: "ניהול חברות, סטטיסטיקות, יומן פעילות מלא — הכול במקום אחד." },
  { Icon: Icon.shield,  title: "פרטיות מלאה",       desc: "מידע קשר מוסתר כברירת מחדל. Firebase Auth, בקרת גישה מפורטת." },
  { Icon: Icon.mobile,  title: "כל מכשיר",          desc: "נייד, טאבלט, מחשב — חוויה חלקה בכל רזולוציה ובכל שפה." },
];

function Features() {
  const [hRef, hVis] = useReveal();
  const [gRef, gVis] = useReveal(0.06);

  return (
    <section id="features" style={{
      background: `linear-gradient(168deg, #06080f 0%, #0c1a35 55%, #14265a 100%)`,
      padding: "8rem 3rem", position: "relative", overflow: "hidden",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div ref={hRef} style={reveal(hVis)}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#7dd3fc", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
            תכונות הפלטפורמה
          </div>
          <h2 style={{ fontSize: "clamp(2rem,4vw,2.9rem)", fontWeight: 900, color: "#fff", marginBottom: "0.9rem", letterSpacing: "-0.02em" }}>
            בנוי לחיבורים אמיתיים
          </h2>
          <p style={{ color: "rgba(191,219,254,0.65)", fontSize: "0.97rem", lineHeight: 1.78, maxWidth: 500, marginBottom: "3.5rem" }}>
            כל תכונה תוכננה סביב אמון, פרטיות ושיתוף פעולה משמעותי.
          </p>
        </div>

        <div ref={gRef} style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))", gap: "1rem",
        }}>
          {FEATURES.map(({ Icon: Ic, title, desc }, i) => (
            <FeatureCard key={i} Icon={Ic} title={title} desc={desc} visible={gVis} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ Icon: Ic, title, desc, visible, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={reveal(visible, delay)}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${hov ? "rgba(56,189,248,0.35)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 16, padding: "1.9rem 1.6rem",
          transform: hov ? "translateY(-4px)" : "",
          transition: "all 0.22s", height: "100%", boxSizing: "border-box",
          position: "relative", overflow: "hidden",
        }}>
        {hov && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #2563eb, #38bdf8)" }} />}
        <div style={{
          width: 44, height: 44, background: "rgba(56,189,248,0.13)",
          borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#38bdf8", marginBottom: "1.1rem",
        }}>
          <Ic />
        </div>
        <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "#fff", marginBottom: "0.5rem" }}>{title}</div>
        <p style={{ color: "rgba(191,219,254,0.6)", fontSize: "0.84rem", lineHeight: 1.68, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── HOW IT WORKS ─── */
const STEPS = [
  { n: "01", Icon: Icon.users,  title: "הרשמה מהירה",  desc: "מלאי את הפרטים שלך — שם, תחום, עיר, ביוגרפיה קצרה. לוקח 3 דקות." },
  { n: "02", Icon: Icon.search, title: "חפשי בוגרות",  desc: "חפשי לפי מקצוע, מיקום, או שם. פילטרים מדויקים לתוצאות טובות יותר." },
  { n: "03", Icon: Icon.send,   title: "שלחי בקשה",    desc: "פני לבוגרת שיכולה לעזור. הפנייה שלך מגיעה אליה ישירות ובפרטיות." },
  { n: "04", Icon: Icon.lock,   title: "התחברי בביטחון", desc: "אחרי שהבוגרת אישרה — פרטי קשר משותפים. שיתוף הפעולה מתחיל." },
];

function HowItWorks() {
  const [hRef, hVis] = useReveal();
  const [gRef, gVis] = useReveal(0.07);

  return (
    <section id="how" style={{
      background: C.white, padding: "8rem 3rem",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div ref={hRef} style={reveal(hVis)}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: C.blue, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
            איך זה עובד
          </div>
          <h2 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 900, color: C.navy, marginBottom: "0.9rem", letterSpacing: "-0.02em" }}>
            מהרשמה לחיבור — בדקות
          </h2>
          <p style={{ color: C.muted, fontSize: "0.97rem", lineHeight: 1.78, maxWidth: 460, marginBottom: "3.5rem" }}>
            תוכנן שכל בוגרת תשלים את ההצטרפות בקלות, ללא הדרכה.
          </p>
        </div>

        <div ref={gRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1.2rem" }}>
          {STEPS.map(({ n, Icon: Ic, title, desc }, i) => (
            <StepCard key={i} n={n} Icon={Ic} title={title} desc={desc} visible={gVis} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ n, Icon: Ic, title, desc, visible, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={reveal(visible, delay)}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: "#fff",
          border: `1.5px solid ${hov ? "rgba(37,99,235,0.22)" : C.border}`,
          borderRadius: 18, padding: "2rem 1.7rem",
          transform: hov ? "translateY(-5px)" : "",
          boxShadow: hov ? "0 16px 48px rgba(37,99,235,0.1)" : "0 2px 8px rgba(15,31,61,0.04)",
          transition: "all 0.22s", height: "100%", boxSizing: "border-box",
          position: "relative", overflow: "hidden",
        }}>
        {hov && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #2563eb, #38bdf8)" }} />}
        <div style={{
          fontSize: "3rem", fontWeight: 900, lineHeight: 1, marginBottom: "1rem",
          color: hov ? "rgba(37,99,235,0.12)" : "rgba(15,31,61,0.06)",
          transition: "color 0.22s",
        }}>{n}</div>
        <div style={{
          width: 38, height: 38, background: "rgba(37,99,235,0.08)",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          color: C.blue, marginBottom: "0.85rem",
        }}>
          <Ic />
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.5rem" }}>{title}</div>
        <p style={{ color: C.muted, fontSize: "0.84rem", lineHeight: 1.68, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── TESTIMONIALS ─── */
const QUOTES = [
  { name: "דנה מ.", role: "מהנדסת · מחזור 7",   text: "תוך שבוע מצאתי מנטורית שעזרה לי לקדם שינוי בחברה שלי. הפלטפורמה שינתה לי את הראש." },
  { name: "רונית ש.", role: "רופאה · מחזור 4",    text: "סוף סוף מקום שמבין מה זה להיות אישה בכוח. הקהילה כאן חמה ומקצועית בו זמנית." },
  { name: "יעל ב.", role: "יזמית · מחזור 9",     text: "שלושת השותפים שלי לעסק הגיעו מהפלטפורמה. לא צריך חיפוש אחר — הכל כאן." },
];

function Testimonials() {
  const [ref, visible] = useReveal(0.08);

  return (
    <section style={{
      background: `linear-gradient(155deg, #06080f 0%, #0c1a35 60%, #1a3a8f 100%)`,
      padding: "8rem 3rem", position: "relative", overflow: "hidden",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 900, height: 400,
        background: "radial-gradient(ellipse, rgba(37,99,235,0.15) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#7dd3fc", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
            מה הבוגרות אומרות
          </div>
          <h2 style={{ fontSize: "clamp(2rem,4vw,2.7rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
            קול הקהילה
          </h2>
        </div>

        <div ref={ref} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.1rem" }}>
          {QUOTES.map((q, i) => (
            <div key={i} style={reveal(visible, i * 0.12)}>
              <div style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 18, padding: "2.2rem",
                height: "100%", boxSizing: "border-box",
              }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(56,189,248,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>
                  חוות דעת
                </div>
                <p style={{ color: "rgba(191,219,254,0.82)", fontSize: "0.94rem", lineHeight: 1.75, marginBottom: "1.8rem" }}>
                  "{q.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.9rem", fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>{q.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{q.name}</div>
                    <div style={{ color: "rgba(191,219,254,0.45)", fontSize: "0.74rem" }}>{q.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA({ onLogin }) {
  const [ref, visible] = useReveal(0.2);

  return (
    <section style={{
      background: C.white, padding: "8rem 2rem",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div ref={ref} style={{ ...reveal(visible), maxWidth: 660, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(140deg, rgba(37,99,235,0.05), rgba(56,189,248,0.05))",
          border: "1px solid rgba(37,99,235,0.14)",
          borderRadius: 24, padding: "4.5rem 3rem",
          boxShadow: "0 0 80px rgba(37,99,235,0.05)",
        }}>
          <div style={{
            width: 52, height: 52, margin: "0 auto 1.6rem",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: "0 8px 24px rgba(37,99,235,0.3)",
          }}>
            <Icon.users />
          </div>
          <h2 style={{ fontSize: "clamp(2rem,4vw,2.7rem)", fontWeight: 900, color: C.navy, marginBottom: "1rem", letterSpacing: "-0.02em", lineHeight: 1.14 }}>
            מוכנה להצטרף?
          </h2>
          <p style={{ color: C.muted, fontSize: "0.98rem", lineHeight: 1.78, marginBottom: "2.5rem" }}>
            הצטרפי לרשת הבוגרות ותוכלי להתחבר עם מאות נשים מוכשרות שמקדמות ומקודמות.
          </p>
          <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onLogin} style={{
              background: "linear-gradient(135deg, #1a3a8f, #2563eb, #38bdf8)",
              color: "#fff", padding: "15px 38px", borderRadius: 12, border: "none",
              fontSize: "0.98rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 30px rgba(37,99,235,0.32)",
              transition: "transform 0.22s, box-shadow 0.22s", fontFamily: "inherit",
            }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 38px rgba(37,99,235,0.42)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 30px rgba(37,99,235,0.32)"; }}
            >הצטרפי לרשת &nbsp;→</button>
            <button onClick={onLogin} style={{
              background: "transparent", color: C.blue,
              padding: "15px 28px", borderRadius: 12,
              border: "1.5px solid rgba(37,99,235,0.28)",
              fontSize: "0.98rem", fontWeight: 500, cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s", fontFamily: "inherit",
            }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(37,99,235,0.05)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.28)"; }}
            >יש לי כבר חשבון</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer style={{
      background: "#06080f", padding: "2.5rem 3rem",
      direction: "rtl", fontFamily: "'DM Sans', system-ui, sans-serif",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}>
            <Icon.female />
          </div>
          <span style={{ color: "rgba(191,219,254,0.6)", fontSize: "0.87rem", fontWeight: 600 }}>
            מנהיגות שווה · רשת הבוגרות
          </span>
        </div>
        <a
          href="https://ywp-online.my.canva.site/manhigot2026"
          target="_blank" rel="noopener noreferrer"
          style={{ color: "rgba(191,219,254,0.5)", fontSize: "0.78rem", textDecoration: "none", transition: "color 0.2s" }}
          onMouseOver={e => e.currentTarget.style.color = "#7dd3fc"}
          onMouseOut={e => e.currentTarget.style.color = "rgba(191,219,254,0.5)"}
        >
          אתר התנועה
        </a>
        <div style={{ color: "rgba(191,219,254,0.28)", fontSize: "0.74rem" }}>
          © 2026 · פלטפורמה פנימית מאובטחת
        </div>
      </div>
    </footer>
  );
}

/* ─── ROOT EXPORT ─── */
export default function LandingPage({ onLogin }) {
  useEffect(() => {
    // index.css locks body/root to 100vh for the dashboard — override for landing page
    document.body.style.overflow = "auto";
    document.body.style.height   = "auto";
    document.documentElement.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) { root.style.height = "auto"; root.style.overflow = "visible"; }
    return () => {
      document.body.style.overflow = "";
      document.body.style.height   = "";
      document.documentElement.style.overflow = "";
      if (root) { root.style.height = ""; root.style.overflow = ""; }
    };
  }, []);

  return (
    <div style={{ direction: "rtl" }}>
      <Nav onLogin={onLogin} />
      <Hero onLogin={onLogin} />
      <Wave to={C.white} />
      <About />
      <Features />
      <Wave to={C.white} />
      <HowItWorks />
      <Testimonials />
      <Wave to={C.white} />
      <CTA onLogin={onLogin} />
      <Footer />
    </div>
  );
}
