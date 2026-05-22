import { useState, useRef, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { useAuth } from "./AuthContext";

const C = {
  blue: "#1a3a8f", bright: "#2f5fd4", light: "#4a7ae8",
  sky: "#7aaef5", pale: "#c8ddfb", deep: "#0b1f52", deeper: "#071440",
};

const sendOtpFn  = httpsCallable(functions, "sendOtpEmail");
const verifyOtpFn = httpsCallable(functions, "verifyOtp");

export default function OtpVerificationPage() {
  const { user, refreshProfile } = useAuth();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputs = useRef([]);

  /* Auto-send OTP when page loads */
  useEffect(() => {
    if (user) sendOtp();
  }, []);

  /* Countdown timer for resend */
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendOtp() {
    if (!user) return;
    setError("");
    try {
      await sendOtpFn({ email: user.email, uid: user.uid });
      setSent(true);
      setCountdown(60);
    } catch (e) {
      setError("שגיאה בשליחת הקוד: " + (e.message || "נסי שוב."));
    }
  }

  function handleChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      inputs.current[5]?.focus();
    }
  }

  async function verify() {
    const otp = digits.join("");
    if (otp.length < 6) { setError("הכניסי את כל 6 הספרות."); return; }
    setLoading(true); setError("");
    try {
      await verifyOtpFn({ uid: user.uid, otp });
      await refreshProfile();
    } catch (e) {
      setError(e.message || "קוד שגוי. נסי שוב.");
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/background.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.5)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "linear-gradient(135deg,rgba(7,20,64,0.82) 0%,rgba(26,58,143,0.65) 100%)" }} />

      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10, padding: "1.2rem 2.5rem", display: "flex", alignItems: "center", direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>♀</div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>מנהיגות שווה</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(200,221,251,0.55)", letterSpacing: "0.07em" }}>רשת בוגרות</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{ position: "relative", zIndex: 5, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 1rem 5rem" }}>
        <div style={{
          width: "100%", maxWidth: 400,
          background: "rgba(7,20,64,0.78)", backdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22,
          padding: "2.4rem", boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          direction: "rtl", textAlign: "center",
          animation: "cardUp 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>📧</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "0.4rem" }}>אימות כתובת האימייל</h2>
          <p style={{ color: "rgba(200,221,251,0.6)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1.8rem" }}>
            {sent ? <>שלחנו קוד בן 6 ספרות ל<br/><strong style={{ color: C.pale }}>{user?.email}</strong></> : "שולחת קוד..."}
          </p>

          {error && (
            <div style={{ background: "rgba(220,60,60,0.15)", border: "1px solid rgba(220,60,60,0.3)", borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: "1.2rem", fontSize: "0.82rem", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {/* 6-digit OTP inputs */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1.8rem" }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 48, height: 58,
                  textAlign: "center", fontSize: "1.5rem", fontWeight: 800,
                  background: d ? "rgba(122,174,245,0.2)" : "rgba(255,255,255,0.08)",
                  border: `2px solid ${d ? C.sky : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 10, color: "#fff", outline: "none",
                  transition: "border-color 0.2s, background 0.2s",
                  fontFamily: "monospace",
                }}
                onFocus={e => e.target.style.borderColor = C.sky}
                onBlur={e => e.target.style.borderColor = d ? C.sky : "rgba(255,255,255,0.15)"}
              />
            ))}
          </div>

          <button
            onClick={verify}
            disabled={loading || digits.join("").length < 6}
            style={{
              width: "100%", padding: "0.85rem",
              background: loading || digits.join("").length < 6
                ? "rgba(255,255,255,0.1)"
                : `linear-gradient(135deg,${C.bright},${C.light})`,
              color: "#fff", border: "none", borderRadius: 9,
              fontSize: "0.95rem", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              boxShadow: "0 4px 18px rgba(47,95,212,0.35)",
              transition: "all 0.2s", marginBottom: "1rem",
            }}
          >
            {loading ? "מאמתת..." : "אמתי קוד →"}
          </button>

          {/* Resend */}
          <div style={{ fontSize: "0.8rem", color: "rgba(200,221,251,0.5)" }}>
            לא קיבלת?{" "}
            {countdown > 0 ? (
              <span style={{ color: "rgba(200,221,251,0.35)" }}>שלחי שוב בעוד {countdown} שניות</span>
            ) : (
              <button onClick={sendOtp} style={{ background: "none", border: "none", color: C.sky, fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}>
                שלחי שוב
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "center", gap: "3.5rem", padding: "0.9rem", background: "rgba(7,20,64,0.65)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[["500+", "בוגרות"], ["10+", "שנות פעילות"], ["🔒", "פרטיות מלאה"], ["חינם", "להצטרפות"]].map(([n, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{n}</div>
            <div style={{ color: "rgba(200,221,251,0.45)", fontSize: "0.67rem", marginTop: "0.1rem" }}>{l}</div>
          </div>
        ))}
      </div>

      <style>{`@keyframes cardUp { from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);} }`}</style>
    </div>
  );
}
