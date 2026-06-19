import { useState } from "react";

const STEPS = [
  {
    icon: "🔍",
    titleKey: "tutorial.step1Title",
    textKey: "tutorial.step1Text",
    defaultTitle: "Find Help",
    defaultText: "Use the 'Find Help' button to search for members who can support you — by profession, region, or skill.",
  },
  {
    icon: "👤",
    titleKey: "tutorial.step2Title",
    textKey: "tutorial.step2Text",
    defaultTitle: "Complete Your Profile",
    defaultText: "A complete profile helps other members find and connect with you. Add your profession, help areas, and a short bio.",
  },
  {
    icon: "💬",
    titleKey: "tutorial.step3Title",
    textKey: "tutorial.step3Text",
    defaultTitle: "Join the Community",
    defaultText: "Share updates, ask questions, and celebrate each other in the community feed. You're not alone here.",
  },
];

export function TutorialPopup({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(15,25,50,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
      animation: "tutOverlayIn 0.25s ease both",
    }}>
      <style>{`
        @keyframes tutOverlayIn { from { opacity:0 } to { opacity:1 } }
        @keyframes tutCardIn { from { opacity:0; transform:translateY(28px) scale(0.95) } to { opacity:1; transform:none } }
      `}</style>
      <div style={{
        background: "var(--bg-primary,#fff)",
        borderRadius: 22,
        padding: "2rem 2rem 1.5rem",
        maxWidth: 380,
        width: "100%",
        boxShadow: "0 24px 64px rgba(15,25,50,0.22)",
        animation: "tutCardIn 0.3s ease both",
        position: "relative",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position:"absolute", top:14, right:14,
          background:"none", border:"none", cursor:"pointer",
          fontSize:20, color:"var(--text-muted,#6b7280)", lineHeight:1,
          width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
          borderRadius:"50%",
        }}>×</button>

        {/* Icon */}
        <div style={{
          width:64, height:64, borderRadius:"50%",
          background:"linear-gradient(135deg,rgba(68,114,184,0.12),rgba(232,115,90,0.12))",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, margin:"0 auto 1.25rem",
        }}>{current.icon}</div>

        {/* Step counter */}
        <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textAlign:"center", marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>
          {step + 1} / {STEPS.length}
        </p>

        {/* Title */}
        <h2 style={{ fontSize:20, fontWeight:800, color:"var(--text-primary,#111827)", textAlign:"center", margin:"0 0 0.65rem", fontFamily:"'Outfit',sans-serif" }}>
          {current.defaultTitle}
        </h2>

        {/* Body */}
        <p style={{ fontSize:14, color:"var(--text-secondary,#4b5563)", textAlign:"center", lineHeight:1.7, margin:"0 0 1.75rem" }}>
          {current.defaultText}
        </p>

        {/* Dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:"1.25rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 20 : 7, height:7, borderRadius:99,
              background: i === step ? "var(--brand,#4472b8)" : "var(--border,#e5e7eb)",
              cursor:"pointer", transition:"all 0.3s ease",
            }}/>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex:1, padding:"11px 0", borderRadius:12,
              border:"1.5px solid var(--border,#e5e7eb)",
              background:"none", color:"var(--text-secondary,#374151)",
              fontSize:14, fontWeight:600, cursor:"pointer",
            }}>Back</button>
          )}
          <button onClick={isLast ? onClose : () => setStep(s => s + 1)} style={{
            flex:2, padding:"11px 0", borderRadius:12,
            background:"linear-gradient(135deg,#4472b8,#1d4896)",
            color:"#fff", border:"none",
            fontSize:14, fontWeight:700, cursor:"pointer",
            boxShadow:"0 4px 14px rgba(68,114,184,0.3)",
          }}>
            {isLast ? "Let's go! 🚀" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
