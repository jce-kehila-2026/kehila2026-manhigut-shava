import { useState, useEffect } from "react";
import {
  collection, getDocs, deleteDoc, doc, query,
  orderBy, updateDoc, where, onSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { useAuth } from "./AuthContext";

/* ── Helpers ── */
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
        width: 44, height: 44, borderRadius: "var(--r-md)",
        background: `${color}18`, display: "flex",
        alignItems: "center", justifyContent: "center",
        color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginTop: 3 }}>{label}</p>
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
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
        {count !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-full)", background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [tab, setTab]     = useState("overview");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");

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

  if (!profile?.isAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <h3>Access Denied</h3>
          <p>This area is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  /* ── Computed stats ── */
  const now = Date.now();
  const onlineNow   = users.filter(u => u.isOnline).length;
  const verifiedN   = users.filter(u => u.emailVerified).length;
  const adminsN     = users.filter(u => u.isAdmin).length;
  const newThisWeek = users.filter(u => u.createdAt && (now - new Date(u.createdAt)) < 7*86400*1000).length;
  const totalLikes  = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);

  /* ── Profession distribution ── */
  const professionMap = {};
  users.forEach(u => {
    if (u.profession) professionMap[u.profession] = (professionMap[u.profession] || 0) + 1;
  });
  const topProfessions = Object.entries(professionMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── City distribution ── */
  const cityMap = {};
  users.forEach(u => {
    if (u.city) cityMap[u.city] = (cityMap[u.city] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── User actions ── */
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

  const deletePost = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", id));
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const pinPost = async (id, current) => {
    await updateDoc(doc(db, "posts", id), { isPinned: !current });
    setPosts(prev => prev.map(p => p.id === id ? { ...p, isPinned: !current } : p));
  };

  const filteredUsers = users.filter(u => {
    if (!searchUser) return true;
    const s = searchUser.toLowerCase();
    return `${u.firstName} ${u.lastName} ${u.email} ${u.profession} ${u.city}`.toLowerCase().includes(s);
  });

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "users",    label: `Users (${users.length})` },
    { id: "posts",    label: `Posts (${posts.length})` },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "1.75rem 2rem", fontFamily: "var(--font)" }}>
      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 3 }}>Admin Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Platform management and analytics</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "var(--bg-tertiary)", borderRadius: "var(--r-md)", padding: 4, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 16px", borderRadius: "var(--r-sm)", border: "none",
            background: tab === t.id ? "var(--bg-primary)" : "transparent",
            color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer",
            boxShadow: tab === t.id ? "var(--shadow-xs)" : "none",
            transition: "all var(--t-fast)",
          }}>{t.label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {Array.from({length:4}).map((_,i) => <div key={i} className="skeleton card" style={{height:88}} />)}
        </div>
      )}

      {/* ── Overview tab ── */}
      {!loading && tab === "overview" && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label="Total Members"   value={users.length}    color="#2563eb" sub={`+${newThisWeek} this week`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
            <StatCard label="Online Now"      value={onlineNow}       color="#22c55e" sub="Active members"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6"/></svg>} />
            <StatCard label="Verified"        value={verifiedN}       color="#0891b2" sub={`${Math.round(verifiedN/Math.max(users.length,1)*100)}% verified`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>} />
            <StatCard label="Total Posts"     value={posts.length}    color="#8b5cf6" sub={`${totalLikes} likes · ${totalComments} comments`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} />
            <StatCard label="Conversations"   value={convs.length}    color="#f59e0b"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} />
            <StatCard label="Admins"          value={adminsN}         color="#dc2626"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
          </div>

          {/* Distribution charts (text-based) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Profession distribution */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Professions</p>
              {topProfessions.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No data yet</p>}
              {topProfessions.map(([prof, count]) => (
                <div key={prof} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{prof}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: "var(--brand)", borderRadius: "var(--r-full)", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* City distribution */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Cities</p>
              {topCities.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No data yet</p>}
              {topCities.map(([city, count]) => (
                <div key={city} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{city}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: "#8b5cf6", borderRadius: "var(--r-full)", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Recent Members</p>
              {users.slice().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(`${u.firstName} ${u.lastName}`), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>
                    {getInitials(`${u.firstName} ${u.lastName}`)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.firstName} {u.lastName}</p>
                    <p style={{ fontSize:10, color:"var(--text-muted)" }}>{timeAgo(u.createdAt)}</p>
                  </div>
                  {u.emailVerified && <span className="badge badge-green">✓</span>}
                </div>
              ))}
            </div>

            {/* Top posts */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Posts</p>
              {posts.slice().sort((a,b)=>(b.likesCount||0)-(a.likesCount||0)).slice(0,4).map(p => (
                <div key={p.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--bg-tertiary)" }}>
                  <p style={{ fontSize:12, color:"var(--text-primary)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>
                    {p.text || "(media post)"}
                  </p>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ fontSize:10, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {p.likesCount||0}
                    </span>
                    <span style={{ fontSize:10, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {p.commentCount||0}
                    </span>
                    <span style={{ fontSize:10, color:"var(--text-muted)" }}>by {p.authorName}</span>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <p style={{fontSize:12,color:"var(--text-muted)"}}>No posts yet</p>}
            </div>
          </div>
        </>
      )}

      {/* ── Users tab ── */}
      {!loading && tab === "users" && (
        <>
          <SectionHeader
            title="All Members"
            count={filteredUsers.length}
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
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {["Member","Email","Profession","City","Status","Joined","Actions"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}
                    style={{ borderBottom: "1px solid var(--bg-tertiary)", transition: "background var(--t-fast)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover" }} alt="" />
                          : <div style={{ width:32,height:32,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{getInitials(`${u.firstName} ${u.lastName}`)}</div>
                        }
                        <div>
                          <p style={{ fontSize:13,fontWeight:700,color:"var(--text-primary)" }}>{u.firstName} {u.lastName}</p>
                          <p style={{ fontSize:10,color:"var(--text-muted)" }}>{u.phone||""}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary)" }}>{u.email||"—"}</td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary)" }}>{u.profession||"—"}</td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary)" }}>{u.city||"—"}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        <span className={`badge ${u.emailVerified ? "badge-green" : "badge-yellow"}`}>
                          {u.emailVerified ? "Verified" : "Pending"}
                        </span>
                        {u.isAdmin && <span className="badge badge-purple">Admin</span>}
                        {u.isOnline && <span className="badge badge-green" style={{background:"#f0fdf4"}}>● Online</span>}
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap" }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      {u.id !== user?.uid && (
                        <div style={{ display:"flex", gap:4 }}>
                          <button
                            onClick={() => toggleAdmin(u.id, u.isAdmin)}
                            style={{ padding:"4px 10px", borderRadius:"var(--r-sm)", fontSize:11, fontWeight:600, border:"1px solid #c4b5fd", background:"#ede9fe", color:"#6d28d9", cursor:"pointer", transition:"all var(--t-fast)", whiteSpace:"nowrap" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#ddd6fe"}
                            onMouseLeave={e => e.currentTarget.style.background = "#ede9fe"}
                          >{u.isAdmin ? "Revoke" : "Make Admin"}</button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            style={{ padding:"4px 10px", borderRadius:"var(--r-sm)", fontSize:11, fontWeight:600, border:"1px solid #fca5a5", background:"#fee2e2", color:"#dc2626", cursor:"pointer", transition:"all var(--t-fast)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fecaca"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fee2e2"}
                          >Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="empty-state"><p>No members found.</p></div>
            )}
          </div>
        </>
      )}

      {/* ── Posts tab ── */}
      {!loading && tab === "posts" && (
        <>
          <SectionHeader title="All Posts" count={posts.length} />
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {["Author","Content","Engagement","Posted","Actions"].map(h => (
                    <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id}
                    style={{ borderBottom:"1px solid var(--bg-tertiary)",transition:"background var(--t-fast)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding:"11px 14px",fontSize:12,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap" }}>{p.authorName}</td>
                    <td style={{ padding:"11px 14px",maxWidth:320 }}>
                      <p style={{ fontSize:12,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:300 }}>
                        {p.text || <em style={{color:"var(--text-muted)"}}>Media post</em>}
                      </p>
                      {p.media?.length > 0 && (
                        <span style={{ fontSize:10,background:"var(--brand-pale)",color:"var(--brand-dark)",borderRadius:"var(--r-full)",padding:"1px 7px",fontWeight:700,marginTop:3,display:"inline-block" }}>
                          {p.media.length} media
                        </span>
                      )}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", gap:8 }}>
                        <span style={{ fontSize:11,color:"var(--text-secondary)",display:"flex",alignItems:"center",gap:3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {p.likesCount||0}
                        </span>
                        <span style={{ fontSize:11,color:"var(--text-secondary)",display:"flex",alignItems:"center",gap:3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {p.commentCount||0}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap" }}>{timeAgo(p.createdAt)}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", gap:4 }}>
                        <button
                          onClick={() => pinPost(p.id, p.isPinned)}
                          style={{ padding:"4px 10px",borderRadius:"var(--r-sm)",fontSize:11,fontWeight:600,border:"1px solid #fde047",background:"#fef9c3",color:"#854d0e",cursor:"pointer",transition:"all var(--t-fast)" }}
                        >{p.isPinned ? "Unpin" : "Pin"}</button>
                        <button
                          onClick={() => deletePost(p.id)}
                          style={{ padding:"4px 10px",borderRadius:"var(--r-sm)",fontSize:11,fontWeight:600,border:"1px solid #fca5a5",background:"#fee2e2",color:"#dc2626",cursor:"pointer",transition:"all var(--t-fast)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fecaca"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fee2e2"}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {posts.length === 0 && <div className="empty-state"><p>No posts yet.</p></div>}
          </div>
        </>
      )}
    </div>
  );
}
