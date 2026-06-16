import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { logActivity } from "./activityLogger";
import { useIsMobile } from "./hooks/useIsMobile";
import { getOrCreateConversation, sendHelpRequestPrompt } from "./hooks/useMessages";

/* ─── Translation ─── */
const T = {
  he: {
    title: "חיפוש עזרה",
    sub: "מצאי חברות לפי תחום מקצועי, אזור, או שם — ושלחי בקשת עזרה",
    recommended: "חברות מומלצות",
    nameLbl: "שם חברה",
    namePh: "לדוג׳ שרה כהן",
    regionLbl: "אזור מגורים",
    regionPh: "כל האזורים",
    helpAreaLbl: "תחום מקצועי / עזרה",
    mentorLbl: "מנטורינג",
    mentorOpts: ["מנטורית (mentor)", "מנטית (mentee)"],
    searchBtn: "חפשי",
    searching: "מחפשת...",
    sendReq: "שלחי בקשת עזרה",
    sent: "נשלח ✓",
    viewProfile: "פרופיל",
    noFilter: "השתמשי בפילטרים כדי למצוא חברות שיכולות לעזור.",
    noResults: "לא נמצאו חברות מתאימות. נסי להרחיב את החיפוש.",
    myReqs: "הבקשות שלי",
    memberProfile: "פרופיל חברה",
    close: "סגרי",
    emailLbl: "אימייל",
    phoneLbl: "טלפון",
    regionLabel: "אזור",
    campusLabel: "קמפוס",
    bioLabel: "ביוגרפיה",
    taglineLabel: "משפט",
    msgBtn: "שלחי הודעה",
    reqSent: "בקשה נשלחה",
    delete: "מחקי",
    cityBilingual: "חיפוש עובד בעברית, ערבית ואנגלית",
    roleLabel: "תפקיד",
    otherLbl: "אחר",
    otherPh: "כתבי כאן...",
    layoutCards: "כרטיסיות",
    layoutTable: "טבלה",
    reqModalTitle: "שלחי בקשת עזרה",
    reqModalTo: "אל:",
    reqMsgLabel: "במה את צריכה עזרה?",
    reqMsgPh: "תארי בקצרה מה את מחפשת... (אופציונלי)",
    reqModalSend: "שלחי בקשה",
    reqModalCancel: "ביטול",
    reqMsgReceived: "הודעה:",
    regions: ["צפון","גליל","עמקים","חיפה","מרכז והשרון","גוש דן","תל אביב","ירושלים","שפלה","דרום","נגב","חוץ לארץ"],
    helpAreas: [
      "קידום קריירה ותעסוקה",
      "פיתוח מנהיגות וניהול",
      "ניהול צוותים",
      "חיבור למגזר הציבורי",
      "חיבור למגזר הפרטי",
      "הובלת מאבקים אזרחיים",
      "יזמות עסקית וחברתית",
      "ניהול קמפיינים פוליטיים",
      "התמודדות לתפקידים",
      "ניהול פיננסי",
      "אוזן קשבת",
    ],
  },
  en: {
    title: "Find Help",
    sub: "Find community members by profession, region, or name — and send a help request",
    recommended: "Recommended Members",
    nameLbl: "Member Name",
    namePh: "e.g. Sara Cohen",
    regionLbl: "Region",
    regionPh: "All regions",
    helpAreaLbl: "Profession / Help Area",
    mentorLbl: "Mentoring",
    mentorOpts: ["Mentor", "Mentee"],
    searchBtn: "Search",
    searching: "Searching…",
    sendReq: "Send Help Request",
    sent: "Sent ✓",
    viewProfile: "Profile",
    noFilter: "Use the filters above to find members who can help.",
    noResults: "No matching members found. Try broadening your search.",
    myReqs: "My Requests",
    memberProfile: "Member Profile",
    close: "Close",
    emailLbl: "Email",
    phoneLbl: "Phone",
    regionLabel: "Region",
    campusLabel: "Campus",
    bioLabel: "Bio",
    taglineLabel: "Tagline",
    msgBtn: "Message",
    reqSent: "Request Sent",
    delete: "Delete",
    cityBilingual: "Search works in Hebrew, Arabic and English",
    roleLabel: "Role",
    otherLbl: "Other",
    otherPh: "Type here...",
    layoutCards: "Cards",
    layoutTable: "Table",
    reqModalTitle: "Send a Help Request",
    reqModalTo: "To:",
    reqMsgLabel: "What do you need help with?",
    reqMsgPh: "Briefly describe what you're looking for… (optional)",
    reqModalSend: "Send Request",
    reqModalCancel: "Cancel",
    reqMsgReceived: "Message:",
    regions: ["North","Galilee","Valleys (Emek)","Haifa","Center & Sharon","Gush Dan","Tel Aviv","Jerusalem","Shephelah","South","Negev","Overseas"],
    helpAreas: [
      "Career advancement",
      "Leadership & management",
      "Team management",
      "Public sector connections",
      "Private sector connections",
      "Civil activism",
      "Business & social entrepreneurship",
      "Political campaign management",
      "Running for office",
      "Financial management",
      "Emotional support",
    ],
  },
  ar: {
    title: "البحث عن مساعدة",
    sub: "ابحثي عن عضوات حسب المهنة أو المنطقة أو الاسم — وأرسلي طلب مساعدة",
    recommended: "عضوات موصى بهن",
    nameLbl: "اسم العضوة",
    namePh: "مثلاً سارة كوهين",
    regionLbl: "منطقة السكن",
    regionPh: "جميع المناطق",
    helpAreaLbl: "المهنة / مجال المساعدة",
    mentorLbl: "الإرشاد",
    mentorOpts: ["مرشدة (Mentor)", "متلقية إرشاد (Mentee)"],
    searchBtn: "ابحثي",
    searching: "جارٍ البحث...",
    sendReq: "أرسلي طلب مساعدة",
    sent: "تم الإرسال ✓",
    viewProfile: "الملف الشخصي",
    noFilter: "استخدمي الفلاتر أعلاه للعثور على عضوات يمكنهن المساعدة.",
    noResults: "لم يتم العثور على عضوات. حاولي توسيع نطاق البحث.",
    myReqs: "طلباتي",
    memberProfile: "ملف العضوة",
    close: "إغلاق",
    emailLbl: "البريد الإلكتروني",
    phoneLbl: "الهاتف",
    regionLabel: "المنطقة",
    campusLabel: "القسم",
    bioLabel: "نبذة",
    taglineLabel: "عبارة",
    msgBtn: "إرسال رسالة",
    reqSent: "تم إرسال الطلب",
    delete: "حذف",
    cityBilingual: "البحث يعمل بالعبرية والعربية والإنجليزية",
    roleLabel: "المنصب",
    otherLbl: "أخرى",
    otherPh: "اكتبي هنا...",
    layoutCards: "بطاقات",
    layoutTable: "جدول",
    reqModalTitle: "أرسلي طلب مساعدة",
    reqModalTo: "إلى:",
    reqMsgLabel: "بماذا تحتاجين المساعدة؟",
    reqMsgPh: "صفي باختصار ما تبحثين عنه... (اختياري)",
    reqModalSend: "إرسال الطلب",
    reqModalCancel: "إلغاء",
    reqMsgReceived: "الرسالة:",
    regions: ["الشمال","الجليل","الأودية","حيفا","الوسط والشارون","غوش دان","تل أبيب","القدس","السفيلة","الجنوب","النقب","خارج البلاد"],
    helpAreas: [
      "التقدم الوظيفي",
      "القيادة والإدارة",
      "إدارة الفرق",
      "التواصل مع القطاع العام",
      "التواصل مع القطاع الخاص",
      "النشاط المدني",
      "ريادة الأعمال",
      "إدارة الحملات السياسية",
      "الترشح للمناصب",
      "الإدارة المالية",
      "الدعم العاطفي",
    ],
  },
};

/* Canonical Hebrew keys — always used for Firestore filtering regardless of UI language */
const REGIONS_KEYS = ["צפון","גליל","עמקים","חיפה","מרכז והשרון","גוש דן","תל אביב","ירושלים","שפלה","דרום","נגב","חוץ לארץ"];

/* All language variants per region — so "Jerusalem" matches users who registered in English */
const REGION_ALL_LANGS = {
  "צפון":          ["צפון","North","الشمال"],
  "גליל":          ["גליל","Galilee","الجليل"],
  "עמקים":         ["עמקים","Valleys","Emek","الأودية"],
  "חיפה":          ["חיפה","Haifa","حيفا"],
  "מרכז והשרון":   ["מרכז והשרון","Center & Sharon","Center","Sharon","الوسط والشارون"],
  "גוש דן":        ["גוש דן","Gush Dan","غوش دان"],
  "תל אביב":       ["תל אביב","Tel Aviv","تل أبيب"],
  "ירושלים":       ["ירושלים","Jerusalem","القدس"],
  "שפלה":          ["שפלה","Shephelah","Shfela","السفيلة"],
  "דרום":          ["דרום","South","الجنوب"],
  "נגב":           ["נגב","Negev","النقب"],
  "חוץ לארץ":      ["חוץ לארץ","Overseas","Abroad","خارج البلاد"],
};
const AREAS_KEYS = [
  "קידום קריירה ותעסוקה","פיתוח מנהיגות וניהול","ניהול צוותים",
  "חיבור למגזר הציבורי","חיבור למגזר הפרטי","הובלת מאבקים אזרחיים",
  "יזמות עסקית וחברתית","ניהול קמפיינים פוליטיים","התמודדות לתפקידים",
  "ניהול פיננסי","אוזן קשבת",
];

/* ─── Helpers ─── */
const getInitials = (u) => {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  return (u.email?.[0] ?? "?").toUpperCase();
};
const getFullName = (u) =>
  u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? "Unknown";
const avatarUrl  = (u) => u?.photoURL || u?.avatarUrl || null;
const parseLastSeen = (v) => {
  if (!v) return NaN;
  if (typeof v === "number") return v;
  if (v?.seconds) return v.seconds * 1000;
  return new Date(v).getTime();
};
const isOnline = (u) => {
  const ms = parseLastSeen(u?.lastSeen);
  return !Number.isNaN(ms) && Date.now() - ms < 5 * 60 * 1000;
};

/* ─── Inject styles ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  .support-input:focus {
    border-color: #4472b8 !important;
    box-shadow: 0 0 0 3px rgba(68,114,184,0.16) !important;
    background: var(--bg-primary) !important;
    outline: none;
  }
  /* Keep autofilled fields readable in dark mode — the browser otherwise forces
     a yellow background with its own text colour. */
  .support-input:-webkit-autofill,
  .support-input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--text-primary) !important;
    -webkit-box-shadow: 0 0 0 1000px var(--bg-primary) inset !important;
    caret-color: var(--text-primary);
  }
  .result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(29,72,150,0.12) !important;
  }
  .prof-pill { transition: all 0.14s ease; cursor: pointer; }
  .prof-pill:hover { transform: translateY(-1px); }
  .search-btn:hover    { background: #1d4896 !important; }
  .view-btn:hover      { background: #f0f6fb !important; }
  .req-btn:hover       { background: #daeaf8 !important; }
  .suggest-item:hover  { background: #f0f7ff !important; }
  .req-msg-textarea:focus {
    border-color: #4472b8 !important;
    box-shadow: 0 0 0 3px rgba(68,114,184,0.14) !important;
    outline: none;
  }
  @keyframes fadeSlideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes dropIn      { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes modalPop    { from { opacity:0; transform:scale(0.94) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  .result-card { animation: fadeSlideUp 0.32s ease both; }
`;
if (!document.head.querySelector("#support-styles")) {
  styleTag.id = "support-styles";
  document.head.appendChild(styleTag);
}

/* ─── AreaDropdown — compact single-select replacing the pill grid ─── */
function AreaDropdown({ value, onChange, areas, placeholder, isRTL }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [open]);

  const selected = areas.find(a => a.key === value);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 8,
          padding: "11px 14px", borderRadius: "13px",
          border: `1.5px solid ${value && value !== "OTHER" ? "var(--border-focus)" : "var(--border)"}`,
          background: value && value !== "OTHER" ? "var(--bg-tertiary)" : "var(--bg-secondary)",
          color: value && value !== "OTHER" ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: "14px", fontWeight: value && value !== "OTHER" ? 600 : 400,
          cursor: "pointer", fontFamily: "inherit",
          direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        {value && value !== "OTHER" ? (
          <span
            role="button"
            tabIndex={0}
            onMouseDown={e => { e.stopPropagation(); onChange(""); setOpen(false); }}
            style={{ fontSize: 18, lineHeight: 1, color: "#9ca3af", cursor: "pointer", flexShrink: 0 }}
          >×</span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)",
          [isRTL ? "right" : "left"]: 0, width: "100%", minWidth: 220,
          background: "var(--bg-primary)", border: "1.5px solid var(--border)",
          borderRadius: "14px", boxShadow: "0 8px 28px rgba(29,72,150,0.14)",
          maxHeight: 260, overflowY: "auto", zIndex: 200,
          scrollbarWidth: "thin",
          animation: "dropIn 0.15s ease",
        }}>
          {areas.map(({ label, key }, idx) => (
            <button
              key={key}
              type="button"
              onMouseDown={() => { onChange(key === value ? "" : key); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 14px",
                background: value === key ? "var(--bg-tertiary)" : "transparent",
                border: "none",
                borderBottom: idx < areas.length - 1 ? "1px solid var(--border)" : "none",
                color: "var(--text-primary)",
                fontSize: "13px", fontWeight: value === key ? 700 : 400,
                cursor: "pointer", textAlign: isRTL ? "right" : "left",
                direction: isRTL ? "rtl" : "ltr",
                fontFamily: "inherit",
              }}
            >
              {value === key && <span style={{ fontSize: 11, color: "#4472b8" }}>✓</span>}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── StatusPill ─── */
function StatusPill({ status }) {
  const map = {
    accepted: { bg: "#f0fdf4", color: "#3f6a3e", border: "#cfe4ce", label: "✓" },
    declined:  { bg: "#fff0f0", color: "#9a4545", border: "#d99090", label: "✗" },
    null:      { bg: "#f0f6fb", color: "#4472b8",  border: "#daeaf8",  label: "…" },
  };
  const s = map[status] ?? map["null"];
  return (
    <span style={{
      fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: "inline-block",
    }}>{s.label}</span>
  );
}

/* ─── RequestMessageModal ─── */
function RequestMessageModal({ targetUser, Tr, dir, onConfirm, onCancel }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 60); }, []);
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(29,72,150,0.38)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:200, padding:"1rem", backdropFilter:"blur(4px)",
    }} onClick={onCancel}>
      <div style={{
        background:"var(--bg-primary)", borderRadius:"20px", padding:"1.75rem",
        width:"100%", maxWidth:"400px",
        boxShadow:"0 20px 56px rgba(29,72,150,0.22)",
        display:"flex", flexDirection:"column", gap:"1.1rem",
        animation:"modalPop 0.24s cubic-bezier(.34,1.56,.64,1) both",
        direction:dir,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ fontSize:"15px", fontWeight:"700", color:"var(--text-primary)", margin:0 }}>{Tr.reqModalTitle}</p>
          <button onClick={onCancel} style={{ background:"var(--bg-secondary)", border:"none", borderRadius:"9px", padding:"5px 11px", cursor:"pointer", fontSize:"12px", fontWeight:"600", color:"var(--text-muted)" }}>{Tr.reqModalCancel}</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", background:"var(--bg-secondary)", borderRadius:"13px", padding:"10px 14px", border:"1.5px solid var(--border)" }}>
          <MemberAvatar user={targetUser} size={36} fontSize={13} />
          <div>
            <p style={{ fontSize:"10px", fontWeight:"700", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 1px" }}>{Tr.reqModalTo}</p>
            <p style={{ fontSize:"13px", fontWeight:"700", color:"var(--text-primary)", margin:0 }}>{getFullName(targetUser)}</p>
            {(targetUser.currentRole || targetUser.profession) && (
              <p style={{ fontSize:"11px", color:"var(--text-muted)", margin:0 }}>{targetUser.currentRole || targetUser.profession}</p>
            )}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          <label style={{ fontSize:"11px", fontWeight:"700", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{Tr.reqMsgLabel}</label>
          <textarea ref={textareaRef} className="req-msg-textarea" value={message} onChange={e => setMessage(e.target.value)}
            placeholder={Tr.reqMsgPh} rows={4}
            style={{ padding:"11px 14px", fontSize:"13px", border:"1.5px solid var(--border)", borderRadius:"13px", color:"var(--text-primary)", background:"var(--bg-secondary)", transition:"border-color 0.2s, box-shadow 0.2s", width:"100%", boxSizing:"border-box", resize:"vertical", fontFamily:"inherit", direction:dir, lineHeight:"1.55" }}
          />
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={onCancel} style={{ flex:1, padding:"11px 0", background:"var(--bg-secondary)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:"12px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>{Tr.reqModalCancel}</button>
          <button onClick={() => onConfirm(message.trim())} style={{ flex:2, padding:"11px 0", background:"#4472b8", color:"#fff", border:"none", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", transition:"background 0.2s" }}
            onMouseOver={e => e.currentTarget.style.background="#1d4896"}
            onMouseOut={e  => e.currentTarget.style.background="#4472b8"}
          >{Tr.reqModalSend}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MemberAvatar ─── */
function MemberAvatar({ user, size = 46, fontSize = 15 }) {
  const url = avatarUrl(user);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: url ? "transparent" : "linear-gradient(135deg,#1d4896,#4472b8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", position: "relative",
    }}>
      {url
        ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        : <span style={{ color: "#fff", fontSize, fontWeight: "700" }}>{getInitials(user)}</span>
      }
    </div>
  );
}

export default function SupportPage({ onViewProfile, onMessage }) {
  const { user } = useAuth();
  const { lang, isRTL } = useLang();
  const Tr = T[lang] || T.he;
  const isMobile = useIsMobile();

  const [memberName,     setMemberName]     = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedArea,   setSelectedArea]   = useState("");
  const [otherRegion,    setOtherRegion]    = useState("");
  const [otherArea,      setOtherArea]      = useState("");
  const [layoutMode,       setLayoutMode]       = useState("cards");
  const [results,          setResults]          = useState([]);
  const [searched,         setSearched]         = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [requested,        setRequested]        = useState({});
  const [selectedUser,     setSelectedUser]     = useState(null);
  const [senderProfile,    setSenderProfile]    = useState(null);
  const [sentRequests,     setSentRequests]     = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [allUsers,         setAllUsers]         = useState([]);
  const [recommended,      setRecommended]      = useState([]);
  const [showSuggest,      setShowSuggest]      = useState(false);
  const [dropPos,          setDropPos]          = useState(null);
  const [sortMode,         setSortMode]         = useState("recent");
  const [showAreaSuggests,    setShowAreaSuggests]    = useState(false);
  const [showRegionSuggests,  setShowRegionSuggests]  = useState(false);
  const [pendingRequestTarget, setPendingRequestTarget] = useState(null);
  const nameInputRef    = useRef(null);
  const searchRef       = useRef(null);
  const myReqRef        = useRef(null);
  const receivedRef     = useRef(null);
  const recommendedRef  = useRef(null);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const effectiveRegion = selectedRegion === "OTHER" ? otherRegion : selectedRegion;
  const effectiveArea   = selectedArea   === "OTHER" ? otherArea   : selectedArea;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "helpRequests"), where("fromUserId", "==", user.uid))),
      getDocs(query(collection(db, "helpRequests"), where("toUserId",   "==", user.uid))),
    ]).then(([usersSnap, sentSnap, recvSnap]) => {
      const docs = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const me   = docs.find((d) => d.id === user.uid);
      if (me) setSenderProfile(me);
      const others = docs.filter((d) => d.id !== user.uid);
      setAllUsers(others);
      const sorted = [...others].sort((a, b) => {
        const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tb - ta;
      });
      setRecommended(sorted.slice(0, 4));
      const reqs = sentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSentRequests(reqs);
      const reqMap = {};
      reqs.forEach((r) => { reqMap[r.toUserId] = true; });
      setRequested(reqMap);
      setReceivedRequests(recvSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const openSuggest = () => {
    if (nameInputRef.current) {
      const r = nameInputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setShowSuggest(true);
  };
  const suggestions = memberName.trim().length > 0
    ? allUsers.filter((u) => {
        const q = memberName.toLowerCase().trim();
        return (u.firstName ?? "").toLowerCase().startsWith(q)
          || (u.lastName ?? "").toLowerCase().startsWith(q);
      }).slice(0, 8)
    : [];

  const runSearch = (overrideArea, overrideRegion) => {
    setLoading(true); setSearched(true);
    const regionQ = (overrideRegion !== undefined ? overrideRegion : effectiveRegion).trim();
    const areaQ   = (overrideArea   !== undefined ? overrideArea   : effectiveArea).trim();
    const filtered = allUsers.filter((u) => {
      const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      const matchName   = memberName ? fullName.includes(memberName.toLowerCase()) : true;
      const matchRegion = regionQ
        ? (() => {
            const variants = REGION_ALL_LANGS[regionQ] || [regionQ];
            return variants.some(v => (u.region ?? "").includes(v) || (u.city ?? "").includes(v));
          })()
        : true;
      const matchArea   = areaQ
        ? (u.helpAreas ?? []).some(a => a.includes(areaQ))
          || (u.profession ?? "").toLowerCase().includes(areaQ.toLowerCase())
          || (u.currentRole ?? "").toLowerCase().includes(areaQ.toLowerCase())
        : true;
      return matchName && matchRegion && matchArea;
    });
    setResults(filtered);
    setLoading(false);
  };

  /* Live search — inline filter so there are no stale-closure issues */
  useEffect(() => {
    if (!allUsers.length) return;
    const name   = memberName.trim().toLowerCase();
    const region = selectedRegion === "OTHER" ? otherRegion.trim() : selectedRegion.trim();
    const area   = selectedArea   === "OTHER" ? otherArea.trim()   : selectedArea.trim();
    if (!name && !region && !area) { setResults([]); setSearched(false); return; }
    const id = setTimeout(() => {
      const filtered = allUsers.filter((u) => {
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        const matchName   = !name   || fullName.includes(name);
        const matchRegion = !region || (() => {
          const variants = REGION_ALL_LANGS[region] || [region];
          return variants.some(v => (u.region ?? "").includes(v) || (u.city ?? "").includes(v));
        })();
        const matchArea   = !area   || (u.helpAreas ?? []).some(a => a.includes(area))
          || (u.profession ?? "").toLowerCase().includes(area.toLowerCase())
          || (u.currentRole ?? "").toLowerCase().includes(area.toLowerCase());
        return matchName && matchRegion && matchArea;
      });
      setResults(filtered);
      setSearched(true);
    }, 300);
    return () => clearTimeout(id);
  }, [memberName, selectedRegion, selectedArea, otherRegion, otherArea, allUsers]);

  const sortedResults = sortMode === "alpha"
    ? [...results].sort((a, b) => getFullName(a).localeCompare(getFullName(b), undefined, { sensitivity: "base" }))
    : [...results].sort((a, b) => {
        const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tb - ta;
      });

  const handleDeleteSentRequest = async (reqId) => {
    try {
      await deleteDoc(doc(db, "helpRequests", reqId));
      setSentRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (err) { console.error("Delete error:", err); }
  };

  const handleDeleteReceivedRequest = async (reqId) => {
    try {
      await deleteDoc(doc(db, "helpRequests", reqId));
      setReceivedRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (err) { console.error("Delete error:", err); }
  };

  const handleRespondRequest = async (reqId, status) => {
    try {
      await updateDoc(doc(db, "helpRequests", reqId), {
        status,
        responderName: senderProfile ? getFullName(senderProfile) : user.email,
      });
      const req = receivedRequests.find(r => r.id === reqId);
      setReceivedRequests((prev) =>
        prev.map((r) => r.id === reqId ? { ...r, status } : r)
      );
      logActivity({ type: status === "accepted" ? "request_accepted" : "request_declined", actorId: user.uid, actorName: getFullName(senderProfile), targetId: req?.fromUserId || reqId, targetType: "user", details: { fromUser: req?.fromUserName } });
    } catch (err) { console.error("Respond error:", err); }
  };

  const cantSendHelp = (u) =>
    (!senderProfile?.isAdmin && (u.blockedUsers || []).includes(user?.uid)) ||
    (senderProfile?.blockedUsers || []).includes(u.id);

  const initiateRequest = (targetUser) => {
    if (!user || !senderProfile || requested[targetUser.id]) return;
    if (cantSendHelp(targetUser)) return;
    setPendingRequestTarget(targetUser);
  };

  const handleRequest = async (targetUser, requestMessage = "") => {
    if (!user || !senderProfile || requested[targetUser.id]) return;
    if (cantSendHelp(targetUser)) return;
    try {
      const reqRef = await addDoc(collection(db, "helpRequests"), {
        toUserId:           targetUser.id,
        toUserName:         getFullName(targetUser),
        fromUserId:         user.uid,
        fromUserName:       getFullName(senderProfile),
        fromUserEmail:      user.email,
        fromUserPhone:      senderProfile?.phone ?? "",
        fromUserProfession: senderProfile?.currentRole ?? senderProfile?.profession ?? "",
        requestMessage:     requestMessage,
        status:             null,
        createdAt:          new Date().toISOString(),
      });
      setRequested((prev) => ({ ...prev, [targetUser.id]: true }));
      logActivity({ type: "request_sent", actorId: user.uid, actorName: getFullName(senderProfile), targetId: targetUser.id, targetType: "user", details: { toName: getFullName(targetUser) } });

      // ── NEW: also deliver the request as an interactive DM prompt ──
      try {
        const convId = await getOrCreateConversation(user.uid, targetUser.id, senderProfile, targetUser);
        await sendHelpRequestPrompt(convId, user.uid, getFullName(senderProfile), reqRef.id, requestMessage, [targetUser.id]);
      } catch (dmErr) { console.error("Help request DM error:", dmErr); }
    } catch (err) { console.error("Request error:", err); }
  };

  /* ── Styles ── */
  const dir = isRTL ? "rtl" : "ltr";
  const S = {
    page: {
      padding: isMobile ? "1.25rem 0.75rem 4rem" : "2rem 2.5rem 4rem",
      width: "100%", height: "100%",
      overflowY: "auto", overflowX: "hidden",
      boxSizing: "border-box",
      background: "var(--bg-secondary)",
      direction: dir,
      fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    },
    pageTitle: { fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 3px" },
    pageSub:   { fontSize: "13px", color: "var(--text-muted)", margin: "0 0 2rem" },
    sectionLabel: {
      fontSize: "11px", fontWeight: "700", color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.85rem",
    },
    recGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: "0.85rem", marginBottom: "2rem",
    },
    recCard: {
      background: "var(--bg-primary)", borderRadius: "16px",
      padding: "1.25rem 1rem",
      border: "1.5px solid var(--border)", borderTop: "3px solid #4472b8",
      boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "0.5rem", textAlign: "center", cursor: "pointer",
      transition: "transform 0.18s, box-shadow 0.18s",
    },
    searchCard: {
      background: "var(--bg-primary)", borderRadius: "18px",
      padding: "1.5rem",
      border: "1.5px solid var(--border)",
      borderInlineStart: "4px solid #4472b8",
      boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
      marginBottom: "2rem",
    },
    group: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" },
    label: {
      fontSize: "11px", fontWeight: "700", color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    },
    pillRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
    pill: (active) => ({
      padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: "600",
      border: `1.5px solid ${active ? "#4472b8" : "var(--border)"}`,
      background: active ? "#daeaf8" : "var(--bg-secondary)",
      color: active ? "#1d4896" : "var(--text-secondary)",
      cursor: "pointer", userSelect: "none",
    }),
    input: {
      padding: "11px 14px", fontSize: "14px",
      border: "1.5px solid var(--border)", borderRadius: "13px",
      color: "var(--text-primary)", background: "var(--bg-secondary)",
      transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
      width: "100%", boxSizing: "border-box",
      direction: dir,
    },
    searchBtn: {
      padding: "11px 32px", background: "#4472b8", color: "#fff",
      border: "none", borderRadius: "13px", fontSize: "14px", fontWeight: "700",
      cursor: "pointer", transition: "background 0.2s", height: "44px",
      marginTop: "1rem", alignSelf: "flex-start",
      fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    },
    resultsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.25rem",
    },
    card: {
      background: "var(--bg-primary)", borderRadius: "18px", padding: "1.5rem",
      border: "1.5px solid var(--border)", borderInlineStart: "4px solid var(--border)",
      boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      transition: "transform 0.18s, box-shadow 0.18s",
    },
    cardTop: { display: "flex", alignItems: "center", gap: "1rem" },
    name:       { fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0 },
    profession: { fontSize: "13px", color: "var(--text-secondary)", margin: 0 },
    cityTag: {
      fontSize: "12px", color: "#1d4896",
      background: "#daeaf8", border: "1px solid #c8e0f4",
      borderRadius: "99px", padding: "2px 10px",
      display: "inline-block", alignSelf: "flex-start",
    },
    cardActions: { display: "flex", gap: "8px", marginTop: "auto" },
    viewBtn: {
      flex: 1, padding: "9px 0", background: "var(--bg-secondary)",
      color: "var(--text-primary)", border: "1.5px solid var(--border)",
      borderRadius: "12px", fontSize: "13px", fontWeight: "600",
      cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
    },
    reqBtn: {
      flex: 1, padding: "9px 0", background: "#eff6ff", color: "#1d4896",
      border: "1.5px solid #bfdbfe", borderRadius: "12px",
      fontSize: "13px", fontWeight: "600", cursor: "pointer",
    },
    reqDoneBtn: {
      flex: 1, padding: "9px 0", background: "#f0fdf4", color: "#3f6a3e",
      border: "1.5px solid #cfe4ce", borderRadius: "12px",
      fontSize: "13px", fontWeight: "600", cursor: "default",
    },
    emptyBox: { textAlign: "center", padding: "3rem 2rem", color: "var(--text-muted)", fontSize: "14px" },
    overlay: {
      position: "fixed", inset: 0, background: "rgba(29,72,150,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "1rem", backdropFilter: "blur(4px)",
    },
    modal: {
      background: "var(--bg-primary)", borderRadius: "22px", padding: "2rem",
      width: "100%", maxWidth: "420px",
      boxShadow: "0 16px 48px rgba(29,72,150,0.2)",
      display: "flex", flexDirection: "column", gap: "1.25rem",
      animation: "modalPop 0.26s cubic-bezier(.34,1.56,.64,1) both",
      direction: dir,
    },
    modalHeader:  { display: "flex", alignItems: "center", justifyContent: "space-between" },
    modalTitle:   { fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 },
    closeBtn: {
      background: "var(--bg-secondary)", border: "none", borderRadius: "9px",
      padding: "6px 12px", cursor: "pointer", fontSize: "13px",
      fontWeight: "600", color: "var(--text-secondary)",
    },
    infoBlock: {
      background: "var(--bg-secondary)", borderRadius: "13px",
      padding: "1rem 1.25rem", border: "1.5px solid var(--border)",
      display: "flex", flexDirection: "column", gap: "10px",
    },
    infoRow:   { display: "flex", flexDirection: "column", gap: "2px" },
    infoLabel: { fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 },
    infoValue: { fontSize: "13px", color: "var(--text-primary)", margin: 0 },
    modalReqBtn: {
      flex: 1, padding: "12px", background: "#4472b8", color: "#fff",
      border: "none", borderRadius: "12px", fontSize: "14px",
      fontWeight: "700", cursor: "pointer", transition: "background 0.2s",
      fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    },
    modalReqDoneBtn: {
      flex: 1, padding: "12px", background: "#f0fdf4", color: "#3f6a3e",
      border: "1.5px solid #cfe4ce", borderRadius: "12px",
      fontSize: "14px", fontWeight: "700", cursor: "default",
    },
    myReqSection: { marginTop: "2.5rem" },
    myReqGrid: {
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem",
    },
    myReqCard: {
      background: "var(--bg-primary)", borderRadius: "16px", padding: "1.25rem",
      border: "1.5px solid var(--border)", borderInlineStart: "4px solid #6da3d4",
      boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
      display: "flex", flexDirection: "column", gap: "6px",
    },
    myReqName: { fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 },
    myReqProf: { fontSize: "12px", color: "var(--text-secondary)", margin: 0 },
  };

  const deleteIconSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );

  const sideNavItems = [
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
      labelHe: "חיפוש", labelEn: "Search", labelAr: "بحث", ref: searchRef,
    },
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
      labelHe: "שלחתי", labelEn: "My Requests", labelAr: "طلباتي", ref: myReqRef,
    },
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
      labelHe: "קיבלתי", labelEn: "Received", labelAr: "الواردة", ref: receivedRef,
    },
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
      labelHe: "מומלצות", labelEn: "Suggested", labelAr: "الموصى بهن", ref: recommendedRef,
    },
  ];
  const sideNavLabel = (item) => lang === "he" ? item.labelHe : lang === "ar" ? item.labelAr : item.labelEn;

  return (
    <div style={S.page}>

      {/* ── Fixed side nav — always visible while scrolling ── */}
      <div style={{
        position: "fixed",
        [isRTL ? "left" : "right"]: isMobile ? 6 : 14,
        top: "50%", transform: "translateY(-50%)",
        zIndex: 50, display: "flex", flexDirection: "column",
        gap: isMobile ? 6 : 8,
      }}>
        {sideNavItems.map((item) => (
          <button
            key={item.labelEn}
            title={sideNavLabel(item)}
            onClick={() => scrollTo(item.ref)}
            style={{
              width: isMobile ? 36 : 42, height: isMobile ? 36 : 42,
              borderRadius: "50%",
              background: "var(--bg-primary)",
              border: "1.5px solid var(--border)",
              boxShadow: "0 2px 10px rgba(29,72,150,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isMobile ? 14 : 17, cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(29,72,150,0.2)"; e.currentTarget.style.transform = "scale(1.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(29,72,150,0.12)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <p style={S.pageTitle}>{Tr.title}</p>
      <p style={S.pageSub}>{Tr.sub}</p>

      {/* ── Quick shortcuts ── */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto", flexWrap: "nowrap",
        marginBottom: "1.25rem", paddingBottom: 4,
        scrollbarWidth: "none", msOverflowStyle: "none",
      }}>
        {[
          { labelHe: "חיפוש עזרה",     labelEn: "Find Help",    labelAr: "بحث عن مساعدة",    scrollRef: searchRef,      primary: true },
          { labelHe: "הבקשות שלי",     labelEn: "My Requests",  labelAr: "طلباتي",            scrollRef: myReqRef },
          { labelHe: "בקשות שהתקבלו", labelEn: "Received",     labelAr: "الطلبات الواردة",   scrollRef: receivedRef },
          { labelHe: "מומלצות",        labelEn: "Recommended",  labelAr: "الموصى بهن",        scrollRef: recommendedRef },
        ].map(({ labelHe, labelEn, labelAr, scrollRef, primary }) => {
          const label = lang === "he" ? labelHe : lang === "ar" ? labelAr : labelEn;
          return (
            <button
              key={label}
              onClick={() => scrollTo(scrollRef)}
              style={{
                flexShrink: 0,
                padding: "8px 16px", borderRadius: 99,
                background: primary ? "var(--brand)" : "var(--bg-primary)",
                border: `1.5px solid ${primary ? "var(--brand)" : "var(--border)"}`,
                color: primary ? "#fff" : "var(--text-secondary)",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: primary ? "0 2px 8px var(--brand-glow)" : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Search Card — help area → region → member name ── */}
      <div ref={searchRef} style={S.searchCard}>
        {/* Help area (first — most important) */}
        <div style={S.group}>
          <label style={S.label}>{Tr.helpAreaLbl}</label>
          <AreaDropdown
            value={selectedArea}
            onChange={(key) => { setSelectedArea(key); setOtherArea(""); }}
            areas={[
              ...[...(Tr.helpAreas || []).map((label, i) => ({ label, key: AREAS_KEYS[i] }))]
                .sort((a, b) => a.label.localeCompare(b.label, "he")),
              { label: Tr.otherLbl, key: "OTHER" },
            ]}
            placeholder={lang === "he" ? "כל התחומים..." : lang === "ar" ? "جميع المجالات..." : "All areas..."}
            isRTL={isRTL}
          />
          {selectedArea === "OTHER" && (
            <div style={{ position: "relative", marginTop: 8 }}>
              <input className="support-input" style={S.input}
                type="text" placeholder={Tr.otherPh}
                value={otherArea}
                onChange={(e) => { setOtherArea(e.target.value); setShowAreaSuggests(true); }}
                onBlur={() => setTimeout(() => setShowAreaSuggests(false), 160)}
                autoComplete="off"
              />
              {showAreaSuggests && otherArea.trim().length >= 1 && (() => {
                const q = otherArea.trim().toLowerCase();
                const opts = [...new Set(
                  allUsers.flatMap(u => [u.profession, u.currentRole, ...(u.helpAreas||[])])
                    .filter(v => v && v.toLowerCase().includes(q))
                )].slice(0, 8);
                return opts.length > 0 ? (
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"var(--bg-primary)", border:"1.5px solid var(--border)", borderRadius:12, boxShadow:"0 6px 20px rgba(29,72,150,0.12)", maxHeight:180, overflowY:"auto", zIndex:300, animation:"dropIn 0.14s ease" }}>
                    {opts.map((s, i) => (
                      <button key={s} type="button" onMouseDown={() => { setOtherArea(s); setShowAreaSuggests(false); }}
                        style={{ width:"100%", textAlign:isRTL?"right":"left", padding:"9px 14px", background:"transparent", border:"none", borderBottom: i<opts.length-1?"1px solid var(--border)":"none", fontSize:13, color:"var(--text-primary)", cursor:"pointer", fontFamily:"inherit", direction:isRTL?"rtl":"ltr" }}
                      >{s}</button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Region */}
        <div style={S.group}>
          <label style={S.label}>{Tr.regionLbl}</label>
          <AreaDropdown
            value={selectedRegion}
            onChange={(key) => { setSelectedRegion(key); setOtherRegion(""); }}
            areas={[
              ...(Tr.regions || []).map((label, i) => ({ label, key: REGIONS_KEYS[i] })),
              { label: Tr.otherLbl, key: "OTHER" },
            ]}
            placeholder={lang === "he" ? "כל האזורים..." : lang === "ar" ? "جميع المناطق..." : "All regions..."}
            isRTL={isRTL}
          />
          {selectedRegion === "OTHER" && (
            <div style={{ position: "relative", marginTop: 8 }}>
              <input className="support-input" style={S.input}
                type="text" placeholder={Tr.otherPh}
                value={otherRegion}
                onChange={(e) => { setOtherRegion(e.target.value); setShowRegionSuggests(true); }}
                onBlur={() => setTimeout(() => setShowRegionSuggests(false), 160)}
                autoComplete="off"
              />
              {showRegionSuggests && otherRegion.trim().length >= 1 && (() => {
                const q = otherRegion.trim().toLowerCase();
                const opts = [...new Set(
                  allUsers.flatMap(u => [u.city, u.region].filter(Boolean))
                    .filter(v => v.toLowerCase().includes(q) && !REGIONS_KEYS.includes(v))
                )].slice(0, 8);
                return opts.length > 0 ? (
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"var(--bg-primary)", border:"1.5px solid var(--border)", borderRadius:12, boxShadow:"0 6px 20px rgba(29,72,150,0.12)", maxHeight:180, overflowY:"auto", zIndex:300, animation:"dropIn 0.14s ease" }}>
                    {opts.map((s, i) => (
                      <button key={s} type="button" onMouseDown={() => { setOtherRegion(s); setShowRegionSuggests(false); }}
                        style={{ width:"100%", textAlign:isRTL?"right":"left", padding:"9px 14px", background:"transparent", border:"none", borderBottom: i<opts.length-1?"1px solid var(--border)":"none", fontSize:13, color:"var(--text-primary)", cursor:"pointer", fontFamily:"inherit", direction:isRTL?"rtl":"ltr" }}
                      >{s}</button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Member name */}
        <div style={S.group}>
          <label style={S.label}>{Tr.nameLbl}</label>
          <div style={{ position: "relative" }}>
            <input
              ref={nameInputRef}
              className="support-input"
              style={S.input}
              type="text"
              placeholder={Tr.namePh}
              value={memberName}
              onChange={(e) => { setMemberName(e.target.value); openSuggest(); }}
              onFocus={openSuggest}
              onBlur={() => setTimeout(() => setShowSuggest(false), 160)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              autoComplete="off"
            />
          </div>
          {showSuggest && memberName.trim().length > 0 && dropPos && (
            <div style={{
              position: "fixed", top: dropPos.top, left: dropPos.left,
              width: dropPos.width, background: "var(--bg-primary)",
              borderRadius: "13px", border: "1.5px solid var(--border)",
              boxShadow: "0 8px 28px rgba(29,72,150,0.14)",
              overflow: "hidden", zIndex: 9999, animation: "dropIn 0.16s ease", minWidth: 220,
            }}>
              {suggestions.length > 0 ? suggestions.map((u) => (
                <button key={u.id} className="suggest-item"
                  onMouseDown={() => { setMemberName(getFullName(u)); setShowSuggest(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderBottom: "1px solid var(--border)", cursor: "pointer",
                    textAlign: isRTL ? "right" : "left", transition: "background 0.12s",
                  }}
                >
                  <MemberAvatar user={u} size={32} fontSize={11} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getFullName(u)}
                    </p>
                    {(u.currentRole || u.profession) && (
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{u.currentRole || u.profession}</p>
                    )}
                  </div>
                </button>
              )) : (
                <div style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-muted)" }}>
                  {allUsers.length === 0 ? "…" : "—"}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="search-btn" style={S.searchBtn} onClick={() => runSearch()}>
            {loading ? Tr.searching : Tr.searchBtn}
          </button>
          {/* Sort toggle */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 10, padding: 3, border: "1.5px solid var(--border)" }}>
            {[
              { key: "recent", label: lang === "he" ? "פעילות אחרונה" : lang === "ar" ? "الأحدث نشاطاً" : "Most Recent" },
              { key: "alpha",  label: lang === "he" ? "א–ת" : lang === "ar" ? "أ–ي" : "A–Z" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSortMode(key)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                background: sortMode === key ? "#4472b8" : "transparent",
                color: sortMode === key ? "#fff" : "var(--text-muted)",
              }}>{label}</button>
            ))}
          </div>
          {/* Layout toggle */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 10, padding: 3, border: "1.5px solid var(--border)" }}>
            {[
              { mode: "cards", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: Tr.layoutCards },
              { mode: "table", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>, label: Tr.layoutTable },
            ].map(({ mode, icon, label }) => (
              <button key={mode} title={label}
                style={{ display:"flex",alignItems:"center",gap:4, padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                  background: layoutMode===mode ? "#4472b8" : "transparent",
                  color: layoutMode===mode ? "#fff" : "var(--text-muted)",
                  transition:"all 0.15s" }}
                onClick={() => setLayoutMode(mode)}
              >{icon} {label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty states */}
      {!searched && (
        <div style={S.emptyBox}>{Tr.noFilter}</div>
      )}
      {searched && !loading && sortedResults.length === 0 && (
        <div style={S.emptyBox}>{Tr.noResults}</div>
      )}

      {/* Results */}
      {sortedResults.length > 0 && (
        layoutMode === "table" ? (
          <div style={{ marginBottom: "2rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", fontSize: 13 }}>
              <thead>
                <tr>
                  {[Tr.nameLbl, Tr.roleLabel, Tr.regionLabel, ""].map((h,i) => (
                    <th key={i} style={{ textAlign: isRTL?"right":"left", padding:"6px 12px", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1.5px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((u) => (
                  <tr key={u.id} style={{ background:"var(--bg-primary)", transition:"background 0.15s", cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--bg-hover)"}
                    onMouseLeave={e=>e.currentTarget.style.background="var(--bg-primary)"}
                  >
                    <td style={{ padding:"10px 12px", borderRadius:"10px 0 0 10px", display:"flex", alignItems:"center", gap:10 }}>
                      <MemberAvatar user={u} size={34} fontSize={12} />
                      <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{getFullName(u)}</span>
                    </td>
                    <td style={{ padding:"10px 12px", color:"var(--text-secondary)" }}>{u.currentRole ?? u.profession ?? "—"}</td>
                    <td style={{ padding:"10px 12px", color:"var(--text-muted)" }}>{u.region || u.city || "—"}</td>
                    <td style={{ padding:"10px 12px", borderRadius:"0 10px 10px 0" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button className="view-btn" style={{ ...S.viewBtn, flex:"none", padding:"6px 14px" }}
                          onClick={() => onViewProfile ? onViewProfile(u.id) : setSelectedUser(u)}>{Tr.viewProfile}</button>
                        {!cantSendHelp(u) && (
                          <button className={requested[u.id]?"":"req-btn"}
                            style={{ ...(requested[u.id]?S.reqDoneBtn:S.reqBtn), flex:"none", padding:"6px 14px" }}
                            onClick={() => initiateRequest(u)}>
                            {requested[u.id] ? Tr.sent : Tr.sendReq}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...S.resultsGrid, marginBottom: "2rem" }}>
            {sortedResults.map((u, i) => (
              <div key={u.id} className="result-card"
                style={{ ...S.card, animationDelay: `${i * 0.05}s` }}
              >
                <div style={S.cardTop}>
                  <div style={{ position: "relative" }}>
                    <MemberAvatar user={u} />
                    {isOnline(u) && (
                      <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#7ba87a", border: "2px solid var(--bg-primary)" }} />
                    )}
                  </div>
                  <div>
                    <p style={S.name}>{getFullName(u)}</p>
                    <p style={S.profession}>{u.currentRole ?? u.profession ?? "—"}</p>
                  </div>
                </div>
                {(u.region || u.city) && <span style={S.cityTag}>{u.region || u.city}</span>}
                {u.helpAreas?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {u.helpAreas.slice(0, 3).map(a => (
                      <span key={a} style={{ fontSize: 10, background: "#f0f6fb", color: "#4472b8", borderRadius: 99, padding: "2px 8px", border: "1px solid #daeaf8" }}>{a}</span>
                    ))}
                  </div>
                )}
                <div style={S.cardActions}>
                  <button className="view-btn" style={S.viewBtn}
                    onClick={() => onViewProfile ? onViewProfile(u.id) : setSelectedUser(u)}>
                    {Tr.viewProfile}
                  </button>
                  {!cantSendHelp(u) && (
                    <button
                      className={requested[u.id] ? "" : "req-btn"}
                      style={requested[u.id] ? S.reqDoneBtn : S.reqBtn}
                      onClick={() => initiateRequest(u)}
                    >
                      {requested[u.id] ? Tr.sent : Tr.sendReq}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* My Requests */}
      {sentRequests.length > 0 && (
        <div ref={myReqRef} style={S.myReqSection}>
          <p style={{ ...S.sectionLabel, margin: "0 0 1rem" }}>{Tr.myReqs}</p>
          <div style={S.myReqGrid}>
            {sentRequests.map((r) => (
              <div key={r.id} style={S.myReqCard}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <p style={S.myReqName}>{r.toUserName || "—"}</p>
                  <button title={Tr.delete}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, display:"flex", alignItems:"center" }}
                    onClick={() => handleDeleteSentRequest(r.id)}
                    onMouseEnter={e=>e.currentTarget.style.color="#e8735a"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}
                  >{deleteIconSvg}</button>
                </div>
                {r.fromUserProfession && <p style={S.myReqProf}>{r.fromUserProfession}</p>}
                {r.requestMessage && (
                  <p style={{ fontSize:"12px", color:"var(--text-secondary)", margin:"2px 0 0", background:"var(--bg-secondary)", borderRadius:"9px", padding:"7px 10px", border:"1px solid var(--border)", lineHeight:"1.5", fontStyle:"italic" }}>
                    {r.requestMessage}
                  </p>
                )}
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Received Requests */}
      {receivedRequests.length > 0 && (
        <div ref={receivedRef} style={{ marginTop: "2.5rem", marginBottom: "2rem" }}>
          <p style={{ ...S.sectionLabel, margin: "0 0 1rem" }}>{Tr.recvReqs}</p>
          <div style={S.myReqGrid}>
            {receivedRequests.map((r) => (
              <div key={r.id} style={S.receivedReqCard}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <p style={S.myReqName}>{r.fromUserName || "—"}</p>
                  <button title={Tr.delete}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, display:"flex", alignItems:"center" }}
                    onClick={() => handleDeleteReceivedRequest(r.id)}
                    onMouseEnter={e=>e.currentTarget.style.color="#e8735a"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}
                  >{deleteIconSvg}</button>
                </div>
                {r.fromUserProfession && (
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>{r.fromUserProfession}</p>
                )}
                {r.fromUserEmail && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>{r.fromUserEmail}</p>
                )}
                {r.requestMessage && (
                  <div style={{ background:"#f5f8ff", border:"1.5px solid #daeaf8", borderInlineStart:"3px solid #4472b8", borderRadius:"10px", padding:"8px 12px", margin:"4px 0" }}>
                    <p style={{ fontSize:"10px", fontWeight:"700", color:"#4472b8", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 4px" }}>{Tr.reqMsgReceived}</p>
                    <p style={{ fontSize:"13px", color:"var(--text-primary)", margin:0, lineHeight:"1.55" }}>{r.requestMessage}</p>
                  </div>
                )}
                {!r.status ? (
                  <div style={S.receivedReqActions}>
                    <button style={S.acceptBtn} onClick={() => handleRespondRequest(r.id, "accepted")}>
                      {Tr.accept}
                    </button>
                    <button style={S.declineBtn} onClick={() => handleRespondRequest(r.id, "declined")}>
                      {Tr.decline}
                    </button>
                  </div>
                ) : (
                  <StatusPill status={r.status} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommended — at bottom ── */}
      {recommended.length > 0 && (
        <div ref={recommendedRef} style={{ marginTop: "1rem" }}>
          <p style={S.sectionLabel}>{Tr.recommended}</p>
          <div style={S.recGrid}>
            {recommended.map((u) => (
              <div key={u.id}
                style={{ ...S.recCard, cursor: onViewProfile ? "pointer" : "default" }}
                onClick={() => onViewProfile ? onViewProfile(u.id) : setSelectedUser(u)}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(29,72,150,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(29,72,150,0.05)"; }}
              >
                <div style={{ position: "relative" }}>
                  <MemberAvatar user={u} size={48} />
                  {isOnline(u) && (
                    <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#7ba87a", border: "2px solid var(--bg-primary)" }} />
                  )}
                </div>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{getFullName(u)}</p>
                {(u.currentRole || u.profession) && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{u.currentRole || u.profession}</p>
                )}
                {(u.region || u.city) && (
                  <span style={{ fontSize: "11px", color: "#1d4896", background: "#daeaf8", borderRadius: "99px", padding: "2px 9px" }}>
                    {u.region || u.city}
                  </span>
                )}
                {!cantSendHelp(u) && (
                  <button
                    style={requested[u.id]
                      ? { ...S.reqDoneBtn, width: "100%", padding: "6px 0", fontSize: "12px" }
                      : { ...S.reqBtn, width: "100%", padding: "6px 0", fontSize: "12px" }}
                    onClick={(e) => { e.stopPropagation(); initiateRequest(u); }}
                  >
                    {requested[u.id] ? Tr.sent : Tr.sendReq}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile modal */}
      {selectedUser && (
        <div style={S.overlay} onClick={() => setSelectedUser(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <p style={S.modalTitle}>{Tr.memberProfile}</p>
              <button style={S.closeBtn} onClick={() => setSelectedUser(null)}>{Tr.close}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MemberAvatar user={selectedUser} size={68} fontSize={22} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px" }}>
                {getFullName(selectedUser)}
              </p>
              {selectedUser.tagline && (
                <p style={{ fontSize: "13px", color: "#4472b8", fontStyle: "italic", margin: "0 0 4px" }}>
                  {selectedUser.tagline}
                </p>
              )}
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                {selectedUser.currentRole ?? selectedUser.profession ?? "—"}
              </p>
            </div>
            <div style={S.infoBlock}>
              {selectedUser.email && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{Tr.emailLbl}</p>
                  <p style={S.infoValue}>{selectedUser.email}</p>
                </div>
              )}
              {selectedUser.phone && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{Tr.phoneLbl}</p>
                  <p style={S.infoValue}>{selectedUser.phone}</p>
                </div>
              )}
              {(selectedUser.region || selectedUser.city) && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{Tr.regionLabel}</p>
                  <p style={S.infoValue}>{selectedUser.region || selectedUser.city}</p>
                </div>
              )}
              {selectedUser.campus && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{Tr.campusLabel}</p>
                  <p style={S.infoValue}>{selectedUser.campus}</p>
                </div>
              )}
              {selectedUser.bio && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{Tr.bioLabel}</p>
                  <p style={S.infoValue}>{selectedUser.bio}</p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {onMessage && selectedUser.id !== user?.uid && (
                <button style={{ ...S.modalReqBtn, flex: 1 }} onClick={() => onMessage(selectedUser.id)}>
                  {Tr.msgBtn}
                </button>
              )}
              {!cantSendHelp(selectedUser) && (
                <button
                  style={requested[selectedUser.id] ? S.modalReqDoneBtn : S.modalReqBtn}
                  onClick={() => { setSelectedUser(null); initiateRequest(selectedUser); }}
                  onMouseOver={(e) => { if (!requested[selectedUser.id]) e.currentTarget.style.background = "#1d4896"; }}
                  onMouseOut={(e)  => { if (!requested[selectedUser.id]) e.currentTarget.style.background = "#4472b8"; }}
                >
                  {requested[selectedUser.id] ? Tr.reqSent : Tr.sendReq}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingRequestTarget && (
        <RequestMessageModal
          targetUser={pendingRequestTarget}
          Tr={Tr}
          dir={dir}
          onConfirm={(message) => {
            handleRequest(pendingRequestTarget, message);
            setPendingRequestTarget(null);
          }}
          onCancel={() => setPendingRequestTarget(null)}
        />
      )}
    </div>
  );
}