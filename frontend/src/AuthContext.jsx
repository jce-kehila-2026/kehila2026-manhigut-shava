import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          let profileData = snap.data();

          /* Auto-fix: Google / Phone users should always be treated as email-verified.
             If their Firestore profile still has emailVerified:false (set during a prior
             email-signup flow), silently patch it so they reach the Dashboard. */
          const isEmailPassword = firebaseUser.providerData?.some(
            (p) => p.providerId === "password"
          );
          if (!isEmailPassword && profileData.emailVerified === false) {
            try {
              await updateDoc(doc(db, "users", firebaseUser.uid), { emailVerified: true });
              profileData = { ...profileData, emailVerified: true };
            } catch (_) { /* ignore — worst case the OTP check handles it */ }
          }

          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    // Use auth.currentUser to always get the fresh user, avoiding stale closure
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
