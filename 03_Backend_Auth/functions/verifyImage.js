const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const exifParser = require("exif-parser");

/**
 * Utility function to calculate distance in meters between two coordinates.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @return {number} distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
}

exports.verifyImage = onRequest(async (req, res) => {
    // Expected payload: { postId: "...", reportedLat: 16.5, reportedLng: 80.6, base64Image: "..." }
    try {
        const {postId, reportedLat, reportedLng, base64Image} = req.body;

        if (!postId || !reportedLat || !reportedLng || !base64Image) {
            res.status(400).send({error: "Missing required fields"});
            return;
        }

        // Decode base64 to buffer
        const buffer = Buffer.from(base64Image, "base64");
        const parser = exifParser.create(buffer);
        const result = parser.parse();

        const tags = result.tags;

        let trustScore = 100;
        const checksPassed = [];
        let isVerified = false;

        // 1. Check GPS Exists
        if (tags.GPSLatitude && tags.GPSLongitude) {
            checksPassed.push("GPS_LOCKED");

            // 2. Check Distance
            const distance = calculateDistance(reportedLat, reportedLng, tags.GPSLatitude, tags.GPSLongitude);

            // Deduct points if distance > 50 meters
            if (distance > 50) {
                // Deduct 1 point per 10 meters over 50m
                const deduction = Math.min(Math.floor((distance - 50) / 10), 100);
                trustScore -= deduction;
            } else {
                checksPassed.push("LOCATION_MATCH");
            }
        } else {
            trustScore -= 50; // Heavy penalty for missing GPS data
        }

        // 3. Check Timestamp
        if (tags.DateTimeOriginal) {
            const captureTime = new Date(tags.DateTimeOriginal * 1000);
            const now = new Date();
            const hoursDiff = Math.abs(now - captureTime) / 36e5;

            if (hoursDiff < 24) {
                checksPassed.push("RECENT_CAPTURE");
            } else {
                // Deduct points if photo is older than 24h
                trustScore -= 20;
            }
        } else {
            trustScore -= 20;
        }

        trustScore = Math.max(0, trustScore);
        isVerified = trustScore > 90;

        const verificationData = {
            trustScore,
            isVerified,
            checksPassed
        };

        // Update Firestore
        await admin.firestore().collection("posts").doc(postId).update({
            verificationData,
            "location.gpsAccuracy": tags.GPSHPositioningError || 50 // Mocking accuracy if missing
        });

        res.status(200).send({success: true, verificationData});
    } catch (error) {
        console.error("Error verifying image:", error);
        res.status(500).send({error: "Internal server error during verification"});
    }
});
