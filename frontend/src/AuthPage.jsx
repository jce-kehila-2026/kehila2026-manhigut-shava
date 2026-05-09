import { useState } from "react";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
    padding: "2rem 1rem",
    boxSizing: "border-box",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: "440px",
  },
  logo: {
    textAlign: "center",
    marginBottom: "1.75rem",
  },
  logoText: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3c5e",
    letterSpacing: "-0.5px",
  },
  tabs: {
    display: "flex",
    borderRadius: "10px",
    background: "#eef2f7",
    padding: "4px",
    marginBottom: "2rem",
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
  group: {
    marginBottom: "1.1rem",
  },
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
};

function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Logging in as ${form.email}`);
  };

  return (
    <form onSubmit={handleSubmit}>
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
        <button type="button" style={styles.forgotLink}>
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        style={styles.button}
        onMouseOver={(e) => (e.target.style.background = "#122d47")}
        onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
      >
        Log In
      </button>
    </form>
  );
}

function SignUpForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthdate: "",
  });
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      alert("You must agree to the disclaimer to sign up.");
      return;
    }
    alert(`Account created for ${form.email}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={styles.row}>
        <div>
          <label style={styles.label}>First name</label>
          <input
            style={styles.input}
            type="text"
            name="firstName"
            placeholder="Jane"
            value={form.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label style={styles.label}>Last name</label>
          <input
            style={styles.input}
            type="text"
            name="lastName"
            placeholder="Doe"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Phone number</label>
        <input
          style={styles.input}
          type="tel"
          name="phone"
          placeholder="+972 50-000-0000"
          value={form.phone}
          onChange={handleChange}
          required
        />
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Email address</label>
        <input
          style={styles.input}
          type="email"
          name="email"
          placeholder="you@gmail.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ ...styles.group, marginBottom: "1.25rem" }}>
        <label style={styles.label}>Date of birth</label>
        <input
          style={styles.input}
          type="date"
          name="birthdate"
          value={form.birthdate}
          onChange={handleChange}
          required
        />
      </div>

      <div style={styles.disclaimer}>
        <input
          type="checkbox"
          id="disclaimer"
          style={styles.checkbox}
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <label htmlFor="disclaimer" style={styles.disclaimerText}>
          By signing up, I agree that my contact information — including my name,
          email address, and phone number — may be visible to and shared with
          other registered users of this platform.
        </label>
      </div>

      <button
        type="submit"
        style={styles.button}
        onMouseOver={(e) => (e.target.style.background = "#122d47")}
        onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
      >
        Create Account
      </button>
    </form>
  );
}

export default function AuthPage() {
  const [tab, setTab] = useState("login");

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Manhigut Shava</span>
        </div>

        <div style={styles.tabs}>
          <button style={styles.tab(tab === "login")} onClick={() => setTab("login")}>
            Log In
          </button>
          <button style={styles.tab(tab === "signup")} onClick={() => setTab("signup")}>
            Sign Up
          </button>
        </div>

        {tab === "login" ? <LoginForm /> : <SignUpForm />}

        <p style={styles.footer}>
          {tab === "login" ? (
            <>
              Don't have an account?{" "}
              <button style={styles.link} onClick={() => setTab("signup")}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button style={styles.link} onClick={() => setTab("login")}>
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
