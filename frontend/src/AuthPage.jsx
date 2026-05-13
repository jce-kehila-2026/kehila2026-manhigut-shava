import { useState, useEffect, useRef } from "react";
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

/* ───── shared styles ───── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "2rem 1rem",
    boxSizing: "border-box",
    width: "100%",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: "440px",
  },
  logo: { textAlign: "center", marginBottom: "1.75rem" },
  logoText: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3c5e",
    letterSpacing: "-0.5px",
  },
  logoSub: {
    fontSize: "13px",
    color: "#94a3b8",
    marginTop: "4px",
  },
  tabs: {
    display: "flex",
    borderRadius: "10px",
    background: "#eef2f7",
    padding: "4px",
    marginBottom: "1.75rem",
  },
  tab: (active) => ({
    flex: 1,
    padding: "9px 0",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: active ? "600" : "400",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#1a3c5e" : "#6b7a8d",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
    transition: "all 0.2s",
  }),
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    margin: "1.25rem 0",
  },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  dividerText: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  googleBtn: {
    width: "100%",
    padding: "11px 16px",
    background: "#ffffff",
    color: "#374151",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  phoneBtn: {
    width: "100%",
    padding: "11px 16px",
    background: "#f8fafc",
    color: "#374151",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.2s",
    marginTop: "8px",
  },
  group: { marginBottom: "1.1rem" },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "1.1rem",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "6px",
    letterSpacing: "0.01em",
  },
  input: {
    width: "100%",
    padding: "10px 13px",
    fontSize: "14px",
    border: "1.5px solid #d1d9e0",
    borderRadius: "8px",
    outline: "none",
    color: "#1a2e42",
    background: "#fafbfc",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  disclaimer: {
    background: "#f0f7ff",
    border: "1px solid #c3daf5",
    borderRadius: "8px",
    padding: "12px 14px",
    marginBottom: "1.25rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  disclaimerText: {
    fontSize: "12px",
    color: "#3b5e80",
    lineHeight: "1.6",
    margin: 0,
  },
  checkbox: {
    marginTop: "2px",
    accentColor: "#2563eb",
    width: "15px",
    height: "15px",
    flexShrink: 0,
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "background 0.2s, transform 0.1s",
    marginTop: "0.25rem",
  },
  buttonDisabled: { opacity: 0.65, cursor: "not-allowed" },
  error: {
    background: "#fff0f0",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "10px 13px",
    marginBottom: "1rem",
    fontSize: "13px",
    color: "#b91c1c",
  },
  success: {
    background: "#f0fff4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    padding: "10px 13px",
    marginBottom: "1rem",
    fontSize: "13px",
    color: "#166534",
  },
  footer: {
    textAlign: "center",
    marginTop: "1.25rem",
    fontSize: "13px",
    color: "#6b7a8d",
  },
  link: {
    color: "#2563eb",
    fontWeight: "600",
    cursor: "pointer",
    background: "none",
    border: "none",
    fontSize: "13px",
    padding: 0,
    textDecoration: "underline",
  },
  forgotLink: {
    display: "block",
    textAlign: "right",
    fontSize: "12px",
    color: "#2563eb",
    cursor: "pointer",
    marginTop: "4px",
    textDecoration: "underline",
    background: "none",
    border: "none",
    padding: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: "13px",
    cursor: "pointer",
    padding: "0 0 1rem",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: "500",
  },
  phoneHint: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "4px",
    lineHeight: "1.5",
  },
};

/* ───── helpers ───── */
function normalizePhoneNumber(raw) {
  let cleaned = raw.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+972" + cleaned.slice(1);
  } else if (cleaned.startsWith("972") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

function getFirebaseErrorMessage(code) {
  const messages = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in cancelled. Please try again.",
    "auth/invalid-phone-number": "Please enter a valid phone number (e.g. +972501234567).",
    "auth/missing-phone-number": "Please enter your phone number.",
    "auth/code-expired": "Verification code expired. Please request a new one.",
    "auth/invalid-verification-code": "Invalid code. Please check and try again.",
    "auth/operation-not-allowed": "Phone sign-in is not enabled. Please contact the administrator.",
    "auth/internal-error": "Phone sign-in may not be enabled yet. Please contact the administrator.",
  };
  return messages[code] || `Something went wrong (${code || 'unknown'}). Please try again.`;
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

/* ───── Google Sign-In Button ───── */
function GoogleButton({ label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(getFirebaseErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div style={styles.error}>{error}</div>}
      <button
        style={styles.googleBtn}
        onClick={handleClick}
        disabled={loading}
        onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
      >
        <GoogleIcon />
        {loading ? "Connecting…" : label}
      </button>
    </>
  );
}

/* ───── Phone Auth Form ───── */
function PhoneAuthForm({ onBack }) {
  const [step, setStep] = useState("number");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const recaptchaContainerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (_) {}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (_) {}
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: "invisible",
    });
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setupRecaptcha();
      const normalized = normalizePhoneNumber(phone);
      const result = await signInWithPhoneNumber(auth, normalized, window.recaptchaVerifier);
      setConfirmation(result);
      setStep("code");
    } catch (err) {
      console.error("Phone auth error:", err.code, err.message);
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await confirmation.confirm(code);
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button style={styles.backBtn} onClick={onBack}>
        ← Back to login
      </button>

      {step === "number" ? (
        <form onSubmit={handleSendCode}>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "#1a3c5e", margin: "0 0 4px" }}>
            Sign in with Phone
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 1.5rem" }}>
            We'll send a verification code to your phone.
          </p>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.group}>
            <label style={styles.label}>Phone number</label>
            <input
              style={styles.input}
              type="tel"
              placeholder="052-1234567 or +972521234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <p style={styles.phoneHint}>
              You can enter 052xxxxxxx or +972 52 xxxxxxx — both work
            </p>
          </div>
          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? "Sending…" : "Send Verification Code"}
          </button>
          <div ref={recaptchaContainerRef}></div>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode}>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "#1a3c5e", margin: "0 0 4px" }}>
            Enter verification code
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 1.5rem" }}>
            Sent to <strong style={{ color: "#374151" }}>{phone}</strong>
          </p>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.group}>
            <label style={styles.label}>6-digit code</label>
            <input
              style={{ ...styles.input, letterSpacing: "6px", textAlign: "center", fontSize: "18px" }}
              type="text"
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? "Verifying…" : "Verify & Sign In"}
          </button>
          <p style={styles.footer}>
            Didn't receive it?{" "}
            <button
              style={styles.link}
              onClick={() => { setStep("number"); setCode(""); setError(""); }}
            >
              Try again
            </button>
          </p>
        </form>
      )}
    </>
  );
}

/* ───── Email Login Form ───── */
function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!form.email) {
      setError("Enter your email above, then click Forgot password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, form.email);
      setResetSent(true);
      setError("");
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={styles.error}>{error}</div>}
      {resetSent && (
        <div style={styles.success}>
          Password reset email sent. Check your inbox.
        </div>
      )}
      <div style={styles.group}>
        <label style={styles.label}>Email address</label>
        <input
          style={styles.input}
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.group}>
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          name="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="button" style={styles.forgotLink} onClick={handleForgotPassword}>
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
        disabled={loading}
        onMouseOver={(e) => !loading && (e.target.style.background = "#122d47")}
        onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
      >
        {loading ? "Logging in…" : "Log In"}
      </button>
    </form>
  );
}

/* ───── Email Sign Up Form ───── */
function SignUpForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthdate: "",
    profession: "",
    city: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the disclaimer to sign up.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      await setDoc(doc(db, "users", user.uid), {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: normalizePhoneNumber(form.phone),
        email: form.email,
        birthdate: form.birthdate || null,
        profession: form.profession,
        city: form.city,
        acceptedTerms: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.row}>
        <div>
          <label style={styles.label}>First name</label>
          <input style={styles.input} type="text" name="firstName" placeholder="Jane" value={form.firstName} onChange={handleChange} required />
        </div>
        <div>
          <label style={styles.label}>Last name</label>
          <input style={styles.input} type="text" name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
        </div>
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Phone number</label>
        <input style={styles.input} type="tel" name="phone" placeholder="052-1234567 or +972521234567" value={form.phone} onChange={handleChange} required />
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Email address</label>
        <input style={styles.input} type="email" name="email" placeholder="you@gmail.com" value={form.email} onChange={handleChange} required />
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Date of birth <span style={{ fontWeight: "400", color: "#94a3b8" }}>(optional)</span></label>
        <input style={styles.input} type="date" name="birthdate" value={form.birthdate} onChange={handleChange} />
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Profession / Job</label>
        <input style={styles.input} type="text" name="profession" placeholder="e.g. Doctor, Engineer, Lawyer..." value={form.profession} onChange={handleChange} required />
      </div>

      <div style={styles.group}>
        <label style={styles.label}>City</label>
        <input style={styles.input} type="text" name="city" placeholder="e.g. Tel Aviv, Jerusalem..." value={form.city} onChange={handleChange} required />
      </div>

      <div style={{ ...styles.group, marginBottom: "1.25rem" }}>
        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" name="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
      </div>

      <div style={{ ...styles.group, marginBottom: "1.25rem" }}>
        <label style={styles.label}>Confirm password</label>
        <input style={styles.input} type="password" name="confirmPassword" placeholder="Repeat your password" value={form.confirmPassword} onChange={handleChange} required minLength={6} />
      </div>

      <div style={styles.disclaimer}>
        <input type="checkbox" id="disclaimer" style={styles.checkbox} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <label htmlFor="disclaimer" style={styles.disclaimerText}>
          By signing up, I agree that my contact information — including my name,
          email address, and phone number — may be visible to and shared with
          other registered users of this platform.
        </label>
      </div>

      <button
        type="submit"
        style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
        disabled={loading}
        onMouseOver={(e) => !loading && (e.target.style.background = "#122d47")}
        onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}

/* ───── Main Auth Page ───── */
export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [showPhone, setShowPhone] = useState(false);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Manhigut Shava</span>
          <p style={styles.logoSub}>Graduate Community Platform</p>
        </div>

        {showPhone ? (
          <PhoneAuthForm onBack={() => setShowPhone(false)} />
        ) : (
          <>
            <div style={styles.tabs}>
              <button style={styles.tab(tab === "login")} onClick={() => setTab("login")}>Log In</button>
              <button style={styles.tab(tab === "signup")} onClick={() => setTab("signup")}>Sign Up</button>
            </div>

            {/* Google Sign-In */}
            <GoogleButton label={tab === "login" ? "Continue with Google" : "Sign up with Google"} />

            {/* Phone Sign-In */}
            <button
              style={styles.phoneBtn}
              onClick={() => setShowPhone(true)}
              onMouseOver={(e) => (e.currentTarget.style.background = "#eef2f7")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#f8fafc")}
            >
              Continue with Phone
            </button>

            {/* Divider */}
            <div style={styles.divider}>
              <span style={styles.dividerLine}></span>
              <span style={styles.dividerText}>or continue with email</span>
              <span style={styles.dividerLine}></span>
            </div>

            {/* Email Forms */}
            {tab === "login" ? <LoginForm /> : <SignUpForm />}

            <p style={styles.footer}>
              {tab === "login" ? (
                <>Don't have an account?{" "}<button style={styles.link} onClick={() => setTab("signup")}>Sign up</button></>
              ) : (
                <>Already have an account?{" "}<button style={styles.link} onClick={() => setTab("login")}>Log in</button></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
