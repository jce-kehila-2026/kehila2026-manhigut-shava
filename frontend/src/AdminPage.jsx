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
import { translateProfession, translateAny, translateReligion, translateEthnicity } from "./utils/translateProfile";

/* ─── Admin translations ─── */
const AT = {
  he: {
    pageTitle: "לוח בקרה — מנהל", pageSub: "ניהול הפלטפורמה ואנליטיקה",
    tabs: { overview:"סקירה", users:"משתמשות", editUsers:"עריכת משתמשות", posts:"פוסטים", logs:"יומן פעילות", support:"תמיכה" },
    supportTitle:"מודול תמיכה", supportPostsLabel:"פוסטים לעזרה", supportReqsLabel:"בקשות עזרה", supportReqFrom:"מאת", supportReqTo:"אל", supportReqStatus:"סטטוס", supportReqMsg:"הודעה", supportReqDate:"תאריך", supportPending:"ממתין", supportAccepted:"אושר", supportDeclined:"נדחה", supportNoPosts:"אין פוסטים עדיין", supportNoReqs:"אין בקשות עדיין", supportUnanswered:"ללא מענה", supportColPost:"פוסט", supportColAuthor:"מחברת", supportColTags:"תחומים", supportColDate:"תאריך", supportColComments:"תגובות", supportDeletePost:"מחקי פוסט", supportFilterAll:"הכל", supportFilterSearch:"חיפוש...", supportFilterStatus:"סינון לפי סטטוס",
    totalMembers:"סה\"כ חברות", onlineNow:"מחוברות עכשיו", verified:"מאומתות",
    totalPosts:"סה\"כ פוסטים", conversations:"שיחות", admins:"מנהלות",
    activeMembers:"חברות פעילות", thisWeek:(n)=>`+${n} השבוע`,
    percentVerified:(p)=>`${p}% מאומתות`,
    topProfessions:"מקצועות מובילות", topRegionsLabel:"אזורים מובילים", recentMembers:"חברות חדשות", noData:"אין נתונים עדיין",
    withHelpAreas:"עם תחומי עזרה",
    postsSubLabel:(l,c)=>`${l} לייקים · ${c} תגובות`,
    platformHealth:"בריאות הפלטפורמה",
    verifiedMembers:"חברות מאומתות", helpAreaCoverage:"כיסוי תחומי עזרה", onlineRightNow:"מחוברות כרגע",
    avgPostsPerMember:"פוסטים ממוצע לחברה", totalInteractions:"סך האינטראקציות",
    viewAllMembers:"לכל החברות →",
    quickActions:"פעולות מהירות",
    manageUsers:"ניהול משתמשות", reviewReports:"בדיקת דיווחים", activityLogs:"יומן פעילות", dataAndAnalytics:"נתונים ואנליטיקה",
    mostLikedPost:"הפוסט הכי אהוב", mediaPost:"(פוסט מדיה)", postBy:(n)=>`מאת ${n}`,
    searchPh:"חפשי משתמשת...", editUser:"עריכת משתמשת",
    firstName:"שם פרטי", lastName:"שם משפחה", phone:"טלפון",
    profession:"מקצוע", bio:"ביוגרפיה",
    adminPriv:"הרשאות מנהל", cancel:"ביטול", save:"שמרי שינויים", saving:"שומרת...",
    deleteLbl:"מחקי", editLbl:"ערכי", makeAdmin:"הפכי למנהלת", revokeAdmin:"הסרת הרשאות מנהל", editPermsBtn:"ערכי הרשאות",
    refresh:"רענון", filterByActor:"חפשי לפי שם...", filterByType:"סוג:",
    dataManage:"ניהול נתונים", downloadBtn:"הורדת אקסל", uploadBtn:"העלאת אקסל", importing:"מייבאת...",
    dirNote:"ייבוא יוצר רשומות מדריך בלבד (ללא חשבון התחברות).",
    created:"נוצרו", skippedDup:"דולגו (כפילות)", errorsLbl:"שגיאות", rowLbl:"שורה",
    exportTitle:"ייצוא חברות לאקסל", exportSub:"בחרי אילו שדות לכלול בקובץ.", selectAll:"בחרי הכל", clearAll:"נקי",
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
    showDataTab:"נתונים", reportsTab:"דיווחים", supportStatsTitle:"נתוני תמיכה", supportStatsPosts:"פוסטי עזרה", supportStatsReqs:"בקשות עזרה", supportStatsTopAreas:"תחומים מבוקשים", supportStatsNoData:"אין נתוני תמיכה עדיין — בקרי בלשונית התמיכה תחילה.",
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
    allMembers:"כל החברות", searchByNamePh:"חפשי לפי שם, אימייל, מקצוע...",
    sortRecent:"אחרונות", sortAlpha:"א–ת", sortAdminsFirst:"מנהלות קודם",
    adminsOnly:"מנהלות בלבד", onlineOnly:"מחוברות עכשיו",
    colMember:"חברה", colStatus:"סטטוס", colJoined:"הצטרפות", colActions:"פעולות",
    statusPending:"ממתינה", adminBadge:"מנהלת", onlineBadge:"מחוברת",
    viewOnly:"צפייה בלבד", noMembersFound:"לא נמצאו חברות.",
    allPosts:"כל הפוסטים", sortMostLiked:"הכי אהוב", pinnedOnly:"מוצמדים בלבד", hasMedia:"עם מדיה",
    colAuthor:"מחברת", colContent:"תוכן", colMedia:"מדיה", colComments:"תגובות", colPosted:"פורסם",
    showLess:"הצג פחות", showFullPost:"הצג פוסט מלא",
    hide:"הסתר", showCommentsFn:(n)=>`הצג (${n})`,
    loadingComments:"טוען תגובות...", noComments:"אין תגובות עדיין.",
    pinLbl:"הצמד", unpinLbl:"הסר הצמדה", noPosts:"אין פוסטים עדיין.",
    deletePostConfirm:"למחוק פוסט זה?", deleteCommentConfirm:"למחוק תגובה זו?",
    distributionLabel:"התפלגות", growthLabel:"צמיחה", membersNavLabel:"חברות",
    regionsLabel:"אזורים", professionsLabel:"מקצועות", religionLabel:"דת",
    noDataSelection:"אין נתונים לסינון זה", newMembersLabel:"חברות חדשות",
    inPeriodLabel:"בתקופה", customLabel:"מותאם",
    fromLabel:"מ-", toLabel:"עד-", todayLabel:"היום",
    membersCountFn:(n)=>`${n} ${n===1?"חברה":"חברות"}`,
    newestLabel:"חדשות", oldestLabel:"ישנות", noMembersInPeriod:"אין חברות בתקופה זו.",
    searchReporterPh:"חפשי מדווחת או מדווח עליה...", allFilter:"הכל", dismissedLabel:"נדחה",
    noReportsFiltered:"אין דיווחים תואמים לסינון.",
    conversationLabel:(a,b)=>`שיחה — ${a} ו${b}`, noMessages:"לא נלכדו הודעות.", convoBtn:"שיחה",
    clearFilter:"נקה סינון", actorNameLabel:"שם המשתמשת",
    fromDateLabel:"מתאריך", toDateLabel:"עד תאריך", clearBtn:"נקה",
    allTypes:"כל הסוגים",
    logTypeLabels:{
      signup:"הרשמה", login:"כניסה", post:"פוסט", post_edit:"עריכת פוסט",
      post_delete:"מחיקת פוסט", comment:"תגובה", comment_edit:"עריכת תגובה",
      comment_delete:"מחיקת תגובה", request_sent:"בקשה נשלחה",
      request_accepted:"בקשה התקבלה", request_declined:"בקשה נדחתה",
      profile_update:"עדכון פרופיל", admin_edit_profile:"עריכת פרופיל (מנהלת)",
      admin_delete_post:"מחיקת פוסט (מנהלת)", admin_delete_comment:"מחיקת תגובה (מנהלת)",
    },
    exportFieldLabels:{
      firstName:"שם פרטי", lastName:"שם משפחה", email:"אימייל", phone:"טלפון",
      region:"אזור", profession:"מקצוע", ethnicity:"קהילה/אתניות",
      helpAreas:"תחומי עזרה", bio:"ביוגרפיה", linkedIn:"לינקדאין", createdAt:"הצטרפות",
    },
    loadingLogs:"טוען יומן...", noLogsFiltered:"אין רשומות תואמות לסינון.",
    showingEntriesFn:(n,t)=>`מציג ${n} מתוך ${t} רשומות`,
    fieldsLabel:"שדות:", toLogLabel:"אל:",
    addedByLabel:"נוסף ע\"י", loading:"טוען...",
    accessDenied:"גישה נדחתה", accessDeniedMsg:"אזור זה מוגבל למנהלות בלבד.",
    slideshowTitle:"סרגל תמונות", slideshowCaptionPh:"כיתוב (רשות)",
    slideshowMoveUp:"↑ העלה", slideshowUploading:"מעלה...",
    slideshowUpload:"העלה תמונות", slideshowMultiple:"בחרי מספר",
    slideshowEmpty:"אין תמונות לסרגל עדיין. העלי תמונה למעלה.",
    chartMembers:"חברות", chartTotal:"סה\"כ",
    editUsersSectionTitle:"עריכת משתמשות", noUsersMatch:"לא נמצאו משתמשות.", colAdmin:"מנהלת", colName:"שם",
    pendingBadge:(n)=>`(${n} ממתינות)`,
  },
  en: {
    pageTitle: "Admin Dashboard", pageSub: "Platform management and analytics",
    tabs: { overview:"Overview", users:"Users", editUsers:"Edit Users", posts:"Posts", logs:"Activity Logs", support:"Support" },
    supportTitle:"Support Module", supportPostsLabel:"Help Posts", supportReqsLabel:"Help Requests", supportReqFrom:"From", supportReqTo:"To", supportReqStatus:"Status", supportReqMsg:"Message", supportReqDate:"Date", supportPending:"Pending", supportAccepted:"Accepted", supportDeclined:"Declined", supportNoPosts:"No posts yet", supportNoReqs:"No requests yet", supportUnanswered:"Unanswered", supportColPost:"Post", supportColAuthor:"Author", supportColTags:"Topics", supportColDate:"Date", supportColComments:"Comments", supportDeletePost:"Delete Post", supportFilterAll:"All", supportFilterSearch:"Search…", supportFilterStatus:"Filter by status",
    totalMembers:"Total Members", onlineNow:"Online Now", verified:"Verified",
    totalPosts:"Total Posts", conversations:"Conversations", admins:"Admins",
    activeMembers:"Active members", thisWeek:(n)=>`+${n} this week`,
    percentVerified:(p)=>`${p}% verified`,
    topProfessions:"Top Professions", topRegionsLabel:"Top Regions", recentMembers:"Recent Members", noData:"No data yet",
    withHelpAreas:"With Help Areas",
    postsSubLabel:(l,c)=>`${l} likes · ${c} comments`,
    platformHealth:"Platform Health",
    verifiedMembers:"Verified members", helpAreaCoverage:"Help-area coverage", onlineRightNow:"Online right now",
    avgPostsPerMember:"Avg posts / member", totalInteractions:"Total interactions",
    viewAllMembers:"View all members →",
    quickActions:"Quick Actions",
    manageUsers:"Manage Users", reviewReports:"Review Reports", activityLogs:"Activity Logs", dataAndAnalytics:"Data & Analytics",
    mostLikedPost:"Most Liked Post", mediaPost:"(media post)", postBy:(n)=>`by ${n}`,
    searchPh:"Search users...", editUser:"Edit User",
    firstName:"First Name", lastName:"Last Name", phone:"Phone",
    profession:"Profession", bio:"Bio",
    adminPriv:"Admin privileges", cancel:"Cancel", save:"Save Changes", saving:"Saving…",
    deleteLbl:"Delete", editLbl:"Edit", makeAdmin:"Make Admin", revokeAdmin:"Revoke Admin", editPermsBtn:"Edit Permissions",
    refresh:"Refresh", filterByActor:"Filter by name...", filterByType:"Type:",
    dataManage:"Data Management", downloadBtn:"Download Excel", uploadBtn:"Upload Excel", importing:"Importing...",
    dirNote:"Import creates directory records only (no login account).",
    created:"Created", skippedDup:"Skipped (duplicate)", errorsLbl:"Errors", rowLbl:"Row",
    exportTitle:"Export Members to Excel", exportSub:"Choose which fields to include.", selectAll:"Select all", clearAll:"Clear",
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
    showDataTab:"Data", reportsTab:"Reports", supportStatsTitle:"Support Stats", supportStatsPosts:"Help Posts", supportStatsReqs:"Help Requests", supportStatsTopAreas:"Top Requested Areas", supportStatsNoData:"No support data yet — visit the Support tab first.",
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
    allMembers:"All Members", searchByNamePh:"Search by name, email, profession…",
    sortRecent:"Recent", sortAlpha:"A–Z", sortAdminsFirst:"Admins first",
    adminsOnly:"Admins only", onlineOnly:"Online now",
    colMember:"Member", colStatus:"Status", colJoined:"Joined", colActions:"Actions",
    statusPending:"Pending", adminBadge:"Admin", onlineBadge:"Online",
    viewOnly:"View only", noMembersFound:"No members found.",
    allPosts:"All Posts", sortMostLiked:"Most liked", pinnedOnly:"Pinned only", hasMedia:"Has media",
    colAuthor:"Author", colContent:"Content", colMedia:"Media", colComments:"Comments", colPosted:"Posted",
    showLess:"Show less", showFullPost:"Show full post",
    hide:"Hide", showCommentsFn:(n)=>`Show (${n})`,
    loadingComments:"Loading comments…", noComments:"No comments yet.",
    pinLbl:"Pin", unpinLbl:"Unpin", noPosts:"No posts yet.",
    deletePostConfirm:"Delete this post?", deleteCommentConfirm:"Delete this comment?",
    distributionLabel:"Distribution", growthLabel:"Growth", membersNavLabel:"Members",
    regionsLabel:"Regions", professionsLabel:"Professions", religionLabel:"Religion",
    noDataSelection:"No data for this selection", newMembersLabel:"New Members",
    inPeriodLabel:"in period", customLabel:"Custom",
    fromLabel:"From", toLabel:"To", todayLabel:"Today",
    membersCountFn:(n)=>`${n} member${n!==1?"s":""}`,
    newestLabel:"Newest", oldestLabel:"Oldest", noMembersInPeriod:"No members in this period.",
    searchReporterPh:"Search reporter or reported…", allFilter:"All", dismissedLabel:"Dismissed",
    noReportsFiltered:"No reports match the filters.",
    conversationLabel:(a,b)=>`Conversation — ${a} & ${b}`, noMessages:"No messages captured.", convoBtn:"Convo",
    clearFilter:"Clear filter", actorNameLabel:"Actor name",
    fromDateLabel:"From date", toDateLabel:"To date", clearBtn:"Clear",
    allTypes:"All types",
    logTypeLabels:{
      signup:"Signup", login:"Login", post:"Post", post_edit:"Post Edit",
      post_delete:"Post Delete", comment:"Comment", comment_edit:"Comment Edit",
      comment_delete:"Comment Delete", request_sent:"Request Sent",
      request_accepted:"Request Accepted", request_declined:"Request Declined",
      profile_update:"Profile Update", admin_edit_profile:"Admin Edit Profile",
      admin_delete_post:"Admin Delete Post", admin_delete_comment:"Admin Delete Comment",
    },
    exportFieldLabels:{
      firstName:"First Name", lastName:"Last Name", email:"Email", phone:"Phone",
      region:"Region", profession:"Profession", ethnicity:"Ethnicity",
      helpAreas:"Help Areas", bio:"Bio", linkedIn:"LinkedIn", createdAt:"Joined",
    },
    loadingLogs:"Loading logs…", noLogsFiltered:"No logs match the current filters.",
    showingEntriesFn:(n,t)=>`Showing ${n} of ${t} entries`,
    fieldsLabel:"Fields:", toLogLabel:"To:",
    addedByLabel:"Added by", loading:"Loading…",
    accessDenied:"Access Denied", accessDeniedMsg:"This area is restricted to administrators only.",
    slideshowTitle:"Slideshow", slideshowCaptionPh:"Caption (optional)",
    slideshowMoveUp:"↑ Move up", slideshowUploading:"Uploading...",
    slideshowUpload:"Upload images", slideshowMultiple:"Select multiple",
    slideshowEmpty:"No slideshow images yet. Upload one above.",
    chartMembers:"members", chartTotal:"total",
    editUsersSectionTitle:"Edit Users", noUsersMatch:"No users match your search.", colAdmin:"Admin", colName:"Name",
    pendingBadge:(n)=>`(${n} pending)`,
  },
  ar: {
    pageTitle: "لوحة تحكم المشرف", pageSub: "إدارة المنصة والتحليلات",
    tabs: { overview:"نظرة عامة", users:"المستخدمات", editUsers:"تعديل المستخدمات", posts:"المنشورات", logs:"سجل النشاط", support:"الدعم" },
    supportTitle:"وحدة الدعم", supportPostsLabel:"منشورات المساعدة", supportReqsLabel:"طلبات المساعدة", supportReqFrom:"من", supportReqTo:"إلى", supportReqStatus:"الحالة", supportReqMsg:"الرسالة", supportReqDate:"التاريخ", supportPending:"قيد الانتظار", supportAccepted:"مقبول", supportDeclined:"مرفوض", supportNoPosts:"لا توجد منشورات بعد", supportNoReqs:"لا توجد طلبات بعد", supportUnanswered:"بلا رد", supportColPost:"المنشور", supportColAuthor:"المؤلفة", supportColTags:"المواضيع", supportColDate:"التاريخ", supportColComments:"التعليقات", supportDeletePost:"حذف المنشور", supportFilterAll:"الكل", supportFilterSearch:"بحث...", supportFilterStatus:"تصفية حسب الحالة",
    totalMembers:"إجمالي الأعضاء", onlineNow:"متصلات الآن", verified:"موثّقات",
    totalPosts:"إجمالي المنشورات", conversations:"المحادثات", admins:"المشرفات",
    activeMembers:"أعضاء نشطات", thisWeek:(n)=>`+${n} هذا الأسبوع`,
    percentVerified:(p)=>`${p}% موثّقات`,
    topProfessions:"أبرز المهن", topRegionsLabel:"أبرز المناطق", recentMembers:"أعضاء جدد", noData:"لا توجد بيانات بعد",
    withHelpAreas:"مع مجالات مساعدة",
    postsSubLabel:(l,c)=>`${l} إعجاب · ${c} تعليق`,
    platformHealth:"صحة المنصة",
    verifiedMembers:"الأعضاء الموثّقات", helpAreaCoverage:"تغطية مجالات المساعدة", onlineRightNow:"متصلات الآن",
    avgPostsPerMember:"متوسط المنشورات / عضو", totalInteractions:"إجمالي التفاعلات",
    viewAllMembers:"عرض جميع الأعضاء →",
    quickActions:"إجراءات سريعة",
    manageUsers:"إدارة المستخدمات", reviewReports:"مراجعة البلاغات", activityLogs:"سجل النشاط", dataAndAnalytics:"البيانات والتحليلات",
    mostLikedPost:"المنشور الأكثر إعجاباً", mediaPost:"(منشور وسائط)", postBy:(n)=>`بقلم ${n}`,
    searchPh:"ابحثي عن مستخدمة...", editUser:"تعديل المستخدمة",
    firstName:"الاسم الأول", lastName:"اسم العائلة", phone:"الهاتف",
    profession:"المهنة", bio:"نبذة",
    adminPriv:"صلاحيات المشرف", cancel:"إلغاء", save:"حفظ التغييرات", saving:"جارٍ الحفظ...",
    deleteLbl:"حذف", editLbl:"تعديل", makeAdmin:"تعيين مشرفة", revokeAdmin:"إلغاء صلاحيات المشرف", editPermsBtn:"تعديل الصلاحيات",
    refresh:"تحديث", filterByActor:"ابحثي بالاسم...", filterByType:"النوع:",
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
    showDataTab:"البيانات", reportsTab:"البلاغات", supportStatsTitle:"إحصائيات الدعم", supportStatsPosts:"منشورات المساعدة", supportStatsReqs:"طلبات المساعدة", supportStatsTopAreas:"أكثر المجالات طلبًا", supportStatsNoData:"لا توجد بيانات دعم بعد — قومي بزيارة تبويب الدعم أولاً.",
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
    dataManage:"إدارة البيانات", downloadBtn:"تنزيل Excel", uploadBtn:"رفع Excel", importing:"جارٍ الاستيراد...",
    dirNote:"الاستيراد يُنشئ سجلات الدليل فقط (بدون حساب تسجيل دخول).",
    created:"تم الإنشاء", skippedDup:"تم التخطي (مكرر)", errorsLbl:"أخطاء", rowLbl:"صف",
    exportTitle:"تصدير الأعضاء إلى Excel", exportSub:"اختاري الحقول التي تريدين تضمينها.", selectAll:"تحديد الكل", clearAll:"مسح",
    importBadType:"ملف غير صالح — يُقبل .xlsx أو .xls فقط.", importEmpty:"الورقة فارغة.", importMissing:"حقول مفقودة", importBadEmail:"بريد إلكتروني غير صالح",
    allMembers:"جميع الأعضاء", searchByNamePh:"ابحثي بالاسم أو البريد الإلكتروني أو المهنة...",
    sortRecent:"الأحدث", sortAlpha:"أ–ي", sortAdminsFirst:"المشرفات أولاً",
    adminsOnly:"المشرفات فقط", onlineOnly:"متصلات الآن",
    colMember:"عضوة", colStatus:"الحالة", colJoined:"تاريخ الانضمام", colActions:"الإجراءات",
    statusPending:"قيد الانتظار", adminBadge:"مشرفة", onlineBadge:"متصلة",
    viewOnly:"عرض فقط", noMembersFound:"لم يتم العثور على أعضاء.",
    allPosts:"جميع المنشورات", sortMostLiked:"الأكثر إعجاباً", pinnedOnly:"المثبتة فقط", hasMedia:"بوسائط",
    colAuthor:"الكاتبة", colContent:"المحتوى", colMedia:"الوسائط", colComments:"التعليقات", colPosted:"نُشر",
    showLess:"عرض أقل", showFullPost:"عرض المنشور كاملاً",
    hide:"إخفاء", showCommentsFn:(n)=>`عرض (${n})`,
    loadingComments:"جارٍ تحميل التعليقات...", noComments:"لا توجد تعليقات بعد.",
    pinLbl:"تثبيت", unpinLbl:"إلغاء التثبيت", noPosts:"لا توجد منشورات بعد.",
    deletePostConfirm:"هل تريدين حذف هذا المنشور؟", deleteCommentConfirm:"هل تريدين حذف هذا التعليق؟",
    distributionLabel:"التوزيع", growthLabel:"النمو", membersNavLabel:"الأعضاء",
    regionsLabel:"المناطق", professionsLabel:"المهن", religionLabel:"الدين",
    noDataSelection:"لا توجد بيانات لهذا الاختيار", newMembersLabel:"أعضاء جدد",
    inPeriodLabel:"في الفترة", customLabel:"مخصص",
    fromLabel:"من", toLabel:"إلى", todayLabel:"اليوم",
    membersCountFn:(n)=>`${n} ${n===1?"عضوة":"أعضاء"}`,
    newestLabel:"الأحدث", oldestLabel:"الأقدم", noMembersInPeriod:"لا يوجد أعضاء في هذه الفترة.",
    searchReporterPh:"ابحثي عن المبلِّغة أو المُبلَّغ عنها...", allFilter:"الكل", dismissedLabel:"مرفوض",
    noReportsFiltered:"لا توجد بلاغات تطابق التصفية.",
    conversationLabel:(a,b)=>`محادثة — ${a} و${b}`, noMessages:"لم يتم التقاط رسائل.", convoBtn:"محادثة",
    clearFilter:"مسح التصفية", actorNameLabel:"اسم المستخدمة",
    fromDateLabel:"من تاريخ", toDateLabel:"إلى تاريخ", clearBtn:"مسح",
    allTypes:"جميع الأنواع",
    logTypeLabels:{
      signup:"تسجيل", login:"دخول", post:"منشور", post_edit:"تعديل منشور",
      post_delete:"حذف منشور", comment:"تعليق", comment_edit:"تعديل تعليق",
      comment_delete:"حذف تعليق", request_sent:"طلب مُرسَل",
      request_accepted:"طلب مقبول", request_declined:"طلب مرفوض",
      profile_update:"تحديث الملف", admin_edit_profile:"تعديل (مشرفة)",
      admin_delete_post:"حذف منشور (مشرفة)", admin_delete_comment:"حذف تعليق (مشرفة)",
    },
    exportFieldLabels:{
      firstName:"الاسم الأول", lastName:"اسم العائلة", email:"البريد الإلكتروني", phone:"الهاتف",
      region:"المنطقة", profession:"المهنة", ethnicity:"المجتمع/الانتماء",
      helpAreas:"مجالات المساعدة", bio:"نبذة", linkedIn:"لينكدإن", createdAt:"تاريخ الانضمام",
    },
    loadingLogs:"جارٍ تحميل السجل...", noLogsFiltered:"لا توجد سجلات تطابق التصفية.",
    showingEntriesFn:(n,t)=>`عرض ${n} من ${t} سجل`,
    fieldsLabel:"الحقول:", toLogLabel:"إلى:",
    addedByLabel:"أضيف بواسطة", loading:"جارٍ التحميل...",
    accessDenied:"تم رفض الوصول", accessDeniedMsg:"هذه المنطقة مخصصة للمشرفات فقط.",
    slideshowTitle:"عرض الشرائح", slideshowCaptionPh:"التسمية (اختياري)",
    slideshowMoveUp:"↑ نقل للأعلى", slideshowUploading:"جارٍ الرفع...",
    slideshowUpload:"رفع صور", slideshowMultiple:"اختر متعددة",
    slideshowEmpty:"لا توجد صور للعرض بعد. ارفعي صورة أعلاه.",
    chartMembers:"أعضاء", chartTotal:"إجمالي",
    editUsersSectionTitle:"تعديل المستخدمات", noUsersMatch:"لا توجد مستخدمات تطابق البحث.", colAdmin:"مشرفة", colName:"الاسم",
    pendingBadge:(n)=>`(${n} قيد الانتظار)`,
  },
};

/* ─── Styles (our S object — used by EditUsers, Logs, EditUserModal) ─── */
const S = {
  page: { padding: "2rem 2.5rem", boxSizing: "border-box", width: "100%", maxWidth: "100%", fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)", flex: 1, overflowY: "auto", overflowX: "hidden" },
  denied: { textAlign: "center", padding: "4rem", color: "#c25c5c", fontSize: "1.1rem", fontWeight: 700 },

  header: { marginBottom: "1.75rem" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text-primary,#111827)", margin: "0 0 3px" },
  sub: { fontSize: "13px", color: "var(--text-muted,#6b7280)", margin: 0 },

  tabs: { display: "flex", gap: "4px", marginBottom: "1.5rem", flexWrap: "wrap", background: "var(--bg-tertiary,#f0f6fb)", borderRadius: "var(--r-md,10px)", padding: "4px", width: "100%", maxWidth: "100%", boxSizing: "border-box" },
  tab: (active) => ({
    padding: "7px 14px", borderRadius: "var(--r-sm,8px)", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: active ? 700 : 500, fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    background: active ? "var(--bg-primary,#fff)" : "transparent",
    color: active ? "var(--text-primary,#111827)" : "var(--text-muted,#6b7280)",
    boxShadow: active ? "var(--shadow-xs,0 1px 4px rgba(29, 72, 150,0.07))" : "none",
    transition: "all 0.15s", whiteSpace: "nowrap", flex: "1 1 auto", textAlign: "center",
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
    padding: "7px 12px", fontSize: "13px",
    border: "1.5px solid var(--border,#daeaf8)", borderRadius: "9px",
    color: "var(--text-primary,#111827)", background: "var(--bg-secondary,#fdf9f7)",
    fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
    width: "100%", boxSizing: "border-box",
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
    <div className="card slide-up admin-stat-card" style={{
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
      <div className="admin-stat-icon" style={{
        width: 44, height: 44, borderRadius: "var(--r-md,10px)",
        background: `${color}18`, display: "flex",
        alignItems: "center", justifyContent: "center",
        color, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p className="stat-val" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary,#111827)", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted,#6b7280)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: color, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>}
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
function ConfirmModal({ title, message, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel, danger = true }) {
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <p style={{ ...S.modalTitle, color: danger ? "#c25c5c" : "var(--text-primary,#111827)" }}>{title}</p>
        <p style={{ fontSize: 14, color: "var(--text-secondary,#7a5868)", lineHeight: 1.6, margin: 0 }}>{message}</p>
        <div style={S.modalActions}>
          <button style={S.cancelModalBtn} onClick={onCancel}>{cancelLabel}</button>
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
    region:     u.region     ?? "",
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
            <label style={labelStyle}>{Tr?.region}</label>
            <input name="region" style={S.modalInput} value={fields.region} onChange={handleChange} />
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
      return { id: c.id, name: names || "Conversation" };
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
          {items.length === 0 && <p style={{ fontSize:13, color:"var(--text-muted,#6b7280)", textAlign:"center", marginTop:"2rem" }}>{Tr.noData}</p>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SLIDESHOW ADMIN COMPONENT
═══════════════════════════════════════════════════════ */
function SlideshowAdmin({ Tr }) {
  const [images, setImages]         = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [localCaptions, setLocalCaptions] = useState({});
  const dragIndexRef = useRef(null);
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

  const handleDragStart = (i) => { dragIndexRef.current = i; };
  const handleDragOver  = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDragEnd   = () => { dragIndexRef.current = null; setDragOverIdx(null); };
  const handleDrop      = async (e, i) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === i) { handleDragEnd(); return; }
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    handleDragEnd();
    await persist(next);
  };

  return (
    <div style={{ width: "100%" }}>
      {images.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <SlideshowBanner />
        </div>
      )}

      {images.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          {Tr?.slideshowDragHint || "Drag photos to reorder"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "row", overflowX: "auto", gap: "1rem", marginBottom: "1rem", paddingBottom: "0.5rem" }}>
        {images.map((img, i) => (
          <div
            key={img.url}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            style={{
              position: "relative", flexShrink: 0, width: 160, borderRadius: 12, overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)", background: "var(--bg-secondary)",
              cursor: "grab",
              opacity: dragOverIdx === i && dragIndexRef.current !== i ? 0.45 : 1,
              outline: dragOverIdx === i && dragIndexRef.current !== i ? "2px dashed var(--primary, #6c63ff)" : "none",
              transition: "opacity 0.15s, outline 0.15s",
            }}
          >
            {/* order badge */}
            <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 20, minWidth: 22, height: 22, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", lineHeight: 1, pointerEvents: "none" }}>{i + 1}</div>
            <img src={img.url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", display: "block", pointerEvents: "none" }} />
            <div style={{ padding: "0.5rem" }}>
              <input
                value={localCaptions[i] ?? img.caption ?? ""}
                onChange={e => setLocalCaptions(prev => ({ ...prev, [i]: e.target.value }))}
                onBlur={() => { const cap = localCaptions[i] ?? img.caption ?? ""; if (cap !== img.caption) updateCaption(i, cap); }}
                placeholder={Tr?.slideshowCaptionPh || "Caption (optional)"}
                style={{ width: "100%", fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", boxSizing: "border-box", cursor: "text" }}
                onMouseDown={e => e.stopPropagation()}
              />
            </div>
            <button onClick={() => remove(i)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ))}

        <label style={{ flexShrink: 0, width: 160, height: 150, borderRadius: 12, border: "2px dashed var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer", color: "var(--text-muted)", fontSize: 13, gap: 6, background: "var(--bg-secondary)" }}>
          <span style={{ fontSize: 28 }}>+</span>
          <span>{uploading ? (Tr?.slideshowUploading || "Uploading...") : (Tr?.slideshowUpload || "Upload images")}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: -4 }}>{Tr?.slideshowMultiple || "Select multiple"}</span>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {images.length === 0 && !uploading && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>{Tr?.slideshowEmpty || "No slideshow images yet. Upload one above."}</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DISTRIBUTION DONUT CHART
═══════════════════════════════════════════════════════ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 640);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", fn, { passive: true });
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

function DistributionDonutChart({ users, lang, Tr }) {
  const [distType,  setDistType]  = useState("regions");
  const [timeframe, setTimeframe] = useState("all");
  const [hovIdx,    setHovIdx]    = useState(null);
  const isMobile = useIsMobile();

  const filteredUsers = (() => {
    if (timeframe === "all") return users;
    const days = { "30d":30, "90d":90, "6m":180, "1y":365 }[timeframe] ?? 30;
    const cutoff = Date.now() - days * 86400000;
    return users.filter(u => u.createdAt && new Date(u.createdAt) >= cutoff);
  })();

  const entries = (() => {
    const map = {};
    filteredUsers.forEach(u => {
      let key = null;
      if (distType === "regions") {
        const raw = u.region?.trim();
        key = raw ? translateAny(raw, lang) : null;
      } else if (distType === "professions") {
        const raw = u.profession?.trim();
        key = raw ? (u.professionTranslations?.[lang] || translateProfession(raw, lang) || raw) : null;
      } else if (distType === "ethnicity") {
        const raw = u.ethnicity?.trim();
        key = raw ? (translateEthnicity(raw, lang) || raw) : null;
      } else if (distType === "religion") {
        const raw = (u.religion || u.identity)?.trim();
        key = raw ? (translateReligion(raw, lang) || raw) : null;
      }
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  const total  = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const colors = ["#4472b8","#7ba87a","#c25c5c","#d4a574","#8b5cf6","#14b8a6","#e8735a","#94a3b8"];
  const CX = 90, CY = 90, R = 72, IR = 46;

  const polar = (angle, radius) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
  };

  let cum = 0;
  const slices = entries.map(([label, count], i) => {
    const sweep = (count / total) * 360;
    const s = cum, e = cum + sweep;
    cum = e;
    const so = polar(s, R), eo = polar(e, R);
    const si = polar(s, IR), ei = polar(e, IR);
    const large = sweep > 180 ? 1 : 0;
    const path = `M${so.x.toFixed(2)},${so.y.toFixed(2)} A${R},${R},0,${large},1,${eo.x.toFixed(2)},${eo.y.toFixed(2)} L${ei.x.toFixed(2)},${ei.y.toFixed(2)} A${IR},${IR},0,${large},0,${si.x.toFixed(2)},${si.y.toFixed(2)} Z`;
    return { label, count, path, color: colors[i % colors.length], pct: Math.round((count / total) * 100) };
  });

  const hov = hovIdx !== null ? slices[hovIdx] : null;

  const segBtn = (val, label, active, setter) => (
    <button key={val} onClick={() => setter(val)} style={{
      fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer", transition:"all 0.15s",
      background: active ? "var(--bg-primary,#fff)" : "transparent",
      color:      active ? "var(--text-primary,#111827)" : "var(--text-muted,#6b7280)",
      boxShadow:  active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
    }}>{label}</button>
  );

  const selStyle = {
    flex:1, padding:"8px 10px", fontSize:13, border:"1.5px solid var(--border,#daeaf8)",
    borderRadius:9, background:"var(--bg-secondary,#f0f6fb)", color:"var(--text-primary,#111827)",
    fontFamily:"var(--font,'Figtree','Heebo',system-ui,sans-serif)", cursor:"pointer",
    appearance:"auto", minWidth:0,
  };

  const donutSvg = (size) => (
    <svg width={size} height={size} viewBox="0 0 180 180" style={{ display:"block" }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color}
          opacity={hovIdx === null || hovIdx === i ? 1 : 0.3}
          onMouseEnter={() => setHovIdx(i)}
          onMouseLeave={() => setHovIdx(null)}
          style={{ cursor:"pointer", transition:"opacity 0.15s" }}
        />
      ))}
      <text x={CX} y={CY - 7} textAnchor="middle" style={{ fontSize:20, fontWeight:800, fill:"var(--text-primary,#111827)", fontFamily:"inherit" }}>
        {hov ? `${hov.pct}%` : filteredUsers.length}
      </text>
      <text x={CX} y={CY + 11} textAnchor="middle" style={{ fontSize:10, fill:"var(--text-muted,#6b7280)", fontFamily:"inherit" }}>
        {hov ? hov.label.slice(0, 14) : (Tr?.chartMembers || "members")}
      </text>
      {hov && (
        <text x={CX} y={CY + 24} textAnchor="middle" style={{ fontSize:9, fill:"var(--text-muted,#6b7280)", fontFamily:"inherit" }}>
          {hov.count} {Tr?.chartTotal || "total"}
        </text>
      )}
    </svg>
  );

  const legend = (
    <div style={{ flex:1, minWidth:0 }}>
      {slices.map((s, i) => (
        <div key={i}
          onMouseEnter={() => setHovIdx(i)}
          onMouseLeave={() => setHovIdx(null)}
          style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"5px 8px", borderRadius:8, marginBottom:2, cursor:"pointer",
            background: hovIdx === i ? `${s.color}18` : "transparent",
            transition:"background 0.12s",
          }}>
          <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }} />
          <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary,#7a5868)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</span>
          <span style={{ fontSize:11, fontWeight:700, color:s.color, flexShrink:0 }}>{s.pct}%</span>
          <span style={{ fontSize:10, color:"var(--text-muted,#6b7280)", flexShrink:0 }}>({s.count})</span>
        </div>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="card" style={{ padding:"1.25rem" }}>
        <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 0.75rem" }}>{Tr?.distributionLabel || "Distribution"}</p>
        <div style={{ display:"flex", gap:8, marginBottom:"1.25rem" }}>
          <select value={distType} onChange={e => setDistType(e.target.value)} style={selStyle}>
            <option value="regions">{Tr?.regionsLabel || "Regions"}</option>
            <option value="professions">{Tr?.professionsLabel || "Professions"}</option>
            <option value="ethnicity">{Tr?.ethnicity || "Ethnicity"}</option>
            <option value="religion">{Tr?.religionLabel || "Religion"}</option>
          </select>
          <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={{ ...selStyle, flex:"0 0 80px" }}>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="6m">6m</option>
            <option value="1y">1y</option>
            <option value="all">{Tr?.allFilter || "All"}</option>
          </select>
        </div>
        {entries.length === 0
          ? <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", textAlign:"center", padding:"2rem 0" }}>{Tr?.noData || "No data"}</p>
          : (<>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:"1rem" }}>{donutSvg(160)}</div>
              {legend}
            </>)
        }
      </div>
    );
  }

  return (
    <div className="card" style={{ padding:"1.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:"1.25rem" }}>
        <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>{Tr?.distributionLabel || "Distribution"}</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <div style={{ display:"flex", background:"var(--bg-secondary,#f0f6fb)", borderRadius:8, padding:2, gap:1 }}>
            {[["regions", Tr?.regionsLabel||"Regions"],["professions", Tr?.professionsLabel||"Professions"],["ethnicity", Tr?.ethnicity||"Ethnicity"],["religion", Tr?.religionLabel||"Religion"]].map(([v,l]) => segBtn(v,l,distType===v,setDistType))}
          </div>
          <div style={{ display:"flex", background:"var(--bg-secondary,#f0f6fb)", borderRadius:8, padding:2, gap:1 }}>
            {[["30d","30d"],["90d","90d"],["6m","6m"],["1y","1y"],["all",Tr?.allFilter||"All"]].map(([v,l]) => segBtn(v,l,timeframe===v,setTimeframe))}
          </div>
        </div>
      </div>
      {entries.length === 0
        ? <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", textAlign:"center", padding:"3rem 0" }}>{Tr?.noDataSelection || "No data for this selection"}</p>
        : (
          <div style={{ display:"flex", gap:"2rem", alignItems:"center", flexWrap:"wrap" }}>
            {donutSvg(180)}
            {legend}
          </div>
        )
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MEMBER GROWTH CHART
═══════════════════════════════════════════════════════ */
function MemberGrowthChart({ users, Tr }) {
  const todayStr    = new Date().toISOString().slice(0, 10);
  const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();

  const [preset,   setPreset]   = useState("30d");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo,   setDateTo]   = useState(todayStr);
  const [hoverIdx, setHoverIdx] = useState(null);
  const isMobile = useIsMobile();

  const applyPreset = (p) => {
    setPreset(p);
    if (p === "custom") return;
    const to   = new Date();
    const from = new Date(to);
    if      (p === "7d")  from.setDate(to.getDate() - 6);
    else if (p === "30d") from.setDate(to.getDate() - 29);
    else if (p === "90d") from.setDate(to.getDate() - 89);
    else if (p === "all") {
      const earliest = users.reduce((min, u) => {
        const d = u.createdAt ? new Date(u.createdAt) : null;
        return d && (!min || d < min) ? d : min;
      }, null);
      if (earliest) from.setTime(earliest.getTime());
      else from.setDate(to.getDate() - 29);
    }
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  const fromDate = new Date(dateFrom + "T00:00:00");
  const toDate   = new Date(dateTo   + "T23:59:59");
  const dayCount = Math.max(1, Math.round((toDate - fromDate) / 86400000) + 1);
  const days     = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(fromDate);
    d.setDate(fromDate.getDate() + i);
    return d;
  });
  const counts  = days.map(day => users.filter(u => u.createdAt?.slice(0, 10) === day.toISOString().slice(0, 10)).length);
  const total   = counts.reduce((a, b) => a + b, 0);
  const maxC    = Math.max(...counts, 1);
  const W = 500, H = 150, px = 6, py = 18;

  const pts = counts.map((c, i) => ({
    x: parseFloat((px + (i / Math.max(counts.length - 1, 1)) * (W - px * 2)).toFixed(1)),
    y: parseFloat((H - py - (c / maxC) * (H - py * 2)).toFixed(1)),
    count: c, date: days[i],
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area     = pts.length > 1
    ? `M${pts[0].x},${H - py} ${pts.map(p => `L${p.x},${p.y}`).join(" ")} L${pts[pts.length - 1].x},${H - py} Z`
    : "";
  const hov = hoverIdx !== null ? pts[hoverIdx] : null;

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      {/* Header row */}
      <div className="admin-growth-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem", gap:12, flexWrap:"wrap" }}>
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 6px" }}>
            {Tr?.newMembersLabel || "New Members"}
          </p>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:32, fontWeight:800, color:"var(--text-primary,#111827)", lineHeight:1 }}>{total}</span>
            <span style={{ fontSize:12, color:"var(--text-muted,#6b7280)", fontWeight:500 }}>{Tr?.inPeriodLabel || "in period"}</span>
          </div>
        </div>

        {/* Preset selector — dropdown on mobile, pills on desktop */}
        {isMobile ? (
          <select value={preset} onChange={e => applyPreset(e.target.value)} style={{
            padding:"8px 10px", fontSize:13, border:"1.5px solid var(--border,#daeaf8)",
            borderRadius:9, background:"var(--bg-secondary,#f0f6fb)", color:"var(--text-primary,#111827)",
            fontFamily:"var(--font,'Figtree','Heebo',system-ui,sans-serif)", cursor:"pointer",
            alignSelf:"flex-start",
          }}>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="all">{Tr?.allFilter || "All"}</option>
            <option value="custom">{Tr?.customLabel || "Custom"}</option>
          </select>
        ) : (
          <div style={{ display:"flex", background:"var(--bg-secondary,#f0f6fb)", borderRadius:10, padding:3, gap:1, alignSelf:"flex-start" }}>
            {[
              { val:"7d",     label:"7d"     },
              { val:"30d",    label:"30d"    },
              { val:"90d",    label:"90d"    },
              { val:"all",    label:Tr?.allFilter || "All"    },
              { val:"custom", label:Tr?.customLabel || "Custom" },
            ].map(opt => (
              <button key={opt.val} onClick={() => applyPreset(opt.val)} style={{
                fontSize:11, fontWeight:600, padding:"5px 11px", borderRadius:7, border:"none", cursor:"pointer", transition:"all 0.15s",
                background: preset === opt.val ? "var(--bg-primary,#fff)" : "transparent",
                color:      preset === opt.val ? "var(--text-primary,#111827)" : "var(--text-muted,#6b7280)",
                boxShadow:  preset === opt.val ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
              }}>{opt.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Custom date pickers */}
      {preset === "custom" && (
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:"1rem", flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:600, color:"var(--text-muted,#6b7280)" }}>{Tr?.fromLabel || "From"}</span>
          <input type="date" value={dateFrom} max={dateTo} onChange={e => setDateFrom(e.target.value)}
            style={{ fontSize:12, padding:"6px 10px", borderRadius:8, border:"1.5px solid var(--border,#daeaf8)", background:"var(--bg-primary,#fff)", color:"var(--text-primary,#111827)", fontFamily:"inherit" }} />
          <span style={{ fontSize:11, fontWeight:600, color:"var(--text-muted,#6b7280)" }}>{Tr?.toLabel || "To"}</span>
          <input type="date" value={dateTo} min={dateFrom} max={todayStr} onChange={e => setDateTo(e.target.value)}
            style={{ fontSize:12, padding:"6px 10px", borderRadius:8, border:"1.5px solid var(--border,#daeaf8)", background:"var(--bg-primary,#fff)", color:"var(--text-primary,#111827)", fontFamily:"inherit" }} />
        </div>
      )}

      {/* Chart */}
      <div style={{ position:"relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block", cursor:"crosshair", overflow:"visible" }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * W;
            let best = 0, bestDist = Infinity;
            pts.forEach((p, i) => { const d = Math.abs(p.x - svgX); if (d < bestDist) { bestDist = d; best = i; } });
            setHoverIdx(best);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="mgc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#4472b8" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#4472b8" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const gy = H - py - pct * (H - py * 2);
            return <line key={pct} x1={px} x2={W - px} y1={gy} y2={gy} stroke="#e5e7eb" strokeWidth={pct === 0 ? 1.5 : 1} />;
          })}

          {/* Gradient area */}
          {area && <path d={area} fill="url(#mgc-grad)" />}

          {/* Line */}
          <polyline points={polyline} fill="none" stroke="#4472b8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Hover crosshair */}
          {hov && <line x1={hov.x} x2={hov.x} y1={py} y2={H - py} stroke="#4472b8" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.4} />}

          {/* Dots */}
          {pts.map((p, i) => (p.count > 0 || i === hoverIdx) && (
            <circle key={i} cx={p.x} cy={p.y} r={i === hoverIdx ? 5.5 : 3.5} fill="#4472b8" stroke="#fff" strokeWidth={2} />
          ))}
        </svg>

        {/* Tooltip */}
        {hov && (
          <div style={{
            position:"absolute",
            left:`${(hov.x / W) * 100}%`,
            top:-10,
            transform:"translate(-50%, -100%)",
            background:"#1a2e42", color:"#fff",
            fontSize:12, fontWeight:600, padding:"8px 13px", borderRadius:10,
            whiteSpace:"nowrap", pointerEvents:"none",
            boxShadow:"0 6px 20px rgba(0,0,0,0.22)", zIndex:10, lineHeight:1.6,
          }}>
            <span style={{ fontSize:16, fontWeight:800 }}>{hov.count}</span>
            {" "}{Tr?.membersCountFn ? Tr.membersCountFn(hov.count).replace(/^\d+\s*/, "") : (hov.count === 1 ? "member" : "members")}
            <br />
            <span style={{ fontWeight:400, fontSize:11, opacity:0.7 }}>
              {hov.date.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" })}
            </span>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
        <span style={{ fontSize:10, color:"var(--text-muted,#6b7280)" }}>{days[0]?.toLocaleDateString(undefined, { month:"short", day:"numeric" })}</span>
        {days.length > 6 && <span style={{ fontSize:10, color:"var(--text-muted,#6b7280)" }}>{days[Math.floor(days.length / 2)]?.toLocaleDateString(undefined, { month:"short", day:"numeric" })}</span>}
        <span style={{ fontSize:10, color:"var(--text-muted,#6b7280)" }}>{Tr?.todayLabel || "Today"}</span>
      </div>
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
  const [mobileDataSection, setMobileDataSection] = useState("distribution");
  const isMobile = useIsMobile();
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [statDetailType, setStatDetailType] = useState(null); // "members"|"online"|"verified"|"admins"|"posts"|"convs"

  /* ── Edit Users tab state ── */
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [userSortBy, setUserSortBy] = useState("recent");   // recent | alpha | region | perms
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
  const [logTypeFilter, setLogTypeFilter] = useState("");
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

  /* ── Support (help posts + requests) ── */
  const [helpPosts,        setHelpPosts]        = useState([]);
  const [helpRequests,     setHelpRequests]     = useState([]);
  const [supportLoading,   setSupportLoading]   = useState(false);
  const [supportPostSearch,    setSupportPostSearch]    = useState("");
  const [supportReqSearch,     setSupportReqSearch]     = useState("");
  const [supportReqStatus,     setSupportReqStatus]     = useState("all");

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
  const fileRef = useRef(null);

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

  const fetchSupport = useCallback(async () => {
    setSupportLoading(true);
    try {
      const [postsSnap, reqsSnap] = await Promise.all([
        getDocs(query(collection(db, "helpPosts"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "helpRequests"), orderBy("createdAt", "desc"))),
      ]);
      setHelpPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHelpRequests(reqsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setSupportLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "logs"       && logs.length === 0)      fetchLogs();
    if (tab === "reports"    && reports.length === 0)   fetchReports();
    if (tab === "blacklist"  && blacklist.length === 0)  fetchBlacklist();
    if ((tab === "support" || tab === "overview" || tab === "data") && helpPosts.length === 0) fetchSupport();
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
          <h3>{Tr.accessDenied}</h3>
          <p>{Tr.accessDeniedMsg}</p>
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
  users.forEach(u => {
    if (u.profession) {
      const key = u.professionTranslations?.[lang] || translateProfession(u.profession, lang) || u.profession;
      professionMap[key] = (professionMap[key] || 0) + 1;
    }
  });
  const topProfessions = Object.entries(professionMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* ── Private fields distributions (admin only) ── */
  const ethnicityMap = {}, religionMap = {}, regionMap = {};
  users.forEach(u => {
    if (u.ethnicity) {
      const key = translateEthnicity(u.ethnicity, lang) || u.ethnicity;
      ethnicityMap[key] = (ethnicityMap[key] || 0) + 1;
    }
    const rel = u.religion || u.identity;
    if (rel) {
      const key = translateReligion(rel, lang) || rel;
      religionMap[key] = (religionMap[key] || 0) + 1;
    }
    if (u.region) {
      const key = translateAny(u.region, lang);
      regionMap[key] = (regionMap[key] || 0) + 1;
    }
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
    if (!window.confirm(Tr.deletePostConfirm)) return;
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
    if (!window.confirm(Tr.deleteCommentConfirm)) return;
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", comment.id));
      const post = posts.find(p => p.id === postId);
      const newCount = Math.max(0, (post?.commentCount ?? 1) - 1);
      await updateDoc(doc(db, "posts", postId), { commentCount: newCount });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: newCount } : p));
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

  /* ── Support filters ── */
  const filteredHelpPosts = helpPosts.filter(p => {
    if (!supportPostSearch.trim()) return true;
    const q = supportPostSearch.toLowerCase();
    return (p.authorDisplayName||"").toLowerCase().includes(q)
      || (p.content||"").toLowerCase().includes(q)
      || (p.tags||[]).some(t => t.toLowerCase().includes(q));
  });
  const filteredHelpRequests = helpRequests.filter(r => {
    const matchStatus = supportReqStatus === "all"
      ? true
      : supportReqStatus === "pending"
      ? (!r.status || r.status === "pending")
      : r.status === supportReqStatus;
    const q = supportReqSearch.toLowerCase();
    const matchSearch = !q
      || (r.fromUserName||"").toLowerCase().includes(q)
      || (r.toUserName||"").toLowerCase().includes(q)
      || (r.message||"").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  /* ── Log filters ── */
  const filteredLogs = logs.filter(log => {
    if (logTypeFilter && logTypeFilter !== log.type) return false;
    if (logActorFilter && !(log.actorName ?? "").toLowerCase().includes(logActorFilter.toLowerCase())) return false;
    if (logDateFrom && log.timestamp < logDateFrom) return false;
    if (logDateTo   && log.timestamp > logDateTo + "T23:59:59") return false;
    return true;
  });
  const allLogTypes = [...new Set(logs.map(l => l.type))].filter(Boolean).sort();

  /* ── Filtered users (shared between Users + EditUsers tabs) ── */
  const filteredBySearch = users
    .filter(u => {
      const s = (searchUser || userSearch).toLowerCase();
      const matchSearch = !s || (() => {
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        return name.includes(s) || (u.email ?? "").toLowerCase().includes(s) || (u.profession ?? "").toLowerCase().includes(s) || (u.region ?? "").toLowerCase().includes(s);
      })();
      const matchAdmin  = !userFilterAdmin  || !!u.isAdmin;
      const matchOnline = !userFilterOnline || isActuallyOnline(u);
      return matchSearch && matchAdmin && matchOnline;
    })
    .sort((a, b) => {
      if (userSortBy === "alpha")  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "he");
      if (userSortBy === "region") return (a.region ?? "").localeCompare(b.region ?? "", "he");
      if (userSortBy === "perms")  return (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0);
      // default: recent (createdAt desc)
      return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
    });

  /* ── Excel export ── */
  const exportExcel = async () => {
    const fields = EXPORT_FIELDS.filter(f => selFields.includes(f.key));
    if (!fields.length) return;
    const getColLabel = (key, fallback) => Tr.exportFieldLabels?.[key] ?? fallback;
    const rows = users.map(u => {
      const row = {};
      fields.forEach(({ key, label }) => {
        const v = u[key];
        row[getColLabel(key, label)] = Array.isArray(v) ? v.join("; ") : (v ?? "");
      });
      return row;
    });
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Members");
    ws.columns = fields.map(f => { const h = getColLabel(f.key, f.label); return { header: h, key: h, width: 22 }; });
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
      // Accept English defaults
      EXPORT_FIELDS.forEach(({ key, label }) => { labelToKey[label.toLowerCase()] = key; });
      // Also accept translated labels from every language so any exported file can be re-imported
      Object.values(AT).forEach(langTr => {
        if (langTr.exportFieldLabels) {
          EXPORT_FIELDS.forEach(({ key }) => {
            const tl = langTr.exportFieldLabels[key];
            if (tl) labelToKey[tl.toLowerCase()] = key;
          });
        }
      });
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
    { id: "support",   label: Tr.tabs.support, show: canManageContent },
    { id: "data",      label: Tr.showDataTab, show: canViewStats },
    { id: "reports",   label: `${Tr.reportsTab}${reports.length > 0 ? ` (${reports.filter(r=>r.status==="pending").length})` : ""}`, show: canManageContent },
    { id: "logs",      label: Tr.tabs.logs, show: canViewLogs },
    { id: "slideshow",  label: Tr.slideshowTitle, show: canManageContent },
    { id: "blacklist",  label: `${Tr.blacklistTab || "Blacklist"}${blacklist.length > 0 ? ` (${blacklist.length})` : ""}`, show: canManageUsers },
  ].filter(t => t.show);

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div style={S.page} className="admin-root">
      <style>{`
        @media (max-width: 640px) {
          .admin-root { padding: 1rem 0.75rem !important; }

          /* Tab bar wraps to two rows on mobile */
          .admin-tabs {
            width: 100% !important; max-width: 100% !important;
            flex-wrap: wrap !important; box-sizing: border-box !important;
          }
          .admin-tabs button { white-space: nowrap !important; }
          .admin-root { overflow-x: hidden !important; }

          /* Stat cards: compact 2-column grid */
          .admin-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.55rem !important; margin-bottom: 0.85rem !important;
          }
          .admin-stat-card { padding: 0.7rem 0.8rem !important; gap: 0.55rem !important; }
          .admin-stat-card .stat-val { font-size: 20px !important; line-height: 1 !important; }
          .admin-stat-icon { width: 32px !important; height: 32px !important; }

          /* Overview mid: single column, quick actions first */
          .admin-overview-mid { grid-template-columns: 1fr !important; }
          .admin-overview-quick { order: -1 !important; }

          /* Quick action buttons: 2-per-row */
          .admin-quick-btns {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }

          /* Search inputs full width on mobile */
          .admin-search-input { width: 100% !important; min-width: unset !important; flex-shrink: 1 !important; }

          /* Table card: reliable horizontal scroll on mobile */
          .admin-table-card {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            max-width: 100%;
          }

          /* Filter bar: stack vertically on mobile for easier interaction */
          .admin-filter-bar { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
          .admin-filter-pills { flex-wrap: wrap !important; }

          /* Make action buttons in tables wrap */
          .admin-table-actions { flex-wrap: wrap !important; gap: 4px !important; }
        }
      `}</style>

      {/* Tabs */}
      <div style={S.tabs} className="admin-tabs">
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
          {/* Stat cards */}
          <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label={Tr.totalMembers}  value={users.length}   color="#4472b8" sub={Tr.thisWeek(newThisWeek)}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              onClick={() => setStatDetailType("members")} />
            <StatCard label={Tr.onlineNow}     value={onlineNow}      color="#7ba87a" sub={Tr.activeMembers}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6"/></svg>}
              onClick={() => setStatDetailType("online")} />
            <StatCard label={Tr.withHelpAreas} value={users.filter(u => u.helpAreas?.length > 0).length} color="#1d4896" sub={`${Math.round(users.filter(u => u.helpAreas?.length > 0).length / Math.max(users.length,1)*100)}%`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              onClick={() => setStatDetailType("helpAreas")} />
            <StatCard label={Tr.totalPosts}    value={posts.length}   color="#8b5cf6" sub={Tr.postsSubLabel(totalLikes, totalComments)}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
              onClick={() => setStatDetailType("posts")} />
            <StatCard label={Tr.conversations}  value={convs.length}   color="#d4a574"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
              onClick={() => setStatDetailType("convs")} />
            <StatCard label={Tr.admins}         value={adminsN}        color="#c25c5c"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              onClick={() => setStatDetailType("admins")} />
          </div>

          {/* Platform health + quick actions + recent members */}
          <div className="admin-overview-mid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", alignItems: "start" }}>

            {/* Platform health + latest help post */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 1.1rem" }}>{Tr.platformHealth}</p>
              {[
                { label: Tr.verifiedMembers, pct: Math.round(verifiedN / Math.max(users.length,1) * 100), color: "#7ba87a" },
                { label: Tr.helpAreaCoverage, pct: Math.round(users.filter(u => u.helpAreas?.length > 0).length / Math.max(users.length,1) * 100), color: "#4472b8" },
                { label: Tr.onlineRightNow, pct: Math.round(onlineNow / Math.max(users.length,1) * 100), color: "#d4a574" },
              ].map(m => (
                <div key={m.label} style={{ marginBottom: "0.9rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary,#7a5868)" }}>{m.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-tertiary,#f0f6fb)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${m.pct}%`, background: m.color, borderRadius: 99, transition: "width 0.7s ease" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--bg-tertiary,#f0f6fb)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>{Tr.avgPostsPerMember}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary,#111827)", margin: 0 }}>{(posts.length / Math.max(users.length,1)).toFixed(1)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>{Tr.totalInteractions}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary,#111827)", margin: 0 }}>{(totalLikes + totalComments).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Most recent help post */}
            {helpPosts.length > 0 && (() => {
              const latest = helpPosts[0];
              return (
                <div className="card" style={{ padding: "1.25rem", cursor: "pointer", border: "1.5px solid rgba(232,115,90,0.28)" }}
                  onClick={() => setTab("support")}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#e8735a"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,115,90,0.28)"}
                >
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#e8735a", textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.75rem" }}>
                    {lang==="he"?"פוסט עזרה אחרון":lang==="ar"?"آخر منشور مساعدة":"Latest Help Post"}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-primary,#111827)", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {latest.content || "—"}
                  </p>
                  <span style={{ fontSize: 11, color: "var(--text-muted,#6b7280)" }}>{Tr.postBy(latest.authorDisplayName)}</span>
                </div>
              );
            })()}
            </div>

            {/* Recent members */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 1rem" }}>{Tr.recentMembers}</p>
              {users.slice().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid var(--bg-tertiary,#f0f6fb)" }}>
                  <div style={{ width:30,height:30,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,overflow:"hidden" }}>
                    {(u.photoURL || u.avatarUrl)
                      ? <img src={u.photoURL || u.avatarUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                      : getInitials(`${u.firstName} ${u.lastName}`)
                    }
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:12,fontWeight:600,color:"var(--text-primary,#111827)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",margin:0 }}>{u.firstName} {u.lastName}</p>
                    <p style={{ fontSize:10,color:"var(--text-muted,#6b7280)",margin:0 }}>{u.profession || timeAgo(u.createdAt)}</p>
                  </div>
                  <span style={{ fontSize:10,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap",flexShrink:0 }}>{timeAgo(u.createdAt)}</span>
                </div>
              ))}
              {canManageUsers && (
                <button onClick={() => setTab("users")} style={{ marginTop: "0.85rem", width: "100%", fontSize: 12, fontWeight: 600, padding: "7px", borderRadius: 8, border: "1.5px solid var(--border,#daeaf8)", background: "var(--bg-secondary,#f0f6fb)", color: "var(--text-primary,#111827)", cursor: "pointer" }}>
                  {Tr.viewAllMembers}
                </button>
              )}
            </div>

            {/* Quick actions + top post */}
            <div className="admin-overview-quick" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Quick actions */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.85rem" }}>{Tr.quickActions}</p>
                <div className="admin-quick-btns" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {canManageUsers && (
                    <button onClick={() => setTab("users")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: "1.5px solid var(--border,#daeaf8)", background: "var(--bg-primary,#fff)", color: "var(--text-primary,#111827)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4472b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {Tr.manageUsers}
                    </button>
                  )}
                  {canManageContent && (
                    <button onClick={() => setTab("reports")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: "1.5px solid var(--border,#daeaf8)", background: "var(--bg-primary,#fff)", color: "var(--text-primary,#111827)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c25c5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {Tr.reviewReports}
                    </button>
                  )}
                  {canViewLogs && (
                    <button onClick={() => setTab("logs")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: "1.5px solid var(--border,#daeaf8)", background: "var(--bg-primary,#fff)", color: "var(--text-primary,#111827)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      {Tr.activityLogs}
                    </button>
                  )}
                  {canViewStats && (
                    <button onClick={() => setTab("data")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: "1.5px solid var(--border,#daeaf8)", background: "var(--bg-primary,#fff)", color: "var(--text-primary,#111827)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4a574" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      {Tr.dataAndAnalytics}
                    </button>
                  )}
                </div>
              </div>

              {/* Top post */}
              {posts.length > 0 && (() => {
                const top = posts.slice().sort((a,b) => (b.likesCount||0) - (a.likesCount||0))[0];
                return (
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.75rem" }}>{Tr.mostLikedPost}</p>
                    <p style={{ fontSize: 13, color: "var(--text-primary,#111827)", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {top.text || Tr.mediaPost}
                    </p>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#c25c5c", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {top.likesCount||0}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted,#6b7280)" }}>{Tr.postBy(top.authorName)}</span>
                    </div>
                  </div>
                );
              })()}

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
          <div className="admin-filter-bar" style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              {Tr.allMembers} <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({filteredBySearch.length})</span>
            </span>
            <input
              className="input admin-search-input"
              placeholder={Tr.searchByNamePh}
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              style={{ fontSize:12, width:220, flexShrink:0 }}
            />
            <div className="admin-filter-pills" style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { val:"recent", label:Tr.sortRecent },
                { val:"alpha",  label:Tr.sortAlpha },
                { val:"region", label:Tr.region },
                { val:"perms",  label:Tr.sortAdminsFirst },
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
                {Tr.adminsOnly}
              </label>
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                <input type="checkbox" checked={userFilterOnline} onChange={e => setUserFilterOnline(e.target.checked)} style={{ cursor:"pointer" }} />
                {Tr.onlineOnly}
              </label>
            </div>
          </div>
          {isMobile ? (
            <div style={{ display:"flex",flexDirection:"column",gap:"0.65rem" }}>
              {filteredBySearch.map(u => {
                const isExpandedU = expandedUserId === u.id;
                const uName = `${u.firstName||""} ${u.lastName||""}`.trim();
                const uAv = u.photoURL || u.avatarUrl;
                return (
                  <div key={u.id} style={{ background:"var(--bg-primary,#fff)",border:"1.5px solid var(--border,#daeaf8)",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(29,72,150,0.05)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"0.75rem 1rem",cursor:"pointer" }}
                      onClick={() => setExpandedUserId(isExpandedU ? null : u.id)}>
                      <div style={{ width:38,height:38,borderRadius:"50%",flexShrink:0,background:avatarColor(uName),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,overflow:"hidden" }}>
                        {uAv ? <img src={uAv} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : getInitials(uName)}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:14,fontWeight:700,color:"var(--text-primary,#111827)",margin:"0 0 2px" }}>{uName||"—"}</p>
                        <p style={{ fontSize:11,color:"var(--text-muted,#6b7280)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          {[u.profession,u.region].filter(Boolean).join(" · ")||"—"}
                        </p>
                      </div>
                      <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0 }}>
                        <span className={`badge ${u.emailVerified?"badge-green":"badge-yellow"}`} style={{ fontSize:10 }}>
                          {u.emailVerified ? Tr.verified : Tr.statusPending}
                        </span>
                        {u.isAdmin && <span className="badge badge-purple" style={{ fontSize:10 }}>{Tr.adminBadge}</span>}
                        {isActuallyOnline(u) && <span className="badge badge-green" style={{ fontSize:10,background:"#f0fdf4" }}>● {Tr.onlineBadge}</span>}
                      </div>
                    </div>
                    {isExpandedU && (
                      <div style={{ padding:"0.65rem 1rem",borderTop:"1px solid var(--border,#daeaf8)",background:"var(--bg-secondary,#f0f6fb)" }}>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px" }}>
                          {[
                            { label:Tr.colJoined, val:u.createdAt ? new Date(u.createdAt).toLocaleDateString() : null },
                            { label:Tr.campus,    val:u.campus },
                            { label:Tr.degree,    val:[u.bachelorDegree,u.masterDegree].filter(Boolean).join(" · ")||null },
                            { label:Tr.birthdate, val:u.birthdate },
                            { label:Tr.identity,  val:translateReligion(u.identity,lang)||u.identity },
                            { label:Tr.ethnicity, val:translateEthnicity(u.ethnicity,lang)||u.ethnicity },
                            { label:Tr.bio,       val:u.bio },
                          ].map(({label,val}) => val ? (
                            <div key={label}>
                              <p style={{ fontSize:9,fontWeight:700,color:"var(--text-muted,#6b7280)",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 1px" }}>{label}</p>
                              <p style={{ fontSize:12,color:"var(--text-secondary,#7a5868)",margin:0,wordBreak:"break-word" }}>{val}</p>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    )}
                    {u.id !== user?.uid && (
                      <div style={{ display:"flex",gap:6,flexWrap:"wrap",padding:"0.6rem 1rem",borderTop:"1px solid var(--border,#daeaf8)",background:"var(--bg-secondary,#f0f6fb)" }}>
                        {canManageUsers && <button onClick={e => { e.stopPropagation(); setEditingUser(u); }}
                          style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid var(--border,#daeaf8)",background:"var(--bg-primary,#fff)",color:"var(--text-primary,#111827)",cursor:"pointer" }}>
                          {Tr.editUser||"Edit"}
                        </button>}
                        {canManageAdmins && (u.isAdmin ? (<>
                          <button onClick={e => { e.stopPropagation(); setEditPermsTarget(u); }}
                            style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1d4896",cursor:"pointer" }}>
                            {Tr.editPermsBtn}
                          </button>
                          <button onClick={e => { e.stopPropagation(); setConfirmRevokeTarget(u); }}
                            style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #c4b5fd",background:"#ede9fe",color:"#6d28d9",cursor:"pointer" }}>
                            {Tr.revokeAdmin}
                          </button>
                        </>) : (
                          <button onClick={e => { e.stopPropagation(); setMakeAdminConfirmTarget(u); }}
                            style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #c4b5fd",background:"#ede9fe",color:"#6d28d9",cursor:"pointer" }}>
                            {Tr.makeAdmin}
                          </button>
                        ))}
                        {canManageUsers && <button onClick={e => { e.stopPropagation(); setConfirmDeleteTarget(u); }}
                          style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #d99090",background:"#f5dada",color:"#c25c5c",cursor:"pointer" }}>
                          {Tr.deleteLbl}
                        </button>}
                        {!canManageUsers && !canManageAdmins && <span style={{ fontSize:11,color:"var(--text-muted)" }}>{Tr.viewOnly}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredBySearch.length === 0 && <div className="empty-state"><p>{Tr.noMembersFound}</p></div>}
            </div>
          ) : (
            <div className="card admin-table-card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="admin-users-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "var(--bg-secondary,#f0f6fb)" }}>
                    {[Tr.colMember, Tr.profession, Tr.region, Tr.colStatus, Tr.colJoined, Tr.colActions].map(h => (
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
                          {(u.photoURL || u.avatarUrl)
                            ? <img src={u.photoURL || u.avatarUrl} style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover" }} alt="" />
                            : <div style={{ width:32,height:32,borderRadius:"50%",background:avatarColor(`${u.firstName} ${u.lastName}`),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{getInitials(`${u.firstName} ${u.lastName}`)}</div>
                          }
                          <div>
                            <p style={{ fontSize:13,fontWeight:700,color:"var(--text-primary,#111827)" }}>{u.firstName} {u.lastName}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#7a5868)" }}>{u.profession||"—"}</td>
                      <td style={{ padding:"11px 14px",fontSize:12,color:"var(--text-secondary,#7a5868)" }}>{u.region||"—"}</td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                          <span className={`badge ${u.emailVerified ? "badge-green" : "badge-yellow"}`}>
                            {u.emailVerified ? Tr.verified : Tr.statusPending}
                          </span>
                          {u.isAdmin && <span className="badge badge-purple">{Tr.adminBadge}</span>}
                          {isActuallyOnline(u) && <span className="badge badge-green" style={{background:"#f0fdf4"}}>● {Tr.onlineBadge}</span>}
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap" }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        {u.id !== user?.uid && (
                          <div className="admin-table-actions" style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
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
                            {!canManageUsers && !canManageAdmins && <span style={{fontSize:11,color:"var(--text-muted)"}}>{Tr.viewOnly}</span>}
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
                              { label: Tr.identity,  val: translateReligion(u.identity, lang) || u.identity },
                              { label: Tr.ethnicity, val: translateEthnicity(u.ethnicity, lang) || u.ethnicity },
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
                <div className="empty-state"><p>{Tr.noMembersFound}</p></div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ EDIT USERS TAB ══ */}
      {!loading && tab === "editUsers" && (
        <div>
          <SectionHeader title={Tr.editUsersSectionTitle} count={users.length} />
          <input
            style={S.searchInput}
            type="text"
            placeholder={Tr.searchByNamePh}
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
          <div style={S.tableWrap}>
            {filteredBySearch.length === 0 ? (
              <p style={S.empty}>{Tr.noUsersMatch}</p>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{Tr.colName}</th>
                    <th style={S.th}>{Tr.profession}</th>
                    <th style={S.th}>{Tr.region}</th>
                    <th style={S.th}>{Tr.colAdmin}</th>
                    <th style={S.th}>{Tr.colActions}</th>
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
                      <td style={S.td}>{u.region || "—"}</td>
                      <td style={S.td}>
                        {u.isAdmin ? <span style={S.adminBadge}>{Tr.adminBadge}</span> : <span style={{ color: "#d9c8ce" }}>—</span>}
                      </td>
                      <td style={S.td}>
                        <button
                          style={S.editBtn}
                          onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => setEditingUser(u)}
                        >
                          {Tr.editLbl}
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
          <div className="admin-filter-bar" style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              {Tr.allPosts} <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({filteredPosts.length})</span>
            </span>
            <input
              className="input admin-search-input"
              value={postSearch}
              onChange={e => setPostSearch(e.target.value)}
              placeholder={Tr.searchPh}
              style={{ fontSize:12, width:200, flexShrink:0 }}
            />
            <div className="admin-filter-pills" style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { val:"recent", label:Tr.sortRecent },
                { val:"alpha",  label:Tr.sortAlpha },
                { val:"likes",  label:Tr.sortMostLiked },
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
                {Tr.pinnedOnly}
              </label>
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                <input type="checkbox" checked={postFilterMedia} onChange={e => setPostFilterMedia(e.target.checked)} style={{ cursor:"pointer" }} />
                {Tr.hasMedia}
              </label>
            </div>
          </div>
          {isMobile ? (
            <div style={{ display:"flex",flexDirection:"column",gap:"0.65rem" }}>
              {filteredPosts.map(p => {
                const textKey = `text-${p.id}`;
                const isTextExpanded = expandedPostComments[textKey];
                const LIMIT = 160;
                const isLong = p.text && p.text.length > LIMIT;
                return (
                  <div key={p.id} style={{ background:"var(--bg-primary,#fff)",border:"1.5px solid var(--border,#daeaf8)",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(29,72,150,0.05)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9,padding:"0.7rem 1rem",borderBottom:"1px solid var(--bg-tertiary,#f0f6fb)" }}>
                      <div style={{ width:32,height:32,borderRadius:"50%",flexShrink:0,background:avatarColor(p.authorName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",overflow:"hidden" }}>
                        {p.authorAvatar
                          ? <img src={p.authorAvatar} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                          : getInitials(p.authorName)
                        }
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:13,fontWeight:700,color:"var(--text-primary,#111827)",margin:0 }}>{p.authorName}</p>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
                        {p.isPinned && <span style={{ fontSize:10,background:"#fef9c3",color:"#92400e",borderRadius:99,padding:"2px 8px",fontWeight:700 }}>📌</span>}
                        <span style={{ fontSize:10,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap" }}>{timeAgo(p.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ padding:"0.6rem 1rem",borderBottom:"1px solid var(--bg-tertiary,#f0f6fb)" }}>
                      {p.text ? (
                        <>
                          <p style={{ fontSize:13,color:"var(--text-secondary,#7a5868)",wordBreak:"break-word",whiteSpace:"pre-wrap",margin:"0 0 4px",lineHeight:1.5 }}>
                            {isTextExpanded || !isLong ? p.text : `${p.text.slice(0,LIMIT)}…`}
                          </p>
                          {isLong && (
                            <button onClick={() => setExpandedPostComments(s => ({ ...s, [textKey]: !s[textKey] }))}
                              style={{ fontSize:11,color:"var(--brand,#4472b8)",background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600 }}>
                              {isTextExpanded ? Tr.showLess : Tr.showFullPost}
                            </button>
                          )}
                        </>
                      ) : <em style={{ fontSize:12,color:"var(--text-muted,#6b7280)" }}>{Tr.mediaPost}</em>}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"0.5rem 1rem",borderBottom:"1px solid var(--bg-tertiary,#f0f6fb)" }}>
                      {p.media?.length > 0 && (
                        <span style={{ fontSize:11,background:"#dbeafe",color:"#1e40af",borderRadius:99,padding:"2px 9px",fontWeight:700 }}>{p.media.length} file{p.media.length>1?"s":""}</span>
                      )}
                      <button onClick={() => togglePostComments(p.id)}
                        style={{ background:"none",border:"1px solid var(--border,#f0dce0)",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:"var(--text-secondary,#7a5868)" }}>
                        {expandedPostComments[p.id] ? Tr.hide : Tr.showCommentsFn(p.commentCount ?? 0)}
                      </button>
                    </div>
                    {expandedPostComments[p.id] && (
                      <div style={{ padding:"0.6rem 1rem",background:"var(--bg-secondary,#f0f6fb)",borderBottom:"1px solid var(--border,#daeaf8)" }}>
                        <div style={S.commentsWrap}>
                          {!postCommentsList[p.id] ? (
                            <p style={{ fontSize:12,color:"var(--text-muted,#6b7280)",margin:0 }}>{Tr.loadingComments}</p>
                          ) : postCommentsList[p.id].length === 0 ? (
                            <p style={{ fontSize:12,color:"var(--text-muted,#6b7280)",margin:0 }}>{Tr.noComments}</p>
                          ) : postCommentsList[p.id].map(c => (
                            <div key={c.id} style={S.commentRow}>
                              <div style={{ flex:1 }}>
                                <span style={{ fontWeight:700,color:"var(--text-primary,#111827)",marginRight:8 }}>{c.authorName}</span>
                                <span style={{ color:"var(--text-secondary,#7a5868)" }}>{c.text}</span>
                                <span style={{ color:"var(--text-muted,#6b7280)",fontSize:10,marginLeft:8 }}>{timeAgo(c.createdAt)}</span>
                              </div>
                              <button style={{ ...S.delBtn,padding:"3px 9px",fontSize:10 }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f5dada"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                                onClick={() => deleteComment(p.id, c)}>{Tr.deleteLbl}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap",padding:"0.55rem 1rem",background:"var(--bg-secondary,#f0f6fb)" }}>
                      {canManageContent && <button onClick={() => pinPost(p.id, p.isPinned)}
                        style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #e8c992",background:"#faedd6",color:"#7a5a2e",cursor:"pointer" }}>
                        {p.isPinned ? Tr.unpinLbl : Tr.pinLbl}
                      </button>}
                      {canManageContent && <button onClick={() => deletePost(p.id)}
                        style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #d99090",background:"#f5dada",color:"#c25c5c",cursor:"pointer" }}>
                        {Tr.deleteLbl}
                      </button>}
                      {!canManageContent && <span style={{ fontSize:11,color:"var(--text-muted)" }}>{Tr.viewOnly}</span>}
                    </div>
                  </div>
                );
              })}
              {filteredPosts.length === 0 && <div className="empty-state"><p>{Tr.noPosts}</p></div>}
            </div>
          ) : (
            <div className="card admin-table-card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="admin-posts-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: "var(--bg-secondary,#f0f6fb)" }}>
                    {[Tr.colAuthor, Tr.colContent, Tr.colMedia, Tr.colComments, Tr.colPosted, Tr.colActions].map(h => (
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
                            <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:avatarColor(p.authorName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",overflow:"hidden" }}>
                              {p.authorAvatar
                                ? <img src={p.authorAvatar} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                                : getInitials(p.authorName)
                              }
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
                                    {isExpanded ? Tr.showLess : Tr.showFullPost}
                                  </button>
                                )}
                              </>
                            );
                          })() : <em style={{fontSize:12,color:"var(--text-muted,#6b7280)"}}>{Tr.mediaPost}</em>}
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
                            {expandedPostComments[p.id] ? Tr.hide : Tr.showCommentsFn(p.commentCount ?? 0)}
                          </button>
                        </td>
                        <td style={{ padding:"11px 14px",fontSize:11,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap" }}>{timeAgo(p.createdAt)}</td>
                        <td style={{ padding:"11px 14px" }}>
                          <div className="admin-table-actions" style={{ display:"flex",gap:4 }}>
                            {canManageContent && <button
                              onClick={() => pinPost(p.id, p.isPinned)}
                              style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #e8c992",background:"#faedd6",color:"#7a5a2e",cursor:"pointer" }}
                            >{p.isPinned ? Tr.unpinLbl : Tr.pinLbl}</button>}
                            {canManageContent && <button
                              onClick={() => deletePost(p.id)}
                              style={{ padding:"4px 10px",borderRadius:"var(--r-sm,8px)",fontSize:11,fontWeight:600,border:"1px solid #d99090",background:"#f5dada",color:"#c25c5c",cursor:"pointer" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#eec3c3"}
                              onMouseLeave={e => e.currentTarget.style.background = "#f5dada"}
                            >{Tr.deleteLbl}</button>}
                            {!canManageContent && <span style={{fontSize:11,color:"var(--text-muted)"}}>{Tr.viewOnly}</span>}
                          </div>
                        </td>
                      </tr>
                      {expandedPostComments[p.id] && (
                        <tr key={`${p.id}-comments`}>
                          <td colSpan={6} style={{ padding:"0 14px 12px 46px",background:"var(--bg-secondary,#f0f6fb)" }}>
                            <div style={S.commentsWrap}>
                              {!postCommentsList[p.id] ? (
                                <p style={{ fontSize:"12px",color:"var(--text-muted,#6b7280)",margin:0 }}>{Tr.loadingComments}</p>
                              ) : postCommentsList[p.id].length === 0 ? (
                                <p style={{ fontSize:"12px",color:"var(--text-muted,#6b7280)",margin:0 }}>{Tr.noComments}</p>
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
                                      {Tr.deleteLbl}
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
              {filteredPosts.length === 0 && <div className="empty-state"><p>{Tr.noPosts}</p></div>}
            </div>
          )}
          </>
            );
          })()}
        </>
      )}

      {/* ══ DATA TAB ══ */}
      {!loading && tab === "data" && (
        <>
          {/* Export / import members */}
          <div className="card" style={{ padding:"0.75rem 1rem", marginBottom:"1.5rem", display:"flex", flexWrap:"wrap", alignItems:"center", gap:"0.75rem" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>{Tr.dataManage}</span>
            <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={() => setExportOpen(true)}
                style={{ padding:"6px 14px", background:"var(--brand,#4472b8)", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                ⬇ {Tr.downloadBtn}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={importBusy}
                style={{ padding:"6px 14px", background:"var(--bg-tertiary,#f0f6fb)", color:"var(--text-primary,#111827)", border:"1.5px solid var(--border,#daeaf8)", borderRadius:8, fontSize:12, fontWeight:700, cursor: importBusy ? "wait" : "pointer", opacity: importBusy ? 0.6 : 1, display:"flex", alignItems:"center", gap:5 }}>
                ⬆ {importBusy ? Tr.importing : Tr.uploadBtn}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display:"none" }} />
            </div>
            <span style={{ fontSize:11, color:"var(--text-muted,#6b7280)", flexShrink:0 }}>{Tr.dirNote}</span>
            {importResult && (
              <div style={{ width:"100%", padding:"0.75rem 1rem", borderRadius:10, background:"var(--bg-tertiary,#f0f6fb)", border:"1px solid var(--border,#daeaf8)" }}>
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
                      {Tr.exportFieldLabels?.[f.key] ?? f.label}
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

          {/* ── Mobile section nav ── */}
          {isMobile && (
            <div style={{ display:"flex", gap:0, marginBottom:"1rem", background:"var(--bg-secondary,#f0f6fb)", borderRadius:12, padding:3 }}>
              {[["distribution", Tr.distributionLabel],["growth", Tr.growthLabel]].map(([v,l]) => (
                <button key={v} onClick={() => setMobileDataSection(v)} style={{
                  flex:1, padding:"8px 4px", fontSize:12, fontWeight:700, border:"none", cursor:"pointer", transition:"all 0.15s", borderRadius:9,
                  background: mobileDataSection === v ? "var(--bg-primary,#fff)" : "transparent",
                  color:      mobileDataSection === v ? "var(--accent,#4472b8)" : "var(--text-muted,#6b7280)",
                  boxShadow:  mobileDataSection === v ? "0 1px 5px rgba(0,0,0,0.12)" : "none",
                }}>{l}</button>
              ))}
            </div>
          )}

          {/* ── Row 1: Donut + Line Chart ── */}
          {isMobile ? (
            <>
              {mobileDataSection === "distribution" && <DistributionDonutChart users={users} lang={lang} Tr={Tr} />}
              {mobileDataSection === "growth" && <MemberGrowthChart users={users} Tr={Tr} />}
            </>
          ) : (
            <div className="admin-data-charts" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem", marginBottom:"1.25rem" }}>
              <DistributionDonutChart users={users} lang={lang} Tr={Tr} />
              <MemberGrowthChart users={users} Tr={Tr} />
            </div>
          )}

          {/* ── Support Stats ── */}
          {(() => {
            const pending  = helpRequests.filter(r => !r.status || r.status === "pending").length;
            const accepted = helpRequests.filter(r => r.status === "accepted").length;
            const declined = helpRequests.filter(r => r.status === "declined").length;
            const areaCount = {};
            helpRequests.forEach(r => {
              const toUser = users.find(u => u.id === r.toUserId);
              (toUser?.helpAreas || []).forEach(a => { areaCount[a] = (areaCount[a] || 0) + 1; });
            });
            const topAreas = Object.entries(areaCount).sort((a,b) => b[1]-a[1]).slice(0, 5);
            return (
              <div className="card" style={{ padding:"1.25rem", marginBottom:"1.25rem" }}>
                <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.09em", margin:"0 0 1.1rem" }}>{Tr.supportStatsTitle}</p>
                {helpPosts.length === 0 && helpRequests.length === 0 && !supportLoading ? (
                  <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>{Tr.supportStatsNoData}</p>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"1.25rem" }}>
                    {/* Left: counts + request breakdown */}
                    <div>
                      <div style={{ display:"flex", gap:"1rem", marginBottom:"1rem", flexWrap:"wrap" }}>
                        {[
                          { label: Tr.supportStatsPosts, val: helpPosts.length, color: "#e8735a" },
                          { label: Tr.supportStatsReqs,  val: helpRequests.length, color: "#4472b8" },
                        ].map(s => (
                          <div key={s.label} style={{ background:"var(--bg-secondary)", borderRadius:12, padding:"0.65rem 1.1rem", flex:1, minWidth:80 }}>
                            <p style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 4px" }}>{s.label}</p>
                            <p style={{ fontSize:22, fontWeight:800, color:s.color, margin:0 }}>{s.val}</p>
                          </div>
                        ))}
                      </div>
                      {helpRequests.length > 0 && (
                        <>
                          <p style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 8px" }}>{Tr.supportReqStatus}</p>
                          {[
                            { label: Tr.supportPending,  val: pending,  pct: Math.round(pending/Math.max(helpRequests.length,1)*100),  color:"#f59e0b" },
                            { label: Tr.supportAccepted, val: accepted, pct: Math.round(accepted/Math.max(helpRequests.length,1)*100), color:"#7ba87a" },
                            { label: Tr.supportDeclined, val: declined, pct: Math.round(declined/Math.max(helpRequests.length,1)*100), color:"#e8735a" },
                          ].map(s => (
                            <div key={s.label} style={{ marginBottom:8 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                                <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary)" }}>{s.label}</span>
                                <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.val} ({s.pct}%)</span>
                              </div>
                              <div style={{ height:5, background:"var(--bg-tertiary,#f0f6fb)", borderRadius:99, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${s.pct}%`, background:s.color, borderRadius:99, transition:"width 0.7s ease" }} />
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    {/* Right: top requested areas */}
                    {topAreas.length > 0 && (
                      <div>
                        <p style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 8px" }}>{Tr.supportStatsTopAreas}</p>
                        {topAreas.map(([area, count], i) => (
                          <div key={area} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", width:16, textAlign:"center" }}>{i+1}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                                <span style={{ fontSize:12, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{area}</span>
                                <span style={{ fontSize:11, fontWeight:700, color:"#4472b8", flexShrink:0, marginInlineStart:8 }}>{count}</span>
                              </div>
                              <div style={{ height:4, background:"var(--bg-tertiary,#f0f6fb)", borderRadius:99, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${Math.round(count/Math.max(topAreas[0][1],1)*100)}%`, background:"#4472b8", borderRadius:99 }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        </>
      )}

      {/* ══ REPORTS TAB ══ */}
      {tab === "reports" && (
        <div>
          {/* Reports header + inline filter bar */}
          <div className="admin-filter-bar" style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              {Tr.reportsTab} <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>{Tr.pendingBadge(reports.filter(r=>r.status==="pending").length)}</span>
            </span>
            <input
              className="input admin-search-input"
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              placeholder={Tr.searchReporterPh}
              style={{ fontSize:12, width:220, flexShrink:0 }}
            />
            <div className="admin-filter-pills" style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { val:"all",       label:Tr.allFilter },
                { val:"pending",   label:Tr.reportPending },
                { val:"resolved",  label:Tr.reportResolved },
                { val:"dismissed", label:Tr.dismissedLabel },
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
              <div style={{ padding:"2rem", textAlign:"center", color:"var(--text-muted,#6b7280)" }}>{Tr.loading}</div>
            ) : filteredReports.length === 0 ? (
              <div className="empty-state"><p>{reports.length === 0 ? Tr.noReports : Tr.noReportsFiltered}</p></div>
            ) : isMobile ? (
              <div style={{ display:"flex",flexDirection:"column",gap:"0.65rem" }}>
                {filteredReports.map(r => {
                  const isExpandedR = expandedReportId === r.id;
                  const statusColor = r.status === "resolved" ? { bg:"rgba(123,168,122,0.15)", text:"#7ba87a" } : r.status === "dismissed" ? { bg:"rgba(107,114,128,0.12)", text:"#6b7280" } : { bg:"rgba(233,65,91,0.12)", text:"#e9415b" };
                  const statusLabel = r.status === "resolved" ? Tr.reportResolved : r.status === "dismissed" ? Tr.dismiss : Tr.reportPending;
                  return (
                    <div key={r.id} style={{ background:"var(--bg-primary,#fff)",border:"1.5px solid var(--border,#daeaf8)",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(29,72,150,0.05)",opacity:r.status !== "pending" ? 0.75 : 1 }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"0.7rem 1rem",cursor:"pointer",borderBottom:"1px solid var(--bg-tertiary,#f0f6fb)" }}
                        onClick={() => setExpandedReportId(isExpandedR ? null : r.id)}>
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:12,margin:"0 0 2px",color:"var(--text-muted,#6b7280)",fontWeight:600 }}>
                            <span style={{ color:"var(--text-primary,#111827)" }}>{r.reporterName||r.reporterId}</span>
                            {" → "}
                            <span style={{ color:"var(--text-primary,#111827)" }}>{r.reportedName||r.reportedId}</span>
                          </p>
                          <p style={{ fontSize:11,color:"var(--text-muted,#6b7280)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.reason}</p>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0 }}>
                          <span style={{ fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:99,background:statusColor.bg,color:statusColor.text,whiteSpace:"nowrap" }}>{statusLabel}</span>
                          <span style={{ fontSize:10,color:"var(--text-muted,#6b7280)",whiteSpace:"nowrap" }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>
                      {isExpandedR && (
                        <div style={{ padding:"0.7rem 1rem",background:"var(--bg-secondary,#f0f6fb)",borderBottom:"1px solid var(--border,#daeaf8)" }}>
                          <p style={{ fontSize:10,fontWeight:700,color:"var(--text-muted,#6b7280)",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 8px" }}>
                            {Tr.conversationLabel(r.reporterName, r.reportedName)}
                          </p>
                          {(!r.messages || r.messages.length === 0) ? (
                            <p style={{ fontSize:12,color:"var(--text-muted,#6b7280)",fontStyle:"italic",margin:0 }}>{Tr.noMessages}</p>
                          ) : (
                            <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto" }}>
                              {r.messages.map((m, i) => {
                                const isReporter = m.senderId === r.reporterId;
                                return (
                                  <div key={i} style={{ display:"flex",flexDirection:isReporter?"row-reverse":"row",alignItems:"flex-end",gap:8 }}>
                                    <div style={{ maxWidth:"80%",padding:"7px 12px",borderRadius:14,borderBottomRightRadius:isReporter?4:14,borderBottomLeftRadius:isReporter?14:4,background:isReporter?"#dbeafe":"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",fontSize:12,color:"var(--text-primary,#111827)",wordBreak:"break-word" }}>
                                      <p style={{ fontSize:10,fontWeight:700,color:isReporter?"#1d4896":"#e8735a",margin:"0 0 3px" }}>{m.senderName}</p>
                                      <p style={{ margin:0 }}>{m.text || <em style={{ color:"var(--text-muted,#6b7280)" }}>image</em>}</p>
                                      {m.sentAt && <p style={{ fontSize:9,color:"var(--text-muted,#6b7280)",margin:"3px 0 0",textAlign:isReporter?"right":"left" }}>{new Date(typeof m.sentAt==="object"&&m.sentAt.seconds?m.sentAt.seconds*1000:m.sentAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display:"flex",gap:6,flexWrap:"wrap",padding:"0.55rem 1rem",background:"var(--bg-secondary,#f0f6fb)" }}>
                        {r.status === "pending" && (<>
                          <button onClick={() => updateReportStatus(r.id, "resolved")}
                            style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #a3d9a5",background:"#f0fdf4",color:"#166534",cursor:"pointer" }}>
                            {Tr.markResolved}
                          </button>
                          <button onClick={() => updateReportStatus(r.id, "dismissed")}
                            style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #d1d5db",background:"#f9fafb",color:"#6b7280",cursor:"pointer" }}>
                            {Tr.dismiss}
                          </button>
                        </>)}
                        <button onClick={async()=>{ if(window.confirm(lang==="he"?"למחוק דיווח זה?":lang==="ar"?"حذف هذا البلاغ؟":"Delete this report?")){ await deleteDoc(doc(db,"reports",r.id)); setReports(prev=>prev.filter(x=>x.id!==r.id)); }}}
                          style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid rgba(232,115,90,0.4)",background:"rgba(232,115,90,0.06)",color:"#e8735a",cursor:"pointer" }}>
                          {Tr.deleteLbl}
                        </button>
                        <button onClick={() => setExpandedReportId(isExpandedR ? null : r.id)}
                          style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1d4896",cursor:"pointer" }}>
                          {isExpandedR ? "▲" : `▼ ${Tr.convoBtn}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="card admin-table-card" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <table className="admin-reports-table" style={{ ...S.table, minWidth: 560 }}>
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
                          <div className="admin-table-actions" style={{ display:"flex", gap:4 }}>
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
                            <button onClick={async()=>{ if(window.confirm(lang==="he"?"למחוק דיווח זה?":lang==="ar"?"حذف هذا البلاغ؟":"Delete this report?")){ await deleteDoc(doc(db,"reports",r.id)); setReports(prev=>prev.filter(x=>x.id!==r.id)); }}}
                              style={{ padding:"4px 10px", borderRadius:"var(--r-sm,8px)", fontSize:11, fontWeight:600, border:"1px solid rgba(232,115,90,0.4)", background:"rgba(232,115,90,0.06)", color:"#e8735a", cursor:"pointer" }}>
                              {Tr.deleteLbl}
                            </button>
                            <button onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                              style={{ padding:"4px 10px", borderRadius:"var(--r-sm,8px)", fontSize:11, fontWeight:600, border:"1px solid #93c5fd", background:"#eff6ff", color:"#1d4896", cursor:"pointer" }}>
                              {expandedReportId === r.id ? "▲" : `▼ ${Tr.convoBtn}`}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedReportId === r.id && (
                        <tr>
                          <td colSpan={6} style={{ background:"var(--bg-secondary,#f0f6fb)", padding:"1rem 1.5rem 1.25rem", borderBottom:"2px solid var(--border,#daeaf8)" }}
                            onClick={e => e.stopPropagation()}>
                            <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted,#6b7280)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 10px" }}>
                              {Tr.conversationLabel(r.reporterName, r.reportedName)}
                            </p>
                            {(!r.messages || r.messages.length === 0) ? (
                              <p style={{ fontSize:12, color:"var(--text-muted,#6b7280)", fontStyle:"italic", margin:0 }}>{Tr.noMessages}</p>
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
          <div style={{ background:"var(--bg-primary,#fff)",borderRadius:"16px",padding:"1.25rem",border:"1.5px solid var(--border,#daeaf8)",marginBottom:"1rem",boxShadow:"0 2px 8px rgba(29, 72, 150,0.05)" }}>
            {isMobile ? (
              /* Mobile: two rows */
              <div style={{ display:"flex",flexDirection:"column",gap:"0.75rem" }}>
                <div style={{ display:"flex",gap:"0.75rem",alignItems:"flex-end" }}>
                  {allLogTypes.length > 0 && (
                    <div style={{ flexShrink:0 }}>
                      <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.filterByType}</p>
                      <select value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)}
                        style={{ ...S.logFilterInput, cursor:"pointer", width:"auto", appearance:"none", WebkitAppearance:"none", paddingRight:"28px", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 9px center" }}>
                        <option value="">{Tr.allTypes}</option>
                        {allLogTypes.map(type => <option key={type} value={type}>{Tr.logTypeLabels?.[type] ?? getLogTypeConfig(type).label}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.actorNameLabel}</p>
                    <input style={S.logFilterInput} type="text" placeholder={Tr.filterByActor} value={logActorFilter} onChange={e => setLogActorFilter(e.target.value)} />
                  </div>
                </div>
                <div style={{ display:"flex",gap:"0.75rem",alignItems:"flex-end" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.fromDateLabel}</p>
                    <input style={S.logFilterInput} type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.toDateLabel}</p>
                    <input style={S.logFilterInput} type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} />
                  </div>
                  {(logTypeFilter || logActorFilter || logDateFrom || logDateTo) && (
                    <button onClick={() => { setLogTypeFilter(""); setLogActorFilter(""); setLogDateFrom(""); setLogDateTo(""); }}
                      style={{ ...S.refreshBtn,background:"var(--bg-tertiary,#f0f6fb)",color:"var(--text-muted,#6b7280)",border:"1.5px solid var(--border,#daeaf8)" }}>
                      {Tr.clearBtn}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Desktop: single row */
              <div style={{ display:"flex",gap:"0.75rem",alignItems:"flex-end" }}>
                {allLogTypes.length > 0 && (
                  <div style={{ flexShrink:0 }}>
                    <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.filterByType}</p>
                    <select value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)}
                      style={{ ...S.logFilterInput, cursor:"pointer", width:"auto", appearance:"none", WebkitAppearance:"none", paddingRight:"28px", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 9px center" }}>
                      <option value="">{Tr.allTypes}</option>
                      {allLogTypes.map(type => <option key={type} value={type}>{Tr.logTypeLabels?.[type] ?? getLogTypeConfig(type).label}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.actorNameLabel}</p>
                  <input style={S.logFilterInput} type="text" placeholder={Tr.filterByActor} value={logActorFilter} onChange={e => setLogActorFilter(e.target.value)} />
                </div>
                <div style={{ flexShrink:0 }}>
                  <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.fromDateLabel}</p>
                  <input style={{ ...S.logFilterInput, width:"auto" }} type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} />
                </div>
                <div style={{ flexShrink:0 }}>
                  <p style={{ ...S.modalLabel,marginBottom:"3px" }}>{Tr.toDateLabel}</p>
                  <input style={{ ...S.logFilterInput, width:"auto" }} type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} />
                </div>
                {(logTypeFilter || logActorFilter || logDateFrom || logDateTo) && (
                  <button onClick={() => { setLogTypeFilter(""); setLogActorFilter(""); setLogDateFrom(""); setLogDateTo(""); }}
                    style={{ ...S.refreshBtn,background:"var(--bg-tertiary,#f0f6fb)",color:"var(--text-muted,#6b7280)",border:"1.5px solid var(--border,#daeaf8)",flexShrink:0,alignSelf:"flex-end" }}>
                    {Tr.clearBtn}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Log entries */}
          <div style={S.logPanel}>
            {logsLoading && <p style={S.empty}>{Tr.loadingLogs}</p>}
            {!logsLoading && filteredLogs.length === 0 && (
              <p style={S.empty}>{logs.length === 0 ? Tr.noLogs : Tr.noLogsFiltered}</p>
            )}
            {!logsLoading && filteredLogs.length > 0 && (
              <div style={S.logList}>
                <div style={{ padding:"10px 1.25rem 6px",background:"var(--bg-primary,#fff)",borderBottom:"1px solid var(--border,#daeaf8)" }}>
                  <p style={{ fontSize:"12px",color:"var(--text-muted,#6b7280)",margin:0 }}>
                    {Tr.showingEntriesFn(filteredLogs.length, logs.length)}
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
                      <span style={S.logBadge(cfg.bg, cfg.color)}>{Tr.logTypeLabels?.[log.type] ?? cfg.label}</span>
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
                              ? `${Tr.fieldsLabel} ${log.details.editedFields.join(", ")}`
                              : log.details.toUserName
                              ? `${Tr.toLogLabel} ${log.details.toUserName}`
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

      {/* ══ SUPPORT TAB ══ */}
      {tab === "support" && (
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:"var(--text-primary)", marginBottom:"1.5rem" }}>{Tr.supportTitle}</h2>
          {supportLoading ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"var(--text-muted)" }}>...</div>
          ) : (
            <>
              {/* ── Help Posts ── */}
              <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"0.75rem", flexWrap:"wrap" }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:"var(--text-primary)", margin:0 }}>
                  {Tr.supportPostsLabel} ({filteredHelpPosts.length}{filteredHelpPosts.length !== helpPosts.length ? ` / ${helpPosts.length}` : ""})
                </h3>
                <input
                  value={supportPostSearch} onChange={e => setSupportPostSearch(e.target.value)}
                  placeholder={Tr.supportFilterSearch}
                  style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:12, outline:"none", width:200 }}
                />
              </div>
              {helpPosts.length === 0 ? (
                <p style={{ color:"var(--text-muted)", fontSize:13 }}>{Tr.supportNoPosts}</p>
              ) : filteredHelpPosts.length === 0 ? (
                <p style={{ color:"var(--text-muted)", fontSize:13, marginBottom:"2rem" }}>—</p>
              ) : (
                <div className="card admin-table-card" style={{ overflowX:"auto", marginBottom:"2rem" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
                    <thead>
                      <tr style={{ background:"var(--bg-secondary)" }}>
                        {[Tr.supportColAuthor, Tr.supportColPost, Tr.supportColTags, Tr.supportColComments, Tr.supportColDate, ""].map((h,i)=>(
                          <th key={i} style={{ padding:"10px 14px", textAlign:"left", fontSize:12, fontWeight:700, color:"var(--text-muted)", borderBottom:"1px solid var(--border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHelpPosts.map(p => (
                        <tr key={p.id} style={{ borderBottom:"1px solid var(--border)" }}>
                          <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600 }}>{p.authorDisplayName}</td>
                          <td style={{ padding:"10px 14px", fontSize:12, maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.content || (p.repostOf ? `[repost] ${p.repostOf.content}` : "")}</td>
                          <td style={{ padding:"10px 14px", fontSize:11, color:"var(--text-muted)" }}>{(p.tags||[]).slice(0,2).join(", ")}</td>
                          <td style={{ padding:"10px 14px", fontSize:13, textAlign:"center" }}>{p.commentCount || 0}</td>
                          <td style={{ padding:"10px 14px", fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                            {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : "—"}
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <button onClick={async()=>{ if(window.confirm("Delete?")){ await deleteDoc(doc(db,"helpPosts",p.id)); setHelpPosts(prev=>prev.filter(x=>x.id!==p.id)); } }}
                              style={{ fontSize:11, color:"#e8735a", background:"none", border:"none", cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>
                              {Tr.supportDeletePost}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Help Requests ── */}
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.75rem", flexWrap:"wrap" }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:"var(--text-primary)", margin:0 }}>
                  {Tr.supportReqsLabel} ({filteredHelpRequests.length}{filteredHelpRequests.length !== helpRequests.length ? ` / ${helpRequests.length}` : ""})
                  {helpRequests.filter(r=>!r.status||r.status==="pending").length > 0 && (
                    <span style={{ marginInlineStart:8, background:"#e8735a", color:"#fff", fontSize:10, fontWeight:700, borderRadius:99, padding:"2px 8px" }}>
                      {helpRequests.filter(r=>!r.status||r.status==="pending").length} {Tr.supportUnanswered}
                    </span>
                  )}
                </h3>
                <input
                  value={supportReqSearch} onChange={e => setSupportReqSearch(e.target.value)}
                  placeholder={Tr.supportFilterSearch}
                  style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:12, outline:"none", width:180 }}
                />
                {["all","pending","accepted","declined"].map(s => (
                  <button key={s} onClick={() => setSupportReqStatus(s)}
                    style={{ padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      background: supportReqStatus===s ? "#4472b8" : "var(--bg-secondary)",
                      color: supportReqStatus===s ? "#fff" : "var(--text-muted)",
                      border: `1.5px solid ${supportReqStatus===s ? "#4472b8" : "var(--border)"}`,
                    }}>
                    {s==="all"?Tr.supportFilterAll:s==="pending"?Tr.supportPending:s==="accepted"?Tr.supportAccepted:Tr.supportDeclined}
                  </button>
                ))}
              </div>
              {helpRequests.length === 0 ? (
                <p style={{ color:"var(--text-muted)", fontSize:13 }}>{Tr.supportNoReqs}</p>
              ) : filteredHelpRequests.length === 0 ? (
                <p style={{ color:"var(--text-muted)", fontSize:13 }}>—</p>
              ) : (
                <div className="card admin-table-card" style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
                    <thead>
                      <tr style={{ background:"var(--bg-secondary)" }}>
                        {[Tr.supportReqFrom, Tr.supportReqTo, Tr.supportReqMsg, Tr.supportReqStatus, Tr.supportReqDate, ""].map((h,i)=>(
                          <th key={i} style={{ padding:"10px 14px", textAlign:"left", fontSize:12, fontWeight:700, color:"var(--text-muted)", borderBottom:"1px solid var(--border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHelpRequests.map(r => {
                        const st = r.status || "pending";
                        const stColor = st==="accepted" ? "#4ade80" : st==="declined" ? "#e8735a" : "#f59e0b";
                        const stLabel = st==="accepted" ? Tr.supportAccepted : st==="declined" ? Tr.supportDeclined : Tr.supportPending;
                        return (
                          <tr key={r.id} style={{ borderBottom:"1px solid var(--border)", background: st==="pending" ? (lang==="ar"||lang==="he" ? "rgba(232,115,90,0.04)" : "rgba(232,115,90,0.04)") : "none" }}>
                            <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600 }}>{r.fromUserName}</td>
                            <td style={{ padding:"10px 14px", fontSize:13 }}>{r.toUserName}</td>
                            <td style={{ padding:"10px 14px", fontSize:12, color:"var(--text-muted)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.message || "—"}</td>
                            <td style={{ padding:"10px 14px" }}>
                              <span style={{ background:stColor+"22", color:stColor, fontSize:11, fontWeight:700, borderRadius:99, padding:"2px 8px" }}>{stLabel}</span>
                            </td>
                            <td style={{ padding:"10px 14px", fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                              {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString() : "—"}
                            </td>
                            <td style={{ padding:"10px 14px" }}>
                              <button onClick={async()=>{ if(window.confirm(lang==="he"?"למחוק בקשה זו?":lang==="ar"?"حذف هذا الطلب؟":"Delete this request?")){ await deleteDoc(doc(db,"helpRequests",r.id)); setHelpRequests(prev=>prev.filter(x=>x.id!==r.id)); }}}
                                style={{ fontSize:11, color:"#e8735a", background:"none", border:"none", cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>
                                {Tr.deleteLbl}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ BLACKLIST TAB ══ */}
      {tab === "blacklist" && (
        <div>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, marginBottom:"1rem" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Outfit',sans-serif" }}>
              {Tr.blacklistTab} <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)" }}>({blacklist.length})</span>
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
                {blacklistAdding ? "…" : Tr.blacklistAddBtn}
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
                    {[Tr.blacklistEmail, Tr.blacklistReason, Tr.addedByLabel, Tr.reportDate, ""].map(h => (
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
          <h2 style={{ fontSize:18, fontWeight:800, color:"var(--text-primary)", marginBottom:"1rem" }}>{Tr.slideshowTitle}</h2>
          <SlideshowAdmin Tr={Tr} />
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
          cancelLabel={Tr.cancel}
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
          cancelLabel={Tr.cancel}
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
          cancelLabel={Tr.cancel}
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
