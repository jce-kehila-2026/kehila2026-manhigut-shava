import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import SupportPage from "./Supportpage";
import CommunityPage from "./CommunityPage";
import ProfilePage from "./ProfilePage.jsx";
import AdminPage from "./AdminPage.jsx";

/* ─── Inject shared styles ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
  * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bannerFlow {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .dash-card {
    animation: fadeSlideUp 0.38s ease both;
  }
  .dash-card:nth-child(1) { animation-delay: 0.04s; }
  .dash-card:nth-child(2) { animation-delay: 0.08s; }
  .dash-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(15,23,42,0.1) !important;
  }
  .nav-btn:hover {
    color: #ffffff !important;
    background: rgba(255,255,255,0.12) !important;
  }
  .logout-btn:hover {
    background: rgba(255,255,255,0.18) !important;
  }
  .lang-btn:hover {
    background: rgba(255,255,255,0.2) !important;
    color: #fff !important;
  }
  .lang-btn-active {
    background: rgba(255,255,255,0.25) !important;
    color: #fff !important;
    font-weight: 700 !important;
  }
`;
if (!document.head.querySelector("#dashboard-styles")) {
  styleTag.id = "dashboard-styles";
  document.head.appendChild(styleTag);
}

/* ─── Tag badge ─── */
function Tag({ label, color }) {
  const styles = {
    green: { background:"#dcfce7", color:"#166534", border:"1px solid #bbf7d0" },
    gray:  { background:"#f1f5f9", color:"#64748b", border:"1px solid #e2e8f0" },
    blue:  { background:"#dbeafe", color:"#1e40af", border:"1px solid #bfdbfe" },
  }[color] ?? { background:"#f1f5f9", color:"#64748b" };

  return (
    <span style={{
      fontSize:"11px", fontWeight:"700",
      padding:"3px 10px", borderRadius:"99px",
      ...styles,
    }}>
      {label}
    </span>
  );
}

/* ─── Language switcher ─── */
function LangSwitcher() {
  const { lang, setLang } = useLang();
  const LANGS = [
    { code: "he", label: "עב" },
    { code: "en", label: "EN" },
    { code: "ar", label: "عر" },
  ];
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"2px",
      background:"rgba(255,255,255,0.1)",
      borderRadius:"10px", padding:"3px",
    }}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          className={`lang-btn ${lang === code ? "lang-btn-active" : ""}`}
          onClick={() => setLang(code)}
          style={{
            background: lang === code ? "rgba(255,255,255,0.25)" : "transparent",
            color: lang === code ? "#fff" : "rgba(255,255,255,0.6)",
            border: "none",
            borderRadius: "7px",
            padding: "5px 10px",
            fontSize: "12px",
            fontWeight: lang === code ? "700" : "400",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Base nav keys (non-admin) ─── */
const BASE_NAV_KEYS = ["Profile", "Home", "Community", "Support"];

export default function DashboardPage() {
  /* ── Profile from AuthContext — no extra fetch needed ── */
  const { user, logout, profile } = useAuth();
  const { t, isRTL } = useLang();

  /* ── Persist active tab across refreshes (from main) ── */
  const [activeNav, setActiveNav] = useState(
    () => localStorage.getItem("activeNav") || "Home"
  );

  const navigate = (tab) => {
    localStorage.setItem("activeNav", tab);
    setActiveNav(tab);
  };

  /* ── Admin users get an extra "Admin" tab (from main) ── */
  const NAV_KEYS = profile?.isAdmin ? [...BASE_NAV_KEYS, "Admin"] : BASE_NAV_KEYS;

  const NAV_LABELS = {
    Profile:   t.nav.profile,
    Home:      t.nav.home,
    Community: t.nav.community,
    Support:   t.nav.support,
    Admin:     "Admin",
  };

  /* ── Display helpers ── */
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email ?? "";

  const initials =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : (user?.email?.[0] ?? "?").toUpperCase();

  const photoURL = profile?.photoURL ?? null;

  const CARDS = [
    {
      tag: t.dash.active,
      tagColor: "green",
      title: t.dash.communityUpdates,
      body: t.dash.communityUpdatesBody,
      accent: "#38bdf8",
    },
    {
      tag: t.dash.active,
      tagColor: "green",
      title: t.dash.myProfile,
      body: t.dash.myProfileBody,
      accent: "#a78bfa",
    },
  ];

  const S = {
    page: {
      minHeight:"100vh",
      background:"#f5f7fa",
      display:"flex",
      flexDirection:"column",
      direction: isRTL ? "rtl" : "ltr",
    },
    header: {
      background:"linear-gradient(135deg, #1a3c5e 0%, #0ea5e9 55%, #7dd3fc 100%)",
      backgroundSize:"300% 300%",
      animation:"bannerFlow 9s ease infinite",
      color:"#fff",
      padding:"0 2.5rem",
      height:"58px",
      display:"flex",
      alignItems:"center",
      justifyContent:"space-between",
      position:"sticky",
      top:0,
      zIndex:20,
      boxShadow:"0 2px 16px rgba(15,23,42,0.14)",
    },
    headerLeft:  { display:"flex", alignItems:"center", gap:"1.5rem" },
    logo:        { fontSize:"16px", fontWeight:"700", letterSpacing:"-0.3px", color:"#fff", whiteSpace:"nowrap" },
    headerNav:   { display:"flex", gap:"2px" },
    headerRight: { display:"flex", alignItems:"center", gap:"10px" },
    navBtn: (active) => ({
      background: active ? "rgba(255,255,255,0.18)" : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.62)",
      border:"none", borderRadius:"9px", padding:"7px 13px",
      fontSize:"13px", fontWeight: active ? "700" : "400",
      cursor:"pointer", transition:"all 0.15s",
    }),
    logoutBtn: {
      background:"rgba(255,255,255,0.12)", color:"#fff",
      border:"1px solid rgba(255,255,255,0.28)", borderRadius:"9px",
      padding:"7px 16px", fontSize:"13px", fontWeight:"600",
      cursor:"pointer", transition:"background 0.2s",
    },
    main:      { flex:1, width:"100%" },
    homeInner: { padding:"2rem 2.5rem", width:"100%", boxSizing:"border-box" },
    welcomeCard: {
      background:"#1a3c5e", borderRadius:"20px",
      padding:"1.75rem 2rem", marginBottom:"2rem",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      color:"#fff", cursor:"pointer", transition:"opacity 0.2s",
      boxShadow:"0 2px 8px rgba(15,23,42,0.08)",
    },
    welcomeLeft: { display:"flex", alignItems:"center", gap:"1.25rem" },
    avatarRing: {
      width:"52px", height:"52px", borderRadius:"50%",
      background:"linear-gradient(135deg, #38bdf8, #1a3c5e)",
      padding:"2.5px", boxShadow:"0 2px 8px rgba(15,23,42,0.1)", flexShrink:0,
    },
    avatarInner: {
      width:"100%", height:"100%", borderRadius:"50%",
      background:"rgba(255,255,255,0.18)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"18px", fontWeight:"700", color:"#fff", overflow:"hidden",
    },
    welcomeName:  { fontSize:"18px", fontWeight:"700", margin:"0 0 3px" },
    welcomeSub:   { fontSize:"12px", color:"rgba(255,255,255,0.62)", margin:0 },
    welcomeBadge: {
      background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.25)",
      borderRadius:"99px", padding:"5px 16px", fontSize:"11px",
      fontWeight:"700", color:"rgba(255,255,255,0.9)",
      letterSpacing:"0.06em", textTransform:"uppercase",
    },
    sectionLabel: {
      fontSize:"11px", fontWeight:"700", color:"#94a3b8",
      letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"1rem",
    },
    grid: {
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",
      gap:"1.25rem", marginBottom:"2rem",
    },
    card: {
      background:"#fff", borderRadius:"18px", padding:"1.5rem",
      border:"1.5px solid #f1f5f9", borderLeft:"4px solid #e2e8f0",
      boxShadow:"0 2px 8px rgba(15,23,42,0.05)", cursor:"pointer",
      transition:"transform 0.18s, box-shadow 0.18s",
      display:"flex", flexDirection:"column", gap:"0.6rem",
    },
    cardHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"2px" },
    cardTitle:  { fontSize:"15px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    cardBody:   { fontSize:"13px", color:"#64748b", lineHeight:"1.65", margin:0, flex:1 },
    cardLink:   { fontSize:"12px", fontWeight:"700", color:"#0ea5e9", marginTop:"auto" },
  };

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.logo}>Manhigut Shava</span>
          <nav style={S.headerNav}>
            {NAV_KEYS.map((key) => (
              <button
                key={key}
                className="nav-btn"
                style={S.navBtn(activeNav === key)}
                onClick={() => navigate(key)}
              >
                {NAV_LABELS[key]}
              </button>
            ))}
          </nav>
        </div>
        <div style={S.headerRight}>
          <LangSwitcher />
          <button className="logout-btn" style={S.logoutBtn} onClick={logout}>
            {t.nav.logout}
          </button>
        </div>
      </header>

      <main style={S.main}>
        {activeNav === "Support"   && <SupportPage />}
        {activeNav === "Community" && <CommunityPage />}
        {activeNav === "Profile"   && <ProfilePage />}
        {activeNav === "Admin"     && <AdminPage />}

        {activeNav === "Home" && (
          <div style={S.homeInner}>
            {/* Welcome card */}
            <div
              className="welcome-card"
              style={S.welcomeCard}
              onClick={() => navigate("Profile")}
            >
              <div style={S.welcomeLeft}>
                <div style={S.avatarRing}>
                  <div style={S.avatarInner}>
                    {photoURL
                      ? <img src={photoURL} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} alt="avatar" />
                      : initials}
                  </div>
                </div>
                <div>
                  <p style={S.welcomeName}>{t.dash.welcomeBack} {displayName}</p>
                  <p style={S.welcomeSub}>{t.dash.org}</p>
                </div>
              </div>
              <span style={S.welcomeBadge}>{t.dash.member}</span>
            </div>

            <p style={S.sectionLabel}>{t.dash.overview}</p>
            <div style={S.grid}>
              {CARDS.map((card) => (
                <div
                  key={card.title}
                  className="dash-card"
                  style={{ ...S.card, borderLeftColor: card.accent }}
                >
                  <div style={S.cardHeader}>
                    <p style={S.cardTitle}>{card.title}</p>
                    <Tag label={card.tag} color={card.tagColor} />
                  </div>
                  <p style={S.cardBody}>{card.body}</p>
                  <span style={S.cardLink}>{t.dash.viewDetails}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
