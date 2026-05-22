const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.firestore();

/* ── Send 6-digit OTP to email ── */
exports.sendOtpEmail = functions.https.onCall(async (data, context) => {
  const { email, uid } = data;
  if (!email || !uid) {
    throw new functions.https.HttpsError("invalid-argument", "Missing email or uid.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  await db.collection("otps").doc(uid).set({ otp, expiresAt, email, attempts: 0 });

  sgMail.setApiKey(functions.config().sendgrid.key);

  await sgMail.send({
    to: email,
    from: {
      email: functions.config().sendgrid.from || "noreply@manhigut-shava.com",
      name: "מנהיגות שווה",
    },
    subject: "קוד האימות שלך — מנהיגות שווה",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#f8faff;border-radius:12px;">
        <div style="background:#1a3a8f;border-radius:10px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;">
          <span style="font-size:1.1rem;font-weight:800;color:#fff;">מנהיגות שווה — רשת בוגרות</span>
        </div>
        <h2 style="color:#1a3a8f;margin-bottom:0.5rem;">אימות כתובת האימייל שלך</h2>
        <p style="color:#5a6a8a;margin-bottom:1.5rem;">הכניסי את הקוד הבא באתר כדי להשלים את ההרשמה:</p>
        <div style="background:#fff;border:2px solid #c8ddfb;border-radius:12px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;">
          <div style="font-size:3rem;font-weight:900;letter-spacing:16px;color:#1a3a8f;">${otp}</div>
        </div>
        <p style="color:#94a3b8;font-size:0.85rem;">הקוד תקף ל-10 דקות בלבד.</p>
        <p style="color:#94a3b8;font-size:0.85rem;">אם לא ביקשת קוד זה, התעלמי מהודעה זו.</p>
      </div>
    `,
  });

  return { success: true };
});

/* ── Verify OTP entered by user ── */
exports.verifyOtp = functions.https.onCall(async (data, context) => {
  const { uid, otp } = data;
  if (!uid || !otp) {
    throw new functions.https.HttpsError("invalid-argument", "Missing uid or otp.");
  }

  const docRef = db.collection("otps").doc(uid);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "קוד לא נמצא. בקשי קוד חדש.");
  }

  const { otp: stored, expiresAt, attempts } = snap.data();

  if (attempts >= 5) {
    await docRef.delete();
    throw new functions.https.HttpsError("resource-exhausted", "יותר מדי ניסיונות. בקשי קוד חדש.");
  }

  if (Date.now() > expiresAt) {
    await docRef.delete();
    throw new functions.https.HttpsError("deadline-exceeded", "הקוד פג תוקף. בקשי קוד חדש.");
  }

  if (otp !== stored) {
    await docRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    const left = 4 - attempts;
    throw new functions.https.HttpsError("invalid-argument", `קוד שגוי. נותרו ${left} ניסיונות.`);
  }

  await db.collection("users").doc(uid).update({ emailVerified: true });
  await docRef.delete();

  return { success: true };
});
