import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

// Admin emails from env (comma-separated)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        let profileData = snap.exists() ? snap.data() : null;

        // Auto-assign admin role if email matches env list
        if (profileData && !profileData.role) {
          const isAdmin = ADMIN_EMAILS.includes(
            (firebaseUser.email || "").toLowerCase()
          );
          if (isAdmin) {
            profileData = { ...profileData, role: "admin" };
            await setDoc(doc(db, "users", firebaseUser.uid), { role: "admin" }, { merge: true });
          }
        }

        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      setProfile(snap.exists() ? snap.data() : null);
    }
  }, []);

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager" || isAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
