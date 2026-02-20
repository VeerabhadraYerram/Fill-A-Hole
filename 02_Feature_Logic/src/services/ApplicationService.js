import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/**
 * ApplicationService
 * Manages the logic for volunteer applications via dynamic forms from NGOs.
 */
export class ApplicationService {
  /**
   * Submits a volunteer application using a dynamically generated form response.
   * Integrates with /03_Backend_Auth for identity verification.
   * @param {Object} db - The initialized Firestore instance
   * @param {string} userId - The UID of the applicant
   * @param {string} jobPostId - The ID of the job posting
   * @param {Object} formResponse - The JSON payload of their answers
   * @returns {Promise<string>} - Returns the new applicationId
   */
  static async submitApplication(db, userId, jobPostId, formResponse) {
    if (!userId || !jobPostId || !formResponse) {
      throw new Error("Missing required fields for application submission.");
    }

    // 1. Verify User Identity (via /03_Backend_Auth mock abstraction)
    const userDocRef = doc(collection(db, "users"), userId);
    const userSnapshot = await getDoc(userDocRef);
    let userStats = { badges: [], trustScore: 0 };
    if (userSnapshot.exists()) {
      userStats = userSnapshot.data().stats || {};
    }

    // 2. Prepare the Payload
    const applicationId = uuidv4();
    const appPayload = {
      applicationId,
      userId,
      jobPostId,
      formResponse,
      status: "Submitted", // Initial Status
      applicantContext: {
        badges: userStats.badges || [],
        volunteerHours: userStats.volunteerHours || 0,
        trustScore: userStats.trustScore || 0
      },
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewerId: null
    };

    // 3. Store Application (Atomic Batch)
    const batch = writeBatch(db);

    // Save under the central ngo_applications pool for admin review
    const applicationRef = doc(collection(db, "ngo_applications"), applicationId);
    batch.set(applicationRef, appPayload);

    // Also update the volunteer's personal record array
    batch.update(userDocRef, {
      ngoApplications: arrayUnion({
        jobPostId: jobPostId,
        formId: applicationId,
        status: "Submitted"
      })
    });

    await batch.commit();

    return applicationId;
  }

  /**
   * Allows NGOs to review an application and update the status.
   * @param {Object} db - The initialized Firestore instance
   * @param {string} applicationId - The target application ID
   * @param {string} status - New state: "Accepted" / "Rejected" / "Under Review"
   * @param {string} reviewerId - Admin UID performing the action
   * @returns {Promise<void>}
   */
  static async updateApplicationStatus(db, applicationId, status, reviewerId) {
    const allowedStatuses = ["Accepted", "Rejected", "Under Review"];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid Status. Must be one of: ${allowedStatuses.join(", ")}`);
    }

    const applicationRef = doc(collection(db, "ngo_applications"), applicationId);
    const snap = await getDoc(applicationRef);
    if (!snap.exists()) {
      throw new Error("Application not found");
    }

    const applicationData = snap.data();

    // Batch for dual updates
    const batch = writeBatch(db);

    // 1. Update central Application
    batch.update(applicationRef, {
      status: status,
      reviewedAt: serverTimestamp(),
      reviewerId: reviewerId
    });

    // 2. We must also update the specific user's `ngoApplications` array.
    // In NoSQL arrays of objects are hard to mutate inline.
    // Real implementation requires reading the array, filtering out the old one,
    // and arrayUnioning the new one. Or storing as subcollection instead.
    
    const userRef = doc(collection(db, "users"), applicationData.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updatedApplications = (userData.ngoApplications || []).map((app) => {
        if (app.formId === applicationId) {
          return { ...app, status: status };
        }
        return app;
      });

      batch.update(userRef, {
         ngoApplications: updatedApplications
      });
    }

    await batch.commit();
  }
}
