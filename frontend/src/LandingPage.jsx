import { useState, useEffect, useRef } from "react";

/* ─── Brand colours ─── */
const C = {
  navy:   "#0f1f3d",
  royal:  "#1a3a8f",
  blue:   "#2563eb",
  sky:    "#38bdf8",
  pale:   "#bfdbfe",
  white:  "#f8faff",
  muted:  "#64748b",
  border: "rgba(37,99,235,0.14)",
  card:   "#ffffff",
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

function reveal(visible, delay = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.6s ${delay}s ease, transform 0.6s ${delay}s ease`,
  };
}

/* ─── Floating particle dots ─── */
function Particles() {
  const dots = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    dur: 6 + Math.random() * 8,
    delay: Math.random() * 4,
    opacity: 0.12 + Math.random() * 0.2,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {dots.map((d) => (
        <div
          key={d.id}
          style={{
            position: "absolute",
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: d.opacity,
            animation: `floatDot ${d.dur}s ${d.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatDot {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-18px) scale(1.3); }
        }
      `}</style>
    </div>
  );
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
      padding: "0 3rem",
      height: 64,
      background: scrolled ? "rgba(15,31,61,0.96)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
      transition: "background 0.35s, backdrop-filter 0.35s, border-color 0.35s",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <div style={{
          width: 36, height: 36,
          background: "linear-gradient(135deg, #38bdf8, #2563eb)",
          borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem", fontWeight: 900, color: "#fff",
          boxShadow: "0 4px 14px rgba(56,189,248,0.35)",
        }}>♀</div>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
            מנהיגות שווה
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}>
            רשת הבוגרות
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        {[
          ["#about", "אודות"],
          ["#features", "תכונות"],
          ["#how", "איך זה עובד"],
        ].map(([href, label]) => (
          <a key={href} href={href} style={{
            color: "rgba(255,255,255,0.65)",
            textDecoration: "none",
            fontSize: "0.86rem",
            fontWeight: 500,
            padding: "6px 12px",
            borderRadius: 8,
            transition: "color 0.2s, background 0.2s",
          }}
            onMouseOver={e => { e.target.style.color = "#fff"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
            onMouseOut={e => { e.target.style.color = "rgba(255,255,255,0.65)"; e.target.style.background = "transparent"; }}
          >{label}</a>
        ))}
        <button onClick={onLogin} style={{
          marginRight: "0.5rem",
          background: "linear-gradient(135deg, #2563eb, #38bdf8)",
          color: "#fff", padding: "8px 20px",
          borderRadius: 9, border: "none",
          fontWeight: 700, fontSize: "0.86rem",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(37,99,235,0.5)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.4)"; }}
        >
          כניסה / הרשמה
        </button>
      </div>
    </nav>
  );
}

/* ─── HERO ─── */
function Hero({ onLogin }) {
  return (
    <section style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 70% 40%, rgba(37,99,235,0.35) 0%, transparent 55%),
                   radial-gradient(ellipse at 20% 80%, rgba(56,189,248,0.2) 0%, transparent 45%),
                   linear-gradient(175deg, #0a0f1e 0%, #0f1f3d 45%, #16326b 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center",
      padding: "10rem 2rem 6rem",
      position: "relative", overflow: "hidden",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <Particles />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "72px 72px",
      }} />

      {/* Glow orb */}
      <div style={{
        position: "absolute", top: "20%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: "radial-gradient(ellipse, rgba(37,99,235,0.22) 0%, transparent 62%)",
        pointerEvents: "none",
        animation: "breathe 5s ease-in-out infinite",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "0.5rem",
        background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)",
        color: "#7dd3fc", fontSize: "0.72rem", fontWeight: 700,
        padding: "6px 16px", borderRadius: 99, marginBottom: "2.2rem",
        letterSpacing: "0.1em", textTransform: "uppercase",
        position: "relative", zIndex: 1,
        animation: "fadeUp 0.7s ease both",
      }}>
        <span style={{ width: 6, height: 6, background: "#38bdf8", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 8px #38bdf8" }} />
        פלטפורמה פנימית מאובטחת · בוגרות בלבד
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: "clamp(3rem, 7.5vw, 5.8rem)",
        fontWeight: 900, color: "#fff",
        lineHeight: 1.04, marginBottom: "1.6rem",
        position: "relative", zIndex: 1,
        animation: "fadeUp 0.75s 0.1s ease both",
        letterSpacing: "-0.02em",
      }}>
        רשת נשים.<br />
        <span style={{
          background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 50%, #a78bfa 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          כוח אמיתי.
        </span>
      </h1>

      {/* Sub */}
      <p style={{
        maxWidth: 540, color: "rgba(191,219,254,0.8)",
        fontSize: "1.05rem", lineHeight: 1.78,
        marginBottom: "3rem", position: "relative", zIndex: 1,
        animation: "fadeUp 0.75s 0.2s ease both",
      }}>
        רשת פרטית לבוגרות התנועה למנהיגות שווה.
        מצאי מומחיות, שלחי בקשות עזרה, ובני קשרים אמיתיים
        עם הגנת פרטיות מלאה.
      </p>

      {/* CTAs */}
      <div style={{
        display: "flex", gap: "0.85rem", flexWrap: "wrap",
        justifyContent: "center", position: "relative", zIndex: 1,
        animation: "fadeUp 0.75s 0.3s ease both",
      }}>
        <button onClick={onLogin} style={{
          background: "linear-gradient(135deg, #2563eb, #38bdf8)",
          color: "#fff", padding: "14px 32px",
          borderRadius: 11, border: "none",
          fontSize: "0.97rem", fontWeight: 700, cursor: "pointer",
          boxShadow: "0 6px 28px rgba(37,99,235,0.45)",
          transition: "transform 0.2s, box-shadow 0.2s",
          letterSpacing: "0.01em",
        }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 36px rgba(37,99,235,0.55)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 28px rgba(37,99,235,0.45)"; }}
        >
          🚀 הצטרפי עכשיו
        </button>
        <button onClick={onLogin} style={{
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.9)",
          padding: "14px 28px", borderRadius: 11,
          border: "1px solid rgba(255,255,255,0.2)",
          fontSize: "0.97rem", fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.2s, border-color 0.2s",
        }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
        >
          כניסה לחשבון
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: "2.5rem", marginTop: "5.5rem",
        position: "relative", zIndex: 1,
        animation: "fadeUp 0.75s 0.45s ease both",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {[
          { n: "500+", l: "בוגרות" },
          { n: "10+", l: "שנות פעילות" },
          { n: "100%", l: "מאובטח ופרטי" },
        ].map(({ n, l }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
            {i > 0 && <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.12)", marginLeft: "-2.5rem" }} />}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>{n}</div>
              <div style={{ color: "rgba(191,219,254,0.55)", fontSize: "0.75rem", marginTop: "0.3rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes breathe { 0%,100% { opacity:0.7; transform:translate(-50%,-50%) scale(1); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1.08); } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
      `}</style>
    </section>
  );
}

/* ─── WAVE divider ─── */
function Wave({ from, to }) {
  return (
    <div style={{ display: "block", lineHeight: 0, overflow: "hidden", marginBottom: -2 }}>
      <svg viewBox="0 0 1440 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" height="70" width="100%">
        <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill={to} />
      </svg>
    </div>
  );
}

/* ─── ABOUT / MISSION ─── */
function About() {
  const [ref, visible] = useReveal();

  return (
    <section id="about" style={{
      background: C.white, padding: "7rem 3rem",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div ref={ref} style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5rem", alignItems: "center",
        }}>
          {/* Left: text */}
          <div style={reveal(visible)}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.blue, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8rem" }}>
              ✦ אודות הפלטפורמה
            </div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.9rem)", fontWeight: 900, color: C.navy, marginBottom: "1.2rem", lineHeight: 1.12, letterSpacing: "-0.02em" }}>
              הקשר שלא<br />ידעת שאת צריכה
            </h2>
            <p style={{ color: C.muted, fontSize: "0.97rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
              מנהיגות שווה היא תנועה בת עשור שמשתפת נשים מוכשרות ממגוון תחומים לקדם מנהיגות מגדרית שוויונית בישראל.
            </p>
            <p style={{ color: C.muted, fontSize: "0.97rem", lineHeight: 1.8, marginBottom: "2rem" }}>
              הפלטפורמה הזו נבנתה כדי לחבר את הבוגרות — מקום אחד למצוא עזרה מקצועית, לשתף עדכונים, ולצמוח יחד.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {["🤝 קהילה", "🔒 פרטיות", "🚀 מקצועיות"].map(t => (
                <span key={t} style={{
                  background: "rgba(37,99,235,0.08)",
                  border: "1px solid rgba(37,99,235,0.18)",
                  color: C.blue, padding: "7px 16px",
                  borderRadius: 99, fontSize: "0.82rem", fontWeight: 700,
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right: visual card stack */}
          <div style={reveal(visible, 0.18)}>
            <div style={{ position: "relative", paddingBottom: "2.5rem", paddingLeft: "2.5rem" }}>
              {/* Back card */}
              <div style={{
                position: "absolute", bottom: 0, left: 0,
                width: "88%", height: "85%",
                background: "linear-gradient(135deg, #1a3a8f, #2563eb)",
                borderRadius: 20, opacity: 0.35,
                transform: "rotate(-3deg)",
              }} />
              {/* Front card */}
              <div style={{
                position: "relative",
                background: "#fff",
                borderRadius: 20, padding: "2rem",
                boxShadow: "0 24px 60px rgba(15,31,61,0.13)",
                border: "1px solid rgba(37,99,235,0.1)",
              }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.blue, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2rem" }}>
                  חברת קהילה
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem", fontWeight: 900, color: "#fff",
                    flexShrink: 0,
                  }}>מ</div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.navy, marginBottom: 2 }}>מיכל לוי</div>
                    <div style={{ fontSize: "0.78rem", color: C.muted }}>עורכת דין · תל אביב</div>
                  </div>
                  <span style={{
                    marginRight: "auto", background: "#dcfce7", border: "1px solid #bbf7d0",
                    color: "#166534", fontSize: "0.68rem", fontWeight: 700,
                    padding: "3px 10px", borderRadius: 99,
                  }}>פעילה</span>
                </div>
                <div style={{ fontSize: "0.83rem", color: C.muted, lineHeight: 1.65, marginBottom: "1.2rem" }}>
                  "הצלחתי למצוא שותפה עסקית ממחזור 3 תוך 24 שעות דרך הפלטפורמה. פשוט ממש."
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {["משפט", "יזמות", "ליטיגציה"].map(s => (
                    <span key={s} style={{
                      background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.15)",
                      color: C.blue, fontSize: "0.7rem", fontWeight: 600,
                      padding: "3px 10px", borderRadius: 8,
                    }}>{s}</span>
                  ))}
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
function Features() {
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal(0.06);

  const feats = [
    { icon: "🔍", title: "חיפוש חכם", desc: "חפשי לפי שם, מקצוע, עיר, או תחום. תוצאות מיידיות עם פילטרים לפי קטגוריה." },
    { icon: "📨", title: "בקשות עזרה", desc: "שלחי פנייה ישירה לבוגרת. פרטי קשר נחשפים רק אחרי אישור — מלא שליטה." },
    { icon: "🌐", title: "פיד קהילתי", desc: "שתפי עדכונים, הצלחות והזדמנויות. כל הקהילה בזרם אחד חי." },
    { icon: "📊", title: "לוח מנהל", desc: "ניהול חברות, סטטיסטיקות, ייבוא Excel — הכול במקום אחד." },
    { icon: "🔒", title: "פרטיות מלאה", desc: "מידע קשר מוסתר כברירת מחדל. HTTPS, Firebase Auth, בקרת גישה מפורטת." },
    { icon: "📱", title: "כל מכשיר", desc: "נייד, טאבלט, מחשב — חוויה חלקה בכל רזולוציה ובכל שפה." },
  ];

  return (
    <section id="features" style={{
      background: `linear-gradient(175deg, #0a0f1e 0%, #0f1f3d 55%, #16326b 100%)`,
      padding: "7rem 3rem", position: "relative", overflow: "hidden",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div ref={headerRef} style={reveal(headerVisible)}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7dd3fc", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8rem" }}>
            ✦ תכונות הפלטפורמה
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#fff", marginBottom: "0.9rem", letterSpacing: "-0.02em" }}>
            בנוי לחיבורים אמיתיים
          </h2>
          <p style={{ color: "rgba(191,219,254,0.7)", fontSize: "0.95rem", lineHeight: 1.75, maxWidth: 520, marginBottom: "3.5rem" }}>
            כל תכונה תוכננה סביב אמון, פרטיות, ושיתוף פעולה משמעותי.
          </p>
        </div>

        <div ref={gridRef} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.1rem",
        }}>
          {feats.map((f, i) => <FeatCard key={i} {...f} visible={gridVisible} delay={i * 0.08} />)}
        </div>
      </div>
    </section>
  );
}

function FeatCard({ icon, title, desc, visible = true, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={reveal(visible, delay)}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)",
          border: `1px solid ${hov ? "rgba(56,189,248,0.35)" : "rgba(255,255,255,0.09)"}`,
          borderRadius: 16, padding: "1.8rem 1.5rem",
          transform: hov ? "translateY(-4px)" : "",
          transition: "background 0.22s, transform 0.22s, border-color 0.22s",
          height: "100%", boxSizing: "border-box",
          position: "relative", overflow: "hidden",
        }}>
        {hov && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, #2563eb, #38bdf8)",
          }} />
        )}
        <div style={{
          width: 46, height: 46,
          background: "rgba(56,189,248,0.15)",
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.35rem", marginBottom: "1.1rem",
        }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: "0.97rem", color: "#fff", marginBottom: "0.5rem" }}>{title}</div>
        <p style={{ color: "rgba(191,219,254,0.65)", fontSize: "0.84rem", lineHeight: 1.65, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal(0.07);

  const steps = [
    { n: "01", icon: "📝", title: "הרשמה מהירה", desc: "מלאי את הפרטים שלך — שם, תחום, עיר, ביוגרפיה קצרה. לוקח 3 דקות." },
    { n: "02", icon: "🔍", title: "חפשי בוגרות", desc: "חפשי לפי מקצוע, מיקום, או שם. פילטרים לפי קטגוריה לתוצאות מדויקות." },
    { n: "03", icon: "📨", title: "שלחי בקשה", desc: "פני לבוגרת שיכולה לעזור. הפנייה שלך מגיעה אליה ישירות ובפרטיות." },
    { n: "04", icon: "🤝", title: "התחברי", desc: "אחרי שהבוגרת אישרה — מתחיל שיתוף הפעולה. פשוט ומדויק." },
  ];

  return (
    <section id="how" style={{
      background: C.white, padding: "7rem 3rem",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div ref={headerRef} style={reveal(headerVisible)}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: C.blue, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8rem" }}>
            ✦ איך זה עובד
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.9rem)", fontWeight: 900, color: C.navy, marginBottom: "0.9rem", letterSpacing: "-0.02em" }}>
            מהרשמה לחיבור — בדקות
          </h2>
          <p style={{ color: C.muted, fontSize: "0.95rem", lineHeight: 1.75, maxWidth: 480, marginBottom: "3.5rem" }}>
            תוכנן שכל בוגרת תשלים את ההצטרפות בקלות, ללא הדרכה.
          </p>
        </div>

        <div ref={gridRef} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: "1.2rem",
        }}>
          {steps.map((s, i) => <StepCard key={i} {...s} visible={gridVisible} delay={i * 0.1} />)}
        </div>
      </div>
    </section>
  );
}

function StepCard({ n, icon, title, desc, visible = true, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={reveal(visible, delay)}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: "#fff",
          border: `1.5px solid ${hov ? "rgba(37,99,235,0.25)" : C.border}`,
          borderRadius: 18, padding: "2rem 1.6rem",
          position: "relative", overflow: "hidden",
          transform: hov ? "translateY(-4px)" : "",
          boxShadow: hov ? "0 14px 44px rgba(37,99,235,0.12)" : "0 2px 8px rgba(15,31,61,0.04)",
          transition: "transform 0.22s, box-shadow 0.22s, border-color 0.22s",
          height: "100%", boxSizing: "border-box",
        }}>
        {hov && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, #2563eb, #38bdf8)",
          }} />
        )}
        <div style={{
          fontSize: "3.2rem", fontWeight: 900,
          color: hov ? "rgba(37,99,235,0.15)" : "rgba(15,31,61,0.07)",
          lineHeight: 1, marginBottom: "1rem",
          transition: "color 0.22s",
        }}>{n}</div>
        <div style={{ fontSize: "1.9rem", marginBottom: "0.8rem" }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.5rem" }}>{title}</div>
        <p style={{ color: C.muted, fontSize: "0.84rem", lineHeight: 1.65, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── SOCIAL PROOF ─── */
function Testimonials() {
  const [ref, visible] = useReveal(0.08);

  const quotes = [
    { name: "דנה מ.", role: "מהנדסת · מחזור 7", text: "תוך שבוע מצאתי מנטורית שעזרה לי לקדם שינוי בחברה שלי. הפלטפורמה שינתה לי את הראש." },
    { name: "רונית ש.", role: "רופאה · מחזור 4", text: "סוף סוף מקום שמבין מה זה להיות אישה בכוח. הקהילה כאן חמה ומקצועית בו זמנית." },
    { name: "יעל ב.", role: "יזמית · מחזור 9", text: "שלושת השותפים שלי לעסק הגיעו מהפלטפורמה. לא צריך חיפוש אחר — הכל כאן." },
  ];

  return (
    <section style={{
      background: `linear-gradient(160deg, #0a0f1e 0%, #0f1f3d 60%, #1a3a8f 100%)`,
      padding: "7rem 3rem", position: "relative", overflow: "hidden",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 400,
        background: "radial-gradient(ellipse, rgba(37,99,235,0.18) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7dd3fc", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8rem" }}>
            ✦ מה הבוגרות אומרות
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
            קול הקהילה
          </h2>
        </div>

        <div ref={ref} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1.2rem",
        }}>
          {quotes.map((q, i) => (
            <div key={i} style={reveal(visible, i * 0.12)}>
              <div style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18, padding: "2rem",
                height: "100%", boxSizing: "border-box",
              }}>
                <div style={{ fontSize: "2.2rem", color: "rgba(56,189,248,0.6)", marginBottom: "1rem", lineHeight: 1 }}>"</div>
                <p style={{ color: "rgba(191,219,254,0.85)", fontSize: "0.93rem", lineHeight: 1.72, marginBottom: "1.5rem" }}>
                  {q.text}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.95rem", fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>{q.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{q.name}</div>
                    <div style={{ color: "rgba(191,219,254,0.5)", fontSize: "0.75rem" }}>{q.role}</div>
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
      background: C.white, padding: "7rem 2rem",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div ref={ref} style={{ ...reveal(visible), maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(56,189,248,0.06))",
          border: "1px solid rgba(37,99,235,0.15)",
          borderRadius: 24, padding: "4rem 3rem",
          boxShadow: "0 0 60px rgba(37,99,235,0.06)",
          width: "100%", boxSizing: "border-box",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1.2rem" }}>🌟</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: C.navy, marginBottom: "1rem", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            מוכנה להצטרף?
          </h2>
          <p style={{ color: C.muted, fontSize: "0.97rem", lineHeight: 1.75, marginBottom: "2.5rem", maxWidth: 420, margin: "0 auto 2.5rem" }}>
            הצטרפי לרשת הבוגרות ותוכלי להתחבר עם מאות נשים מוכשרות שמקדמות ומקודמות.
          </p>
          <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onLogin} style={{
              background: "linear-gradient(135deg, #1a3a8f, #2563eb, #38bdf8)",
              color: "#fff", padding: "14px 36px",
              borderRadius: 11, border: "none",
              fontSize: "0.97rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 28px rgba(37,99,235,0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 36px rgba(37,99,235,0.45)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 28px rgba(37,99,235,0.35)"; }}
            >
              🚀 הצטרפי לרשת
            </button>
            <button onClick={onLogin} style={{
              background: "transparent", color: C.blue,
              padding: "14px 28px", borderRadius: 11,
              border: `1.5px solid rgba(37,99,235,0.3)`,
              fontSize: "0.97rem", fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s",
            }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(37,99,235,0.05)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.55)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.3)"; }}
            >
              יש לי כבר חשבון
            </button>
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
      background: "#070d1a",
      padding: "2.5rem 3rem",
      direction: "rtl",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.85rem", color: "#fff", fontWeight: 800,
          }}>♀</div>
          <span style={{ color: "rgba(191,219,254,0.7)", fontSize: "0.88rem", fontWeight: 600 }}>
            מנהיגות שווה · רשת הבוגרות
          </span>
        </div>
        <div style={{ color: "rgba(191,219,254,0.3)", fontSize: "0.75rem" }}>
          © 2026 · פלטפורמה פנימית מאובטחת
        </div>
      </div>
    </footer>
  );
}

/* ─── MAIN EXPORT ─── */
export default function LandingPage({ onLogin }) {
  return (
    <div style={{ direction: "rtl" }}>
      <Nav onLogin={onLogin} />
      <Hero onLogin={onLogin} />
      <Wave from="#0a0f1e" to={C.white} />
      <About />
      <Features />
      <Wave from="#0a0f1e" to={C.white} />
      <HowItWorks />
      <Testimonials />
      <Wave from="#0a0f1e" to={C.white} />
      <CTA onLogin={onLogin} />
      <Footer />
    </div>
  );
}
