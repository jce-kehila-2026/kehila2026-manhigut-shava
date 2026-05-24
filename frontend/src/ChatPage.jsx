import { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
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
  if (d.toDateString() === yest.toDateString())  return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}
function getInitials(name) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
}

/* ── Avatar component ── */
function Avatar({ url, name, size = 40, online = false }) {
  const initials = getInitials(name);
  const colors = ["#2563eb","#7c3aed","#0891b2","#059669","#dc2626","#d97706"];
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {url ? (
        <img src={url} style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", display: "block",
        }} alt="" />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: bg, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
        }}>{initials}</div>
      )}
      {online && (
        <span style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          background: "var(--online)",
          border: `2px solid var(--bg-primary)`,
        }} />
      )}
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg, isMe, senderName, senderAvatar, showAvatar, showTime }) {
  const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🎉"];
  const [showReactions, setShowReactions] = useState(false);

  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);

  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: "8px",
      marginBottom: showTime ? "12px" : "3px",
      padding: "0 1rem",
    }}>
      {/* Sender avatar (left side, others only) */}
      {!isMe && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar && <Avatar url={senderAvatar} name={senderName} size={32} />}
        </div>
      )}

      <div style={{
        maxWidth: "65%",
        display: "flex", flexDirection: "column",
        alignItems: isMe ? "flex-end" : "flex-start",
        gap: "2px",
      }}>
        {/* Sender name (others, first in group) */}
        {!isMe && showAvatar && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", paddingLeft: 2, marginBottom: 1 }}>
            {senderName}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div style={{
            background: isMe ? "rgba(255,255,255,0.18)" : "var(--bg-tertiary)",
            borderLeft: `3px solid ${isMe ? "rgba(255,255,255,0.5)" : "var(--brand)"}`,
            borderRadius: "var(--r-xs)",
            padding: "4px 8px", marginBottom: 2,
            fontSize: 11, color: isMe ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
            maxWidth: "100%",
          }}>
            <p style={{ fontWeight: 600, fontSize: 10, marginBottom: 1 }}>{msg.replyTo.senderName}</p>
            <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.replyTo.text}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            background: isMe ? "var(--bubble-me)" : "var(--bubble-them)",
            color: isMe ? "var(--bubble-me-text)" : "var(--bubble-them-text)",
            padding: "9px 13px",
            borderRadius: isMe
              ? "16px 16px 4px 16px"
              : "16px 16px 16px 4px",
            fontSize: 14, lineHeight: 1.5,
            boxShadow: isMe ? "0 2px 8px rgba(37,99,235,0.3)" : "var(--shadow-xs)",
            border: isMe ? "none" : "1px solid var(--border)",
            wordBreak: "break-word",
            position: "relative",
            cursor: "default",
            transition: "opacity var(--t-fast)",
          }}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {msg.deleted ? (
            <em style={{ opacity: 0.55, fontSize: 13 }}>Message deleted</em>
          ) : (
            msg.text
          )}

          {/* Reaction picker on hover */}
          {showReactions && !msg.deleted && (
            <div style={{
              position: "absolute",
              top: -36, [isMe ? "right" : "left"]: 0,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-full)",
              padding: "4px 8px",
              display: "flex", gap: 4,
              boxShadow: "var(--shadow-md)",
              zIndex: 10, animation: "popIn 0.15s ease",
            }}>
              {EMOJIS.map((e) => (
                <button key={e} style={{ fontSize: 16, padding: "2px 3px", background: "none", border: "none", cursor: "pointer", borderRadius: 4, transition: "transform 0.1s" }}
                  onMouseEnter={(ev) => ev.target.style.transform = "scale(1.3)"}
                  onMouseLeave={(ev) => ev.target.style.transform = "scale(1)"}
                >{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions display */}
        {reactionEntries.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {reactionEntries.map(([emoji, users]) => (
              <span key={emoji} style={{
                background: "var(--bg-primary)", border: "1px solid var(--border)",
                borderRadius: "var(--r-full)", padding: "1px 7px",
                fontSize: 12, display: "flex", alignItems: "center", gap: 3,
                cursor: "pointer",
              }}>
                {emoji} <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)" }}>{users.length}</span>
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {showTime && (
          <span style={{
            fontSize: 10, color: isMe ? "rgba(255,255,255,0.55)" : "var(--text-muted)",
            marginTop: 1,
          }}>
            {formatTime(msg.createdAt)}
            {isMe && (
              <span style={{ marginLeft: 4 }}>
                {msg.readBy?.length > 1 ? "✓✓" : "✓"}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Conversation list item ── */
function ConvItem({ conv, active, currentUid, allUsers, onClick }) {
  const otherId = conv.participants?.find((p) => p !== currentUid);
  const otherName = conv.participantNames?.[otherId] || "Unknown";
  const otherAvatar = conv.participantAvatars?.[otherId] || null;
  const otherUser = allUsers.find((u) => u.id === otherId);
  const isOnline = otherUser?.isOnline || false;
  const unread = conv.unreadCounts?.[currentUid] || 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 14px",
        background: active ? "var(--bg-hover)" : "transparent",
        border: "none", cursor: "pointer",
        borderLeft: active ? "3px solid var(--brand)" : "3px solid transparent",
        transition: "background var(--t-fast)",
        textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Avatar url={otherAvatar} name={otherName} size={42} online={isOnline} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 14, color: "var(--text-primary)" }}>
            {otherName}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
            {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ""}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{
            fontSize: 12, color: unread > 0 ? "var(--text-secondary)" : "var(--text-muted)",
            fontWeight: unread > 0 ? 600 : 400,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: 160,
          }}>
            {conv.lastMessage?.text || "Start a conversation…"}
          </p>
          {unread > 0 && (
            <span style={{
              minWidth: 18, height: 18, borderRadius: 99,
              background: "var(--brand)", color: "#fff",
              fontSize: 9, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", flexShrink: 0,
            }}>{unread > 99 ? "99+" : unread}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Main Chat Page ── */
export default function ChatPage({ onUnreadChange }) {
  const { user, profile } = useAuth();
  const { conversations } = useConversations(user?.uid);
  const [activeConvId, setActiveConvId] = useState(null);
  const { messages } = useMessages(activeConvId);

  const [text, setText]               = useState("");
  const [allUsers, setAllUsers]       = useState([]);
  const [search, setSearch]           = useState("");
  const [userSearch, setUserSearch]   = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [replyTo, setReplyTo]         = useState(null);
  const [sending, setSending]         = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  /* Load all users */
  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) =>
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Mark as read when conversation is opened */
  useEffect(() => {
    if (activeConvId && user) markRead(activeConvId, user.uid);
  }, [activeConvId, messages.length]);

  /* Total unread for sidebar badge */
  useEffect(() => {
    const total = conversations.reduce((sum, c) => sum + (c.unreadCounts?.[user?.uid] || 0), 0);
    onUnreadChange?.(total);
  }, [conversations]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherId    = activeConv?.participants?.find((p) => p !== user?.uid);
  const otherUser  = allUsers.find((u) => u.id === otherId);
  const otherName  = activeConv?.participantNames?.[otherId] || "";
  const otherAvatar = activeConv?.participantAvatars?.[otherId] || null;

  const handleSend = async () => {
    if (!text.trim() || !activeConvId || sending) return;
    setSending(true);
    const t = text;
    const r = replyTo;
    setText(""); setReplyTo(null);
    try {
      await sendMessage(activeConvId, user.uid, t, r);
    } finally { setSending(false); }
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
    if (!profile) return;
    const convId = await getOrCreateConversation(user.uid, targetUser.id, profile, targetUser);
    setActiveConvId(convId);
    setShowNewChat(false);
    setUserSearch("");
  };

  /* Group messages by date for separators */
  const getDateLabel = (msg, prev) => {
    if (!prev) return formatDateLabel(msg.createdAt);
    if (formatDateLabel(msg.createdAt) !== formatDateLabel(prev.createdAt))
      return formatDateLabel(msg.createdAt);
    return null;
  };

  const isTypingIndicator = activeConv?.typing
    ? Object.entries(activeConv.typing)
        .filter(([uid, val]) => uid !== user?.uid && val).length > 0
    : false;

  const filteredConvs = conversations.filter((c) => {
    const oid = c.participants?.find((p) => p !== user?.uid);
    const name = c.participantNames?.[oid] || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = allUsers
    .filter((u) => u.id !== user?.uid)
    .filter((u) => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return !userSearch || name.includes(userSearch.toLowerCase());
    });

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", fontFamily: "var(--font)" }}>

      {/* ── Sidebar: Conversations list ── */}
      <aside style={{
        width: 300, minWidth: 300,
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Messages</h2>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              style={{
                padding: "5px 12px", borderRadius: "var(--r-sm)",
                background: showNewChat ? "var(--brand)" : "var(--bg-tertiary)",
                color: showNewChat ? "#fff" : "var(--text-secondary)",
                border: "none", fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all var(--t-fast)",
              }}
            >
              {showNewChat ? "Cancel" : "+ New"}
            </button>
          </div>
          <input
            className="input"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>

        {/* New chat user picker */}
        {showNewChat && (
          <div style={{
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border)",
            padding: "0.75rem",
            maxHeight: 280, overflow: "auto",
            animation: "slideDown 0.2s ease",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
              Start conversation
            </p>
            <input
              className="input"
              placeholder="Search members…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ fontSize: 12, marginBottom: "0.5rem" }}
            />
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleNewConversation(u)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 4px", background: "transparent", border: "none",
                  cursor: "pointer", borderRadius: "var(--r-sm)",
                  transition: "background var(--t-fast)", textAlign: "left",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <Avatar url={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size={34} online={u.isOnline} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{u.firstName} {u.lastName}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.profession || u.city || ""}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversations */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {filteredConvs.length === 0 && (
            <div className="empty-state" style={{ padding: "2rem 1rem" }}>
              <p style={{ fontSize: 13 }}>No conversations yet.</p>
              <p style={{ fontSize: 12 }}>Click "+ New" to start messaging.</p>
            </div>
          )}
          {filteredConvs.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeConvId}
              currentUid={user?.uid}
              allUsers={allUsers}
              onClick={() => setActiveConvId(conv.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Main: Message area ── */}
      {activeConvId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-secondary)" }}>

          {/* Chat header */}
          <div style={{
            height: 56, display: "flex", alignItems: "center", gap: 12,
            padding: "0 1.25rem",
            background: "var(--bg-primary)",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}>
            <Avatar url={otherAvatar} name={otherName} size={36} online={otherUser?.isOnline} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{otherName}</p>
              <p style={{ fontSize: 11, color: otherUser?.isOnline ? "var(--online)" : "var(--text-muted)" }}>
                {otherUser?.isOnline ? "Online" : otherUser?.lastSeen ? `Last seen ${formatTime(otherUser.lastSeen)}` : "Offline"}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {otherUser?.profession || ""}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "1rem 0" }}>
            {messages.length === 0 && (
              <div className="empty-state" style={{ marginTop: "3rem" }}>
                <div style={{ fontSize: 48, marginBottom: "0.5rem" }}>👋</div>
                <h3>Say hello!</h3>
                <p>This is the beginning of your conversation with {otherName}.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const isMe = msg.senderId === user?.uid;
              const dateLabel = getDateLabel(msg, prev);

              const senderProfile = allUsers.find((u) => u.id === msg.senderId);
              const senderName = senderProfile ? `${senderProfile.firstName} ${senderProfile.lastName}` : "Unknown";
              const senderAvatar = senderProfile?.avatarUrl || null;

              /* Show avatar only on first message in a group */
              const showAvatar = !prev || prev.senderId !== msg.senderId ||
                (new Date(msg.createdAt) - new Date(prev.createdAt)) > 3 * 60 * 1000;

              /* Show timestamp on last in a group */
              const showTime = !next || next.senderId !== msg.senderId ||
                (new Date(next.createdAt) - new Date(msg.createdAt)) > 3 * 60 * 1000;

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {dateLabel && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 1.5rem",
                    }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{dateLabel}</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}

                  <div
                    className="fade-in"
                    onMouseEnter={(e) => {
                      const replyBtn = e.currentTarget.querySelector(".reply-btn");
                      if (replyBtn) replyBtn.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      const replyBtn = e.currentTarget.querySelector(".reply-btn");
                      if (replyBtn) replyBtn.style.opacity = "0";
                    }}
                    style={{ position: "relative" }}
                  >
                    <MessageBubble
                      msg={msg}
                      isMe={isMe}
                      senderName={senderName}
                      senderAvatar={senderAvatar}
                      showAvatar={showAvatar}
                      showTime={showTime}
                    />
                    {/* Reply button */}
                    <button
                      className="reply-btn"
                      onClick={() => setReplyTo({ id: msg.id, text: msg.text, senderName })}
                      style={{
                        position: "absolute",
                        top: "50%", transform: "translateY(-50%)",
                        [isMe ? "left" : "right"]: "1rem",
                        opacity: 0, transition: "opacity var(--t-fast)",
                        background: "var(--bg-primary)", border: "1px solid var(--border)",
                        borderRadius: "var(--r-sm)", padding: "3px 8px",
                        fontSize: 11, color: "var(--text-muted)", cursor: "pointer",
                      }}
                    >↩ Reply</button>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTypingIndicator && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 1rem 8px" }}>
                <Avatar url={otherAvatar} name={otherName} size={28} />
                <div style={{
                  background: "var(--bg-primary)", border: "1px solid var(--border)",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "8px 14px", display: "flex", gap: 4, alignItems: "center",
                  boxShadow: "var(--shadow-xs)",
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
              margin: "0 1rem 4px",
              background: "var(--bg-tertiary)",
              borderLeft: "3px solid var(--brand)",
              borderRadius: "var(--r-xs)",
              padding: "6px 10px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              animation: "slideUp 0.15s ease",
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 2 }}>↩ {replyTo.senderName}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ fontSize: 18, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: "0.75rem 1rem",
            background: "var(--bg-primary)",
            borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "flex-end", gap: 8,
          }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTyping}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${otherName}…`}
                rows={1}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  fontSize: 14,
                  resize: "none",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  outline: "none",
                  lineHeight: 1.5,
                  maxHeight: 120,
                  overflow: "auto",
                  transition: "border-color var(--t-fast)",
                  fontFamily: "var(--font)",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                background: text.trim() ? "var(--brand)" : "var(--bg-tertiary)",
                color: text.trim() ? "#fff" : "var(--text-muted)",
                border: "none", cursor: text.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all var(--t-fast)",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* No conversation selected */
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
          <div className="empty-state">
            <div style={{ fontSize: 64, marginBottom: "0.5rem" }}>💬</div>
            <h3>Your Messages</h3>
            <p>Select a conversation from the left, or start a new one by clicking "+ New".</p>
          </div>
        </div>
      )}
    </div>
  );
}
