import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, getDocs, query, orderBy,
  doc, updateDoc, where, deleteDoc, getDoc,
  arrayUnion, arrayRemove,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import ConnectButton from "./ConnectButton";
import { logActivity } from "./activityLogger";

const storage = getStorage();

/* ─── Inject styles ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
  * { font-family: 'DM Sans', system-ui, sans-serif; box-sizing: border-box; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .post-card { animation: fadeSlideUp 0.35s ease both; }
  .community-textarea:focus, .comment-input:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15) !important;
    outline: none;
  }
  .attach-btn:hover  { border-color: #38bdf8 !important; color: #0ea5e9 !important; }
  .post-btn:hover    { background: #122d47 !important; }
  .delete-link:hover { color: #dc2626 !important; }
  .post-author-click:hover { text-decoration: underline; }
  .post-delete-btn:hover { color: #dc2626 !important; background: #fee2e2 !important; border-color: #fca5a5 !important; }
  .post-edit-btn:hover   { color: #0ea5e9 !important; background: #e0f2fe !important; border-color: #7dd3fc !important; }
  .social-btn { transition: background 0.15s; }
  .social-btn:hover { background: rgba(99,115,129,0.08) !important; }
  .social-btn-liked { color: #1d4ed8 !important; background: #eff6ff !important; }
  .social-btn-liked:hover { background: #dbeafe !important; }
  .send-comment-btn:hover { background: #0284c7 !important; }
  .repost-author-link:hover { text-decoration: underline; cursor: pointer; }
  .comment-action-btn:hover { color: #374151 !important; }
`;
if (!document.head.querySelector("#community-styles")) {
  styleTag.id = "community-styles";
  document.head.appendChild(styleTag);
}

/* ─── Helpers ─── */
function timeAgo(ts, t) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)    return t.common?.justNow    ?? "just now";
  if (diff < 3600)  return t.common?.minutesAgo ? t.common.minutesAgo(Math.floor(diff / 60))   : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return t.common?.hoursAgo   ? t.common.hoursAgo(Math.floor(diff / 3600))   : `${Math.floor(diff / 3600)}h ago`;
  return t.common?.daysAgo ? t.common.daysAgo(Math.floor(diff / 86400)) : `${Math.floor(diff / 86400)}d ago`;
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

/* ─── Avatar ─── */
function Avatar({ photoURL, name, size = 38, fontSize = 13, style = {} }) {
  const base = {
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg,#1a3c5e,#0ea5e9)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize, fontWeight: "700", flexShrink: 0, overflow: "hidden", ...style,
  };
  if (photoURL)
    return <div style={base}><img src={photoURL} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  return <div style={base}>{getInitials(name)}</div>;
}

/* ─── Author profile modal ─── */
function AuthorModal({ authorId, authorName, onClose, t, T }) {
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    if (!authorId) return;
    getDoc(doc(db, "users", authorId)).then((snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
  }, [authorId]);

  const name = userData
    ? (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : authorName)
    : authorName;

  const infoRow = (label, val) => val ? (
    <div>
      <p style={{ fontSize: "10px", fontWeight: "700", color: T.muted, textTransform: "uppercase", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: "13px", color: T.sub, margin: 0 }}>{val}</p>
    </div>
  ) : null;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem",backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div style={{ background:T.card,borderRadius:"22px",padding:"2rem",width:"100%",maxWidth:"400px",boxShadow:"0 16px 48px rgba(15,23,42,0.18)",display:"flex",flexDirection:"column",gap:"1.1rem",animation:"modalPop 0.26s cubic-bezier(.34,1.56,.64,1) both" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <p style={{ fontSize:"16px",fontWeight:"700",color:T.text,margin:0 }}>{t.community.authorProfile}</p>
          <button style={{ background:T.tagBg,border:"none",borderRadius:"9px",padding:"6px 12px",cursor:"pointer",fontSize:"13px",fontWeight:"600",color:T.sub }} onClick={onClose}>{t.community.close}</button>
        </div>
        <Avatar photoURL={userData?.photoURL} name={name} size={72} fontSize={22} style={{ margin:"0 auto" }} />
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:"18px",fontWeight:"700",color:T.text,margin:"0 0 4px" }}>{name}</p>
          {userData?.profession && <p style={{ fontSize:"13px",color:T.sub,margin:"0 0 6px" }}>{userData.profession}</p>}
          {(userData?.networksCount ?? 0) > 0 && (
            <span style={{ fontSize:"12px",fontWeight:"700",color:"#1d4ed8",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"99px",padding:"3px 12px",display:"inline-block" }}>
              {userData.networksCount} {t.network?.networkCount ?? "connections"}
            </span>
          )}
        </div>
        {userData && (
          <div style={{ background:T.inputBg,borderRadius:"13px",padding:"1rem 1.25rem",border:`1.5px solid ${T.cardBorder}`,display:"flex",flexDirection:"column",gap:"10px" }}>
            {infoRow(t.support?.city,  userData.city)}
            {infoRow(t.support?.bio,   userData.bio)}
            {infoRow(t.support?.phone, userData.phone)}
          </div>
        )}
        <ConnectButton targetUserId={authorId} size="full" />
      </div>
    </div>
  );
}

/* ─── Repost modal ─── */
function RepostModal({ originalPost, onClose, onRepost, t, T }) {
  const [addedText, setAddedText] = useState("");
  const [posting,   setPosting]   = useState(false);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem",backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div style={{ background:T.card,borderRadius:"22px",padding:"2rem",width:"100%",maxWidth:"500px",boxShadow:"0 16px 48px rgba(15,23,42,0.18)",display:"flex",flexDirection:"column",gap:"1rem",animation:"modalPop 0.26s cubic-bezier(.34,1.56,.64,1) both",maxHeight:"90vh",overflowY:"auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <p style={{ fontSize:"16px",fontWeight:"700",color:T.text,margin:0 }}>&#8635; {t.community.repost}</p>
          <button style={{ background:T.tagBg,border:"none",borderRadius:"9px",padding:"6px 12px",cursor:"pointer",fontSize:"13px",fontWeight:"600",color:T.sub }} onClick={onClose}>{t.community.close}</button>
        </div>
        <textarea
          style={{ width:"100%",padding:"11px 14px",fontSize:"14px",border:`1.5px solid ${T.inputBorder}`,borderRadius:"13px",resize:"none",fontFamily:"inherit",color:T.text,background:T.inputBg,minHeight:"80px" }}
          placeholder={t.community.addThoughtsPlaceholder ?? "Add your thoughts…"}
          value={addedText}
          onChange={e => setAddedText(e.target.value)}
          className="community-textarea"
        />
        {/* Embedded original */}
        <div style={{ background:T.inputBg,borderRadius:"13px",padding:"1rem 1.25rem",border:`1.5px solid ${T.cardBorder}`,borderLeft:`3px solid #38bdf8` }}>
          <p style={{ fontSize:"10px",fontWeight:"700",color:T.muted,textTransform:"uppercase",margin:"0 0 8px",letterSpacing:"0.08em" }}>{t.community.originalPost}</p>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px" }}>
            <Avatar photoURL={originalPost.authorPhotoURL} name={originalPost.authorName} size={28} fontSize={10} />
            <p style={{ fontSize:"13px",fontWeight:"700",color:T.text,margin:0 }}>{originalPost.authorName}</p>
          </div>
          {originalPost.text && <p style={{ fontSize:"13px",color:T.sub,lineHeight:"1.6",margin:0 }}>{originalPost.text}</p>}
          {originalPost.media?.[0] && (
            <img src={originalPost.media[0].url} style={{ width:"100%",maxHeight:"160px",objectFit:"cover",borderRadius:"8px",marginTop:"8px" }} alt="" />
          )}
        </div>
        <button
          style={{ padding:"12px",background:posting?"#64748b":"#1a3c5e",color:"#fff",border:"none",borderRadius:"12px",fontSize:"14px",fontWeight:"700",cursor:posting?"default":"pointer",transition:"background 0.2s" }}
          disabled={posting}
          onClick={async () => {
            setPosting(true);
            await onRepost(originalPost, addedText);
            setPosting(false);
            onClose();
          }}
        >
          {posting ? "…" : `&#8635; ${t.community.repost}`}
        </button>
      </div>
    </div>
  );
}

/* ─── Shared sidebar card style (theme-aware) ─── */
const sectionLabel = {
  fontSize: "11px", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 1.1rem",
  color: "#94a3b8",
};

/* ══════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════ */
export default function CommunityPage() {
  const { user, profile: authProfile } = useAuth();
  const { t, isRTL } = useLang();
  const { T, dark } = useTheme();

  /* ── Core state ── */
  const [posts,     setPosts]     = useState([]);
  const [text,      setText]      = useState("");
  const [files,     setFiles]     = useState([]); // File[]
  const [posting,   setPosting]   = useState(false);
  const [birthdays, setBirthdays] = useState([]);
  const fileRef = useRef();

  /* ── Modal state ── */
  const [viewAuthor,    setViewAuthor]    = useState(null); // { authorId, authorName }
  const [repostTarget,  setRepostTarget]  = useState(null); // post to repost

  /* ── Edit state (posts) ── */
  const [editingId, setEditingId] = useState(null);
  const [editText,  setEditText]  = useState("");

  /* ── Comments state ── */
  const [expandedComments, setExpandedComments] = useState({});
  const [postComments,     setPostComments]     = useState({});
  const [commentText,      setCommentText]      = useState({});
  const [sendingComment,   setSendingComment]   = useState({});

  /* ── Comment inline edit state ── */
  const [editingCommentId,   setEditingCommentId]   = useState(null); // commentId being edited
  const [editingCommentText, setEditingCommentText] = useState("");

  /* ── My name ── */
  const myName =
    authProfile?.firstName && authProfile?.lastName
      ? `${authProfile.firstName} ${authProfile.lastName}`
      : user?.email ?? "";

  /* ── Initial fetch ── */
  useEffect(() => {
    fetchPosts();
    fetchBirthdays();
  }, []);

  const fetchPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchBirthdays = async () => {
    const snap = await getDocs(collection(db, "users"));
    const upcoming = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .map((u) => ({ ...u, daysUntil: isBirthdaySoon(u.birthdate ?? u.birthDate) }))
      .filter((u) => u.daysUntil !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    setBirthdays(upcoming);
  };

  /* ── File input: add up to 5, per-file delete ── */
  const handleFileAdd = (e) => {
    const incoming = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...incoming].slice(0, 5));
    e.target.value = ""; // allow re-selecting same file
  };
  const handleFileRemove = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  /* ── Post ── */
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
      const docRef = await addDoc(collection(db, "posts"), {
        text, media: mediaUrls,
        authorId: user.uid, authorName: myName,
        authorPhotoURL: authProfile?.photoURL ?? null,
        createdAt: new Date().toISOString(),
        likesCount: 0, likedBy: [], commentsCount: 0,
      });
      logActivity({ type: "post", actorId: user.uid, actorName: myName, targetId: docRef.id, targetType: "post", details: { text: text?.slice(0, 150) } });
      setText(""); setFiles([]);
      fetchPosts();
    } catch (err) { console.error("Post error:", err); }
    finally { setPosting(false); }
  };

  /* ── Edit post ── */
  const handleSaveEdit = async (postId) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, "posts", postId), { text: editText });
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, text: editText } : p));
    setEditingId(null);
  };

  /* ── Delete post ── */
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", postId));
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  /* ── Like toggle ── */
  const handleLike = async (post) => {
    if (!user) return;
    const isLiked = post.likedBy?.includes(user.uid);
    const newCount = Math.max(0, (post.likesCount ?? 0) + (isLiked ? -1 : 1));
    try {
      await updateDoc(doc(db, "posts", post.id), {
        likedBy:    isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: newCount,
      });
      setPosts((prev) => prev.map((p) => p.id === post.id ? {
        ...p,
        likedBy:    isLiked ? (p.likedBy ?? []).filter((id) => id !== user.uid) : [...(p.likedBy ?? []), user.uid],
        likesCount: newCount,
      } : p));
    } catch (err) { console.error("Like error — check Firestore rules:", err); }
  };

  /* ── Comments ── */
  const toggleComments = async (postId) => {
    const isOpen = expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !postComments[postId]) {
      try {
        const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        setPostComments((prev) => ({
          ...prev,
          [postId]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }));
      } catch (err) { console.error("Load comments error — check Firestore rules:", err); }
    }
  };

  const handleAddComment = async (postId) => {
    const ct = commentText[postId]?.trim();
    if (!ct || !user) return;
    setSendingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const comment = {
        text: ct, authorId: user.uid, authorName: myName,
        authorPhotoURL: authProfile?.photoURL ?? null,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "posts", postId, "comments"), comment);
      const newCount = (posts.find((p) => p.id === postId)?.commentsCount ?? 0) + 1;
      await updateDoc(doc(db, "posts", postId), { commentsCount: newCount });
      setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), { id: docRef.id, ...comment }] }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: newCount } : p));
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      logActivity({ type: "comment", actorId: user.uid, actorName: myName, targetId: docRef.id, targetType: "comment", details: { postId, text: ct?.slice(0, 100) } });
    } catch (err) { console.error("Comment error — check Firestore rules:", err); }
    finally { setSendingComment((prev) => ({ ...prev, [postId]: false })); }
  };

  /* ── Edit comment ── */
  const handleSaveCommentEdit = async (postId, commentId) => {
    const newText = editingCommentText.trim();
    if (!newText) return;
    try {
      await updateDoc(doc(db, "posts", postId, "comments", commentId), { text: newText, edited: true });
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map((c) =>
          c.id === commentId ? { ...c, text: newText, edited: true } : c
        ),
      }));
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) { console.error("Edit comment error:", err); }
  };

  /* ── Delete comment ── */
  const handleDeleteComment = async (postId, c) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", c.id));
      const post = posts.find((p) => p.id === postId);
      const newCount = Math.max(0, (post?.commentsCount ?? 1) - 1);
      await updateDoc(doc(db, "posts", postId), { commentsCount: newCount });
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((cm) => cm.id !== c.id),
      }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: newCount } : p));
      const isAdminAction = authProfile?.isAdmin && c.authorId !== user.uid;
      logActivity({
        type: isAdminAction ? "admin_delete_comment" : "comment_delete",
        actorId: user.uid,
        actorName: myName,
        targetId: c.id,
        targetType: "comment",
        details: { postId, text: c.text?.slice(0, 100) },
      });
    } catch (err) { console.error("Delete comment error:", err); }
  };

  /* ── Repost ── */
  const handleRepost = async (originalPost, addedText) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "posts"), {
        text: addedText ?? "",
        media: [], authorId: user.uid, authorName: myName,
        authorPhotoURL: authProfile?.photoURL ?? null,
        createdAt: new Date().toISOString(),
        likesCount: 0, likedBy: [], commentsCount: 0,
        repostOf: {
          postId: originalPost.id,
          originalAuthorId: originalPost.authorId,
          originalAuthorName: originalPost.authorName,
          originalAuthorPhotoURL: originalPost.authorPhotoURL ?? null,
          originalText: originalPost.text ?? "",
          originalMedia: originalPost.media ?? [],
          originalCreatedAt: originalPost.createdAt,
        },
      });
      fetchPosts();
    } catch (err) { console.error("Repost error:", err); }
  };

  /* ══ Styles ══ */
  const sideCard = {
    background: T.card, borderRadius: "18px", padding: "1.5rem",
    border: `1.5px solid ${T.cardBorder}`, borderLeft: "4px solid #38bdf8",
    boxShadow: "0 4px 16px rgba(15,23,42,0.05)", marginBottom: "1.25rem",
  };

  const S = {
    page:      { padding: "2rem 2.5rem", boxSizing: "border-box", width: "100%", direction: isRTL ? "rtl" : "ltr", background: T.bg, minHeight: "100vh" },
    pageTitle: { fontSize: "22px", fontWeight: "700", color: T.text, margin: "0 0 3px" },
    pageSub:   { fontSize: "13px", color: T.muted, margin: "0 0 1.75rem" },
    layout: { display: "grid", gridTemplateColumns: "1fr 260px", gap: "1.5rem", alignItems: "start" },
    sidebar: { display: "flex", flexDirection: "column" },

    emptyText:  { fontSize:"12px", color:T.muted, textAlign:"center", padding:"1rem 0" },

    bdayItem: { display:"flex", alignItems:"center", gap:"10px", padding:"0.65rem 0", borderBottom:`1px solid ${T.divider}` },
    bdayAvatar: { width:"34px", height:"34px", borderRadius:"50%", background:"#fef9c3", color:"#854d0e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700", flexShrink:0, border:"1.5px solid #fde047", overflow:"hidden" },
    bdayName: { fontSize:"13px", fontWeight:"600", color:T.text, margin:0 },
    bdayDate: { fontSize:"11px", color:T.muted, margin:0 },
    todayPill: { fontSize:"10px", fontWeight:"700", background:"#fef9c3", color:"#854d0e", border:"1px solid #fde047", borderRadius:"99px", padding:"2px 8px" },

    feed:        { display: "flex", flexDirection: "column", gap: "1.25rem" },
    composeCard: { background: T.card, borderRadius: "18px", padding: "1.5rem", border: `1.5px solid ${T.cardBorder}`, borderLeft: "4px solid #38bdf8", boxShadow: "0 4px 16px rgba(15,23,42,0.05)", display: "flex", flexDirection: "column", gap: "0.85rem" },
    textarea: { width:"100%", padding:"11px 14px", fontSize:"14px", border:`1.5px solid ${T.inputBorder}`, borderRadius:"13px", resize:"none", fontFamily:"inherit", color:T.text, background:T.inputBg, minHeight:"82px", transition:"border-color 0.2s, box-shadow 0.2s" },
    composeActions: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
    attachBtn: { background:"none", border:`1.5px solid ${T.inputBorder}`, borderRadius:"9px", padding:"8px 14px", fontSize:"13px", color:T.sub, cursor:"pointer", fontWeight:"600", transition:"border-color 0.2s, color 0.2s" },
    postBtn:   { padding:"9px 22px", background:"#1a3c5e", color:"#fff", border:"none", borderRadius:"10px", fontSize:"13px", fontWeight:"700", cursor:"pointer", transition:"background 0.2s" },

    previewRow: { display:"flex", gap:"8px", flexWrap:"wrap" },
    previewThumb: { width:"64px", height:"64px", borderRadius:"10px", objectFit:"cover", border:`1.5px solid ${T.cardBorderL}` },
    previewName:  { fontSize:"11px", color:T.sub, background:T.tagBg, borderRadius:"7px", padding:"4px 10px", display:"flex", alignItems:"center" },

    postCard: { background:T.card, borderRadius:"18px", padding:"1.5rem", border:`1.5px solid ${T.cardBorder}`, borderLeft:"4px solid #e2e8f0", boxShadow:"0 4px 16px rgba(15,23,42,0.04)", display:"flex", flexDirection:"column", gap:"0.75rem" },
    postHeader: { display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" },
    postAuthor: { fontSize:"14px", fontWeight:"700", color:T.text, margin:0 },
    postTime:   { fontSize:"11px", color:T.muted, margin:0 },
    postText:   { fontSize:"14px", color:dark?"#cbd5e1":"#374151", lineHeight:"1.65", margin:0 },
    postActions: { marginLeft:"auto", display:"flex", gap:"6px" },
    postEditBtn:   { background:"none", border:`1px solid ${T.cardBorderL}`, color:T.sub, cursor:"pointer", fontSize:"11px", fontWeight:"600", padding:"4px 10px", borderRadius:"6px", transition:"color 0.15s, background 0.15s" },
    postDeleteBtn: { background:"none", border:`1px solid ${T.cardBorderL}`, color:T.muted, cursor:"pointer", fontSize:"11px", fontWeight:"600", padding:"4px 10px", borderRadius:"6px", transition:"color 0.15s, background 0.15s" },
    editTextarea:  { width:"100%", padding:"10px 13px", fontSize:"14px", border:"1.5px solid #38bdf8", borderRadius:"10px", resize:"none", fontFamily:"inherit", color:T.text, background:T.inputBg, minHeight:"72px", outline:"none" },
    editActions:   { display:"flex", gap:"8px", justifyContent:"flex-end" },
    saveBtn:   { padding:"7px 18px", background:"#1a3c5e", color:"#fff", border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer" },
    cancelBtn: { padding:"7px 18px", background:"none", color:T.sub, border:`1px solid ${T.cardBorderL}`, borderRadius:"8px", fontSize:"12px", fontWeight:"600", cursor:"pointer" },
    postImage: { width:"100%", maxHeight:"500px", objectFit:"contain", borderRadius:"12px", background:T.inputBg },
    postVideo: { width:"100%", maxHeight:"320px", borderRadius:"12px" },

    repostCard: { background:T.inputBg, borderRadius:"13px", padding:"1rem 1.25rem", border:`1.5px solid ${T.cardBorder}`, borderLeft:"3px solid #38bdf8", display:"flex", flexDirection:"column", gap:"0.5rem" },
    repostLabel:  { fontSize:"10px", fontWeight:"700", color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 6px" },
    repostAuthor: { fontSize:"13px", fontWeight:"700", color:T.text, margin:0 },
    repostText:   { fontSize:"13px", color:T.sub, lineHeight:"1.6", margin:0 },

    actionBar: { display:"flex", gap:"4px", borderTop:`1px solid ${T.divider}`, paddingTop:"0.75rem", marginTop:"0.25rem" },
    socialBtn: (active) => ({
      display:"flex", alignItems:"center", gap:"5px",
      padding:"6px 12px", borderRadius:"8px",
      background: active ? "#eff6ff" : "transparent",
      color: active ? "#1d4ed8" : T.sub,
      border:"none", cursor:"pointer", fontSize:"12px", fontWeight:"600",
    }),

    commentsSection: { borderTop:`1px solid ${T.divider}`, paddingTop:"1rem", display:"flex", flexDirection:"column", gap:"0.75rem" },
    commentItem:     { display:"flex", gap:"10px", alignItems:"flex-start" },
    commentBubble:   { background:T.inputBg, borderRadius:"12px", padding:"8px 12px", flex:1, border:`1px solid ${T.cardBorder}` },
    commentAuthor:   { fontSize:"12px", fontWeight:"700", color:T.text, margin:"0 0 3px" },
    commentText:     { fontSize:"13px", color:dark?"#cbd5e1":"#374151", margin:0, lineHeight:"1.5" },
    commentTime:     { fontSize:"10px", color:T.muted, margin:"4px 0 0" },
    commentCompose:  { display:"flex", gap:"8px", alignItems:"center" },
    commentInput:    { flex:1, padding:"9px 13px", fontSize:"13px", border:`1.5px solid ${T.inputBorder}`, borderRadius:"10px", fontFamily:"inherit", color:T.text, background:T.inputBg, transition:"border-color 0.2s, box-shadow 0.2s" },
    sendCommentBtn:  { padding:"9px 16px", background:"#0ea5e9", color:"#fff", border:"none", borderRadius:"10px", fontSize:"12px", fontWeight:"700", cursor:"pointer", transition:"background 0.15s", flexShrink:0 },
    commentActionBtn: { background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:"11px", fontWeight:"600", padding:"2px 6px", marginLeft:"4px", borderRadius:"5px", transition:"color 0.15s" },
  };

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div style={S.page}>
      <p style={S.pageTitle}>{t.community.title}</p>
      <p style={S.pageSub}>{t.community.subtitle}</p>

      <div style={S.layout}>
        {/* ── Center: Feed ── */}
        <div style={S.feed}>
          {/* Compose */}
          <div style={S.composeCard}>
            <textarea
              className="community-textarea"
              style={S.textarea}
              placeholder={t.community.sharePrompt}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {/* File previews with per-file X button */}
            {files.length > 0 && (
              <div style={S.previewRow}>
                {files.map((f, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    {f.type.startsWith("image") ? (
                      <img src={URL.createObjectURL(f)} style={S.previewThumb} alt="" />
                    ) : (
                      <span style={S.previewName}>{f.name}</span>
                    )}
                    <button
                      onClick={() => handleFileRemove(i)}
                      style={{
                        position: "absolute", top: "-6px", right: "-6px",
                        width: "18px", height: "18px", borderRadius: "50%",
                        background: "#ef4444", color: "#fff", border: "none",
                        cursor: "pointer", fontSize: "11px", fontWeight: "700",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      &#215;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={S.composeActions}>
              <button
                className="attach-btn"
                style={{ ...S.attachBtn, opacity: files.length >= 5 ? 0.4 : 1 }}
                onClick={() => files.length < 5 && fileRef.current.click()}
              >
                {t.community.attachFile} {files.length > 0 ? `(${files.length}/5)` : ""}
              </button>
              <input
                ref={fileRef} type="file" accept="image/*,video/*" multiple
                style={{ display: "none" }}
                onChange={handleFileAdd}
              />
              <button className="post-btn" style={S.postBtn} onClick={handlePost} disabled={posting}>
                {posting ? t.community.posting : t.community.post}
              </button>
            </div>
          </div>

          {posts.length === 0 && (
            <p style={{ ...S.emptyText, textAlign: "center" }}>{t.community.noPosts}</p>
          )}

          {/* Posts */}
          {posts.map((p) => {
            const isLiked   = p.likedBy?.includes(user?.uid);
            const likesCount = p.likesCount ?? 0;
            const commCount  = p.commentsCount ?? 0;
            const commOpen   = expandedComments[p.id];
            const comments   = postComments[p.id] ?? [];

            return (
              <div key={p.id} className="post-card" style={S.postCard}>
                {/* Header */}
                <div
                  style={S.postHeader}
                  onClick={() => p.authorId && setViewAuthor({ authorId: p.authorId, authorName: p.authorName })}
                  title={t.community.authorProfile}
                >
                  <Avatar photoURL={p.authorPhotoURL} name={p.authorName} size={38} fontSize={13} />
                  <div>
                    <p className="post-author-click" style={S.postAuthor}>{p.authorName}</p>
                    <p style={S.postTime}>{timeAgo(p.createdAt, t)}</p>
                  </div>
                  {user && (user.uid === p.authorId || authProfile?.isAdmin) && (
                    <div style={S.postActions} onClick={(e) => e.stopPropagation()}>
                      {user.uid === p.authorId && (
                        <button className="post-edit-btn" style={S.postEditBtn} onClick={() => { setEditingId(p.id); setEditText(p.text || ""); }}>Edit</button>
                      )}
                      <button className="post-delete-btn" style={S.postDeleteBtn} onClick={() => handleDeletePost(p.id)}>Remove</button>
                    </div>
                  )}
                </div>

                {/* Repost banner */}
                {p.repostOf && (
                  <p style={{ fontSize: "11px", color: T.muted, margin: 0 }}>
                    &#8635; {t.community.repostedBy} {p.authorName}
                  </p>
                )}

                {/* Body text */}
                {editingId === p.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea style={S.editTextarea} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                    <div style={S.editActions}>
                      <button style={S.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
                      <button style={S.saveBtn}   onClick={() => handleSaveEdit(p.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  p.text && <p style={S.postText}>{p.text}</p>
                )}

                {/* Embedded repost card */}
                {p.repostOf && (
                  <div style={S.repostCard}>
                    <p style={S.repostLabel}>{t.community.originalPost}</p>
                    <div
                      className="repost-author-link"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={() => p.repostOf.originalAuthorId && setViewAuthor({
                        authorId: p.repostOf.originalAuthorId,
                        authorName: p.repostOf.originalAuthorName,
                      })}
                    >
                      <Avatar photoURL={p.repostOf.originalAuthorPhotoURL} name={p.repostOf.originalAuthorName} size={28} fontSize={10} />
                      <p style={S.repostAuthor}>{p.repostOf.originalAuthorName}</p>
                    </div>
                    {p.repostOf.originalText && <p style={S.repostText}>{p.repostOf.originalText}</p>}
                    {p.repostOf.originalMedia?.map((m, i) =>
                      m.type === "image"
                        ? <img key={i} src={m.url} style={{ ...S.postImage, maxHeight: "200px" }} alt="" />
                        : <video key={i} src={m.url} style={{ ...S.postVideo, maxHeight: "160px" }} controls />
                    )}
                  </div>
                )}

                {/* Regular media */}
                {!p.repostOf && p.media?.map((m, i) =>
                  m.type === "image"
                    ? <img  key={i} src={m.url} style={S.postImage} alt="" />
                    : <video key={i} src={m.url} style={S.postVideo} controls />
                )}

                {/* ── Social action bar ── */}
                <div style={S.actionBar}>
                  {/* Like */}
                  <button
                    className={`social-btn${isLiked ? " social-btn-liked" : ""}`}
                    style={S.socialBtn(isLiked)}
                    onClick={() => handleLike(p)}
                  >
                    {isLiked ? t.community.liked : t.community.like}
                    {likesCount > 0 && (
                      <span style={{ background: isLiked ? "#dbeafe" : T.tagBg, color: isLiked ? "#1e40af" : T.sub, borderRadius: "99px", padding: "1px 7px", fontSize: "11px", fontWeight: "700" }}>
                        {likesCount}
                      </span>
                    )}
                  </button>

                  {/* Comment */}
                  <button
                    className="social-btn"
                    style={S.socialBtn(commOpen)}
                    onClick={() => toggleComments(p.id)}
                  >
                    {t.community.comment}
                    {commCount > 0 && (
                      <span style={{ background: T.tagBg, color: T.sub, borderRadius: "99px", padding: "1px 7px", fontSize: "11px", fontWeight: "700" }}>
                        {commCount}
                      </span>
                    )}
                  </button>

                  {/* Repost — don't allow reposting a repost */}
                  {!p.repostOf && (
                    <button
                      className="social-btn"
                      style={S.socialBtn(false)}
                      onClick={() => setRepostTarget(p)}
                    >
                      &#8635; {t.community.repost}
                    </button>
                  )}
                </div>

                {/* Comments panel */}
                {commOpen && (
                  <div style={S.commentsSection}>
                    {comments.length === 0 && (
                      <p style={{ fontSize: "12px", color: T.muted, margin: 0 }}>
                        {t.community.noComments}
                      </p>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} style={S.commentItem}>
                        <Avatar photoURL={c.authorPhotoURL} name={c.authorName} size={30} fontSize={10} />
                        <div style={S.commentBubble}>
                          <p style={S.commentAuthor}>{c.authorName}</p>
                          {editingCommentId === c.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <textarea
                                style={{ ...S.editTextarea, minHeight: "56px" }}
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button style={{ ...S.cancelBtn, padding: "5px 12px", fontSize: "11px" }} onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }}>Cancel</button>
                                <button style={{ ...S.saveBtn, padding: "5px 12px", fontSize: "11px" }} onClick={() => handleSaveCommentEdit(p.id, c.id)}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p style={S.commentText}>
                                {c.text}
                                {c.edited && <span style={{ fontSize: "10px", color: T.muted, marginLeft: "6px" }}>(edited)</span>}
                              </p>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <p style={S.commentTime}>{timeAgo(c.createdAt, t)}</p>
                                {(c.authorId === user?.uid || authProfile?.isAdmin) && (
                                  <div>
                                    {c.authorId === user?.uid && (
                                      <button
                                        className="comment-action-btn"
                                        style={S.commentActionBtn}
                                        onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.text); }}
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      className="comment-action-btn"
                                      style={{ ...S.commentActionBtn, color: "#b91c1c" }}
                                      onClick={() => handleDeleteComment(p.id, c)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div style={S.commentCompose}>
                      <Avatar photoURL={authProfile?.photoURL} name={myName} size={30} fontSize={10} />
                      <input
                        className="comment-input"
                        style={S.commentInput}
                        type="text"
                        placeholder={t.community.commentPlaceholder}
                        value={commentText[p.id] ?? ""}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment(p.id)}
                      />
                      <button
                        className="send-comment-btn"
                        style={{ ...S.sendCommentBtn, opacity: sendingComment[p.id] ? 0.6 : 1 }}
                        onClick={() => handleAddComment(p.id)}
                        disabled={sendingComment[p.id]}
                      >
                        {t.community.send}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: Birthdays ── */}
        <div style={S.sidebar}>
          <div style={{ ...sideCard, borderLeftColor: "#fde047" }}>
            <p style={{ ...sectionLabel, color: T.muted }}>{t.community.upcomingBirthdays}</p>
            {birthdays.length === 0 && <p style={S.emptyText}>{t.community.noBirthdays}</p>}
            {birthdays.map((u) => {
              const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
              return (
                <div key={u.id} style={S.bdayItem}>
                  <div style={S.bdayAvatar}>
                    {u.photoURL
                      ? <img src={u.photoURL} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : getInitials(fullName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={S.bdayName}>{fullName}</p>
                    <p style={S.bdayDate}>{u.daysUntil === 0 ? t.community.today : t.community.inDays(u.daysUntil)}</p>
                  </div>
                  {u.daysUntil === 0 && <span style={S.todayPill}>{t.community.today}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Author modal */}
      {viewAuthor && (
        <AuthorModal authorId={viewAuthor.authorId} authorName={viewAuthor.authorName} onClose={() => setViewAuthor(null)} t={t} T={T} />
      )}

      {/* Repost modal */}
      {repostTarget && (
        <RepostModal originalPost={repostTarget} onClose={() => setRepostTarget(null)} onRepost={handleRepost} t={t} T={T} />
      )}
    </div>
  );
}
