import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, doc,
  getDocs, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/* ── Real-time conversations list ── */
export function useConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [userId]);

  return { conversations, loading };
}

/* ── Real-time messages in a conversation ── */
export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) { setMessages([]); setLoading(false); return; }
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [conversationId]);

  return { messages, loading };
}

/* ── Send a message ── */
export async function sendMessage(conversationId, senderId, text, replyTo = null) {
  const now = new Date().toISOString();
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId, text: text.trim(),
    type: "text",
    replyTo: replyTo || null,
    reactions: {},
    readBy: [senderId],
    createdAt: now,
    deleted: false,
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: { text: text.trim(), senderId, createdAt: now },
    updatedAt: now,
  });
}

/* ── Toggle emoji reaction ── */
export async function toggleReaction(conversationId, messageId, emoji, userId) {
  const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
  const snap = await getDocs(
    query(collection(db, "conversations", conversationId, "messages"),
      where("__name__", "==", messageId))
  );
  if (snap.empty) return;
  const reactions = snap.docs[0].data().reactions || {};
  const users = reactions[emoji] || [];
  const hasReacted = users.includes(userId);
  await updateDoc(msgRef, {
    [`reactions.${emoji}`]: hasReacted
      ? users.filter((u) => u !== userId)
      : [...users, userId],
  });
}

/* ── Mark messages as read ── */
export async function markRead(conversationId, userId) {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`unreadCounts.${userId}`]: 0,
  });
}

/* ── Find or create a DM conversation ── */
export async function getOrCreateConversation(uid1, uid2, profile1, profile2) {
  /* Single array-contains query — no composite index needed.
     Filter type and participants client-side. */
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid1),
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const data = d.data();
    return data.type === "direct" && data.participants?.includes(uid2);
  });
  if (existing) return existing.id;

  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "conversations"), {
    type: "direct",
    participants: [uid1, uid2],
    participantNames: {
      [uid1]: `${profile1.firstName} ${profile1.lastName}`,
      [uid2]: `${profile2.firstName} ${profile2.lastName}`,
    },
    participantAvatars: {
      [uid1]: profile1.avatarUrl || null,
      [uid2]: profile2.avatarUrl || null,
    },
    unreadCounts: { [uid1]: 0, [uid2]: 0 },
    lastMessage: null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/* ── Set typing indicator ── */
export async function setTyping(conversationId, userId, isTyping) {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`typing.${userId}`]: isTyping,
  }).catch(() => {});
}
