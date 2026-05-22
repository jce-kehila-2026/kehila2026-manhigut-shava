import { useState, useEffect, useRef } from "react";

const C = {
  royal: "#1a3a8f",
  royalMid: "#2148b3",
  royalBright: "#2f5fd4",
  royalLight: "#4a7ae8",
  sky: "#7aaef5",
  pale: "#c8ddfb",
  white: "#f4f8ff",
  deep: "#0b1f52",
  deeper: "#071440",
  text: "#1a2340",
  muted: "#5a6a8a",
  border: "rgba(42,96,210,0.15)",
};

/* Fires once when element enters viewport */
function useReveal(threshold = 0.12) {
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

function revealStyle(visible, delay = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(32px)",
    transition: `opacity 0.65s ${delay}s ease, transform 0.65s ${delay}s ease`,
  };
}

/* ─── NAV ─── */
function Nav({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.9rem 3rem",
      background: "rgba(244,248,255,0.94)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${C.border}`,
      boxShadow: scrolled ? "0 4px 32px rgba(26,58,143,0.1)" : "none",
      transition: "box-shadow 0.3s",
      direction: "rtl",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
        <div style={{
          width: 38, height: 38,
          background: `linear-gradient(135deg,${C.royal},${C.royalLight})`,
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", color: "#fff", fontWeight: 700,
          boxShadow: "0 4px 12px rgba(26,58,143,0.3)",
        }}>♀</div>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: C.royal, lineHeight: 1.1 }}>
            מנהיגות שווה
          </div>
          <div style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.06em" }}>
            רשת בוגרות
          </div>
        </div>
      </div>

      <ul style={{ display: "flex", gap: "1.8rem", listStyle: "none", margin: 0, padding: 0, alignItems: "center" }}>
        {[
          ["#how", "איך זה עובד"],
          ["#features", "תכונות"],
          ["#privacy", "פרטיות"],
        ].map(([href, label]) => (
          <li key={href}>
            <a href={href} style={{
              color: C.muted, textDecoration: "none",
              fontSize: "0.88rem", fontWeight: 500, transition: "color 0.2s",
            }}
              onMouseOver={e => e.target.style.color = C.royal}
              onMouseOut={e => e.target.style.color = C.muted}
            >{label}</a>
          </li>
        ))}
        <li>
          <button onClick={onLogin} style={{
            background: `linear-gradient(135deg,${C.royal},${C.royalBright})`,
            color: "#fff", padding: "0.5rem 1.3rem",
            borderRadius: 8, border: "none",
            fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(26,58,143,0.25)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseOver={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 20px rgba(26,58,143,0.35)"; }}
            onMouseOut={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 4px 14px rgba(26,58,143,0.25)"; }}
          >
            כניסה / הרשמה
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* ─── HERO ─── */
function Hero({ onLogin }) {
  return (
    <section style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg,${C.deeper} 0%,${C.deep} 40%,${C.royal} 75%,${C.royalBright} 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "8rem 2rem 5rem",
      position: "relative", overflow: "hidden",
      direction: "rtl",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 600,
        background: "radial-gradient(ellipse,rgba(122,174,245,0.18) 0%,transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{
        display: "inline-flex", alignItems: "center", gap: "0.5rem",
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
        color: C.pale, fontSize: "0.75rem", fontWeight: 600,
        padding: "0.35rem 1rem", borderRadius: 20, marginBottom: "2rem",
        letterSpacing: "0.1em", textTransform: "uppercase",
        position: "relative", zIndex: 1,
        animation: "fadeUp 0.7s ease both",
      }}>
        <span style={{ width: 6, height: 6, background: C.sky, borderRadius: "50%", display: "inline-block" }} />
        פלטפורמה פנימית מאובטחת · בוגרות בלבד
      </div>

      <h1 style={{
        fontSize: "clamp(2.8rem,7vw,5.2rem)", fontWeight: 900,
        color: "#fff", lineHeight: 1.05, marginBottom: "1.5rem",
        position: "relative", zIndex: 1,
        animation: "fadeUp 0.7s 0.1s ease both",
      }}>
        התחברי. תמכי.<br />
        <span style={{
          background: `linear-gradient(135deg,${C.pale},${C.sky})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          הובילי יחד.
        </span>
      </h1>

      <p style={{
        maxWidth: 560, color: "rgba(200,221,251,0.85)",
        fontSize: "1.05rem", lineHeight: 1.75,
        marginBottom: "3rem", position: "relative", zIndex: 1,
        animation: "fadeUp 0.7s 0.2s ease both",
      }}>
        רשת פרטית לבוגרות התנועה למנהיגות שווה — מצאי מומחיות, שלחי בקשות עזרה,
        ובני את קהילת המנהיגות שלך עם הגנת פרטיות מלאה.
      </p>

      <div style={{
        display: "flex", gap: "1rem", flexWrap: "wrap",
        justifyContent: "center", position: "relative", zIndex: 1,
        animation: "fadeUp 0.7s 0.3s ease both",
      }}>
        <button onClick={onLogin} style={{
          background: "#fff", color: C.royal,
          padding: "0.9rem 2.2rem", borderRadius: 10, border: "none",
          fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
          boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseOver={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 10px 32px rgba(0,0,0,0.25)"; }}
          onMouseOut={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 6px 24px rgba(0,0,0,0.2)"; }}
        >
          🔍 מצאי בוגרת
        </button>
        <button onClick={onLogin} style={{
          background: "rgba(255,255,255,0.1)", color: "#fff",
          padding: "0.9rem 2.2rem", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.25)",
          fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
          transition: "background 0.2s",
        }}
          onMouseOver={e => e.target.style.background = "rgba(255,255,255,0.18)"}
          onMouseOut={e => e.target.style.background = "rgba(255,255,255,0.1)"}
        >
          הרשמי כבוגרת
        </button>
      </div>

      <div style={{
        display: "flex", gap: "4rem", marginTop: "5rem",
        position: "relative", zIndex: 1,
        animation: "fadeUp 0.7s 0.45s ease both",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {[
          ["500+", "בוגרות"],
          ["700+", "משתמשות פעילות"],
          ["10+", "שנות פעילות"],
          ["<2s", "זמן טעינה"],
        ].map(([num, label], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "4rem" }}>
            {i > 0 && <div style={{ width: 1, background: "rgba(255,255,255,0.15)", alignSelf: "stretch" }} />}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.6rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{num}</div>
              <div style={{ color: "rgba(200,221,251,0.7)", fontSize: "0.78rem", marginTop: "0.3rem", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </section>
  );
}

/* ─── wave ─── */
function Wave({ fill = C.white }) {
  return (
    <div style={{ display: "block", width: "100%", overflow: "hidden", lineHeight: 0, marginBottom: -1 }}>
      <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" height="60" width="100%">
        <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill={fill} />
      </svg>
    </div>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal(0.08);

  const steps = [
    { n: "01", icon: "📝", title: "הרשמי ובני פרופיל", desc: "מלאי את טופס ההצטרפות עם תחומי מומחיות, תחומי עניין ורקע. השדות מוגדרים על-ידי מנהל המערכת." },
    { n: "02", icon: "🔍", title: "חפשי ברשת", desc: "מצאי בוגרות לפי תחום, מומחיות או עזרה ספציפית שדרושה. תוצאות מוצגות עד 20 פרופילים בעמוד." },
    { n: "03", icon: "📨", title: "שלחי בקשת עזרה", desc: "פני לבוגרת שמומחיותה תואמת את צורכך. המקבלת בוחנת את בקשתך בפרטיות." },
    { n: "04", icon: "🤝", title: "התחברי בביטחון", desc: "רק לאחר שהבוגרת אישרה, פרטי הקשר שלך ישותפו — דרך וואטסאפ או אימייל, בתנאים שלך." },
  ];

  return (
    <section id="how" style={{
      background: C.white, padding: "6rem 3rem",
      direction: "rtl", fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div ref={headerRef} style={revealStyle(headerVisible)}>
          <div style={{ color: C.royalBright, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            ✦ איך זה עובד
          </div>
          <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, color: C.deep, marginBottom: "0.8rem" }}>
            מהרשמה לחיבור — בדקות
          </h2>
          <p style={{ color: C.muted, fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 520, marginBottom: "3rem" }}>
            תוכנן כך שכל בוגרת תוכל להשלים את ההצטרפות בעצמה — ללא הדרכה.
          </p>
        </div>

        <div ref={gridRef} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: "1.5rem",
        }}>
          {steps.map((s, i) => (
            <StepCard key={i} {...s} visible={gridVisible} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ n, icon, title, desc, visible = true, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={revealStyle(visible, delay)}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "2rem 1.5rem",
          position: "relative", overflow: "hidden",
          transform: hov ? "translateY(-4px)" : "",
          boxShadow: hov ? "0 12px 40px rgba(26,58,143,0.1)" : "none",
          transition: "transform 0.2s, box-shadow 0.2s",
          height: "100%", boxSizing: "border-box",
        }}>
        {hov && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg,${C.royal},${C.royalLight})`,
          }} />
        )}
        <div style={{ fontSize: "3rem", fontWeight: 700, color: C.pale, lineHeight: 1, marginBottom: "1rem" }}>{n}</div>
        <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: C.deep, marginBottom: "0.5rem" }}>{title}</div>
        <p style={{ color: C.muted, fontSize: "0.85rem", lineHeight: 1.65, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── FEATURES ─── */
function Features() {
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal(0.06);

  const feats = [
    { icon: "🔍", title: "חיפוש חכם", desc: "חיפוש מבוסס מילות מפתח ותגיות. תוצאות תוך שנייה אחת, עד 20 בעמוד." },
    { icon: "📨", title: "מערכת בקשות עזרה", desc: "שליחת בקשות ממוקדות עם תהליך אישור מלא לפני שיתוף פרטי קשר." },
    { icon: "🔔", title: "התראות חכמות", desc: "אירועים נשלחים רק לבוגרות שתחומי עניינן תואמים — ללא ספאם." },
    { icon: "📊", title: "לוח מחוונים למנהל", desc: "סטטיסטיקות בזמן אמת, מעקב אחר מחזורים, ייבוא אקסל וניהול בוגרות." },
    { icon: "📥", title: "ייבוא מאסיבי מאקסל", desc: "העלאת קבצי .xlsx עם אימות אוטומטי — מחליף את הגיליונות הידניים." },
    { icon: "📰", title: "פיד קהילתי", desc: "בוגרות מפרסמות עדכונים והזדמנויות. התוכן החדש ביותר תמיד ראשון." },
    { icon: "🔒", title: "בקרת פרטיות", desc: "פרטי קשר מוסתרים כברירת מחדל. סיסמאות bcrypt, RBAC, יומני ביקורת." },
    { icon: "📱", title: "ידידותי לנייד", desc: "רספונסיבי לחלוטין על נייד ודסקטופ, נגיש לכולם." },
  ];

  return (
    <section id="features" style={{
      background: `linear-gradient(160deg,${C.deeper} 0%,${C.deep} 50%,${C.royal} 100%)`,
      padding: "6rem 3rem", position: "relative", overflow: "hidden",
      direction: "rtl", fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
        backgroundSize: "50px 50px",
      }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div ref={headerRef} style={revealStyle(headerVisible)}>
          <div style={{ color: "rgba(200,221,251,0.6)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            ✦ תכונות הפלטפורמה
          </div>
          <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, color: "#fff", marginBottom: "0.8rem" }}>
            בנוי לשיתוף פעולה אמיתי
          </h2>
          <p style={{ color: "rgba(200,221,251,0.75)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 520, marginBottom: "3rem" }}>
            כל תכונה מתוכננת סביב אמון, פרטיות וחיבור משמעותי.
          </p>
        </div>

        <div ref={gridRef} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
          gap: "1.2rem",
        }}>
          {feats.map((f, i) => <FeatCard key={i} {...f} visible={gridVisible} delay={i * 0.07} />)}
        </div>
      </div>
    </section>
  );
}

function FeatCard({ icon, title, desc, visible = true, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={revealStyle(visible, delay)}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, padding: "1.8rem 1.5rem",
          transform: hov ? "translateY(-3px)" : "",
          transition: "background 0.2s, transform 0.2s",
          height: "100%", boxSizing: "border-box",
        }}>
        <div style={{
          width: 48, height: 48,
          background: "rgba(122,174,245,0.15)",
          borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.4rem", marginBottom: "1.1rem",
        }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: "0.97rem", color: "#fff", marginBottom: "0.5rem" }}>{title}</div>
        <p style={{ color: "rgba(200,221,251,0.7)", fontSize: "0.84rem", lineHeight: 1.65, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── PRIVACY ─── */
function Privacy() {
  const [leftRef, leftVisible] = useReveal();
  const [rightRef, rightVisible] = useReveal(0.1);

  const items = [
    { icon: "🛡️", title: "פרופיל ציבורי מינימלי", desc: "רק שם, תחום ומומחיות גלויים. טלפון ואימייל נשארים מוסתרים." },
    { icon: "✅", title: "שיתוף מבוסס הסכמה", desc: "פרטי קשר נחשפים רק לאחר שאישרת במפורש בקשת עזרה." },
    { icon: "🛡️", title: "גישה מבוססת תפקיד", desc: "לבוגרות ולמנהלות יש הרשאות מופרדות לחלוטין." },
    { icon: "📋", title: "יומני ביקורת מלאים", desc: "כל פעולות המנהל מתועדות עם חותמות זמן לאחריות." },
  ];

  return (
    <section id="privacy" style={{
      background: C.white, padding: "6rem 3rem",
      direction: "rtl", fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "5rem", alignItems: "center",
        }}>
          <div ref={leftRef} style={revealStyle(leftVisible)}>
            <div style={{ color: C.royalBright, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              🔐 פרטיות ואבטחה
            </div>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, color: C.deep, marginBottom: "0.8rem" }}>
              הנתונים שלך, השליטה שלך
            </h2>
            <p style={{ color: C.muted, fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 520, marginBottom: "2rem" }}>
              בנוי כמרחב בטוח ומאובטח. פרטי קשר לעולם אינם משותפים ללא הסכמה מפורשת.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {items.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg,${C.royal},${C.royalLight})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1rem", boxShadow: "0 4px 12px rgba(26,58,143,0.2)",
                  }}>{item.icon}</div>
                  <div>
                    <strong style={{ display: "block", fontWeight: 700, fontSize: "0.92rem", color: C.deep, marginBottom: "0.2rem" }}>{item.title}</strong>
                    <span style={{ color: C.muted, fontSize: "0.83rem", lineHeight: 1.6 }}>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div ref={rightRef} style={revealStyle(rightVisible, 0.15)}>
            <div style={{
              background: `linear-gradient(160deg,${C.deep},${C.royalMid})`,
              borderRadius: 20, padding: "2.5rem",
              boxShadow: "0 20px 60px rgba(26,58,143,0.25)",
            }}>
              <div style={{ color: "rgba(200,221,251,0.6)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2rem" }}>
                תהליך בקשת עזרה
              </div>
              {[
                { icon: "📨", text: "בוגרת שולחת בקשת עזרה" },
                { icon: "🔔", text: "המקבלת מקבלת התראה" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, padding: "0.9rem 1.1rem", marginBottom: "0.75rem",
                }}>
                  <span style={{ fontSize: "1.1rem" }}>{row.icon}</span>
                  <div style={{ color: "rgba(200,221,251,0.9)", fontSize: "0.84rem", fontWeight: 500 }}>{row.text}</div>
                </div>
              ))}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(74,122,232,0.3)",
                borderRadius: 10, padding: "0.9rem 1.1rem", marginBottom: "0.5rem",
              }}>
                <span style={{ fontSize: "1.1rem" }}>✅</span>
                <div style={{ color: "rgba(200,221,251,0.9)", fontSize: "0.84rem", fontWeight: 500, flex: 1 }}>מאשרת את הבקשה</div>
                <span style={{
                  background: "rgba(74,122,232,0.25)", border: "1px solid rgba(74,122,232,0.4)",
                  color: C.sky, fontSize: "0.7rem", fontWeight: 700,
                  padding: "0.2rem 0.6rem", borderRadius: 8,
                }}>פרטים משותפים</span>
              </div>
              <div style={{ textAlign: "center", color: "rgba(200,221,251,0.3)", fontSize: "0.8rem", margin: "0.5rem 0" }}>↕ או ↕</div>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(220,60,60,0.25)",
                borderRadius: 10, padding: "0.9rem 1.1rem",
              }}>
                <span style={{ fontSize: "1.1rem" }}>❌</span>
                <div style={{ color: "rgba(200,221,251,0.9)", fontSize: "0.84rem", fontWeight: 500, flex: 1 }}>דוחה את הבקשה</div>
                <span style={{
                  background: "rgba(220,60,60,0.2)", border: "1px solid rgba(220,60,60,0.3)",
                  color: "#f08080", fontSize: "0.7rem", fontWeight: 700,
                  padding: "0.2rem 0.6rem", borderRadius: 8,
                }}>פרטים מוסתרים</span>
              </div>
              <div style={{ marginTop: "1.5rem", paddingTop: "1.2rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "rgba(200,221,251,0.5)", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  מחסנית אבטחה
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {["bcrypt", "HTTPS", "RBAC", "Firebase Auth", "יומני ביקורת"].map(t => (
                    <span key={t} style={{
                      background: "rgba(74,122,232,0.2)", border: "1px solid rgba(74,122,232,0.3)",
                      color: C.sky, fontSize: "0.7rem", fontWeight: 600,
                      padding: "0.2rem 0.6rem", borderRadius: 8,
                    }}>{t}</span>
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

/* ─── CTA ─── */
function CTA({ onLogin }) {
  const [ref, visible] = useReveal(0.2);

  return (
    <section style={{
      background: `linear-gradient(135deg,${C.deeper} 0%,${C.royal} 60%,${C.royalBright} 100%)`,
      textAlign: "center", padding: "7rem 2rem",
      position: "relative", overflow: "hidden",
      direction: "rtl", fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
        backgroundSize: "50px 50px",
      }} />
      <div ref={ref} style={{ ...revealStyle(visible), position: "relative", zIndex: 1 }}>
        <h2 style={{
          fontSize: "clamp(2.2rem,5vw,3.8rem)", fontWeight: 900,
          color: "#fff", marginBottom: "1.2rem",
        }}>
          מוכנה להצטרף לרשת<br />
          <span style={{ fontStyle: "italic", color: C.pale }}>המנהיגות?</span>
        </h2>
        <p style={{
          color: "rgba(200,221,251,0.8)", fontSize: "1rem",
          maxWidth: 480, margin: "0 auto 2.5rem", lineHeight: 1.7,
        }}>
          התחברי עם מאות בוגרות, שתפי מומחיות, ובני את הדור הבא של מנהיגות — יחד.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onLogin} style={{
            background: "#fff", color: C.royal,
            padding: "0.9rem 2.2rem", borderRadius: 10, border: "none",
            fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
            transition: "transform 0.2s",
          }}
            onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={e => e.target.style.transform = ""}
          >
            הרשמי כבוגרת
          </button>
          <button onClick={onLogin} style={{
            background: "transparent", color: "#fff",
            padding: "0.9rem 2.2rem", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.4)",
            fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
          }}
            onMouseOver={e => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.borderColor = "#fff"; }}
            onMouseOut={e => { e.target.style.background = "transparent"; e.target.style.borderColor = "rgba(255,255,255,0.4)"; }}
          >
            כניסה לחשבון
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer style={{
      background: C.deeper, padding: "2.5rem 4rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      direction: "rtl", fontFamily: "'Segoe UI', system-ui, sans-serif",
      flexWrap: "wrap", gap: "1rem",
    }}>
      <div style={{ fontSize: "1.1rem", color: C.pale, fontWeight: 600 }}>
        מנהיגות שווה · התנועה למנהיגות שווה
      </div>
      <div style={{ color: "rgba(200,221,251,0.4)", fontSize: "0.78rem" }}>
        © 2025 · פלטפורמת בוגרות מאובטחת · בנוי על-ידי צוות ג'ואל
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
      <Wave fill={C.white} />
      <HowItWorks />
      <Features />
      <Wave fill={C.white} />
      <Privacy />
      <CTA onLogin={onLogin} />
      <Footer />
    </div>
  );
}
