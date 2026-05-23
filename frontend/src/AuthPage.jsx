import { useState, useRef, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

/* ─── colours ─── */
const C = {
  blue: "#1a3a8f", bright: "#2f5fd4", light: "#4a7ae8",
  sky: "#38bdf8", pale: "#c8ddfb", deep: "#0b1f52", deeper: "#071440",
};

/* ─── helpers ─── */
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
    "auth/invalid-phone-number": "מספר טלפון לא תקין (לדוג. +972501234567).",
    "auth/code-expired": "קוד האימות פג. בקשי קוד חדש.",
    "auth/invalid-verification-code": "קוד שגוי. בדקי ונסי שוב.",
    "auth/operation-not-allowed": "כניסה בטלפון אינה מופעלת. פני למנהל.",
    "auth/internal-error": "כניסה בטלפון אינה מופעלת. פני למנהל.",
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

/* ─── shared input style ─── */
const inp = {
  width: "100%", padding: "0.78rem 1rem", boxSizing: "border-box",
  background: "#f8fafc", border: "1.5px solid #e2e8f0",
  borderRadius: 9, color: "#1e293b", fontSize: "0.9rem",
  fontFamily: "'Heebo', system-ui, sans-serif",
  outline: "none", transition: "border-color 0.2s, background 0.2s",
};
const lbl = {
  display: "block", color: "#64748b",
  fontSize: "0.76rem", fontWeight: 700, marginBottom: "0.38rem", letterSpacing: "0.04em",
};
const primaryBtn = {
  width: "100%", padding: "0.85rem",
  background: `linear-gradient(135deg,${C.bright},${C.light})`,
  color: "#fff", border: "none", borderRadius: 9,
  fontSize: "0.95rem", fontWeight: 800, cursor: "pointer",
  fontFamily: "'Heebo', system-ui, sans-serif",
  boxShadow: "0 4px 18px rgba(47,95,212,0.28)",
  transition: "transform 0.2s, box-shadow 0.2s",
  marginBottom: "0.9rem",
};
const ghostBtn = {
  width: "100%", padding: "0.85rem",
  background: "#f8fafc", color: "#475569",
  border: "1px solid #e2e8f0", borderRadius: 9,
  fontSize: "0.88rem", fontWeight: 600, cursor: "pointer",
  fontFamily: "'Heebo', system-ui, sans-serif",
  transition: "background 0.2s", marginBottom: "0.9rem",
};
const errBox = {
  background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.25)",
  borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: "1rem",
  fontSize: "0.82rem", color: "#dc2626",
};
const okBox = {
  background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.25)",
  borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: "1rem",
  fontSize: "0.82rem", color: "#16a34a",
};

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
        onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
        onMouseOut={e => e.currentTarget.style.background = "#f8fafc"}
      >
        <GoogleIcon /> {loading ? "מתחבר..." : label}
      </button>
    </>
  );
}

/* ─── PHONE AUTH ─── */
function PhoneAuth({ onBack }) {
  const [step, setStep] = useState("number");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conf, setConf] = useState(null);
  const rcRef = useRef(null);

  useEffect(() => () => {
    if (window.recaptchaVerifier) { try { window.recaptchaVerifier.clear(); } catch (_) {} window.recaptchaVerifier = null; }
  }, []);

  const sendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim()) { setError("הכניסי מספר טלפון."); return; }
    setLoading(true); setError("");
    try {
      if (window.recaptchaVerifier) { try { window.recaptchaVerifier.clear(); } catch (_) {} }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, rcRef.current, { size: "invisible" });
      const result = await signInWithPhoneNumber(auth, normalizePhone(phone), window.recaptchaVerifier);
      setConf(result); setStep("code");
    } catch (e) { console.error("Phone auth error:", e); setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError("הכניסי את קוד האימות."); return; }
    setLoading(true); setError("");
    try { await conf.confirm(code); }
    catch (e) { setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ direction: "rtl" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.83rem", cursor: "pointer", padding: "0 0 1.2rem", fontFamily: "'Heebo', system-ui, sans-serif" }}>
        ← חזרה לכניסה
      </button>
      {step === "number" ? (
        <form onSubmit={sendCode}>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a3c5e", marginBottom: "0.3rem" }}>כניסה בטלפון</div>
          <p style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: "1.5rem" }}>נשלח קוד אימות למספר שלך</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label="מספר טלפון">
            <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="052-1234567" dir="ltr"
              onFocus={e => e.target.style.borderColor = C.sky}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </Fld>
          <div ref={rcRef} />
          <button type="submit" disabled={loading} style={primaryBtn}
            onMouseOver={e => e.target.style.transform = "translateY(-1px)"}
            onMouseOut={e => e.target.style.transform = ""}
          >{loading ? "שולח..." : "שלחי קוד אימות →"}</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a3c5e", marginBottom: "0.3rem" }}>הכניסי את הקוד</div>
          <p style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: "1.5rem" }}>נשלח ל־<strong style={{ color: C.blue }}>{phone}</strong></p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label="קוד בן 6 ספרות">
            <input style={{ ...inp, letterSpacing: 8, textAlign: "center", fontSize: "1.4rem", fontWeight: 800 }}
              type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6} autoFocus placeholder="• • • • • •" dir="ltr"
              onFocus={e => e.target.style.borderColor = C.sky}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </Fld>
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "מאמת..." : "אמתי וכנסי →"}</button>
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.78rem" }}>
            לא קיבלת?{" "}
            <button type="button" onClick={() => { setStep("number"); setCode(""); setError(""); }}
              style={{ background: "none", border: "none", color: C.bright, fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}>
              שלחי שוב
            </button>
          </p>
        </form>
      )}
    </div>
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
      <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#1a3c5e", marginBottom: "0.3rem" }}>ברוכה הבאה! 👋</div>
      <p style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: "1.6rem" }}>היכנסי לרשת הבוגרות שלך</p>
      {error && <div style={errBox}>{error}</div>}
      {resetSent && <div style={okBox}>נשלח אימייל לאיפוס סיסמה ✓</div>}
      <Fld label="אימייל">
        <input style={inp} type="email" name="email" placeholder="your@email.com" dir="ltr" value={form.email} onChange={set} required autoComplete="off"
          onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
      </Fld>
      <Fld label="סיסמה">
        <input style={inp} type="password" name="password" placeholder="••••••••" dir="ltr" value={form.password} onChange={set} required autoComplete="new-password"
          onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
      </Fld>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#64748b", fontSize: "0.78rem", cursor: "pointer" }}>
          <input type="checkbox" style={{ accentColor: C.sky }} /> זכרי אותי
        </label>
        <button type="button" onClick={forgot} style={{ background: "none", border: "none", color: C.bright, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>שכחתי סיסמה</button>
      </div>
      <button type="submit" disabled={loading} style={primaryBtn}
        onMouseOver={e => e.target.style.transform = "translateY(-1px)"}
        onMouseOut={e => e.target.style.transform = ""}
      >{loading ? "מתחברת..." : "כניסה לחשבון →"}</button>
      <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", margin: 0 }}>
        עוד לא רשומה?{" "}
        <button type="button" onClick={() => onSwitchTab("signup")} style={{ background: "none", border: "none", color: C.bright, fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}>הרשמי עכשיו</button>
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
    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.7rem" }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: n < step ? C.light : n === step ? C.sky : "#e2e8f0",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );

  const inputStyle = (name) => ({
    ...inp,
    ...(["email", "phone", "password", "confirmPassword"].includes(name) ? { direction: "ltr", textAlign: "left" } : {}),
  });

  return (
    <div style={{ direction: "rtl" }}>
      {progressBar}
      {step === 1 && (
        <>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#1a3c5e", marginBottom: "0.3rem" }}>הרשמה לרשת</div>
          <p style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: "1.6rem" }}>מלאי את הפרטים האישיים שלך</p>
          {error && <div style={errBox}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
            <Fld label="שם פרטי *">
              <input style={inputStyle("firstName")} name="firstName" value={form.firstName} onChange={set} placeholder="שם" required
                onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </Fld>
            <Fld label="שם משפחה *">
              <input style={inputStyle("lastName")} name="lastName" value={form.lastName} onChange={set} placeholder="משפחה" required
                onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </Fld>
          </div>
          <Fld label="אימייל *">
            <input style={inputStyle("email")} type="email" name="email" value={form.email} onChange={set} placeholder="your@email.com" required
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </Fld>
          <Fld label="טלפון *">
            <input style={inputStyle("phone")} type="tel" name="phone" value={form.phone} onChange={set} placeholder="05X-XXXXXXX" required
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </Fld>
          <button style={primaryBtn} onClick={() => {
            if (!form.firstName || !form.lastName || !form.email || !form.phone) { setError("מלאי את כל השדות הנדרשים."); return; }
            setError(""); setStep(2);
          }}>המשך →</button>
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", margin: 0 }}>
            כבר יש לך חשבון?{" "}
            <button type="button" onClick={() => onSwitchTab("login")} style={{ background: "none", border: "none", color: C.bright, fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}>כניסה</button>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#1a3c5e", marginBottom: "0.3rem" }}>פרטים מקצועיים</div>
          <p style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: "1.6rem" }}>ספרי לנו עליך</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label="מוסד לימודים">
            <select style={{ ...inp, color: form.institution ? "#1e293b" : "#94a3b8" }} name="institution" value={form.institution} onChange={set}
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
              <option value="" style={{ background: "#fff" }}>בחרי מוסד...</option>
              {["אוניברסיטת תל-אביב", "האוניברסיטה העברית בירושלים", "אוניברסיטת חיפה", "בר אילן", "אוניברסיטת בן-גוריון", "מכללות ירושלים", "אחר"].map(o => (
                <option key={o} value={o} style={{ background: "#fff" }}>{o}</option>
              ))}
            </select>
          </Fld>
          <Fld label="מקצוע / תפקיד">
            <input style={inputStyle("profession")} name="profession" value={form.profession} onChange={set} placeholder="רופאה, עורכת דין, מהנדסת..."
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </Fld>
          <Fld label="עיר מגורים">
            <input style={inputStyle("city")} name="city" value={form.city} onChange={set} placeholder="תל אביב, ירושלים..."
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </Fld>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.55rem" }}>
            <button style={{ ...ghostBtn, margin: 0 }} onClick={() => setStep(1)}>← חזרה</button>
            <button style={{ ...primaryBtn, margin: 0 }} onClick={() => { setError(""); setStep(3); }}>המשך →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#1a3c5e", marginBottom: "0.3rem" }}>הגדרת סיסמה</div>
          <p style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: "1.6rem" }}>כמעט סיימנו!</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label="סיסמה *">
            <input style={inputStyle("password")} type="password" name="password" value={form.password} onChange={set} placeholder="לפחות 6 תווים" required
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </Fld>
          <Fld label="אימות סיסמה *">
            <input style={inputStyle("confirmPassword")} type="password" name="confirmPassword" value={form.confirmPassword} onChange={set} placeholder="חזרי על הסיסמה" required
              onFocus={e => e.target.style.borderColor = C.sky} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </Fld>
          <div style={{
            display: "flex", gap: "0.7rem", alignItems: "flex-start",
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 9, padding: "0.85rem", marginBottom: "1.1rem",
          }}>
            <div
              onClick={() => setAgreed(!agreed)}
              style={{
                width: 36, height: 19, flexShrink: 0,
                background: agreed ? C.light : "#cbd5e1",
                borderRadius: 10, position: "relative", cursor: "pointer",
                transition: "background 0.2s", marginTop: 2,
              }}>
              <div style={{
                position: "absolute", width: 13, height: 13, background: "#fff",
                borderRadius: "50%", top: 3,
                right: agreed ? 3 : "auto", left: agreed ? "auto" : 3,
                transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
            <div style={{ color: "#64748b", fontSize: "0.75rem", lineHeight: 1.55 }}>
              <strong style={{ color: "#1a3c5e" }}>מסכימה לשיתוף פרטים בתוך הרשת</strong><br />
              שם, מייל ומומחיות יהיו גלויים לבוגרות אחרות. פרטי קשר — רק לאחר אישורך.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.55rem" }}>
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
export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [showPhone, setShowPhone] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", position: "relative",
      fontFamily: "'Heebo', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* Background photo */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "url(/background.jpg)",
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "brightness(0.88)",
      }} />
      {/* Light overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "linear-gradient(135deg,rgba(255,255,255,0.18) 0%,rgba(200,221,251,0.22) 100%)",
      }} />

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "1.2rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between",
        direction: "rtl",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div style={{
            width: 40, height: 40, background: "rgba(255,255,255,0.85)",
            border: "1.5px solid rgba(255,255,255,0.9)", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", backdropFilter: "blur(8px)",
          }}>♀</div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1.15, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>מנהיגות שווה</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.8)", letterSpacing: "0.07em", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>רשת בוגרות</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 5,
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6rem 1rem 5rem",
      }}>
        <div style={{
          width: "100%", maxWidth: 410,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.9)",
          borderRadius: 22, padding: "2.4rem",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "cardUp 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        }}>
          {showPhone ? (
            <PhoneAuth onBack={() => setShowPhone(false)} />
          ) : (
            <>
              {/* Tabs */}
              <div style={{
                display: "flex", background: "#f1f5f9",
                borderRadius: 10, padding: 3, marginBottom: "1.8rem",
                direction: "rtl",
              }}>
                {[["login", "כניסה"], ["signup", "הרשמה"]].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    flex: 1, padding: "0.52rem", borderRadius: 8, border: "none",
                    background: tab === key ? "#1a3c5e" : "transparent",
                    color: tab === key ? "#fff" : "#64748b",
                    fontFamily: "'Heebo', system-ui, sans-serif",
                    fontSize: "0.87rem", fontWeight: 700, cursor: "pointer",
                    boxShadow: tab === key ? "0 2px 8px rgba(26,60,94,0.2)" : "none",
                    transition: "all 0.2s",
                  }}>{label}</button>
                ))}
              </div>

              {tab === "login" ? (
                <>
                  <GoogleButton label="המשכי עם Google" />
                  <button style={{ ...ghostBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                    onClick={() => setShowPhone(true)}
                    onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                    onMouseOut={e => e.currentTarget.style.background = "#f8fafc"}
                  >
                    📱 המשכי עם טלפון
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "1.25rem 0" }}>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>או המשכי עם אימייל</span>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  </div>
                  <LoginForm onSwitchTab={setTab} />
                </>
              ) : (
                <>
                  <GoogleButton label="הרשמי עם Google" />
                  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "1.25rem 0" }}>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>או הרשמי עם אימייל</span>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  </div>
                  <SignUpForm onSwitchTab={setTab} />
                </>
              )}
            </>
          )}
        </div>
      </div>

<style>{`
        @keyframes cardUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: #94a3b8 !important; }
        select option { background: #fff; }
      `}</style>
    </div>
  );
}



