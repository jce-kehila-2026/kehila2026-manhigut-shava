import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "./firebase";
import { useAuth } from "./AuthContext";

const storage = getStorage();

/* ─── Inject keyframe animations once ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

  * { font-family: 'DM Sans', sans-serif; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes checkPop {
    0%   { transform: scale(0.6); opacity: 0; }
    60%  { transform: scale(1.25); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes bannerFlow {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .profile-card {
    animation: fadeSlideUp 0.4s ease both;
  }
  .profile-card:nth-child(2) { animation-delay: 0.06s; }
  .profile-card:nth-child(3) { animation-delay: 0.12s; }

  .profile-input:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3.5px rgba(56, 189, 248, 0.18) !important;
    background: #fff !important;
    outline: none;
  }
  .profile-textarea:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3.5px rgba(56, 189, 248, 0.18) !important;
    background: #fff !important;
    outline: none;
  }
  .upload-btn:hover {
    background: rgba(255,255,255,1) !important;
    border-color: rgba(255,255,255,0.9) !important;
  }
  .change-btn:hover {
    background: #e0f2fe !important;
    border-color: #7dd3fc !important;
  }
  .cancel-btn:hover { background: #e2e8f0 !important; }
  .save-btn-shimmer {
    background: linear-gradient(90deg, #1a3c5e 0%, #1e5080 40%, #1a3c5e 60%, #1a3c5e 100%);
    background-size: 400px 100%;
    animation: shimmer 1.6s infinite linear;
  }
  .check-svg {
    animation: checkPop 0.35s ease both;
  }
`;
if (!document.head.querySelector("#profile-styles")) {
  styleTag.id = "profile-styles";
  document.head.appendChild(styleTag);
}

/* ─── Inline check mark (text only, no icon library) ─── */
function CheckMark() {
  return (
    <svg
      className="check-svg"
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="#fff" strokeWidth="2.8"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ─── Completeness bar ─── */
function CompletenessBadge({ pct }) {
  const color  = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  const bg     = pct >= 80 ? "#f0fdf4" : pct >= 50 ? "#fffbeb" : "#fff5f5";
  const border = pct >= 80 ? "#bbf7d0" : pct >= 50 ? "#fde68a" : "#fca5a5";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"1.75rem" }}>
      <div style={{ flex:1, height:"6px", background:"#e2e8f0", borderRadius:"99px", overflow:"hidden" }}>
        <div style={{
          width:`${pct}%`, height:"100%",
          background:`linear-gradient(90deg, ${color}, ${color}bb)`,
          borderRadius:"99px",
          transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
      <span style={{
        fontSize:"11px", fontWeight:"700", color,
        background:bg, border:`1px solid ${border}`,
        borderRadius:"99px", padding:"2px 10px", whiteSpace:"nowrap",
      }}>
        {pct}% complete
      </span>
    </div>
  );
}

/* ─── Section title ─── */
function SectionTitle({ label }) {
  return (
    <p style={{
      fontSize:"11px", fontWeight:"700", color:"#1a3c5e",
      textTransform:"uppercase", letterSpacing:"0.12em",
      margin:"0 0 1.25rem",
    }}>
      {label}
    </p>
  );
}

/* ─── Plain input (no icon) ─── */
function PlainInput(props) {
  return (
    <input
      className="profile-input"
      style={{
        width:"100%", boxSizing:"border-box",
        padding:"12px 14px",
        fontSize:"14px", border:"1.5px solid #e2e8f0",
        borderRadius:"13px", color:"#1a2e42",
        background:"#f8fafc", fontFamily:"inherit",
        transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s",
      }}
      {...props}
    />
  );
}

/* ─── Main component ─── */
export default function ProfilePage() {
  const { user } = useAuth();
  const fileRef = useRef();

  const [form, setForm] = useState({
    firstName:"", lastName:"", phone:"", city:"", profession:"", bio:"",
  });
  const [photoURL, setPhotoURL] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved,  setSaved]      = useState(false);
  const [error,  setError]      = useState("");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail,       setNewEmail]       = useState("");
  const [password,       setPassword]       = useState("");
  const [emailError,     setEmailError]     = useState("");
  const [emailSuccess,   setEmailSuccess]   = useState("");

  /* ── Load profile ── */
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          firstName: d.firstName ?? "", lastName: d.lastName ?? "",
          phone: d.phone ?? "",        city: d.city ?? "",
          profession: d.profession ?? "", bio: d.bio ?? "",
        });
        setPhotoURL(d.photoURL ?? null);
      }
    });
  }, [user]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* ── Completeness ── */
  const fields = [form.firstName, form.lastName, form.phone, form.city, form.profession, form.bio];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  /* ── Photo upload ── */
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `avatars/${user.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setPhotoURL(url);
    await updateDoc(doc(db, "users", user.uid), { photoURL: url });
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Email change ── */
  const handleEmailChange = async () => {
    setEmailError(""); setEmailSuccess("");
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setEmailSuccess("Email updated successfully.");
      setPassword(""); setNewEmail("");
    } catch (err) {
      if (err.code === "auth/wrong-password")  setEmailError("Incorrect password.");
      else if (err.code === "auth/invalid-email") setEmailError("Invalid email address.");
      else setEmailError("Something went wrong. Please try again.");
    }
  };

  const getInitials = () => {
    if (form.firstName && form.lastName)
      return `${form.firstName[0]}${form.lastName[0]}`.toUpperCase();
    return (user?.email?.[0] ?? "?").toUpperCase();
  };

  const BIO_LIMIT = 300;

  const S = {
    page: {
      display:"flex", flexDirection:"column",
      width:"100%",
      padding:"0 0 3rem", boxSizing:"border-box", minHeight:"100vh",
    },
    banner: {
      width:"100%", height:"130px", borderRadius:"0 0 28px 28px",
      background:"linear-gradient(135deg, #1a3c5e 0%, #0ea5e9 55%, #7dd3fc 100%)",
      backgroundSize:"300% 300%",
      animation:"bannerFlow 9s ease infinite",
      position:"relative", marginBottom:"58px", flexShrink:0,
    },
    avatarWrap: {
      position:"absolute", bottom:"-46px", left:"2rem",
    },
    avatarRing: {
      width:"92px", height:"92px", borderRadius:"50%",
      background:"linear-gradient(135deg, #38bdf8, #1a3c5e)",
      padding:"3px",
      boxShadow:"0 2px 8px rgba(15,23,42,0.12)",
    },
    avatarInner: {
      width:"100%", height:"100%", borderRadius:"50%",
      background:"#1a3c5e", color:"#ffffff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"26px", fontWeight:"700", overflow:"hidden",
    },
    avatarImg: { width:"100%", height:"100%", objectFit:"cover" },
    uploadPill: {
      position:"absolute", bottom:"-46px", right:"2rem",
      display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px",
    },
    uploadBtn: {
      padding:"9px 16px",
      background:"rgba(255,255,255,0.88)",
      color:"#1a3c5e",
      border:"1.5px solid rgba(255,255,255,0.6)",
      borderRadius:"11px", fontSize:"12px", fontWeight:"700",
      cursor:"pointer", backdropFilter:"blur(6px)",
      boxShadow:"0 2px 8px rgba(0,0,0,0.1)",
      transition:"background 0.2s",
    },
    avatarHint: {
      fontSize:"10px", color:"rgba(255,255,255,0.75)", margin:0, textAlign:"right",
    },
    body: { padding:"0 2rem" },
    twoCol: {
      display:"grid",
      gridTemplateColumns:"1fr 1fr",
      gap:"1.25rem",
      alignItems:"start",
    },
    greeting: {
      fontSize:"23px", fontWeight:"700", color:"#1a3c5e", margin:"0 0 4px",
    },
    greetingSub: {
      fontSize:"13px", color:"#94a3b8", margin:"0 0 1rem",
    },
    card: {
      background:"#fff",
      borderRadius:"20px",
      border:"1.5px solid #f1f5f9",
      boxShadow:"0 4px 24px rgba(15,23,42,0.06)",
      padding:"1.75rem",
      marginBottom:"1.25rem",
      borderLeft:"4px solid #38bdf8",
    },
    row: {
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",
      gap:"1rem", marginBottom:"1rem",
    },
    group: { display:"flex", flexDirection:"column", gap:"7px" },
    label: {
      fontSize:"11px", fontWeight:"700", color:"#94a3b8",
      textTransform:"uppercase", letterSpacing:"0.08em",
    },
    bioWrap: { position:"relative" },
    textarea: {
      width:"100%", boxSizing:"border-box",
      padding:"12px 14px", fontSize:"14px",
      border:"1.5px solid #e2e8f0", borderRadius:"13px",
      color:"#1a2e42", background:"#f8fafc",
      fontFamily:"inherit", resize:"vertical", minHeight:"100px",
      transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s",
    },
    charCount: {
      position:"absolute", bottom:"10px", right:"12px",
      fontSize:"10px", pointerEvents:"none",
    },
    actionRow: { display:"flex", alignItems:"center", gap:"12px", marginTop:"0.25rem" },
    saveBtn: {
      padding:"11px 28px",
      background: saved ? "linear-gradient(135deg,#16a34a,#22c55e)" : "#1a3c5e",
      color:"#fff", border:"none",
      borderRadius:"13px", fontSize:"14px", fontWeight:"700",
      cursor: saving ? "not-allowed" : "pointer",
      transition:"background 0.3s, transform 0.15s, box-shadow 0.2s",
      boxShadow: "0 2px 8px rgba(15,23,42,0.1)",
      display:"flex", alignItems:"center", gap:"7px",
      opacity: saving ? 0.7 : 1,
    },
    errorMsg: {
      fontSize:"13px", color:"#b91c1c",
      background:"#fff0f0", border:"1px solid #fca5a5",
      borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem",
    },
    emailRow: { display:"flex", gap:"10px", alignItems:"flex-end" },
    inputDisabled: {
      padding:"12px 14px", fontSize:"14px",
      border:"1.5px solid #e2e8f0", borderRadius:"13px",
      color:"#94a3b8", background:"#f1f5f9",
      width:"100%", boxSizing:"border-box", fontFamily:"inherit",
    },
    changeBtn: {
      padding:"10px 16px", background:"#eff6ff",
      color:"#1d4ed8", border:"1.5px solid #bfdbfe",
      borderRadius:"10px", fontSize:"13px", fontWeight:"600",
      cursor:"pointer", whiteSpace:"nowrap",
      transition:"background 0.2s, border-color 0.2s",
    },
    emailSuccessMsg: {
      fontSize:"13px", color:"#166534",
      background:"#f0fdf4", border:"1px solid #bbf7d0",
      borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem",
    },
    modal: {
      position:"fixed", inset:0,
      background:"rgba(15,23,42,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:100, padding:"1.25rem",
      backdropFilter:"blur(4px)",
    },
    modalBox: {
      background:"#fff", borderRadius:"22px",
      padding:"2rem", width:"100%", maxWidth:"420px",
      display:"flex", flexDirection:"column", gap:"1rem",
      boxShadow:"0 32px 70px rgba(15,23,42,0.18)",
      animation:"modalPop 0.28s cubic-bezier(.34,1.56,.64,1) both",
    },
    modalTitle: { fontSize:"17px", fontWeight:"700", color:"#1a3c5e", margin:0 },
    modalSub:   { fontSize:"13px", color:"#64748b", margin:0 },
    modalInput: {
      width:"100%", boxSizing:"border-box",
      padding:"11px 14px", fontSize:"14px",
      border:"1.5px solid #e2e8f0", borderRadius:"12px",
      color:"#1a2e42", background:"#f8fafc", fontFamily:"inherit",
    },
    modalActions: { display:"flex", gap:"8px", marginTop:"0.25rem" },
    confirmBtn: {
      flex:1, padding:"11px", background:"#1a3c5e", color:"#fff",
      border:"none", borderRadius:"11px", fontSize:"14px", fontWeight:"700", cursor:"pointer",
    },
    cancelBtn: {
      flex:1, padding:"11px", background:"#f1f5f9", color:"#64748b",
      border:"none", borderRadius:"11px", fontSize:"14px", fontWeight:"600", cursor:"pointer",
      transition:"background 0.2s",
    },
  };

  return (
    <div style={S.page}>
      {/* Banner + Avatar */}
      <div style={S.banner}>
        <div style={S.avatarWrap}>
          <div style={S.avatarRing}>
            <div style={S.avatarInner}>
              {photoURL
                ? <img src={photoURL} style={S.avatarImg} alt="avatar" />
                : getInitials()}
            </div>
          </div>
        </div>
        <div style={S.uploadPill}>
          <button
            className="upload-btn"
            style={S.uploadBtn}
            onClick={() => fileRef.current.click()}
          >
            Upload Photo
          </button>
          <p style={S.avatarHint}>JPG or PNG · max 5 MB</p>
          <input
            ref={fileRef} type="file" accept="image/*"
            style={{ display:"none" }} onChange={handlePhotoUpload}
          />
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Greeting + completeness */}
        <div style={{ marginBottom:"1.5rem" }}>
          <p style={S.greeting}>
            {form.firstName ? `Hey, ${form.firstName}` : "My Profile"}
          </p>
          <p style={S.greetingSub}>
            Keep your info up to date so your community knows you.
          </p>
          <CompletenessBadge pct={pct} />
        </div>

        {/* Two-column layout */}
        <div style={S.twoCol}>
          {/* Left col — Personal Info */}
          <div className="profile-card" style={{ ...S.card, marginBottom:0 }}>
            <SectionTitle label="Personal Information" />
            {error && <div style={S.errorMsg}>{error}</div>}

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>First Name</label>
                <PlainInput name="firstName" value={form.firstName} onChange={handleChange} placeholder="Jane" />
              </div>
              <div style={S.group}>
                <label style={S.label}>Last Name</label>
                <PlainInput name="lastName" value={form.lastName} onChange={handleChange} placeholder="Smith" />
              </div>
            </div>

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>Phone</label>
                <PlainInput name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" />
              </div>
              <div style={S.group}>
                <label style={S.label}>City</label>
                <PlainInput name="city" value={form.city} onChange={handleChange} placeholder="Tel Aviv" />
              </div>
            </div>

            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>Profession / Job</label>
              <PlainInput name="profession" value={form.profession} onChange={handleChange} placeholder="Software Engineer" />
            </div>

            <div style={S.actionRow}>
              <button
                style={S.saveBtn}
                className={saving ? "save-btn-shimmer" : ""}
                onClick={handleSave}
                disabled={saving}
                onMouseOver={(e) => { if (!saving && !saved) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {saved ? <><CheckMark /> Saved</> : saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Right col — Bio + Email */}
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
            <div className="profile-card" style={{ ...S.card, marginBottom:0 }}>
              <SectionTitle label="Bio" />
              <div style={S.bioWrap}>
                <textarea
                  className="profile-textarea"
                  style={{ ...S.textarea, minHeight:"148px" }}
                  name="bio"
                  value={form.bio}
                  onChange={(e) => {
                    if (e.target.value.length <= BIO_LIMIT) handleChange(e);
                  }}
                  placeholder="Tell the community about yourself…"
                />
                <span style={{
                  ...S.charCount,
                  color: form.bio.length > BIO_LIMIT * 0.9 ? "#f59e0b" : "#cbd5e1",
                }}>
                  {form.bio.length}/{BIO_LIMIT}
                </span>
              </div>
            </div>

            <div className="profile-card" style={{ ...S.card, borderLeftColor:"#a78bfa", marginBottom:0 }}>
              <SectionTitle label="Email Address" />
              {emailSuccess && <div style={S.emailSuccessMsg}>{emailSuccess}</div>}
              <div style={S.emailRow}>
                <div style={{ ...S.group, flex:1, marginBottom:0 }}>
                  <label style={S.label}>Current Email</label>
                  <input style={S.inputDisabled} value={user?.email ?? ""} disabled />
                </div>
                <button
                  className="change-btn"
                  style={S.changeBtn}
                  onClick={() => setShowEmailModal(true)}
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailModal && (
        <div style={S.modal} onClick={() => setShowEmailModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Change Email</p>
            <p style={S.modalSub}>Confirm your current password to continue.</p>
            {emailError && <div style={S.errorMsg}>{emailError}</div>}

            <div style={S.group}>
              <label style={S.label}>Current Password</label>
              <input
                className="profile-input"
                style={S.modalInput}
                type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div style={S.group}>
              <label style={S.label}>New Email</label>
              <input
                className="profile-input"
                style={S.modalInput}
                type="email" placeholder="new@email.com"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div style={S.modalActions}>
              <button className="cancel-btn" style={S.cancelBtn} onClick={() => setShowEmailModal(false)}>Cancel</button>
              <button style={S.confirmBtn} onClick={handleEmailChange}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}