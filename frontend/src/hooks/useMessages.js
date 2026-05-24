import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, doc,
  getDocs, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

/* ── Real-time conversations list ── */
export function useConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    /* Single field filter — no composite index needed. Sort client-side. */
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      convs.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      setConversations(convs);
      setLoading(false);
    }, (err) => { console.error("conversations listener:", err); setLoading(false); });
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
export async function sendMessage(conversationId, senderId, text, replyTo = null, imageUrl = null) {
  const now = new Date().toISOString();
  const msgData = {
    senderId,
    text: (text || "").trim(),
    type: imageUrl ? "image" : "text",
    imageUrl: imageUrl || null,
    replyTo: replyTo || null,
    reactions: {},
    readBy: [senderId],
    createdAt: now,
    deleted: false,
  };
  await addDoc(collection(db, "conversations", conversationId, "messages"), msgData);
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: {
      text: imageUrl ? "Photo" : (text || "").trim(),
      type: imageUrl ? "image" : "text",
      senderId, createdAt: now,
    },
    updatedAt: now,
  });
}

/* ── Upload chat image to Firebase Storage ── */
export async function uploadChatImage(file, conversationId) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `chat-images/${conversationId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
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

/* ── Edit a message ── */
export async function editMessage(conversationId, messageId, newText) {
  await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    text: newText.trim(),
    edited: true,
  });
}

/* ── Soft-delete a message ── */
export async function deleteMessage(conversationId, messageId) {
  await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    deleted: true,
  });
}

/* ── Set typing indicator ── */
export async function setTyping(conversationId, userId, isTyping) {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`typing.${userId}`]: isTyping,
  }).catch(() => {});
}
