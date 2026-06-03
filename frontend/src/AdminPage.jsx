import { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, deleteDoc, doc, query,
  orderBy, updateDoc, limit, where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { useAuth } from "./AuthContext";
import { logActivity } from "./activityLogger";

/* ─── Styles (our S object — used by EditUsers, Logs, EditUserModal) ─── */
const S = {
  page: { padding: "2rem 2.5rem", boxSizing: "border-box", width: "100%", fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)", flex: 1, overflow: "auto" },
  denied: { textAlign: "center", padding: "4rem", color: "#dc2626", fontSize: "1.1rem", fontWeight: 700 },

  header: { marginBottom: "1.75rem" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text-primary,#1a3c5e)", margin: "0 0 3px" },
  sub: { fontSize: "13px", color: "var(--text-muted,#94a3b8)", margin: 0 },

  tabs: { display: "flex", gap: "4px", marginBottom: "1.5rem", flexWrap: "wrap", background: "var(--bg-tertiary,#f1f5f9)", borderRadius: "var(--r-md,10px)", padding: "4px", width: "fit-content" },
  tab: (active) => ({
    padding: "7px 16px", borderRadius: "var(--r-sm,8px)", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: active ? 700 : 500, fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
    background: active ? "var(--bg-primary,#fff)" : "transparent",
    color: active ? "var(--text-primary,#1a3c5e)" : "var(--text-muted,#64748b)",
    boxShadow: active ? "var(--shadow-xs,0 1px 4px rgba(15,23,42,0.07))" : "none",
    transition: "all 0.15s",
  }),

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left", padding: "10px 14px",
    fontSize: "11px", fontWeight: 700, color: "var(--text-muted,#94a3b8)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: "1px solid var(--border,#f1f5f9)", background: "var(--bg-secondary,#f8fafc)",
  },
  td: {
    padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary,#374151)",
    borderBottom: "1px solid var(--bg-tertiary,#f1f5f9)", verticalAlign: "middle",
  },
  row: { background: "var(--bg-primary,#fff)", transition: "background 0.12s" },

  name: { fontWeight: 700, color: "var(--text-primary,#1a3c5e)", margin: 0 },
  meta: { fontSize: "11px", color: "var(--text-muted,#94a3b8)", margin: 0 },

  badge: (verified) => ({
    fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "99px",
    background: verified ? "#dcfce7" : "#fef9c3",
    color: verified ? "#166534" : "#854d0e",
    border: verified ? "1px solid #bbf7d0" : "1px solid #fde047",
  }),

  delBtn: {
    background: "none", border: "1px solid #fca5a5", color: "#dc2626",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
    transition: "background 0.15s",
  },
  adminBtn: {
    background: "none", border: "1px solid #a78bfa", color: "#7c3aed",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
    transition: "background 0.15s", marginLeft: "6px",
  },
  editBtn: {
    background: "none", border: "1px solid #93c5fd", color: "#1d4ed8",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
    transition: "background 0.15s", marginLeft: "6px",
  },
  adminBadge: {
    fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "99px",
    background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd",
  },

  empty: { textAlign: "center", padding: "3rem", color: "#cbd5e1", fontSize: "14px" },
  tableWrap: {
    background: "var(--bg-primary,#fff)", borderRadius: "16px",
    border: "1.5px solid var(--border,#f1f5f9)", overflow: "hidden",
    boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
  },

  searchInput: {
    padding: "9px 14px", fontSize: "13px",
    border: "1.5px solid var(--border,#e2e8f0)", borderRadius: "10px",
    color: "var(--text-primary,#1a2e42)", background: "var(--bg-secondary,#f8fafc)",
    width: "260px", marginBottom: "1rem",
    fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
  },

  /* Modal overlay */
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: "1rem", backdropFilter: "blur(4px)",
  },
  modalBox: {
    background: "var(--bg-primary,#fff)", borderRadius: "22px", padding: "2rem",
    width: "100%", maxWidth: "480px",
    boxShadow: "0 16px 48px rgba(15,23,42,0.18)",
    display: "flex", flexDirection: "column", gap: "1rem",
    maxHeight: "90vh", overflowY: "auto",
  },
  modalTitle: { fontSize: "17px", fontWeight: 700, color: "var(--text-primary,#1a3c5e)", margin: 0 },
  modalLabel: { fontSize: "11px", fontWeight: 700, color: "var(--text-muted,#94a3b8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" },
  modalInput: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", fontSize: "13px",
    border: "1.5px solid var(--border,#e2e8f0)", borderRadius: "10px",
    color: "var(--text-primary,#1a2e42)", background: "var(--bg-secondary,#f8fafc)",
    fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
  },
  modalActions: { display: "flex", gap: "8px", marginTop: "0.5rem" },
  saveModalBtn: {
    flex: 1, padding: "11px",
    background: "var(--brand,#1a3c5e)", color: "#fff",
    border: "none", borderRadius: "11px",
    fontSize: "14px", fontWeight: 700, cursor: "pointer",
  },
  cancelModalBtn: {
    flex: 1, padding: "11px",
    background: "var(--bg-tertiary,#f1f5f9)", color: "var(--text-muted,#64748b)",
    border: "none", borderRadius: "11px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
  },

  /* Comments section per post */
  commentsWrap: {
    background: "var(--bg-secondary,#f8fafc)", borderRadius: "10px",
    padding: "0.75rem 1rem", marginTop: "4px",
    border: "1px solid var(--border,#f1f5f9)",
    display: "flex", flexDirection: "column", gap: "6px",
  },
  commentRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "6px 0", borderBottom: "1px solid var(--bg-tertiary,#f1f5f9)",
    fontSize: "12px", color: "var(--text-secondary,#374151)",
  },

  /* Logs tab */
  logPanel: {
    background: "var(--bg-secondary,#f8fafc)", borderRadius: "16px",
    border: "1.5px solid var(--border,#f1f5f9)",
    boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
    overflow: "hidden",
  },
  logList: { padding: "0.5rem 0" },
  logRow: (typeColor) => ({
    display: "flex", alignItems: "flex-start", gap: "12px",
    padding: "10px 1.25rem",
    borderLeft: `3px solid ${typeColor}`,
    borderBottom: "1px solid var(--border,#f1f5f9)",
    background: "var(--bg-primary,#fff)",
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
  logTimestamp: { fontSize: "11px", color: "var(--text-muted,#94a3b8)", whiteSpace: "nowrap", flexShrink: 0 },
  logActor: { fontSize: "13px", fontWeight: 700, color: "var(--text-primary,#1a3c5e)" },
  logDesc:  { fontSize: "12px", color: "var(--text-secondary,#64748b)" },
  logDetails: { fontSize: "11px", color: "var(--text-muted,#94a3b8)", fontStyle: "italic" },

  refreshBtn: {
    padding: "7px 16px", background: "#eff6ff", color: "#1d4ed8",
    border: "1.5px solid #bfdbfe", borderRadius: "9px",
    fontSize: "12px", fontWeight: 700, cursor: "pointer",
    transition: "background 0.15s",
  },
  logFilterInput: {
    padding: "7px 12px", fontSize: "12px",
    border: "1.5px solid var(--border,#e2e8f0)", borderRadius: "9px",
    color: "var(--text-primary,#1a2e42)", background: "var(--bg-secondary,#f8fafc)",
    fontFamily: "var(--font,'DM Sans',system-ui,sans-serif)",
  },
};

/* ─── Helpers ─── */
function timeAgo(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function getInitials(name) {
  return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : "?";
}
function avatarColor(name) {
  const c = ["#2563eb","#7c3aed","#0891b2","#059669","#dc2626","#d97706"];
  return c[(name?.charCodeAt(0)||0) % c.length];
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="card slide-up" style={{
      padding: "1.25rem 1.5rem",
      borderLeft: `4px solid ${color}`,
      display: "flex", alignItems: "center", gap: "1rem",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "var(--r-md,10px)",
        background: `${color}18`, display: "flex",
        alignItems: "center", justifyContent: "center",
        color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary,#1a3c5e)", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted,#94a3b8)", marginTop: 3 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: color, marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ title, count, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", marginTop: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary,#1a3c5e)" }}>{title}</h2>
        {count !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-full,99px)", background: "var(--bg-tertiary,#f1f5f9)", color: "var(--text-secondary,#64748b)" }}>
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
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
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
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
          <label htmlFor="isAdminCheck" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary,#1a3c5e)", cursor: "pointer" }}>
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
  const [tab, setTab]     = useState("overview");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");

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
      getDocs(collection(db, "conversations")),
    ]).then(([uSnap, pSnap, cSnap]) => {
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPosts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setConvs(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    if (tab === "logs" && logs.length === 0) fetchLogs();
  }, [tab]);

  /* ── Access denied ── */
  if (!profile?.isAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted,#94a3b8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <h3>Access Denied</h3>
          <p>This area is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  /* ── Computed stats (overview) ── */
  const parseLastSeen = (value) => {
    if (!value) return NaN;
    if (typeof value === "number") return value;
    if (value?.seconds && typeof value.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime();
  };
  const isActuallyOnline = (u) => {
    const lastSeenMs = parseLastSeen(u?.lastSeen);
    return !Number.isNaN(lastSeenMs) && Date.now() - lastSeenMs < 5 * 60 * 1000;
  };
  const now          = Date.now();
  const onlineNow    = users.filter(isActuallyOnline).length;
  const verifiedN    = users.filter(u => u.emailVerified).length;
  const adminsN      = users.filter(u => u.isAdmin).length;
  const newThisWeek  = users.filter(u => u.createdAt && (now - new Date(u.createdAt)) < 7*86400*1000).length;
  const totalLikes   = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);

  /* ── Profession distribution ── */
  const professionMap = {};
  users.forEach(u => { if (u.profession) professionMap[u.profession] = (professionMap[u.profession] || 0) + 1; });
  const topProfessions = Object.entries(professionMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── City distribution ── */
  const cityMap = {};
  users.forEach(u => { if (u.city) cityMap[u.city] = (cityMap[u.city] || 0) + 1; });
  const topCities = Object.entries(cityMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── User operations ── */
  const deleteUser = async (id) => {
    if (!window.confirm("Permanently delete this user?")) return;
    try {
      await httpsCallable(functions, "deleteUserAccount")({ uid: id });
      await deleteDoc(doc(db, "users", id));
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) { alert("Error: " + e.message); }
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

  const pinPost = async (id, current) => {
    await updateDoc(doc(db, "posts", id), { isPinned: !current });
    setPosts(prev => prev.map(p => p.id === id ? { ...p, isPinned: !current } : p));
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
    setLogTypeFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  /* ── Filtered users (shared between Users + EditUsers tabs) ── */
  const filteredBySearch = users.filter(u => {
    const s = (searchUser || userSearch).toLowerCase();
    if (!s) return true;
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
    return name.includes(s) || (u.email ?? "").toLowerCase().includes(s) || (u.profession ?? "").toLowerCase().includes(s) || (u.city ?? "").toLowerCase().includes(s);
  });

  /* ── TABS config ── */
  const TABS = [
    { id: "overview",  label: "Overview" },
    { id: "users",     label: `Users (${users.length})` },
    { id: "editUsers", label: "Edit Users" },
    { id: "posts",     label: `Posts (${posts.length})` },
    { id: "logs",      label: "Activity Logs" },
  ];

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div style={S.page}>
      {/* Page header */}
      <div style={S.header}>
        <p style={S.title}>Admin Dashboard</p>
        <p style={S.sub}>Platform management and analytics</p>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {Array.from({length:4}).map((_,i) => <div key={i} className="skeleton card" style={{height:88}} />)}
        </div>
      )}

      {/* ══ OVERVIEW TAB ══ */}
      {!loading && tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label="Total Members"  value={users.length}   color="#2563eb" sub={`+${newThisWeek} this week`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
            <StatCard label="Online Now"     value={onlineNow}      color="#22c55e" sub="Active members"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6"/></svg>} />
            <StatCard label="Verified"       value={verifiedN}      color="#0891b2" sub={`${Math.round(verifiedN/Math.max(users.length,1)*100)}% verified`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>} />
            <StatCard label="Total Posts"    value={posts.length}   color="#8b5cf6" sub={`${totalLikes} likes · ${totalComments} comments`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} />
            <StatCard label="Conversations"  value={convs.length}   color="#f59e0b"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} />
            <StatCard label="Admins"         value={adminsN}        color="#dc2626"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Profession distribution */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#94a3b8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Professions</p>
              {topProfessions.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted,#94a3b8)" }}>No data yet</p>}
              {topProfessions.map(([prof, count]) => (
                <div key={prof} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary,#374151)" }}>{prof}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted,#94a3b8)", fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary,#f1f5f9)", borderRadius: "var(--r-full,99px)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: "var(--brand,#1a3c5e)", borderRadius: "var(--r-full,99px)", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* City distribution */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#94a3b8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Cities</p>
              {topCities.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted,#94a3b8)" }}>No data yet</p>}
              {topCities.map(([city, count]) => (
                <div key={city} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary,#374151)" }}>{city}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted,#94a3b8)", fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary,#f1f5f9)", borderRadius: "var(--r-full,99px)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: "#8b5cf6", borderRadius: "var(--r-full,99px)", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#94a3b8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Recent Members</p>
              {users.slice().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>
                    {getInitials(`${u.firstName} ${u.lastName}`)}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:12,fontWeight:600,color:"var(--text-primary,#1a3c5e)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.firstName} {u.lastName}</p>
                    <p style={{ fontSize:10,color:"var(--text-muted,#94a3b8)" }}>{timeAgo(u.createdAt)}</p>
                  </div>
                  {u.emailVerified && <span className="badge badge-green">✓</span>}
                </div>
              ))}
            </div>

            {/* Top posts */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#94a3b8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Posts</p>
              {posts.slice().sort((a,b)=>(b.likesCount||0)-(a.likesCount||0)).slice(0,4).map(p => (
                <div key={p.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--bg-tertiary,#f1f5f9)" }}>
                  <p style={{ fontSize:12,color:"var(--text-primary,#1a3c5e)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2 }}>
                    {p.text || "(media post)"}
                  </p>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ fontSize:10,color:"var(--text-muted,#94a3b8)",display:"flex",alignItems:"center",gap:2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {p.likesCount||0}
                    </span>
                    <span style={{ fontSize:10,color:"var(--text-muted,#94a3b8)",display:"flex",alignItems:"center",gap:2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {p.commentCount||0}
                    </span>
                    <span style={{ fontSize:10,color:"var(--text-muted,#94a3b8)" }}>by {p.authorName}</span>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <p style={{fontSize:12,color:"var(--text-muted,#94a3b8)"}}>No posts yet</p>}
            </div>
          </div>
        </>
      )}

      {/* ══ USERS TAB ══ */}
      {!loading && tab === "users" && (
        <>
          <SectionHeader
            title="All Members"
            count={filteredBySearch.length}
            action={
              <input
                className="input"
                placeholder="Search by name, email, profession…"
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                style={{ fontSize: 12, width: 240 }}
              />
            }
          />
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary,#f8fafc)" }}>
                  {["Member","Email","Profession","City","Status","Joined","Actions"].map(h => (
                    <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--text-muted,#94a3b8)",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid var(--border,#f1f5f9)",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBySearch.map((u) => (
                  <tr key={u.id}
                    style={{ borderBottom:"1px solid var(--bg-tertiary,#f1f5f9)",transition:"background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f8fafc)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover" }} alt="" />
                          : <div style={{ width:32,height:32,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{getInitials(`${u.firstName} ${u.lastName}`)}</div>
                        }
                        <div>
                          <p style={{ fontSize:13,fontWeight:700,color:"var(--text-primary,#1a3c5e)" }}>{u.firstName} {u.lastName}</p>
                          <p style={{ fontSize:10,color:"var(--text-muted,#94a3b8)" }}>{u.phone||""}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#374151)" }}>{u.email||"—"}</td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#374151)" }}>{u.profession||"—"}</td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#374151)" }}>{u.city||"—"}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                        <span className={`badge ${u.emailVerified ? "badge-green" : "badge-yellow"}`}>
                          {u.emailVerified ? "Verified" : "Pending"}
                        </span>
                        {u.isAdmin && <span className="badge badge-purple">Admin</span>}
                        {isActuallyOnline(u) && <span className="badge badge-green" style={{background:"#f0fdf4"}}>● Online</span>}
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted,#94a3b8)",whiteSpace:"nowrap" }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      {u.id !== user?.uid && (
                        <div style={{ display:"flex",gap:4 }}>
                          <button
                            onClick={() => toggleAdmin(u.id, u.isAdmin)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #c4b5fd",background:"#ede9fe",color:"#6d28d9",cursor:"pointer",whiteSpace:"nowrap" }}
                          >{u.isAdmin ? "Revoke" : "Make Admin"}</button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #fca5a5",background:"#fee2e2",color:"#dc2626",cursor:"pointer" }}
                          >Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBySearch.length === 0 && (
              <div className="empty-state"><p>No members found.</p></div>
            )}
          </div>
        </>
      )}

      {/* ══ EDIT USERS TAB ══ */}
      {!loading && tab === "editUsers" && (
        <div>
          <SectionHeader title="Edit Users" count={users.length} />
          <input
            style={S.searchInput}
            type="text"
            placeholder="Search by name, email, profession…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
          <div style={S.tableWrap}>
            {filteredBySearch.length === 0 ? (
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
                  {filteredBySearch.map(u => (
                    <tr key={u.id} style={S.row}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-primary,#fff)"}
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

      {/* ══ POSTS TAB ══ */}
      {!loading && tab === "posts" && (
        <>
          <SectionHeader title="All Posts" count={posts.length} />
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary,#f8fafc)" }}>
                  {["Author","Content","Media","Comments","Posted","Actions"].map(h => (
                    <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--text-muted,#94a3b8)",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid var(--border,#f1f5f9)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <>
                    <tr key={p.id}
                      style={{ borderBottom:"1px solid var(--bg-tertiary,#f1f5f9)",transition:"background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f8fafc)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:avatarColor(p.authorName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff" }}>
                            {getInitials(p.authorName)}
                          </div>
                          <p style={{ fontSize:12,fontWeight:600,color:"var(--text-primary,#1a3c5e)" }}>{p.authorName}</p>
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px",maxWidth:280 }}>
                        <p style={{ fontSize:12,color:"var(--text-secondary,#374151)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:260 }}>
                          {p.text || <em style={{color:"var(--text-muted,#94a3b8)"}}>Media post</em>}
                        </p>
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        {p.media?.length > 0
                          ? <span style={{ fontSize:"11px",background:"#dbeafe",color:"#1e40af",borderRadius:"99px",padding:"2px 9px",fontWeight:700 }}>{p.media.length} file{p.media.length>1?"s":""}</span>
                          : <span style={{ color:"#cbd5e1" }}>—</span>
                        }
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <button
                          style={{ background:"none",border:"1px solid var(--border,#e2e8f0)",borderRadius:"7px",padding:"4px 10px",fontSize:"11px",fontWeight:700,cursor:"pointer",color:"var(--text-secondary,#64748b)" }}
                          onClick={() => togglePostComments(p.id)}
                        >
                          {expandedPostComments[p.id] ? "Hide" : `Show (${p.commentsCount ?? 0})`}
                        </button>
                      </td>
                      <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted,#94a3b8)",whiteSpace:"nowrap" }}>{timeAgo(p.createdAt)}</td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex",gap:4 }}>
                          <button
                            onClick={() => pinPost(p.id, p.isPinned)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #fde047",background:"#fef9c3",color:"#854d0e",cursor:"pointer" }}
                          >{p.isPinned ? "Unpin" : "Pin"}</button>
                          <button
                            onClick={() => deletePost(p.id)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #fca5a5",background:"#fee2e2",color:"#dc2626",cursor:"pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fecaca"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fee2e2"}
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expandedPostComments[p.id] && (
                      <tr key={`${p.id}-comments`}>
                        <td colSpan={6} style={{ padding:"0 14px 12px 46px",background:"var(--bg-secondary,#f8fafc)" }}>
                          <div style={S.commentsWrap}>
                            {!postCommentsList[p.id] ? (
                              <p style={{ fontSize:"12px",color:"var(--text-muted,#94a3b8)",margin:0 }}>Loading comments…</p>
                            ) : postCommentsList[p.id].length === 0 ? (
                              <p style={{ fontSize:"12px",color:"var(--text-muted,#94a3b8)",margin:0 }}>No comments yet.</p>
                            ) : (
                              postCommentsList[p.id].map(c => (
                                <div key={c.id} style={S.commentRow}>
                                  <div style={{ flex:1 }}>
                                    <span style={{ fontWeight:700,color:"var(--text-primary,#1a3c5e)",marginRight:"8px" }}>{c.authorName}</span>
                                    <span style={{ color:"var(--text-secondary,#374151)" }}>{c.text}</span>
                                    <span style={{ color:"var(--text-muted,#94a3b8)",fontSize:"10px",marginLeft:"8px" }}>{timeAgo(c.createdAt)}</span>
                                  </div>
                                  <button
                                    style={{ ...S.delBtn,padding:"3px 9px",fontSize:"10px" }}
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
            {posts.length === 0 && <div className="empty-state"><p>No posts yet.</p></div>}
          </div>
        </>
      )}

      {/* ══ LOGS TAB ══ */}
      {tab === "logs" && (
        <div>
          <SectionHeader title="Activity Logs" count={filteredLogs.length} action={
            <button style={S.refreshBtn} onClick={fetchLogs}>
              {logsLoading ? "Loading…" : "↻ Refresh"}
            </button>
          } />

          {/* Filter card */}
          <div style={{ background:"var(--bg-primary,#fff)",borderRadius:"16px",padding:"1.25rem",border:"1.5px solid var(--border,#f1f5f9)",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(15,23,42,0.05)",display:"flex",flexDirection:"column",gap:"0.75rem" }}>

            {/* Type filter pills */}
            {allLogTypes.length > 0 && (
              <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
                {allLogTypes.map(type => {
                  const cfg = getLogTypeConfig(type);
                  const active = logTypeFilter.includes(type);
                  return (
                    <button key={type} onClick={() => toggleLogType(type)} style={{
                      padding:"4px 12px",borderRadius:"99px",fontSize:"11px",fontWeight:700,cursor:"pointer",
                      border:`1.5px solid ${active ? cfg.borderColor : "var(--border,#e2e8f0)"}`,
                      background: active ? cfg.bg : "var(--bg-secondary,#f8fafc)",
                      color: active ? cfg.color : "var(--text-muted,#64748b)",
                      transition:"all 0.15s",
                    }}>{cfg.label}</button>
                  );
                })}
                {logTypeFilter.length > 0 && (
                  <button onClick={() => setLogTypeFilter([])} style={{ padding:"4px 12px",borderRadius:"99px",fontSize:"11px",fontWeight:700,cursor:"pointer",border:"1.5px solid var(--border,#e2e8f0)",background:"var(--bg-tertiary,#f1f5f9)",color:"var(--text-muted,#64748b)" }}>
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Actor + Date range */}
            <div style={{ display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center" }}>
              <div>
                <p style={{ ...S.modalLabel,marginBottom:"3px" }}>Actor name</p>
                <input style={{ ...S.logFilterInput,width:"200px" }} type="text" placeholder="Filter by actor…" value={logActorFilter} onChange={e => setLogActorFilter(e.target.value)} />
              </div>
              <div>
                <p style={{ ...S.modalLabel,marginBottom:"3px" }}>From date</p>
                <input style={S.logFilterInput} type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} />
              </div>
              <div>
                <p style={{ ...S.modalLabel,marginBottom:"3px" }}>To date</p>
                <input style={S.logFilterInput} type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} />
              </div>
              {(logActorFilter || logDateFrom || logDateTo) && (
                <button onClick={() => { setLogActorFilter(""); setLogDateFrom(""); setLogDateTo(""); }}
                  style={{ ...S.refreshBtn,background:"var(--bg-tertiary,#f1f5f9)",color:"var(--text-muted,#64748b)",border:"1.5px solid var(--border,#e2e8f0)",marginTop:"18px" }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Log entries */}
          <div style={S.logPanel}>
            {logsLoading && <p style={S.empty}>Loading logs…</p>}
            {!logsLoading && filteredLogs.length === 0 && (
              <p style={S.empty}>{logs.length === 0 ? "No activity logs yet." : "No logs match the current filters."}</p>
            )}
            {!logsLoading && filteredLogs.length > 0 && (
              <div style={S.logList}>
                <div style={{ padding:"10px 1.25rem 6px",background:"var(--bg-primary,#fff)",borderBottom:"1px solid var(--border,#f1f5f9)" }}>
                  <p style={{ fontSize:"12px",color:"var(--text-muted,#94a3b8)",margin:0 }}>
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
                    <div key={log.id} style={S.logRow(cfg.borderColor)}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f8fafc)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-primary,#fff)"}
                    >
                      <span style={S.logBadge(cfg.bg, cfg.color)}>{cfg.label}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap" }}>
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
                      <span style={S.logTimestamp} title={absTime}>{relTime}</span>
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
