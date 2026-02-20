# 03_Backend_Auth: Fill-A-Hole Firebase Backend

This directory contains the Firebase backend logic, Cloud Functions, and Firestore Security Rules that power the Fill-A-Hole application. It serves as the bridge between the UI mockups and the actual data store.

## Current Implementation Status

We have successfully implemented the core database schema validations and three critical automated background processes required by the React Native UI.

### 1. Database Security & Structure
- **`firestore.rules`**: Contains security rules and data validation logic for:
  - `users`: Citizen profiles, points, and role management.
  - `posts`: Civic issue reports, lock-downs for author-only edits.
  - `ngo_forms`: Custom questionnaire schemas restricted to NGOs/Admins.
  - `chats` & `messages`: System and group chat data structures.
- **`firestore.indexes.json`**: Pre-built compound indexes for rapid UI filtering (e.g., sorting unresolved community issues by date).

### 2. Implemented Cloud Functions
- **`verifyImage`**: (REST Webhook)
  - Processes images captured by the UI's GeoCamera.
  - Uses `exif-parser` to extract embedded GPS and timestamp data.
  - Evaluates the EXIF data against the user's reported coordinates using the Haversine formula.
  - Automatically calculates a `trustScore` (0-100) and flags the photo as `isVerified` if >90, updating the Firestore post.
- **`notifyNearbyUsers`**: (Firestore Trigger)
  - Listens for new `posts` that are tagged "Urgent" or achieve "Verified" status.
  - Calculates a 500-meter geo-fence bounding box using `geofire-common`.
  - Queries all `users` located within that region and dispatches targeted push notifications using Firebase Cloud Messaging (FCM).
- **`estimateResources`**: (Firestore Trigger)
  - Listens for posts where `isCommunitySolvable` is marked true.
  - Utilizes the Google Generative AI SDK (`gemini-2.5-flash`) via the `GEMINI_API_KEY`.
  - Analyzes the issue title and description to intelligently estimate `volunteersNeeded`, `fundsRequired`, and an array of `materialsNeeded`, saving the structured JSON object back into the `posts` document for the UI to display.

## Running Locally / Next Steps
1. The backend is implemented but needs an active Firebase Project to host it.
2. Initialize Firebase using `firebase use <project-id>`.
3. Set the Gemini API key: `firebase functions:secrets:set GEMINI_API_KEY`.
4. Deploy the infrastructure using `firebase deploy`.
