import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import CompleteProfilePage from "./CompleteProfilePage";
import TermsPage from "./TermsPage";
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

  /* Still checking auth / profile */
  if (loading) return <LoadingScreen />;

  /* Not logged in */
  if (!user) return <AuthPage />;

  /* Logged in but no Firestore profile (Google / Phone first-time user) */
  if (profile === null) return <CompleteProfilePage />;

  /* Profile exists but terms not accepted yet */
  if (!profile.acceptedTerms) return <TermsPage />;

  /* All good → dashboard */
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
