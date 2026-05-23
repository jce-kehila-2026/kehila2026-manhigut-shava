import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, getDocs, query, orderBy,
  doc, updateDoc, where, deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const storage = getStorage();

/* ─── Inject styles ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
  * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .post-card {
    animation: fadeSlideUp 0.35s ease both;
  }
  .community-textarea:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3.5px rgba(56,189,248,0.15) !important;
    background: #fff !important;
    outline: none;
  }
  .accept-btn:hover  { background: #dcfce7 !important; }
  .decline-btn:hover { background: #fee2e2 !important; }
  .attach-btn:hover  { border-color: #38bdf8 !important; color: #0ea5e9 !important; }
  .post-btn:hover    { background: #122d47 !important; }
  .delete-link:hover { color: #dc2626 !important; }
  .post-delete-btn:hover { color: #dc2626 !important; background: #fee2e2 !important; border-color: #fca5a5 !important; }
  .post-edit-btn:hover   { color: #0ea5e9 !important; background: #e0f2fe !important; border-color: #7dd3fc !important; }
`;
if (!document.head.querySelector("#community-styles")) {
  styleTag.id = "community-styles";
  document.head.appendChild(styleTag);
}

/* ─── Helpers ─── */
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isBirthdaySoon(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const bday  = new Date(birthdate);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  const diff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 7 ? diff : null;
}

const getInitials = (name) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

/* ─── Shared card style ─── */
const sideCard = {
  background: "#fff",
  borderRadius: "18px",
  padding: "1.5rem",
  border: "1.5px solid #f1f5f9",
  borderLeft: "4px solid #38bdf8",
  boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
  marginBottom: "1.25rem",
};

const sectionLabel = {
  fontSize: "11px", fontWeight: "700", color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.1em",
  margin: "0 0 1.1rem",
};

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts,    setPosts]    = useState([]);
  const [text,     setText]     = useState("");
  const [files,    setFiles]    = useState([]);
  const [posting,  setPosting]  = useState(false);
  const [requests, setRequests] = useState([]);
  const [birthdays,setBirthdays]= useState([]);
  const [profile,  setProfile]  = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText,  setEditText]  = useState("");
  const fileRef = useRef();

  useEffect(() => {
    fetchPosts();
    fetchRequests();
    fetchBirthdays();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;
    const snap = await getDocs(collection(db, "users"));
    const me = snap.docs.find((d) => d.id === user.uid);
    if (me) setProfile(me.data());
  };

  const fetchPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchRequests = async () => {
    if (!user) return;
    const q = query(collection(db, "helpRequests"), where("toUserId", "==", user.uid));
    const snap = await getDocs(q);
    setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchBirthdays = async () => {
    const snap = await getDocs(collection(db, "users"));
    const upcoming = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .map((u) => ({ ...u, daysUntil: isBirthdaySoon(u.birthdate) }))
      .filter((u) => u.daysUntil !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    setBirthdays(upcoming);
  };

  const handlePost = async () => {
    if (!text.trim() && files.length === 0) return;
    setPosting(true);
    try {
      const mediaUrls = [];
      for (const file of files) {
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        mediaUrls.push({ url, type: file.type.startsWith("video") ? "video" : "image" });
      }
      await addDoc(collection(db, "posts"), {
        text, media: mediaUrls,
        authorId: user.uid,
        authorName: profile ? `${profile.firstName} ${profile.lastName}` : user.email,
        createdAt: new Date().toISOString(),
      });
      setText(""); setFiles([]);
      fetchPosts();
    } catch (err) { console.error(err); }
    finally { setPosting(false); }
  };

  const handleSaveEdit = async (postId) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, "posts", postId), { text: editText });
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, text: editText } : p));
    setEditingId(null);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await deleteDoc(doc(db, "posts", postId));
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleRequest = async (reqId, status) => {
    const responderName = profile ? `${profile.firstName} ${profile.lastName}` : user.email;
    await updateDoc(doc(db, "helpRequests", reqId), { status, responderName });
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status, responderName } : r))
    );
  };

  const S = {
    page: { padding: "2rem 2.5rem", boxSizing:"border-box", width:"100%" },
    pageTitle: { fontSize:"22px", fontWeight:"700", color:"#1a3c5e", margin:"0 0 3px" },
    pageSub:   { fontSize:"13px", color:"#94a3b8", margin:"0 0 1.75rem" },
    layout: {
      display:"grid",
      gridTemplateColumns:"260px 1fr 260px",
      gap:"1.5rem",
      alignItems:"start",
    },
    sidebar: { display:"flex", flexDirection:"column" },

    /* requests */
    reqItem: {
      padding:"0.85rem 0",
      borderBottom:"1px solid #f1f5f9",
      display:"flex", flexDirection:"column", gap:"4px",
    },
    reqName:   { fontSize:"13px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    reqSub:    { fontSize:"12px", color:"#64748b", margin:0 },
    reqDetail: { fontSize:"11px", color:"#94a3b8", margin:0 },
    reqActions:{ display:"flex", gap:"6px", marginTop:"6px" },
    acceptBtn: {
      flex:1, padding:"6px 0",
      background:"#f0fdf4", color:"#166534",
      border:"1px solid #bbf7d0", borderRadius:"8px",
      fontSize:"11px", fontWeight:"700", cursor:"pointer",
      transition:"background 0.15s",
    },
    declineBtn: {
      flex:1, padding:"6px 0",
      background:"#fff0f0", color:"#b91c1c",
      border:"1px solid #fca5a5", borderRadius:"8px",
      fontSize:"11px", fontWeight:"700", cursor:"pointer",
      transition:"background 0.15s",
    },
    statusTag: (ok) => ({
      fontSize:"11px", fontWeight:"700",
      color: ok ? "#166534" : "#b91c1c",
      background: ok ? "#f0fdf4" : "#fff0f0",
      border: `1px solid ${ok ? "#bbf7d0" : "#fca5a5"}`,
      borderRadius:"6px", padding:"2px 8px",
      display:"inline-block", marginTop:"4px",
    }),
    deleteLink: {
      background:"none", border:"none",
      color:"#94a3b8", cursor:"pointer",
      fontSize:"11px", padding:0, marginTop:"4px",
      transition:"color 0.15s",
    },
    emptyText: {
      fontSize:"12px", color:"#cbd5e1",
      textAlign:"center", padding:"1rem 0",
    },

    /* birthdays */
    bdayItem: {
      display:"flex", alignItems:"center", gap:"10px",
      padding:"0.65rem 0", borderBottom:"1px solid #f1f5f9",
    },
    bdayAvatar: {
      width:"34px", height:"34px", borderRadius:"50%",
      background:"#fef9c3", color:"#854d0e",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"12px", fontWeight:"700", flexShrink:0,
      border:"1.5px solid #fde047",
    },
    bdayName: { fontSize:"13px", fontWeight:"600", color:"#1a3c5e", margin:0 },
    bdayDate: { fontSize:"11px", color:"#94a3b8", margin:0 },
    todayPill: {
      fontSize:"10px", fontWeight:"700",
      background:"#fef9c3", color:"#854d0e",
      border:"1px solid #fde047",
      borderRadius:"99px", padding:"2px 8px",
    },

    /* feed */
    feed: { display:"flex", flexDirection:"column", gap:"1.25rem" },
    composeCard: {
      background:"#fff",
      borderRadius:"18px",
      padding:"1.5rem",
      border:"1.5px solid #f1f5f9",
      borderLeft:"4px solid #38bdf8",
      boxShadow:"0 4px 16px rgba(15,23,42,0.05)",
      display:"flex", flexDirection:"column", gap:"0.85rem",
    },
    textarea: {
      width:"100%", padding:"11px 14px",
      fontSize:"14px", border:"1.5px solid #e2e8f0",
      borderRadius:"13px", resize:"none",
      fontFamily:"inherit", color:"#1a2e42",
      background:"#f8fafc", minHeight:"82px",
      transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s",
    },
    composeActions: {
      display:"flex", alignItems:"center", justifyContent:"space-between",
    },
    attachBtn: {
      background:"none", border:"1.5px solid #e2e8f0",
      borderRadius:"9px", padding:"8px 14px",
      fontSize:"13px", color:"#64748b",
      cursor:"pointer", fontWeight:"600",
      transition:"border-color 0.2s, color 0.2s",
    },
    postBtn: {
      padding:"9px 22px", background:"#1a3c5e",
      color:"#fff", border:"none",
      borderRadius:"10px", fontSize:"13px", fontWeight:"700",
      cursor:"pointer", transition:"background 0.2s",
    },
    previewRow: { display:"flex", gap:"8px", flexWrap:"wrap" },
    previewThumb: {
      width:"58px", height:"58px", borderRadius:"10px",
      objectFit:"cover", border:"1.5px solid #e2e8f0",
    },
    previewName: {
      fontSize:"11px", color:"#64748b",
      background:"#f1f5f9", borderRadius:"7px",
      padding:"4px 10px", display:"flex", alignItems:"center",
    },
    postCard: {
      background:"#fff",
      borderRadius:"18px",
      padding:"1.5rem",
      border:"1.5px solid #f1f5f9",
      borderLeft:"4px solid #e2e8f0",
      boxShadow:"0 4px 16px rgba(15,23,42,0.04)",
      display:"flex", flexDirection:"column", gap:"0.75rem",
    },
    postHeader: { display:"flex", alignItems:"center", gap:"10px" },
    postAvatar: {
      width:"38px", height:"38px", borderRadius:"50%",
      background:"linear-gradient(135deg,#1a3c5e,#0ea5e9)",
      color:"#fff", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontSize:"13px", fontWeight:"700", flexShrink:0,
    },
    postAuthor: { fontSize:"14px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    postTime:   { fontSize:"11px", color:"#94a3b8", margin:0 },
    postText:   { fontSize:"14px", color:"#374151", lineHeight:"1.65", margin:0 },
    postActions: { marginLeft:"auto", display:"flex", gap:"6px" },
    postEditBtn: {
      background:"none", border:"1px solid #e2e8f0",
      color:"#64748b", cursor:"pointer", fontSize:"11px", fontWeight:"600",
      padding:"4px 10px", borderRadius:"6px",
      transition:"color 0.15s, background 0.15s, border-color 0.15s",
    },
    postDeleteBtn: {
      background:"none", border:"1px solid #e2e8f0",
      color:"#94a3b8", cursor:"pointer", fontSize:"11px", fontWeight:"600",
      padding:"4px 10px", borderRadius:"6px",
      transition:"color 0.15s, background 0.15s, border-color 0.15s",
    },
    editTextarea: {
      width:"100%", padding:"10px 13px", fontSize:"14px",
      border:"1.5px solid #38bdf8", borderRadius:"10px",
      resize:"none", fontFamily:"inherit", color:"#1a2e42",
      background:"#f0f9ff", minHeight:"72px", outline:"none",
    },
    editActions: { display:"flex", gap:"8px", justifyContent:"flex-end" },
    saveBtn: {
      padding:"7px 18px", background:"#1a3c5e", color:"#fff",
      border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:"700",
      cursor:"pointer",
    },
    cancelBtn: {
      padding:"7px 18px", background:"none", color:"#64748b",
      border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px", fontWeight:"600",
      cursor:"pointer",
    },
    postImage:  { width:"100%", maxHeight:"600px", objectFit:"contain", borderRadius:"12px", background:"#f8fafc" },
    postVideo:  { width:"100%", maxHeight:"320px", borderRadius:"12px" },
  };

  return (
    <div style={S.page}>
      <p style={S.pageTitle}>Community</p>
      <p style={S.pageSub}>Posts, requests, and celebrations from your community.</p>

      <div style={S.layout}>
        {/* ── Left: Requests ── */}
        <div style={S.sidebar}>
          <div style={{ ...sideCard, borderLeftColor:"#a78bfa" }}>
            <p style={sectionLabel}>Requests Received</p>
            {requests.length === 0 && <p style={S.emptyText}>No requests yet.</p>}
            {requests.map((r) => (
              <div key={r.id} style={S.reqItem}>
                <p style={S.reqName}>{r.fromUserName}</p>
                <p style={S.reqSub}>{r.fromUserProfession}</p>
                <p style={S.reqDetail}>{r.fromUserEmail}</p>
                {r.fromUserPhone && <p style={S.reqDetail}>{r.fromUserPhone}</p>}
                {!r.status && (
                  <div style={S.reqActions}>
                    <button className="accept-btn"  style={S.acceptBtn}  onClick={() => handleRequest(r.id, "accepted")}>Accept</button>
                    <button className="decline-btn" style={S.declineBtn} onClick={() => handleRequest(r.id, "declined")}>Decline</button>
                  </div>
                )}
                {r.status && (
                  <span style={S.statusTag(r.status === "accepted")}>
                    {r.status === "accepted" ? "Accepted" : "Declined"} by {r.responderName}
                  </span>
                )}
                <button
                  className="delete-link"
                  style={S.deleteLink}
                  onClick={async () => {
                    await deleteDoc(doc(db, "helpRequests", r.id));
                    setRequests((prev) => prev.filter((req) => req.id !== r.id));
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: Feed ── */}
        <div style={S.feed}>
          {/* Compose */}
          <div style={S.composeCard}>
            <textarea
              className="community-textarea"
              style={S.textarea}
              placeholder="Share something with the community…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {files.length > 0 && (
              <div style={S.previewRow}>
                {files.map((f, i) =>
                  f.type.startsWith("image") ? (
                    <img key={i} src={URL.createObjectURL(f)} style={S.previewThumb} alt="" />
                  ) : (
                    <span key={i} style={S.previewName}>{f.name}</span>
                  )
                )}
              </div>
            )}
            <div style={S.composeActions}>
              <button className="attach-btn" style={S.attachBtn} onClick={() => fileRef.current.click()}>
                Attach file
              </button>
              <input
                ref={fileRef} type="file" accept="image/*,video/*" multiple
                style={{ display:"none" }}
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
              <button className="post-btn" style={S.postBtn} onClick={handlePost} disabled={posting}>
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>

          {posts.length === 0 && (
            <p style={{ ...S.emptyText, textAlign:"center" }}>
              No posts yet. Be the first to share something.
            </p>
          )}

          {posts.map((p) => (
            <div key={p.id} className="post-card" style={S.postCard}>
              <div style={S.postHeader}>
                <div style={S.postAvatar}>{getInitials(p.authorName)}</div>
                <div>
                  <p style={S.postAuthor}>{p.authorName}</p>
                  <p style={S.postTime}>{timeAgo(p.createdAt)}</p>
                </div>
                {user && user.uid === p.authorId && (
                  <div style={S.postActions}>
                    <button
                      className="post-edit-btn"
                      style={S.postEditBtn}
                      onClick={() => { setEditingId(p.id); setEditText(p.text || ""); }}
                    >
                      Edit
                    </button>
                    <button
                      className="post-delete-btn"
                      style={S.postDeleteBtn}
                      onClick={() => handleDeletePost(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {editingId === p.id ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  <textarea
                    style={S.editTextarea}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                  />
                  <div style={S.editActions}>
                    <button style={S.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
                    <button style={S.saveBtn} onClick={() => handleSaveEdit(p.id)}>Save</button>
                  </div>
                </div>
              ) : (
                p.text && <p style={S.postText}>{p.text}</p>
              )}
              {p.media?.map((m, i) =>
                m.type === "image"
                  ? <img  key={i} src={m.url} style={S.postImage} alt="" />
                  : <video key={i} src={m.url} style={S.postVideo} controls />
              )}
            </div>
          ))}
        </div>

        {/* ── Right: Birthdays ── */}
        <div style={S.sidebar}>
          <div style={{ ...sideCard, borderLeftColor:"#fde047" }}>
            <p style={sectionLabel}>Upcoming Birthdays</p>
            {birthdays.length === 0 && <p style={S.emptyText}>No upcoming birthdays.</p>}
            {birthdays.map((u) => (
              <div key={u.id} style={S.bdayItem}>
                <div style={S.bdayAvatar}>
                  {getInitials(`${u.firstName} ${u.lastName}`)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={S.bdayName}>{u.firstName} {u.lastName}</p>
                  <p style={S.bdayDate}>
                    {u.daysUntil === 0 ? "Today" : `In ${u.daysUntil} day${u.daysUntil > 1 ? "s" : ""}`}
                  </p>
                </div>
                {u.daysUntil === 0 && <span style={S.todayPill}>Today</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}