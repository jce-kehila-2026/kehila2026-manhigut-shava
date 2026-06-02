import { useState, useEffect, useRef, useCallback } from "react";
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
function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
function getInitials(name) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
}
function avatarColor(name) {
  const colors = ["#2563eb","#7c3aed","#0891b2","#059669","#dc2626","#d97706","#db2777"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
function isBirthdaySoon(birthdate) {
  if (!birthdate) return null;
  const today = new Date(), bday = new Date(birthdate);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  const diff = Math.ceil((thisYear - today) / 86400000);
  return diff >= 0 && diff <= 7 ? diff : null;
}

/* ── Avatar ── */
function Avatar({ url, name, size = 40, style: extraStyle }) {
  const bg = avatarColor(name);
  return url ? (
    <img src={url} alt="" style={{
      width: size, height: size, borderRadius: "50%",
      objectFit: "cover", flexShrink: 0, ...extraStyle,
    }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, ...extraStyle,
    }}>{getInitials(name)}</div>
  );
}

/* ── Comment item with edit support ── */
function CommentItem({ comment, currentUid, isAdmin, onDelete, onEdit }) {
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
              width: "100%", padding: "7px 10px",
              border: "1.5px solid var(--brand)", borderRadius: "var(--r-sm)",
              fontSize: 13, resize: "none", fontFamily: "var(--font)",
              background: "var(--bg-secondary)", outline: "none",
              color: "var(--text-primary)", minHeight: 56,
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button
              onClick={() => { setEditing(false); setEditText(comment.text); }}
              style={{ padding: "4px 10px", fontSize: 11, cursor: "pointer", background: "none", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text-secondary)" }}
            >Cancel</button>
            <button
              onClick={() => { onEdit(comment.id, editText.trim()); setEditing(false); }}
              style={{ padding: "4px 10px", fontSize: 11, cursor: "pointer", background: "var(--brand)", border: "none", borderRadius: "var(--r-sm)", color: "#fff", fontWeight: 700 }}
            >Save</button>
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
          background: "var(--bg-secondary)", borderRadius: "var(--r-xs) var(--r-md) var(--r-md) var(--r-md)",
          padding: "8px 12px",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{comment.authorName}</span>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
            {comment.text}
            {comment.edited && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 5 }}>(edited)</span>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, paddingLeft: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(comment.createdAt)}</span>
          {currentUid === comment.authorId && (
            <button onClick={() => setEditing(true)} style={{
              fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
              onMouseEnter={(e) => e.target.style.color = "var(--brand)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
            >Edit</button>
          )}
          {(currentUid === comment.authorId || isAdmin) && (
            <button onClick={() => onDelete(comment.id)} style={{
              fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
              onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
            >Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Post card ── */
function PostCard({ post, currentUser, isAdmin, onDelete, onRepost }) {
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

  /* Load comments when expanded */
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
    <article className="card slide-up" style={{ marginBottom: "1rem" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem 0", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Avatar url={post.authorAvatar} name={post.authorName} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{post.authorName}</span>
            {post.authorProfession && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-tertiary)", borderRadius: "var(--r-full)", padding: "1px 7px" }}>
                {post.authorProfession}
              </span>
            )}
            {post.isPinned && (
              <span style={{ fontSize: 10, fontWeight: 700, background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047", borderRadius: "var(--r-full)", padding: "1px 7px" }}>
                Pinned
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {timeAgo(post.createdAt)}
            {post.editedAt && <span style={{ marginLeft: 4 }}>(edited)</span>}
          </p>
        </div>

        {/* Actions menu */}
        {(canEdit || canDelete) && (
          <div style={{ display: "flex", gap: 4 }}>
            {canEdit && (
              <button
                onClick={() => { setEditingId(post.id); setEditText(post.text || ""); }}
                style={{ padding: "4px 10px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600, background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--brand)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >Edit</button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(post.id)}
                style={{ padding: "4px 10px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600, background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >Remove</button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "0.75rem 1.25rem" }}>
        {editingId === post.id ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "10px 12px", fontSize: 14,
                border: "1.5px solid var(--brand)", borderRadius: "var(--r-sm)",
                resize: "none", minHeight: 72, fontFamily: "var(--font)",
                background: "var(--bg-secondary)", outline: "none", color: "var(--text-primary)",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingId(null)} style={{ padding: "6px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "none", fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: "6px 14px", borderRadius: "var(--r-sm)", background: "var(--brand)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        ) : (
          post.text && <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}>{post.text}</p>
        )}
        {/* Repost preview */}
        {post.repostOf && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--r-md)", padding: "0.85rem 1rem", border: "1px solid var(--border)", borderLeft: "3px solid var(--brand)", marginTop: post.text ? 8 : 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
              Original post by {post.repostOf.authorName}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, wordBreak: "break-word" }}>
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
          gap: 2, margin: "0 0 4px",
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
        padding: "0.5rem 1.25rem",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {/* Like */}
        <button
          onClick={handleLike}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: "var(--r-sm)",
            background: liked ? "var(--brand-pale)" : "transparent",
            color: liked ? "var(--brand)" : "var(--text-muted)",
            border: "none", fontSize: 13, fontWeight: liked ? 700 : 500,
            cursor: "pointer", transition: "all var(--t-fast)",
          }}
          onMouseEnter={(e) => { if (!liked) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
          onMouseLeave={(e) => { if (!liked) e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ display: "flex", alignItems: "center" }}>
            {liked ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            )}
          </span>
          <span>{likes || ""}</span>
          <span>Like</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: "var(--r-sm)",
            background: showComments ? "var(--bg-tertiary)" : "transparent",
            color: "var(--text-muted)", border: "none",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            transition: "all var(--t-fast)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
          onMouseLeave={(e) => { if (!showComments) e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{commentCount > 0 ? commentCount : ""}</span>
          <span>Comment</span>
        </button>

        {/* Repost */}
        {currentUser && post.authorId !== currentUser.uid && (
          <button
            onClick={() => setShowRepostModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: "var(--r-sm)",
              background: "transparent", color: "var(--text-muted)",
              border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "all var(--t-fast)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span>Repost</span>
          </button>
        )}
      </div>

      {/* Repost modal */}
      {showRepostModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem", backdropFilter: "blur(4px)" }}
          onClick={() => setShowRepostModal(false)}>
          <div style={{ background: "var(--bg-primary)", borderRadius: "var(--r-xl)", padding: "1.5rem", width: "100%", maxWidth: 480, boxShadow: "0 16px 48px rgba(15,23,42,0.2)", display: "flex", flexDirection: "column", gap: "1rem" }}
            onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Repost</p>

            {/* Original post preview */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--r-md)", padding: "0.85rem 1rem", border: "1px solid var(--border)", borderLeft: "3px solid var(--brand)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{post.authorName}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, wordBreak: "break-word" }}>
                {post.text ? (post.text.length > 200 ? post.text.slice(0, 200) + "…" : post.text) : "(media post)"}
              </p>
            </div>

            <textarea
              value={repostThoughts}
              onChange={(e) => setRepostThoughts(e.target.value)}
              placeholder="Add your thoughts… (optional)"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", resize: "none", fontFamily: "var(--font)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
              onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRepostModal(false)} style={{ padding: "8px 18px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "none", fontSize: 13, cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>
              <button
                onClick={() => { onRepost(post, repostThoughts.trim()); setShowRepostModal(false); setRepostThoughts(""); }}
                style={{ padding: "8px 18px", borderRadius: "var(--r-sm)", background: "var(--brand)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >Repost</button>
            </div>
          </div>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: "0.75rem 1.25rem 1rem", borderTop: "1px solid var(--bg-tertiary)" }}>
          {loadingComments && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>Loading…</p>}

          {comments.map((c) => (
            <CommentItem
              key={c.id} comment={c}
              currentUid={currentUser?.uid}
              isAdmin={isAdmin}
              onDelete={handleDeleteComment}
              onEdit={handleEditComment}
            />
          ))}

          {/* New comment input */}
          {currentUser && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  placeholder="Write a comment…"
                  style={{
                    width: "100%", padding: "8px 12px",
                    border: "1.5px solid var(--border)", borderRadius: "var(--r-full)",
                    fontSize: 13, fontFamily: "var(--font)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
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
                  width: 34, height: 34, borderRadius: "50%",
                  background: commentText.trim() ? "var(--brand)" : "var(--bg-tertiary)",
                  color: commentText.trim() ? "#fff" : "var(--text-muted)",
                  border: "none", cursor: commentText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all var(--t-fast)", flexShrink: 0,
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
  const [text, setText]       = useState("");
  const [files, setFiles]     = useState([]);
  const [posting, setPosting] = useState(false);
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

  return (
    <div className="card" style={{ marginBottom: "1rem", padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar url={profile?.avatarUrl} name={profile ? `${profile.firstName} ${profile.lastName}` : ""} size={40} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share something with the community…"
            rows={text ? 3 : 1}
            style={{
              width: "100%", border: "none", outline: "none", resize: "none",
              fontSize: 14, background: "transparent", color: "var(--text-primary)",
              lineHeight: 1.6, fontFamily: "var(--font)",
              transition: "min-height 0.2s",
            }}
          />

          {/* File previews */}
          {files.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {files.map((f, i) =>
                f.type.startsWith("image") ? (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, borderRadius: "var(--r-sm)", objectFit: "cover", border: "1px solid var(--border)" }} />
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <span key={i} style={{ fontSize: 11, background: "var(--bg-tertiary)", borderRadius: "var(--r-sm)", padding: "4px 10px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    {f.name}
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                )
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <button onClick={() => fileRef.current.click()} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: "var(--r-sm)",
              background: "none", border: "1px solid var(--border)",
              fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
              transition: "all var(--t-fast)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Attach
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
              onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files)])} />

            <div style={{ flex: 1 }} />

            <button
              onClick={handlePost}
              disabled={(!text.trim() && files.length === 0) || posting}
              style={{
                padding: "7px 20px", borderRadius: "var(--r-sm)",
                background: (text.trim() || files.length > 0) ? "var(--brand)" : "var(--bg-tertiary)",
                color: (text.trim() || files.length > 0) ? "#fff" : "var(--text-muted)",
                border: "none", fontSize: 13, fontWeight: 700,
                cursor: (text.trim() || files.length > 0) ? "pointer" : "default",
                transition: "all var(--t-fast)",
              }}
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main CommunityPage ── */
export default function CommunityPage() {
  const { user, profile: authProfile } = useAuth();
  const [posts, setPosts]           = useState([]);
  const [birthdays, setBirthdays]   = useState([]);
  const [requests, setRequests]     = useState([]);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);

  /* Load user profile */
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  /* Real-time posts feed */
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  /* Birthdays */
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

  /* Help requests received */
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "helpRequests"), where("toUserId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) =>
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
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
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{
        maxWidth: 980, width: "100%", margin: "0 auto",
        padding: "1.5rem",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: "1.5rem",
        alignItems: "start",
      }}>

        {/* ── Left sidebar: Requests + Birthdays ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "1.5rem", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>

          {/* Help Requests */}
          <div className="card" style={{ padding: "1rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Help Requests
            </p>
            {requests.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "0.5rem 0" }}>No requests yet.</p>
            )}
            {requests.map((r) => (
              <div key={r.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, wordBreak: "break-word" }}>{r.fromUserName}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{r.fromUserProfession}</p>
                {!r.status && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => handleRequest(r.id, "accepted")} style={{ flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 700, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", cursor: "pointer" }}>Accept</button>
                    <button onClick={() => handleRequest(r.id, "declined")} style={{ flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 700, background: "#fff0f0", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "var(--r-sm)", cursor: "pointer" }}>Decline</button>
                  </div>
                )}
                {r.status && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-full)", background: r.status === "accepted" ? "#dcfce7" : "#fee2e2", color: r.status === "accepted" ? "#166534" : "#991b1b", border: `1px solid ${r.status === "accepted" ? "#bbf7d0" : "#fecaca"}` }}>
                    {r.status === "accepted" ? "Accepted" : "Declined"}
                  </span>
                )}
                <button onClick={async () => { await deleteDoc(doc(db, "helpRequests", r.id)); }}
                  style={{ marginTop: 4, fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
                  onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
                >Remove</button>
              </div>
            ))}
          </div>

          {/* Upcoming Birthdays */}
          <div className="card" style={{ padding: "1rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Upcoming Birthdays
            </p>
            {birthdays.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "0.5rem 0" }}>No upcoming birthdays.</p>
            )}
            {birthdays.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--bg-tertiary)" }}>
                <Avatar url={u.photoURL || u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.firstName} {u.lastName}
                  </p>
                  <p style={{ fontSize: 10, color: u.daysUntil === 0 ? "var(--brand)" : "var(--text-muted)" }}>
                    {u.daysUntil === 0 ? "Today!" : `In ${u.daysUntil} day${u.daysUntil > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Center: Feed ── */}
        <div style={{ minWidth: 0 }}>
          <ComposeBox currentUser={user} profile={profile} />

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ marginBottom: "1rem", padding: "1.25rem" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 13, width: "40%", marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: "25%" }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 13, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 13, width: "80%" }} />
            </div>
          ))}

          {pinnedPosts.map((p) => (
            <PostCard key={p.id} post={p} currentUser={user} isAdmin={authProfile?.isAdmin} onDelete={handleDeletePost} onRepost={handleRepost} />
          ))}

          {!loading && regularPosts.length === 0 && pinnedPosts.length === 0 && (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <h3>No posts yet</h3>
              <p>Be the first to share something with the community!</p>
            </div>
          )}
          {regularPosts.map((p) => (
            <PostCard key={p.id} post={p} currentUser={user} isAdmin={authProfile?.isAdmin} onDelete={handleDeletePost} onRepost={handleRepost} />
          ))}
        </div>
      </div>
    </div>
  );
}
