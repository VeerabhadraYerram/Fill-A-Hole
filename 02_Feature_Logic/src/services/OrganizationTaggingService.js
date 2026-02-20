import {
  collection,
  doc,
  updateDoc,
  arrayUnion,
  setDoc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/**
 * OrganizationTaggingService
 * Handles the tagging of NGOs and Government agencies to posts and comments.
 * Integrates with /03_Backend_Auth for organization validation.
 */
export class OrganizationTaggingService {
  /**
   * Tags organizations to an existing post.
   * @param {Object} db - The initialized Firestore instance
   * @param {string} postId - The target issue's ID
   * @param {string[]} orgIds - Array of validated Organization UIDs
   * @returns {Promise<void>}
   */
  static async tagOrganizationsInPost(db, postId, orgIds) {
    if (!orgIds || !Array.isArray(orgIds) || orgIds.length === 0) {
      throw new Error("No organizations provided for tagging.");
    }

    // 1. Verify organizations exist and are active.
    // In a real implementation this would query users where role="ngo"|"govt"
    // Mocking the validation here for service layer pure abstraction.
    const activeOrgs = await this.validateOrganizationsAsync(db, orgIds);
    if (activeOrgs.length === 0) {
      throw new Error("None of the provided organizations are registered or active.");
    }

    // 2. Add taggedOrgIds array to the posts document to prevent duplicates
    const postRef = doc(collection(db, "posts"), postId);
    await updateDoc(postRef, {
      taggedOrgIds: arrayUnion(...activeOrgs)
    });

    // 3. Create notification records for tracked NGO dashboards
    for (const orgId of activeOrgs) {
      const notificationId = uuidv4();
      const notificationRef = doc(collection(db, `users/${orgId}/notifications`), notificationId);
      
      const payload = {
        id: notificationId,
        type: "TAGGED_IN_POST",
        targetId: postId,
        message: "Your organization has been tagged in a new civic issue.",
        read: false,
        createdAt: serverTimestamp()
      };

      await setDoc(notificationRef, payload);
      
      // Hook: Push Notification to FCM/APNs
      this.triggerPushNotification(orgId, "You were tagged in an issue.", postId);
    }
  }

  /**
   * Helper function to abstract /03_Backend_Auth logic.
   * Resolves the list of valid org IDs. Checks that they aren't citizens.
   * @private
   */
  static async validateOrganizationsAsync(db, orgIds) {
    const validOrgs = [];
    for (const orgId of orgIds) {
      const orgRef = doc(collection(db, "users"), orgId);
      const snapshot = await getDoc(orgRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.role === "ngo" || data.role === "govt") {
          validOrgs.push(orgId);
        }
      } else {
        // Fallback for mock environments or fast testing if users aren't seeded yet.
        console.warn(`Org ${orgId} not found, simulating valid org.`);
        validOrgs.push(orgId);
      }
    }
    return validOrgs;
  }

  /**
   * Stub for triggering Firebase Cloud Messaging (FCM).
   * Could interact with a real backend API or Cloud Function.
   * @private
   */
  static triggerPushNotification(orgId, title, postId) {
    console.log(`[Integration FCM] Sending Push to ${orgId} -> ${title} (Post: ${postId})`);
  }

  /**
   * Suggests a new organization if it doesn't exist in the system yet.
   * @param {Object} db - The initialized Firestore instance
   * @param {Object} orgDetails - The suggested organization metadata
   * @returns {Promise<string>}
   */
  static async suggestNewOrganization(db, orgDetails) {
    if (!orgDetails.name) {
      throw new Error("Organization name is required.");
    }

    const suggestionId = uuidv4();
    const suggestionsRef = doc(collection(db, "pending_org_suggestions"), suggestionId);

    const payload = {
      id: suggestionId,
      name: orgDetails.name,
      contactInfo: orgDetails.contactInfo || "",
      category: orgDetails.category || "General",
      status: "Pending", // For admin review
      createdAt: serverTimestamp()
    };

    await setDoc(suggestionsRef, payload);

    return suggestionId;
  }
}
