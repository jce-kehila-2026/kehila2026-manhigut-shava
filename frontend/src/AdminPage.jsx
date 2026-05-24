import { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc,
  limit, where, addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { logActivity } from "./activityLogger";

/* ─── Styles ─── */
const S = {
  page: { padding: "2rem 2.5rem", boxSizing: "border-box", width: "100%", fontFamily: "'DM Sans', system-ui, sans-serif" },
  denied: { textAlign: "center", padding: "4rem", color: "#dc2626", fontSize: "1.1rem", fontWeight: 700 },

  header: { marginBottom: "1.75rem" },
  title: { fontSize: "22px", fontWeight: 800, color: "#1a3c5e", margin: "0 0 3px" },
  sub: { fontSize: "13px", color: "#94a3b8", margin: 0 },

  stats: { display: "flex", gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap" },
  statCard: {
    background: "#fff", borderRadius: "14px", padding: "1rem 1.5rem",
    border: "1.5px solid #f1f5f9", boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
    minWidth: "120px",
  },
  statNum: { fontSize: "26px", fontWeight: 800, color: "#1a3c5e", margin: 0 },
  statLabel: { fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 },

  tabs: { display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab: (active) => ({
    padding: "8px 20px", borderRadius: "9px", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif",
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
    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "background 0.15s",
  },
  adminBtn: {
    background: "none", border: "1px solid #a78bfa", color: "#7c3aed",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "background 0.15s", marginLeft: "6px",
  },
  editBtn: {
    background: "none", border: "1px solid #93c5fd", color: "#1d4ed8",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "background 0.15s", marginLeft: "6px",
  },
  adminBadge: {
    fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "99px",
    background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd",
  },

  empty: { textAlign: "center", padding: "3rem", color: "#cbd5e1", fontSize: "14px" },
  tableWrap: {
    background: "#fff", borderRadius: "16px",
    border: "1.5px solid #f1f5f9", overflow: "hidden",
    boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
  },

  /* Search bar */
  searchInput: {
    padding: "9px 14px", fontSize: "13px",
    border: "1.5px solid #e2e8f0", borderRadius: "10px",
    color: "#1a2e42", background: "#f8fafc",
    width: "260px", marginBottom: "1rem",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },

  /* Modal overlay */
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: "1rem", backdropFilter: "blur(4px)",
  },
  modalBox: {
    background: "#fff", borderRadius: "22px", padding: "2rem",
    width: "100%", maxWidth: "480px",
    boxShadow: "0 16px 48px rgba(15,23,42,0.18)",
    display: "flex", flexDirection: "column", gap: "1rem",
    maxHeight: "90vh", overflowY: "auto",
  },
  modalTitle: { fontSize: "17px", fontWeight: 700, color: "#1a3c5e", margin: 0 },
  modalLabel: { fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" },
  modalInput: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", fontSize: "13px",
    border: "1.5px solid #e2e8f0", borderRadius: "10px",
    color: "#1a2e42", background: "#f8fafc",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  modalActions: { display: "flex", gap: "8px", marginTop: "0.5rem" },
  saveModalBtn: {
    flex: 1, padding: "11px",
    background: "#1a3c5e", color: "#fff",
    border: "none", borderRadius: "11px",
    fontSize: "14px", fontWeight: 700, cursor: "pointer",
  },
  cancelModalBtn: {
    flex: 1, padding: "11px",
    background: "#f1f5f9", color: "#64748b",
    border: "none", borderRadius: "11px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
  },

  /* Comments section per post */
  commentsWrap: {
    background: "#f8fafc", borderRadius: "10px",
    padding: "0.75rem 1rem", marginTop: "4px",
    border: "1px solid #f1f5f9",
    display: "flex", flexDirection: "column", gap: "6px",
  },
  commentRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "6px 0", borderBottom: "1px solid #f1f5f9",
    fontSize: "12px", color: "#374151",
  },

  /* Logs tab */
  logPanel: {
    background: "#f8fafc", borderRadius: "16px",
    border: "1.5px solid #f1f5f9",
    boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
    overflow: "hidden",
  },
  logFilters: {
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #f1f5f9",
    background: "#fff",
    display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center",
  },
  logFilterInput: {
    padding: "7px 12px", fontSize: "12px",
    border: "1.5px solid #e2e8f0", borderRadius: "9px",
    color: "#1a2e42", background: "#f8fafc",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  logList: { padding: "0.5rem 0" },
  logRow: (typeColor) => ({
    display: "flex", alignItems: "flex-start", gap: "12px",
    padding: "10px 1.25rem",
    borderLeft: `3px solid ${typeColor}`,
    borderBottom: "1px solid #f1f5f9",
    background: "#fff",
    transition: "background 0.12s",
    marginBottom: "2px",
  }),
  logBadge: (bg, color) => ({
    fontSize: "10px", fontWeight: 700, padding: "3px 9px",
    borderRadius: "99px", background: bg, color,
    whiteSpace: "nowrap", flexShrink: 0,
    border: `1px solid ${color}22`,
    letterSpacing: "0.04em",
  }),
  logTimestamp: { fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 },
  logActor: { fontSize: "13px", fontWeight: 700, color: "#1a3c5e" },
  logDesc:  { fontSize: "12px", color: "#64748b" },
  logDetails: { fontSize: "11px", color: "#94a3b8", fontStyle: "italic" },

  refreshBtn: {
    padding: "7px 16px", background: "#eff6ff", color: "#1d4ed8",
    border: "1.5px solid #bfdbfe", borderRadius: "9px",
    fontSize: "12px", fontWeight: 700, cursor: "pointer",
    transition: "background 0.15s",
  },
};

/* ─── Helpers ─── */
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

/* ─── Log type config ─── */
const LOG_TYPES = {
  signup:               { label: "SIGNUP",         bg: "#dcfce7", color: "#166534", borderColor: "#22c55e" },
  login:                { label: "LOGIN",           bg: "#ccfbf1", color: "#0f766e", borderColor: "#14b8a6" },
  post:                 { label: "POST",            bg: "#dbeafe", color: "#1e40af", borderColor: "#3b82f6" },
  post_edit:            { label: "POST EDIT",       bg: "#fef3c7", color: "#92400e", borderColor: "#f59e0b" },
  post_delete:          { label: "POST DELETE",     bg: "#fee2e2", color: "#b91c1c", borderColor: "#ef4444" },
  comment:              { label: "COMMENT",         bg: "#e0e7ff", color: "#3730a3", borderColor: "#6366f1" },
  comment_edit:         { label: "COMMENT EDIT",    bg: "#fef3c7", color: "#92400e", borderColor: "#f59e0b" },
  comment_delete:       { label: "CMNT DELETE",     bg: "#fee2e2", color: "#b91c1c", borderColor: "#ef4444" },
  request_sent:         { label: "REQUEST SENT",    bg: "#f3e8ff", color: "#7c3aed", borderColor: "#a855f7" },
  request_accepted:     { label: "REQ ACCEPTED",    bg: "#dcfce7", color: "#166534", borderColor: "#22c55e" },
  request_declined:     { label: "REQ DECLINED",    bg: "#fee2e2", color: "#b91c1c", borderColor: "#ef4444" },
  profile_update:       { label: "PROFILE UPD",     bg: "#e0f2fe", color: "#0369a1", borderColor: "#38bdf8" },
  admin_edit_profile:   { label: "ADMIN EDIT",      bg: "#fee2e2", color: "#b91c1c", borderColor: "#ef4444" },
  admin_delete_post:    { label: "ADMIN DEL POST",  bg: "#fee2e2", color: "#b91c1c", borderColor: "#ef4444" },
  admin_delete_comment: { label: "ADMIN DEL CMNT",  bg: "#fee2e2", color: "#b91c1c", borderColor: "#ef4444" },
};

function getLogTypeConfig(type) {
  return LOG_TYPES[type] ?? { label: type?.toUpperCase() ?? "?", bg: "#f1f5f9", color: "#64748b", borderColor: "#94a3b8" };
}

function humanDescription(log) {
  const actor = log.actorName ?? log.actorId ?? "Someone";
  switch (log.type) {
    case "signup":               return `${actor} signed up`;
    case "login":                return `${actor} logged in`;
    case "post":                 return `${actor} posted in community`;
    case "post_edit":            return `${actor} edited a post`;
    case "post_delete":          return `${actor} deleted a post`;
    case "comment":              return `${actor} commented on a post`;
    case "comment_edit":         return `${actor} edited a comment`;
    case "comment_delete":       return `${actor} deleted a comment`;
    case "request_sent":         return `${actor} sent a help request${log.details?.toUserName ? ` to ${log.details.toUserName}` : ""}`;
    case "request_accepted":     return `${actor} accepted a help request`;
    case "request_declined":     return `${actor} declined a help request`;
    case "profile_update":       return `${actor} updated their profile`;
    case "admin_edit_profile":   return `${actor} (admin) edited profile of ${log.targetId ?? "user"}`;
    case "admin_delete_post":    return `${actor} (admin) deleted a post`;
    case "admin_delete_comment": return `${actor} (admin) deleted a comment`;
    default:                     return `${actor} performed action: ${log.type}`;
  }
}

function formatAbsoluteTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch { return ts; }
}

/* ══════════════════════════════════════════════════════
   EDIT USER MODAL
═══════════════════════════════════════════════════════ */
function EditUserModal({ u, adminUser, adminName, onClose, onSaved }) {
  const [fields, setFields] = useState({
    firstName:  u.firstName  ?? "",
    lastName:   u.lastName   ?? "",
    phone:      u.phone      ?? "",
    city:       u.city       ?? "",
    profession: u.profession ?? "",
    bio:        u.bio        ?? "",
    isAdmin:    u.isAdmin    ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFields((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", u.id), { ...fields });
      logActivity({
        type: "admin_edit_profile",
        actorId: adminUser.uid,
        actorName: adminName,
        targetId: u.id,
        targetType: "user",
        details: { editedFields: Object.keys(fields) },
      });
      onSaved({ ...u, ...fields });
      onClose();
    } catch (err) {
      console.error("Edit user error:", err);
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { ...S.modalLabel, display: "block" };
  const groupStyle = { display: "flex", flexDirection: "column", gap: "4px" };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <p style={S.modalTitle}>Edit User — {u.firstName} {u.lastName}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={groupStyle}>
            <label style={labelStyle}>First Name</label>
            <input name="firstName" style={S.modalInput} value={fields.firstName} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Last Name</label>
            <input name="lastName" style={S.modalInput} value={fields.lastName} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Phone</label>
            <input name="phone" style={S.modalInput} value={fields.phone} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>City</label>
            <input name="city" style={S.modalInput} value={fields.city} onChange={handleChange} />
          </div>
        </div>

        <div style={groupStyle}>
          <label style={labelStyle}>Profession</label>
          <input name="profession" style={S.modalInput} value={fields.profession} onChange={handleChange} />
        </div>

        <div style={groupStyle}>
          <label style={labelStyle}>Bio</label>
          <textarea
            name="bio"
            style={{ ...S.modalInput, minHeight: "80px", resize: "vertical" }}
            value={fields.bio}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            id="isAdminCheck"
            name="isAdmin"
            checked={fields.isAdmin}
            onChange={handleChange}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="isAdminCheck" style={{ fontSize: "13px", fontWeight: 600, color: "#1a3c5e", cursor: "pointer" }}>
            Admin privileges
          </label>
        </div>

        <div style={S.modalActions}>
          <button style={S.cancelModalBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...S.saveModalBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN PAGE
═══════════════════════════════════════════════════════ */
export default function AdminPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers]   = useState([]);
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Edit Users tab state ── */
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);

  /* ── Posts: expanded comments ── */
  const [expandedPostComments, setExpandedPostComments] = useState({});
  const [postCommentsList, setPostCommentsList]         = useState({});

  /* ── Logs tab state ── */
  const [logs,          setLogs]          = useState([]);
  const [logsLoading,   setLogsLoading]   = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState([]);
  const [logActorFilter, setLogActorFilter] = useState("");
  const [logDateFrom,   setLogDateFrom]   = useState("");
  const [logDateTo,     setLogDateTo]     = useState("");

  const adminName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email ?? "Admin";

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

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(200));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "logs" && logs.length === 0) {
      fetchLogs();
    }
  }, [tab]);

  if (!profile?.isAdmin) {
    return <div style={S.denied}>Access Denied — Admins only.</div>;
  }

  /* ── User operations ── */
  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await deleteDoc(doc(db, "users", id));
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const toggleAdmin = async (id, current) => {
    await updateDoc(doc(db, "users", id), { isAdmin: !current });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isAdmin: !current } : u));
  };

  /* ── Post operations ── */
  const deletePost = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", id));
    setPosts(prev => prev.filter(p => p.id !== id));
    logActivity({
      type: "admin_delete_post",
      actorId: user.uid,
      actorName: adminName,
      targetId: id,
      targetType: "post",
      details: {},
    });
  };

  /* ── Toggle post comments expansion ── */
  const togglePostComments = async (postId) => {
    const isOpen = expandedPostComments[postId];
    setExpandedPostComments(prev => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !postCommentsList[postId]) {
      try {
        const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        setPostCommentsList(prev => ({
          ...prev,
          [postId]: snap.docs.map(d => ({ id: d.id, ...d.data() })),
        }));
      } catch (err) { console.error("Load post comments error:", err); }
    }
  };

  const deleteComment = async (postId, comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", comment.id));
      const post = posts.find(p => p.id === postId);
      const newCount = Math.max(0, (post?.commentsCount ?? 1) - 1);
      await updateDoc(doc(db, "posts", postId), { commentsCount: newCount });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: newCount } : p));
      setPostCommentsList(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter(c => c.id !== comment.id),
      }));
      logActivity({
        type: "admin_delete_comment",
        actorId: user.uid,
        actorName: adminName,
        targetId: comment.id,
        targetType: "comment",
        details: { postId, text: comment.text?.slice(0, 100) },
      });
    } catch (err) { console.error("Admin delete comment error:", err); }
  };

  /* ── Log filters ── */
  const filteredLogs = logs.filter(log => {
    if (logTypeFilter.length > 0 && !logTypeFilter.includes(log.type)) return false;
    if (logActorFilter && !(log.actorName ?? "").toLowerCase().includes(logActorFilter.toLowerCase())) return false;
    if (logDateFrom && log.timestamp < logDateFrom) return false;
    if (logDateTo   && log.timestamp > logDateTo + "T23:59:59") return false;
    return true;
  });

  const allLogTypes = [...new Set(logs.map(l => l.type))].filter(Boolean).sort();

  const toggleLogType = (type) => {
    setLogTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  /* ── Edit Users: filtered list ── */
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.profession ?? "").toLowerCase().includes(q);
  });

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div style={S.page}>
      <div style={S.header}>
        <p style={S.title}>Admin Panel</p>
        <p style={S.sub}>Manage users, content, and activity logs</p>
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
        <div style={S.statCard}>
          <p style={S.statNum}>{logs.length}</p>
          <p style={S.statLabel}>Log Entries</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(tab === "users")}     onClick={() => setTab("users")}>Users ({users.length})</button>
        <button style={S.tab(tab === "editUsers")} onClick={() => setTab("editUsers")}>Users (Edit)</button>
        <button style={S.tab(tab === "posts")}     onClick={() => setTab("posts")}>Posts ({posts.length})</button>
        <button style={S.tab(tab === "logs")}      onClick={() => setTab("logs")}>Activity Logs</button>
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
                      {u.isAdmin && <span style={S.adminBadge}>Admin</span>}
                      {u.id !== user?.uid && (
                        <button
                          style={S.adminBtn}
                          onMouseEnter={e => e.currentTarget.style.background = "#ede9fe"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        >
                          {u.isAdmin ? "Revoke Admin" : "Make Admin"}
                        </button>
                      )}
                      {u.id !== user?.uid && (
                        <button
                          style={S.delBtn}
                          onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => deleteUser(u.id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Edit Users Tab ── */}
      {!loading && tab === "editUsers" && (
        <div>
          <input
            style={S.searchInput}
            type="text"
            placeholder="Search by name, email, profession…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
          <div style={S.tableWrap}>
            {filteredUsers.length === 0 ? (
              <p style={S.empty}>No users match your search.</p>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Profession</th>
                    <th style={S.th}>City</th>
                    <th style={S.th}>Admin</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
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
                        {u.isAdmin ? <span style={S.adminBadge}>Admin</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={S.td}>
                        <button
                          style={S.editBtn}
                          onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => setEditingUser(u)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
                  <th style={S.th}>Comments</th>
                  <th style={S.th}>Posted</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <>
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
                      <td style={{ ...S.td, maxWidth: "280px" }}>
                        <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px", color: p.text ? "#374151" : "#94a3b8" }}>
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
                      <td style={S.td}>
                        <button
                          style={{
                            background: "none", border: "1px solid #e2e8f0", borderRadius: "7px",
                            padding: "4px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer",
                            color: "#64748b",
                          }}
                          onClick={() => togglePostComments(p.id)}
                        >
                          {expandedPostComments[p.id] ? "Hide" : `Show (${p.commentsCount ?? 0})`}
                        </button>
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
                    {expandedPostComments[p.id] && (
                      <tr key={`${p.id}-comments`}>
                        <td colSpan={6} style={{ padding: "0 14px 12px 46px", background: "#fafafa" }}>
                          <div style={S.commentsWrap}>
                            {!postCommentsList[p.id] ? (
                              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Loading comments…</p>
                            ) : postCommentsList[p.id].length === 0 ? (
                              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No comments yet.</p>
                            ) : (
                              postCommentsList[p.id].map(c => (
                                <div key={c.id} style={S.commentRow}>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 700, color: "#1a3c5e", marginRight: "8px" }}>{c.authorName}</span>
                                    <span style={{ color: "#374151" }}>{c.text}</span>
                                    <span style={{ color: "#94a3b8", fontSize: "10px", marginLeft: "8px" }}>{timeAgo(c.createdAt)}</span>
                                  </div>
                                  <button
                                    style={{ ...S.delBtn, padding: "3px 9px", fontSize: "10px" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                                    onClick={() => deleteComment(p.id, c)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Logs Tab ── */}
      {tab === "logs" && (
        <div>
          {/* Filter bar */}
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "1.25rem",
            border: "1.5px solid #f1f5f9", marginBottom: "1rem",
            boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
            display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a3c5e", margin: 0 }}>
                Activity Log Filters
              </p>
              <button style={S.refreshBtn} onClick={fetchLogs}>
                {logsLoading ? "Loading…" : "&#8635; Refresh"}
              </button>
            </div>

            {/* Type filter pills */}
            {allLogTypes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {allLogTypes.map(type => {
                  const cfg = getLogTypeConfig(type);
                  const active = logTypeFilter.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleLogType(type)}
                      style={{
                        padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 700,
                        cursor: "pointer", border: `1.5px solid ${active ? cfg.borderColor : "#e2e8f0"}`,
                        background: active ? cfg.bg : "#f8fafc",
                        color: active ? cfg.color : "#64748b",
                        transition: "all 0.15s",
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
                {logTypeFilter.length > 0 && (
                  <button
                    onClick={() => setLogTypeFilter([])}
                    style={{ padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 700, cursor: "pointer", border: "1.5px solid #e2e8f0", background: "#f1f5f9", color: "#64748b" }}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Actor + Date range */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ ...S.modalLabel, marginBottom: "3px" }}>Actor name</p>
                <input
                  style={{ ...S.logFilterInput, width: "200px" }}
                  type="text"
                  placeholder="Filter by actor name…"
                  value={logActorFilter}
                  onChange={e => setLogActorFilter(e.target.value)}
                />
              </div>
              <div>
                <p style={{ ...S.modalLabel, marginBottom: "3px" }}>From date</p>
                <input
                  style={S.logFilterInput}
                  type="date"
                  value={logDateFrom}
                  onChange={e => setLogDateFrom(e.target.value)}
                />
              </div>
              <div>
                <p style={{ ...S.modalLabel, marginBottom: "3px" }}>To date</p>
                <input
                  style={S.logFilterInput}
                  type="date"
                  value={logDateTo}
                  onChange={e => setLogDateTo(e.target.value)}
                />
              </div>
              {(logActorFilter || logDateFrom || logDateTo) && (
                <button
                  onClick={() => { setLogActorFilter(""); setLogDateFrom(""); setLogDateTo(""); }}
                  style={{ ...S.refreshBtn, background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", marginTop: "18px" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Log list */}
          <div style={S.logPanel}>
            {logsLoading && <p style={S.empty}>Loading logs…</p>}
            {!logsLoading && filteredLogs.length === 0 && (
              <p style={S.empty}>{logs.length === 0 ? "No activity logs yet." : "No logs match the current filters."}</p>
            )}
            {!logsLoading && filteredLogs.length > 0 && (
              <div style={S.logList}>
                <div style={{ padding: "10px 1.25rem 6px", background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                    Showing {filteredLogs.length} of {logs.length} entries
                  </p>
                </div>
                {filteredLogs.map(log => {
                  const cfg = getLogTypeConfig(log.type);
                  const desc = humanDescription(log);
                  const relTime = timeAgo(log.timestamp);
                  const absTime = formatAbsoluteTime(log.timestamp);
                  const hasDetails = log.details && Object.keys(log.details).length > 0;

                  return (
                    <div
                      key={log.id}
                      style={S.logRow(cfg.borderColor)}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                    >
                      <span style={S.logBadge(cfg.bg, cfg.color)}>{cfg.label}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                          <span style={S.logActor}>{log.actorName ?? log.actorId ?? "Unknown"}</span>
                          <span style={S.logDesc}>{desc.replace(/^.*?—\s*/, "")}</span>
                        </div>
                        {hasDetails && (
                          <p style={S.logDetails}>
                            {log.details.text
                              ? `"${log.details.text}"`
                              : log.details.editedFields
                              ? `Fields: ${log.details.editedFields.join(", ")}`
                              : log.details.toUserName
                              ? `To: ${log.details.toUserName}`
                              : null}
                          </p>
                        )}
                      </div>
                      <span
                        style={S.logTimestamp}
                        title={absTime}
                      >
                        {relTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <EditUserModal
          u={editingUser}
          adminUser={user}
          adminName={adminName}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
          }}
        />
      )}
    </div>
  );
}
