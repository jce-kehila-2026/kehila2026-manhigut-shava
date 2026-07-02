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

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return null;

  if (!user) {
    if (showAuth) return <><CursorTrail /><AuthPage onBack={() => setShowAuth(false)} /></>;
    return <><CursorTrail /><LandingPage onLogin={() => setShowAuth(true)} /></>;
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
