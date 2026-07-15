import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./LanguageContext";
import { useIsMobile } from "./hooks/useIsMobile";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  getDoc, getDocs, where, setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./AuthContext";
import { logActivity } from "./activityLogger";
import { deletePostWithCleanup } from "./utils/deletePost";
import { daysUntilBirthday, formatBirthday } from "./utils/birthday";
import ImageEditorModal from "./ImageEditorModal";
import { SlideshowBanner } from "./components/SlideshowBanner";
import { BalloonsEffect } from "./components/BalloonsEffect";
import { translateProfession } from "./utils/translateProfile";
import { HelpPostsWidget } from "./HelpPostFeed";

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
  const colors = ["#4472b8", "#6da3d4", "#1d4896", "#6da3d4", "#4472b8", "#daeaf8", "#223468"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
function isBirthdaySoon(birthdate) {
  const diff = daysUntilBirthday(birthdate);
  return diff !== null && diff <= 7 ? diff : null;
}
const URL_SPLIT_RE = /(https?:\/\/[^\s<>"]+)/g;
const IS_URL_RE = /^https?:\/\//;
function renderTextWithLinks(text) {
  if (!text) return null;
  return text.split(URL_SPLIT_RE).map((part, i) =>
    IS_URL_RE.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", wordBreak: "break-all" }}>{part}</a>
      : part
  );
}

/* ── Avatar ── */
function Avatar({ url, name, size = 40, ring, style: extraStyle }) {
  const [imgErr, setImgErr] = useState(false);
  const bg = avatarColor(name);
  const base = {
    width: size, height: size, borderRadius: "50%",
    objectFit: "cover", flexShrink: 0,
    ...(ring ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${ring}` } : {}),
    ...extraStyle,
  };
  return (url && !imgErr) ? (
    <img src={url} alt="" style={base} onError={() => setImgErr(true)} />
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

/* ── Emoji reactions strip ── */
const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🎉"];

function EmojiReactions({ reactions = {}, currentUid, onReact, compact = false }) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const { isRTL } = useLang();

  useEffect(() => {
    if (!showPicker) return;
    const close = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showPicker]);

  const activeEmojis = REACTION_EMOJIS.filter(e => (reactions[e] || []).length > 0);

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
      {activeEmojis.map(emoji => {
        const uids = reactions[emoji] || [];
        const mine = uids.includes(currentUid);
        return (
          <button key={emoji} onClick={() => onReact(emoji)} style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: compact ? "1px 6px" : "3px 8px",
            border: mine ? "1.5px solid var(--brand)" : "1.5px solid var(--border)",
            borderRadius: 99,
            background: mine ? "var(--brand-pale)" : "var(--bg-primary)",
            cursor: "pointer", fontSize: compact ? 11 : 12,
            fontWeight: mine ? 700 : 400,
            color: mine ? "var(--brand-dark)" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: compact ? 12 : 14 }}>{emoji}</span>
            <span>{uids.length}</span>
          </button>
        );
      })}
      <div style={{ position: "relative" }} ref={pickerRef}>
        <button onClick={() => setShowPicker(v => !v)} title="Add reaction" style={{
          width: compact ? 20 : 26, height: compact ? 20 : 26,
          border: "1.5px solid var(--border)", borderRadius: "50%",
          background: showPicker ? "var(--brand-pale)" : "var(--bg-primary)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: showPicker ? "var(--brand)" : "var(--text-muted)", transition: "background 0.15s, color 0.15s",
        }}>
          <svg width={compact ? 10 : 13} height={compact ? 10 : 13} viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        {showPicker && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)",
            ...(isRTL ? { right: 0 } : { left: 0 }),
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 6, display: "flex", gap: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.13)", zIndex: 100, whiteSpace: "nowrap",
          }}>
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(emoji); setShowPicker(false); }} style={{
                width: 32, height: 32, border: "none", background: "none",
                cursor: "pointer", fontSize: 18, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >{emoji}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Comment item with edit, reply, and reactions ── */
function CommentItem({ comment, currentUid, isAdmin, onDelete, onEdit, onReply, onReact }) {
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
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {renderTextWithLinks(comment.text)}
            {comment.edited && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 5 }}>(edited)</span>}
          </p>
        </div>
        {/* Reactions on comment */}
        <div style={{ marginTop: 3, paddingLeft: 4 }}>
          <EmojiReactions reactions={comment.reactions || {}} currentUid={currentUid} onReact={(emoji) => onReact?.(comment.id, emoji)} compact />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, paddingLeft: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(comment.createdAt, t)}</span>
          {currentUid && (
            <button onClick={() => onReply?.({ id: comment.id, authorName: comment.authorName })} style={{
              fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600,
            }}
              onMouseEnter={(e) => e.target.style.color = "var(--brand)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
            >Reply</button>
          )}
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

/* ── Translate button ── */
function TranslateButton({ text, onTranslated, onReverted, isTranslated }) {
  const { lang, t } = useLang();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (isTranslated) { onReverted(); return; }
    if (!text?.trim()) return;
    setBusy(true);
    try {
      const tl = lang === "ar" ? "ar" : lang === "he" ? "iw" : "en";
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = data[0]?.map(s => s[0]).join("") || text;
      onTranslated(translated);
    } catch {
      // silently fail
    } finally {
      setBusy(false);
    }
  };

  const label = isTranslated
    ? (t.community?.showOriginal || "Original")
    : (t.community?.translate || "Translate");

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      style={{
        background: "none", border: "none", cursor: busy ? "wait" : "pointer",
        fontSize: 11, color: "var(--text-muted,#6b7280)", padding: "2px 6px",
        display: "flex", alignItems: "center", gap: 4, borderRadius: 6,
        opacity: busy ? 0.6 : 1, transition: "color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--brand,#4472b8)"}
      onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted,#6b7280)"}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
        <path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
      </svg>
      {busy ? "..." : label}
    </button>
  );
}

/* ── Post card ── */
function PostCard({ post, currentUser, currentUserProfile, isAdmin, onDelete, onRepost, onViewProfile, onMessage, onPin }) {
  const { t, lang } = useLang();
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [editText,  setEditText]        = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [collapsedReplies, setCollapsedReplies] = useState(new Set());
  const [postReactions, setPostReactions] = useState(() => ({
    ...(post.reactions || {}),
    "❤️": [...new Set([...(post.likedBy || []), ...(post.reactions?.["❤️"] || [])])],
  }));
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostThoughts, setRepostThoughts]   = useState("");
  const [editMedia, setEditMedia]             = useState([]);
  const [editNewFiles, setEditNewFiles]       = useState([]);
  const [savingEdit, setSavingEdit]           = useState(false);
  const editFileInputRef = useRef(null);
  const [imgEditorSrc, setImgEditorSrc]       = useState(null);
  const [imgEditorTarget, setImgEditorTarget] = useState(null);
  const [translatedText, setTranslatedText]   = useState(null);
  const displayText = translatedText ?? post.text;

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

  const handlePostReact = async (emoji) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const current = postReactions[emoji] || [];
    const hasMe = current.includes(uid);
    const newList = hasMe ? current.filter(u => u !== uid) : [...current, uid];
    setPostReactions(prev => ({ ...prev, [emoji]: newList }));
    const updates = { [`reactions.${emoji}`]: hasMe ? arrayRemove(uid) : arrayUnion(uid) };
    if (emoji === "❤️") {
      updates.likedBy = hasMe ? arrayRemove(uid) : arrayUnion(uid);
      updates.likesCount = newList.length;
      if (!hasMe && post.authorId && post.authorId !== uid) {
        const fromName = currentUserProfile
          ? `${currentUserProfile.firstName || ""} ${currentUserProfile.lastName || ""}`.trim()
          : currentUser.email;
        addDoc(collection(db, "notifications"), {
          toUserId: post.authorId, fromUserId: uid, fromUserName: fromName,
          fromUserAvatar: currentUserProfile?.avatarUrl || null,
          type: "post_like", postId: post.id,
          createdAt: new Date().toISOString(), read: false,
        }).catch(() => {});
      }
    }
    await updateDoc(doc(db, "posts", post.id), updates);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !currentUser || postingComment) return;
    setPostingComment(true);
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const u = userSnap.data() || {};
    const actorName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || currentUser.email;
    await addDoc(collection(db, "posts", post.id, "comments"), {
      authorId: currentUser.uid,
      authorName: actorName,
      authorAvatar: u.photoURL || u.avatarUrl || null,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      ...(replyingTo ? { parentId: replyingTo.id } : {}),
    });
    await updateDoc(doc(db, "posts", post.id), {
      commentCount: (post.commentCount || 0) + 1,
    });
    logActivity({ type: "comment", actorId: currentUser.uid, actorName, targetId: post.id, targetType: "post", details: { text: commentText.trim().slice(0, 150) } });
    if (post.authorId && post.authorId !== currentUser.uid) {
      addDoc(collection(db, "notifications"), {
        toUserId: post.authorId,
        fromUserId: currentUser.uid,
        fromUserName: actorName,
        fromUserAvatar: u.photoURL || u.avatarUrl || null,
        type: "post_comment",
        postId: post.id,
        message: commentText.trim().slice(0, 100),
        createdAt: new Date().toISOString(),
        read: false,
      }).catch(() => {});
    }
    setCommentText("");
    setReplyingTo(null);
    setPostingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    const cmt = comments.find(c => c.id === commentId);
    await deleteDoc(doc(db, "posts", post.id, "comments", commentId));
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    logActivity({ type: "comment_delete", actorId: currentUser.uid, targetId: commentId, targetType: "comment", details: { postId: post.id, text: cmt?.text?.slice(0, 100) } });
  };

  const handleEditComment = async (commentId, newText) => {
    if (!newText) return;
    await updateDoc(doc(db, "posts", post.id, "comments", commentId), {
      text: newText, edited: true, editedAt: new Date().toISOString(),
    });
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, text: newText, edited: true } : c));
    logActivity({ type: "comment_edit", actorId: currentUser.uid, targetId: commentId, targetType: "comment", details: { postId: post.id, newText: newText.slice(0, 150) } });
  };

  const handleCommentReact = async (commentId, emoji) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const cmt = comments.find(c => c.id === commentId);
    const current = cmt?.reactions?.[emoji] || [];
    const hasMe = current.includes(uid);
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      const r = { ...(c.reactions || {}), [emoji]: hasMe ? (c.reactions?.[emoji] || []).filter(u => u !== uid) : [...(c.reactions?.[emoji] || []), uid] };
      return { ...c, reactions: r };
    }));
    await updateDoc(doc(db, "posts", post.id, "comments", commentId), {
      [`reactions.${emoji}`]: hasMe ? arrayRemove(uid) : arrayUnion(uid),
    });
  };

  const handleSaveEdit = async () => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      const removedMedia = (post.media || []).filter(
        orig => !editMedia.some(m => m.url === orig.url)
      );
      for (const m of removedMedia) {
        if (m.storagePath) {
          try { await deleteObject(ref(storage, m.storagePath)); } catch (_) {}
        }
      }
      const uploadedMedia = [];
      for (const file of editNewFiles) {
        const storagePath = `posts/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedMedia.push({ url, storagePath, type: file.type.startsWith("video") ? "video" : "image" });
      }
      await updateDoc(doc(db, "posts", post.id), {
        text: editText.trim(),
        media: [...editMedia, ...uploadedMedia],
        editedAt: new Date().toISOString(),
      });
      setEditingId(null);
      setEditNewFiles([]);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleApplyImageEdit = (blob) => {
    const file = new File([blob], "edited.jpg", { type: "image/jpeg" });
    if (imgEditorTarget.kind === "existing") {
      setEditMedia(prev => prev.filter((_, i) => i !== imgEditorTarget.index));
      setEditNewFiles(prev => [...prev, file]);
    } else {
      setEditNewFiles(prev => prev.map((f, i) => i === imgEditorTarget.index ? file : f));
    }
    setImgEditorSrc(null);
    setImgEditorTarget(null);
  };

  const canEdit   = currentUser?.uid === post.authorId || isAdmin;
  const canDelete = currentUser?.uid === post.authorId || isAdmin;
  const commentCount = post.commentCount || 0;

  return (
    <article
      id={`post-${post.id}`}
      className="card slide-up"
      style={{
        marginBottom: "1.25rem",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        border: post.birthdayAutoPost ? "1.5px solid #6da3d4" : post.isPinned ? "1px solid var(--brand-light)" : "1px solid var(--border)",
        boxShadow: post.birthdayAutoPost ? "0 8px 28px rgba(68,114,184,0.18)" : post.isPinned ? "0 8px 28px rgba(184,97,122,0.12)" : "var(--shadow-sm)",
        background: "var(--bg-primary)",
      }}
    >
      {post.birthdayAutoPost && (
        <div style={{
          background: "linear-gradient(90deg, #4472b8, #6da3d4)",
          padding: "8px 18px",
          fontSize: 12, fontWeight: 700, color: "#fff",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid #6da3d4",
        }}>
          <CakeIcon size={15} color="#fff" /> {t.community.birthdayCelebration}
          {post.birthdayUserAvatar ? (
            <img src={post.birthdayUserAvatar} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", marginLeft: "auto", border: "1.5px solid rgba(255,255,255,0.6)" }} alt="" />
          ) : (
            <span style={{ marginLeft: "auto", display: "flex" }}><SparkleIcon size={18} color="rgba(255,255,255,0.9)" /></span>
          )}
        </div>
      )}
      {!post.birthdayAutoPost && post.isPinned && (
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
                {translateProfession(post.authorProfession, lang)}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {timeAgo(post.createdAt, t)}
            {post.editedAt && <span style={{ marginLeft: 4 }}>· {t.common.edited}</span>}
          </p>
        </div>

        {(canEdit || canDelete || isAdmin) && (
          <div style={{ display: "flex", gap: 4 }}>
            {isAdmin && onPin && (
              <button
                onClick={() => onPin(post.id, !post.isPinned)}
                title={post.isPinned ? "Unpin post" : "Pin post"}
                style={{ padding: "5px 10px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600, background: post.isPinned ? "var(--brand-pale)" : "none", border: `1px solid ${post.isPinned ? "var(--brand-light)" : "var(--border)"}`, color: post.isPinned ? "var(--brand-dark)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-pale)"; e.currentTarget.style.color = "var(--brand-dark)"; e.currentTarget.style.borderColor = "var(--brand-light)"; }}
                onMouseLeave={(e) => { if (!post.isPinned) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; } }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l6 6-4 1-3 5-2-2-5 5-1-1 5-5-2-2 5-3 1-4z"/></svg>
                {post.isPinned ? "Pinned" : "Pin"}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { setEditingId(post.id); setEditText(post.text || ""); setEditMedia(post.media || []); setEditNewFiles([]); }}
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
            {(editMedia.length > 0 || editNewFiles.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {editMedia.map((m, i) => (
                  <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                    {m.type === "image" ? (
                      <img src={m.url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--r-sm)" }} />
                    ) : (
                      <video src={m.url} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--r-sm)" }} />
                    )}
                    {m.type === "image" && (
                      <button
                        onClick={() => { setImgEditorSrc(m.url); setImgEditorTarget({ kind: "existing", index: i }); }}
                        title="Edit image"
                        style={{ position: "absolute", bottom: 2, left: 2, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    <button
                      onClick={() => setEditMedia(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
                {editNewFiles.map((file, i) => (
                  <div key={`new-${i}`} style={{ position: "relative", width: 80, height: 80 }}>
                    {file.type.startsWith("video") ? (
                      <div style={{ width: 80, height: 80, borderRadius: "var(--r-sm)", background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      </div>
                    ) : (
                      <img src={URL.createObjectURL(file)} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--r-sm)" }} />
                    )}
                    {!file.type.startsWith("video") && (
                      <button
                        onClick={() => { setImgEditorSrc(URL.createObjectURL(file)); setImgEditorTarget({ kind: "new", index: i }); }}
                        title="Edit image"
                        style={{ position: "absolute", bottom: 2, left: 2, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    <button
                      onClick={() => setEditNewFiles(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => editFileInputRef.current?.click()}
                style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: 12, cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Add media
              </button>
              <input
                ref={editFileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  setEditNewFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                  e.target.value = "";
                }}
              />
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => { setEditingId(null); setEditNewFiles([]); }} style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "none", fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={savingEdit} style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", background: "var(--brand)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: savingEdit ? "not-allowed" : "pointer", opacity: savingEdit ? 0.7 : 1 }}>{savingEdit ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        ) : (<>
          {post.text && (
            <TranslateButton
              text={post.text}
              isTranslated={!!translatedText}
              onTranslated={t => setTranslatedText(t)}
              onReverted={() => setTranslatedText(null)}
            />
          )}
          {post.text && <p style={{ fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{renderTextWithLinks(displayText)}</p>}
        </>)}

        {post.repostOf && (
          <div
            style={{
              background: "var(--bg-secondary)", borderRadius: "var(--r-md)",
              padding: "0.85rem 1rem",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--brand)",
              marginTop: post.text ? 10 : 0,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onClick={() => {
              const el = document.getElementById(`post-${post.repostOf.id}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-dark)", marginBottom: 4 }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); if (post.repostOf.authorId) onViewProfile?.(post.repostOf.authorId); }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
              >↻ {post.repostOf.authorName}</span>
            </p>
            {post.repostOf.text && (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap", maxHeight: "90px", overflowY: "auto" }}>
                {renderTextWithLinks(post.repostOf.text.length > 280 ? post.repostOf.text.slice(0, 280) + "…" : post.repostOf.text)}
              </p>
            )}
            {post.repostOf.media?.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: post.repostOf.media.length === 1 ? "1fr" : "repeat(2, 1fr)",
                gap: 3, marginTop: post.repostOf.text ? 8 : 0,
              }}>
                {post.repostOf.media.map((m, i) =>
                  m.type === "image" ? (
                    <img key={i} src={m.url} alt="" style={{
                      width: "100%", height: "auto", display: "block", cursor: "pointer", borderRadius: "var(--r-sm)",
                    }} onClick={() => window.open(m.url, "_blank")} />
                  ) : (
                    <video key={i} src={m.url} controls style={{ width: "100%", maxHeight: 360, borderRadius: "var(--r-sm)" }} />
                  )
                )}
              </div>
            )}
            {!post.repostOf.text && !(post.repostOf.media?.length > 0) && (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>(media post)</p>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      {editingId !== post.id && post.media?.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: post.media.length === 1 ? "1fr" : "repeat(2, 1fr)",
          gap: 3, margin: "0.75rem 0 0",
        }}>
          {post.media.map((m, i) =>
            m.type === "image" ? (
              <img key={i} src={m.url} alt="" style={{
                width: "100%", height: "auto", display: "block", cursor: "pointer",
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
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      }}>
        {currentUser && (
          <div style={{ marginRight: 4 }}>
            <EmojiReactions reactions={postReactions} currentUid={currentUser.uid} onReact={handlePostReact} />
          </div>
        )}

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

        {currentUser && (
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

        {/* Happy Birthday quick reply — only on birthday auto-posts */}
        {post.birthdayAutoPost && currentUser && (
          <button
            onClick={() => { setCommentText(t.community.happyBirthday); setShowComments(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: "var(--r-full)",
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
              color: "#1d4896",
              border: "1.5px solid #93c5fd",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              transition: "all var(--t-fast)", marginLeft: "auto",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(68,114,184,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #dbeafe, #eff6ff)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <CakeIcon size={14} color="#1d4896" /> {t.community.happyBirthday}
          </button>
        )}

      </div>

      {/* Repost composer modal — rendered via portal so position:fixed escapes any parent transform */}
      {showRepostModal && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,40,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem", backdropFilter: "blur(8px)" }}
          onClick={() => { setShowRepostModal(false); setRepostThoughts(""); }}
        >
          <div
            style={{ background: "var(--bg-primary)", borderRadius: "var(--r-xl)", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{t.community.repost}</span>
              <button onClick={() => { setShowRepostModal(false); setRepostThoughts(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Compose area */}
            <div style={{ padding: "1rem 1.25rem 0", display: "flex", gap: 12 }}>
              <Avatar url={currentUserProfile?.photoURL || currentUserProfile?.avatarUrl} name={`${currentUserProfile?.firstName || ""} ${currentUserProfile?.lastName || ""}`.trim()} size={42} />
              <textarea
                autoFocus
                value={repostThoughts}
                onChange={(e) => setRepostThoughts(e.target.value)}
                placeholder={t.community.addThoughtsPlaceholder}
                rows={3}
                style={{
                  flex: 1, border: "none", outline: "none", resize: "none",
                  fontSize: 15, background: "transparent", color: "var(--text-primary)",
                  lineHeight: 1.65, fontFamily: "var(--font)",
                }}
              />
            </div>

            {/* Quoted post preview */}
            <div style={{ margin: "0.85rem 1.25rem 1rem 1.25rem", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1rem", display: "flex", gap: 9, alignItems: "center", borderBottom: post.media?.length ? "1px solid var(--border)" : "none" }}>
                <Avatar url={post.authorAvatar} name={post.authorName} size={30} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{post.authorName}</span>
              </div>
              {post.text && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, padding: "0.65rem 1rem", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {post.text.length > 220 ? post.text.slice(0, 220) + "…" : post.text}
                </p>
              )}
              {post.media?.length > 0 && (
                <img src={post.media[0].url} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "0.75rem 1.25rem 1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => { setShowRepostModal(false); setRepostThoughts(""); }} style={{ padding: "9px 18px", borderRadius: "var(--r-full)", border: "1px solid var(--border)", background: "none", fontSize: 13, cursor: "pointer", color: "var(--text-secondary)", fontWeight: 500 }}>{t.common.cancel}</button>
              <button
                onClick={() => { onRepost(post, repostThoughts.trim()); setShowRepostModal(false); setRepostThoughts(""); }}
                style={{ padding: "9px 22px", borderRadius: "var(--r-full)", background: "var(--brand)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px var(--brand-glow)" }}
              >{t.community.repost}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: "0.75rem 1.35rem 1.1rem", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          {loadingComments && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>{t.common.loading}</p>}

          {comments.filter(c => !c.parentId).map(topComment => {
            const replies = comments.filter(c => c.parentId === topComment.id);
            const collapsed = collapsedReplies.has(topComment.id);
            const toggleReplies = () => setCollapsedReplies(prev => {
              const next = new Set(prev);
              collapsed ? next.delete(topComment.id) : next.add(topComment.id);
              return next;
            });
            return (
              <div key={topComment.id}>
                <CommentItem
                  comment={topComment}
                  currentUid={currentUser?.uid}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteComment}
                  onEdit={handleEditComment}
                  onReply={(r) => setReplyingTo(r)}
                  onReact={handleCommentReact}
                />
                {replies.length > 0 && (
                  <div style={{ marginLeft: 38 }}>
                    <button onClick={toggleReplies} style={{
                      fontSize: 11, fontWeight: 600, color: "var(--brand)",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "3px 0 2px", display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                      {collapsed ? `Show ${replies.length} repl${replies.length === 1 ? "y" : "ies"}` : "Hide replies"}
                    </button>
                    {!collapsed && (
                      <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>
                        {replies.map(reply => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUid={currentUser?.uid}
                            isAdmin={isAdmin}
                            onDelete={handleDeleteComment}
                            onEdit={handleEditComment}
                            onReply={() => setReplyingTo({ id: topComment.id, authorName: reply.authorName })}
                            onReact={handleCommentReact}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {currentUser && (
            <div style={{ marginTop: 12 }}>
              {replyingTo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "var(--bg-tertiary)", borderRadius: "var(--r-sm)", marginBottom: 6, border: "1px solid var(--border)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
                    Replying to <strong style={{ color: "var(--text-primary)" }}>{replyingTo.authorName}</strong>
                  </span>
                  <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                    placeholder={replyingTo ? `Reply to ${replyingTo.authorName}…` : t.community.commentPlaceholder}
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
            </div>
          )}
        </div>
      )}

      {imgEditorSrc && (
        <ImageEditorModal
          imageSrc={imgEditorSrc}
          onClose={() => { setImgEditorSrc(null); setImgEditorTarget(null); }}
          onApply={handleApplyImageEdit}
        />
      )}
    </article>
  );
}

/* ── Gemini rewrite helper ── */
async function geminiRewrite(text, lang = "he") {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key || !text?.trim()) return null;
  const prompt = lang === "he"
    ? `שפר את הטקסט הבא לפוסט מקצועי ברשת עמיתות. שמור על הטון האישי. החזר רק את הטקסט המשופר, ללא הסברים:\n\n${text}`
    : lang === "ar"
    ? `حسّن النص التالي ليكون منشوراً مهنياً. احتفظ بالأسلوب الشخصي. أعد النص المحسّن فقط:\n\n${text}`
    : `Improve the following text for a professional alumni network post. Keep the personal tone. Return only the improved text:\n\n${text}`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

/* ── Compose box ── */
function ComposeBox({ currentUser, profile, onPost }) {
  const { t, lang } = useLang();
  const [text, setText]                       = useState("");
  const [files, setFiles]                     = useState([]);
  const [posting, setPosting]                 = useState(false);
  const [focused, setFocused]                 = useState(false);
  const [imgEditorSrc, setImgEditorSrc]       = useState(null);
  const [imgEditorIndex, setImgEditorIndex]   = useState(null);
  const [aiRewriting, setAiRewriting]         = useState(false);
  const fileRef = useRef();

  const handlePost = async () => {
    if ((!text.trim() && files.length === 0) || posting) return;
    setPosting(true);
    try {
      const mediaUrls = [];
      for (const file of files) {
        const storagePath = `posts/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        mediaUrls.push({ url, storagePath, type: file.type.startsWith("video") ? "video" : "image" });
      }
      const authorName = profile ? `${profile.firstName} ${profile.lastName}` : currentUser.email;
      const docRef = await addDoc(collection(db, "posts"), {
        text: text.trim(),
        media: mediaUrls,
        authorId: currentUser.uid,
        authorName,
        authorAvatar: profile?.photoURL || profile?.avatarUrl || null,
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
        <Avatar url={profile?.photoURL || profile?.avatarUrl} name={profile ? `${profile.firstName} ${profile.lastName}` : ""} size={42} />
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

          {text?.trim()?.length > 10 && (
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!import.meta.env.VITE_GEMINI_KEY) {
                    alert("AI rewriting requires a Gemini API key. Add VITE_GEMINI_KEY to your .env file.");
                    return;
                  }
                  setAiRewriting(true);
                  const improved = await geminiRewrite(text, lang);
                  if (improved) setText(improved);
                  setAiRewriting(false);
                }}
                disabled={aiRewriting}
                title={!import.meta.env.VITE_GEMINI_KEY ? "Gemini API key not configured" : "Improve your post with AI"}
                style={{
                  fontSize:11, fontWeight:700, padding:"5px 12px",
                  borderRadius:99, border:"1.5px solid var(--brand,#4472b8)",
                  background:"none", color:"var(--brand,#4472b8)",
                  cursor: aiRewriting ? "wait" : "pointer",
                  display:"flex", alignItems:"center", gap:5,
                  opacity: aiRewriting ? 0.6 : 1,
                }}
              >
                {aiRewriting ? "✨ Rewriting..." : "✨ Improve with AI"}
              </button>
            </div>
          )}

          {files.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {files.map((f, i) =>
                f.type.startsWith("image") ? (
                  <div key={i} style={{ position: "relative", width: 76, height: 76 }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 76, height: 76, borderRadius: "var(--r-md)", objectFit: "cover", border: "1px solid var(--border)" }} />
                    <button
                      onClick={() => { setImgEditorSrc(URL.createObjectURL(f)); setImgEditorIndex(i); }}
                      title="Edit image"
                      style={{ position: "absolute", bottom: 2, left: 2, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
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

          {imgEditorSrc && (
            <ImageEditorModal
              imageSrc={imgEditorSrc}
              onClose={() => { setImgEditorSrc(null); setImgEditorIndex(null); }}
              onApply={(blob) => {
                const file = new File([blob], "edited.jpg", { type: "image/jpeg" });
                setFiles((p) => p.map((f, i) => i === imgEditorIndex ? file : f));
                setImgEditorSrc(null);
                setImgEditorIndex(null);
              }}
            />
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

const CakeIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 2.5a.75.75 0 0 0-.75.75c0 .64.75 1.25.75 1.25s.75-.61.75-1.25A.75.75 0 0 0 12 2.5zM8 5.5a.75.75 0 0 0-.75.75c0 .64.75 1.25.75 1.25s.75-.61.75-1.25A.75.75 0 0 0 8 5.5zm8 0a.75.75 0 0 0-.75.75c0 .64.75 1.25.75 1.25s.75-.61.75-1.25A.75.75 0 0 0 16 5.5zM4 10a1 1 0 0 0-1 1v3h18v-3a1 1 0 0 0-1-1H4zm-1 5v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6H3z"/>
  </svg>
);

const SparkleIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

const BalloonSVG = ({ size = 22, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <ellipse cx="12" cy="9" rx="7" ry="8.5" fill={color}/>
    <path d="M10.5 17.5Q12 19.5 13.5 17.5" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M12 19.5Q13 21 12 22.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <ellipse cx="9.5" cy="6.5" rx="1.5" ry="2" fill="rgba(255,255,255,0.4)"/>
  </svg>
);

function BirthdayWishButton({ birthdayUserId, currentUser, currentUserProfile }) {
  const { t } = useLang();
  const [wishData, setWishData] = useState(null);
  const [clicking, setClicking] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [showBalloons, setShowBalloons] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const docId = `${birthdayUserId}_${todayStr}`;

  useEffect(() => {
    const ref = doc(db, "birthdayWishes", docId);
    return onSnapshot(
      ref,
      (snap) => {
        setWishData(snap.exists() ? snap.data() : { count: 0, wishers: [] });
      },
      () => {
        setWishData({ count: 0, wishers: [] });
      }
    );
  }, [docId]);

  const hasWished = wishData?.wishers?.includes(currentUser?.uid);
  const count = wishData?.count || 0;

  const handleClick = async () => {
    if (hasWished || clicking || !currentUser) return;
    setClicking(true);
    try {
      const ref = doc(db, "birthdayWishes", docId);
      await setDoc(ref, {
        birthdayUserId,
        date: todayStr,
        count: (wishData?.count || 0) + 1,
        wishers: arrayUnion(currentUser.uid),
      }, { merge: true });
      const fromName = `${currentUserProfile?.firstName || ""} ${currentUserProfile?.lastName || ""}`.trim() || currentUser.email || "";
      const fromAvatar = currentUserProfile?.photoURL || currentUserProfile?.avatarUrl || null;
      await addDoc(collection(db, "notifications"), {
        toUserId: birthdayUserId,
        fromUserId: currentUser.uid,
        fromUserName: fromName,
        fromUserAvatar: fromAvatar,
        type: "birthday_wish",
        createdAt: new Date().toISOString(),
        read: false,
      });
      await addDoc(collection(db, "users", birthdayUserId, "birthdayWishes"), {
        fromUserId: currentUser.uid,
        fromName,
        fromAvatar,
        message: "🎈",
        createdAt: new Date().toISOString(),
      });
      setJustSent(true);
      setShowBalloons(true);
      setTimeout(() => setJustSent(false), 2000);
    } catch (e) {
      console.error("Birthday wish failed:", e);
    } finally {
      setClicking(false);
    }
  };

  if (!currentUser) return null;

  const isSelf = currentUser.uid === birthdayUserId;

  if (isSelf) {
    return (
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: "7px 0",
        borderRadius: "var(--r-full)",
        background: count > 0
          ? "linear-gradient(135deg, #4472b8, #6da3d4)"
          : "linear-gradient(135deg, rgba(68,114,184,0.12), rgba(109,163,212,0.12))",
        color: count > 0 ? "#fff" : "#4472b8",
        border: count > 0 ? "none" : "1.5px solid rgba(68,114,184,0.35)",
        fontSize: 12, fontWeight: 700,
      }}>
        <BalloonSVG size={15} color={count > 0 ? "#fff" : "#4472b8"} />
        {count > 0 ? count : ""}
      </div>
    );
  }

  return (
    <>
      {showBalloons && <BalloonsEffect onDone={() => setShowBalloons(false)} />}
      <button
        onClick={handleClick}
        disabled={hasWished || clicking}
        title={hasWished ? t.community.birthdayWishSent : t.community.birthdayBalloonTooltip}
        style={{
          flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          padding: "7px 0",
          borderRadius: "var(--r-full)",
          background: hasWished
            ? "linear-gradient(135deg, #4472b8, #6da3d4)"
            : "linear-gradient(135deg, rgba(68,114,184,0.12), rgba(109,163,212,0.12))",
          color: hasWished ? "#fff" : "#4472b8",
          border: hasWished ? "none" : "1.5px solid rgba(68,114,184,0.35)",
          fontSize: 12, fontWeight: 700, cursor: hasWished ? "default" : "pointer",
          transition: "all 0.2s",
          transform: justSent ? "scale(1.06)" : "scale(1)",
        }}
      >
        <BalloonSVG size={15} color={hasWished ? "#fff" : "#4472b8"} />
        {justSent ? t.community.birthdayWishSent : count > 0 ? count : ""}
      </button>
    </>
  );
}

/* ── Birthday hero card ── */
function BirthdaysCard({ birthdays, onViewProfile, currentUserUid, currentUser, currentUserProfile }) {
  const { t } = useLang();
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
        <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}><CakeIcon size={32} color="var(--text-muted)" /></div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.community.birthdayNoneThisWeek}</p>
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
            "linear-gradient(135deg, #4472b8 0%, #6da3d4 55%, #daeaf8 100%)",
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
          ><CakeIcon size={22} color="#fff" /></div>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em",
              opacity: 0.85,
            }}>{t.community.birthdayThisWeek}</p>
            <p style={{
              fontSize: 17, fontWeight: 700,
              fontFamily: "var(--font-display)",
              lineHeight: 1.1, marginTop: 2,
            }}>{t.community.birthdaysTitle}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0.75rem 1rem 1rem" }}>
        {today.map((u) => {
          const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
          const canSend = onViewProfile && u.id !== currentUserUid;
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
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 16, height: 16, borderRadius: "50%",
                    background: "var(--brand)", lineHeight: 1,
                  }}><CakeIcon size={10} color="#fff" /></span>
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
                  }}>{t.community.today.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <BirthdayWishButton
                  birthdayUserId={u.id}
                  currentUser={currentUser}
                  currentUserProfile={currentUserProfile}
                />
                {canSend && (
                  <button
                    onClick={() => onViewProfile(u.id)}
                    style={{
                      flex: 1,
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
                    {t.community.birthdaySendWishes}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {upcoming.length > 0 && today.length > 0 && (
          <p style={{
            fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: 6, paddingLeft: 4,
          }}>{t.community.birthdayComingUp}</p>
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
                  {formatBirthday(u.birthDate ?? u.birthdate)} · {t.community.inDays(u.daysUntil)}
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: "var(--brand-dark)",
                background: "var(--brand-pale)",
                padding: "2px 8px",
                borderRadius: "var(--r-full)",
              }}>
                {t.community.birthdayDaysShort(u.daysUntil)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main CommunityPage ── */
export default function CommunityPage({ onViewProfile, onMessage, initialPostId, onPostConsumed, onNavigateToHelpPost }) {
  const { t } = useLang();
  const { user, profile: authProfile } = useAuth();
  const isMobile = useIsMobile();
  const [posts, setPosts]           = useState([]);
  const [birthdays, setBirthdays]   = useState([]);
  const [usersAvatarMap, setUsersAvatarMap] = useState({});
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showMobileBdays, setShowMobileBdays] = useState(false);
  const autoPostedRef = useRef(new Set());
  const scrolledToPostRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  useEffect(() => {
    const BDAY_TTL = 24 * 60 * 60 * 1000;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const allPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      allPosts.forEach(p => {
        if (p.birthdayAutoPost && p.createdAt && now - new Date(p.createdAt).getTime() > BDAY_TTL) {
          deletePostWithCleanup(p.id).catch(() => {});
        }
      });
      setPosts(allPosts.filter(p => {
        if (!p.birthdayAutoPost || !p.createdAt) return true;
        return now - new Date(p.createdAt).getTime() <= BDAY_TTL;
      }));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!initialPostId || loading || scrolledToPostRef.current) return;
    scrolledToPostRef.current = true;
    const el = document.getElementById(`post-${initialPostId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow 0.3s ease";
      el.style.boxShadow = "0 0 0 3px #4472b8, 0 8px 28px rgba(68,114,184,0.25)";
      setTimeout(() => { el.style.boxShadow = ""; }, 2000);
    }
    onPostConsumed?.();
  }, [initialPostId, loading]);

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const avatarMap = {};
      users.forEach((u) => {
        if (u.id) avatarMap[u.id] = u.photoURL || u.avatarUrl || null;
      });
      setUsersAvatarMap(avatarMap);
      const upcoming = users
        .filter((u) => !u.blacklisted)
        .map((u) => ({ ...u, daysUntil: isBirthdaySoon(u.birthDate ?? u.birthdate) }))
        .filter((u) => u.daysUntil !== null)
        .sort((a, b) => a.daysUntil - b.daysUntil);
      setBirthdays(upcoming);
    });
  }, []);

  /* Auto-post on someone's birthday — once per day, deduplicated via Firestore check */
  useEffect(() => {
    if (!user || !profile || loading) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayBdays = birthdays.filter((u) => u.daysUntil === 0);
    if (!todayBdays.length) return;

    todayBdays.forEach(async (bdayUser) => {
      const key = `${bdayUser.id}-${todayStr}`;
      if (autoPostedRef.current.has(key)) return;
      autoPostedRef.current.add(key);

      // Check current posts state first to avoid a flash while the Firestore query is in-flight
      if (posts.some(p => p.birthdayAutoPost && p.birthdayUserId === bdayUser.id && p.createdAt?.startsWith(todayStr))) return;

      const q = query(collection(db, "posts"), where("birthdayUserId", "==", bdayUser.id));
      const snap = await getDocs(q);
      const alreadyPosted = snap.docs.some(
        (d) => d.data().birthdayAutoPost && d.data().createdAt?.startsWith(todayStr)
      );
      if (alreadyPosted) return;

      const name = `${bdayUser.firstName || ""} ${bdayUser.lastName || ""}`.trim() || "a member";
      await addDoc(collection(db, "posts"), {
        text: t.community.birthdayAutoPostText(name),
        media: [],
        authorId: user.uid,
        authorName: "BogrotNet",
        authorAvatar: "/NewLogoNGO.png",
        authorProfession: "Community",
        likesCount: 0, likedBy: [], commentCount: 0,
        isPinned: false,
        birthdayAutoPost: true,
        birthdayUserId: bdayUser.id,
        birthdayUserName: name,
        birthdayUserAvatar: bdayUser.photoURL || bdayUser.avatarUrl || null,
        createdAt: new Date().toISOString(),
      });
    });
  }, [birthdays, loading, user, profile]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm(t?.community?.confirmDelete || "Delete this post?")) return;
    await deletePostWithCleanup(postId);
    logActivity({ type: "post_delete", actorId: user.uid, actorName: `${authProfile?.firstName || ""} ${authProfile?.lastName || ""}`.trim(), targetId: postId, targetType: "post" });
  };

  const handlePinPost = async (postId, pin) => {
    await updateDoc(doc(db, "posts", postId), { isPinned: pin });
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
        media: originalPost.media || [],
        authorName: originalPost.authorName,
        authorAvatar: originalPost.authorAvatar || null,
        authorId: originalPost.authorId || null,
      },
    });
  };

  const blockedIds = authProfile?.isAdmin ? [] : (authProfile?.blockedUsers || []);
  const visiblePosts = posts.filter(p => p.birthdayAutoPost || !blockedIds.includes(p.authorId));
  const pinnedPosts  = visiblePosts.filter((p) => p.isPinned);
  const regularPosts = visiblePosts.filter((p) => !p.isPinned);

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-secondary)", position: "relative", maxWidth: "100%" }}>
      {/* Floating bubble background */}
      <style>{`
        @keyframes comm-blob-1{0%,100%{border-radius:62% 38% 52% 48%/44% 56% 44% 56%;transform:translate(0,0) scale(1);}33%{border-radius:40% 60% 65% 35%/58% 42% 62% 38%;transform:translate(-18px,-30px) scale(1.04);}66%{border-radius:55% 45% 38% 62%/36% 60% 40% 64%;transform:translate(14px,22px) scale(0.97);}}
        @keyframes comm-blob-2{0%,100%{border-radius:52% 48% 60% 40%/44% 56% 48% 52%;transform:translate(0,0) rotate(0deg);}50%{border-radius:38% 62% 44% 56%/60% 40% 56% 44%;transform:translate(24px,-20px) rotate(4deg);}}
        @keyframes comm-sb-0{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-22px) scale(1.06)}}
        @keyframes comm-sb-1{0%,100%{transform:translateY(-8px)}50%{transform:translateY(16px)}}
        @keyframes comm-sb-2{0%,100%{transform:translateY(5px) scale(0.96)}50%{transform:translateY(-20px) scale(1.04)}}
        @keyframes comm-sb-3{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes comm-sb-4{0%,100%{transform:translateY(-4px) scale(1)}50%{transform:translateY(12px) scale(1.08)}}
        @keyframes comm-sb-5{0%,100%{transform:translateY(0) scale(1.02)}50%{transform:translateY(-18px) scale(0.97)}}
        @keyframes comm-sb-6{0%,100%{transform:translateY(-6px)}50%{transform:translateY(20px)}}
      `}</style>
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", width:"55%", height:"110%", top:"-15%", right:"-8%",
          background:"radial-gradient(ellipse at center, rgba(68,114,184,0.08) 0%, transparent 68%)",
          animation:"comm-blob-1 28s ease-in-out infinite", willChange:"border-radius, transform" }}/>
        <div style={{ position:"absolute", width:"42%", height:"75%", top:"25%", left:"-6%",
          background:"radial-gradient(ellipse at center, rgba(68,114,184,0.06) 0%, transparent 68%)",
          animation:"comm-blob-2 22s 4s ease-in-out infinite", willChange:"border-radius, transform" }}/>
        <div style={{ position:"absolute", width:"35%", height:"55%", top:"-4%", left:"22%",
          background:"radial-gradient(ellipse at center, rgba(232,115,90,0.06) 0%, transparent 68%)",
          animation:"comm-blob-1 32s 8s ease-in-out infinite", willChange:"border-radius, transform" }}/>
        {[{s:30,t:"12%",l:-6,c:"rgba(68,114,184,0.12)",a:"comm-sb-0",d:"21s"},{s:18,t:"35%",l:8,c:"rgba(68,114,184,0.08)",a:"comm-sb-1",d:"26s"},{s:38,t:"58%",l:-8,c:"rgba(68,114,184,0.07)",a:"comm-sb-2",d:"19s"},{s:22,t:"78%",l:5,c:"rgba(232,115,90,0.08)",a:"comm-sb-3",d:"23s"}].map((b,i)=>(
          <div key={`cl${i}`} style={{ position:"absolute", width:b.s, height:b.s, borderRadius:"50%",
            top:b.t, left:b.l, background:b.c, animation:`${b.a} ${b.d} ${i*3}s ease-in-out infinite` }}/>
        ))}
        {[{s:26,t:"18%",r:-4,c:"rgba(232,115,90,0.10)",a:"comm-sb-4",d:"24s"},{s:34,t:"42%",r:-10,c:"rgba(68,114,184,0.07)",a:"comm-sb-5",d:"20s"},{s:20,t:"65%",r:6,c:"rgba(232,115,90,0.08)",a:"comm-sb-6",d:"27s"},{s:30,t:"82%",r:-6,c:"rgba(68,114,184,0.09)",a:"comm-sb-0",d:"22s"}].map((b,i)=>(
          <div key={`cr${i}`} style={{ position:"absolute", width:b.s, height:b.s, borderRadius:"50%",
            top:b.t, right:b.r, background:b.c, animation:`${b.a} ${b.d} ${i*4+2}s ease-in-out infinite` }}/>
        ))}
      </div>
      <div style={{
        maxWidth: 1040, width: "100%", margin: "0 auto",
        padding: isMobile ? "0.75rem 0.75rem 2rem" : "0.75rem 1.5rem 2rem",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 280px",
        gap: "1.5rem",
        position: "relative", zIndex: 1,
        alignItems: "start",
      }}>

        {/* Center: Feed */}
        <div style={{ minWidth: 0, order: 1 }}>

          {/* Mobile birthday banner */}
          {isMobile && birthdays.length > 0 && (
            <div style={{
              marginBottom: "0.75rem",
              borderRadius: "var(--r-xl)",
              overflow: "hidden",
              border: "1px solid var(--brand-light)",
              background: "var(--bg-primary)",
            }}>
              <button
                onClick={() => setShowMobileBdays((v) => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "linear-gradient(135deg, #4472b8 0%, #6da3d4 100%)",
                  color: "#fff", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CakeIcon size={16} color="#fff" />
                  <span>
                    {birthdays.filter((b) => b.daysUntil === 0).length > 0
                      ? t.community.birthdayBannerToday(birthdays.filter((b) => b.daysUntil === 0).map((b) => `${b.firstName || ""} ${b.lastName || ""}`.trim()).join(", "))
                      : t.community.birthdayBannerUpcoming(birthdays.length)}
                  </span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showMobileBdays ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showMobileBdays && (
                <div style={{ padding: "0.75rem 1rem 1rem" }}>
                  <BirthdaysCard
                    birthdays={birthdays}
                    onViewProfile={onViewProfile}
                    currentUserUid={user?.uid}
                    currentUser={user}
                    currentUserProfile={profile}
                  />
                </div>
              )}
            </div>
          )}

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
            <PostCard key={p.id} post={{ ...p, authorAvatar: p.authorAvatar || usersAvatarMap[p.authorId] || null }} currentUser={user} currentUserProfile={authProfile} isAdmin={authProfile?.isAdmin}
              onDelete={handleDeletePost} onRepost={handleRepost}
              onViewProfile={onViewProfile} onMessage={onMessage}
              onPin={handlePinPost}
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
            <PostCard key={p.id} post={{ ...p, authorAvatar: p.authorAvatar || usersAvatarMap[p.authorId] || null }} currentUser={user} currentUserProfile={authProfile} isAdmin={authProfile?.isAdmin}
              onDelete={handleDeletePost} onRepost={handleRepost}
              onViewProfile={onViewProfile} onMessage={onMessage}
              onPin={handlePinPost}
            />
          ))}
        </div>

        {/* Right sidebar — hidden on mobile */}
        <aside style={{
          display: isMobile ? "none" : "flex", flexDirection: "column", gap: "1rem",
          position: "sticky", top: "1.5rem",
          maxHeight: "calc(100vh - 120px)", overflowY: "auto",
          order: 2,
        }}>

          <BirthdaysCard
            birthdays={birthdays}
            onViewProfile={onViewProfile}
            currentUserUid={user?.uid}
            currentUser={user}
            currentUserProfile={profile}
          />
          <HelpPostsWidget onPostClick={onNavigateToHelpPost} />
          <SlideshowBanner />

        </aside>
      </div>
    </div>
  );
}
