import { jest } from "@jest/globals";
import { IssueService } from "../src/services/IssueService.js";
import { writeBatch } from "firebase/firestore";

// Setup mocks
jest.unstable_mockModule("uuid", () => ({ v4: () => "mock-uuid" }));
jest.unstable_mockModule("firebase/firestore", () => ({
  collection: jest.fn((db, path) => ({ db, path })),
  doc: jest.fn((collection, id) => ({ collection, id })),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(true)
  }))
}));

// We need to import the mocked modules dynamically AFTER `unstable_mockModule` in ES Modules tests inside Jest.
const { IssueService: MockedIssueService } = await import("../src/services/IssueService.js");
const { writeBatch: mockedWriteBatch } = await import("firebase/firestore");

describe("IssueService Unit Tests", () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {}; // Pass an empty object representing Firestore db instance
    jest.clearAllMocks();
  });

  describe("Validation Tests", () => {
    it("should throw error if title is missing", () => {
      const invalidData = {
        description: "A huge pothole",
        category: "Infrastructure",
      };
      expect(() => MockedIssueService.validateIssueData(invalidData)).toThrow("Invalid title");
    });

    it("should throw error if GPS accuracy is poor (> 50m)", () => {
      const invalidData = {
        title: "Pothole",
        description: "A huge pothole",
        category: "Infrastructure",
        media: ["http://image.png"],
        location: { latitude: 12.3, longitude: 45.6 },
        verificationData: {
          gpsAccuracy: 100 // Failing condition
        }
      };
      expect(() => MockedIssueService.validateIssueData(invalidData)).toThrow("Poor GPS Lock");
    });

    it("should throw error if media is missing", () => {
        const invalidData = {
          title: "Pothole",
          description: "A huge pothole",
          category: "Infrastructure",
          media: [], // Failing condition
          location: { latitude: 12.3, longitude: 45.6 },
          verificationData: { gpsAccuracy: 10 }
        };
        expect(() => MockedIssueService.validateIssueData(invalidData)).toThrow("Invalid media");
      });
  });

  describe("Happy Path Submit Issue", () => {
    const validData = {
      title: "Broken streetlight",
      description: "Streetlight at the corner is completely out.",
      category: "Safety",
      tags: ["Dark", "Urgent"],
      media: ["url-to-firebase-storage-image"],
      location: {
        latitude: 17.385,
        longitude: 78.486,
        address: "MG Road",
        geohash: "tepg",
      },
      verificationData: {
        gpsAccuracy: 12,
        trustScore: 95,
        checksPassed: ["GPS_LOCKED"]
      }
    };
    const userUid = "user-123";

    it("should successfully validate and batch write issue data", async () => {
      // Mock the triggerAIAnalysisAsync since it's an async side effect
      jest.spyOn(MockedIssueService, "triggerAIAnalysisAsync").mockImplementation(() => {});

      const result = await MockedIssueService.submitIssue(mockDb, validData, userUid);

      expect(result).toBe("mock-uuid");
      expect(MockedIssueService.triggerAIAnalysisAsync).toHaveBeenCalledWith("mock-uuid", validData.description);
    });

    it("integration format: ensures the final post schema structure matches specifications", async () => {
      jest.spyOn(MockedIssueService, "triggerAIAnalysisAsync").mockImplementation(() => {});

      // To test the payload, we must spy on writeBatch
      const dummyBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      };
      // Override the mock return for this test
      mockedWriteBatch.mockReturnValue(dummyBatch);
      
      await MockedIssueService.submitIssue(mockDb, validData, userUid);

      // The batch should be called to set multiple docs
      expect(dummyBatch.set).toHaveBeenCalledTimes(3); // Post, Chat Meta, Initial Chat Message
      
      // Let's assert the payload for the first batch.set call (which is the Post doc)
      const postPayloadCall = dummyBatch.set.mock.calls[0][1];
      
      expect(postPayloadCall).toMatchObject({
        postId: "mock-uuid",
        authorUid: "user-123",
        status: "Open",
        chatRoomId: "chat_mock-uuid",
        verificationData: {
            isVerified: true // Because trustscore > 90
        }
      });
      // Ensure AI Estimate field exists for /05_Systems_AI to consume
      expect(postPayloadCall).toHaveProperty("aiEstimate");
    });
  });
});
