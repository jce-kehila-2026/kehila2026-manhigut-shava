import { useState, useCallback } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { saveContact } from "./contact";
import { safeUrl } from "./utils/safeUrl";

/* ── Palette (matches blue/coral theme) ── */
const C = {
  blue:"#4472b8", blueD:"#1d4896", blueL:"#6da3d4", bluePale:"#daeaf8",
  coral:"#e8735a", coralD:"#c4503a",
  ink:"#111827", inkMid:"#374151", inkLight:"#6b7280",
  white:"#ffffff", bg:"#fdf9f7",
};

/* ── Shared styles ── */
const inp = (focused) => ({
  width:"100%", padding:"0.75rem 1rem", boxSizing:"border-box",
  background:"rgba(255,255,255,0.94)",
  border:`1.5px solid ${focused?C.blue:"rgba(68,114,184,0.25)"}`,
  borderRadius:10, color:C.ink, fontSize:"0.88rem",
  fontFamily:"'Figtree','Heebo',system-ui,sans-serif",
  outline:"none", transition:"border-color 0.18s,box-shadow 0.18s",
  boxShadow: focused?"0 0 0 3px rgba(68,114,184,0.14)":"none",
  direction:"rtl",
});

const lbl = {
  display:"block", color:C.inkMid,
  fontSize:"0.75rem", fontWeight:700, marginBottom:"0.32rem",
  letterSpacing:"0.03em",
};

const primaryBtn = (loading) => ({
  width:"100%", padding:"0.85rem",
  background: loading
    ? "rgba(68,114,184,0.5)"
    : `linear-gradient(135deg,${C.blue},${C.blueD})`,
  color:"#fff", border:"none", borderRadius:12,
  fontSize:"0.95rem", fontWeight:800, cursor: loading?"not-allowed":"pointer",
  fontFamily:"'Figtree','Heebo',system-ui,sans-serif",
  boxShadow: loading?"none":"0 4px 18px rgba(68,114,184,0.38)",
  transition:"transform 0.2s,box-shadow 0.2s",
  marginBottom:"0.5rem",
});

/* ── Step data ── */
const TOTAL_STEPS = 4;

const REGIONS = ["צפון","גליל","עמקים","חיפה","מרכז והשרון","גוש דן","תל אביב","ירושלים","שפלה","דרום","נגב","חוץ לארץ"];

const RELIGIOUS_IDS = [
  "יהודייה","ערבייה מוסלמית","ערבייה נוצריה","דרוזית",
  "נוצרייה (שאינה ערבייה)","חסרת סיווג דתי / ללא שיוך דתי",
  "הגדרה עצמית אחרת","מעדיפה לא לענות",
];

const COMMUNITY_IDS = [
  "הקהילה האתיופית","יוצאת ברית המועצות (גם אם נולדת בארץ)",
  "בדואית","הודית","צ'רקסית","חרדית",
  "יוצאת בשאלה","מעדיפה לא לענות",
];

const CAMPUSES = [
  "אוניברסיטת תל אביב","אוניברסיטת בן גוריון בנגב",
  "האוניברסיטה העברית בירושלים","אוניברסיטת בר אילן",
  "אוניברסיטת חיפה","המכללה האקדמית בית ברל",
  "אוניברסיטת רייכמן","המכללה למנהל","מכללת אורנים",
  "הקרייה האקדמית אונו","מכללת תל חי","מכללת ספיר",
  "האוניברסיטה הפתוחה","פוליטיקאיות צעירות אונליין / התוכנית המקוונת",
];

const SECTORS = [
  "המגזר הציבורי (משרדי ממשלה, רשויות מקומיות, מערכת החינוך, מערכת הבריאות הציבורית וכדומה)",
  "המגזר העסקי / הפרטי",
  'המגזר השלישי (עמותות, מלכ"רים, ארגונים חברתיים)',
  "עצמאי/ת או בעל/ת עסק",
];

const HELP_AREAS = [
  "קידום קריירה ותעסוקה - הכנה לראיונות עבודה",
  "פיתוח מנהיגות וניהול - חיזוק האסרטיביות והביטחון העצמי",
  "ניהול צוותים","ניהול פרויקטים",
  "חיבור לאנשי/נשות מפתח במגזר הציבורי",
  "חיבור לאנשי/נשות מפתח במגזר הפרטי",
  "הובלת מאבקים אזרחיים","יזמות עסקית וחברתית",
  "איזון בין קריירה, משפחה, אימהות וכל הג'אז הזה",
  "קידום עצמי ברשתות החברתיות, לינקדאין",
  "ניהול קמפיינים פוליטיים",
  "התמודדות לתפקידים פוליטיים וציבוריים",
  "עבודה במגזר הציבורי - מאחורי הקלעים, מכרזים וכו'",
  "ניהול פיננסי נכון, השקעות",
  "אוזן קשבת למי שצריכה בכל תחום",
];

/* ── Input with focus state ── */
function Input({ name, type="text", value, onChange, placeholder, required, dir }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{...inp(focused), direction:dir||"rtl"}}
      type={type} name={name} value={value} onChange={onChange}
      placeholder={placeholder} required={required}
      onFocus={()=>setFocused(true)}
      onBlur={()=>setFocused(false)}
    />
  );
}

function Textarea({ name, value, onChange, placeholder, rows=4 }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      style={{...inp(focused), resize:"vertical", lineHeight:1.6}}
      name={name} value={value} onChange={onChange}
      placeholder={placeholder} rows={rows}
      onFocus={()=>setFocused(true)}
      onBlur={()=>setFocused(false)}
    />
  );
}

function Select({ name, value, onChange, children, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      style={{...inp(focused), cursor:"pointer"}}
      name={name} value={value} onChange={onChange}
      required={required}
      onFocus={()=>setFocused(true)}
      onBlur={()=>setFocused(false)}
    >{children}</select>
  );
}

function Fld({ label, required, children, note }) {
  return (
    <div style={{marginBottom:"0.85rem"}}>
      <label style={lbl}>{label}{required&&<span style={{color:C.coral,marginRight:2}}>*</span>}</label>
      {children}
      {note&&<p style={{fontSize:11,color:C.inkLight,marginTop:3,lineHeight:1.45}}>{note}</p>}
    </div>
  );
}

function CheckGroup({ options, values, onChange, name }) {
  const toggle = (opt) => {
    const next = values.includes(opt) ? values.filter(v=>v!==opt) : [...values, opt];
    onChange(name, next);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
      {options.map(opt=>(
        <label key={opt} style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:"0.82rem",color:C.inkMid,lineHeight:1.5}}>
          <input type="checkbox" checked={values.includes(opt)} onChange={()=>toggle(opt)}
            style={{marginTop:2,accentColor:C.blue,flexShrink:0}}/>
          {opt}
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ options, value, onChange, name }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
      {options.map(opt=>(
        <label key={opt} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.82rem",color:C.inkMid}}>
          <input type="radio" name={name} checked={value===opt} onChange={()=>onChange(name,opt)}
            style={{accentColor:C.blue,flexShrink:0}}/>
          {opt}
        </label>
      ))}
    </div>
  );
}

/* ── Progress bar ── */
function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100);
  const labels = ["פרטים אישיים","לימודים ועבודה","אחת עבור השנייה","קישורים ואישור"];
  return (
    <div style={{marginBottom:"1.4rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,fontWeight:700,color:C.blue}}>{labels[step-1]}</span>
        <span style={{fontSize:11,color:C.inkLight}}>{step}/{total}</span>
      </div>
      <div style={{height:5,borderRadius:99,background:"rgba(68,114,184,0.15)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:99,
          background:`linear-gradient(90deg,${C.blue},${C.coral})`,
          transition:"width 0.4s ease"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        {Array.from({length:total}).map((_,i)=>(
          <div key={i} style={{width:8,height:8,borderRadius:"50%",
            background:i<step?C.blue:"rgba(68,114,184,0.2)",
            transition:"background 0.3s"}}/>
        ))}
      </div>
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ num, title }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.2rem"}}>
      <div style={{width:30,height:30,borderRadius:9,flexShrink:0,
        background:`linear-gradient(135deg,${C.blue},${C.blueD})`,
        display:"flex",alignItems:"center",justifyContent:"center",
        color:"#fff",fontSize:13,fontWeight:900}}>{num}</div>
      <h3 style={{fontSize:"1rem",fontWeight:800,color:C.ink,margin:0,
        fontFamily:"'Figtree','Heebo',system-ui,sans-serif"}}>{title}</h3>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
function normalizePhone(raw) {
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("0")) s = "+972" + s.slice(1);
  else if (s.startsWith("972") && !s.startsWith("+")) s = "+" + s;
  else if (!s.startsWith("+")) s = "+" + s;
  return s;
}

export default function CompleteProfilePage() {
  const { user, logout, refreshProfile } = useAuth();

  const [step,    setStep]    = useState(1);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    /* Step 1 — Personal */
    firstName:         user?.displayName?.split(" ")[0] || "",
    lastName:          user?.displayName?.split(" ").slice(1).join(" ") || "",
    phone:             user?.phoneNumber || "",
    email:             user?.email || "",
    birthdate:         "",
    region:            "",
    religiousIdentity: "",
    communityEthnicity:"",
    identityNote:      "",
    /* Step 2 — Studies & Work */
    campus:            "",
    campusOther:       "",
    bachelorDegree:    "",
    masterDegree:      "",
    phdDegree:         "",
    employmentSectors: [],
    currentRole:       "",
    governmentMinistry:"",
    localAuthority:    "",
    partyAffiliation:  "",
    partyDetails:      "",
    publicRoles:       "",
    /* Step 3 — Mutual help */
    helpAreas:         [],
    wantToReceive:     "",
    mentoringRole:     "",
    /* Step 4 — Social & bio */
    linkedin:          "",
    instagram:         "",
    facebook:          "",
    tagline:           "",
    bio:               "",
    agreed:            false,
  });

  const set = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const setArr = useCallback((name, val) => {
    setForm(p => ({ ...p, [name]: val }));
  }, []);

  const next = (e) => {
    e.preventDefault();
    setError("");
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const back = () => { setError(""); setStep(s => s - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreed) { setError("יש לאשר את הסכמת שיתוף הפרטים."); return; }
    setError(""); setLoading(true);
    try {
      const normalizedPhone = normalizePhone(form.phone);
      await setDoc(doc(db, "users", user.uid), {
        /* public */
        firstName:          form.firstName,
        lastName:           form.lastName,
        birthdate:          form.birthdate || null,
        region:             form.region,
        campus:             form.campus === "OTHER" ? (form.campusOther || "אחר") : form.campus,
        bachelorDegree:     form.bachelorDegree || null,
        masterDegree:       form.masterDegree  || null,
        phdDegree:          form.phdDegree     || null,
        employmentSectors:  form.employmentSectors,
        currentRole:        form.currentRole,
        governmentMinistry: form.governmentMinistry || null,
        localAuthority:     form.localAuthority     || null,
        partyAffiliation:   form.partyAffiliation,
        partyDetails:       form.partyDetails || null,
        publicRoles:        form.publicRoles  || null,
        helpAreas:          form.helpAreas,
        wantToReceive:      form.wantToReceive || null,
        mentoringRole:      form.mentoringRole,
        linkedin:           safeUrl(form.linkedin)  || null,
        instagram:          safeUrl(form.instagram) || null,
        facebook:           safeUrl(form.facebook)  || null,
        tagline:            form.tagline    || null,
        bio:                form.bio        || null,
        /* private (stored but not shown publicly) */
        _religiousIdentity: form.religiousIdentity  || null,
        _communityEthnicity:form.communityEthnicity || null,
        _identityNote:      form.identityNote       || null,
        /* meta */
        emailVerified: true,
        acceptedTerms: true,
        createdAt: new Date().toISOString(),
      });
      await saveContact(user.uid, { phone: normalizedPhone, email: form.email });
      await refreshProfile();
    } catch (err) {
      setError("שגיאה בשמירת הפרופיל. נסי שוב.");
    } finally {
      setLoading(false);
    }
  };

  const initials = (form.firstName?.[0] || "") + (form.lastName?.[0] || "") || user?.email?.[0]?.toUpperCase() || "?";

  const cardStyle = {
    width:"100%", maxWidth:520,
    background:"rgba(255,255,255,0.97)",
    backdropFilter:"blur(20px)",
    borderRadius:22,
    padding:"2rem 2.25rem",
    boxShadow:"0 24px 60px rgba(29,72,150,0.18)",
    direction:"rtl",
    fontFamily:"'Figtree','Heebo',system-ui,sans-serif",
    animation:"cardUp 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
  };

  return (
    <div style={{minHeight:"100vh",position:"relative",fontFamily:"'Figtree','Heebo',system-ui,sans-serif",overflow:"hidden"}}>
      {/* Background */}
      <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:"url(/background.jpg)",backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.75)"}}/>
      <div style={{position:"fixed",inset:0,zIndex:1,background:"linear-gradient(135deg,rgba(29,72,150,0.72) 0%,rgba(68,114,184,0.5) 100%)"}}/>

      {/* Top bar */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:10,padding:"1rem 2rem",display:"flex",alignItems:"center",justifyContent:"space-between",direction:"rtl"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.7rem"}}>
          <img src="/NewLogoNGO.png" onError={e=>{e.target.style.display="none";}} alt=""
            style={{width:36,height:36,borderRadius:"50%",objectFit:"contain",
              background:"rgba(255,255,255,0.12)",border:"2px solid rgba(255,255,255,0.5)"}}/>
          <div>
            <div style={{fontSize:"1rem",fontWeight:800,color:"#fff",lineHeight:1.15}}>BogrotNet</div>
            <div style={{fontSize:"0.6rem",color:"rgba(218,234,248,0.6)",letterSpacing:"0.07em"}}>מנהיגות שווה · רשת בוגרות</div>
          </div>
        </div>
        <button onClick={logout} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:99,padding:"5px 14px",color:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Figtree',system-ui,sans-serif"}}>
          התנתקי
        </button>
      </div>

      {/* Scrollable container */}
      <div style={{position:"relative",zIndex:5,minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"6rem 1rem 6rem"}}>
        <div style={cardStyle}>
          {/* Avatar + title */}
          <div style={{textAlign:"center",marginBottom:"1.3rem"}}>
            <div style={{width:54,height:54,borderRadius:"50%",
              background:`linear-gradient(135deg,${C.blue},${C.blueD})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"1.3rem",fontWeight:800,color:"#fff",
              margin:"0 auto 0.75rem",boxShadow:"0 4px 16px rgba(68,114,184,0.4)"}}>
              {initials.toUpperCase()}
            </div>
            <div style={{fontSize:"1.35rem",fontWeight:800,color:C.ink}}>השלמת פרופיל</div>
            <p style={{color:C.inkLight,fontSize:"0.8rem",marginTop:4}}>
              ברוכה הבאה! מלאי את הפרטים כדי להצטרף לרשת · {step}/{TOTAL_STEPS}
            </p>
          </div>

          <ProgressBar step={step} total={TOTAL_STEPS}/>

          {error && (
            <div style={{background:"rgba(232,115,90,0.1)",border:"1px solid rgba(232,115,90,0.3)",
              borderRadius:10,padding:"0.6rem 0.9rem",marginBottom:"1rem",
              fontSize:"0.82rem",color:C.coralD}}>
              {error}
            </div>
          )}

          {/* ══ STEP 1: פרטים אישיים ══ */}
          {step === 1 && (
            <form onSubmit={next}>
              <SectionHeader num="01" title="פרטים אישיים"/>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
                <Fld label="שם פרטי" required>
                  <Input name="firstName" value={form.firstName} onChange={set} placeholder="שם פרטי" required/>
                </Fld>
                <Fld label="שם משפחה" required>
                  <Input name="lastName" value={form.lastName} onChange={set} placeholder="שם משפחה" required/>
                </Fld>
              </div>

              <Fld label="מספר טלפון נייד" required>
                <Input name="phone" type="tel" value={form.phone} onChange={set} placeholder="05X-XXXXXXX" required dir="ltr"/>
              </Fld>

              <Fld label={'כתובת דוא"ל פרטית של גוגל'} required
                note="לא של העבודה / לימודים — כדי שתהיה לנו כתובת מעודכנת תמיד">
                <Input name="email" type="email" value={form.email} onChange={set} placeholder="your@gmail.com" required dir="ltr"/>
              </Fld>

              <Fld label="תאריך לידה" required note="פורמט: DD/MM/YYYY">
                <Input name="birthdate" value={form.birthdate} onChange={set} placeholder="28/02/1990" required/>
              </Fld>

              <Fld label="אזור מגורים" required>
                <Select name="region" value={form.region} onChange={set} required>
                  <option value="">בחרי אזור...</option>
                  {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </Select>
              </Fld>

              <Fld label="השתייכות לאומית ודתית" required note="לא יפורסם באתר — לצורכי פילוחים פנימיים בלבד">
                <Select name="religiousIdentity" value={form.religiousIdentity} onChange={set} required>
                  <option value="">בחרי...</option>
                  {RELIGIOUS_IDS.map(r=><option key={r} value={r}>{r}</option>)}
                </Select>
              </Fld>

              <Fld label="השתייכות לקהילה / אתניות" required note="לא יפורסם באתר — לצורכי פילוחים פנימיים בלבד">
                <Select name="communityEthnicity" value={form.communityEthnicity} onChange={set} required>
                  <option value="">בחרי...</option>
                  {COMMUNITY_IDS.map(c=><option key={c} value={c}>{c}</option>)}
                </Select>
              </Fld>

              <Fld label="הערה נוספת על ההגדרה הדתית/לאומית/אתנית (אופציונלי)">
                <Input name="identityNote" value={form.identityNote} onChange={set} placeholder="אם תרצי להוסיף..."/>
              </Fld>

              <button type="submit" style={primaryBtn(false)}>
                המשך לשלב הבא ←
              </button>
            </form>
          )}

          {/* ══ STEP 2: פעילות ולימודים ══ */}
          {step === 2 && (
            <form onSubmit={next}>
              <SectionHeader num="02" title="פעילות ולימודים"/>

              <Fld label="הקמפוס בו השתתפתי בתוכנית פוליטיקאיות צעירות" required>
                <Select name="campus" value={form.campus} onChange={set} required>
                  <option value="">בחרי קמפוס...</option>
                  {CAMPUSES.map(c=><option key={c} value={c}>{c}</option>)}
                  <option value="OTHER">אחר (כתבי כאן)</option>
                </Select>
                {form.campus === "OTHER" && (
                  <Input name="campusOther" value={form.campusOther} onChange={set}
                    placeholder="שם המוסד / הארגון..." style={{marginTop:6}} />
                )}
              </Fld>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.65rem"}}>
                <Fld label="תואר ראשון">
                  <Input name="bachelorDegree" value={form.bachelorDegree} onChange={set} placeholder="מדעי המדינה..."/>
                </Fld>
                <Fld label="תואר שני">
                  <Input name="masterDegree" value={form.masterDegree} onChange={set} placeholder="משפטים..."/>
                </Fld>
                <Fld label="תואר שלישי">
                  <Input name="phdDegree" value={form.phdDegree} onChange={set} placeholder="PhD..."/>
                </Fld>
              </div>

              <Fld label="השתייכות למגזר תעסוקתי" required note="ניתן לסמן יותר ממגזר אחד">
                <CheckGroup options={SECTORS} values={form.employmentSectors} onChange={setArr} name="employmentSectors"/>
              </Fld>

              <Fld label="הגדרת תפקיד של עיסוקך הנוכחי" required
                note="למשל: יועצת פרלמנטרית לחברת הכנסת מירב בן ארי במפלגת יש עתיד">
                <Input name="currentRole" value={form.currentRole} onChange={set} placeholder="תפקיד נוכחי..." required/>
              </Fld>

              <Fld label="אם את עובדת במשרד ממשלתי — שמו">
                <Input name="governmentMinistry" value={form.governmentMinistry} onChange={set} placeholder="משרד הפנים..."/>
              </Fld>

              <Fld label="אם את עובדת ברשות מקומית — שמה">
                <Input name="localAuthority" value={form.localAuthority} onChange={set} placeholder="עיריית תל אביב..."/>
              </Fld>

              <Fld label="האם את פקודה / מקושרת / מחוברת למפלגה כלשהי?" required>
                <RadioGroup
                  name="partyAffiliation" value={form.partyAffiliation}
                  onChange={setArr}
                  options={["כן","כן ואשמח לחבר בוגרות למפלגה","לא"]}
                />
              </Fld>

              {(form.partyAffiliation==="כן"||form.partyAffiliation==="כן ואשמח לחבר בוגרות למפלגה")&&(
                <Fld label="פרטים על המפלגה (אופציונלי)">
                  <Input name="partyDetails" value={form.partyDetails} onChange={set} placeholder="שם המפלגה, תפקיד..."/>
                </Fld>
              )}

              <Fld label="תפקידים ציבוריים בשכר או התנדבות">
                <Textarea name="publicRoles" value={form.publicRoles} onChange={set} rows={2}
                  placeholder="תארי תפקידים ציבוריים שאת נושאת בהם..."/>
              </Fld>

              <div style={{display:"flex",gap:"0.65rem"}}>
                <button type="button" onClick={back} style={{...primaryBtn(false),
                  flex:1,background:"rgba(68,114,184,0.1)",color:C.blue,
                  boxShadow:"none",border:`1px solid ${C.bluePale}`}}>
                  ← חזרה
                </button>
                <button type="submit" style={{...primaryBtn(false),flex:2}}>
                  המשך לשלב הבא ←
                </button>
              </div>
            </form>
          )}

          {/* ══ STEP 3: אחת עבור השנייה ══ */}
          {step === 3 && (
            <form onSubmit={next}>
              <SectionHeader num="03" title="אחת עבור השנייה — ביחד אנחנו כוח!"/>

              <Fld label="באילו תחומים תרצי לסייע לחברות הקהילה?" note="ניתן לסמן יותר מתשובה אחת">
                <CheckGroup options={HELP_AREAS} values={form.helpAreas} onChange={setArr} name="helpAreas"/>
              </Fld>

              <Fld label="מה היית רוצה לקבל מחברות הקהילה?">
                <Textarea name="wantToReceive" value={form.wantToReceive} onChange={set} rows={3}
                  placeholder="כתבי במה הייתה רוצה סיוע..."/>
              </Fld>

              <Fld label="האם היית רוצה לקחת חלק בתוכנית מנטורינג?" required>
                <RadioGroup
                  name="mentoringRole" value={form.mentoringRole}
                  onChange={setArr}
                  options={["כן, בתור מנטורית (mentor)","כן, בתור מנטית (mentee)","פחות"]}
                />
              </Fld>

              <div style={{display:"flex",gap:"0.65rem"}}>
                <button type="button" onClick={back} style={{...primaryBtn(false),
                  flex:1,background:"rgba(68,114,184,0.1)",color:C.blue,
                  boxShadow:"none",border:`1px solid ${C.bluePale}`}}>
                  ← חזרה
                </button>
                <button type="submit" style={{...primaryBtn(false),flex:2}}>
                  המשך לשלב הבא ←
                </button>
              </div>
            </form>
          )}

          {/* ══ STEP 4: קישורים + אישור ══ */}
          {step === 4 && (
            <form onSubmit={handleSubmit}>
              <SectionHeader num="04" title="קישורים לרשתות חברתיות"/>

              <Fld label="קישור לפרופיל לינקדאין">
                <Input name="linkedin" value={form.linkedin} onChange={set} placeholder="https://linkedin.com/in/..." dir="ltr"/>
              </Fld>
              <Fld label="קישור לפרופיל אינסטגרם">
                <Input name="instagram" value={form.instagram} onChange={set} placeholder="https://instagram.com/..." dir="ltr"/>
              </Fld>
              <Fld label="קישור לפרופיל פייסבוק">
                <Input name="facebook" value={form.facebook} onChange={set} placeholder="https://facebook.com/..." dir="ltr"/>
              </Fld>

              <Fld label="משפט שתרצי שיופיע בפרופיל שלך">
                <Input name="tagline" value={form.tagline} onChange={set} placeholder="מנהיגה, אמא, חולמת ועושה..."/>
              </Fld>

              <Fld label="ביוגרפיה קצרה (עד 100 מילים)">
                <Textarea name="bio" value={form.bio} onChange={set} rows={4}
                  placeholder="ספרי לנו מי את, מה מניע אותך, ומה עשית עד כה..."/>
                <p style={{fontSize:10,color:form.bio.split(/\s+/).filter(Boolean).length>100?C.coral:C.inkLight,marginTop:3}}>
                  {form.bio.split(/\s+/).filter(Boolean).length} / 100 מילים
                </p>
              </Fld>

              {/* Consent toggle */}
              <div onClick={()=>setForm(p=>({...p,agreed:!p.agreed}))} style={{
                display:"flex",gap:"0.75rem",alignItems:"flex-start",
                background:`rgba(68,114,184,0.06)`,
                border:`1px solid ${form.agreed?C.blue:"rgba(68,114,184,0.2)"}`,
                borderRadius:12,padding:"0.85rem",marginBottom:"1.1rem",cursor:"pointer",
                transition:"border-color 0.2s",
              }}>
                <div style={{
                  width:38,height:20,flexShrink:0,
                  background:form.agreed?C.blue:"rgba(68,114,184,0.2)",
                  borderRadius:10,position:"relative",transition:"background 0.2s",marginTop:2,
                }}>
                  <div style={{
                    position:"absolute",width:14,height:14,background:"#fff",borderRadius:"50%",
                    top:3,
                    left:form.agreed?undefined:3,
                    right:form.agreed?3:undefined,
                    transition:"all 0.2s",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.25)",
                  }}/>
                </div>
                <div style={{color:C.inkMid,fontSize:"0.76rem",lineHeight:1.55,userSelect:"none"}}>
                  <strong style={{color:C.ink}}>מסכימה לשיתוף פרטים בתוך הרשת</strong><br/>
                  שם, מקצוע, אזור מגורים ותחומי עיסוק יהיו גלויים לבוגרות אחרות.
                  פרטים רגישים (דת, אתניות) ישמרו בצורה פרטית.
                </div>
              </div>

              <div style={{display:"flex",gap:"0.65rem"}}>
                <button type="button" onClick={back} style={{...primaryBtn(false),
                  flex:1,background:"rgba(68,114,184,0.1)",color:C.blue,
                  boxShadow:"none",border:`1px solid ${C.bluePale}`}}>
                  ← חזרה
                </button>
                <button type="submit" disabled={loading} style={{...primaryBtn(loading),flex:2}}
                  onMouseOver={e=>!loading&&(e.currentTarget.style.transform="translateY(-1px)")}
                  onMouseOut={e=>(e.currentTarget.style.transform="")}>
                  {loading?"שומרת...":"הצטרפי לרשת ✓"}
                </button>
              </div>
            </form>
          )}

          <button onClick={logout} style={{background:"none",border:"none",color:C.inkLight,
            fontSize:"0.75rem",cursor:"pointer",display:"block",margin:"0.75rem auto 0",
            fontFamily:"'Figtree','Heebo',system-ui,sans-serif"}}>
            התנתקי והשתמשי בחשבון אחר
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:10,
        display:"flex",justifyContent:"center",gap:"3rem",padding:"0.75rem",
        background:"rgba(29,72,150,0.8)",backdropFilter:"blur(12px)",
        borderTop:"1px solid rgba(218,234,248,0.12)"}}>
        {[["700+","בוגרות"],["14","קמפוסים"],["🔒","פרטיות מלאה"],["חינם","להצטרפות"]].map(([n,l])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:"1.1rem",fontWeight:800,color:"#fff",lineHeight:1}}>{n}</div>
            <div style={{color:"rgba(218,234,248,0.5)",fontSize:"0.63rem",marginTop:"0.1rem"}}>{l}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes cardUp{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
        input::placeholder,textarea::placeholder{color:rgba(107,114,128,0.55)!important;}
        select option{color:#111827;}
      `}</style>
    </div>
  );
}
