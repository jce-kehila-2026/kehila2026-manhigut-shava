/*
 * Parallel arrays — same index = same place/profession in all 3 languages.
 * These mirror AUTH_T.{lang}.cities / professions in AuthPage.jsx and
 * t.profile.regionOptions in LanguageContext.jsx.
 */

const CITIES_BY_LANG = {
  he: ["ירושלים","תל אביב-יפו","חיפה","ראשון לציון","פתח תקווה","נתניה","אשדוד","אשקלון","באר שבע","רחובות","הרצליה","חולון","בת ים","כפר סבא","רמת גן","נס ציונה","עפולה","נצרת","טבריה","חדרה","מודיעין","אחר"],
  en: ["Jerusalem","Tel Aviv-Jaffa","Haifa","Rishon LeZion","Petah Tikva","Netanya","Ashdod","Ashkelon","Beer Sheva","Rehovot","Herzliya","Holon","Bat Yam","Kfar Saba","Ramat Gan","Nes Ziona","Afula","Nazareth","Tiberias","Hadera","Modi'in","Other"],
  ar: ["القدس","تل أبيب-يافا","حيفا","ريشون ليتسيون","بتاح تكفا","نتانيا","أشدود","عسقلان","بئر السبع","ريحوفوت","هرتسليا","حولون","بات يام","كفار سابا","رمات غان","نس تسيونا","عفولة","الناصرة","طبريا","حديرا","مودیعین","أخرى"],
};

export const INSTITUTIONS_BY_LANG = {
  he: ["אוניברסיטת תל אביב","האוניברסיטה העברית","הטכניון","אוניברסיטת חיפה","אוניברסיטת בן גוריון","אוניברסיטת בר אילן","המכון הבינתחומי הרצליה (IDC)","מכללת אריאל","האקדמית אשקלון","הקריה האקדמית אונו","מכללת ספיר","מכללת תל חי","מכללת כנרת","מכללת אחוה","מכללת רופין","מכללת עמק יזרעאל"],
  en: ["Tel Aviv University","Hebrew University","Technion","University of Haifa","Ben-Gurion University","Bar-Ilan University","Reichman University (IDC)","Ariel University","Ashkelon Academic College","Ono Academic College","Sapir College","Tel-Hai College","Kinneret College","Achva Academic College","Ruppin Academic Center","Jezreel Valley College"],
  ar: ["جامعة تل أبيب","الجامعة العبرية","التخنيون","جامعة حيفا","جامعة بن غوريون","جامعة بار إيلان","جامعة رايخمان (IDC)","جامعة أريئيل","الكلية الأكاديمية عسقلان","الكلية الأكاديمية أونو","كلية سابير","كلية تل حاي","كلية كنيرت","كلية أحفاء الأكاديمية","المركز الأكاديمي روبين","كلية وادي يزرعيل"],
};

export const PROFESSIONS_BY_LANG = {
  he: ["רפואה","משפטים","הנדסה","חינוך","כלכלה ועסקים","פסיכולוגיה","מדעים","פוליטיקה וממשל","תקשורת ועיתונאות","אמנות ועיצוב","עבודה סוציאלית","בריאות הציבור","טכנולוגיה","מינהל ציבורי","שירות ציבורי","סטודנטית","אחר"],
  en: ["Medicine","Law","Engineering","Education","Economics & Business","Psychology","Sciences","Politics & Government","Media & Journalism","Arts & Design","Social Work","Public Health","Technology","Public Administration","Public Service","Student","Other"],
  ar: ["الطب","القانون","الهندسة","التعليم","الاقتصاد والأعمال","علم النفس","العلوم","السياسة والحكم","الإعلام والصحافة","الفنون والتصميم","الخدمة الاجتماعية","الصحة العامة","التكنولوجيا","الإدارة العامة","الخدمة العامة","طالبة","أخرى"],
};

export const REGIONS_BY_LANG = {
  he: ["צפון","גליל","עמקים","חיפה","מרכז והשרון","גוש דן","תל אביב","ירושלים","שפלה","דרום","נגב","חוץ לארץ"],
  en: ["North","Galilee","Valleys (Emek)","Haifa","Center & Sharon","Gush Dan","Tel Aviv","Jerusalem","Shephelah","South","Negev","Overseas"],
  ar: ["الشمال","الجليل","الأودية","حيفا","الوسط والشارون","غوش دان","تل أبيب","القدس","السفيلة","الجنوب","النقب","خارج البلاد"],
};

const RELIGION_BY_LANG = {
  he: ["יהודייה-חילונית","יהודייה-מסורתית","יהודייה-דתית","יהודייה-חרדית","מוסלמית","נוצרית","דרוזית","אחר"],
  en: ["Secular Jewish","Traditional Jewish","Religious Jewish","Ultra-Orthodox","Muslim","Christian","Druze","Other"],
  ar: ["يهودية علمانية","يهودية تقليدية","يهودية دينية","حريدية","مسلمة","مسيحية","درزية","أخرى"],
};

const ETHNICITY_BY_LANG = {
  he: ["יהודייה","ערבייה","דרוזית","בדואית","צ'רקסית","מעורב","אחר"],
  en: ["Jewish","Arab","Druze","Bedouin","Circassian","Mixed","Other"],
  ar: ["يهودية","عربية","درزية","بدوية","شركسية","مختلطة","أخرى"],
};

/* Build a single reverse-lookup map: stored-value → index, per table */
function buildReverseMap(table) {
  const map = {};
  for (const lang of ["he", "en", "ar"]) {
    (table[lang] || []).forEach((v, i) => {
      if (v) map[v] = i;
    });
  }
  return map;
}

const CITY_IDX        = buildReverseMap(CITIES_BY_LANG);
const PROFESSION_IDX  = buildReverseMap(PROFESSIONS_BY_LANG);
const INSTITUTION_IDX = buildReverseMap(INSTITUTIONS_BY_LANG);
const REGION_IDX      = buildReverseMap(REGIONS_BY_LANG);
const RELIGION_IDX    = buildReverseMap(RELIGION_BY_LANG);
const ETHNICITY_IDX   = buildReverseMap(ETHNICITY_BY_LANG);

function translate(table, reverseMap, value, targetLang) {
  if (!value) return value;
  const idx = reverseMap[value];
  if (idx === undefined) return value; // custom free-text — return as-is
  return table[targetLang]?.[idx] ?? value;
}

export const translateCity        = (value, lang) => translate(CITIES_BY_LANG,       CITY_IDX,        value, lang);
export const translateProfession  = (value, lang) => translate(PROFESSIONS_BY_LANG,  PROFESSION_IDX,  value, lang);
export const translateInstitution = (value, lang) => translate(INSTITUTIONS_BY_LANG, INSTITUTION_IDX, value, lang);
export const translateRegion      = (value, lang) => translate(REGIONS_BY_LANG,      REGION_IDX,      value, lang);
export const translateReligion    = (value, lang) => translate(RELIGION_BY_LANG,     RELIGION_IDX,    value, lang);
export const translateEthnicity   = (value, lang) => translate(ETHNICITY_BY_LANG,    ETHNICITY_IDX,   value, lang);

/*
 * Translate a single location value against both city and region tables.
 * The naive `translateCity(v) || translateRegion(v)` breaks because translateCity
 * returns the original string (truthy) when not found, so || never reaches
 * translateRegion. We compare the result to detect a real translation.
 */
export function translateAny(value, lang) {
  if (!value) return value;
  const fromCity = translateCity(value, lang);
  if (fromCity !== value) return fromCity;
  const fromRegion = translateRegion(value, lang);
  if (fromRegion !== value) return fromRegion;
  return value;
}

/* Convenience: translate whichever of region or city is set, preferring region */
export const translateLocation = (region, city, lang) => {
  if (region) return translateAny(region, lang);
  if (city)   return translateAny(city, lang);
  return "";
};
