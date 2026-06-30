import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { doc, getDoc, updateDoc, query, where, collection, getDocs, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import {
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, auth, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

const sendEmailChangeOtpFn   = httpsCallable(functions, "sendEmailChangeOtp");
const verifyEmailChangeOtpFn = httpsCallable(functions, "verifyEmailChangeOtp");
import { saveContact, getContact } from "./contact";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { isBirthdayToday } from "./utils/birthday";
import { safeUrl } from "./utils/safeUrl";
import { translateProfession, translateInstitution, translateRegion, translateReligion, translateEthnicity } from "./utils/translateProfile";
import ProfessionPicker from "./components/ProfessionPicker";
import InstitutionPicker from "./components/InstitutionPicker";
import RegionPicker from "./components/RegionPicker";

const storage = getStorage();

/* ─── Canvas utility: apply crop + rotation, return a Blob ─── */
function createImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImageEl(imageSrc);
  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  const canvas = document.createElement("canvas");
  canvas.width = safeArea;
  canvas.height = safeArea;
  const ctx = canvas.getContext("2d");

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y),
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      "image/jpeg",
      0.92,
    );
  });
}

/* ─── Inject keyframe animations once ─── */
let styleTag = document.head.querySelector("#profile-styles");
if (!styleTag) {
  styleTag = document.createElement("style");
  styleTag.id = "profile-styles";
  document.head.appendChild(styleTag);
}
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
  .dark-mode .profile-input:focus {
    border-color: #4472b8 !important;
    box-shadow: 0 0 0 3.5px rgba(68, 114, 184, 0.28) !important;
    background: #0f172a !important;
    outline: none;
  }
  .dark-mode .profile-textarea:focus {
    border-color: #4472b8 !important;
    box-shadow: 0 0 0 3.5px rgba(68, 114, 184, 0.28) !important;
    background: #0f172a !important;
    outline: none;
  }
  .upload-btn:hover  { background: rgba(255,255,255,1) !important; border-color: rgba(255,255,255,0.9) !important; }
  .change-btn:hover  { background: #f0f6fb !important; border-color: #daeaf8 !important; }
  .dark-mode .change-btn:hover { background: #1e293b !important; border-color: #4472b8 !important; }
  .cancel-btn:hover  { background: #daeaf8 !important; }
  .dark-mode .cancel-btn:hover { background: #334155 !important; }
  .save-btn-shimmer {
    background: linear-gradient(90deg, #111827 0%, #2a4a8e 40%, #111827 60%, #111827 100%);
    background-size: 400px 100%;
    animation: shimmer 1.6s infinite linear;
  }
  .check-svg { animation: checkPop 0.35s ease both; }
  .cover-edit-btn:hover { background: rgba(0,0,0,0.65) !important; }
  /* react-easy-crop required styles */
  .reactEasyCrop_Container { position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden; user-select:none; touch-action:none; cursor:move; }
  .reactEasyCrop_Image, .reactEasyCrop_Video { max-width:100%; max-height:100%; margin:auto; position:absolute; top:0; bottom:0; left:0; right:0; will-change:transform; }
  .reactEasyCrop_CropArea { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); border:2px solid rgba(255,255,255,0.7); box-sizing:border-box; box-shadow:0 0 0 9999em rgba(0,0,0,0.55); overflow:hidden; }
  .reactEasyCrop_CropAreaRound { border-radius:50%; }
  .reactEasyCrop_CropAreaGrid::before { content:""; box-sizing:border-box; position:absolute; border:1px solid rgba(255,255,255,0.4); top:0; bottom:0; left:33.33%; right:33.33%; border-top:0; border-bottom:0; }
  .reactEasyCrop_CropAreaGrid::after { content:""; box-sizing:border-box; position:absolute; border:1px solid rgba(255,255,255,0.4); top:33.33%; bottom:33.33%; left:0; right:0; border-left:0; border-right:0; }
  /* range sliders in crop modal */
  .crop-slider { -webkit-appearance:none; appearance:none; height:4px; border-radius:99px; background:#374151; outline:none; cursor:pointer; }
  .crop-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:50%; background:#4472b8; cursor:pointer; border:2px solid #fff; }
  .crop-slider::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:#4472b8; cursor:pointer; border:2px solid #fff; }
  .avatar-edit-btn:hover { background: #1d4896 !important; color: #fff !important; border-color: #1d4896 !important; }
  .profile-tab-btn { background: none; border: none; cursor: pointer; white-space: nowrap; }
`;

function CheckMark() {
  return (
    <svg className="check-svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RequiredHint({ show }) {
  const { t } = useLang();
  if (!show) return null;
  return <span style={{ fontSize:11, color:"#dc2626", marginTop:3, display:"block", fontWeight:600 }}>{t.profile?.requiredHint || "← מלאי שדה זה"}</span>;
}

function OptionalTag() {
  const { t } = useLang();
  return <span style={{ fontSize:10, fontWeight:500, color:"var(--text-muted,#9ca3af)", marginRight:4, marginLeft:4 }}>{t.profile?.optionalTag || "(רשות)"}</span>;
}

function CompletenessBadge({ pct, onCover = false }) {
  const color = pct >= 80 ? "#7ba87a" : pct >= 50 ? "#b8895a" : "#c25c5c";
  const track = onCover ? "rgba(255,255,255,0.25)" : (pct >= 80 ? "#cfe4ce" : pct >= 50 ? "#fde68a" : "#d99090");
  const SIZE = 40, SW = 3.5, R = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - pct / 100);
  return (
    <div style={{ position:"relative", width:SIZE, height:SIZE, flexShrink:0,
      borderRadius:"50%",
      ...(onCover ? { background:"rgba(0,0,0,0.38)", backdropFilter:"blur(6px)" } : {}) }}
      title={`${pct}% complete`}>
      <svg width={SIZE} height={SIZE} style={{ transform:"rotate(-90deg)", display:"block" }}>
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={track} strokeWidth={SW} />
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={color} strokeWidth={SW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:9, fontWeight:800, color: onCover ? "#fff" : color, lineHeight:1 }}>
        {pct}%
      </div>
    </div>
  );
}

function SectionTitle({ label }) {
  const { T } = useTheme();
  return (
    <p style={{
      fontSize:"11px", fontWeight:"700", color:T.text,
      textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 1.25rem",
    }}>
      {label}
    </p>
  );
}

function SelectInput({ value, onChange, options, disabled, placeholder }) {
  const { T } = useTheme();
  const { isRTL } = useLang();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (!e.target.closest("[data-portal-select]") && !triggerRef.current?.contains(e.target))
        setOpen(false);
    };
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxH = Math.min(240, (openAbove ? spaceAbove : spaceBelow) - 8);
    setDropPos({
      left: rect.left, width: rect.width, maxH,
      ...(openAbove ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
    });
    setOpen(true);
  };

  const handleSelect = opt => {
    onChange({ target: { value: opt } });
    setOpen(false);
  };

  return (
    <div ref={triggerRef}>
      <button
        type="button"
        className="profile-input"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : handleOpen()}
        style={{
          width:"100%", boxSizing:"border-box",
          padding:"12px 14px", fontSize:"14px",
          border:`1.5px solid ${open ? "#4472b8" : T.inputBorder}`, borderRadius:"13px",
          color: value ? T.text : T.sub,
          background: T.inputBg, fontFamily:"inherit",
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {value || placeholder || "—"}
        </span>
        <span style={{
          opacity:0.4, fontSize:11, flexShrink:0, marginInlineStart:8,
          display:"inline-block", transition:"transform 0.2s",
          ...(open ? { transform:"rotate(180deg)" } : {}),
        }}>▾</span>
      </button>

      {open && dropPos && createPortal(
        <div
          data-portal-select="true"
          style={{
            position:"fixed",
            left: dropPos.left, width: dropPos.width,
            maxHeight: dropPos.maxH,
            ...(dropPos.top !== undefined ? { top: dropPos.top } : { bottom: dropPos.bottom }),
            zIndex: 99999,
            background: T.inputBg,
            border: "1.5px solid #4472b8",
            borderRadius: 13,
            boxShadow: "0 6px 24px rgba(68,114,184,0.18)",
            overflowY: "auto",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); handleSelect(""); }}
            style={{
              display:"block", width:"100%", padding:"10px 14px",
              background:"none", border:"none",
              borderBottom:`1px solid ${T.inputBorder}`,
              cursor:"pointer", fontSize:14, color:T.sub, fontFamily:"inherit",
              textAlign: isRTL ? "right" : "left",
            }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(68,114,184,0.07)"}
            onMouseLeave={e => e.currentTarget.style.background="none"}
          >
            {placeholder || "—"}
          </button>
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(opt); }}
              style={{
                display:"block", width:"100%", padding:"10px 14px",
                background: opt === value ? "rgba(68,114,184,0.1)" : "none",
                border:"none",
                borderBottom: i < options.length - 1 ? `1px solid ${T.inputBorder}` : "none",
                cursor:"pointer", fontSize:14,
                color: opt === value ? "#4472b8" : T.text,
                fontFamily:"inherit",
                fontWeight: opt === value ? 700 : 400,
                textAlign: isRTL ? "right" : "left",
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background="rgba(68,114,184,0.07)"; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background="none"; }}
            >
              {opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function MultiSelectDropdown({ selectedValues, options, onChange, disabled, placeholder }) {
  const { T } = useTheme();
  const { isRTL } = useLang();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (!e.target.closest("[data-portal-multiselect]") && !triggerRef.current?.contains(e.target))
        setOpen(false);
    };
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxH = Math.min(280, (openAbove ? spaceAbove : spaceBelow) - 8);
    setDropPos({
      left: rect.left, width: rect.width, maxH,
      ...(openAbove ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
    });
    setOpen(true);
  };

  const toggle = (opt) => {
    if (disabled) return;
    const next = selectedValues.includes(opt)
      ? selectedValues.filter(v => v !== opt)
      : [...selectedValues, opt];
    onChange(next);
  };

  const displayText = selectedValues.length === 0
    ? (placeholder || "—")
    : selectedValues.join(", ");

  return (
    <div ref={triggerRef}>
      <button
        type="button"
        className="profile-input"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : handleOpen()}
        style={{
          width:"100%", boxSizing:"border-box",
          padding:"12px 14px", fontSize:"14px",
          border:`1.5px solid ${open ? "#4472b8" : T.inputBorder}`, borderRadius:"13px",
          color: selectedValues.length ? T.text : T.sub,
          background: T.inputBg, fontFamily:"inherit",
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          transition:"border-color 0.2s",
        }}
      >
        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {displayText}
        </span>
        <span style={{ opacity:0.4, fontSize:11, flexShrink:0, marginInlineStart:8, display:"inline-block", transition:"transform 0.2s", ...(open ? { transform:"rotate(180deg)" } : {}) }}>▾</span>
      </button>

      {open && dropPos && createPortal(
        <div
          data-portal-multiselect="true"
          style={{
            position:"fixed",
            left: dropPos.left, width: dropPos.width,
            maxHeight: dropPos.maxH,
            ...(dropPos.top !== undefined ? { top: dropPos.top } : { bottom: dropPos.bottom }),
            zIndex: 99999,
            background: T.inputBg,
            border:"1.5px solid #4472b8",
            borderRadius:13,
            boxShadow:"0 6px 24px rgba(68,114,184,0.18)",
            overflowY:"auto",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {options.map((opt, i) => {
            const checked = selectedValues.includes(opt);
            return (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); toggle(opt); }}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  width:"100%", padding:"10px 14px",
                  background: checked ? "rgba(68,114,184,0.1)" : "none",
                  border:"none",
                  borderBottom: i < options.length - 1 ? `1px solid ${T.inputBorder}` : "none",
                  cursor:"pointer", fontSize:14,
                  color: checked ? "#4472b8" : T.text,
                  fontFamily:"inherit", fontWeight: checked ? 700 : 400,
                  textAlign: isRTL ? "right" : "left",
                }}
                onMouseEnter={e => { if (!checked) e.currentTarget.style.background="rgba(68,114,184,0.07)"; }}
                onMouseLeave={e => { if (!checked) e.currentTarget.style.background="none"; }}
              >
                <span style={{
                  width:16, height:16, borderRadius:4,
                  border:`1.5px solid ${checked ? "#4472b8" : T.inputBorder}`,
                  background: checked ? "#4472b8" : "transparent",
                  flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function PlainInput(props) {
  const { T } = useTheme();
  return (
    <input
      className="profile-input"
      style={{
        width:"100%", boxSizing:"border-box",
        padding:"12px 14px", fontSize:"14px",
        border:`1.5px solid ${T.inputBorder}`, borderRadius:"13px",
        color:T.text, background:T.inputBg, fontFamily:"inherit",
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

/* ─── Birthday banner ─── */
function BirthdayBanner({ name, isOwner, isMobile, t }) {
  const { T, dark } = useTheme();
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
      background: dark
        ? "linear-gradient(135deg,#1e293b 0%,#0f172a 55%,#1e1a2e 100%)"
        : "linear-gradient(135deg,#fdf8f6 0%,#f0f6fb 55%,#fdf1f6 100%)",
      border:`1.5px solid ${T.cardBorder}`,
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
        <h2 style={{ fontSize: isMobile ? 19 : 24, fontWeight:800, margin:"0 0 4px", color:T.text, fontFamily:"'Outfit', sans-serif" }}>
          {isOwner ? t.profile.birthdayOwnerTitle : t.profile.birthdayVisitorTitle(name)}
        </h2>
        <p style={{ fontSize:13, color:T.sub, margin:0 }}>
          {isOwner ? t.profile.birthdayOwnerSubtitle : t.profile.birthdayVisitorSubtitle}
        </p>
      </div>
    </div>
  );
}

/* ─── Birthday wishes ─── */
function BirthdayWishes({ targetId, currentUser, currentProfile, isOwner, t, relativeTime, isMobile }) {
  const { T } = useTheme();
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
      background:T.card, borderRadius:"20px",
      border:`1.5px solid ${T.cardBorder}`, boxShadow:"0 4px 24px rgba(29,72,150,0.06)",
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
              border:`1.5px solid ${T.inputBorder}`, borderRadius:"13px",
              color:T.text, background:T.inputBg, fontFamily:"inherit",
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
          background:T.inputBg, borderRadius:"14px",
          border:`1.5px dashed ${T.inputBorder}`, color:T.sub, fontSize:"13px",
        }}>
          {t.profile.birthdayNoWishes}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {wishes.map((w) => (
            <div key={w.id} style={{
              display:"flex", gap:"10px", alignItems:"flex-start",
              padding:"12px 14px", background:T.inputBg,
              border:`1px solid ${T.cardBorder}`, borderRadius:"13px",
              animation:"wishCardIn 0.3s ease both",
            }}>
              <div style={{
                width:32, height:32, borderRadius:"50%", flexShrink:0,
                background:T.tagBg, color:"#1d4896",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:700, overflow:"hidden",
              }}>
                {w.fromAvatar
                  ? <img src={w.fromAvatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : (w.fromName?.[0] || "?").toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{w.fromName}</span>
                  <span style={{ fontSize:11, color:T.sub, flexShrink:0 }}>{relativeTime(w.createdAt)}</span>
                </div>
                <p style={{ fontSize:13, color:T.text, margin:"3px 0 0", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
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


export default function ProfilePage({ viewUserId, onMessage, onNavigateToCommunity }) {
  const { user, profile: authProfile, refreshProfile, logout } = useAuth();
  const { t, lang, isRTL } = useLang();
  const { T, dark } = useTheme();
  const isMobile = useIsMobile();
  const fileRef = useRef();
  const coverFileRef = useRef();

  /* ── Cover crop modal state ── */
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [coverRawSrc, setCoverRawSrc] = useState(null);
  const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 });
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverRotation, setCoverRotation] = useState(0);
  const [coverCroppedPixels, setCoverCroppedPixels] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const onCoverCropComplete = useCallback((_, pixels) => setCoverCroppedPixels(pixels), []);

  /* ── Avatar crop modal state ── */
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarRawSrc, setAvatarRawSrc] = useState(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarCroppedPixels, setAvatarCroppedPixels] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const onAvatarCropComplete = useCallback((_, pixels) => setAvatarCroppedPixels(pixels), []);

  const [form, setForm] = useState({
    firstName:"", lastName:"", phone:"", profession:"", professionTranslations:null, bio:"", birthDate:"",
    ethnicity:"", ethnicityPrivate:false, religion:"", religionPrivate:false, region:"", regionTranslations:null, institution:"", institutionTranslations:null, graduationYear:"", linkedIn:"", facebookURL:"", contactEmail:"", instagram:"", discord:"",
    helpAreas:[], languages:[], experience:"", goals:"",
  });
  const [photoURL, setPhotoURL] = useState(null);
  const [coverURL, setCoverURL] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey,  setSavedKey]  = useState(null);
  const [error,    setError]    = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const [networksCount, setNetworksCount] = useState(0);

  /* ── My Posts ── */
  const [myPosts,         setMyPosts]         = useState([]);
  const [postsLoading,    setPostsLoading]    = useState(false);
  const [myHelpPosts,     setMyHelpPosts]     = useState([]);
  const [helpPostsLoading,setHelpPostsLoading]= useState(false);

  const [showEmailModal,  setShowEmailModal]  = useState(false);
  const [emailStep,       setEmailStep]       = useState("verify"); // "verify" | "change" | "otp"
  const [newEmail,        setNewEmail]        = useState("");
  const [password,        setPassword]        = useState("");
  const [emailOtp,        setEmailOtp]        = useState("");
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [emailError,      setEmailError]      = useState("");
  const [emailSuccess,    setEmailSuccess]    = useState("");

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailStep("verify");
    setPassword("");
    setNewEmail("");
    setEmailOtp("");
    setEmailOtpCountdown(0);
    setEmailError("");
    setEmailSuccess("");
  };

  const [passwordError,          setPasswordError]          = useState("");
  const [passwordSuccess,        setPasswordSuccess]        = useState("");

  const [birthdayValue, setBirthdayValue] = useState("");
  const [activeTab, setActiveTab] = useState(null);

  /* ── Load profile + network count ── */
  useEffect(() => {
    const targetId = viewUserId || user?.uid;
    if (!targetId) return;
    const isViewerOwnerOrAdmin = !viewUserId || viewUserId === user?.uid || authProfile?.isAdmin;
    getDoc(doc(db, "users", targetId)).then(async (snap) => {
      const contact = isViewerOwnerOrAdmin ? await getContact(targetId) : { phone: "", email: "" };
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          firstName:      d.firstName      ?? "",
          lastName:       d.lastName       ?? "",
          phone:          contact.phone    ?? "",
          profession:             d.profession             ?? "",
          professionTranslations: d.professionTranslations ?? null,
          bio:            d.bio            ?? "",
          birthDate:      d.birthDate      ?? "",
          ethnicity:        d.ethnicity        ?? "",
          ethnicityPrivate: d.ethnicityPrivate ?? false,
          religion:         d.religion         ?? "",
          religionPrivate:  d.religionPrivate  ?? false,
          region:           d.region           ?? "",
          regionTranslations: d.regionTranslations ?? null,
          institution:             d.institution             ?? "",
          institutionTranslations: d.institutionTranslations ?? null,
          graduationYear: d.graduationYear ?? "",
          linkedIn:       d.linkedIn       ?? "",
          facebookURL:    d.facebookURL    ?? "",
          contactEmail:   d.contactEmail   ?? "",
          instagram:      d.instagram      ?? "",
          discord:        d.discord        ?? "",
          helpAreas:      d.helpAreas      ?? [],
          languages:      d.languages      ?? [],
          experience:     d.experience     ?? "",
          goals:          d.goals          ?? "",
        });
        setPhotoURL(d.photoURL ?? d.avatarUrl ?? null);
        setCoverURL(d.coverPhotoURL ?? null);
        setNetworksCount(d.networksCount ?? 0);
        setProfileEmail(contact.email ?? "");
        setBirthdayValue(d.birthDate ?? d.birthdate ?? "");
      } else {
        setForm({ firstName:"", lastName:"", phone:"", profession:"", bio:"", birthDate:"", ethnicity:"", ethnicityPrivate:false, region:"", institution:"", graduationYear:"", linkedIn:"", facebookURL:"", contactEmail:"", instagram:"", discord:"", helpAreas:[], languages:[], experience:"", goals:"" });
        setPhotoURL(null);
        setCoverURL(null);
        setNetworksCount(0);
        setProfileEmail("");
        setBirthdayValue("");
      }
    }).catch(() => {
      setForm({ firstName:"", lastName:"", phone:"", profession:"", bio:"", birthDate:"", ethnicity:"", ethnicityPrivate:false, region:"", institution:"", graduationYear:"", linkedIn:"", facebookURL:"", contactEmail:"", instagram:"", discord:"", helpAreas:[], languages:[], experience:"", goals:"" });
      setPhotoURL(null);
      setCoverURL(null);
      setNetworksCount(0);
      setProfileEmail("");
      setBirthdayValue("");
    });
  }, [user, viewUserId]);

  /* ── Load profile posts ── */
  useEffect(() => {
    if (emailOtpCountdown <= 0) return;
    const t = setTimeout(() => setEmailOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailOtpCountdown]);

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

  /* ── Load help posts ── */
  useEffect(() => {
    const targetId = viewUserId || user?.uid;
    if (!targetId) return;
    setHelpPostsLoading(true);
    getDocs(query(collection(db, "helpPosts"), where("authorUid", "==", targetId), orderBy("createdAt", "desc")))
      .then((snap) => setMyHelpPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
      .finally(() => setHelpPostsLoading(false));
  }, [user, viewUserId]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const fields = [
    form.firstName,
    form.lastName,
    form.phone,
    form.region,
    form.profession || form.currentRole,
    form.bio,
    form.birthDate || form.birthdate,
    form.helpAreas?.length > 0,
  ];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const isOwner = !viewUserId || viewUserId === user?.uid;
  const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com") ?? false;
  const isReadOnly = !isOwner;

  /* Admin edit permissions */
  const _vap = authProfile?.adminPermissions;
  const _hasExplicitPerms = _vap && Object.keys(_vap).length > 0;
  const viewerCanManageUsers = authProfile?.isAdmin && (!_hasExplicitPerms || !!_vap?.canManageUsers);
  const [adminEditOpen,   setAdminEditOpen]   = useState(false);
  const [adminEditFields, setAdminEditFields] = useState({});
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const postsTitle = isOwner ? t.profile.myPosts : t.profile.posts;
  const noPostsMessage = isOwner ? t.profile.noMyPosts : t.profile.noPosts;

  /* Tab definitions */
  const ownerTabs = [
    { id: "profile",   label: t.profile.about || "About" },
    { id: "account",   label: lang==="he"?"קישורים חברתיים":lang==="ar"?"روابط التواصل الاجتماعي":"Social Links" },
    { id: "posts",     label: postsTitle || "Posts" },
    { id: "helpPosts", label: lang==="he"?"פוסטי עזרה":lang==="ar"?"منشورات المساعدة":"Help Posts" },
  ];
  const visitorTabs = [
    { id: "about", label: t.profile.about || "About" },
    { id: "posts", label: postsTitle || "Posts" },
  ];
  const tabs = isOwner ? ownerTabs : visitorTabs;
  const currentTab = activeTab || tabs[0].id;

  const getPostMedia = (post) => {
    if (Array.isArray(post.media)) return post.media;
    if (Array.isArray(post.imageURLs)) return post.imageURLs.map((url) => ({ url, type: "image" }));
    return [];
  };

  const handleMessageClick = () => {
    if (!onMessage || !viewUserId) return;
    onMessage(viewUserId);
  };

  /* ── Photo upload: open crop modal ── */
  const handlePhotoUpload = (e) => {
    if (!isOwner || !user) return;
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setAvatarRawSrc(objectUrl);
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarRotation(0);
    setAvatarCroppedPixels(null);
    setAvatarCropOpen(true);
  };

  /* ── Photo upload: apply crop then upload ── */
  const handleAvatarCropConfirm = async () => {
    if (!avatarCroppedPixels || !avatarRawSrc || !user) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const blob = await getCroppedBlob(avatarRawSrc, avatarCroppedPixels, avatarRotation);
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      setAvatarCropOpen(false);
      URL.revokeObjectURL(avatarRawSrc);
      setAvatarRawSrc(null);
      refreshProfile();
    } catch (err) {
      console.error("Avatar crop/upload failed:", err);
      setError(t.profile.errorGeneral);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ── Cover photo: open crop modal ── */
  const handleCoverUpload = (e) => {
    if (!isOwner || !user) return;
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setCoverRawSrc(objectUrl);
    setCoverCrop({ x: 0, y: 0 });
    setCoverZoom(1);
    setCoverRotation(0);
    setCoverCroppedPixels(null);
    setCoverCropOpen(true);
  };

  /* ── Cover photo: apply crop then upload ── */
  const handleCoverCropConfirm = async () => {
    if (!coverCroppedPixels || !coverRawSrc || !user) return;
    setUploadingCover(true);
    setError("");
    try {
      const blob = await getCroppedBlob(coverRawSrc, coverCroppedPixels, coverRotation);
      const storageRef = ref(storage, `covers/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      setCoverURL(url);
      await updateDoc(doc(db, "users", user.uid), { coverPhotoURL: url });
      setCoverCropOpen(false);
      URL.revokeObjectURL(coverRawSrc);
      setCoverRawSrc(null);
    } catch (err) {
      console.error("Cover crop/upload failed:", err);
      setError(t.profile.errorGeneral);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteCover = async () => {
    if (!user || !coverURL) return;
    try {
      const fileRef = ref(storage, `covers/${user.uid}`);
      await deleteObject(fileRef);
    } catch {}
    await updateDoc(doc(db, "users", user.uid), { coverPhotoURL: null });
    setCoverURL(null);
  };

  /* ── Save (per-section) ── */
  const handleSaveSection = async (sectionKey, fields) => {
    if (!user) return;
    const targetId = isOwner ? user.uid : (authProfile?.isAdmin && viewUserId ? viewUserId : null);
    if (!targetId) return;

    // Validation
    const phoneVal = form.phone?.trim();
    if (phoneVal && !/^[\d\s\-+()/]+$/.test(phoneVal)) {
      alert(t.profile?.invalidPhone || "Phone number should contain digits only.");
      return;
    }
    if (form.firstName && form.firstName.trim() && form.firstName.trim().length < 2) {
      alert(t.profile?.nameTooShort || "First name must be at least 2 characters.");
      return;
    }
    if (sectionKey === "account" && !form.contactEmail?.trim()) {
      alert(lang==="he"?"אימייל ליצירת קשר הוא שדה חובה":lang==="ar"?"البريد الإلكتروني للتواصل مطلوب":"Contact email is required.");
      return;
    }

    setSavingKey(sectionKey); setError("");
    try {
      const saveData = { ...fields };
      const writes = [];
      if ("phone" in saveData) {
        writes.push(saveContact(targetId, { phone: saveData.phone }));
        delete saveData.phone;
      }
      writes.push(updateDoc(doc(db, "users", targetId), saveData));
      await Promise.all(writes);
      if (isOwner) await refreshProfile();
      setSavedKey(sectionKey);
      setTimeout(() => setSavedKey(k => k === sectionKey ? null : k), 2200);
    } catch {
      setError(t.profile.errorGeneral);
    } finally {
      setSavingKey(null);
    }
  };

  /* ── Email change — step 1: verify identity ── */
  const handleVerifyIdentity = async () => {
    if (!isOwner || !user) return;
    setEmailError("");
    try {
      if (isGoogleUser) {
        await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
      } else {
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }
      setEmailStep("change");
    } catch (err) {
      if (err.code === "auth/wrong-password")        setEmailError("Incorrect password.");
      else if (err.code === "auth/popup-closed-by-user") setEmailError("Google sign-in was cancelled.");
      else setEmailError(t.profile.errorGeneral);
    }
  };

  /* ── Email change — step 2: send OTP to new address ── */
  const handleEmailChange = async () => {
    if (!isOwner || !user) return;
    setEmailError("");
    try {
      await sendEmailChangeOtpFn({ newEmail });
      setEmailStep("otp");
      setEmailOtpCountdown(90);
    } catch (err) {
      console.error("sendEmailChangeOtp error:", err.code, err.message);
      if (err.code === "functions/already-exists")   setEmailError("That email is already in use.");
      else if (err.code === "functions/invalid-argument") setEmailError("Invalid email address.");
      else setEmailError(t.profile.errorGeneral);
    }
  };

  /* ── Email change — step 3: verify OTP and apply change ── */
  const handleVerifyEmailOtp = async () => {
    if (!isOwner || !user) return;
    setEmailError("");
    try {
      await verifyEmailChangeOtpFn({ otp: emailOtp });
      setEmailSuccess("Email updated successfully.");
      setEmailStep("done");
    } catch (err) {
      console.error("verifyEmailChangeOtp error:", err.code, err.message);
      if (err.code === "functions/deadline-exceeded")    setEmailError("Code expired. Request a new one.");
      else if (err.code === "functions/resource-exhausted") setEmailError("Too many attempts. Request a new code.");
      else if (err.code === "functions/invalid-argument")   setEmailError(err.message);
      else setEmailError(t.profile.errorGeneral);
    }
  };

  const handleResendEmailOtp = async () => {
    setEmailError("");
    try {
      await sendEmailChangeOtpFn({ newEmail });
      setEmailOtpCountdown(90);
      setEmailOtp("");
    } catch {
      setEmailError(t.profile.errorGeneral);
    }
  };

  /* ── Password reset — Firebase emails a secure reset link to the account
     address (works for password and Google-linked accounts alike). ── */
  const handleResetPassword = async () => {
    if (!isOwner || !user?.email) return;
    setPasswordError(""); setPasswordSuccess("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordSuccess(t.profile.resetEmailSent);
    } catch (err) {
      if (err.code === "auth/too-many-requests") setPasswordError(t.profile.tooManyRequests);
      else setPasswordError(t.profile.errorGeneral);
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
      padding:"0 0 2rem",
      boxSizing:"border-box",
      direction: isRTL ? "rtl" : "ltr",
      background: "var(--bg-primary)",
    },
    /* ── Cover photo: tall enough to contain the large avatar ── */
    coverWrap: {
      height: 220,
      overflow:"hidden",
      position:"relative",
      flexShrink:0,
      background:"linear-gradient(135deg, #0b1f52 0%, #1d4896 60%, #2f5fd4 100%)",
    },
    coverImg: {
      position:"absolute", inset:0,
      width:"100%", height:"100%", objectFit:"cover",
    },
    coverOverlay: {
      position:"absolute", inset:0,
      background:"linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 82%)",
      zIndex:1,
    },
    coverEditBtn: {
      position:"absolute", top:12, ...(isRTL ? { left:12 } : { right:12 }), zIndex:4,
      display:"flex", alignItems:"center", gap:5,
      padding:"7px 14px",
      background:"rgba(0,0,0,0.50)", color:"#fff",
      border:"1px solid rgba(255,255,255,0.35)",
      borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer",
      backdropFilter:"blur(8px)", transition:"background 0.18s",
    },
    /* ── No spacer needed — avatar lives fully inside the cover ── */
    profileInfoSection: { display:"none" },
    /* ── Avatar: inside coverWrap, anchored to bottom-left ── */
    avatarWrap: {
      position:"absolute",
      bottom: isMobile ? 18 : 22,
      ...(isRTL ? { right: isMobile ? "1rem" : "2rem" } : { left: isMobile ? "1rem" : "2rem" }),
      zIndex:5,
    },
    avatarRing: {
      width: isMobile ? 130 : 170, height: isMobile ? 130 : 170,
      borderRadius:"50%",
      border:"4px solid rgba(255,255,255,0.9)",
      boxShadow:"0 4px 28px rgba(0,0,0,0.45)",
      overflow:"hidden",
      background:"linear-gradient(135deg, #4472b8, #0b1f52)",
    },
    avatarInner: {
      width:"100%", height:"100%",
      background:"#0b1f52", color:"#ffffff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize: isMobile ? 34 : 44, fontWeight:"700", overflow:"hidden",
    },
    avatarImg: { width:"100%", height:"100%", objectFit:"cover" },
    avatarEditBtn: {
      position:"absolute", bottom:5, right:5,
      width:32, height:32, borderRadius:"50%",
      background:"rgba(255,255,255,0.95)", border:"1.5px solid rgba(180,180,180,0.5)",
      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
      padding:0, fontSize:13, color:"#1d4896",
      transition:"background 0.18s, color 0.18s",
    },
    /* ── Name/profession: inside coverWrap at the bottom, beside avatar ── */
    coverProfileRow: {
      position:"absolute",
      bottom: isMobile ? 18 : 22,
      ...(isRTL
        ? { right: `calc(${isMobile ? 130 : 170}px + ${isMobile ? "1.5rem" : "2.5rem"} + 14px)` }
        : { left:  `calc(${isMobile ? 130 : 170}px + ${isMobile ? "1.5rem" : "2.5rem"} + 14px)` }),
      zIndex:3,
      display:"flex", flexDirection:"column",
      maxWidth: isMobile ? "calc(100% - 145px - 2.5rem)" : "52%",
    },
    profileMetaText: { flex:1, minWidth:0 },
    profileName: {
      fontSize: isMobile ? 18 : 23, fontWeight:800, color:"#fff",
      margin:"0 0 3px", lineHeight:1.2, wordBreak:"break-word",
      textShadow:"0 1px 8px rgba(0,0,0,0.65), 0 2px 24px rgba(0,0,0,0.35)",
    },
    profilePro: {
      fontSize: isMobile ? 12 : 13, color:"rgba(255,255,255,0.88)",
      margin:"0 0 5px",
      textShadow:"0 1px 5px rgba(0,0,0,0.55)",
      overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
    },
    profileActions: { display:"flex", gap:6, alignItems:"center" },
    /* ── Tab bar ── */
    tabBar: {
      display:"flex", gap:0,
      borderBottom:`2px solid ${T.cardBorder}`,
      padding: isMobile ? "0.5rem 1rem 0" : "0.5rem 2rem 0",
      marginBottom:"1rem",
    },
    tab: {
      flexShrink:0, padding:"9px 16px",
      background:"none", border:"none",
      borderBottom:"2.5px solid transparent",
      marginBottom:"-2px",
      color:T.sub,
      fontSize:13, fontWeight:500,
      cursor:"pointer", whiteSpace:"nowrap",
      transition:"color 0.15s",
      fontFamily:"inherit",
    },
    tabActive: {
      flexShrink:0, padding:"9px 16px",
      background:"none", border:"none",
      borderBottom:"2.5px solid #4472b8",
      marginBottom:"-2px",
      color:"#4472b8",
      fontSize:13, fontWeight:700,
      cursor:"pointer", whiteSpace:"nowrap",
      transition:"color 0.15s",
      fontFamily:"inherit",
    },
    body: { padding: isMobile ? "0 1rem" : "0 2rem" },
    twoCol: { display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"1.25rem", alignItems:"start" },
    greeting:    { fontSize:"23px", fontWeight:"700", color:T.text, margin:"0 0 4px" },
    greetingSub: { fontSize:"13px", color:T.sub, margin:"0 0 1rem" },
    card: {
      background:T.card, borderRadius:"16px",
      border:`1.5px solid ${T.cardBorder}`,
      boxShadow:"0 4px 24px rgba(29, 72, 150,0.06)",
      padding:"1.25rem", marginBottom:"1rem",
      borderLeft:"4px solid #4472b8",
    },
    row:   { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:"0.75rem", marginBottom:"0.875rem" },
    group: { display:"flex", flexDirection:"column", gap:"7px" },
    label: { fontSize:"11px", fontWeight:"700", color:T.sub, textTransform:"uppercase", letterSpacing:"0.08em" },
    bioWrap: { position:"relative" },
    textarea: {
      width:"100%", boxSizing:"border-box",
      padding:"12px 14px", fontSize:"14px",
      border:`1.5px solid ${T.inputBorder}`, borderRadius:"13px",
      color:T.text, background:T.inputBg,
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
    errorMsg:       { fontSize:"13px", color:"#9a4545", background: dark ? "#3b1f1f" : "#fff0f0", border:"1px solid #d99090", borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem" },
    emailRow:       { display:"flex", flexDirection: isMobile ? "column" : "row", gap:"10px", alignItems: isMobile ? "stretch" : "flex-end" },
    inputDisabled:  { padding:"12px 14px", fontSize:"14px", border:`1.5px solid ${T.inputBorder}`, borderRadius:"13px", color:T.sub, background:T.tagBg, width:"100%", boxSizing:"border-box", fontFamily:"inherit" },
    changeBtn:      { padding:"10px 16px", background: dark ? T.tagBg : "#eff6ff", color:"#1d4896", border:`1.5px solid ${dark ? T.cardBorderL : "#bfdbfe"}`, borderRadius: "12px", fontSize:"13px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap", transition:"background 0.2s, border-color 0.2s" },
    emailSuccessMsg:{ fontSize:"13px", color:"#3f6a3e", background: dark ? "#1a2e1a" : "#f0fdf4", border:"1px solid #cfe4ce", borderRadius:"9px", padding:"9px 13px", marginBottom:"0.75rem" },
    modal:    { position:"fixed", inset:0, background:"rgba(29, 72, 150,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"1.25rem", backdropFilter:"blur(4px)" },
    modalBox: { background:T.card, borderRadius:"22px", padding:"2rem", width:"100%", maxWidth:"420px", display:"flex", flexDirection:"column", gap:"1rem", boxShadow:"0 32px 70px rgba(29, 72, 150,0.18)", animation:"modalPop 0.28s cubic-bezier(.34,1.56,.64,1) both" },
    modalTitle:   { fontSize:"17px", fontWeight:"700", color:T.text, margin:0 },
    modalSub:     { fontSize:"13px", color:T.sub, margin:0 },
    modalInput:   { width:"100%", boxSizing:"border-box", padding:"11px 14px", fontSize:"14px", border:`1.5px solid ${T.inputBorder}`, borderRadius:"12px", color:T.text, background:T.inputBg, fontFamily:"inherit" },
    modalActions: { display:"flex", gap:"8px", marginTop:"0.25rem" },
    confirmBtn:   { flex:1, padding:"11px", background:"#111827", color:"#fff", border:"none", borderRadius:"11px", fontSize:"14px", fontWeight:"700", cursor:"pointer" },
    cancelBtn:    { flex:1, padding:"11px", background:T.tagBg, color:T.sub, border:"none", borderRadius:"11px", fontSize:"14px", fontWeight:"600", cursor:"pointer", transition:"background 0.2s" },
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

  /* ── Posts grid (shared between owner + visitor "posts" tab) ── */
  const PostsGrid = () => (
    <div style={{ marginTop:"0.25rem" }}>
      {postsLoading && <p style={{ color: T.sub, fontSize: "14px" }}>…</p>}
      {!postsLoading && myPosts.length === 0 && (
        <div style={{
          textAlign: "center", padding: "2.5rem",
          background: T.inputBg, borderRadius: "16px",
          border: `1.5px dashed ${T.inputBorder}`, color: T.sub, fontSize: "14px",
        }}>
          {noPostsMessage}
        </div>
      )}
      {!postsLoading && myPosts.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"1.25rem" }}>
          {myPosts.map((post) => (
            <div key={post.id} className="profile-card" onClick={() => onNavigateToCommunity?.(post.id)}
              style={{
                background: T.card, borderRadius: "18px",
                border: `1.5px solid ${T.cardBorder}`, borderLeft: "4px solid #4472b8",
                boxShadow: "0 2px 8px rgba(29, 72, 150,0.05)",
                padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem",
                cursor: onNavigateToCommunity ? "pointer" : "default",
                transition: "box-shadow 0.18s, transform 0.18s",
              }}
              onMouseEnter={e => { if (onNavigateToCommunity) { e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,72,150,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(29,72,150,0.05)"; e.currentTarget.style.transform = "none"; }}
            >
              {post.text && (
                <p style={{
                  fontSize: "14px", color: T.text, margin: 0,
                  lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  display: "-webkit-box", WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {post.text}
                </p>
              )}
              {post.repostOf && (
                <span style={{
                  fontSize: "11px", color: T.sub,
                  background: T.tagBg, borderRadius: "6px",
                  padding: "3px 8px", display: "inline-block", alignSelf: "flex-start",
                }}>
                  ↺ {t.community.repostedBy} {post.repostOf.authorName ?? ""}
                </span>
              )}
              {(() => {
                const postMedia = getPostMedia(post);
                if (!postMedia.length) return null;
                return (
                  <div style={{ display:"grid", gridTemplateColumns: postMedia.length === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))", gap:6 }}>
                    {postMedia.slice(0, 4).map((media, i) => (
                      media.type === "image" ? (
                        <img key={i} src={media.url} alt=""
                          style={{ width:"100%", height:120, objectFit:"cover", borderRadius:"12px", cursor:"pointer" }}
                          onClick={() => window.open(media.url, "_blank")} />
                      ) : (
                        <video key={i} src={media.url} controls
                          style={{ width:"100%", height:120, borderRadius:"12px", objectFit:"cover" }} />
                      )
                    ))}
                    {postMedia.length > 4 && (
                      <div style={{ display:"grid", placeItems:"center", borderRadius:"12px", background:T.tagBg, color:T.sub, fontSize:"13px", fontWeight:700 }}>
                        +{postMedia.length - 4}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto" }}>
                <div style={{ display:"flex", gap:"12px" }}>
                  {(post.likes?.length ?? post.likesCount ?? 0) > 0 && (
                    <span style={{ fontSize:"12px", color:T.sub, display:"flex", alignItems:"center", gap:3 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {post.likes?.length ?? post.likesCount}
                    </span>
                  )}
                  {(post.commentsCount ?? 0) > 0 && (
                    <span style={{ fontSize:"12px", color:T.sub, display:"flex", alignItems:"center", gap:3 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {post.commentsCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:"11px", color:T.muted }}>{relativeTime(post.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Help Posts grid ── */
  const HelpPostsGrid = () => (
    <div style={{ marginTop:"0.25rem" }}>
      {helpPostsLoading && <p style={{ color: T.sub, fontSize: "14px" }}>…</p>}
      {!helpPostsLoading && myHelpPosts.length === 0 && (
        <div style={{ textAlign:"center", padding:"2.5rem", background:T.inputBg, borderRadius:"16px", border:`1.5px dashed ${T.inputBorder}`, color:T.sub, fontSize:"14px" }}>
          {lang==="he"?"אין פוסטים לעזרה עדיין":lang==="ar"?"لا توجد منشورات مساعدة بعد":"No help posts yet"}
        </div>
      )}
      {!helpPostsLoading && myHelpPosts.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"1.25rem" }}>
          {myHelpPosts.map((post) => (
            <div key={post.id} className="profile-card"
              style={{ background:T.card, borderRadius:"18px", border:`1.5px solid ${T.cardBorder}`, borderLeft:"4px solid #e8735a", boxShadow:"0 2px 8px rgba(232,115,90,0.08)", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}
            >
              {post.content && (
                <p style={{ fontSize:"14px", color:T.text, margin:0, lineHeight:"1.6", whiteSpace:"pre-wrap", wordBreak:"break-word", display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {post.content}
                </p>
              )}
              {post.attachmentType === "image" && post.attachmentUrl && (
                <img src={post.attachmentUrl} alt="" style={{ width:"100%", height:120, objectFit:"contain", borderRadius:"12px", background:"var(--bg-secondary)" }} onClick={() => window.open(post.attachmentUrl, "_blank")} />
              )}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto" }}>
                <div style={{ display:"flex", gap:"12px" }}>
                  {(post.commentCount ?? 0) > 0 && (
                    <span style={{ fontSize:"12px", color:T.sub, display:"flex", alignItems:"center", gap:3 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {post.commentCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:"11px", color:T.muted }}>{relativeTime(post.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={S.page}>

      {/* ── Cover photo: avatar + name live fully inside ── */}
      <div style={S.coverWrap}>
        {coverURL && <img src={coverURL} alt="cover" style={S.coverImg} />}
        <div style={S.coverOverlay} />
        {isOwner && (
          <>
            <input ref={coverFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleCoverUpload} />
            <button className="cover-edit-btn" style={S.coverEditBtn} onClick={() => coverFileRef.current.click()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {coverURL ? t.profile.editCover : t.profile.addCover}
            </button>
            {coverURL && (
              <button
                className="cover-edit-btn"
                style={{ ...S.coverEditBtn, top: 50, background: "rgba(220,38,38,0.65)" }}
                onClick={handleDeleteCover}
              >
                × {t.profile.removeCover || "Remove"}
              </button>
            )}
          </>
        )}

        {/* Avatar: inside cover, anchored to bottom */}
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
              <button className="avatar-edit-btn" style={S.avatarEditBtn} onClick={() => fileRef.current.click()} title={t.profile.uploadPhoto}>
                ✎
              </button>
            </>
          )}
        </div>

        {/* Name / profession / actions — on the cover photo at the bottom */}
        <div style={S.coverProfileRow}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
            <h2 style={{ ...S.profileName, margin:0 }}>
              {form.firstName || form.lastName
                ? `${form.firstName} ${form.lastName}`.trim()
                : (isOwner ? t.profile.myProfile : t.profile.memberProfile)}
            </h2>
            <div style={S.profileActions}>
              {form.linkedIn && (
                <a href={safeUrl(form.linkedIn)} target="_blank" rel="noreferrer" title="LinkedIn"
                  style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.18)", color:"#fff", textDecoration:"none", flexShrink:0, backdropFilter:"blur(4px)", border:"1px solid rgba(255,255,255,0.3)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.32)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
              )}
              {!isOwner && onMessage && (
                <button onClick={handleMessageClick} title={t.profile.message || "Message"}
                  style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.18)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", cursor:"pointer", flexShrink:0, padding:0, backdropFilter:"blur(4px)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.32)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
              )}
              {!isOwner && viewerCanManageUsers && (
                <button
                  title={t.profile?.adminEdit || "Admin: Edit"}
                  onClick={() => {
                    setAdminEditFields({
                      firstName:  form.firstName  || "",
                      lastName:   form.lastName   || "",
                      region:     form.region     || "",
                      profession: form.profession || "",
                      bio:        form.bio        || "",
                    });
                    setAdminEditOpen(true);
                  }}
                  style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.18)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", cursor:"pointer", flexShrink:0, padding:0, backdropFilter:"blur(4px)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.32)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
            </div>
          </div>
          {form.profession && <p style={S.profilePro}>{form.professionTranslations?.[lang] || translateProfession(form.profession, lang)}</p>}
        </div>

        {/* Actions: completeness circle + LinkedIn / Message */}
        <div style={S.profileActions}>
          {form.linkedIn && (
            <a href={safeUrl(form.linkedIn)}
              target="_blank" rel="noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 13px", borderRadius:99, background:"#1d4896", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", border:"none", whiteSpace:"nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "#0b1f52"}
              onMouseLeave={e => e.currentTarget.style.background = "#1d4896"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn
            </a>
          )}
          {!isOwner && onMessage && (
            <button onClick={handleMessageClick} style={{ padding:"10px 20px", borderRadius:99, background:T.tagBg, color:"#1d4896", border:`1px solid ${T.cardBorderL}`, fontSize:14, fontWeight:700, cursor:"pointer" }}>
              {t.profile.message || "Message"}
            </button>
          )}
          {!isOwner && form.contactEmail && (
            <a href={`mailto:${form.contactEmail}`}
              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 13px", borderRadius:99, background:"#4472b8", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1d4896"}
              onMouseLeave={e => e.currentTarget.style.background = "#4472b8"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
              {lang==="he"?"אימייל":lang==="ar"?"بريد":"Email"}
            </a>
          )}
          {!isOwner && viewerCanManageUsers && (
            <button
              onClick={() => {
                setAdminEditFields({
                  firstName:  form.firstName  || "",
                  lastName:   form.lastName   || "",
                  region:     form.region     || "",
                  profession: form.profession || "",
                  bio:        form.bio        || "",
                });
                setAdminEditOpen(true);
              }}
              style={{ padding:"10px 16px", borderRadius:99, background:"rgba(68,114,184,0.1)", color:"var(--brand,#4472b8)", border:"1.5px solid var(--brand,#4472b8)", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {t.profile?.adminEdit || "Admin: Edit"}
            </button>
          )}
        </div>
      </div>

      {/* ── Birthday decorations ── */}
      {isBirthdayToday(birthdayValue) && (
        <div style={{ padding: isMobile ? "0 1rem" : "0 2rem" }}>
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
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={S.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={currentTab === tab.id ? S.tabActive : S.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={S.body}>

        {/* OWNER: Profile tab — two-column on desktop */}
        {isOwner && currentTab === "profile" && (
          <div>
            {error && <div style={S.errorMsg}>{error}</div>}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderRadius:10, background:dark?"rgba(68,114,184,0.1)":"#eef4ff", border:`1px solid ${dark?"rgba(68,114,184,0.25)":"#c7d9f5"}`, marginBottom:"1rem", fontSize:12, color:"#4472b8", fontWeight:600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {lang==="he"?"אל תשכחי לשמור את השינויים על ידי לחיצה על כפתור השמירה":lang==="ar"?"لا تنسي حفظ التغييرات بالضغط على زر الحفظ":"Remember to save your changes by pressing the Save button."}
            </div>

            <div style={isMobile ? {} : { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", alignItems:"stretch" }}>

              {/* Left: Personal Info */}
              <div className="profile-card" style={{ ...S.card, marginBottom: isMobile ? "1rem" : 0, boxShadow:"none", borderLeft:`1.5px solid ${T.cardBorder}`, display:"flex", flexDirection:"column" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
                  <p style={{ fontSize:"11px", fontWeight:"700", color:T.text, textTransform:"uppercase", letterSpacing:"0.12em", margin:0 }}>
                    {t.profile.personalInfo}
                  </p>
                  {isOwner && pct < 100 && <CompletenessBadge pct={pct} />}
                </div>

                <div style={S.row}>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.firstName}</label>
                    <PlainInput name="firstName" value={form.firstName} onChange={handleChange} placeholder={t.profile.firstNamePlaceholder} />
                    {isOwner && <RequiredHint show={!form.firstName?.trim()} />}
                  </div>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.lastName}</label>
                    <PlainInput name="lastName" value={form.lastName} onChange={handleChange} placeholder={t.profile.lastNamePlaceholder} />
                    {isOwner && <RequiredHint show={!form.lastName?.trim()} />}
                  </div>
                </div>

                <div style={S.row}>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.phone}</label>
                    <PlainInput name="phone" value={form.phone} onChange={handleChange} placeholder={t.profile.phonePlaceholder} />
                    {isOwner && <RequiredHint show={!form.phone?.trim()} />}
                  </div>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.birthDate ?? "Birth Date"}</label>
                    <PlainInput type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
                    {isOwner && <RequiredHint show={!form.birthDate} />}
                  </div>
                </div>

                <div style={S.row}>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.professionJob}</label>
                    <ProfessionPicker
                      value={form.profession}
                      translations={form.professionTranslations}
                      placeholder={t.profile.professionPlaceholder}
                      onChange={(val, tr) => setForm(p => ({ ...p, profession: val, professionTranslations: tr }))}
                    />
                    {isOwner && <RequiredHint show={!form.profession?.trim()} />}
                  </div>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.region}</label>
                    <RegionPicker
                      value={form.region}
                      translations={form.regionTranslations}
                      placeholder="—"
                      onChange={(val, tr) => setForm(p => ({ ...p, region: val, regionTranslations: tr }))}
                    />
                    {isOwner && <RequiredHint show={!form.region} />}
                  </div>
                </div>

                <div style={S.row}>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.institution}<OptionalTag /></label>
                    <InstitutionPicker
                      value={form.institution}
                      translations={form.institutionTranslations}
                      placeholder={t.profile.institutionPlaceholder}
                      onChange={(val, tr) => setForm(p => ({ ...p, institution: val, institutionTranslations: tr }))}
                    />
                  </div>
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.graduationYear}<OptionalTag /></label>
                    <PlainInput name="graduationYear" value={form.graduationYear} onChange={handleChange}
                      placeholder={t.profile.graduationYearPlaceholder} />
                  </div>
                </div>

                <div style={{ ...S.group, flex:1, display:"flex", flexDirection:"column" }}>
                  <label style={S.label}>{t.profile.bio}</label>
                  {isOwner && <RequiredHint show={!form.bio?.trim()} />}
                  <div style={{ ...S.bioWrap, flex:1, display:"flex", flexDirection:"column" }}>
                    <textarea
                      className="profile-textarea"
                      style={{ ...S.textarea, flex:1, minHeight:"110px", resize:"none" }}
                      name="bio"
                      value={form.bio}
                      onChange={(e) => { if (e.target.value.length <= BIO_LIMIT) handleChange(e); }}
                      placeholder={t.profile.bioPlaceholder}
                    />
                    <span style={{ ...S.charCount, color: form.bio.length > BIO_LIMIT * 0.9 ? "#d4a574" : "#d9c8ce" }}>
                      {form.bio.length}/{BIO_LIMIT}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Additional Details */}
              <div className="profile-card" style={{ ...S.card, marginBottom: isMobile ? "1rem" : 0, boxShadow:"none", borderLeft:`1.5px solid ${T.cardBorder}`, display:"flex", flexDirection:"column" }}>
                <div style={S.row}>
                  <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                    <label style={S.label}>{t.profile.experience}<OptionalTag /></label>
                    <textarea className="profile-textarea" style={{ ...S.textarea, minHeight:"80px" }}
                      name="experience" value={form.experience} onChange={handleChange}
                      placeholder={t.profile.experiencePlaceholder} />
                  </div>
                  <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                    <label style={S.label}>{t.profile.goals}<OptionalTag /></label>
                    <textarea className="profile-textarea" style={{ ...S.textarea, minHeight:"80px" }}
                      name="goals" value={form.goals} onChange={handleChange}
                      placeholder={t.profile.goalsPlaceholder} />
                  </div>
                </div>

                {/* Ethnicity + Religion side by side */}
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem", alignItems:"end" }}>
                  <div style={S.group}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"0.4rem", minHeight:"32px" }}>
                      <label style={S.label}>{t.profile.ethnicity}<OptionalTag /></label>
                      <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.sub, cursor:"pointer", userSelect:"none", flexShrink:0, marginInlineStart:6 }}>
                        <input
                          type="checkbox"
                          checked={!!form.ethnicityPrivate}
                          onChange={e => setForm(p => ({ ...p, ethnicityPrivate: e.target.checked }))}
                          style={{ cursor:"pointer" }}
                        />
                        {t.profile.ethnicityPrivateToggle}
                      </label>
                    </div>
                    <SelectInput value={translateEthnicity(form.ethnicity, lang) || form.ethnicity} placeholder="—" options={t.profile.ethnicityOptions}
                      onChange={e => handleChange({ target:{ name:"ethnicity", value:e.target.value } })} />
                  </div>
                  <div style={S.group}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"0.4rem", minHeight:"32px" }}>
                      <label style={S.label}>{t.profile.religion}<OptionalTag /></label>
                      <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.sub, cursor:"pointer", userSelect:"none", flexShrink:0, marginInlineStart:6 }}>
                        <input
                          type="checkbox"
                          checked={!!form.religionPrivate}
                          onChange={e => setForm(p => ({ ...p, religionPrivate: e.target.checked }))}
                          style={{ cursor:"pointer" }}
                        />
                        {t.profile.religionPrivateToggle}
                      </label>
                    </div>
                    <SelectInput value={translateReligion(form.religion, lang) || form.religion} placeholder="—" options={t.profile.religionOptions}
                      onChange={e => handleChange({ target:{ name:"religion", value:e.target.value } })} />
                  </div>
                </div>

                {/* Help Areas */}
                <div style={{ ...S.group, marginBottom:"0.75rem", flex:1 }}>
                  <label style={S.label}>{t.profile.helpAreas}</label>
                  <MultiSelectDropdown
                    selectedValues={form.helpAreas || []}
                    options={t.profile.helpAreaOptions || []}
                    onChange={vals => setForm(p => ({ ...p, helpAreas: vals }))}
                    disabled={isReadOnly}
                    placeholder="—"
                  />
                  {isOwner && <RequiredHint show={!(form.helpAreas?.length > 0)} />}
                </div>

                {/* Save button anchored to bottom of right card */}
                <div style={{ borderTop:`1px solid ${T.cardBorder}`, paddingTop:"1rem", marginTop:"auto" }}>
                  <button
                    style={{ ...getSaveBtnStyle("profile"), width:"100%", justifyContent:"center" }}
                    className={savingKey === "profile" ? "save-btn-shimmer" : ""}
                    onClick={() => handleSaveSection("profile", {
                      firstName:form.firstName, lastName:form.lastName, phone:form.phone,
                      profession:form.profession, professionTranslations:form.professionTranslations ?? null, birthDate:form.birthDate, bio:form.bio,
                      region:form.region, regionTranslations:form.regionTranslations ?? null, institution:form.institution, institutionTranslations:form.institutionTranslations ?? null, graduationYear:form.graduationYear,
                      experience:form.experience, goals:form.goals,
                      ethnicity:form.ethnicity, ethnicityPrivate:form.ethnicityPrivate,
                      religion:form.religion,   religionPrivate:form.religionPrivate,
                      helpAreas: form.helpAreas || [],
                    })}
                    disabled={!!savingKey}
                    onMouseOver={(e) => { if (!savingKey) e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {saveBtnLabel("profile")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OWNER: Account tab */}
        {isOwner && currentTab === "account" && (
          <div className="profile-card" style={{ ...S.card, borderLeftColor:"#a78bfa" }}>
            <SectionTitle label={lang==="he"?"קישורים חברתיים":lang==="ar"?"روابط التواصل الاجتماعي":"Social Links"} />
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderRadius:10, background:dark?"rgba(68,114,184,0.1)":"#eef4ff", border:`1px solid ${dark?"rgba(68,114,184,0.25)":"#c7d9f5"}`, marginBottom:"1rem", fontSize:12, color:"#4472b8", fontWeight:600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {lang==="he"?"אל תשכחי לשמור את השינויים על ידי לחיצה על כפתור השמירה":lang==="ar"?"لا تنسي حفظ التغييرات بالضغط على زر الحفظ":"Remember to save your changes by pressing the Save button."}
            </div>
            {emailSuccess && <div style={S.emailSuccessMsg}>{emailSuccess}</div>}
            {passwordSuccess && <div style={S.emailSuccessMsg}>{passwordSuccess}</div>}
            <div style={S.emailRow}>
              <div style={{ ...S.group, flex:1, marginBottom:0 }}>
                <label style={S.label}>{t.profile.currentEmail}</label>
                <input style={S.inputDisabled} value={profileEmail || user?.email || ""} disabled />
              </div>
              <button className="change-btn" style={S.changeBtn} onClick={() => setShowEmailModal(true)}>
                {t.profile.change}
              </button>
              <button className="change-btn" style={S.changeBtn} onClick={handleResetPassword}>
                {t.profile.resetPassword}
              </button>
            </div>
            {/* Social links + contact email */}
            <div style={{ borderTop:`1px solid ${T.cardBorder}`, marginTop:"1.25rem", paddingTop:"1.25rem" }}>
              <p style={{ fontSize:"11px", fontWeight:"700", color:T.sub, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 0.9rem" }}>
                {lang==="he"?"קישורים חברתיים":lang==="ar"?"الروابط الاجتماعية":"Social Links"}
              </p>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div style={S.group}>
                  <label style={S.label}>{t.profile.linkedIn}<OptionalTag /></label>
                  <PlainInput name="linkedIn" value={form.linkedIn} onChange={handleChange} placeholder={t.profile.linkedInPlaceholder} />
                </div>
                <div style={S.group}>
                  <label style={S.label}>{t.profile?.facebook || "Facebook"}<OptionalTag /></label>
                  <PlainInput name="facebookURL" value={form.facebookURL || ""} onChange={handleChange} placeholder="https://facebook.com/..." />
                </div>
                <div style={S.group}>
                  <label style={S.label}>Instagram<OptionalTag /></label>
                  <PlainInput name="instagram" value={form.instagram || ""} onChange={handleChange} placeholder="https://instagram.com/..." />
                </div>
                <div style={S.group}>
                  <label style={S.label}>Discord<OptionalTag /></label>
                  <PlainInput name="discord" value={form.discord || ""} onChange={handleChange} placeholder={lang==="he"?"שם משתמש ב-Discord":lang==="ar"?"اسم المستخدم في Discord":"Discord username"} />
                </div>
              </div>
              <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                <label style={S.label}>{t.profile?.contactEmail || "Contact Email"}<span style={{ color:"#e8735a", marginInlineStart:3 }}>*</span></label>
                <input
                  className="profile-input"
                  name="contactEmail" value={form.contactEmail || ""}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  type="email"
                  style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", fontSize:"14px", border:`1.5px solid ${!form.contactEmail?.trim() ? "#e8735a" : T.inputBorder}`, borderRadius:"13px", color:T.text, background:T.inputBg, fontFamily:"inherit", transition:"border-color 0.2s" }}
                />
                {!form.contactEmail?.trim() && <p style={{ margin:"4px 0 0", fontSize:11, color:"#e8735a" }}>{lang==="he"?"שדה חובה":lang==="ar"?"حقل مطلوب":"Required"}</p>}
              </div>
              <button
                style={{ ...getSaveBtnStyle("account"), marginBottom:"1rem" }}
                className={savingKey === "account" ? "save-btn-shimmer" : ""}
                onClick={() => handleSaveSection("account", {
                  linkedIn: safeUrl(form.linkedIn),
                  facebookURL: safeUrl(form.facebookURL),
                  contactEmail: form.contactEmail || "",
                  instagram: safeUrl(form.instagram),
                  discord: form.discord || "",
                })}
                disabled={!!savingKey}
              >
                {saveBtnLabel("account")}
              </button>
            </div>

            <div style={{ borderTop:`1px solid ${T.cardBorder}`, paddingTop:"1.25rem" }}>
              <button
                onClick={logout}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"10px 22px", borderRadius:99,
                  background: dark ? "#3b1f1f" : "#fff0f0", color:"#c25c5c",
                  border:"1.5px solid #e8b8b8",
                  fontSize:14, fontWeight:700, cursor:"pointer",
                  transition:"all 0.15s", fontFamily:"var(--font)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#c25c5c"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? "#3b1f1f" : "#fff0f0"; e.currentTarget.style.color = "#c25c5c"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {t.nav?.logout || "Logout"}
              </button>
            </div>
          </div>
        )}

        {/* Posts tab (owner + visitor) */}
        {currentTab === "posts" && <PostsGrid />}

        {/* Help Posts tab (owner only) */}
        {isOwner && currentTab === "helpPosts" && <HelpPostsGrid />}

        {/* VISITOR: Personal Info tab (read-only, mirrors owner's profile tab) */}
        {!isOwner && currentTab === "about" && (
          <div style={isMobile ? {} : { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", alignItems:"stretch" }}>

            {/* Left: Personal Info */}
            <div className="profile-card" style={{ ...S.card, marginBottom: isMobile ? "1rem" : 0, boxShadow:"none", borderLeft:`1.5px solid ${T.cardBorder}`, display:"flex", flexDirection:"column" }}>
              <p style={{ fontSize:"11px", fontWeight:"700", color:T.text, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 1rem" }}>
                {t.profile.personalInfo}
              </p>

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
                  <p style={S.label}>{t.profile.phone}</p>
                  <div style={S.inputDisabled}>{form.phone || "—"}</div>
                </div>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.birthDate ?? "Birth Date"}</p>
                  <div style={S.inputDisabled}>{form.birthDate || "—"}</div>
                </div>
              </div>

              <div style={S.row}>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.professionJob}</p>
                  <div style={S.inputDisabled}>{form.professionTranslations?.[lang] || translateProfession(form.profession, lang) || "—"}</div>
                </div>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.region}</p>
                  <div style={S.inputDisabled}>{form.regionTranslations?.[lang] || translateRegion(form.region, lang) || form.region || "—"}</div>
                </div>
              </div>

              <div style={S.row}>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.institution}</p>
                  <div style={S.inputDisabled}>
                    {form.institutionTranslations?.[lang] || translateInstitution(form.institution, lang) || form.institution || "—"}
                  </div>
                </div>
                <div style={S.group}>
                  <p style={S.label}>{t.profile.graduationYear}</p>
                  <div style={S.inputDisabled}>{form.graduationYear || "—"}</div>
                </div>
              </div>

              {form.linkedIn && (
                <div style={{ ...S.group, marginBottom:"1rem" }}>
                  <p style={S.label}>{t.profile.linkedIn}</p>
                  <a href={safeUrl(form.linkedIn)}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:"13px", color:"#1d4896", textDecoration:"none", fontWeight:600 }}>
                    {form.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")}
                  </a>
                </div>
              )}
              {form.facebookURL && (
                <div style={{ ...S.group, marginBottom:"1rem" }}>
                  <p style={S.label}>{t.profile?.facebook || "Facebook"}</p>
                  <a href={safeUrl(form.facebookURL)} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:"var(--brand)", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    Facebook
                  </a>
                </div>
              )}
              {form.instagram && (
                <div style={{ ...S.group, marginBottom:"1rem" }}>
                  <p style={S.label}>Instagram</p>
                  <a href={safeUrl(form.instagram)} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:"#e1306c", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    Instagram
                  </a>
                </div>
              )}
              {form.discord && (
                <div style={{ ...S.group, marginBottom:"1rem" }}>
                  <p style={S.label}>Discord</p>
                  <span style={{ fontSize:13, color:"#5865F2", fontWeight:600 }}>
                    {form.discord}
                  </span>
                </div>
              )}
              {form.contactEmail && (
                <div style={{ ...S.group, marginBottom:"1rem" }}>
                  <p style={S.label}>{t.profile?.contactEmail || "Contact Email"}</p>
                  <a href={`mailto:${form.contactEmail}`} style={{ fontSize:13, color:"var(--brand)", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                    {form.contactEmail}
                  </a>
                </div>
              )}

              <div style={{ ...S.group, marginBottom:"1rem" }}>
                <p style={S.label}>{t.profile.bio}</p>
                <div style={{ ...S.inputDisabled, flex:1, minHeight:"110px", whiteSpace:"pre-wrap", lineHeight:1.7 }}>
                  {form.bio || "—"}
                </div>
              </div>
            </div>

            {/* Right: Additional Details */}
            <div className="profile-card" style={{ ...S.card, marginBottom: isMobile ? "1rem" : 0, boxShadow:"none", borderLeft:`1.5px solid ${T.cardBorder}`, display:"flex", flexDirection:"column" }}>
              <div style={S.row}>
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>{t.profile.experience}</p>
                  <div style={{ ...S.inputDisabled, minHeight:"80px", whiteSpace:"pre-wrap", lineHeight:1.7 }}>
                    {form.experience || "—"}
                  </div>
                </div>
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>{t.profile.goals}</p>
                  <div style={{ ...S.inputDisabled, minHeight:"80px", whiteSpace:"pre-wrap", lineHeight:1.7 }}>
                    {form.goals || "—"}
                  </div>
                </div>
              </div>

              {(!form.ethnicityPrivate || authProfile?.isAdmin) && form.ethnicity && (
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>
                    {t.profile.ethnicity}
                    {form.ethnicityPrivate && authProfile?.isAdmin && (
                      <span style={{ fontSize:10, color:"var(--text-muted)", marginInlineStart:6, fontWeight:500 }}>
                        (private — visible to admins only)
                      </span>
                    )}
                  </p>
                  <div style={S.inputDisabled}>{translateEthnicity(form.ethnicity, lang) || form.ethnicity}</div>
                </div>
              )}
              {(!form.religionPrivate || authProfile?.isAdmin) && form.religion && (
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>
                    {t.profile.religion}
                    {form.religionPrivate && authProfile?.isAdmin && (
                      <span style={{ fontSize:10, color:"var(--text-muted)", marginInlineStart:6, fontWeight:500 }}>
                        (private — visible to admins only)
                      </span>
                    )}
                  </p>
                  <div style={S.inputDisabled}>{translateReligion(form.religion, lang) || form.religion}</div>
                </div>
              )}
              {form.helpAreas?.length > 0 && (
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>{t.profile.helpAreas}</p>
                  <div style={S.inputDisabled}>{form.helpAreas.join(", ")}</div>
                </div>
              )}

              {/* Social / contact links */}
              {form.linkedIn && (
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>{t.profile.linkedIn}</p>
                  <a href={safeUrl(form.linkedIn)} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:"13px", color:"#1d4896", textDecoration:"none", fontWeight:600 }}>
                    {form.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")}
                  </a>
                </div>
              )}
              {form.facebookURL && (
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>{t.profile?.facebook || "Facebook"}</p>
                  <a href={safeUrl(form.facebookURL)} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:13, color:"var(--brand)", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    Facebook
                  </a>
                </div>
              )}
              {form.contactEmail && (
                <div style={{ ...S.group, marginBottom:"0.75rem" }}>
                  <p style={S.label}>{t.profile?.contactEmail || "Contact Email"}</p>
                  <a href={`mailto:${form.contactEmail}`}
                    style={{ fontSize:13, color:"var(--brand)", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                    {form.contactEmail}
                  </a>
                </div>
              )}
            </div>

          </div>
        )}

      </div>


      {/* ── Email Change Modal ── */}
      {showEmailModal && isOwner && (
        <div style={S.modal} onClick={closeEmailModal}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>{t.profile.changeEmail}</p>
            {emailError && <div style={S.errorMsg}>{emailError}</div>}

            {/* Step 1: verify identity */}
            {emailStep === "verify" && (
              <>
                <p style={S.modalSub}>
                  {isGoogleUser
                    ? "First, confirm it's you by signing in with Google."
                    : "First, enter your current password to confirm it's you."}
                </p>
                {!isGoogleUser && (
                  <div style={S.group}>
                    <label style={S.label}>{t.profile.currentPassword}</label>
                    <input className="profile-input" style={S.modalInput} type="password" placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()} />
                  </div>
                )}
                <div style={S.modalActions}>
                  <button className="cancel-btn" style={S.cancelBtn} onClick={closeEmailModal}>{t.profile.cancel}</button>
                  <button style={S.confirmBtn} onClick={handleVerifyIdentity}>
                    {isGoogleUser ? "Verify with Google" : "Verify"}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: enter new email */}
            {emailStep === "change" && (
              <>
                <p style={S.modalSub}>{t.profile.emailModalNewSub}</p>
                <div style={S.group}>
                  <label style={S.label}>{t.profile.newEmail}</label>
                  <input className="profile-input" style={S.modalInput} type="email" placeholder="new@email.com"
                    value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailChange()} />
                </div>
                <div style={S.modalActions}>
                  <button className="cancel-btn" style={S.cancelBtn} onClick={closeEmailModal}>{t.profile.cancel}</button>
                  <button style={S.confirmBtn} onClick={handleEmailChange}>Send Code</button>
                </div>
              </>
            )}

            {/* Step 3: enter OTP sent to new email */}
            {emailStep === "otp" && (
              <>
                <p style={S.modalSub}>
                  We sent a 6-digit code to <strong>{newEmail}</strong>. Enter it below.
                </p>
                <div style={S.group}>
                  <label style={S.label}>Verification Code</label>
                  <input className="profile-input" style={{ ...S.modalInput, letterSpacing: "0.25em", textAlign: "center", fontSize: 20 }}
                    type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                    value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyEmailOtp()} />
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px", textAlign: "center" }}>
                  {emailOtpCountdown > 0
                    ? `Resend in ${emailOtpCountdown}s`
                    : <button onClick={handleResendEmailOtp} style={{ background: "none", border: "none", color: "#4a7ae8", cursor: "pointer", fontSize: 12, padding: 0 }}>Resend code</button>
                  }
                </p>
                <div style={S.modalActions}>
                  <button className="cancel-btn" style={S.cancelBtn} onClick={closeEmailModal}>{t.profile.cancel}</button>
                  <button style={S.confirmBtn} onClick={handleVerifyEmailOtp} disabled={emailOtp.length < 6}>{t.profile.confirm}</button>
                </div>
              </>
            )}

            {/* Done */}
            {emailStep === "done" && (
              <>
                <div style={S.emailSuccessMsg}>{emailSuccess}</div>
                <div style={{ ...S.modalActions, justifyContent: "center" }}>
                  <button style={S.confirmBtn} onClick={closeEmailModal}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Cover Crop Modal ── */}
      {coverCropOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:"#111827", borderRadius:22, width:"100%", maxWidth:660, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.5)", animation:"modalPop 0.28s cubic-bezier(.34,1.56,.64,1) both" }}>

            {/* Header */}
            <div style={{ padding:"1.1rem 1.5rem 0.75rem", borderBottom:"1px solid #1f2937", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:"#f9fafb", fontSize:15, fontWeight:700 }}>
                {coverURL ? "Edit Cover Photo" : "Add Cover Photo"}
              </span>
              <button
                onClick={() => { setCoverCropOpen(false); URL.revokeObjectURL(coverRawSrc); setCoverRawSrc(null); }}
                style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20, lineHeight:1, padding:"2px 6px" }}
              >
                ×
              </button>
            </div>

            {/* Crop area */}
            <div style={{ position:"relative", height:260, background:"#000" }}>
              <Cropper
                image={coverRawSrc}
                crop={coverCrop}
                zoom={coverZoom}
                rotation={coverRotation}
                aspect={3}
                onCropChange={setCoverCrop}
                onZoomChange={setCoverZoom}
                onRotationChange={setCoverRotation}
                onCropComplete={onCoverCropComplete}
                showGrid={true}
              />
            </div>

            {/* Controls */}
            <div style={{ padding:"1.1rem 1.5rem 1.5rem", display:"flex", flexDirection:"column", gap:"0.85rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ color:"#9ca3af", fontSize:12, fontWeight:600, width:52 }}>Zoom</span>
                <input className="crop-slider" type="range" min={1} max={3} step={0.01}
                  value={coverZoom} onChange={e => setCoverZoom(Number(e.target.value))}
                  style={{ flex:1 }} />
                <span style={{ color:"#6b7280", fontSize:11, minWidth:32, textAlign:"right" }}>
                  {Math.round(coverZoom * 100)}%
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ color:"#9ca3af", fontSize:12, fontWeight:600, width:52 }}>Rotate</span>
                <input className="crop-slider" type="range" min={-180} max={180} step={1}
                  value={coverRotation} onChange={e => setCoverRotation(Number(e.target.value))}
                  style={{ flex:1 }} />
                <span style={{ color:"#6b7280", fontSize:11, minWidth:32, textAlign:"right" }}>
                  {coverRotation}°
                </span>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:"0.25rem" }}>
                <button
                  onClick={() => { setCoverCropOpen(false); URL.revokeObjectURL(coverRawSrc); setCoverRawSrc(null); }}
                  style={{ flex:1, padding:"11px", background:"#374151", color:"#d1d5db", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCoverCropConfirm}
                  disabled={uploadingCover || !coverCroppedPixels}
                  style={{ flex:2, padding:"11px", background:uploadingCover ? "#1d3a6e" : "#4472b8", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor: uploadingCover ? "not-allowed" : "pointer", opacity: (!coverCroppedPixels && !uploadingCover) ? 0.5 : 1, transition:"background 0.2s" }}
                >
                  {uploadingCover ? "Uploading…" : "Apply & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Avatar Crop Modal ── */}
      {avatarCropOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:"#111827", borderRadius:22, width:"100%", maxWidth:500, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.5)", animation:"modalPop 0.28s cubic-bezier(.34,1.56,.64,1) both" }}>
            <div style={{ padding:"1.1rem 1.5rem 0.75rem", borderBottom:"1px solid #1f2937", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:"#f9fafb", fontSize:15, fontWeight:700 }}>Edit Profile Photo</span>
              <button onClick={() => { setAvatarCropOpen(false); URL.revokeObjectURL(avatarRawSrc); setAvatarRawSrc(null); }} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20, lineHeight:1, padding:"2px 6px" }}>×</button>
            </div>
            <div style={{ position:"relative", height:320, background:"#000" }}>
              <Cropper
                image={avatarRawSrc}
                crop={avatarCrop}
                zoom={avatarZoom}
                rotation={avatarRotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setAvatarCrop}
                onZoomChange={setAvatarZoom}
                onRotationChange={setAvatarRotation}
                onCropComplete={onAvatarCropComplete}
              />
            </div>
            <div style={{ padding:"1.1rem 1.5rem 1.5rem", display:"flex", flexDirection:"column", gap:"0.85rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ color:"#9ca3af", fontSize:12, fontWeight:600, width:52 }}>Zoom</span>
                <input className="crop-slider" type="range" min={1} max={3} step={0.01} value={avatarZoom} onChange={e => setAvatarZoom(Number(e.target.value))} style={{ flex:1 }} />
                <span style={{ color:"#6b7280", fontSize:11, minWidth:32, textAlign:"right" }}>{Math.round(avatarZoom * 100)}%</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ color:"#9ca3af", fontSize:12, fontWeight:600, width:52 }}>Rotate</span>
                <input className="crop-slider" type="range" min={-180} max={180} step={1} value={avatarRotation} onChange={e => setAvatarRotation(Number(e.target.value))} style={{ flex:1 }} />
                <span style={{ color:"#6b7280", fontSize:11, minWidth:32, textAlign:"right" }}>{avatarRotation}°</span>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:"0.25rem" }}>
                <button onClick={() => { setAvatarCropOpen(false); URL.revokeObjectURL(avatarRawSrc); setAvatarRawSrc(null); }} style={{ flex:1, padding:"11px", background:"#374151", color:"#d1d5db", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancel</button>
                <button onClick={handleAvatarCropConfirm} disabled={uploadingAvatar || !avatarCroppedPixels}
                  style={{ flex:2, padding:"11px", background:uploadingAvatar ? "#1d3a6e" : "#4472b8", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor:uploadingAvatar ? "not-allowed" : "pointer", opacity:(!avatarCroppedPixels && !uploadingAvatar) ? 0.5 : 1, transition:"background 0.2s" }}>
                  {uploadingAvatar ? "Uploading…" : "Apply & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Edit Modal ── */}
      {adminEditOpen && viewerCanManageUsers && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={() => setAdminEditOpen(false)}>
          <div style={{ background:"var(--bg-primary)", borderRadius:20, padding:"1.75rem", width:"100%", maxWidth:480, boxShadow:"0 24px 60px rgba(0,0,0,0.22)", animation:"modalPop 0.25s ease both" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
              <div>
                <p style={{ fontSize:17, fontWeight:800, color:"var(--text-primary)", margin:0 }}>
                  {t.profile?.adminEdit || "Admin: Edit Profile"}
                </p>
                <p style={{ fontSize:12, color:"var(--text-muted)", margin:"3px 0 0" }}>
                  {form.firstName} {form.lastName}
                </p>
              </div>
              <button onClick={() => setAdminEditOpen(false)}
                style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"var(--text-muted)", lineHeight:1, padding:"2px 6px" }}>×</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
              {[
                { key:"firstName", label: t.profile?.firstName || "First Name" },
                { key:"lastName",  label: t.profile?.lastName  || "Last Name"  },
                { key:"region",    label: t.profile?.region    || "Region"     },
                { key:"profession",label: t.profile?.profession|| "Profession" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 4px" }}>{label}</p>
                  <input
                    value={adminEditFields[key] || ""}
                    onChange={e => setAdminEditFields(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width:"100%", padding:"9px 12px", fontSize:13, border:"1.5px solid var(--border)", borderRadius:10, background:"var(--bg-secondary)", color:"var(--text-primary)", boxSizing:"border-box", fontFamily:"var(--font)" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom:"1rem" }}>
              <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 4px" }}>{t.profile?.bio || "Bio"}</p>
              <textarea
                value={adminEditFields.bio || ""}
                onChange={e => setAdminEditFields(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                style={{ width:"100%", padding:"9px 12px", fontSize:13, border:"1.5px solid var(--border)", borderRadius:10, background:"var(--bg-secondary)", color:"var(--text-primary)", boxSizing:"border-box", fontFamily:"var(--font)", resize:"vertical" }}
              />
            </div>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={() => setAdminEditOpen(false)}
                style={{ flex:1, padding:"11px", background:"var(--bg-tertiary)", color:"var(--text-secondary)", border:"none", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                {t.profile?.cancel || "Cancel"}
              </button>
              <button
                disabled={adminEditSaving}
                onClick={async () => {
                  setAdminEditSaving(true);
                  try {
                    await updateDoc(doc(db, "users", viewUserId), adminEditFields);
                    setForm(prev => ({ ...prev, ...adminEditFields }));
                    setAdminEditOpen(false);
                  } catch (e) { console.error(e); }
                  finally { setAdminEditSaving(false); }
                }}
                style={{ flex:2, padding:"11px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:12, fontSize:13, fontWeight:700, cursor: adminEditSaving ? "not-allowed" : "pointer", opacity: adminEditSaving ? 0.7 : 1 }}>
                {adminEditSaving ? (t.profile?.saving || "Saving…") : (t.profile?.saveChanges || "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
