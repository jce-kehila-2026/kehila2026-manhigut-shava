import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { doc, updateDoc, writeBatch, collection, getDocs, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import { useIsMobile } from "./hooks/useIsMobile";
import SupportPage          from "./SupportPage";
import CommunityPage        from "./CommunityPage";
import ProfilePage          from "./ProfilePage";
import AdminPage            from "./AdminPage";
import ChatPage             from "./ChatPage";
import { isBirthdayToday, daysUntilBirthday } from "./utils/birthday";
import { SlideshowBanner } from "./components/SlideshowBanner";
import { TutorialPopup } from "./components/TutorialPopup";
import { translateProfession } from "./utils/translateProfile";

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
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
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
            ? "rgba(68,114,184,0.24)"
            : hover ? "rgba(255,255,255,0.07)" : "transparent",
          color: active ? "#ffffff" : hover ? "#fff" : "rgba(218,234,248,0.55)",
          border: "none", cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {active && (
          <span style={{
            position: "absolute", left: expanded ? 0 : -10, top: 10, bottom: 10,
            width: 3, borderRadius: 99,
            background: "#e8735a",
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

/* ── Bottom tab bar (mobile) ── */
function BottomTabs({ items, section, navigate, unreadDMs }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
      background: "linear-gradient(180deg,#1a2f5e 0%,#162548 100%)",
      borderTop: "1px solid rgba(218,234,248,0.08)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      zIndex: 50, paddingBottom: "env(safe-area-inset-bottom,0px)",
    }}>
      {items.map((item) => {
        const active = section === item.id;
        const badge = item.id === "chat" ? unreadDMs : 0;
        return (
          <button key={item.id} onClick={() => navigate(item.id)} style={{
            flex: 1, height: "100%", border: "none", background: "transparent",
            color: active ? "#daeaf8" : "rgba(218,234,248,0.55)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, cursor: "pointer", position: "relative",
          }}>
            <span style={{ transform: "scale(0.85)" }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            {badge > 0 && (
              <span style={{
                position: "absolute", top: 6, right: "28%",
                minWidth: 14, height: 14, borderRadius: 99,
                background: "#e8735a", color: "#fff",
                fontSize: 8, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
              }}>{badge > 99 ? "99+" : badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ── Language switcher ── */
function LangSwitcher({ lang, onChangeLang }) {
  const langs = [{ code: "en", label: "EN" }, { code: "he", label: "עב" }, { code: "ar", label: "عر" }];
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--bg-tertiary)", borderRadius: 99, padding: 3 }}>
      {langs.map(({ code, label }) => (
        <button key={code} onClick={() => onChangeLang(code)} style={{
          padding: "4px 9px", borderRadius: 99, border: "none",
          background: lang === code ? "var(--brand)" : "transparent",
          color: lang === code ? "#fff" : "var(--text-muted)",
          fontSize: 10, fontWeight: 600, cursor: "pointer",
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
  marginBottom: "0.6rem",
  fontFamily: "'Figtree',system-ui,sans-serif",
};

/* ── Quick-access circle with sonar rings ── */
function QuickCircle({ imgSrc, title, desc, coral, floatIdx, onClick, isMobile, vertical, tutId }) {
  const [hov, setHov] = useState(false);
  const color = coral ? "#e8735a" : "#4472b8";
  const size = isMobile ? "min(90px, calc(25vw - 14px))" : vertical ? "110px" : "120px";
  const imgSize = isMobile ? "min(58px, calc(17vw))" : vertical ? "64px" : "72px";
  const ringInset = vertical ? 18 : 22;
  const floatAnim = isMobile ? "none" : `qc-float-${floatIdx % 4} ${4.5 + floatIdx * 0.5}s ${floatIdx * 0.6}s ease-in-out infinite`;
  return (
    <div id={tutId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: isMobile ? 4 : 10, cursor:"pointer",
      animation:"qc-pop 0.55s ease both", animationDelay:`${floatIdx * 0.12}s` }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ position:"relative", animation: floatAnim }}>
        {!isMobile && [1,2].map(r => (
          <div key={r} style={{
            position:"absolute", borderRadius:"50%",
            inset: -(r * ringInset),
            border:`1.5px solid ${coral ? `rgba(232,115,90,${0.22 - r*0.08})` : `rgba(68,114,184,${0.18 - r*0.07})`}`,
            animation:`qc-ring ${2.8 + r * 0.6}s ${r * 0.55}s ease-out infinite`,
            pointerEvents:"none",
          }}/>
        ))}
        <div style={{
          width:size, height:size, borderRadius:"50%",
          background: coral ? "rgba(232,115,90,0.07)" : "rgba(68,114,184,0.06)",
          border:`2px solid ${hov ? color : (coral ? "rgba(232,115,90,0.32)" : "rgba(68,114,184,0.22)")}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"border-color 0.26s, box-shadow 0.26s, transform 0.26s",
          transform: hov ? "scale(1.08)" : "scale(1)",
          boxShadow: hov ? `0 12px 30px ${coral ? "rgba(232,115,90,0.28)" : "rgba(68,114,184,0.22)"}` : "0 2px 10px rgba(0,0,0,0.05)",
          position:"relative", zIndex:1,
        }}>
          <img src={imgSrc} alt={title} style={{ width:imgSize, height:imgSize, objectFit:"contain",
            transition:"transform 0.26s", transform: hov ? "scale(1.12)" : "scale(1)", display:"block" }} />
        </div>
      </div>
      <p style={{ fontSize: isMobile ? 12 : vertical ? 11 : 13, fontWeight:700, color, margin:0, textAlign:"center", maxWidth: isMobile ? "calc(44vw - 16px)" : 140, lineHeight: 1.2 }}>{title}</p>
      {!isMobile && !vertical && (
        <p style={{ fontSize:11, color:"var(--text-muted)", margin:0, textAlign:"center", maxWidth:130,
          lineHeight:1.5, fontWeight:400, minHeight:"2.4em",
          opacity: hov ? 1 : 0, transition:"opacity 0.18s ease" }}>{desc}</p>
      )}
    </div>
  );
}

/* ── Home page (overview) ── */
function HomePage({ user, profile, onNavigate, onViewProfile }) {
  const [suggested, setSuggested]       = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const { t, lang } = useLang();
  const isMobile = useIsMobile(1024); // single-column below 1024px (covers split-screen & tablets)

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "helpRequests"),
      where("toId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, snap =>
      setHelpRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user]);

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : "?";

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(query(collection(db, "users"), limit(40))),
      getDocs(query(collection(db, "conversations"), where("participants", "array-contains", user.uid))),
    ]).then(([usersSnap, convsSnap]) => {
      const alreadyTalkedTo = new Set(
        convsSnap.docs.flatMap(d => (d.data().participants || []).filter(id => id !== user.uid))
      );
      const others = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== user.uid && u.profession && !alreadyTalkedTo.has(u.id));
      others.sort((a, b) => ((b.lastSeen ?? "") > (a.lastSeen ?? "") ? 1 : -1));
      setSuggested(others.slice(0, 4));
    });
  }, [user]);

  const pendingRequests = helpRequests.filter((r) => !r.status);

  const quickCircles = [
    { imgSrc: "/FindHelpSymbol.png",  title: t.dash.goToSupport,   desc: t.dash.descSupport,   action: "members",   coral: true  },
    { imgSrc: "/CommunitySymbol.png", title: t.dash.goToCommunity, desc: t.dash.descCommunity, action: "community", coral: false },
    { imgSrc: "/ChatSymbol.png",      title: t.dash.goToMessages,  desc: t.dash.descMessages,  action: "chat",      coral: true  },
    { imgSrc: "/ProfileSymbol.png",   title: t.dash.goToProfile,   desc: t.dash.descProfile,   action: "profile",   coral: false },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", maxWidth: "100%", padding: isMobile ? "1.25rem 1rem 1.5rem" : "2.25rem 2.75rem" }}>

      {/* Shared keyframes */}
      <style>{`
        @keyframes qc-float-0{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes qc-float-1{0%,100%{transform:translateY(-5px)}50%{transform:translateY(8px)}}
        @keyframes qc-float-2{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes qc-float-3{0%,100%{transform:translateY(-4px)}50%{transform:translateY(9px)}}
        @keyframes qc-ring{0%{opacity:0.7;transform:scale(0.7)}100%{opacity:0;transform:scale(2.2)}}
        @keyframes qc-pop{from{opacity:0;transform:translateY(22px) scale(0.88)}to{opacity:1;transform:none}}
      `}</style>

      {/* Profile nudge — slim strip at top on mobile, sidebar card on desktop */}
      {(() => {
        const fields = [
          profile?.firstName, profile?.lastName, profile?.phone,
          profile?.region,
          profile?.profession || profile?.currentRole,
          profile?.bio,
          profile?.birthDate || profile?.birthdate,
          profile?.helpAreas?.length > 0,
        ];
        const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
        if (pct >= 100) return null;
        if (isMobile) return (
          <div onClick={() => onNavigate("profile")} style={{
            display:"flex", alignItems:"center", gap:10,
            background:"var(--bg-primary,#fff)",
            border:"1px solid rgba(232,115,90,0.2)",
            borderRadius:10, padding:"8px 12px",
            cursor:"pointer", marginBottom:"0.75rem",
          }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--text-primary,#111827)" }}>
                  {t.dash?.completeProfileTitle || "Complete your profile"}
                </span>
                <span style={{ fontSize:13, fontWeight:800, color:"#e8735a" }}>{pct}%</span>
              </div>
              <div style={{ height:4, borderRadius:99, background:"rgba(68,114,184,0.13)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:"linear-gradient(90deg,#4472b8,#e8735a)", transition:"width 0.6s" }} />
              </div>
            </div>
            <span style={{ fontSize:11, color:"var(--text-muted,#6b7280)", whiteSpace:"nowrap" }}>→</span>
          </div>
        );
        return null; // desktop version rendered inside right sidebar below
      })()}

      {/* Two-column layout on desktop, single column on mobile */}
      <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: isMobile ? undefined : "1fr 300px", gap: "1.5rem", alignItems: "start" }}>

        {/* LEFT (desktop) / TOP (mobile): circles + slideshow */}
        <div>
          {/* Mobile: 4-column grid above slideshow */}
          {isMobile && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.4rem",
              marginBottom:"1rem", padding:"0 0 0.25rem", placeItems:"center" }}>
              {quickCircles.map((item, i) => (
                <QuickCircle key={item.action} {...item} tutId={`tut-${item.action}`} floatIdx={i} isMobile={true} onClick={() => onNavigate(item.action)} />
              ))}
            </div>
          )}

          {/* Desktop: circles column on left + slideshow on right */}
          {!isMobile && (
            <div style={{ display:"flex", gap:"1.5rem", alignItems:"flex-start" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", paddingInline:"0.25rem" }}>
                {quickCircles.map((item, i) => (
                  <QuickCircle key={item.action} {...item} tutId={`tut-${item.action}`} floatIdx={i} isMobile={false} vertical onClick={() => onNavigate(item.action)} />
                ))}
              </div>
              <div style={{ flex:1 }}>
                <SlideshowBanner maxHeight={520} />
              </div>
            </div>
          )}

          {/* Mobile slideshow */}
          {isMobile && <SlideshowBanner maxHeight={220} />}

          {/* On mobile: help requests + suggestions appear below slideshow */}
          {isMobile && (
            <>
              {pendingRequests.length > 0 && (
                <div style={{ marginTop:"0.75rem" }}>
                  <p style={eyebrow}>{t.dash.pendingHelp} ({pendingRequests.length})</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                    {pendingRequests.slice(0, 2).map((r) => (
                      <div key={r.id} style={{ padding:"0.7rem 0.85rem", display:"flex", alignItems:"center", gap:"0.65rem", background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:10, borderLeft:"3px solid #e8735a" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", margin:0 }}>{r.fromUserName}</p>
                          <p style={{ fontSize:10, color:"var(--text-muted)", margin:0 }}>{r.fromUserProfession || r.fromUserEmail}</p>
                        </div>
                        <button onClick={() => onNavigate("members")} style={{ padding:"4px 10px", borderRadius:99, background:"var(--brand)", color:"#fff", border:"none", fontSize:10, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                          {t.dash.viewReq}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {suggested.length > 0 && (
                <div style={{ marginTop:"0.75rem" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
                    <p style={{ ...eyebrow, marginBottom:0 }}>{t.dash.suggestedMembers}</p>
                    <button onClick={() => onNavigate("members")} style={{ fontSize:11, color:"var(--brand)", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>{t.dash.viewAll}</button>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                    {suggested.slice(0, 3).map((u) => {
                      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
                      const online = isActuallyOnline(u);
                      const av = avatarUrl(u);
                      return (
                        <div key={u.id} onClick={() => onViewProfile(u.id)} style={{ display:"flex", alignItems:"center", gap:"0.6rem", background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:10, padding:"0.55rem 0.75rem", cursor:"pointer" }}>
                          <div style={{ position:"relative", flexShrink:0, width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#4472b8,#e8735a)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                            {av ? <img src={av} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>{name[0]?.toUpperCase()}</span>}
                            {online && <div style={{ position:"absolute", bottom:0, right:0, width:7, height:7, borderRadius:"50%", background:"#4ade80", border:"1.5px solid var(--bg-primary)" }} />}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                            {u.profession && <p style={{ fontSize:10, color:"var(--text-muted)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.professionTranslations?.[lang] || translateProfession(u.profession, lang)}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT sidebar — desktop only */}
        {!isMobile && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

            {/* Compact profile nudge (desktop sidebar) */}
            {(() => {
              const fields = [
                profile?.firstName, profile?.lastName, profile?.phone,
                profile?.region,
                profile?.profession || profile?.currentRole,
                profile?.bio,
                profile?.birthDate || profile?.birthdate,
                profile?.helpAreas?.length > 0,
              ];
              const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
              if (pct >= 100) return null;
              return (
                <div onClick={() => onNavigate("profile")} style={{
                  background:"var(--bg-primary,#fff)",
                  border:"1px solid rgba(232,115,90,0.22)",
                  borderRadius:14, padding:"0.9rem 1rem",
                  cursor:"pointer",
                  boxShadow:"0 2px 10px rgba(232,115,90,0.07)",
                  transition:"transform 0.18s, box-shadow 0.18s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(232,115,90,0.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 10px rgba(232,115,90,0.07)"; }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary,#111827)" }}>
                      {t.dash?.completeProfileTitle || "Complete Your Profile"}
                    </span>
                    <span style={{ fontSize:16, fontWeight:800, color:"#e8735a" }}>{pct}%</span>
                  </div>
                  <div style={{ height:5, borderRadius:99, background:"rgba(68,114,184,0.13)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:"linear-gradient(90deg,#4472b8,#e8735a)", transition:"width 0.6s" }} />
                  </div>
                  <p style={{ fontSize:11, color:"var(--text-muted,#6b7280)", margin:"5px 0 0", fontWeight:500 }}>
                    {t.dash?.completeProfileCta || "Tap to complete →"}
                  </p>
                </div>
              );
            })()}

            {/* Help Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <p style={eyebrow}>{t.dash.pendingHelp} ({pendingRequests.length})</p>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  {pendingRequests.slice(0, 3).map((r) => (
                    <div key={r.id} style={{ padding:"0.85rem 1rem", display:"flex", alignItems:"center", gap:"0.75rem", background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:12, borderLeft:"3px solid #e8735a" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:1 }}>{r.fromUserName}</p>
                        <p style={{ fontSize:10, color:"var(--text-muted)" }}>{r.fromUserProfession || r.fromUserEmail}</p>
                      </div>
                      <button onClick={() => onNavigate("members")} style={{ padding:"5px 12px", borderRadius:99, background:"var(--brand)", color:"#fff", border:"none", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                        {t.dash.viewReq}
                      </button>
                    </div>
                  ))}
                  {pendingRequests.length > 3 && (
                    <button onClick={() => onNavigate("members")} style={{ fontSize:12, color:"var(--brand)", background:"none", border:"none", cursor:"pointer", textAlign:"left", fontWeight:600, padding:"2px 0" }}>
                      {t.dash.moreReqs(pendingRequests.length - 3)}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Suggested members */}
            {suggested.length > 0 && (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.6rem" }}>
                  <p style={{ ...eyebrow, marginBottom:0 }}>{t.dash.suggestedMembers}</p>
                  <button onClick={() => onNavigate("members")} style={{ fontSize:11, color:"var(--brand)", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>{t.dash.viewAll}</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  {suggested.map((u) => {
                    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
                    const online = isActuallyOnline(u);
                    const av = avatarUrl(u);
                    return (
                      <div key={u.id} onClick={() => onViewProfile(u.id)} style={{ display:"flex", alignItems:"center", gap:"0.65rem", background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:12, padding:"0.65rem 0.85rem", cursor:"pointer", transition:"box-shadow 0.18s" }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 14px rgba(68,114,184,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.boxShadow=""}>
                        <div style={{ position:"relative", flexShrink:0, width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#4472b8,#e8735a)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                          {av ? <img src={av} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{name[0]?.toUpperCase()}</span>}
                          {online && <div style={{ position:"absolute", bottom:1, right:1, width:8, height:8, borderRadius:"50%", background:"#4ade80", border:"1.5px solid var(--bg-primary)" }} />}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                          {u.profession && <p style={{ fontSize:10, color:"var(--text-muted)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.professionTranslations?.[lang] || translateProfession(u.profession, lang)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}{/* end right sidebar */}
      </div>{/* end two-column grid */}


    </div>
  );
}


/* ── Main dashboard shell ── */
export default function DashboardPage() {
  const { user, profile, logout } = useAuth();
  const { lang, setLang, setLangPermanent, t, isRTL } = useLang();
  const { dark, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const [section,    setSection]    = useState("home");
  const [navHistory, setNavHistory] = useState(["home"]);
  const [unreadDMs,  setUnreadDMs]  = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const notifBellRef = useRef(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);
  const [langChangeCode, setLangChangeCode] = useState(null); // pending lang change confirmation
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  /* Sync browser history with app navigation so the browser back button stays within the app */
  useEffect(() => {
    window.history.replaceState({ section: "home", profileTarget: null, chatTarget: null }, "");

    const handlePopState = (event) => {
      const state = event.state;
      if (!state?.section) return;
      setSection(state.section);
      sessionStorage.setItem("section", state.section);
      setProfileTarget(state.profileTarget ?? null);
      setChatTarget(state.chatTarget ?? null);
      setNavHistory([state.section]);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* Tab switch — resets back-history so pressing back never returns to a random tab */
  const switchTab = useCallback((s) => {
    sessionStorage.setItem("section", s);
    setSection(s);
    setProfileTarget(null);
    setChatTarget(null);
    setNavHistory([s]);
    window.history.pushState({ section: s, profileTarget: null, chatTarget: null }, "");
  }, []);

  /* Deep navigation — view profile, open specific chat, etc. — pushes history */
  const navigate = useCallback((s, options = {}) => {
    sessionStorage.setItem("section", s);
    setSection(s);
    const newProfileTarget = s === "profile" ? (options.userId || null) : null;
    const newChatTarget = s === "chat" ? (options.userId || null) : null;
    setProfileTarget(newProfileTarget);
    setChatTarget(newChatTarget);
    setNavHistory((prev) => {
      if (prev[prev.length - 1] === s) return prev;
      window.history.pushState({ section: s, profileTarget: newProfileTarget, chatTarget: newChatTarget }, "");
      return [...prev, s];
    });
  }, []);

  const goBack = useCallback(() => {
    setNavHistory((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const prevSection = next[next.length - 1];
      sessionStorage.setItem("section", prevSection);
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

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid)
    );
    return onSnapshot(q,
      (snap) => {
        const toStr = (v) => {
          if (!v) return "";
          if (typeof v === "string") return v;
          if (typeof v.toDate === "function") return v.toDate().toISOString();
          return String(v);
        };
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => toStr(b.createdAt).localeCompare(toStr(a.createdAt)))
          .slice(0, 50);
        setNotifications(items);
      },
      (err) => console.error("notifications listener:", err)
    );
  }, [user]);

  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (notifBellRef.current && !notifBellRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  const markNotifsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit().catch(console.error);
  }, [notifications]);

  const clearAllNotifs = useCallback(async () => {
    if (!notifications.length) return;
    const batch = writeBatch(db);
    notifications.forEach(n => batch.delete(doc(db, "notifications", n.id)));
    await batch.commit().catch(console.error);
    setShowNotifs(false);
  }, [notifications]);

  const handleNotifClick = useCallback((n) => {
    if (!n.read) {
      updateDoc(doc(db, "notifications", n.id), { read: true }).catch(() => {});
    }
    setShowNotifs(false);
    if (n.type === "new_message") {
      navigate("chat", { userId: n.fromUserId });
    } else if (n.type === "help_request") {
      switchTab("members");
    } else if (n.type === "post_like" || n.type === "post_comment") {
      switchTab("community");
    } else if (n.type === "birthday_wish") {
      navigate("profile", { userId: n.fromUserId });
    }
  }, [navigate, switchTab]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "?").toUpperCase();

  const navItems = [
    { id: "home",      label: t.nav.home,       icon: Icon.home       },
    { id: "community", label: t.nav.community,  icon: Icon.community  },
    { id: "chat",      label: t.nav.messages,   icon: Icon.chat       },
    { id: "members",   label: t.nav.support,    icon: Icon.members    },
    { id: "profile",   label: t.nav.profile,    icon: Icon.profile    },
    ...(profile?.isAdmin ? [{ id: "admin", label: t.nav.admin, icon: Icon.admin }] : []),
  ];

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarW = isMobile ? 0 : (sidebarExpanded ? 220 : 68);
  const pageTitle = navItems.find((n) => n.id === section)?.label || t.nav.home;
  const dir = isRTL ? "rtl" : "ltr";

  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (profile && !sessionStorage.getItem("welcomed")) {
      setShowWelcome(true);
    }
  }, [profile]);

  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialChecked = useRef(false);
  useEffect(() => {
    if (!profile || tutorialChecked.current) return;
    tutorialChecked.current = true;
    if (profile.tutorialDone === false) setShowTutorial(true);
  }, [profile]);

  const [tutorialBtnHidden, setTutorialBtnHidden] = useState(
    () => localStorage.getItem("tutorialBtnHidden") === "true"
  );
  const [tutorialBtnPos, setTutorialBtnPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tutorialBtnPos")) || null; } catch { return null; }
  });
  const [tutorialBtnHover, setTutorialBtnHover] = useState(false);
  const tutorialDragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  function getTutorialBtnDefaultPos() {
    return { right: 16, bottom: isMobile ? 72 : 24 };
  }

  function tutorialBtnPointerDown(e) {
    const container = e.currentTarget.closest ? e.currentTarget.parentElement : e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let latestPos = null;
    tutorialDragRef.current = {
      dragging: true, moved: false,
      startX: clientX, startY: clientY,
      origX: rect.left, origY: rect.top,
    };
    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = cx - tutorialDragRef.current.startX;
      const dy = cy - tutorialDragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) tutorialDragRef.current.moved = true;
      if (!tutorialDragRef.current.moved) return;
      const newLeft = Math.max(8, Math.min(window.innerWidth - 48, tutorialDragRef.current.origX + dx));
      const newTop  = Math.max(8, Math.min(window.innerHeight - 48, tutorialDragRef.current.origY + dy));
      latestPos = { left: newLeft, top: newTop };
      setTutorialBtnPos(latestPos);
    };
    const onUp = () => {
      if (tutorialDragRef.current.moved && latestPos) {
        localStorage.setItem("tutorialBtnPos", JSON.stringify(latestPos));
      }
      tutorialDragRef.current.dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  function hideTutorialBtnPermanently(e) {
    e.stopPropagation();
    setTutorialBtnHidden(true);
    localStorage.setItem("tutorialBtnHidden", "true");
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh",
      /* 100dvh = shrinks as mobile browser chrome shows/hides; fallback to 100vh */
      fontFamily: "'Figtree','Outfit',system-ui,-apple-system,sans-serif",
      direction: dir,
      overflow: "hidden",
    }}>
      {showTutorial && (
        <TutorialPopup onClose={() => {
          setShowTutorial(false);
          if (user?.uid) {
            updateDoc(doc(db, "users", user.uid), { tutorialDone: true }).catch(() => {});
          }
        }} />
      )}
      {/* ── Row that holds sidebar + main (fills all space above bottom nav) ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
      {/* ── Sidebar — desktop only ── */}
      {!isMobile && (
      <aside style={{
        width: isMobile ? 0 : sidebarW,
        minWidth: isMobile ? 0 : sidebarW,
        background: "linear-gradient(180deg, #1a2f5e 0%, #162548 100%)",
        display: isMobile ? "none" : "flex", flexDirection: "column",
        alignItems: sidebarExpanded ? "stretch" : "center",
        paddingTop: "calc(1rem + 3px)", paddingBottom: "1rem",
        gap: "6px", zIndex: 30,
        borderRight: "1px solid rgba(218,234,248,0.08)",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Brand accent stripe */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "#e8735a",
          zIndex: 2,
        }} />
        {/* Logo row */}
        <div onClick={() => navigate("home")} style={{
          display: "flex", alignItems: "center", gap: 10,
          paddingLeft: sidebarExpanded ? 12 : 0,
          marginBottom: "0.85rem", flexShrink: 0,
          justifyContent: sidebarExpanded ? "flex-start" : "center",
          cursor: "pointer",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, flexShrink: 0,
            background: "#ffffff",
            boxShadow: "0 0 0 2px rgba(232,115,90,0.45), 0 4px 16px rgba(68,114,184,0.3)",
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
              badge={0}
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
      )}

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg-secondary)", position: "relative", paddingBottom: isMobile ? 56 : 0 }}>
        {/* Floating water blob background — desktop only */}
        {!isMobile && (
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", width:"58%", height:"115%", top:"-18%", right:"-10%",
            background:"radial-gradient(ellipse at center, rgba(68,114,184,0.09) 0%, transparent 68%)",
            animation:"dash-blob-1 26s ease-in-out infinite", willChange:"border-radius, transform" }}/>
          <div style={{ position:"absolute", width:"44%", height:"78%", top:"22%", left:"-8%",
            background:"radial-gradient(ellipse at center, rgba(68,114,184,0.07) 0%, transparent 68%)",
            animation:"dash-blob-2 20s 5s ease-in-out infinite", willChange:"border-radius, transform" }}/>
          <div style={{ position:"absolute", width:"40%", height:"62%", top:"-6%", left:"20%",
            background:"radial-gradient(ellipse at center, rgba(232,115,90,0.07) 0%, transparent 68%)",
            animation:"dash-blob-3 30s 9s ease-in-out infinite", willChange:"border-radius, transform" }}/>
          <div style={{ position:"absolute", width:"42%", height:"68%", bottom:"-20%", right:"6%",
            background:"radial-gradient(ellipse at center, rgba(68,114,184,0.06) 0%, transparent 68%)",
            animation:"dash-blob-4 23s 14s ease-in-out infinite", willChange:"border-radius, transform" }}/>

          {[{s:32,t:"15%",l:-8,c:"rgba(68,114,184,0.13)",d:"21s",dl:"0s"},{s:20,t:"32%",l:6,c:"rgba(68,114,184,0.09)",d:"26s",dl:"3s"},{s:42,t:"52%",l:-10,c:"rgba(68,114,184,0.08)",d:"18s",dl:"7s"},{s:24,t:"70%",l:4,c:"rgba(68,114,184,0.11)",d:"23s",dl:"11s"},{s:16,t:"85%",l:10,c:"rgba(232,115,90,0.09)",d:"19s",dl:"5s"}].map((b,i)=>(
            <div key={`bl${i}`} style={{
              position:"absolute", width:b.s, height:b.s, borderRadius:"50%",
              top:b.t, left:b.l, background:b.c,
              border:`1px solid ${b.c.replace(/[\d.]+\)$/,"0.2)")}`,
              animation:`side-bubble-${i} ${b.d} ${b.dl} ease-in-out infinite`,
            }}/>
          ))}
          {[{s:28,t:"20%",r:-6,c:"rgba(232,115,90,0.11)",d:"24s",dl:"2s"},{s:38,t:"40%",r:-12,c:"rgba(68,114,184,0.08)",d:"20s",dl:"6s"},{s:22,t:"60%",r:4,c:"rgba(232,115,90,0.09)",d:"27s",dl:"9s"},{s:34,t:"78%",r:-8,c:"rgba(68,114,184,0.1)",d:"22s",dl:"13s"},{s:18,t:"90%",r:8,c:"rgba(232,115,90,0.08)",d:"17s",dl:"4s"}].map((b,i)=>(
            <div key={`br${i}`} style={{
              position:"absolute", width:b.s, height:b.s, borderRadius:"50%",
              top:b.t, right:b.r, background:b.c,
              border:`1px solid ${b.c.replace(/[\d.]+\)$/,"0.18)")}`,
              animation:`side-bubble-${i+5} ${b.d} ${b.dl} ease-in-out infinite`,
            }}/>
          ))}
        </div>
        )}
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
          {isOffline && (
            <div style={{
              background: "#7f1d1d", color: "#fca5a5",
              fontSize: 12, fontWeight: 600,
              padding: "8px 16px",
              display: "flex", alignItems: "center", gap: 8,
              flexShrink: 0,
            }}>
              <span>⚠</span>
              <span>No internet connection — some features may not work. Check your connection and refresh.</span>
            </div>
          )}
          {section !== "chat" && (
            <header style={{
              height: isMobile ? 48 : 60, minHeight: isMobile ? 48 : 60,
              background: "var(--bg-primary)",
              borderBottom: "1px solid var(--border)",
              boxShadow: "0 1px 0 var(--border), 0 2px 12px rgba(68,114,184,0.05)",
              display: "flex", alignItems: "center",
              padding: isMobile ? "0 0.75rem" : "0 1.75rem",
              gap: isMobile ? "0.5rem" : "0.85rem", zIndex: 10,
            }}>
              {canGoBack && (
                <button
                  onClick={goBack}
                  title={t.nav.goBack}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 10,
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

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{
                  fontSize: isMobile ? 14 : 18, fontWeight: 700, color: "var(--text-primary)",
                  fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.01em",
                }}>{pageTitle}</span>
                {!isMobile && (
                  <div style={{
                    height: 2, width: 28, borderRadius: 99,
                    background: "#e8735a",
                  }} />
                )}
              </div>
              <div style={{ flex: 1 }} />

              <LangSwitcher lang={lang} onChangeLang={(code) => {
                if (code === lang) return;
                setLangChangeCode(code);
              }} />

              {/* Notification bell */}
              <div ref={notifBellRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setShowNotifs(v => !v)}
                  title={t.community?.notificationsTitle || "Notifications"}
                  style={{
                    width: 34, height: 34, borderRadius: 99,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", cursor: "pointer", position: "relative",
                    transition: "all var(--t-fast)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--brand)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {Icon.bell}
                  {unreadNotifs > 0 && (
                    <span style={{
                      position: "absolute", top: 2, right: 2,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "var(--brand)", color: "#fff",
                      fontSize: 9, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1.5px solid var(--bg-primary)",
                    }}>
                      {unreadNotifs > 9 ? "9+" : unreadNotifs}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div style={{
                    position: isMobile ? "fixed" : "absolute",
                    top: isMobile ? 56 : "calc(100% + 8px)",
                    right: isMobile ? 8 : (isRTL ? "auto" : 0),
                    left: isMobile ? 8 : (isRTL ? 0 : "auto"),
                    width: isMobile ? "auto" : 320,
                    maxWidth: isMobile ? "auto" : "calc(100vw - 16px)",
                    maxHeight: 420,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-xl)",
                    boxShadow: "var(--shadow-xl)",
                    overflowY: "auto", zIndex: 200,
                    display: "flex", flexDirection: "column",
                  }}>
                    <div style={{
                      padding: "0.65rem 1rem",
                      borderBottom: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      position: "sticky", top: 0,
                      background: "var(--bg-primary)", zIndex: 1,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {t.community?.notificationsTitle || "Notifications"}
                      </span>
                      {notifications.length > 0 && (
                        <div style={{ display: "flex", gap: 4 }}>
                          {notifications.some(n => !n.read) && (
                            <button
                              onClick={markNotifsRead}
                              style={{
                                fontSize: 11, fontWeight: 600, color: "var(--brand)",
                                background: "none", border: "none", cursor: "pointer",
                                padding: "2px 6px", borderRadius: 6,
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "var(--brand-pale)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            >
                              {t.community?.readAll || "Mark all read"}
                            </button>
                          )}
                          <button
                            onClick={clearAllNotifs}
                            style={{
                              fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
                              background: "none", border: "none", cursor: "pointer",
                              padding: "2px 6px", borderRadius: 6,
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,50,50,0.08)"; e.currentTarget.style.color = "#c0392b"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >
                            {t.community?.clearAll || "Clear all"}
                          </button>
                        </div>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ padding: "1.25rem 1rem", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                        {t.community?.notificationsEmpty || "No new notifications."}
                      </p>
                    ) : (
                      notifications.slice(0, 30).map((n) => {
                        const typeIcon = n.type === "new_message"
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#4472b8" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          : n.type === "help_request"
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#e07b39" }}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          : n.type === "post_like"
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#e05b5b" stroke="#e05b5b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          : n.type === "post_comment"
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#4ca87b" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "#4472b8" }}><ellipse cx="12" cy="9" rx="7" ry="8.5" fill="currentColor"/><path d="M10.5 17.5Q12 19.5 13.5 17.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/><path d="M12 19.5Q13 21 12 22.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/><ellipse cx="9.5" cy="6.5" rx="1.5" ry="2" fill="rgba(255,255,255,0.4)"/></svg>;

                        const bodyText = n.type === "birthday_wish"
                          ? (t.community?.birthdayWishNotif ? t.community.birthdayWishNotif(n.fromUserName) : `${n.fromUserName} sent you a birthday balloon!`)
                          : n.type === "new_message"
                          ? (t.community?.notifNewMessage ? t.community.notifNewMessage(n.fromUserName, n.message) : `${n.fromUserName}: ${n.message || "sent you a message"}`)
                          : n.type === "help_request"
                          ? (t.community?.notifHelpRequest ? t.community.notifHelpRequest(n.fromUserName, n.message?.slice(0, 60)) : `${n.fromUserName} sent you a help request`)
                          : n.type === "post_like"
                          ? (t.community?.notifPostLike ? t.community.notifPostLike(n.fromUserName) : `${n.fromUserName} liked your post`)
                          : n.type === "post_comment"
                          ? (t.community?.notifPostComment ? t.community.notifPostComment(n.fromUserName, n.message) : `${n.fromUserName} commented: ${n.message || ""}`)
                          : n.message || (t.community?.notifDefault || "New notification");

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && handleNotifClick(n)}
                            onMouseEnter={(e) => e.currentTarget.style.background = n.read ? "var(--bg-hover)" : "rgba(68,114,184,0.12)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = n.read ? "transparent" : "rgba(68,114,184,0.06)"}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 10,
                              padding: "0.65rem 1rem",
                              borderBottom: "1px solid var(--border)",
                              background: n.read ? "transparent" : "rgba(68,114,184,0.06)",
                              transition: "background 0.15s",
                              cursor: "pointer",
                            }}>
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              {n.fromUserAvatar ? (
                                <img src={n.fromUserAvatar} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} alt="" />
                              ) : (
                                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#4472b8,#6da3d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                                  {(n.fromUserName || "?")[0].toUpperCase()}
                                </div>
                              )}
                              <span style={{
                                position: "absolute", bottom: -2, right: -2,
                                width: 18, height: 18, borderRadius: "50%",
                                background: "var(--bg-primary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: "1.5px solid var(--border)",
                              }}>
                                {typeIcon}
                              </span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4, margin: 0 }}>
                                {bodyText}
                              </p>
                              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                {n.createdAt ? new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                              </p>
                            </div>
                            {!n.read && (
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", flexShrink: 0, marginTop: 5 }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Logout — mobile only */}
              {isMobile && (
                <button onClick={logout} title={t.nav.logout} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 11px", borderRadius: 99,
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--danger)", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  transition: "all var(--t-fast)",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fff0f0"; e.currentTarget.style.borderColor = "var(--danger)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {Icon.logout}
                  {!isMobile && <span>{t.nav.logout}</span>}
                </button>
              )}

              <button onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{
                width: 34, height: 34, borderRadius: 99,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-secondary)", cursor: "pointer", transition: "all var(--t-fast)",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--brand)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {dark ? Icon.sun : Icon.moon}
              </button>

              {/* User chip — greeting + online dot + avatar + admin badge, on all screen sizes */}
              {(() => {
                const hr = new Date().getHours();
                const greetKey = hr < 12 ? "goodMorning" : hr < 18 ? "goodAfternoon" : "goodEvening";
                const greetText = (t.dash?.[greetKey] || "Hello") + (profile?.firstName ? `, ${profile.firstName}` : "");
                return (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "4px 10px 4px 5px", borderRadius: 99,
                    background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                    cursor: "pointer", transition: "border-color 0.2s", flexShrink: 0,
                  }}
                    onClick={() => switchTab("profile")}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--brand)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    {/* Avatar with online dot */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {avatarUrl(profile) ? (
                        <img src={avatarUrl(profile)} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} alt="" />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #4472b8, #6da3d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff" }}>{initials}</div>
                      )}
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#4ade80", border: "1.5px solid var(--bg-primary)" }} />
                    </div>
                    {/* Greeting — hidden on mobile to keep compact */}
                    {!isMobile && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {greetText}
                      </span>
                    )}
                    {/* Admin badge */}
                    {profile?.isAdmin && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#1d4896", background: "#dbeafe", padding: "2px 7px", borderRadius: 99, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                        Admin
                      </span>
                    )}
                  </div>
                );
              })()}
            </header>
          )}

          {/* Page content */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
            {section === "home"      && <HomePage user={user} profile={profile} onNavigate={switchTab} onViewProfile={(userId) => navigate("profile", { userId })} />}
            {section === "community" && <CommunityPage onViewProfile={(userId) => navigate("profile", { userId })} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "chat"      && <ChatPage onUnreadChange={setUnreadDMs} onViewProfile={(userId) => navigate("profile", { userId })} openChatWithUserId={chatTarget} />}
            {section === "members"   && <SupportPage onViewProfile={(userId) => navigate("profile", { userId })} onMessage={(userId) => navigate("chat", { userId })} />}
            {section === "profile"   && <ProfilePage viewUserId={profileTarget} onMessage={(userId) => navigate("chat", { userId })} onNavigateToCommunity={() => switchTab("community")} />}
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
            const hasBadge = false;
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

        {/* Tutorial replay button — fixed, draggable, dismissible */}
        {!tutorialBtnHidden && section === "home" && (
          <>
            <style>{`
              @keyframes tut-btn-pulse {
                0%,100% { box-shadow: 0 4px 16px rgba(68,114,184,0.4), 0 0 0 0   rgba(68,114,184,0.5); }
                60%      { box-shadow: 0 4px 16px rgba(68,114,184,0.4), 0 0 0 12px rgba(68,114,184,0); }
              }
            `}</style>
            <div
              onMouseEnter={() => setTutorialBtnHover(true)}
              onMouseLeave={() => setTutorialBtnHover(false)}
              style={{
                position: "fixed",
                ...(tutorialBtnPos
                  ? { left: tutorialBtnPos.left, top: tutorialBtnPos.top }
                  : { bottom: isMobile ? 72 : 24, right: 16 }),
                zIndex: 200, userSelect: "none", touchAction: "none",
              }}
            >
              {/* Dismiss × */}
              {tutorialBtnHover && (
                <button
                  onClick={hideTutorialBtnPermanently}
                  title="Remove permanently"
                  style={{
                    position: "absolute", top: -8, right: -8,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#ef4444", color: "#fff",
                    border: "2px solid #fff", cursor: "pointer",
                    fontSize: 11, fontWeight: 800, lineHeight: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 201, padding: 0,
                  }}
                >×</button>
              )}
              <button
                onMouseDown={tutorialBtnPointerDown}
                onTouchStart={tutorialBtnPointerDown}
                onClick={() => { if (!tutorialDragRef.current.moved) setShowTutorial(true); }}
                title={t.tutorial?.howTo || "How to use the website"}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--brand,#4472b8)", color: "#fff",
                  border: "none", cursor: "grab",
                  fontSize: 19, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "tut-btn-pulse 2.4s ease-in-out infinite",
                }}
              >?</button>
            </div>
          </>
        )}

        {/* Language change confirmation popup */}
        {langChangeCode && (
          <div style={{ position:"fixed", inset:0, zIndex:99997, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(15,25,50,0.4)", backdropFilter:"blur(3px)" }}>
            <div style={{ background:"var(--bg-primary)", borderRadius:18, padding:"1.5rem 1.75rem", width:280, boxShadow:"0 16px 48px rgba(15,25,50,0.22)", textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🌐</div>
              <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", margin:"0 0 6px", fontFamily:"'Outfit',sans-serif" }}>
                {langChangeCode === "en" ? "Switch to English?" : langChangeCode === "ar" ? "التبديل إلى العربية؟" : "עבור לעברית?"}
              </h3>
              <p style={{ fontSize:12, color:"var(--text-secondary)", margin:"0 0 1.25rem", lineHeight:1.6 }}>
                {langChangeCode === "en"
                  ? "Save English as your default language preference?"
                  : langChangeCode === "ar"
                  ? "هل تريد حفظ العربية كلغتك الافتراضية؟"
                  : "לשמור עברית כשפת ברירת המחדל שלך?"}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button
                  onClick={() => { setLangPermanent(langChangeCode); setLangChangeCode(null); }}
                  style={{ width:"100%", padding:"10px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:12, fontSize:13, fontWeight:700, cursor:"pointer" }}
                >
                  {langChangeCode === "en" ? "Yes, always use English" : langChangeCode === "ar" ? "نعم، استخدم العربية دائماً" : "כן, השתמש תמיד בעברית"}
                </button>
                <button
                  onClick={() => { setLang(langChangeCode); setLangChangeCode(null); }}
                  style={{ width:"100%", padding:"10px", background:"var(--bg-tertiary)", color:"var(--text-secondary)", border:"none", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer" }}
                >
                  {langChangeCode === "en" ? "Just this session" : langChangeCode === "ar" ? "فقط هذه الجلسة" : "רק להפעלה זו"}
                </button>
                <button
                  onClick={() => setLangChangeCode(null)}
                  style={{ width:"100%", padding:"10px", background:"none", color:"var(--text-muted)", border:"none", fontSize:12, cursor:"pointer" }}
                >
                  {langChangeCode === "en" ? "Cancel" : langChangeCode === "ar" ? "إلغاء" : "ביטול"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
