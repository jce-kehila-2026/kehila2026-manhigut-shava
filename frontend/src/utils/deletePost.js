import { doc, getDoc, getDocs, deleteDoc, collection } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

function storagePathFromUrl(url) {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function deletePostWithCleanup(postId) {
  const postSnap = await getDoc(doc(db, "posts", postId));

  if (postSnap.exists()) {
    const post = postSnap.data();

    // Delete media files from Storage
    if (post.media?.length) {
      await Promise.allSettled(
        post.media.map(({ url, storagePath }) => {
          const path = storagePath || storagePathFromUrl(url);
          if (!path) return Promise.resolve();
          try {
            return deleteObject(ref(storage, path));
          } catch {
            return Promise.resolve();
          }
        })
      );
    }

    // Delete comments subcollection
    const commentsSnap = await getDocs(collection(db, "posts", postId, "comments"));
    await Promise.allSettled(commentsSnap.docs.map((d) => deleteDoc(d.ref)));
  }

  await deleteDoc(doc(db, "posts", postId));
}
