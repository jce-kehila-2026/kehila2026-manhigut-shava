import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { LanguageProvider } from "./LanguageContext";
import { ThemeProvider } from "./ThemeContext";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import CompleteProfilePage from "./CompleteProfilePage";
import OtpVerificationPage from "./OtpVerificationPage";
import DashboardPage from "./DashboardPage";

/* Simple loading screen */
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f4f8",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #e2e8f0",
          borderTopColor: "#1a3c5e",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 1rem",
        }} />
        <p style={{ color: "#64748b", fontSize: "14px", fontWeight: "500", margin: 0 }}>
          Loading…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  /* Still checking auth / profile */
  if (loading) return <LoadingScreen />;

  /* Not logged in — show landing first, then auth when they click login */
  if (!user) {
    if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />;
    return <LandingPage onLogin={() => setShowAuth(true)} />;
  }

  /* Logged in but no Firestore profile (Google / Phone first-time user) */
  if (profile === null) return <CompleteProfilePage />;

  /* OTP verification gate:
     - user.emailVerified  = Firebase Auth's OWN flag (true for Google, false for unverified email)
     - profile.emailVerified = our Firestore flag (true after OTP completed)
     Only show OTP page when BOTH say unverified — this safely passes Google/Phone users
     because Firebase Auth marks them verified automatically. */
  if (!user.emailVerified && !profile.emailVerified) return <OtpVerificationPage />;

  /* All good → dashboard */
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

