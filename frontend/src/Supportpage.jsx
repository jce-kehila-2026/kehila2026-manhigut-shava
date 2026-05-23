import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, query, where, updateDoc, doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import ConnectButton from "./ConnectButton";

/* ─── Inject styles ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
  * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .support-input:focus, .support-select:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15) !important;
    background: #fff !important;
    outline: none;
  }
  .result-card { animation: fadeSlideUp 0.32s ease both; }
  .result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.1) !important;
  }
  .suggested-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.12) !important;
  }
  .search-btn:hover    { background: #122d47 !important; }
  .clear-btn:hover     { background: #e2e8f0 !important; }
  .view-btn:hover      { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
  .req-btn:hover       { background: #dbeafe !important; }
  .mark-done-btn:hover { background: #d1fae5 !important; }
  .category-pill {
    transition: all 0.15s;
    cursor: pointer;
  }
  .category-pill:hover {
    background: #dbeafe !important;
    border-color: #93c5fd !important;
    color: #1e40af !important;
  }
  .category-pill-active:hover { background: #1d4ed8 !important; }
  .modal-primary-btn:hover { background: #122d47 !important; }
  .modal-submit-btn:hover  { background: #0284c7 !important; }
`;
if (!document.head.querySelector("#support-styles")) {
  styleTag.id = "support-styles";
  document.head.appendChild(styleTag);
}

/* ══════════════════════════════════════════════════════
   CITY DATA — bilingual labels + normalization
═══════════════════════════════════════════════════════ */
const CITIES = [
  { key: "tel_aviv",    he: "תל אביב",      en: "Tel Aviv",      ar: "تل أبيب"      },
  { key: "jerusalem",   he: "ירושלים",      en: "Jerusalem",     ar: "القدس"         },
  { key: "haifa",       he: "חיפה",         en: "Haifa",         ar: "حيفا"          },
  { key: "beer_sheva",  he: "באר שבע",      en: "Beer Sheva",    ar: "بئر السبع"     },
  { key: "netanya",     he: "נתניה",        en: "Netanya",       ar: "نتانيا"        },
  { key: "rishon",      he: "ראשון לציון",  en: "Rishon LeZion", ar: "ريشون لتسيون"  },
  { key: "petah_tikva", he: "פתח תקווה",    en: "Petah Tikva",   ar: "بتاح تكفا"     },
  { key: "ashdod",      he: "אשדוד",        en: "Ashdod",        ar: "أشدود"         },
  { key: "holon",       he: "חולון",        en: "Holon",         ar: "حولون"         },
  { key: "ramat_gan",   he: "רמת גן",       en: "Ramat Gan",     ar: "رامات غان"     },
  { key: "rehovot",     he: "רחובות",       en: "Rehovot",       ar: "رحوفوت"        },
  { key: "herzliya",    he: "הרצליה",       en: "Herzliya",      ar: "هرتسليا"       },
  { key: "modiin",      he: "מודיעין",      en: "Modi'in",       ar: "موديعين"       },
  { key: "nahariya",    he: "נהריה",        en: "Nahariya",      ar: "نهاريا"        },
  { key: "nazareth",    he: "נצרת",         en: "Nazareth",      ar: "الناصرة"       },
  { key: "acre",        he: "עכו",          en: "Acre",          ar: "عكا"           },
  { key: "eilat",       he: "אילת",         en: "Eilat",         ar: "إيلات"         },
  { key: "tiberias",    he: "טבריה",        en: "Tiberias",      ar: "طبريا"         },
  { key: "kfar_saba",   he: "כפר סבא",      en: "Kfar Saba",     ar: "كفر سابا"      },
  { key: "bat_yam",     he: "בת ים",        en: "Bat Yam",       ar: "بات يام"       },
];

/* Every known variant → canonical key */
const CITY_ALIASES = {
  // Tel Aviv
  "tel aviv": "tel_aviv",     "tel-aviv": "tel_aviv",       "telaviv": "tel_aviv",
  "תל אביב": "tel_aviv",      "תל-אביב": "tel_aviv",        'ת"א': "tel_aviv",
  "تل أبيب": "tel_aviv",
  // Jerusalem
  "jerusalem": "jerusalem",   "yerushalayim": "jerusalem",  "jerusaelm": "jerusalem",
  "jerusaem": "jerusalem",    "ירושלים": "jerusalem",        "القدس": "jerusalem",
  "al quds": "jerusalem",
  // Haifa
  "haifa": "haifa",           "hefa": "haifa",
  "חיפה": "haifa",            "حيفا": "haifa",
  // Beer Sheva
  "beer sheva": "beer_sheva", "be'er sheva": "beer_sheva",  "beersheba": "beer_sheva",
  "beer-sheva": "beer_sheva", "be'ersheva": "beer_sheva",   "beer sheba": "beer_sheva",
  "באר שבע": "beer_sheva",    "بئر السبع": "beer_sheva",
  // Netanya
  "netanya": "netanya",       "natanya": "netanya",         "natanya": "netanya",
  "נתניה": "netanya",         "نتانيا": "netanya",
  // Rishon LeZion
  "rishon lezion": "rishon",  "rishon le-zion": "rishon",   "rishon": "rishon",
  "rishon letzion": "rishon",
  "ראשון לציון": "rishon",    "ריצ'ון": "rishon",            "ريشون لتسيون": "rishon",
  // Petah Tikva
  "petah tikva": "petah_tikva", "petach tikva": "petah_tikva", "petah tiqva": "petah_tikva",
  "פתח תקווה": "petah_tikva",   "פ\"ת": "petah_tikva",          "بتاح تكفا": "petah_tikva",
  // Ashdod
  "ashdod": "ashdod",         "אשדוד": "ashdod",             "أشدود": "ashdod",
  // Holon
  "holon": "holon",           "חולון": "holon",              "حولون": "holon",
  // Ramat Gan
  "ramat gan": "ramat_gan",   "ramat-gan": "ramat_gan",
  "רמת גן": "ramat_gan",      "رامات غان": "ramat_gan",
  // Rehovot
  "rehovot": "rehovot",       "rehovoth": "rehovot",
  "רחובות": "rehovot",        "رحوفوت": "rehovot",
  // Herzliya
  "herzliya": "herzliya",     "herzelia": "herzliya",        "herzliyya": "herzliya",
  "הרצליה": "herzliya",       "هرتسليا": "herzliya",
  // Modi'in
  "modiin": "modiin",         "modi'in": "modiin",           "modin": "modiin",
  "מודיעין": "modiin",        "موديعين": "modiin",
  // Nahariya
  "nahariya": "nahariya",     "nahariyya": "nahariya",
  "נהריה": "nahariya",        "نهاريا": "nahariya",
  // Nazareth
  "nazareth": "nazareth",     "natzrat": "nazareth",         "natzeret": "nazareth",
  "נצרת": "nazareth",         "الناصرة": "nazareth",
  // Acre / Akko
  "acre": "acre",             "akko": "acre",                "acco": "acre",
  "עכו": "acre",              "عكا": "acre",
  // Eilat
  "eilat": "eilat",           "elat": "eilat",
  "אילת": "eilat",            "إيلات": "eilat",
  // Tiberias
  "tiberias": "tiberias",     "tveria": "tiberias",          "teverya": "tiberias",
  "טבריה": "tiberias",        "طبريا": "tiberias",
  // Kfar Saba
  "kfar saba": "kfar_saba",   "kafr saba": "kfar_saba",
  "כפר סבא": "kfar_saba",     "كفر سابا": "kfar_saba",
  // Bat Yam
  "bat yam": "bat_yam",       "bat-yam": "bat_yam",
  "בת ים": "bat_yam",         "بات يام": "bat_yam",
};

function normalizeCityToKey(rawCity) {
  if (!rawCity) return null;
  const trimmed = rawCity.trim();
  const lower   = trimmed.toLowerCase();
  if (CITY_ALIASES[trimmed]) return CITY_ALIASES[trimmed];
  if (CITY_ALIASES[lower])   return CITY_ALIASES[lower];
  for (const city of CITIES) {
    if (
      lower === city.en.toLowerCase() ||
      trimmed === city.he ||
      trimmed === city.ar
    ) return city.key;
  }
  return null; // truly unknown city
}

/* ══════════════════════════════════════════════════════
   PROFESSION CATEGORIES — keyword-based matching
═══════════════════════════════════════════════════════ */
const PROFESSION_CATEGORIES = [
  {
    key: "law",
    he: "משפטים", en: "Law", ar: "قانون",
    keywords: ["עורך דין", "עורכת דין", "משפטים", "lawyer", "attorney", "legal", "advocate", "law", "محامي", "قانون"],
  },
  {
    key: "medicine",
    he: "רפואה", en: "Medicine", ar: "طب",
    keywords: ["רופא", "רופאה", "רפואה", "doctor", "physician", "medical", "nurse", "surgeon", "therapist", "dentist", "טבע", "طبيب", "طب"],
  },
  {
    key: "tech",
    he: "טכנולוגיה", en: "Technology", ar: "تكنولوجيا",
    keywords: ["מהנדס", "מהנדסת", "תוכנה", "software", "developer", "engineer", "tech", "data", "it", "programmer", "coding", "cyber", "מתכנת", "מתכנתת", "مهندس", "برمجة", "تقنية"],
  },
  {
    key: "education",
    he: "חינוך", en: "Education", ar: "تعليم",
    keywords: ["מורה", "מחנך", "מחנכת", "teacher", "educator", "professor", "lecturer", "principal", "מנהל בית ספר", "مدرس", "معلم", "تعليم"],
  },
  {
    key: "finance",
    he: "כלכלה ופיננסים", en: "Finance", ar: "مالية",
    keywords: ["רואה חשבון", "כלכלן", "כלכלנית", "accountant", "finance", "economist", "banking", "investment", "cpa", "محاسب", "اقتصاد", "مالية"],
  },
  {
    key: "government",
    he: "ממשל ומדיניות", en: "Government", ar: "حكومة",
    keywords: ["ממשל", "מדיניות", "government", "policy", "politics", "civil service", "ministry", "public service", "עירייה", "حكومة", "سياسة"],
  },
  {
    key: "business",
    he: "עסקים ויזמות", en: "Business", ar: "أعمال",
    keywords: ["מנהל", "מנהלת", "עסקים", "יזם", "יזמת", "manager", "business", "entrepreneur", "startup", "ceo", "executive", "مدير", "أعمال", "ريادة"],
  },
  {
    key: "media",
    he: "תקשורת ומדיה", en: "Media", ar: "إعلام",
    keywords: ["עיתונאי", "עיתונאית", "תקשורת", "journalist", "media", "communications", "reporter", "pr", "marketing", "שיווק", "صحفي", "إعلام"],
  },
  {
    key: "social",
    he: "עבודה סוציאלית", en: "Social Work", ar: "عمل اجتماعي",
    keywords: ["עובד סוציאלי", "עובדת סוציאלית", "social work", "welfare", "nonprofit", "ngo", "עמותה", "عمل اجتماعي", "رعاية"],
  },
  {
    key: "arts",
    he: "אמנות ותרבות", en: "Arts & Culture", ar: "فنون",
    keywords: ["אמן", "אמנית", "תרבות", "artist", "arts", "culture", "music", "theater", "design", "architecture", "צלם", "فنان", "ثقافة"],
  },
];

function matchesProfessionCategories(profession, selectedCategories) {
  if (!selectedCategories || selectedCategories.length === 0) return true;
  if (!profession) return false;
  const lower = profession.toLowerCase();
  return selectedCategories.some((catKey) => {
    const cat = PROFESSION_CATEGORIES.find((c) => c.key === catKey);
    if (!cat) return false;
    return cat.keywords.some((kw) => lower.includes(kw.toLowerCase()));
  });
}

/* ══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const getInitials = (u) => {
  if (u?.firstName && u?.lastName)
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  return (u?.email?.[0] ?? "?").toUpperCase();
};
const getFullName = (u) =>
  u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : u?.email ?? "Unknown";

/* ══════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════ */
function Avatar({ user: u, size = 46, fontSize = 15, style = {} }) {
  const base = {
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg,#1a3c5e,#0ea5e9)",
    color: "#fff", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize, fontWeight: "700", flexShrink: 0, overflow: "hidden",
    ...style,
  };
  if (u?.photoURL) {
    return (
      <div style={base}>
        <img src={u.photoURL} alt={getFullName(u)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return <div style={base}>{getInitials(u)}</div>;
}

function StatusPill({ status, t }) {
  const s = {
    accepted: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: t.support.accepted },
    declined: { bg: "#fff0f0", color: "#b91c1c", border: "#fca5a5", label: t.support.declined },
    done:     { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", label: t.support.done },
  }[status] ?? { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", label: t.support.pending };

  return (
    <span style={{
      fontSize: "11px", fontWeight: "700",
      padding: "3px 10px", borderRadius: "99px",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      display: "inline-block",
    }}>
      {s.label}
    </span>
  );
}

/* ─── Shared modal overlay + box styles ─── */
const overlayStyle = {
  position: "fixed", inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 100, padding: "1rem",
  backdropFilter: "blur(4px)",
};
const modalStyle = {
  background: "#fff", borderRadius: "22px",
  padding: "2rem", width: "100%", maxWidth: "440px",
  boxShadow: "0 16px 48px rgba(15,23,42,0.16)",
  display: "flex", flexDirection: "column", gap: "1.25rem",
  animation: "modalPop 0.26s cubic-bezier(.34,1.56,.64,1) both",
  maxHeight: "90vh", overflowY: "auto",
};
const modalHeaderStyle = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const modalTitleStyle  = { fontSize: "16px", fontWeight: "700", color: "#1a3c5e", margin: 0 };
const closeBtnStyle    = {
  background: "#f1f5f9", border: "none", borderRadius: "9px",
  padding: "6px 12px", cursor: "pointer", fontSize: "13px",
  fontWeight: "600", color: "#64748b",
};
const infoBlockStyle = {
  background: "#f8fafc", borderRadius: "13px",
  padding: "1rem 1.25rem", border: "1.5px solid #f1f5f9",
  display: "flex", flexDirection: "column", gap: "10px",
};
const infoLabelStyle = { fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", margin: 0 };
const infoValueStyle = { fontSize: "13px", color: "#1a2e42", margin: 0 };

/* ─── Profile Modal ─── */
function ProfileModal({ selectedUser, onClose, onOpenRequest, requested, t }) {
  const [countDelta, setCountDelta] = useState(0);
  const displayCount = (selectedUser.networksCount ?? 0) + countDelta;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <p style={modalTitleStyle}>{t.support.memberProfile}</p>
          <button style={closeBtnStyle} onClick={onClose}>{t.support.close}</button>
        </div>

        <Avatar user={selectedUser} size={72} fontSize={22} style={{ margin: "0 auto" }} />

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "18px", fontWeight: "700", color: "#1a3c5e", margin: "0 0 4px" }}>
            {getFullName(selectedUser)}
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 6px" }}>
            {selectedUser.profession ?? "—"}
          </p>
          {displayCount > 0 && (
            <span style={{
              fontSize: "12px", fontWeight: "700", color: "#1d4ed8",
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: "99px", padding: "3px 12px", display: "inline-block",
            }}>
              {t.network?.connections ? t.network.connections(displayCount) : `${displayCount} connections`}
            </span>
          )}
        </div>

        <div style={infoBlockStyle}>
          {selectedUser.email && (
            <div>
              <p style={infoLabelStyle}>{t.support.email}</p>
              <p style={infoValueStyle}>{selectedUser.email}</p>
            </div>
          )}
          {selectedUser.phone && (
            <div>
              <p style={infoLabelStyle}>{t.support.phone}</p>
              <p style={infoValueStyle}>{selectedUser.phone}</p>
            </div>
          )}
          {selectedUser.city && (
            <div>
              <p style={infoLabelStyle}>{t.support.city}</p>
              <p style={infoValueStyle}>{selectedUser.city}</p>
            </div>
          )}
          {selectedUser.bio && (
            <div>
              <p style={infoLabelStyle}>{t.support.bio}</p>
              <p style={infoValueStyle}>{selectedUser.bio}</p>
            </div>
          )}
        </div>

        {/* Connect + Request buttons side by side */}
        <div style={{ display: "flex", gap: "10px" }}>
          <ConnectButton
            targetUserId={selectedUser.id}
            size="full"
            onToggle={(d) => setCountDelta((prev) => prev + d)}
          />
          {requested[selectedUser.id] ? (
            <button style={{
              flex: 1, padding: "10px",
              background: "#f0fdf4", color: "#166534",
              border: "1.5px solid #bbf7d0", borderRadius: "10px",
              fontSize: "13px", fontWeight: "700", cursor: "default",
            }}>
              {t.support.requestSent}
            </button>
          ) : (
            <button
              className="modal-primary-btn"
              style={{
                flex: 1, padding: "10px",
                background: "#1a3c5e", color: "#fff",
                border: "none", borderRadius: "10px",
                fontSize: "13px", fontWeight: "700",
                cursor: "pointer", transition: "background 0.2s",
              }}
              onClick={() => { onClose(); onOpenRequest(selectedUser); }}
            >
              {t.support.sendRequest}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Request Modal (with helpNote) ─── */
function RequestModal({ targetUser, onClose, onSend, requested, t }) {
  const [helpNote, setHelpNote] = useState("");
  const [sending,  setSending]  = useState(false);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <p style={modalTitleStyle}>{t.support.sendRequest}</p>
          <button style={closeBtnStyle} onClick={onClose}>{t.support.close}</button>
        </div>

        <Avatar user={targetUser} size={60} fontSize={20} style={{ margin: "0 auto" }} />

        <p style={{ textAlign: "center", fontSize: "16px", fontWeight: "700", color: "#1a3c5e", margin: 0 }}>
          {getFullName(targetUser)}
        </p>
        {targetUser.profession && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "#64748b", margin: "-0.75rem 0 0" }}>
            {targetUser.profession}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {t.support.helpNote}
          </label>
          <textarea
            className="support-input"
            style={{
              padding: "11px 14px", fontSize: "14px",
              border: "1.5px solid #e2e8f0", borderRadius: "13px",
              color: "#1a2e42", background: "#f8fafc",
              transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
              width: "100%", minHeight: "100px", resize: "vertical",
              fontFamily: "inherit",
            }}
            placeholder={t.support.helpNotePlaceholder}
            value={helpNote}
            onChange={(e) => setHelpNote(e.target.value)}
          />
        </div>

        {requested[targetUser.id] ? (
          <button style={{
            width: "100%", padding: "12px",
            background: "#f0fdf4", color: "#166534",
            border: "1.5px solid #bbf7d0", borderRadius: "12px",
            fontSize: "14px", fontWeight: "700", cursor: "default",
          }}>
            {t.support.requestSent}
          </button>
        ) : (
          <button
            className="modal-primary-btn"
            disabled={sending}
            style={{
              width: "100%", padding: "12px",
              background: sending ? "#64748b" : "#1a3c5e", color: "#fff",
              border: "none", borderRadius: "12px",
              fontSize: "14px", fontWeight: "700",
              cursor: sending ? "default" : "pointer", transition: "background 0.2s",
            }}
            onClick={async () => {
              setSending(true);
              await onSend(targetUser, helpNote);
              setSending(false);
              onClose();
            }}
          >
            {sending ? "…" : t.support.sendRequest}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Review Modal ─── */
function ReviewModal({ request, onClose, onSubmit, t }) {
  const [text,       setText]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <p style={modalTitleStyle}>{t.support.reviewTitle}</p>
          <button style={closeBtnStyle} onClick={onClose}>{t.support.close}</button>
        </div>

        <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
          {t.support.reviewSub(request.toUserName ?? "this member")}
        </p>

        <textarea
          className="support-input"
          style={{
            padding: "11px 14px", fontSize: "14px",
            border: "1.5px solid #e2e8f0", borderRadius: "13px",
            color: "#1a2e42", background: "#f8fafc",
            transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
            width: "100%", minHeight: "120px", resize: "vertical",
            fontFamily: "inherit",
          }}
          placeholder={t.support.reviewPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{
              flex: 1, padding: "11px",
              background: "#f1f5f9", color: "#64748b",
              border: "1.5px solid #e2e8f0", borderRadius: "12px",
              fontSize: "14px", fontWeight: "600", cursor: "pointer",
            }}
            onClick={onClose}
          >
            {t.support.skipReview}
          </button>
          <button
            className="modal-submit-btn"
            disabled={submitting || !text.trim()}
            style={{
              flex: 2, padding: "11px",
              background: submitting || !text.trim() ? "#94a3b8" : "#0ea5e9",
              color: "#fff", border: "none", borderRadius: "12px",
              fontSize: "14px", fontWeight: "700",
              cursor: submitting || !text.trim() ? "default" : "pointer",
              transition: "background 0.2s",
            }}
            onClick={async () => {
              setSubmitting(true);
              await onSubmit(text);
              setSubmitting(false);
            }}
          >
            {submitting ? "…" : t.support.submitReview}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function SupportPage() {
  const { user, profile: authProfile } = useAuth();
  const { t, isRTL, lang } = useLang();

  /* ── Filter state ── */
  const [memberName,          setMemberName]          = useState("");
  const [selectedCity,        setSelectedCity]        = useState("");
  const [selectedCategories,  setSelectedCategories]  = useState([]);

  /* ── Result/data state ── */
  const [results,       setResults]       = useState([]);
  const [searched,      setSearched]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [requested,     setRequested]     = useState({});  // uid → true
  const [sentRequests,  setSentRequests]  = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  /* ── Modal state ── */
  const [selectedUser,  setSelectedUser]  = useState(null); // profile modal
  const [requestTarget, setRequestTarget] = useState(null); // request modal
  const [reviewTarget,  setReviewTarget]  = useState(null); // review modal

  /* ── Sender info ── */
  const senderName =
    authProfile?.firstName && authProfile?.lastName
      ? `${authProfile.firstName} ${authProfile.lastName}`
      : user?.email ?? "";

  /* ── City label by current language ── */
  const getCityLabel = (city) => city[lang] ?? city.en;

  /* ── Initial fetch: suggested users + sent requests ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [usersSnap, reqSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(query(collection(db, "helpRequests"), where("fromUserId", "==", user.uid))),
        ]);

        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        /* Suggested: has a profession, not self, most recently joined */
        const suggested = allUsers
          .filter((m) => m.id !== user.uid && m.profession)
          .sort((a, b) => ((b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1))
          .slice(0, 6);
        setSuggestedUsers(suggested);

        /* My sent requests */
        const reqs = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSentRequests(reqs);

        /* Pre-mark already-requested users */
        const reqMap = {};
        reqs.forEach((r) => { reqMap[r.toUserId] = true; });
        setRequested(reqMap);
      } catch (err) { console.error("Initial fetch error:", err); }
    })();
  }, [user]);

  /* ── Search ── */
  const handleSearch = async () => {
    if (!user) return;
    setLoading(true);
    setSearched(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter((member) => {
        if (member.id === user.uid) return false;
        const fullName     = `${member.firstName ?? ""} ${member.lastName ?? ""}`.toLowerCase();
        const matchName    = memberName       ? fullName.includes(memberName.toLowerCase()) : true;
        const memberCityKey = normalizeCityToKey(member.city);
        const matchCity    = selectedCity     ? memberCityKey === selectedCity              : true;
        const matchProf    = matchesProfessionCategories(member.profession, selectedCategories);
        return matchName && matchCity && matchProf;
      });
      setResults(filtered);
    } catch (err) { console.error("Search error:", err); }
    finally { setLoading(false); }
  };

  /* ── Send help request ── */
  const handleRequest = async (targetUser, helpNote = "") => {
    if (!user || requested[targetUser.id]) return;
    try {
      const newReq = {
        toUserId:           targetUser.id,
        toUserName:         getFullName(targetUser),
        fromUserId:         user.uid,
        fromUserName:       senderName,
        fromUserEmail:      user.email,
        fromUserPhone:      authProfile?.phone ?? "",
        fromUserProfession: authProfile?.profession ?? "",
        helpNote,
        status:             null,
        createdAt:          new Date().toISOString(),
      };
      await addDoc(collection(db, "helpRequests"), newReq);
      setRequested((prev) => ({ ...prev, [targetUser.id]: true }));
      setSentRequests((prev) => [...prev, { id: `tmp_${Date.now()}`, ...newReq }]);
    } catch (err) { console.error("Request error:", err); }
  };

  /* ── Mark done ── */
  const handleMarkDone = async (request) => {
    if (!request.id || request.id.startsWith("tmp_")) return; // can't update temp doc
    try {
      await updateDoc(doc(db, "helpRequests", request.id), {
        status: "done", completedAt: new Date().toISOString(),
      });
      setSentRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: "done" } : r))
      );
      setReviewTarget(request);
    } catch (err) { console.error("Mark done error:", err); }
  };

  /* ── Submit review ── */
  const handleSubmitReview = async (reviewText) => {
    if (reviewText.trim() && reviewTarget) {
      try {
        await addDoc(collection(db, "reviews"), {
          requestId:    reviewTarget.id,
          reviewerId:   user.uid,
          revieweeId:   reviewTarget.toUserId,
          revieweeName: reviewTarget.toUserName,
          reviewerName: senderName,
          text:         reviewText,
          createdAt:    new Date().toISOString(),
        });
      } catch (err) { console.error("Review error:", err); }
    }
    setReviewTarget(null);
  };

  /* ── Category toggle ── */
  const toggleCategory = (catKey) => {
    setSelectedCategories((prev) =>
      prev.includes(catKey) ? prev.filter((k) => k !== catKey) : [...prev, catKey]
    );
  };

  /* ── Clear all filters ── */
  const clearFilters = () => {
    setMemberName("");
    setSelectedCity("");
    setSelectedCategories([]);
    setResults([]);
    setSearched(false);
  };

  const hasFilters = memberName || selectedCity || selectedCategories.length > 0;

  /* ══ Styles ══ */
  const S = {
    page:      { padding: "2rem 2.5rem", width: "100%", boxSizing: "border-box", direction: isRTL ? "rtl" : "ltr" },
    pageTitle: { fontSize: "22px", fontWeight: "700", color: "#1a3c5e", margin: "0 0 3px" },
    pageSub:   { fontSize: "13px", color: "#94a3b8", margin: "0 0 2rem" },

    sectionLabel: {
      fontSize: "11px", fontWeight: "700", color: "#94a3b8",
      letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem",
    },

    /* Suggested strip */
    suggestedWrap: { marginBottom: "2.5rem" },
    suggestedHeader: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem" },
    suggestedSub: { fontSize: "12px", color: "#94a3b8", margin: 0 },
    suggestedScroll: {
      display: "flex", gap: "1rem",
      overflowX: "auto", paddingBottom: "8px",
      scrollbarWidth: "none",
    },
    suggestedCard: {
      background: "#fff", borderRadius: "16px",
      padding: "1.25rem", minWidth: "190px",
      border: "1.5px solid #f1f5f9", borderTop: "3px solid #38bdf8",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "0.6rem", cursor: "pointer",
      transition: "transform 0.18s, box-shadow 0.18s",
      flexShrink: 0,
    },
    suggestedName: { fontSize: "14px", fontWeight: "700", color: "#1a3c5e", margin: 0, textAlign: "center" },
    suggestedProf: { fontSize: "12px", color: "#64748b", margin: 0, textAlign: "center" },
    suggestedReqBtn: {
      marginTop: "4px", padding: "6px 16px",
      background: "#eff6ff", color: "#1d4ed8",
      border: "1.5px solid #bfdbfe", borderRadius: "8px",
      fontSize: "12px", fontWeight: "600", cursor: "pointer",
      transition: "background 0.15s",
    },

    /* Filter card */
    filterCard: {
      background: "#fff", borderRadius: "18px", padding: "1.5rem",
      border: "1.5px solid #f1f5f9", borderLeft: "4px solid #38bdf8",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)", marginBottom: "2rem",
      display: "flex", flexDirection: "column", gap: "1.25rem",
    },
    filterRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "1rem", alignItems: "end",
    },
    group:  { display: "flex", flexDirection: "column", gap: "6px" },
    label:  { fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" },
    input:  {
      padding: "11px 14px", fontSize: "14px",
      border: "1.5px solid #e2e8f0", borderRadius: "13px",
      color: "#1a2e42", background: "#f8fafc",
      transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
      width: "100%",
    },
    select: {
      padding: "11px 14px", fontSize: "14px",
      border: "1.5px solid #e2e8f0", borderRadius: "13px",
      color: "#1a2e42", background: "#f8fafc",
      transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
      width: "100%", cursor: "pointer", appearance: "none",
    },

    /* Category pills */
    pillsWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
    pill: (active) => ({
      padding: "6px 14px",
      background: active ? "#1a3c5e" : "#f8fafc",
      color: active ? "#fff" : "#64748b",
      border: `1.5px solid ${active ? "#1a3c5e" : "#e2e8f0"}`,
      borderRadius: "99px", fontSize: "12px", fontWeight: "600",
      cursor: "pointer", transition: "all 0.15s",
      userSelect: "none",
    }),

    /* Filter actions */
    filterActions: { display: "flex", gap: "10px", alignItems: "center" },
    searchBtn: {
      padding: "11px 28px", background: "#1a3c5e",
      color: "#fff", border: "none", borderRadius: "13px",
      fontSize: "14px", fontWeight: "700", cursor: "pointer",
      transition: "background 0.2s",
    },
    clearBtn: {
      padding: "11px 20px", background: "#f1f5f9",
      color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: "13px",
      fontSize: "14px", fontWeight: "600", cursor: "pointer",
      transition: "background 0.2s",
    },

    /* Results */
    resultsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" },
    card: {
      background: "#fff", borderRadius: "18px", padding: "1.5rem",
      border: "1.5px solid #f1f5f9", borderLeft: "4px solid #e2e8f0",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      transition: "transform 0.18s, box-shadow 0.18s",
    },
    cardTop:    { display: "flex", alignItems: "center", gap: "1rem" },
    cardName:   { fontSize: "15px", fontWeight: "700", color: "#1a3c5e", margin: 0 },
    cardProf:   { fontSize: "13px", color: "#64748b", margin: 0 },
    cityTag: {
      fontSize: "12px", color: "#94a3b8",
      background: "#f8fafc", border: "1px solid #e2e8f0",
      borderRadius: "99px", padding: "2px 10px",
      display: "inline-block", alignSelf: "flex-start",
    },
    cardActions: { display: "flex", gap: "8px", marginTop: "auto" },
    viewBtn: {
      flex: 1, padding: "9px 0",
      background: "#f8fafc", color: "#1a3c5e",
      border: "1.5px solid #e2e8f0", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600", cursor: "pointer",
      transition: "background 0.15s, border-color 0.15s",
    },
    reqBtn: {
      flex: 1, padding: "9px 0",
      background: "#eff6ff", color: "#1d4ed8",
      border: "1.5px solid #bfdbfe", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600", cursor: "pointer",
      transition: "background 0.15s",
    },
    reqDoneBtn: {
      flex: 1, padding: "9px 0",
      background: "#f0fdf4", color: "#166534",
      border: "1.5px solid #bbf7d0", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600", cursor: "default",
    },
    emptyBox: { textAlign: "center", padding: "4rem 2rem", color: "#94a3b8", fontSize: "14px" },

    /* My Requests */
    myReqSection: { marginTop: "2.5rem" },
    myReqGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" },
    myReqCard: {
      background: "#fff", borderRadius: "16px", padding: "1.25rem",
      border: "1.5px solid #f1f5f9", borderLeft: "4px solid #a78bfa",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", gap: "6px",
    },
    myReqName:     { fontSize: "14px", fontWeight: "700", color: "#1a3c5e", margin: 0 },
    myReqNote:     { fontSize: "12px", color: "#64748b", margin: 0, fontStyle: "italic" },
    myReqDate:     { fontSize: "11px", color: "#94a3b8", margin: 0 },
    markDoneBtn: {
      marginTop: "4px", padding: "7px 0",
      background: "#f0fdf4", color: "#166534",
      border: "1.5px solid #bbf7d0", borderRadius: "9px",
      fontSize: "12px", fontWeight: "700", cursor: "pointer",
      transition: "background 0.15s",
    },
  };

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div style={S.page}>
      <p style={S.pageTitle}>{t.support.title}</p>
      <p style={S.pageSub}>{t.support.subtitle}</p>

      {/* ── Suggested for You ── */}
      {suggestedUsers.length > 0 && (
        <div style={S.suggestedWrap}>
          <div style={S.suggestedHeader}>
            <p style={S.sectionLabel}>{t.support.suggestedTitle}</p>
            <p style={S.suggestedSub}>{t.support.suggestedSub}</p>
          </div>
          <div style={S.suggestedScroll}>
            {suggestedUsers.map((u) => (
              <div
                key={u.id}
                className="suggested-card"
                style={S.suggestedCard}
              >
                <Avatar user={u} size={48} fontSize={16} />
                <p style={S.suggestedName}>{getFullName(u)}</p>
                <p style={S.suggestedProf}>{u.profession}</p>
                {u.city && (
                  <span style={{ ...S.cityTag, marginTop: "-2px" }}>{u.city}</span>
                )}
                {(u.networksCount ?? 0) > 0 && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {u.networksCount} {t.network?.networkCount ?? "connections"}
                  </span>
                )}
                <ConnectButton
                  targetUserId={u.id}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Card ── */}
      <div style={S.filterCard}>
        {/* Row 1: Name + City */}
        <div style={S.filterRow}>
          <div style={S.group}>
            <label style={S.label}>{t.support.memberName}</label>
            <input
              className="support-input"
              style={S.input}
              type="text"
              placeholder={t.support.namePlaceholder}
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div style={S.group}>
            <label style={S.label}>{t.support.city}</label>
            <select
              className="support-select"
              style={S.select}
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">{t.support.selectCity}</option>
              {CITIES.map((city) => (
                <option key={city.key} value={city.key}>
                  {getCityLabel(city)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Profession category pills */}
        <div>
          <label style={{ ...S.label, display: "block", marginBottom: "10px" }}>
            {t.support.professionCategories}
          </label>
          <div style={S.pillsWrap}>
            {PROFESSION_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  className={`category-pill${active ? " category-pill-active" : ""}`}
                  style={S.pill(active)}
                  onClick={() => toggleCategory(cat.key)}
                >
                  {cat[lang] ?? cat.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Action buttons */}
        <div style={S.filterActions}>
          <button className="search-btn" style={S.searchBtn} onClick={handleSearch}>
            {loading ? t.support.searching : t.support.search}
          </button>
          {hasFilters && (
            <button className="clear-btn" style={S.clearBtn} onClick={clearFilters}>
              {t.support.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* ── Empty / no-results states ── */}
      {!searched && <div style={S.emptyBox}>{t.support.searchEmpty}</div>}
      {searched && !loading && results.length === 0 && (
        <div style={S.emptyBox}>{t.support.noResults}</div>
      )}

      {/* ── Search Results ── */}
      {results.length > 0 && (
        <>
          <p style={S.sectionLabel}>{t.support.search} ({results.length})</p>
          <div style={S.resultsGrid}>
            {results.map((u, i) => (
              <div
                key={u.id}
                className="result-card"
                style={{ ...S.card, animationDelay: `${i * 0.05}s` }}
              >
                <div style={S.cardTop}>
                  <Avatar user={u} size={46} fontSize={15} />
                  <div>
                    <p style={S.cardName}>{getFullName(u)}</p>
                    <p style={S.cardProf}>{u.profession ?? "—"}</p>
                  </div>
                </div>
                {u.city && <span style={S.cityTag}>{u.city}</span>}
                {(u.networksCount ?? 0) > 0 && (
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {u.networksCount} {t.network?.networkCount ?? "connections"}
                  </span>
                )}
                <div style={S.cardActions}>
                  <button className="view-btn" style={S.viewBtn} onClick={() => setSelectedUser(u)}>
                    {t.support.viewProfile}
                  </button>
                  <ConnectButton targetUserId={u.id} size="sm" />
                </div>
                <button
                  className={requested[u.id] ? "" : "req-btn"}
                  style={{ ...(requested[u.id] ? S.reqDoneBtn : S.reqBtn), width: "100%" }}
                  onClick={() => !requested[u.id] && setRequestTarget(u)}
                >
                  {requested[u.id] ? t.support.sent : t.support.sendRequest}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── My Requests ── */}
      {sentRequests.length > 0 && (
        <div style={S.myReqSection}>
          <p style={S.sectionLabel}>{t.support.myRequests}</p>
          <div style={S.myReqGrid}>
            {sentRequests.map((r) => (
              <div key={r.id} style={S.myReqCard}>
                <p style={S.myReqName}>{r.toUserName || "Community Member"}</p>
                {r.helpNote && <p style={S.myReqNote}>"{r.helpNote}"</p>}
                <StatusPill status={r.status} t={t} />
                {/* Mark as Done — only for accepted requests */}
                {r.status === "accepted" && (
                  <button
                    className="mark-done-btn"
                    style={S.markDoneBtn}
                    onClick={() => handleMarkDone(r)}
                  >
                    {t.support.markDone}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {selectedUser && (
        <ProfileModal
          selectedUser={selectedUser}
          onClose={() => setSelectedUser(null)}
          onOpenRequest={(u) => setRequestTarget(u)}
          requested={requested}
          t={t}
        />
      )}

      {/* ── Request Modal ── */}
      {requestTarget && (
        <RequestModal
          targetUser={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSend={handleRequest}
          requested={requested}
          t={t}
        />
      )}

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <ReviewModal
          request={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleSubmitReview}
          t={t}
        />
      )}
    </div>
  );
}
