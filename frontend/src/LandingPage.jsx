import { useState, useEffect, useCallback, useRef } from "react";
import { useLang } from "./LanguageContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { useTheme } from "./ThemeContext";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

/* ── Palette ── */
const C_LIGHT = {
  bg:"#fdf9f7", bgSoft:"#f0ebe5", bgBlue:"#f0f6fb",
  blue:"#4472b8", blueL:"#6da3d4", blueD:"#1d4896",
  bluePale:"#daeaf8", blueGhost:"#f0f6fb",
  coral:"#e8735a", coralL:"#f5a08c", coralD:"#c4503a",
  ink:"#111827", inkMid:"#374151", inkLight:"#6b7280",
  white:"#ffffff",   // always pure white: text on colored bg, CTA buttons
  card:"#ffffff",    // surface/card background
};
const C_DARK = {
  bg:"#0f172a", bgSoft:"#1e293b", bgBlue:"#131f35",
  blue:"#4472b8", blueL:"#6da3d4", blueD:"#1d4896",
  bluePale:"#2a3f5e", blueGhost:"#1a2a40",
  coral:"#e8735a", coralL:"#f5a08c", coralD:"#c4503a",
  ink:"#e2e8f0", inkMid:"#94a3b8", inkLight:"#64748b",
  white:"#ffffff",   // stays pure white (text on blue/coral backgrounds)
  card:"#1e293b",    // dark surface/card background
};
// Static fallback for components that don't need theme-switching
// (IntroOverlay, BackgroundBlobs, SonarRings — all use blues/corals identical in both themes)
const C = C_LIGHT;

/* ── Translations ── */
const LP = {
  he:{
    introBig:"פוליטיקאיות צעירות",
    introSmall:"מנהיגות שווה · BogrotNet",
    tagline:"Young Women Politicians · YWP",
    h1a:"כל מנהיגה",h1b:"מתחילה",h1c:"בקול שלה.",
    desc:"מחברות נשים מנהיגות, בוגרות ופוליטיקאיות עתידיות דרך מנטורינג, נטוורקינג והזדמנויות משותפות — כי מנהיגות שווה מתחילה בקהילה.",
    join:"הצטרפי לתנועה",explore:"גלי את הקהילה",
    bogrotBadge:"BogrotNet · פלטפורמה פנימית",
    badge1t:"~700 נשים",badge1s:"בקהילה שלנו",
    badge2t:"3 שפות",badge2s:"עברית · English · عربية",
    badge3t:"בקשת עזרה",badge3s:"שלחי בקשה לכל חברה",
    featLabel:"מה אנחנו מציעות",featH2:"בנוי עבור נשים שמובילות.",
    featSub:"פלטפורמה שנועדה במיוחד לנשים שמעצבות את העתיד.",
    features:[
      {title:"מנטורינג",body:"הנחיה אישית 1:1 מנשים שצעדו בדרך לפניך."},
      {title:"פיתוח מנהיגות",body:"סדנאות ומשאבים לחידוד הכישורים הפוליטיים והמקצועיים שלך."},
      {title:"קהילה פעילה",body:"מרחב תומך ופרטי לשיתוף הצלחות, שאלות וקשרים אמיתיים."},
      {title:"נטוורקינג",body:"חפשי חברות לפי מקצוע ועיר. שלחי בקשות עזרה."},
      {title:"אקטיביזם אזרחי",body:"הזדמנויות בפוליטיקה, עריכת דין ושירות ציבורי."},
      {title:"רשת בוגרות",body:"קהילה שנשארת איתך אחרי הסיום — עבודות, תמיכה ועמיתות לכל החיים."},
    ],
    leadLabel:"הקהילה שלנו",leadH2:"נשים שמובילות.",
    leadSub:"חברות בקהילה שכבר משאירות חותם.",
    leadersData:[
      {name:"ניבן סניור שניאור",role:"מנכ\"לית YWP, מייסדת 'פוליטיקאיות צעירות'",
        achievement:"יוזמת תוכנית 'המנהיגות הבאות של ישראל' — טיפוח דור חדש של סטודנטיות מנהיגות עם חזון, ידע וביטחון לפעול בזירה הציבורית.",photo:null},
      {name:"סיון קורן",role:"יו\"ר התאחדות הסטודנטים והסטודנטיות הארצית",
        achievement:"שותפה מרכזית בפיתוח תוכנית המנהיגות השווה, ומובילה שילוב מגדרי שוויוני בהתאחדות הסטודנטים הארצית בכל הקמפוסים.",photo:null},
      {name:"רויטל כ'נלסון",role:"יועצת חינוכית מקצועית",
        achievement:"הכתובת שלך להתלבטויות, בין אם מדובר בלימודים, קריירה, או התפתחות אישית — פתוחה ורגועה.",photo:null},
    ],
    ctaH2:"הקול שלך שייך לחדר.",
    ctaDesc:"הצטרפי לנשים שבונות רשתות, מוצאות מנטוריות וצועדות לתפקידי מנהיגות — יחד.",
    ctaJoin:"הצטרפי לתנועה",ctaSign:"כניסה",
    howLabel:"מדריך שימוש",howH2:"איך משתמשים ב-BogrotNet?",
    howSub:"לחצי על החצים כדי לעבור בין השלבים.",
    howSteps:[
      {num:"01",title:"הצטרפי והגדירי פרופיל",body:"הירשמי עם הדוא״ל שלך, מלאי שם, מקצוע ועיר — ותוך 3 דקות תהיי חלק מהקהילה.",
        arrowText:"לחצי כאן להרשמה",mockupType:"signup"},
      {num:"02",title:"גלי את הפיד הקהילתי",body:"קראי פוסטים, חגגי ימי הולדת של חברות והישארי מעודכנת בהודעות ובאירועים.",
        arrowText:"הפיד הקהילתי",mockupType:"feed"},
      {num:"03",title:"חפשי חברות",body:"סננה לפי מקצוע, עיר או שם — ומצאי בדיוק את מי שאת צריכה.",
        arrowText:"כאן לחיפוש",mockupType:"search"},
      {num:"04",title:"שלחי בקשת עזרה",body:"מצאי חברה ולחצי 'שלחי בקשת עזרה'. היא תקבל הודעה ותוכלנה ליצור קשר ביניכן — אנושי, ישיר ופשוט.",
        arrowText:"לחצי לשליחת בקשה",mockupType:"request"},
    ],
    quoteText:'"אשה שנכנסת לזירה הפוליטית — פותחת את הדלת לכל הנשים שאחריה."',
    quoteAuthor:"— BogrotNet · פוליטיקאיות צעירות",
    navFeatures:"מה אנחנו מציעות",navHow:"כיצד להשתמש",navLead:"הקהילה שלנו",
    navFeaturesSub:"6 יתרונות למנהיגות",navHowSub:"מדריך שלב-שלב",navLeadSub:"הכירי את חברות הקהילה",
    followUs:"עקבי אחרינו",
    contactTitle:"יצירת קשר עם הנהלת YWP",
    contactCEO:"ניצן סניור שניאור, מנכ\"לית",
    contactPhone:"058-6277762",
    footerBrand:"YWP · מנהיגות שווה",
    footerRights:"כל הזכויות שמורות",
  },
  en:{
    introBig:"Young Women Politicians",
    introSmall:"for Equal Leadership · BogrotNet",
    tagline:"Young Women Politicians · YWP",
    h1a:"Every leader",h1b:"starts with",h1c:"her voice.",
    desc:"Connecting young women leaders, graduates and future politicians through mentorship, networking and shared opportunity — because equal leadership starts in the community.",
    join:"Join the Movement",explore:"Explore Community",
    bogrotBadge:"BogrotNet · Internal platform",
    badge1t:"~700 Women",badge1s:"in our community",
    badge2t:"3 Languages",badge2s:"Hebrew · English · Arabic",
    badge3t:"Ask for Help",badge3s:"Send a request to any member",
    featLabel:"What we offer",featH2:"Built for women who lead.",
    featSub:"A platform designed specifically for women shaping the future.",
    features:[
      {title:"Mentorship",body:"Structured 1:1 guidance from women who walked the path before you."},
      {title:"Leadership Dev",body:"Workshops and resources to sharpen your political and professional skills."},
      {title:"Active Community",body:"A private, supportive space to share wins and build real bonds."},
      {title:"Networking",body:"Search members by profession and region. Send help requests."},
      {title:"Civic Activism",body:"Opportunities in politics, advocacy, and public service."},
      {title:"Graduate Network",body:"A community that follows you beyond graduation — jobs and lifelong peers."},
    ],
    leadLabel:"Our community",leadH2:"Women who lead.",
    leadSub:"Members already making their mark — in politics, law, tech, and beyond.",
    leadersData:[
      {name:"Nivan Senior Schneior",role:"YWP CEO & Founder",
        achievement:"Initiator of the 'Next Leaders of Israel' program — nurturing a new generation of student leaders with vision, knowledge and confidence to act in the public sphere.",photo:null},
      {name:"Sivan Koren",role:"Chair, National Student Union",
        achievement:"A key partner in developing the Equal Leadership program, leading equitable gender integration in the national student union across all campuses.",photo:null},
      {name:"Roital Khanelson",role:"Professional Educational Consultant",
        achievement:"Your trusted address for questions about studies, career, and personal growth — open, calm, and approachable.",photo:null},
    ],
    ctaH2:"Your voice belongs in the room.",
    ctaDesc:"Join women who are building networks, finding mentors, and stepping into leadership — together.",
    ctaJoin:"Join the Movement",ctaSign:"Sign in",
    howLabel:"How it works",howH2:"How to use BogrotNet?",
    howSub:"Click the arrows to go through the steps.",
    howSteps:[
      {num:"01",title:"Join & Set Up Your Profile",body:"Sign up with your email, fill in your name, profession and region — in 3 minutes you're part of the community.",
        arrowText:"Click here to register",mockupType:"signup"},
      {num:"02",title:"Explore the Community Feed",body:"Read posts, celebrate members' birthdays, and stay updated on announcements and events.",
        arrowText:"The community feed",mockupType:"feed"},
      {num:"03",title:"Find Members",body:"Filter by profession, region, or name — find exactly who you need.",
        arrowText:"Click here to search",mockupType:"search"},
      {num:"04",title:"Send a Help Request",body:"Find a member and tap 'Send Help Request'. She gets notified and you two can connect directly — personal, simple, and real.",
        arrowText:"Click to send request",mockupType:"request"},
    ],
    quoteText:'"When a woman steps into the room, she opens the door for every woman who comes after her."',
    quoteAuthor:"— BogrotNet · Young Women Politicians",
    navFeatures:"What we offer",navHow:"How to use",navLead:"Our community",
    navFeaturesSub:"6 leadership features",navHowSub:"Step by step guide",navLeadSub:"Meet our members",
    followUs:"Follow us",
    contactTitle:"Contact YWP Leadership",
    contactCEO:"Nitzan Senior Schneior, CEO",
    contactPhone:"058-6277762",
    footerBrand:"YWP · Equal Leadership",
    footerRights:"All rights reserved",
  },
  ar:{
    introBig:"سياسيات شابات",
    introSmall:"من أجل القيادة المتساوية · BogrotNet",
    tagline:"سياسيات شابات · YWP",
    h1a:"كل قائدة",h1b:"تبدأ",h1c:"بصوتها.",
    desc:"نربط النساء القياديات الشابات والخريجات والسياسيات المستقبليات من خلال الإرشاد والتواصل والفرص المشتركة.",
    join:"انضمي للحركة",explore:"استكشفي المجتمع",
    bogrotBadge:"BogrotNet · المنصة الداخلية",
    badge1t:"~700 امرأة",badge1s:"في مجتمعنا",
    badge2t:"3 لغات",badge2s:"عبرية · English · عربية",
    badge3t:"اطلبي المساعدة",badge3s:"أرسلي طلبًا لأي عضوة",
    featLabel:"ما نقدمه",featH2:"مصمم للنساء القياديات.",
    featSub:"منصة مصممة خصيصًا للنساء اللواتي يشكّلن المستقبل.",
    features:[
      {title:"الإرشاد",body:"توجيه شخصي 1:1 من نساء سلكن هذا الطريق قبلك."},
      {title:"تطوير القيادة",body:"ورش عمل وموارد لتعزيز مهاراتك السياسية والمهنية."},
      {title:"مجتمع نشط",body:"مساحة خاصة وداعمة لمشاركة النجاحات وبناء روابط حقيقية."},
      {title:"شبكة علاقات",body:"ابحثي عن الأعضاء حسب المهنة والمدينة."},
      {title:"نشاط مدني",body:"فرص في السياسة والمناصرة والخدمة العامة."},
      {title:"شبكة الخريجات",body:"مجتمع يرافقك بعد التخرج — وظائف ورفيقات للحياة."},
    ],
    leadLabel:"مجتمعنا",leadH2:"نساء يقدن.",
    leadSub:"أعضاء يتركن أثرًا بالفعل — في السياسة والقانون والتكنولوجيا.",
    leadersData:[
      {name:"نيفان سينيور شنيئور",role:"الرئيسة التنفيذية لـ YWP",
        achievement:"مبادِرة برنامج 'القيادات القادمة لإسرائيل' — تنشئة جيل جديد من الطالبات القياديات بالرؤية والمعرفة.",photo:null},
      {name:"سيفان كورن",role:"رئيسة اتحاد الطلاب الوطني",
        achievement:"شريك رئيسي في تطوير برنامج القيادة المتساوية، وتقود تكاملاً جنسانياً عادلاً عبر جميع الحرم الجامعية.",photo:null},
      {name:"رويتال خانلسون",role:"مستشارة تربوية مهنية",
        achievement:"عنوانك الموثوق لأسئلة الدراسة والمهنة والنمو الشخصي — منفتحة وهادئة.",photo:null},
    ],
    ctaH2:"صوتك ينتمي إلى الغرفة.",
    ctaDesc:"انضمي إلى النساء اللواتي يبنين شبكاتهن ويتولين مناصب قيادية — معًا.",
    ctaJoin:"انضمي للحركة",ctaSign:"تسجيل الدخول",
    howLabel:"كيفية الاستخدام",howH2:"كيف تستخدمين BogrotNet؟",
    howSub:"انقري على الأسهم للتنقل بين الخطوات.",
    howSteps:[
      {num:"01",title:"انضمي وأعدي ملفك الشخصي",body:"سجلي بالبريد الإلكتروني وأدخلي اسمك ومهنتك ومدينتك — في 3 دقائق ستكونين جزءًا من المجتمع.",
        arrowText:"انقري هنا للتسجيل",mockupType:"signup"},
      {num:"02",title:"استكشفي التغذية المجتمعية",body:"اقرئي المنشورات واحتفلي بأعياد ميلاد الأعضاء وابقي على اطلاع بالإعلانات.",
        arrowText:"التغذية المجتمعية",mockupType:"feed"},
      {num:"03",title:"ابحثي عن الأعضاء",body:"صفّي حسب المهنة أو المدينة أو الاسم — اعثري على من تحتاجينه بالضبط.",
        arrowText:"انقري للبحث هنا",mockupType:"search"},
      {num:"04",title:"أرسلي طلب مساعدة",body:"ابحثي عن عضوة واضغطي 'أرسلي طلب مساعدة'. ستتلقى إشعارًا وتتمكنان من التواصل مباشرةً — شخصيًا وبسيطًا.",
        arrowText:"انقري لإرسال الطلب",mockupType:"request"},
    ],
    quoteText:'"حين تدخل المرأة إلى الغرفة، تفتح الباب لكل امرأة تأتي بعدها."',
    quoteAuthor:"— BogrotNet · سياسيات شابات",
    navFeatures:"ما نقدمه",navHow:"كيفية الاستخدام",navLead:"مجتمعنا",
    navFeaturesSub:"٦ مزايا للقياديات",navHowSub:"دليل خطوة بخطوة",navLeadSub:"تعرّفي على أعضاء المجتمع",
    followUs:"تابعينا",
    contactTitle:"تواصلي مع قيادة YWP",
    contactCEO:"نيتسان سينيور شنيئور، المديرة التنفيذية",
    contactPhone:"058-6277762",
    footerBrand:"YWP · قيادة متساوية",
    footerRights:"جميع الحقوق محفوظة",
  },
};

/* ── CSS injection ── */
if (!document.getElementById("lp-css")) {
  const s = document.createElement("style");
  s.id = "lp-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    :root {
      --lp-bg:      #fdf9f7;
      --lp-bg-blue: #f0f6fb;
      --lp-ink:     #111827;
    }
    html.dark-mode {
      --lp-bg:      #0f172a;
      --lp-bg-blue: #131f35;
      --lp-ink:     #e2e8f0;
    }

    .lp-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--lp-ink);background:var(--lp-bg);}
    .lp-root h1,.lp-root h2,.lp-root h3{font-family:'Playfair Display',Georgia,serif;}

    @keyframes lp-out     {to{transform:translateX(110%);}}
    @keyframes lp-sweep   {from{transform:translateX(-160%) skewX(-3deg)}to{transform:translateX(160%) skewX(-3deg)}}
    @keyframes lp-text-in {from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}
    @keyframes lp-fade-up {from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
    @keyframes lp-logo-in {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    @keyframes lp-grad    {0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    @keyframes lp-ripple  {0%{transform:scale(0);opacity:0.5}100%{transform:scale(5);opacity:0}}
    @keyframes lp-lead-in {from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
    @keyframes lp-card-pop{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:none}}
    @keyframes lp-hint    {0%,100%{opacity:0.55;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}

    /* Wave animations */
    @keyframes lp-wave-a {0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-20px) scaleY(1.08)}}
    @keyframes lp-wave-b {0%,100%{transform:translateY(-6px)}50%{transform:translateY(14px)}}
    @keyframes lp-wave-c {0%,100%{transform:translateY(8px)}50%{transform:translateY(-10px)}}
    @keyframes lp-wave-d {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

    /* Character sway */
    @keyframes lp-char {
      0%  {transform:rotate(0deg) translateY(0);}
      20% {transform:rotate(-1.2deg) translateY(-4px);}
      50% {transform:rotate(0.8deg)  translateY(-7px);}
      80% {transform:rotate(-0.6deg) translateY(-3px);}
      100%{transform:rotate(0deg) translateY(0);}
    }
    @keyframes lp-char-rtl {
      0%  {transform:scaleX(-1) rotate(0deg) translateY(0);}
      20% {transform:scaleX(-1) rotate(-1.2deg) translateY(-4px);}
      50% {transform:scaleX(-1) rotate(0.8deg)  translateY(-7px);}
      80% {transform:scaleX(-1) rotate(-0.6deg) translateY(-3px);}
      100%{transform:scaleX(-1) rotate(0deg) translateY(0);}
    }

    /* Background blob floats */
    @keyframes lp-float-a {0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-32px) scale(1.04)}}
    @keyframes lp-float-b {0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-20px) rotate(6deg)}}
    @keyframes lp-float-c {0%,100%{transform:translate(0,0)}25%{transform:translate(18px,-15px)}75%{transform:translate(-12px,10px)}}

    /* Flip card */
    @keyframes lp-flip-out{from{transform:rotateX(0) scale(1);opacity:1}to{transform:rotateX(-90deg) scale(0.92);opacity:0}}
    @keyframes lp-flip-in {from{transform:rotateX(90deg) scale(0.92);opacity:0}to{transform:rotateX(0) scale(1);opacity:1}}

    /* Drag badge */
    @keyframes lp-step-in {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

    /* Sonar rings behind logo */
    @keyframes lp-sonar {
      0%   { transform:scale(0.3); opacity:0.55; }
      75%  { opacity:0.08; }
      100% { transform:scale(1.65); opacity:0; }
    }

    /* Scroll reveal — applied via inline style (opacity/transform/filter transition) */
    .lp-reveal {
      transition: opacity 0.78s ease, transform 0.78s cubic-bezier(0.16,1,0.3,1), filter 0.72s ease;
    }
    /* Wave divider section animations */
    @keyframes lp-wave-slide-a {0%,100%{transform:translateX(0) scaleY(1)}50%{transform:translateX(-28px) scaleY(1.1)}}
    @keyframes lp-wave-slide-b {0%,100%{transform:translateX(0)}50%{transform:translateX(22px)}}
    @keyframes lp-wave-slide-c {0%,100%{transform:translateX(0) scaleY(1)}50%{transform:translateX(-16px) scaleY(0.94)}}
    /* Quote animation */
    @keyframes lp-quote-in {from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:none}}
    @keyframes lp-quote-line {from{width:0}to{width:80px}}
    /* Nav dot pulse */
    @keyframes lp-dot-appear {from{opacity:0;transform:scale(0.6) translateX(12px)}to{opacity:1;transform:scale(1) translateX(0)}}

    /* Water blob morph */
    @keyframes lp-blob-morph {
      0%   {border-radius:62% 38% 56% 44%/52% 62% 38% 48%;transform:scale(1) rotate(0deg);}
      20%  {border-radius:44% 56% 38% 62%/60% 44% 56% 40%;transform:scale(1.02) rotate(1deg);}
      40%  {border-radius:58% 42% 65% 35%/42% 58% 44% 56%;transform:scale(0.97) rotate(-1deg);}
      60%  {border-radius:38% 62% 48% 52%/55% 45% 62% 38%;transform:scale(1.01) rotate(0.5deg);}
      80%  {border-radius:55% 45% 42% 58%/46% 54% 50% 50%;transform:scale(0.99) rotate(-0.5deg);}
      100% {border-radius:62% 38% 56% 44%/52% 62% 38% 48%;transform:scale(1) rotate(0deg);}
    }
    @keyframes lp-blob-morph-b {
      0%   {border-radius:48% 52% 60% 40%/58% 42% 55% 45%;transform:scale(1) rotate(0deg);}
      33%  {border-radius:65% 35% 42% 58%/44% 56% 38% 62%;transform:scale(1.04) rotate(-2deg);}
      66%  {border-radius:40% 60% 55% 45%/62% 38% 48% 52%;transform:scale(0.96) rotate(1.5deg);}
      100% {border-radius:48% 52% 60% 40%/58% 42% 55% 45%;transform:scale(1) rotate(0deg);}
    }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════
   NAV CIRCLE — floating circular badge in hero
═══════════════════════════════════ */
function NavCircle({ icon, title, sub, delay, onClick, C, small }) {
  const [hov, setHov] = useState(false);
  const [vis, setVis] = useState(false);
  const sz = small ? 46 : 64;
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <button onClick={onClick} style={{
        width:sz,height:sz,borderRadius:"50%",border:`2.5px solid ${hov?C.blue:C.bluePale}`,
        background:hov?C.blue:C.card,
        boxShadow:hov?"0 10px 32px rgba(68,114,184,0.32)":"0 5px 22px rgba(68,114,184,0.16)",
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
        color:hov?C.white:C.blue,
        transition:"all 0.22s cubic-bezier(0.2,0.8,0.2,1)",
        transform:hov?"scale(1.1)":"scale(1)",
        opacity:vis?1:0,
        animation:vis?"lp-card-pop 0.42s ease both":"none",
        flexShrink:0,
      }}>{icon}</button>
      {hov && (
        <div style={{
          position:"absolute",
          right:"calc(100% + 12px)",
          top:"50%",transform:"translateY(-50%)",
          background:"rgba(17,24,39,0.92)",color:"#fff",
          padding:"10px 16px",borderRadius:10,whiteSpace:"nowrap",
          backdropFilter:"blur(8px)",
          animation:"lp-step-in 0.18s ease both",zIndex:9999,
          pointerEvents:"none",
          boxShadow:"0 8px 28px rgba(0,0,0,0.25)",
        }}>
          <p style={{margin:0,fontSize:13,fontWeight:800,lineHeight:1.2}}>{title}</p>
          <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.65)",lineHeight:1.3,marginTop:2}}>{sub}</p>
          {/* Arrow pointing right (toward the circle) */}
          <div style={{position:"absolute",right:-6,top:"50%",transform:"translateY(-50%)",
            width:0,height:0,
            borderTop:"5px solid transparent",borderBottom:"5px solid transparent",
            borderLeft:"6px solid rgba(17,24,39,0.92)"}}/>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   FLOAT NAV DOTS — fixed sidebar after hero
═══════════════════════════════════ */
function FloatNavDots({ sections, visible, isRTL, C }) {
  const [hovIdx, setHovIdx] = useState(-1);
  if (!visible) return null;
  return (
    <div style={{
      position:"fixed",
      [isRTL?"left":"right"]:18,
      top:"50%",transform:"translateY(-50%)",
      zIndex:500,display:"flex",flexDirection:"column",gap:10,
    }}>
      {sections.map((sec,i)=>(
        <div key={i} style={{position:"relative",display:"flex",alignItems:"center"}}
          onMouseEnter={()=>setHovIdx(i)} onMouseLeave={()=>setHovIdx(-1)}>
          <button onClick={()=>sec.ref.current?.scrollIntoView({behavior:"smooth",block:"start"})}
            style={{
              width:38,height:38,borderRadius:"50%",
              background:hovIdx===i?C.blue:C.card,
              border:`2px solid ${hovIdx===i?C.blue:C.bluePale}`,
              boxShadow:"0 3px 14px rgba(68,114,184,0.18)",
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              color:hovIdx===i?C.white:C.blue,
              transition:"all 0.2s",
              animation:`lp-dot-appear 0.35s ${i*0.07}s ease both`,
            }}>{sec.icon}</button>
          {hovIdx===i&&(
            <div style={{
              position:"absolute",
              [isRTL?"left":"right"]:"calc(100% + 8px)",
              top:"50%",transform:"translateY(-50%)",
              background:"rgba(17,24,39,0.88)",color:"#fff",
              padding:"6px 12px",borderRadius:8,whiteSpace:"nowrap",
              fontSize:12,fontWeight:600,
              backdropFilter:"blur(8px)",
              animation:"lp-step-in 0.15s ease both",
              pointerEvents:"none",zIndex:1,
            }}>
              {sec.label}
              <div style={{
                position:"absolute",
                [isRTL?"left":"right"]:-5,
                top:"50%",transform:"translateY(-50%)",
                width:0,height:0,
                borderTop:"4px solid transparent",borderBottom:"4px solid transparent",
                [isRTL?"borderRight":"borderLeft"]:"none",
                [isRTL?"borderLeft":"borderRight"]:"5px solid rgba(17,24,39,0.88)",
              }}/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════
   INTRO OVERLAY
═══════════════════════════════════ */
function IntroOverlay({ T, onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 750);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(onDone, 2350);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,overflow:"hidden",
      background:`linear-gradient(135deg,${C.blueD} 0%,${C.blue} 55%,${C.blueL} 100%)`,
      animation:phase===2?"lp-out 0.9s cubic-bezier(0.76,0,0.24,1) forwards":"none",
    }}>
      {phase>=1&&[{delay:"0s",dur:"0.72s",op:0.18},{delay:"0.11s",dur:"0.78s",op:0.13},{delay:"0.20s",dur:"0.68s",op:0.22}].map((w,i)=>(
        <div key={i} style={{
          position:"absolute",top:"-8%",bottom:"-8%",width:"52%",left:"-52%",
          background:`rgba(255,255,255,${w.op})`,borderRadius:"50% / 8%",
          animation:`lp-sweep ${w.dur} ${w.delay} cubic-bezier(0.4,0,0.6,1) forwards`,
        }}/>
      ))}
      <div style={{
        position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:16,
        opacity:phase>=1?0:1,transition:"opacity 0.3s ease",
        animation:phase===0?"lp-logo-in 0.55s 0.1s ease both":"none",
      }}>
        <img src="/NewLogoNGO.png" onError={e=>{e.target.style.display="none";}} alt="YWP"
          style={{width:90,height:90,objectFit:"contain",borderRadius:"50%",
            background:"rgba(255,255,255,0.15)",padding:8,border:"2px solid rgba(255,255,255,0.3)"}}/>
        <h2 style={{fontSize:"clamp(20px,3.5vw,38px)",fontWeight:900,color:C.white,
          letterSpacing:"-0.02em",margin:0,textAlign:"center",
          fontFamily:"'Playfair Display',Georgia,serif"}}>{T.introBig}</h2>
        <p style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.26em",textTransform:"uppercase",margin:0}}>
          {T.introSmall}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   BACKGROUND BLOBS — animated circles
═══════════════════════════════════ */
function BackgroundBlobs() {
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
      <div style={{position:"absolute",width:560,height:560,borderRadius:"50%",top:-120,left:-80,
        background:`radial-gradient(circle,${C.blue}18 0%,transparent 70%)`,
        animation:"lp-float-a 13s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:420,height:420,borderRadius:"50%",top:"20%",left:"32%",
        background:`radial-gradient(circle,${C.bluePale}55 0%,transparent 70%)`,
        animation:"lp-float-b 11s 1.5s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:340,height:340,borderRadius:"50%",bottom:-60,left:"15%",
        background:`radial-gradient(circle,${C.coral}10 0%,transparent 70%)`,
        animation:"lp-float-c 15s 0.5s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",top:"55%",left:"5%",
        background:`radial-gradient(circle,${C.coralL}14 0%,transparent 70%)`,
        animation:"lp-float-a 9s 3s ease-in-out infinite"}}/>
    </div>
  );
}

/* ═══════════════════════════════════
   SONAR RINGS — sound wave pulses
   behind the mascot logo
═══════════════════════════════════ */
function SonarRings() {
  return (
    <div style={{
      position:"absolute",
      width:"clamp(300px,44vw,520px)",height:"clamp(300px,44vw,520px)",
      borderRadius:"50%",
      top:"50%",left:"50%",transform:"translate(-50%,-50%)",
      pointerEvents:"none",zIndex:1,
    }}>
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{
          position:"absolute",inset:0,borderRadius:"50%",
          border:`1.5px solid ${i%2===0?C.blue:C.coral}`,
          opacity:0,
          animation:`lp-sonar 3.4s ${i*0.68}s ease-out infinite`,
        }}/>
      ))}
      {/* Soft glow disc at center */}
      <div style={{
        position:"absolute",
        inset:"28%",borderRadius:"50%",
        background:`radial-gradient(circle,${C.bluePale}60 0%,transparent 70%)`,
        animation:"lp-float-a 6s ease-in-out infinite",
      }}/>
    </div>
  );
}

/* ═══════════════════════════════════
   useInView — scroll reveal hook
   triggers on enter AND exit viewport
═══════════════════════════════════ */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ═══════════════════════════════════
   HERO WAVES — 4 animated layers
═══════════════════════════════════ */
function HeroWaves({ C }) {
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,overflow:"visible",pointerEvents:"none",zIndex:1}}>
      {/* Wave D — deepest, slow */}
      <svg viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style={{position:"absolute",bottom:58,width:"100%",height:140,
          animation:"lp-wave-d 14s 0.5s ease-in-out infinite"}}>
        <path d="M0,90 C200,40 400,120 600,80 C800,40 1000,110 1200,70 C1350,42 1420,80 1440,60 L1440,140 L0,140 Z" fill={`${C.coralL}18`}/>
      </svg>
      {/* Wave C — coral accent */}
      <svg viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style={{position:"absolute",bottom:38,width:"100%",height:140,
          animation:"lp-wave-c 10s 1s ease-in-out infinite"}}>
        <path d="M0,70 C180,30 360,110 540,70 C720,30 900,100 1080,60 C1260,20 1380,80 1440,50 L1440,140 L0,140 Z" fill={`${C.coral}15`}/>
      </svg>
      {/* Wave B — blue mid */}
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style={{position:"absolute",bottom:18,width:"100%",height:120,
          animation:"lp-wave-b 12s 2s ease-in-out infinite"}}>
        <path d="M0,60 C240,10 480,100 720,55 C960,10 1200,90 1440,45 L1440,120 L0,120 Z" fill={`${C.blue}22`}/>
      </svg>
      {/* Wave A — main divider into next section */}
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style={{position:"absolute",bottom:-1,width:"100%",height:90,
          animation:"lp-wave-a 9s ease-in-out infinite"}}>
        <path d="M0,45 C360,90 1080,0 1440,45 L1440,90 L0,90 Z" fill="var(--lp-bg)"/>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════
   ICONS
═══════════════════════════════════ */
const Ic = {
  /* badge icons — consistent outline, each concept unique */
  people:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  /* badge2: handshake / connection */
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/><path d="M8 9h8"/><path d="M8 15h8"/><path d="M9 9v6"/><path d="M15 9v6"/></svg>,
  /* badge3: award ribbon */
  star:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  /* feature icons — all same stroke style */
  mentor:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  lead:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  comm:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  /* net: hub/node network (3 nodes connected) */
  net:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/><line x1="5" y1="17" x2="19" y2="17"/></svg>,
  activ: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  grad:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  insta: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  linked:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  fb:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
  mail:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.71a16 16 0 0 0 6.36 6.36l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  chev:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

/* ═══════════════════════════════════
   FEATURE CARD
═══════════════════════════════════ */
function FeatureCard({ icon, title, body, accent, C }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:C.card,borderRadius:20,padding:"1.75rem 1.5rem",
      border:`${hov?"2.5px":"1px"} solid ${hov?C.blue:C.bluePale}`,
      boxShadow:hov?"0 16px 48px rgba(68,114,184,0.14)":"0 2px 12px rgba(0,0,0,0.04)",
      transform:hov?"translateY(-5px)":"none",transition:"all 0.25s ease",
    }}>
      <div style={{width:46,height:46,borderRadius:13,
        background:C.blueGhost,
        display:"flex",alignItems:"center",justifyContent:"center",color:C.blue,
        marginBottom:"1.1rem"}}>{icon}</div>
      <h3 style={{fontSize:16,fontWeight:700,color:C.ink,marginBottom:"0.6rem"}}>{title}</h3>
      <p style={{fontSize:13.5,color:C.inkLight,lineHeight:1.75,margin:0}}>{body}</p>
    </div>
  );
}

/* ═══════════════════════════════════
   LEADER CARD
═══════════════════════════════════ */
function LeaderCard({ name, role, achievement, photo, delay, C }) {
  const [hov, setHov] = useState(false);
  const initials = name.split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:C.card,borderRadius:22,padding:"1.75rem",
      border:`${hov?"2.5px":"1px"} solid ${hov?C.blue:C.bluePale}`,
      boxShadow:hov?"0 20px 56px rgba(68,114,184,0.14)":"0 4px 20px rgba(0,0,0,0.05)",
      transform:hov?"translateY(-5px)":"none",
      transition:"all 0.25s ease",
      animation:`lp-lead-in 0.6s ${delay} ease both`,
      display:"flex",flexDirection:"column",gap:"1.1rem",
    }}>
      <div style={{width:78,height:78,borderRadius:"50%",overflow:"hidden",
        background:`linear-gradient(135deg,${C.blue},${C.blueL})`,
        display:"flex",alignItems:"center",justifyContent:"center",
        border:`3px solid ${C.bluePale}`,flexShrink:0,
        boxShadow:"0 4px 16px rgba(68,114,184,0.22)"}}>
        {photo
          ?<img src={photo} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          :<span style={{color:C.white,fontSize:24,fontWeight:900,
              fontFamily:"'Playfair Display',Georgia,serif"}}>{initials}</span>}
      </div>
      <div>
        <p style={{fontSize:17,fontWeight:800,color:C.ink,margin:"0 0 4px"}}>{name}</p>
        <p style={{fontSize:12,fontWeight:700,color:C.blue,margin:0,letterSpacing:"0.06em"}}>{role}</p>
      </div>
      <div style={{background:C.blueGhost,borderRadius:12,padding:"1rem 1.1rem",borderLeft:`3.5px solid ${C.coral}`}}>
        <p style={{fontSize:13.5,color:C.inkMid,lineHeight:1.75,margin:0,fontStyle:"italic"}}>"{achievement}"</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SCREENSHOT MOCKUPS — BogrotNet UI layout
═══════════════════════════════════ */

/* Shared sidebar component for app mockups */
function MockupSidebar({ active }) {
  const items = [
    { id:"home",
      icon:<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <path d="M8 2L2 8h2v6h4v-4h4v4h4V8h2z"/>
      </svg> },
    { id:"feed",
      icon:<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 4h10M3 8h8M3 12h6"/>
      </svg> },
    { id:"search",
      icon:<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6.5" cy="6.5" r="4"/><line x1="9.8" y1="9.8" x2="14" y2="14"/>
      </svg> },
    { id:"chat",
      icon:<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 3h12v8l-3 2H2z"/>
      </svg> },
    { id:"profile",
      icon:<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="5.5" r="3"/><path d="M2 14c0-2.5 2.5-4 6-4s6 1.5 6 4"/>
      </svg> },
  ];
  return (
    <div style={{width:42,background:"#1a2f5e",display:"flex",flexDirection:"column",
      alignItems:"center",gap:8,paddingTop:10,paddingBottom:8,flexShrink:0}}>
      <div style={{width:26,height:26,borderRadius:8,background:"rgba(255,255,255,0.12)",
        display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4}}>
        <div style={{width:14,height:14,borderRadius:"50%",background:"rgba(255,255,255,0.65)"}}/>
      </div>
      {items.map(item=>(
        <div key={item.id} style={{
          width:30,height:30,borderRadius:9,
          background:active===item.id?"rgba(255,255,255,0.18)":"transparent",
          border:active===item.id?"1px solid rgba(255,255,255,0.22)":"none",
          display:"flex",alignItems:"center",justifyContent:"center",
          color:active===item.id?"#fff":"rgba(255,255,255,0.38)",
        }}>{item.icon}</div>
      ))}
    </div>
  );
}

function MockupSignup() {
  return (
    <div style={{borderRadius:14,overflow:"hidden",height:200,marginTop:16,display:"flex",
      border:`1px solid ${C.bluePale}`,boxShadow:"0 4px 20px rgba(68,114,184,0.12)"}}>
      {/* Left: BogrotNet brand panel */}
      <div style={{width:82,background:`linear-gradient(165deg,${C.blueD} 0%,${C.blue} 100%)`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        gap:8,padding:"10px 8px",flexShrink:0}}>
        <div style={{width:34,height:34,borderRadius:"50%",
          background:"rgba(255,255,255,0.15)",border:"2px solid rgba(255,255,255,0.3)",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="8" cy="5.5" r="3"/><path d="M2 14c0-2.5 2.5-4 6-4s6 1.5 6 4"/>
          </svg>
        </div>
        <p style={{margin:0,fontSize:9,fontWeight:800,color:"#fff",textAlign:"center",letterSpacing:"0.04em"}}>BogrotNet</p>
        <p style={{margin:0,fontSize:7.5,color:"rgba(255,255,255,0.55)",textAlign:"center",lineHeight:1.4}}>YWP<br/>מנהיגות שווה</p>
        <div style={{width:28,height:2,borderRadius:99,background:C.coral,marginTop:2}}/>
      </div>
      {/* Right: signup form */}
      <div style={{flex:1,background:"#fdf9f7",padding:"14px 14px",
        display:"flex",flexDirection:"column",gap:6}}>
        <p style={{margin:0,fontSize:11,fontWeight:800,color:C.blueD}}>הצטרפי לתנועה</p>
        <div style={{display:"flex",gap:5}}>
          <div style={{flex:1,height:23,borderRadius:6,background:C.white,
            border:`2px solid ${C.blue}`,display:"flex",alignItems:"center",paddingInlineStart:6}}>
            <span style={{fontSize:8.5,color:C.inkLight}}>שם פרטי</span>
          </div>
          <div style={{flex:1,height:23,borderRadius:6,background:C.white,
            border:`1px solid ${C.bluePale}`,display:"flex",alignItems:"center",paddingInlineStart:6}}>
            <span style={{fontSize:8.5,color:C.inkLight}}>שם משפחה</span>
          </div>
        </div>
        <div style={{height:23,borderRadius:6,background:C.white,
          border:`1px solid ${C.bluePale}`,display:"flex",alignItems:"center",paddingInlineStart:6}}>
          <span style={{fontSize:8.5,color:C.inkLight}}>your@email.com</span>
        </div>
        <div style={{height:23,borderRadius:6,background:C.white,
          border:`1px solid ${C.bluePale}`,display:"flex",alignItems:"center",paddingInlineStart:6}}>
          <span style={{fontSize:8.5,color:C.inkLight}}>מקצוע · עיר</span>
        </div>
        <div style={{position:"relative",marginTop:2}}>
          <div style={{height:28,borderRadius:8,
            background:`linear-gradient(135deg,${C.blue},${C.blueD})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 3px 10px rgba(68,114,184,0.3)`}}>
            <span style={{fontSize:10,fontWeight:700,color:"#fff"}}>הצטרפי ←</span>
          </div>
          <div style={{position:"absolute",top:-16,insetInlineEnd:16,fontSize:14}}>👆</div>
        </div>
      </div>
    </div>
  );
}

function MockupFeed() {
  return (
    <div style={{background:"#1a2f5e",borderRadius:14,overflow:"hidden",height:200,marginTop:16,
      display:"flex",boxShadow:"0 4px 20px rgba(26,47,94,0.2)"}}>
      <MockupSidebar active="home"/>
      <div style={{flex:1,background:"#fdf9f7",borderRadius:"0 14px 14px 0",
        padding:"10px 10px",display:"flex",flexDirection:"column",gap:7,overflow:"hidden"}}>
        {/* Page header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:1}}>
          <span style={{fontSize:10,fontWeight:800,color:C.blueD}}>פיד הקהילה</span>
          <div style={{width:22,height:22,borderRadius:"50%",
            background:`linear-gradient(135deg,${C.coral},${C.coralD})`,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:9,fontWeight:700,color:"#fff"}}>מ</span>
          </div>
        </div>
        {/* Birthday post — coral highlight */}
        <div style={{background:C.white,borderRadius:8,padding:"7px 8px",
          border:`2px solid ${C.coral}`,position:"relative",
          boxShadow:`0 2px 8px rgba(232,115,90,0.12)`}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <div style={{width:17,height:17,borderRadius:"50%",
              background:`linear-gradient(135deg,${C.coral},${C.coralL})`}}/>
            <span style={{fontSize:9,fontWeight:700,color:C.ink}}>🎂 יום הולדת שמח, רחל!</span>
          </div>
          <div style={{height:5,borderRadius:3,background:C.bluePale,width:"75%"}}/>
          <div style={{position:"absolute",top:-9,insetInlineEnd:6,fontSize:15}}>👆</div>
        </div>
        {/* Regular post */}
        <div style={{background:C.white,borderRadius:8,padding:"7px 8px",
          border:`1px solid ${C.bluePale}`}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <div style={{width:17,height:17,borderRadius:"50%",
              background:`linear-gradient(135deg,${C.blue},${C.blueL})`}}/>
            <span style={{fontSize:9,fontWeight:700,color:C.ink}}>📢 הזדמנות חדשה</span>
          </div>
          <div style={{height:5,borderRadius:3,background:C.bluePale,width:"62%"}}/>
        </div>
        {/* Third post */}
        <div style={{background:C.white,borderRadius:8,padding:"7px 8px",
          border:`1px solid ${C.bluePale}`}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <div style={{width:17,height:17,borderRadius:"50%",background:"linear-gradient(135deg,#7ba87a,#4a6741)"}}/>
            <span style={{fontSize:9,fontWeight:700,color:C.ink}}>📝 שאלה לקהילה</span>
          </div>
          <div style={{height:5,borderRadius:3,background:C.bluePale,width:"50%"}}/>
        </div>
      </div>
    </div>
  );
}

function MockupSearch() {
  const members = [
    {init:"ד",color:C.blue,role:"עו\"ד"},
    {init:"מ",color:C.coral,role:"רופאה"},
    {init:"ר",color:"#7ba87a",role:"הנדסה"},
  ];
  return (
    <div style={{background:"#1a2f5e",borderRadius:14,overflow:"hidden",height:200,marginTop:16,
      display:"flex",boxShadow:"0 4px 20px rgba(26,47,94,0.2)"}}>
      <MockupSidebar active="search"/>
      <div style={{flex:1,background:"#fdf9f7",borderRadius:"0 14px 14px 0",
        padding:"10px 10px",display:"flex",flexDirection:"column",gap:7,overflow:"hidden"}}>
        {/* Search bar */}
        <div style={{position:"relative"}}>
          <div style={{height:26,borderRadius:8,background:C.white,
            border:`2px solid ${C.blue}`,display:"flex",alignItems:"center",gap:5,paddingInlineStart:7}}>
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="4"/><line x1="9.8" y1="9.8" x2="14" y2="14"/>
            </svg>
            <span style={{fontSize:9,color:C.inkLight}}>מקצוע, עיר, שם...</span>
          </div>
          <div style={{position:"absolute",top:-13,insetInlineEnd:6,fontSize:13}}>👆</div>
        </div>
        {/* Filter pills */}
        <div style={{display:"flex",gap:5}}>
          <div style={{height:18,borderRadius:99,background:`${C.blue}16`,
            border:`1px solid ${C.blue}`,paddingInline:7,display:"flex",alignItems:"center"}}>
            <span style={{fontSize:8,fontWeight:600,color:C.blue}}>תל אביב</span>
          </div>
          <div style={{height:18,borderRadius:99,background:`${C.coral}12`,
            border:`1px solid ${C.coral}`,paddingInline:7,display:"flex",alignItems:"center"}}>
            <span style={{fontSize:8,fontWeight:600,color:C.coral}}>קידום קריירה</span>
          </div>
        </div>
        {/* Members grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {members.map((m,i)=>(
            <div key={i} style={{background:C.white,borderRadius:8,padding:"7px 5px",
              border:`1px solid ${C.bluePale}`,textAlign:"center",
              boxShadow:"0 1px 4px rgba(68,114,184,0.07)"}}>
              <div style={{width:26,height:26,borderRadius:"50%",margin:"0 auto 4px",
                background:`linear-gradient(135deg,${m.color},${m.color}99)`,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{m.init}</span>
              </div>
              <div style={{fontSize:8,fontWeight:600,color:C.ink}}>{m.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockupRequest() {
  return (
    <div style={{background:"#1a2f5e",borderRadius:14,overflow:"hidden",height:200,marginTop:16,
      display:"flex",boxShadow:"0 4px 20px rgba(26,47,94,0.2)"}}>
      <MockupSidebar active="search"/>
      <div style={{flex:1,background:"#fdf9f7",borderRadius:"0 14px 14px 0",
        padding:"13px 12px",display:"flex",flexDirection:"column",gap:8,overflow:"hidden"}}>
        {/* Member card */}
        <div style={{background:C.white,borderRadius:10,padding:"8px 10px",
          border:`1px solid ${C.bluePale}`,display:"flex",gap:9,alignItems:"center",
          boxShadow:"0 1px 5px rgba(68,114,184,0.08)"}}>
          <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
            background:`linear-gradient(135deg,${C.blue},${C.blueL})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 2px 8px rgba(68,114,184,0.28)`}}>
            <span style={{fontSize:15,fontWeight:800,color:"#fff"}}>מ</span>
          </div>
          <div>
            <p style={{margin:0,fontSize:10,fontWeight:800,color:C.blueD}}>מאיה כהן</p>
            <p style={{margin:0,fontSize:8.5,color:C.blue,fontWeight:600}}>רופאה · תל אביב</p>
            <div style={{display:"flex",gap:3,marginTop:4}}>
              {["קידום קריירה","ניהול"].map((tag,i)=>(
                <div key={i} style={{height:14,borderRadius:99,background:`${C.blue}14`,paddingInline:5,
                  display:"flex",alignItems:"center"}}>
                  <span style={{fontSize:7,fontWeight:600,color:C.blue}}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{height:5,borderRadius:3,background:C.bluePale,width:"85%"}}/>
        <div style={{height:5,borderRadius:3,background:C.bluePale,width:"65%"}}/>
        {/* CTA button — highlighted */}
        <div style={{position:"relative",marginTop:4}}>
          <div style={{height:30,borderRadius:9,
            background:`linear-gradient(135deg,${C.coral},${C.coralD})`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:5,
            boxShadow:`0 4px 14px rgba(232,115,90,0.32)`}}>
            <span style={{fontSize:12}}>📩</span>
            <span style={{fontSize:10,fontWeight:700,color:"#fff"}}>שלחי בקשת עזרה</span>
          </div>
          <div style={{position:"absolute",top:-14,insetInlineEnd:"22%",fontSize:14}}>👆</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SCREENSHOT FLIP GUIDE
═══════════════════════════════════ */
function ScreenshotFlipGuide({ T, onLogin, C }) {
  const [cur, setCur]       = useState(0);
  const [phase, setPhase]   = useState("idle"); // idle | exit | enter
  const total = T.howSteps.length;

  const advance = useCallback((dir) => {
    if (phase !== "idle") return;
    setPhase("exit");
    setTimeout(() => {
      setCur(c => (c + dir + total) % total);
      setPhase("enter");
      setTimeout(() => setPhase("idle"), 380);
    }, 350);
  }, [phase, total]);

  const mockups = [MockupSignup, MockupFeed, MockupSearch, MockupRequest];
  const MockupComp = mockups[cur % mockups.length];
  const step = T.howSteps[cur];

  const frontStyle = {
    idle:  { transform:"rotateX(0) scale(1)",   opacity:1,   transition:"transform 0.38s cubic-bezier(0.2,0.8,0.2,1),opacity 0.38s ease" },
    exit:  { transform:"rotateX(-85deg) scale(0.92)", opacity:0, transition:"transform 0.35s ease,opacity 0.35s ease" },
    enter: { transform:"rotateX(80deg)  scale(0.92)", opacity:0, transition:"none" },
  };

  return (
    <div style={{perspective:"1200px",position:"relative",minHeight:420}}>
      {/* Stacked backing cards */}
      {[2,1].map(offset=>(
        <div key={offset} style={{
          position:"absolute",
          top:offset*8, left:offset*6, right:offset*6,
          height:"calc(100% - "+(offset*16)+"px)",
          background:C.card,borderRadius:24,
          border:`1px solid ${C.bluePale}`,
          transform:`rotate(${offset*2.5}deg)`,
          zIndex:3-offset,
          boxShadow:"0 4px 20px rgba(68,114,184,0.06)",
          pointerEvents:"none",
        }}/>
      ))}

      {/* Front card */}
      <div style={{
        position:"relative",zIndex:3,
        background:C.card,borderRadius:24,
        border:`1px solid ${C.bluePale}`,
        boxShadow:"0 24px 64px rgba(68,114,184,0.14)",
        overflow:"hidden",
        transformStyle:"preserve-3d",
        ...frontStyle[phase],
      }}>
        {/* Header bar */}
        <div style={{
          background:`linear-gradient(135deg,${C.blueD},${C.blue})`,
          padding:"1.2rem 1.5rem",
          display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{
              width:36,height:36,borderRadius:10,
              background:"rgba(255,255,255,0.2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:15,fontWeight:900,color:"#fff",
              fontFamily:"'Playfair Display',Georgia,serif",
            }}>{step.num}</div>
            <h3 style={{fontSize:15,fontWeight:800,color:"#fff",margin:0}}>{step.title}</h3>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:600}}>{cur+1}/{total}</div>
        </div>

        <div style={{padding:"1.25rem 1.5rem"}}>
          <p style={{fontSize:16,color:C.inkMid,lineHeight:1.8,margin:"0 0 0.5rem"}}>{step.body}</p>

          {/* Mockup screenshot */}
          <MockupComp/>

          {/* Navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:16}}>
            <button onClick={()=>advance(-1)} style={{
              width:38,height:38,borderRadius:"50%",border:`1.5px solid ${C.bluePale}`,
              background:C.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              color:C.blue,transition:"all 0.2s",
            }}
              onMouseOver={e=>{e.currentTarget.style.background=C.bluePale;}}
              onMouseOut={e =>{e.currentTarget.style.background=C.card;}}
            >
              <span style={{transform:"scaleX(-1)",display:"block"}}>{Ic.chev}</span>
            </button>

            {/* Dot indicators */}
            <div style={{display:"flex",gap:6}}>
              {Array.from({length:total}).map((_,i)=>(
                <div key={i} onClick={()=>{ if(i!==cur){ const d=i>cur?1:-1; advance(d<0?-1:1); } }} style={{
                  width:i===cur?20:7,height:7,borderRadius:99,cursor:"pointer",
                  background:i===cur?C.blue:C.bluePale,
                  transition:"all 0.3s",
                }}/>
              ))}
            </div>

            <button onClick={()=>advance(1)} style={{
              width:38,height:38,borderRadius:"50%",border:`1.5px solid ${C.bluePale}`,
              background:C.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              color:C.blue,transition:"all 0.2s",
            }}
              onMouseOver={e=>{e.currentTarget.style.background=C.bluePale;}}
              onMouseOut={e =>{e.currentTarget.style.background=C.card;}}
            >{Ic.chev}</button>
          </div>

          {/* Join CTA on last step */}
          {cur===total-1&&(
            <button onClick={onLogin} style={{
              width:"100%",marginTop:16,
              background:`linear-gradient(135deg,${C.blue},${C.blueD})`,
              color:"#fff",border:"none",borderRadius:12,
              padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",
              boxShadow:"0 6px 20px rgba(68,114,184,0.3)",
              transition:"transform 0.2s,box-shadow 0.2s",
            }}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 28px rgba(68,114,184,0.42)";}}
              onMouseOut={e =>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 6px 20px rgba(68,114,184,0.3)";}}
            >{T.ctaJoin} →</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════ */
export default function LandingPage({ onLogin }) {
  const { isRTL, lang, setLang } = useLang();
  const isMobile = useIsMobile();
  const { dark, toggleTheme } = useTheme();
  const C = dark ? C_DARK : C_LIGHT;
  const T   = LP[lang] ?? LP.he;
  const dir = isRTL ? "rtl" : "ltr";

  const [introComplete, setIntroDone] = useState(false);
  const [heroReady,     setHeroReady] = useState(false);
  const [rippling,      setRippling]  = useState(false);

  const heroRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow    = "auto";
    document.body.style.height      = "auto";
    document.documentElement.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) { root.style.height="auto"; root.style.overflow="visible"; }
    return () => {
      document.body.style.overflow=""; document.body.style.height="";
      document.documentElement.style.overflow="";
      if (root) { root.style.height=""; root.style.overflow=""; }
    };
  }, []);

  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    setTimeout(() => setHeroReady(true), 80);
  }, []);

  const handleJoin = useCallback(() => {
    setRippling(true);
    setTimeout(() => { setRippling(false); onLogin(); }, 680);
  }, [onLogin]);

  const [featuredLeaders, setFeaturedLeaders] = useState(null);
  useEffect(() => {
    getDocs(query(collection(db, "featuredMembers"), orderBy("order")))
      .then(snap => {
        if (snap.empty) return;
        setFeaturedLeaders(snap.docs.map(d => {
          const v = d.data();
          return {
            name:        (lang === "he" ? v.nameHe : lang === "ar" ? v.nameAr : v.name) || v.name,
            role:        (lang === "he" ? v.roleHe : lang === "ar" ? v.roleAr : v.role) || v.role,
            achievement: (lang === "he" ? v.achievementHe : lang === "ar" ? v.achievementAr : v.achievement) || v.achievement,
            photo:       v.photo || null,
          };
        }));
      })
      .catch(() => {});
  }, [lang]);
  const leaders    = featuredLeaders ?? T.leadersData;
  const featAccents = [C.blue,C.coral,C.blue,C.coral,C.blue,C.coral];
  const featIcons   = [Ic.mentor,Ic.lead,Ic.comm,Ic.net,Ic.activ,Ic.grad];

  // scroll-reveal refs
  const [featRef,  featVis]  = useInView(0.10);
  const [leadRef,  leadVis]  = useInView(0.08);
  const [ctaRef,   ctaVis]   = useInView(0.12);
  const [howRef,   howVis]   = useInView(0.08);
  const [footRef,  footVis]  = useInView(0.10);
  const [quoteRef, quoteVis] = useInView(0.05);
  const [photoRef, photoVis] = useInView(0.15);

  // Track when hero scrolls out of view → show fixed nav dots
  const [heroOut, setHeroOut] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => setHeroOut(!entry.isIntersecting),
      { threshold: 0.05 }
    );
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  const navSections = [
    { icon: Ic.star,    label: T.navFeatures, ref: featRef },
    { icon: Ic.grad,    label: T.navHow,      ref: howRef  },
    { icon: Ic.people,  label: T.navLead,     ref: leadRef },
  ];

  const reveal = (vis, delay="0s") => ({
    className:"lp-reveal",
    style:{
      opacity: vis ? 1 : 0,
      transform: vis ? "none" : "translateY(36px)",
      transitionDelay: delay,
    },
  });

  return (
    <div className="lp-root" style={{minHeight:"100vh",overflowX:"hidden",direction:dir}}>
      {!introComplete && <IntroOverlay T={T} onDone={handleIntroDone}/>}
      <FloatNavDots sections={navSections} visible={heroOut && !isMobile} isRTL={isRTL} C={C}/>

      {/* ══════════════════════════════════════
          HERO — full cream background, waves,
          sonar rings behind logo,
          mix-blend-mode on mascot
      ══════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          minHeight:"100dvh",
          display:"grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          position:"relative",
          background: isMobile
            ? `linear-gradient(160deg,${C.blueD} 0%,${C.blue} 60%,${C.blueL} 100%)`
            : "var(--lp-bg)",
        }}
      >
        <BackgroundBlobs/>

        {/* Vertical blob — organic divider, hidden on mobile */}
        {!isMobile && <div style={{
          position:"absolute",
          ...(isRTL ? {left:"-5%"} : {right:"-5%"}),
          top:"-25%",
          width:"62%", height:"150%",
          background:C.blueD,
          animation:"lp-blob-morph 22s ease-in-out infinite",
          willChange:"border-radius, transform",
          zIndex:4,
          pointerEvents:"none",
        }}/>}
        {/* Small circle blob — hidden on mobile */}
        {!isMobile && <div style={{
          position:"absolute",
          ...(isRTL ? {right:"31%"} : {left:"31%"}),
          bottom:"14%",
          width:120, height:120,
          borderRadius:"50%",
          background:C.blueD,
          animation:"lp-float-b 12s 2s ease-in-out infinite",
          zIndex:4,
          pointerEvents:"none",
        }}/>}


        {/* ── TOP BAR: BogrotNet brand + lang switcher ── */}
        <div style={{
          position:"absolute",top:0,left:0,right:0,zIndex:10,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding: isMobile ? "14px 16px" : "20px 28px",
        }}>
          {/* BogrotNet — BIG brand name */}
          <div style={{
            display:"flex",alignItems:"center",gap:10,
            animation:heroReady?"lp-fade-up 0.6s 0.2s ease both":"none",
            opacity:heroReady?undefined:0,
          }}>
            <img src="/NewLogoNGO.png"
              onError={e=>{e.target.style.display="none";}}
              alt="BogrotNet"
              style={{width:38,height:38,objectFit:"contain",borderRadius:"50%",
                background:"rgba(255,255,255,0.12)",border:`2px solid ${C.bluePale}`,padding:3,flexShrink:0}}
            />
            <div>
              <div style={{
                fontFamily:"'Playfair Display',Georgia,serif",
                fontSize:"clamp(22px,2.4vw,34px)",fontWeight:900,
                color: isMobile ? C.white : C.blueD,letterSpacing:"-0.02em",lineHeight:1,
              }}>BogrotNet</div>
              <div style={{fontSize:10,fontWeight:600,color: isMobile ? "rgba(255,255,255,0.55)" : C.inkLight,letterSpacing:"0.12em",textTransform:"uppercase"}}>
                {T.tagline}
              </div>
            </div>
          </div>

          {/* Language switcher + theme toggle */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={toggleTheme} title={dark?"Switch to light":"Switch to dark"} style={{
              width:32,height:32,borderRadius:"50%",
              background: isMobile ? "rgba(255,255,255,0.15)" : C.bluePale,
              border:`1px solid ${isMobile?"rgba(255,255,255,0.3)":C.bluePale}`,
              color: isMobile ? C.white : C.blue,
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,transition:"all 0.18s",
            }}>
              {dark
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <div style={{display:"flex",gap:6}}>
              {[{code:"he",label:"עב"},{code:"en",label:"EN"},{code:"ar",label:"عر"}].map(({code,label})=>(
                <button key={code} onClick={()=>setLang(code)} style={{
                  padding:"5px 13px",borderRadius:999,border:"none",
                  background: isMobile
                    ? (lang===code ? C.white : "rgba(255,255,255,0.12)")
                    : (lang===code ? C.blue : C.white),
                  color: isMobile
                    ? (lang===code ? C.blue : C.white)
                    : (lang===code ? C.white : C.blue),
                  fontSize:11,fontWeight:700,cursor:"pointer",
                  transition:"all 0.18s",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
                  border:`1px solid ${lang===code?C.blue:C.bluePale}`,
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* BogrotNet badge — bottom left, hidden on mobile */}
        {!isMobile && heroReady && (
          <div style={{
            position:"absolute",
            [isRTL?"right":"left"]:28,bottom:110,
            zIndex:10,
            background:"rgba(255,255,255,0.92)",
            backdropFilter:"blur(12px)",
            borderRadius:999,padding:"6px 14px",
            border:`1px solid ${C.bluePale}`,
            fontSize:11,fontWeight:700,color:C.blue,
            boxShadow:"0 4px 16px rgba(68,114,184,0.12)",
            animation:"lp-hint 3s 1s ease-in-out infinite",
          }}>{T.bogrotBadge}</div>
        )}

        {/* NAV CIRCLES — fixed to right edge, visible only while hero is in view */}
        {heroReady && (!heroOut || isMobile) && (
          <div style={{
            position:"fixed",
            [isRTL?"left":"right"]:isMobile?8:22,
            top:"50%",transform:"translateY(-50%)",
            zIndex:50,display:"flex",flexDirection:"column",gap:isMobile?8:12,
          }}>
            <NavCircle icon={Ic.star}   title={T.navFeatures} sub={T.navFeaturesSub} delay={600}   C={C} small={isMobile}
              onClick={()=>featRef.current?.scrollIntoView({behavior:"smooth",block:"start"})}/>
            <NavCircle icon={Ic.grad}   title={T.navHow}      sub={T.navHowSub}      delay={850}   C={C} small={isMobile}
              onClick={()=>howRef.current?.scrollIntoView({behavior:"smooth",block:"start"})}/>
            <NavCircle icon={Ic.people} title={T.navLead}     sub={T.navLeadSub}     delay={1100}  C={C} small={isMobile}
              onClick={()=>leadRef.current?.scrollIntoView({behavior:"smooth",block:"start"})}/>
          </div>
        )}

        {/* LEFT — character mascot on cream bg, sonar rings behind it */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          position:"relative",
          paddingTop: isMobile ? 88 : 80,
          paddingBottom: isMobile ? 8 : 60,
          zIndex:6,
          opacity:heroReady?1:0,transition:"opacity 0.5s ease",
        }}>
          {/* Sonar rings sit behind the image */}
          <SonarRings/>
          <img
            src="/NewLogoNGO.png"
            alt="YWP mascot"
            onError={e=>{
              e.target.style.display="none";
            }}
            style={{
              width: isMobile ? "clamp(140px,50vw,210px)" : "clamp(340px,44vw,580px)",
              objectFit:"contain",
              display:"block",position:"relative",zIndex:3,
              animation:heroReady?(isRTL?"lp-char-rtl 5s 1s ease-in-out infinite":"lp-char 5s 1s ease-in-out infinite"):"none",
              transformOrigin:"bottom center",
              transform: heroReady ? undefined : (isRTL ? "scaleX(-1)" : "none"),
              filter:"drop-shadow(0 8px 32px rgba(68,114,184,0.22))",
            }}
          />
        </div>

        {/* RIGHT — text on cream bg */}
        <div style={{
          display:"flex",flexDirection:"column",justifyContent:"center",
          padding: isMobile ? "0 1.5rem 3rem" : "clamp(2rem,5vw,4.5rem)",
          paddingTop: isMobile ? 8 : 100,
          alignItems: isMobile ? "center" : undefined,
          textAlign: isMobile ? "center" : undefined,
          zIndex:6,
          animation:heroReady?"lp-text-in 0.85s 0.18s cubic-bezier(0.22,1,0.36,1) both":"none",
          opacity:heroReady?undefined:0,
        }}>
          <h1 style={{
            fontSize:"clamp(34px,4.6vw,66px)",fontWeight:900,
            lineHeight:1.05,color:C.white,margin:"0 0 1.6rem",
            textShadow:"0 2px 16px rgba(0,0,0,0.18)",
            animation:heroReady?"lp-fade-up 0.7s 0.4s ease both":"none",
          }}>
            {T.h1a}<br/>
            <span style={{color:C.bluePale}}>{T.h1b}</span>{" "}
            <em style={{color:C.coralL}}>{T.h1c}</em>
          </h1>

          <p style={{
            fontSize:"clamp(15px,1.5vw,18px)",color:"rgba(255,255,255,0.88)",
            lineHeight:1.85,maxWidth: isMobile ? "100%" : 460,marginBottom: isMobile ? "1.75rem" : "2.5rem",
            animation:heroReady?"lp-fade-up 0.7s 0.55s ease both":"none",
          }}>{T.desc}</p>

          <div style={{
            display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",
            justifyContent: isMobile ? "center" : undefined,
            animation:heroReady?"lp-fade-up 0.7s 0.68s ease both":"none",
          }}>
            <button onClick={handleJoin} style={{
              position:"relative",overflow:"hidden",
              background:C.coral,color:C.white,border:"none",
              padding:"15px 36px",borderRadius:999,
              fontSize:15,fontWeight:700,cursor:"pointer",
              boxShadow:"0 8px 26px rgba(232,115,90,0.45)",
              transition:"transform 0.2s,box-shadow 0.2s",
            }}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 34px rgba(232,115,90,0.58)";}}
              onMouseOut={e =>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 8px 26px rgba(232,115,90,0.45)";}}
            >
              {rippling&&<span style={{position:"absolute",inset:0,margin:"auto",width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.45)",animation:"lp-ripple 0.65s ease-out forwards"}}/>}
              {T.join}
            </button>
            <button onClick={onLogin} style={{
              background:"rgba(255,255,255,0.18)",color:C.white,
              border:"2px solid rgba(255,255,255,0.5)",
              padding:"13px 28px",borderRadius:999,
              fontSize:15,fontWeight:600,cursor:"pointer",
              backdropFilter:"blur(8px)",transition:"all 0.2s",
            }}
              onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.30)";}}
              onMouseOut={e =>{e.currentTarget.style.background="rgba(255,255,255,0.18)";}}
            >{T.explore}</button>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════
          WATER BLOB QUOTE — organic animated blue bubble
      ══════════════════════════════════════ */}
      <div ref={quoteRef} style={{
        position:"relative",
        background:"var(--lp-bg)",
        minHeight: isMobile ? 380 : 520,
        overflow:"hidden",
        zIndex:1,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {/* Main bubble — solid dark blue full bubble, no fading */}
        <div style={{
          position:"absolute",
          top:"4%", left:"8%",
          width:"70%", height:"92%",
          background:"#12275f",
          borderRadius:"62% 38% 56% 44% / 52% 62% 38% 48%",
          animation:"lp-blob-morph 18s ease-in-out infinite",
          willChange:"border-radius, transform",
          pointerEvents:"none",
        }}/>
        {/* Right vertical blob — lighter accent */}
        <div style={{
          position:"absolute",
          top:"8%", right:"4%",
          width:"22%", height:"84%",
          background:"#6da3d4",
          animation:"lp-blob-morph-b 22s 4s ease-in-out infinite",
          willChange:"border-radius, transform",
          pointerEvents:"none",
        }}/>

        {/* Quote — centered inside the dark blue blob */}
        <div style={{
          position:"relative",zIndex:2,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding: isMobile ? "3rem 2rem" : "3rem clamp(3rem,10vw,14rem)",
          textAlign:"center",
          width:"100%",
        }}>
          <div className="lp-reveal" style={{
            opacity:quoteVis?1:0,
            transform:quoteVis?"none":"translateY(36px) scale(0.96)",
            filter:quoteVis?"none":"blur(6px)",
            maxWidth:620, width:"100%",
            display:"flex", flexDirection:"column", alignItems:"center",
          }}>
            <div style={{
              width:quoteVis?60:0,height:3,borderRadius:99,
              background:`linear-gradient(to right,${C.coral},${C.coralL})`,
              marginBottom:"1.4rem",
              transition:"width 0.8s 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}/>
            <blockquote style={{
              fontSize:"clamp(17px,2.1vw,26px)",fontWeight:600,
              color:C.white,lineHeight:1.8,margin:0,
              fontFamily:"'Plus Jakarta Sans','Outfit',system-ui,sans-serif",
              fontStyle:"normal",
              textShadow:"0 2px 16px rgba(0,0,0,0.4)",
              textAlign:"center",
              direction:"inherit",
            }}>
              {T.quoteText}
            </blockquote>
            <p style={{
              fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.55)",
              letterSpacing:"0.1em",textTransform:"uppercase",
              margin:"1.2rem 0 0", textAlign:"center",
            }}>
              {T.quoteAuthor}
            </p>
            <div style={{
              width:quoteVis?80:0,height:3,borderRadius:99,
              background:`linear-gradient(to right,${C.coralL},${C.coral})`,
              marginTop:"1.8rem",
              transition:"width 0.8s 0.4s cubic-bezier(0.2,0.8,0.2,1)",
            }}/>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          GROUP PHOTO — early, impactful
      ══════════════════════════════════════ */}
      <div ref={photoRef} style={{
        position:"relative",overflow:"hidden",
        backgroundImage:"url('/background.jpg')",
        backgroundSize:"cover",backgroundPosition:"center 55%",
        height:"clamp(420px,58vw,680px)",
      }}>
        <div style={{
          position:"absolute",inset:0,
          background:`linear-gradient(to bottom,var(--lp-bg) 0%,transparent 18%,rgba(29,72,150,0.25) 65%,var(--lp-bg) 96%)`,
        }}/>
        <div className="lp-reveal" style={{
          position:"absolute",top:"50%",left:"50%",
          transform:photoVis?"translate(-50%,-50%)":"translate(-50%,-42%) scale(0.96)",
          opacity:photoVis?1:0,
          filter:photoVis?"none":"blur(6px)",
          textAlign:"center",zIndex:1,color:C.white,width:"100%",
          transition:"opacity 0.9s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1), filter 0.9s ease",
        }}>
          <p style={{fontSize:"clamp(11px,1.3vw,15px)",fontWeight:800,margin:0,
            letterSpacing:"0.2em",textTransform:"uppercase",
            color:"rgba(255,255,255,0.85)",marginBottom:10,
            textShadow:"0 1px 8px rgba(0,0,0,0.55)"}}>{T.leadLabel}</p>
          <p style={{fontSize:"clamp(28px,4.5vw,56px)",fontWeight:900,margin:0,
            fontFamily:"'Playfair Display',Georgia,serif",
            textShadow:"0 2px 18px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)"}}>{T.leadH2}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section ref={featRef} style={{background:"var(--lp-bg)",padding:"5rem clamp(1.5rem,6vw,5rem)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div {...reveal(featVis)}>
          <p style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.coral,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:"0.6rem"}}>{T.featLabel}</p>
          <h2 style={{textAlign:"center",fontSize:"clamp(30px,4vw,50px)",fontWeight:900,color:C.ink,marginBottom:"0.9rem"}}>{T.featH2}</h2>
          <p style={{textAlign:"center",color:C.inkLight,fontSize:17,maxWidth:560,margin:"0 auto 3.5rem",lineHeight:1.8}}>{T.featSub}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"1.25rem"}}>
            {T.features.map((f,i)=>(
              <div key={i} className="lp-reveal" style={{
                opacity:featVis?1:0,
                transform:featVis?"none":(i%3===0?"translateX(-44px) scale(0.94)":i%3===1?"translateY(44px) scale(0.94)":"translateX(44px) scale(0.94)"),
                filter:featVis?"none":"blur(4px)",
                transitionDelay:`${i*0.09}s`,
              }}>
                <FeatureCard icon={featIcons[i]} title={f.title} body={f.body} accent={featAccents[i]} C={C}/>
              </div>
            ))}
          </div>
          </div>{/* close reveal wrapper */}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SCREENSHOT FLIP GUIDE — how to use
      ══════════════════════════════════════ */}
      <section ref={howRef} style={{background:"var(--lp-bg-blue)",padding:"5.5rem clamp(1.5rem,6vw,5rem)"}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div className="lp-reveal" style={{opacity:howVis?1:0,transform:howVis?"none":"translateY(28px)"}}>
            <p style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.blue,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:"0.6rem"}}>{T.howLabel}</p>
            <h2 style={{textAlign:"center",fontSize:"clamp(28px,3.6vw,46px)",fontWeight:900,color:C.ink,marginBottom:"0.9rem"}}>{T.howH2}</h2>
            <p style={{textAlign:"center",color:C.inkLight,fontSize:17,maxWidth:480,margin:"0 auto 3rem",lineHeight:1.8}}>{T.howSub}</p>
          </div>
          <div className="lp-reveal" style={{opacity:howVis?1:0,transform:howVis?"none":"translateY(40px) scale(0.95)",filter:howVis?"none":"blur(5px)",transitionDelay:"0.15s"}}>
            <ScreenshotFlipGuide T={T} onLogin={handleJoin} C={C}/>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          WOMEN WHO LEAD
      ══════════════════════════════════════ */}
      <section ref={leadRef} style={{background:"var(--lp-bg)",padding:"5rem clamp(1.5rem,6vw,5rem)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",
          background:`radial-gradient(circle,${C.bluePale} 0%,transparent 70%)`,
          filter:"blur(50px)",pointerEvents:"none"}}/>
        <div style={{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>
          <div className="lp-reveal" style={{opacity:leadVis?1:0,transform:leadVis?"none":"translateY(32px)"}}>
            <p style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.coral,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:"0.6rem"}}>{T.leadLabel}</p>
            <h2 style={{textAlign:"center",fontSize:"clamp(30px,4vw,50px)",fontWeight:900,color:C.ink,marginBottom:"0.9rem"}}>{T.leadH2}</h2>
            <p style={{textAlign:"center",color:C.inkLight,fontSize:17,maxWidth:540,margin:"0 auto 3.5rem",lineHeight:1.8}}>{T.leadSub}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:"1.5rem"}}>
            {leaders.map((l,i)=>(
              <div key={i} className="lp-reveal" style={{
                opacity:leadVis?1:0,
                transform:leadVis?"none":(i===0?"translateX(-52px) scale(0.92)":i===1?"translateY(52px) scale(0.92)":"translateX(52px) scale(0.92)"),
                filter:leadVis?"none":"blur(6px)",
                transitionDelay:`${0.1+i*0.16}s`,
              }}>
                <LeaderCard {...l} delay="0s" C={C}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FINAL CTA — logo inline with heading
      ══════════════════════════════════════ */}
      <section ref={ctaRef} style={{
        background:`linear-gradient(135deg,${C.blueD} 0%,${C.blue} 55%,${C.blueL} 100%)`,
        backgroundSize:"300% 300%",animation:"lp-grad 9s ease infinite",
        padding:"6rem clamp(1.5rem,6vw,5rem)",
        textAlign:"center",position:"relative",overflow:"hidden",
      }}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",opacity:0.06,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.5) 40px,rgba(255,255,255,0.5) 41px)"}}/>
        <div className="lp-reveal" style={{
          maxWidth:640,margin:"0 auto",position:"relative",zIndex:1,
          opacity:ctaVis?1:0,
          transform:ctaVis?"none":"scale(0.88) translateY(24px)",
          filter:ctaVis?"none":"blur(8px)",
        }}>
          <div style={{
            display:"flex",alignItems:"center",justifyContent:"center",
            gap:16,marginBottom:"1.1rem",
          }}>
            <img src="/NewLogoNGO.png"
              onError={e=>{e.target.style.display="none";}}
              alt="" style={{width:68,height:68,objectFit:"contain",flexShrink:0,
                background:"rgba(255,255,255,0.15)",borderRadius:"50%",padding:6,
                boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}/>
            <h2 style={{fontSize:"clamp(28px,4vw,52px)",fontWeight:900,color:C.white,margin:0,textAlign:"start"}}>{T.ctaH2}</h2>
          </div>
          <p style={{fontSize:18,color:"rgba(255,255,255,0.78)",lineHeight:1.85,marginBottom:"2.5rem"}}>{T.ctaDesc}</p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={handleJoin} style={{
              background:"#ffffff",color:C.blue,border:"none",
              padding:"16px 42px",borderRadius:999,fontSize:15,fontWeight:700,cursor:"pointer",
              boxShadow:"0 8px 28px rgba(0,0,0,0.18)",transition:"transform 0.2s,box-shadow 0.2s"}}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 36px rgba(0,0,0,0.24)";}}
              onMouseOut={e =>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.18)";}}
            >{T.ctaJoin}</button>
            <button onClick={onLogin} style={{
              background:"rgba(255,255,255,0.12)",color:C.white,
              border:"2px solid rgba(255,255,255,0.35)",
              padding:"14px 32px",borderRadius:999,fontSize:15,fontWeight:600,cursor:"pointer",
              transition:"all 0.2s"}}
              onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.22)";}}
              onMouseOut={e =>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}}
            >{T.ctaSign}</button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONTACT & SOCIAL
      ══════════════════════════════════════ */}
      <section ref={footRef} style={{
        background:"var(--lp-bg-blue)",
        borderTop:`1px solid ${C.bluePale}`,
        padding:"3.5rem clamp(1.5rem,6vw,5rem)",
      }}>
        <div className="lp-reveal" style={{
          maxWidth:1100,margin:"0 auto",
          display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"2.5rem",alignItems:"start",
          opacity:footVis?1:0,
          transform:footVis?"none":"translateY(32px) scale(0.97)",
          filter:footVis?"none":"blur(4px)",
        }}>
          {/* Brand */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem"}}>
              <img src="/NewLogoNGO.png"
                onError={e=>{e.target.style.display="none";}}
                alt="BogrotNet" style={{width:44,height:44,objectFit:"contain",borderRadius:"50%",
                  background:"rgba(255,255,255,0.6)",padding:4,border:`2px solid ${C.bluePale}`}}/>
              <div>
                <p style={{fontSize:16,fontWeight:900,color:C.ink,margin:0,
                  fontFamily:"'Playfair Display',Georgia,serif"}}>BogrotNet</p>
                <p style={{fontSize:11,color:C.inkLight,margin:0}}>{T.footerBrand}</p>
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <p style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:"1rem",textTransform:"uppercase",letterSpacing:"0.1em"}}>{T.followUs}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {[
                {icon:Ic.insta, label:"Instagram", href:"https://www.instagram.com/youngwomenpoliticians/"},
                {icon:Ic.linked,label:"LinkedIn",  href:"https://il.linkedin.com/company/youngwomenpoliticians"},
                {icon:Ic.fb,    label:"Facebook",  href:"https://www.facebook.com/YoungWomenPoliticians"},
              ].map(({icon,label,href})=>(
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                  display:"inline-flex",alignItems:"center",gap:10,
                  color:C.inkMid,textDecoration:"none",fontSize:14,
                  transition:"color 0.18s",
                }}
                  onMouseOver={e=>{e.currentTarget.style.color=C.blue;}}
                  onMouseOut={e =>{e.currentTarget.style.color=C.inkMid;}}
                >
                  <span style={{color:C.blue}}>{icon}</span>{label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:"1rem",textTransform:"uppercase",letterSpacing:"0.1em"}}>{T.contactTitle}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,fontSize:14,color:C.inkMid}}>
                <span style={{color:C.blue,flexShrink:0}}>{Ic.people}</span>
                <span style={{fontWeight:600,color:C.ink}}>{T.contactCEO}</span>
              </div>
              <a href="mailto:ANITZAN86@GMAIL.COM" style={{
                display:"inline-flex",alignItems:"center",gap:10,
                color:C.inkMid,textDecoration:"none",fontSize:14,transition:"color 0.18s",
              }}
                onMouseOver={e=>{e.currentTarget.style.color=C.blue;}}
                onMouseOut={e =>{e.currentTarget.style.color=C.inkMid;}}
              >
                <span style={{color:C.blue,flexShrink:0}}>{Ic.mail}</span>ANITZAN86@GMAIL.COM
              </a>
              <div style={{display:"flex",alignItems:"center",gap:10,fontSize:14,color:C.inkMid}}>
                <span style={{color:C.blue,flexShrink:0}}>{Ic.phone}</span>
                <span dir="ltr">{T.contactPhone}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER BAR */}
      <footer style={{
        background: dark ? "#0a0f1a" : "#111827", color:"rgba(255,255,255,0.35)",
        padding:"1.4rem clamp(1.5rem,6vw,5rem)",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexWrap:"wrap",gap:"0.75rem",fontSize:12,
      }}>
        <span style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:14,color:"rgba(255,255,255,0.6)"}}>BogrotNet</span>
        <span>{T.footerBrand}</span>
        <span>© 2026 · {T.footerRights}</span>
      </footer>
    </div>
  );
}
