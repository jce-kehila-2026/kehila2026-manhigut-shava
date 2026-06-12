import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc, query, where, collection, getDocs } from "firebase/firestore";
import {
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "./firebase";
import { useAuth } from "./AuthContext";
import { useGuestGate } from "./GuestGate";
import { useLang } from "./LanguageContext";

const storage = getStorage();

/* ─── Inject keyframe animations once ─── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');
  * { font-family: 'Figtree', 'Heebo', system-ui, sans-serif; }

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
  .profile-card { animation: fadeSlideUp 0.4s ease both; }
  .profile-card:nth-child(2) { animation-delay: 0.06s; }
  .profile-card:nth-child(3) { animation-delay: 0.12s; }

  .profile-input:focus {
    border-color: #4472b8 !important;
    box-shadow: 0 0 0 3.5px rgba(68, 114, 184, 0.18) !important;
    background: #fff !important;
    outline: none;
  }
  .profile-textarea:focus {
    border-color: #4472b8 !important;
    box-shadow: 0 0 0 3.5px rgba(68, 114, 184, 0.18) !important;
    background: #fff !important;
    outline: none;
  }
  .upload-btn:hover  { background: rgba(255,255,255,1) !important; border-color: rgba(255,255,255,0.9) !important; }
  .change-btn:hover  { background: #f0f6fb !important; border-color: #daeaf8 !important; }
  .cancel-btn:hover  { background: #daeaf8 !important; }
  .save-btn-shimmer {
    background: linear-gradient(90deg, #111827 0%, #2a4a8e 40%, #111827 60%, #111827 100%);
    background-size: 400px 100%;
    animation: shimmer 1.6s infinite linear;
  }
  .check-svg { animation: checkPop 0.35s ease both; }
`;
if (!document.head.querySelector("#profile-styles")) {
  styleTag.id = "profile-styles";
  document.head.appendChild(styleTag);
}

function CheckMark() {
  return (
    <svg className="check-svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CompletenessBadge({ pct }) {
  const color  = pct >= 80 ? "#7ba87a" : pct >= 50 ? "#b8895a" : "#c25c5c";
  const bg     = pct >= 80 ? "#f0fdf4" : pct >= 50 ? "#fffbeb" : "#fff5f5";
  const border = pct >= 80 ? "#cfe4ce" : pct >= 50 ? "#fde68a" : "#d99090";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"1.75rem" }}>
      <div style={{ flex:1, height:"6px", background:"#daeaf8", borderRadius:"99px", overflow:"hidden" }}>
        <div style={{
          width:`${pct}%`, height:"100%",
          background:`linear-gradient(90deg, ${color}, ${color}bb)`,
          borderRadius:"99px", transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
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

function SectionTitle({ label }) {
  return (
    <p style={{
      fontSize:"11px", fontWeight:"700", color:"#111827",
      textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 1.25rem",
    }}>
      {label}
    </p>
  );
}

function SelectInput({ value, onChange, options, disabled, placeholder }) {
  return (
    <select
      className="profile-input"
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        width:"100%", boxSizing:"border-box",
        padding:"12px 14px", fontSize:"14px",
        border:"1.5px solid #daeaf8", borderRadius:"13px",
        color: value ? "#1a2e42" : "#6b7280",
        background:"#fdf8f6", fontFamily:"inherit",
        transition:"border-color 0.2s, box-shadow 0.2s",
        appearance:"none",
      }}
    >
      <option value="">{placeholder || "—"}</option>
      {options.map((o,i) => <option key={i} value={o}>{o}</option>)}
    </select>
  );
}

function MultiChips({ selectedValues, options, onChange, disabled }) {
  const toggle = (opt) => {
    if (disabled) return;
    const next = selectedValues.includes(opt)
      ? selectedValues.filter(v => v !== opt)
      : [...selectedValues, opt];
    onChange(next);
  };
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:2 }}>
      {options.map((opt,i) => {
        const active = selectedValues.includes(opt);
        return (
          <button key={i} type="button" onClick={() => toggle(opt)} disabled={disabled} style={{
            padding:"5px 12px", borderRadius:99, fontSize:12, fontWeight:600, cursor: disabled?"default":"pointer",
            background: active ? "#4472b8" : "#f0f6fb",
            color: active ? "#fff" : "#4472b8",
            border: `1.5px solid ${active ? "#4472b8" : "#daeaf8"}`,
            transition:"all 0.15s ease",
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function PlainInput(props) {
  return (
    <input
      className="profile-input"
      style={{
        width:"100%", boxSizing:"border-box",
        padding:"12px 14px", fontSize:"14px",
        border:"1.5px solid #daeaf8", borderRadius:"13px",
        color:"#1a2e42", background:"#fdf8f6", fontFamily:"inherit",
        transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s",
      }}
      {...props}
    />
  );
}

export default function ProfilePage({ viewUserId, onMessage }) {
  const { user, refreshProfile } = useAuth();
  const guard = useGuestGate();
  const { t, isRTL } = useLang();
  const fileRef = useRef();

  const [form, setForm] = useState({
    firstName:"", lastName:"", phone:"", city:"", profession:"", bio:"", birthDate:"",
    ethnicity:"", region:"", institution:"", graduationYear:"", linkedIn:"",
    helpAreas:[], languages:[], experience:"", goals:"",
  });
  const [photoURL, setPhotoURL] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const [networksCount, setNetworksCount] = useState(0);

  /* ── My Posts ── */
  const [myPosts,      setMyPosts]      = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail,       setNewEmail]       = useState("");
  const [password,       setPassword]       = useState("");
  const [emailError,     setEmailError]     = useState("");
  const [emailSuccess,   setEmailSuccess]   = useState("");

  /* ── Load profile + network count ── */
  useEffect(() => {
    const targetId = viewUserId || user?.uid;
    if (!targetId) return;
    getDoc(doc(db, "users", targetId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          firstName:      d.firstName      ?? "",
          lastName:       d.lastName       ?? "",
          phone:          d.phone          ?? "",
          city:           d.city           ?? "",
          profession:     d.profession     ?? "",
          bio:            d.bio            ?? "",
          birthDate:      d.birthDate      ?? "",
          ethnicity:      d.ethnicity      ?? "",
          region:         d.region         ?? "",
          institution:    d.institution    ?? "",
          graduationYear: d.graduationYear ?? "",
          linkedIn:       d.linkedIn       ?? "",
          helpAreas:      d.helpAreas      ?? [],
          languages:      d.languages      ?? [],
          experience:     d.experience     ?? "",
          goals:          d.goals          ?? "",
        });
        setPhotoURL(d.photoURL ?? d.avatarUrl ?? null);
        setNetworksCount(d.networksCount ?? 0);
        setProfileEmail(d.email ?? "");
      } else {
        setForm({ firstName:"", lastName:"", phone:"", city:"", profession:"", bio:"", birthDate:"", ethnicity:"", region:"", institution:"", graduationYear:"", linkedIn:"", helpAreas:[], languages:[], experience:"", goals:"" });
        setPhotoURL(null);
        setNetworksCount(0);
        setProfileEmail("");
      }
    }).catch(() => {
      setForm({ firstName:"", lastName:"", phone:"", city:"", profession:"", bio:"", birthDate:"", ethnicity:"", region:"", institution:"", graduationYear:"", linkedIn:"", helpAreas:[], languages:[], experience:"", goals:"" });
      setPhotoURL(null);
      setNetworksCount(0);
      setProfileEmail("");
    });
  }, [user, viewUserId]);

  /* ── Load profile posts ── */
  useEffect(() => {
    const targetId = viewUserId || user?.uid;
    if (!targetId) return;
    setPostsLoading(true);
    getDocs(query(collection(db, "posts"), where("authorId", "==", targetId)))
      .then((snap) => {
        const posts = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => ((b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1));
        setMyPosts(posts);
      })
      .catch((err) => console.error("Failed to load profile posts:", err))
      .finally(() => setPostsLoading(false));
  }, [user, viewUserId]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const fields = [form.firstName, form.lastName, form.phone, form.city, form.profession, form.bio, form.birthDate,
                  form.ethnicity, form.region, form.institution, form.linkedIn,
                  form.helpAreas?.length > 0, form.languages?.length > 0, form.experience, form.goals];
  const pct    = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const isOwner = !viewUserId || viewUserId === user?.uid;
  const isReadOnly = !isOwner;
  const profileHeading = isOwner
    ? (form.firstName ? t.profile.greeting(form.firstName) : t.profile.myProfile)
    : (form.firstName ? `${form.firstName} ${form.lastName}`.trim() : t.profile.memberProfile);
  const postsTitle = isOwner ? t.profile.myPosts : t.profile.posts;
  const noPostsMessage = isOwner ? t.profile.noMyPosts : t.profile.noPosts;

  const getPostMedia = (post) => {
    if (Array.isArray(post.media)) return post.media;
    if (Array.isArray(post.imageURLs)) return post.imageURLs.map((url) => ({ url, type: "image" }));
    return [];
  };

  const handleMessageClick = () => {
    if (!onMessage || !viewUserId) return;
    onMessage(viewUserId);
  };

  /* ── Photo upload ── */
  const handlePhotoUpload = async (e) => {
    if (!isOwner || !user) return;
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `avatars/${user.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setPhotoURL(url);
    await updateDoc(doc(db, "users", user.uid), { photoURL: url });
    refreshProfile(); // keep AuthContext in sync so Dashboard shows updated photo
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!isOwner || !user) return;
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { ...form });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setError(t.profile.errorGeneral);
    } finally {
      setSaving(false);
    }
  };

  /* ── Email change ── */
  const handleEmailChange = async () => {
    if (!isOwner || !user) return;
    setEmailError(""); setEmailSuccess("");
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setEmailSuccess("Email updated successfully.");
      setPassword(""); setNewEmail("");
    } catch (err) {
      if (err.code === "auth/wrong-password")   setEmailError("Incorrect password.");
      else if (err.code === "auth/invalid-email") setEmailError("Invalid email address.");
      else setEmailError(t.profile.errorGeneral);
    }
  };

  const getInitials = () => {
    if (form.firstName && form.lastName)
      return `${form.firstName[0]}${form.lastName[0]}`.toUpperCase();
    return (user?.email?.[0] ?? "?").toUpperCase();
  };

  const BIO_LIMIT = 300;

  /* ── Relative timestamp ── */
  const relativeTime = (iso) => {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)   return t.common.justNow;
    if (diff < 3600) return t.common.minutesAgo(Math.floor(diff / 60));
    if (diff < 86400) return t.common.hoursAgo(Math.floor(diff / 3600));
    return t.common.daysAgo(Math.floor(diff / 86400));
  };

  const S = {
    page: {
      display:"flex", flexDirection:"column",
      width:"100%", height:"100%", overflow:"auto",
      padding:"0 0 3rem",
      boxSizing:"border-box",
      direction: isRTL ? "rtl" : "ltr",
    },
    banner: {
      width:"100%", height:"130px", borderRadius:"0 0 28px 28px",
      background:"linear-gradient(135deg, #111827 0%, #1d4896 55%, #daeaf8 100%)",
      position:"relative", marginBottom:"58px", flexShrink:0,
    },
    avatarWrap:  { position:"absolute", bottom:"-46px", ...(isRTL ? { right:"2rem" } : { left:"2rem" }) },
    avatarRing:  { width:"92px", height:"92px", borderRadius:"50%", background:"linear-gradient(135deg, #4472b8, #111827)", padding:"3px", boxShadow:"0 2px 8px rgba(29, 72, 150,0.12)" },
    avatarInner: { width:"100%", height:"100%", borderRadius:"50%", background:"#111827", color:"#ffffff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", fontWeight:"700", overflow:"hidden" },
    avatarImg:   { width:"100%", height:"100%", objectFit:"cover" },
    uploadPill:  { position:"absolute", bottom:"-46px", ...(isRTL ? { left:"2rem" } : { right:"2rem" }), display:"flex", flexDirection:"column", alignItems: isRTL ? "flex-start" : "flex-end", gap:"4px" },
    uploadBtn: {
      padding:"9px 16px", background:"rgba(255,255,255,0.88)", color:"#111827",
      border:"1.5px solid rgba(255,255,255,0.6)", borderRadius:"11px",
      fontSize:"12px", fontWeight:"700", cursor:"pointer",
      backdropFilter:"blur(6px)", boxShadow:"0 2px 8px rgba(0,0,0,0.1)", transition:"background 0.2s",
    },
    avatarHint: { fontSize:"10px", color:"rgba(255,255,255,0.75)", margin:0, textAlign: isRTL ? "left" : "right" },
    body: { padding:"0 2rem" },
    twoCol: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem", alignItems:"start" },
    greeting:    { fontSize:"23px", fontWeight:"700", color:"#111827", margin:"0 0 4px" },
    greetingSub: { fontSize:"13px", color:"#6b7280", margin:"0 0 1rem" },
    card: {
      background:"#fff", borderRadius:"20px",
      border:"1.5px solid #f0f6fb",
      boxShadow:"0 4px 24px rgba(29, 72, 150,0.06)",
      padding:"1.75rem", marginBottom:"1.25rem",
      borderLeft:"4px solid #4472b8",
    },
    row:   { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:"1rem", marginBottom:"1rem" },
    group: { display:"flex", flexDirection:"column", gap:"7px" },
    label: { fontSize:"11px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em" },
    bioWrap: { position:"relative" },
    textarea: {
      width:"100%", boxSizing:"border-box",
      padding:"12px 14px", fontSize:"14px",
      border:"1.5px solid #daeaf8", borderRadius:"13px",
      color:"#1a2e42", background:"#fdf8f6",
      fontFamily:"inherit", resize:"vertical", minHeight:"100px",
      transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s",
    },
    charCount: { position:"absolute", bottom:"10px", right:"12px", fontSize:"10px", pointerEvents:"none" },
    actionRow: { display:"flex", alignItems:"center", gap:"12px", marginTop:"0.25rem" },
    saveBtn: {
      padding:"11px 28px",
      background: saved ? "linear-gradient(135deg,#7ba87a,#7ba87a)" : "#111827",
      color:"#fff", border:"none", borderRadius:"13px",
      fontSize:"14px", fontWeight:"700",
      cursor: saving ? "not-allowed" : "pointer",
      transition:"background 0.3s, transform 0.15s, box-shadow 0.2s",
      boxShadow:"0 2px 8px rgba(29, 72, 150,0.1)",
      display:"flex", alignItems:"center", gap:"7px",
      opacity: saving ? 0.7 : 1,
    },
    errorMsg:       { fontSize:"13px", color:"#9a4545", background:"#fff0f0", border:"1px solid #d99090", borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem" },
    emailRow:       { display:"flex", gap:"10px", alignItems:"flex-end" },
    inputDisabled:  { padding:"12px 14px", fontSize:"14px", border:"1.5px solid #daeaf8", borderRadius:"13px", color:"#6b7280", background:"#f0f6fb", width:"100%", boxSizing:"border-box", fontFamily:"inherit" },
    changeBtn:      { padding:"10px 16px", background:"#eff6ff", color:"#1d4896", border:"1.5px solid #bfdbfe", borderRadius: "12px", fontSize:"13px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap", transition:"background 0.2s, border-color 0.2s" },
    emailSuccessMsg:{ fontSize:"13px", color:"#3f6a3e", background:"#f0fdf4", border:"1px solid #cfe4ce", borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem" },
    modal:    { position:"fixed", inset:0, background:"rgba(29, 72, 150,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"1.25rem", backdropFilter:"blur(4px)" },
    modalBox: { background:"#fff", borderRadius:"22px", padding:"2rem", width:"100%", maxWidth:"420px", display:"flex", flexDirection:"column", gap:"1rem", boxShadow:"0 32px 70px rgba(29, 72, 150,0.18)", animation:"modalPop 0.28s cubic-bezier(.34,1.56,.64,1) both" },
    modalTitle:   { fontSize:"17px", fontWeight:"700", color:"#111827", margin:0 },
    modalSub:     { fontSize:"13px", color:"#7a5868", margin:0 },
    modalInput:   { width:"100%", boxSizing:"border-box", padding:"11px 14px", fontSize:"14px", border:"1.5px solid #daeaf8", borderRadius:"12px", color:"#1a2e42", background:"#fdf8f6", fontFamily:"inherit" },
    modalActions: { display:"flex", gap:"8px", marginTop:"0.25rem" },
    confirmBtn:   { flex:1, padding:"11px", background:"#111827", color:"#fff", border:"none", borderRadius:"11px", fontSize:"14px", fontWeight:"700", cursor:"pointer" },
    cancelBtn:    { flex:1, padding:"11px", background:"#f0f6fb", color:"#7a5868", border:"none", borderRadius:"11px", fontSize:"14px", fontWeight:"600", cursor:"pointer", transition:"background 0.2s" },
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
        {isOwner && (
          <div style={S.uploadPill}>
            <button className="upload-btn" style={S.uploadBtn} onClick={() => fileRef.current.click()}>
              {t.profile.uploadPhoto}
            </button>
            <p style={S.avatarHint}>{t.profile.photoHint}</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload} />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={S.body}>
        <div style={{ marginBottom:"1.5rem" }}>
          <p style={S.greeting}>
            {profileHeading}
          </p>
          <p style={S.greetingSub}>{isReadOnly ? "Viewing public profile" : t.profile.subtitle}</p>
          {networksCount > 0 && (
            <div style={{ marginBottom:"1rem" }}>
              <span style={{
                fontSize:"13px", fontWeight:"700", color:"#1d4896",
                background:"#eff6ff", border:"1px solid #bfdbfe",
                borderRadius:"99px", padding:"5px 16px", display:"inline-block",
              }}>
                {networksCount} {t.network?.networkCount ?? "Connections"}
              </span>
            </div>
          )}
          {!isReadOnly && <CompletenessBadge pct={pct} />}
        </div>

        {!isReadOnly ? (
          <div style={S.twoCol}>
            {/* Left — Personal Info */}
            <div className="profile-card" style={{ ...S.card, marginBottom:0 }}>
              <SectionTitle label={t.profile.personalInfo} />
              {error && <div style={S.errorMsg}>{error}</div>}

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>{t.profile.firstName}</label>
                <PlainInput name="firstName" value={form.firstName} onChange={handleChange} placeholder={t.profile.firstNamePlaceholder} disabled={isReadOnly} />
              </div>
              <div style={S.group}>
                <label style={S.label}>{t.profile.lastName}</label>
                <PlainInput name="lastName" value={form.lastName} onChange={handleChange} placeholder={t.profile.lastNamePlaceholder} disabled={isReadOnly} />
              </div>
            </div>

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>{t.profile.phone}</label>
                <PlainInput name="phone" value={form.phone} onChange={handleChange} placeholder={t.profile.phonePlaceholder} disabled={isReadOnly} />
              </div>
              <div style={S.group}>
                <label style={S.label}>{t.profile.city}</label>
                <PlainInput name="city" value={form.city} onChange={handleChange} placeholder={t.profile.cityPlaceholder} disabled={isReadOnly} />
              </div>
            </div>

            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>{t.profile.birthDate ?? "Birth Date"}</label>
              <PlainInput
                type="date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
                disabled={isReadOnly}
              />
            </div>

            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>{t.profile.professionJob}</label>
              <PlainInput name="profession" value={form.profession} onChange={handleChange} placeholder={t.profile.professionPlaceholder} disabled={isReadOnly} />
            </div>

            <div style={S.actionRow}>
              {isOwner ? (
                <button
                  style={S.saveBtn}
                  className={saving ? "save-btn-shimmer" : ""}
                  onClick={handleSave}
                  disabled={saving}
                  onMouseOver={(e) => { if (!saving && !saved) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {saved ? <><CheckMark /> {t.profile.saved}</> : saving ? t.profile.saving : t.profile.saveChanges}
                </button>
              ) : (
                <span style={{ color: "#7a5868", fontSize: "13px" }}>Viewing public profile</span>
              )}
            </div>
          </div>

          {/* Right — Bio + Email */}
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
            <div className="profile-card" style={{ ...S.card, marginBottom:0 }}>
              <SectionTitle label={t.profile.bio} />
              <div style={S.bioWrap}>
                <textarea
                  className="profile-textarea"
                  style={{ ...S.textarea, minHeight:"148px", background: isReadOnly ? "#f0f6fb" : "#fdf8f6", color: isReadOnly ? "#7a5868" : "#1a2e42" }}
                  name="bio"
                  value={form.bio}
                  onChange={(e) => { if (!isReadOnly && e.target.value.length <= BIO_LIMIT) handleChange(e); }}
                  placeholder={t.profile.bioPlaceholder}
                  disabled={isReadOnly}
                />
                {!isReadOnly && (
                  <span style={{
                    ...S.charCount,
                    color: form.bio.length > BIO_LIMIT * 0.9 ? "#d4a574" : "#d9c8ce",
                  }}>
                    {form.bio.length}/{BIO_LIMIT}
                  </span>
                )}
              </div>
            </div>

            <div className="profile-card" style={{ ...S.card, borderLeftColor:"#a78bfa", marginBottom:0 }}>
              <SectionTitle label={t.profile.emailAddress} />
              {emailSuccess && <div style={S.emailSuccessMsg}>{emailSuccess}</div>}
              <div style={S.emailRow}>
                <div style={{ ...S.group, flex:1, marginBottom:0 }}>
                  <label style={S.label}>{t.profile.currentEmail}</label>
                  <input style={S.inputDisabled} value={profileEmail || user?.email || ""} disabled />
                </div>
                {isOwner && (
                  <button className="change-btn" style={S.changeBtn} onClick={() => setShowEmailModal(true)}>
                    {t.profile.change}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details — full-width below the two columns */}
          <div className="profile-card" style={{ ...S.card, gridColumn:"1 / -1", borderLeftColor:"#e8735a", marginBottom:0 }}>
            <SectionTitle label={t.profile.additionalDetails} />

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>{t.profile.ethnicity}</label>
                <SelectInput value={form.ethnicity} disabled={isReadOnly}
                  placeholder="—"
                  options={t.profile.ethnicityOptions}
                  onChange={e => handleChange({ target:{ name:"ethnicity", value:e.target.value } })} />
              </div>
              <div style={S.group}>
                <label style={S.label}>{t.profile.region}</label>
                <SelectInput value={form.region} disabled={isReadOnly}
                  placeholder="—"
                  options={t.profile.regionOptions}
                  onChange={e => handleChange({ target:{ name:"region", value:e.target.value } })} />
              </div>
            </div>

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>{t.profile.institution}</label>
                <PlainInput name="institution" value={form.institution} onChange={handleChange}
                  placeholder={t.profile.institutionPlaceholder} disabled={isReadOnly} />
              </div>
              <div style={S.group}>
                <label style={S.label}>{t.profile.graduationYear}</label>
                <PlainInput name="graduationYear" value={form.graduationYear} onChange={handleChange}
                  placeholder={t.profile.graduationYearPlaceholder} disabled={isReadOnly} />
              </div>
            </div>

            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>{t.profile.linkedIn}</label>
              <PlainInput name="linkedIn" value={form.linkedIn} onChange={handleChange}
                placeholder={t.profile.linkedInPlaceholder} disabled={isReadOnly} />
            </div>

            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>{t.profile.languages}</label>
              <MultiChips selectedValues={form.languages} options={t.profile.languageOptions} disabled={isReadOnly}
                onChange={v => setForm(p => ({ ...p, languages:v }))} />
            </div>

            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>{t.profile.helpAreas}</label>
              <MultiChips selectedValues={form.helpAreas} options={t.profile.helpAreaOptions} disabled={isReadOnly}
                onChange={v => setForm(p => ({ ...p, helpAreas:v }))} />
            </div>

            {/* Private section — owner + admins only */}
            {isOwner && (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:"#a78bfa", textTransform:"uppercase",
                  letterSpacing:"0.1em", margin:"1.25rem 0 0.85rem",
                  paddingTop:"1rem", borderTop:"1px solid #f0f6fb" }}>
                  🔒 {t.profile.privateSection}
                </div>
                <div style={{ ...S.group, marginBottom:"1rem" }}>
                  <label style={S.label}>{t.profile.experience}</label>
                  <textarea className="profile-textarea" style={{ ...S.textarea, minHeight:"90px" }}
                    name="experience" value={form.experience} onChange={handleChange}
                    placeholder={t.profile.experiencePlaceholder} disabled={isReadOnly} />
                </div>
                <div style={{ ...S.group, marginBottom:"0" }}>
                  <label style={S.label}>{t.profile.goals}</label>
                  <textarea className="profile-textarea" style={{ ...S.textarea, minHeight:"90px" }}
                    name="goals" value={form.goals} onChange={handleChange}
                    placeholder={t.profile.goalsPlaceholder} disabled={isReadOnly} />
                </div>
              </>
            )}
          </div>
        </div>
        ) : (
          <div style={{ display:"grid", gap:"1rem" }}>
            <div className="profile-card" style={S.card}>
              <SectionTitle label="About" />
              <div style={S.row}>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.firstName}</p>
                  <div style={S.inputDisabled}>{form.firstName || "—"}</div>
                </div>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.lastName}</p>
                  <div style={S.inputDisabled}>{form.lastName || "—"}</div>
                </div>
              </div>
              <div style={S.row}>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.professionJob}</p>
                  <div style={S.inputDisabled}>{form.profession || "—"}</div>
                </div>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.city}</p>
                  <div style={S.inputDisabled}>{form.city || "—"}</div>
                </div>
              </div>
              <div style={S.group}>
                <p style={S.label}>{t.profile.phone}</p>
                <div style={S.inputDisabled}>{form.phone || "—"}</div>
              </div>
            </div>

            <div className="profile-card" style={S.card}>
              <SectionTitle label={t.profile.bio} />
              <div style={{ ...S.inputDisabled, minHeight:"120px", whiteSpace:"pre-wrap", lineHeight:1.7 }}>
                {form.bio || "—"}
              </div>
            </div>

            <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
              <button
                onClick={guard(handleMessageClick)}
                style={{
                  padding:"12px 20px", borderRadius:"14px",
                  background:"#1d4896", color:"#fff", border:"none",
                  fontSize:"14px", fontWeight:700, cursor: onMessage ? "pointer" : "not-allowed",
                }}
                disabled={!onMessage}
              >
                Message {form.firstName || "this user"}
              </button>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding:"12px 20px", borderRadius:"14px",
                  background:"#fdf8f6", color:"#1d4896", border:"1px solid #bfdbfe",
                  fontSize:"14px", fontWeight:700, cursor:"pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}
        {/* ── My Posts ── */}
        <div style={{ marginTop: "2rem" }}>
          <p style={{
            fontSize: "11px", fontWeight: "700", color: "#111827",
            textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 1.25rem",
          }}>
            {postsTitle}
          </p>

          {postsLoading && (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>…</p>
          )}

          {!postsLoading && myPosts.length === 0 && (
            <div style={{
              textAlign: "center", padding: "2.5rem",
              background: "#fdf8f6", borderRadius: "16px",
              border: "1.5px dashed #daeaf8", color: "#6b7280", fontSize: "14px",
            }}>
              {noPostsMessage}
            </div>
          )}

          {!postsLoading && myPosts.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}>
              {myPosts.map((post) => (
                <div key={post.id} className="profile-card" style={{
                  background: "#fff", borderRadius: "18px",
                  border: "1.5px solid #f0f6fb", borderLeft: "4px solid #4472b8",
                  boxShadow: "0 2px 8px rgba(29, 72, 150,0.05)",
                  padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem",
                }}>
                  {/* Post text */}
                  {post.text && (
                    <p style={{
                      fontSize: "14px", color: "#1a2e42", margin: 0,
                      lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      display: "-webkit-box", WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {post.text}
                    </p>
                  )}

                  {/* Repost badge */}
                  {post.repostOf && (
                    <span style={{
                      fontSize: "11px", color: "#7a5868",
                      background: "#f0f6fb", borderRadius: "6px",
                      padding: "3px 8px", display: "inline-block", alignSelf: "flex-start",
                    }}>
                      ↺ {t.community.repostedBy} {post.repostOf.authorName ?? ""}
                    </span>
                  )}

                  {/* Images thumbnail strip */}
                  {(() => {
                    const postMedia = getPostMedia(post);
                    if (!postMedia.length) return null;
                    return (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: postMedia.length === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))",
                        gap: 6,
                      }}>
                        {postMedia.slice(0, 4).map((media, i) => (
                          media.type === "image" ? (
                            <img
                              key={i}
                              src={media.url}
                              alt=""
                              style={{
                                width: "100%", height: 120,
                                objectFit: "cover", borderRadius: "12px",
                                cursor: "pointer",
                              }}
                              onClick={() => window.open(media.url, "_blank")}
                            />
                          ) : (
                            <video
                              key={i}
                              src={media.url}
                              controls
                              style={{ width: "100%", height: 120, borderRadius: "12px", objectFit: "cover" }}
                            />
                          )
                        ))}
                        {postMedia.length > 4 && (
                          <div style={{
                            display: "grid", placeItems: "center",
                            borderRadius: "12px", background: "#f0f6fb",
                            color: "#7a5868", fontSize: "13px", fontWeight: 700,
                          }}>
                            +{postMedia.length - 4}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Stats + date */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                    <div style={{ display: "flex", gap: "12px" }}>
                      {(post.likes?.length ?? post.likesCount ?? 0) > 0 && (
                        <span style={{ fontSize: "12px", color: "#7a5868", display: "flex", alignItems: "center", gap: 3 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {post.likes?.length ?? post.likesCount}
                        </span>
                      )}
                      {(post.commentsCount ?? 0) > 0 && (
                        <span style={{ fontSize: "12px", color: "#7a5868", display: "flex", alignItems: "center", gap: 3 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {post.commentsCount}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>
                      {relativeTime(post.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailModal && isOwner && (
        <div style={S.modal} onClick={() => setShowEmailModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>{t.profile.changeEmail}</p>
            <p style={S.modalSub}>{t.profile.emailModalSub}</p>
            {emailError && <div style={S.errorMsg}>{emailError}</div>}

            <div style={S.group}>
              <label style={S.label}>{t.profile.currentPassword}</label>
              <input className="profile-input" style={S.modalInput} type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={S.group}>
              <label style={S.label}>{t.profile.newEmail}</label>
              <input className="profile-input" style={S.modalInput} type="email" placeholder="new@email.com"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div style={S.modalActions}>
              <button className="cancel-btn" style={S.cancelBtn} onClick={() => setShowEmailModal(false)}>{t.profile.cancel}</button>
              <button style={S.confirmBtn} onClick={handleEmailChange}>{t.profile.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
