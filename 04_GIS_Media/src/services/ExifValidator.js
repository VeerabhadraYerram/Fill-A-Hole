/**
 * ExifValidator.js
 * Performs 5 critical checks on captured photo metadata.
 * Calculates a trust score (0–100) and issues VERIFIED / PENDING / FLAGGED decisions.
 *
 * Note: On-device validation uses the metadata object from CameraService
 * (not raw EXIF binary — that happens server-side in verifyImage.js).
 * This gives an instant pre-check before the upload even starts.
 */

import { haversineDistance } from '../utils/distanceCalculator';

// ─── Constants ────────────────────────────────────────────────────────────

/** Maximum age of a photo (in milliseconds) to pass the freshness check */
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum GPS accuracy (meters) to pass the accuracy check */
const MAX_ACCURACY_M = 20;

/** Maximum allowed distance between GPS coords and reported location */
const MAX_LOCATION_DELTA_M = 50;

/** Software strings that indicate photo editing */
const EDITING_SOFTWARE_PATTERNS = [
    'photoshop', 'lightroom', 'snapseed', 'vsco', 'facetune',
    'picsart', 'meitu', 'airbrush', 'pixlr', 'afterlight',
    'gimp', 'capture one', 'darktable',
];

// ─── Individual checks ────────────────────────────────────────────────────

/**
 * CHECK 1 — GPS Present (30 pts)
 * Verifies the metadata has latitude and longitude.
 */
function checkGpsPresent(gps) {
    const pass = !!(
        gps &&
        typeof gps.latitude === 'number' &&
        typeof gps.longitude === 'number' &&
        !isNaN(gps.latitude) &&
        !isNaN(gps.longitude)
    );
    return {
        id: 'GPS_PRESENT',
        label: 'GPS data present',
        pass,
        points: pass ? 30 : 0,
        maxPoints: 30,
        detail: pass
            ? `GPS found: ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`
            : 'No GPS coordinates in metadata',
    };
}

/**
 * CHECK 2 — GPS Accuracy (25 pts)
 * Checks that accuracy is better than MAX_ACCURACY_M (20m).
 */
function checkGpsAccuracy(gps) {
    const accuracy = gps?.accuracy;
    const pass = typeof accuracy === 'number' && accuracy < MAX_ACCURACY_M;
    return {
        id: 'GPS_ACCURACY',
        label: `GPS accuracy < ${MAX_ACCURACY_M}m`,
        pass,
        points: pass ? 25 : 0,
        maxPoints: 25,
        detail: accuracy != null
            ? `Accuracy: ±${Math.round(accuracy)}m`
            : 'Accuracy data missing',
    };
}

/**
 * CHECK 3 — Freshness (20 pts)
 * Ensures the photo was taken within MAX_AGE_MS (5 minutes).
 */
function checkFreshness(capturedAtUnix) {
    if (!capturedAtUnix || typeof capturedAtUnix !== 'number') {
        return {
            id: 'FRESHNESS',
            label: 'Photo taken recently (< 5 min)',
            pass: false,
            points: 0,
            maxPoints: 20,
            detail: 'Capture timestamp missing',
        };
    }
    const ageMs = Date.now() - capturedAtUnix;
    const pass = ageMs >= 0 && ageMs <= MAX_AGE_MS;
    const ageSeconds = Math.round(ageMs / 1000);
    return {
        id: 'FRESHNESS',
        label: 'Photo taken recently (< 5 min)',
        pass,
        points: pass ? 20 : 0,
        maxPoints: 20,
        detail: pass
            ? `Taken ${ageSeconds}s ago — fresh`
            : `Photo is ${Math.round(ageMs / 60000)} min old — too old`,
    };
}

/**
 * CHECK 4 — No editing detected (15 pts)
 * Looks for known editing software strings in EXIF.
 */
function checkNoEditing(exif) {
    const software = (exif?.Software || '').toLowerCase();
    const editingDetected =
        software.length > 0 &&
        EDITING_SOFTWARE_PATTERNS.some((pattern) => software.includes(pattern));
    const pass = !editingDetected;
    return {
        id: 'NO_EDITING',
        label: 'No editing software detected',
        pass,
        points: pass ? 15 : 0,
        maxPoints: 15,
        detail: editingDetected
            ? `Editing software detected: "${exif.Software}"`
            : software
                ? `Software: ${exif.Software} (not a known editor)`
                : 'No editing software field in EXIF',
    };
}

/**
 * CHECK 5 — Location match (10 pts)
 * Compares the GPS position in metadata against the user's reported location.
 * @param {object} gps  GPS from camera metadata
 * @param {number} reportedLat  Latitude of the reported issue
 * @param {number} reportedLng  Longitude of the reported issue
 */
function checkLocationMatch(gps, reportedLat, reportedLng) {
    if (!gps?.latitude || !gps?.longitude || reportedLat == null || reportedLng == null) {
        return {
            id: 'LOCATION_MATCH',
            label: `Location within ${MAX_LOCATION_DELTA_M}m of report`,
            pass: false,
            points: 0,
            maxPoints: 10,
            detail: 'Cannot check — GPS or reported location missing',
        };
    }
    const distanceM = haversineDistance(
        gps.latitude, gps.longitude,
        reportedLat, reportedLng
    );
    const pass = distanceM <= MAX_LOCATION_DELTA_M;
    return {
        id: 'LOCATION_MATCH',
        label: `Location within ${MAX_LOCATION_DELTA_M}m of report`,
        pass,
        points: pass ? 10 : 0,
        maxPoints: 10,
        detail: pass
            ? `Photo taken ${Math.round(distanceM)}m from reported location — match`
            : `Photo taken ${Math.round(distanceM)}m from reported location — too far`,
    };
}

// ─── Main validator ───────────────────────────────────────────────────────

/**
 * Run all 5 EXIF/metadata checks on a captured photo.
 *
 * @param {object} metadata  From CameraService.capturePhotoWithMetadata()
 *   @param {object} metadata.gps              GPS coords object
 *   @param {number} metadata.capturedAtUnix   Unix timestamp ms
 *   @param {object} [metadata.exif]           Raw EXIF from expo-camera (optional)
 * @param {number} reportedLat  Latitude of the issue being reported
 * @param {number} reportedLng  Longitude of the issue being reported
 * @returns {{
 *   trustScore: number,
 *   decision: 'VERIFIED' | 'PENDING' | 'FLAGGED',
 *   checks: Array<object>,
 *   passedIds: string[],
 * }}
 */
export function validatePhotoMetadata(metadata, reportedLat, reportedLng) {
    const { gps, capturedAtUnix, exif } = metadata || {};

    // Run all 5 checks
    const checks = [
        checkGpsPresent(gps),
        checkGpsAccuracy(gps),
        checkFreshness(capturedAtUnix),
        checkNoEditing(exif),
        checkLocationMatch(gps, reportedLat, reportedLng),
    ];

    // Sum up the score
    const trustScore = checks.reduce((sum, c) => sum + c.points, 0);

    // Clamp 0–100
    const clampedScore = Math.min(100, Math.max(0, trustScore));

    // Decision thresholds per spec
    let decision;
    if (clampedScore > 90) {
        decision = 'VERIFIED';
    } else if (clampedScore >= 50) {
        decision = 'PENDING';
    } else {
        decision = 'FLAGGED';
    }

    return {
        trustScore: clampedScore,
        decision,
        checks,
        passedIds: checks.filter((c) => c.pass).map((c) => c.id),
    };
}

/**
 * Get a display-ready badge definition for a trust score.
 * @param {number} score
 * @returns {{ label: string, color: string, icon: string }}
 */
export function getTrustBadge(score) {
    if (score > 90) {
        return { label: 'Verified', color: '#4CAF50', icon: '✅', decision: 'VERIFIED' };
    } else if (score >= 50) {
        return { label: 'Pending', color: '#FFC107', icon: '⏳', decision: 'PENDING' };
    }
    return { label: 'Flagged', color: '#F44336', icon: '❌', decision: 'FLAGGED' };
}
