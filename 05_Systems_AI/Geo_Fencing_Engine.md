# Geo-Fencing Notification Engine Architecture

This document outlines the architecture, logic, and database flow for the Fill-A-Hole scalable geo-fencing notification engine. This system is responsible for instantly alerting nearby citizen volunteers whenever a new civic issue is created within a 3km radius.

---

## 1. Core Distance Calculation Logic

To ensure the system scales to thousands of concurrent users, calculating the distance between the new post and every single user via the Haversine formula on the complete dataset is an $O(n)$ operation—this is too slow and expensive.

Instead, the system utilizes **Geohash Bounding Boxes** via `geofire-common` combined with a secondary Haversine filter.

1. **Geohash Query:** When a post is created, we define a 3km radius and generate an array of geohash bounds that intersect this circle. We query the `users` collection specifically for users whose `geohash` falls within these string bounds. This utilizes Firestore's native index to fetch only users *roughly* in the area (turning an $O(n)$ scan into a highly performant indexed query).
2. **Haversine Filter:** Since geohashes are rectangles, the bounding boxes will catch some users slightly outside the perfect 3km circle. We loop through the returned subset of users and apply the exact Haversine distance formula to prune out the false positives.

---

## 2. Function Definitions

### `getNearbyUsers(postLocation, radiusKm, postAuthorId, existingVolunteerIds)`

```javascript
/**
 * Fetches users within a specific radius of a coordinate while filtering
 * out authors, non-citizens, and existing volunteers.
 *
 * @param {Object} postLocation - { latitude: Number, longitude: Number }
 * @param {Number} radiusKm - The search radius in kilometers
 * @param {String} postAuthorId - The userId of the author (to exclude)
 * @param {Array<String>} existingVolunteerIds - IDs of users already assigned
 * @returns {Promise<Array<Object>>} - Array of user documents within radius
 */
async function getNearbyUsers(postLocation, radiusKm, postAuthorId, existingVolunteerIds = []) {
    // 1. Convert radius to meters and calculate geohash query bounds
    const radiusInM = radiusKm * 1000;
    const center = [postLocation.latitude, postLocation.longitude];
    const bounds = geofire.geohashQueryBounds(center, radiusInM);

    const promises = [];
    const usersCollection = admin.firestore().collection("users");

    // 2. Query users for each geohash bounding box
    for (const b of bounds) {
        // Query utilizing compound index: role + geohash bound
        const q = usersCollection
            .where("role", "==", "citizen")
            .orderBy("location.geohash")
            .startAt(b[0])
            .endAt(b[1]);
        promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const nearbyCitizens = [];
    
    // Maintain a Set to handle cross-bounding-box deduplication instantly
    const processedUserIds = new Set();
    
    // Add author and volunteers to the set to implicitly exclude them
    processedUserIds.add(postAuthorId);
    existingVolunteerIds.forEach(id => processedUserIds.add(id));

    // 3. Apply Haversine exact filtering
    for (const snap of snapshots) {
        for (const doc of snap.docs) {
            const user = doc.data();
            const userId = doc.id;

            // Skip if already processed, is author, or is already a volunteer
            if (processedUserIds.has(userId)) continue;
            processedUserIds.add(userId);

            const distanceInKm = geofire.distanceBetween(
                [user.location.latitude, user.location.longitude],
                center
            );

            if (distanceInKm <= radiusKm) {
                nearbyCitizens.push({ userId, fcmToken: user.fcmToken, distance: distanceInKm });
            }
        }
    }

    return nearbyCitizens;
}
```

### `generateNotifications(post, nearbyUsers)`

```javascript
/**
 * Dispatches Push Notifications to nearby users and records the action in Firestore.
 *
 * @param {Object} post - The newly created issue document
 * @param {Array<Object>} nearbyUsers - Output from getNearbyUsers()
 */
async function generateNotifications(post, nearbyUsers) {
    if (!nearbyUsers || nearbyUsers.length === 0) return;

    // Filter out users who don't have a valid FCM token
    const targetUsers = nearbyUsers.filter(u => u.fcmToken);
    const fcmTokens = targetUsers.map(u => u.fcmToken);

    // 1. Build Notification Payload
    const payload = {
        notification: {
            title: `New Civic Issue Nearby!`,
            body: `A new ${post.category} was reported within 3km of you.`
        },
        data: {
            postId: post.postId,
            type: "nearby_issue_alert"
        },
        tokens: fcmTokens
    };

    try {
        // 2. Dispatch via Firebase Cloud Messaging (FCM)
        // sendMulticast handles batching up to 500 tokens per request automatically
        const fcmResponse = await admin.messaging().sendMulticast(payload);
        
        // 3. Batch write notification records to the database for in-app bell icon history
        const batch = admin.firestore().batch();
        const notificationsRef = admin.firestore().collection("notifications");

        targetUsers.forEach(user => {
             const docRef = notificationsRef.doc(); // Auto-generate ID
             batch.set(docRef, {
                 userId: user.userId,
                 postId: post.postId,
                 title: payload.notification.title,
                 body: payload.notification.body,
                 isRead: false,
                 createdAt: admin.firestore.FieldValue.serverTimestamp()
             });
        });

        await batch.commit();

    } catch (error) {
        console.error("Error generating notifications", error);
    }
}
```

---

## 3. Deduplication Strategy

Duplicate notifications could frustrate users. The system prevents duplicates across three vectors:

1. **Query deduplication:** Since multiple geohash bounding boxes could theoretically overlap at the edges, a JavaScript `Set()` (the `processedUserIds` Set in the code above) maintains a ledger of every `userId` checked within the function's lifecycle, guaranteeing a single user is never added to the outgoing array twice.
2. **Exclusion deduplication:** The `authorId` and an array of `existingVolunteerIds` are injected into the deduplication Set *before* processing begins, instantly short-circuiting them out of the Haversine calculation and the notification payload.
3. **Trigger Deduplication (Idempotency):** The Cloud Function triggering this routine is set to `onDocumentCreated`. It only fires on *new* insertions, not updates, preventing repeated alerts if a user goes in and repeatedly edits their post description.

---

## 4. Performance Considerations for Scaling

1. **Compound Indexing:** We require a compound index in `firestore.indexes.json` targeting `role` (Ascending) + `location.geohash` (Ascending). Without this, the system would issue widespread table scans looking for "citizens" before filtering geographically, resulting in severe performance decay as the app scales beyond thousands of users.
2. **Multicast Batching:** FCM `sendMulticast` accepts batches of up to 500 tokens. If `nearbyCitizens.length` exceeds 500, we must slice the array into chunks of 500 and `Promise.all()` the FCM calls to prevent Google API rejections.
3. **Firestore Write Batching:** Writing in-app notification history to the `notifications` collection uses `firebase-admin` batching, combining 500 separate database writes into a single high-throughput HTTP network commitment.

---

## 5. Example JSON Input/Output

### Input: `getNearbyUsers` Requirements
```json
{
  "postLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "radiusKm": 3.0,
  "postAuthorId": "user_citizen_123",
  "existingVolunteerIds": []
}
```

### Output: `getNearbyUsers` (Input for `generateNotifications`)
```json
[
  {
    "userId": "user_citizen_456",
    "fcmToken": "dh39d_d93kdj...",
    "distance": 1.2
  },
  {
    "userId": "user_citizen_789",
    "fcmToken": "x9k2l1_ps9dk...",
    "distance": 2.8
  }
]
```

### Database Write Flow (`notifications` collection payload)
After the push notifications succeed, these documents are generated in the DB:
```json
// Collection: notifications
// Document 1
{
  "userId": "user_citizen_456",
  "postId": "post_11AABB",
  "title": "New Civic Issue Nearby!",
  "body": "A new Water Leak was reported within 3km of you.",
  "isRead": false,
  "createdAt": "2026-02-20T19:35:00Z"
}

// Document 2
{
  "userId": "user_citizen_789",
  "postId": "post_11AABB",
  "title": "New Civic Issue Nearby!",
  "body": "A new Water Leak was reported within 3km of you.",
  "isRead": false,
  "createdAt": "2026-02-20T19:35:00Z"
}
```
