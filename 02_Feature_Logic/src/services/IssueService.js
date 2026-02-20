import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/**
 * IssueService
 * Handles the creation, validation, and submission of new civic issues.
 */
export class IssueService {
  /**
   * Validates the input data for a new issue.
   * @param {Object} data - The issue data from the UI Form
   * @throws {Error} If validation fails
   */
  static validateIssueData(data) {
    if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
      throw new Error("Invalid title: Title is required and must be a string.");
    }
    if (!data.description || typeof data.description !== "string" || data.description.trim().length === 0) {
      throw new Error("Invalid description: Description is required and must be a string.");
    }
    if (!data.category) {
      throw new Error("Invalid category: Category is required.");
    }
    
    // Validate Media and GPS Lock
    if (!data.media || !Array.isArray(data.media) || data.media.length === 0) {
      throw new Error("Invalid media: At least one geotagged photo is required.");
    }

    if (!data.verificationData || !data.verificationData.gpsAccuracy) {
      throw new Error("Invalid verification data: GPS Accuracy is missing. Have you used the GeoCamera?");
    }

    if (data.verificationData.gpsAccuracy > 50) {
      // Integration Point with /04_GIS_Media: Reject poor GPS accuracy
      throw new Error("Poor GPS Lock: Accuracy must be less than 50 meters.");
    }

    if (!data.location || !data.location.latitude || !data.location.longitude) {
      throw new Error("Invalid location: Latitude and Longitude are required.");
    }
  }

  /**
   * Creates a new civic issue report and its associated group chat.
   * @param {Object} db - The initialized Firestore instance
   * @param {Object} issueData - The verified issue payload from UI components
   * @param {string} userUid - The UID of the authenticated user submitting the issue
   * @returns {Promise<string>} - Returns the created postId
   */
  static async submitIssue(db, issueData, userUid) {
    // 1. Validation
    this.validateIssueData(issueData);

    const postId = uuidv4();
    const chatRoomId = `chat_${postId}`;

    // 2. Prepare the Post Document (as per Schema in INTEGRATION_GUIDE.md)
    const postPayload = {
      postId: postId,
      authorUid: userUid,
      category: issueData.category,
      tags: issueData.tags || [],
      status: "Open", // Initial status
      location: {
        latitude: issueData.location.latitude,
        longitude: issueData.location.longitude,
        address: issueData.location.address || "",
        geohash: issueData.location.geohash || "",
        gpsAccuracy: issueData.verificationData.gpsAccuracy,
      },
      media: issueData.media,
      verificationData: {
        trustScore: issueData.verificationData.trustScore || 0,
        isVerified: issueData.verificationData.trustScore > 90,
        checksPassed: issueData.verificationData.checksPassed || [],
      },
      aiEstimate: {
        volunteersNeeded: 0,
        fundsRequired: 0,
        materials: []
      },
      engagement: {
        upvotes: 0,
        volunteersJoined: [],
        fundsRaised: 0
      },
      chatRoomId: chatRoomId,
      createdAt: serverTimestamp()
    };

    // 3. Prepare the associated default Chat Document
    const chatPayload = {
      id: chatRoomId,
      postId: postId,
      title: issueData.title, // Or `Issue @ ${issueData.location.address}`
      participantIds: [userUid],
      lastMessage: {
        text: "Chat created. Let's fix this issue!",
        senderId: "SYSTEM",
        senderName: "System",
        timestamp: serverTimestamp()
      },
      pinnedTask: `Resolve: ${issueData.title}`,
      updatedAt: serverTimestamp()
    };

    // 4. Atomic Write using Batch
    const batch = writeBatch(db);
    
    // Post Doc
    const postRef = doc(collection(db, "posts"), postId);
    batch.set(postRef, postPayload);
    
    // Chat Doc
    const chatRef = doc(collection(db, "chats"), chatRoomId);
    batch.set(chatRef, chatPayload);
    
    // Init message in chat
    const initialMessageRef = doc(collection(db, `chats/${chatRoomId}/messages`));
    batch.set(initialMessageRef, {
      id: initialMessageRef.id,
      senderId: "SYSTEM",
      senderName: "System",
      text: "Chat created. Let's fix this issue!",
      type: "system",
      isReadBy: [userUid],
      timestamp: serverTimestamp()
    });

    await batch.commit();

    // 5. Trigger Async AI logic silently in the background
    // (This integrates with /05_Systems_AI)
    this.triggerAIAnalysisAsync(postId, postPayload.description);

    return postId;
  }

  /**
   * Triggers the AI analysis. A backend function (Cloud Function) or a background worker
   * should ideally pick this up, but here we provide the service layer hook.
   * @param {string} postId - The ID of the created post
   * @param {string} description - The description to analyze
   */
  static triggerAIAnalysisAsync(postId, description) {
    // In a real application, this could either:
    // A. Make an HTTP POST to an LLM microservice
    // B. Call a Firebase Callable Function: `httpsCallable(functions, 'analyzeIssue')(...)`
    // C. The backend could simply listen to `onCreate` Firestore triggers and update it automatically.
    
    console.log(`[Integration /05_Systems_AI] Triggering AI estimate for Post ${postId}...`);
    // Mock Async Trigger
    setTimeout(() => {
        console.log(`AI Analysis complete for ${postId} (mock)`);
    }, 1000);
  }
}
