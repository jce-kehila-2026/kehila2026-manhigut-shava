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
    maxWidth: "560px",
  },
  icon: {
    fontSize: "40px",
    textAlign: "center",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3c5e",
    textAlign: "center",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
    margin: "0 0 1.75rem",
    lineHeight: "1.5",
  },
  termsBox: {
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "14px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    maxHeight: "340px",
    overflowY: "auto",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: "0 0 8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionText: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.75",
    margin: "0 0 1.25rem",
  },
  list: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.75",
    margin: "0 0 1.25rem",
    paddingLeft: "1.25rem",
  },
  agreeRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    background: "#f0f7ff",
    border: "1px solid #c3daf5",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "1.5rem",
  },
  checkbox: {
    marginTop: "2px",
    accentColor: "#2563eb",
    width: "16px",
    height: "16px",
    flexShrink: 0,
    cursor: "pointer",
  },
  agreeText: {
    fontSize: "13px",
    color: "#1a3c5e",
    lineHeight: "1.6",
    fontWeight: "500",
    margin: 0,
  },
  button: {
    width: "100%",
    padding: "13px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
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

export default function TermsPage() {
  const { user, logout, refreshProfile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    setError("");
    try {
      await setDoc(doc(db, "users", user.uid), {
        acceptedTerms: true,
        termsAcceptedAt: new Date().toISOString(),
      }, { merge: true });
      await refreshProfile();
    } catch (err) {
      setError("Failed to save: " + (err.message || "Please try again."));
      console.error("Terms accept error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
          <div style={styles.icon}>Terms</div>
        <p style={styles.subtitle}>
          Please read and accept our community guidelines before continuing.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.termsBox}>
          <p style={styles.sectionTitle}>Respect & Community</p>
          <p style={styles.sectionText}>
            Our community is built on mutual respect, trust, and collaboration.
            Every member is expected to treat others with dignity and
            professionalism at all times.
          </p>

          <p style={styles.sectionTitle}>Privacy & Data Protection</p>
          <ul style={styles.list}>
            <li>Your personal information (email, phone) is only shared when you explicitly approve a connection request.</li>
            <li>You may not share another member's contact information with third parties without their permission.</li>
            <li>Profile data is stored securely and used solely for community networking purposes.</li>
          </ul>

          <p style={styles.sectionTitle}>Communication Guidelines</p>
          <ul style={styles.list}>
            <li>Be professional and considerate in all messages and posts.</li>
            <li>Do not use the platform for spam, advertising, or any commercial solicitation.</li>
            <li>Help requests should be genuine and relevant to the community.</li>
          </ul>

          <p style={styles.sectionTitle}>Prohibited Behavior</p>
          <ul style={styles.list}>
            <li>Misuse of other members' contact information or platform access.</li>
            <li>Posting inappropriate, offensive, or misleading content.</li>
            <li>Impersonation or unauthorized access to other accounts.</li>
            <li>Any form of harassment, discrimination, or bullying.</li>
          </ul>

          <p style={styles.sectionTitle}>Administration</p>
          <p style={styles.sectionText}>
            Platform administrators reserve the right to remove posts, restrict
            access, or revoke membership for violations of these guidelines.
            Decisions by administrators are final.
          </p>
        </div>

        <div style={styles.agreeRow}>
          <input
            type="checkbox"
            id="terms-agree"
            style={styles.checkbox}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor="terms-agree" style={styles.agreeText}>
            I have read and agree to the Community Code of Values. I understand
            that violating these guidelines may result in removal from the
            platform.
          </label>
        </div>

        <button
          style={{ ...styles.button, ...(!agreed || loading ? styles.buttonDisabled : {}) }}
          onClick={handleAccept}
          disabled={!agreed || loading}
          onMouseOver={(e) => agreed && !loading && (e.target.style.background = "#122d47")}
          onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
        >
          {loading ? "Saving…" : "Accept & Continue"}
        </button>

        <button style={styles.logoutLink} onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
