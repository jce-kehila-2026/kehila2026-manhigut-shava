import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { LanguageProvider } from "./LanguageContext";
import { ThemeProvider } from "./ThemeContext";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import CompleteProfilePage from "./CompleteProfilePage";
import OtpVerificationPage from "./OtpVerificationPage";
import DashboardPage from "./DashboardPage";
import AuthGateModal from "./GuestGate";

/* Global cursor trail — smooth comet tail */
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

/* Login intro overlay — same animation as landing page intro */
const LP_INTRO_CSS_ID = "login-intro-css";
function ensureLoginIntroCss() {
  if (document.getElementById(LP_INTRO_CSS_ID)) return;
  const s = document.createElement("style");
  s.id = LP_INTRO_CSS_ID;
  s.textContent = `
    @keyframes li-out    {to{transform:translateX(110%);opacity:0}}
    @keyframes li-sweep  {from{transform:translateX(-160%) skewX(-3deg)}to{transform:translateX(160%) skewX(-3deg)}}
    @keyframes li-fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes li-logo-in{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(s);
}

function LoginIntroOverlay({ onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    ensureLoginIntroCss();
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1450);
    const t3 = setTimeout(onDone, 2300);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,overflow:"hidden",
      background:"linear-gradient(135deg,#1d4896 0%,#4472b8 55%,#6da3d4 100%)",
      animation:phase===2?"li-out 0.85s cubic-bezier(0.76,0,0.24,1) forwards":"none",
    }}>
      {/* Sweep waves */}
      {phase>=1&&[{delay:"0s",dur:"0.72s",op:0.18},{delay:"0.11s",dur:"0.78s",op:0.13},{delay:"0.20s",dur:"0.68s",op:0.22}].map((w,i)=>(
        <div key={i} style={{
          position:"absolute",top:"-8%",bottom:"-8%",width:"52%",left:"-52%",
          background:`rgba(255,255,255,${w.op})`,borderRadius:"50% / 8%",
          animation:`li-sweep ${w.dur} ${w.delay} cubic-bezier(0.4,0,0.6,1) forwards`,
        }}/>
      ))}
      {/* Logo + name */}
      <div style={{
        position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:18,
        opacity:phase>=1?0:1,transition:"opacity 0.3s ease",
        animation:phase===0?"li-fade-up 0.55s 0.1s ease both":"none",
      }}>
        <img src="/NewLogoNGO.png"
          onError={e=>{e.target.style.display="none";}}
          alt="BogrotNet"
          style={{width:96,height:96,objectFit:"contain",borderRadius:"50%",
            background:"rgba(255,255,255,0.14)",padding:8,
            border:"2px solid rgba(255,255,255,0.3)",
            animation:"li-logo-in 0.55s 0.1s ease both"}}
        />
        <div style={{textAlign:"center",animation:"li-fade-up 0.6s 0.25s ease both"}}>
          <div style={{fontSize:"clamp(22px,3.5vw,38px)",fontWeight:900,color:"#fff",
            letterSpacing:"-0.02em",fontFamily:"'Playfair Display',Georgia,serif",margin:0}}>
            BogrotNet
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.26em",
            textTransform:"uppercase",marginTop:6}}>
            ברוכה הבאה
          </div>
        </div>
      </div>
    </div>
  );
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

function AppContent() {
  const { user, profile, loading, isGuest, enterGuest, authRequest, clearAuthRequest } = useAuth();
  const [showAuth, setShowAuth]         = useState(false);
  const [showLoginIntro, setShowLoginIntro] = useState(false);
  const prevUserRef = useRef(null);

  /* Show intro once per session when user transitions from null → logged-in.
     Skip it for anonymous guests — they didn't "log in". */
  useEffect(() => {
    if (!loading) {
      const wasLoggedOut = prevUserRef.current === null;
      const isNowLoggedIn = !!user && !user.isAnonymous;
      if (wasLoggedOut && isNowLoggedIn && !sessionStorage.getItem("login_intro_done")) {
        sessionStorage.setItem("login_intro_done", "1");
        setShowLoginIntro(true);
      }
      prevUserRef.current = user;
    }
  }, [user, loading]);

  if (loading) return <LoadingScreen />;

  if (showLoginIntro) {
    return <LoginIntroOverlay onDone={() => setShowLoginIntro(false)} />;
  }

  if (!user) {
    /* Guest tapped Log In / Sign Up inside the gate → open AuthPage on that tab. */
    if (authRequest) return <AuthPage initialTab={authRequest} onBack={clearAuthRequest} />;
    if (showAuth)    return <AuthPage onBack={() => setShowAuth(false)} />;
    return <LandingPage onLogin={() => setShowAuth(true)} onExplore={enterGuest} />;
  }

  /* Anonymous guest → straight into the (read-only) dashboard, bypassing the
     Complete-Profile / OTP guards that only apply to real accounts. */
  if (isGuest) return <DashboardPage />;

  if (profile === null) return <CompleteProfilePage />;

  if (!user.emailVerified && !profile.emailVerified) return <OtpVerificationPage />;

  return <DashboardPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CursorTrail />
          <AppContent />
          <AuthGateModal />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
