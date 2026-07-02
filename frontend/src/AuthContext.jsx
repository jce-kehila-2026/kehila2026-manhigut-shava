import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    /* Process the result of signInWithRedirect (Google sign-in).
       This resolves silently if there's no pending redirect. */
    getRedirectResult(auth).catch((err) => {
      console.error("Google redirect sign-in error:", err.code, err.message);
    });

    let initialLoad = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (initialLoad) setLoading(true);
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
          /* snap.exists() returned false — verify with a second read to handle cache/race false-negatives */
          const verifySnap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (verifySnap.exists()) {
            /* Doc exists (false negative on first read) — just load the real profile */
            let profileData = verifySnap.data();
            const isEmailPassword = firebaseUser.providerData?.some(p => p.providerId === "password");
            if (!isEmailPassword && profileData.emailVerified === false) {
              try {
                await updateDoc(doc(db, "users", firebaseUser.uid), { emailVerified: true });
                profileData = { ...profileData, emailVerified: true };
              } catch (_) {}
            }
            setProfile(profileData);
          } else {
            /* Doc truly doesn't exist — new Google/social sign-in */
            const isGoogle = firebaseUser.providerData?.some(p => p.providerId === "google.com");
            if (isGoogle) {
              const parts = (firebaseUser.displayName || "").split(" ");
              /* Write only account-level fields; name fields written separately below
                 so they never overwrite a user's manually-chosen name on false-negatives */
              const accountFields = {
                email:         firebaseUser.email || "",
                emailVerified: true,
                acceptedTerms: true,
                createdAt:     new Date().toISOString(),
              };
              try {
                await setDoc(doc(db, "users", firebaseUser.uid), accountFields, { merge: true });
                /* Re-read to pick up any fields that may have existed */
                const afterSnap = await getDoc(doc(db, "users", firebaseUser.uid));
                const afterData = afterSnap.exists() ? afterSnap.data() : accountFields;
                /* For a brand-new user with no name yet, seed name from Google display name */
                if (!afterData.firstName && !afterData.lastName && (parts[0] || parts[1])) {
                  const nameFields = { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
                  await setDoc(doc(db, "users", firebaseUser.uid), nameFields, { merge: true });
                  setProfile({ ...afterData, ...nameFields });
                } else {
                  setProfile(afterData);
                }
              } catch (_) {
                setProfile(null);
              }
            } else {
              setProfile(null);
            }
          }
        }
      } else {
        setProfile(null);
      }
      if (initialLoad) { setLoading(false); initialLoad = false; }
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
    sessionStorage.removeItem("section");
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
