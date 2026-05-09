import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0f4f8",
    fontFamily: "'Georgia', serif",
  },
  header: {
    background: "#1a3c5e",
    color: "#ffffff",
    padding: "1rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  logo: {
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  logoutBtn: {
    background: "rgba(255,255,255,0.15)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  body: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "2.5rem 1.5rem",
  },
  welcomeCard: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
    padding: "2rem 2.5rem",
    marginBottom: "1.75rem",
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#1a3c5e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "700",
    flexShrink: 0,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: "0 0 4px",
  },
  welcomeSub: {
    fontSize: "14px",
    color: "#6b7a8d",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    background: "#ffffff",
    borderRadius: "14px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    padding: "1.75rem",
  },
  cardIcon: {
    fontSize: "28px",
    marginBottom: "0.75rem",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: "0 0 8px",
  },
  cardBody: {
    fontSize: "13px",
    color: "#6b7a8d",
    lineHeight: "1.7",
    margin: 0,
  },
  badge: {
    display: "inline-block",
    background: "#e8f0fe",
    color: "#1a3c5e",
    borderRadius: "20px",
    padding: "3px 12px",
    fontSize: "12px",
    fontWeight: "600",
    marginTop: "0.75rem",
  },
};

const CARDS = [
  {
    icon: "🗳️",
    title: "Elections 2026",
    body: "Stay updated on the upcoming Kehila leadership elections. Candidate lists and voting information will appear here.",
    badge: "Coming Soon",
  },
  {
    icon: "📋",
    title: "Community Updates",
    body: "News, announcements, and initiatives from Manhigut Shava will be posted here for registered members.",
    badge: "Active",
  },
  {
    icon: "👥",
    title: "Member Directory",
    body: "Connect with other registered community members. Directory access is available to all signed-up participants.",
    badge: "Coming Soon",
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);

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
        <span style={styles.logo}>Manhigut Shava</span>
        <button
          style={styles.logoutBtn}
          onClick={logout}
          onMouseOver={(e) => (e.target.style.background = "rgba(255,255,255,0.25)")}
          onMouseOut={(e) => (e.target.style.background = "rgba(255,255,255,0.15)")}
        >
          Log Out
        </button>
      </header>

      <div style={styles.body}>
        <div style={styles.welcomeCard}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.welcomeText}>
            <p style={styles.welcomeTitle}>Welcome, {displayName}</p>
            <p style={styles.welcomeSub}>
              You're signed in to Kehila 2026 — Manhigut Shava
            </p>
          </div>
        </div>

        <div style={styles.grid}>
          {CARDS.map((c) => (
            <div key={c.title} style={styles.card}>
              <div style={styles.cardIcon}>{c.icon}</div>
              <p style={styles.cardTitle}>{c.title}</p>
              <p style={styles.cardBody}>{c.body}</p>
              <span style={styles.badge}>{c.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
