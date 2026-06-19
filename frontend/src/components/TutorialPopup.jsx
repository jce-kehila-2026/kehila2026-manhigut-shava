import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    targetId: "tut-members",
    icon: "🔍",
    title: "Find Help",
    text: "Tap here to search members who can help you — by profession, region, or skill.",
    side: "bottom",
  },
  {
    targetId: "tut-community",
    icon: "💬",
    title: "Community",
    text: "Share updates, celebrate birthdays and connect with the whole network here.",
    side: "bottom",
  },
  {
    targetId: "tut-profile",
    icon: "👤",
    title: "Your Profile",
    text: "Complete your profile so others can find and connect with you easily.",
    side: "bottom",
  },
];

export function TutorialPopup({ onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect]   = useState(null);
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    function measure() {
      const el = document.getElementById(STEPS[step].targetId);
      if (el) setRect(el.getBoundingClientRect());
      else    setRect(null);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  const PAD = 14;
  const sp = rect ? {
    left:   rect.left   - PAD,
    top:    rect.top    - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  const tooltipLeft = sp ? sp.left + sp.width / 2 : "50%";
  const tooltipTop  = sp ? sp.top + sp.height + 16 : "60%";
  // flip to above if tooltip would go off bottom
  const flipAbove = sp && (sp.top + sp.height + 220 > window.innerHeight);
  const finalTop  = flipAbove && sp ? sp.top - 180 : tooltipTop;

  const cur = STEPS[step];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onClick={onClose}>
      <style>{`
        @keyframes tut-pulse {
          0%,100% { box-shadow: 0 0 0 9999px rgba(15,25,50,0.68), 0 0 0 3px rgba(68,114,184,0.7); }
          50%      { box-shadow: 0 0 0 9999px rgba(15,25,50,0.68), 0 0 0 6px rgba(68,114,184,0.4); }
        }
        @keyframes tut-tip-in { from { opacity:0; transform:translateX(-50%) translateY(10px) scale(0.95); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
      `}</style>

      {/* Spotlight cutout — if target found */}
      {sp && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            left: sp.left, top: sp.top,
            width: sp.width, height: sp.height,
            borderRadius: 16,
            animation: "tut-pulse 2s ease-in-out infinite",
            transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
            pointerEvents: "none",
            zIndex: 99998,
          }}
        />
      )}

      {/* No target found fallback — dark overlay */}
      {!sp && <div style={{ position: "fixed", inset: 0, background: "rgba(15,25,50,0.72)", pointerEvents: "none" }} />}

      {/* Tooltip */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed",
          left: tooltipLeft,
          top: finalTop,
          transform: "translateX(-50%)",
          background: "var(--bg-primary,#fff)",
          borderRadius: 16,
          padding: "1.1rem 1.25rem 1rem",
          width: 240,
          boxShadow: "0 12px 40px rgba(15,25,50,0.28), 0 0 0 1.5px rgba(68,114,184,0.15)",
          zIndex: 99999,
          animation: "tut-tip-in 0.28s ease both",
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 8, right: 10,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 18, color: "var(--text-muted,#9ca3af)", lineHeight: 1,
        }}>×</button>

        {/* Arrow pointing up at spotlight */}
        {sp && !flipAbove && (
          <div style={{
            position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "8px solid var(--bg-primary,#fff)",
            filter: "drop-shadow(0 -2px 3px rgba(0,0,0,0.08))",
          }} />
        )}
        {sp && flipAbove && (
          <div style={{
            position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid var(--bg-primary,#fff)",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.08))",
          }} />
        )}

        <div style={{ fontSize: 22, marginBottom: 4, textAlign: "center" }}>{cur.icon}</div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary,#111827)", margin: "0 0 5px", textAlign: "center", fontFamily: "'Outfit',sans-serif" }}>{cur.title}</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary,#4b5563)", lineHeight: 1.6, margin: "0 0 1rem", textAlign: "center" }}>{cur.text}</p>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: "0.75rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 99, background: i === step ? "var(--brand,#4472b8)" : "var(--border,#e5e7eb)", transition: "all 0.3s" }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border,#e5e7eb)", background: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "var(--text-secondary,#374151)", cursor: "pointer" }}>← Back</button>
          )}
          <button onClick={isLast ? onClose : () => setStep(s => s + 1)} style={{ flex: 2, padding: "8px 0", background: "var(--brand,#4472b8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {isLast ? "Let's go! 🚀" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
