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

function LoadingScreen() {
  return (
    <div style={{
      minHeight:"100vh", display:"flex", overflow:"hidden",
      background:"#f5f7fa", fontFamily:"'Figtree',system-ui,sans-serif",
    }}>
      <style>{`
        @keyframes skel-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        .skel{background:linear-gradient(90deg,#e8edf3 25%,#f0f4f8 50%,#e8edf3 75%);
          background-size:600px 100%;animation:skel-shimmer 1.4s infinite linear;border-radius:8px;}
      `}</style>
      {/* Sidebar skeleton */}
      <div style={{ width:68, background:"#1a2f5e", display:"flex", flexDirection:"column", alignItems:"center", padding:"1rem 0", gap:12 }}>
        <div className="skel" style={{ width:38, height:38, borderRadius:12, opacity:0.18 }}/>
        <div style={{ width:28, height:1, background:"rgba(255,255,255,0.1)", margin:"4px 0" }}/>
        {[0,1,2,3,4].map(i=>(
          <div key={i} className="skel" style={{ width:36, height:36, borderRadius:10, opacity:0.14 }}/>
        ))}
      </div>
      {/* Main content skeleton */}
      <div style={{ flex:1, padding:"2.25rem 2.75rem", display:"flex", flexDirection:"column", gap:"1.5rem" }}>
        {/* Header bar */}
        <div style={{ height:60, background:"#fff", borderRadius:12, marginBottom:4, display:"flex", alignItems:"center", padding:"0 1.5rem", gap:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="skel" style={{ width:140, height:18 }}/>
          <div style={{ flex:1 }}/>
          <div className="skel" style={{ width:80, height:28, borderRadius:99 }}/>
        </div>
        {/* Welcome banner */}
        <div className="skel" style={{ height:110, borderRadius:18 }}/>
        {/* Quick action cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
          {[0,1,2,3].map(i=>(
            <div key={i} className="skel" style={{ height:140, borderRadius:16 }}/>
          ))}
        </div>
        {/* Member rows */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div className="skel" style={{ width:180, height:14 }}/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{ background:"#fff", borderRadius:14, padding:"1rem", display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="skel" style={{ width:42, height:42, borderRadius:"50%", flexShrink:0 }}/>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                  <div className="skel" style={{ width:"70%", height:12 }}/>
                  <div className="skel" style={{ width:"50%", height:10 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Fallback for Google users with no Firestore doc — create basic profile then reload */
function GoogleProfileSetup() {
  const { user, refreshProfile } = useAuth();
  useEffect(() => {
    if (!user) return;
    const parts = (user.displayName || "").split(" ");
    setDoc(doc(db, "users", user.uid), {
      firstName:     parts[0] || "",
      lastName:      parts.slice(1).join(" ") || "",
      email:         user.email || "",
      emailVerified: true,
      acceptedTerms: true,
      createdAt:     new Date().toISOString(),
    })
      .then(() => refreshProfile())
      .catch(() => refreshProfile());
  }, [user]);
  return <LoadingScreen />;
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return <LoadingScreen />;

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
