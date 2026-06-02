/**
 * One-shot admin-grant script.
 * Run from the /functions directory:
 *   node grantAdmin.js joellezanbil2911@gmail.com
 *
 * Uses Application Default Credentials — you must be signed in with:
 *   firebase login
 * before running this.
 */

const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node grantAdmin.js <email>");
  process.exit(1);
}

// Initialize with ADC (works after `firebase login`)
admin.initializeApp({
  projectId: "kehila-manhigut-shava",
});

const db = admin.firestore();
const authAdmin = admin.auth();

(async () => {
  try {
    console.log(`🔍 Looking up user: ${email}`);
    const userRecord = await authAdmin.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`✅ Found UID: ${uid}`);

    await db.collection("users").doc(uid).update({ isAdmin: true });
    console.log(`🎉 isAdmin set to true for ${email} (${uid})`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
