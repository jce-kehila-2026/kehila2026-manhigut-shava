import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, getDocs, addDoc, deleteDoc, doc, query,
  orderBy, updateDoc, limit, where, setDoc, getDoc,
} from "firebase/firestore";
import { SlideshowBanner } from "./components/SlideshowBanner";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "./firebase";
import { saveContact, getContact } from "./contact";
import { deletePostWithCleanup } from "./utils/deletePost";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { logActivity } from "./activityLogger";
import { getOrCreateConversation, sendMessage } from "./hooks/useMessages";

/* ─── Admin translations ─── */
const AT = {
  he: {
    pageTitle: "לוח בקרה — מנהל", pageSub: "ניהול הפלטפורמה ואנליטיקה",
    tabs: { overview:"סקירה", users:"משתמשות", editUsers:"עריכת משתמשות", posts:"פוסטים", logs:"יומן פעילות" },
    totalMembers:"סה\"כ חברות", onlineNow:"מחוברות עכשיו", verified:"מאומתות",
    totalPosts:"סה\"כ פוסטים", conversations:"שיחות", admins:"מנהלות",
    activeMembers:"חברות פעילות", thisWeek:(n)=>`+${n} השבוע`,
    percentVerified:(p)=>`${p}% מאומתות`,
    topProfessions:"מקצועות מובילות", topCities:"ערים מובילות", recentMembers:"חברות חדשות", noData:"אין נתונים עדיין",
    searchPh:"חפשי משתמשת...", editUser:"עריכת משתמשת",
    firstName:"שם פרטי", lastName:"שם משפחה", phone:"טלפון",
    city:"עיר", profession:"מקצוע", bio:"ביוגרפיה",
    adminPriv:"הרשאות מנהל", cancel:"ביטול", save:"שמרי שינויים", saving:"שומרת...",
    deleteLbl:"מחקי", editLbl:"ערכי", makeAdmin:"הפכי למנהלת", revokeAdmin:"הסרת הרשאות מנהל", editPermsBtn:"ערכי הרשאות",
    refresh:"רענון", filterByActor:"חפשי לפי שם...", filterByType:"סוג:",
    dataManage:"ניהול נתונים", downloadBtn:"הורדת אקסל", uploadBtn:"העלאת אקסל", importing:"מייבאת...",
    dirNote:"ייבוא יוצר רשומות מדריך בלבד (ללא חשבון התחברות).",
    created:"נוצרו", skippedDup:"דולגו (כפילות)", errorsLbl:"שגיאות", rowLbl:"שורה",
    exportTitle:"ייצוא חברות לאקסל", exportSub:"בחרי אילו שדות לכלול בקובץ.", selectAll:"בחרי הכל", clearAll:"נקי", done:"סגרי",
    goToOverview:"הצגת סטטיסטיקות", customizeStats:"התאמה אישית", customizeStatsSub:"בחרי אילו כרטיסי נתונים להציג בלשונית הנתונים.",
    profileComplete:"פרופיל מלא",
    importBadType:"קובץ לא תקין — רק .xlsx או .xls.", importEmpty:"הגיליון ריק.", importMissing:"שדות חסרים", importBadEmail:"אימייל לא תקין",
    noLogs:"אין רשומות עדיין.",
    confirmDeleteTitle:"מחיקת משתמשת", confirmDeleteMsg:(n)=>`האם את בטוחה שברצונך למחוק את ${n}? פעולה זו בלתי הפיכה.`,
    confirmDeleteBtn:"כן, מחקי", confirmMakeAdminTitle:"הוספת הרשאות מנהל",
    confirmMakeAdminMsg:(n)=>`האם את בטוחה שברצונך להעניק ל${n} הרשאות מנהל?`,
    confirmMakeAdminBtn:"כן, המשיכי", confirmRevokeAdminMsg:(n)=>`האם את בטוחה שברצונך להסיר מ${n} את הרשאות המנהל?`,
    confirmRevokeAdminBtn:"כן, הסירי",
    permsTitle:"הגדרת הרשאות מנהל", permsSub:(n)=>`בחרי מה ${n} תוכל לעשות כמנהלת`,
    editPermsTitle:(n)=>`ערכי הרשאות — ${n}`, savePerms:"שמרי והפכי למנהלת", updatePerms:"עדכני הרשאות",
    permLabels:{
      canManageUsers:"ניהול משתמשות (עריכה / מחיקה)",
      canManageContent:"ניהול תוכן (פוסטים / תגובות)",
      canViewLogs:"צפייה ביומן פעילות",
      canManageAdmins:"ניהול מנהלות והרשאות",
      canViewStats:"צפייה בנתונים וסטטיסטיקות",
      canSendAnnouncements:"שליחת הודעות לקהילה",
      canExportData:"ייצוא נתונים",
    },
    showDataTab:"נתונים", reportsTab:"דיווחים",
    noReports:"אין דיווחים עדיין.", reportFrom:"דווח ע\"י", reportedUser:"משתמשת מדווחת",
    reportReason:"סיבה", reportDate:"תאריך", reportStatus:"סטטוס",
    markResolved:"סמני כטופל", dismiss:"דחי", reportPending:"ממתין", reportResolved:"טופל",
    blacklistTab:"רשימה שחורה", blacklistAdd:"הוספה לרשימה שחורה", blacklistEmail:"כתובת אימייל",
    blacklistReason:"סיבה (רשות)", blacklistAddBtn:"חסמי", blacklistRemove:"הסר/י",
    blacklistEmpty:"הרשימה השחורה ריקה.", blacklistNote:"משתמשות עם כתובות אלו לא יוכלו להירשם או להתחבר.",
    topSectors:"אתניות / קהילה", topReligions:"זהות דתית ולאומית", topRegions:"אזורי מגורים",
    region:"אזור", campus:"קמפוס", degree:"תואר", birthdate:"תאריך לידה",
    identity:"השתייכות לאומית-דתית", ethnicity:"קהילה/אתניות",
    logDesc: {
      signup:               (n)=>`${n} נרשמה`,
      login:                (n)=>`${n} התחברה`,
      post:                 (n)=>`${n} פרסמה בקהילה`,
      post_edit:            (n)=>`${n} ערכה פוסט`,
      post_delete:          (n)=>`${n} מחקה פוסט`,
      comment:              (n)=>`${n} הגיבה על פוסט`,
      comment_edit:         (n)=>`${n} ערכה תגובה`,
      comment_delete:       (n)=>`${n} מחקה תגובה`,
      request_sent:         (n,to)=>`${n} שלחה בקשת עזרה${to?` ל${to}`:""}`,
      request_accepted:     (n)=>`${n} קיבלה בקשת עזרה`,
      request_declined:     (n)=>`${n} דחתה בקשת עזרה`,
      profile_update:       (n)=>`${n} עדכנה פרופיל`,
      admin_edit_profile:   (n,t)=>`${n} (מנהלת) ערכה פרופיל של ${t??"משתמשת"}`,
      admin_delete_post:    (n)=>`${n} (מנהלת) מחקה פוסט`,
      admin_delete_comment: (n)=>`${n} (מנהלת) מחקה תגובה`,
      default:              (n,type)=>`${n} ביצעה פעולה: ${type}`,
    },
  },
  en: {
    pageTitle: "Admin Dashboard", pageSub: "Platform management and analytics",
    tabs: { overview:"Overview", users:"Users", editUsers:"Edit Users", posts:"Posts", logs:"Activity Logs" },
    totalMembers:"Total Members", onlineNow:"Online Now", verified:"Verified",
    totalPosts:"Total Posts", conversations:"Conversations", admins:"Admins",
    activeMembers:"Active members", thisWeek:(n)=>`+${n} this week`,
    percentVerified:(p)=>`${p}% verified`,
    topProfessions:"Top Professions", topCities:"Top Cities", recentMembers:"Recent Members", noData:"No data yet",
    searchPh:"Search users...", editUser:"Edit User",
    firstName:"First Name", lastName:"Last Name", phone:"Phone",
    city:"City", profession:"Profession", bio:"Bio",
    adminPriv:"Admin privileges", cancel:"Cancel", save:"Save Changes", saving:"Saving…",
    deleteLbl:"Delete", editLbl:"Edit", makeAdmin:"Make Admin", revokeAdmin:"Revoke Admin", editPermsBtn:"Edit Permissions",
    refresh:"Refresh", filterByActor:"Filter by name...", filterByType:"Type:",
    dataManage:"Data Management", downloadBtn:"Download Excel", uploadBtn:"Upload Excel", importing:"Importing...",
    dirNote:"Import creates directory records only (no login account).",
    created:"Created", skippedDup:"Skipped (duplicate)", errorsLbl:"Errors", rowLbl:"Row",
    exportTitle:"Export Members to Excel", exportSub:"Choose which fields to include.", selectAll:"Select all", clearAll:"Clear", done:"Done",
    goToOverview:"View Statistics", customizeStats:"Customize Cards", customizeStatsSub:"Choose which stat cards to display in the data tab.",
    importBadType:"Invalid file — only .xlsx or .xls.", importEmpty:"The sheet is empty.", importMissing:"missing fields", importBadEmail:"invalid email",
    noLogs:"No logs yet.",
    confirmDeleteTitle:"Delete User", confirmDeleteMsg:(n)=>`Are you sure you want to permanently delete ${n}? This cannot be undone.`,
    confirmDeleteBtn:"Yes, Delete", confirmMakeAdminTitle:"Grant Admin Access",
    confirmMakeAdminMsg:(n)=>`Are you sure you want to make ${n} an admin?`,
    confirmMakeAdminBtn:"Yes, Continue", confirmRevokeAdminMsg:(n)=>`Are you sure you want to remove admin access from ${n}?`,
    confirmRevokeAdminBtn:"Yes, Revoke",
    permsTitle:"Set Admin Permissions", permsSub:(n)=>`Choose what ${n} can do as an admin`,
    editPermsTitle:(n)=>`Edit Permissions — ${n}`, savePerms:"Save & Make Admin", updatePerms:"Update Permissions",
    permLabels:{
      canManageUsers:"Manage Users (edit / delete)",
      canManageContent:"Manage Content (posts / comments)",
      canViewLogs:"View Activity Logs",
      canManageAdmins:"Manage Admins & Permissions",
      canViewStats:"View Statistics & Data",
      canSendAnnouncements:"Send Community Announcements",
      canExportData:"Export Data",
    },
    showDataTab:"Data", reportsTab:"Reports",
    noReports:"No reports yet.", reportFrom:"Reported by", reportedUser:"Reported user",
    reportReason:"Reason", reportDate:"Date", reportStatus:"Status",
    markResolved:"Mark Resolved", dismiss:"Dismiss", reportPending:"Pending", reportResolved:"Resolved",
    blacklistTab:"Blacklist", blacklistAdd:"Add to Blacklist", blacklistEmail:"Email address",
    blacklistReason:"Reason (optional)", blacklistAddBtn:"Block", blacklistRemove:"Remove",
    blacklistEmpty:"Blacklist is empty.", blacklistNote:"Users with these addresses cannot register or sign in.",
    topSectors:"Ethnicity / Community", topReligions:"National & Religious Identity", topRegions:"Regions",
    region:"Region", campus:"Campus", degree:"Degree", birthdate:"Date of Birth",
    identity:"National-Religious Identity", ethnicity:"Community/Ethnicity",
    logDesc: {
      signup:               (n)=>`${n} signed up`,
      login:                (n)=>`${n} logged in`,
      post:                 (n)=>`${n} posted in community`,
      post_edit:            (n)=>`${n} edited a post`,
      post_delete:          (n)=>`${n} deleted a post`,
      comment:              (n)=>`${n} commented on a post`,
      comment_edit:         (n)=>`${n} edited a comment`,
      comment_delete:       (n)=>`${n} deleted a comment`,
      request_sent:         (n,to)=>`${n} sent a help request${to?` to ${to}`:""}`,
      request_accepted:     (n)=>`${n} accepted a help request`,
      request_declined:     (n)=>`${n} declined a help request`,
      profile_update:       (n)=>`${n} updated their profile`,
      admin_edit_profile:   (n,t)=>`${n} (admin) edited profile of ${t??"user"}`,
      admin_delete_post:    (n)=>`${n} (admin) deleted a post`,
      admin_delete_comment: (n)=>`${n} (admin) deleted a comment`,
      default:              (n,type)=>`${n} performed action: ${type}`,
    },
  },
  ar: {
    pageTitle: "لوحة تحكم المشرف", pageSub: "إدارة المنصة والتحليلات",
    tabs: { overview:"نظرة عامة", users:"المستخدمات", editUsers:"تعديل المستخدمات", posts:"المنشورات", logs:"سجل النشاط" },
    totalMembers:"إجمالي الأعضاء", onlineNow:"متصلات الآن", verified:"موثّقات",
    totalPosts:"إجمالي المنشورات", conversations:"المحادثات", admins:"المشرفات",
    activeMembers:"أعضاء نشطات", thisWeek:(n)=>`+${n} هذا الأسبوع`,
    percentVerified:(p)=>`${p}% موثّقات`,
    topProfessions:"أبرز المهن", topCities:"أبرز المدن", recentMembers:"أعضاء جدد", noData:"لا توجد بيانات بعد",
    searchPh:"ابحثي عن مستخدمة...", editUser:"تعديل المستخدمة",
    firstName:"الاسم الأول", lastName:"اسم العائلة", phone:"الهاتف",
    city:"المدينة", profession:"المهنة", bio:"نبذة",
    adminPriv:"صلاحيات المشرف", cancel:"إلغاء", save:"حفظ التغييرات", saving:"جارٍ الحفظ...",
    deleteLbl:"حذف", editLbl:"تعديل", makeAdmin:"تعيين مشرفة", revokeAdmin:"إلغاء صلاحيات المشرف", editPermsBtn:"تعديل الصلاحيات",
    refresh:"تحديث", filterByActor:"ابحثي بالاسم...", filterByType:"النوع:",
    dataManage:"إدارة البيانات", downloadBtn:"تنزيل Excel", uploadBtn:"رفع Excel", importing:"جارٍ الاستيراد...",
    dirNote:"الاستيراد ينشئ سجلات دليل فقط (بدون حساب تسجيل دخول).",
    created:"أُنشئت", skippedDup:"تجاوزات (مكررة)", errorsLbl:"أخطاء", rowLbl:"صف",
    exportTitle:"تصدير الأعضاء إلى Excel", exportSub:"اختاري الحقول التي تريدين تضمينها.", selectAll:"تحديد الكل", clearAll:"مسح", done:"إغلاق",
    goToOverview:"عرض الإحصائيات", customizeStats:"تخصيص البطاقات", customizeStatsSub:"اختاري بطاقات الإحصائيات التي تريدين عرضها.",
    importBadType:"ملف غير صالح — يُقبل .xlsx أو .xls فقط.", importEmpty:"الورقة فارغة.", importMissing:"حقول مفقودة", importBadEmail:"بريد إلكتروني غير صالح",
    noLogs:"لا توجد سجلات بعد.",
    confirmDeleteTitle:"حذف المستخدمة", confirmDeleteMsg:(n)=>`هل أنت متأكدة من حذف ${n}؟ لا يمكن التراجع عن هذا الإجراء.`,
    confirmDeleteBtn:"نعم، احذفي", confirmMakeAdminTitle:"منح صلاحيات المشرف",
    confirmMakeAdminMsg:(n)=>`هل أنت متأكدة من تعيين ${n} مشرفةً؟`,
    confirmMakeAdminBtn:"نعم، تابعي", confirmRevokeAdminMsg:(n)=>`هل أنت متأكدة من إلغاء صلاحيات المشرف من ${n}؟`,
    confirmRevokeAdminBtn:"نعم، إلغاء",
    permsTitle:"تعيين صلاحيات المشرف", permsSub:(n)=>`اختاري ما يمكن لـ ${n} فعله كمشرفة`,
    editPermsTitle:(n)=>`تعديل الصلاحيات — ${n}`, savePerms:"حفظ وتعيين مشرفة", updatePerms:"تحديث الصلاحيات",
    permLabels:{
      canManageUsers:"إدارة المستخدمات (تعديل / حذف)",
      canManageContent:"إدارة المحتوى (منشورات / تعليقات)",
      canViewLogs:"عرض سجل النشاط",
      canManageAdmins:"إدارة المشرفات والصلاحيات",
      canViewStats:"عرض الإحصاءات والبيانات",
      canSendAnnouncements:"إرسال إعلانات للمجتمع",
      canExportData:"تصدير البيانات",
    },
    showDataTab:"البيانات", reportsTab:"البلاغات",
    noReports:"لا توجد بلاغات بعد.", reportFrom:"مُبلَّغ من قِبَل", reportedUser:"المستخدمة المُبلَّغ عنها",
    reportReason:"السبب", reportDate:"التاريخ", reportStatus:"الحالة",
    markResolved:"تحديد كمعالَج", dismiss:"رفض", reportPending:"قيد الانتظار", reportResolved:"تمت المعالجة",
    blacklistTab:"القائمة السوداء", blacklistAdd:"إضافة إلى القائمة السوداء", blacklistEmail:"البريد الإلكتروني",
    blacklistReason:"السبب (اختياري)", blacklistAddBtn:"حظر", blacklistRemove:"إزالة",
    blacklistEmpty:"القائمة السوداء فارغة.", blacklistNote:"لن تتمكن المستخدمات بهذه العناوين من التسجيل أو تسجيل الدخول.",
    topSectors:"الانتماء / المجتمع", topReligions:"الهوية الوطنية والدينية", topRegions:"مناطق السكن",
    region:"المنطقة", campus:"الحرم الجامعي", degree:"الدرجة العلمية", birthdate:"تاريخ الميلاد",
    identity:"الهوية الوطنية-الدينية", ethnicity:"المجتمع/الانتماء",
    logDesc: {
      signup:               (n)=>`${n} سجّلت`,
      login:                (n)=>`${n} سجّلت الدخول`,
      post:                 (n)=>`${n} نشرت في المجتمع`,
      post_edit:            (n)=>`${n} عدّلت منشوراً`,
      post_delete:          (n)=>`${n} حذفت منشوراً`,
      comment:              (n)=>`${n} علّقت على منشور`,
      comment_edit:         (n)=>`${n} عدّلت تعليقاً`,
      comment_delete:       (n)=>`${n} حذفت تعليقاً`,
      request_sent:         (n,to)=>`${n} أرسلت طلب مساعدة${to?` إلى ${to}`:""}`,
      request_accepted:     (n)=>`${n} قبلت طلب مساعدة`,
      request_declined:     (n)=>`${n} رفضت طلب مساعدة`,
      profile_update:       (n)=>`${n} حدّثت ملفها الشخصي`,
      admin_edit_profile:   (n,t)=>`${n} (مشرفة) عدّلت ملف ${t??"مستخدمة"}`,
      admin_delete_post:    (n)=>`${n} (مشرفة) حذفت منشوراً`,
      admin_delete_comment: (n)=>`${n} (مشرفة) حذفت تعليقاً`,
      default:              (n,type)=>`${n} نفّذت إجراء: ${type}`,
    },
  },
};

/* ─── Styles (our S object — used by EditUsers, Logs, EditUserModal) ─── */
const S = {
  page: { padding: "2rem 2.5rem", boxSizing: "border-box", width: "100%", fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)", flex: 1, overflow: "auto" },
  denied: { textAlign: "center", padding: "4rem", color: "#c25c5c", fontSize: "1.1rem", fontWeight: 700 },

  header: { marginBottom: "1.75rem" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text-primary,#111827)", margin: "0 0 3px" },
  sub: { fontSize: "13px", color: "var(--text-muted,#6b7280)", margin: 0 },

  tabs: { display: "flex", gap: "4px", marginBottom: "1.5rem", flexWrap: "wrap", background: "var(--bg-tertiary,#f0f6fb)", borderRadius: "var(--r-md,10px)", padding: "4px", width: "fit-content" },
  tab: (active) => ({
    padding: "7px 16px", borderRadius: "var(--r-sm,8px)", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: active ? 700 : 500, fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    background: active ? "var(--bg-primary,#fff)" : "transparent",
    color: active ? "var(--text-primary,#111827)" : "var(--text-muted,#6b7280)",
    boxShadow: active ? "var(--shadow-xs,0 1px 4px rgba(29, 72, 150,0.07))" : "none",
    transition: "all 0.15s",
  }),

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left", padding: "10px 14px",
    fontSize: "11px", fontWeight: 700, color: "var(--text-muted,#6b7280)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: "1px solid var(--border,#daeaf8)", background: "var(--bg-secondary,#f0f6fb)",
  },
  td: {
    padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary,#7a5868)",
    borderBottom: "1px solid var(--bg-tertiary,#f0f6fb)", verticalAlign: "middle",
  },
  row: { background: "var(--bg-primary,#fff)", transition: "background 0.12s" },

  name: { fontWeight: 700, color: "var(--text-primary,#111827)", margin: 0 },
  meta: { fontSize: "11px", color: "var(--text-muted,#6b7280)", margin: 0 },

  badge: (verified) => ({
    fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "99px",
    background: verified ? "#e2efe1" : "#faedd6",
    color: verified ? "#3f6a3e" : "#7a5a2e",
    border: verified ? "1px solid #cfe4ce" : "1px solid #e8c992",
  }),

  delBtn: {
    background: "none", border: "1px solid #d99090", color: "#c25c5c",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    transition: "background 0.15s",
  },
  adminBtn: {
    background: "none", border: "1px solid #a78bfa", color: "#1d4896",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    transition: "background 0.15s", marginLeft: "6px",
  },
  editBtn: {
    background: "none", border: "1px solid #93c5fd", color: "#1d4896",
    borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    transition: "background 0.15s", marginLeft: "6px",
  },
  adminBadge: {
    fontSize: "10px", fontWeight: 700, padding: "2px 9px", borderRadius: "99px",
    background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd",
  },

  empty: { textAlign: "center", padding: "3rem", color: "#d9c8ce", fontSize: "14px" },
  tableWrap: {
    background: "var(--bg-primary,#fff)", borderRadius: "16px",
    border: "1.5px solid var(--border,#daeaf8)", overflowX: "auto",
    boxShadow: "0 2px 8px rgba(29, 72, 150,0.05)",
    WebkitOverflowScrolling: "touch",
  },

  searchInput: {
    padding: "9px 14px", fontSize: "13px",
    border: "1.5px solid var(--border,#f0dce0)", borderRadius: "12px",
    color: "var(--text-primary,#1a2e42)", background: "var(--bg-secondary,#f0f6fb)",
    width: "260px", marginBottom: "1rem",
    fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
  },

  /* Modal overlay */
  overlay: {
    position: "fixed", inset: 0, background: "rgba(29, 72, 150,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: "1rem", backdropFilter: "blur(4px)",
  },
  modalBox: {
    background: "var(--bg-primary,#fff)", borderRadius: "22px", padding: "2rem",
    width: "100%", maxWidth: "480px",
    boxShadow: "0 16px 48px rgba(29, 72, 150,0.18)",
    display: "flex", flexDirection: "column", gap: "1rem",
    maxHeight: "90vh", overflowY: "auto",
  },
  modalTitle: { fontSize: "17px", fontWeight: 700, color: "var(--text-primary,#111827)", margin: 0 },
  modalLabel: { fontSize: "11px", fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" },
  modalInput: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", fontSize: "13px",
    border: "1.5px solid var(--border,#f0dce0)", borderRadius: "12px",
    color: "var(--text-primary,#1a2e42)", background: "var(--bg-secondary,#f0f6fb)",
    fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
  },
  modalActions: { display: "flex", gap: "8px", marginTop: "0.5rem" },
  saveModalBtn: {
    flex: 1, padding: "11px",
    background: "var(--brand,#4472b8)", color: "#fff",
    border: "none", borderRadius: "11px",
    fontSize: "14px", fontWeight: 700, cursor: "pointer",
  },
  cancelModalBtn: {
    flex: 1, padding: "11px",
    background: "var(--bg-tertiary,#f0f6fb)", color: "var(--text-muted,#6b7280)",
    border: "none", borderRadius: "11px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
  },

  /* Comments section per post */
  commentsWrap: {
    background: "var(--bg-secondary,#f0f6fb)", borderRadius: "12px",
    padding: "0.75rem 1rem", marginTop: "4px",
    border: "1px solid var(--border,#daeaf8)",
    display: "flex", flexDirection: "column", gap: "6px",
  },
  commentRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "6px 0", borderBottom: "1px solid var(--bg-tertiary,#f0f6fb)",
    fontSize: "12px", color: "var(--text-secondary,#7a5868)",
  },

  /* Logs tab */
  logPanel: {
    background: "var(--bg-secondary,#f0f6fb)", borderRadius: "16px",
    border: "1.5px solid var(--border,#daeaf8)",
    boxShadow: "0 2px 8px rgba(29, 72, 150,0.05)",
    overflow: "hidden",
  },
  logList: { padding: "0.5rem 0" },
  logRow: (typeColor) => ({
    display: "flex", alignItems: "flex-start", gap: "12px",
    padding: "10px 1.25rem",
    borderLeft: `3px solid ${typeColor}`,
    borderBottom: "1px solid var(--border,#daeaf8)",
    background: "var(--bg-primary,#fff)",
    transition: "background 0.12s",
    marginBottom: "2px",
  }),
  logBadge: (bg, color) => ({
    fontSize: "10px", fontWeight: 700, padding: "3px 9px",
    borderRadius: "99px", background: bg, color,
    whiteSpace: "nowrap", flexShrink: 0,
    border: `1px solid ${color}22`,
    letterSpacing: "0.04em",
  }),
  logTimestamp: { fontSize: "11px", color: "var(--text-muted,#6b7280)", whiteSpace: "nowrap", flexShrink: 0 },
  logActor: { fontSize: "13px", fontWeight: 700, color: "var(--text-primary,#111827)" },
  logDesc:  { fontSize: "12px", color: "var(--text-secondary,#7a5868)" },
  logDetails: { fontSize: "11px", color: "var(--text-muted,#6b7280)", fontStyle: "italic" },

  refreshBtn: {
    padding: "7px 16px", background: "#eff6ff", color: "#1d4896",
    border: "1.5px solid #bfdbfe", borderRadius: "9px",
    fontSize: "12px", fontWeight: 700, cursor: "pointer",
    transition: "background 0.15s",
  },
  logFilterInput: {
    padding: "7px 12px", fontSize: "12px",
    border: "1.5px solid var(--border,#f0dce0)", borderRadius: "9px",
    color: "var(--text-primary,#1a2e42)", background: "var(--bg-secondary,#f0f6fb)",
    fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
  },
};

/* ─── Helpers ─── */
function timeAgo(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function getInitials(name) {
  return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : "?";
}
function avatarColor(name) {
  const c = ["#4472b8","#1d4896","#1d4896","#7ba87a","#c25c5c","#b8895a"];
  return c[(name?.charCodeAt(0)||0) % c.length];
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div className="card slide-up" style={{
      padding: "1.25rem 1.5rem",
      borderLeft: `4px solid ${color}`,
      display: "flex", alignItems: "center", gap: "1rem",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.18s, transform 0.18s",
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform="translateY(-2px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow=""; e.currentTarget.style.transform=""; }}
      onClick={onClick}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "var(--r-md,10px)",
        background: `${color}18`, display: "flex",
        alignItems: "center", justifyContent: "center",
        color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary,#111827)", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted,#6b7280)", marginTop: 3 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: color, marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ title, count, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", marginTop: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary,#111827)" }}>{title}</h2>
        {count !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-full,99px)", background: "var(--bg-tertiary,#f0f6fb)", color: "var(--text-secondary,#7a5868)" }}>
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/* ─── Log type config ─── */
const LOG_TYPES = {
  signup:               { label: "SIGNUP",         bg: "#e2efe1", color: "#3f6a3e", borderColor: "#7ba87a" },
  login:                { label: "LOGIN",           bg: "#ccfbf1", color: "#0f766e", borderColor: "#14b8a6" },
  post:                 { label: "POST",            bg: "#dbeafe", color: "#1e40af", borderColor: "#4472b8" },
  post_edit:            { label: "POST EDIT",       bg: "#fef3c7", color: "#92400e", borderColor: "#d4a574" },
  post_delete:          { label: "POST DELETE",     bg: "#f5dada", color: "#9a4545", borderColor: "#c25c5c" },
  comment:              { label: "COMMENT",         bg: "#e0e7ff", color: "#3730a3", borderColor: "#6366f1" },
  comment_edit:         { label: "COMMENT EDIT",    bg: "#fef3c7", color: "#92400e", borderColor: "#d4a574" },
  comment_delete:       { label: "CMNT DELETE",     bg: "#f5dada", color: "#9a4545", borderColor: "#c25c5c" },
  request_sent:         { label: "REQUEST SENT",    bg: "#f3e8ff", color: "#1d4896", borderColor: "#a855f7" },
  request_accepted:     { label: "REQ ACCEPTED",    bg: "#e2efe1", color: "#3f6a3e", borderColor: "#7ba87a" },
  request_declined:     { label: "REQ DECLINED",    bg: "#f5dada", color: "#9a4545", borderColor: "#c25c5c" },
  profile_update:       { label: "PROFILE UPD",     bg: "#f0f6fb", color: "#0369a1", borderColor: "#4472b8" },
  admin_edit_profile:   { label: "ADMIN EDIT",      bg: "#f5dada", color: "#9a4545", borderColor: "#c25c5c" },
  admin_delete_post:    { label: "ADMIN DEL POST",  bg: "#f5dada", color: "#9a4545", borderColor: "#c25c5c" },
  admin_delete_comment: { label: "ADMIN DEL CMNT",  bg: "#f5dada", color: "#9a4545", borderColor: "#c25c5c" },
};

function getLogTypeConfig(type) {
  return LOG_TYPES[type] ?? { label: type?.toUpperCase() ?? "?", bg: "#f7ecec", color: "#7a5868", borderColor: "#6b7280" };
}

function humanDescription(log, Tr) {
  const actor = log.actorName ?? log.actorId ?? "?";
  const d = Tr?.logDesc;
  if (!d) return `${actor}: ${log.type}`;
  switch (log.type) {
    case "signup":               return d.signup(actor);
    case "login":                return d.login(actor);
    case "post":                 return d.post(actor);
    case "post_edit":            return d.post_edit(actor);
    case "post_delete":          return d.post_delete(actor);
    case "comment":              return d.comment(actor);
    case "comment_edit":         return d.comment_edit(actor);
    case "comment_delete":       return d.comment_delete(actor);
    case "request_sent":         return d.request_sent(actor, log.details?.toUserName);
    case "request_accepted":     return d.request_accepted(actor);
    case "request_declined":     return d.request_declined(actor);
    case "profile_update":       return d.profile_update(actor);
    case "admin_edit_profile":   return d.admin_edit_profile(actor, log.targetId);
    case "admin_delete_post":    return d.admin_delete_post(actor);
    case "admin_delete_comment": return d.admin_delete_comment(actor);
    default:                     return d.default(actor, log.type);
  }
}

function formatAbsoluteTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

/* ── Excel export/import ── */
const EXPORT_FIELDS = [
  { key: "firstName",   label: "First Name" },
  { key: "lastName",    label: "Last Name" },
  { key: "email",       label: "Email" },
  { key: "phone",       label: "Phone" },
  { key: "region",      label: "Region" },
  { key: "city",        label: "City" },
  { key: "profession",  label: "Profession" },
  { key: "ethnicity",   label: "Ethnicity" },
  { key: "helpAreas",   label: "Help Areas" },
  { key: "bio",         label: "Bio" },
  { key: "linkedIn",    label: "LinkedIn" },
  { key: "createdAt",   label: "Joined" },
];
const ARRAY_FIELDS = new Set(["helpAreas"]);
const REQUIRED_IMPORT = ["email", "firstName"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── Permission keys ─── */
const PERM_KEYS = ["canManageUsers","canManageContent","canViewLogs","canManageAdmins","canViewStats","canSendAnnouncements","canExportData"];
const DEFAULT_PERMS = Object.fromEntries(PERM_KEYS.map(k => [k, false]));

/* ── Simple confirm modal ── */
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, danger = true }) {
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <p style={{ ...S.modalTitle, color: danger ? "#c25c5c" : "var(--text-primary,#111827)" }}>{title}</p>
        <p style={{ fontSize: 14, color: "var(--text-secondary,#7a5868)", lineHeight: 1.6, margin: 0 }}>{message}</p>
        <div style={S.modalActions}>
          <button style={S.cancelModalBtn} onClick={onCancel}>Cancel</button>
          <button style={{
            ...S.saveModalBtn,
            background: danger ? "#e9415b" : "var(--brand,#4472b8)",
          }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Permissions modal ── */
function PermissionsModal({ user: u, isNew, onSave, onCancel, Tr }) {
  const initial = u?.adminPermissions ? { ...DEFAULT_PERMS, ...u.adminPermissions } : { ...DEFAULT_PERMS };
  const [perms, setPerms] = useState(initial);
  const [saving, setSaving] = useState(false);
  const name = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();

  const toggle = key => setPerms(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(perms);
    setSaving(false);
  };

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modalBox, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <p style={S.modalTitle}>{isNew ? Tr?.permsTitle : Tr?.editPermsTitle?.(name)}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted,#6b7280)", margin: "0 0 0.75rem" }}>{Tr?.permsSub?.(name)}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PERM_KEYS.map(key => (
            <label key={key} onClick={() => toggle(key)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              borderRadius: 12, cursor: "pointer",
              background: perms[key] ? "rgba(68,114,184,0.08)" : "var(--bg-secondary,#f0f6fb)",
              border: perms[key] ? "1.5px solid rgba(68,114,184,0.3)" : "1.5px solid transparent",
              transition: "all 0.15s",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: perms[key] ? "var(--brand,#4472b8)" : "var(--bg-tertiary,#daeaf8)",
                border: perms[key] ? "none" : "1.5px solid #b0c4de",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {perms[key] && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontSize: 13, fontWeight: perms[key] ? 700 : 500, color: "var(--text-primary,#111827)" }}>
                {Tr?.permLabels?.[key] || key}
              </span>
            </label>
          ))}
        </div>

        <div style={S.modalActions}>
          <button style={S.cancelModalBtn} onClick={onCancel}>{Tr?.cancel}</button>
          <button style={{ ...S.saveModalBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? Tr?.saving : (isNew ? Tr?.savePerms : Tr?.updatePerms)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   EDIT USER MODAL
═══════════════════════════════════════════════════════ */
function EditUserModal({ u, adminUser, adminName, onClose, onSaved, Tr }) {
  const [fields, setFields] = useState({
    firstName:  u.firstName  ?? "",
    lastName:   u.lastName   ?? "",
    phone:      "",
    city:       u.city       ?? "",
    profession: u.profession ?? "",
    bio:        u.bio        ?? "",
    isAdmin:    u.isAdmin    ?? false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getContact(u.id).then(c => setFields(prev => ({ ...prev, phone: c.phone ?? "" })));
  }, [u.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFields((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", u.id), { ...fields });
      if (fields.phone !== undefined) await saveContact(u.id, { phone: fields.phone });
      // If admin status changed and the target is the current user, refresh the token
      // so the isAdmin custom claim takes effect immediately for Storage rules.
      if ("isAdmin" in fields && u.id === adminUser.uid) {
        await adminUser.getIdToken(true);
      }
      logActivity({
        type: "admin_edit_profile",
        actorId: adminUser.uid,
        actorName: adminName,
        targetId: u.id,
        targetType: "user",
        details: { editedFields: Object.keys(fields) },
      });
      onSaved({ ...u, ...fields });
      onClose();
    } catch (err) {
      console.error("Edit user error:", err);
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { ...S.modalLabel, display: "block" };
  const groupStyle = { display: "flex", flexDirection: "column", gap: "4px" };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <p style={S.modalTitle}>{Tr?.editUser} — {u.firstName} {u.lastName}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "0.75rem" }}>
          <div style={groupStyle}>
            <label style={labelStyle}>{Tr?.firstName}</label>
            <input name="firstName" style={S.modalInput} value={fields.firstName} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>{Tr?.lastName}</label>
            <input name="lastName" style={S.modalInput} value={fields.lastName} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>{Tr?.phone}</label>
            <input name="phone" style={S.modalInput} value={fields.phone} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>{Tr?.city}</label>
            <input name="city" style={S.modalInput} value={fields.city} onChange={handleChange} />
          </div>
        </div>

        <div style={groupStyle}>
          <label style={labelStyle}>{Tr?.profession}</label>
          <input name="profession" style={S.modalInput} value={fields.profession} onChange={handleChange} />
        </div>

        <div style={groupStyle}>
          <label style={labelStyle}>{Tr?.bio}</label>
          <textarea
            name="bio"
            style={{ ...S.modalInput, minHeight: "80px", resize: "vertical" }}
            value={fields.bio}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            id="isAdminCheck"
            name="isAdmin"
            checked={fields.isAdmin}
            onChange={handleChange}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="isAdminCheck" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary,#111827)", cursor: "pointer" }}>
            {Tr?.adminPriv}
          </label>
        </div>

        <div style={S.modalActions}>
          <button style={S.cancelModalBtn} onClick={onClose}>{Tr?.cancel}</button>
          <button style={{ ...S.saveModalBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? Tr?.saving : Tr?.save}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat detail slide-in panel ── */
function StatDetailPanel({ type, users, posts, convs, onClose, Tr, isActuallyOnline }) {
  let title = "";
  let items = [];

  if (type === "members") {
    title = Tr.totalMembers;
    items = users.map(u => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      sub: u.profession || u.email || "",
      avatar: u.photoURL || u.avatarUrl,
      badge: u.emailVerified ? "✓" : null,
    }));
  } else if (type === "online") {
    title = Tr.onlineNow;
    items = users.filter(isActuallyOnline).map(u => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      sub: u.profession || u.email || "",
      avatar: u.photoURL || u.avatarUrl,
    }));
  } else if (type === "verified") {
    title = Tr.verified;
    items = users.filter(u => u.emailVerified).map(u => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      sub: u.profession || u.email || "",
      avatar: u.photoURL || u.avatarUrl,
    }));
  } else if (type === "admins") {
    title = Tr.admins;
    items = users.filter(u => u.isAdmin).map(u => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      sub: u.email || "",
      avatar: u.photoURL || u.avatarUrl,
    }));
  } else if (type === "helpAreas") {
    title = Tr.withHelpAreas || "With Help Areas";
    items = users.filter(u => u.helpAreas?.length > 0).map(u => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      sub: u.helpAreas?.join(", ") || "",
      avatar: u.photoURL || u.avatarUrl,
    }));
  } else if (type === "posts") {
    title = Tr.totalPosts;
    items = posts.slice(0, 50).map(p => ({
      id: p.id,
      name: p.authorName || "Unknown",
      sub: (p.text || "(media)").slice(0, 80),
      avatar: p.authorAvatar,
    }));
  } else if (type === "convs") {
    title = Tr.conversations;
    items = convs.slice(0, 50).map(c => {
      const names = Object.values(c.participantNames || {}).join(" & ");
      return { id: c.id, name: names || "Conversation", sub: c.lastMessage?.text?.slice(0,60) || "" };
    });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "stretch", justifyContent: "flex-end",
    }}
      onClick={onClose}
    >
      <div style={{
        width: 360, maxWidth: "100vw",
        background: "var(--bg-primary,#fff)", boxShadow: "-8px 0 40px rgba(0,0,0,0.16)",
        display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease",
        borderLeft: "1px solid var(--border,#e5e7eb)",
      }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(60px); opacity:0; } to { transform:none; opacity:1; } }`}</style>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border,#e5e7eb)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:"var(--text-primary,#111827)", margin:0 }}>{title} ({items.length})</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--text-muted,#6b7280)", lineHeight:1 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0.75rem 1rem" }}>
          {items.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"0.55rem 0.5rem", borderBottom:"1px solid var(--bg-tertiary,#f0f6fb)" }}>
              <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:"var(--bg-tertiary,#f0f6fb)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"var(--text-muted,#6b7280)" }}>
                {item.avatar ? <img src={item.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (item.name?.[0] || "?")}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary,#111827)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                {item.sub && <p style={{ fontSize:11, color:"var(--text-muted,#6b7280)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.sub}</p>}
              </div>
              {item.badge && <span style={{ fontSize:10, background:"#d1fae5", color:"#065f46", borderRadius:99, padding:"1px 6px", fontWeight:700 }}>{item.badge}</span>}
            </div>
          ))}
          {items.length === 0 && <p style={{ fontSize:13, color:"var(--text-muted,#6b7280)", textAlign:"center", marginTop:"2rem" }}>No data</p>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SLIDESHOW ADMIN COMPONENT
═══════════════════════════════════════════════════════ */
function SlideshowAdmin() {
  const [images, setImages]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getDoc(doc(db, "siteSettings", "slideshow")).then((snap) => {
      if (snap.exists()) setImages(snap.data().images || []);
    });
  }, []);

  const persist = async (imgs) => {
    await setDoc(doc(db, "siteSettings", "slideshow"), { images: imgs });
    setImages(imgs);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const newImgs = await Promise.all(files.map(async (file) => {
        const path = `slideshow/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
        const sRef = storageRef(storage, path);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);
        return { url, storagePath: path, caption: "" };
      }));
      await persist([...images, ...newImgs]);
    } finally { setUploading(false); e.target.value = ""; }
  };

  const updateCaption = async (i, caption) => {
    await persist(images.map((img, idx) => idx === i ? { ...img, caption } : img));
  };

  const remove = async (i) => {
    try { await deleteObject(storageRef(storage, images[i].storagePath)); } catch {}
    await persist(images.filter((_, idx) => idx !== i));
  };

  const moveUp = async (i) => {
    if (i === 0) return;
    const next = [...images];
    [next[i-1], next[i]] = [next[i], next[i-1]];
    await persist(next);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      {images.length > 0 && (
        <div style={{ marginBottom: "1.5rem", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
          <SlideshowBanner />
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        {images.map((img, i) => (
          <div key={img.url} style={{ position:"relative", width:180, borderRadius:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.1)", background:"var(--bg-secondary)" }}>
            <img src={img.url} alt="" style={{ width:"100%", height:110, objectFit:"cover", display:"block" }} />
            <div style={{ padding:"0.5rem", display:"flex", flexDirection:"column", gap:4 }}>
              <input
                value={img.caption || ""}
                onChange={e => updateCaption(i, e.target.value)}
                placeholder="Caption (optional)"
                style={{ width:"100%", fontSize:12, padding:"4px 8px", borderRadius:6, border:"1px solid var(--border)", background:"var(--bg-primary)", color:"var(--text-primary)", boxSizing:"border-box" }}
              />
              <button onClick={() => moveUp(i)} disabled={i === 0} style={{ fontSize:11, padding:"3px 0", background:"none", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", color:"var(--text-muted)" }}>↑ Move up</button>
            </div>
            <button onClick={() => remove(i)} style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        ))}

        <label style={{ width:180, height:150, borderRadius:12, border:"2px dashed var(--border)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: uploading ? "wait" : "pointer", color:"var(--text-muted)", fontSize:13, gap:6, background:"var(--bg-secondary)" }}>
          <span style={{ fontSize:28 }}>+</span>
          <span>{uploading ? "Uploading..." : "Upload images"}</span>
          <span style={{ fontSize:10, color:"var(--text-muted)", marginTop:-4 }}>Select multiple</span>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {images.length === 0 && !uploading && (
        <p style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center", padding:"1rem 0" }}>No slideshow images yet. Upload one above.</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN PAGE
═══════════════════════════════════════════════════════ */
export default function AdminPage() {
  const { user, profile } = useAuth();
  const { lang } = useLang();
  const Tr = AT[lang] || AT.he;
  const [tab, setTab]     = useState("overview");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [statDetailType, setStatDetailType] = useState(null); // "members"|"online"|"verified"|"admins"|"posts"|"convs"
  const [hiddenDataStats, setHiddenDataStats] = useState(new Set());
  const [statsCustomizeOpen, setStatsCustomizeOpen] = useState(false);

  /* ── Edit Users tab state ── */
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [userSortBy, setUserSortBy] = useState("recent");   // recent | alpha | city | perms
  const [userFilterAdmin, setUserFilterAdmin] = useState(false);
  const [userFilterOnline, setUserFilterOnline] = useState(false);

  /* ── Posts: search + filter + expanded comments ── */
  const [postSearch, setPostSearch] = useState("");
  const [postSortBy, setPostSortBy] = useState("recent");
  const [postFilterPinned, setPostFilterPinned] = useState(false);
  const [postFilterMedia,  setPostFilterMedia]  = useState(false);
  const [expandedPostComments, setExpandedPostComments] = useState({});
  const [postCommentsList, setPostCommentsList]         = useState({});

  /* ── Logs tab state ── */
  const [logs,          setLogs]          = useState([]);
  const [logsLoading,   setLogsLoading]   = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState([]);
  const [logActorFilter, setLogActorFilter] = useState("");
  const [logDateFrom,   setLogDateFrom]   = useState("");
  const [logDateTo,     setLogDateTo]     = useState("");

  /* ── Reports ── */
  const [reports,        setReports]        = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [expandedUserId,  setExpandedUserId]  = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [reportStatusFilter, setReportStatusFilter] = useState("all"); // "all"|"pending"|"resolved"|"dismissed"
  const [reportSearch,       setReportSearch]       = useState("");

  /* ── Blacklist ── */
  const [blacklist,        setBlacklist]        = useState([]);
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  const [blacklistEmail,   setBlacklistEmail]   = useState("");
  const [blacklistReason,  setBlacklistReason]  = useState("");
  const [blacklistAdding,  setBlacklistAdding]  = useState(false);

  /* ── Permission / confirm modals ── */
  const [confirmDeleteTarget,  setConfirmDeleteTarget]  = useState(null); // user to delete
  const [confirmRevokeTarget,  setConfirmRevokeTarget]  = useState(null); // user to revoke admin
  const [makeAdminConfirmTarget, setMakeAdminConfirmTarget] = useState(null); // step 1: confirm
  const [permsTarget,          setPermsTarget]          = useState(null); // step 2: set perms (isNew=true)
  const [editPermsTarget,      setEditPermsTarget]      = useState(null); // edit existing admin perms

  /* ── Excel export / import ── */
  const [exportOpen, setExportOpen]     = useState(false);
  const [selFields, setSelFields]       = useState(() => EXPORT_FIELDS.map(f => f.key));
  const [importBusy, setImportBusy]     = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef   = useRef(null);
  const chartsRef = useRef(null);

  const adminName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email ?? "Admin";

  /* ── Permission helpers — if no adminPermissions key exists, grant full access (original admin) ── */
  const _ap = profile?.adminPermissions;
  const hasExplicitPerms = _ap && Object.keys(_ap).length > 0;
  const canManageUsers   = !hasExplicitPerms || !!_ap.canManageUsers;
  const canManageContent = !hasExplicitPerms || !!_ap.canManageContent;
  const canViewLogs      = !hasExplicitPerms || !!_ap.canViewLogs;
  const canManageAdmins  = !hasExplicitPerms || !!_ap.canManageAdmins;
  const canViewStats     = !hasExplicitPerms || !!_ap.canViewStats;
  const canExportData    = !hasExplicitPerms || !!_ap.canExportData;

  useEffect(() => {
    if (!profile?.isAdmin) return;
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "conversations")),
    ]).then(([uSnap, pSnap, cSnap]) => {
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPosts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setConvs(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [profile]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(200));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "logs"       && logs.length === 0)      fetchLogs();
    if (tab === "reports"    && reports.length === 0)   fetchReports();
    if (tab === "blacklist"  && blacklist.length === 0)  fetchBlacklist();
  }, [tab]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setReportsLoading(false);
  }, []);

  const fetchBlacklist = useCallback(async () => {
    setBlacklistLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "blacklist"), orderBy("addedAt", "desc")));
      setBlacklist(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setBlacklistLoading(false);
  }, []);

  const addToBlacklist = async () => {
    const email = blacklistEmail.trim().toLowerCase();
    if (!email || blacklistAdding) return;
    setBlacklistAdding(true);
    try {
      const ref = await addDoc(collection(db, "blacklist"), {
        email,
        reason: blacklistReason.trim() || "",
        addedBy: adminName,
        addedById: user?.uid,
        addedAt: new Date().toISOString(),
      });
      setBlacklist(prev => [{ id: ref.id, email, reason: blacklistReason.trim(), addedBy: adminName, addedAt: new Date().toISOString() }, ...prev]);
      setBlacklistEmail("");
      setBlacklistReason("");
    } catch (err) { console.error(err); }
    setBlacklistAdding(false);
  };

  const removeFromBlacklist = async (id) => {
    await deleteDoc(doc(db, "blacklist", id));
    setBlacklist(prev => prev.filter(b => b.id !== id));
  };

  const updateReportStatus = async (id, status) => {
    const report = reports.find(r => r.id === id);
    await updateDoc(doc(db, "reports", id), { status, resolvedAt: status === "resolved" ? new Date().toISOString() : null });
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    if (status === "resolved" && report?.reporterId && user?.uid && report.reporterId !== user.uid) {
      try {
        const adminProfile = { firstName: profile?.firstName || "Admin", lastName: profile?.lastName || "", avatarUrl: profile?.avatarUrl || null };
        const reporterProfile = users.find(u => u.id === report.reporterId) || { firstName: report.reporterName || "User", lastName: "", avatarUrl: null };
        const convId = await getOrCreateConversation(user.uid, report.reporterId, adminProfile, reporterProfile);
        const resolvedDate = new Date().toLocaleDateString();
        const dmText = `✓ Your report about ${report.reportedName || "a user"} has been reviewed and resolved (${resolvedDate}). Thank you for helping keep the community safe.`;
        await sendMessage(convId, user.uid, dmText, null, null, [report.reporterId]);
      } catch (e) {
        console.error("Auto-DM failed:", e);
      }
    }
  };

  /* ── Access denied ── */
  if (!profile?.isAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted,#6b7280)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <h3>Access Denied</h3>
          <p>This area is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  /* ── Computed stats (overview) ── */
  const parseLastSeen = (value) => {
    if (!value) return NaN;
    if (typeof value === "number") return value;
    if (value?.seconds && typeof value.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime();
  };
  const isActuallyOnline = (u) => {
    const lastSeenMs = parseLastSeen(u?.lastSeen);
    return !Number.isNaN(lastSeenMs) && Date.now() - lastSeenMs < 5 * 60 * 1000;
  };
  const now          = Date.now();
  const onlineNow    = users.filter(isActuallyOnline).length;
  const verifiedN    = users.filter(u => u.emailVerified).length;
  const adminsN      = users.filter(u => u.isAdmin).length;
  const newThisWeek  = users.filter(u => u.createdAt && (now - new Date(u.createdAt)) < 7*86400*1000).length;
  const totalLikes   = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);

  /* ── Profession distribution ── */
  const professionMap = {};
  users.forEach(u => { if (u.profession) professionMap[u.profession] = (professionMap[u.profession] || 0) + 1; });
  const topProfessions = Object.entries(professionMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── City distribution ── */
  const cityMap = {};
  users.forEach(u => { if (u.city) cityMap[u.city] = (cityMap[u.city] || 0) + 1; });
  const topCities = Object.entries(cityMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── Private fields distributions (admin only) ── */
  const ethnicityMap = {}, religionMap = {}, regionMap = {};
  users.forEach(u => {
    if (u.ethnicity)  ethnicityMap[u.ethnicity]  = (ethnicityMap[u.ethnicity]  || 0) + 1;
    /* religion field (new dropdown) takes priority; fall back to identity freetext */
    const rel = u.religion || u.identity;
    if (rel)          religionMap[rel]            = (religionMap[rel]            || 0) + 1;
    if (u.region)     regionMap[u.region]         = (regionMap[u.region]         || 0) + 1;
  });
  const topEthnicities = Object.entries(ethnicityMap).sort((a,b) => b[1]-a[1]).slice(0,8);
  const topReligions   = Object.entries(religionMap).sort((a,b) => b[1]-a[1]).slice(0,8);
  const topRegions     = Object.entries(regionMap).sort((a,b) => b[1]-a[1]).slice(0,8);

  /* ── User operations ── */
  const doDeleteUser = async (id) => {
    try {
      await httpsCallable(functions, "deleteUserAccount")({ uid: id });
      await deleteDoc(doc(db, "users", id));
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) { console.error(e); }
    setConfirmDeleteTarget(null);
  };

  const doRevokeAdmin = async (id) => {
    await updateDoc(doc(db, "users", id), { isAdmin: false, adminPermissions: {} });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isAdmin: false, adminPermissions: {} } : u));
    setConfirmRevokeTarget(null);
  };

  const doMakeAdmin = async (targetUser, perms) => {
    await updateDoc(doc(db, "users", targetUser.id), { isAdmin: true, adminPermissions: perms });
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isAdmin: true, adminPermissions: perms } : u));
    logActivity({ type: "admin_edit_profile", actorId: user.uid, actorName: adminName, targetId: targetUser.id, details: { grantedAdmin: true, permissions: perms } });
    setPermsTarget(null);
  };

  const doUpdatePerms = async (targetUser, perms) => {
    await updateDoc(doc(db, "users", targetUser.id), { adminPermissions: perms });
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, adminPermissions: perms } : u));
    setEditPermsTarget(null);
  };

  /* ── Post operations ── */
  const deletePost = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    await deletePostWithCleanup(id);
    setPosts(prev => prev.filter(p => p.id !== id));
    logActivity({
      type: "admin_delete_post",
      actorId: user.uid,
      actorName: adminName,
      targetId: id,
      targetType: "post",
      details: {},
    });
  };

  const pinPost = async (id, current) => {
    await updateDoc(doc(db, "posts", id), { isPinned: !current });
    setPosts(prev => prev.map(p => p.id === id ? { ...p, isPinned: !current } : p));
  };

  /* ── Toggle post comments expansion ── */
  const togglePostComments = async (postId) => {
    const isOpen = expandedPostComments[postId];
    setExpandedPostComments(prev => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !postCommentsList[postId]) {
      try {
        const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        setPostCommentsList(prev => ({
          ...prev,
          [postId]: snap.docs.map(d => ({ id: d.id, ...d.data() })),
        }));
      } catch (err) { console.error("Load post comments error:", err); }
    }
  };

  const deleteComment = async (postId, comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", comment.id));
      const post = posts.find(p => p.id === postId);
      const newCount = Math.max(0, (post?.commentsCount ?? 1) - 1);
      await updateDoc(doc(db, "posts", postId), { commentsCount: newCount });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: newCount } : p));
      setPostCommentsList(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter(c => c.id !== comment.id),
      }));
      logActivity({
        type: "admin_delete_comment",
        actorId: user.uid,
        actorName: adminName,
        targetId: comment.id,
        targetType: "comment",
        details: { postId, text: comment.text?.slice(0, 100) },
      });
    } catch (err) { console.error("Admin delete comment error:", err); }
  };

  /* ── Log filters ── */
  const filteredLogs = logs.filter(log => {
    if (logTypeFilter.length > 0 && !logTypeFilter.includes(log.type)) return false;
    if (logActorFilter && !(log.actorName ?? "").toLowerCase().includes(logActorFilter.toLowerCase())) return false;
    if (logDateFrom && log.timestamp < logDateFrom) return false;
    if (logDateTo   && log.timestamp > logDateTo + "T23:59:59") return false;
    return true;
  });
  const allLogTypes = [...new Set(logs.map(l => l.type))].filter(Boolean).sort();
  const toggleLogType = (type) => {
    setLogTypeFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  /* ── Filtered users (shared between Users + EditUsers tabs) ── */
  const filteredBySearch = users
    .filter(u => {
      const s = (searchUser || userSearch).toLowerCase();
      const matchSearch = !s || (() => {
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        return name.includes(s) || (u.email ?? "").toLowerCase().includes(s) || (u.profession ?? "").toLowerCase().includes(s) || (u.city ?? "").toLowerCase().includes(s);
      })();
      const matchAdmin  = !userFilterAdmin  || !!u.isAdmin;
      const matchOnline = !userFilterOnline || isActuallyOnline(u);
      return matchSearch && matchAdmin && matchOnline;
    })
    .sort((a, b) => {
      if (userSortBy === "alpha")  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "he");
      if (userSortBy === "city")   return (a.city ?? "").localeCompare(b.city ?? "", "he");
      if (userSortBy === "perms")  return (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0);
      // default: recent (createdAt desc)
      return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
    });

  /* ── Excel export ── */
  const exportExcel = async () => {
    const fields = EXPORT_FIELDS.filter(f => selFields.includes(f.key));
    if (!fields.length) return;
    const rows = users.map(u => {
      const row = {};
      fields.forEach(({ key, label }) => {
        const v = u[key];
        row[label] = Array.isArray(v) ? v.join("; ") : (v ?? "");
      });
      return row;
    });
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Members");
    ws.columns = fields.map(f => ({ header: f.label, key: f.label, width: 22 }));
    rows.forEach(row => ws.addRow(row));
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url; a.download = `members_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportOpen(false);
  };

  /* ── Excel import ── */
  const importExcel = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setImportResult(null);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") { setImportResult({ error: Tr.importBadType }); return; }
    setImportBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const sig = new Uint8Array(buf.slice(0, 4));
      const isXlsx = sig[0] === 0x50 && sig[1] === 0x4b;
      const isXls  = sig[0] === 0xd0 && sig[1] === 0xcf;
      if (!isXlsx && !isXls) { setImportResult({ error: Tr.importBadType }); setImportBusy(false); return; }
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      if (!ws) { setImportResult({ error: Tr.importEmpty }); setImportBusy(false); return; }
      const headers = [];
      ws.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value ?? ""); });
      const rows = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const obj = {};
        row.eachCell((cell, col) => { if (headers[col]) obj[headers[col]] = cell.value ?? ""; });
        if (Object.keys(obj).length) rows.push(obj);
      });
      if (!rows.length) { setImportResult({ error: Tr.importEmpty }); setImportBusy(false); return; }
      const labelToKey = {};
      EXPORT_FIELDS.forEach(({ key, label }) => { labelToKey[label.toLowerCase()] = key; });
      const existing = new Set(users.map(u => (u.email || "").toLowerCase().trim()).filter(Boolean));
      const seen = new Set();
      const toCreate = [];
      let skipped = 0;
      const errors = [];
      rows.forEach((raw, i) => {
        const rowNo = i + 2;
        const profile = {};
        Object.entries(raw).forEach(([header, val]) => {
          const key = labelToKey[String(header).toLowerCase().trim()];
          if (!key) return;
          profile[key] = ARRAY_FIELDS.has(key)
            ? (typeof val === "string" ? val.split(";").map(s => s.trim()).filter(Boolean) : [])
            : (typeof val === "string" ? val.trim() : val);
        });
        const email = (profile.email || "").toString().toLowerCase().trim();
        const missing = REQUIRED_IMPORT.filter(k => !String(profile[k] ?? "").trim());
        if (missing.length) { errors.push(`${Tr.rowLbl} ${rowNo}: ${Tr.importMissing} (${missing.join(", ")})`); return; }
        if (!EMAIL_RE.test(email)) { errors.push(`${Tr.rowLbl} ${rowNo}: ${Tr.importBadEmail}`); return; }
        if (existing.has(email) || seen.has(email)) { skipped++; return; }
        seen.add(email);
        toCreate.push({ ...profile, email, hasAccount: false, source: "excel-import", emailVerified: false, createdAt: new Date().toISOString() });
      });
      let created = 0;
      for (const d of toCreate) {
        try { await addDoc(collection(db, "users"), d); created++; }
        catch (err) { errors.push(`${d.email}: ${err.message}`); }
      }
      if (created > 0) {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      setImportResult({ created, skipped, errors });
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImportBusy(false);
    }
  };

  /* ── TABS config — filtered by permissions ── */
  const TABS = [
    { id: "overview",  label: Tr.tabs.overview, show: true },
    { id: "users",     label: `${Tr.tabs.users} (${users.length})`, show: canManageUsers },
    { id: "posts",     label: `${Tr.tabs.posts} (${posts.length})`, show: canManageContent },
    { id: "data",      label: Tr.showDataTab, show: canViewStats },
    { id: "reports",   label: `${Tr.reportsTab}${reports.length > 0 ? ` (${reports.filter(r=>r.status==="pending").length})` : ""}`, show: canManageContent },
    { id: "logs",      label: Tr.tabs.logs, show: canViewLogs },
    { id: "slideshow",  label: Tr.admin?.slideshow || "Slideshow", show: canManageContent },
    { id: "blacklist",  label: `🚫 ${Tr.blacklistTab || "Blacklist"}${blacklist.length > 0 ? ` (${blacklist.length})` : ""}`, show: canManageUsers },
  ].filter(t => t.show);

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div style={S.page}>
      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
          {Array.from({length:4}).map((_,i) => <div key={i} className="skeleton card" style={{height:88}} />)}
        </div>
      )}

      {/* ══ OVERVIEW TAB ══ */}
      {!loading && tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label={Tr.totalMembers}  value={users.length}   color="#4472b8" sub={Tr.thisWeek(newThisWeek)}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              onClick={() => setStatDetailType("members")} />
            <StatCard label={Tr.onlineNow}     value={onlineNow}      color="#7ba87a" sub={Tr.activeMembers}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6"/></svg>}
              onClick={() => setStatDetailType("online")} />
            <StatCard label={Tr.withHelpAreas || "With Help Areas"} value={users.filter(u => u.helpAreas?.length > 0).length} color="#1d4896" sub={`${Math.round(users.filter(u => u.helpAreas?.length > 0).length / Math.max(users.length,1)*100)}%`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              onClick={() => setStatDetailType("helpAreas")} />
            <StatCard label={Tr.totalPosts}    value={posts.length}   color="#8b5cf6" sub={`${totalLikes} · ${totalComments}`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
              onClick={() => setStatDetailType("posts")} />
            <StatCard label={Tr.conversations}  value={convs.length}   color="#d4a574"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
              onClick={() => setStatDetailType("convs")} />
            <StatCard label={Tr.admins}         value={adminsN}        color="#c25c5c"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              onClick={() => setStatDetailType("admins")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1.25rem" }}>
            {/* Profession distribution */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>{Tr.topProfessions}</p>
              {topProfessions.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted,#6b7280)" }}>{Tr.noData}</p>}
              {topProfessions.map(([prof, count]) => (
                <div key={prof} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary,#7a5868)" }}>{prof}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted,#6b7280)", fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary,#f0f6fb)", borderRadius: "var(--r-full,99px)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: "var(--brand,#4472b8)", borderRadius: "var(--r-full,99px)", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* City distribution */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>{Tr.topCities}</p>
              {topCities.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted,#6b7280)" }}>{Tr.noData}</p>}
              {topCities.map(([city, count]) => (
                <div key={city} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary,#7a5868)" }}>{city}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted,#6b7280)", fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary,#f0f6fb)", borderRadius: "var(--r-full,99px)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: "#8b5cf6", borderRadius: "var(--r-full,99px)", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>{Tr.recentMembers}</p>
              {users.slice().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>
                    {getInitials(`${u.firstName} ${u.lastName}`)}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:12,fontWeight:600,color:"var(--text-primary,#111827)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.firstName} {u.lastName}</p>
                    <p style={{ fontSize:10,color:"var(--text-muted,#6b7280)" }}>{timeAgo(u.createdAt)}</p>
                  </div>
                  {u.emailVerified && <span className="badge badge-green">✓</span>}
                </div>
              ))}
            </div>

            {/* Top posts */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Top Posts</p>
              {posts.slice().sort((a,b)=>(b.likesCount||0)-(a.likesCount||0)).slice(0,4).map(p => (
                <div key={p.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--bg-tertiary,#f0f6fb)" }}>
                  <p style={{ fontSize:12,color:"var(--text-primary,#111827)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2 }}>
                    {p.text || "(media post)"}
                  </p>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ fontSize:10,color:"var(--text-muted,#6b7280)",display:"flex",alignItems:"center",gap:2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {p.likesCount||0}
                    </span>
                    <span style={{ fontSize:10,color:"var(--text-muted,#6b7280)",display:"flex",alignItems:"center",gap:2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {p.commentCount||0}
                    </span>
                    <span style={{ fontSize:10,color:"var(--text-muted,#6b7280)" }}>by {p.authorName}</span>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <p style={{fontSize:12,color:"var(--text-muted,#6b7280)"}}>No posts yet</p>}
            </div>

          </div>

          {statDetailType && (
            <StatDetailPanel
              type={statDetailType}
              users={users}
              posts={posts}
              convs={convs}
              onClose={() => setStatDetailType(null)}
              Tr={Tr}
              isActuallyOnline={isActuallyOnline}
            />
          )}
        </>
      )}

      {/* ══ USERS TAB ══ */}
      {!loading && tab === "users" && (
        <>
          {/* Members header + inline filter bar */}
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              All Members <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({filteredBySearch.length})</span>
            </span>
            <input
              className="input"
              placeholder="Search by name, email, profession…"
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              style={{ fontSize:12, width:220, flexShrink:0 }}
            />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { val:"recent", label:"Recent" },
                { val:"alpha",  label:"A–Z" },
                { val:"city",   label:"City" },
                { val:"perms",  label:"Admins first" },
              ].map(opt => (
                <button key={opt.val} onClick={() => setUserSortBy(opt.val)}
                  style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                    background: userSortBy===opt.val ? "var(--brand,#4472b8)" : "var(--bg-secondary,#f0f6fb)",
                    color: userSortBy===opt.val ? "#fff" : "var(--text-secondary)" }}>
                  {opt.label}
                </button>
              ))}
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                <input type="checkbox" checked={userFilterAdmin} onChange={e => setUserFilterAdmin(e.target.checked)} style={{ cursor:"pointer" }} />
                Admins only
              </label>
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                <input type="checkbox" checked={userFilterOnline} onChange={e => setUserFilterOnline(e.target.checked)} style={{ cursor:"pointer" }} />
                Online now
              </label>
            </div>
          </div>
          <div className="card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary,#f0f6fb)" }}>
                  {["Member","Profession","City","Status","Joined","Actions"].map(h => (
                    <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--text-muted,#6b7280)",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid var(--border,#daeaf8)",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBySearch.map((u) => (
                  <React.Fragment key={u.id}>
                  <tr
                    style={{ borderBottom: expandedUserId === u.id ? "none" : "1px solid var(--bg-tertiary,#f0f6fb)", transition:"background 0.12s", cursor:"pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f0f6fb)"}
                    onMouseLeave={e => e.currentTarget.style.background = expandedUserId === u.id ? "var(--bg-secondary,#f0f6fb)" : "transparent"}
                    onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                  >
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover" }} alt="" />
                          : <div style={{ width:32,height:32,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{getInitials(`${u.firstName} ${u.lastName}`)}</div>
                        }
                        <div>
                          <p style={{ fontSize:13,fontWeight:700,color:"var(--text-primary,#111827)" }}>{u.firstName} {u.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#7a5868)" }}>{u.profession||"—"}</td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#7a5868)" }}>{u.city||"—"}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                        <span className={`badge ${u.emailVerified ? "badge-green" : "badge-yellow"}`}>
                          {u.emailVerified ? "Verified" : "Pending"}
                        </span>
                        {u.isAdmin && <span className="badge badge-purple">Admin</span>}
                        {isActuallyOnline(u) && <span className="badge badge-green" style={{background:"#f0fdf4"}}>● Online</span>}
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap" }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      {u.id !== user?.uid && (
                        <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                          {canManageUsers && <button onClick={e => { e.stopPropagation(); setEditingUser(u); }}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid var(--border,#daeaf8)",background:"var(--bg-secondary,#f0f6fb)",color:"var(--text-primary,#111827)",cursor:"pointer",whiteSpace:"nowrap" }}>
                            {Tr.editUser || "Edit"}
                          </button>}
                          {canManageAdmins && (u.isAdmin ? (<>
                            <button onClick={() => setEditPermsTarget(u)}
                              style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1d4896",cursor:"pointer",whiteSpace:"nowrap" }}>
                              {Tr.editPermsBtn}
                            </button>
                            <button onClick={() => setConfirmRevokeTarget(u)}
                              style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #c4b5fd",background:"#ede9fe",color:"#6d28d9",cursor:"pointer",whiteSpace:"nowrap" }}>
                              {Tr.revokeAdmin}
                            </button>
                          </>) : (
                            <button onClick={() => setMakeAdminConfirmTarget(u)}
                              style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #c4b5fd",background:"#ede9fe",color:"#6d28d9",cursor:"pointer",whiteSpace:"nowrap" }}>
                              {Tr.makeAdmin}
                            </button>
                          ))}
                          {canManageUsers && <button onClick={() => setConfirmDeleteTarget(u)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #d99090",background:"#f5dada",color:"#c25c5c",cursor:"pointer" }}>
                            {Tr.deleteLbl}
                          </button>}
                          {!canManageUsers && !canManageAdmins && <span style={{fontSize:11,color:"var(--text-muted)"}}>View only</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* Expanded detail row */}
                  {expandedUserId === u.id && (
                    <tr key={`${u.id}-detail`}>
                      <td colSpan={7} style={{ background:"var(--bg-secondary,#f0f6fb)", padding:"12px 20px 14px 48px", borderBottom:"2px solid var(--border,#daeaf8)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"10px 24px" }}>
                          {[
                            { label: Tr.region,    val: u.region },
                            { label: Tr.campus,    val: u.campus },
                            { label: Tr.degree,    val: [u.bachelorDegree, u.masterDegree].filter(Boolean).join(" · ") || null },
                            { label: Tr.birthdate, val: u.birthdate },
                            { label: Tr.identity,  val: u.identity },
                            { label: Tr.ethnicity, val: u.ethnicity },
                            { label: Tr.bio,       val: u.bio },
                          ].map(({ label, val }) => val ? (
                            <div key={label}>
                              <p style={{ fontSize:10, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 2px" }}>{label}</p>
                              <p style={{ fontSize:12, color:"var(--text-secondary,#7a5868)", margin:0, wordBreak:"break-word" }}>{val}</p>
                            </div>
                          ) : null)}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {filteredBySearch.length === 0 && (
              <div className="empty-state"><p>No members found.</p></div>
            )}
          </div>
        </>
      )}

      {/* ══ EDIT USERS TAB ══ */}
      {!loading && tab === "editUsers" && (
        <div>
          <SectionHeader title="Edit Users" count={users.length} />
          <input
            style={S.searchInput}
            type="text"
            placeholder="Search by name, email, profession…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
          <div style={S.tableWrap}>
            {filteredBySearch.length === 0 ? (
              <p style={S.empty}>No users match your search.</p>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Profession</th>
                    <th style={S.th}>City</th>
                    <th style={S.th}>Admin</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBySearch.map(u => (
                    <tr key={u.id} style={S.row}
                      onMouseEnter={e => e.currentTarget.style.background = "#fdf8f6"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-primary,#fff)"}
                    >
                      <td style={S.td}>
                        <p style={S.name}>{u.firstName} {u.lastName}</p>
                      </td>
                      <td style={S.td}>{u.profession || "—"}</td>
                      <td style={S.td}>{u.city || "—"}</td>
                      <td style={S.td}>
                        {u.isAdmin ? <span style={S.adminBadge}>Admin</span> : <span style={{ color: "#d9c8ce" }}>—</span>}
                      </td>
                      <td style={S.td}>
                        <button
                          style={S.editBtn}
                          onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => setEditingUser(u)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ POSTS TAB ══ */}
      {!loading && tab === "posts" && (
        <>
          {(() => {
            const filteredPosts = posts
              .filter(p =>
                (!postSearch ||
                  (p.text || "").toLowerCase().includes(postSearch.toLowerCase()) ||
                  (p.authorName || "").toLowerCase().includes(postSearch.toLowerCase())) &&
                (!postFilterPinned || p.isPinned) &&
                (!postFilterMedia  || (p.media?.length > 0))
              )
              .sort((a, b) => {
                if (postSortBy === "alpha") return (a.authorName || "").localeCompare(b.authorName || "", "he");
                if (postSortBy === "likes") return (b.likesCount || 0) - (a.likesCount || 0);
                return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
              });
            return (
          <>
          {/* Posts header + inline filter bar */}
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              All Posts <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({filteredPosts.length})</span>
            </span>
            <input
              className="input"
              value={postSearch}
              onChange={e => setPostSearch(e.target.value)}
              placeholder={Tr.searchPh || "Search posts..."}
              style={{ fontSize:12, width:200, flexShrink:0 }}
            />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { val:"recent", label:"Recent" },
                { val:"alpha",  label:"A–Z" },
                { val:"likes",  label:"Most liked" },
              ].map(opt => (
                <button key={opt.val} onClick={() => setPostSortBy(opt.val)}
                  style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                    background: postSortBy===opt.val ? "var(--brand,#4472b8)" : "var(--bg-secondary,#f0f6fb)",
                    color: postSortBy===opt.val ? "#fff" : "var(--text-secondary)" }}>
                  {opt.label}
                </button>
              ))}
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                <input type="checkbox" checked={postFilterPinned} onChange={e => setPostFilterPinned(e.target.checked)} style={{ cursor:"pointer" }} />
                Pinned only
              </label>
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                <input type="checkbox" checked={postFilterMedia} onChange={e => setPostFilterMedia(e.target.checked)} style={{ cursor:"pointer" }} />
                Has media
              </label>
            </div>
          </div>
          <div className="card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary,#f0f6fb)" }}>
                  {["Author","Content","Media","Comments","Posted","Actions"].map(h => (
                    <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--text-muted,#6b7280)",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid var(--border,#daeaf8)",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(p => (
                  <>
                    <tr key={p.id}
                      style={{ borderBottom:"1px solid var(--bg-tertiary,#f0f6fb)",transition:"background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f0f6fb)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:avatarColor(p.authorName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff" }}>
                            {getInitials(p.authorName)}
                          </div>
                          <p style={{ fontSize:12,fontWeight:600,color:"var(--text-primary,#111827)" }}>{p.authorName}</p>
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px",maxWidth:320 }}>
                        {p.text ? (() => {
                          const LIMIT = 120;
                          const isLong = p.text.length > LIMIT;
                          const isExpanded = expandedPostComments[`text-${p.id}`];
                          return (
                            <>
                              <p style={{ fontSize:12,color:"var(--text-secondary,#7a5868)",wordBreak:"break-word",whiteSpace:"pre-wrap",margin:"0 0 2px" }}>
                                {isExpanded || !isLong ? p.text : `${p.text.slice(0, LIMIT)}…`}
                              </p>
                              {isLong && (
                                <button onClick={() => setExpandedPostComments(s => ({ ...s, [`text-${p.id}`]: !s[`text-${p.id}`] }))}
                                  style={{ fontSize:10, color:"var(--brand,#4472b8)", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>
                                  {isExpanded ? "Show less" : "Show full post"}
                                </button>
                              )}
                            </>
                          );
                        })() : <em style={{fontSize:12,color:"var(--text-muted,#6b7280)"}}>Media post</em>}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        {p.media?.length > 0
                          ? <span style={{ fontSize:"11px",background:"#dbeafe",color:"#1e40af",borderRadius:"99px",padding:"2px 9px",fontWeight:700 }}>{p.media.length} file{p.media.length>1?"s":""}</span>
                          : <span style={{ color:"#d9c8ce" }}>—</span>
                        }
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <button
                          style={{ background:"none",border:"1px solid var(--border,#f0dce0)",borderRadius:"7px",padding:"4px 10px",fontSize:"11px",fontWeight:700,cursor:"pointer",color:"var(--text-secondary,#7a5868)" }}
                          onClick={() => togglePostComments(p.id)}
                        >
                          {expandedPostComments[p.id] ? "Hide" : `Show (${p.commentsCount ?? 0})`}
                        </button>
                      </td>
                      <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap" }}>{timeAgo(p.createdAt)}</td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex",gap:4 }}>
                          {canManageContent && <button
                            onClick={() => pinPost(p.id, p.isPinned)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #e8c992",background:"#faedd6",color:"#7a5a2e",cursor:"pointer" }}
                          >{p.isPinned ? "Unpin" : "Pin"}</button>}
                          {canManageContent && <button
                            onClick={() => deletePost(p.id)}
                            style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #d99090",background:"#f5dada",color:"#c25c5c",cursor:"pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#eec3c3"}
                            onMouseLeave={e => e.currentTarget.style.background = "#f5dada"}
                          >Delete</button>}
                          {!canManageContent && <span style={{fontSize:11,color:"var(--text-muted)"}}>View only</span>}
                        </div>
                      </td>
                    </tr>
                    {expandedPostComments[p.id] && (
                      <tr key={`${p.id}-comments`}>
                        <td colSpan={6} style={{ padding:"0 14px 12px 46px",background:"var(--bg-secondary,#f0f6fb)" }}>
                          <div style={S.commentsWrap}>
                            {!postCommentsList[p.id] ? (
                              <p style={{ fontSize:"12px",color:"var(--text-muted,#6b7280)",margin:0 }}>Loading comments…</p>
                            ) : postCommentsList[p.id].length === 0 ? (
                              <p style={{ fontSize:"12px",color:"var(--text-muted,#6b7280)",margin:0 }}>No comments yet.</p>
                            ) : (
                              postCommentsList[p.id].map(c => (
                                <div key={c.id} style={S.commentRow}>
                                  <div style={{ flex:1 }}>
                                    <span style={{ fontWeight:700,color:"var(--text-primary,#111827)",marginRight:"8px" }}>{c.authorName}</span>
                                    <span style={{ color:"var(--text-secondary,#7a5868)" }}>{c.text}</span>
                                    <span style={{ color:"var(--text-muted,#6b7280)",fontSize:"10px",marginLeft:"8px" }}>{timeAgo(c.createdAt)}</span>
                                  </div>
                                  <button
                                    style={{ ...S.delBtn,padding:"3px 9px",fontSize:"10px" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f5dada"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                                    onClick={() => deleteComment(p.id, c)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filteredPosts.length === 0 && <div className="empty-state"><p>No posts yet.</p></div>}
          </div>
          </>
            );
          })()}
        </>
      )}

      {/* ══ DATA TAB ══ */}
      {!loading && tab === "data" && (
        <>
          {/* Shortcuts row */}
          <div style={{ display:"flex", gap:"0.6rem", flexWrap:"wrap", marginBottom:"1rem", alignItems:"center" }}>
            <button onClick={() => chartsRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}
              style={{ padding:"7px 16px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              📊 {Tr.goToOverview || "View Statistics"}
            </button>
            <button onClick={() => setStatsCustomizeOpen(true)}
              style={{ padding:"7px 16px", background:"var(--bg-tertiary,#f0f6fb)", color:"var(--text-primary,#111827)", border:"1.5px solid var(--border,#daeaf8)", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              ⚙ {Tr.customizeStats || "Customize Cards"}
            </button>
          </div>

          {/* Customize stats modal */}
          {statsCustomizeOpen && (() => {
            const ALL_STATS = [
              { key:"members",  label: Tr.totalMembers  },
              { key:"verified", label: Tr.verified       },
              { key:"admins",   label: Tr.admins         },
              { key:"posts",    label: Tr.totalPosts     },
              { key:"convs",    label: Tr.conversations  },
              { key:"online",   label: Tr.onlineNow      },
            ];
            return (
              <div style={S.overlay} onClick={() => setStatsCustomizeOpen(false)}>
                <div style={S.modalBox} onClick={e => e.stopPropagation()}>
                  <p style={S.modalTitle}>{Tr.customizeStats || "Customize Stat Cards"}</p>
                  <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", margin:"4px 0 0.85rem" }}>
                    {Tr.customizeStatsSub || "Choose which stat cards to show in the data tab."}
                  </p>
                  <div style={{ display:"flex", gap:10, marginBottom:"0.4rem" }}>
                    <button onClick={() => setHiddenDataStats(new Set())} style={{ background:"none", border:"none", color:"var(--brand,#4472b8)", fontSize:12, fontWeight:700, cursor:"pointer", padding:0 }}>{Tr.selectAll}</button>
                    <button onClick={() => setHiddenDataStats(new Set(ALL_STATS.map(s => s.key)))} style={{ background:"none", border:"none", color:"var(--text-muted,#6b7280)", fontSize:12, fontWeight:700, cursor:"pointer", padding:0 }}>{Tr.clearAll}</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"0.5rem 0 1rem" }}>
                    {ALL_STATS.map(s => (
                      <label key={s.key} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                        <input type="checkbox" checked={!hiddenDataStats.has(s.key)}
                          onChange={() => setHiddenDataStats(prev => {
                            const next = new Set(prev);
                            next.has(s.key) ? next.delete(s.key) : next.add(s.key);
                            return next;
                          })} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <button onClick={() => setStatsCustomizeOpen(false)} style={{ padding:"9px 20px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer" }}>{Tr.done || "Done"}</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Export / import members */}
          <div className="card" style={{ padding:"1.25rem", marginBottom:"1.5rem" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 0.85rem" }}>{Tr.dataManage}</p>
            <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
              <button onClick={() => setExportOpen(true)}
                style={{ padding:"10px 20px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                ⬇ {Tr.downloadBtn}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={importBusy}
                style={{ padding:"10px 20px", background:"var(--bg-tertiary,#f0f6fb)", color:"var(--text-primary,#111827)", border:"1.5px solid var(--border,#daeaf8)", borderRadius:10, fontSize:14, fontWeight:700, cursor: importBusy ? "wait" : "pointer", opacity: importBusy ? 0.6 : 1 }}>
                ⬆ {importBusy ? Tr.importing : Tr.uploadBtn}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display:"none" }} />
            </div>
            <p style={{ fontSize:11, color:"var(--text-muted,#6b7280)", margin:"0.75rem 0 0" }}>{Tr.dirNote}</p>
            {importResult && (
              <div style={{ marginTop:"1rem", padding:"0.85rem 1rem", borderRadius:10, background:"var(--bg-tertiary,#f0f6fb)", border:"1px solid var(--border,#daeaf8)" }}>
                {importResult.error ? (
                  <p style={{ margin:0, fontSize:13, color:"#c25c5c", fontWeight:600 }}>⚠ {importResult.error}</p>
                ) : (
                  <>
                    <p style={{ margin:"0 0 4px", fontSize:13, color:"var(--text-primary,#111827)", fontWeight:700 }}>
                      ✓ {Tr.created}: {importResult.created} · {Tr.skippedDup}: {importResult.skipped} · {Tr.errorsLbl}: {importResult.errors.length}
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul style={{ margin:"6px 0 0", paddingInlineStart:18, fontSize:12, color:"var(--text-muted,#6b7280)", maxHeight:140, overflowY:"auto" }}>
                        {importResult.errors.slice(0, 50).map((er, i) => <li key={i}>{er}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Field-selection modal for export */}
          {exportOpen && (
            <div style={S.overlay} onClick={() => setExportOpen(false)}>
              <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
                <p style={S.modalTitle}>{Tr.exportTitle}</p>
                <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", margin:"4px 0 0" }}>{Tr.exportSub}</p>
                <div style={{ display:"flex", gap:10, margin:"0.85rem 0 0.4rem" }}>
                  <button onClick={() => setSelFields(EXPORT_FIELDS.map(f => f.key))} style={{ background:"none", border:"none", color:"var(--brand,#4472b8)", fontSize:12, fontWeight:700, cursor:"pointer", padding:0 }}>{Tr.selectAll}</button>
                  <button onClick={() => setSelFields([])} style={{ background:"none", border:"none", color:"var(--text-muted,#6b7280)", fontSize:12, fontWeight:700, cursor:"pointer", padding:0 }}>{Tr.clearAll}</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"0.5rem 0 1rem" }}>
                  {EXPORT_FIELDS.map(f => (
                    <label key={f.key} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                      <input type="checkbox" checked={selFields.includes(f.key)}
                        onChange={() => setSelFields(prev => prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key])} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button onClick={() => setExportOpen(false)} style={{ padding:"9px 18px", background:"var(--bg-tertiary,#f0f6fb)", color:"var(--text-primary,#111827)", border:"1px solid var(--border,#daeaf8)", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer" }}>{Tr.cancel}</button>
                  <button onClick={exportExcel} disabled={!selFields.length} style={{ padding:"9px 18px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor: !selFields.length ? "not-allowed" : "pointer", opacity: !selFields.length ? 0.5 : 1 }}>{Tr.downloadBtn}</button>
                </div>
              </div>
            </div>
          )}

          {/* Stat summary row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
            {[
              { label: Tr.totalMembers,  value: users.length,   color:"#4472b8", type:"members"  },
              { label: Tr.verified,       value: verifiedN,      color:"#1d4896", type:"verified" },
              { label: Tr.admins,         value: adminsN,        color:"#c25c5c", type:"admins"   },
              { label: Tr.totalPosts,    value: posts.length,   color:"#8b5cf6", type:"posts"    },
              { label: Tr.conversations,  value: convs.length,   color:"#d4a574", type:"convs"    },
              { label: Tr.onlineNow,     value: onlineNow,      color:"#7ba87a", type:"online"   },
            ].filter(s => !hiddenDataStats.has(s.type)).map(s => (
              <div key={s.label} className="card" style={{ padding:"1rem 1.25rem", cursor:"pointer", transition:"box-shadow 0.15s", userSelect:"none" }}
                onClick={() => setStatDetailType(s.type)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(29,72,150,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
              >
                <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 6px" }}>{s.label}</p>
                <p style={{ fontSize:28, fontWeight:800, color:s.color, margin:0, lineHeight:1 }}>{s.value}</p>
                <p style={{ fontSize:10, color:"var(--text-muted,#6b7280)", margin:"4px 0 0" }}>Click to view →</p>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem", marginBottom:"1.25rem" }}>
            {/* Professions bar chart */}
            <div className="card" style={{ padding:"1.25rem" }}>
              <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 1rem" }}>{Tr.topProfessions}</p>
              {topProfessions.length === 0
                ? <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)" }}>{Tr.noData}</p>
                : topProfessions.map(([prof, count]) => (
                  <div key={prof} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary,#7a5868)" }}>{prof}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:"var(--brand,#4472b8)" }}>{count}</span>
                    </div>
                    <div style={{ height:8, background:"var(--bg-tertiary,#f0f6fb)", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.round((count/users.length)*100)}%`, background:"var(--brand,#4472b8)", borderRadius:99, transition:"width 0.6s ease" }} />
                    </div>
                    <span style={{ fontSize:10, color:"var(--text-muted,#6b7280)" }}>{Math.round((count/users.length)*100)}%</span>
                  </div>
                ))
              }
            </div>

            {/* Cities bar chart */}
            <div className="card" style={{ padding:"1.25rem" }}>
              <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 1rem" }}>{Tr.topCities}</p>
              {topCities.length === 0
                ? <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)" }}>{Tr.noData}</p>
                : topCities.map(([city, count]) => (
                  <div key={city} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary,#7a5868)" }}>{city}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:"#8b5cf6" }}>{count}</span>
                    </div>
                    <div style={{ height:8, background:"var(--bg-tertiary,#f0f6fb)", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.round((count/users.length)*100)}%`, background:"#8b5cf6", borderRadius:99, transition:"width 0.6s ease" }} />
                    </div>
                    <span style={{ fontSize:10, color:"var(--text-muted,#6b7280)" }}>{Math.round((count/users.length)*100)}%</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Private-field charts */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"1.25rem", marginBottom:"1.25rem" }}>
            {[
              { label: Tr.topSectors,   data: topEthnicities, color:"#e8735a" },
              { label: Tr.topReligions, data: topReligions,   color:"#1d4896" },
              { label: Tr.topRegions,   data: topRegions,     color:"#7ba87a" },
            ].map(({ label, data, color }) => (
              <div key={label} className="card" style={{ padding:"1.25rem" }}>
                <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 1rem" }}>{label}</p>
                {data.length === 0
                  ? <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)" }}>{Tr.noData}</p>
                  : data.map(([val, count]) => (
                    <div key={val} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary,#7a5868)", maxWidth:"75%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</span>
                        <span style={{ fontSize:11, fontWeight:700, color }}>{count} <span style={{ color:"var(--text-muted,#6b7280)", fontWeight:400 }}>({Math.round((count/users.length)*100)}%)</span></span>
                      </div>
                      <div style={{ height:6, background:"var(--bg-tertiary,#f0f6fb)", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.round((count/users.length)*100)}%`, background:color, borderRadius:99, transition:"width 0.6s ease" }} />
                      </div>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>

          {/* Recent members table */}
          <div className="card" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
            <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border,#daeaf8)" }}>
              <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>{Tr.recentMembers}</p>
            </div>
            <table style={{ ...S.table, minWidth: 480 }}>
              <thead>
                <tr>
                  {["Name","Email","Profession","City","Joined"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...users]
                  .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
                  .slice(0, 10)
                  .map(u => (
                    <tr key={u.id} style={S.row}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f0f6fb)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-primary,#fff)"}
                    >
                      <td style={S.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, background:avatarColor(`${u.firstName} ${u.lastName}`), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff" }}>
                            {getInitials(`${u.firstName} ${u.lastName}`)}
                          </div>
                          <span style={{ fontWeight:600, color:"var(--text-primary,#111827)" }}>{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td style={S.td}>{u.email||"—"}</td>
                      <td style={S.td}>{u.profession||"—"}</td>
                      <td style={S.td}>{u.city||"—"}</td>
                      <td style={{ ...S.td, whiteSpace:"nowrap" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Member breakdown donut */}
          {(() => {
            const verified = users.filter(u => u.emailVerified).length;
            const adminCount = users.filter(u => u.isAdmin).length;
            const online = users.filter(isActuallyOnline).length;
            const total = users.length || 1;
            const vPct = Math.round(verified / total * 100);
            const aPct = Math.round(adminCount / total * 100);
            const oPct = Math.round(online / total * 100);
            const segments = [
              { label: Tr.verified || "Verified", pct: vPct, color: "#4472b8" },
              { label: Tr.admins || "Admins", pct: aPct, color: "#c25c5c" },
              { label: Tr.onlineNow || "Online", pct: oPct, color: "#7ba87a" },
              { label: "Others", pct: Math.max(0, 100 - vPct - aPct - oPct), color: "#e2e8f0" },
            ];
            let cumulative = 0;
            const conicParts = segments.map(s => {
              const start = cumulative;
              cumulative += s.pct;
              return `${s.color} ${start}% ${cumulative}%`;
            }).join(", ");
            return (
              <div ref={chartsRef} className="card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                  Member Breakdown
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ width: 100, height: 100, borderRadius: "50%", background: `conic-gradient(${conicParts})`, flexShrink: 0, position: "relative" }}>
                    <div style={{ position:"absolute", inset: 16, borderRadius:"50%", background:"var(--bg-primary,#fff)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {segments.filter(s => s.pct > 0).map(s => (
                      <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }} />
                        <span style={{ fontSize:11, color:"var(--text-secondary,#7a5868)", fontWeight:500 }}>{s.label}</span>
                        <span style={{ fontSize:11, color:"var(--text-muted,#6b7280)", marginLeft:"auto", fontWeight:600 }}>{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Weekly signups bar chart */}
          {(() => {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return d;
            });
            const counts = days.map(day => {
              const dayStr = day.toISOString().slice(0, 10);
              return users.filter(u => u.createdAt?.slice(0, 10) === dayStr).length;
            });
            const maxCount = Math.max(...counts, 1);
            const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            return (
              <div className="card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                  New Members – Last 7 Days
                </p>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
                  {counts.map((count, i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <span style={{ fontSize:9, color:"var(--text-muted,#6b7280)", fontWeight:600, minHeight:14 }}>{count > 0 ? count : ""}</span>
                      <div style={{
                        width:"100%", borderRadius:"4px 4px 2px 2px",
                        background: count > 0 ? "var(--brand,#4472b8)" : "var(--bg-tertiary,#f0f6fb)",
                        height: `${Math.max(4, (count / maxCount) * 52)}px`,
                        transition: "height 0.6s ease",
                      }} />
                      <span style={{ fontSize:9, color:"var(--text-muted,#6b7280)" }}>{dayLabels[days[i].getDay()]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 30-day signups line chart */}
          {(() => {
            const days30 = Array.from({ length: 30 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (29 - i));
              return d;
            });
            const counts30 = days30.map(day => {
              const dayStr = day.toISOString().slice(0, 10);
              return users.filter(u => u.createdAt?.slice(0, 10) === dayStr).length;
            });
            const maxC = Math.max(...counts30, 1);
            const W = 300, H = 80, pad = 8;
            const pts = counts30.map((c, i) => {
              const x = pad + (i / (counts30.length - 1)) * (W - pad * 2);
              const y = H - pad - (c / maxC) * (H - pad * 2);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");
            const total30 = counts30.reduce((a, b) => a + b, 0);
            return (
              <div className="card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                    New Members – Last 30 Days
                  </p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand,#4472b8)" }}>{total30} total</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height: H }}>
                  <polyline points={pts} fill="none" stroke="var(--brand,#4472b8)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {counts30.map((c, i) => {
                    if (c === 0) return null;
                    const x = pad + (i / (counts30.length - 1)) * (W - pad * 2);
                    const y = H - pad - (c / maxC) * (H - pad * 2);
                    return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3} fill="var(--brand,#4472b8)" />;
                  })}
                </svg>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop: 4 }}>
                  <span style={{ fontSize:9, color:"var(--text-muted,#6b7280)" }}>{days30[0].toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
                  <span style={{ fontSize:9, color:"var(--text-muted,#6b7280)" }}>Today</span>
                </div>
              </div>
            );
          })()}

          {/* City distribution donut chart */}
          {(() => {
            const cityCount = {};
            users.forEach(u => {
              const city = u.city?.trim();
              if (city) cityCount[city] = (cityCount[city] || 0) + 1;
            });
            const sorted = Object.entries(cityCount).sort((a, b) => b[1] - a[1]);
            const top = sorted.slice(0, 5);
            const othersCount = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
            if (othersCount > 0) top.push(["Other", othersCount]);
            const totalWithCity = top.reduce((s, [, v]) => s + v, 0) || 1;
            const cityColors = ["#4472b8","#7ba87a","#c25c5c","#d4a574","#8b5cf6","#94a3b8"];
            let cumCity = 0;
            const cityConicParts = top.map(([, v], i) => {
              const pct = Math.round(v / totalWithCity * 100);
              const start = cumCity;
              cumCity += pct;
              return `${cityColors[i % cityColors.length]} ${start}% ${cumCity}%`;
            }).join(", ");
            return (
              <div className="card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                  City Distribution
                </p>
                {top.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No city data yet</p>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ width: 100, height: 100, borderRadius: "50%", background: `conic-gradient(${cityConicParts})`, flexShrink: 0, position: "relative" }}>
                      <div style={{ position:"absolute", inset: 16, borderRadius:"50%", background:"var(--bg-primary,#fff)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {top.map(([city, count], i) => {
                        const pct = Math.round(count / totalWithCity * 100);
                        return (
                          <div key={city} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                            <div style={{ width:10, height:10, borderRadius:3, background: cityColors[i % cityColors.length], flexShrink:0 }} />
                            <span style={{ fontSize:11, color:"var(--text-secondary,#7a5868)", fontWeight:500 }}>{city}</span>
                            <span style={{ fontSize:11, color:"var(--text-muted,#6b7280)", marginLeft:"auto", fontWeight:600 }}>{pct}% ({count})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {statDetailType && (
            <StatDetailPanel
              type={statDetailType}
              users={users}
              posts={posts}
              convs={convs}
              onClose={() => setStatDetailType(null)}
              Tr={Tr}
              isActuallyOnline={isActuallyOnline}
            />
          )}
        </>
      )}

      {/* ══ REPORTS TAB ══ */}
      {tab === "reports" && (
        <div>
          {/* Reports header + inline filter bar */}
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              {Tr.reportsTab} <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({reports.filter(r=>r.status==="pending").length} pending)</span>
            </span>
            <input
              className="input"
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              placeholder="Search reporter or reported…"
              style={{ fontSize:12, width:220, flexShrink:0 }}
            />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { val:"all",       label:"All" },
                { val:"pending",   label:"Pending" },
                { val:"resolved",  label:"Resolved" },
                { val:"dismissed", label:"Dismissed" },
              ].map(opt => (
                <button key={opt.val} onClick={() => setReportStatusFilter(opt.val)}
                  style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                    background: reportStatusFilter===opt.val ? "var(--brand,#4472b8)" : "var(--bg-secondary,#f0f6fb)",
                    color: reportStatusFilter===opt.val ? "#fff" : "var(--text-secondary)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button style={{ ...S.refreshBtn, marginLeft:"auto" }} onClick={fetchReports}>{reportsLoading ? "…" : `↻ ${Tr.refresh}`}</button>
          </div>
          {(() => {
            const filteredReports = reports.filter(r => {
              const matchStatus = reportStatusFilter === "all" || r.status === reportStatusFilter;
              const matchSearch = !reportSearch ||
                (r.reporterName || "").toLowerCase().includes(reportSearch.toLowerCase()) ||
                (r.reportedName || "").toLowerCase().includes(reportSearch.toLowerCase());
              return matchStatus && matchSearch;
            });
            return reportsLoading ? (
              <div style={{ padding:"2rem", textAlign:"center", color:"var(--text-muted,#6b7280)" }}>Loading…</div>
            ) : filteredReports.length === 0 ? (
              <div className="empty-state"><p>{reports.length === 0 ? Tr.noReports : "No reports match the filters."}</p></div>
            ) : (
            <div className="card" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <table style={{ ...S.table, minWidth: 560 }}>
                <thead>
                  <tr>
                    {[Tr.reportFrom, Tr.reportedUser, Tr.reportReason, Tr.reportDate, Tr.reportStatus, ""].map(h => (
                      <th key={h} style={{ ...S.th, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <React.Fragment key={r.id}>
                      <tr style={{ ...S.row, opacity: r.status !== "pending" ? 0.6 : 1, cursor:"pointer", borderBottom: expandedReportId === r.id ? "none" : undefined }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f0f6fb)"}
                        onMouseLeave={e => e.currentTarget.style.background = expandedReportId === r.id ? "var(--bg-secondary,#f0f6fb)" : "var(--bg-primary,#fff)"}
                        onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                      >
                        <td style={S.td}>
                          <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary,#111827)", margin:0 }}>{r.reporterName || r.reporterId}</p>
                        </td>
                        <td style={S.td}>
                          <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary,#111827)", margin:0 }}>{r.reportedName || r.reportedId}</p>
                        </td>
                        <td style={{ ...S.td, maxWidth:280 }}>
                          <p style={{ fontSize:12, color:"var(--text-secondary,#7a5868)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.reason}</p>
                        </td>
                        <td style={{ ...S.td, whiteSpace:"nowrap", fontSize:11 }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td style={S.td}>
                          <span style={{
                            fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:99,
                            background: r.status === "resolved" ? "rgba(123,168,122,0.15)" : r.status === "dismissed" ? "rgba(107,114,128,0.12)" : "rgba(233,65,91,0.12)",
                            color: r.status === "resolved" ? "#7ba87a" : r.status === "dismissed" ? "#6b7280" : "#e9415b",
                          }}>
                            {r.status === "resolved" ? Tr.reportResolved : r.status === "dismissed" ? Tr.dismiss : Tr.reportPending}
                          </span>
                        </td>
                        <td style={S.td} onClick={e => e.stopPropagation()}>
                          <div style={{ display:"flex", gap:4 }}>
                            {r.status === "pending" && (<>
                              <button onClick={() => updateReportStatus(r.id, "resolved")}
                                style={{ padding:"4px 10px", borderRadius:"var(--r-sm,8px)", fontSize:11, fontWeight:600, border:"1px solid #a3d9a5", background:"#f0fdf4", color:"#166534", cursor:"pointer", whiteSpace:"nowrap" }}>
                                {Tr.markResolved}
                              </button>
                              <button onClick={() => updateReportStatus(r.id, "dismissed")}
                                style={{ padding:"4px 10px", borderRadius:"var(--r-sm,8px)", fontSize:11, fontWeight:600, border:"1px solid #d1d5db", background:"#f9fafb", color:"#6b7280", cursor:"pointer" }}>
                                {Tr.dismiss}
                              </button>
                            </>)}
                            <button onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                              style={{ padding:"4px 10px", borderRadius:"var(--r-sm,8px)", fontSize:11, fontWeight:600, border:"1px solid #93c5fd", background:"#eff6ff", color:"#1d4896", cursor:"pointer" }}>
                              {expandedReportId === r.id ? "▲" : "▼ Convo"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedReportId === r.id && (
                        <tr>
                          <td colSpan={6} style={{ background:"var(--bg-secondary,#f0f6fb)", padding:"1rem 1.5rem 1.25rem", borderBottom:"2px solid var(--border,#daeaf8)" }}
                            onClick={e => e.stopPropagation()}>
                            <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 10px" }}>
                              Conversation — {r.reporterName} &amp; {r.reportedName}
                            </p>
                            {(!r.messages || r.messages.length === 0) ? (
                              <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", fontStyle:"italic", margin:0 }}>No messages captured.</p>
                            ) : (
                              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:340, overflowY:"auto", paddingRight:4 }}>
                                {r.messages.map((m, i) => {
                                  const isReporter = m.senderId === r.reporterId;
                                  return (
                                    <div key={i} style={{ display:"flex", flexDirection: isReporter ? "row-reverse" : "row", alignItems:"flex-end", gap:8 }}>
                                      <div style={{
                                        maxWidth:"70%", padding:"7px 12px", borderRadius:14,
                                        borderBottomRightRadius: isReporter ? 4 : 14,
                                        borderBottomLeftRadius: isReporter ? 14 : 4,
                                        background: isReporter ? "#dbeafe" : "#fff",
                                        boxShadow:"0 1px 3px rgba(0,0,0,0.08)",
                                        fontSize:12, color:"var(--text-primary,#111827)", wordBreak:"break-word",
                                      }}>
                                        <p style={{ fontSize:10, fontWeight:700, color: isReporter ? "#1d4896" : "#e8735a", margin:"0 0 3px" }}>{m.senderName}</p>
                                        <p style={{ margin:0 }}>{m.text || <em style={{ color:"var(--text-muted,#6b7280)" }}>image</em>}</p>
                                        {m.sentAt && (
                                          <p style={{ fontSize:9, color:"var(--text-muted,#6b7280)", margin:"3px 0 0", textAlign: isReporter ? "right" : "left" }}>
                                            {new Date(typeof m.sentAt === "object" && m.sentAt.seconds ? m.sentAt.seconds * 1000 : m.sentAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}
        </div>
      )}

      {/* ══ LOGS TAB ══ */}
      {tab === "logs" && (
        <div>
          <SectionHeader title={Tr.tabs.logs} count={filteredLogs.length} action={
            <button style={S.refreshBtn} onClick={fetchLogs}>
              {logsLoading ? "…" : `↻ ${Tr.refresh}`}
            </button>
          } />

          {/* Filter card */}
          <div style={{ background:"var(--bg-primary,#fff)",borderRadius:"16px",padding:"1.25rem",border:"1.5px solid var(--border,#daeaf8)",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(29, 72, 150,0.05)",display:"flex",flexDirection:"column",gap:"0.75rem" }}>

            {/* Type filter pills */}
            {allLogTypes.length > 0 && (
              <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
                {allLogTypes.map(type => {
                  const cfg = getLogTypeConfig(type);
                  const active = logTypeFilter.includes(type);
                  return (
                    <button key={type} onClick={() => toggleLogType(type)} style={{
                      padding:"4px 12px",borderRadius:"99px",fontSize:"11px",fontWeight:700,cursor:"pointer",
                      border:`1.5px solid ${active ? cfg.borderColor : "var(--border,#f0dce0)"}`,
                      background: active ? cfg.bg : "var(--bg-secondary,#f0f6fb)",
                      color: active ? cfg.color : "var(--text-muted,#6b7280)",
                      transition:"all 0.15s",
                    }}>{cfg.label}</button>
                  );
                })}
                {logTypeFilter.length > 0 && (
                  <button onClick={() => setLogTypeFilter([])} style={{ padding:"4px 12px",borderRadius:"99px",fontSize:"11px",fontWeight:700,cursor:"pointer",border:"1.5px solid var(--border,#f0dce0)",background:"var(--bg-tertiary,#f0f6fb)",color:"var(--text-muted,#6b7280)" }}>
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Actor + Date range */}
            <div style={{ display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center" }}>
              <div>
                <p style={{ ...S.modalLabel,marginBottom:"3px" }}>Actor name</p>
                <input style={{ ...S.logFilterInput,width:"200px" }} type="text" placeholder="Filter by actor…" value={logActorFilter} onChange={e => setLogActorFilter(e.target.value)} />
              </div>
              <div>
                <p style={{ ...S.modalLabel,marginBottom:"3px" }}>From date</p>
                <input style={S.logFilterInput} type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} />
              </div>
              <div>
                <p style={{ ...S.modalLabel,marginBottom:"3px" }}>To date</p>
                <input style={S.logFilterInput} type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} />
              </div>
              {(logActorFilter || logDateFrom || logDateTo) && (
                <button onClick={() => { setLogActorFilter(""); setLogDateFrom(""); setLogDateTo(""); }}
                  style={{ ...S.refreshBtn,background:"var(--bg-tertiary,#f0f6fb)",color:"var(--text-muted,#6b7280)",border:"1.5px solid var(--border,#f0dce0)",marginTop:"18px" }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Log entries */}
          <div style={S.logPanel}>
            {logsLoading && <p style={S.empty}>Loading logs…</p>}
            {!logsLoading && filteredLogs.length === 0 && (
              <p style={S.empty}>{logs.length === 0 ? "No activity logs yet." : "No logs match the current filters."}</p>
            )}
            {!logsLoading && filteredLogs.length > 0 && (
              <div style={S.logList}>
                <div style={{ padding:"10px 1.25rem 6px",background:"var(--bg-primary,#fff)",borderBottom:"1px solid var(--border,#daeaf8)" }}>
                  <p style={{ fontSize:"12px",color:"var(--text-muted,#6b7280)",margin:0 }}>
                    Showing {filteredLogs.length} of {logs.length} entries
                  </p>
                </div>
                {filteredLogs.map(log => {
                  const cfg = getLogTypeConfig(log.type);
                  const desc = humanDescription(log, Tr);
                  const relTime = timeAgo(log.timestamp);
                  const absTime = formatAbsoluteTime(log.timestamp);
                  const hasDetails = log.details && Object.keys(log.details).length > 0;
                  return (
                    <div key={log.id} style={S.logRow(cfg.borderColor)}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f0f6fb)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-primary,#fff)"}
                    >
                      <span style={S.logBadge(cfg.bg, cfg.color)}>{cfg.label}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap" }}>
                          <span style={S.logActor}>{log.actorName ?? log.actorId ?? "Unknown"}</span>
                          <span style={S.logDesc}>{desc.replace(/^.*?—\s*/, "")}</span>
                        </div>
                        {hasDetails && (
                          <p style={S.logDetails}>
                            {log.details.text
                              ? `"${log.details.text}"`
                              : log.details.editedFields
                              ? `Fields: ${log.details.editedFields.join(", ")}`
                              : log.details.toUserName
                              ? `To: ${log.details.toUserName}`
                              : null}
                          </p>
                        )}
                      </div>
                      <span style={S.logTimestamp} title={absTime}>{relTime}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ BLACKLIST TAB ══ */}
      {tab === "blacklist" && (
        <div>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              🚫 {Tr.blacklistTab} <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({blacklist.length})</span>
            </span>
            <button style={{ ...S.refreshBtn, marginLeft:"auto" }} onClick={fetchBlacklist}>{blacklistLoading ? "…" : `↻ ${Tr.refresh}`}</button>
          </div>
          <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:"1rem" }}>{Tr.blacklistNote}</p>

          {/* Add form */}
          <div className="card" style={{ padding:"1.25rem", marginBottom:"1.25rem" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.85rem" }}>{Tr.blacklistAdd}</p>
            <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
              <input
                value={blacklistEmail}
                onChange={e => setBlacklistEmail(e.target.value)}
                placeholder={Tr.blacklistEmail}
                type="email"
                onKeyDown={e => e.key === "Enter" && addToBlacklist()}
                style={{ flex:2, minWidth:200, padding:"9px 12px", fontSize:13, border:"1.5px solid var(--border,#daeaf8)", borderRadius:10, background:"var(--bg-secondary)", color:"var(--text-primary)", fontFamily:"var(--font)", boxSizing:"border-box" }}
              />
              <input
                value={blacklistReason}
                onChange={e => setBlacklistReason(e.target.value)}
                placeholder={Tr.blacklistReason}
                onKeyDown={e => e.key === "Enter" && addToBlacklist()}
                style={{ flex:3, minWidth:200, padding:"9px 12px", fontSize:13, border:"1.5px solid var(--border,#daeaf8)", borderRadius:10, background:"var(--bg-secondary)", color:"var(--text-primary)", fontFamily:"var(--font)", boxSizing:"border-box" }}
              />
              <button
                onClick={addToBlacklist}
                disabled={!blacklistEmail.trim() || blacklistAdding}
                style={{ padding:"9px 22px", borderRadius:10, background:"#c25c5c", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor: !blacklistEmail.trim() || blacklistAdding ? "not-allowed" : "pointer", opacity: !blacklistEmail.trim() || blacklistAdding ? 0.6 : 1, whiteSpace:"nowrap" }}>
                {blacklistAdding ? "…" : `🚫 ${Tr.blacklistAddBtn}`}
              </button>
            </div>
          </div>

          {/* Blacklist table */}
          {blacklistLoading ? (
            <div style={{ padding:"2rem", textAlign:"center", color:"var(--text-muted)" }}>Loading…</div>
          ) : blacklist.length === 0 ? (
            <div className="empty-state"><p>{Tr.blacklistEmpty}</p></div>
          ) : (
            <div className="card" style={{ overflowX:"auto" }}>
              <table style={{ ...S.table, minWidth:400 }}>
                <thead>
                  <tr>
                    {[Tr.blacklistEmail, Tr.blacklistReason, "Added by", Tr.reportDate, ""].map(h => (
                      <th key={h} style={{ ...S.th, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blacklist.map(b => (
                    <tr key={b.id} style={S.row}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary,#f0f6fb)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-primary,#fff)"}
                    >
                      <td style={{ ...S.td, fontWeight:600, color:"#c25c5c", fontFamily:"monospace" }}>{b.email}</td>
                      <td style={{ ...S.td, maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.reason || "—"}</td>
                      <td style={S.td}>{b.addedBy || "—"}</td>
                      <td style={{ ...S.td, whiteSpace:"nowrap", fontSize:11 }}>{b.addedAt ? new Date(b.addedAt).toLocaleDateString() : "—"}</td>
                      <td style={S.td}>
                        <button onClick={() => removeFromBlacklist(b.id)}
                          style={{ padding:"4px 10px", borderRadius:"var(--r-sm,8px)", fontSize:11, fontWeight:600, border:"1px solid #d99090", background:"#f5dada", color:"#c25c5c", cursor:"pointer" }}>
                          {Tr.blacklistRemove}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ SLIDESHOW TAB ══ */}
      {tab === "slideshow" && (
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:"var(--text-primary)", marginBottom:"1rem" }}>{Tr.admin?.slideshow || "Slideshow"}</h2>
          <SlideshowAdmin />
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <EditUserModal
          u={editingUser}
          adminUser={user}
          adminName={adminName}
          Tr={Tr}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
          }}
        />
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteTarget && (
        <ConfirmModal
          danger
          title={Tr.confirmDeleteTitle}
          message={Tr.confirmDeleteMsg(`${confirmDeleteTarget.firstName} ${confirmDeleteTarget.lastName}`)}
          confirmLabel={Tr.confirmDeleteBtn}
          onConfirm={() => doDeleteUser(confirmDeleteTarget.id)}
          onCancel={() => setConfirmDeleteTarget(null)}
        />
      )}

      {/* ── Confirm Revoke Admin ── */}
      {confirmRevokeTarget && (
        <ConfirmModal
          danger
          title={Tr.revokeAdmin}
          message={Tr.confirmRevokeAdminMsg(`${confirmRevokeTarget.firstName} ${confirmRevokeTarget.lastName}`)}
          confirmLabel={Tr.confirmRevokeAdminBtn}
          onConfirm={() => doRevokeAdmin(confirmRevokeTarget.id)}
          onCancel={() => setConfirmRevokeTarget(null)}
        />
      )}

      {/* ── Confirm Make Admin (step 1) ── */}
      {makeAdminConfirmTarget && !permsTarget && (
        <ConfirmModal
          danger={false}
          title={Tr.confirmMakeAdminTitle}
          message={Tr.confirmMakeAdminMsg(`${makeAdminConfirmTarget.firstName} ${makeAdminConfirmTarget.lastName}`)}
          confirmLabel={Tr.confirmMakeAdminBtn}
          onConfirm={() => { setPermsTarget(makeAdminConfirmTarget); setMakeAdminConfirmTarget(null); }}
          onCancel={() => setMakeAdminConfirmTarget(null)}
        />
      )}

      {/* ── Permissions Modal (new admin, step 2) ── */}
      {permsTarget && (
        <PermissionsModal
          user={permsTarget}
          isNew={true}
          Tr={Tr}
          onSave={(perms) => doMakeAdmin(permsTarget, perms)}
          onCancel={() => setPermsTarget(null)}
        />
      )}

      {/* ── Permissions Modal (edit existing admin) ── */}
      {editPermsTarget && (
        <PermissionsModal
          user={editPermsTarget}
          isNew={false}
          Tr={Tr}
          onSave={(perms) => doUpdatePerms(editPermsTarget, perms)}
          onCancel={() => setEditPermsTarget(null)}
        />
      )}
    </div>
  );
}
