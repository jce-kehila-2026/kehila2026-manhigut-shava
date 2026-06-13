import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/* Contact details (phone/email) are PII. They live in a private subcollection
   — users/{uid}/private/contact — instead of the world-readable user doc, and
   the Firestore rules only let the owner or an admin read them. */
const contactRef = (uid) => doc(db, "users", uid, "private", "contact");

/* Read a user's contact. Permitted only for the owner or an admin; for anyone
   else the rules reject the read, so we swallow it and return {}. */
export async function getContact(uid) {
  if (!uid) return {};
  try {
    const snap = await getDoc(contactRef(uid));
    return snap.exists() ? snap.data() : {};
  } catch {
    return {};
  }
}

/* Create or merge a user's contact fields. */
export async function saveContact(uid, data) {
  await setDoc(contactRef(uid), data, { merge: true });
}
