import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, collection, getDocs, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import { useIsMobile } from "./hooks/useIsMobile";
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

function useTimeAgo() {
  const { t } = useLang();
  return (ts) => {
    if (!ts) return "";
    const d = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (d < 60)    return t.common.justNow;
    if (d < 3600)  return t.common.minutesAgo(Math.floor(d / 60));
    if (d < 86400) return t.common.hoursAgo(Math.floor(d / 3600));
    return t.common.daysAgo(Math.floor(d / 86400));
  };
}

const avatarUrl = (u) => u?.photoURL || u?.avatarUrl || null;
const isActuallyOnline = (u) => {
  if (!u?.lastSeen) return false;
  return Date.now() - new Date(u.lastSeen) < 5 * 60 * 1000;
};

/* ── Sidebar nav button with optional expanded label ── */
function NavBtn({ item, active, badge, onClick, expanded }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: "relative", width: expanded ? "100%" : "auto" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: expanded ? "100%" : 46, height: 46,
          display: "flex", alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          gap: expanded ? 12 : 0,
          paddingLeft: expanded ? 12 : 0,
          borderRadius: 14,
          background: active
            ? "rgba(68,114,184,0.18)"
            : hover ? "rgba(255,255,255,0.06)" : "transparent",
          color: active ? "#daeaf8" : hover ? "#fff" : "rgba(218,234,248,0.55)",
          border: "none", cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {active && (
          <span style={{
            position: "absolute", left: expanded ? 0 : -10, top: 10, bottom: 10,
            width: 3, borderRadius: 99, background: "#daeaf8",
          }} />
        )}
        <span style={{ flexShrink: 0 }}>{item.icon}</span>
        {expanded && (
          <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.label}
          </span>
        )}
        {badge > 0 && (
          <span style={{
            position: expanded ? "static" : "absolute",
            marginLeft: expanded ? "auto" : undefined,
            top: expanded ? undefined : 6, right: expanded ? undefined : 6,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "#e8735a", color: "#fff",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #1a2f5e",
            padding: "0 3px", flexShrink: 0,
          }}>{badge > 99 ? "99+" : badge}</span>
        )}
      </button>
      {hover && !expanded && (
        <div style={{
          position: "absolute", left: "calc(100% + 12px)", top: "50%",
          transform: "translateY(-50%)",
          background: "#1a2f5e", color: "#fff",
          fontSize: 12, fontWeight: 500,
          padding: "6px 11px", borderRadius: 8,
          whiteSpace: "nowrap", pointerEvents: "none",
          zIndex: 100, boxShadow: "0 8px 22px rgba(29,72,150,0.35)",
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

/* ── Quick-access floating circle ── */
function QuickCircle({ icon, title, desc, coral, floatIdx, onClick, small }) {
  const [hov, setHov] = useState(false);
  const color = coral ? "#e8735a" : "#4472b8";
  const floatAnim = `qc-float-${floatIdx % 4} ${4.5 + floatIdx * 0.5}s ${floatIdx * 0.6}s ease-in-out infinite`;
  const sz = small ? 110 : 160;
  const ringInset = small ? 12 : 18;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: small ? 6 : 10, cursor:"pointer",
      animation:"qc-pop 0.55s ease both", animationDelay:`${floatIdx * 0.12}s` }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ position:"relative", animation: floatAnim }}>
        {[1,2].map(r => (
          <div key={r} style={{
            position:"absolute", borderRadius:"50%",
            inset: -(r * ringInset),
            border:`1.5px solid ${coral ? `rgba(232,115,90,${0.22 - r*0.08})` : `rgba(68,114,184,${0.18 - r*0.07})`}`,
            animation:`qc-ring ${2.8 + r * 0.6}s ${r * 0.55}s ease-out infinite`,
            pointerEvents:"none",
          }}/>
        ))}
        <div style={{
          width:sz, height:sz, borderRadius:"50%",
          background: hov ? color : (coral ? "rgba(232,115,90,0.07)" : "rgba(68,114,184,0.06)"),
          border:`2.5px solid ${hov ? color : (coral ? "rgba(232,115,90,0.32)" : "rgba(68,114,184,0.22)")}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          color: hov ? "#fff" : color,
          transition:"background 0.26s cubic-bezier(0.2,0.8,0.2,1), border-color 0.26s, color 0.26s, box-shadow 0.26s",
          transform: hov ? "scale(1.08)" : "scale(1)",
          boxShadow: hov ? `0 20px 48px ${coral ? "rgba(232,115,90,0.28)" : "rgba(68,114,184,0.22)"}` : "0 4px 20px rgba(0,0,0,0.05)",
          position:"relative", zIndex:1,
        }}>
          <div style={{ transform: small ? "scale(1.2)" : "scale(1.5)" }}>{icon}</div>
        </div>
      </div>
      <p style={{ fontSize: small ? 11 : 13, fontWeight:700, color, margin:0, textAlign:"center", maxWidth: small ? 80 : 110 }}>{title}</p>
      {!small && (
        <p style={{ fontSize:11, color:"var(--text-muted)", margin:0, textAlign:"center", maxWidth:130,
          lineHeight:1.5, fontWeight:400, minHeight:"2.4em",
          opacity: hov ? 1 : 0, transition:"opacity 0.18s ease" }}>{desc}</p>
      )}
    </div>
  );
}

/* ── Home page (overview) ── */
function HomePage({ user, profile, onNavigate, onViewProfile }) {
  const [helpRequests, setHelpRequests] = useState([]);
  const [suggested, setSuggested]       = useState([]);
  const { t } = useLang();
  const isMobile = useIsMobile();

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

  const quickCircles = [
    { icon: Icon.members,   title: t.dash.goToSupport,   desc: t.dash.descSupport,   action: "members",   coral: true  },
    { icon: Icon.community, title: t.dash.goToCommunity, desc: t.dash.descCommunity, action: "community", coral: false },
    { icon: Icon.chat,      title: t.dash.goToMessages,  desc: t.dash.descMessages,  action: "chat",      coral: true  },
    { icon: Icon.profile,   title: t.dash.goToProfile,   desc: t.dash.descProfile,   action: "profile",   coral: false },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: isMobile ? "1.25rem 1rem 1.5rem" : "2.25rem 2.75rem" }}>
      {/* Welcome banner — redesigned */}
      {(() => {
        const hr = new Date().getHours();
        const greetKey = hr < 12 ? "goodMorning" : hr < 18 ? "goodAfternoon" : "goodEvening";
        const greeting = t.dash[greetKey] || t.dash.welcomeBack;
        return (
          <div style={{
            marginBottom:"2rem", borderRadius:20, padding: isMobile ? "1rem 1.1rem" : "1.5rem 1.75rem",
            background:"var(--bg-primary,#fff)",
            position:"relative", overflow:"hidden",
            boxShadow:"0 2px 18px rgba(29,72,150,0.08), 0 0 0 1px rgba(29,72,150,0.07)",
            display:"flex", alignItems:"center", gap:14,
          }}>
            {/* Left gradient accent */}
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:4,
              background:"linear-gradient(to bottom,#4472b8 0%,#e8735a 100%)",
              borderRadius:"99px 0 0 99px", pointerEvents:"none" }} />

            {/* Avatar */}
            <div style={{ flexShrink:0, marginLeft:10, position:"relative" }}>
              <div style={{
                width:60, height:60, borderRadius:"50%",
                background:"linear-gradient(135deg,#4472b8 0%,#e8735a 100%)",
                display:"flex", alignItems:"center", justifyContent:"center",
                overflow:"hidden",
                boxShadow:"0 4px 16px rgba(68,114,184,0.22)",
              }}>
                {profile?.photoURL
                  ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <span style={{ color:"#fff", fontSize:19, fontWeight:800, fontFamily:"'Outfit',sans-serif" }}>{initials}</span>
                }
              </div>
              <div style={{
                position:"absolute", bottom:1, right:1,
                width:14, height:14, borderRadius:"50%",
                background:"#4ade80", border:"2.5px solid var(--bg-primary,#fff)",
              }} />
            </div>

            {/* Text */}
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:11, fontWeight:700, color:"var(--brand,#4472b8)", margin:"0 0 2px",
                textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {greeting}
              </p>
              <h2 style={{ fontSize:21, fontWeight:800, color:"var(--text-primary,#111827)", margin:"0 0 4px",
                lineHeight:1.2, fontFamily:"'Outfit',sans-serif" }}>
                {profile?.firstName || ""}
              </h2>
              {(profile?.profession || profile?.city) && (
                <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", margin:0, fontWeight:400 }}>
                  {[profile?.profession, profile?.city].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Online badge — hidden on mobile to avoid crowding */}
            {!isMobile && (
              <div style={{
                flexShrink:0, display:"flex", alignItems:"center", gap:6,
                padding:"5px 13px", borderRadius:99,
                background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.28)",
              }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80",
                  boxShadow:"0 0 0 2px rgba(74,222,128,0.25)" }} />
                <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>
                  {t.common?.online || "Online"}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Help Requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: "2.25rem" }}>
          <p style={eyebrow}>{t.dash.pendingHelp} ({pendingRequests.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pendingRequests.slice(0, 3).map((r) => (
              <div key={r.id} className="card" style={{ padding: "0.95rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderLeft: "3px solid #e8735a", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{r.fromUserName}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.fromUserProfession || r.fromUserEmail}</p>
                </div>
                <button onClick={() => onNavigate("members")} style={{ padding: "6px 16px", borderRadius: 99, background: "var(--brand)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {t.dash.viewReq}
                </button>
              </div>
            ))}
            {pendingRequests.length > 3 && (
              <button onClick={() => onNavigate("members")} style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontWeight: 600, padding: "4px 0" }}>
                {t.dash.moreReqs(pendingRequests.length - 3)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick-access circles — floating with sonar rings */}
      <p style={eyebrow}>{t.dash.quickActions}</p>
      <style>{`
        @keyframes qc-float-0{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes qc-float-1{0%,100%{transform:translateY(-5px)}50%{transform:translateY(8px)}}
        @keyframes qc-float-2{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes qc-float-3{0%,100%{transform:translateY(-4px)}50%{transform:translateY(9px)}}
        @keyframes qc-ring{0%{opacity:0.7;transform:scale(0.7)}100%{opacity:0;transform:scale(2.2)}}
        @keyframes qc-pop{from{opacity:0;transform:translateY(22px) scale(0.88)}to{opacity:1;transform:none}}
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? "1rem" : "1.5rem", marginBottom: "2.5rem", padding: "0.5rem 0 1.5rem" }}>
        {quickCircles.map((circle, i) => (
          <QuickCircle key={circle.action} {...circle} floatIdx={i} small={isMobile} onClick={() => onNavigate(circle.action)} />
        ))}
      </div>

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
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#4472b8,#6da3d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'Outfit',sans-serif" }}>
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

      {/* Movement website banner — soft plum, no harsh blue */}
      <a
        href="https://ywp-online.my.canva.site/manhigot2026"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "1.15rem 1.6rem",
          background: "linear-gradient(135deg, #1a2f5e 0%, #2a4a8e 60%, #4472b8 100%)",
          borderRadius: 16,
          textDecoration: "none", cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 6px 22px rgba(29,72,150,0.22)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(29,72,150,0.32)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 22px rgba(29,72,150,0.22)"; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#daeaf8" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 2px", fontFamily: "'Outfit',sans-serif" }}>Manhigut Shava Website</p>
          <p style={{ fontSize: 12, color: "rgba(218,234,248,0.7)", margin: 0 }}>ywp-online.my.canva.site/manhigot2026</p>
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

  /* Tab switch — resets back-history so pressing back never returns to a random tab */
  const switchTab = useCallback((s) => {
    localStorage.setItem("section", s);
    setSection(s);
    setProfileTarget(null);
    setChatTarget(null);
    setNavHistory([s]);
  }, []);

  /* Deep navigation — view profile, open specific chat, etc. — pushes history */
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
      setProfileTarget(null);
      setChatTarget(null);
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
    { id: "chat",      label: t.nav.messages,   icon: Icon.chat       },
    { id: "members",   label: t.nav.support,    icon: Icon.members    },
    { id: "profile",   label: t.nav.profile,    icon: Icon.profile    },
    ...(profile?.isAdmin ? [{ id: "admin", label: t.nav.admin, icon: Icon.admin }] : []),
  ];

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const isMobile = useIsMobile();
  const sidebarW = sidebarExpanded ? 220 : 68;
  const pageTitle = navItems.find((n) => n.id === section)?.label || t.nav.home;
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh",
      /* 100dvh = shrinks as mobile browser chrome shows/hides; fallback to 100vh */
      fontFamily: "'Figtree','Outfit',system-ui,-apple-system,sans-serif",
      direction: dir,
      overflow: "hidden",
    }}>
      {/* ── Row that holds sidebar + main (fills all space above bottom nav) ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>

      {/* ── Sidebar — expandable (hidden on mobile) ── */}
      <aside style={{
        width: isMobile ? 0 : sidebarW,
        minWidth: isMobile ? 0 : sidebarW,
        background: "linear-gradient(180deg, #1a2f5e 0%, #162548 100%)",
        display: isMobile ? "none" : "flex", flexDirection: "column",
        alignItems: sidebarExpanded ? "stretch" : "center",
        paddingTop: "1rem", paddingBottom: "1rem",
        gap: "6px", zIndex: 30,
        borderRight: "1px solid rgba(218,234,248,0.08)",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>
        {/* Logo row — with BogrotNet text when expanded */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          paddingLeft: sidebarExpanded ? 12 : 0,
          marginBottom: "0.85rem", flexShrink: 0,
          justifyContent: sidebarExpanded ? "flex-start" : "center",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, flexShrink: 0,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 4px 14px rgba(68,114,184,0.35)",
            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src="/NewLogoNGO.png"
              onError={e => { e.currentTarget.parentElement.style.background = "linear-gradient(135deg,#4472b8,#1d4896)"; e.currentTarget.style.display = "none"; }}
              alt="BogrotNet"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          {sidebarExpanded && (
            <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.01em" }}>
              BogrotNet
            </span>
          )}
        </div>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setSidebarExpanded(e => !e)}
          title={sidebarExpanded ? "Collapse" : "Expand"}
          style={{
            width: sidebarExpanded ? "calc(100% - 24px)" : 46, height: 36,
            margin: sidebarExpanded ? "0 12px" : "0 auto",
            display: "flex", alignItems: "center",
            justifyContent: sidebarExpanded ? "space-between" : "center",
            paddingLeft: sidebarExpanded ? 10 : 0, paddingRight: sidebarExpanded ? 10 : 0,
            borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(218,234,248,0.7)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          {sidebarExpanded && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Menu</span>}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: sidebarExpanded ? "rotate(180deg)" : "none", transition: "transform 0.22s" }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <div style={{ width: sidebarExpanded ? "calc(100% - 24px)" : 28, height: 1, background: "rgba(218,234,248,0.12)", margin: sidebarExpanded ? "0.4rem 12px" : "0.4rem auto" }} />

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, width: "100%",
          paddingLeft: sidebarExpanded ? 8 : 0, paddingRight: sidebarExpanded ? 8 : 0,
          alignItems: sidebarExpanded ? "stretch" : "center" }}>
          {navItems.map((item) => (
            <NavBtn
              key={item.id} item={item}
              active={section === item.id}
              badge={item.id === "chat" ? unreadDMs : 0}
              onClick={() => switchTab(item.id)}
              expanded={sidebarExpanded}
            />
          ))}
        </nav>

        {/* Logout + avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: sidebarExpanded ? "stretch" : "center",
          gap: "10px", paddingLeft: sidebarExpanded ? 8 : 0, paddingRight: sidebarExpanded ? 8 : 0 }}>
          <NavBtn
            item={{ id: "logout", label: t.nav.logout, icon: Icon.logout }}
            active={false} badge={0} onClick={logout} expanded={sidebarExpanded}
          />
          <div style={{ position: "relative", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            paddingLeft: sidebarExpanded ? 12 : 0,
            justifyContent: sidebarExpanded ? "flex-start" : "center" }}
            onClick={() => switchTab("profile")} title={t.nav.profile}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {avatarUrl(profile) ? (
                <img src={avatarUrl(profile)} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(218,234,248,0.25)" }} alt="" />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4472b8, #6da3d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", border: "2px solid rgba(218,234,248,0.2)", fontFamily: "'Outfit',sans-serif" }}>{initials}</div>
              )}
              <span style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "var(--online)", border: "2px solid #1a2f5e" }} />
            </div>
            {sidebarExpanded && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(218,234,248,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile?.firstName || ""} {profile?.lastName || ""}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg-secondary)", position: "relative" }}>
        {/* Floating water blob background */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
          {/* Blob 1 — large blue, top-right */}
          <div style={{ position:"absolute", width:"58%", height:"115%", top:"-18%", right:"-10%",
            background:"radial-gradient(ellipse at center, rgba(68,114,184,0.09) 0%, transparent 68%)",
            animation:"dash-blob-1 26s ease-in-out infinite", willChange:"border-radius, transform" }}/>
          {/* Blob 2 — medium blue, center-left */}
          <div style={{ position:"absolute", width:"44%", height:"78%", top:"22%", left:"-8%",
            background:"radial-gradient(ellipse at center, rgba(68,114,184,0.07) 0%, transparent 68%)",
            animation:"dash-blob-2 20s 5s ease-in-out infinite", willChange:"border-radius, transform" }}/>
          {/* Blob 3 — coral, upper area */}
          <div style={{ position:"absolute", width:"40%", height:"62%", top:"-6%", left:"20%",
            background:"radial-gradient(ellipse at center, rgba(232,115,90,0.07) 0%, transparent 68%)",
            animation:"dash-blob-3 30s 9s ease-in-out infinite", willChange:"border-radius, transform" }}/>
          {/* Blob 4 — blue, lower-right */}
          <div style={{ position:"absolute", width:"42%", height:"68%", bottom:"-20%", right:"6%",
            background:"radial-gradient(ellipse at center, rgba(68,114,184,0.06) 0%, transparent 68%)",
            animation:"dash-blob-4 23s 14s ease-in-out infinite", willChange:"border-radius, transform" }}/>

          {/* Side bubbles — left edge */}
          {[{s:32,t:"15%",l:-8,c:"rgba(68,114,184,0.13)",d:"21s",dl:"0s"},{s:20,t:"32%",l:6,c:"rgba(68,114,184,0.09)",d:"26s",dl:"3s"},{s:42,t:"52%",l:-10,c:"rgba(68,114,184,0.08)",d:"18s",dl:"7s"},{s:24,t:"70%",l:4,c:"rgba(68,114,184,0.11)",d:"23s",dl:"11s"},{s:16,t:"85%",l:10,c:"rgba(232,115,90,0.09)",d:"19s",dl:"5s"}].map((b,i)=>(
            <div key={`bl${i}`} style={{
              position:"absolute", width:b.s, height:b.s, borderRadius:"50%",
              top:b.t, left:b.l, background:b.c,
              border:`1px solid ${b.c.replace(/[\d.]+\)$/,"0.2)")}`,
              animation:`side-bubble-${i} ${b.d} ${b.dl} ease-in-out infinite`,
            }}/>
          ))}
          {/* Side bubbles — right edge */}
          {[{s:28,t:"20%",r:-6,c:"rgba(232,115,90,0.11)",d:"24s",dl:"2s"},{s:38,t:"40%",r:-12,c:"rgba(68,114,184,0.08)",d:"20s",dl:"6s"},{s:22,t:"60%",r:4,c:"rgba(232,115,90,0.09)",d:"27s",dl:"9s"},{s:34,t:"78%",r:-8,c:"rgba(68,114,184,0.1)",d:"22s",dl:"13s"},{s:18,t:"90%",r:8,c:"rgba(232,115,90,0.08)",d:"17s",dl:"4s"}].map((b,i)=>(
            <div key={`br${i}`} style={{
              position:"absolute", width:b.s, height:b.s, borderRadius:"50%",
              top:b.t, right:b.r, background:b.c,
              border:`1px solid ${b.c.replace(/[\d.]+\)$/,"0.18)")}`,
              animation:`side-bubble-${i+5} ${b.d} ${b.dl} ease-in-out infinite`,
            }}/>
          ))}
        </div>
        <style>{`
          @keyframes dash-blob-1{
            0%,100%{border-radius:62% 38% 52% 48%/44% 56% 44% 56%;transform:translate(0,0) scale(1);}
            33%{border-radius:40% 60% 65% 35%/58% 42% 62% 38%;transform:translate(-18px,-30px) scale(1.04);}
            66%{border-radius:55% 45% 38% 62%/36% 60% 40% 64%;transform:translate(14px,22px) scale(0.97);}
          }
          @keyframes dash-blob-2{
            0%,100%{border-radius:52% 48% 60% 40%/44% 56% 48% 52%;transform:translate(0,0) rotate(0deg);}
            50%{border-radius:38% 62% 44% 56%/60% 40% 56% 44%;transform:translate(24px,-20px) rotate(4deg);}
          }
          @keyframes dash-blob-3{
            0%,100%{border-radius:55% 45% 50% 50%/48% 52% 44% 56%;transform:translate(0,0);}
            40%{border-radius:45% 55% 62% 38%/56% 44% 52% 48%;transform:translate(14px,26px);}
            80%{border-radius:62% 38% 48% 52%/40% 60% 56% 44%;transform:translate(-10px,-16px);}
          }
          @keyframes dash-blob-4{
            0%,100%{border-radius:48% 52% 56% 44%/52% 48% 60% 40%;transform:translate(0,0);}
            50%{border-radius:62% 38% 40% 60%/40% 60% 44% 56%;transform:translate(-16px,22px);}
          }
          @keyframes slideRight{from{opacity:0;transform:translate(-8px,-50%)}to{opacity:1;transform:translate(0,-50%)}}
          @keyframes side-bubble-0{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-22px) scale(1.06)}}
          @keyframes side-bubble-1{0%,100%{transform:translateY(-8px)}50%{transform:translateY(16px)}}
          @keyframes side-bubble-2{0%,100%{transform:translateY(5px) scale(0.96)}50%{transform:translateY(-20px) scale(1.04)}}
          @keyframes side-bubble-3{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
          @keyframes side-bubble-4{0%,100%{transform:translateY(-4px) scale(1)}50%{transform:translateY(12px) scale(1.08)}}
          @keyframes side-bubble-5{0%,100%{transform:translateY(0) scale(1.02)}50%{transform:translateY(-18px) scale(0.97)}}
          @keyframes side-bubble-6{0%,100%{transform:translateY(-6px)}50%{transform:translateY(20px)}}
          @keyframes side-bubble-7{0%,100%{transform:translateY(4px) scale(1)}50%{transform:translateY(-16px) scale(1.05)}}
          @keyframes side-bubble-8{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
          @keyframes side-bubble-9{0%,100%{transform:translateY(-10px) scale(0.98)}50%{transform:translateY(14px) scale(1.03)}}
        `}</style>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>

          {/* Top bar */}
          {section !== "chat" && (
            <header style={{
              height: 60, minHeight: 60,
              background: "var(--bg-primary)",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              padding: isMobile ? "0 1rem" : "0 1.75rem", gap: "0.85rem", zIndex: 10,
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

              {!isMobile && <LangSwitcher lang={lang} setLang={setLang} />}

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

              {/* User chip — hidden on mobile */}
              {!isMobile && (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "4px 12px 4px 5px", borderRadius: 99,
                    background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                    cursor: "pointer", transition: "border-color 0.2s",
                  }}
                  onClick={() => switchTab("profile")}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--brand)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  {avatarUrl(profile) ? (
                    <img src={avatarUrl(profile)} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} alt="" />
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #4472b8, #6da3d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff", fontFamily: "'Outfit',sans-serif" }}>{initials}</div>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                    {profile?.firstName || t.nav.profile}
                  </span>
                </div>
              )}
            </header>
          )}

          {/* Page content */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
            {section === "home"      && <HomePage user={user} profile={profile} onNavigate={switchTab} onViewProfile={(userId) => navigate("profile", { userId })} />}
            {section === "community" && <CommunityPage onViewProfile={(userId) => navigate("profile", { userId })} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "chat"      && <ChatPage onUnreadChange={setUnreadDMs} onViewProfile={(userId) => navigate("profile", { userId })} openChatWithUserId={chatTarget} />}
            {section === "members"   && <SupportPage onViewProfile={(userId) => navigate("profile", { userId })} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "profile"   && <ProfilePage viewUserId={profileTarget} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "admin"     && <AdminPage />}
          </div>
        </div>
      </main>

      </div>{/* end row (sidebar + main) */}

      {/* ── Mobile bottom navigation bar — flex sibling, not position:fixed ── */}
      {isMobile && (
        <nav style={{
          flexShrink: 0,
          background: "var(--sidebar-bg)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "stretch",
          height: "calc(56px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          zIndex: 50,
        }}>
          {navItems.map((item) => {
            const isActive = section === item.id;
            const hasBadge = item.id === "chat" && unreadDMs > 0;
            return (
              <button
                key={item.id}
                onClick={() => switchTab(item.id)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: isActive ? "#daeaf8" : "rgba(218,234,248,0.45)",
                  position: "relative",
                  transition: "color 0.18s ease",
                }}
              >
                {isActive && (
                  <span style={{
                    position: "absolute", top: 0, left: "20%", right: "20%",
                    height: 2, borderRadius: 99,
                    background: "linear-gradient(90deg, #4472b8, #6da3d4)",
                  }} />
                )}
                <span style={{ position: "relative", flexShrink: 0 }}>
                  {item.icon}
                  {hasBadge && (
                    <span style={{
                      position: "absolute", top: -4, right: -6,
                      minWidth: 16, height: 16, borderRadius: 99,
                      background: "#e8735a", color: "#fff",
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px",
                    }}>
                      {unreadDMs > 9 ? "9+" : unreadDMs}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: isActive ? 600 : 400, letterSpacing: "0.01em" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
