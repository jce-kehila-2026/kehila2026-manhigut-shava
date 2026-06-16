import { useState, useEffect, useRef, useMemo } from "react";
import { doc, getDoc, updateDoc, query, where, collection, getDocs, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { isBirthdayToday } from "./utils/birthday";

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
  @keyframes balloonFloat {
    0%   { transform: translateY(0) rotate(-3deg); }
    50%  { transform: translateY(-14px) rotate(3deg); }
    100% { transform: translateY(0) rotate(-3deg); }
  }
  @keyframes confettiFall {
    0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(140px) rotate(360deg); opacity: 0; }
  }
  @keyframes wishCardIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
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

const BALLOON_COLORS = ["#e8735a", "#4472b8", "#d4a574", "#7ba87a", "#c084fc", "#f4a4c0"];

/* ─── Decorative balloon (pure CSS, no emoji) ─── */
function Balloon({ color, left, delay, size, duration }) {
  return (
    <div style={{
      position:"absolute", bottom:6, left:`${left}%`,
      animation:`balloonFloat ${duration}s ease-in-out ${delay}s infinite`,
      pointerEvents:"none", zIndex:0,
    }}>
      <div style={{
        width:size, height:size * 1.18, borderRadius:"50%",
        background:`linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`,
        boxShadow:"inset -6px -8px 14px rgba(0,0,0,0.14), 0 4px 10px rgba(0,0,0,0.12)",
        position:"relative",
      }}>
        <div style={{
          position:"absolute", left:"50%", bottom:-6, transform:"translateX(-50%)",
          width:0, height:0,
          borderLeft:"4px solid transparent", borderRight:"4px solid transparent",
          borderTop:`6px solid ${color}`,
        }} />
      </div>
      <div style={{ width:1, height:34, background:"rgba(17,24,39,0.18)", margin:"0 auto" }} />
    </div>
  );
}

/* ─── Birthday banner — balloons + greeting, shown when it's the profile owner's birthday ─── */
function BirthdayBanner({ name, isOwner, isMobile, t }) {
  const balloons = useMemo(() => {
    const count = isMobile ? 5 : 8;
    return Array.from({ length: count }).map((_, i) => ({
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      left: Math.round((i * (100 / count)) + (i % 2 === 0 ? 2 : 6)),
      delay: (i * 0.35) % 2,
      size: 34 + (i % 3) * 10,
      duration: 3.2 + (i % 3) * 0.6,
    }));
  }, [isMobile]);

  const confetti = useMemo(() => Array.from({ length: 16 }).map((_, i) => ({
    left: Math.round((i * 6.2) % 100),
    delay: (i * 0.18) % 2.4,
    duration: 2.6 + (i % 4) * 0.4,
    color: BALLOON_COLORS[(i + 2) % BALLOON_COLORS.length],
    size: 5 + (i % 3) * 2,
    rect: i % 2 === 0,
  })), []);

  return (
    <div className="profile-card" style={{
      position:"relative", overflow:"hidden",
      borderRadius:20, marginBottom:"1.25rem",
      background:"linear-gradient(135deg,#fdf8f6 0%,#f0f6fb 55%,#fdf1f6 100%)",
      border:"1.5px solid #f0d9e4",
      padding: isMobile ? "1.5rem 1.25rem" : "2rem 2.25rem",
      minHeight: isMobile ? 110 : 130,
      display:"flex", alignItems:"center",
      boxShadow:"0 4px 24px rgba(29,72,150,0.06)",
    }}>
      {confetti.map((c, i) => (
        <div key={`c${i}`} style={{
          position:"absolute", top:0, left:`${c.left}%`,
          width:c.size, height:c.size,
          borderRadius: c.rect ? 2 : "50%",
          background:c.color,
          animation:`confettiFall ${c.duration}s ${c.delay}s linear infinite`,
          zIndex:0,
        }} />
      ))}
      {balloons.map((b, i) => <Balloon key={i} {...b} />)}
      <div style={{ position:"relative", zIndex:1, maxWidth:"70%" }}>
        <h2 style={{ fontSize: isMobile ? 19 : 24, fontWeight:800, margin:"0 0 4px", color:"#111827", fontFamily:"'Outfit', sans-serif" }}>
          {isOwner ? t.profile.birthdayOwnerTitle : t.profile.birthdayVisitorTitle(name)}
        </h2>
        <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>
          {isOwner ? t.profile.birthdayOwnerSubtitle : t.profile.birthdayVisitorSubtitle}
        </p>
      </div>
    </div>
  );
}

/* ─── Birthday wishes — read + leave a message on someone's birthday ─── */
function BirthdayWishes({ targetId, currentUser, currentProfile, isOwner, t, relativeTime, isMobile }) {
  const [wishes, setWishes] = useState([]);
  const [wishText, setWishText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    if (!targetId) return;
    const q = query(collection(db, "users", targetId, "birthdayWishes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setWishes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Failed to load birthday wishes:", err));
    return unsub;
  }, [targetId]);

  const handleSend = async () => {
    if (!wishText.trim() || !currentUser || sending) return;
    setSending(true);
    setSendError("");
    try {
      const fromName = `${currentProfile?.firstName || ""} ${currentProfile?.lastName || ""}`.trim() || currentUser.email;
      await addDoc(collection(db, "users", targetId, "birthdayWishes"), {
        fromUserId: currentUser.uid,
        fromName,
        fromAvatar: currentProfile?.photoURL || currentProfile?.avatarUrl || null,
        message: wishText.trim(),
        createdAt: new Date().toISOString(),
      });
      setWishText("");
    } catch (err) {
      console.error("Failed to send birthday wish:", err);
      setSendError(t.profile.errorGeneral);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="profile-card" style={{
      background:"#fff", borderRadius:"20px",
      border:"1.5px solid #f0f6fb", boxShadow:"0 4px 24px rgba(29,72,150,0.06)",
      padding:"1.75rem", marginBottom:"1.25rem", borderLeft:"4px solid #d4a574",
    }}>
      <SectionTitle label={t.profile.birthdayWishesTitle} />
      {sendError && (
        <div style={{ fontSize:"13px", color:"#9a4545", background:"#fff0f0", border:"1px solid #d99090", borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem" }}>
          {sendError}
        </div>
      )}

      {!isOwner && currentUser && (
        <div style={{ display:"flex", gap:"10px", alignItems:"flex-start", marginBottom:"1.25rem", flexDirection: isMobile ? "column" : "row" }}>
          <textarea
            className="profile-textarea"
            style={{
              flex:1, width:"100%", boxSizing:"border-box",
              padding:"12px 14px", fontSize:"14px",
              border:"1.5px solid #daeaf8", borderRadius:"13px",
              color:"#1a2e42", background:"#fdf8f6", fontFamily:"inherit",
              resize:"vertical", minHeight:"46px",
            }}
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            placeholder={t.profile.birthdayWishPlaceholder}
          />
          <button
            onClick={handleSend}
            disabled={!wishText.trim() || sending}
            style={{
              padding:"12px 22px", background:"#111827", color:"#fff",
              border:"none", borderRadius:"13px", fontSize:"14px", fontWeight:700,
              cursor: (!wishText.trim() || sending) ? "not-allowed" : "pointer",
              opacity: (!wishText.trim() || sending) ? 0.6 : 1,
              whiteSpace:"nowrap", flexShrink:0,
            }}
          >
            {sending ? t.profile.birthdaySending : t.profile.birthdaySend}
          </button>
        </div>
      )}

      {wishes.length === 0 ? (
        <div style={{
          textAlign:"center", padding:"1.5rem",
          background:"#fdf8f6", borderRadius:"14px",
          border:"1.5px dashed #daeaf8", color:"#6b7280", fontSize:"13px",
        }}>
          {t.profile.birthdayNoWishes}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {wishes.map((w) => (
            <div key={w.id} style={{
              display:"flex", gap:"10px", alignItems:"flex-start",
              padding:"12px 14px", background:"#fdf8f6",
              border:"1px solid #f0f6fb", borderRadius:"13px",
              animation:"wishCardIn 0.3s ease both",
            }}>
              <div style={{
                width:32, height:32, borderRadius:"50%", flexShrink:0,
                background:"#daeaf8", color:"#1d4896",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:700, overflow:"hidden",
              }}>
                {w.fromAvatar
                  ? <img src={w.fromAvatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : (w.fromName?.[0] || "?").toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>{w.fromName}</span>
                  <span style={{ fontSize:11, color:"#6b7280", flexShrink:0 }}>{relativeTime(w.createdAt)}</span>
                </div>
                <p style={{ fontSize:13, color:"#1a2e42", margin:"3px 0 0", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                  {w.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const INSTITUTIONS = [
  "אוניברסיטת תל אביב","האוניברסיטה העברית","הטכניון","אוניברסיטת חיפה",
  "אוניברסיטת בן גוריון","אוניברסיטת בר אילן","המכון הבינתחומי הרצליה (IDC)",
  "מכלל אריאל","האקדמית אשקלון","הקריה האקדמית אונו","מכללת ספיר",
  "מכלל תל חי","מכלל כנרת","מכלל אחוה","מכלל רופין","מכלל עמק יזרעאל",
  "Tel Aviv University","Hebrew University","Technion","University of Haifa",
  "Ben-Gurion University","Bar-Ilan University","Reichman University (IDC)",
  "Ariel University","Ashkelon Academic College","Ono Academic College",
];

export default function ProfilePage({ viewUserId, onMessage, onNavigateToCommunity }) {
  const { user, profile: authProfile, refreshProfile, logout } = useAuth();
  const { t, isRTL } = useLang();
  const isMobile = useIsMobile();
  const fileRef = useRef();

  const [form, setForm] = useState({
    firstName:"", lastName:"", phone:"", profession:"", bio:"", birthDate:"",
    ethnicity:"", ethnicityPrivate:false, region:"", institution:"", graduationYear:"", linkedIn:"",
    helpAreas:[], languages:[], experience:"", goals:"",
  });
  const [institutionOther, setInstitutionOther] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey,  setSavedKey]  = useState(null);
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
  const [showPwModal,    setShowPwModal]    = useState(false);
  const [currentPw,      setCurrentPw]      = useState("");
  const [newPw,          setNewPw]          = useState("");
  const [confirmPw,      setConfirmPw]      = useState("");
  const [pwError,        setPwError]        = useState("");
  const [pwSuccess,      setPwSuccess]      = useState("");

  /* Raw birthday value, kept separate from form.birthDate so legacy
     "DD/MM/YYYY" free-text birthdays (saved via CompleteProfilePage)
     still trigger the birthday banner even if they don't match the
     <input type="date"> format. */
  const [birthdayValue, setBirthdayValue] = useState("");

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
          profession:     d.profession     ?? "",
          bio:            d.bio            ?? "",
          birthDate:      d.birthDate      ?? "",
          ethnicity:        d.ethnicity        ?? "",
          ethnicityPrivate: d.ethnicityPrivate ?? false,
          region:           d.region           ?? "",
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
        setBirthdayValue(d.birthDate ?? d.birthdate ?? "");
        const inst = d.institution ?? "";
        if (inst && !INSTITUTIONS.includes(inst)) {
          setForm(prev => ({ ...prev, institution: "OTHER" }));
          setInstitutionOther(inst);
        }
      } else {
        setForm({ firstName:"", lastName:"", phone:"", profession:"", bio:"", birthDate:"", ethnicity:"", ethnicityPrivate:false, region:"", institution:"", graduationYear:"", linkedIn:"", helpAreas:[], languages:[], experience:"", goals:"" });
        setPhotoURL(null);
        setNetworksCount(0);
        setProfileEmail("");
        setBirthdayValue("");
      }
    }).catch(() => {
      setForm({ firstName:"", lastName:"", phone:"", city:"", profession:"", bio:"", birthDate:"", ethnicity:"", ethnicityPrivate:false, region:"", institution:"", graduationYear:"", linkedIn:"", helpAreas:[], languages:[], experience:"", goals:"" });
      setPhotoURL(null);
      setNetworksCount(0);
      setProfileEmail("");
      setBirthdayValue("");
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

  const fields = [form.firstName, form.lastName, form.phone, form.profession, form.bio, form.birthDate,
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

  /* ── Save (per-section, supports admin editing another user) ── */
  const handleSaveSection = async (sectionKey, fields) => {
    if (!user) return;
    const targetId = isOwner ? user.uid : (authProfile?.isAdmin && viewUserId ? viewUserId : null);
    if (!targetId) return;
    setSavingKey(sectionKey); setError("");
    try {
      const saveData = { ...fields };
      if ("institution" in saveData && saveData.institution === "OTHER")
        saveData.institution = institutionOther || "אחר";
      await updateDoc(doc(db, "users", targetId), saveData);
      if (isOwner) await refreshProfile();
      setSavedKey(sectionKey);
      setTimeout(() => setSavedKey(k => k === sectionKey ? null : k), 2200);
    } catch {
      setError(t.profile.errorGeneral);
    } finally {
      setSavingKey(null);
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

  /* ── Password change ──
     Firebase Auth is the backend here: re-authenticate with the current
     password, then updatePassword() (Firebase hashes/stores it). Only available
     to email/password accounts — federated (Google) sign-ins have no password. */
  const isPasswordUser = user?.providerData?.some((p) => p.providerId === "password");

  const handlePasswordChange = async () => {
    if (!isOwner || !user) return;
    setPwError(""); setPwSuccess("");
    if (!currentPw)            { setPwError(t.profile.passwordCurrentRequired); return; }
    if (newPw !== confirmPw)   { setPwError(t.profile.passwordsNoMatch); return; }
    if (newPw.length < 8)      { setPwError(t.profile.passwordTooShort); return; }
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPw);
      setPwSuccess(t.profile.passwordSuccess);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setShowPwModal(false); setPwSuccess(""); }, 1400);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential")
        setPwError(t.profile.passwordWrong);
      else if (err.code === "auth/weak-password") setPwError(t.profile.passwordTooShort);
      else if (err.code === "auth/too-many-requests") setPwError(t.profile.tooManyRequests);
      else setPwError(t.profile.errorGeneral);
    }
  };

  const getInitials = () => {
    if (form.firstName && form.lastName)
      return `${form.firstName[0]}${form.lastName[0]}`.toUpperCase();
    return (user?.email?.[0] ?? "?").toUpperCase();
  };

  const BIO_LIMIT = 400;

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
      width:"100%", height:"100%", overflowY:"auto", overflowX:"hidden",
      padding:"0 0 3rem",
      boxSizing:"border-box",
      direction: isRTL ? "rtl" : "ltr",
    },
    banner: {
      width:"100%", background:"linear-gradient(135deg, #0b1f52 0%, #1d4896 60%, #2f5fd4 100%)",
      padding: isMobile ? "1rem 1.25rem" : "1.25rem 2rem",
      display:"flex", alignItems:"center", gap:"1rem", flexShrink:0,
    },
    avatarWrap:  { position:"relative", flexShrink:0 },
    avatarRing:  { width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg, #4472b8, #0b1f52)", padding:3, boxShadow:"0 4px 16px rgba(0,0,0,0.35)" },
    avatarInner: { width:"100%", height:"100%", borderRadius:"50%", background:"#0b1f52", color:"#ffffff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:"700", overflow:"hidden" },
    avatarImg:   { width:"100%", height:"100%", objectFit:"cover" },
    uploadPill:  { display:"flex", flexDirection:"column", alignItems: isRTL ? "flex-start" : "flex-end", gap:4, marginLeft:"auto", flexShrink:0 },
    uploadBtn: {
      padding:"7px 14px", background:"rgba(255,255,255,0.18)", color:"#fff",
      border:"1px solid rgba(255,255,255,0.35)", borderRadius:"11px",
      fontSize:"12px", fontWeight:"700", cursor:"pointer",
      backdropFilter:"blur(6px)", transition:"background 0.2s",
    },
    avatarHint: { fontSize:"10px", color:"rgba(255,255,255,0.5)", margin:0 },
    body: { padding: isMobile ? "0.75rem 1rem 0" : "1rem 2rem 0" },
    twoCol: { display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"1.25rem", alignItems:"start" },
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
      background:"#111827",
      color:"#fff", border:"none", borderRadius:"13px",
      fontSize:"14px", fontWeight:"700", cursor:"pointer",
      transition:"background 0.3s, transform 0.15s, box-shadow 0.2s",
      boxShadow:"0 2px 8px rgba(29, 72, 150,0.1)",
      display:"flex", alignItems:"center", gap:"7px",
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

  const getSaveBtnStyle = (key) => ({
    ...S.saveBtn,
    background: savedKey === key ? "linear-gradient(135deg,#7ba87a,#7ba87a)" : "#111827",
    opacity: savingKey === key ? 0.7 : 1,
    cursor: savingKey === key ? "not-allowed" : "pointer",
  });
  const saveBtnLabel = (key) => {
    if (savedKey === key) return <><CheckMark /> {t.profile.saved}</>;
    if (savingKey === key) return t.profile.saving;
    return t.profile.saveChanges;
  };

  return (
    <div style={S.page}>
      {/* Compact profile header */}
      <div style={S.banner}>
        <div style={S.avatarWrap}>
          <div style={S.avatarRing}>
            <div style={S.avatarInner}>
              {photoURL
                ? <img src={photoURL} style={S.avatarImg} alt="avatar" />
                : getInitials()}
            </div>
          </div>
          {isOwner && (
            <>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload} />
              <button className="upload-btn" onClick={() => fileRef.current.click()}
                style={{ position:"absolute", bottom:-2, right:-2, width:22, height:22, borderRadius:"50%", background:"#fff", border:"1.5px solid #4472b8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, fontSize:11, color:"#1d4896" }}
                title={t.profile.uploadPhoto}>✎</button>
            </>
          )}
        </div>

        {/* Name + role */}
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:"#fff", margin:0, lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : (isOwner ? t.profile.myProfile : t.profile.memberProfile)}
          </h2>
          {form.profession && <p style={{ fontSize:12, color:"rgba(200,221,251,0.75)", margin:"4px 0 0" }}>{form.profession}</p>}
          {networksCount > 0 && (
            <span style={{ display:"inline-block", marginTop:5, fontSize:10, fontWeight:700, color:"rgba(200,221,251,0.85)", background:"rgba(255,255,255,0.12)", padding:"2px 9px", borderRadius:99 }}>
              {networksCount} Connections
            </span>
          )}
        </div>

        {/* LinkedIn button */}
        <div style={S.uploadPill}>
          {form.linkedIn && (
            <a href={form.linkedIn.startsWith("http") ? form.linkedIn : `https://${form.linkedIn}`}
              target="_blank" rel="noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:99, background:"rgba(255,255,255,0.18)", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", border:"1px solid rgba(255,255,255,0.3)", whiteSpace:"nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Birthday decorations + wishes */}
        {isBirthdayToday(birthdayValue) && (
          <>
            <BirthdayBanner
              name={form.firstName || (isOwner ? "" : t.profile.memberProfile)}
              isOwner={isOwner}
              isMobile={isMobile}
              t={t}
            />
            <BirthdayWishes
              targetId={viewUserId || user?.uid}
              currentUser={user}
              currentProfile={authProfile}
              isOwner={isOwner}
              t={t}
              relativeTime={relativeTime}
              isMobile={isMobile}
            />
          </>
        )}

        <div style={{ marginBottom:"1rem" }}>
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
              <button
                style={getSaveBtnStyle("personal")}
                className={savingKey === "personal" ? "save-btn-shimmer" : ""}
                onClick={() => handleSaveSection("personal", { firstName:form.firstName, lastName:form.lastName, phone:form.phone, profession:form.profession, birthDate:form.birthDate })}
                disabled={!!savingKey}
                onMouseOver={(e) => { if (!savingKey) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {saveBtnLabel("personal")}
              </button>
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
              <div style={{ ...S.actionRow, marginTop:"0.75rem" }}>
                <button
                  style={getSaveBtnStyle("bio")}
                  className={savingKey === "bio" ? "save-btn-shimmer" : ""}
                  onClick={() => handleSaveSection("bio", { bio: form.bio })}
                  disabled={!!savingKey}
                  onMouseOver={(e) => { if (!savingKey) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {saveBtnLabel("bio")}
                </button>
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

            {isOwner && (
              <div className="profile-card" style={{ ...S.card, borderLeftColor:"#60a5fa", marginBottom:0, marginTop:"1rem" }}>
                <SectionTitle label={t.profile.passwordLabel} />
                {pwSuccess && <div style={S.emailSuccessMsg}>{pwSuccess}</div>}
                <div style={S.emailRow}>
                  <div style={{ ...S.group, flex:1, marginBottom:0 }}>
                    <label style={S.label}>{t.profile.passwordLabel}</label>
                    <input style={S.inputDisabled} value="••••••••" type="password" disabled />
                  </div>
                  <button className="change-btn" style={S.changeBtn} onClick={() => { setPwError(""); setPwSuccess(""); setShowPwModal(true); }}>
                    {t.profile.change}
                  </button>
                </div>
              </div>
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
                  <p style={S.label}>{t.profile.region}</p>
                  <div style={S.inputDisabled}>{form.region || "—"}</div>
                </div>
              </div>
              <div style={S.row}>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.phone}</p>
                  <div style={S.inputDisabled}>{form.phone || "—"}</div>
                </div>
                {form.institution && (
                  <div style={S.group}>
                    <p style={S.label}>{t.profile.institution}</p>
                    <div style={S.inputDisabled}>{form.institution === "OTHER" ? institutionOther : form.institution}</div>
                  </div>
                )}
              </div>
              {form.linkedIn && (
                <div style={S.group}>
                  <p style={S.label}>LinkedIn</p>
                  <a href={form.linkedIn.startsWith("http") ? form.linkedIn : `https://${form.linkedIn}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:"13px", color:"#1d4896", textDecoration:"none", fontWeight:600 }}>
                    {form.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")}
                  </a>
                </div>
              )}
            </div>

            <div className="profile-card" style={S.card}>
              <SectionTitle label={t.profile.bio} />
              <div style={{ ...S.inputDisabled, minHeight:"120px", whiteSpace:"pre-wrap", lineHeight:1.7 }}>
                {form.bio || "—"}
              </div>
            </div>

            <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
              <button
                onClick={handleMessageClick}
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

        {/* Additional Details — owner always editable; admins can view+edit any profile; others never see */}
        <div className="profile-card" style={{ ...S.card, borderLeftColor:"#e8735a", marginTop:"1.25rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"1.25rem" }}>
              <p style={{ fontSize:"11px", fontWeight:"700", color:"#111827", textTransform:"uppercase", letterSpacing:"0.12em", margin:0 }}>
                {t.profile.additionalDetails}
              </p>
              {!isOwner && authProfile?.isAdmin && (
                <span style={{ fontSize:9, fontWeight:700, background:"#fff3cd", color:"#92400e", padding:"2px 8px", borderRadius:99, border:"1px solid #fcd34d" }}>
                  Admin view only
                </span>
              )}
            </div>
            {error && <div style={S.errorMsg}>{error}</div>}

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>{t.profile.region}</label>
                <SelectInput value={form.region} disabled={isReadOnly}
                  placeholder="—" options={t.profile.regionOptions}
                  onChange={e => handleChange({ target:{ name:"region", value:e.target.value } })} />
              </div>
            </div>

            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>{t.profile.institution}</label>
                <select
                  className="profile-input"
                  value={INSTITUTIONS.includes(form.institution) ? form.institution : (form.institution ? "OTHER" : "")}
                  disabled={isReadOnly}
                  onChange={e => {
                    if (e.target.value === "OTHER") { setForm(p => ({ ...p, institution:"OTHER" })); setInstitutionOther(""); }
                    else { handleChange({ target:{ name:"institution", value:e.target.value } }); setInstitutionOther(""); }
                  }}
                  style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", fontSize:"14px", border:"1.5px solid #daeaf8", borderRadius:"13px", color:"#1a2e42", background: isReadOnly ? "#f0f6fb" : "#fdf8f6", fontFamily:"inherit", appearance:"none" }}
                >
                  <option value="">{t.profile.institutionPlaceholder || "בחרי מוסד..."}</option>
                  {INSTITUTIONS.map((inst, i) => <option key={i} value={inst}>{inst}</option>)}
                  <option value="OTHER">אחר (כתבי ידנית)</option>
                </select>
                {(form.institution === "OTHER" || (!INSTITUTIONS.includes(form.institution) && form.institution)) && (
                  <PlainInput value={institutionOther} onChange={e => setInstitutionOther(e.target.value)}
                    placeholder="שם המוסד / הארגון..." />
                )}
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
              <label style={S.label}>{t.profile.experience}</label>
              <textarea className="profile-textarea" style={{ ...S.textarea, minHeight:"90px", background: isReadOnly ? "#f0f6fb" : undefined }}
                name="experience" value={form.experience} onChange={handleChange}
                placeholder={t.profile.experiencePlaceholder} disabled={isReadOnly} />
            </div>
            <div style={{ ...S.group, marginBottom:"1rem" }}>
              <label style={S.label}>{t.profile.goals}</label>
              <textarea className="profile-textarea" style={{ ...S.textarea, minHeight:"90px", background: isReadOnly ? "#f0f6fb" : undefined }}
                name="goals" value={form.goals} onChange={handleChange}
                placeholder={t.profile.goalsPlaceholder} disabled={isReadOnly} />
            </div>
            {(!form.ethnicityPrivate || isOwner || authProfile?.isAdmin) && (
              <div style={{ ...S.group, marginBottom:"1rem" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.4rem" }}>
                  <label style={S.label}>{t.profile.ethnicity}</label>
                  {isOwner && (
                    <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#6b7280", cursor:"pointer", userSelect:"none" }}>
                      <input
                        type="checkbox"
                        checked={!!form.ethnicityPrivate}
                        onChange={e => setForm(p => ({ ...p, ethnicityPrivate: e.target.checked }))}
                        style={{ cursor:"pointer" }}
                      />
                      {t.profile.ethnicityPrivateToggle}
                    </label>
                  )}
                </div>
                <SelectInput value={form.ethnicity} disabled={isReadOnly}
                  placeholder="—" options={t.profile.ethnicityOptions}
                  onChange={e => handleChange({ target:{ name:"ethnicity", value:e.target.value } })} />
              </div>
            )}

            {isOwner && (
              <div style={S.actionRow}>
                <button
                  style={getSaveBtnStyle("details")}
                  className={savingKey === "details" ? "save-btn-shimmer" : ""}
                  onClick={() => handleSaveSection("details", {
                    ethnicity: form.ethnicity, ethnicityPrivate: form.ethnicityPrivate,
                    region: form.region, institution: form.institution, graduationYear: form.graduationYear,
                    linkedIn: form.linkedIn, experience: form.experience, goals: form.goals,
                  })}
                  disabled={!!savingKey}
                  onMouseOver={(e) => { if (!savingKey) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {saveBtnLabel("details")}
                </button>
              </div>
            )}
          </div>

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
                <div key={post.id} className="profile-card" onClick={() => onNavigateToCommunity?.()}
                  style={{
                  background: "#fff", borderRadius: "18px",
                  border: "1.5px solid #f0f6fb", borderLeft: "4px solid #4472b8",
                  boxShadow: "0 2px 8px rgba(29, 72, 150,0.05)",
                  padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem",
                  cursor: onNavigateToCommunity ? "pointer" : "default",
                  transition: "box-shadow 0.18s, transform 0.18s",
                }}
                  onMouseEnter={e => { if (onNavigateToCommunity) { e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,72,150,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(29,72,150,0.05)"; e.currentTarget.style.transform = "none"; }}
                >
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

      {/* Logout button — own profile only, prominent on mobile */}
      {isOwner && (
        <div style={{ padding: isMobile ? "1.5rem 1rem 2rem" : "1.5rem 2rem 2rem", display: "flex", justifyContent: "center" }}>
          <button
            onClick={logout}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 28px", borderRadius: 99,
              background: "#fff0f0", color: "#c25c5c",
              border: "1.5px solid #e8b8b8",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "var(--font)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#c25c5c"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff0f0"; e.currentTarget.style.color = "#c25c5c"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t.nav?.logout || "Logout"}
          </button>
        </div>
      )}

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

      {/* Password Change Modal */}
      {showPwModal && isOwner && (
        <div style={S.modal} onClick={() => setShowPwModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>{t.profile.changePassword}</p>
            {isPasswordUser ? (
              <>
                <p style={S.modalSub}>{t.profile.passwordModalSub}</p>
                {pwError && <div style={S.errorMsg}>{pwError}</div>}
                {pwSuccess && <div style={S.emailSuccessMsg}>{pwSuccess}</div>}

                <div style={S.group}>
                  <label style={S.label}>{t.profile.currentPassword}</label>
                  <input className="profile-input" style={S.modalInput} type="password" placeholder="••••••••" autoComplete="current-password"
                    value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                </div>
                <div style={S.group}>
                  <label style={S.label}>{t.profile.newPassword}</label>
                  <input className="profile-input" style={S.modalInput} type="password" placeholder="••••••••" autoComplete="new-password"
                    value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                </div>
                <div style={S.group}>
                  <label style={S.label}>{t.profile.confirmNewPassword}</label>
                  <input className="profile-input" style={S.modalInput} type="password" placeholder="••••••••" autoComplete="new-password"
                    value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                </div>
                <div style={S.modalActions}>
                  <button className="cancel-btn" style={S.cancelBtn} onClick={() => setShowPwModal(false)}>{t.profile.cancel}</button>
                  <button style={S.confirmBtn} onClick={handlePasswordChange}>{t.profile.confirm}</button>
                </div>
              </>
            ) : (
              <>
                <p style={S.modalSub}>{t.profile.passwordGoogleNote}</p>
                <div style={S.modalActions}>
                  <button style={S.confirmBtn} onClick={() => setShowPwModal(false)}>{t.profile.gotIt}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
