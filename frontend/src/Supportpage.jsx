import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";

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
  .support-input:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15) !important;
    background: #fff !important;
    outline: none;
  }
  .result-card {
    animation: fadeSlideUp 0.32s ease both;
  }
  .result-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15,23,42,0.08) !important;
  }
  .search-btn:hover { background: #122d47 !important; }
  .view-btn:hover   { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
  .req-btn:hover    { background: #dbeafe !important; }
`;
if (!document.head.querySelector("#support-styles")) {
  styleTag.id = "support-styles";
  document.head.appendChild(styleTag);
}

/* ─── Helpers ─── */
const getInitials = (u) => {
  if (u.firstName && u.lastName)
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  return (u.email?.[0] ?? "?").toUpperCase();
};
const getFullName = (u) =>
  u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? "Unknown";

/* ─── Avatar component: shows photo or initials ─── */
function Avatar({ user: u, size = 46, fontSize = 15, style = {} }) {
  const base = {
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg,#1a3c5e,#0ea5e9)",
    color: "#fff", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize, fontWeight: "700", flexShrink: 0,
    overflow: "hidden",
    ...style,
  };
  if (u?.photoURL) {
    return (
      <div style={base}>
        <img src={u.photoURL} alt={getFullName(u)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      </div>
    );
  }
  return <div style={base}>{getInitials(u)}</div>;
}

function StatusPill({ status, t }) {
  const s = {
    accepted: { bg:"#f0fdf4", color:"#166534", border:"#bbf7d0", label: t.support.accepted },
    declined: { bg:"#fff0f0", color:"#b91c1c", border:"#fca5a5", label: t.support.declined },
  }[status] ?? { bg:"#f1f5f9", color:"#64748b", border:"#e2e8f0", label: t.support.pending };

  return (
    <span style={{
      fontSize:"11px", fontWeight:"700",
      padding:"3px 10px", borderRadius:"99px",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      display:"inline-block",
    }}>
      {s.label}
    </span>
  );
}

export default function SupportPage() {
  const { user, profile: authProfile } = useAuth();
  const { t, isRTL } = useLang();

  const [profession,   setProfession]   = useState("");
  const [city,         setCity]         = useState("");
  const [memberName,   setMemberName]   = useState("");
  const [results,      setResults]      = useState([]);
  const [searched,     setSearched]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [requested,    setRequested]    = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchSent = async () => {
      const q = query(collection(db, "helpRequests"), where("fromUserId", "==", user.uid));
      const snap = await getDocs(q);
      setSentRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchSent();
  }, [user]);

  const handleSearch = async () => {
    if (!user) return;
    setLoading(true);
    setSearched(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter((member) => {
        if (member.id === user.uid) return false;
        const fullName = `${member.firstName ?? ""} ${member.lastName ?? ""}`.toLowerCase();
        const matchName       = memberName  ? fullName.includes(memberName.toLowerCase())         : true;
        const matchProfession = profession  ? member.profession?.toLowerCase().includes(profession.toLowerCase()) : true;
        const matchCity       = city        ? member.city?.toLowerCase().includes(city.toLowerCase()) : true;
        return matchName && matchProfession && matchCity;
      });
      setResults(filtered);
    } catch (err) { console.error("Search error:", err); }
    finally { setLoading(false); }
  };

  /* ── Sender display name from authProfile ── */
  const senderName = authProfile?.firstName && authProfile?.lastName
    ? `${authProfile.firstName} ${authProfile.lastName}`
    : user?.email ?? "";

  const handleRequest = async (targetUser) => {
    if (!user) return;
    if (requested[targetUser.id]) return;
    try {
      await addDoc(collection(db, "helpRequests"), {
        toUserId:           targetUser.id,
        toUserName:         getFullName(targetUser),
        fromUserId:         user.uid,
        fromUserName:       senderName,
        fromUserEmail:      user.email,
        fromUserPhone:      authProfile?.phone ?? "",
        fromUserProfession: authProfile?.profession ?? "",
        status:             null,
        createdAt:          new Date().toISOString(),
      });
      setRequested((prev) => ({ ...prev, [targetUser.id]: true }));
    } catch (err) { console.error("Request error:", err); }
  };

  const S = {
    page:      { padding:"2rem 2.5rem", width:"100%", boxSizing:"border-box", direction: isRTL ? "rtl" : "ltr" },
    pageTitle: { fontSize:"22px", fontWeight:"700", color:"#1a3c5e", margin:"0 0 3px" },
    pageSub:   { fontSize:"13px", color:"#94a3b8", margin:"0 0 2rem" },

    searchCard: {
      background:"#fff", borderRadius:"18px", padding:"1.5rem",
      border:"1.5px solid #f1f5f9", borderLeft:"4px solid #38bdf8",
      boxShadow:"0 2px 8px rgba(15,23,42,0.05)", marginBottom:"2rem",
    },
    searchGrid: {
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",
      gap:"1rem", alignItems:"end",
    },
    group: { display:"flex", flexDirection:"column", gap:"6px" },
    label: { fontSize:"11px", fontWeight:"700", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" },
    input: {
      padding:"11px 14px", fontSize:"14px",
      border:"1.5px solid #e2e8f0", borderRadius:"13px",
      color:"#1a2e42", background:"#f8fafc",
      transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s",
      width:"100%",
    },
    searchBtn: {
      padding:"11px 24px", background:"#1a3c5e",
      color:"#fff", border:"none", borderRadius:"13px",
      fontSize:"14px", fontWeight:"700", cursor:"pointer",
      whiteSpace:"nowrap", transition:"background 0.2s", height:"44px",
    },

    resultsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"1.25rem" },
    card: {
      background:"#fff", borderRadius:"18px", padding:"1.5rem",
      border:"1.5px solid #f1f5f9", borderLeft:"4px solid #e2e8f0",
      boxShadow:"0 2px 8px rgba(15,23,42,0.05)",
      display:"flex", flexDirection:"column", gap:"0.75rem",
      transition:"transform 0.18s, box-shadow 0.18s",
    },
    cardTop:    { display:"flex", alignItems:"center", gap:"1rem" },
    name:       { fontSize:"15px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    profession: { fontSize:"13px", color:"#64748b", margin:0 },
    cityTag:    {
      fontSize:"12px", color:"#94a3b8",
      background:"#f8fafc", border:"1px solid #e2e8f0",
      borderRadius:"99px", padding:"2px 10px",
      display:"inline-block", alignSelf:"flex-start",
    },
    cardActions: { display:"flex", gap:"8px", marginTop:"auto" },
    viewBtn: {
      flex:1, padding:"9px 0",
      background:"#f8fafc", color:"#1a3c5e",
      border:"1.5px solid #e2e8f0", borderRadius:"10px",
      fontSize:"13px", fontWeight:"600", cursor:"pointer",
      transition:"background 0.15s, border-color 0.15s",
    },
    reqBtn: {
      flex:1, padding:"9px 0",
      background:"#eff6ff", color:"#1d4ed8",
      border:"1.5px solid #bfdbfe", borderRadius:"10px",
      fontSize:"13px", fontWeight:"600", cursor:"pointer",
      transition:"background 0.15s",
    },
    reqDoneBtn: {
      flex:1, padding:"9px 0",
      background:"#f0fdf4", color:"#166534",
      border:"1.5px solid #bbf7d0", borderRadius:"10px",
      fontSize:"13px", fontWeight:"600", cursor:"default",
    },
    emptyBox: { textAlign:"center", padding:"4rem 2rem", color:"#94a3b8", fontSize:"14px" },

    /* modal */
    overlay: {
      position:"fixed", inset:0,
      background:"rgba(15,23,42,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:100, padding:"1rem",
      backdropFilter:"blur(4px)",
    },
    modal: {
      background:"#fff", borderRadius:"22px",
      padding:"2rem", width:"100%", maxWidth:"420px",
      boxShadow:"0 16px 48px rgba(15,23,42,0.14)",
      display:"flex", flexDirection:"column", gap:"1.25rem",
      animation:"modalPop 0.26s cubic-bezier(.34,1.56,.64,1) both",
    },
    modalHeader:    { display:"flex", alignItems:"center", justifyContent:"space-between" },
    modalTitle:     { fontSize:"16px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    closeBtn: {
      background:"#f1f5f9", border:"none", borderRadius:"9px",
      padding:"6px 12px", cursor:"pointer", fontSize:"13px",
      fontWeight:"600", color:"#64748b",
    },
    modalName:       { textAlign:"center", fontSize:"18px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    modalProfession: { textAlign:"center", fontSize:"13px", color:"#64748b", margin:0 },
    infoBlock: {
      background:"#f8fafc", borderRadius:"13px",
      padding:"1rem 1.25rem", border:"1.5px solid #f1f5f9",
      display:"flex", flexDirection:"column", gap:"10px",
    },
    infoRow:   { display:"flex", flexDirection:"column", gap:"2px" },
    infoLabel: { fontSize:"10px", fontWeight:"700", color:"#94a3b8", textTransform:"uppercase", margin:0 },
    infoValue: { fontSize:"13px", color:"#1a2e42", margin:0 },
    modalReqBtn: {
      width:"100%", padding:"12px",
      background:"#1a3c5e", color:"#fff",
      border:"none", borderRadius:"12px",
      fontSize:"14px", fontWeight:"700", cursor:"pointer", transition:"background 0.2s",
    },
    modalReqDoneBtn: {
      width:"100%", padding:"12px",
      background:"#f0fdf4", color:"#166534",
      border:"1.5px solid #bbf7d0", borderRadius:"12px",
      fontSize:"14px", fontWeight:"700", cursor:"default",
    },

    /* my requests */
    myReqSection: { marginTop:"2.5rem" },
    myReqTitle: { fontSize:"11px", fontWeight:"700", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 1rem" },
    myReqGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:"1rem" },
    myReqCard: {
      background:"#fff", borderRadius:"16px", padding:"1.25rem",
      border:"1.5px solid #f1f5f9", borderLeft:"4px solid #a78bfa",
      boxShadow:"0 2px 8px rgba(15,23,42,0.05)",
      display:"flex", flexDirection:"column", gap:"6px",
    },
    myReqName: { fontSize:"14px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    myReqProf: { fontSize:"12px", color:"#64748b", margin:0 },
  };

  return (
    <div style={S.page}>
      <p style={S.pageTitle}>{t.support.title}</p>
      <p style={S.pageSub}>{t.support.subtitle}</p>

      {/* Search card */}
      <div style={S.searchCard}>
        <div style={S.searchGrid}>
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
            <label style={S.label}>{t.support.profession}</label>
            <input
              className="support-input"
              style={S.input}
              type="text"
              placeholder={t.support.professionPlaceholder}
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div style={S.group}>
            <label style={S.label}>{t.support.city}</label>
            <input
              className="support-input"
              style={S.input}
              type="text"
              placeholder={t.support.cityPlaceholder}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button className="search-btn" style={S.searchBtn} onClick={handleSearch}>
            {loading ? t.support.searching : t.support.search}
          </button>
        </div>
      </div>

      {/* Empty states */}
      {!searched && <div style={S.emptyBox}>{t.support.searchEmpty}</div>}
      {searched && !loading && results.length === 0 && (
        <div style={S.emptyBox}>{t.support.noResults}</div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={S.resultsGrid}>
          {results.map((u, i) => (
            <div
              key={u.id}
              className="result-card"
              style={{ ...S.card, animationDelay:`${i * 0.05}s` }}
            >
              <div style={S.cardTop}>
                <Avatar user={u} size={46} fontSize={15} />
                <div>
                  <p style={S.name}>{getFullName(u)}</p>
                  <p style={S.profession}>{u.profession ?? "—"}</p>
                </div>
              </div>
              {u.city && <span style={S.cityTag}>{u.city}</span>}
              <div style={S.cardActions}>
                <button className="view-btn" style={S.viewBtn} onClick={() => setSelectedUser(u)}>
                  {t.support.viewProfile}
                </button>
                <button
                  className={requested[u.id] ? "" : "req-btn"}
                  style={requested[u.id] ? S.reqDoneBtn : S.reqBtn}
                  onClick={() => handleRequest(u)}
                >
                  {requested[u.id] ? t.support.sent : t.support.sendRequest}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Requests */}
      {sentRequests.length > 0 && (
        <div style={S.myReqSection}>
          <p style={S.myReqTitle}>{t.support.myRequests}</p>
          <div style={S.myReqGrid}>
            {sentRequests.map((r) => (
              <div key={r.id} style={S.myReqCard}>
                <p style={S.myReqName}>{r.toUserName || "Community Member"}</p>
                <p style={S.myReqProf}>{r.fromUserProfession}</p>
                <StatusPill status={r.status} t={t} />
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
              <p style={S.modalTitle}>{t.support.memberProfile}</p>
              <button style={S.closeBtn} onClick={() => setSelectedUser(null)}>{t.support.close}</button>
            </div>

            {/* Show actual photo if available */}
            <Avatar user={selectedUser} size={72} fontSize={22} style={{ margin:"0 auto" }} />

            <div>
              <p style={S.modalName}>{getFullName(selectedUser)}</p>
              <p style={S.modalProfession}>{selectedUser.profession ?? "—"}</p>
            </div>

            <div style={S.infoBlock}>
              {selectedUser.email && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{t.support.email}</p>
                  <p style={S.infoValue}>{selectedUser.email}</p>
                </div>
              )}
              {selectedUser.phone && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{t.support.phone}</p>
                  <p style={S.infoValue}>{selectedUser.phone}</p>
                </div>
              )}
              {selectedUser.city && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{t.support.city}</p>
                  <p style={S.infoValue}>{selectedUser.city}</p>
                </div>
              )}
              {selectedUser.bio && (
                <div style={S.infoRow}>
                  <p style={S.infoLabel}>{t.support.bio}</p>
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
              {requested[selectedUser.id] ? t.support.requestSent : t.support.sendRequest}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
