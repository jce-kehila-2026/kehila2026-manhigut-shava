import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import { logActivity } from "./activityLogger";
import { useIsMobile } from "./hooks/useIsMobile";
import { getOrCreateConversation, sendHelpRequestPrompt } from "./hooks/useMessages";
import { translateProfession, translateLocation } from "./utils/translateProfile";
import MultiSelectDropdown from "./components/MultiSelectDropdown";
import HelpPostFeed from "./HelpPostFeed";

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
    emailLbl: "דוא״ל",
    phoneLbl: "טלפון",
    regionLabel: "אזור",
    campusLabel: "קמפוס",
    bioLabel: "ביוגרפיה",
    taglineLabel: "משפט",
    msgBtn: "שלחי הודעה",
    reqSent: "בקשה נשלחה",
    delete: "מחקי",
    searchBilingual: "חיפוש עובד בעברית, ערבית ואנגלית",
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
    recvReqs: "בקשות שהגיעו אליי",
    accept: "אשרי",
    decline: "דחי",
    statusPending: "ממתין לתשובה",
    statusAccepted: "אושר",
    statusDeclined: "נדחה",
    noSentRequests: "עדיין לא שלחת בקשות עזרה.",
    noReceivedRequests: "עדיין לא קיבלת בקשות עזרה.",
    resultsFound: "תוצאות",
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
    searchBilingual: "Search works in Hebrew, Arabic and English",
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
    recvReqs: "Requests I Received",
    accept: "Accept",
    decline: "Decline",
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusDeclined: "Declined",
    noSentRequests: "You haven't sent any help requests yet.",
    noReceivedRequests: "No help requests received yet.",
    resultsFound: "results",
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
    searchBilingual: "البحث يعمل بالعبرية والعربية والإنجليزية",
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
    recvReqs: "الطلبات الواردة",
    accept: "قبول",
    decline: "رفض",
    statusPending: "قيد الانتظار",
    statusAccepted: "تم القبول",
    statusDeclined: "تم الرفض",
    noSentRequests: "لم ترسلي أي طلبات مساعدة بعد.",
    noReceivedRequests: "لم تتلقي أي طلبات مساعدة بعد.",
    resultsFound: "نتائج",
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

/* All language variants per help area — matches users who registered in any language */
const AREAS_ALL_LANGS = {
  "קידום קריירה ותעסוקה":     ["קידום קריירה ותעסוקה","Career & Employment","التطوير المهني"],
  "פיתוח מנהיגות וניהול":     ["פיתוח מנהיגות וניהול","Leadership & Management","القيادة والإدارة"],
  "ניהול צוותים":              ["ניהול צוותים","Team Management","إدارة الفرق"],
  "חיבור למגזר הציבורי":      ["חיבור למגזר הציבורי","Public Sector","القطاع العام"],
  "חיבור למגזר הפרטי":        ["חיבור למגזר הפרטי","Private Sector","القطاع الخاص"],
  "הובלת מאבקים אזרחיים":     ["הובלת מאבקים אזרחיים","Civic Activism","النشاط المدني"],
  "יזמות עסקית וחברתית":      ["יזמות עסקית וחברתית","Business Entrepreneurship","ريادة الأعمال"],
  "ניהול קמפיינים פוליטיים":   ["ניהול קמפיינים פוליטיים","Political Campaigns","الحملات السياسية"],
  "התמודדות לתפקידים":         ["התמודדות לתפקידים","Running for Office","الترشح للمناصب"],
  "ניהול פיננסי":              ["ניהול פיננסי","Financial Management","الإدارة المالية"],
  "אוזן קשבת":                 ["אוזן קשבת","Active Listener","الاستماع الفعّال"],
};

/* Keyword expansion for free-text area search — maps typed terms to related profession keywords */
const KEYWORD_EXPANSIONS = {
  // English
  "education":   ["teacher","מורה","מחנך","מחנכת","professor","lecturer","הוראה","חינוך","pedagog","principal","school","kindergarten","גן ילדים"],
  "teacher":     ["מורה","מחנך","מחנכת","teacher","lecturer","professor","הוראה","חינוך"],
  "health":      ["doctor","רופא","רופאה","nurse","אחות","medical","physician","בריאות","רפואה","therapist","clinic","hospital","paramedic","חובש"],
  "doctor":      ["רופא","רופאה","doctor","physician","medical","clinician","surgeon","אורטופד","קרדיולוג"],
  "nurse":       ["אחות","nurse","nursing","רפואה","medical","paramedic"],
  "law":         ["lawyer","עורך","עורכת","attorney","legal","משפט","advocate","judge","שופט","notary","נוטריון"],
  "lawyer":      ["עורך","עורכת","lawyer","attorney","legal","משפט"],
  "tech":        ["engineer","מהנדס","מהנדסת","developer","software","programmer","תוכנה","היי-טק","hi-tech","data","cyber","קוד","devops","fullstack","frontend","backend"],
  "technology":  ["engineer","מהנדס","developer","software","programmer","תוכנה","היי-טק","data","cyber"],
  "engineering": ["מהנדס","מהנדסת","engineer","software","hardware","civil","mechanical","electrical","אלקטרוניקה"],
  "software":    ["developer","programmer","מהנדס","software","engineer","fullstack","frontend","backend","תוכנה","קוד"],
  "finance":     ["accountant","כלכל","banker","investment","financial","רואה חשבון","בנק","כלכלן","השקעות","analyst","cfo"],
  "accounting":  ["רואה חשבון","accountant","כלכל","finance","audit","ביקורת"],
  "business":    ["manager","מנהל","מנהלת","entrepreneur","יזם","יזמת","ceo","executive","startup","סטארט","עסק","ניהול"],
  "management":  ["מנהל","מנהלת","manager","director","executive","ceo","leader","ניהול","מנכ"],
  "media":       ["journalist","עיתונ","reporter","news","media","תקשורת","content","כתב","broadcasting","anchor","editor"],
  "journalism":  ["journalist","עיתונ","reporter","כתב","editor","news","broadcasting"],
  "politics":    ["politic","מדינ","ממשל","diplomat","minister","government","parliament","כנסת","mayor","עיריה","מועצה"],
  "design":      ["designer","מעצב","מעצבת","architect","ארכיטקט","graphic","ui","ux","creative","illustrator","interior"],
  "architecture":["ארכיטקט","architect","designer","urban","planning","תכנון"],
  "psychology":  ["psycholog","פסיכ","therapist","counselor","social worker","עו\"ס","mental health","psychiatrist","פסיכיאטר"],
  "therapy":     ["therapist","פסיכ","counselor","psycholog","social worker","עו\"ס","rehab","physical therapy","פיזיותרפיה"],
  "military":    ["army","צבא","officer","קצין","military","security","ביטחון","soldier","חייל","aman","אמן","shabak","שב\"כ"],
  "security":    ["ביטחון","security","army","צבא","officer","קצין","guard","שמירה"],
  "art":         ["artist","אמן","אמנית","musician","מוסיקאי","actor","שחקן","theater","תיאטרון","film","קולנוע","painter","צייר","sculptor","פסל"],
  "music":       ["musician","מוסיקאי","מוסיקאית","composer","מלחין","singer","זמר","זמרת","band","orchestra","תזמורת"],
  "research":    ["researcher","חוקר","חוקרת","scientist","מדע","academic","אקדמי","phd","postdoc","laboratory","מעבדה"],
  "academic":    ["professor","פרופ","lecturer","מרצה","researcher","חוקר","academic","university","אוניברסיטה","phd"],
  "marketing":   ["marketer","שיווק","marketing","brand","פרסום","advertising","pr","יחסי ציבור","social media","content"],
  "sales":       ["sales","מכירות","salesperson","account","business development","פיתוח עסקי"],
  "startup":     ["startup","סטארט","entrepreneur","יזם","יזמת","founder","venture","vc","angel"],
  "entrepreneur":["יזם","יזמת","entrepreneur","startup","founder","business owner"],
  "social":      ["social worker","עו\"ס","welfare","רווחה","ngo","nonprofit","עמותה","community","קהילה","volunteer","מתנדב"],
  "welfare":     ["welfare","רווחה","social worker","עו\"ס","ngo","nonprofit","עמותה"],
  // Hebrew
  "חינוך":       ["teacher","מורה","מחנך","מחנכת","professor","lecturer","הוראה","pedagog","principal","school"],
  "הוראה":       ["מורה","מחנך","מחנכת","teacher","lecturer","professor","חינוך"],
  "מורה":        ["teacher","מורה","מחנך","מחנכת","educator","lecturer","חינוך","הוראה"],
  "רפואה":       ["doctor","רופא","רופאה","nurse","אחות","medical","physician","בריאות","therapist"],
  "בריאות":      ["doctor","רופא","רופאה","nurse","אחות","medical","physician","therapist","חובש"],
  "משפט":        ["lawyer","עורך","עורכת","attorney","legal","advocate","שופט","נוטריון"],
  "טכנולוגיה":   ["engineer","מהנדס","developer","software","programmer","תוכנה","היי-טק","data","cyber"],
  "תוכנה":       ["developer","programmer","מהנדס","software","engineer","fullstack","frontend","backend","קוד"],
  "כלכלה":       ["accountant","כלכל","banker","investment","financial","רואה חשבון","בנק","כלכלן"],
  "עסקים":       ["manager","מנהל","מנהלת","entrepreneur","יזם","ceo","executive","startup","סטארט"],
  "ניהול":       ["מנהל","מנהלת","manager","director","executive","ceo","leader","מנכ"],
  "תקשורת":      ["journalist","עיתונ","reporter","כתב","editor","news","media","broadcasting"],
  "עיצוב":       ["designer","מעצב","מעצבת","architect","ארכיטקט","graphic","ui","ux","illustrator"],
  "פסיכולוגיה":  ["psycholog","פסיכ","therapist","counselor","social worker","עו\"ס","psychiatrist"],
  "צבא":         ["army","צבא","officer","קצין","military","security","ביטחון","soldier","חייל"],
  "אמנות":       ["artist","אמן","אמנית","musician","מוסיקאי","actor","שחקן","theater","film","painter"],
  "מחקר":        ["researcher","חוקר","חוקרת","scientist","מדע","academic","phd","מעבדה"],
  "שיווק":       ["marketer","שיווק","marketing","brand","פרסום","advertising","pr","יחסי ציבור"],
  "יזמות":       ["יזם","יזמת","entrepreneur","startup","founder","venture"],
  "רווחה":       ["social worker","עו\"ס","welfare","ngo","nonprofit","עמותה","volunteer"],
};

function expandSearchTerms(term) {
  const lower = term.toLowerCase().trim();
  const direct = KEYWORD_EXPANSIONS[lower] || [];
  // also check if any key partially matches (e.g. "edu" matches "education")
  const partial = Object.entries(KEYWORD_EXPANSIONS)
    .filter(([k]) => k !== lower && (k.startsWith(lower) || lower.startsWith(k)))
    .flatMap(([, v]) => v);
  return [lower, ...new Set([...direct, ...partial])];
}

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
  .result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(29,72,150,0.12) !important;
  }
  .prof-pill { transition: all 0.14s ease; cursor: pointer; }
  .prof-pill:hover { transform: translateY(-1px); }
  .search-btn:hover    { background: #1d4896 !important; }
  .view-btn:hover      { background: var(--bg-hover) !important; }
  .req-btn:hover       { background: var(--bg-hover) !important; }
  .suggest-item:hover  { background: var(--bg-hover) !important; }
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
  const { dark } = useTheme();
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
  const isActive = value && value !== "OTHER";
  const activeBg = dark ? "rgba(68,114,184,0.22)" : "#eef4ff";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 8,
          padding: "11px 14px", borderRadius: "13px",
          border: `1.5px solid ${isActive ? "#4472b8" : "var(--border)"}`,
          background: isActive ? activeBg : "var(--bg-secondary)",
          color: isActive ? (dark ? "#7aaecc" : "#1d4896") : "var(--text-muted)",
          fontSize: "14px", fontWeight: isActive ? 600 : 400,
          cursor: "pointer", fontFamily: "inherit",
          direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        {isActive ? (
          <span
            role="button"
            tabIndex={0}
            onMouseDown={e => { e.stopPropagation(); onChange(""); setOpen(false); }}
            style={{ fontSize: 18, lineHeight: 1, color: "var(--text-muted)", cursor: "pointer", flexShrink: 0 }}
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
                background: value === key ? activeBg : "transparent",
                border: "none",
                borderBottom: idx < areas.length - 1 ? "1px solid var(--border)" : "none",
                color: value === key ? (dark ? "#7aaecc" : "#1d4896") : "var(--text-primary)",
                fontSize: "13px", fontWeight: value === key ? 700 : 400,
                cursor: "pointer", textAlign: isRTL ? "right" : "left",
                direction: isRTL ? "rtl" : "ltr",
                fontFamily: "inherit",
              }}
            >
              {value === key && <span style={{ fontSize: 11, color: dark ? "#7aaecc" : "#4472b8" }}>✓</span>}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── StatusPill ─── */
function StatusPill({ status, Tr }) {
  const { dark } = useTheme();
  const map = {
    accepted: { bg: dark ? "rgba(127,168,122,0.14)" : "#f0fdf4", color: dark ? "#9ecb94" : "#3f6a3e", border: dark ? "rgba(127,168,122,0.3)" : "#cfe4ce" },
    declined:  { bg: dark ? "rgba(155,75,75,0.14)"  : "#fff0f0", color: dark ? "#d4a0a0" : "#9a4545", border: dark ? "rgba(155,75,75,0.3)"  : "#d99090" },
    null:      { bg: dark ? "rgba(68,114,184,0.14)"  : "#f0f6fb", color: dark ? "#7aaecc" : "#4472b8", border: dark ? "rgba(68,114,184,0.3)"  : "#daeaf8" },
  };
  const s = map[status] ?? map["null"];
  const label = status === "accepted" ? (Tr?.statusAccepted ?? "Accepted")
              : status === "declined"  ? (Tr?.statusDeclined ?? "Declined")
              : (Tr?.statusPending ?? "Pending");
  return (
    <span style={{
      fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: "inline-block",
    }}>{label}</span>
  );
}

/* ─── RequestMessageModal ─── */
function RequestMessageModal({ targetUser, Tr, dir, onConfirm, onCancel }) {
  const { lang } = useLang();
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
              <p style={{ fontSize:"11px", color:"var(--text-muted)", margin:0 }}>{targetUser.professionTranslations?.[lang] || translateProfession(targetUser.currentRole || targetUser.profession, lang)}</p>
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
  const { dark } = useTheme();
  const Tr = T[lang] || T.he;
  const isMobile = useIsMobile();

  const [memberName,     setMemberName]     = useState("");
  const [selectedRegion,   setSelectedRegion]   = useState("");
  const [selectedAreas,    setSelectedAreas]    = useState([]);
  const [professionFilter, setProfessionFilter] = useState("");
  const [otherRegion,      setOtherRegion]      = useState("");
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
  const [showRegionSuggests, setShowRegionSuggests] = useState(false);
  const [pendingRequestTarget, setPendingRequestTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("helpFeed"); // kept for compat, not used in main layout
  const [reqsExpanded, setReqsExpanded] = useState(false);
  const [recvExpanded, setRecvExpanded] = useState(false);
  const [panelState, setPanelState] = useState("normal"); // "closed" | "normal" | "wide"
  const [unifiedQuery, setUnifiedQuery] = useState("");
  const [showUnifiedSuggest, setShowUnifiedSuggest] = useState(false);
  const [unifiedDropPos, setUnifiedDropPos] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const nameInputRef = useRef(null);
  const unifiedInputRef = useRef(null);

  const effectiveRegion = selectedRegion === "OTHER" ? otherRegion : selectedRegion;
  const hasFilters = selectedAreas.length > 0 || !!selectedRegion;
  const toggleArea = (key) => setSelectedAreas(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

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

  const openUnifiedSuggest = () => {
    if (unifiedInputRef.current) {
      const r = unifiedInputRef.current.getBoundingClientRect();
      setUnifiedDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setShowUnifiedSuggest(true);
  };
  const unifiedSuggestions = unifiedQuery.trim().length > 0
    ? allUsers.filter((u) => getFullName(u).toLowerCase().includes(unifiedQuery.toLowerCase().trim())).slice(0, 6)
    : [];

  const runSearch = (overrideArea, overrideRegion) => {
    setLoading(true); setSearched(true);
    const regionQ = (overrideRegion !== undefined ? overrideRegion : effectiveRegion).trim();
    const areaQ   = (overrideArea   !== undefined ? overrideArea   : "").trim();
    const filtered = allUsers.filter((u) => {
      const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      const nameQ = memberName.toLowerCase();
      const matchName   = memberName
        ? fullName.includes(nameQ)
          || (u.profession ?? "").toLowerCase().includes(nameQ)
          || (u.currentRole ?? "").toLowerCase().includes(nameQ)
          || (u.bio ?? "").toLowerCase().includes(nameQ)
        : true;
      const matchRegion = regionQ
        ? (() => {
            const variants = REGION_ALL_LANGS[regionQ] || [regionQ];
            return variants.some(v => (u.region ?? "").includes(v));
          })()
        : true;
      const matchArea   = areaQ
        ? (() => {
            const isCanonical = !!AREAS_ALL_LANGS[areaQ];
            if (isCanonical) {
              const variants = AREAS_ALL_LANGS[areaQ];
              return (u.helpAreas ?? []).some(a => variants.some(v => a === v || a.includes(v)))
                || (u.profession ?? "").toLowerCase().includes(areaQ.toLowerCase())
                || (u.currentRole ?? "").toLowerCase().includes(areaQ.toLowerCase());
            }
            const terms = expandSearchTerms(areaQ);
            return terms.some(t =>
              (u.helpAreas ?? []).some(a => a.toLowerCase().includes(t))
              || (u.profession ?? "").toLowerCase().includes(t)
              || (u.currentRole ?? "").toLowerCase().includes(t)
              || (u.bio ?? "").toLowerCase().includes(t)
            );
          })()
        : true;
      return matchName && matchRegion && matchArea;
    });
    setResults(filtered);
    setLoading(false);
  };

  /* Live search — unified bar + right-panel filters */
  useEffect(() => {
    if (!allUsers.length) return;
    const q      = unifiedQuery.trim().toLowerCase();
    const region = selectedRegion === "OTHER" ? otherRegion.trim() : selectedRegion.trim();
    const pf     = professionFilter.trim().toLowerCase();
    if (!q && !region && !selectedAreas.length && !pf) { setResults([]); setSearched(false); return; }
    const id = setTimeout(() => {
      const filtered = allUsers.filter((u) => {
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        const matchUnified = !q || (() => {
          if (fullName.includes(q)) return true;
          const uRegion = (u.region ?? "").toLowerCase();
          const regionViaQuery = Object.entries(REGION_ALL_LANGS).some(([key, variants]) =>
            variants.some(v => v.toLowerCase().includes(q)) &&
            (u.region === key || variants.some(v => uRegion.includes(v.toLowerCase())))
          ) || uRegion.includes(q);
          if (regionViaQuery) return true;
          const terms = expandSearchTerms(q);
          return terms.some(t =>
            (u.helpAreas ?? []).some(a => a.toLowerCase().includes(t))
            || (u.profession ?? "").toLowerCase().includes(t)
            || (u.currentRole ?? "").toLowerCase().includes(t)
            || (u.bio ?? "").toLowerCase().includes(t)
          );
        })();
        const matchRegion = !region || (() => {
          const variants = REGION_ALL_LANGS[region] || [region];
          return variants.some(v => (u.region ?? "").includes(v));
        })();
        const matchArea = !selectedAreas.length || selectedAreas.some(areaKey => {
          const isCanonical = !!AREAS_ALL_LANGS[areaKey];
          if (isCanonical) {
            const variants = AREAS_ALL_LANGS[areaKey];
            return (u.helpAreas ?? []).some(a => variants.some(v => a === v || a.includes(v)))
              || (u.profession ?? "").toLowerCase().includes(areaKey.toLowerCase())
              || (u.currentRole ?? "").toLowerCase().includes(areaKey.toLowerCase());
          }
          const terms = expandSearchTerms(areaKey);
          return terms.some(t =>
            (u.helpAreas ?? []).some(a => a.toLowerCase().includes(t))
            || (u.profession ?? "").toLowerCase().includes(t)
            || (u.currentRole ?? "").toLowerCase().includes(t)
            || (u.bio ?? "").toLowerCase().includes(t)
          );
        });
        const matchProfession = !pf || (() => {
          const terms = expandSearchTerms(pf);
          return terms.some(t =>
            (u.profession ?? "").toLowerCase().includes(t)
            || (u.currentRole ?? "").toLowerCase().includes(t)
            || (u.bio ?? "").toLowerCase().includes(t)
          );
        })();
        return matchUnified && matchRegion && matchArea && matchProfession;
      });
      setResults(filtered);
      setSearched(true);
    }, 300);
    return () => clearTimeout(id);
  }, [unifiedQuery, selectedRegion, selectedAreas, otherRegion, professionFilter, allUsers]);

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
        fromUserProfession: senderProfile?.currentRole ?? senderProfile?.profession ?? "",
        requestMessage:     requestMessage,
        status:             null,
        createdAt:          new Date().toISOString(),
      });
      setRequested((prev) => ({ ...prev, [targetUser.id]: true }));
      logActivity({ type: "request_sent", actorId: user.uid, actorName: getFullName(senderProfile), targetId: targetUser.id, targetType: "user", details: { toName: getFullName(targetUser) } });

      try {
        await addDoc(collection(db, "notifications"), {
          toUserId: targetUser.id,
          fromUserId: user.uid,
          fromUserName: getFullName(senderProfile),
          fromUserAvatar: avatarUrl(senderProfile),
          type: "help_request",
          helpRequestId: reqRef.id,
          message: requestMessage || null,
          createdAt: new Date().toISOString(),
          read: false,
        });
      } catch (notifErr) {
        console.error("Help request notification write failed:", notifErr);
      }

      // ── also deliver the request as an interactive DM prompt ──
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
      background: active ? (dark ? "rgba(68,114,184,0.18)" : "#daeaf8") : "var(--bg-secondary)",
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
    regionTag: {
      fontSize: "12px", color: dark ? "#7aaecc" : "#1d4896",
      background: dark ? "rgba(68,114,184,0.16)" : "#daeaf8",
      border: `1px solid ${dark ? "rgba(68,114,184,0.3)" : "#c8e0f4"}`,
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
      flex: 1, padding: "9px 0",
      background: dark ? "rgba(68,114,184,0.14)" : "#eff6ff",
      color: dark ? "#7aaecc" : "#1d4896",
      border: `1.5px solid ${dark ? "rgba(68,114,184,0.3)" : "#bfdbfe"}`,
      borderRadius: "12px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
    },
    reqDoneBtn: {
      flex: 1, padding: "9px 0",
      background: dark ? "rgba(127,168,122,0.14)" : "#f0fdf4",
      color: dark ? "#9ecb94" : "#3f6a3e",
      border: `1.5px solid ${dark ? "rgba(127,168,122,0.3)" : "#cfe4ce"}`,
      borderRadius: "12px", fontSize: "13px", fontWeight: "600", cursor: "default",
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
      flex: 1, padding: "12px",
      background: dark ? "rgba(127,168,122,0.14)" : "#f0fdf4",
      color: dark ? "#9ecb94" : "#3f6a3e",
      border: `1.5px solid ${dark ? "rgba(127,168,122,0.3)" : "#cfe4ce"}`,
      borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "default",
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
    receivedReqCard: {
      background: "var(--bg-primary)", borderRadius: "16px", padding: "1.25rem",
      border: "1.5px solid var(--border)", borderInlineStart: "4px solid #4472b8",
      boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
      display: "flex", flexDirection: "column", gap: "6px",
    },
    receivedReqActions: { display: "flex", gap: 8, marginTop: 4 },
    acceptBtn: {
      flex: 1, padding: "8px 0",
      background: dark ? "rgba(127,168,122,0.14)" : "#f0fdf4",
      color: dark ? "#9ecb94" : "#3f6a3e",
      border: `1.5px solid ${dark ? "rgba(127,168,122,0.3)" : "#cfe4ce"}`,
      borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer",
    },
    declineBtn: {
      flex: 1, padding: "8px 0",
      background: dark ? "rgba(155,75,75,0.14)" : "#fff5f5",
      color: dark ? "#d4a0a0" : "#9a4545",
      border: `1.5px solid ${dark ? "rgba(155,75,75,0.3)" : "#f5c6c6"}`,
      borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer",
    },
  };

  const deleteIconSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );

  return (
    <div style={S.page}>

      {/* ── Expandable: My Requests + Received (side by side) ── */}
      {(reqsExpanded || recvExpanded) && (
        <div style={{ display:"flex", gap:"1rem", marginBottom:"1rem", direction:dir, alignItems:"flex-start", flexWrap: isMobile ? "wrap" : "nowrap" }}>

          {reqsExpanded && (
            <div style={{ flex:1, minWidth:0, background:"var(--bg-primary)", borderRadius:16, border:"1.5px solid var(--border)", borderInlineStart:"3px solid #e8735a", padding:"1rem", direction:dir }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
                <p style={{ ...S.sectionLabel, margin:0 }}>{Tr.myReqs}</p>
                <button onClick={()=>setReqsExpanded(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:20, lineHeight:1 }}>×</button>
              </div>
              {sentRequests.length === 0 ? <div style={S.emptyBox}>{Tr.noSentRequests}</div> : (
                <div style={{ display:"flex", overflowX:"auto", gap:"0.75rem", paddingBottom:4, scrollbarWidth:"thin" }}>
                  {sentRequests.map((r) => (
                    <div key={r.id} style={{ ...S.myReqCard, minWidth:200, flexShrink:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <p style={S.myReqName}>{r.toUserName||"—"}</p>
                        <button title={Tr.delete} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, display:"flex" }} onClick={()=>handleDeleteSentRequest(r.id)} onMouseEnter={e=>e.currentTarget.style.color="#e8735a"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>{deleteIconSvg}</button>
                      </div>
                      {r.requestMessage && <p style={{ fontSize:"12px", color:"var(--text-secondary)", margin:"2px 0 0", background:"var(--bg-secondary)", borderRadius:"9px", padding:"7px 10px", border:"1px solid var(--border)", lineHeight:"1.5", fontStyle:"italic" }}>{r.requestMessage}</p>}
                      <StatusPill status={r.status} Tr={Tr} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {recvExpanded && (
            <div style={{ flex:1, minWidth:0, background:"var(--bg-primary)", borderRadius:16, border:"1.5px solid var(--border)", borderInlineStart:"3px solid #4472b8", padding:"1rem", direction:dir }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
                <p style={{ ...S.sectionLabel, margin:0 }}>{Tr.recvReqs}</p>
                <button onClick={()=>setRecvExpanded(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:20, lineHeight:1 }}>×</button>
              </div>
              {receivedRequests.length === 0 ? <div style={S.emptyBox}>{Tr.noReceivedRequests}</div> : (
                <div style={{ display:"flex", overflowX:"auto", gap:"0.75rem", paddingBottom:4, scrollbarWidth:"thin" }}>
                  {receivedRequests.map((r) => (
                    <div key={r.id} style={{ ...S.receivedReqCard, minWidth:200, flexShrink:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <p style={S.myReqName}>{r.fromUserName||"—"}</p>
                          {r.fromUserProfession && <p style={{ fontSize:"12px", color:"var(--text-secondary)", margin:"2px 0 0" }}>{r.fromUserProfession}</p>}
                        </div>
                        <button title={Tr.delete} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, display:"flex" }} onClick={()=>handleDeleteReceivedRequest(r.id)} onMouseEnter={e=>e.currentTarget.style.color="#e8735a"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>{deleteIconSvg}</button>
                      </div>
                      {r.requestMessage && (
                        <div style={{ background:dark?"rgba(68,114,184,0.1)":"#f5f8ff", border:`1.5px solid ${dark?"rgba(68,114,184,0.25)":"#daeaf8"}`, borderInlineStart:"3px solid #4472b8", borderRadius:"10px", padding:"8px 12px", margin:"4px 0" }}>
                          <p style={{ fontSize:"10px", fontWeight:"700", color:dark?"#7aaecc":"#4472b8", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 4px" }}>{Tr.reqMsgReceived}</p>
                          <p style={{ fontSize:"13px", color:"var(--text-primary)", margin:0, lineHeight:"1.55" }}>{r.requestMessage}</p>
                        </div>
                      )}
                      {!r.status ? (
                        <div style={S.receivedReqActions}>
                          <button style={S.acceptBtn} onClick={()=>handleRespondRequest(r.id,"accepted")}>{Tr.accept}</button>
                          <button style={S.declineBtn} onClick={()=>handleRespondRequest(r.id,"declined")}>{Tr.decline}</button>
                        </div>
                      ) : <StatusPill status={r.status} Tr={Tr} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Main layout: Posts (left) + Find Member (right) ── */}
      <div style={{ display:"flex", direction:"ltr", gap:"1.25rem", alignItems:"flex-start" }}>

        {/* ── LEFT: Help Posts Feed ── */}
        <div style={{ flex:1.5, minWidth:0 }}>
          <HelpPostFeed
            onViewProfile={onViewProfile}
            headerActions={<>
              {sentRequests.length > 0 && (
                <button onClick={()=>setReqsExpanded(v=>!v)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 13px", borderRadius:99, border:`1.5px solid ${dark?"rgba(68,114,184,0.35)":"#c7d9f5"}`, background:dark?"rgba(68,114,184,0.13)":"#eef4ff", color:"#4472b8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {lang==="he"?"הבקשות שלי":lang==="ar"?"طلباتي":"My Requests"}
                  <span style={{ background:"#4472b8", color:"#fff", borderRadius:99, fontSize:10, padding:"1px 6px", minWidth:16, textAlign:"center" }}>{sentRequests.length}</span>
                </button>
              )}
              {receivedRequests.length > 0 && (
                <button onClick={()=>setRecvExpanded(v=>!v)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 13px", borderRadius:99, border:`1.5px solid ${dark?"rgba(68,114,184,0.35)":"#c3d4f5"}`, background:dark?"rgba(68,114,184,0.1)":"#f0f5ff", color:"#4472b8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {lang==="he"?"קיבלתי":lang==="ar"?"الواردة":"Received"}
                  {receivedRequests.filter(r=>!r.status).length > 0 && (
                    <span style={{ background:"#4472b8", color:"#fff", borderRadius:99, fontSize:10, padding:"1px 6px", minWidth:16, textAlign:"center" }}>{receivedRequests.filter(r=>!r.status).length}</span>
                  )}
                </button>
              )}
            </>}
          />
        </div>

        {/* ── RIGHT: Find a Member panel (desktop only, collapsible) ── */}
        {!isMobile && (
          <div style={{ flexShrink:0, display:"flex", alignItems:"flex-start", position:"sticky", top:16, alignSelf:"flex-start" }}>

            {/* Toggle strip — the "tab" on the left edge of the panel */}
            <div style={{ width:32, display:"flex", flexDirection:"column", alignItems:"center", gap:6, paddingTop:4, marginInlineEnd: panelState !== "closed" ? 8 : 0 }}>
              <button
                onClick={() => setPanelState(s => s === "closed" ? "normal" : "closed")}
                title={panelState !== "closed" ? (lang==="he"?"סגור":lang==="ar"?"إغلاق":"Collapse") : (lang==="he"?"חיפוש ישיר":lang==="ar"?"بحث مباشر":"Find a Member")}
                style={{ width:32, height:32, borderRadius:10, border:"1.5px solid rgba(68,114,184,0.4)", background:"rgba(68,114,184,0.08)", color:"#4472b8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s", boxShadow:"0 2px 8px rgba(68,114,184,0.12)" }}
                onMouseEnter={e => { e.currentTarget.style.background="#4472b8"; e.currentTarget.style.color="#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(68,114,184,0.08)"; e.currentTarget.style.color="#4472b8"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: panelState !== "closed" ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.2s" }}>
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              {panelState !== "closed" && (
                <button
                  onClick={() => setPanelState(s => s === "wide" ? "normal" : "wide")}
                  style={{ width:"auto", height:28, padding:"0 8px", borderRadius:8, border:"1.5px solid rgba(68,114,184,0.35)", background:"rgba(68,114,184,0.08)", color:"#4472b8", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, fontFamily:"inherit", transition:"all 0.15s", whiteSpace:"nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#4472b8"; e.currentTarget.style.color="#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(68,114,184,0.08)"; e.currentTarget.style.color="#4472b8"; }}
                >
                  {panelState === "wide" ? (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 9 3 9 9"/><polyline points="15 21 9 21 9 15"/></svg>{lang==="he"?"צמצם":lang==="ar"?"تضييق":"Narrow"}</>
                  ) : (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 3 15 3 15 9"/><polyline points="21 21 15 21 15 15"/></svg>{lang==="he"?"הרחב":lang==="ar"?"توسيع":"Widen"}</>
                  )}
                </button>
              )}
              {panelState === "closed" && (
                <svg style={{ opacity:0.3, marginTop:4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              )}
            </div>

            {/* Panel body — hidden when collapsed */}
            {panelState !== "closed" && (
              <div style={{ width: panelState === "wide" ? 460 : 288, direction:dir, maxHeight:"calc(100vh - 80px)", overflowY:"auto", overscrollBehavior:"contain", transition:"width 0.2s ease" }}>

                {/* Search input box */}
                <div style={{ background:"var(--bg-primary)", borderRadius:14, border:"1.5px solid var(--border)", padding:"0.85rem", marginBottom:"0.6rem" }}>
                  <p style={{ ...S.sectionLabel, margin:"0 0 0.55rem", fontSize:11 }}>{lang==="he"?"חיפוש ישיר":lang==="ar"?"بحث مباشر":"Find a Member"}</p>
                  <div style={{ position:"relative" }}>
                    <input ref={unifiedInputRef} className="support-input" style={{ ...S.input, paddingInlineStart:32, fontSize:13 }}
                      type="text"
                      placeholder={lang==="he"?"שם, אזור...":lang==="ar"?"الاسم، المنطقة...":"Name, area..."}
                      value={unifiedQuery}
                      onChange={(e) => { setUnifiedQuery(e.target.value); openUnifiedSuggest(); }}
                      onFocus={openUnifiedSuggest}
                      onBlur={() => setTimeout(() => setShowUnifiedSuggest(false), 160)}
                      onKeyDown={(e) => { if (e.key === "Enter") setShowUnifiedSuggest(false); }}
                      autoComplete="off"
                    />
                    <span style={{ position:"absolute", top:"50%", transform:"translateY(-50%)", [isRTL?"right":"left"]:9, color:"var(--text-muted)", pointerEvents:"none", display:"flex" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    </span>
                    {unifiedQuery.trim().length > 0 && (
                      <button onMouseDown={() => { setUnifiedQuery(""); setShowUnifiedSuggest(false); }}
                        style={{ position:"absolute", top:"50%", transform:"translateY(-50%)", [isRTL?"left":"right"]:7, background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:"2px", display:"flex", borderRadius:"50%" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    {showUnifiedSuggest && unifiedSuggestions.length > 0 && (
                      <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"var(--bg-primary)", border:"1.5px solid var(--border)", borderRadius:12, boxShadow:"0 6px 20px rgba(29,72,150,0.12)", maxHeight:150, overflowY:"auto", zIndex:300, direction:dir }}>
                        {unifiedSuggestions.map((s,i) => (
                          <button key={s} type="button" onMouseDown={()=>{setUnifiedQuery(s);setShowUnifiedSuggest(false);}} style={{ width:"100%", textAlign:isRTL?"right":"left", padding:"7px 11px", background:"transparent", border:"none", borderBottom:i<unifiedSuggestions.length-1?"1px solid var(--border)":"none", fontSize:12, color:"var(--text-primary)", cursor:"pointer", fontFamily:"inherit" }}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters box */}
                <div style={{ background:"var(--bg-primary)", borderRadius:14, border:"1.5px solid var(--border)", padding:"0.85rem", marginBottom:"0.6rem" }}>
                  <p style={{ ...S.sectionLabel, margin:"0 0 0.55rem", fontSize:11 }}>{lang==="he"?"פילטרים":lang==="ar"?"الفلاتر":"Filters"}</p>
                  <div style={{ marginBottom:"0.45rem" }}>
                    <label style={S.label}>{Tr.helpAreaLbl}</label>
                    <div style={{ marginTop:3 }}>
                      <MultiSelectDropdown
                        options={(Tr.helpAreas||[]).map((label,i)=>({ value:AREAS_KEYS[i], label }))}
                        selectedValues={selectedAreas}
                        onChange={setSelectedAreas}
                        placeholder={lang==="he"?"כל התחומים...":lang==="ar"?"جميع المجالات...":"All areas..."}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom:"0.45rem" }}>
                    <label style={S.label}>{Tr.regionLbl}</label>
                    <div style={{ marginTop:3 }}>
                      <AreaDropdown value={selectedRegion} onChange={(k)=>{setSelectedRegion(k);setOtherRegion("");}} areas={[...(Tr.regions||[]).map((label,i)=>({label,key:REGIONS_KEYS[i]})),{label:Tr.otherLbl,key:"OTHER"}]} placeholder={lang==="he"?"כל האזורים...":lang==="ar"?"جميع المناطق...":"All regions..."} isRTL={isRTL}/>
                      {selectedRegion==="OTHER" && (
                        <div style={{ position:"relative", marginTop:5 }}>
                          <input className="support-input" style={{ ...S.input, fontSize:12 }} type="text" placeholder={Tr.otherPh} value={otherRegion} onChange={(e)=>{setOtherRegion(e.target.value);setShowRegionSuggests(true);}} onBlur={()=>setTimeout(()=>setShowRegionSuggests(false),160)} autoComplete="off"/>
                          {showRegionSuggests && otherRegion.trim().length>=1 && (() => {
                            const q = otherRegion.trim().toLowerCase();
                            const opts = [...new Set(allUsers.flatMap(u=>[u.region].filter(Boolean)).filter(v=>v.toLowerCase().includes(q)&&!REGIONS_KEYS.includes(v)))].slice(0,6);
                            return opts.length>0 ? (
                              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--bg-primary)",border:"1.5px solid var(--border)",borderRadius:10,boxShadow:"0 4px 16px rgba(29,72,150,0.1)",maxHeight:140,overflowY:"auto",zIndex:300}}>
                                {opts.map((s,i)=><button key={s} type="button" onMouseDown={()=>{setOtherRegion(s);setShowRegionSuggests(false);}} style={{width:"100%",textAlign:isRTL?"right":"left",padding:"7px 11px",background:"transparent",border:"none",borderBottom:i<opts.length-1?"1px solid var(--border)":"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",direction:isRTL?"rtl":"ltr"}}>{s}</button>)}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  {hasFilters && (
                    <button onClick={()=>{setSelectedAreas([]);setSelectedRegion("");setOtherRegion("");}}
                      style={{ background:"none", border:"none", color:"#e8735a", fontSize:11, fontWeight:600, cursor:"pointer", padding:"2px 0", display:"block", fontFamily:"inherit" }}>
                      {lang==="he"?"נקי פילטרים":lang==="ar"?"مسح الفلاتر":"Clear filters"}
                    </button>
                  )}
                </div>

                {/* Sort + layout controls */}
                {searched && sortedResults.length > 0 && (
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:"0.5rem", flexWrap:"wrap" }}>
                    <div style={{ display:"flex", gap:3, background:"var(--bg-secondary)", borderRadius:8, padding:2, border:"1px solid var(--border)" }}>
                      {[
                        { key:"recent", label:lang==="he"?"אחרונים":lang==="ar"?"الأحدث":"Recent" },
                        { key:"alpha",  label:lang==="he"?"א–ת":lang==="ar"?"أ–ي":"A–Z" },
                      ].map(({ key, label }) => (
                        <button key={key} onClick={() => setSortMode(key)} style={{ padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:sortMode===key?"var(--bg-primary)":"transparent", color:sortMode===key?"var(--text-primary)":"var(--text-muted)", boxShadow:sortMode===key?"0 1px 3px rgba(0,0,0,0.08)":"none", fontFamily:"inherit" }}>{label}</button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:3, background:"var(--bg-secondary)", borderRadius:8, padding:2, border:"1px solid var(--border)" }}>
                      {[
                        { mode:"cards", icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
                        { mode:"list",  icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
                      ].map(({ mode, icon }) => (
                        <button key={mode} onClick={() => setLayoutMode(mode)} style={{ width:26, height:26, borderRadius:6, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background:layoutMode===mode?"var(--bg-primary)":"transparent", color:layoutMode===mode?"var(--text-primary)":"var(--text-muted)", boxShadow:layoutMode===mode?"0 1px 3px rgba(0,0,0,0.08)":"none" }}>{icon}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search results */}
                {!searched && !hasFilters && (
                  <div style={{ background:"var(--bg-primary)", borderRadius:14, border:"1.5px solid var(--border)", padding:"1.25rem 1rem", textAlign:"center" }}>
                    <img src="/FindHelpSymbol.png" style={{ width:48, height:48, objectFit:"contain", display:"block", margin:"0 auto 0.5rem", opacity:0.7 }} alt="" />
                    <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>{Tr.noFilter}</p>
                    {recommended.length > 0 && (
                      <div style={{ marginTop:"0.85rem", textAlign:isRTL?"right":"left" }}>
                        <p style={{ ...S.sectionLabel, fontSize:10, marginBottom:"0.5rem" }}>{Tr.recommended}</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:"0.45rem" }}>
                          {recommended.slice(0,4).map(u => {
                            const name = getFullName(u);
                            const prof = u.professionTranslations?.[lang] || translateProfession(u.currentRole ?? u.profession, lang) || "";
                            const sent = !!requested[u.id];
                            return (
                              <div key={u.id} style={{ display:"flex", gap:9, alignItems:"center", padding:"0.5rem 0.6rem", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg-secondary)", cursor:"pointer" }}
                                onClick={() => setSelectedUser(u)}>
                                <MemberAvatar user={u} size={40} fontSize={14} />
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                                  {prof && <p style={{ margin:0, fontSize:10, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prof}</p>}
                                </div>
                                {!cantSendHelp(u) && (
                                  <button onClick={e=>{e.stopPropagation();initiateRequest(u);}} disabled={sent} style={{ padding:"4px 9px", borderRadius:7, border:"none", background:sent?"var(--bg-secondary)":"#4472b8", color:sent?"var(--text-muted)":"#fff", fontSize:10, fontWeight:700, cursor:sent?"default":"pointer", fontFamily:"inherit", flexShrink:0 }}>
                                    {sent?"✓":Tr.sendReq}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {searched && results.length === 0 && (
                  <div style={{ ...S.emptyBox, fontSize:12 }}>{Tr.noResults}</div>
                )}
                {searched && sortedResults.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap: layoutMode==="list"?"0.3rem":"0.5rem" }}>
                    {sortedResults.map((u) => {
                      const name = getFullName(u);
                      const prof = u.professionTranslations?.[lang] || translateProfession(u.currentRole ?? u.profession, lang) || "";
                      const sent = !!requested[u.id];
                      if (layoutMode === "list") {
                        return (
                          <div key={u.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"0.45rem 0.6rem", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg-primary)", cursor:"pointer" }}
                            onClick={() => setSelectedUser(u)}>
                            <MemberAvatar user={u} size={36} fontSize={13} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ margin:0, fontSize:12, fontWeight:700, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                              {prof && <p style={{ margin:0, fontSize:10, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prof}</p>}
                            </div>
                            {!cantSendHelp(u) && (
                              <button onClick={e=>{e.stopPropagation();initiateRequest(u);}} disabled={sent} style={{ padding:"4px 9px", borderRadius:7, border:"none", background:sent?"var(--bg-secondary)":"#4472b8", color:sent?"var(--text-muted)":"#fff", fontSize:10, fontWeight:700, cursor:sent?"default":"pointer", fontFamily:"inherit", flexShrink:0 }}>
                                {sent?"✓":Tr.sendReq}
                              </button>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div key={u.id} style={{ background:"var(--bg-primary)", borderRadius:12, border:"1.5px solid var(--border)", padding:"0.7rem", cursor:"pointer" }}
                          onClick={() => setSelectedUser(u)}>
                          <div style={{ display:"flex", gap:9, alignItems:"center", marginBottom:8 }}>
                            <MemberAvatar user={u} size={48} fontSize={16} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                              {prof && <p style={{ margin:0, fontSize:11, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prof}</p>}
                              {u.region && <span style={{ fontSize:10, color:"var(--text-muted)" }}>{translateLocation(u.region, lang)}</span>}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:5 }} onClick={e=>e.stopPropagation()}>
                            <button onClick={() => setSelectedUser(u)} style={{ flex:1, padding:"5px 0", borderRadius:8, border:"1.5px solid var(--border)", background:"none", color:"var(--text-secondary)", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{Tr.viewProfile}</button>
                            {!cantSendHelp(u) && (
                              <button onClick={() => initiateRequest(u)} disabled={sent} style={{ flex:1, padding:"5px 0", borderRadius:8, border:"none", background:sent?"var(--bg-secondary)":"#4472b8", color:sent?"var(--text-muted)":"#fff", fontSize:11, fontWeight:600, cursor:sent?"default":"pointer", fontFamily:"inherit" }}>
                                {sent ? Tr.sent : Tr.sendReq}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>{/* end main two-col */}

      {/* ── Mobile: collapsible search panel ── */}
      {isMobile && (
        <div style={{ marginTop:"1rem", direction:dir }}>
          <button onClick={()=>setFiltersOpen(v=>!v)} style={{ width:"100%", padding:"10px 16px", borderRadius:12, border:"1.5px solid var(--border)", background:"var(--bg-primary)", color:"var(--text-primary)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
            <span>{lang==="he"?"חיפוש חברה":lang==="ar"?"البحث عن عضوة":"Find a Member"}</span>
            <span style={{ opacity:0.5, fontSize:11 }}>{filtersOpen?"▲":"▼"}</span>
          </button>
          {filtersOpen && (
            <div style={{ background:"rgba(68,114,184,0.04)", borderRadius:14, border:"1.5px solid rgba(68,114,184,0.22)", padding:"1rem" }}>
              <div style={{ position:"relative", marginBottom:"0.5rem" }}>
                <input ref={unifiedInputRef} className="support-input" style={{ ...S.input, paddingInlineStart:36, fontSize:13 }}
                  type="text" placeholder={lang==="he"?"שם, תחום, אזור...":lang==="ar"?"الاسم، المجال...":"Name, profession, area..."} value={unifiedQuery}
                  onChange={(e)=>{ setUnifiedQuery(e.target.value); openUnifiedSuggest(); }} onFocus={openUnifiedSuggest} onBlur={()=>setTimeout(()=>setShowUnifiedSuggest(false),160)} autoComplete="off"
                />
                <span style={{ position:"absolute", top:"50%", transform:"translateY(-50%)", [isRTL?"right":"left"]:10, color:"var(--text-muted)", pointerEvents:"none", display:"flex" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </span>
              </div>
              <div style={{ marginBottom:"0.4rem" }}>
                <label style={S.label}>{Tr.helpAreaLbl}</label>
                <div style={{ marginTop:3 }}>
                  <MultiSelectDropdown options={(Tr.helpAreas||[]).map((label,i)=>({ value:AREAS_KEYS[i], label }))} selectedValues={selectedAreas} onChange={setSelectedAreas} placeholder={lang==="he"?"כל התחומים...":lang==="ar"?"جميع المجالات...":"All areas..."}/>
                </div>
              </div>
              <div style={{ marginBottom:"0.4rem" }}>
                <label style={S.label}>{Tr.regionLbl}</label>
                <div style={{ marginTop:3 }}>
                  <AreaDropdown value={selectedRegion} onChange={(k)=>{setSelectedRegion(k);setOtherRegion("");}} areas={[...(Tr.regions||[]).map((label,i)=>({label,key:REGIONS_KEYS[i]})),{label:Tr.otherLbl,key:"OTHER"}]} placeholder={lang==="he"?"כל האזורים...":lang==="ar"?"جميع المناطق...":"All regions..."} isRTL={isRTL}/>
                </div>
              </div>
              {hasFilters && <button onClick={()=>{setSelectedAreas([]);setSelectedRegion("");setOtherRegion("");}} style={{ background:"none", border:"none", color:"#e8735a", fontSize:12, fontWeight:600, cursor:"pointer", padding:"3px 0", fontFamily:"inherit" }}>{lang==="he"?"נקי":lang==="ar"?"مسح":"Clear"}</button>}
              {searched && results.length > 0 && (
                <div style={{ marginTop:"0.75rem" }}>
                  <p style={{ ...S.sectionLabel, marginBottom:"0.4rem", fontSize:11 }}>{results.length} {Tr.resultsFound}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                    {sortedResults.map((u) => {
                      const name = getFullName(u);
                      const sent = !!requested[u.id];
                      return (
                        <div key={u.id} style={{ display:"flex", gap:8, alignItems:"center", background:"var(--bg-secondary)", borderRadius:10, border:"1px solid var(--border)", padding:"0.55rem 0.65rem" }}>
                          <MemberAvatar user={u} size={30} fontSize={12} />
                          <p style={{ margin:0, fontSize:12, fontWeight:700, color:"var(--text-primary)", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                          <button onClick={()=>initiateRequest(u)} disabled={sent} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:sent?"var(--bg-secondary)":"#4472b8", color:sent?"var(--text-muted)":"#fff", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                            {sent?"✓":Tr.sendReq}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {searched && results.length === 0 && <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:"0.5rem" }}>{Tr.noResults}</p>}
            </div>
          )}
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
                {selectedUser.professionTranslations?.[lang] || translateProfession(selectedUser.currentRole ?? selectedUser.profession, lang) || "—"}
              </p>
            </div>
            <div style={S.infoBlock}>
              {selectedUser.region && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{Tr.regionLabel}</p>
                  <p style={S.infoValue}>{translateLocation(selectedUser.region, lang)}</p>
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
