import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const contactRef = (uid) => doc(db, "users", uid, "private", "contact");

export async function saveContact(uid, { phone, email }) {
  await setDoc(contactRef(uid), { phone: phone ?? "", email: email ?? "" }, { merge: true });
}

export async function getContact(uid) {
  const snap = await getDoc(contactRef(uid));
  return snap.exists() ? snap.data() : { phone: "", email: "" };
}
