import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export async function logActivity({ type, actorId, actorName, targetId = null, targetType = null, details = {} }) {
  try {
    await addDoc(collection(db, "activityLogs"), {
      type,         // 'signup' | 'login' | 'post' | 'comment' | 'comment_delete' | 'comment_edit' | 'post_delete' | 'post_edit' | 'request_sent' | 'request_accepted' | 'request_declined' | 'profile_update' | 'admin_edit_profile' | 'admin_delete_post' | 'admin_delete_comment'
      actorId,
      actorName,
      targetId,     // postId / userId / commentId / requestId
      targetType,   // 'post' | 'user' | 'comment' | 'request'
      details,      // type-specific extra data (truncated text, field names, etc.)
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Activity log failed silently:", err);
  }
}
