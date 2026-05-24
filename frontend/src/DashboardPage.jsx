import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import SupportPage   from "./SupportPage";
import CommunityPage from "./CommunityPage";
import ProfilePage   from "./ProfilePage";
import AdminPage     from "./AdminPage";
import ChatPage      from "./ChatPage";

/* ── SVG icon set ── */
const Icon = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
  community: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  members: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  admin: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const NAV = [
  { id: "home",      label: "Home",      icon: Icon.home      },
  { id: "community", label: "Community", icon: Icon.community  },
  { id: "chat",      label: "Messages",  icon: Icon.chat       },
  { id: "members",   label: "Members",   icon: Icon.members    },
  { id: "profile",   label: "Profile",   icon: Icon.profile    },
];

function timeAgo(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

/* ── Sidebar nav button with tooltip ── */
function NavBtn({ item, active, badge, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: 48, height: 48,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: active ? "var(--r-md)" : "var(--r-full)",
          background: active ? "var(--sidebar-active)" : hover ? "var(--sidebar-hover)" : "transparent",
          color: active ? "var(--sidebar-active-text)" : hover ? "#fff" : "var(--sidebar-text)",
          border: "none", cursor: "pointer",
          transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {item.icon}
        {badge > 0 && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "#ef4444", color: "#fff",
            fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--sidebar-bg)",
            padding: "0 3px",
          }}>{badge > 99 ? "99+" : badge}</span>
        )}
      </button>

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: "absolute", left: "calc(100% + 10px)", top: "50%",
          transform: "translateY(-50%)",
          background: "#1e293b", color: "#fff",
          fontSize: 12, fontWeight: 600,
          padding: "5px 10px", borderRadius: "var(--r-sm)",
          whiteSpace: "nowrap", pointerEvents: "none",
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          animation: "slideRight 0.15s ease",
        }}>
          {item.label}
        </div>
      )}
    </div>
  );
}

/* ── Home overview page ── */
function HomePage({ profile, onNavigate }) {
  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : "?";
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : "";

  const quickCards = [
    {
      icon: "💬", title: "Community Feed",
      desc: "See what's happening in your network. Share updates, achievements, and ideas.",
      action: "community", cta: "Open Feed", color: "#3b82f6",
    },
    {
      icon: "✉️", title: "Direct Messages",
      desc: "Connect privately with fellow members. Start a real-time conversation.",
      action: "chat", cta: "Open Messages", color: "#8b5cf6",
    },
    {
      icon: "🔍", title: "Find Members",
      desc: "Search graduates by profession, city, or institution. Expand your network.",
      action: "members", cta: "Search Members", color: "#0ea5e9",
    },
    {
      icon: "👤", title: "My Profile",
      desc: "Update your professional info, bio, and profile photo.",
      action: "profile", cta: "Edit Profile", color: "#10b981",
    },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "2rem 2.5rem" }}>
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #1a3c5e 0%, #1d4ed8 55%, #3b82f6 100%)",
        backgroundSize: "300% 300%",
        animation: "bannerFlow 10s ease infinite",
        borderRadius: "var(--r-xl)",
        padding: "2rem 2.5rem",
        marginBottom: "2rem",
        display: "flex", alignItems: "center", gap: "1.5rem",
        boxShadow: "0 8px 32px rgba(29,78,216,0.3)",
      }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} style={{
              width: 64, height: 64, borderRadius: "50%", objectFit: "cover",
              border: "3px solid rgba(255,255,255,0.4)",
            }} alt="" />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              border: "3px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "#fff",
            }}>{initials}</div>
          )}
          <span style={{
            position: "absolute", bottom: 2, right: 2,
            width: 14, height: 14, borderRadius: "50%",
            background: "#22c55e", border: "2.5px solid #1d4ed8",
          }} />
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            Welcome back, {profile?.firstName || "Member"} 👋
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", margin: 0 }}>
            {profile?.profession ? `${profile.profession} · ` : ""}
            {profile?.city || "Manhigut Shava"} · Kehila 2026
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "var(--r-full)",
          padding: "6px 18px",
          fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)",
          letterSpacing: "0.06em", textTransform: "uppercase",
          flexShrink: 0,
        }}>Member ✓</div>
      </div>

      {/* Section label */}
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
        Quick Access
      </p>

      {/* Quick-access cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1rem",
      }}>
        {quickCards.map((card, i) => (
          <div
            key={card.action}
            className={`card card-hover slide-up stagger-${i + 1}`}
            style={{ padding: "1.5rem", cursor: "pointer", borderLeft: `4px solid ${card.color}` }}
            onClick={() => onNavigate(card.action)}
          >
            <div style={{ fontSize: 28, marginBottom: "0.75rem" }}>{card.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>{card.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>{card.desc}</p>
            <span style={{ fontSize: 12, fontWeight: 700, color: card.color }}>{card.cta} →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main dashboard shell ── */
export default function DashboardPage() {
  const { user, profile, logout } = useAuth();
  const [section, setSection]   = useState(() => localStorage.getItem("section") || "home");
  const [unreadDMs, setUnreadDMs] = useState(0);

  const navigate = useCallback((s) => {
    localStorage.setItem("section", s);
    setSection(s);
  }, []);

  /* Set online status on mount / unmount */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    updateDoc(ref, { isOnline: true, lastSeen: new Date().toISOString() }).catch(() => {});
    const offline = () => updateDoc(ref, { isOnline: false, lastSeen: new Date().toISOString() }).catch(() => {});
    window.addEventListener("beforeunload", offline);
    return () => {
      window.removeEventListener("beforeunload", offline);
      offline();
    };
  }, [user]);

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "?").toUpperCase();

  const navItems = [
    ...NAV,
    ...(profile?.isAdmin ? [{ id: "admin", label: "Admin", icon: Icon.admin }] : []),
  ];

  const sidebarW = 64;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font)" }}>

      {/* ── Left sidebar ── */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background: "var(--sidebar-bg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "0.75rem", paddingBottom: "0.75rem",
        gap: "4px",
        zIndex: 30,
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
      }}>
        {/* Logo */}
        <div style={{
          width: 40, height: 40, borderRadius: "var(--r-md)",
          background: "linear-gradient(135deg, #2563eb, #3b82f6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: "#fff",
          marginBottom: "0.75rem", flexShrink: 0,
          boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
          letterSpacing: "-0.5px",
        }}>MS</div>

        {/* Divider */}
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.1)", marginBottom: "0.5rem" }} />

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map((item) => (
            <NavBtn
              key={item.id}
              item={item}
              active={section === item.id}
              badge={item.id === "chat" ? unreadDMs : 0}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        {/* Bottom: logout + avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          {/* Logout */}
          <NavBtn
            item={{ id: "logout", label: "Sign Out", icon: Icon.logout }}
            active={false}
            badge={0}
            onClick={logout}
          />

          {/* User avatar */}
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => navigate("profile")}
            title="My Profile"
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} style={{
                width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.2)",
              }} alt="" />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff",
                border: "2px solid rgba(255,255,255,0.15)",
              }}>{initials}</div>
            )}
            <span style={{
              position: "absolute", bottom: 0, right: 0,
              width: 11, height: 11, borderRadius: "50%",
              background: "var(--online)",
              border: "2px solid var(--sidebar-bg)",
            }} />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg-secondary)" }}>

        {/* Content panel with page header */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar (for non-chat sections) */}
          {section !== "chat" && (
            <header style={{
              height: 52, minHeight: 52,
              background: "var(--bg-primary)",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              padding: "0 1.5rem",
              gap: "0.75rem",
              zIndex: 10,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                {navItems.find(n => n.id === section)?.label || "Home"}
              </span>
              <div style={{ flex: 1 }} />

              {/* Online status pill */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: "var(--r-full)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--online)", flexShrink: 0 }} />
                Online
              </div>

              {/* User chip */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "4px 10px 4px 6px", borderRadius: "var(--r-full)",
                  background: "var(--bg-secondary)", border: "1px solid var(--border)",
                  cursor: "pointer", transition: "background var(--t-fast)",
                }}
                onClick={() => navigate("profile")}
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} alt="" />
                ) : (
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#fff",
                  }}>{initials}</div>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {profile?.firstName || "Profile"}
                </span>
              </div>
            </header>
          )}

          {/* Page content */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
            {section === "home"      && <HomePage profile={profile} onNavigate={navigate} />}
            {section === "community" && <CommunityPage />}
            {section === "chat"      && <ChatPage onUnreadChange={setUnreadDMs} />}
            {section === "members"   && <SupportPage />}
            {section === "profile"   && <ProfilePage />}
            {section === "admin"     && <AdminPage />}
          </div>
        </div>
      </main>
    </div>
  );
}
