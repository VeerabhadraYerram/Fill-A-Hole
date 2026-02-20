const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const geofire = require("geofire-common");

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
    const radiusInM = radiusKm * 1000;
    const center = [postLocation.latitude, postLocation.longitude];
    const bounds = geofire.geohashQueryBounds(center, radiusInM);

    const promises = [];
    const usersCollection = admin.firestore().collection("users");

    for (const b of bounds) {
        const q = usersCollection
            .where("role", "==", "citizen")
            .orderBy("location.geohash")
            .startAt(b[0])
            .endAt(b[1]);
        promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const nearbyCitizens = [];

    const processedUserIds = new Set();

    if (postAuthorId) processedUserIds.add(postAuthorId);
    existingVolunteerIds.forEach(id => processedUserIds.add(id));

    for (const snap of snapshots) {
        for (const doc of snap.docs) {
            const user = doc.data();
            const userId = doc.id;

            if (processedUserIds.has(userId)) continue;
            processedUserIds.add(userId);

            if (!user.location || !user.location.latitude || !user.location.longitude) continue;

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

/**
 * Dispatches Push Notifications to nearby users and records the action in Firestore.
 *
 * @param {Object} post - The newly created issue document
 * @param {Array<Object>} nearbyUsers - Output from getNearbyUsers()
 */
async function generateNotifications(post, nearbyUsers) {
    if (!nearbyUsers || nearbyUsers.length === 0) return;

    const targetUsers = nearbyUsers.filter(u => u.fcmToken);

    // FCM sendMulticast accepts up to 500 tokens. 
    // We will chunk them if necessary.
    const chunkSize = 500;

    for (let i = 0; i < targetUsers.length; i += chunkSize) {
        const chunk = targetUsers.slice(i, i + chunkSize);
        const fcmTokens = chunk.map(u => u.fcmToken);

        const payload = {
            notification: {
                title: `New Civic Issue Nearby!`,
                body: `A new ${post.category || "issue"} was reported within 3km of you.`
            },
            data: {
                postId: post.postId || post.id || "",
                type: "nearby_issue_alert"
            },
            tokens: fcmTokens
        };

        try {
            const fcmResponse = await admin.messaging().sendMulticast(payload);
            console.log(`${fcmResponse.successCount} messages were sent successfully from chunk`);

            const batch = admin.firestore().batch();
            const notificationsRef = admin.firestore().collection("notifications");

            chunk.forEach(user => {
                const docRef = notificationsRef.doc();
                batch.set(docRef, {
                    userId: user.userId,
                    postId: post.postId || post.id || "",
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
}

exports.notifyNearbyUsers = onDocumentCreated("posts/{postId}", async (event) => {
    const postSnapshot = event.data;
    if (!postSnapshot) {
        return;
    }
    const post = postSnapshot.data();

    const isUrgent = post.tags && post.tags.includes("Urgent");
    const isVerified = post.verificationData && post.verificationData.isVerified;

    if (!isUrgent && !isVerified) {
        console.log("Post is neither urgent nor verified. Skipping notifications.");
        return;
    }

    const location = post.location;
    if (!location || !location.latitude || !location.longitude) {
        console.error("Post missing location data");
        return;
    }

    post.id = event.params.postId;

    try {
        const nearbyUsers = await getNearbyUsers(
            location,
            3.0,
            post.authorId || null,
            post.volunteerIds || []
        );

        await generateNotifications(post, nearbyUsers);

    } catch (err) {
        console.error("Error in geo fencing notification engine:", err);
    }
});
