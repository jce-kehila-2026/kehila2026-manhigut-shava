import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import DashboardPage from "./DashboardPage";

function AppContent() {
  const { user } = useAuth();

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
