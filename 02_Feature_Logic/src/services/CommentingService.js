import {
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/**
 * CommentingService
 * Provides the business logic for real-time nested/threaded comments on issues.
 */
export class CommentingService {
  /**
   * Adds a comment to a specific post's thread.
   * @param {Object} db - The initialized Firestore instance
   * @param {string} postId - The ID of the parent civic issue post
   * @param {string} authorUid - The UID of the user commenting
   * @param {Object} authorDetails - Denormalized data (name, avatar) of the user
   * @param {string} text - The comment content
   * @returns {Promise<string>} - Returns the created commentId
   */
  static async addComment(db, postId, authorUid, authorDetails, text) {
    if (!text || text.trim().length === 0) {
      throw new Error("Comment text cannot be empty.");
    }

    if (!authorDetails || !authorDetails.name) {
      throw new Error("Author Details (denormalized name) required for commenting.");
    }

    const commentId = uuidv4();
    const commentRef = doc(collection(db, `posts/${postId}/comments`), commentId);

    // According to Schema in INTEGRATION_GUIDE
    const commentPayload = {
      id: commentId,
      authorId: authorUid,
      authorName: authorDetails.name,
      authorAvatar: authorDetails.avatar || "",
      text: text,
      createdAt: serverTimestamp()
    };

    await setDoc(commentRef, commentPayload);

    return commentId;
  }
}
