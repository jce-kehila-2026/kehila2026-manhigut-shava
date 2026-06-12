import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut, signInAnonymously, getRedirectResult } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  /* ── Guest mode (Firebase Anonymous Auth) + auth gate ──
     A guest is a real-but-anonymous Firebase session. This satisfies the
     `isAuth()` Firestore rules (so guests can READ the community) while we
     treat `user.isAnonymous` as the read-only "guest" flag throughout the app. */
  const [gateOpen, setGateOpen]       = useState(false);   // is the "create account" modal showing?
  const [authRequest, setAuthRequest] = useState(null);    // null | "login" | "signup"

  const isGuest = user?.isAnonymous === true;

  useEffect(() => {
    /* Process the result of signInWithRedirect (Google sign-in).
       This resolves silently if there's no pending redirect. */
    getRedirectResult(auth).catch((err) => {
      console.error("Google redirect sign-in error:", err.code, err.message);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser ?? null);

      /* Anonymous guests have no Firestore profile — skip the profile fetch
         entirely so they're never routed to "Complete Profile". */
      if (firebaseUser && !firebaseUser.isAnonymous) {
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

      /* A real (non-anonymous) sign-in clears any pending auth request / gate. */
      if (firebaseUser && !firebaseUser.isAnonymous) {
        setAuthRequest(null);
        setGateOpen(false);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    // Use auth.currentUser to always get the fresh user, avoiding stale closure
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.isAnonymous) {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      setProfile(snap.exists() ? snap.data() : null);
    }
  }, []);

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  /* Enter guest mode: open an anonymous Firebase session so reads pass the
     `isAuth()` rules. onAuthStateChanged then flips us into guest dashboard. */
  const enterGuest = useCallback(async () => {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      /* Most likely cause: Anonymous sign-in is not enabled in the Firebase
         console (Authentication → Sign-in method → Anonymous). Fail soft so the
         landing page stays usable rather than throwing an unhandled rejection. */
      console.error("Guest sign-in failed (is Anonymous auth enabled?):", err.code, err.message);
    }
  }, []);

  /* Leave guest mode (e.g. guest taps "logout"): drop the anonymous session
     and fall back to the landing page. */
  const exitGuest = useCallback(async () => {
    setGateOpen(false);
    if (auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }
  }, []);

  /* The read-only gate modal. */
  const openGate  = useCallback(() => setGateOpen(true), []);
  const closeGate = useCallback(() => setGateOpen(false), []);

  /* Guest tapped "Log In" / "Sign Up" inside the gate: tear down the anonymous
     session and signal App to render <AuthPage> on the requested tab. */
  const requestAuth = useCallback(async (mode = "login") => {
    setGateOpen(false);
    setAuthRequest(mode);
    if (auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }
  }, []);

  const clearAuthRequest = useCallback(() => setAuthRequest(null), []);

  return (
    <AuthContext.Provider
      value={{
        user, profile, loading, logout, refreshProfile,
        isGuest, enterGuest, exitGuest,
        gateOpen, openGate, closeGate,
        authRequest, requestAuth, clearAuthRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
