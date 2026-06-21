import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, doc, setDoc, deleteDoc,
  getDoc, query, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";

/* ─── Helpers ─── */
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatEventDate(dateStr, locale) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return dateStr; }
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

/* ─── Avatar ─── */
function MemberAvatar({ url, name, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: url ? "transparent" : "linear-gradient(135deg,#1d4896,#4472b8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", border: "2px solid var(--bg-secondary)",
    }}>
      {url
        ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        : <span style={{ color: "#fff", fontSize: size * 0.36, fontWeight: 700 }}>{getInitials(name)}</span>
      }
    </div>
  );
}

/* ─── Stacked attendee avatars ─── */
function AttendeeAvatars({ attendees }) {
  if (!attendees?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse" }}>
      {attendees.slice(0, 5).map((a, i) => (
        <div key={a.uid || i}
          title={[a.firstName, a.lastName].filter(Boolean).join(" ")}
          style={{ marginInlineStart: i === 0 ? 0 : -10, zIndex: 5 - i }}
        >
          <MemberAvatar
            url={a.photoURL || a.avatarUrl || null}
            name={[a.firstName, a.lastName].filter(Boolean).join(" ")}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Add Event Modal ─── */
function AddEventModal({ onClose, onSaved, userId, t }) {
  const [form, setForm] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { dark } = useTheme();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError(t.events.errorTitle); return; }
    if (!form.date) { setError(t.events.errorDate); return; }
    setSaving(true); setError("");
    try {
      await addDoc(collection(db, "events"), {
        title: form.title.trim(), date: form.date, time: form.time.trim(),
        location: form.location.trim(), description: form.description.trim(),
        authorId: userId, createdAt: new Date().toISOString(),
      });
      onSaved(); onClose();
    } catch (err) {
      console.error("Add event error:", err);
      setError(t.events.errorSave);
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "10px 13px",
    borderRadius: 12, border: "1.5px solid var(--border)",
    background: "var(--bg-secondary)", color: "var(--text-primary)",
    fontSize: 14, outline: "none", marginTop: 4,
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em",
  };
  const focus = (e) => { e.target.style.borderColor = "#4472b8"; e.target.style.boxShadow = "0 0 0 3px rgba(68,114,184,0.14)"; };
  const blur  = (e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(29,72,150,0.38)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg-primary)", border: "1.5px solid var(--border)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
        boxShadow: "0 20px 56px rgba(29,72,150,0.22)",
        animation: "evModalPop 0.24s cubic-bezier(.34,1.56,.64,1) both",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
            {t.events.addEventTitle}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "var(--bg-secondary)", color: "var(--text-muted)",
            cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>{t.events.formTitleLabel}</label>
            <input style={inputStyle} placeholder={t.events.formTitlePlaceholder}
              value={form.title} onChange={(e) => set("title", e.target.value)}
              onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>{t.events.formDateLabel}</label>
              <input type="date" style={inputStyle} value={form.date}
                onChange={(e) => set("date", e.target.value)} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>{t.events.formTimeLabel}</label>
              <input type="time" style={inputStyle} value={form.time}
                onChange={(e) => set("time", e.target.value)} onFocus={focus} onBlur={blur} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t.events.formLocationLabel}</label>
            <input style={inputStyle} placeholder={t.events.formLocationPlaceholder}
              value={form.location} onChange={(e) => set("location", e.target.value)}
              onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>{t.events.formDescLabel}</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 90, lineHeight: 1.55 }}
              placeholder={t.events.formDescPlaceholder}
              value={form.description} onChange={(e) => set("description", e.target.value)}
              onFocus={focus} onBlur={blur} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#e8735a", background: "#e8735a11", padding: "8px 12px", borderRadius: 9 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: "9px 20px", borderRadius: 12, border: "1.5px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit",
            }}>{t.events.cancel}</button>
            <button type="submit" disabled={saving} style={{
              padding: "9px 24px", borderRadius: 12, border: "none",
              background: saving ? "rgba(68,114,184,0.5)" : "#4472b8",
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              transition: "background 0.2s",
            }}
              onMouseOver={(e) => { if (!saving) e.currentTarget.style.background = "#1d4896"; }}
              onMouseOut={(e)  => { if (!saving) e.currentTarget.style.background = "#4472b8"; }}
            >{saving ? t.events.saving : t.events.addBtn}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Event Card ─── */
function EventCard({ event, currentUser, onRsvpChange, t, dark }) {
  const [going, setGoing] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount || 0);
  const [attendees, setAttendees] = useState([]);
  const [loadingRsvp, setLoadingRsvp] = useState(false);
  const [loadedAttendees, setLoadedAttendees] = useState(false);

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

        const profiles = await Promise.all(
          rsvpsSnap.docs.slice(0, 5).map(async (r) => {
            try {
              const uSnap = await getDoc(doc(db, "users", r.data().uid || r.id));
              return uSnap.exists() ? { uid: r.id, ...uSnap.data() } : { uid: r.id };
            } catch { return { uid: r.id }; }
          })
        );
        if (active) { setAttendees(profiles); setLoadedAttendees(true); }
      } catch (err) { console.error("RSVP load error:", err); }
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
    } catch (err) { console.error("RSVP toggle error:", err); }
    finally { setLoadingRsvp(false); }
  };

  const past = isPast(event.date);
  const desc = event.description && event.description.length > 130
    ? event.description.slice(0, 130) + "…"
    : event.description;

  return (
    <div
      className="ev-card"
      style={{
        background: "var(--bg-primary)", border: "1.5px solid var(--border)",
        borderInlineStart: `4px solid ${past ? "var(--border)" : "#4472b8"}`,
        borderRadius: 18, overflow: "hidden",
        boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
        opacity: past ? 0.72 : 1,
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
    >
      <div style={{ padding: "18px 20px" }}>
        {/* Date row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: past
              ? (dark ? "rgba(68,114,184,0.1)" : "#f0f6fb")
              : (dark ? "rgba(68,114,184,0.22)" : "#daeaf8"),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>📅</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: past ? "var(--text-muted)" : (dark ? "#7aaecc" : "#1d4896") }}>
              {formatEventDate(event.date, t.events.dateLocale)}
            </div>
            {event.time && (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🕐 {event.time}</div>
            )}
          </div>
          {past && (
            <span style={{
              marginInlineStart: "auto", fontSize: 11, fontWeight: 600,
              color: "var(--text-muted)", background: "var(--bg-secondary)",
              padding: "3px 10px", borderRadius: 99, border: "1px solid var(--border)",
            }}>{t.events.pastBadge}</span>
          )}
        </div>

        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
          {event.title}
        </h3>

        {event.location && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <span>📍</span> {event.location}
          </div>
        )}

        {desc && (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            {desc}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {loadedAttendees && attendees.length > 0 && <AttendeeAvatars attendees={attendees} />}
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {rsvpCount > 0 ? t.events.attendees(rsvpCount) : t.events.noAttendees}
            </span>
          </div>

          {!past && currentUser && (
            <button
              onClick={toggleRsvp}
              disabled={loadingRsvp}
              style={{
                padding: "8px 18px", borderRadius: 12,
                border: `1.5px solid ${going ? "#e8735a" : "#4472b8"}`,
                background: going ? "#e8735a" : "#4472b8",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: loadingRsvp ? "not-allowed" : "pointer",
                opacity: loadingRsvp ? 0.7 : 1,
                transition: "all 0.15s", whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              {loadingRsvp ? "…" : going ? t.events.rsvpCancel : t.events.rsvpGoing}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ─── */
function SkeletonEvent() {
  return (
    <div style={{
      background: "var(--bg-primary)", border: "1.5px solid var(--border)",
      borderInlineStart: "4px solid var(--border)", borderRadius: 18, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {["60%", "80%", "40%", "100%"].map((w, i) => (
        <div key={i} style={{
          width: w, height: i === 1 ? 17 : 13, borderRadius: 6,
          background: "var(--border)", animation: "evPulse 1.4s ease-in-out infinite",
          ...(i === 3 ? { height: 40, marginTop: 8 } : {}),
        }} />
      ))}
    </div>
  );
}

/* ─── Main ─── */
export default function EventsPage() {
  const { user, profile } = useAuth();
  const { t, isRTL } = useLang();
  const { dark } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = profile?.isAdmin === true;

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsub = onSnapshot(q,
      (snap) => { setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err)  => { console.error("Events snapshot error:", err); setLoading(false); }
    );
    return () => unsub();
  }, [refreshKey]);

  const filtered = events.filter((ev) => {
    if (tab === "upcoming") return isWithin30Days(ev.date);
    if (tab === "past") return isPast(ev.date);
    return true;
  });

  const pillStyle = (active) => ({
    padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: active ? 700 : 500,
    border: `1.5px solid ${active ? "#4472b8" : "var(--border)"}`,
    background: active ? (dark ? "rgba(68,114,184,0.22)" : "#daeaf8") : "var(--bg-primary)",
    color: active ? (dark ? "#7aaecc" : "#1d4896") : "var(--text-secondary)",
    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    fontFamily: "inherit",
  });

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        width: "100%", height: "100%",
        overflowY: "auto", overflowX: "hidden",
        background: "var(--bg-secondary)",
        fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
      }}
    >
      <style>{`
        @keyframes evPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes evModalPop { from{opacity:0;transform:scale(0.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .ev-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(29,72,150,0.12) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "var(--bg-primary)", borderBottom: "1.5px solid var(--border)",
        padding: "28px 24px 20px",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                {t.events.title}
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                {t.events.subtitle}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  flexShrink: 0, padding: "9px 20px", borderRadius: 12,
                  border: "none", background: "#4472b8", color: "#fff",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 8px rgba(68,114,184,0.28)",
                  transition: "background 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1d4896"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#4472b8"; }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {t.events.addEvent}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 24px 48px" }}>

        {/* Filter pills card */}
        <div style={{
          background: "var(--bg-primary)", borderRadius: 18, padding: "1rem 1.25rem",
          border: "1.5px solid var(--border)", borderInlineStart: "4px solid #4472b8",
          boxShadow: "0 2px 8px rgba(29,72,150,0.05)", marginBottom: "1.5rem",
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
        }}>
          <button style={pillStyle(tab === "all")} onClick={() => setTab("all")}>
            {t.events.tabAll} ({events.length})
          </button>
          <button style={pillStyle(tab === "upcoming")} onClick={() => setTab("upcoming")}>
            {t.events.tabUpcoming} ({events.filter((e) => isWithin30Days(e.date)).length})
          </button>
          <button style={pillStyle(tab === "past")} onClick={() => setTab("past")}>
            {t.events.tabPast} ({events.filter((e) => isPast(e.date)).length})
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonEvent key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 24px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              {tab === "past" ? t.events.emptyPast : tab === "upcoming" ? t.events.emptyUpcoming : t.events.emptyAll}
            </div>
            <div style={{ fontSize: 13 }}>
              {tab !== "all" ? t.events.emptyTabHint : isAdmin ? t.events.adminHint : t.events.userHint}
            </div>
            {isAdmin && tab === "all" && (
              <button onClick={() => setShowAddModal(true)} style={{
                marginTop: 18, padding: "9px 22px", borderRadius: 12,
                border: "none", background: "#4472b8", color: "#fff",
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>{t.events.addFirstEvent}</button>
            )}
          </div>
        )}

        {/* Events list */}
        {!loading && filtered.length > 0 && (
          <>
            {tab === "all" && filtered.some((e) => isUpcoming(e.date)) && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                {t.events.upcomingLabel}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtered.map((ev, idx) => {
                const prevEv = filtered[idx - 1];
                const showPastDivider = tab === "all" && idx > 0 && !isPast(prevEv?.date) && isPast(ev.date);
                return (
                  <div key={ev.id}>
                    {showPastDivider && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
                          {t.events.pastLabel}
                        </span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      </div>
                    )}
                    <EventCard event={ev} currentUser={user} dark={dark}
                      onRsvpChange={() => setRefreshKey((k) => k + 1)} t={t} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Summary footer */}
        {!loading && events.length > 0 && (
          <div style={{
            marginTop: 28, padding: "16px 20px",
            background: "var(--bg-primary)", border: "1.5px solid var(--border)",
            borderRadius: 14, display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ display: "flex", gap: 24 }}>
              {[
                { value: events.length, label: t.events.totalEvents, color: dark ? "#7aaecc" : "#4472b8" },
                { value: events.filter((e) => isUpcoming(e.date)).length, label: t.events.futureEvents, color: "#5a8a6a" },
                { value: events.filter((e) => isPast(e.date)).length, label: t.events.pastEvents, color: "var(--text-muted)" },
              ].map(({ value, label, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
            {!user && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.events.loginToRsvp}</div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEventModal userId={user?.uid} onClose={() => setShowAddModal(false)}
          onSaved={() => setRefreshKey((k) => k + 1)} t={t} />
      )}
    </div>
  );
}
