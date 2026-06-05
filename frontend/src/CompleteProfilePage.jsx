import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const C = {
  blue: "#4a1f3d", bright: "#b8617a", light: "#d48aa0",
  sky: "#d48aa0", pale: "#f5e3e8", deep: "#2e1428", deeper: "#1f0d1c",
};

const inp = {
  width: "100%", padding: "0.78rem 1rem", boxSizing: "border-box",
  background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(184,97,122,0.25)",
  borderRadius: 12, color: "#fff", fontSize: "0.9rem",
  fontFamily: "'Figtree', 'Heebo', system-ui, sans-serif",
  outline: "none", transition: "border-color 0.2s, background 0.2s",
};
const lbl = {
  display: "block", color: "rgba(122,88,104,0.85)",
  fontSize: "0.76rem", fontWeight: 700, marginBottom: "0.38rem", letterSpacing: "0.04em",
};
const primaryBtn = {
  width: "100%", padding: "0.85rem",
  background: `linear-gradient(135deg,${C.bright},${C.light})`,
  color: "#fff", border: "none", borderRadius: 12,
  fontSize: "0.95rem", fontWeight: 800, cursor: "pointer",
  fontFamily: "'Figtree', 'Heebo', system-ui, sans-serif",
  boxShadow: "0 4px 18px rgba(184, 97, 122,0.38)",
  transition: "transform 0.2s, box-shadow 0.2s",
  marginBottom: "0.9rem",
};
const errBox = {
  background: "rgba(194, 92, 92,0.15)", border: "1px solid rgba(194, 92, 92,0.3)",
  borderRadius: 10, padding: "0.65rem 0.9rem", marginBottom: "1rem",
  fontSize: "0.82rem", color: "#d99090",
};

function normalizePhone(raw) {
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("0")) s = "+972" + s.slice(1);
  else if (s.startsWith("972") && !s.startsWith("+")) s = "+" + s;
  else if (!s.startsWith("+")) s = "+" + s;
  return s;
}

function Fld({ label, children }) {
  return (
    <div style={{ marginBottom: "0.95rem" }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

export default function CompleteProfilePage() {
  const { user, logout, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.displayName?.split(" ")[0] || "",
    lastName: user?.displayName?.split(" ").slice(1).join(" ") || "",
    phone: user?.phoneNumber || "",
    email: user?.email || "",
    birthdate: "",
    profession: "",
    city: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError("יש לאשר את הסכמת שיתוף הפרטים."); return; }
    setError(""); setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        firstName: form.firstName, lastName: form.lastName,
        phone: normalizePhone(form.phone), email: form.email,
        birthdate: form.birthdate || null,
        profession: form.profession, city: form.city,
        emailVerified: true, acceptedTerms: false,
        createdAt: new Date().toISOString(),
      });
      await refreshProfile();
    } catch (err) {
      setError("שגיאה בשמירת הפרופיל. נסי שוב.");
    } finally {
      setLoading(false);
    }
  };

  const initials = (form.firstName?.[0] || "") + (form.lastName?.[0] || "") || user?.email?.[0]?.toUpperCase() || "?";

  const focusIn  = (e) => { e.target.style.borderColor = C.sky; e.target.style.background = "rgba(255,255,255,0.11)"; };
  const focusOut = (e) => { e.target.style.borderColor = "rgba(184,97,122,0.25)"; e.target.style.background = "rgba(255,255,255,0.85)"; };

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Figtree', 'Heebo', system-ui, sans-serif", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/background.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.75)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "linear-gradient(135deg,rgba(7,20,64,0.55) 0%,rgba(26,58,143,0.40) 100%)" }} />

      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10, padding: "1.2rem 2.5rem", display: "flex", alignItems: "center", direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>♀</div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>מנהיגות שווה</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(200,221,251,0.55)", letterSpacing: "0.07em" }}>רשת בוגרות</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{ position: "relative", zIndex: 5, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 1rem 5rem" }}>
        <div style={{
          width: "100%", maxWidth: 440,
          background: "rgba(7,20,64,0.78)", backdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22,
          padding: "2.4rem", boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          direction: "rtl",
          animation: "cardUp 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        }}>
          {/* Avatar */}
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.bright},${C.light})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: "0 auto 1rem", boxShadow: "0 4px 16px rgba(184, 97, 122,0.4)" }}>
            {initials.toUpperCase()}
          </div>

          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "0.3rem", textAlign: "center" }}>השלמת פרופיל</div>
          <p style={{ color: "rgba(200,221,251,0.55)", fontSize: "0.83rem", marginBottom: "1.6rem", textAlign: "center" }}>ברוכה הבאה! מלאי את הפרטים כדי להצטרף לרשת</p>

          <form onSubmit={handleSubmit}>
            {error && <div style={errBox}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
              <Fld label="שם פרטי *">
                <input style={inp} type="text" name="firstName" value={form.firstName} onChange={set} placeholder="שם" required onFocus={focusIn} onBlur={focusOut} />
              </Fld>
              <Fld label="שם משפחה *">
                <input style={inp} type="text" name="lastName" value={form.lastName} onChange={set} placeholder="משפחה" required onFocus={focusIn} onBlur={focusOut} />
              </Fld>
            </div>

            <Fld label="מספר טלפון *">
              <input style={{ ...inp, direction: "ltr", textAlign: "left" }} type="tel" name="phone" value={form.phone} onChange={set} placeholder="05X-XXXXXXX" required onFocus={focusIn} onBlur={focusOut} />
            </Fld>

            <Fld label="אימייל *">
              <input style={{ ...inp, direction: "ltr", textAlign: "left" }} type="email" name="email" value={form.email} onChange={set} placeholder="your@email.com" required onFocus={focusIn} onBlur={focusOut} />
            </Fld>

            <Fld label="תאריך לידה (אופציונלי)">
              <input style={{ ...inp, colorScheme: "dark" }} type="date" name="birthdate" value={form.birthdate} onChange={set} onFocus={focusIn} onBlur={focusOut} />
            </Fld>

            <Fld label="מקצוע / תפקיד *">
              <input style={inp} type="text" name="profession" value={form.profession} onChange={set} placeholder="רופאה, עורכת דין, מהנדסת..." required onFocus={focusIn} onBlur={focusOut} />
            </Fld>

            <Fld label="עיר מגורים *">
              <input style={inp} type="text" name="city" value={form.city} onChange={set} placeholder="תל אביב, ירושלים..." required onFocus={focusIn} onBlur={focusOut} />
            </Fld>

            {/* Privacy toggle */}
            <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "0.85rem", marginBottom: "1.1rem" }}>
              <div onClick={() => setAgreed(!agreed)} style={{ width: 36, height: 19, flexShrink: 0, background: agreed ? C.light : "rgba(255,255,255,0.18)", borderRadius: 10, position: "relative", cursor: "pointer", transition: "background 0.2s", marginTop: 2 }}>
                <div style={{ position: "absolute", width: 13, height: 13, background: "#fff", borderRadius: "50%", top: 3, right: agreed ? 3 : "auto", left: agreed ? "auto" : 3, transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
              <div style={{ color: "rgba(200,221,251,0.6)", fontSize: "0.75rem", lineHeight: 1.55 }}>
                <strong style={{ color: "rgba(200,221,251,0.88)" }}>מסכימה לשיתוף פרטים בתוך הרשת</strong><br />
                שם, מייל ומומחיות יהיו גלויים לבוגרות אחרות.
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...primaryBtn, ...(loading ? { opacity: 0.65, cursor: "not-allowed" } : {}) }}
              onMouseOver={e => !loading && (e.target.style.transform = "translateY(-1px)")}
              onMouseOut={e => (e.target.style.transform = "")}>
              {loading ? "שומרת..." : "המשך לרשת →"}
            </button>
          </form>

          <button onClick={logout} style={{ background: "none", border: "none", color: "rgba(200,221,251,0.4)", fontSize: "0.78rem", cursor: "pointer", display: "block", margin: "0 auto", fontFamily: "'Figtree', 'Heebo', system-ui, sans-serif" }}>
            התנתקי והשתמשי בחשבון אחר
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "center", gap: "3.5rem", padding: "0.9rem", background: "rgba(7,20,64,0.65)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[["500+", "בוגרות"], ["10+", "שנות פעילות"], ["🔒", "פרטיות מלאה"], ["חינם", "להצטרפות"]].map(([n, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{n}</div>
            <div style={{ color: "rgba(200,221,251,0.45)", fontSize: "0.67rem", marginTop: "0.1rem" }}>{l}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes cardUp { from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);} }
        input::placeholder { color: rgba(200,221,251,0.3) !important; }
      `}</style>
    </div>
  );
}
