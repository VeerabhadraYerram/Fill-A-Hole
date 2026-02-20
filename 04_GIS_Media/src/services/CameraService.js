/**
 * CameraService.js
 * GPS lock management and photo capture with embedded metadata.
 * Used by useGeoCamera.js and GeoCameraScreen.js
 *
 * Relies on expo-location (already installed in 01_UI_Architect).
 * No new native dependencies required.
 */

import * as Location from 'expo-location';
import { extractGpsMetadata } from '../utils/gpsHelpers';

// ─── Permissions ──────────────────────────────────────────────────────────

/**
 * Request both camera and location permissions.
 * The camera permission itself is handled by expo-camera's useCameraPermissions()
 * hook in the UI layer — this only handles location.
 * @returns {Promise<{ locationGranted: boolean, status: string }>}
 */
export async function requestLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return {
        locationGranted: status === 'granted',
        status,
    };
}

// ─── GPS Watch (continuous accuracy monitoring) ───────────────────────────

/**
 * Start watching GPS position with high accuracy.
 * Fires `onUpdate` each time position/accuracy changes.
 *
 * @param {function({ accuracy: number, coords: object }): void} onUpdate
 * @returns {Promise<{ remove: function }>} Subscription object — call .remove() to stop
 */
export async function startGpsWatch(onUpdate) {
    const subscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,      // Update every second
            distanceInterval: 0,     // Update on any movement
        },
        (position) => {
            onUpdate({
                accuracy: position.coords.accuracy,
                coords: position.coords,
            });
        }
    );
    return subscription; // Has a .remove() method
}

/**
 * Get a single current position snapshot (used for initial value before watch starts).
 * @returns {Promise<Location.LocationObject>}
 */
export async function getCurrentPosition() {
    return Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
    });
}

// ─── Photo capture with metadata ─────────────────────────────────────────

/**
 * Capture a photo and attach GPS + timestamp metadata as a structured object.
 * The metadata travels alongside the URI — it is NOT written into EXIF bytes
 * (that would require native code). The backend receives both the image and
 * the metadata JSON, and the backend's verifyImage function cross-references them.
 *
 * @param {object} cameraRef  Ref from expo-camera's CameraView
 * @param {object} gpsCoords  Current GPS coords from the GPS watch
 * @param {object} [deviceInfo]  Optional device info for metadata
 * @returns {Promise<{ uri: string, metadata: object }>}
 */
export async function capturePhotoWithMetadata(cameraRef, gpsCoords, deviceInfo = {}) {
    if (!cameraRef) {
        throw new Error('Camera reference is not available');
    }

    // Take the picture
    const photo = await cameraRef.takePictureAsync({
        quality: 0.85,
        exif: true,         // Request EXIF data from expo-camera if available
        skipProcessing: false,
    });

    // Build the metadata object
    const captureTime = new Date().toISOString();
    const metadata = {
        // GPS data from our verified watch (more reliable than EXIF on device)
        gps: extractGpsMetadata(gpsCoords),

        // Timing
        capturedAt: captureTime,
        capturedAtUnix: Date.now(),

        // Device info (platform provides this)
        device: {
            make: deviceInfo.make || 'Unknown',
            model: deviceInfo.model || 'Unknown',
            platform: deviceInfo.platform || 'unknown',
        },

        // Any EXIF the camera provided natively
        exif: photo.exif || null,
    };

    return {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        metadata,
    };
}

// ─── Reverse geocoding ────────────────────────────────────────────────────

/**
 * Convert GPS coordinates to a human-readable address string.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>} Address string, e.g. "MG Road, Vijayawada, AP 520010"
 */
export async function reverseGeocode(latitude, longitude) {
    try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (!results || results.length === 0) return 'Address unavailable';

        const r = results[0];
        const parts = [
            r.street,
            r.district || r.subregion,
            r.city,
            r.region,
            r.postalCode,
        ].filter(Boolean);

        return parts.join(', ') || 'Unknown location';
    } catch {
        return 'Address unavailable';
    }
}

// ─── GPS lock check ───────────────────────────────────────────────────────

/**
 * Determine if current GPS accuracy qualifies as "locked" per spec (<20m).
 * @param {number} accuracy  Current GPS accuracy in meters
 * @returns {boolean}
 */
export function isGpsLocked(accuracy) {
    return typeof accuracy === 'number' && accuracy < 20;
}

/**
 * Determine GPS signal quality level for UI indicator states.
 * @param {number} accuracy
 * @returns {'locked' | 'acceptable' | 'weak'}
 */
export function getGpsQuality(accuracy) {
    if (accuracy < 20) return 'locked';
    if (accuracy < 50) return 'acceptable';
    return 'weak';
}
