import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
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

  .dash-card { animation: fadeSlideUp 0.38s ease both; }
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
  .logout-btn:hover { background: rgba(255,255,255,0.18) !important; }
  .lang-btn:hover   { background: rgba(255,255,255,0.2) !important; color: #fff !important; }
  .lang-btn-active  { background: rgba(255,255,255,0.25) !important; color: #fff !important; font-weight: 700 !important; }

  .quick-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.12) !important;
  }
  .member-preview-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.12) !important;
  }
  .welcome-card:hover { opacity: 0.95; }
`;
if (!document.head.querySelector("#dashboard-styles")) {
  styleTag.id = "dashboard-styles";
  document.head.appendChild(styleTag);
}

/* ─── Tag badge ─── */
function Tag({ label, color }) {
  const styles = {
    green: { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
    gray:  { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" },
    blue:  { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" },
  }[color] ?? { background: "#f1f5f9", color: "#64748b" };

  return (
    <span style={{
      fontSize: "11px", fontWeight: "700",
      padding: "3px 10px", borderRadius: "99px",
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
      display: "flex", alignItems: "center", gap: "2px",
      background: "rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "3px",
    }}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          className={`lang-btn ${lang === code ? "lang-btn-active" : ""}`}
          onClick={() => setLang(code)}
          style={{
            background: lang === code ? "rgba(255,255,255,0.25)" : "transparent",
            color: lang === code ? "#fff" : "rgba(255,255,255,0.6)",
            border: "none", borderRadius: "7px",
            padding: "5px 10px", fontSize: "12px",
            fontWeight: lang === code ? "700" : "400",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Mini member avatar ─── */
function MiniAvatar({ u, size = 44 }) {
  const initials =
    u.firstName && u.lastName
      ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase()
      : (u.email?.[0] ?? "?").toUpperCase();
  const base = {
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg,#1a3c5e,#0ea5e9)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.33, fontWeight: "700", flexShrink: 0, overflow: "hidden",
  };
  if (u.photoURL) {
    return (
      <div style={base}>
        <img src={u.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return <div style={base}>{initials}</div>;
}

/* ─── Base nav keys ─── */
const BASE_NAV_KEYS = ["Profile", "Home", "Community", "Support"];

/* ══════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user, logout, profile } = useAuth();
  const { t, isRTL } = useLang();

  /* Persist active tab */
  const [activeNav, setActiveNav] = useState(
    () => localStorage.getItem("activeNav") || "Home"
  );
  const navigate = (tab) => {
    localStorage.setItem("activeNav", tab);
    setActiveNav(tab);
  };

  /* Suggested members for homepage strip */
  const [suggestedMembers, setSuggestedMembers] = useState([]);
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users")).then((snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all
        .filter((m) => m.id !== user.uid && m.profession)
        .sort((a, b) => ((b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1))
        .slice(0, 4);
      setSuggestedMembers(filtered);
    });
  }, [user]);

  /* Admin tab */
  const NAV_KEYS = profile?.isAdmin ? [...BASE_NAV_KEYS, "Admin"] : BASE_NAV_KEYS;

  const NAV_LABELS = {
    Profile:   t.nav.profile,
    Home:      t.nav.home,
    Community: t.nav.community,
    Support:   t.nav.support,
    Admin:     "Admin",
  };

  /* Display helpers */
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email ?? "";

  const initials =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : (user?.email?.[0] ?? "?").toUpperCase();

  const photoURL = profile?.photoURL ?? null;

  /* Overview cards */
  const CARDS = [
    {
      tag:       t.dash.active,
      tagColor:  "green",
      title:     t.dash.communityUpdates,
      body:      t.dash.communityUpdatesBody,
      accent:    "#38bdf8",
      nav:       "Community",
    },
    {
      tag:       t.dash.active,
      tagColor:  "green",
      title:     t.dash.myProfile,
      body:      t.dash.myProfileBody,
      accent:    "#a78bfa",
      nav:       "Profile",
    },
  ];

  /* Quick action buttons */
  const QUICK_ACTIONS = [
    {
      label:  t.dash.goToCommunity,
      nav:    "Community",
      accent: "#38bdf8",
      bg:     "linear-gradient(135deg,#e0f9ff,#dbeafe)",
      color:  "#1e40af",
    },
    {
      label:  t.dash.goToSupport,
      nav:    "Support",
      accent: "#22c55e",
      bg:     "linear-gradient(135deg,#f0fdf4,#dcfce7)",
      color:  "#166534",
    },
    {
      label:  t.dash.goToProfile,
      nav:    "Profile",
      accent: "#a78bfa",
      bg:     "linear-gradient(135deg,#faf5ff,#ede9fe)",
      color:  "#7c3aed",
    },
  ];

  /* ══ Styles ══ */
  const S = {
    page: {
      minHeight: "100vh", background: "#f5f7fa",
      display: "flex", flexDirection: "column",
      direction: isRTL ? "rtl" : "ltr",
    },
    header: {
      background: "linear-gradient(135deg, #1a3c5e 0%, #0ea5e9 55%, #7dd3fc 100%)",
      backgroundSize: "300% 300%",
      animation: "bannerFlow 9s ease infinite",
      color: "#fff", padding: "0 2.5rem", height: "58px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 20,
      boxShadow: "0 2px 16px rgba(15,23,42,0.14)",
    },
    headerLeft:  { display: "flex", alignItems: "center", gap: "1.5rem" },
    logo:        { fontSize: "16px", fontWeight: "700", letterSpacing: "-0.3px", color: "#fff", whiteSpace: "nowrap" },
    headerNav:   { display: "flex", gap: "2px" },
    headerRight: { display: "flex", alignItems: "center", gap: "10px" },
    navBtn: (active) => ({
      background: active ? "rgba(255,255,255,0.18)" : "transparent",
      color:      active ? "#fff" : "rgba(255,255,255,0.62)",
      border: "none", borderRadius: "9px", padding: "7px 13px",
      fontSize: "13px", fontWeight: active ? "700" : "400",
      cursor: "pointer", transition: "all 0.15s",
    }),
    logoutBtn: {
      background: "rgba(255,255,255,0.12)", color: "#fff",
      border: "1px solid rgba(255,255,255,0.28)", borderRadius: "9px",
      padding: "7px 16px", fontSize: "13px", fontWeight: "600",
      cursor: "pointer", transition: "background 0.2s",
    },
    main:      { flex: 1, width: "100%" },
    homeInner: { padding: "2rem 2.5rem", width: "100%", boxSizing: "border-box" },

    /* Welcome card */
    welcomeCard: {
      background: "linear-gradient(135deg, #1a3c5e 0%, #0f4c81 100%)",
      borderRadius: "20px", padding: "1.75rem 2rem", marginBottom: "1.5rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      color: "#fff", cursor: "pointer", transition: "opacity 0.2s",
      boxShadow: "0 4px 20px rgba(15,23,42,0.15)",
    },
    welcomeLeft:  { display: "flex", alignItems: "center", gap: "1.25rem" },
    avatarRing: {
      width: "52px", height: "52px", borderRadius: "50%",
      background: "linear-gradient(135deg, #38bdf8, #1a3c5e)",
      padding: "2.5px", boxShadow: "0 2px 8px rgba(15,23,42,0.1)", flexShrink: 0,
    },
    avatarInner: {
      width: "100%", height: "100%", borderRadius: "50%",
      background: "rgba(255,255,255,0.18)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "18px", fontWeight: "700", color: "#fff", overflow: "hidden",
    },
    welcomeName:  { fontSize: "18px", fontWeight: "700", margin: "0 0 3px" },
    welcomeSub:   { fontSize: "12px", color: "rgba(255,255,255,0.62)", margin: 0 },
    welcomeBadge: {
      background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)",
      borderRadius: "99px", padding: "5px 16px", fontSize: "11px",
      fontWeight: "700", color: "rgba(255,255,255,0.9)",
      letterSpacing: "0.06em", textTransform: "uppercase",
    },

    /* Section label */
    sectionLabel: {
      fontSize: "11px", fontWeight: "700", color: "#94a3b8",
      letterSpacing: "0.1em", textTransform: "uppercase",
      margin: "0 0 1rem",
    },
    sectionHeader: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: "1rem",
    },
    viewAllBtn: {
      fontSize: "12px", fontWeight: "700", color: "#0ea5e9",
      background: "none", border: "none", cursor: "pointer", padding: 0,
    },

    /* Quick actions */
    quickRow:   { display: "flex", gap: "1rem", marginBottom: "2rem" },
    quickCard: {
      flex: 1, borderRadius: "16px", padding: "1.25rem",
      display: "flex", flexDirection: "column", gap: "6px",
      border: "1.5px solid transparent", cursor: "pointer",
      transition: "transform 0.18s, box-shadow 0.18s",
      boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
    },
    quickLabel: { fontSize: "14px", fontWeight: "700", margin: 0 },
    quickArrow: { fontSize: "18px", fontWeight: "300", marginTop: "auto" },

    /* Support preview strip */
    memberScroll: {
      display: "flex", gap: "1rem",
      overflowX: "auto", paddingBottom: "8px",
      scrollbarWidth: "none", marginBottom: "2rem",
    },
    memberCard: {
      background: "#fff", borderRadius: "16px", padding: "1.25rem",
      minWidth: "160px", maxWidth: "180px",
      border: "1.5px solid #f1f5f9", borderTop: "3px solid #38bdf8",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "0.5rem", cursor: "pointer",
      transition: "transform 0.18s, box-shadow 0.18s", flexShrink: 0,
    },
    memberName: { fontSize: "13px", fontWeight: "700", color: "#1a3c5e", margin: 0, textAlign: "center" },
    memberProf: { fontSize: "11px", color: "#64748b", margin: 0, textAlign: "center" },
    memberCity: {
      fontSize: "11px", color: "#94a3b8",
      background: "#f8fafc", border: "1px solid #e2e8f0",
      borderRadius: "99px", padding: "2px 8px",
    },

    /* Overview grid */
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "1.25rem", marginBottom: "2rem",
    },
    card: {
      background: "#fff", borderRadius: "18px", padding: "1.5rem",
      border: "1.5px solid #f1f5f9", borderLeft: "4px solid #e2e8f0",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)", cursor: "pointer",
      transition: "transform 0.18s, box-shadow 0.18s",
      display: "flex", flexDirection: "column", gap: "0.6rem",
    },
    cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" },
    cardTitle:  { fontSize: "15px", fontWeight: "700", color: "#1a3c5e", margin: 0 },
    cardBody:   { fontSize: "13px", color: "#64748b", lineHeight: "1.65", margin: 0, flex: 1 },
    cardLink:   { fontSize: "12px", fontWeight: "700", color: "#0ea5e9", marginTop: "auto" },
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

            {/* ── Welcome card ── */}
            <div
              className="welcome-card"
              style={S.welcomeCard}
              onClick={() => navigate("Profile")}
            >
              <div style={S.welcomeLeft}>
                <div style={S.avatarRing}>
                  <div style={S.avatarInner}>
                    {photoURL
                      ? <img src={photoURL} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} alt="avatar" />
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

            {/* ── Quick Actions ── */}
            <p style={S.sectionLabel}>{t.dash.quickActions}</p>
            <div style={S.quickRow}>
              {QUICK_ACTIONS.map((qa) => (
                <div
                  key={qa.nav}
                  className="quick-action"
                  style={{ ...S.quickCard, background: qa.bg, borderColor: "transparent" }}
                  onClick={() => navigate(qa.nav)}
                >
                  <p style={{ ...S.quickLabel, color: qa.color }}>{qa.label}</p>
                  <p style={{ ...S.quickArrow, color: qa.color }}>→</p>
                </div>
              ))}
            </div>

            {/* ── Support preview strip ── */}
            {suggestedMembers.length > 0 && (
              <div style={{ marginBottom: "2rem" }}>
                <div style={S.sectionHeader}>
                  <p style={{ ...S.sectionLabel, margin: 0 }}>{t.dash.suggestedMembers}</p>
                  <button
                    style={S.viewAllBtn}
                    onClick={() => navigate("Support")}
                  >
                    {t.dash.viewAll} →
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 1rem" }}>
                  {t.dash.suggestedMembersSub}
                </p>
                <div style={S.memberScroll}>
                  {suggestedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="member-preview-card"
                      style={S.memberCard}
                      onClick={() => navigate("Support")}
                    >
                      <MiniAvatar u={m} size={48} />
                      <p style={S.memberName}>
                        {m.firstName && m.lastName
                          ? `${m.firstName} ${m.lastName}`
                          : m.email}
                      </p>
                      <p style={S.memberProf}>{m.profession}</p>
                      {m.city && <span style={S.memberCity}>{m.city}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Overview cards ── */}
            <p style={S.sectionLabel}>{t.dash.overview}</p>
            <div style={S.grid}>
              {CARDS.map((card) => (
                <div
                  key={card.title}
                  className="dash-card"
                  style={{ ...S.card, borderLeftColor: card.accent }}
                  onClick={() => navigate(card.nav)}
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
