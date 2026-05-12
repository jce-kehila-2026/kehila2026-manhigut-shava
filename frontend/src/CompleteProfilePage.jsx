import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

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
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: "480px",
  },
  avatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#1a3c5e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 auto 1rem",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a3c5e",
    textAlign: "center",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
    margin: "0 0 2rem",
    lineHeight: "1.5",
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
    transition: "background 0.2s",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "10px 13px",
    marginBottom: "1rem",
    fontSize: "13px",
    color: "#b91c1c",
  },
  logoutLink: {
    display: "block",
    textAlign: "center",
    marginTop: "1.25rem",
    fontSize: "13px",
    color: "#94a3b8",
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
  },
};

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

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the disclaimer to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
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
      await refreshProfile();
    } catch (err) {
      setError("Failed to save profile. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initials = form.firstName && form.lastName
    ? `${form.firstName[0]}${form.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.avatar}>{initials}</div>
        <p style={styles.title}>Complete Your Profile</p>
        <p style={styles.subtitle}>
          Welcome! Please fill in your details to join the community.
        </p>

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

          <div style={styles.disclaimer}>
            <input type="checkbox" id="disclaimer" style={styles.checkbox} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <label htmlFor="disclaimer" style={styles.disclaimerText}>
              By continuing, I agree that my contact information — including my name,
              email address, and phone number — may be visible to and shared with
              other registered users of this platform.
            </label>
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? { opacity: 0.65, cursor: "not-allowed" } : {}) }}
            disabled={loading}
            onMouseOver={(e) => !loading && (e.target.style.background = "#122d47")}
            onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>

        <button style={styles.logoutLink} onClick={logout}>
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}
