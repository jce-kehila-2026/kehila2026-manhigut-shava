import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
    deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const storage = getStorage();

const styles = {
  page: {
    flex: 1,
    padding: "2rem 2.5rem",
    boxSizing: "border-box",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: "0 0 4px",
  },
  pageSub: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "0 0 2rem",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "260px 1fr 260px",
    gap: "1.5rem",
    alignItems: "start",
  },
  // Sidebar shared
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sideCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "1.25rem",
    border: "1px solid #e8ecf0",
  },
  sideTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: "0 0 1rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  // Requests
  requestItem: {
    padding: "0.9rem 0",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  requestName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  requestProfession: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
  },
  requestContact: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: 0,
  },
  requestActions: {
    display: "flex",
    gap: "6px",
    marginTop: "4px",
  },
  acceptBtn: {
    flex: 1,
    padding: "6px 0",
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  },
  declineBtn: {
    flex: 1,
    padding: "6px 0",
    background: "#fff0f0",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  },
  acceptedTag: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "6px",
    padding: "3px 8px",
    display: "inline-block",
  },
  declinedTag: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#b91c1c",
    background: "#fff0f0",
    border: "1px solid #fca5a5",
    borderRadius: "6px",
    padding: "3px 8px",
    display: "inline-block",
  },
  emptyText: {
    fontSize: "12px",
    color: "#94a3b8",
    textAlign: "center",
    padding: "1rem 0",
  },
  // Birthdays
  birthdayItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0.6rem 0",
    borderBottom: "1px solid #f1f5f9",
  },
  birthdayAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#fef9c3",
    color: "#854d0e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
    border: "1px solid #fde047",
  },
  birthdayName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1a3c5e",
    margin: 0,
  },
  birthdayDate: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: 0,
  },
  todayTag: {
    fontSize: "10px",
    fontWeight: "700",
    background: "#fef9c3",
    color: "#854d0e",
    borderRadius: "6px",
    padding: "2px 6px",
    border: "1px solid #fde047",
  },
  // Feed
  feed: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  composeCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "1.25rem",
    border: "1px solid #e8ecf0",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    color: "#1a2e42",
    background: "#f8fafc",
    boxSizing: "border-box",
    minHeight: "80px",
  },
  composeActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachBtn: {
    background: "none",
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    padding: "7px 14px",
    fontSize: "13px",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  postBtn: {
    padding: "9px 22px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  previewRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  previewThumb: {
    width: "60px",
    height: "60px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "1px solid #e2e8f0",
  },
  previewName: {
    fontSize: "11px",
    color: "#64748b",
    background: "#f1f5f9",
    borderRadius: "6px",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  postCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "1.25rem",
    border: "1px solid #e8ecf0",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  postAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#1a3c5e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "700",
    flexShrink: 0,
  },
  postAuthor: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  postTime: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: 0,
  },
  postText: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.65",
    margin: 0,
  },
  postMedia: {
    borderRadius: "10px",
    overflow: "hidden",
    maxHeight: "320px",
  },
  postImage: {
    width: "100%",
    maxHeight: "320px",
    objectFit: "cover",
    borderRadius: "10px",
  },
  postVideo: {
    width: "100%",
    borderRadius: "10px",
    maxHeight: "320px",
  },
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isBirthdaySoon(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const bday = new Date(birthdate);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  const diff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
  if (diff >= 0 && diff <= 7) return diff;
  return null;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [profile, setProfile] = useState(null);
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
        text,
        media: mediaUrls,
        authorId: user.uid,
        authorName: profile ? `${profile.firstName} ${profile.lastName}` : user.email,
        createdAt: new Date().toISOString(),
      });
      setText("");
      setFiles([]);
      fetchPosts();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleRequest = async (reqId, status) => {
  const responderName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user.email;
  await updateDoc(doc(db, "helpRequests", reqId), { status, responderName });
  setRequests((prev) =>
    prev.map((r) => (r.id === reqId ? { ...r, status, responderName } : r))
  );
};

  const getInitials = (name) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?";

  return (
    <div style={styles.page}>
      <p style={styles.pageTitle}>Community</p>
      <p style={styles.pageSub}>Posts, requests, and celebrations from your community.</p>

      <div style={styles.layout}>
        {/* Left — Requests Received */}
        <div style={styles.sidebar}>
          <div style={styles.sideCard}>
            <p style={styles.sideTitle}>Requests Received</p>
            {requests.length === 0 && (
              <p style={styles.emptyText}>No requests yet.</p>
            )}
            {requests.map((r) => (
              <div key={r.id} style={styles.requestItem}>
                <p style={styles.requestName}>{r.fromUserName}</p>
                <p style={styles.requestProfession}>{r.fromUserProfession}</p>
                <p style={styles.requestContact}><strong>Email:</strong> {r.fromUserEmail}</p>
                {r.fromUserPhone && (
                  <p style={styles.requestContact}><strong>Phone:</strong> {r.fromUserPhone}</p>
                )}
                {!r.status && (
                  <div style={styles.requestActions}>
                    <button
                      style={styles.acceptBtn}
                      onClick={() => handleRequest(r.id, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      style={styles.declineBtn}
                      onClick={() => handleRequest(r.id, "declined")}
                    >
                      Decline
                    </button>
                  </div>
                )}
                {r.status === "accepted" ? `Accepted by ${r.responderName}` : r.status === "declined" ? `Declined by ${r.responderName}` : "Pending"}
                <button
                onClick={async () => {
                    await deleteDoc(doc(db, "helpRequests", r.id));
                    setSentRequests((prev) => prev.filter((req) => req.id !== r.id));
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "11px", marginTop: "4px" }}
                >
                Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center — Posts Feed */}
        <div style={styles.feed}>
          <div style={styles.composeCard}>
            <textarea
              style={styles.textarea}
              placeholder="Share something with the community..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {files.length > 0 && (
              <div style={styles.previewRow}>
                {files.map((f, i) =>
                  f.type.startsWith("image") ? (
                    <img
                      key={i}
                      src={URL.createObjectURL(f)}
                      style={styles.previewThumb}
                      alt=""
                    />
                  ) : (
                    <span key={i} style={styles.previewName}>
                      {f.name}
                    </span>
                  )
                )}
              </div>
            )}
            <div style={styles.composeActions}>
              <button
                style={styles.attachBtn}
                onClick={() => fileRef.current.click()}
              >
                Attach file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
              <button
                style={styles.postBtn}
                onClick={handlePost}
                disabled={posting}
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>

          {posts.length === 0 && (
            <p style={{ ...styles.emptyText, textAlign: "center" }}>
              No posts yet. Be the first to share something!
            </p>
          )}

          {posts.map((p) => (
            <div key={p.id} style={styles.postCard}>
              <div style={styles.postHeader}>
                <div style={styles.postAvatar}>{getInitials(p.authorName)}</div>
                <div>
                  <p style={styles.postAuthor}>{p.authorName}</p>
                  <p style={styles.postTime}>{timeAgo(p.createdAt)}</p>
                </div>
              </div>
              {p.text && <p style={styles.postText}>{p.text}</p>}
              {p.media?.map((m, i) =>
                m.type === "image" ? (
                  <img key={i} src={m.url} style={styles.postImage} alt="" />
                ) : (
                  <video key={i} src={m.url} style={styles.postVideo} controls />
                )
              )}
            </div>
          ))}
        </div>

        {/* Right — Birthdays */}
        <div style={styles.sidebar}>
          <div style={styles.sideCard}>
            <p style={styles.sideTitle}>Upcoming Birthdays</p>
            {birthdays.length === 0 && (
              <p style={styles.emptyText}>No upcoming birthdays.</p>
            )}
            {birthdays.map((u) => (
              <div key={u.id} style={styles.birthdayItem}>
                <div style={styles.birthdayAvatar}>
                  {getInitials(`${u.firstName} ${u.lastName}`)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={styles.birthdayName}>
                    {u.firstName} {u.lastName}
                  </p>
                  <p style={styles.birthdayDate}>
                    {u.daysUntil === 0
                      ? "Today"
                      : `In ${u.daysUntil} day${u.daysUntil > 1 ? "s" : ""}`}
                  </p>
                </div>
                {u.daysUntil === 0 && (
                  <span style={styles.todayTag}>Today</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}