import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "./firebase";
import { useAuth } from "./AuthContext";

const storage = getStorage();

const styles = {
  page: {
    flex: 1,
    padding: "2rem 2.5rem",
    boxSizing: "border-box",
    maxWidth: "720px",
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
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e8ecf0",
    padding: "2rem",
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#1a3c5e",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "0 0 1.25rem",
  },
  avatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    marginBottom: "1rem",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#1a3c5e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "700",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  uploadBtn: {
    padding: "8px 18px",
    background: "#f1f5f9",
    color: "#1a3c5e",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  avatarHint: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: "4px 0 0",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
  },
  group: {
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    padding: "10px 13px",
    fontSize: "14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    outline: "none",
    color: "#1a2e42",
    background: "#fafbfc",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
    width: "100%",
  },
  inputDisabled: {
    background: "#f1f5f9",
    color: "#94a3b8",
    cursor: "not-allowed",
  },
  textarea: {
    padding: "10px 13px",
    fontSize: "14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    outline: "none",
    color: "#1a2e42",
    background: "#fafbfc",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: "100px",
    width: "100%",
    transition: "border-color 0.2s",
  },
  saveBtn: {
    padding: "10px 28px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  saveBtnDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  successMsg: {
    fontSize: "13px",
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "10px 14px",
    marginBottom: "1rem",
  },
  errorMsg: {
    fontSize: "13px",
    color: "#b91c1c",
    background: "#fff0f0",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "10px 14px",
    marginBottom: "1rem",
  },
  emailRow: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
  },
  changeBtn: {
    padding: "10px 16px",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1.5px solid #bfdbfe",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    height: "40px",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "1rem",
  },
  modalBox: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a3c5e",
    margin: 0,
  },
  modalSub: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  modalActions: {
    display: "flex",
    gap: "8px",
    marginTop: "0.5rem",
  },
  confirmBtn: {
    flex: 1,
    padding: "10px",
    background: "#1a3c5e",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    flex: 1,
    padding: "10px",
    background: "#f1f5f9",
    color: "#64748b",
    border: "none",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const fileRef = useRef();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    profession: "",
    bio: "",
  });
  const [photoURL, setPhotoURL] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Email change modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
          city: data.city ?? "",
          profession: data.profession ?? "",
          bio: data.bio ?? "",
        });
        setPhotoURL(data.photoURL ?? null);
      }
    });
  }, [user]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `avatars/${user.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setPhotoURL(url);
    await updateDoc(doc(db, "users", user.uid), { photoURL: url });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { ...form });
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    setEmailError("");
    setEmailSuccess("");
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setEmailSuccess("Email updated successfully!");
      setPassword("");
      setNewEmail("");
    } catch (err) {
      if (err.code === "auth/wrong-password") {
        setEmailError("Incorrect password.");
      } else if (err.code === "auth/invalid-email") {
        setEmailError("Invalid email address.");
      } else {
        setEmailError("Something went wrong. Please try again.");
      }
    }
  };

  const getInitials = () => {
    if (form.firstName && form.lastName)
      return `${form.firstName[0]}${form.lastName[0]}`.toUpperCase();
    return (user?.email?.[0] ?? "?").toUpperCase();
  };

  return (
    <div style={styles.page}>
      <p style={styles.pageTitle}>My Profile</p>
      <p style={styles.pageSub}>View and update your personal information.</p>

      {/* Avatar */}
      <div style={styles.card}>
        <p style={styles.sectionTitle}>Profile Picture</p>
        <div style={styles.avatarRow}>
          <div style={styles.avatar}>
            {photoURL ? (
              <img src={photoURL} style={styles.avatarImg} alt="avatar" />
            ) : (
              getInitials()
            )}
          </div>
          <div>
            <button style={styles.uploadBtn} onClick={() => fileRef.current.click()}>
              Upload Photo
            </button>
            <p style={styles.avatarHint}>JPG or PNG, max 5MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div style={styles.card}>
        <p style={styles.sectionTitle}>Personal Information</p>
        {success && <div style={styles.successMsg}>{success}</div>}
        {error && <div style={styles.errorMsg}>{error}</div>}

        <div style={styles.row}>
          <div style={styles.group}>
            <label style={styles.label}>First Name</label>
            <input
              style={styles.input}
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div style={styles.group}>
            <label style={styles.label}>Last Name</label>
            <input
              style={styles.input}
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.group}>
            <label style={styles.label}>Phone</label>
            <input
              style={styles.input}
              name="phone"
              value={form.phone}
              onChange={handleChange}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div style={styles.group}>
            <label style={styles.label}>City</label>
            <input
              style={styles.input}
              name="city"
              value={form.city}
              onChange={handleChange}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Profession / Job</label>
          <input
            style={styles.input}
            name="profession"
            value={form.profession}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Bio</label>
          <textarea
            style={styles.textarea}
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell the community a bit about yourself..."
            onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        <button
          style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
          onClick={handleSave}
          disabled={saving}
          onMouseOver={(e) => !saving && (e.target.style.background = "#122d47")}
          onMouseOut={(e) => (e.target.style.background = "#1a3c5e")}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Email */}
      <div style={styles.card}>
        <p style={styles.sectionTitle}>Email Address</p>
        {emailSuccess && <div style={styles.successMsg}>{emailSuccess}</div>}
        <div style={styles.emailRow}>
          <div style={{ ...styles.group, flex: 1, marginBottom: 0 }}>
            <label style={styles.label}>Current Email</label>
            <input
              style={{ ...styles.input, ...styles.inputDisabled }}
              value={user?.email ?? ""}
              disabled
            />
          </div>
          <button
            style={styles.changeBtn}
            onClick={() => setShowEmailModal(true)}
          >
            Change Email
          </button>
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailModal && (
        <div style={styles.modal} onClick={() => setShowEmailModal(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalTitle}>Change Email</p>
            <p style={styles.modalSub}>
              Enter your current password to confirm your identity.
            </p>
            {emailError && <div style={styles.errorMsg}>{emailError}</div>}
            <div style={styles.group}>
              <label style={styles.label}>Current Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>New Email</label>
              <input
                style={styles.input}
                type="email"
                placeholder="new@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowEmailModal(false)}>
                Cancel
              </button>
              <button style={styles.confirmBtn} onClick={handleEmailChange}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}