import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { LanguageProvider } from "./LanguageContext";
import { ThemeProvider } from "./ThemeContext";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import CompleteProfilePage from "./CompleteProfilePage";
import OtpVerificationPage from "./OtpVerificationPage";
import DashboardPage from "./DashboardPage";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/* Pre-login cursor trail — LandingPage only */
function CursorTrail() {
  useEffect(() => {
    const N = 18;
    const dots = [];
    let mx = -200, my = -200;
    const colors = ["#4472b8","#6da3d4","#e8735a","#f5a08c","#4472b8","#6da3d4"];

    for (let i = 0; i < N; i++) {
      const d = document.createElement("div");
      const t = i / (N - 1);                    // 0 → 1
      const size = 11 * (1 - t * 0.72);         // 11px lead → ~3px tail
      const blur = i > 2 ? (t * 4).toFixed(1) : 0;
      d.style.cssText = `
        position:fixed;pointer-events:none;border-radius:50%;z-index:9990;
        width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;
        background:${colors[i % colors.length]};
        opacity:0;
        transform:translate(-50%,-50%);
        filter:${blur > 0 ? `blur(${blur}px)` : "none"};
        will-change:left,top;
      `;
      document.body.appendChild(d);
      dots.push({ el: d, x: -200, y: -200 });
    }

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);

    let raf;
    const LERP = 0.21;
    const animate = () => {
      dots.forEach((d, i) => {
        const prev = i === 0 ? { x: mx, y: my } : dots[i - 1];
        d.x += (prev.x - d.x) * LERP;
        d.y += (prev.y - d.y) * LERP;
        d.el.style.left    = `${d.x}px`;
        d.el.style.top     = `${d.y}px`;
        const t = i / (N - 1);
        d.el.style.opacity = String((0.72 - t * 0.62).toFixed(3));
      });
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      dots.forEach(d => d.el.remove());
    };
  }, []);
  return null;
}

/* Fallback for Google users with no Firestore doc — create minimal stub then reload */
function GoogleProfileSetup() {
  const { user, refreshProfile } = useAuth();
  useEffect(() => {
    if (!user) return;
    /* Only write account-level fields here; name fields are handled in AuthContext
       to avoid overwriting a user's manually-chosen name on re-login */
    setDoc(doc(db, "users", user.uid), {
      email:         user.email || "",
      emailVerified: true,
      acceptedTerms: true,
      createdAt:     new Date().toISOString(),
    }, { merge: true })
      .then(() => refreshProfile())
      .catch(() => refreshProfile());
  }, [user]);
  return null;
}

function BlockedScreen({ reason }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-primary,#f8fafc)", padding:"2rem" }}>
      <div style={{ maxWidth:420, textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1.25rem" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, color:"#1e293b", marginBottom:"0.5rem" }}>הגישה שלך נחסמה</h2>
        <p style={{ fontSize:14, color:"#64748b", marginBottom: reason ? "0.5rem" : "1.5rem", lineHeight:1.6 }}>
          חשבון זה נחסם על ידי מנהל המערכת. לפרטים נוספים, פני לניצן סניור שניאור.
        </p>
        {reason && (
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:"1.5rem", background:"#f1f5f9", borderRadius:10, padding:"0.6rem 1rem" }}>
            סיבה: {reason}
          </p>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
          <a href="mailto:anitzan86@gmail.com" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 20px", borderRadius:99, background:"#4472b8", color:"#fff", textDecoration:"none", fontSize:13, fontWeight:700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            anitzan86@gmail.com
          </a>
          <a href="tel:0586277762" style={{ fontSize:13, color:"#4472b8", fontWeight:600 }}>058-6277762</a>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading, isBlacklisted, blacklistReason } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const handlePop = () => { setShowAuth(false); };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (loading) return null;

  if (isBlacklisted) return <BlockedScreen reason={blacklistReason} />;

  if (!user) {
    if (showAuth) return <><CursorTrail /><AuthPage onBack={() => setShowAuth(false)} /></>;
    return <><CursorTrail /><LandingPage onLogin={() => { window.history.pushState({ page: "auth" }, ""); setShowAuth(true); }} /></>;
  }

  if (profile === null) {
    const isGoogle = user.providerData?.some(p => p.providerId === "google.com");
    if (isGoogle) return <GoogleProfileSetup />;
    return <CompleteProfilePage />;
  }

  if (!user.emailVerified && !profile.emailVerified) return <OtpVerificationPage />;

  return <DashboardPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
