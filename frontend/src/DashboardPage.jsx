import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, collection, getDocs, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import SupportPage   from "./SupportPage";
import CommunityPage from "./CommunityPage";
import ProfilePage   from "./ProfilePage";
import AdminPage     from "./AdminPage";
import ChatPage      from "./ChatPage";

/* ── SVG icon set ── */
const Icon = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  community: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  members: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  support: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  profile: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  admin: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

function timeAgo(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

/** Avatar URL: normalize both field names */
const avatarUrl = (u) => u?.photoURL || u?.avatarUrl || null;

/** Determine if a user is truly online (lastSeen < 5 min) */
const isActuallyOnline = (u) => {
  if (!u?.lastSeen) return false;
  return Date.now() - new Date(u.lastSeen) < 5 * 60 * 1000;
};

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
      {hover && (
        <div style={{
          position: "absolute", left: "calc(100% + 10px)", top: "50%",
          transform: "translateY(-50%)",
          background: "#1e293b", color: "#fff",
          fontSize: 12, fontWeight: 600,
          padding: "5px 10px", borderRadius: "var(--r-sm)",
          whiteSpace: "nowrap", pointerEvents: "none",
          zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          animation: "slideRight 0.15s ease",
        }}>
          {item.label}
        </div>
      )}
    </div>
  );
}

/* ── Language switcher ── */
function LangSwitcher({ lang, setLang }) {
  const langs = [{ code: "en", label: "EN" }, { code: "he", label: "HE" }, { code: "ar", label: "AR" }];
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--bg-tertiary)", borderRadius: "var(--r-sm)", padding: 2 }}>
      {langs.map(({ code, label }) => (
        <button key={code} onClick={() => setLang(code)} style={{
          padding: "4px 8px", borderRadius: "var(--r-xs)", border: "none",
          background: lang === code ? "var(--brand)" : "transparent",
          color: lang === code ? "#fff" : "var(--text-muted)",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
          transition: "all var(--t-fast)",
        }}>{label}</button>
      ))}
    </div>
  );
}

/* ── Home page (overview) ── */
function HomePage({ user, profile, onNavigate }) {
  const [helpRequests, setHelpRequests] = useState([]);
  const [suggested, setSuggested]       = useState([]);
  const { t } = useLang();

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : "?";

  /* Load incoming help requests + suggested members */
  useEffect(() => {
    if (!user) return;
    /* Received help requests */
    const q = query(collection(db, "helpRequests"), where("toUserId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) =>
      setHelpRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    /* Suggested members: up to 4 users with a profession (excluding self) */
    getDocs(query(collection(db, "users"), limit(20))).then((snap) => {
      const others = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== user.uid && u.profession);
      /* Sort by most recent activity */
      others.sort((a, b) => ((b.lastSeen ?? "") > (a.lastSeen ?? "") ? 1 : -1));
      setSuggested(others.slice(0, 4));
    });

    return unsub;
  }, [user]);

  const pendingRequests = helpRequests.filter((r) => !r.status);

  const quickCards = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      title: t.dash.goToCommunity, desc: "Share updates, achievements, and ideas with your network.", action: "community", cta: "Open Feed", color: "#3b82f6" },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      title: "Direct Messages", desc: "Connect privately with fellow members in real time.", action: "chat", cta: "Open Messages", color: "#8b5cf6" },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
      title: t.dash.goToSupport, desc: "Search graduates by profession or city. Expand your network.", action: "members", cta: "Find Help", color: "#0ea5e9" },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      title: t.dash.goToProfile, desc: "Update your professional info, bio, and profile photo.", action: "profile", cta: "Edit Profile", color: "#10b981" },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "2rem 2.5rem" }}>
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #1a3c5e 0%, #1d4ed8 55%, #3b82f6 100%)",
        borderRadius: "var(--r-xl)", padding: "2rem 2.5rem",
        marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1.5rem",
        boxShadow: "0 8px 32px rgba(29,78,216,0.3)",
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {avatarUrl(profile) ? (
            <img src={avatarUrl(profile)} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.4)" }} alt="" />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>{initials}</div>
          )}
          <span style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2.5px solid #1d4ed8" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            {t.dash.welcomeBack} {profile?.firstName || "Member"}
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", margin: 0 }}>
            {profile?.profession ? `${profile.profession} · ` : ""}
            {profile?.city || "Manhigut Shava"} · Kehila 2026
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "var(--r-full)", padding: "6px 18px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>{t.dash.member}</div>
      </div>

      {/* Help Requests mini widget */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Pending Help Requests ({pendingRequests.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pendingRequests.slice(0, 3).map((r) => (
              <div key={r.id} className="card" style={{ padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{r.fromUserName}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.fromUserProfession || r.fromUserEmail}</p>
                </div>
                <button onClick={() => onNavigate("members")} style={{ padding: "5px 14px", borderRadius: "var(--r-sm)", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  View
                </button>
              </div>
            ))}
            {pendingRequests.length > 3 && (
              <button onClick={() => onNavigate("members")} style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontWeight: 600, padding: "4px 0" }}>
                + {pendingRequests.length - 3} more requests →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suggested members */}
      {suggested.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {t.dash.suggestedMembers}
            </p>
            <button onClick={() => onNavigate("members")} style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{t.dash.viewAll}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {suggested.map((u) => {
              const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
              const online = isActuallyOnline(u);
              return (
                <div key={u.id} className="card card-hover" style={{ padding: "1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem" }} onClick={() => onNavigate("members")}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {avatarUrl(u) ? (
                      <img src={avatarUrl(u)} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt="" />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                        {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    {online && <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--bg-primary)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.profession}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick-access cards */}
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
        {t.dash.quickActions}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {quickCards.map((card, i) => (
          <div key={card.action}
            className={`card card-hover slide-up stagger-${i + 1}`}
            style={{ padding: "1.5rem", cursor: "pointer", borderLeft: `4px solid ${card.color}` }}
            onClick={() => onNavigate(card.action)}
          >
            <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: `${card.color}14`, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.85rem" }}>{card.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>{card.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>{card.desc}</p>
            <span style={{ fontSize: 12, fontWeight: 700, color: card.color }}>{card.cta} →</span>
          </div>
        ))}
      </div>

      {/* Movement website banner */}
      <a
        href="https://ywp-online.my.canva.site/manhigot2026"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "1.1rem 1.5rem",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)",
          borderRadius: "var(--r-xl)",
          border: "1px solid rgba(37,99,235,0.35)",
          boxShadow: "0 4px 20px rgba(37,99,235,0.2)",
          textDecoration: "none", cursor: "pointer",
          transition: "transform 0.18s, box-shadow 0.18s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(37,99,235,0.32)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.2)"; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Manhigut Shava Website</p>
          <p style={{ fontSize: 12, color: "rgba(191,219,254,0.65)", margin: 0 }}>ywp-online.my.canva.site/manhigot2026</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  );
}

/* ── Main dashboard shell ── */
export default function DashboardPage() {
  const { user, profile, logout } = useAuth();
  const { lang, setLang, t, isRTL } = useLang();
  const { dark, toggleTheme } = useTheme();

  /* Navigation with history for in-app back button */
  const [section,    setSection]    = useState(() => localStorage.getItem("section") || "home");
  const [navHistory, setNavHistory] = useState(() => [localStorage.getItem("section") || "home"]);
  const [unreadDMs,  setUnreadDMs]  = useState(0);

  const navigate = useCallback((s) => {
    localStorage.setItem("section", s);
    setSection(s);
    setNavHistory((prev) => {
      if (prev[prev.length - 1] === s) return prev;
      return [...prev, s];
    });
  }, []);

  const goBack = useCallback(() => {
    setNavHistory((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const prevSection = next[next.length - 1];
      localStorage.setItem("section", prevSection);
      setSection(prevSection);
      return next;
    });
  }, []);

  const canGoBack = navHistory.length > 1;

  /* Set online status on mount / unmount */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    updateDoc(ref, { isOnline: true, lastSeen: new Date().toISOString() }).catch(() => {});
    const offline = () =>
      updateDoc(ref, { isOnline: false, lastSeen: new Date().toISOString() }).catch(() => {});
    window.addEventListener("beforeunload", offline);
    /* Heartbeat every 2 min to keep lastSeen fresh */
    const hb = setInterval(() => {
      updateDoc(ref, { lastSeen: new Date().toISOString() }).catch(() => {});
    }, 2 * 60 * 1000);
    return () => {
      window.removeEventListener("beforeunload", offline);
      clearInterval(hb);
      offline();
    };
  }, [user]);

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "?").toUpperCase();

  const navItems = [
    { id: "home",      label: t.nav.home,      icon: Icon.home      },
    { id: "community", label: t.nav.community,  icon: Icon.community  },
    { id: "chat",      label: "Messages",       icon: Icon.chat       },
    { id: "members",   label: t.nav.support,    icon: Icon.members    },
    { id: "profile",   label: t.nav.profile,    icon: Icon.profile    },
    ...(profile?.isAdmin ? [{ id: "admin", label: "Admin", icon: Icon.admin }] : []),
  ];

  const sidebarW = 64;

  const pageTitle = navItems.find((n) => n.id === section)?.label || t.nav.home;

  /* Direction for RTL languages */
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font)", direction: dir }}>

      {/* ── Left sidebar ── */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background: "var(--sidebar-bg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "0.75rem", paddingBottom: "0.75rem",
        gap: "4px", zIndex: 30,
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

        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.1)", marginBottom: "0.5rem" }} />

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map((item) => (
            <NavBtn
              key={item.id} item={item}
              active={section === item.id}
              badge={item.id === "chat" ? unreadDMs : 0}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        {/* Bottom: logout + avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <NavBtn
            item={{ id: "logout", label: t.nav.logout, icon: Icon.logout }}
            active={false} badge={0} onClick={logout}
          />
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => navigate("profile")} title={t.nav.profile}>
            {avatarUrl(profile) ? (
              <img src={avatarUrl(profile)} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)" }} alt="" />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,0.15)" }}>{initials}</div>
            )}
            <span style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "var(--online)", border: "2px solid var(--sidebar-bg)" }} />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg-secondary)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar */}
          {section !== "chat" && (
            <header style={{
              height: 52, minHeight: 52,
              background: "var(--bg-primary)", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              padding: "0 1.5rem", gap: "0.75rem", zIndex: 10,
            }}>
              {/* Back button */}
              {canGoBack && (
                <button
                  onClick={goBack}
                  title="Go back"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: "var(--r-sm)",
                    background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", cursor: "pointer",
                    transition: "all var(--t-fast)", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {Icon.back}
                </button>
              )}

              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{pageTitle}</span>
              <div style={{ flex: 1 }} />

              {/* Language switcher */}
              <LangSwitcher lang={lang} setLang={setLang} />

              {/* Dark / Light theme toggle */}
              <button
                onClick={toggleTheme}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  width: 32, height: 32, borderRadius: "var(--r-full)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", cursor: "pointer",
                  transition: "all var(--t-fast)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--brand)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                {dark ? Icon.sun : Icon.moon}
              </button>

              {/* User chip */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 6px", borderRadius: "var(--r-full)", background: "var(--bg-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => navigate("profile")}
              >
                {avatarUrl(profile) ? (
                  <img src={avatarUrl(profile)} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} alt="" />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{initials}</div>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {profile?.firstName || t.nav.profile}
                </span>
              </div>
            </header>
          )}

          {/* Page content */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
            {section === "home"      && <HomePage user={user} profile={profile} onNavigate={navigate} />}
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
