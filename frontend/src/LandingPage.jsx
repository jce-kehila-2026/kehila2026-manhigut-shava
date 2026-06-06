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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  ),
  Send: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-8-8 18-2-8-8-2Z" />
    </svg>
  ),
  Feed: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9h10M7 13h10M7 17h6" />
    </svg>
  ),
  Mobile: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" />
    </svg>
  ),
  Chat: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z" />
    </svg>
  ),
  Shield: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>
    </svg>
  ),
  Heart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>
    </svg>
  ),
};

const FEATURE_ICONS = [Icons.Search, Icons.Send, Icons.Feed, Icons.Dashboard, Icons.Shield, Icons.Mobile];

/* ─── Language switcher ─── */
function LangSwitcher({ lang, setLang }) {
  const langs = [{ code: "he", label: "HE" }, { code: "en", label: "EN" }, { code: "ar", label: "AR" }];
  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(184,97,122,0.08)", borderRadius: 999 }}>
      {langs.map(({ code, label }) => (
        <button key={code} onClick={() => setLang(code)} style={{
          padding: "6px 12px", borderRadius: 999, border: "none",
          background: lang === code ? C.plum : "transparent",
          color: lang === code ? C.cream : C.muted,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
          cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
        }}>{label}</button>
      ))}
    </div>
  );
}

/* ─── Decorative bloom ─── */
function Bloom({ style }) {
  return <div aria-hidden style={{
    position: "absolute", borderRadius: "50%", filter: "blur(80px)",
    opacity: 0.35, pointerEvents: "none", ...style,
  }} />;
}

const scrollTo = (id) => (e) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ─── Landing ─── */
export default function LandingPage({ onLogin }) {
  const { t, isRTL, lang, setLang } = useLang();
  const L = t.landing;
  const P = L.previewSection;

  const NAV_LINKS = [
    { id: "features", label: L.nav.features },
    { id: "preview",  label: L.nav.preview },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${C.cream} 0%, #fbf3ef 100%)`,
      color: C.plum,
      fontFamily: "'Figtree','Heebo',system-ui,sans-serif",
      position: "relative", overflowX: "hidden", scrollBehavior: "smooth",
    }}>
      <Bloom style={{ width: 480, height: 480, top: -160, [isRTL ? "left" : "right"]: -120, background: C.blush }} />
      <Bloom style={{ width: 380, height: 380, top: 320, [isRTL ? "right" : "left"]: -100, background: "#f4d6d6" }} />
      <Bloom style={{ width: 520, height: 520, top: 900, [isRTL ? "left" : "right"]: -180, background: C.blush }} />

      {/* ─── Sticky header ─── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(253,248,246,0.78)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `linear-gradient(135deg, ${C.rose}, ${C.plum})`,
              color: C.cream, display: "grid", placeItems: "center",
              fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 18,
              boxShadow: "0 4px 14px rgba(74,31,61,0.18)",
            }}>B</div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
                {L.footer.brand}
              </div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.04em" }}>
                {L.footer.tagline}
              </div>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {NAV_LINKS.map(l => (
              <a key={l.id} href={`#${l.id}`} onClick={scrollTo(l.id)}
                style={{
                  padding: "8px 14px", borderRadius: 999,
                  color: C.muted, fontSize: 13, fontWeight: 500,
                  textDecoration: "none", transition: "all 0.2s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = C.plum; e.currentTarget.style.background = "rgba(184,97,122,0.08)"; }}
                onMouseOut={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "transparent"; }}
              >{l.label}</a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LangSwitcher lang={lang} setLang={setLang} />
            <button onClick={onLogin} style={{
              padding: "10px 20px", borderRadius: 999, border: "none",
              background: C.plum, color: C.cream, fontWeight: 600, fontSize: 13,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 4px 14px rgba(74,31,61,0.18)", fontFamily: "inherit",
            }}
              onMouseOver={(e) => { e.currentTarget.style.background = C.roseDark; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = C.plum; e.currentTarget.style.transform = ""; }}
            >{L.nav.register}</button>
          </div>
        </div>
      </header>

      {/* ─── Hero (intro — unchanged) ─── */}
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center", position: "relative" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 999,
          background: "rgba(184,97,122,0.1)", color: C.roseDark,
          fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.rose }} />
          {L.hero.badge}
        </div>

        <h1 style={{
          fontFamily: "'Outfit',sans-serif",
          fontSize: "clamp(40px, 6vw, 68px)", lineHeight: 1.05,
          fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 24px",
        }}>
          {L.hero.headline1}{" "}
          <span style={{
            background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", fontStyle: "italic",
          }}>{L.hero.headline2}</span>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.6, color: C.muted, maxWidth: 620, margin: "0 auto 36px" }}>
          {L.hero.subline}
        </p>

        <button onClick={onLogin} style={{
          padding: "16px 36px", borderRadius: 999, border: "none",
          background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`,
          color: C.cream, fontWeight: 600, fontSize: 15, letterSpacing: "0.02em",
          cursor: "pointer", transition: "all 0.25s",
          boxShadow: "0 8px 28px rgba(184,97,122,0.32)", fontFamily: "inherit",
        }}
          onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(184,97,122,0.42)"; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 28px rgba(184,97,122,0.32)"; }}
        >{L.hero.primaryCta}</button>
      </section>

      {/* ─── Features — CLEAN uniform grid ─── */}
      <section id="features" style={{ maxWidth: 1180, margin: "0 auto", padding: "60px 24px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", color: C.rose, textTransform: "uppercase", marginBottom: 12 }}>
            {L.featuresSection.label}
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            {L.featuresSection.title}
          </h2>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            {L.featuresSection.subtitle}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}>
          {L.features.map((f, idx) => {
            const Icon = FEATURE_ICONS[idx] ?? Icons.Feed;
            return (
              <article key={idx} style={{
                position: "relative",
                padding: 28,
                borderRadius: 20,
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${C.border}`,
                transition: "all 0.25s cubic-bezier(.2,.8,.2,1)",
                display: "flex", flexDirection: "column", gap: 14,
                minHeight: 200,
              }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.92)";
                  e.currentTarget.style.boxShadow = "0 16px 36px rgba(184,97,122,0.12)";
                  e.currentTarget.style.borderColor = "rgba(184,97,122,0.32)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.background = "rgba(255,255,255,0.72)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 13,
                  background: `linear-gradient(135deg, ${C.rose}, ${C.plum})`,
                  color: C.cream, display: "grid", placeItems: "center",
                  boxShadow: "0 6px 18px rgba(184,97,122,0.28)",
                }}>
                  <Icon />
                </div>
                <h3 style={{
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 18, fontWeight: 700, margin: 0,
                  letterSpacing: "-0.01em", color: C.plum,
                }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>
                  {f.desc}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ─── Preview section ─── */}
      <section id="preview" style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 24px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", color: C.rose, textTransform: "uppercase", marginBottom: 12 }}>
            {P.eyebrow}
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            {P.title} <span style={{ fontStyle: "italic", color: C.rose }}>{P.titleItalic}</span>
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 28, alignItems: "stretch",
        }}>
          {/* Community feed mock */}
          <div style={{
            padding: 24, borderRadius: 22,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${C.border}`,
            boxShadow: "0 8px 28px rgba(184,97,122,0.06)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 17, color: C.plum }}>
                {P.feedTitle}
              </div>
              <span style={{
                padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: "rgba(184,97,122,0.12)", color: C.roseDark, letterSpacing: "0.06em",
              }}>{P.live}</span>
            </div>

            {P.posts.map((p, i) => (
              <div key={i} style={{
                padding: 16, borderRadius: 14,
                background: "rgba(253,248,246,0.7)",
                border: `1px solid ${C.border}`,
                marginBottom: i === P.posts.length - 1 ? 0 : 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${i === 0 ? C.rose : C.roseDark}, ${C.plum})`,
                    color: C.cream, display: "grid", placeItems: "center",
                    fontWeight: 600, fontSize: 13, fontFamily: "'Outfit',sans-serif",
                  }}>{p.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.plum }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{p.role}</div>
                  </div>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.55, color: C.plum }}>{p.text}</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.rose, fontSize: 12, fontWeight: 600 }}>
                  <Icons.Heart /> 24
                </div>
              </div>
            ))}
          </div>

          {/* Support SEARCH mock — matches SupportPage UX */}
          <div style={{
            padding: 24, borderRadius: 22,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.rose}`,
            boxShadow: "0 8px 28px rgba(184,97,122,0.06)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 17, color: C.plum }}>
                {P.searchTitle}
              </div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                {P.searchSub}
              </div>
            </div>

            {/* Profession pills */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                {P.professionLabel}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {P.professions.map((prof, i) => (
                  <span key={prof} style={{
                    padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${i === 0 ? C.roseDark : C.border}`,
                    background: i === 0 ? "#faeef0" : "rgba(253,248,246,0.7)",
                    color: i === 0 ? C.roseDark : C.muted,
                  }}>{prof}</span>
                ))}
              </div>
            </div>

            {/* City + name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  {P.cityLabel}
                </div>
                <div style={{
                  padding: "10px 12px", fontSize: 13,
                  border: `1.5px solid ${C.border}`, borderRadius: 11,
                  background: "rgba(253,248,246,0.7)", color: C.muted,
                }}>{P.cityPlaceholder}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  {P.nameLabel}
                </div>
                <div style={{
                  padding: "10px 12px", fontSize: 13,
                  border: `1.5px solid ${C.border}`, borderRadius: 11,
                  background: "rgba(253,248,246,0.7)", color: C.muted,
                }}>{P.namePlaceholder}</div>
              </div>
            </div>

            <button style={{
              padding: "11px 20px", background: C.plum, color: C.cream,
              border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 16,
              alignSelf: "flex-start",
            }}>{P.searchBtn}</button>

            {/* Mock result card */}
            <div style={{
              padding: 14, borderRadius: 14,
              background: "rgba(253,248,246,0.7)",
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${C.rose}`,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.rose}, ${C.plum})`,
                  color: C.cream, display: "grid", placeItems: "center",
                  fontWeight: 700, fontSize: 14, fontFamily: "'Outfit',sans-serif",
                }}>{P.resultName[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.plum }}>{P.resultName}</div>
                  <div style={{ fontSize: 12.5, color: C.muted }}>{P.resultProfession}</div>
                </div>
                <span style={{
                  fontSize: 11, color: C.muted,
                  background: "rgba(255,255,255,0.7)", border: `1px solid ${C.border}`,
                  borderRadius: 999, padding: "2px 10px",
                }}>{P.resultCity}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{
                  flex: 1, padding: "8px 0",
                  background: "rgba(255,255,255,0.7)", color: C.plum,
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>{P.viewProfile}</button>
                <button style={{
                  flex: 1, padding: "8px 0",
                  background: "#faeef0", color: C.roseDark,
                  border: `1.5px solid rgba(184,97,122,0.3)`, borderRadius: 10,
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>{P.requestHelp}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, marginTop: 60 }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", padding: "40px 24px",
          textAlign: "center", color: C.muted, fontSize: 13,
        }}>
          {L.footer.brand} · {L.footer.tagline}
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
