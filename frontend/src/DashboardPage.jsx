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

/* ── SVG icon set (unchanged) ── */
const Icon = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  community: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  members: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  support: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  profile: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  admin: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
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

const avatarUrl = (u) => u?.photoURL || u?.avatarUrl || null;
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
          width: 46, height: 46,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 14,
          background: active
            ? "rgba(232,197,197,0.18)"
            : hover ? "rgba(255,255,255,0.06)" : "transparent",
          color: active ? "#f5dde3" : hover ? "#fff" : "rgba(245,221,227,0.55)",
          border: "none", cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {/* active indicator bar */}
        {active && (
          <span style={{
            position: "absolute", left: -10, top: 10, bottom: 10,
            width: 3, borderRadius: 99, background: "#f5dde3",
          }} />
        )}
        {item.icon}
        {badge > 0 && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "#b8617a", color: "#fff",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #2e1428",
            padding: "0 3px",
          }}>{badge > 99 ? "99+" : badge}</span>
        )}
      </button>
      {hover && (
        <div style={{
          position: "absolute", left: "calc(100% + 12px)", top: "50%",
          transform: "translateY(-50%)",
          background: "#2e1428", color: "#fff",
          fontSize: 12, fontWeight: 500,
          padding: "6px 11px", borderRadius: 8,
          whiteSpace: "nowrap", pointerEvents: "none",
          zIndex: 100, boxShadow: "0 8px 22px rgba(46,20,40,0.35)",
          animation: "slideRight 0.15s ease",
          fontFamily: "'Figtree',system-ui,sans-serif",
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
    <div style={{ display: "flex", gap: 2, background: "var(--bg-tertiary)", borderRadius: 99, padding: 3 }}>
      {langs.map(({ code, label }) => (
        <button key={code} onClick={() => setLang(code)} style={{
          padding: "5px 11px", borderRadius: 99, border: "none",
          background: lang === code ? "var(--brand)" : "transparent",
          color: lang === code ? "#fff" : "var(--text-muted)",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.04em",
          transition: "all var(--t-fast)",
          fontFamily: "'Figtree',system-ui,sans-serif",
        }}>{label}</button>
      ))}
    </div>
  );
}

/* ── Section eyebrow ── */
const eyebrow = {
  fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
  letterSpacing: "0.14em", textTransform: "uppercase",
  marginBottom: "0.85rem",
  fontFamily: "'Figtree',system-ui,sans-serif",
};

/* ── Home page (overview) ── */
function HomePage({ user, profile, onNavigate, onViewProfile }) {
  const [helpRequests, setHelpRequests] = useState([]);
  const [suggested, setSuggested]       = useState([]);
  const { t } = useLang();

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : "?";

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "helpRequests"), where("toUserId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) =>
      setHelpRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    getDocs(query(collection(db, "users"), limit(20))).then((snap) => {
      const others = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== user.uid && u.profession);
      others.sort((a, b) => ((b.lastSeen ?? "") > (a.lastSeen ?? "") ? 1 : -1));
      setSuggested(others.slice(0, 4));
    });

    return unsub;
  }, [user]);

  const pendingRequests = helpRequests.filter((r) => !r.status);

  const quickCards = [
    { icon: Icon.community, title: t.dash.goToCommunity, desc: "Share updates, achievements, and ideas with your network.", action: "community", cta: "Open Feed" },
    { icon: Icon.chat,      title: "Direct Messages",     desc: "Connect privately with fellow members in real time.",       action: "chat",      cta: "Open Messages" },
    { icon: Icon.members,   title: t.dash.goToSupport,    desc: "Search graduates by profession or city. Expand your network.", action: "members",   cta: "Find Help" },
    { icon: Icon.profile,   title: t.dash.goToProfile,    desc: "Update your professional info, bio, and profile photo.",   action: "profile",   cta: "Edit Profile" },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "2.25rem 2.75rem" }}>
      {/* Welcome banner — soft rose with plum text */}
      <div style={{
        background: "linear-gradient(135deg, #fdf8f6 0%, #f7ecec 55%, #f3dde2 100%)",
        border: "1px solid var(--border)",
        borderRadius: 20, padding: "2rem 2.25rem",
        marginBottom: "2.25rem", display: "flex", alignItems: "center", gap: "1.5rem",
        boxShadow: "0 4px 24px rgba(184,97,122,0.08)",
        position: "relative", overflow: "hidden",
      }}>
        {/* decorative bloom */}
        <div style={{
          position: "absolute", right: -60, top: -60, width: 200, height: 200,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(184,97,122,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", flexShrink: 0, zIndex: 1 }}>
          {avatarUrl(profile) ? (
            <img src={avatarUrl(profile)} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 4px 14px rgba(74,31,61,0.15)" }} alt="" />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #b8617a, #d48aa0)", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#fff", fontFamily: "'Outfit',sans-serif", boxShadow: "0 4px 14px rgba(184,97,122,0.3)" }}>{initials}</div>
          )}
          <span style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#7cb88f", border: "2.5px solid #fff" }} />
        </div>
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#4a1f3d", marginBottom: 4, fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.01em" }}>
            {t.dash.welcomeBack} {profile?.firstName || "Member"}
          </p>
          <p style={{ fontSize: 13, color: "#8a6b76", margin: 0, fontWeight: 400 }}>
            {profile?.profession ? `${profile.profession} · ` : ""}
            {profile?.city || "Manhigut Shava"} · Kehila 2026
          </p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 99, padding: "6px 16px", fontSize: 10, fontWeight: 600, color: "#b8617a", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0, position: "relative", zIndex: 1 }}>{t.dash.member}</div>
      </div>

      {/* Help Requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: "2.25rem" }}>
          <p style={eyebrow}>Pending Help Requests ({pendingRequests.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pendingRequests.slice(0, 3).map((r) => (
              <div key={r.id} className="card" style={{ padding: "0.95rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderLeft: "3px solid #d4a373", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{r.fromUserName}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.fromUserProfession || r.fromUserEmail}</p>
                </div>
                <button onClick={() => onNavigate("members")} style={{ padding: "6px 16px", borderRadius: 99, background: "var(--brand)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
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
        <div style={{ marginBottom: "2.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>{t.dash.suggestedMembers}</p>
            <button onClick={() => onNavigate("members")} style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{t.dash.viewAll}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {suggested.map((u) => {
              const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
              const online = isActuallyOnline(u);
              return (
                <div key={u.id} className="card card-hover" style={{ padding: "1rem 1.1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.85rem", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 14, transition: "border-color 0.2s, transform 0.2s" }}
                  onClick={() => onViewProfile ? onViewProfile(u.id) : onNavigate("members")}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {avatarUrl(u) ? (
                      <img src={avatarUrl(u)} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} alt="" />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#b8617a,#d48aa0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'Outfit',sans-serif" }}>
                        {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    {online && <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#7cb88f", border: "2px solid var(--bg-primary)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.profession}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick-access cards — monochromatic, no rainbow colors */}
      <p style={eyebrow}>{t.dash.quickActions}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2.25rem" }}>
        {quickCards.map((card, i) => (
          <div key={card.action}
            className={`card card-hover slide-up stagger-${i + 1}`}
            style={{
              padding: "1.6rem", cursor: "pointer",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
            }}
            onClick={() => onNavigate(card.action)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(184,97,122,0.10)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--bg-tertiary)",
              color: "var(--brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "0.95rem",
            }}>{card.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem", fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.005em" }}>{card.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem", fontWeight: 400 }}>{card.desc}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)" }}>{card.cta} →</span>
          </div>
        ))}
      </div>

      {/* Movement website banner — soft plum, no harsh blue */}
      <a
        href="https://ywp-online.my.canva.site/manhigot2026"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "1.15rem 1.6rem",
          background: "linear-gradient(135deg, #4a1f3d 0%, #6b2b53 60%, #b8617a 100%)",
          borderRadius: 16,
          textDecoration: "none", cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 6px 22px rgba(74,31,61,0.22)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(74,31,61,0.32)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 22px rgba(74,31,61,0.22)"; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5dde3" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 2px", fontFamily: "'Outfit',sans-serif" }}>Manhigut Shava Website</p>
          <p style={{ fontSize: 12, color: "rgba(245,221,227,0.7)", margin: 0 }}>ywp-online.my.canva.site/manhigot2026</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  );
}

/* ── Main dashboard shell ── */
export default function DashboardPage() {
  const { user, profile, logout } = useAuth();
  const { lang, setLang, t, isRTL } = useLang();
  const { dark, toggleTheme } = useTheme();

  const [section,    setSection]    = useState(() => localStorage.getItem("section") || "home");
  const [navHistory, setNavHistory] = useState(() => [localStorage.getItem("section") || "home"]);
  const [unreadDMs,  setUnreadDMs]  = useState(0);
  const [profileTarget, setProfileTarget] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);

  const navigate = useCallback((s, options = {}) => {
    localStorage.setItem("section", s);
    setSection(s);
    if (s === "profile") {
      setProfileTarget(options.userId || null);
      setChatTarget(null);
    } else if (s === "chat") {
      setChatTarget(options.userId || null);
      setProfileTarget(null);
    } else {
      setProfileTarget(null);
      setChatTarget(null);
    }
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

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    updateDoc(ref, { isOnline: true, lastSeen: new Date().toISOString() }).catch(() => {});
    const offline = () =>
      updateDoc(ref, { isOnline: false, lastSeen: new Date().toISOString() }).catch(() => {});
    window.addEventListener("beforeunload", offline);
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

  const sidebarW = 68;
  const pageTitle = navItems.find((n) => n.id === section)?.label || t.nav.home;
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: "'Figtree','Outfit',system-ui,-apple-system,sans-serif",
      direction: dir,
    }}>
      {/* ── Sidebar — soft plum ── */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background: "linear-gradient(180deg, #2e1428 0%, #3a1a32 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "1rem", paddingBottom: "1rem",
        gap: "6px", zIndex: 30,
        borderRight: "1px solid rgba(245,221,227,0.08)",
      }}>
        {/* Logo */}
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: "linear-gradient(135deg, #b8617a, #d48aa0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#fff",
          marginBottom: "0.85rem", flexShrink: 0,
          boxShadow: "0 4px 14px rgba(184,97,122,0.45)",
          letterSpacing: "-0.5px",
          fontFamily: "'Outfit',sans-serif",
        }}>MS</div>

        <div style={{ width: 28, height: 1, background: "rgba(245,221,227,0.12)", marginBottom: "0.6rem" }} />

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          {navItems.map((item) => (
            <NavBtn
              key={item.id} item={item}
              active={section === item.id}
              badge={item.id === "chat" ? unreadDMs : 0}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        {/* Logout + avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <NavBtn
            item={{ id: "logout", label: t.nav.logout, icon: Icon.logout }}
            active={false} badge={0} onClick={logout}
          />
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => navigate("profile")} title={t.nav.profile}>
            {avatarUrl(profile) ? (
              <img src={avatarUrl(profile)} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(245,221,227,0.25)" }} alt="" />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #b8617a, #d48aa0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", border: "2px solid rgba(245,221,227,0.2)", fontFamily: "'Outfit',sans-serif" }}>{initials}</div>
            )}
            <span style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "var(--online)", border: "2px solid #2e1428" }} />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg-secondary)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar */}
          {section !== "chat" && (
            <header style={{
              height: 60, minHeight: 60,
              background: "var(--bg-primary)",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              padding: "0 1.75rem", gap: "0.85rem", zIndex: 10,
            }}>
              {canGoBack && (
                <button
                  onClick={goBack}
                  title="Go back"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: 10,
                    background: "transparent", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", cursor: "pointer",
                    transition: "all var(--t-fast)", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {Icon.back}
                </button>
              )}

              <span style={{
                fontSize: 17, fontWeight: 600, color: "var(--text-primary)",
                fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.01em",
              }}>{pageTitle}</span>
              <div style={{ flex: 1 }} />

              <LangSwitcher lang={lang} setLang={setLang} />

              <button
                onClick={toggleTheme}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  width: 34, height: 34, borderRadius: 99,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", cursor: "pointer",
                  transition: "all var(--t-fast)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--brand)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {dark ? Icon.sun : Icon.moon}
              </button>

              {/* User chip */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "4px 12px 4px 5px", borderRadius: 99,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                  cursor: "pointer", transition: "border-color 0.2s",
                }}
                onClick={() => navigate("profile")}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--brand)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {avatarUrl(profile) ? (
                  <img src={avatarUrl(profile)} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} alt="" />
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #b8617a, #d48aa0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff", fontFamily: "'Outfit',sans-serif" }}>{initials}</div>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {profile?.firstName || t.nav.profile}
                </span>
              </div>
            </header>
          )}

          {/* Page content */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
            {section === "home"      && <HomePage user={user} profile={profile} onNavigate={navigate} onViewProfile={(userId) => navigate("profile", { userId })} />}
            {section === "community" && <CommunityPage onViewProfile={(userId) => navigate("profile", { userId })} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "chat"      && <ChatPage onUnreadChange={setUnreadDMs} onViewProfile={(userId) => navigate("profile", { userId })} openChatWithUserId={chatTarget} />}
            {section === "members"   && <SupportPage onViewProfile={(userId) => navigate("profile", { userId })} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "profile"   && <ProfilePage viewUserId={profileTarget} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "admin"     && <AdminPage />}
          </div>
        </div>
      </main>
    </div>
  );
}
