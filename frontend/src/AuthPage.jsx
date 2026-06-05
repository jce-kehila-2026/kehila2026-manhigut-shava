import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

/* ─── Rose & Plum palette ─── */
const C = {
  brand: "#b8617a",      // dusty rose (primary)
  brandSoft: "#d48aa0",  // lighter rose hover
  plum: "#4a1f3d",       // deep plum (text / accent)
  plumDeep: "#2e1428",   // darkest plum
  cream: "#fdf8f6",      // page bg
  blush: "#f7ecec",      // surface tint
  blushDeep: "#e8c5c5",  // borders / dividers
  ink: "#3a2230",        // body text
  mute: "#8a6b76",       // muted text
  line: "#ecd8de",       // hairline
};

/* ─── helpers (unchanged) ─── */
function normalizePhone(raw) {
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("0")) s = "+972" + s.slice(1);
  else if (s.startsWith("972") && !s.startsWith("+")) s = "+" + s;
  else if (!s.startsWith("+")) s = "+" + s;
  return s;
}

function firebaseMsg(code) {
  const m = {
    "auth/invalid-credential": "אימייל או סיסמה שגויים.",
    "auth/user-not-found": "לא נמצא חשבון עם אימייל זה.",
    "auth/wrong-password": "סיסמה שגויה.",
    "auth/email-already-in-use": "קיים כבר חשבון עם אימייל זה.",
    "auth/weak-password": "הסיסמה חייבת לכלול לפחות 6 תווים.",
    "auth/invalid-email": "כתובת אימייל לא תקינה.",
    "auth/too-many-requests": "יותר מדי ניסיונות. נסי שוב מאוחר יותר.",
    "auth/popup-closed-by-user": "הכניסה בוטלה.",
  };
  return m[code] || `שגיאה (${code || "unknown"}). נסי שוב.`;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

/* ─── shared field styles ─── */
const fontStack = "'Figtree','Outfit',system-ui,-apple-system,sans-serif";

const inp = {
  width: "100%", padding: "0.85rem 1rem", boxSizing: "border-box",
  background: "#fff", border: `1px solid ${C.line}`,
  borderRadius: 12, color: C.ink, fontSize: "0.92rem",
  fontFamily: fontStack, fontWeight: 500,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
};
const lbl = {
  display: "block", color: C.mute,
  fontSize: "0.74rem", fontWeight: 600, marginBottom: "0.45rem",
  letterSpacing: "0.02em",
};
const primaryBtn = {
  width: "100%", padding: "0.9rem",
  background: C.brand, color: "#fff",
  border: "none", borderRadius: 12,
  fontSize: "0.94rem", fontWeight: 600, cursor: "pointer",
  fontFamily: fontStack, letterSpacing: "0.01em",
  boxShadow: `0 6px 20px ${C.brand}38`,
  transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
  marginBottom: "0.9rem",
};
const ghostBtn = {
  width: "100%", padding: "0.85rem",
  background: "#fff", color: C.ink,
  border: `1px solid ${C.line}`, borderRadius: 12,
  fontSize: "0.88rem", fontWeight: 500, cursor: "pointer",
  fontFamily: fontStack,
  transition: "background 0.2s, border-color 0.2s", marginBottom: "0.9rem",
};
const errBox = {
  background: "#fbeaea", border: "1px solid #e9c4c4",
  borderRadius: 10, padding: "0.7rem 0.95rem", marginBottom: "1rem",
  fontSize: "0.82rem", color: "#9b2c3a", fontWeight: 500,
};
const okBox = {
  background: "#eaf5ee", border: "1px solid #c5dfcd",
  borderRadius: 10, padding: "0.7rem 0.95rem", marginBottom: "1rem",
  fontSize: "0.82rem", color: "#2f6b48", fontWeight: 500,
};

function focusOn(e)  { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brand}1f`; }
function focusOff(e) { e.target.style.borderColor = C.line;  e.target.style.boxShadow = "none"; }

function Fld({ label, children }) {
  return (
    <div style={{ marginBottom: "0.95rem" }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

/* ─── GOOGLE BUTTON ─── */
function GoogleButton({ label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handle = async () => {
    setLoading(true); setError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };
  return (
    <>
      {error && <div style={errBox}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{
        ...ghostBtn, display: "flex", alignItems: "center",
        justifyContent: "center", gap: 10,
      }}
        onMouseOver={e => { e.currentTarget.style.background = C.blush; e.currentTarget.style.borderColor = C.blushDeep; }}
        onMouseOut={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = C.line; }}
      >
        <GoogleIcon /> {loading ? "מתחבר..." : label}
      </button>
    </>
  );
}

/* ─── LOGIN FORM ─── */
function LoginForm({ onSwitchTab }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await signInWithEmailAndPassword(auth, form.email, form.password); }
    catch (e) { setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };

  const forgot = async () => {
    if (!form.email) { setError("הכניסי אימייל למעלה לפני איפוס הסיסמה."); return; }
    try { await sendPasswordResetEmail(auth, form.email); setResetSent(true); setError(""); }
    catch (e) { setError(firebaseMsg(e.code)); }
  };

  return (
    <form onSubmit={submit} style={{ direction: "rtl" }} autoComplete="off">
      <h1 style={{
        fontFamily: "'Outfit',system-ui,sans-serif",
        fontSize: "1.7rem", fontWeight: 600, color: C.plum,
        marginBottom: "0.35rem", letterSpacing: "-0.01em",
      }}>ברוכה הבאה</h1>
      <p style={{ color: C.mute, fontSize: "0.86rem", marginBottom: "1.6rem", fontWeight: 400 }}>
        היכנסי לרשת הבוגרות שלך
      </p>
      {error && <div style={errBox}>{error}</div>}
      {resetSent && <div style={okBox}>נשלח אימייל לאיפוס סיסמה ✓</div>}
      <Fld label="אימייל">
        <input style={inp} type="email" name="email" placeholder="your@email.com" dir="ltr" value={form.email} onChange={set} required autoComplete="off"
          onFocus={focusOn} onBlur={focusOff} />
      </Fld>
      <Fld label="סיסמה">
        <input style={inp} type="password" name="password" placeholder="••••••••" dir="ltr" value={form.password} onChange={set} required autoComplete="new-password"
          onFocus={focusOn} onBlur={focusOff} />
      </Fld>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: C.mute, fontSize: "0.8rem", cursor: "pointer" }}>
          <input type="checkbox" style={{ accentColor: C.brand }} /> זכרי אותי
        </label>
        <button type="button" onClick={forgot} style={{ background: "none", border: "none", color: C.brand, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>שכחתי סיסמה</button>
      </div>
      <button type="submit" disabled={loading} style={primaryBtn}
        onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = C.brandSoft; }}
        onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = C.brand; }}
      >{loading ? "מתחברת..." : "כניסה לחשבון →"}</button>
      <p style={{ textAlign: "center", color: C.mute, fontSize: "0.8rem", margin: 0 }}>
        עוד לא רשומה?{" "}
        <button type="button" onClick={() => onSwitchTab("signup")} style={{ background: "none", border: "none", color: C.brand, fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" }}>הרשמי עכשיו</button>
      </p>
    </form>
  );
}

/* ─── SIGN UP FORM (3-step) ─── */
function SignUpForm({ onSwitchTab }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    institution: "", profession: "", city: "",
    password: "", confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!agreed) { setError("יש לאשר את הסכמת שיתוף הפרטים."); return; }
    if (form.password !== form.confirmPassword) { setError("הסיסמאות אינן תואמות."); return; }
    setError(""); setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", user.uid), {
        firstName: form.firstName, lastName: form.lastName,
        phone: normalizePhone(form.phone), email: form.email,
        institution: form.institution, profession: form.profession, city: form.city,
        emailVerified: false, acceptedTerms: false, createdAt: new Date().toISOString(),
      });
    } catch (e) { setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };

  const progressBar = (
    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.8rem" }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          flex: 1, height: 3, borderRadius: 99,
          background: n <= step ? C.brand : C.line,
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );

  const inputStyle = (name) => ({
    ...inp,
    ...(["email", "phone", "password", "confirmPassword"].includes(name) ? { direction: "ltr", textAlign: "left" } : {}),
  });

  const heading = { fontFamily: "'Outfit',system-ui,sans-serif", fontSize: "1.65rem", fontWeight: 600, color: C.plum, marginBottom: "0.35rem", letterSpacing: "-0.01em" };
  const sub     = { color: C.mute, fontSize: "0.85rem", marginBottom: "1.6rem", fontWeight: 400 };

  return (
    <div style={{ direction: "rtl" }}>
      {progressBar}
      {step === 1 && (
        <>
          <h2 style={heading}>הרשמה לרשת</h2>
          <p style={sub}>מלאי את הפרטים האישיים שלך</p>
          {error && <div style={errBox}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
            <Fld label="שם פרטי *">
              <input style={inputStyle("firstName")} name="firstName" value={form.firstName} onChange={set} placeholder="שם" required onFocus={focusOn} onBlur={focusOff} />
            </Fld>
            <Fld label="שם משפחה *">
              <input style={inputStyle("lastName")} name="lastName" value={form.lastName} onChange={set} placeholder="משפחה" required onFocus={focusOn} onBlur={focusOff} />
            </Fld>
          </div>
          <Fld label="אימייל *">
            <input style={inputStyle("email")} type="email" name="email" value={form.email} onChange={set} placeholder="your@email.com" required onFocus={focusOn} onBlur={focusOff} />
          </Fld>
          <Fld label="טלפון *">
            <input style={inputStyle("phone")} type="tel" name="phone" value={form.phone} onChange={set} placeholder="05X-XXXXXXX" required onFocus={focusOn} onBlur={focusOff} />
          </Fld>
          <button style={primaryBtn} onClick={() => {
            if (!form.firstName || !form.lastName || !form.email || !form.phone) { setError("מלאי את כל השדות הנדרשים."); return; }
            setError(""); setStep(2);
          }}>המשך →</button>
          <p style={{ textAlign: "center", color: C.mute, fontSize: "0.8rem", margin: 0 }}>
            כבר יש לך חשבון?{" "}
            <button type="button" onClick={() => onSwitchTab("login")} style={{ background: "none", border: "none", color: C.brand, fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" }}>כניסה</button>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={heading}>פרטים מקצועיים</h2>
          <p style={sub}>ספרי לנו עליך</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label="מוסד לימודים">
            <select style={{ ...inp, color: form.institution ? C.ink : C.mute }} name="institution" value={form.institution} onChange={set} onFocus={focusOn} onBlur={focusOff}>
              <option value="">בחרי מוסד...</option>
              {["אוניברסיטת תל-אביב", "האוניברסיטה העברית בירושלים", "אוניברסיטת חיפה", "בר אילן", "אוניברסיטת בן-גוריון", "מכללות ירושלים", "אחר"].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Fld>
          <Fld label="מקצוע / תפקיד">
            <input style={inputStyle("profession")} name="profession" value={form.profession} onChange={set} placeholder="רופאה, עורכת דין, מהנדסת..." onFocus={focusOn} onBlur={focusOff} />
          </Fld>
          <Fld label="עיר מגורים">
            <input style={inputStyle("city")} name="city" value={form.city} onChange={set} placeholder="תל אביב, ירושלים..." onFocus={focusOn} onBlur={focusOff} />
          </Fld>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem" }}>
            <button style={{ ...ghostBtn, margin: 0 }} onClick={() => setStep(1)}>← חזרה</button>
            <button style={{ ...primaryBtn, margin: 0 }} onClick={() => { setError(""); setStep(3); }}>המשך →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={heading}>הגדרת סיסמה</h2>
          <p style={sub}>כמעט סיימנו</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label="סיסמה *">
            <input style={inputStyle("password")} type="password" name="password" value={form.password} onChange={set} placeholder="לפחות 6 תווים" required onFocus={focusOn} onBlur={focusOff} />
          </Fld>
          <Fld label="אימות סיסמה *">
            <input style={inputStyle("confirmPassword")} type="password" name="confirmPassword" value={form.confirmPassword} onChange={set} placeholder="חזרי על הסיסמה" required onFocus={focusOn} onBlur={focusOff} />
          </Fld>
          <div style={{
            display: "flex", gap: "0.75rem", alignItems: "flex-start",
            background: C.blush, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "0.95rem", marginBottom: "1.1rem",
          }}>
            <div
              onClick={() => setAgreed(!agreed)}
              style={{
                width: 36, height: 20, flexShrink: 0,
                background: agreed ? C.brand : "#d9c4cb",
                borderRadius: 99, position: "relative", cursor: "pointer",
                transition: "background 0.2s", marginTop: 2,
              }}>
              <div style={{
                position: "absolute", width: 14, height: 14, background: "#fff",
                borderRadius: "50%", top: 3,
                right: agreed ? 3 : "auto", left: agreed ? "auto" : 3,
                transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
              }} />
            </div>
            <div style={{ color: C.ink, fontSize: "0.78rem", lineHeight: 1.6 }}>
              <strong style={{ color: C.plum, fontWeight: 600 }}>מסכימה לשיתוף פרטים בתוך הרשת</strong><br />
              <span style={{ color: C.mute }}>שם, מייל ומומחיות יהיו גלויים לבוגרות אחרות. פרטי קשר — רק לאחר אישורך.</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem" }}>
            <button style={{ ...ghostBtn, margin: 0 }} onClick={() => setStep(2)}>← חזרה</button>
            <button style={{ ...primaryBtn, margin: 0 }} disabled={loading} onClick={submit}>
              {loading ? "יוצרת חשבון..." : "הרשמה →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── MAIN ─── */
export default function AuthPage({ onBack }) {
  const [tab, setTab] = useState("login");

  return (
    <div style={{
      minHeight: "100vh", position: "relative",
      fontFamily: fontStack,
      background: C.cream,
      overflow: "hidden",
    }}>
      {/* Soft floral bloom backdrop — pure CSS, no photo */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: `
          radial-gradient(800px circle at 12% 18%, ${C.blush} 0%, transparent 55%),
          radial-gradient(700px circle at 88% 82%, #f3dde2 0%, transparent 55%),
          radial-gradient(500px circle at 70% 12%, #faeef0 0%, transparent 60%),
          ${C.cream}
        `,
      }} />

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "1.3rem 2.5rem", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        direction: "rtl",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 40, height: 40, background: "#fff",
            border: `1px solid ${C.line}`, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", color: C.brand,
            boxShadow: `0 4px 14px ${C.brand}1f`,
          }}>♀</div>
          <div>
            <div style={{
              fontFamily: "'Outfit',system-ui,sans-serif",
              fontSize: "1.02rem", fontWeight: 600, color: C.plum, lineHeight: 1.15,
              letterSpacing: "-0.005em",
            }}>מנהיגות שווה</div>
            <div style={{ fontSize: "0.66rem", color: C.mute, letterSpacing: "0.08em", fontWeight: 500 }}>רשת בוגרות</div>
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} style={{
            background: "#fff",
            border: `1px solid ${C.line}`,
            color: C.ink, borderRadius: 99,
            padding: "8px 18px", fontSize: "0.82rem",
            fontWeight: 500, cursor: "pointer",
            fontFamily: fontStack,
            transition: "background 0.2s, border-color 0.2s",
          }}
            onMouseOver={e => { e.currentTarget.style.background = C.blush; e.currentTarget.style.borderColor = C.blushDeep; }}
            onMouseOut={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = C.line; }}
          >
            ← חזרה לדף הבית
          </button>
        )}
      </div>

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 5,
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6rem 1rem 5rem",
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          background: "#fff",
          border: `1px solid ${C.line}`,
          borderRadius: 24, padding: "2.5rem",
          boxShadow: "0 20px 60px rgba(74,31,61,0.10), 0 4px 16px rgba(74,31,61,0.05)",
          animation: "cardUp 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex", background: C.blush,
            borderRadius: 99, padding: 4, marginBottom: "1.8rem",
            direction: "rtl",
          }}>
            {[["login", "כניסה"], ["signup", "הרשמה"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "0.55rem", borderRadius: 99, border: "none",
                background: tab === key ? "#fff" : "transparent",
                color: tab === key ? C.plum : C.mute,
                fontFamily: fontStack,
                fontSize: "0.86rem", fontWeight: 600, cursor: "pointer",
                boxShadow: tab === key ? "0 2px 8px rgba(74,31,61,0.08)" : "none",
                transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          {tab === "login" ? (
            <>
              <GoogleButton label="המשכי עם Google" />
              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "1.3rem 0" }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{ fontSize: "0.74rem", color: C.mute, fontWeight: 500 }}>או המשכי עם אימייל</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
              </div>
              <LoginForm onSwitchTab={setTab} />
            </>
          ) : (
            <>
              <GoogleButton label="הרשמי עם Google" />
              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "1.3rem 0" }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{ fontSize: "0.74rem", color: C.mute, fontWeight: 500 }}>או הרשמי עם אימייל</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
              </div>
              <SignUpForm onSwitchTab={setTab} />
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cardUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: ${C.mute} !important; opacity: 0.7; }
        select option { background: #fff; }
      `}</style>
    </div>
  );
}
