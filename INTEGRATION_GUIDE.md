Fill-A-Hole: UI Components & Database Schema Report
This report outlines the complete set of User Interface (UI) components developed for the Fill-A-Hole application using React Native (Expo), alongside the comprehensive Firestore Database Schema required to support these features.

Part 1: React Native UI Components
The UI has been built using a modular, component-based approach with a global design system.

1. Global Design System (
src/core/theme.js
)
Colors: Primary Green (#00C853), Accent Teal (#00BFA5), Background (#F8F9FA), standard text and border colors.
Typography: Defined styles for displayLarge, displayMedium, bodyLarge, and bodyMedium.
Card Styling: Standardized elevation, shadow, and border-radius for cards.
2. Navigation & Routing (
App.js
, 
src/screens/MainScreen.js
)
Root Stack Navigator: Manages transitions between the Splash, Auth flow, Main App, and modal/detail screens.
Bottom Tab Navigator (
MainScreen.js
): The core app shell featuring 5 tabs (Home, Map, Feed, Messages, Profile) with persistent custom icons.
Floating Action Button (FAB): A custom absolute-positioned Report button on the MainScreen to quick-launch the Post Wizard.
3. Developed Screens
Authentication & Onboarding
SplashScreen.js
: A swipeable 3-page onboarding wizard using react-native-pager-view detailing the app's value proposition.
LoginScreen.js
: Phone number input interface with a stylized "+91" prefix, "Send OTP" button, and a "Continue with Google" secondary option. Wrapped in KeyboardAvoidingView.
OtpScreen.js
: A 4-digit OTP input form with automatic focus-advancement between fields.
Core Dashboard & Map
HomeDashboard.js
:
Top 40%: react-native-maps instance centered on the user's location.
Bottom 60%: A visually distinct bottom sheet style container.
Features a horizontally scrolling ScrollView of "Hot Issues Near You" cards.
MapScreen.js
: Full-screen map view with colored markers indicating issue status (Red=Infrastructure, Orange=Safety, Blue=Cleanliness, Green=Resolved). Includes a floating search bar, horizontal filter chips, and a legend.
#### Reporting Flow
*   **`CreatePostWizard.js`**: A robust 4-step wizard using `react-native-pager-view` and a custom linear progress bar.
    *   *Step 1*: GeoCamera Viewport mock showing a simulated live camera feed with an overlay of GPS coordinates, timestamp, and accuracy.
    *   *Step 2*: Category selection grid and selectable Tag chips.
    *   *Step 3*: Title and Description inputs. Includes a custom `Community Solvable` toggle switch with an AI suggestion text block.
    *   *Step 4*: A final Preview card summarizing all inputted details before submission.

#### Community & Engagement
*   **`HomeDashboard.js`**: Redesigned as the primary "Reddit-style" feed. Features a vertically scrolling `FlatList` of large issue cards containing the author's avatar, timestamp, severe images, and direct action buttons for Upvoting and Commenting.
*   **`MapScreen.js`**: A full-canvas interactive map showing distinct pins for distinct categories. It features a floating Search bar and a scrollable filter chip bar at the bottom.
*   **`FeedScreen.js`**: Integrates `@react-navigation/material-top-tabs` to categorize posts (Nearby, Trending, All), each rendering a highly-styled FlatList of issue cards summarizing upvotes and volunteers.
*   **`PostDetailScreen.js`**: A comprehensive screen for a single issue. Highlights include a massive hero image, floating tags (e.g., "Safety"), progress bars tracking required vs joined volunteers, and distinct CTA buttons to Volunteer, Donate, or Chat.

#### Messaging & Profile
*   **`MessagesScreen.js`**: A `FlatList` of active group chats, displaying avatars, subtext previews, timestamps, and bold unread message count badges.
*   **`GroupChatScreen.js`**: A real-time chat interface showing a "Pinned Task" banner, customized chat bubbles (System, Me, Other), and a keyboard-avoiding text input area with attachment options.
*   **`ProfileScreen.js`**: Displays user stats in a 4-column grid (Reported, Completed, Helped, Coins). Includes a mock "Impact Zone" map, a horizontally scrolling "Earned Badges" section, and a detailed vertical "Contributions History" list showing recent civic activities with their current statuses.---

## 2. Updated Project Structure (React Native Layout)

```
01_UI_Architect/fill_a_hole_ui/
├── App.js                     # Root Navigation (Stack + SafeArea)
├── app.json                   # Expo Config
├── src/
│   ├── core/
│   │   └── theme.js           # Centralized Design System (Colors, Typography)
│   ├── components/
│   │   ├── TrustAIComponents.js    # VerificationBadge, AIResourceSuggestionChip, AILoadingIndicator, GPSStrengthIndicator
│   │   ├── GeoFencingComponents.js # GeoAlertBanner, ProximityPushNotification, RadarPingMapOverlay
│   │   └── NGOFormComponents.js    # DynamicFormBuilder, FormRenderer, QuestionCard, ApplicationStatusWizard
│   ├── screens/
│   │   ├── SplashScreen.js    # PagerView onboarding (Lottie animations)
│   │   ├── LoginScreen.js     # Phone auth with formatting
│   │   ├── OtpScreen.js       # 4-digit auto-advancing OTP
│   │   ├── MainScreen.js      # Bottom Tab Navigator + Floating Create FAB
│   │   ├── HomeDashboard.js   # Greeting, High-level Map, 'Hot Issues' horizontal scroll
│   │   ├── MapScreen.js       # Full-screen map (react-native-map-clustering), Search, Filters, Radar Ping
│   │   ├── FeedScreen.js      # 'Nearby', 'Trending', 'All' Material Top Tabs + Verification Badges
│   │   ├── CreatePostWizard.js# 4-Step Wizard (Replaces Static Photo with GeoCamera link)
│   │   ├── PostDetailScreen.js# Issue specifics, Progress trackers, Chat/Donate CTAs, AI chips, GeoTags
│   │   ├── MessagesScreen.js  # Active Group Chats List
│   │   ├── GroupChatScreen.js # Real-time chat UI with System/User bubbles
│   │   ├── ProfileScreen.js   # Stats, Badges, History, Impact Zone mock
│   │   ├── GeoCameraScreen.js # Fullscreen camera requiring GPS lock (EXIF generation)
│   │   ├── VerificationStatusScreen.js # Calculates Trust Score (0-100) vs checklist
│   │   ├── IssuesListScreen.js# Exploded list of all issues with Search Bar
│   │   └── NGOFormsScreen.js  # Dynamic admin/volunteer form parsing & tracking
```

## 4. Architectural Enhancements & Key Logic Interfaces

The React Native application has been heavily expanded to support high-trust, data-driven civic moderation. These integrations require specific backend handlers in Python/Node to function fully:

### A. Trust, Verification, & GeoCamera
*   **The Problem:** Standard image pickers allow users to upload old, edited, or downloaded photos from the internet, ruining platform credibility.
*   **The Solution (`GeoCameraScreen`):** A custom camera overlay that reads hardware-level GPS data. It **blocks the shutter button** unless the device has a strong GPS Lock (<50m accuracy).
*   **Backend Requirement:** The Node.js/Python backend must accept the image, read the embedded EXIF data, compute the delta between the reported location and the EXIF location, verify the timestamp isn't altered, and return a `trustScore` (0-100). The app's `VerificationStatusScreen` visually breaks down this score. Posts scoring >90 receive a Green `VerificationBadge`.

### B. Scalable Mapping & Geo-Fencing
*   **The Problem:** Rendering >500 individual `react-native-maps` markers crashes the mobile UI. Users are unnotified about nearby issues.
*   **The Solution (`react-native-map-clustering` & `RadarPingMapOverlay`):** The `MapScreen` clusters dense regions automatically. A radar animation visualizes the active geo-fence radius.
*   **Backend Requirement:** Mobile devices should send their background coordinates to the backend payload. If the backend detects a new "Urgent/Verified" issue within a 500m radius of an active user's geohash, it fires an APNs/FCM payload to trigger the `ProximityPushNotification` / `GeoAlertBanner`.

### C. NGO Questionnaire Engine
*   **The Component Suite:** Reusable tools (`DynamicFormBuilder`, `FormRenderer`, `QuestionCard`) allow NGOs to build custom JSON-defined onboarding forms without developer intervention.
*   **Backend Requirement:** Firestore `ngo_forms` collection needs to store dynamic JSON arrays representing the question schema. `ApplicationStatusWizard` tracks the progression of these document submissions.

### D. AI Resource Estimation
*   **The UI Component:** `AILoadingIndicator` (pulsing animation) and `AIResourceSuggestionChip` (styled output pills) exist natively on `CreatePostWizard` and `PostDetailScreen`.
*   **Backend Requirement:** Upon submitting a post (or toggling 'Community Solvable'), the backend AI service parses the post description using an LLM to auto-populate the `aiEstimate` object in Firestore (e.g., extracting "Requires 3 volunteers and 2 cement bags").
### Part 2: Required Database Schema (Firestore)

To support the UI built above, the `03_Backend_Auth` and `02_Feature_Logic` teams should implement the following NoSQL document structures in Firebase Firestore.

NOTE

This schema is denormalized for fast reads on the mobile client. Data duplication (like storing user names in comments) is intentional to avoid heavy join queries.

#### Collection: `users`
*   `uid` (String): Firebase Auth UID
*   `phoneNumber` / `email` (String)
*   `displayName` (String)
*   `profileImageUrl` (String)
*   `role` (String: "citizen", "admin", "ngo", "govt")
*   `stats`:
    *   `points` (Number): Used for leaderboard
    *   `issuesReported` (Number)
    *   `issuesResolved` (Number)
    *   `volunteerHours` (Number)
*   `badges` (Array of Strings/Objects): E.g., `["First Report", "Civic Hero"]`
*   `contributionHistory` (Subcollection/Array): `{ actionType: "reported", targetId: "postX", timestamp: Date, status: "Resolved" }`
*   `ngoApplications` (Array of Objects): `{ ngoId: "org1", formId: "formA", status: "Under Review" }`

#### Collection: `posts` (Civic Issues)
*   `postId` (String): Auto-generated
*   `authorUid` (String): Reference to `users.uid`
*   `category` (String): "Infrastructure", "Safety", "Cleanliness"
*   `tags` (Array of Strings): ["Pothole", "Urgent"]
*   `status` (String): "Open", "InProgress", "Resolved"
*   `location`:
    *   `latitude` (Number)
    *   `longitude` (Number)
    *   `address` (String)
    *   `geohash` (String)
    *   `gpsAccuracy` (Number): Extracted from GeoCamera EXIF data
*   `media` (Array of Strings): URLs to Firebase Storage (Images/Videos)
*   `verificationData`:
    *   `trustScore` (Number): 0-100 calculated by backend upon upload
    *   `isVerified` (Boolean): True if Score > 90
    *   `checksPassed` (Array of Strings): `["GPS_LOCKED", "RECENT_CAPTURE", "NO_EXIF_TAMPERING"]`
*   `aiEstimate`:
    *   `volunteersNeeded` (Number)
    *   `fundsRequired` (Number)
    *   `materials` (Array of Strings)
*   `engagement`:
    *   `upvotes` (Number)
    *   `volunteersJoined` (Array of Strings/UIDs)
    *   `fundsRaised` (Number)
*   `chatRoomId` (String): Link to related group chat
*   `createdAt` (Timestamp)

#### Collection: `ngo_forms` (Dynamic Questionnaires)
*   `formId` (String)
*   `ngoUid` (String)
*   `title` (String)
*   `schema` (Array of Objects): `{ questionId: "q1", label: "Tools you have?", type: "multiple-choice", options: ["Shovel", "Broom"] }`

#### Collection: `comments` (Subcollection under `posts`)
```json
// Path: /posts/{postId}/comments/{commentId}
{
  "id": "comment_111",
  "authorId": "user_456",
  "authorName": "Ravi", // denormalized
  "authorAvatar": "https://...", // denormalized
  "text": "I can bring 1 bag of cement.",
  "createdAt": "Timestamp"
}
```

#### Collection: `chats`
Represents the metadata for group chats linked to specific community-solvable posts.

```json
// Path: /chats/{chatId}
{
  "id": "chat_xyz789",
  "postId": "post_abs123", // Link back to the issue
  "title": "Pothole @ MG Road",
  "participantIds": ["user_123", "user_456", "user_789"],
  "lastMessage": {
    "text": "I can be there at 9 AM tomorrow.",
    "senderId": "user_123",
    "senderName": "Koushik",
    "timestamp": "Timestamp"
  },
  "pinnedTask": "Fill pothole by Sunday. Progress: 3/5",
  "updatedAt": "Timestamp"
}
```

#### Subcollection: `messages` (Under `chats`)
The individual messages within a group chat. Includes system-generated messages.

```json
// Path: /chats/{chatId}/messages/{messageId}
{
  "id": "msg_999",
  "senderId": "user_123", // or "SYSTEM"
  "senderName": "Koushik",
  "text": "I can be there at 9 AM tomorrow. Let's get this done!",
  "type": "text", // 'text', 'image', 'system'
  "isReadBy": ["user_123", "user_456"], // Array of UIDs
  "timestamp": "Timestamp"
}
```