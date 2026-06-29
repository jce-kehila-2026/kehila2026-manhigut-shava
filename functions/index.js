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

  sgMail.setApiKey(process.env.SENDGRID_KEY);

  await sgMail.send({
    to: email,
    from: {
      email: process.env.SENDGRID_FROM || "noreply@manhigut-shava.com",
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

/* ── Sync isAdmin Firestore field → Auth custom claim ──────────────────────
   Runs whenever a users/{uid} document is created or updated. Sets the
   isAdmin custom claim so Storage rules can check it without a Firestore
   read (request.auth.token.isAdmin). The target user's token updates on
   their next refresh (up to 1 h) or immediately if they sign out/in. */
exports.syncAdminClaim = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    if (!change.after.exists) return null;
    const isAdmin = change.after.data()?.isAdmin === true;
    try {
      await admin.auth().setCustomUserClaims(uid, { isAdmin });
    } catch (e) {
      console.error("syncAdminClaim: failed for", uid, e);
    }
    return null;
  });

/* ── Delete user from Firebase Auth (admin only) ── */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  const callerUid = context.auth?.uid;
  if (!callerUid) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }

  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists || !callerDoc.data().isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Missing uid.");
  }

  await admin.auth().deleteUser(uid);
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

/* ── Send OTP to a new email address to verify ownership before changing ── */
exports.sendEmailChangeOtp = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    const uid = context.auth.uid;
    const { newEmail } = data;
    if (!newEmail) {
      throw new functions.https.HttpsError("invalid-argument", "Missing newEmail.");
    }

    let emailTaken = false;
    try {
      await admin.auth().getUserByEmail(newEmail);
      emailTaken = true;
    } catch (e) {
      if (e.code !== "auth/user-not-found") {
        console.error("sendEmailChangeOtp: getUserByEmail error:", e);
        throw new functions.https.HttpsError("internal", "Failed to check email availability.");
      }
    }
    if (emailTaken) {
      throw new functions.https.HttpsError("already-exists", "That email is already in use.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await db.collection("emailChangeOtps").doc(uid).set({ otp, expiresAt, newEmail, attempts: 0 });

    sgMail.setApiKey(process.env.SENDGRID_KEY);
    await sgMail.send({
      to: newEmail,
      from: {
        email: process.env.SENDGRID_FROM || "noreply@manhigut-shava.com",
        name: "מנהיגות שווה",
      },
      subject: "אישור שינוי דוא״ל — מנהיגות שווה",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#f8faff;border-radius:12px;">
          <div style="background:#1a3a8f;border-radius:10px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;">
            <span style="font-size:1.1rem;font-weight:800;color:#fff;">מנהיגות שווה — רשת בוגרות</span>
          </div>
          <h2 style="color:#1a3a8f;margin-bottom:0.5rem;">אישור שינוי כתובת הדוא״ל</h2>
          <p style="color:#5a6a8a;margin-bottom:1.5rem;">הכניסי את הקוד הבא כדי לאשר את כתובת הדוא״ל החדשה שלך:</p>
          <div style="background:#fff;border:2px solid #c8ddfb;border-radius:12px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;">
            <div style="font-size:3rem;font-weight:900;letter-spacing:16px;color:#1a3a8f;">${otp}</div>
          </div>
          <p style="color:#94a3b8;font-size:0.85rem;">הקוד תקף ל-10 דקות בלבד.</p>
          <p style="color:#94a3b8;font-size:0.85rem;">אם לא ביקשת שינוי זה, התעלמי מהודעה זו.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    console.error("sendEmailChangeOtp crash:", e);
    throw new functions.https.HttpsError("internal", e.message || "Unexpected error.");
  }
});

/* ── Verify OTP and update email via Admin SDK ── */
exports.verifyEmailChangeOtp = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    const uid = context.auth.uid;
    const { otp } = data;
    if (!otp) {
      throw new functions.https.HttpsError("invalid-argument", "Missing otp.");
    }

    const docRef = db.collection("emailChangeOtps").doc(uid);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Code not found. Request a new one.");
    }

    const { otp: stored, expiresAt, newEmail, attempts } = snap.data();

    if (attempts >= 5) {
      await docRef.delete();
      throw new functions.https.HttpsError("resource-exhausted", "Too many attempts. Request a new code.");
    }

    if (Date.now() > expiresAt) {
      await docRef.delete();
      throw new functions.https.HttpsError("deadline-exceeded", "Code expired. Request a new one.");
    }

    if (otp !== stored) {
      await docRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      const left = 4 - attempts;
      throw new functions.https.HttpsError("invalid-argument", `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`);
    }

    await admin.auth().updateUser(uid, { email: newEmail });
    await db.collection("users").doc(uid).update({ email: newEmail });
    await docRef.delete();

    return { success: true };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    console.error("verifyEmailChangeOtp crash:", e);
    throw new functions.https.HttpsError("internal", e.message || "Unexpected error.");
  }
});

/* ── Scheduled: delete accounts that haven't verified email after 7 days ── */
exports.cleanupUnverifiedAccounts = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const snap = await db.collection("users").where("emailVerified", "==", false).get();

    const stale = snap.docs.filter(d => {
      const t = new Date(d.data().createdAt).getTime();
      return !isNaN(t) && t < cutoffMs;
    });

    await Promise.all(stale.map(async d => {
      const uid = d.id;
      try {
        await admin.auth().deleteUser(uid);
      } catch (e) {
        if (e.code !== "auth/user-not-found") {
          console.error("cleanupUnverifiedAccounts: auth delete failed for", uid, e);
        }
      }
      await db.collection("users").doc(uid).collection("private").doc("contact").delete().catch(() => {});
      await db.collection("otps").doc(uid).delete().catch(() => {});
      await d.ref.delete();
    }));

    console.log(`cleanupUnverifiedAccounts: removed ${stale.length} stale unverified accounts`);
    return null;
  });
