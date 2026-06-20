import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, addDoc, doc, setDoc, deleteDoc,
  getDoc, query, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

/* ─── Helpers ─── */
function avatarColor(name) {
  const colors = ["#4472b8", "#e8735a", "#6da3d4", "#f5a08c", "#5a8a6a", "#b8844a"];
  let h = 0;
  for (const c of (name || "")) h = c.charCodeAt(0) + h * 31;
  return colors[Math.abs(h) % colors.length];
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatHebrewDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function isUpcoming(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) >= new Date(new Date().setHours(0, 0, 0, 0));
}

function isPast(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
}

function isWithin30Days(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  return d >= new Date(now.setHours(0, 0, 0, 0)) && d <= in30;
}

/* ─── Mini Avatar ─── */
function Avatar({ url, name, size = 36 }) {
  const bg = avatarColor(name);
  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "2px solid var(--bg-secondary)",
  };
  if (url) return <img src={url} alt={name || ""} style={base} />;
  return (
    <div
      style={{
        ...base,
        background: `linear-gradient(135deg, ${bg}, ${avatarColor((name || "").split("").reverse().join(""))})`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        userSelect: "none",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ─── Stacked attendee avatars ─── */
function AttendeeAvatars({ attendees }) {
  if (!attendees || attendees.length === 0) return null;
  const visible = attendees.slice(0, 5);
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse" }}>
      {visible.map((a, i) => (
        <div
          key={a.uid || i}
          title={[a.firstName, a.lastName].filter(Boolean).join(" ")}
          style={{ marginInlineStart: i === 0 ? 0 : -10, zIndex: visible.length - i }}
        >
          <Avatar
            url={a.photoURL || a.avatarUrl || null}
            name={[a.firstName, a.lastName].filter(Boolean).join(" ")}
            size={30}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Add Event Modal ─── */
function AddEventModal({ onClose, onSaved, userId }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("יש להזין כותרת לאירוע"); return; }
    if (!form.date) { setError("יש לבחור תאריך"); return; }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "events"), {
        title: form.title.trim(),
        date: form.date,
        time: form.time.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        authorId: userId,
        createdAt: new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error("Add event error:", err);
      setError("שגיאה בשמירה. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1.5px solid var(--border)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    marginTop: 4,
  };
  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 2,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 28,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
            הוספת אירוע חדש
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "var(--bg-primary)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>כותרת האירוע *</label>
            <input
              style={inputStyle}
              placeholder="שם האירוע"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "#1a3a8f"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>תאריך *</label>
              <input
                type="date"
                style={inputStyle}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = "#1a3a8f"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
              />
            </div>
            <div>
              <label style={labelStyle}>שעה</label>
              <input
                type="time"
                style={inputStyle}
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = "#1a3a8f"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>מיקום</label>
            <input
              style={inputStyle}
              placeholder="כתובת או קישור"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "#1a3a8f"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
          </div>

          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
              placeholder="פרטים על האירוע…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "#1a3a8f"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#e8735a", background: "#e8735a11", padding: "8px 12px", borderRadius: 7 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "1.5px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "9px 24px",
                borderRadius: 8,
                border: "none",
                background: saving ? "#aaa" : "#1a3a8f",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "שומר…" : "הוסף אירוע"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Event Card ─── */
function EventCard({ event, currentUser, onRsvpChange }) {
  const [going, setGoing] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount || 0);
  const [attendees, setAttendees] = useState([]);
  const [loadingRsvp, setLoadingRsvp] = useState(false);
  const [loadedAttendees, setLoadedAttendees] = useState(false);

  /* Check own RSVP + count */
  useEffect(() => {
    if (!currentUser || !event.id) return;
    let active = true;
    (async () => {
      try {
        const rsvpRef = doc(db, "events", event.id, "rsvps", currentUser.uid);
        const snap = await getDoc(rsvpRef);
        if (active) setGoing(snap.exists());

        const rsvpsSnap = await getDocs(collection(db, "events", event.id, "rsvps"));
        if (!active) return;
        setRsvpCount(rsvpsSnap.size);

        /* Fetch first 5 attendee profiles */
        const rsvpDocs = rsvpsSnap.docs.slice(0, 5);
        const profiles = await Promise.all(
          rsvpDocs.map(async (r) => {
            try {
              const uSnap = await getDoc(doc(db, "users", r.data().uid || r.id));
              return uSnap.exists() ? { uid: r.id, ...uSnap.data() } : { uid: r.id };
            } catch { return { uid: r.id }; }
          })
        );
        if (active) {
          setAttendees(profiles);
          setLoadedAttendees(true);
        }
      } catch (err) {
        console.error("RSVP load error:", err);
      }
    })();
    return () => { active = false; };
  }, [event.id, currentUser]);

  const toggleRsvp = async () => {
    if (!currentUser || loadingRsvp) return;
    setLoadingRsvp(true);
    try {
      const rsvpRef = doc(db, "events", event.id, "rsvps", currentUser.uid);
      if (going) {
        await deleteDoc(rsvpRef);
        setGoing(false);
        setRsvpCount((c) => Math.max(0, c - 1));
        setAttendees((a) => a.filter((x) => x.uid !== currentUser.uid));
      } else {
        await setDoc(rsvpRef, { uid: currentUser.uid, goingAt: new Date().toISOString() });
        setGoing(true);
        setRsvpCount((c) => c + 1);
      }
      if (onRsvpChange) onRsvpChange(event.id);
    } catch (err) {
      console.error("RSVP toggle error:", err);
    } finally {
      setLoadingRsvp(false);
    }
  };

  const past = isPast(event.date);
  const descTruncated =
    event.description && event.description.length > 130
      ? event.description.slice(0, 130) + "…"
      : event.description;

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        opacity: past ? 0.72 : 1,
        transition: "box-shadow 0.18s",
      }}
      onMouseEnter={(e) => { if (!past) e.currentTarget.style.boxShadow = "0 4px 22px rgba(26,58,143,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Color stripe */}
      <div
        style={{
          height: 5,
          background: past
            ? "var(--border)"
            : "linear-gradient(90deg, #1a3a8f, #4472b8)",
        }}
      />

      <div style={{ padding: "18px 20px" }}>
        {/* Date + time row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 8,
              background: past ? "var(--bg-primary)" : "#1a3a8f",
              color: past ? "var(--text-muted)" : "#fff",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            📅
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: past ? "var(--text-muted)" : "#1a3a8f" }}>
              {formatHebrewDate(event.date)}
            </div>
            {event.time && (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                🕐 {event.time}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 17,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {event.title}
        </h3>

        {/* Location */}
        {event.location && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <span>📍</span> {event.location}
          </div>
        )}

        {/* Description */}
        {descTruncated && (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            {descTruncated}
          </p>
        )}

        {/* Footer: attendees + RSVP */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          {/* Attendee count + avatars */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {loadedAttendees && attendees.length > 0 && (
              <AttendeeAvatars attendees={attendees} />
            )}
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {rsvpCount > 0 ? `${rsvpCount} הולכים` : "אין משתתפים עדיין"}
            </span>
          </div>

          {/* RSVP button */}
          {!past && currentUser && (
            <button
              onClick={toggleRsvp}
              disabled={loadingRsvp}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: `1.5px solid ${going ? "#e8735a" : "#1a3a8f"}`,
                background: going ? "#e8735a" : "#1a3a8f",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: loadingRsvp ? "not-allowed" : "pointer",
                opacity: loadingRsvp ? 0.7 : 1,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {loadingRsvp ? "…" : going ? "לא הולכ/ת" : "אני הולכ/ת"}
            </button>
          )}

          {past && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                background: "var(--bg-primary)",
                padding: "4px 10px",
                borderRadius: 20,
                border: "1px solid var(--border)",
              }}
            >
              האירוע עבר
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main EventsPage ─── */
export default function EventsPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all"); // "all" | "upcoming" | "past"
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = profile?.isAdmin === true;

  /* Live listener for events ordered by date */
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(data);
        setLoading(false);
      },
      (err) => {
        console.error("Events snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [refreshKey]);

  /* Filtered events by tab */
  const filtered = events.filter((ev) => {
    if (tab === "upcoming") return isWithin30Days(ev.date);
    if (tab === "past") return isPast(ev.date);
    return true;
  });

  const tabStyle = (active) => ({
    padding: "8px 20px",
    borderRadius: 20,
    border: `1.5px solid ${active ? "#1a3a8f" : "var(--border)"}`,
    background: active ? "#1a3a8f" : "var(--bg-secondary)",
    color: active ? "#fff" : "var(--text-secondary)",
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  /* Skeleton */
  const SkeletonEvent = () => (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 5, background: "var(--border)" }} />
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: "60%", height: 13, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: "80%", height: 17, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: "40%", height: 12, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: "100%", height: 40, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite", marginTop: 8 }} />
      </div>
    </div>
  );

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        paddingBottom: 48,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          padding: "28px 24px 20px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
                אירועים
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                כנסים, מפגשים ואירועים של הקהילה
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  flexShrink: 0,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#1a3a8f",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(26,58,143,0.25)",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <span style={{ fontSize: 16 }}>+</span> הוסף אירוע
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 24px 0" }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <button style={tabStyle(tab === "all")} onClick={() => setTab("all")}>
            הכל ({events.length})
          </button>
          <button style={tabStyle(tab === "upcoming")} onClick={() => setTab("upcoming")}>
            קרובים ({events.filter((e) => isWithin30Days(e.date)).length})
          </button>
          <button style={tabStyle(tab === "past")} onClick={() => setTab("past")}>
            עברו ({events.filter((e) => isPast(e.date)).length})
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonEvent key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "72px 24px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
              {tab === "past" ? "אין אירועים שעברו" : tab === "upcoming" ? "אין אירועים קרובים ב-30 הימים הקרובים" : "אין אירועים עדיין"}
            </div>
            <div style={{ fontSize: 14 }}>
              {tab !== "all"
                ? "נסה להחליף לכרטיסיית 'הכל'"
                : isAdmin
                  ? "לחץ על 'הוסף אירוע' להוספת האירוע הראשון"
                  : "האירועים הקרובים יופיעו כאן"}
            </div>
            {isAdmin && tab === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  marginTop: 20,
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "#1a3a8f",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                הוסף אירוע ראשון
              </button>
            )}
          </div>
        )}

        {/* Events list */}
        {!loading && filtered.length > 0 && (
          <>
            {/* Upcoming section label */}
            {tab === "all" && filtered.some((e) => isUpcoming(e.date)) && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                אירועים קרובים
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filtered.map((ev, idx) => {
                /* In "all" tab, insert a divider between future and past */
                const prevEv = filtered[idx - 1];
                const showPastDivider =
                  tab === "all" &&
                  idx > 0 &&
                  !isPast(prevEv?.date) &&
                  isPast(ev.date);

                return (
                  <div key={ev.id}>
                    {showPastDivider && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 16,
                          marginTop: 8,
                        }}
                      >
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
                          אירועים שעברו
                        </span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      </div>
                    )}
                    <EventCard
                      event={ev}
                      currentUser={user}
                      onRsvpChange={() => setRefreshKey((k) => k + 1)}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Summary footer when events exist */}
        {!loading && events.length > 0 && (
          <div
            style={{
              marginTop: 32,
              padding: "16px 20px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1a3a8f" }}>{events.length}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>סה"כ אירועים</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#5a8a6a" }}>
                  {events.filter((e) => isUpcoming(e.date)).length}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>עתידיים</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-muted)" }}>
                  {events.filter((e) => isPast(e.date)).length}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>שעברו</div>
              </div>
            </div>
            {!user && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                היכנסו לחשבון כדי לאשר השתתפות
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add event modal */}
      {showAddModal && (
        <AddEventModal
          userId={user?.uid}
          onClose={() => setShowAddModal(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
