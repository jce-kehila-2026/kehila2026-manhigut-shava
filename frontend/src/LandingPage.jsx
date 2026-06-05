import { useLang } from "./LanguageContext";

/* ─── Palette ─── */
const C = {
  cream:    "#fdf8f6",
  blush:    "#e8c5c5",
  rose:     "#b8617a",
  roseDark: "#8d3f5c",
  plum:     "#4a1f3d",
  muted:    "#7a5868",
  border:   "rgba(184, 97, 122, 0.16)",
};

/* ─── Minimal SVG Icons ─── */
const Icons = {
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Feed: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  ),
  Mobile: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  Chat: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
};

/* ─── Language switcher ─── */
function LangSwitcher({ lang, setLang }) {
  const langs = [
    { code: "he", label: "HE" },
    { code: "en", label: "EN" },
    { code: "ar", label: "AR" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {langs.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            background: lang === code ? C.plum : "transparent",
            color: lang === code ? C.cream : C.muted,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "inherit",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Decorative bloom ─── */
function Bloom({ style }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        filter: "blur(80px)",
        pointerEvents: "none",
        ...style}}
    />
  );
}

/* ─── Landing ─── */
export default function LandingPage({ onLogin }) {
  const { t, isRTL, lang, setLang } = useLang();

  const FEATURES = [
    { 
      Icon: Icons.Search, 
      title: "Smart Search", 
      desc: "Search by name, profession, city, or category. Instant results with precise filters." 
    },
    { 
      Icon: Icons.Send, 
      title: "Help Requests", 
      desc: "Send a direct request to a graduate." 
    },
    { 
      Icon: Icons.Chat, 
      title: "Direct Chatting", 
      desc: "Connect seamlessly through secure, real-time messaging directly within the platform." 
    },
    { 
      Icon: Icons.Feed, 
      title: "Community Feed", 
      desc: "Share updates, successes, and opportunities. The entire community in one live stream." 
    },
    { 
      Icon: Icons.Mobile, 
      title: "Any Device", 
      desc: "Mobile, tablet, desktop — a seamless experience in any resolution and language." 
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        color: C.plum,
        fontFamily: "'Figtree', 'Heebo', system-ui, sans-serif",
        direction: isRTL ? "rtl" : "ltr",
        position: "relative",
        // Changed overflow from 'hidden' to 'x' to allow vertical scrolling safely
        overflowX: "hidden", 
        overflowY: "auto",
      }}
    >
      {/* Soft background blooms */}
      <Bloom style={{ top: "-10%", left: "-10%", width: 420, height: 420, background: C.blush, opacity: 0.55 }} />
      <Bloom style={{ bottom: "-15%", right: "-10%", width: 480, height: 480, background: "#f5d8de", opacity: 0.6 }} />
      <Bloom style={{ top: "40%", right: "20%", width: 280, height: 280, background: "#f0c8d3", opacity: 0.35 }} />

      {/* Top bar */}
      <header
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.8rem clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.cream,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.02em",
              boxShadow: "0 4px 16px rgba(184,97,122,0.28)",
            }}
          >
            B
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 15, color: C.plum }}>
              {t.landing.footer.brand}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>
              {t.landing.footer.tagline}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <LangSwitcher lang={lang} setLang={setLang} />
          <button
            onClick={onLogin}
            style={{
              background: C.plum,
              color: C.cream,
              padding: "10px 22px",
              borderRadius: 999,
              border: "none",
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
              boxShadow: "0 4px 14px rgba(74,31,61,0.18)",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = C.roseDark;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(74,31,61,0.24)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = C.plum;
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(74,31,61,0.18)";
            }}
          >
            {t.landing.nav.register}
          </button>
        </div>
      </header>

      {/* Hero — minimal wrapper */}
      <main
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "clamp(2rem, 6vh, 4rem) 1.5rem 2rem",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        {/* Tagline pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${C.border}`,
            color: C.roseDark,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "2.2rem",
            animation: "fadeUp 0.6s ease both",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.rose }} />
          {t.landing.hero.badge}
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Outfit', 'Heebo', sans-serif",
            fontSize: "clamp(2.6rem, 6.5vw, 4.6rem)",
            fontWeight: 500,
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: C.plum,
            margin: 0,
            marginBottom: "1.5rem",
            animation: "fadeUp 0.7s 0.08s ease both",
          }}
        >
          {t.landing.hero.headline1}{" "}
          <span
            style={{
              fontStyle: "italic",
              fontWeight: 400,
              background: `linear-gradient(120deg, ${C.rose}, ${C.roseDark})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t.landing.hero.headline2}
          </span>
        </h1>

        {/* Subline */}
        <p
          style={{
            color: C.muted,
            fontSize: "clamp(1rem, 1.4vw, 1.12rem)",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 2.8rem",
            fontWeight: 400,
            animation: "fadeUp 0.7s 0.16s ease both",
          }}
        >
          {t.landing.hero.subline}
        </p>

        {/* Single CTA */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            animation: "fadeUp 0.7s 0.24s ease both",
          }}
        >
          <button
            onClick={onLogin}
            style={{
              background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`,
              color: C.cream,
              padding: "15px 38px",
              borderRadius: 999,
              border: "none",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 28px rgba(184,97,122,0.32)",
              transition: "transform 0.22s, box-shadow 0.22s",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 36px rgba(184,97,122,0.42)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 8px 28px rgba(184,97,122,0.32)";
            }}
          >
            {t.landing.hero.primaryCta}
          </button>
        </div>
      </main>

      {/* ─── Features Section ─── */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1100,
          margin: "3rem auto 6rem",
          padding: "0 2rem",
          animation: "fadeUp 0.8s 0.3s ease both",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {FEATURES.map(({ Icon, title, desc }, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.45)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${C.border}`,
                borderRadius: 24,
                padding: "2.2rem 2rem",
                textAlign: isRTL ? "right" : "left",
                transition: "transform 0.3s, background 0.3s, box-shadow 0.3s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.75)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(184, 97, 122, 0.06)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.45)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(184, 97, 122, 0.08)",
                  color: C.roseDark,
                  marginBottom: "1.4rem",
                }}
              >
                <Icon />
              </div>
              <h3
                style={{
                  fontFamily: "'Outfit', 'Heebo', sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.plum,
                  margin: "0 0 0.6rem 0",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: C.muted,
                  margin: 0,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 2, textAlign: "center", paddingBottom: "5rem" }}>
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          {t.landing.footer.brand} · {t.landing.footer.tagline}
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}