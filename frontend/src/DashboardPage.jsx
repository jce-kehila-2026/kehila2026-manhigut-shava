import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import SupportPage from "./SupportPage";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6fa",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#1a3c5e",
    color: "#ffffff",
    padding: "1rem 2.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  logo: {
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  headerNav: {
    display: "flex",
    gap: "0.25rem",
  },
  navBtn: (active) => ({
    background: active ? "rgba(255,255,255,0.15)" : "transparent",
    color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
    border: "none",
    borderRadius: "8px",
    padding: "7px 14px",
    fontSize: "13px",
    fontWeight: active ? "600" : "400",
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  logoutBtn: {
    background: "rgba(255,255,255,0.1)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "8px",
    padding: "7px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  main: {
    flex: 1,
    padding: "2rem 2.5rem",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  welcomeCard: {
    background: "#1a3c5e",
    borderRadius: "16px",
    padding: "2rem 2.5rem",
    marginBottom: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#ffffff",
  },
  welcomeLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700",
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.3)",
  },
  welcomeTitle: {
    fontSize: "20px",
    fontWeight: "700",
    margin: "0 0 4px",
    color: "#ffffff",
  },
  welcomeSub: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
    margin: 0,
  },
  welcomeBadge: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "20px",
    padding: "6px 16px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "1.5rem",
    border: "1px solid #e8ecf0",
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },
  cardBadge: (color) => ({
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "20px",
    background: color === "green" ? "#dcfce7" : color === "blue" ? "#dbeafe" : "#f1f5f9",
    color: color === "green" ? "#166534" : color === "blue" ? "#1e40af" : "#64748b",
  }),
  cardTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  cardBody: {
    fontSize: "13px",
    color: "#6b7a8d",
    lineHeight: "1.65",
    margin: 0,
    flex: 1,
  },
  cardLink: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "auto",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "1.25rem 1.5rem",
    border: "1px solid #e8ecf0",
    textAlign: "center",
  },
  statNum: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a3c5e",
    display: "block",
  },
  statLabel: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
};

const CARDS = [
  {
    icon: "🗳️",
    iconBg: "#eff6ff",
    title: "Elections 2026",
    body: "Stay updated on the upcoming Kehila leadership elections. Candidate lists and voting information will appear here.",
    badge: "Coming Soon",
    badgeColor: "gray",
    link: "View details",
  },
  {
    icon: "📋",
    iconBg: "#f0fdf4",
    title: "Community Updates",
    body: "News, announcements, and initiatives from Manhigut Shava will be posted here for registered members.",
    badge: "Active",
    badgeColor: "green",
    link: "Read updates",
  },
  {
    icon: "👥",
    iconBg: "#eff6ff",
    title: "Member Directory",
    body: "Connect with other registered community members. Directory access is available to all signed-up participants.",
    badge: "Coming Soon",
    badgeColor: "gray",
    link: "Browse members",
  },
  {
    icon: "📅",
    iconBg: "#fefce8",
    title: "Events",
    body: "View upcoming community events, RSVP, and get notified about activities happening near you.",
    badge: "Coming Soon",
    badgeColor: "gray",
    link: "See events",
  },
  {
    icon: "🔔",
    iconBg: "#fff7ed",
    title: "Notifications",
    body: "Stay informed with real-time alerts for event reminders, connection requests, and community announcements.",
    badge: "Coming Soon",
    badgeColor: "gray",
    link: "View all",
  },
  {
    icon: "👤",
    iconBg: "#fdf4ff",
    title: "My Profile",
    body: "Manage your personal information, privacy settings, and how your profile appears to other members.",
    badge: "Active",
    badgeColor: "green",
    link: "Edit profile",
  },
];

const NAV_ITEMS = ["Profile", "Home", "Community", "Events", "Updates","Support"];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeNav, setActiveNav] = useState("Home");

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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>Manhigut Shava</span>
          <nav style={styles.headerNav}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                style={styles.navBtn(activeNav === item)}
                onClick={() => setActiveNav(item)}
                onMouseOver={(e) => {
                  if (activeNav !== item) e.target.style.color = "#ffffff";
                }}
                onMouseOut={(e) => {
                  if (activeNav !== item) e.target.style.color = "rgba(255,255,255,0.65)";
                }}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <button
          style={styles.logoutBtn}
          onClick={logout}
          onMouseOver={(e) => (e.target.style.background = "rgba(255,255,255,0.2)")}
          onMouseOut={(e) => (e.target.style.background = "rgba(255,255,255,0.1)")}
        >
          Log Out
        </button>
      </header>

      <main style={styles.main}>
      <div
        style={{ ...styles.welcomeCard, cursor: "pointer" }}
        onClick={() => setActiveNav("Profile")}
        onMouseOver={(e) => (e.currentTarget.style.opacity = "0.92")}
        onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
      >         
      <div style={styles.welcomeLeft}>
            <div style={styles.avatar}>{initials}</div>
            <div>
              <p style={styles.welcomeTitle}>Welcome back, {displayName}</p>
              <p style={styles.welcomeSub}>Kehila 2026 — Manhigut Shava</p>
            </div>
          </div>
          <span style={styles.welcomeBadge}>Member</span>
        </div>

        <div style={styles.statsRow}>
          {[
            { num: "—", label: "Members" },
            { num: "—", label: "Events" },
            { num: "—", label: "Updates" },
            { num: "—", label: "Connections" },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <span style={styles.statNum}>{s.num}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <p style={styles.sectionTitle}>Features</p>
        {activeNav === "Support" && <SupportPage />}

      </main>
    </div>
  );
}