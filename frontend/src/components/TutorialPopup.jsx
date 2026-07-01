import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";

const STEP_TARGET_IDS = ["tut-community", "tut-chat", "tut-members", "tut-profile"];
const STEP_ICONS      = ["💬", "✉️", "🔍", "👤"];

const DEFAULT_STEPS = [
  { title: "Community",       text: "Share updates and connect with the whole network." },
  { title: "Direct Messages", text: "Send private messages to any member directly." },
  { title: "Find Help",       text: "Search members who can help you by profession or skill." },
  { title: "My Profile",      text: "Complete your profile so others can find you." },
];

export function TutorialPopup({ onClose }) {
  const { t } = useLang();
  const steps = ((t.tutorial?.steps?.length === 4 ? t.tutorial.steps : DEFAULT_STEPS))
    .map((s, i) => ({ ...s, targetId: STEP_TARGET_IDS[i], icon: STEP_ICONS[i] }));

  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const isLast = step === steps.length - 1;
  const cur    = steps[step];

  useEffect(() => {
    function measure() {
      const el = document.getElementById(cur.targetId);
      if (el) setRect(el.getBoundingClientRect());
      else    setRect(null);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step, cur.targetId]);

  const PAD = 14;
  const sp = rect ? {
    left:   rect.left   - PAD,
    top:    rect.top    - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  const CARD_W     = Math.min(252, window.innerWidth - 32);
  const CARD_H_EST = 220;
  const rawLeft    = sp ? sp.left + sp.width / 2 : window.innerWidth / 2;
  const clampedLeft = Math.max(CARD_W / 2 + 8, Math.min(window.innerWidth - CARD_W / 2 - 8, rawLeft));
  const tooltipLeft = clampedLeft;
  const rawTop      = sp ? sp.top + sp.height + 16 : window.innerHeight * 0.45;
  const flipAbove   = sp && (rawTop + CARD_H_EST > window.innerHeight - 8);
  const rawFinalTop = flipAbove && sp ? sp.top - CARD_H_EST - 10 : rawTop;
  const finalTop    = Math.max(8, Math.min(window.innerHeight - CARD_H_EST - 8, rawFinalTop));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onClick={onClose}>
      <style>{`
        @keyframes tut-pulse {
          0%,100% { box-shadow: 0 0 0 9999px rgba(15,25,50,0.7), 0 0 0 3px rgba(68,114,184,0.8); }
          50%      { box-shadow: 0 0 0 9999px rgba(15,25,50,0.7), 0 0 0 8px rgba(68,114,184,0.2); }
        }
        @keyframes tut-tip-in {
          from { opacity:0; transform:translateX(-50%) translateY(10px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>

      {/* Spotlight cutout */}
      {sp ? (
        <div onClick={e => e.stopPropagation()} style={{
          position: "fixed", left: sp.left, top: sp.top, width: sp.width, height: sp.height,
          borderRadius: 16, animation: "tut-pulse 2s ease-in-out infinite",
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)", pointerEvents: "none", zIndex: 99998,
        }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,25,50,0.72)", pointerEvents: "none" }} />
      )}

      {/* Tooltip card */}
      <div onClick={e => e.stopPropagation()} style={{
        position: "fixed", left: tooltipLeft, top: finalTop,
        transform: "translateX(-50%)",
        background: "var(--bg-primary,#fff)", borderRadius: 16,
        padding: "1.1rem 1.25rem 1rem", width: CARD_W,
        boxShadow: "0 12px 40px rgba(15,25,50,0.28), 0 0 0 1.5px rgba(68,114,184,0.12)",
        zIndex: 99999, animation: "tut-tip-in 0.28s ease both",
        boxSizing: "border-box",
      }}>
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
            borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
            borderBottom: "8px solid var(--bg-primary,#fff)",
            filter: "drop-shadow(0 -2px 3px rgba(0,0,0,0.07))",
          }} />
        )}
        {sp && flipAbove && (
          <div style={{
            position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
            borderTop: "8px solid var(--bg-primary,#fff)",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.07))",
          }} />
        )}

        <div style={{ fontSize: 22, marginBottom: 4, textAlign: "center" }}>{cur.icon}</div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary,#111827)", margin: "0 0 5px", textAlign: "center", fontFamily: "'Outfit',sans-serif" }}>{cur.title}</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary,#4b5563)", lineHeight: 1.65, margin: "0 0 1rem", textAlign: "center" }}>{cur.text}</p>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: "0.75rem" }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 99,
              background: i === step ? "var(--brand,#4472b8)" : "var(--border,#e5e7eb)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: "8px 0",
              border: "1.5px solid var(--border,#e5e7eb)", background: "none",
              borderRadius: 10, fontSize: 12, fontWeight: 600,
              color: "var(--text-secondary,#374151)", cursor: "pointer",
            }}>
              {t.tutorial?.back || "← Back"}
            </button>
          )}
          <button onClick={isLast ? onClose : () => setStep(s => s + 1)} style={{
            flex: 2, padding: "8px 0",
            background: "var(--brand,#4472b8)", color: "#fff",
            border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            {isLast ? (t.tutorial?.done || "Let's go! 🚀") : (t.tutorial?.next || "Next →")}
          </button>
        </div>
      </div>
    </div>
  );
}
