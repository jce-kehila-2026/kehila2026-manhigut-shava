import { useState, useEffect, useRef } from "react";
import { useLang } from "./LanguageContext";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  getDoc, getDocs, where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./AuthContext";
import { logActivity } from "./activityLogger";

/* ── Helpers ── */
function timeAgo(ts, t) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return t.common.justNow;
  if (s < 3600)  return t.common.minutesAgo(Math.floor(s / 60));
  if (s < 86400) return t.common.hoursAgo(Math.floor(s / 3600));
  if (s < 604800) return t.common.daysAgo(Math.floor(s / 86400));
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
function getInitials(name) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
}
function avatarColor(name) {
  const colors = ["#b8617a", "#d48aa0", "#8d3f5c", "#c98aa3", "#a8607a", "#e0a4b6", "#7a3f5c"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
function isBirthdaySoon(birthdate) {
  if (!birthdate) return null;
  const today = new Date(), bday = new Date(birthdate);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  const diff = Math.ceil((thisYear - today) / 86400000);
  return diff >= 0 && diff <= 7 ? diff : null;
}
function formatBday(birthdate) {
  if (!birthdate) return "";
  const d = new Date(birthdate);
  return d.toLocaleDateString([], { month: "long", day: "numeric" });
}

/* ── Avatar ── */
function Avatar({ url, name, size = 40, ring, style: extraStyle }) {
  const bg = avatarColor(name);
  const base = {
    width: size, height: size, borderRadius: "50%",
    objectFit: "cover", flexShrink: 0,
    ...(ring ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${ring}` } : {}),
    ...extraStyle,
  };
  return url ? (
    <img src={url} alt="" style={base} />
  ) : (
    <div style={{
      ...base,
      background: `linear-gradient(135deg, ${bg}, ${avatarColor(name?.split("").reverse().join(""))})`,
      color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, fontFamily: "var(--font-display)",
    }}>{getInitials(name)}</div>
  );
}

/* ── Comment item with edit support ── */
function CommentItem({ comment, currentUid, isAdmin, onDelete, onEdit }) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 8, paddingTop: 10 }}>
        <Avatar url={comment.authorAvatar} name={comment.authorName} size={28} />
        <div style={{ flex: 1 }}>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
            style={{
              width: "100%", padding: "8px 12px",
              border: "1.5px solid var(--brand)", borderRadius: "var(--r-md)",
              fontSize: 13, resize: "none", fontFamily: "var(--font)",
              background: "var(--bg-secondary)", outline: "none",
              color: "var(--text-primary)", minHeight: 56,
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button
              onClick={() => { setEditing(false); setEditText(comment.text); }}
              style={{ padding: "5px 12px", fontSize: 11, cursor: "pointer", background: "none", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text-secondary)" }}
            >{t.common.cancel}</button>
            <button
              onClick={() => { onEdit(comment.id, editText.trim()); setEditing(false); }}
              style={{ padding: "5px 12px", fontSize: 11, cursor: "pointer", background: "var(--brand)", border: "none", borderRadius: "var(--r-sm)", color: "#fff", fontWeight: 700 }}
            >{t.common.save}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, paddingTop: 10 }}>
      <Avatar url={comment.authorAvatar} name={comment.authorName} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "4px 16px 16px 16px",
          padding: "9px 13px",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{comment.authorName}</span>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.55 }}>
            {comment.text}
            {comment.edited && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 5 }}>(edited)</span>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, paddingLeft: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(comment.createdAt, t)}</span>
          {currentUid === comment.authorId && (
            <button onClick={() => setEditing(true)} style={{
              fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
              onMouseEnter={(e) => e.target.style.color = "var(--brand)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
            >{t.common.edit}</button>
          )}
          {(currentUid === comment.authorId || isAdmin) && (
            <button onClick={() => onDelete(comment.id)} style={{
              fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
              onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
            >{t.community.delete}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Post card ── */
function PostCard({ post, currentUser, isAdmin, onDelete, onRepost, onViewProfile, onMessage }) {
  const { t } = useLang();
  const [liked,    setLiked]    = useState((post.likedBy || []).includes(currentUser?.uid));
  const [likes,    setLikes]    = useState(post.likesCount || (post.likedBy?.length || 0));
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [editText,  setEditText]        = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostThoughts, setRepostThoughts]   = useState("");

  useEffect(() => {
    if (!showComments || comments.length > 0) return;
    setLoadingComments(true);
    const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingComments(false);
    });
    return unsub;
  }, [showComments]);

  const handleLike = async () => {
    if (!currentUser) return;
    const postRef = doc(db, "posts", post.id);
    if (liked) {
      setLiked(false); setLikes((n) => n - 1);
      await updateDoc(postRef, {
        likedBy: arrayRemove(currentUser.uid),
        likesCount: Math.max(0, likes - 1),
      });
    } else {
      setLiked(true); setLikes((n) => n + 1);
      await updateDoc(postRef, {
        likedBy: arrayUnion(currentUser.uid),
        likesCount: likes + 1,
      });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !currentUser || postingComment) return;
    setPostingComment(true);
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const u = userSnap.data() || {};
    await addDoc(collection(db, "posts", post.id, "comments"), {
      authorId: currentUser.uid,
      authorName: `${u.firstName || ""} ${u.lastName || ""}`.trim() || currentUser.email,
      authorAvatar: u.avatarUrl || null,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, "posts", post.id), {
      commentCount: (post.commentCount || 0) + 1,
    });
    setCommentText("");
    setPostingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    await deleteDoc(doc(db, "posts", post.id, "comments", commentId));
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleEditComment = async (commentId, newText) => {
    if (!newText) return;
    await updateDoc(doc(db, "posts", post.id, "comments", commentId), {
      text: newText, edited: true, editedAt: new Date().toISOString(),
    });
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, text: newText, edited: true } : c));
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, "posts", post.id), { text: editText.trim(), editedAt: new Date().toISOString() });
    setEditingId(null);
  };

  const canEdit   = currentUser?.uid === post.authorId || isAdmin;
  const canDelete = currentUser?.uid === post.authorId || isAdmin;
  const commentCount = post.commentCount || 0;

  return (
    <article
      className="card slide-up"
      style={{
        marginBottom: "1.25rem",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        border: post.isPinned ? "1px solid var(--brand-light)" : "1px solid var(--border)",
        boxShadow: post.isPinned ? "0 8px 28px rgba(184,97,122,0.12)" : "var(--shadow-sm)",
        background: "var(--bg-primary)",
      }}
    >
      {post.isPinned && (
        <div style={{
          background: "linear-gradient(90deg, var(--brand-pale), #fff)",
          padding: "6px 18px",
          fontSize: 11, fontWeight: 700, color: "var(--brand-dark)",
          letterSpacing: "0.06em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 6,
          borderBottom: "1px solid var(--border)",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l6 6-4 1-3 5-2-2-5 5-1-1 5-5-2-2 5-3 1-4z"/></svg>
          Pinned
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "1.1rem 1.35rem 0", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Avatar
          url={post.authorAvatar} name={post.authorName} size={44}
          style={{ cursor: onViewProfile ? "pointer" : "default" }}
        />
        <div style={{ flex: 1, cursor: onViewProfile ? "pointer" : "default" }} onClick={() => onViewProfile?.(post.authorId)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{post.authorName}</span>
            {post.authorProfession && (
              <span style={{
                fontSize: 11, color: "var(--brand-dark)",
                background: "var(--brand-pale)",
                borderRadius: "var(--r-full)", padding: "2px 9px",
                fontWeight: 600,
              }}>
                {post.authorProfession}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {timeAgo(post.createdAt, t)}
            {post.editedAt && <span style={{ marginLeft: 4 }}>· {t.common.edited}</span>}
          </p>
        </div>

        {(canEdit || canDelete) && (
          <div style={{ display: "flex", gap: 4 }}>
            {canEdit && (
              <button
                onClick={() => { setEditingId(post.id); setEditText(post.text || ""); }}
                style={{ padding: "5px 11px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600, background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-pale)"; e.currentTarget.style.color = "var(--brand-dark)"; e.currentTarget.style.borderColor = "var(--brand-light)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >Edit</button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(post.id)}
                style={{ padding: "5px 11px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600, background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fbeaea"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "#f0c5c5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >Remove</button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "0.85rem 1.35rem 0.25rem" }}>
        {editingId === post.id ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "11px 13px", fontSize: 14,
                border: "1.5px solid var(--brand)", borderRadius: "var(--r-md)",
                resize: "none", minHeight: 80, fontFamily: "var(--font)",
                background: "var(--bg-secondary)", outline: "none", color: "var(--text-primary)",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingId(null)} style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "none", fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", background: "var(--brand)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        ) : (
          post.text && <p style={{ fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.text}</p>
        )}

        {post.repostOf && (
          <div style={{
            background: "var(--bg-secondary)", borderRadius: "var(--r-md)",
            padding: "0.85rem 1rem",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--brand)",
            marginTop: post.text ? 10 : 0,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-dark)", marginBottom: 4 }}>
              ↻ {post.repostOf.authorName}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, wordBreak: "break-word" }}>
              {post.repostOf.text ? (post.repostOf.text.length > 200 ? post.repostOf.text.slice(0, 200) + "…" : post.repostOf.text) : "(media post)"}
            </p>
          </div>
        )}
      </div>

      {/* Media */}
      {post.media?.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: post.media.length === 1 ? "1fr" : "repeat(2, 1fr)",
          gap: 3, margin: "0.75rem 0 0",
        }}>
          {post.media.map((m, i) =>
            m.type === "image" ? (
              <img key={i} src={m.url} alt="" style={{
                width: "100%", maxHeight: post.media.length === 1 ? 480 : 240,
                objectFit: "cover", cursor: "pointer",
              }} onClick={() => window.open(m.url, "_blank")} />
            ) : (
              <video key={i} src={m.url} controls style={{ width: "100%", maxHeight: 360 }} />
            )
          )}
        </div>
      )}

      {/* Action bar */}
      <div style={{
        padding: "0.6rem 1rem",
        marginTop: "0.5rem",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 2,
      }}>
        <button
          onClick={handleLike}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: "var(--r-full)",
            background: liked ? "var(--brand-pale)" : "transparent",
            color: liked ? "var(--brand-dark)" : "var(--text-muted)",
            border: "none", fontSize: 13, fontWeight: liked ? 700 : 500,
            cursor: "pointer", transition: "all var(--t-fast)",
          }}
          onMouseEnter={(e) => { if (!liked) e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { if (!liked) e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{likes || ""}</span>
          <span>{liked ? t.community.liked : t.community.like}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: "var(--r-full)",
            background: showComments ? "var(--bg-hover)" : "transparent",
            color: "var(--text-muted)", border: "none",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            transition: "all var(--t-fast)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => { if (!showComments) e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{commentCount > 0 ? commentCount : ""}</span>
          <span>{t.community.comment}</span>
        </button>

        {currentUser && post.authorId !== currentUser.uid && (
          <button
            onClick={() => onMessage?.(post.authorId)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: "var(--r-full)",
              background: "transparent", color: "var(--text-muted)",
              border: "none", fontSize: 13, fontWeight: 500, cursor: onMessage ? "pointer" : "not-allowed",
              transition: "all var(--t-fast)",
            }}
            onMouseEnter={(e) => { if (onMessage) e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { if (onMessage) e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v12H5.5L4 17.5V4z"/><path d="M22 6l-6 4-6-4"/>
            </svg>
            <span>{t.community.message}</span>
          </button>
        )}

        {currentUser && post.authorId !== currentUser.uid && (
          <button
            onClick={() => setShowRepostModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: "var(--r-full)",
              background: "transparent", color: "var(--text-muted)",
              border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "all var(--t-fast)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span>{t.community.repost}</span>
          </button>
        )}
      </div>

      {/* Repost modal */}
      {showRepostModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(74,31,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem", backdropFilter: "blur(6px)" }}
          onClick={() => setShowRepostModal(false)}>
          <div style={{ background: "var(--bg-primary)", borderRadius: "var(--r-xl)", padding: "1.5rem", width: "100%", maxWidth: 480, boxShadow: "var(--shadow-xl)", display: "flex", flexDirection: "column", gap: "1rem" }}
            onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{t.community.repost}</p>

            <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--r-md)", padding: "0.85rem 1rem", border: "1px solid var(--border)", borderLeft: "3px solid var(--brand)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-dark)", marginBottom: 4 }}>{post.authorName}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, wordBreak: "break-word" }}>
                {post.text ? (post.text.length > 200 ? post.text.slice(0, 200) + "…" : post.text) : t.community.mediaPost}
              </p>
            </div>

            <textarea
              value={repostThoughts}
              onChange={(e) => setRepostThoughts(e.target.value)}
              placeholder={t.community.addThoughtsPlaceholder}
              rows={3}
              style={{ width: "100%", padding: "11px 13px", fontSize: 14, border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", resize: "none", fontFamily: "var(--font)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
              onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRepostModal(false)} style={{ padding: "9px 18px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "none", fontSize: 13, cursor: "pointer", color: "var(--text-secondary)" }}>{t.common.cancel}</button>
              <button
                onClick={() => { onRepost(post, repostThoughts.trim()); setShowRepostModal(false); setRepostThoughts(""); }}
                style={{ padding: "9px 20px", borderRadius: "var(--r-sm)", background: "var(--brand)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >{t.community.repost}</button>
            </div>
          </div>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: "0.75rem 1.35rem 1.1rem", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          {loadingComments && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>{t.common.loading}</p>}

          {comments.map((c) => (
            <CommentItem
              key={c.id} comment={c}
              currentUid={currentUser?.uid}
              isAdmin={isAdmin}
              onDelete={handleDeleteComment}
              onEdit={handleEditComment}
            />
          ))}

          {currentUser && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  placeholder={t.community.commentPlaceholder}
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: "1.5px solid var(--border)", borderRadius: "var(--r-full)",
                    fontSize: 13, fontFamily: "var(--font)",
                    background: "var(--bg-primary)", color: "var(--text-primary)",
                    outline: "none", transition: "border-color var(--t-fast)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || postingComment}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: commentText.trim() ? "var(--brand)" : "var(--bg-tertiary)",
                  color: commentText.trim() ? "#fff" : "var(--text-muted)",
                  border: "none", cursor: commentText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all var(--t-fast)", flexShrink: 0,
                  boxShadow: commentText.trim() ? "0 4px 12px var(--brand-glow)" : "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ── Compose box ── */
function ComposeBox({ currentUser, profile, onPost }) {
  const { t } = useLang();
  const [text, setText]       = useState("");
  const [files, setFiles]     = useState([]);
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(false);
  const fileRef = useRef();

  const handlePost = async () => {
    if ((!text.trim() && files.length === 0) || posting) return;
    setPosting(true);
    try {
      const mediaUrls = [];
      for (const file of files) {
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        mediaUrls.push({ url, type: file.type.startsWith("video") ? "video" : "image" });
      }
      const authorName = profile ? `${profile.firstName} ${profile.lastName}` : currentUser.email;
      const docRef = await addDoc(collection(db, "posts"), {
        text: text.trim(),
        media: mediaUrls,
        authorId: currentUser.uid,
        authorName,
        authorAvatar: profile?.avatarUrl || null,
        authorProfession: profile?.profession || null,
        likesCount: 0,
        likedBy: [],
        commentCount: 0,
        isPinned: false,
        createdAt: new Date().toISOString(),
      });
      logActivity({
        type: "post", actorId: currentUser.uid, actorName: authorName,
        targetId: docRef.id, targetType: "post",
        details: { text: text?.slice(0, 150) },
      });
      setText(""); setFiles([]);
      onPost?.();
    } finally { setPosting(false); }
  };

  const hasContent = text.trim() || files.length > 0;

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.25rem",
        padding: "1.1rem 1.35rem",
        borderRadius: "var(--r-xl)",
        border: focused ? "1.5px solid var(--brand-light)" : "1px solid var(--border)",
        boxShadow: focused ? "0 8px 28px var(--brand-glow)" : "var(--shadow-sm)",
        transition: "all var(--t-normal)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar url={profile?.avatarUrl} name={profile ? `${profile.firstName} ${profile.lastName}` : ""} size={42} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t.community.sharePrompt}
            rows={text ? 3 : 1}
            style={{
              width: "100%", border: "none", outline: "none", resize: "none",
              fontSize: 15, background: "transparent", color: "var(--text-primary)",
              lineHeight: 1.65, fontFamily: "var(--font)",
              transition: "min-height 0.2s",
            }}
          />

          {files.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {files.map((f, i) =>
                f.type.startsWith("image") ? (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 76, height: 76, borderRadius: "var(--r-md)", objectFit: "cover", border: "1px solid var(--border)" }} />
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1, boxShadow: "var(--shadow-sm)" }}>×</button>
                  </div>
                ) : (
                  <span key={i} style={{ fontSize: 11, background: "var(--bg-tertiary)", borderRadius: "var(--r-sm)", padding: "5px 11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    {f.name}
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                )
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <button onClick={() => fileRef.current.click()} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: "var(--r-full)",
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
              transition: "all var(--t-fast)", fontWeight: 600,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-pale)"; e.currentTarget.style.borderColor = "var(--brand-light)"; e.currentTarget.style.color = "var(--brand-dark)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              {t.community.attachFile}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
              onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files)])} />

            <div style={{ flex: 1 }} />

            <button
              onClick={handlePost}
              disabled={!hasContent || posting}
              style={{
                padding: "9px 22px", borderRadius: "var(--r-full)",
                background: hasContent ? "linear-gradient(135deg, var(--brand), var(--brand-dark))" : "var(--bg-tertiary)",
                color: hasContent ? "#fff" : "var(--text-muted)",
                border: "none", fontSize: 13, fontWeight: 700,
                cursor: hasContent ? "pointer" : "default",
                transition: "all var(--t-fast)",
                boxShadow: hasContent ? "0 6px 18px var(--brand-glow)" : "none",
                letterSpacing: "0.02em",
              }}
            >
              {posting ? t.community.posting : t.community.post}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Birthday hero card ── */
function BirthdaysCard({ birthdays, onViewProfile, onMessage, currentUserUid }) {
  if (birthdays.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: "1.25rem",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border)",
          background: "linear-gradient(160deg, #fff, var(--bg-secondary))",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>🎂</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No birthdays this week.</p>
      </div>
    );
  }

  const today = birthdays.filter((u) => u.daysUntil === 0);
  const upcoming = birthdays.filter((u) => u.daysUntil > 0);

  return (
    <div
      className="card"
      style={{
        padding: 0,
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--brand-light)",
        overflow: "hidden",
        background: "var(--bg-primary)",
        boxShadow: "0 10px 32px rgba(184,97,122,0.14)",
        position: "relative",
      }}
    >
      {/* Hero header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #b8617a 0%, #d48aa0 55%, #e8c5c5 100%)",
          padding: "1.1rem 1.1rem 0.9rem",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)",
              fontSize: 20,
            }}
          >🎂</div>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em",
              opacity: 0.85,
            }}>This week</p>
            <p style={{
              fontSize: 17, fontWeight: 700,
              fontFamily: "var(--font-display)",
              lineHeight: 1.1, marginTop: 2,
            }}>Birthdays</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0.75rem 1rem 1rem" }}>
        {today.map((u) => {
          const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
          const canSend = onMessage && u.id !== currentUserUid;
          return (
            <div
              key={u.id}
              style={{
                marginBottom: 12,
                padding: "0.85rem 0.9rem",
                borderRadius: "var(--r-lg)",
                background: "linear-gradient(135deg, var(--brand-pale), #fff)",
                border: "1px solid var(--brand-light)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  onClick={() => onViewProfile?.(u.id)}
                  style={{ cursor: onViewProfile ? "pointer" : "default", position: "relative" }}
                >
                  <Avatar
                    url={u.photoURL || u.avatarUrl}
                    name={name}
                    size={42}
                    ring="var(--brand)"
                  />
                  <span style={{
                    position: "absolute", bottom: -2, right: -2,
                    fontSize: 14, lineHeight: 1,
                  }}>🎂</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    onClick={() => onViewProfile?.(u.id)}
                    style={{
                      fontSize: 13.5, fontWeight: 700,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                      cursor: onViewProfile ? "pointer" : "default",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >{name || "Birthday girl"}</p>
                  <span style={{
                    display: "inline-block",
                    fontSize: 10, fontWeight: 800,
                    color: "#fff",
                    background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
                    padding: "2px 9px",
                    borderRadius: "var(--r-full)",
                    marginTop: 3,
                    letterSpacing: "0.08em",
                    boxShadow: "0 4px 12px var(--brand-glow)",
                  }}>TODAY</span>
                </div>
              </div>
              {canSend && (
                <button
                  onClick={() => onMessage(u.id)}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "7px 0",
                    borderRadius: "var(--r-full)",
                    background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
                    color: "#fff",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px var(--brand-glow)",
                    letterSpacing: "0.03em",
                  }}
                >
                  Send wishes 
                </button>
              )}
            </div>
          );
        })}

        {upcoming.length > 0 && today.length > 0 && (
          <p style={{
            fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: 6, paddingLeft: 4,
          }}>Coming up</p>
        )}

        {upcoming.map((u) => {
          const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
          return (
            <div
              key={u.id}
              onClick={() => onViewProfile?.(u.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 6px",
                borderRadius: "var(--r-md)",
                cursor: onViewProfile ? "pointer" : "default",
                transition: "background var(--t-fast)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Avatar url={u.photoURL || u.avatarUrl} name={name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{name}</p>
                <p style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                  {formatBday(u.birthdate ?? u.birthDate)} · in {u.daysUntil} day{u.daysUntil > 1 ? "s" : ""}
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: "var(--brand-dark)",
                background: "var(--brand-pale)",
                padding: "2px 8px",
                borderRadius: "var(--r-full)",
              }}>
                {u.daysUntil}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main CommunityPage ── */
export default function CommunityPage({ onViewProfile, onMessage }) {
  const { t } = useLang();
  const { user, profile: authProfile } = useAuth();
  const [posts, setPosts]           = useState([]);
  const [birthdays, setBirthdays]   = useState([]);
  const [requests, setRequests]     = useState([]);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      const upcoming = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .map((u) => ({ ...u, daysUntil: isBirthdaySoon(u.birthdate ?? u.birthDate) }))
        .filter((u) => u.daysUntil !== null)
        .sort((a, b) => a.daysUntil - b.daysUntil);
      setBirthdays(upcoming);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "helpRequests"), where("toUserId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) =>
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm(t?.community?.confirmDelete || "Delete this post?")) return;
    await deleteDoc(doc(db, "posts", postId));
  };

  const handleRepost = async (originalPost, thoughts) => {
    if (!user || !profile) return;
    const authorName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || user.email;
    await addDoc(collection(db, "posts"), {
      text: thoughts || "",
      media: [],
      authorId: user.uid,
      authorName,
      authorAvatar: profile?.photoURL || profile?.avatarUrl || null,
      authorProfession: profile?.profession || null,
      likesCount: 0, likedBy: [], commentCount: 0, isPinned: false,
      createdAt: new Date().toISOString(),
      repostOf: {
        id: originalPost.id,
        text: originalPost.text || "",
        authorName: originalPost.authorName,
        authorAvatar: originalPost.authorAvatar || null,
      },
    });
  };

  const handleRequest = async (reqId, status) => {
    const responderName = profile ? `${profile.firstName} ${profile.lastName}` : user.email;
    await updateDoc(doc(db, "helpRequests", reqId), { status, responderName });
  };

  const pinnedPosts  = posts.filter((p) => p.isPinned);
  const regularPosts = posts.filter((p) => !p.isPinned);

  return (
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", background: "var(--bg-secondary)" }}>
      <div style={{
        maxWidth: 1040, width: "100%", margin: "0 auto",
        padding: "1.75rem 1.5rem 0.5rem",
      }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 28, fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}>Community</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
          Share updates, ask for support, and celebrate each other.
        </p>
      </div>

      <div style={{
        maxWidth: 1040, width: "100%", margin: "0 auto",
        padding: "1rem 1.5rem 2rem",
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        gap: "1.5rem",
        alignItems: "start",
      }}>

        {/* Center: Feed */}
        <div style={{ minWidth: 0, order: 1 }}>
          <ComposeBox currentUser={user} profile={profile} />

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ marginBottom: "1.25rem", padding: "1.35rem", borderRadius: "var(--r-xl)" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 13, width: "40%", marginBottom: 7, borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: "25%", borderRadius: 6 }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 13, marginBottom: 7, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 13, width: "80%", borderRadius: 6 }} />
            </div>
          ))}

          {pinnedPosts.map((p) => (
            <PostCard key={p.id} post={p} currentUser={user} isAdmin={authProfile?.isAdmin}
              onDelete={handleDeletePost} onRepost={handleRepost}
              onViewProfile={onViewProfile} onMessage={onMessage}
            />
          ))}

          {!loading && regularPosts.length === 0 && pinnedPosts.length === 0 && (
            <div className="empty-state" style={{
              background: "var(--bg-primary)",
              borderRadius: "var(--r-xl)",
              border: "1px dashed var(--border)",
              padding: "3rem 1.5rem",
              textAlign: "center",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "var(--brand-pale)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand-dark)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)" }}>No posts yet</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                Be the first to share something with the community.
              </p>
            </div>
          )}
          {regularPosts.map((p) => (
            <PostCard key={p.id} post={p} currentUser={user} isAdmin={authProfile?.isAdmin}
              onDelete={handleDeletePost} onRepost={handleRepost}
              onViewProfile={onViewProfile} onMessage={onMessage}
            />
          ))}
        </div>

        {/* Right sidebar */}
        <aside style={{
          display: "flex", flexDirection: "column", gap: "1rem",
          position: "sticky", top: "1.5rem",
          maxHeight: "calc(100vh - 120px)", overflowY: "auto",
          order: 2,
        }}>

          <BirthdaysCard
            birthdays={birthdays}
            onViewProfile={onViewProfile}
            onMessage={onMessage}
            currentUserUid={user?.uid}
          />

          <div className="card" style={{ padding: "1.1rem", borderRadius: "var(--r-xl)", border: "1px solid var(--border)" }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: "var(--brand-dark)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: "0.85rem",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Help Requests
            </p>
            {requests.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "0.5rem 0" }}>
                Nothing new — you're all caught up.
              </p>
            )}
            {requests.map((r) => (
              <div key={r.id} style={{
                paddingBottom: 12, marginBottom: 12,
                borderBottom: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, wordBreak: "break-word", fontFamily: "var(--font-display)" }}>{r.fromUserName}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{r.fromUserProfession}</p>
                {!r.status && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleRequest(r.id, "accepted")} style={{
                      flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 700,
                      background: "rgba(123,168,122,0.12)", color: "var(--success)",
                      border: "1px solid rgba(123,168,122,0.35)",
                      borderRadius: "var(--r-full)", cursor: "pointer",
                    }}>Accept</button>
                    <button onClick={() => handleRequest(r.id, "declined")} style={{
                      flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 700,
                      background: "rgba(194,92,92,0.10)", color: "var(--danger)",
                      border: "1px solid rgba(194,92,92,0.30)",
                      borderRadius: "var(--r-full)", cursor: "pointer",
                    }}>Decline</button>
                  </div>
                )}
                {r.status && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "3px 10px", borderRadius: "var(--r-full)",
                    background: r.status === "accepted" ? "rgba(123,168,122,0.15)" : "rgba(194,92,92,0.12)",
                    color: r.status === "accepted" ? "var(--success)" : "var(--danger)",
                    border: `1px solid ${r.status === "accepted" ? "rgba(123,168,122,0.35)" : "rgba(194,92,92,0.30)"}`,
                  }}>
                    {r.status === "accepted" ? "Accepted" : "Declined"}
                  </span>
                )}
                <button onClick={async () => { await deleteDoc(doc(db, "helpRequests", r.id)); }}
                  style={{ marginTop: 6, marginLeft: 4, fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
                  onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
                >Remove</button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
