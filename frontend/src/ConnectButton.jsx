/**
 * ConnectButton — "Join Network" / "In Network" toggle
 *
 * Props:
 *   targetUserId   string  — the user to connect to
 *   size           "sm" | "md" | "full"   — controls padding/font
 *   onToggle       (delta: +1 | -1) => void  — called after toggle so parent can update count display
 */
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs,
  addDoc, deleteDoc, doc, updateDoc, increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useGuestGate } from "./GuestGate";
import { useLang } from "./LanguageContext";

export default function ConnectButton({ targetUserId, size = "md", onToggle }) {
  const { user, isGuest } = useAuth();
  const guard = useGuestGate();
  const { t } = useLang();

  const [inNetwork, setInNetwork] = useState(false);
  const [docId,     setDocId]     = useState(null);
  const [loading,   setLoading]   = useState(true);

  /* Check existing connection on mount */
  useEffect(() => {
    if (!user || !targetUserId || user.uid === targetUserId) {
      setLoading(false);
      return;
    }
    (async () => {
      const q = query(
        collection(db, "networks"),
        where("fromUserId", "==", user.uid),
        where("toUserId",   "==", targetUserId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setInNetwork(true);
        setDocId(snap.docs[0].id);
      }
      setLoading(false);
    })();
  }, [user, targetUserId]);

  /* Don't render for own profile or while loading */
  if (!user || !targetUserId || user.uid === targetUserId) return null;
  if (loading) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (inNetwork && docId) {
        /* Leave network */
        await deleteDoc(doc(db, "networks", docId));
        await updateDoc(doc(db, "users", targetUserId), { networksCount: increment(-1) });
        setInNetwork(false);
        setDocId(null);
        onToggle?.(-1);
      } else {
        /* Join network */
        const newRef = await addDoc(collection(db, "networks"), {
          fromUserId: user.uid,
          toUserId:   targetUserId,
          createdAt:  new Date().toISOString(),
        });
        await updateDoc(doc(db, "users", targetUserId), { networksCount: increment(1) });
        setInNetwork(true);
        setDocId(newRef.id);
        onToggle?.(+1);
      }
    } catch (err) { console.error("ConnectButton error:", err); }
    finally { setLoading(false); }
  };

  /* Size variants */
  const PAD  = { sm: "5px 12px",  md: "8px 18px",  full: "10px 0" };
  const FONT = { sm: "11px",       md: "13px",       full: "13px"  };
  const W    = { sm: "auto",       md: "auto",       full: "100%"  };

  const style = {
    padding:        PAD[size]  ?? PAD.md,
    fontSize:       FONT[size] ?? FONT.md,
    fontWeight:     "700",
    fontFamily:     "inherit",
    width:          W[size]    ?? W.md,
    border:         inNetwork ? "1.5px solid #bbf7d0" : "1.5px solid #bfdbfe",
    borderRadius:   "10px",
    background:     inNetwork ? "#f0fdf4"             : "#eff6ff",
    color:          inNetwork ? "#166534"             : "#1d4ed8",
    cursor:         loading   ? "default"             : "pointer",
    transition:     "all 0.15s",
    opacity:        loading   ? 0.7                   : 1,
  };

  return (
    <button style={style} onClick={guard(handleToggle)} disabled={loading && !isGuest}>
      {inNetwork
        ? (t.network?.inNetwork  ?? "In Network")
        : (t.network?.joinNetwork ?? "Join Network")}
    </button>
  );
}
