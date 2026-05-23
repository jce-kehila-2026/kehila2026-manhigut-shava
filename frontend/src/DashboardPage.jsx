import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import SupportPage from "./SupportPage";
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
  .dash-card:nth-child(3) { animation-delay: 0.12s; }
  .dash-card:nth-child(4) { animation-delay: 0.16s; }
  .dash-card:nth-child(5) { animation-delay: 0.20s; }
  .dash-card:nth-child(6) { animation-delay: 0.24s; }

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
  .welcome-card:hover {
    opacity: 0.94;
  }
`;
if (!document.head.querySelector("#dashboard-styles")) {
  styleTag.id = "dashboard-styles";
  document.head.appendChild(styleTag);
}

/* ─── Nav items ─── */
const NAV_ITEMS = ["Profile", "Home", "Community", "Support"];
const ADMIN_ITEMS = [...NAV_ITEMS, "Admin"];

/* ─── Dashboard cards ─── */
const CARDS = [
  {
    tag: "Active",
    tagColor: "green",
    title: "Community Updates",
    body: "News, announcements, and initiatives from Manhigut Shava posted here for registered members.",
    accent: "#38bdf8",
  },
  {
    tag: "Active",
    tagColor: "green",
    title: "My Profile",
    body: "Manage your personal information, privacy settings, and how your profile appears to other members.",
    accent: "#a78bfa",
  },
];

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

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [activeNav, setActiveNav] = useState("Home");

  const navItems = profile?.isAdmin ? ADMIN_ITEMS : NAV_ITEMS;

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user?.email ?? "";

  const initials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  const S = {
    page: {
      minHeight:"100vh",
      background:"#f5f7fa",
      display:"flex",
      flexDirection:"column",
    },
    /* ── Header ── */
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
    headerLeft: {
      display:"flex", alignItems:"center", gap:"2rem",
    },
    logo: {
      fontSize:"16px", fontWeight:"700", letterSpacing:"-0.3px",
      color:"#fff", whiteSpace:"nowrap",
    },
    headerNav: {
      display:"flex", gap:"2px",
    },
    navBtn: (active) => ({
      background: active ? "rgba(255,255,255,0.18)" : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.62)",
      border:"none",
      borderRadius:"9px",
      padding:"7px 13px",
      fontSize:"13px",
      fontWeight: active ? "700" : "400",
      cursor:"pointer",
      transition:"all 0.15s",
    }),
    logoutBtn: {
      background:"rgba(255,255,255,0.12)",
      color:"#fff",
      border:"1px solid rgba(255,255,255,0.28)",
      borderRadius:"9px",
      padding:"7px 16px",
      fontSize:"13px",
      fontWeight:"600",
      cursor:"pointer",
      transition:"background 0.2s",
    },
    /* ── Main ── */
    main: {
      flex:1,
      width:"100%",
    },
    homeInner: {
      padding:"2rem 2.5rem",
      width:"100%",
      boxSizing:"border-box",
    },
    /* ── Welcome card ── */
    welcomeCard: {
      background:"#1a3c5e",
      borderRadius:"20px",
      padding:"1.75rem 2rem",
      marginBottom:"2rem",
      display:"flex",
      alignItems:"center",
      justifyContent:"space-between",
      color:"#fff",
      cursor:"pointer",
      transition:"opacity 0.2s",
      boxShadow:"0 2px 8px rgba(15,23,42,0.08)",
    },
    welcomeLeft: {
      display:"flex", alignItems:"center", gap:"1.25rem",
    },
    avatarRing: {
      width:"52px", height:"52px", borderRadius:"50%",
      background:"linear-gradient(135deg, #38bdf8, #1a3c5e)",
      padding:"2.5px",
      boxShadow:"0 2px 8px rgba(15,23,42,0.1)",
    },
    avatarInner: {
      width:"100%", height:"100%", borderRadius:"50%",
      background:"rgba(255,255,255,0.18)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"18px", fontWeight:"700", color:"#fff",
    },
    welcomeName: {
      fontSize:"18px", fontWeight:"700", margin:"0 0 3px",
    },
    welcomeSub: {
      fontSize:"12px", color:"rgba(255,255,255,0.62)", margin:0,
    },
    welcomeBadge: {
      background:"rgba(255,255,255,0.14)",
      border:"1px solid rgba(255,255,255,0.25)",
      borderRadius:"99px",
      padding:"5px 16px",
      fontSize:"11px",
      fontWeight:"700",
      color:"rgba(255,255,255,0.9)",
      letterSpacing:"0.06em",
      textTransform:"uppercase",
    },
    /* ── Section label ── */
    sectionLabel: {
      fontSize:"11px", fontWeight:"700",
      color:"#94a3b8", letterSpacing:"0.1em",
      textTransform:"uppercase", marginBottom:"1rem",
    },
    /* ── Grid ── */
    grid: {
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",
      gap:"1.25rem",
      marginBottom:"2rem",
    },
    card: {
      background:"#fff",
      borderRadius:"18px",
      padding:"1.5rem",
      border:"1.5px solid #f1f5f9",
      borderLeft:"4px solid #e2e8f0",
      boxShadow:"0 2px 8px rgba(15,23,42,0.05)",
      cursor:"pointer",
      transition:"transform 0.18s, box-shadow 0.18s",
      display:"flex",
      flexDirection:"column",
      gap:"0.6rem",
    },
    cardHeader: {
      display:"flex",
      alignItems:"center",
      justifyContent:"space-between",
      marginBottom:"2px",
    },
    cardTitle: {
      fontSize:"15px", fontWeight:"700", color:"#1a3c5e", margin:0,
    },
    cardBody: {
      fontSize:"13px", color:"#64748b", lineHeight:"1.65", margin:0, flex:1,
    },
    cardLink: {
      fontSize:"12px", fontWeight:"700",
      color:"#0ea5e9", marginTop:"auto",
    },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.logo}>Manhigut Shava</span>
          <nav style={S.headerNav}>
            {navItems.map((item) => (
              <button
                key={item}
                className="nav-btn"
                style={S.navBtn(activeNav === item)}
                onClick={() => setActiveNav(item)}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <button
          className="logout-btn"
          style={S.logoutBtn}
          onClick={logout}
        >
          Log Out
        </button>
      </header>

      <main style={S.main}>
        {/* Sub-pages render full-width, no wrapper */}
        {activeNav === "Support"   && <SupportPage />}
        {activeNav === "Community" && <CommunityPage />}
        {activeNav === "Profile"   && <ProfilePage />}
        {activeNav === "Admin"     && <AdminPage />}

        {/* Home content gets its own padded container */}
        {activeNav === "Home" && (
          <div style={S.homeInner}>
            {/* Welcome card */}
            <div
              className="welcome-card"
              style={S.welcomeCard}
              onClick={() => setActiveNav("Profile")}
            >
              <div style={S.welcomeLeft}>
                <div style={S.avatarRing}>
                  <div style={S.avatarInner}>{initials}</div>
                </div>
                <div>
                  <p style={S.welcomeName}>Welcome back, {displayName}</p>
                  <p style={S.welcomeSub}>Kehila 2026 — Manhigut Shava</p>
                </div>
              </div>
              <span style={S.welcomeBadge}>Member</span>
            </div>

            <p style={S.sectionLabel}>Overview</p>
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
                  <span style={S.cardLink}>View details →</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}