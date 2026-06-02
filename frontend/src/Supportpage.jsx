import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

/* ─── Profession categories ─── */
const PROFESSION_CATEGORIES = [
  "Technology", "Law", "Medicine", "Finance", "Education",
  "Business", "Psychology", "Engineering", "Social Work",
  "Government", "Arts & Culture", "Other",
];

/* ─── City bilingual alias map ─── */
// Each key = canonical English form; values = all aliases (EN / HE / AR)
const CITY_ALIASES = {
  jerusalem:    ["jerusalem", "yerushalayim", "ירושלים", "القدس", "al-quds"],
  "tel aviv":   ["tel aviv", "tel-aviv", "tlv", "תל אביב", "تل أبيب"],
  haifa:        ["haifa", "hefa", "חיפה", "حيفا"],
  "beer sheva": ["beer sheva", "be'er sheva", "beersheba", "באר שבע", "بئر السبع"],
  netanya:      ["netanya", "netaniya", "נתניה", "نتانيا"],
  rishon:       ["rishon", "rishon lezion", "rishon le'zion", "ראשון לציון", "rishon leziyyon"],
  "petah tikva":["petah tikva", "petach tikva", "פתח תקווה", "بتاح تيكفا"],
  ashdod:       ["ashdod", "אשדוד", "أشدود"],
  ashkelon:     ["ashkelon", "אשקלון", "عسقلان"],
  rehovot:      ["rehovot", "רחובות", "رحوفوت"],
  holon:        ["holon", "חולון", "حولون"],
  bnei:         ["bnei brak", "b'nei brak", "בני ברק", "بني براك"],
  ramat:        ["ramat gan", "רמת גן", "رامات غان"],
  herzliya:     ["herzliya", "herzliyya", "הרצליה", "هرتسيليا"],
  givataim:     ["givatayim", "גבעתיים"],
  modi:         ["modiin", "mevasseret", "מודיעין", "מבשרת"],
  nahariya:     ["nahariya", "נהריה", "نهاريا"],
  akko:         ["acre", "akko", "עכו", "عكا"],
  tiberias:     ["tiberias", "tveria", "טבריה", "طبرية"],
  nazareth:     ["nazareth", "nazaret", "נצרת", "الناصرة"],
};

/** Returns true if the user's city matches the query, accounting for bilingual aliases */
function cityMatches(userCity, queryCity) {
  if (!queryCity || queryCity.trim() === "") return true;
  if (!userCity) return false;
  const u = userCity.trim().toLowerCase();
  const q = queryCity.trim().toLowerCase();
  // Direct substring match
  if (u.includes(q) || q.includes(u)) return true;
  // Alias group match
  for (const aliases of Object.values(CITY_ALIASES)) {
    const inUserGroup  = aliases.some((a) => u.includes(a.toLowerCase()));
    const inQueryGroup = aliases.some((a) => q.includes(a.toLowerCase()));
    if (inUserGroup && inQueryGroup) return true;
  }
  return false;
}

/** Check whether a profession field matches a category pill or free-text query */
function professionMatches(userProfession, selected, customText) {
  if (!selected) return true; // no filter active
  const up = (userProfession ?? "").toLowerCase();
  if (selected === "Other") {
    // free-text custom filter
    if (!customText.trim()) return true;
    return up.includes(customText.trim().toLowerCase());
  }
  return up.includes(selected.toLowerCase());
}

/* ─── Helpers ─── */
const getInitials = (u) => {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  return (u.email?.[0] ?? "?").toUpperCase();
};
const getFullName = (u) =>
  u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? "Unknown";
const avatarUrl = (u) => u?.photoURL || u?.avatarUrl || null;
const isActuallyOnline = (u) =>
  u?.lastSeen && Date.now() - new Date(u.lastSeen) < 5 * 60 * 1000;

/* ─── StatusPill ─── */
function StatusPill({ status }) {
  const map = {
    accepted: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "Accepted" },
    declined: { bg: "#fff0f0", color: "#b91c1c", border: "#fca5a5", label: "Declined" },
    null:     { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", label: "Pending"  },
  };
  const s = map[status] ?? map["null"];
  return (
    <span style={{
      fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: "inline-block",
    }}>{s.label}</span>
  );
}

/* ─── MemberAvatar ─── */
function MemberAvatar({ user, size = 46, fontSize = 15 }) {
  const url = avatarUrl(user);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: url ? "transparent" : "linear-gradient(135deg,#1a3c5e,#0ea5e9)",
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

/* ─── Inject styles ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  .support-input:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15) !important;
    background: #fff !important;
    outline: none;
  }
  .result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.10) !important;
  }
  .prof-pill { transition: all 0.14s ease; cursor: pointer; }
  .prof-pill:hover { transform: translateY(-1px); }
  .search-btn:hover    { background: #122d47 !important; }
  .view-btn:hover      { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
  .req-btn:hover       { background: #dbeafe !important; }
  .suggest-item:hover  { background: #f0f7ff !important; }
  @keyframes fadeSlideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes dropIn      { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes modalPop    { from { opacity:0; transform:scale(0.94) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  .result-card { animation: fadeSlideUp 0.32s ease both; }
`;
if (!document.head.querySelector("#support-styles")) {
  styleTag.id = "support-styles";
  document.head.appendChild(styleTag);
}

export default function SupportPage() {
  const { user } = useAuth();

  /* Search state */
  const [profCategory,      setProfCategory]      = useState(""); // selected pill
  const [profCustom,        setProfCustom]        = useState(""); // free text when "Other"
  const [city,              setCity]              = useState("");
  const [memberName,        setMemberName]        = useState("");
  const [results,           setResults]           = useState([]);
  const [searched,          setSearched]          = useState(false);
  const [loading,           setLoading]           = useState(false);

  /* Request state */
  const [requested,         setRequested]         = useState({});
  const [selectedUser,      setSelectedUser]      = useState(null);
  const [senderProfile,     setSenderProfile]     = useState(null);
  const [sentRequests,      setSentRequests]      = useState([]);
  const [receivedRequests,  setReceivedRequests]  = useState([]);

  /* Members */
  const [allUsers,          setAllUsers]          = useState([]);
  const [recommended,       setRecommended]       = useState([]);

  /* Autocomplete */
  const [showSuggest,       setShowSuggest]       = useState(false);
  const [dropPos,           setDropPos]           = useState(null);
  const nameInputRef = useRef(null);

  /* ── Fetch all data ── */
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

      // Recommended: sort by lastSeen desc, take 4
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

  /* ── Autocomplete position ── */
  const openSuggest = () => {
    if (nameInputRef.current) {
      const r = nameInputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setShowSuggest(true);
  };
  const suggestions = memberName.trim().length > 0
    ? allUsers.filter((u) => {
        const q     = memberName.toLowerCase().trim();
        const first = (u.firstName ?? "").toLowerCase();
        const last  = (u.lastName  ?? "").toLowerCase();
        return first.startsWith(q) || last.startsWith(q);
      }).slice(0, 8)
    : [];

  /* ── Search ── */
  const handleSearch = () => {
    if (!user) return;
    setLoading(true);
    setSearched(true);
    const filtered = allUsers.filter((u) => {
      const fullName   = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      const matchName  = memberName   ? fullName.includes(memberName.toLowerCase()) : true;
      const matchProf  = professionMatches(u.profession, profCategory, profCustom);
      const matchCity  = cityMatches(u.city, city);
      return matchName && matchProf && matchCity;
    });
    setResults(filtered);
    setLoading(false);
  };

  /* ── Help request ── */
  const handleRequest = async (targetUser) => {
    if (!user || !senderProfile || requested[targetUser.id]) return;
    try {
      await addDoc(collection(db, "helpRequests"), {
        toUserId:           targetUser.id,
        toUserName:         getFullName(targetUser),
        fromUserId:         user.uid,
        fromUserName:       getFullName(senderProfile),
        fromUserEmail:      user.email,
        fromUserPhone:      senderProfile?.phone ?? "",
        fromUserProfession: senderProfile?.profession ?? "",
        status:             null,
        createdAt:          new Date().toISOString(),
      });
      setRequested((prev) => ({ ...prev, [targetUser.id]: true }));
    } catch (err) { console.error("Request error:", err); }
  };

  /* ── Respond to received request ── */
  const handleRespondRequest = async (reqId, status) => {
    try {
      await updateDoc(doc(db, "helpRequests", reqId), {
        status,
        responderName: senderProfile ? getFullName(senderProfile) : user.email,
      });
      setReceivedRequests((prev) =>
        prev.map((r) => r.id === reqId ? { ...r, status } : r)
      );
    } catch (err) { console.error("Respond error:", err); }
  };

  /* ── Styles ── */
  const S = {
    page: {
      padding: "2rem 2.5rem 4rem",
      width: "100%",
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      boxSizing: "border-box",
      background: "var(--bg-secondary)",
    },
    pageTitle: { fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 3px" },
    pageSub:   { fontSize: "13px", color: "var(--text-muted)", margin: "0 0 2rem" },

    /* recommended */
    sectionLabel: {
      fontSize: "11px", fontWeight: "700", color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.85rem",
    },
    recGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: "0.85rem",
      marginBottom: "2rem",
    },
    recCard: {
      background: "var(--bg-primary)", borderRadius: "16px",
      padding: "1.25rem 1rem", border: "1.5px solid var(--border)",
      borderTop: "3px solid #38bdf8",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "0.5rem", textAlign: "center", cursor: "pointer",
      transition: "transform 0.18s, box-shadow 0.18s",
    },

    /* search card */
    searchCard: {
      background: "var(--bg-primary)", borderRadius: "18px",
      padding: "1.5rem", border: "1.5px solid var(--border)",
      borderLeft: "4px solid #38bdf8",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      marginBottom: "2rem",
    },
    group: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" },
    label: {
      fontSize: "11px", fontWeight: "700", color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    },

    /* profession pills */
    pillRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
    pill: (active) => ({
      padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: "600",
      border: `1.5px solid ${active ? "#0ea5e9" : "var(--border)"}`,
      background: active ? "#e0f2fe" : "var(--bg-secondary)",
      color: active ? "#0369a1" : "var(--text-secondary)",
      cursor: "pointer", userSelect: "none",
    }),

    input: {
      padding: "11px 14px", fontSize: "14px",
      border: "1.5px solid var(--border)", borderRadius: "13px",
      color: "var(--text-primary)", background: "var(--bg-secondary)",
      transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
      width: "100%", boxSizing: "border-box",
    },
    searchBtn: {
      padding: "11px 32px", background: "#1a3c5e", color: "#fff",
      border: "none", borderRadius: "13px", fontSize: "14px", fontWeight: "700",
      cursor: "pointer", transition: "background 0.2s", height: "44px",
      marginTop: "1rem", alignSelf: "flex-start",
    },

    /* results */
    resultsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.25rem",
    },
    card: {
      background: "var(--bg-primary)", borderRadius: "18px", padding: "1.5rem",
      border: "1.5px solid var(--border)", borderLeft: "4px solid var(--border)",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      transition: "transform 0.18s, box-shadow 0.18s",
    },
    cardTop: { display: "flex", alignItems: "center", gap: "1rem" },
    name:       { fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0 },
    profession: { fontSize: "13px", color: "var(--text-secondary)", margin: 0 },
    cityTag: {
      fontSize: "12px", color: "var(--text-muted)",
      background: "var(--bg-secondary)", border: "1px solid var(--border)",
      borderRadius: "99px", padding: "2px 10px",
      display: "inline-block", alignSelf: "flex-start",
    },
    cardActions: { display: "flex", gap: "8px", marginTop: "auto" },
    viewBtn: {
      flex: 1, padding: "9px 0", background: "var(--bg-secondary)",
      color: "var(--text-primary)", border: "1.5px solid var(--border)",
      borderRadius: "10px", fontSize: "13px", fontWeight: "600",
      cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
    },
    reqBtn: {
      flex: 1, padding: "9px 0", background: "#eff6ff", color: "#1d4ed8",
      border: "1.5px solid #bfdbfe", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600", cursor: "pointer",
    },
    reqDoneBtn: {
      flex: 1, padding: "9px 0", background: "#f0fdf4", color: "#166534",
      border: "1.5px solid #bbf7d0", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600", cursor: "default",
    },
    emptyBox: { textAlign: "center", padding: "3rem 2rem", color: "var(--text-muted)", fontSize: "14px" },

    /* modal */
    overlay: {
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "1rem", backdropFilter: "blur(4px)",
    },
    modal: {
      background: "var(--bg-primary)", borderRadius: "22px", padding: "2rem",
      width: "100%", maxWidth: "420px",
      boxShadow: "0 16px 48px rgba(15,23,42,0.18)",
      display: "flex", flexDirection: "column", gap: "1.25rem",
      animation: "modalPop 0.26s cubic-bezier(.34,1.56,.64,1) both",
    },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    modalTitle:  { fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 },
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
      width: "100%", padding: "12px", background: "#1a3c5e", color: "#fff",
      border: "none", borderRadius: "12px", fontSize: "14px",
      fontWeight: "700", cursor: "pointer", transition: "background 0.2s",
    },
    modalReqDoneBtn: {
      width: "100%", padding: "12px", background: "#f0fdf4", color: "#166534",
      border: "1.5px solid #bbf7d0", borderRadius: "12px",
      fontSize: "14px", fontWeight: "700", cursor: "default",
    },

    /* request sections */
    myReqSection:     { marginTop: "2.5rem" },
    myReqGrid: {
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem",
    },
    myReqCard: {
      background: "var(--bg-primary)", borderRadius: "16px", padding: "1.25rem",
      border: "1.5px solid var(--border)", borderLeft: "4px solid #a78bfa",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", gap: "6px",
    },
    myReqName: { fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 },
    myReqProf: { fontSize: "12px", color: "var(--text-secondary)", margin: 0 },
    receivedReqCard: {
      background: "var(--bg-primary)", borderRadius: "16px", padding: "1.25rem",
      border: "1.5px solid var(--border)", borderLeft: "4px solid #f59e0b",
      boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      display: "flex", flexDirection: "column", gap: "6px",
    },
    receivedReqActions: { display: "flex", gap: "8px", marginTop: "6px" },
    acceptBtn: {
      flex: 1, padding: "7px 0", background: "#f0fdf4", color: "#166534",
      border: "1.5px solid #bbf7d0", borderRadius: "9px",
      fontSize: "12px", fontWeight: "700", cursor: "pointer",
    },
    declineBtn: {
      flex: 1, padding: "7px 0", background: "#fff0f0", color: "#b91c1c",
      border: "1.5px solid #fca5a5", borderRadius: "9px",
      fontSize: "12px", fontWeight: "700", cursor: "pointer",
    },
  };

  return (
    <div style={S.page}>
      <p style={S.pageTitle}>Support</p>
      <p style={S.pageSub}>Find community members by profession or city, and send help requests.</p>

      {/* ── Recommended Members ── */}
      {recommended.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <p style={S.sectionLabel}>Recommended Members</p>
          <div style={S.recGrid}>
            {recommended.map((u) => (
              <div
                key={u.id}
                style={S.recCard}
                onClick={() => setSelectedUser(u)}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,23,42,0.10)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.05)"; }}
              >
                <div style={{ position: "relative" }}>
                  <MemberAvatar user={u} size={48} />
                  {isActuallyOnline(u) && (
                    <span style={{
                      position: "absolute", bottom: 1, right: 1,
                      width: 10, height: 10, borderRadius: "50%",
                      background: "#22c55e", border: "2px solid var(--bg-primary)",
                    }} />
                  )}
                </div>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  {getFullName(u)}
                </p>
                {u.profession && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{u.profession}</p>
                )}
                {u.city && (
                  <span style={{ fontSize: "11px", color: "#0369a1", background: "#e0f2fe", borderRadius: "99px", padding: "2px 9px" }}>
                    {u.city}
                  </span>
                )}
                <button
                  style={requested[u.id] ? { ...S.reqDoneBtn, width: "100%", padding: "6px 0", fontSize: "12px" } : { ...S.reqBtn, width: "100%", padding: "6px 0", fontSize: "12px" }}
                  onClick={(e) => { e.stopPropagation(); handleRequest(u); }}
                >
                  {requested[u.id] ? "Sent" : "Send Request"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search Card ── */}
      <div style={S.searchCard}>
        {/* Member Name with autocomplete */}
        <div style={S.group}>
          <label style={S.label}>Member Name</label>
          <div style={{ position: "relative" }}>
            <input
              ref={nameInputRef}
              className="support-input"
              style={S.input}
              type="text"
              placeholder="e.g. Sara Cohen"
              value={memberName}
              onChange={(e) => { setMemberName(e.target.value); openSuggest(); }}
              onFocus={openSuggest}
              onBlur={() => setTimeout(() => setShowSuggest(false), 160)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoComplete="off"
            />
          </div>
          {/* Suggestions dropdown */}
          {showSuggest && memberName.trim().length > 0 && dropPos && (
            <div style={{
              position: "fixed", top: dropPos.top, left: dropPos.left,
              width: dropPos.width, background: "var(--bg-primary)",
              borderRadius: "13px", border: "1.5px solid var(--border)",
              boxShadow: "0 8px 28px rgba(15,23,42,0.14)",
              overflow: "hidden", zIndex: 9999, animation: "dropIn 0.16s ease",
              minWidth: 220,
            }}>
              {suggestions.length > 0 ? suggestions.map((u) => (
                <button
                  key={u.id}
                  className="suggest-item"
                  onMouseDown={() => { setMemberName(getFullName(u)); setShowSuggest(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderBottom: "1px solid var(--border)", cursor: "pointer",
                    textAlign: "left", transition: "background 0.12s",
                  }}
                >
                  <MemberAvatar user={u} size={32} fontSize={11} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getFullName(u)}
                    </p>
                    {u.profession && (
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{u.profession}</p>
                    )}
                  </div>
                </button>
              )) : (
                <div style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-muted)" }}>
                  {allUsers.length === 0 ? "Loading members…" : "No members found"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profession pills */}
        <div style={S.group}>
          <label style={S.label}>Profession</label>
          <div style={S.pillRow}>
            {PROFESSION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="prof-pill"
                style={S.pill(profCategory === cat)}
                onClick={() => {
                  if (profCategory === cat) { setProfCategory(""); setProfCustom(""); }
                  else { setProfCategory(cat); }
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          {profCategory === "Other" && (
            <input
              className="support-input"
              style={{ ...S.input, marginTop: "8px" }}
              type="text"
              placeholder="Describe the profession or topic…"
              value={profCustom}
              onChange={(e) => setProfCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          )}
        </div>

        {/* City */}
        <div style={S.group}>
          <label style={S.label}>City</label>
          <input
            className="support-input"
            style={S.input}
            type="text"
            placeholder="e.g. Jerusalem / ירושלים / القدس"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            City search works across English, Hebrew and Arabic
          </p>
        </div>

        <button className="search-btn" style={S.searchBtn} onClick={handleSearch}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {/* Empty states */}
      {!searched && (
        <div style={S.emptyBox}>
          Use the filters above to find members who can help.
        </div>
      )}
      {searched && !loading && results.length === 0 && (
        <div style={S.emptyBox}>
          No matching members found. Try broadening your search.
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={S.resultsGrid}>
          {results.map((u, i) => (
            <div
              key={u.id}
              className="result-card"
              style={{ ...S.card, animationDelay: `${i * 0.05}s` }}
            >
              <div style={S.cardTop}>
                <div style={{ position: "relative" }}>
                  <MemberAvatar user={u} />
                  {isActuallyOnline(u) && (
                    <span style={{
                      position: "absolute", bottom: 1, right: 1,
                      width: 10, height: 10, borderRadius: "50%",
                      background: "#22c55e", border: "2px solid var(--bg-primary)",
                    }} />
                  )}
                </div>
                <div>
                  <p style={S.name}>{getFullName(u)}</p>
                  <p style={S.profession}>{u.profession ?? "—"}</p>
                </div>
              </div>
              {u.city && <span style={S.cityTag}>{u.city}</span>}
              <div style={S.cardActions}>
                <button className="view-btn" style={S.viewBtn} onClick={() => setSelectedUser(u)}>
                  View Profile
                </button>
                <button
                  className={requested[u.id] ? "" : "req-btn"}
                  style={requested[u.id] ? S.reqDoneBtn : S.reqBtn}
                  onClick={() => handleRequest(u)}
                >
                  {requested[u.id] ? "Sent" : "Send Request"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Requests */}
      {sentRequests.length > 0 && (
        <div style={S.myReqSection}>
          <p style={{ ...S.sectionLabel, margin: "0 0 1rem" }}>My Requests</p>
          <div style={S.myReqGrid}>
            {sentRequests.map((r) => (
              <div key={r.id} style={S.myReqCard}>
                <p style={S.myReqName}>{r.toUserName || "Community Member"}</p>
                {r.fromUserProfession && <p style={S.myReqProf}>{r.fromUserProfession}</p>}
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Received Requests */}
      {receivedRequests.length > 0 && (
        <div style={{ marginTop: "2.5rem" }}>
          <p style={{ ...S.sectionLabel, margin: "0 0 1rem" }}>Received Requests</p>
          <div style={S.myReqGrid}>
            {receivedRequests.map((r) => (
              <div key={r.id} style={S.receivedReqCard}>
                <p style={S.myReqName}>{r.fromUserName || "Community Member"}</p>
                {r.fromUserProfession && (
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>{r.fromUserProfession}</p>
                )}
                {r.fromUserEmail && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>{r.fromUserEmail}</p>
                )}
                {!r.status ? (
                  <div style={S.receivedReqActions}>
                    <button style={S.acceptBtn} onClick={() => handleRespondRequest(r.id, "accepted")}>
                      Accept
                    </button>
                    <button style={S.declineBtn} onClick={() => handleRespondRequest(r.id, "declined")}>
                      Decline
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

      {/* Profile modal */}
      {selectedUser && (
        <div style={S.overlay} onClick={() => setSelectedUser(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <p style={S.modalTitle}>Member Profile</p>
              <button style={S.closeBtn} onClick={() => setSelectedUser(null)}>Close</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MemberAvatar user={selectedUser} size={68} fontSize={22} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px" }}>
                {getFullName(selectedUser)}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                {selectedUser.profession ?? "—"}
              </p>
            </div>
            <div style={S.infoBlock}>
              {selectedUser.email && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>Email</p>
                  <p style={S.infoValue}>{selectedUser.email}</p>
                </div>
              )}
              {selectedUser.phone && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>Phone</p>
                  <p style={S.infoValue}>{selectedUser.phone}</p>
                </div>
              )}
              {selectedUser.city && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>City</p>
                  <p style={S.infoValue}>{selectedUser.city}</p>
                </div>
              )}
              {selectedUser.bio && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>Bio</p>
                  <p style={S.infoValue}>{selectedUser.bio}</p>
                </div>
              )}
            </div>
            <button
              style={requested[selectedUser.id] ? S.modalReqDoneBtn : S.modalReqBtn}
              onClick={() => handleRequest(selectedUser)}
              onMouseOver={(e) => { if (!requested[selectedUser.id]) e.currentTarget.style.background = "#122d47"; }}
              onMouseOut={(e)  => { if (!requested[selectedUser.id]) e.currentTarget.style.background = "#1a3c5e"; }}
            >
              {requested[selectedUser.id] ? "Request Sent" : "Send Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
