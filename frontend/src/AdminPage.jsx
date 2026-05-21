import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const s = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    color: "#e2e8f0",
  },
  sidebar: {
    width: "240px",
    background: "#1e293b",
    padding: "1.5rem 0",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #334155",
    position: "sticky",
    top: 0,
    height: "100vh",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  sidebarLogo: {
    padding: "0 1.5rem 1.5rem",
    borderBottom: "1px solid #334155",
    marginBottom: "0.5rem",
  },
  logoTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#ffffff",
    margin: "0 0 2px",
  },
  logoSub: {
    fontSize: "11px",
    color: "#64748b",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "600",
  },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 1.5rem",
    fontSize: "13px",
    fontWeight: active ? "600" : "400",
    color: active ? "#ffffff" : "#94a3b8",
    background: active ? "rgba(99,102,241,0.15)" : "transparent",
    borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
  }),
  logoutBtn: {
    padding: "10px 1.5rem",
    fontSize: "13px",
    color: "#ef4444",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    fontWeight: "500",
  },
  memberViewBtn: {
    margin: "0 1rem 0.75rem",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#a5b4fc",
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.18s",
    width: "calc(100% - 2rem)",
  },
  content: {
    flex: 1,
    padding: "2rem",
    overflowY: "auto",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#ffffff",
    margin: "0 0 4px",
  },
  pageSub: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0 0 2rem",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statCard: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "1.25rem",
    border: "1px solid #334155",
  },
  statNum: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#ffffff",
    display: "block",
  },
  statLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: "4px",
  },
  statIcon: {
    fontSize: "20px",
    marginBottom: "8px",
    display: "block",
  },
  card: {
    background: "#1e293b",
    borderRadius: "14px",
    border: "1px solid #334155",
    marginBottom: "1.5rem",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#ffffff",
    margin: 0,
  },
  searchInput: {
    padding: "7px 12px",
    fontSize: "13px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#e2e8f0",
    outline: "none",
    width: "240px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "10px 16px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: "left",
    borderBottom: "1px solid #334155",
    background: "#0f172a",
  },
  td: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#cbd5e1",
    borderBottom: "1px solid #1e293b",
  },
  roleBadge: (role) => ({
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "20px",
    background:
      role === "admin" ? "rgba(239,68,68,0.15)" :
      role === "manager" ? "rgba(245,158,11,0.15)" :
      "rgba(100,116,139,0.15)",
    color:
      role === "admin" ? "#ef4444" :
      role === "manager" ? "#f59e0b" :
      "#64748b",
    display: "inline-block",
  }),
  actionBtn: (color) => ({
    padding: "5px 12px",
    fontSize: "11px",
    fontWeight: "600",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    marginRight: "4px",
    background:
      color === "red" ? "rgba(239,68,68,0.15)" :
      color === "blue" ? "rgba(99,102,241,0.15)" :
      color === "green" ? "rgba(34,197,94,0.15)" :
      "rgba(100,116,139,0.15)",
    color:
      color === "red" ? "#ef4444" :
      color === "blue" ? "#818cf8" :
      color === "green" ? "#22c55e" :
      "#94a3b8",
  }),
  postCard: {
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  postAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#6366f1",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
  },
  postContent: {
    flex: 1,
  },
  postAuthor: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
    margin: "0 0 2px",
  },
  postTime: {
    fontSize: "11px",
    color: "#64748b",
    margin: "0 0 6px",
  },
  postText: {
    fontSize: "13px",
    color: "#cbd5e1",
    margin: 0,
    lineHeight: "1.6",
  },
  empty: {
    padding: "3rem",
    textAlign: "center",
    color: "#475569",
    fontSize: "13px",
  },
  requestRow: {
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reqInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  reqName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  reqDetail: {
    fontSize: "11px",
    color: "#64748b",
  },
  statusBadge: (status) => ({
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "20px",
    background:
      status === "accepted" ? "rgba(34,197,94,0.15)" :
      status === "declined" ? "rgba(239,68,68,0.15)" :
      "rgba(245,158,11,0.15)",
    color:
      status === "accepted" ? "#22c55e" :
      status === "declined" ? "#ef4444" :
      "#f59e0b",
  }),
};

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

/* ───── Dashboard Tab ───── */
function DashboardTab({ users, posts, requests }) {
  const pending = requests.filter((r) => !r.status).length;
  const accepted = requests.filter((r) => r.status === "accepted").length;

  return (
    <>
      <p style={s.pageTitle}>Dashboard</p>
      <p style={s.pageSub}>Overview of your community platform.</p>
      <div style={s.statsGrid}>
        {[
          { icon: "👥", num: users.length, label: "Total Members" },
          { icon: "📝", num: posts.length, label: "Total Posts" },
          { icon: "📬", num: requests.length, label: "Help Requests" },
          { icon: "⏳", num: pending, label: "Pending Requests" },
          { icon: "✅", num: accepted, label: "Accepted Requests" },
          { icon: "🛡️", num: users.filter((u) => u.role === "admin" || u.role === "manager").length, label: "Admins / Managers" },
        ].map((st) => (
          <div key={st.label} style={s.statCard}>
            <span style={s.statIcon}>{st.icon}</span>
            <span style={s.statNum}>{st.num}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───── Users Tab ───── */
function UsersTab({ users, onRoleChange, onDelete }) {
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    return name.includes(term) || (u.email || "").toLowerCase().includes(term) || (u.profession || "").toLowerCase().includes(term);
  });

  return (
    <>
      <p style={s.pageTitle}>Users</p>
      <p style={s.pageSub}>Manage all registered community members.</p>
      <div style={s.card}>
        <div style={s.cardHeader}>
          <p style={s.cardTitle}>{users.length} Members</p>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Search by name, email, profession..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Phone</th>
                <th style={s.th}>Profession</th>
                <th style={s.th}>City</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Joined</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ background: "transparent" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={s.td}>{u.firstName} {u.lastName}</td>
                  <td style={s.td}>{u.email || "—"}</td>
                  <td style={s.td}>{u.phone || "—"}</td>
                  <td style={s.td}>{u.profession || "—"}</td>
                  <td style={s.td}>{u.city || "—"}</td>
                  <td style={s.td}>
                    <span style={s.roleBadge(u.role || "member")}>
                      {u.role || "member"}
                    </span>
                  </td>
                  <td style={s.td}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                  <td style={s.td}>
                    <select
                      value={u.role || "member"}
                      onChange={(e) => onRoleChange(u.id, e.target.value)}
                      style={{
                        background: "#0f172a",
                        color: "#e2e8f0",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        marginRight: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button style={s.actionBtn("red")} onClick={() => onDelete(u.id, `${u.firstName} ${u.lastName}`)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p style={s.empty}>No users found.</p>}
      </div>
    </>
  );
}

/* ───── Posts Tab ───── */
function PostsTab({ posts, onDeletePost }) {
  return (
    <>
      <p style={s.pageTitle}>Posts</p>
      <p style={s.pageSub}>Moderate community posts.</p>
      <div style={s.card}>
        <div style={s.cardHeader}>
          <p style={s.cardTitle}>{posts.length} Posts</p>
        </div>
        {posts.length === 0 && <p style={s.empty}>No posts yet.</p>}
        {posts.map((p) => (
          <div key={p.id} style={s.postCard}>
            <div style={s.postAvatar}>{getInitials(p.authorName)}</div>
            <div style={s.postContent}>
              <p style={s.postAuthor}>{p.authorName || "Unknown"}</p>
              <p style={s.postTime}>{timeAgo(p.createdAt)}</p>
              <p style={s.postText}>{p.text || "(media only)"}</p>
              {p.media?.length > 0 && (
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  📎 {p.media.length} attachment{p.media.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button style={s.actionBtn("red")} onClick={() => onDeletePost(p.id)}>
              🗑 Delete
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───── Requests Tab ───── */
function RequestsTab({ requests, onDeleteRequest }) {
  return (
    <>
      <p style={s.pageTitle}>Help Requests</p>
      <p style={s.pageSub}>Monitor all help requests between members.</p>
      <div style={s.card}>
        <div style={s.cardHeader}>
          <p style={s.cardTitle}>{requests.length} Requests</p>
        </div>
        {requests.length === 0 && <p style={s.empty}>No requests yet.</p>}
        {requests.map((r) => (
          <div key={r.id} style={s.requestRow}>
            <div style={s.reqInfo}>
              <span style={s.reqName}>{r.fromUserName || "Unknown"} → {r.toUserName || "Unknown"}</span>
              <span style={s.reqDetail}>{r.fromUserProfession || "—"} • {timeAgo(r.createdAt)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={s.statusBadge(r.status || "pending")}>
                {r.status === "accepted" ? "✓ Accepted" : r.status === "declined" ? "✕ Declined" : "⏳ Pending"}
              </span>
              <button style={s.actionBtn("red")} onClick={() => onDeleteRequest(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───── Main Admin Page ───── */
export default function AdminPage({ onViewAsMember }) {
  const { user, logout, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [usersSnap, postsSnap, reqSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "helpRequests")),
      ]);
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRequests(reqSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole === "member" ? null : newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole === "member" ? null : newRole } : u)));
    } catch (err) {
      console.error("Role change error:", err);
      alert("Failed to update role.");
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Delete user error:", err);
      alert("Failed to delete user.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Delete post error:", err);
      alert("Failed to delete post.");
    }
  };

  const handleDeleteRequest = async (reqId) => {
    if (!window.confirm("Delete this request?")) return;
    try {
      await deleteDoc(doc(db, "helpRequests", reqId));
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (err) {
      console.error("Delete request error:", err);
      alert("Failed to delete request.");
    }
  };

  const adminName = profile ? `${profile.firstName} ${profile.lastName}` : user?.email || "";

  const TABS = [
    { key: "dashboard", icon: "📊", label: "Dashboard" },
    { key: "users", icon: "👥", label: "Users" },
    { key: "posts", icon: "📝", label: "Posts" },
    { key: "requests", icon: "📬", label: "Requests" },
  ];

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <p style={s.logoTitle}>Manhigut Shava</p>
          <p style={s.logoSub}>Admin Panel</p>
        </div>

        {TABS.map((tab) => (
          <button
            key={tab.key}
            style={s.navItem(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
            onMouseOver={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = "#ffffff"; }}
            onMouseOut={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = "#94a3b8"; }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}

        <div style={{ padding: "1rem 1.5rem", marginTop: "auto", borderTop: "1px solid #334155" }}>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px" }}>Signed in as</p>
          <p style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: "600", margin: "0 0 12px" }}>{adminName}</p>

          {/* Switch to Member View */}
          {onViewAsMember && (
            <button
              style={s.memberViewBtn}
              onClick={onViewAsMember}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.22)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.55)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
              }}
            >
              <span>👤</span> Switch to Member View
            </button>
          )}

          <button style={s.logoutBtn} onClick={logout}>
            ← Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.content}>
        {loadingData ? (
          <div style={s.empty}>Loading data…</div>
        ) : (
          <>
            {activeTab === "dashboard" && <DashboardTab users={users} posts={posts} requests={requests} />}
            {activeTab === "users" && <UsersTab users={users} onRoleChange={handleRoleChange} onDelete={handleDeleteUser} />}
            {activeTab === "posts" && <PostsTab posts={posts} onDeletePost={handleDeletePost} />}
            {activeTab === "requests" && <RequestsTab requests={requests} onDeleteRequest={handleDeleteRequest} />}
          </>
        )}
      </main>
    </div>
  );
}
