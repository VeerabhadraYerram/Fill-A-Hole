import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  runTransaction
} from "firebase/firestore";

/**
 * firestoreQueries
 * Helper functions to construct common database queries and transactions.
 */
export class FirestoreQueries {
  /**
   * Query builder: fetch active issues filtered by category and sorted by creation date.
   * @param {Object} db - Firestore instance
   * @param {string} category - Issue category filter (e.g., "Infrastructure")
   * @param {string} status - Issue status filter (e.g., "Open")
   * @param {number} limitCount - Maximum number of documents to return
   * @returns {Promise<Array>} Array of post objects
   */
  static async getFilteredPosts(db, category, status, limitCount = 20) {
    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("category", "==", category),
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Subcollection handler: fetch all threaded comments for a given post.
   * @param {Object} db - Firestore instance
   * @param {string} postId - The parent post ID
   * @returns {Promise<Array>} Array of comment objects
   */
  static async getCommentsForPost(db, postId) {
    const commentsRef = collection(db, `posts/${postId}/comments`);
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Transaction handler: Atomic upvote incrementing to avoid race conditions.
   * Ensures multiple concurrent users upvoting a post simultaneously won't clash.
   * @param {Object} db - Firestore instance
   * @param {string} postId - The target post ID
   * @throws {Error} If post doesn't exist
   */
  static async upvotePostAtomically(db, postId) {
    const postRef = doc(db, "posts", postId);

    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(postRef);
      if (!sfDoc.exists()) {
        throw new Error("Post does not exist!");
      }

      // We read the current upvote count, and atomically update it
      const currentEngagement = sfDoc.data().engagement || {};
      const newUpvotes = (currentEngagement.upvotes || 0) + 1;

      transaction.update(postRef, {
        "engagement.upvotes": newUpvotes
      });
    });

    return true;
  }
}
