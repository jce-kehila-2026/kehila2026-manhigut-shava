/**
 * One-shot backfill script.
 * Scans all user documents, finds institution values that are NOT in the
 * built-in INSTITUTIONS_BY_LANG list, and writes them into the
 * customInstitutions collection so they appear in the picker for all users.
 *
 * Run from the /functions directory:
 *   node backfillCustomInstitutions.js
 *
 * Requires Application Default Credentials:
 *   firebase login
 */

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "kehila-manhigut-shava" });
const db = admin.firestore();

const INSTITUTIONS_BY_LANG = {
  he: ["אוניברסיטת תל אביב","האוניברסיטה העברית","הטכניון","אוניברסיטת חיפה","אוניברסיטת בן גוריון","אוניברסיטת בר אילן","המכון הבינתחומי הרצליה (IDC)","מכללת אריאל","האקדמית אשקלון","הקריה האקדמית אונו","מכללת ספיר","מכללת תל חי","מכללת כנרת","מכללת אחוה","מכללת רופין","מכללת עמק יזרעאל"],
  en: ["Tel Aviv University","Hebrew University","Technion","University of Haifa","Ben-Gurion University","Bar-Ilan University","Reichman University (IDC)","Ariel University","Ashkelon Academic College","Ono Academic College","Sapir College","Tel-Hai College","Kinneret College","Achva Academic College","Ruppin Academic Center","Jezreel Valley College"],
  ar: ["جامعة تل أبيب","الجامعة العبرية","التخنيون","جامعة حيفا","جامعة بن غوريون","جامعة بار إيلان","جامعة رايخمان (IDC)","جامعة أريئيل","الكلية الأكاديمية عسقلان","الكلية الأكاديمية أونو","كلية سابير","كلية تل حاي","كلية كنيرت","كلية أحفاء الأكاديمية","المركز الأكاديمي روبين","كلية وادي يزرعيل"],
};

const knownValues = new Set([
  ...INSTITUTIONS_BY_LANG.he,
  ...INSTITUTIONS_BY_LANG.en,
  ...INSTITUTIONS_BY_LANG.ar,
]);

(async () => {
  // Load already-existing customInstitutions to avoid duplicates
  const existingSnap = await db.collection("customInstitutions").get();
  const existingValues = new Set();
  existingSnap.docs.forEach(d => {
    const data = d.data();
    if (data.he) existingValues.add(data.he);
    if (data.en) existingValues.add(data.en);
    if (data.ar) existingValues.add(data.ar);
  });
  console.log(`Found ${existingValues.size} values already in customInstitutions.`);

  // Scan all users
  const usersSnap = await db.collection("users").get();
  console.log(`Scanning ${usersSnap.size} user documents...`);

  const toAdd = new Map(); // en-key → { he, en, ar }

  usersSnap.docs.forEach(doc => {
    const data = doc.data();
    const inst = data.institution;
    if (!inst || inst.trim() === "") return;
    if (knownValues.has(inst)) return;
    if (existingValues.has(inst)) return;

    const tr = data.institutionTranslations || {};
    const entry = {
      he: tr.he || inst,
      en: tr.en || inst,
      ar: tr.ar || inst,
    };

    const key = entry.en || entry.he;
    if (!toAdd.has(key)) {
      toAdd.set(key, entry);
    }
  });

  if (toAdd.size === 0) {
    console.log("Nothing to backfill — all custom institutions are already present.");
    process.exit(0);
  }

  console.log(`Adding ${toAdd.size} custom institution(s):`);
  for (const [key, entry] of toAdd) {
    console.log(`  • ${key} (he: ${entry.he}, ar: ${entry.ar})`);
    await db.collection("customInstitutions").add({
      ...entry,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("Done.");
  process.exit(0);
})().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
