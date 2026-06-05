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
        ...style,
      }}
    />
  );
}

/* ─── Landing ─── */
export default function LandingPage({ onLogin }) {
  const { t, isRTL, lang, setLang } = useLang();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        color: C.plum,
        fontFamily: "'Figtree', 'Heebo', system-ui, sans-serif",
        direction: isRTL ? "rtl" : "ltr",
        position: "relative",
        overflow: "hidden",
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

      {/* Hero — centered, minimal */}
      <main
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "clamp(3rem, 10vh, 7rem) 1.5rem 5rem",
          maxWidth: 760,
          margin: "0 auto",
          minHeight: "calc(100vh - 110px)",
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

        {/* Quiet meta line */}
        <div
          style={{
            marginTop: "4rem",
            fontSize: 12,
            color: C.muted,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.7,
            animation: "fadeUp 0.7s 0.32s ease both",
          }}
        >
          {t.landing.footer.brand} · {t.landing.footer.tagline}
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
