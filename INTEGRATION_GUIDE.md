# Fill-A-Hole: Integration Guide & Team Handoff

This document lists all the developed UI components and the proposed database schema (Firebase/Firestore) so that the Feature Logic, Backend/Auth, GIS/Media, and Systems AI teams can start connecting their code independently.

## 1. UI Components (Developed by 01_UI_Architect)

The Flutter UI is located in `01_UI_Architect/fill_a_hole_ui/lib/`. The following major screens/components are ready to be wired up with backend logic:

*   **SplashScreen (`screens/splash_screen.dart`)**
    *   3-page `PageView` for onboarding.
    *   **Action Needed:** Integrate `shared_preferences` to show this only on the first app launch.
*   **LoginScreen (`screens/login_screen.dart`)**
    *   Phone number input field and a "Continue with Google" button.
    *   **Action Needed:** Wire up Firebase Phone Authentication (`firebase_auth`) and Google Sign-In.
*   **OtpScreen (`screens/otp_screen.dart`)**
    *   4-digit OTP input boxes.
    *   **Action Needed:** Verify the SMS code with Firebase Auth and handle user session creation.
*   **HomeDashboard (`screens/home_dashboard.dart`)**
    *   Top section: User greeting & Current Location.
    *   Middle section: 40% height `GoogleMap` widget showing nearby issues.
    *   Bottom section: `DraggableScrollableSheet` with a horizontally scrolling list of "Hot Issues".
    *   **Action Needed:** Fetch real user data, fetch current GPS coordinates, query Firestore for nearby posts, and populate the map markers and issue cards.
*   **MapScreen (`screens/map_screen.dart`)**
    *   Full-screen `GoogleMap` with category filter chips (Urgent, Infrastructure, Safety, etc.) and a Search bar.
    *   **Action Needed:** Implement spatial queries (e.g., GeoFlutterFire) to fetch geolocated posts dynamically as the map pans and implement search by text.
*   **CreatePostWizard (`screens/create_post_wizard.dart`)**
    *   Step 1: Photo & Location (Currently mockup).
    *   Step 2: Category & Tags.
    *   Step 3: Title, Description (with voice mic mockup), and "Community Solvable" AI toggle.
    *   Step 4: Preview and Submit.
    *   **Action Needed:** Wire up `image_picker` (04_GIS_Media), fetch EXIF GPS data (04_GIS_Media), integrate Gemini API for AI suggestions (05_Systems_AI), and write the final document to Firestore + Firebase Storage.
*   **FeedScreen (`screens/feed_screen.dart`)**
    *   Tabs: Nearby, Trending, All.
    *   List of posts with upvote counts, volunteer counts, and time elapsed.
    *   **Action Needed:** Implement Firestore pagination for the feed, sort by timestamp/upvotes/location.
*   **PostDetailScreen (`screens/post_detail_screen.dart`)**
    *   Hero image, upvote button, description, volunteer progress bar, "Volunteer Now", and "Donate" buttons. Comment section at the bottom.
    *   **Action Needed:** Real-time Firestore stream for the specific post document, subcollection stream for comments, and handle UPI deep-linking for donations.
*   **MessagesScreen & GroupChatScreen (`screens/messages_screen.dart`, `screens/group_chat_screen.dart`)**
    *   List of active chats the user has joined and the real-time chat UI with pinned messages.
    *   **Action Needed:** Implement real-time Firestore chat subcollections and push notifications.
*   **ProfileScreen (`screens/profile_screen.dart`)**
    *   User stats (Reported, Completed, Coins), Level badges, and streak count.
    *   **Action Needed:** Fetch aggregated statistics from the user's Firestore document.

---

## 2. Proposed Database Schema (Firestore)

The backend team (`03_Backend_Auth`) should set up the following Firestore collections:

### Collection: `users`
Stores all user information (Citizens, Volunteers, NGOs).
```json
{
  "uid": "abc123xyz...",
  "phoneNumber": "+919999999999",
  "displayName": "Koushik",
  "photoUrl": "https://...",
  "role": "citizen", // 'citizen', 'volunteer', 'ngo', 'authority'
  "fcmToken": "token...",
  "stats": {
    "reportsCreated": 12,
    "tasksCompleted": 28,
    "peopleHelped": 340,
    "civicCoins": 1245,
    "currentStreak": 13
  },
  "level": "Lane Guardian - Level 7",
  "createdAt": Timestamp
}
```

### Collection: `posts` (Reports/Issues)
The core collection storing all civic issues reported on the app.
```json
{
  "postId": "post_xyz123",
  "authorId": "user_uid",
  "title": "Massive Pothole on MG Road",
  "description": "Deep pothole causing accidents.",
  "category": "Infrastructure", // Infrastructure, Safety, Garbage, etc.
  "tags": ["Pothole", "Road Damage", "Urgent"],
  "location": GeoPoint(16.5062, 80.6480), // Firestore GeoPoint
  "geohash": "tgf...", // For spatial queries (GeoFlutterFire)
  "addressText": "MG Road, near Circle 3, Vijayawada",
  "photoUrls": ["https://storage..."], // Array of Firebase Storage URLs
  "status": "open", // open, volunteering, in_progress, resolved
  "isCommunitySolvable": true, // Toggle from Step 3
  
  // Volunteer Tracking
  "volunteersNeeded": 5,
  "volunteersJoined": 3,
  "volunteerUids": ["user1", "user2", "user3"],
  
  // Metrics
  "upvoteCount": 124,
  "createdAt": Timestamp,
  "resolvedAt": null // Timestamp when resolved
}
```

### Subcollection: `posts/{postId}/comments`
Stores discussion on a specific post.
```json
{
  "commentId": "com_123",
  "authorId": "user_uid",
  "authorName": "Ravi",
  "text": "I can bring 1 bag of cement.",
  "createdAt": Timestamp
}
```

### Collection: `chats` (Group Chats for Posts)
Created automatically when a post gets its first volunteer, or for dedicated community groups.
```json
{
  "chatId": "chat_post_xyz123", // Usually mirrors the postId
  "postId": "post_xyz123",
  "name": "Pothole @ MG Road",
  "pinnedMessage": "Task: Fill pothole by Sunday. Progress: 3/5",
  "memberUids": ["user1", "user2", "user3"],
  "lastMessage": "I will bring the cement tomorrow.",
  "lastMessageAt": Timestamp
}
```

### Subcollection: `chats/{chatId}/messages`
Individual real-time chat messages inside a group.
```json
{
  "messageId": "msg_001",
  "senderId": "user_uid",
  "senderName": "Koushik",
  "text": "I can be there at 9 AM tomorrow. Let's get this done!",
  "imageUrl": null, // If they send a photo proof
  "type": "text", // 'text', 'image', 'system' (e.g. "User joined")
  "createdAt": Timestamp
}
```

---

## Next Steps for Teams:

1.  **`03_Backend_Auth`**: Initialize a Firebase project, configure Authentication (Phone + Google), set up Firestore rules based on the schema above, and integrate `firebase_core`.
2.  **`04_GIS_Media`**: Implement the `image_picker` logic in `create_post_wizard.dart` (Step 1). Extract EXIF location data from photos to auto-fill the map pin, and implement Firebase Storage uploads. Write the spatial queries for `map_screen.dart` and `home_dashboard.dart`.
3.  **`02_Feature_Logic`**: Connect the State Management (Provider/Riverpod/BLoC). Connect `home_dashboard.dart`, `feed_screen.dart`, and `post_detail_screen.dart` to listen to Firestore streams. Handle the upvote/volunteer logic.
4.  **`05_Systems_AI`**: Implement the Gemini API call in `create_post_wizard.dart` (Step 3). When the user types a description and turns on "Community Solvable", the AI should parse the text and auto-suggest required materials/volunteers.
