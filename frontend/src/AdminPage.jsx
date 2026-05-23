import { useState, useEffect } from "react";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const S = {
  page: { padding: "2rem 2.5rem", boxSizing: "border-box", width: "100%", fontFamily: "'Heebo', system-ui, sans-serif" },
  denied: { textAlign: "center", padding: "4rem", color: "#dc2626", fontSize: "1.1rem", fontWeight: 700 },

  header: { marginBottom: "1.75rem" },
  title: { fontSize: "22px", fontWeight: 800, color: "#1a3c5e", margin: "0 0 3px" },
  sub: { fontSize: "13px", color: "#94a3b8", margin: 0 },

  stats: { display: "flex", gap: "1rem", marginBottom: "1.75rem" },
  statCard: {
    background: "#fff", borderRadius: "14px", padding: "1rem 1.5rem",
    border: "1.5px solid #f1f5f9", boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
    minWidth: "120px",
  },
  statNum: { fontSize: "26px", fontWeight: 800, color: "#1a3c5e", margin: 0 },
  statLabel: { fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 },

  tabs: { display: "flex", gap: "6px", marginBottom: "1.5rem" },
  tab: (active) => ({
    padding: "8px 20px", borderRadius: "9px", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: 700, fontFamily: "'Heebo', system-ui, sans-serif",
    background: active ? "#1a3c5e" : "#f1f5f9",
    color: active ? "#fff" : "#64748b",
    transition: "all 0.15s",
  }),

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left", padding: "10px 14px",
    fontSize: "11px", fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: "2px solid #f1f5f9", background: "#f8fafc",
  },
  td: {
    padding: "12px 14px", fontSize: "13px", color: "#374151",
    borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
  },
  row: { background: "#fff", transition: "background 0.12s" },

  name: { fontWeight: 700, color: "#1a3c5e", margin: 0 },
  meta: { fontSize: "11px", color: "#94a3b8", margin: 0 },

  badge: (verified) => ({
    fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "99px",
    background: verified ? "#dcfce7" : "#fef9c3",
    color: verified ? "#166534" : "#854d0e",
    border: verified ? "1px solid #bbf7d0" : "1px solid #fde047",
  }),

  delBtn: {
    background: "none", border: "1px solid #fca5a5", color: "#dc2626",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "'Heebo', system-ui, sans-serif",
    transition: "background 0.15s",
  },

  empty: { textAlign: "center", padding: "3rem", color: "#cbd5e1", fontSize: "14px" },
  tableWrap: {
    background: "#fff", borderRadius: "16px",
    border: "1.5px solid #f1f5f9", overflow: "hidden",
    boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
  },
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name) {
  return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.isAdmin) return;
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"))),
    ]).then(([uSnap, pSnap]) => {
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPosts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [profile]);

  if (!profile?.isAdmin) {
    return <div style={S.denied}>⛔ Access Denied — Admins only.</div>;
  }

  const deleteUser = async (id) => {
    await deleteDoc(doc(db, "users", id));
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const deletePost = async (id) => {
    await deleteDoc(doc(db, "posts", id));
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <p style={S.title}>Admin Panel</p>
        <p style={S.sub}>Manage users and content</p>
      </div>

      {/* Stats */}
      <div style={S.stats}>
        <div style={S.statCard}>
          <p style={S.statNum}>{users.length}</p>
          <p style={S.statLabel}>Total Users</p>
        </div>
        <div style={S.statCard}>
          <p style={S.statNum}>{posts.length}</p>
          <p style={S.statLabel}>Total Posts</p>
        </div>
        <div style={S.statCard}>
          <p style={S.statNum}>{users.filter(u => u.emailVerified).length}</p>
          <p style={S.statLabel}>Verified</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(tab === "users")} onClick={() => setTab("users")}>Users ({users.length})</button>
        <button style={S.tab(tab === "posts")} onClick={() => setTab("posts")}>Posts ({posts.length})</button>
      </div>

      {loading && <p style={S.empty}>Loading…</p>}

      {/* ── Users Table ── */}
      {!loading && tab === "users" && (
        <div style={S.tableWrap}>
          {users.length === 0 ? (
            <p style={S.empty}>No users yet.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Profession</th>
                  <th style={S.th}>City</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Joined</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={S.row}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  >
                    <td style={S.td}>
                      <p style={S.name}>{u.firstName} {u.lastName}</p>
                      <p style={S.meta}>{u.phone || "—"}</p>
                    </td>
                    <td style={S.td}>{u.email || "—"}</td>
                    <td style={S.td}>{u.profession || "—"}</td>
                    <td style={S.td}>{u.city || "—"}</td>
                    <td style={S.td}>
                      <span style={S.badge(u.emailVerified)}>
                        {u.emailVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td style={S.td}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={S.td}>
                      <button
                        style={S.delBtn}
                        onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                        onClick={() => deleteUser(u.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Posts Table ── */}
      {!loading && tab === "posts" && (
        <div style={S.tableWrap}>
          {posts.length === 0 ? (
            <p style={S.empty}>No posts yet.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Author</th>
                  <th style={S.th}>Content</th>
                  <th style={S.th}>Media</th>
                  <th style={S.th}>Posted</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} style={S.row}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  >
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg,#1a3c5e,#0ea5e9)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "11px", fontWeight: 700, color: "#fff",
                        }}>
                          {getInitials(p.authorName)}
                        </div>
                        <p style={{ ...S.name, fontSize: "12px" }}>{p.authorName}</p>
                      </div>
                    </td>
                    <td style={{ ...S.td, maxWidth: "320px" }}>
                      <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px", color: p.text ? "#374151" : "#94a3b8" }}>
                        {p.text || "(image only)"}
                      </p>
                    </td>
                    <td style={S.td}>
                      {p.media?.length > 0
                        ? <span style={{ fontSize: "11px", background: "#dbeafe", color: "#1e40af", borderRadius: "99px", padding: "2px 9px", fontWeight: 700 }}>
                            {p.media.length} file{p.media.length > 1 ? "s" : ""}
                          </span>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                    <td style={S.td}>{timeAgo(p.createdAt)}</td>
                    <td style={S.td}>
                      <button
                        style={S.delBtn}
                        onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                        onClick={() => deletePost(p.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
