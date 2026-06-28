import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, addDoc, getDocs, deleteDoc, doc, query,
  orderBy, onSnapshot, serverTimestamp, updateDoc, increment,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { getOrCreateConversation, sendHelpRequestPrompt } from "./hooks/useMessages";

/* ─── inline translations ─── */
const FT = {
  he: {
    feedTitle: "פוסטים לעזרה",
    feedSub: "פרסמי בקשה לעזרה — קהילת הבוגרות כאן לתמוך",
    createBtn: "פרסמי בקשת עזרה",
    createTitle: "בקשת עזרה חדשה",
    contentPh: "במה את צריכה עזרה? תארי את הנושא...",
    addLink: "הוסיפי קישור",
    addImage: "הוסיפי תמונה",
    linkPh: "הדביקי קישור כאן...",
    tagsLbl: "תייגי לפי נושא",
    tagsPh: "בחרי נושאים רלוונטיים",
    publishBtn: "פרסמי",
    publishing: "מפרסמת...",
    cancel: "ביטול",
    comment: "תגובה",
    reply: "ענה",
    repost: "שתפי",
    reposted: "שותף",
    requestHelp: "בקשי עזרה ישירה",
    deletePost: "מחקי",
    noPostsYet: "אין פוסטים עדיין — היי הראשונה לפרסם!",
    commentsTitle: (n) => `${n} תגובות`,
    replyTo: "תגובה ל",
    addComment: "הוסיפי תגובה...",
    sendComment: "שלחי",
    repostConfirm: "שתפי את הפוסט?",
    repostNote: "הפוסט המקורי יוצג עם קישור למקור.",
    repostDo: "שתפי",
    originalPost: "פוסט מקורי מאת",
    viewOriginal: "לפוסט המקורי",
    areaLabels: [
      "קידום קריירה ותעסוקה","פיתוח מנהיגות וניהול","ניהול צוותים",
      "חיבור למגזר הציבורי","חיבור למגזר הפרטי","הובלת מאבקים אזרחיים",
      "יזמות עסקית וחברתית","ניהול קמפיינים פוליטיים","התמודדות לתפקידים",
      "ניהול פיננסי","אוזן קשבת",
    ],
    showReplies: (n) => `הצגת ${n} תגובות`,
    hideReplies: "הסתרי תגובות",
    editPost: "ערכי",
    justNow: "עכשיו",
    ago: "לפני",
    minutes: "דקות",
    hours: "שעות",
    days: "ימים",
  },
  en: {
    feedTitle: "Help Posts",
    feedSub: "Post a help request — the alumni community is here to support you",
    createBtn: "Post a Help Request",
    createTitle: "New Help Request",
    contentPh: "What do you need help with? Describe the topic...",
    addLink: "Add a link",
    addImage: "Add an image",
    linkPh: "Paste a link here...",
    tagsLbl: "Tag by topic",
    tagsPh: "Choose relevant topics",
    publishBtn: "Publish",
    publishing: "Publishing...",
    cancel: "Cancel",
    comment: "Comment",
    reply: "Reply",
    repost: "Repost",
    reposted: "Reposted",
    requestHelp: "Request Direct Help",
    deletePost: "Delete",
    noPostsYet: "No posts yet — be the first to post!",
    commentsTitle: (n) => `${n} comment${n !== 1 ? "s" : ""}`,
    replyTo: "Reply to",
    addComment: "Add a comment...",
    sendComment: "Send",
    repostConfirm: "Repost this?",
    repostNote: "The original post will be shown with a link to the source.",
    repostDo: "Repost",
    originalPost: "Original post by",
    viewOriginal: "View original",
    areaLabels: [
      "Career advancement","Leadership & management","Team management",
      "Public sector connections","Private sector connections","Civil activism",
      "Business & social entrepreneurship","Political campaign management",
      "Running for office","Financial management","Emotional support",
    ],
    showReplies: (n) => `Show ${n} repl${n !== 1 ? "ies" : "y"}`,
    hideReplies: "Hide replies",
    editPost: "Edit",
    justNow: "Just now",
    ago: "ago",
    minutes: "min",
    hours: "h",
    days: "d",
  },
  ar: {
    feedTitle: "منشورات المساعدة",
    feedSub: "انشري طلب مساعدة — مجتمع الخريجات هنا لدعمك",
    createBtn: "انشري طلب مساعدة",
    createTitle: "طلب مساعدة جديد",
    contentPh: "بماذا تحتاجين المساعدة؟ صفي الموضوع...",
    addLink: "أضيفي رابطاً",
    addImage: "أضيفي صورة",
    linkPh: "الصقي رابطاً هنا...",
    tagsLbl: "وسّمي حسب الموضوع",
    tagsPh: "اختاري مواضيع ذات صلة",
    publishBtn: "انشري",
    publishing: "جارٍ النشر...",
    cancel: "إلغاء",
    comment: "تعليق",
    reply: "ردّ",
    repost: "أعيدي النشر",
    reposted: "أعيد نشره",
    requestHelp: "طلب مساعدة مباشرة",
    deletePost: "حذف",
    noPostsYet: "لا توجد منشورات بعد — كوني الأولى في النشر!",
    commentsTitle: (n) => `${n} تعليقات`,
    replyTo: "رداً على",
    addComment: "أضيفي تعليقاً...",
    sendComment: "أرسلي",
    repostConfirm: "إعادة نشر هذا المنشور؟",
    repostNote: "سيظهر المنشور الأصلي مع رابط للمصدر.",
    repostDo: "أعيدي النشر",
    originalPost: "منشور أصلي بقلم",
    viewOriginal: "الانتقال للمنشور الأصلي",
    areaLabels: [
      "التقدم الوظيفي","القيادة والإدارة","إدارة الفرق",
      "التواصل مع القطاع العام","التواصل مع القطاع الخاص","النشاط المدني",
      "ريادة الأعمال","إدارة الحملات السياسية","الترشح للمناصب",
      "الإدارة المالية","الدعم العاطفي",
    ],
    showReplies: (n) => `عرض ${n} ردود`,
    hideReplies: "إخفاء الردود",
    editPost: "تعديل",
    justNow: "الآن",
    ago: "منذ",
    minutes: "دقيقة",
    hours: "ساعة",
    days: "يوم",
  },
};

const AREAS_KEYS = [
  "קידום קריירה ותעסוקה","פיתוח מנהיגות וניהול","ניהול צוותים",
  "חיבור למגזר הציבורי","חיבור למגזר הפרטי","הובלת מאבקים אזרחיים",
  "יזמות עסקית וחברתית","ניהול קמפיינים פוליטיים","התמודדות לתפקידים",
  "ניהול פיננסי","אוזן קשבת",
];

function timeAgo(ts, Tr) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return Tr.justNow;
  if (diff < 3600) return `${Tr.ago} ${Math.floor(diff / 60)} ${Tr.minutes}`;
  if (diff < 86400) return `${Tr.ago} ${Math.floor(diff / 3600)} ${Tr.hours}`;
  return `${Tr.ago} ${Math.floor(diff / 86400)} ${Tr.days}`;
}

function Avatar({ photoURL, name, size = 36 }) {
  if (photoURL) return (
    <img src={photoURL} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#4472b8,#e8735a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontSize: size * 0.38, fontWeight: 700 }}>{(name || "?")[0].toUpperCase()}</span>
    </div>
  );
}

/* ── Create Post Modal ── */
function CreatePostModal({ onClose, onPublished, Tr, lang, isRTL }) {
  const { user, profile } = useAuth();
  const { dark } = useTheme();
  const [content, setContent] = useState("");
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [tags, setTags] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const imgRef = useRef();

  const toggleTag = (key) => setTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setLinkMode(false);
    setLink("");
  };

  const handlePublish = async () => {
    if (!content.trim() || publishing) return;
    setPublishing(true);
    try {
      let attachmentType = "none", attachmentUrl = null, attachmentName = null;
      if (imgFile) {
        const path = `helpPostAttachments/${user.uid}/${Date.now()}_${imgFile.name}`;
        const snap = await uploadBytes(storageRef(storage, path), imgFile);
        attachmentUrl = await getDownloadURL(snap.ref);
        attachmentType = "image";
        attachmentName = imgFile.name;
      } else if (link.trim()) {
        attachmentType = "link";
        attachmentUrl = link.trim();
      }
      const postRef = await addDoc(collection(db, "helpPosts"), {
        authorUid: user.uid,
        authorDisplayName: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || user.email,
        authorPhotoURL: profile?.photoURL || null,
        content: content.trim(),
        tags,
        attachmentType,
        attachmentUrl,
        attachmentName,
        repostOf: null,
        repostCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      onPublished({ id: postRef.id });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-primary)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: "1.5rem", direction: isRTL ? "rtl" : "ltr" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{Tr.createTitle}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={Tr.contentPh}
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", resize: "vertical",
            padding: "12px 14px", borderRadius: 13, fontSize: 14,
            border: "1.5px solid var(--border)", background: "var(--bg-secondary)",
            color: "var(--text-primary)", fontFamily: "inherit", outline: "none",
            direction: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Attachment row */}
        <div style={{ display: "flex", gap: 8, marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => { setLinkMode(v => !v); setImgFile(null); setImgPreview(null); }}
            style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, border: `1.5px solid ${linkMode ? "#4472b8" : "var(--border)"}`, background: linkMode ? (dark ? "rgba(68,114,184,0.2)" : "#eef4ff") : "var(--bg-secondary)", color: linkMode ? "#1d4896" : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            🔗 {Tr.addLink}
          </button>
          <button onClick={() => imgRef.current?.click()}
            style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, border: `1.5px solid ${imgFile ? "#4472b8" : "var(--border)"}`, background: imgFile ? (dark ? "rgba(68,114,184,0.2)" : "#eef4ff") : "var(--bg-secondary)", color: imgFile ? "#1d4896" : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            📷 {Tr.addImage}
          </button>
          <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} />
        </div>

        {linkMode && (
          <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder={Tr.linkPh}
            style={{ marginTop: "0.5rem", width: "100%", boxSizing: "border-box", padding: "9px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none", direction: "ltr" }}
          />
        )}

        {imgPreview && (
          <div style={{ marginTop: "0.5rem", position: "relative", display: "inline-block" }}>
            <img src={imgPreview} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, objectFit: "contain" }} />
            <button onClick={() => { setImgFile(null); setImgPreview(null); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", color: "#fff", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        )}

        {/* Tags */}
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{Tr.tagsLbl}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {AREAS_KEYS.map((key, i) => {
              const active = tags.includes(key);
              return (
                <button key={key} onClick={() => toggleTag(key)} style={{
                  padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${active ? "#4472b8" : "var(--border)"}`,
                  background: active ? (dark ? "rgba(68,114,184,0.2)" : "#eef4ff") : "var(--bg-secondary)",
                  color: active ? "#1d4896" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {active && "✓ "}{Tr.areaLabels[i]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: "1.25rem", justifyContent: isRTL ? "flex-start" : "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 12, border: "1.5px solid var(--border)", background: "none", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{Tr.cancel}</button>
          <button onClick={handlePublish} disabled={!content.trim() || publishing}
            style={{ padding: "9px 22px", borderRadius: 12, border: "none", background: "#4472b8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: content.trim() && !publishing ? "pointer" : "not-allowed", opacity: !content.trim() ? 0.5 : 1, fontFamily: "inherit" }}>
            {publishing ? Tr.publishing : Tr.publishBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Comments Section ── */
function CommentsSection({ postId, postAuthorUid, Tr, isRTL, onRequestHelp }) {
  const { user, profile } = useAuth();
  const { dark } = useTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // {id, authorDisplayName}
  const [showReplies, setShowReplies] = useState({});

  useEffect(() => {
    const q = query(collection(db, "helpPosts", postId, "comments"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [postId]);

  const sendComment = async () => {
    if (!text.trim() || sending || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, "helpPosts", postId, "comments"), {
        authorUid: user.uid,
        authorDisplayName: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || user.email,
        authorPhotoURL: profile?.photoURL || null,
        content: text.trim(),
        parentId: replyTo?.id || null,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "helpPosts", postId), { commentCount: increment(1) });
      setText("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const topLevel = comments.filter(c => !c.parentId);
  const replies = (parentId) => comments.filter(c => c.parentId === parentId);

  const CommentRow = ({ c, depth = 0 }) => {
    const reps = replies(c.id);
    const shown = showReplies[c.id];
    return (
      <div style={{ paddingInlineStart: depth * 28, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Avatar photoURL={c.authorPhotoURL} name={c.authorDisplayName} size={30} />
          <div style={{ flex: 1, background: "var(--bg-secondary)", borderRadius: 12, padding: "8px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{c.authorDisplayName}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(c.createdAt, Tr)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{c.content}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, paddingInlineStart: 38, marginTop: 3 }}>
          {depth === 0 && user && (
            <button onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, authorDisplayName: c.authorDisplayName })}
              style={{ fontSize: 11, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, fontFamily: "inherit" }}>
              {Tr.reply}
            </button>
          )}
          {postAuthorUid === user?.uid && c.authorUid !== user?.uid && (
            <button onClick={() => onRequestHelp(c.authorUid, c.authorDisplayName)}
              style={{ fontSize: 11, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "#4472b8", padding: 0, fontFamily: "inherit" }}>
              {Tr.requestHelp}
            </button>
          )}
        </div>
        {depth === 0 && reps.length > 0 && (
          <div style={{ paddingInlineStart: 38, marginTop: 4 }}>
            <button onClick={() => setShowReplies(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
              style={{ fontSize: 11, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "#4472b8", padding: 0, fontFamily: "inherit" }}>
              {shown ? Tr.hideReplies : Tr.showReplies(reps.length)}
            </button>
            {shown && reps.map(r => <CommentRow key={r.id} c={r} depth={1} />)}
          </div>
        )}
        {replyTo?.id === c.id && (
          <div style={{ paddingInlineStart: 38, marginTop: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendComment()}
                placeholder={`${Tr.replyTo} ${c.authorDisplayName}...`}
                style={{ flex: 1, padding: "7px 12px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 12, fontFamily: "inherit", outline: "none", direction: isRTL ? "rtl" : "ltr" }}
              />
              <button onClick={sendComment} disabled={!text.trim() || sending}
                style={{ padding: "7px 14px", borderRadius: 10, background: "#4472b8", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {Tr.sendComment}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return null;

  return (
    <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", direction: isRTL ? "rtl" : "ltr" }}>
      {topLevel.map(c => <CommentRow key={c.id} c={c} />)}

      {user && !replyTo && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Avatar photoURL={profile?.photoURL} name={profile?.firstName || user.email} size={30} />
          <div style={{ flex: 1, display: "flex", gap: 6 }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendComment()}
              placeholder={Tr.addComment}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none", direction: isRTL ? "rtl" : "ltr" }}
            />
            <button onClick={sendComment} disabled={!text.trim() || sending}
              style={{ padding: "8px 14px", borderRadius: 10, background: "#4472b8", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {Tr.sendComment}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Help Request Modal (inline, minimal) ── */
function HelpRequestModal({ toUid: toUserId, toName, fromProfile, user, onClose, onSent, lang }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const dir = lang === "he" || lang === "ar" ? "rtl" : "ltr";

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const fromName = `${fromProfile?.firstName || ""} ${fromProfile?.lastName || ""}`.trim() || user.email;
      const reqRef = await addDoc(collection(db, "helpRequests"), {
        fromUserId: user.uid,
        fromUserName: fromName,
        fromUserEmail: user.email,
        fromUserProfession: fromProfile?.profession || fromProfile?.currentRole || "",
        fromUserPhotoURL: fromProfile?.photoURL || null,
        toUserId: toUserId,
        toUserName: toName,
        message: msg.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      // also open/create a DM conversation and send the request as a prompt
      try {
        const p1 = fromProfile || { firstName: user.email, lastName: "", photoURL: null };
        const p2 = { firstName: toName, lastName: "", photoURL: null };
        const convId = await getOrCreateConversation(user.uid, toUserId, p1, p2);
        await sendHelpRequestPrompt(convId, user.uid, fromName, reqRef.id, msg.trim(), [toUserId]);
      } catch (dmErr) {
        console.error("DM send error:", dmErr);
      }
      onSent();
      onClose();
    } catch (err) {
      console.error("Help request error:", err);
    } finally {
      setSending(false);
    }
  };

  const labels = {
    he: { title: "שלחי בקשת עזרה", to: "אל:", msgPh: "במה את צריכה עזרה? (אופציונלי)", send: "שלחי", cancel: "ביטול" },
    en: { title: "Send Help Request", to: "To:", msgPh: "What do you need help with? (optional)", send: "Send", cancel: "Cancel" },
    ar: { title: "أرسلي طلب مساعدة", to: "إلى:", msgPh: "بماذا تحتاجين المساعدة؟ (اختياري)", send: "أرسلي", cancel: "إلغاء" },
  }[lang] || labels.en;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-primary)", borderRadius: 20, width: "100%", maxWidth: 420, padding: "1.5rem", direction: dir }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{labels.title}</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>{labels.to} <strong>{toName}</strong></p>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={labels.msgPh} rows={3}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", direction: dir }} />
        <div style={{ display: "flex", gap: 8, marginTop: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 10, border: "1.5px solid var(--border)", background: "none", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{labels.cancel}</button>
          <button onClick={send} disabled={sending} style={{ padding: "8px 18px", borderRadius: 10, background: "#4472b8", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{labels.send}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Single Post Card ── */
function PostCard({ post, onDeleted, onReposted, Tr, lang, isRTL, onViewProfile }) {
  const { user, profile } = useAuth();
  const { dark } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const [repostConfirm, setRepostConfirm] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [helpReqModal, setHelpReqModal] = useState(null); // {uid, name}
  const [helpReqSent, setHelpReqSent] = useState(false);

  const isOwn = user?.uid === post.authorUid;
  const dir = isRTL ? "rtl" : "ltr";

  const handleDelete = async () => {
    if (!window.confirm(lang === "he" ? "למחוק את הפוסט?" : lang === "ar" ? "حذف المنشور؟" : "Delete this post?")) return;
    await deleteDoc(doc(db, "helpPosts", post.id));
    onDeleted(post.id);
  };

  const handleRepost = async () => {
    if (reposting) return;
    setReposting(true);
    setRepostConfirm(false);
    try {
      const newPost = {
        authorUid: user.uid,
        authorDisplayName: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || user.email,
        authorPhotoURL: profile?.photoURL || null,
        content: "",
        tags: post.tags || [],
        attachmentType: "none",
        attachmentUrl: null,
        attachmentName: null,
        repostOf: {
          postId: post.repostOf?.postId || post.id,
          authorUid: post.repostOf?.authorUid || post.authorUid,
          authorDisplayName: post.repostOf?.authorDisplayName || post.authorDisplayName,
          authorPhotoURL: post.repostOf?.authorPhotoURL || post.authorPhotoURL,
          content: post.repostOf?.content || post.content,
          attachmentType: post.repostOf?.attachmentType || post.attachmentType,
          attachmentUrl: post.repostOf?.attachmentUrl || post.attachmentUrl,
        },
        repostCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "helpPosts"), newPost);
      await updateDoc(doc(db, "helpPosts", post.repostOf?.postId || post.id), { repostCount: increment(1) });
      onReposted({ id: ref.id, ...newPost });
    } finally {
      setReposting(false);
    }
  };

  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#fff";

  return (
    <div style={{ background: cardBg, border: "1.5px solid var(--border)", borderRadius: 16, padding: "1rem 1.25rem", direction: dir }}>
      {/* Author row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }} onClick={() => onViewProfile && onViewProfile(post.authorUid)}>
          <Avatar photoURL={post.authorPhotoURL} name={post.authorDisplayName} size={38} />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{post.authorDisplayName}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(post.createdAt, Tr)}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Tags */}
          {(post.tags || []).slice(0, 2).map(key => {
            const idx = AREAS_KEYS.indexOf(key);
            return idx >= 0 ? (
              <span key={key} style={{ background: dark ? "rgba(68,114,184,0.18)" : "#eef4ff", color: "#4472b8", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px" }}>
                {Tr.areaLabels[idx]}
              </span>
            ) : null;
          })}
          {isOwn && (
            <button onClick={handleDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, lineHeight: 1 }} title={Tr.deletePost}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && <p style={{ margin: "0 0 0.75rem", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content}</p>}

      {/* Attachment */}
      {post.attachmentType === "image" && post.attachmentUrl && (
        <img src={post.attachmentUrl} alt="" style={{ width: "100%", borderRadius: 10, maxHeight: 320, objectFit: "cover", marginBottom: "0.75rem", display: "block" }} />
      )}
      {post.attachmentType === "link" && post.attachmentUrl && (
        <a href={post.attachmentUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", marginBottom: "0.75rem", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, color: "#4472b8", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          🔗 {post.attachmentUrl}
        </a>
      )}

      {/* Repost attribution */}
      {post.repostOf && (
        <div style={{ border: "1.5px solid var(--border)", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "0.75rem", background: "var(--bg-secondary)" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
            {Tr.originalPost} {post.repostOf.authorDisplayName}
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{post.repostOf.content}</p>
          {post.repostOf.attachmentType === "image" && post.repostOf.attachmentUrl && (
            <img src={post.repostOf.attachmentUrl} alt="" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover" }} />
          )}
          {post.repostOf.attachmentType === "link" && post.repostOf.attachmentUrl && (
            <a href={post.repostOf.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4472b8" }}>
              🔗 {post.repostOf.attachmentUrl}
            </a>
          )}
          {post.repostOf.postId && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#4472b8", cursor: "pointer" }}>{Tr.viewOriginal} →</p>
          )}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--border)", marginTop: showComments ? "0" : "0" }}>
        <button onClick={() => setShowComments(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {Tr.comment} {post.commentCount > 0 ? `(${post.commentCount})` : ""}
        </button>

        {!isOwn && (
          <button onClick={() => setRepostConfirm(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            {Tr.repost} {post.repostCount > 0 ? `(${post.repostCount})` : ""}
          </button>
        )}

        {/* Request direct help (non-owner can request help from post author) */}
        {!isOwn && user && !helpReqSent && (
          <button onClick={() => setHelpReqModal({ uid: post.authorUid, name: post.authorDisplayName })}
            style={{ marginInlineStart: "auto", padding: "5px 14px", borderRadius: 99, background: "#4472b8", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {Tr.requestHelp}
          </button>
        )}
        {helpReqSent && (
          <span style={{ marginInlineStart: "auto", fontSize: 11, color: "#4ade80", fontWeight: 700 }}>✓</span>
        )}
      </div>

      {showComments && (
        <CommentsSection postId={post.id} postAuthorUid={post.authorUid} Tr={Tr} isRTL={isRTL}
          onRequestHelp={(uid, name) => setHelpReqModal({ uid, name })} />
      )}

      {/* Repost confirm */}
      {repostConfirm && (
        <div style={{ marginTop: "0.75rem", background: "var(--bg-secondary)", borderRadius: 12, padding: "0.75rem", border: "1px solid var(--border)" }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{Tr.repostConfirm}</p>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)" }}>{Tr.repostNote}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setRepostConfirm(false)} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "none", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{Tr.cancel}</button>
            <button onClick={handleRepost} disabled={reposting} style={{ padding: "6px 14px", borderRadius: 8, background: "#4472b8", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{Tr.repostDo}</button>
          </div>
        </div>
      )}

      {helpReqModal && (
        <HelpRequestModal
          toUid={helpReqModal.uid} toName={helpReqModal.name}
          fromProfile={profile} user={user} lang={lang}
          onClose={() => setHelpReqModal(null)}
          onSent={() => setHelpReqSent(true)}
        />
      )}
    </div>
  );
}

/* ── Main Feed ── */
export default function HelpPostFeed({ onViewProfile, compact = false }) {
  const { user, profile } = useAuth();
  const { lang, isRTL } = useLang();
  const { dark } = useTheme();
  const isMobile = useIsMobile();
  const Tr = FT[lang] || FT.he;
  const dir = isRTL ? "rtl" : "ltr";

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "helpPosts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Simple FYP: posts matching user's helpAreas or profession float up
      const userTags = new Set([
        ...(profile?.helpAreas || []),
        ...(profile?.profession ? [profile.profession] : []),
      ]);
      const scored = raw.map(p => ({
        ...p,
        _score: (p.tags || []).filter(t => userTags.has(t)).length,
      }));
      if (userTags.size > 0) {
        scored.sort((a, b) => b._score - a._score || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      }
      setPosts(scored);
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  const handleDeleted = useCallback((id) => setPosts(prev => prev.filter(p => p.id !== id)), []);
  const handleReposted = useCallback((newPost) => setPosts(prev => [newPost, ...prev]), []);
  const handlePublished = useCallback(() => {}, []);

  if (compact) {
    // Compact widget for homepage/community sidebar
    return (
      <div style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{Tr.feedTitle}</p>
        </div>
        {loading ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>...</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>{Tr.noPostsYet}</div>
        ) : (
          <div>
            {posts.slice(0, 3).map(post => (
              <div key={post.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", direction: dir }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <Avatar photoURL={post.authorPhotoURL} name={post.authorDisplayName} size={26} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{post.authorDisplayName}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginInlineStart: "auto" }}>{timeAgo(post.createdAt, Tr)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {post.repostOf ? `${Tr.reposted}: ${post.repostOf.content}` : post.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ direction: dir }}>
      {/* Header + Create button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 800, color: "var(--text-primary)" }}>{Tr.feedTitle}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{Tr.feedSub}</p>
        </div>
        {user && (
          <button onClick={() => setCreateOpen(true)}
            style={{ padding: "9px 18px", borderRadius: 12, background: "#4472b8", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            + {Tr.createBtn}
          </button>
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)", fontSize: 14 }}>{Tr.noPostsYet}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} Tr={Tr} lang={lang} isRTL={isRTL}
              onDeleted={handleDeleted} onReposted={handleReposted} onViewProfile={onViewProfile} />
          ))}
        </div>
      )}

      {createOpen && (
        <CreatePostModal
          onClose={() => setCreateOpen(false)}
          onPublished={handlePublished}
          Tr={Tr} lang={lang} isRTL={isRTL}
        />
      )}
    </div>
  );
}

/* ── Compact widget export for sidebar use ── */
export function HelpPostsWidget({ lang }) {
  return <HelpPostFeed compact />;
}
