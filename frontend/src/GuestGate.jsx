import { useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";

/**
 * useGuestGate — the single interception point for restricted actions.
 *
 * Wrap any action handler with the returned `guard`:
 *
 *     const guard = useGuestGate();
 *     <button onClick={guard(handleLike)}>Like</button>
 *
 * For a guest, the click is intercepted entirely: default + propagation are
 * stopped, NO underlying handler (and therefore no Firestore/API call) runs,
 * and the "create an account" modal opens instead. For a real user the
 * original handler runs untouched, receiving the same event/args.
 */
export function useGuestGate() {
  const { isGuest, openGate } = useAuth();
  return useCallback(
    (handler) =>
      (e, ...rest) => {
        if (isGuest) {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          openGate();
          return undefined;
        }
        return handler?.(e, ...rest);
      },
    [isGuest, openGate]
  );
}

/* Tri-lingual copy — kept local so we don't touch the large LanguageContext. */
const GATE_T = {
  en: {
    title: "Join the community",
    body: "Create a free account to like, post, comment, repost, and connect with members.",
    signup: "Create account",
    login: "I already have an account",
    later: "Keep browsing",
  },
  he: {
    title: "הצטרפי לקהילה",
    body: "צרי חשבון חינם כדי לתת לייק, לפרסם, להגיב, לשתף ולהתחבר לחברות הקהילה.",
    signup: "יצירת חשבון",
    login: "כבר יש לי חשבון",
    later: "המשיכי לעיין",
  },
  ar: {
    title: "انضمي إلى المجتمع",
    body: "أنشئي حسابًا مجانيًا للإعجاب والنشر والتعليق وإعادة النشر والتواصل مع الأعضاء.",
    signup: "إنشاء حساب",
    login: "لدي حساب بالفعل",
    later: "متابعة التصفح",
  },
};

/**
 * AuthGateModal — Instagram-style "you need an account" pop-up.
 * Rendered once, globally (in App). Reads its open state from AuthContext, so
 * closing it leaves the page underneath exactly where it was (it's a pure
 * overlay — nothing unmounts, nothing refreshes).
 */
export default function AuthGateModal() {
  const { gateOpen, closeGate, requestAuth } = useAuth();
  const { lang, isRTL } = useLang();

  /* Esc closes the gate. */
  useEffect(() => {
    if (!gateOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeGate(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gateOpen, closeGate]);

  if (!gateOpen) return null;

  const T = GATE_T[lang] || GATE_T.he;
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div
      onClick={closeGate}
      style={{
        position: "fixed", inset: 0, zIndex: 4000,
        background: "rgba(74,31,61,0.45)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "gate-fade 0.18s ease",
        fontFamily: "'Figtree','Outfit',system-ui,sans-serif",
        direction: dir,
      }}
    >
      <style>{`
        @keyframes gate-fade{from{opacity:0}to{opacity:1}}
        @keyframes gate-pop{from{opacity:0;transform:translateY(14px) scale(0.96)}to{opacity:1;transform:none}}
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "100%", maxWidth: 380,
          background: "var(--bg-primary)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-xl)",
          padding: "2rem 1.75rem 1.5rem",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
          animation: "gate-pop 0.24s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        {/* Close (×) */}
        <button
          onClick={closeGate}
          aria-label="Close"
          style={{
            position: "absolute", top: 12, [isRTL ? "left" : "right"]: 12,
            width: 30, height: 30, borderRadius: "50%",
            border: "none", background: "var(--bg-tertiary)",
            color: "var(--text-muted)", cursor: "pointer",
            fontSize: 17, lineHeight: 1, display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "all var(--t-fast)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >×</button>

        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%", marginBottom: "0.6rem",
          background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 22px var(--brand-glow)", overflow: "hidden",
        }}>
          <img
            src="/NewLogoNGO.png"
            alt="BogrotNet"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
          />
        </div>

        <h2 style={{
          fontSize: 19, fontWeight: 800, color: "var(--text-primary)",
          margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.01em",
        }}>{T.title}</h2>

        <p style={{
          fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6,
          margin: "0.25rem 0 1.1rem", maxWidth: 300,
        }}>{T.body}</p>

        {/* Primary: Sign Up */}
        <button
          onClick={() => requestAuth("signup")}
          style={{
            width: "100%", padding: "12px 0", borderRadius: "var(--r-full)",
            background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
            color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 6px 18px var(--brand-glow)",
            transition: "transform var(--t-fast), box-shadow var(--t-fast)",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
        >{T.signup}</button>

        {/* Secondary: Log In */}
        <button
          onClick={() => requestAuth("login")}
          style={{
            width: "100%", padding: "11px 0", borderRadius: "var(--r-full)",
            background: "transparent", color: "var(--brand-dark)",
            border: "1.5px solid var(--border)", fontSize: 13.5, fontWeight: 700,
            cursor: "pointer", marginTop: 8,
            transition: "all var(--t-fast)", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--brand-pale)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
        >{T.login}</button>

        {/* Tertiary: dismiss, stay on page */}
        <button
          onClick={closeGate}
          style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            marginTop: 12, padding: 4, fontFamily: "inherit",
          }}
        >{T.later}</button>
      </div>
    </div>
  );
}
