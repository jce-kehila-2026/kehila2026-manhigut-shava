import { useState, useEffect } from "react";
import { useLang } from "./LanguageContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { useTheme } from "./ThemeContext";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

/* ─── Translation ─── */
const AUTH_T = {
  he: {
    loginTab:"כניסה", signupTab:"הרשמה",
    loginH:"ברוכה הבאה", loginSub:"היכנסי לרשת הבוגרות שלך",
    emailLbl:"אימייל", passLbl:"סיסמה",
    rememberMe:"זכרי אותי", forgotPass:"שכחתי סיסמה",
    loginBtn:"כניסה לחשבון →", loginLoading:"מתחברת...",
    noAccount:"עוד לא רשומה?", registerNow:"הרשמי עכשיו",
    googleLogin:"המשכי עם Google", googleSignup:"הרשמי עם Google",
    orEmail:"או המשכי עם אימייל", orEmailSignup:"או הרשמי עם אימייל",
    resetSent:"נשלח אימייל לאיפוס סיסמה ✓",
    step1H:"הרשמה לרשת", step1Sub:"מלאי את הפרטים האישיים שלך",
    firstNameLbl:"שם פרטי *", lastNameLbl:"שם משפחה *",
    phoneLbl:"טלפון *",
    instituteLbl:"מוסד לימודים", institutePh:"בחרי מוסד...",
    profLbl:"מקצוע / תפקיד", profPh:"רופאה, עורכת דין...",
    cityLbl:"עיר מגורים", cityPh:"תל אביב, ירושלים...",
    step2H:"פרטים מקצועיים", step2Sub:"ספרי לנו עליך",
    step3H:"הגדרת סיסמה", step3Sub:"כמעט סיימנו",
    passLbl2:"סיסמה *", passPh:"לפחות 6 תווים",
    confirmPassLbl:"אימות סיסמה *", confirmPassPh:"חזרי על הסיסמה",
    agreeTitle:"מסכימה לשיתוף פרטים בתוך הרשת",
    agreeSub:"שם, מייל ומומחיות יהיו גלויים לבוגרות אחרות. פרטי קשר — רק לאחר אישורך.",
    backBtn:"← חזרה", nextBtn:"המשך →",
    submitBtn:"הרשמה →", submitting:"יוצרת חשבון...",
    alreadyHave:"כבר יש לך חשבון?", loginLink:"כניסה",
    errFill:"מלאי את כל השדות הנדרשים.",
    errEmail:"כתובת אימייל לא תקינה.",
    errPhone:"מספר טלפון לא תקין. השתמשי בפורמט: 05X-XXXXXXX",
    errAgree:"יש לאשר את הסכמת שיתוף הפרטים.",
    errPassMatch:"הסיסמאות אינן תואמות.",
    backHome:"← חזרה לדף הבית",
    passEmailPh:"your@email.com",
    passPh2:"••••••••",
    citySelectPh:"בחרי עיר...",cityOtherPh:"כתבי את עירך",
    profSelectPh:"בחרי מקצוע...",profOtherPh:"כתבי את מקצועך",
    cities:["ירושלים","תל אביב-יפו","חיפה","ראשון לציון","פתח תקווה","נתניה","אשדוד","אשקלון","באר שבע","רחובות","הרצליה","חולון","בת ים","כפר סבא","רמת גן","נס ציונה","עפולה","נצרת","טבריה","חדרה","מודיעין","אחר"],
    professions:["רפואה","משפטים","הנדסה","חינוך","כלכלה ועסקים","פסיכולוגיה","מדעים","פוליטיקה וממשל","תקשורת ועיתונאות","אמנות ועיצוב","עבודה סוציאלית","בריאות הציבור","טכנולוגיה","מינהל ציבורי","שירות ציבורי","סטודנטית","אחר"],
  },
  en: {
    loginTab:"Log In", signupTab:"Sign Up",
    loginH:"Welcome back", loginSub:"Sign in to your BogrotNet account",
    emailLbl:"Email", passLbl:"Password",
    rememberMe:"Remember me", forgotPass:"Forgot password",
    loginBtn:"Sign In →", loginLoading:"Signing in...",
    noAccount:"Not registered yet?", registerNow:"Sign up now",
    googleLogin:"Continue with Google", googleSignup:"Sign up with Google",
    orEmail:"Or continue with email", orEmailSignup:"Or sign up with email",
    resetSent:"Password reset email sent ✓",
    step1H:"Create Account", step1Sub:"Fill in your personal details",
    firstNameLbl:"First Name *", lastNameLbl:"Last Name *",
    phoneLbl:"Phone *",
    instituteLbl:"Institution", institutePh:"Select institution...",
    profLbl:"Profession / Role", profPh:"Doctor, Lawyer, Engineer...",
    cityLbl:"City", cityPh:"Tel Aviv, Jerusalem...",
    step2H:"Professional Details", step2Sub:"Tell us about yourself",
    step3H:"Set Password", step3Sub:"Almost done",
    passLbl2:"Password *", passPh:"At least 6 characters",
    confirmPassLbl:"Confirm Password *", confirmPassPh:"Repeat your password",
    agreeTitle:"Agree to share details within the network",
    agreeSub:"Name, email, and expertise will be visible to other members. Contact details only after your approval.",
    backBtn:"← Back", nextBtn:"Continue →",
    submitBtn:"Register →", submitting:"Creating account...",
    alreadyHave:"Already have an account?", loginLink:"Sign in",
    errFill:"Please fill all required fields.",
    errEmail:"Invalid email address.",
    errPhone:"Invalid phone number. Use format: 05X-XXXXXXX",
    errAgree:"Please agree to share your details.",
    errPassMatch:"Passwords do not match.",
    backHome:"← Back to Home",
    passEmailPh:"your@email.com",
    passPh2:"••••••••",
    citySelectPh:"Select city...",cityOtherPh:"Type your city",
    profSelectPh:"Select profession...",profOtherPh:"Type your profession",
    cities:["Jerusalem","Tel Aviv-Jaffa","Haifa","Rishon LeZion","Petah Tikva","Netanya","Ashdod","Ashkelon","Beer Sheva","Rehovot","Herzliya","Holon","Bat Yam","Kfar Saba","Ramat Gan","Nes Ziona","Afula","Nazareth","Tiberias","Hadera","Modi'in","Other"],
    professions:["Medicine","Law","Engineering","Education","Economics & Business","Psychology","Sciences","Politics & Government","Media & Journalism","Arts & Design","Social Work","Public Health","Technology","Public Administration","Public Service","Student","Other"],
  },
  ar: {
    loginTab:"تسجيل الدخول", signupTab:"إنشاء حساب",
    loginH:"مرحباً بك", loginSub:"سجّلي دخولك إلى شبكة البوگروت",
    emailLbl:"البريد الإلكتروني", passLbl:"كلمة المرور",
    rememberMe:"تذكّريني", forgotPass:"نسيت كلمة المرور",
    loginBtn:"تسجيل الدخول ←", loginLoading:"جارٍ تسجيل الدخول...",
    noAccount:"لم تنضمي بعد؟", registerNow:"سجّلي الآن",
    googleLogin:"الاستمرار بواسطة Google", googleSignup:"التسجيل بواسطة Google",
    orEmail:"أو الاستمرار بالبريد الإلكتروني", orEmailSignup:"أو التسجيل بالبريد",
    resetSent:"تم إرسال رسالة إعادة تعيين كلمة المرور ✓",
    step1H:"إنشاء حساب", step1Sub:"أدخلي بياناتك الشخصية",
    firstNameLbl:"الاسم الأول *", lastNameLbl:"اسم العائلة *",
    phoneLbl:"رقم الهاتف *",
    instituteLbl:"المؤسسة الأكاديمية", institutePh:"اختاري مؤسسة...",
    profLbl:"المهنة / الوظيفة", profPh:"طبيبة، محامية...",
    cityLbl:"المدينة", cityPh:"تل أبيب، القدس...",
    step2H:"التفاصيل المهنية", step2Sub:"أخبرينا عن نفسك",
    step3H:"تعيين كلمة المرور", step3Sub:"اقتربنا من النهاية",
    passLbl2:"كلمة المرور *", passPh:"6 أحرف على الأقل",
    confirmPassLbl:"تأكيد كلمة المرور *", confirmPassPh:"أعيدي إدخال كلمة المرور",
    agreeTitle:"الموافقة على مشاركة البيانات داخل الشبكة",
    agreeSub:"سيكون الاسم والبريد والتخصص مرئيين للعضوات الأخريات. بيانات الاتصال فقط بعد موافقتك.",
    backBtn:"← رجوع", nextBtn:"التالي ←",
    submitBtn:"التسجيل ←", submitting:"جارٍ إنشاء الحساب...",
    alreadyHave:"هل لديك حساب بالفعل؟", loginLink:"تسجيل الدخول",
    errFill:"يرجى ملء جميع الحقول المطلوبة.",
    errEmail:"عنوان البريد الإلكتروني غير صالح.",
    errPhone:"رقم الهاتف غير صالح. استخدمي الصيغة: 05X-XXXXXXX",
    errAgree:"يجب الموافقة على مشاركة بياناتك.",
    errPassMatch:"كلمتا المرور غير متطابقتين.",
    backHome:"← العودة إلى الصفحة الرئيسية",
    passEmailPh:"your@email.com",
    passPh2:"••••••••",
    citySelectPh:"اختاري المدينة...",cityOtherPh:"اكتبي مدينتك",
    profSelectPh:"اختاري المهنة...",profOtherPh:"اكتبي مهنتك",
    cities:["القدس","تل أبيب-يافا","حيفا","ريشون ليتسيون","بتاح تكفا","نتانيا","أشدود","عسقلان","بئر السبع","ريحوفوت","هرتسليا","حولون","بات يام","كفار سابا","رمات غان","نس تسيونا","عفولة","الناصرة","طبريا","حديرا","مودیعین","أخرى"],
    professions:["الطب","القانون","الهندسة","التعليم","الاقتصاد والأعمال","علم النفس","العلوم","السياسة والحكم","الإعلام والصحافة","الفنون والتصميم","الخدمة الاجتماعية","الصحة العامة","التكنولوجيا","الإدارة العامة","الخدمة العامة","طالبة","أخرى"],
  },
};

/* ─── Blue/Coral palette ─── */
const C = {
  brand:     "#4472b8",
  brandSoft: "#6da3d4",
  plum:      "#1d4896",
  plumDeep:  "#111827",
  cream:     "#fdf9f7",
  blush:     "#f0f6fb",
  blushDeep: "#daeaf8",
  ink:       "#111827",
  mute:      "#6b7280",
  line:      "#daeaf8",
  coral:     "#e8735a",
};

function normalizePhone(raw) {
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("0")) s = "+972" + s.slice(1);
  else if (s.startsWith("972") && !s.startsWith("+")) s = "+" + s;
  else if (!s.startsWith("+")) s = "+" + s;
  return s;
}

function firebaseMsg(code) {
  const m = {
    "auth/invalid-credential":   "אימייל או סיסמה שגויים.",
    "auth/user-not-found":       "לא נמצא חשבון עם אימייל זה.",
    "auth/wrong-password":       "סיסמה שגויה.",
    "auth/email-already-in-use": "קיים כבר חשבון עם אימייל זה.",
    "auth/weak-password":        "הסיסמה חייבת לכלול לפחות 6 תווים.",
    "auth/invalid-email":        "כתובת אימייל לא תקינה.",
    "auth/too-many-requests":    "יותר מדי ניסיונות. נסי שוב מאוחר יותר.",
    "auth/popup-closed-by-user": "הכניסה בוטלה.",
  };
  return m[code] || `שגיאה (${code || "unknown"}). נסי שוב.`;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const fontStack = "'Figtree','Outfit',system-ui,-apple-system,sans-serif";

const inp = {
  width:"100%", padding:"0.85rem 1rem", boxSizing:"border-box",
  background:"#fff", border:`1px solid ${C.line}`,
  borderRadius:12, color:C.ink, fontSize:"0.92rem",
  fontFamily:fontStack, fontWeight:500, outline:"none",
  transition:"border-color 0.2s,box-shadow 0.2s",
};
const lbl = {
  display:"block", color:C.mute,
  fontSize:"0.74rem", fontWeight:600, marginBottom:"0.45rem",
  letterSpacing:"0.02em",
};
const primaryBtn = {
  width:"100%", padding:"0.9rem",
  background:C.brand, color:"#fff",
  border:"none", borderRadius:12,
  fontSize:"0.94rem", fontWeight:600, cursor:"pointer",
  fontFamily:fontStack, letterSpacing:"0.01em",
  boxShadow:`0 6px 20px rgba(68,114,184,0.35)`,
  transition:"transform 0.2s,box-shadow 0.2s,background 0.2s",
  marginBottom:"0.9rem",
};
const ghostBtn = {
  width:"100%", padding:"0.85rem",
  background:"#fff", color:C.ink,
  border:`1px solid ${C.line}`, borderRadius:12,
  fontSize:"0.88rem", fontWeight:500, cursor:"pointer",
  fontFamily:fontStack, transition:"background 0.2s,border-color 0.2s",
  marginBottom:"0.9rem",
};
const errBox = {
  background:"#fbeaea", border:"1px solid #e9c4c4",
  borderRadius:10, padding:"0.7rem 0.95rem", marginBottom:"1rem",
  fontSize:"0.82rem", color:"#9b2c3a", fontWeight:500,
};
const okBox = {
  background:"#eaf5ee", border:"1px solid #c5dfcd",
  borderRadius:10, padding:"0.7rem 0.95rem", marginBottom:"1rem",
  fontSize:"0.82rem", color:"#2f6b48", fontWeight:500,
};

function focusOn(e)  { e.target.style.borderColor=C.brand; e.target.style.boxShadow=`0 0 0 3px rgba(68,114,184,0.18)`; }
function focusOff(e) { e.target.style.borderColor=C.line;  e.target.style.boxShadow="none"; }

function Fld({ label, children }) {
  return (
    <div style={{ marginBottom:"0.95rem" }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

function GoogleButton({ label, Tr }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const handle = async () => {
    setLoading(true); setError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };
  return (
    <>
      {error && <div style={errBox}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{
        ...ghostBtn, display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      }}
        onMouseOver={e=>{ e.currentTarget.style.background=C.blush; e.currentTarget.style.borderColor=C.blushDeep; }}
        onMouseOut={e =>{  e.currentTarget.style.background="#fff";  e.currentTarget.style.borderColor=C.line; }}
      >
        <GoogleIcon/> {loading ? "מתחבר..." : label}
      </button>
    </>
  );
}

function LoginForm({ onSwitchTab, Tr, dir }) {
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError]       = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading]   = useState(false);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await signInWithEmailAndPassword(auth, form.email, form.password); }
    catch (e) { setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };

  const forgot = async () => {
    if (!form.email) { setError("הכניסי אימייל למעלה לפני איפוס הסיסמה."); return; }
    try { await sendPasswordResetEmail(auth, form.email); setResetSent(true); setError(""); }
    catch (e) { setError(firebaseMsg(e.code)); }
  };

  return (
    <form onSubmit={submit} style={{ direction:dir||"rtl" }} autoComplete="off">
      <h1 style={{
        fontFamily:"'Outfit',system-ui,sans-serif",
        fontSize:"1.7rem", fontWeight:600, color:C.plum,
        marginBottom:"0.35rem", letterSpacing:"-0.01em",
      }}>{Tr?.loginH||"ברוכה הבאה"}</h1>
      <p style={{ color:C.mute, fontSize:"0.86rem", marginBottom:"1.6rem", fontWeight:400 }}>
        {Tr?.loginSub||"היכנסי לרשת הבוגרות שלך"}
      </p>
      {error    && <div style={errBox}>{error}</div>}
      {resetSent && <div style={okBox}>{Tr?.resetSent||"נשלח אימייל לאיפוס סיסמה ✓"}</div>}
      <Fld label={Tr?.emailLbl||"אימייל"}>
        <input style={inp} type="email" name="email" placeholder={Tr?.passEmailPh||"your@email.com"} dir="ltr"
          value={form.email} onChange={set} required autoComplete="off"
          onFocus={focusOn} onBlur={focusOff}/>
      </Fld>
      <Fld label={Tr?.passLbl||"סיסמה"}>
        <input style={inp} type="password" name="password" placeholder={Tr?.passPh2||"••••••••"} dir="ltr"
          value={form.password} onChange={set} required autoComplete="new-password"
          onFocus={focusOn} onBlur={focusOff}/>
      </Fld>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.4rem" }}>
        <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", color:C.mute, fontSize:"0.8rem", cursor:"pointer" }}>
          <input type="checkbox" style={{ accentColor:C.brand }}/> {Tr?.rememberMe||"זכרי אותי"}
        </label>
        <button type="button" onClick={forgot} style={{ background:"none", border:"none", color:C.brand, fontSize:"0.8rem", fontWeight:600, cursor:"pointer" }}>
          {Tr?.forgotPass||"שכחתי סיסמה"}
        </button>
      </div>
      <button type="submit" disabled={loading} style={primaryBtn}
        onMouseOver={e=>{ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.background=C.brandSoft; }}
        onMouseOut={e =>{ e.currentTarget.style.transform=""; e.currentTarget.style.background=C.brand; }}
      >{loading ? (Tr?.loginLoading||"מתחברת...") : (Tr?.loginBtn||"כניסה לחשבון →")}</button>
      <p style={{ textAlign:"center", color:C.mute, fontSize:"0.8rem", margin:0 }}>
        {Tr?.noAccount||"עוד לא רשומה?"}{" "}
        <button type="button" onClick={()=>onSwitchTab("signup")} style={{ background:"none", border:"none", color:C.brand, fontWeight:600, cursor:"pointer", fontSize:"0.8rem" }}>
          {Tr?.registerNow||"הרשמי עכשיו"}
        </button>
      </p>
    </form>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+972|972|0)[5-9]\d{8}$|^(\+972|972|0)[5-9]\d{1}-?\d{7}$/;
function validPhone(raw) {
  const s = raw.replace(/[\s\-().]/g,"");
  return PHONE_RE.test(s);
}

function SignUpForm({ onSwitchTab, Tr, dir }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName:"", lastName:"", email:"", phone:"",
    institution:"", profession:"", professionOther:"",
    city:"", cityOther:"",
    password:"", confirmPassword:"",
  });
  const [agreed, setAgreed]   = useState(false);
  const [agreeErr, setAgreeErr] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email:false, phone:false });

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const touch = field => () => setTouched(p => ({ ...p, [field]: true }));

  const emailErr = touched.email && form.email && !EMAIL_RE.test(form.email)
    ? (Tr?.errEmail || "כתובת אימייל לא תקינה.") : "";
  const phoneErr = touched.phone && form.phone && !validPhone(form.phone)
    ? (Tr?.errPhone || "מספר טלפון לא תקין.") : "";

  const errStyle = name => ({
    ...inputStyle(name),
    ...(
      (name==="email" && emailErr) || (name==="phone" && phoneErr)
        ? { borderColor:"#e9415b", boxShadow:"0 0 0 3px rgba(233,65,91,0.14)" }
        : {}
    ),
  });

  const InlineErr = ({ msg }) => msg
    ? <p style={{ color:"#e9415b", fontSize:"0.73rem", marginTop:"0.3rem", marginBottom:0, direction:"ltr", textAlign:"left", fontWeight:500 }}>{msg}</p>
    : null;

  const effectiveCity       = form.city==="אחר"||form.city==="Other"||form.city==="أخرى" ? form.cityOther : form.city;
  const effectiveProfession = form.profession==="אחר"||form.profession==="Other"||form.profession==="أخرى" ? form.professionOther : form.profession;

  const submit = async () => {
    if (!agreed)  { setAgreeErr(true); setError(Tr?.errAgree||"יש לאשר את הסכמת שיתוף הפרטים."); return; }
    setAgreeErr(false);
    if (form.password !== form.confirmPassword) { setError(Tr?.errPassMatch||"הסיסמאות אינן תואמות."); return; }
    setError(""); setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", user.uid), {
        firstName:form.firstName, lastName:form.lastName,
        phone:normalizePhone(form.phone), email:form.email,
        institution:form.institution,
        profession:effectiveProfession, city:effectiveCity,
        emailVerified:false, acceptedTerms:true, createdAt:new Date().toISOString(),
      });
    } catch (e) { setError(firebaseMsg(e.code)); }
    finally { setLoading(false); }
  };

  const progressBar = (
    <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1.8rem" }}>
      {[1,2,3].map(n=>(
        <div key={n} style={{
          flex:1, height:3, borderRadius:99,
          background:n<=step ? C.brand : C.line,
          transition:"background 0.3s",
        }}/>
      ))}
    </div>
  );

  const inputStyle = name => ({
    ...inp,
    ...(["email","phone","password","confirmPassword"].includes(name) ? { direction:"ltr", textAlign:"left" } : {}),
  });

  const heading = { fontFamily:"'Outfit',system-ui,sans-serif", fontSize:"1.65rem", fontWeight:600, color:C.plum, marginBottom:"0.35rem", letterSpacing:"-0.01em" };
  const sub     = { color:C.mute, fontSize:"0.85rem", marginBottom:"1.6rem", fontWeight:400 };

  return (
    <div style={{ direction:dir||"rtl" }}>
      {progressBar}

      {step===1 && (
        <>
          <h2 style={heading}>{Tr?.step1H||"הרשמה לרשת"}</h2>
          <p style={sub}>{Tr?.step1Sub||"מלאי את הפרטים האישיים שלך"}</p>
          {error && <div style={errBox}>{error}</div>}
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"0.7rem" }}>
            <Fld label={Tr?.firstNameLbl||"שם פרטי *"}>
              <input style={inputStyle("firstName")} name="firstName" value={form.firstName} onChange={set} placeholder="שם" required onFocus={focusOn} onBlur={focusOff}/>
            </Fld>
            <Fld label={Tr?.lastNameLbl||"שם משפחה *"}>
              <input style={inputStyle("lastName")} name="lastName" value={form.lastName} onChange={set} placeholder="משפחה" required onFocus={focusOn} onBlur={focusOff}/>
            </Fld>
          </div>
          <Fld label={Tr?.emailLbl||"אימייל *"}>
            <input
              style={errStyle("email")} type="email" name="email"
              value={form.email} onChange={set} placeholder="your@email.com"
              required dir="ltr"
              onFocus={focusOn}
              onBlur={e => { focusOff(e); touch("email")(); }}
            />
            <InlineErr msg={emailErr}/>
          </Fld>
          <Fld label={Tr?.phoneLbl||"טלפון *"}>
            <input
              style={errStyle("phone")} type="tel" name="phone"
              value={form.phone} onChange={set} placeholder="05X-XXXXXXX"
              required dir="ltr"
              onFocus={focusOn}
              onBlur={e => { focusOff(e); touch("phone")(); }}
            />
            <InlineErr msg={phoneErr}/>
          </Fld>
          <button style={primaryBtn} onClick={()=>{
            setTouched({ email:true, phone:true });
            if (!form.firstName||!form.lastName||!form.email||!form.phone) { setError(Tr?.errFill||"מלאי את כל השדות הנדרשים."); return; }
            if (!EMAIL_RE.test(form.email)) { setError(Tr?.errEmail||"כתובת אימייל לא תקינה."); return; }
            if (!validPhone(form.phone)) { setError(Tr?.errPhone||"מספר טלפון לא תקין."); return; }
            setError(""); setStep(2);
          }}>{Tr?.nextBtn||"המשך →"}</button>
          <p style={{ textAlign:"center", color:C.mute, fontSize:"0.8rem", margin:0 }}>
            {Tr?.alreadyHave||"כבר יש לך חשבון?"}{" "}
            <button type="button" onClick={()=>onSwitchTab("login")} style={{ background:"none", border:"none", color:C.brand, fontWeight:600, cursor:"pointer", fontSize:"0.8rem" }}>{Tr?.loginLink||"כניסה"}</button>
          </p>
        </>
      )}

      {step===2 && (
        <>
          <h2 style={heading}>{Tr?.step2H||"פרטים מקצועיים"}</h2>
          <p style={sub}>{Tr?.step2Sub||"ספרי לנו עליך"}</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label={Tr?.instituteLbl||"מוסד לימודים"}>
            <select style={{ ...inp, color:form.institution?C.ink:C.mute }} name="institution" value={form.institution} onChange={set} onFocus={focusOn} onBlur={focusOff}>
              <option value="">{Tr?.institutePh||"בחרי מוסד..."}</option>
              {["אוניברסיטת תל-אביב","האוניברסיטה העברית בירושלים","אוניברסיטת חיפה","בר אילן","אוניברסיטת בן-גוריון","מכללות ירושלים","אחר"].map(o=>(
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Fld>
          <Fld label={Tr?.profLbl||"מקצוע / תפקיד"}>
            <select style={{...inp,color:form.profession?C.ink:C.mute}} name="profession" value={form.profession} onChange={set} onFocus={focusOn} onBlur={focusOff}>
              <option value="">{Tr?.profSelectPh||"בחרי מקצוע..."}</option>
              {(Tr?.professions||[]).map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            {(form.profession==="אחר"||form.profession==="Other"||form.profession==="أخرى")&&(
              <input style={{...inputStyle("professionOther"),marginTop:6}} name="professionOther" value={form.professionOther} onChange={set}
                placeholder={Tr?.profOtherPh||"כתבי את מקצועך"} onFocus={focusOn} onBlur={focusOff}/>
            )}
          </Fld>
          <Fld label={Tr?.cityLbl||"עיר מגורים"}>
            <select style={{...inp,color:form.city?C.ink:C.mute}} name="city" value={form.city} onChange={set} onFocus={focusOn} onBlur={focusOff}>
              <option value="">{Tr?.citySelectPh||"בחרי עיר..."}</option>
              {(Tr?.cities||[]).map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            {(form.city==="אחר"||form.city==="Other"||form.city==="أخرى")&&(
              <input style={{...inputStyle("cityOther"),marginTop:6}} name="cityOther" value={form.cityOther} onChange={set}
                placeholder={Tr?.cityOtherPh||"כתבי את עירך"} onFocus={focusOn} onBlur={focusOff}/>
            )}
          </Fld>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap:"0.6rem" }}>
            <button style={{ ...ghostBtn, margin:0 }} onClick={()=>setStep(1)}>{Tr?.backBtn||"← חזרה"}</button>
            <button style={{ ...primaryBtn, margin:0 }} onClick={()=>{ setError(""); setStep(3); }}>{Tr?.nextBtn||"המשך →"}</button>
          </div>
        </>
      )}

      {step===3 && (
        <>
          <h2 style={heading}>{Tr?.step3H||"הגדרת סיסמה"}</h2>
          <p style={sub}>{Tr?.step3Sub||"כמעט סיימנו"}</p>
          {error && <div style={errBox}>{error}</div>}
          <Fld label={Tr?.passLbl2||"סיסמה *"}>
            <input style={inputStyle("password")} type="password" name="password" value={form.password} onChange={set} placeholder={Tr?.passPh||"לפחות 6 תווים"} required onFocus={focusOn} onBlur={focusOff}/>
          </Fld>
          <Fld label={Tr?.confirmPassLbl||"אימות סיסמה *"}>
            <input style={inputStyle("confirmPassword")} type="password" name="confirmPassword" value={form.confirmPassword} onChange={set} placeholder={Tr?.confirmPassPh||"חזרי על הסיסמה"} required onFocus={focusOn} onBlur={focusOff}/>
          </Fld>
          <div style={{
            display:"flex", gap:"0.75rem", alignItems:"flex-start",
            background: agreeErr ? "rgba(233,65,91,0.06)" : C.blush,
            border: agreeErr ? "1px solid #e9415b" : `1px solid ${C.line}`,
            borderRadius:12, padding:"0.95rem", marginBottom:"1.1rem",
            transition:"border-color 0.2s, background 0.2s",
          }}>
            <div onClick={()=>{ setAgreed(!agreed); setAgreeErr(false); }} style={{
              width:36, height:20, flexShrink:0,
              background:agreed ? C.brand : "#d0d8e4",
              borderRadius:99, position:"relative", cursor:"pointer",
              transition:"background 0.2s", marginTop:2,
            }}>
              <div style={{
                position:"absolute", width:14, height:14, background:"#fff",
                borderRadius:"50%", top:3,
                right:agreed?3:"auto", left:agreed?"auto":3,
                transition:"all 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.18)",
              }}/>
            </div>
            <div style={{ color:C.ink, fontSize:"0.78rem", lineHeight:1.6 }}>
              <strong style={{ color:C.plum, fontWeight:600 }}>{Tr?.agreeTitle||"מסכימה לשיתוף פרטים בתוך הרשת"}</strong><br/>
              <span style={{ color:C.mute }}>{Tr?.agreeSub||"שם, מייל ומומחיות יהיו גלויים לבוגרות אחרות. פרטי קשר — רק לאחר אישורך."}</span>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap:"0.6rem" }}>
            <button style={{ ...ghostBtn, margin:0 }} onClick={()=>setStep(2)}>{Tr?.backBtn||"← חזרה"}</button>
            <button style={{ ...primaryBtn, margin:0 }} disabled={loading} onClick={submit}>
              {loading ? (Tr?.submitting||"יוצרת חשבון...") : (Tr?.submitBtn||"הרשמה →")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── MAIN ─── */
export default function AuthPage({ onBack }) {
  const [tab, setTab] = useState("login");
  const { lang, isRTL, setLang } = useLang();
  const { dark, toggleTheme } = useTheme();
  const Tr = AUTH_T[lang] || AUTH_T.he;
  const dir = isRTL ? "rtl" : "ltr";
  const isMobile = useIsMobile();

  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height   = "auto";
    document.documentElement.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) { root.style.height = "auto"; root.style.overflow = "visible"; }
    return () => {
      document.body.style.overflow = "";
      document.body.style.height   = "";
      document.documentElement.style.overflow = "";
      if (root) { root.style.height = ""; root.style.overflow = ""; }
    };
  }, []);

  return (
    <div style={{
      minHeight:"100vh", position:"relative",
      fontFamily:fontStack,
    }}>
      {/* Background — group photo with overlay, pointer-events:none so they don't capture scroll on iOS */}
      <div style={{
        position:"fixed", inset:0, zIndex:0,
        backgroundImage:"url('/background.jpg')",
        backgroundSize:"cover", backgroundPosition:"center",
        pointerEvents:"none",
      }}/>
      <div style={{
        position:"fixed", inset:0, zIndex:1,
        background:"linear-gradient(135deg,rgba(29,72,150,0.82) 0%,rgba(68,114,184,0.70) 50%,rgba(232,115,90,0.35) 100%)",
        pointerEvents:"none",
      }}/>

      {/* Top bar */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:10,
        padding:"1.3rem 2.5rem", display:"flex",
        alignItems:"center", justifyContent:"space-between",
        direction:"rtl",
        background:"rgba(29,72,150,0.35)",
        backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <img src="/NewLogoNGO.png"
            onError={e=>{ e.target.style.display="none"; }}
            alt="BogrotNet"
            style={{ width:38, height:38, objectFit:"contain", borderRadius:"50%",
              background:"rgba(255,255,255,0.12)", padding:4,
              border:"2px solid rgba(255,255,255,0.4)" }}
          />
          <div>
            <div style={{
              fontFamily:"'Outfit',system-ui,sans-serif",
              fontSize:"1.1rem", fontWeight:800, color:"#ffffff",
              letterSpacing:"-0.01em",
            }}>BogrotNet</div>
            <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", fontWeight:500 }}>
              רשת בוגרות · מנהיגות שווה
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} title={dark?"Switch to light":"Switch to dark"} style={{
            width:32,height:32,borderRadius:"50%",
            background:"rgba(255,255,255,0.15)",
            border:"1px solid rgba(255,255,255,0.3)",
            color:"#fff",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,transition:"all 0.18s",
          }}>
            {dark
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          {/* Language switcher */}
          <div style={{display:"flex",gap:4}}>
            {["he","en","ar"].map(code=>(
              <button key={code} onClick={()=>setLang(code)} style={{
                padding:"4px 10px",borderRadius:999,border:"none",
                background:lang===code?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.15)",
                color:lang===code?"#1d4896":"#fff",
                fontSize:11,fontWeight:700,cursor:"pointer",
                transition:"all 0.18s",textTransform:"uppercase",
                letterSpacing:"0.05em",
              }}>{code}</button>
            ))}
          </div>
          {onBack && (
            <button onClick={onBack} style={{
              background:"rgba(255,255,255,0.15)",
              border:"1px solid rgba(255,255,255,0.35)",
              color:"#fff", borderRadius:99,
              padding:"8px 18px", fontSize:"0.82rem",
              fontWeight:500, cursor:"pointer",
              fontFamily:fontStack,
              backdropFilter:"blur(8px)",
              transition:"background 0.2s",
            }}
              onMouseOver={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.28)"; }}
              onMouseOut={e =>{ e.currentTarget.style.background="rgba(255,255,255,0.15)"; }}
            >
              {Tr.backHome}
            </button>
          )}
        </div>
      </div>

      {/* Card — fixed-height scroll container so overflowY:auto actually triggers */}
      <div style={{
        position:"relative", zIndex:5,
        height:"100dvh", display:"flex", alignItems:"flex-start", justifyContent:"center",
        padding:"6rem 1rem 5rem",
        overflowY:"auto", overflowX:"hidden",
        WebkitOverflowScrolling:"touch",
      }}>
        <div style={{
          width:"100%", maxWidth:420,
          background:"rgba(255,255,255,0.97)",
          border:"1px solid rgba(218,234,248,0.6)",
          borderRadius:24, padding: isMobile ? "1.5rem 1.25rem" : "2.5rem",
          boxShadow:"0 32px 80px rgba(29,72,150,0.28),0 4px 16px rgba(0,0,0,0.08)",
          animation:"cardUp 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        }}>
          {/* Tabs */}
          <div style={{
            display:"flex", background:C.blush,
            borderRadius:99, padding:4, marginBottom:"1.8rem",
            direction:dir,
          }}>
            {[["login",Tr.loginTab],["signup",Tr.signupTab]].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={{
                flex:1, padding:"0.55rem", borderRadius:99, border:"none",
                background:tab===key?"#fff":"transparent",
                color:tab===key?C.plum:C.mute,
                fontFamily:fontStack,
                fontSize:"0.86rem", fontWeight:600, cursor:"pointer",
                boxShadow:tab===key?"0 2px 8px rgba(68,114,184,0.12)":"none",
                transition:"all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          {tab==="login" ? (
            <>
              <GoogleButton label={Tr.googleLogin} Tr={Tr}/>
              <div style={{ display:"flex", alignItems:"center", gap:14, margin:"1.3rem 0" }}>
                <div style={{ flex:1, height:1, background:C.line }}/>
                <span style={{ fontSize:"0.74rem", color:C.mute, fontWeight:500 }}>{Tr.orEmail}</span>
                <div style={{ flex:1, height:1, background:C.line }}/>
              </div>
              <LoginForm onSwitchTab={setTab} Tr={Tr} dir={dir}/>
            </>
          ) : (
            <>
              <GoogleButton label={Tr.googleSignup} Tr={Tr}/>
              <div style={{ display:"flex", alignItems:"center", gap:14, margin:"1.3rem 0" }}>
                <div style={{ flex:1, height:1, background:C.line }}/>
                <span style={{ fontSize:"0.74rem", color:C.mute, fontWeight:500 }}>{Tr.orEmailSignup}</span>
                <div style={{ flex:1, height:1, background:C.line }}/>
              </div>
              <SignUpForm onSwitchTab={setTab} Tr={Tr} dir={dir}/>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cardUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color:${C.mute} !important; opacity:0.7; }
        select option { background:#fff; }
      `}</style>
    </div>
  );
}
