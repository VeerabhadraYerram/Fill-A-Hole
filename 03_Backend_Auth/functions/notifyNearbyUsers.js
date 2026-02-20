const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const geofire = require("geofire-common");

exports.notifyNearbyUsers = onDocumentCreated("posts/{postId}", async (event) => {
    const postSnapshot = event.data;
    if (!postSnapshot) {
        return;
    }
    const post = postSnapshot.data();

    // Condition: only notify if it's "Urgent" or "Verified"
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

    // Define 500m radius
    const radiusInM = 500;
    const center = [location.latitude, location.longitude];
    const bounds = geofire.geohashQueryBounds(center, radiusInM);

    const promises = [];
    const usersCollection = admin.firestore().collection("users");

    for (const b of bounds) {
        // Query users bounded by this geohash range
        const q = usersCollection
            .orderBy("homeGeohash")
            .startAt(b[0])
            .endAt(b[1]);

        promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);

    const matchingFCMTokens = [];

    for (const snap of snapshots) {
        for (const doc of snap.docs) {
            const user = doc.data();

            // Double check actual distance to remove false positives from geohash bounds
            if (user.location && user.location.latitude && user.location.longitude) {
                const distanceInKm = geofire.distanceBetween(
                    [user.location.latitude, user.location.longitude],
                    center
                );
                const distanceInM = distanceInKm * 1000;

                if (distanceInM <= radiusInM && user.fcmToken) {
                    matchingFCMTokens.push(user.fcmToken);
                }
            } else if (user.fcmToken) {
                // If the user doesn't have exact lat/lon but fell in bounding box, notify them
                matchingFCMTokens.push(user.fcmToken);
            }
        }
    }

    if (matchingFCMTokens.length === 0) {
        console.log("No nearby users found.");
        return;
    }

    // Send FCM Message
    const payload = {
        notification: {
            title: isUrgent ? "⚠️ Urgent Civic Issue Nearby!" : "✅ Verified Civic Issue Nearby",
            body: `A new ${post.category || "issue"} was reported within 500 meters of you.`
        },
        data: {
            postId: event.params.postId,
            type: "nearby_issue"
        },
        tokens: matchingFCMTokens
    };

    try {
        const response = await admin.messaging().sendMulticast(payload);
        console.log(`${response.successCount} messages were sent successfully`);
    } catch (error) {
        console.error("Error sending notifications", error);
    }
});
