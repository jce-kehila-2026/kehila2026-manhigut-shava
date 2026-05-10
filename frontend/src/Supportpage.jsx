import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const styles = {
  page: {
    flex: 1,
    padding: "2rem 2.5rem",
    boxSizing: "border-box",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: "0 0 4px",
  },
  pageSub: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "0 0 2rem",
  },
  searchBar: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  },
  inputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
    minWidth: "200px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    outline: "none",
    color: "#1a2e42",
    background: "#ffffff",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  searchBtn: {
    alignSelf: "flex-end",
    padding: "10px 24px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
    whiteSpace: "nowrap",
  },
  results: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "1.5rem",
    border: "1px solid #e8ecf0",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  avatar: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "#1a3c5e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
    flexShrink: 0,
  },
  name: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  profession: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  city: {
    fontSize: "12px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cardActions: {
    display: "flex",
    gap: "8px",
    marginTop: "auto",
  },
  profileBtn: {
    flex: 1,
    padding: "9px 0",
    background: "#f8fafc",
    color: "#1a3c5e",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  requestBtn: {
    flex: 1,
    padding: "9px 0",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1.5px solid #bfdbfe",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  requestedBtn: {
    flex: 1,
    padding: "9px 0",
    background: "#f0fdf4",
    color: "#166534",
    border: "1.5px solid #bbf7d0",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "default",
  },
  empty: {
    textAlign: "center",
    padding: "4rem 2rem",
    color: "#94a3b8",
    fontSize: "14px",
  },
  emptyIcon: {
    fontSize: "36px",
    marginBottom: "0.75rem",
    display: "block",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "1rem",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
  },
  modalAvatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#1a3c5e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 auto",
  },
  modalName: {
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  modalProfession: {
    textAlign: "center",
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  infoRow: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "1rem 1.25rem",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#374151",
  },
  infoIcon: {
    fontSize: "16px",
    width: "20px",
    textAlign: "center",
    flexShrink: 0,
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  },
  modalRequestBtn: {
    width: "100%",
    padding: "12px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  modalRequestedBtn: {
    width: "100%",
    padding: "12px",
    background: "#f0fdf4",
    color: "#166534",
    border: "1.5px solid #bbf7d0",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "default",
    boxSizing: "border-box",
  },
};

export default function SupportPage() {
  const { user } = useAuth();
  const [profession, setProfession] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [senderProfile, setSenderProfile] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);

useEffect(() => {
  if (!user) return;
  const fetchSent = async () => {
    const q = query(
      collection(db, "helpRequests"),
      where("fromUserId", "==", user.uid)
    );
    const snap = await getDocs(q);
    setSentRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };
  fetchSent();
}, [user]);

  // Load sender profile once
  useState(() => {
    if (!user) return;
    getDocs(collection(db, "users")).then((snap) => {
      const me = snap.docs.find((d) => d.id === user.uid);
      if (me) setSenderProfile(me.data());
    });
  }, [user]);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter((u) => {
        if (u.id === user.uid) return false; // exclude self
        const matchProfession = profession
          ? u.profession?.toLowerCase().includes(profession.toLowerCase())
          : true;
        const matchCity = city
          ? u.city?.toLowerCase().includes(city.toLowerCase())
          : true;
        return matchProfession && matchCity;
      });
      setResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (targetUser) => {
    if (requested[targetUser.id]) return;
    try {
      await addDoc(collection(db, "helpRequests"), {
        toUserId: targetUser.id,
        toUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        fromUserId: user.uid,
        fromUserName: senderProfile
          ? `${senderProfile.firstName} ${senderProfile.lastName}`
          : user.email,
        fromUserEmail: user.email,
        fromUserPhone: senderProfile?.phone ?? "",
        fromUserProfession: senderProfile?.profession ?? "",
        status: null,
        createdAt: new Date().toISOString(),
      });
      setRequested((prev) => ({ ...prev, [targetUser.id]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (u) => {
    if (u.firstName && u.lastName)
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    return (u.email?.[0] ?? "?").toUpperCase();
  };

  const getFullName = (u) =>
    u.firstName && u.lastName
      ? `${u.firstName} ${u.lastName}`
      : u.email ?? "Unknown";

  return (
    <div style={styles.page}>
      <p style={styles.pageTitle}>Support</p>
      <p style={styles.pageSub}>
        Find community members by profession and request their help.
      </p>

      <div style={styles.searchBar}>
        <div style={styles.inputWrapper}>
          <label style={styles.label}>Profession / Job</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Doctor, Engineer, Lawyer..."
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>
        <div style={styles.inputWrapper}>
          <label style={styles.label}>City (optional)</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Tel Aviv, Jerusalem..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>
        <button
          style={styles.searchBtn}
          onClick={handleSearch}
          onMouseOver={(e) => (e.target.style.background = "#122d47")}
          onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {!searched && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🔍</span>
          Search for a profession above to find members who can help.
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>😕</span>
          No members found. Try a different search.
        </div>
      )}

      {results.length > 0 && (
        <div style={styles.results}>
          {results.map((u) => (
            <div key={u.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.avatar}>{getInitials(u)}</div>
                <div>
                  <p style={styles.name}>{getFullName(u)}</p>
                  <p style={styles.profession}>{u.profession ?? "—"}</p>
                </div>
              </div>
              {u.city && <span style={styles.city}>📍 {u.city}</span>}
              <div style={styles.cardActions}>
                <button
                  style={styles.profileBtn}
                  onClick={() => setSelectedUser(u)}
                  onMouseOver={(e) => (e.target.style.background = "#f1f5f9")}
                  onMouseOut={(e) => (e.target.style.background = "#f8fafc")}
                >
                  Check Profile
                </button>
                <button
                  style={requested[u.id] ? styles.requestedBtn : styles.requestBtn}
                  onClick={() => handleRequest(u)}
                >
                  {requested[u.id] ? "✓ Sent" : "Request Help"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUser && (
        <div style={styles.overlay} onClick={() => setSelectedUser(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <p style={styles.modalTitle}>Member Profile</p>
              <button style={styles.closeBtn} onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div style={styles.modalAvatar}>{getInitials(selectedUser)}</div>
            <div>
              <p style={styles.modalName}>{getFullName(selectedUser)}</p>
              <p style={styles.modalProfession}>{selectedUser.profession ?? "—"}</p>
            </div>
            <div style={styles.infoRow}>
              {selectedUser.email && (
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>✉️</span>
                  <div>
                    <p style={styles.infoLabel}>Email</p>
                    <span>{selectedUser.email}</span>
                  </div>
                </div>
              )}
              {selectedUser.phone && (
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>📞</span>
                  <div>
                    <p style={styles.infoLabel}>Phone</p>
                    <span>{selectedUser.phone}</span>
                  </div>
                </div>
              )}
              {selectedUser.city && (
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>📍</span>
                  <div>
                    <p style={styles.infoLabel}>City</p>
                    <span>{selectedUser.city}</span>
                  </div>
                </div>
              )}
            </div>
            <button
              style={requested[selectedUser.id] ? styles.modalRequestedBtn : styles.modalRequestBtn}
              onClick={() => handleRequest(selectedUser)}
              onMouseOver={(e) => {
                if (!requested[selectedUser.id]) e.target.style.background = "#122d47";
              }}
              onMouseOut={(e) => {
                if (!requested[selectedUser.id]) e.target.style.background = "#1a3c5e";
              }}
            >
              {requested[selectedUser.id] ? "✓ Request Sent" : "Request Help"}
            </button>
          </div>
        </div>
      )}
      {sentRequests.length > 0 && (
  <div style={{ marginTop: "3rem" }}>
    <p style={{ ...styles.pageTitle, fontSize: "16px", marginBottom: "1rem" }}>
      My Requests
    </p>
    <div style={styles.results}>
      {sentRequests.map((r) => (
        <div key={r.id} style={styles.card}>
          <p style={styles.name}>{r.toUserName || "Community Member"}</p>
          <p style={styles.profession}>{r.fromUserProfession}</p>
          <span style={{
            fontSize: "12px",
            fontWeight: "700",
            padding: "4px 10px",
            borderRadius: "20px",
            background: r.status === "accepted" ? "#f0fdf4" : r.status === "declined" ? "#fff0f0" : "#f1f5f9",
            color: r.status === "accepted" ? "#166534" : r.status === "declined" ? "#b91c1c" : "#64748b",
            border: r.status === "accepted" ? "1px solid #bbf7d0" : r.status === "declined" ? "1px solid #fca5a5" : "1px solid #e2e8f0",
            display: "inline-block",
          }}>
            {r.status === "accepted" ? "✓ Accepted" : r.status === "declined" ? "✕ Declined" : "⏳ Pending"}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  );
}