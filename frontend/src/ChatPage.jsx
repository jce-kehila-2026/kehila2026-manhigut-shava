import { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import {
  useConversations, useMessages,
  sendMessage, getOrCreateConversation, markRead, setTyping,
} from "./hooks/useMessages";

/* ── Helpers ── */
function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts), today = new Date(), yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}
function getInitials(name) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
}
function timeAgoShort(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ── Avatar ── */
function Avatar({ url, name, size = 40, online = false, ring = false }) {
  const colors = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#dc2626", "#d97706", "#db2777"];
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        padding: ring ? 2 : 0,
        background: ring ? "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" : "transparent",
        flexShrink: 0,
      }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: bg }}>
          {url ? (
            <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: size * 0.34, fontWeight: 700,
            }}>{getInitials(name)}</div>
          )}
        </div>
      </div>
      {online && (
        <span style={{
          position: "absolute", bottom: ring ? 3 : 1, right: ring ? 3 : 1,
          width: size * 0.27, height: size * 0.27, borderRadius: "50%",
          background: "#22c55e", border: `2px solid var(--bg-primary)`,
        }} />
      )}
    </div>
  );
}

/* ── Conversation item ── */
function ConvItem({ conv, active, currentUid, allUsers, onClick }) {
  const otherId = conv.participants?.find((p) => p !== currentUid);
  const otherName = conv.participantNames?.[otherId] || "Unknown";
  const otherAvatar = conv.participantAvatars?.[otherId] || null;
  const otherUser = allUsers.find((u) => u.id === otherId);
  const isOnline = otherUser?.isOnline || false;
  const unread = conv.unreadCounts?.[currentUid] || 0;
  const lastMsg = conv.lastMessage;

  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px",
      background: active ? "rgba(0,0,0,0.04)" : "transparent",
      border: "none", cursor: "pointer", textAlign: "left",
      transition: "background 0.15s",
    }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Avatar url={otherAvatar} name={otherName} size={52} online={isOnline} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
            {otherName}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
            {lastMsg ? timeAgoShort(lastMsg.createdAt) : ""}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{
            fontSize: 13, margin: 0,
            color: unread > 0 ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: unread > 0 ? 600 : 400,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 155,
          }}>
            {lastMsg?.text || "Start a conversation…"}
          </p>
          {unread > 0 && (
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--brand)", flexShrink: 0, marginLeft: 4,
            }} />
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Message bubble (Instagram style) ── */
function MessageBubble({ msg, isMe, senderAvatar, senderName, showAvatar, showTime, isLastInGroup }) {
  const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🎉"];
  const [showPicker, setShowPicker] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);

  const myBubbleStyle = {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    borderRadius: "22px 22px 6px 22px",
    padding: "10px 15px",
    fontSize: 14, lineHeight: 1.5,
    wordBreak: "break-word",
    maxWidth: "100%",
    position: "relative",
    boxShadow: "0 1px 4px rgba(37,99,235,0.2)",
  };

  const theirBubbleStyle = {
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    borderRadius: "22px 22px 22px 6px",
    padding: "10px 15px",
    fontSize: 14, lineHeight: 1.5,
    wordBreak: "break-word",
    maxWidth: "100%",
    position: "relative",
    border: "1px solid var(--border)",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 6,
      paddingInlineStart: isMe ? "3rem" : "0.75rem",
      paddingInlineEnd: isMe ? "0.75rem" : "3rem",
      marginBottom: isLastInGroup ? 8 : 2,
    }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setShowPicker(false); }}
    >
      {/* Avatar — only shown at bottom of their group */}
      {!isMe && (
        <div style={{ width: 28, flexShrink: 0, alignSelf: "flex-end" }}>
          {showAvatar ? <Avatar url={senderAvatar} name={senderName} size={28} /> : null}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 2, maxWidth: "70%" }}>
        {/* Reply preview */}
        {msg.replyTo && (
          <div style={{
            background: isMe ? "rgba(255,255,255,0.15)" : "var(--bg-secondary)",
            borderLeft: `3px solid ${isMe ? "rgba(255,255,255,0.5)" : "var(--brand)"}`,
            borderRadius: 8, padding: "4px 10px", marginBottom: 2,
            fontSize: 11, color: isMe ? "rgba(255,255,255,0.75)" : "var(--text-secondary)",
            maxWidth: "100%", overflow: "hidden",
          }}>
            <p style={{ fontWeight: 700, fontSize: 10, marginBottom: 1, opacity: 0.8 }}>{msg.replyTo.senderName}</p>
            <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.replyTo.text}</p>
          </div>
        )}

        {/* Bubble + reaction picker */}
        <div style={{ position: "relative" }}>
          <div style={isMe ? myBubbleStyle : theirBubbleStyle}>
            {msg.deleted
              ? <em style={{ opacity: 0.5, fontSize: 13 }}>Message deleted</em>
              : msg.text
            }
          </div>

          {/* Reaction picker on hover */}
          {hovering && !msg.deleted && (
            <div style={{
              position: "absolute",
              top: -38,
              [isMe ? "right" : "left"]: 0,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 99,
              padding: "5px 10px",
              display: "flex", gap: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              zIndex: 20, animation: "popIn 0.15s ease",
              whiteSpace: "nowrap",
            }}>
              {EMOJIS.map((e) => (
                <button key={e} style={{
                  fontSize: 18, padding: "2px 4px", background: "none", border: "none",
                  cursor: "pointer", borderRadius: 6, transition: "transform 0.1s",
                  lineHeight: 1,
                }}
                  onMouseEnter={(ev) => ev.currentTarget.style.transform = "scale(1.4)"}
                  onMouseLeave={(ev) => ev.currentTarget.style.transform = "scale(1)"}
                >{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Emoji reactions */}
        {reactionEntries.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
            {reactionEntries.map(([emoji, users]) => (
              <span key={emoji} style={{
                background: "var(--bg-primary)", border: "1px solid var(--border)",
                borderRadius: 99, padding: "1px 6px",
                fontSize: 12, display: "flex", alignItems: "center", gap: 3, cursor: "pointer",
              }}>
                {emoji}
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{users.length}</span>
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {showTime && (
          <span style={{ fontSize: 10, color: "var(--text-muted)", margin: "1px 2px", opacity: hovering ? 1 : 0.6, transition: "opacity 0.2s" }}>
            {formatTime(msg.createdAt)}
          </span>
        )}
      </div>

      {/* Hover reply button */}
      {hovering && (
        <div style={{
          alignSelf: "center",
          opacity: hovering ? 1 : 0,
          transition: "opacity 0.15s",
        }}>
          <button
            data-reply-btn
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: "4px",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main ChatPage ── */
export default function ChatPage({ onUnreadChange }) {
  const { user, profile } = useAuth();
  const { conversations } = useConversations(user?.uid);
  const [activeConvId, setActiveConvId] = useState(null);
  const { messages } = useMessages(activeConvId);

  const [text, setText] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) =>
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConvId && user) markRead(activeConvId, user.uid);
  }, [activeConvId, messages.length]);

  useEffect(() => {
    const total = conversations.reduce((sum, c) => sum + (c.unreadCounts?.[user?.uid] || 0), 0);
    onUnreadChange?.(total);
  }, [conversations]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherId = activeConv?.participants?.find((p) => p !== user?.uid);
  const otherUser = allUsers.find((u) => u.id === otherId);
  const otherName = activeConv?.participantNames?.[otherId] || "";
  const otherAvatar = activeConv?.participantAvatars?.[otherId] || null;

  /* "Seen" — show when other user has read all messages */
  const lastMyMsgIdx = messages.map((m, i) => m.senderId === user?.uid ? i : -1).filter(i => i >= 0).pop();
  const otherHasSeen = (activeConv?.unreadCounts?.[otherId] || 0) === 0 && lastMyMsgIdx !== undefined;

  const handleSend = async () => {
    if (!text.trim() || !activeConvId || sending) return;
    setSending(true);
    const t = text, r = replyTo;
    setText(""); setReplyTo(null);
    try { await sendMessage(activeConvId, user.uid, t, r); }
    finally { setSending(false); }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!activeConvId) return;
    setTyping(activeConvId, user.uid, true);
    clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => setTyping(activeConvId, user.uid, false), 2000));
  };

  const handleNewConversation = async (targetUser) => {
    if (!user) return;
    const myProfile = profile || {
      firstName: user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "",
      lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
      avatarUrl: user.photoURL || null,
    };
    try {
      const convId = await getOrCreateConversation(user.uid, targetUser.id, myProfile, targetUser);
      setActiveConvId(convId);
      setShowNewChat(false);
      setUserSearch("");
    } catch (e) {
      console.error("Failed to open conversation:", e);
    }
  };

  const getDateLabel = (msg, prev) => {
    if (!prev) return formatDateLabel(msg.createdAt);
    if (formatDateLabel(msg.createdAt) !== formatDateLabel(prev.createdAt)) return formatDateLabel(msg.createdAt);
    return null;
  };

  const isTypingIndicator = activeConv?.typing
    ? Object.entries(activeConv.typing).filter(([uid, val]) => uid !== user?.uid && val).length > 0
    : false;

  const filteredConvs = conversations.filter((c) => {
    const oid = c.participants?.find((p) => p !== user?.uid);
    return (c.participantNames?.[oid] || "").toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = allUsers
    .filter((u) => u.id !== user?.uid)
    .filter((u) => !userSearch || `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", fontFamily: "var(--font)", background: "var(--bg-primary)" }}>

      {/* ── Left: Conversations sidebar ── */}
      <aside style={{
        width: 320, minWidth: 320,
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "1rem 1rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Direct Messages</p>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              title="New conversation"
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: showNewChat ? "var(--brand)" : "var(--bg-tertiary)",
                color: showNewChat ? "#fff" : "var(--text-secondary)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              {showNewChat ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              )}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: "100%", padding: "8px 12px 8px 32px",
                border: "none", borderRadius: 99,
                background: "var(--bg-tertiary)",
                fontSize: 13, color: "var(--text-primary)",
                outline: "none", fontFamily: "var(--font)",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* New chat picker */}
        {showNewChat && (
          <div style={{
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border)",
            padding: "0.75rem",
            maxHeight: 260, overflow: "auto",
            animation: "slideDown 0.18s ease",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              New message
            </p>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search people…"
                style={{
                  width: "100%", padding: "7px 10px 7px 28px",
                  border: "none", borderRadius: 99,
                  background: "var(--bg-tertiary)",
                  fontSize: 13, color: "var(--text-primary)",
                  outline: "none", fontFamily: "var(--font)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {filteredUsers.map((u) => (
              <button key={u.id} onClick={() => handleNewConversation(u)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 4px", background: "transparent", border: "none",
                cursor: "pointer", borderRadius: "var(--r-sm)", textAlign: "left",
                transition: "background 0.15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <Avatar url={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size={36} online={u.isOnline} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{u.firstName} {u.lastName}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.profession || u.city || ""}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversation list */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {filteredConvs.length === 0 && (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>No conversations yet.</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Tap + to start messaging.</p>
            </div>
          )}
          {filteredConvs.map((conv) => (
            <ConvItem
              key={conv.id} conv={conv}
              active={conv.id === activeConvId}
              currentUid={user?.uid}
              allUsers={allUsers}
              onClick={() => setActiveConvId(conv.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Right: Chat area ── */}
      {activeConvId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>

          {/* Header */}
          <div style={{
            height: 60, display: "flex", alignItems: "center", gap: 12,
            padding: "0 1.25rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-primary)",
            flexShrink: 0,
          }}>
            <Avatar url={otherAvatar} name={otherName} size={40} online={otherUser?.isOnline} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.2 }}>{otherName}</p>
              <p style={{ fontSize: 11, color: otherUser?.isOnline ? "#22c55e" : "var(--text-muted)", marginTop: 1 }}>
                {otherUser?.isOnline ? "Active now" : otherUser?.profession || "Offline"}
              </p>
            </div>
            {/* Info icon */}
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, borderRadius: "50%", display: "flex" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflow: "auto", padding: "1.25rem 0 0.5rem" }}>

            {/* Empty state */}
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: "3rem 2rem" }}>
                <Avatar url={otherAvatar} name={otherName} size={72} />
                <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{otherName}</p>
                {otherUser?.profession && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{otherUser.profession}</p>}
                <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
                  This is the beginning of your conversation. Send a message to get started.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const isMe = msg.senderId === user?.uid;
              const dateLabel = getDateLabel(msg, prev);

              const senderProfile = allUsers.find((u) => u.id === msg.senderId);
              const senderName = senderProfile ? `${senderProfile.firstName} ${senderProfile.lastName}` : "";
              const senderAvatar = senderProfile?.avatarUrl || null;

              /* Last message in group = next is different sender or time gap > 3min */
              const isLastInGroup = !next || next.senderId !== msg.senderId ||
                (new Date(next.createdAt) - new Date(msg.createdAt)) > 3 * 60 * 1000;

              /* Show avatar at bottom of received group */
              const showAvatar = !isMe && isLastInGroup;

              /* Show time on last in group */
              const showTime = isLastInGroup;

              return (
                <div key={msg.id}>
                  {dateLabel && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 1.5rem 8px" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{dateLabel}</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}
                  <div
                    onClick={(e) => {
                      const replyBtn = e.currentTarget.querySelector("[data-reply-btn]");
                      if (replyBtn && e.target === replyBtn) {
                        setReplyTo({ id: msg.id, text: msg.text, senderName: isMe ? "You" : senderName });
                      }
                    }}
                  >
                    <MessageBubble
                      msg={msg} isMe={isMe}
                      senderName={senderName} senderAvatar={senderAvatar}
                      showAvatar={showAvatar} showTime={showTime}
                      isLastInGroup={isLastInGroup}
                    />
                  </div>
                  {/* Seen indicator below last sent message */}
                  {isMe && isLastInGroup && i === lastMyMsgIdx && otherHasSeen && (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, paddingInlineEnd: "0.75rem", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Seen</span>
                      <Avatar url={otherAvatar} name={otherName} size={14} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTypingIndicator && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: "4px 0.75rem 10px" }}>
                <Avatar url={otherAvatar} name={otherName} size={28} />
                <div style={{
                  background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                  borderRadius: "22px 22px 22px 6px",
                  padding: "10px 16px", display: "flex", gap: 5, alignItems: "center",
                }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div style={{
              margin: "0 0.75rem 4px",
              background: "var(--bg-tertiary)",
              borderLeft: "3px solid var(--brand)",
              borderRadius: 8, padding: "6px 12px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              animation: "slideUp 0.15s ease",
            }}>
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 2 }}>Replying to {replyTo.senderName}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
            </div>
          )}

          {/* Input bar — Instagram pill style */}
          <div style={{
            padding: "0.6rem 0.75rem 0.75rem",
            borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "flex-end", gap: 8,
            background: "var(--bg-primary)",
          }}>
            {/* Camera icon */}
            <button style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            {/* Text input */}
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTyping}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${otherName}…`}
                rows={1}
                style={{
                  width: "100%", padding: "10px 16px",
                  border: "1.5px solid var(--border)",
                  borderRadius: 22,
                  fontSize: 14, resize: "none",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  outline: "none", lineHeight: 1.5,
                  maxHeight: 100, overflow: "auto",
                  fontFamily: "var(--font)",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                }}
              />
            </div>

            {/* Send / Heart button */}
            {text.trim() ? (
              <button onClick={handleSend} disabled={sending} style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s, opacity 0.15s",
                boxShadow: "0 2px 10px rgba(37,99,235,0.35)",
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.07)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
                </svg>
              </button>
            ) : (
              <button style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "color 0.15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* No conversation selected */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--bg-primary)" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--bg-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Your Messages</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>
            Send a message to start a private conversation.
          </p>
          <button onClick={() => setShowNewChat(true)} style={{
            marginTop: 4, padding: "9px 22px", borderRadius: 99,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 2px 12px rgba(37,99,235,0.3)",
            transition: "transform 0.15s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
}
