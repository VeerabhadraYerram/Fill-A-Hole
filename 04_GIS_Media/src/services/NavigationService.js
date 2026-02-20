/**
 * NavigationService.js
 * Handles double-click on any image → navigate to map at exact photo location.
 * Used by useImageNavigation.js
 */

import { getPostLocation } from '../api/mediaClient';

// ─── Core navigation action ───────────────────────────────────────────────

/**
 * Navigate to the MapScreen centered at the exact GPS location of a post photo.
 * Called when the user double-clicks/taps any image in the app.
 *
 * Flow:
 *  1. Fetch post location from /api/posts/:postId/location
 *  2. Navigate to 'Map' screen passing focus coordinates and zoom level
 *  3. MapScreen reads these params and centers itself with a pin
 *
 * @param {string} postId           ID of the post whose image was tapped
 * @param {object} navigation       React Navigation navigation prop
 * @returns {Promise<void>}
 */
export async function navigateToPhotoLocation(postId, navigation) {
    if (!postId) {
        console.warn('[NavigationService] navigateToPhotoLocation called with no postId');
        return;
    }
    if (!navigation) {
        console.warn('[NavigationService] navigateToPhotoLocation called with no navigation ref');
        return;
    }

    try {
        const location = await getPostLocation(postId);

        if (!location?.latitude || !location?.longitude) {
            console.warn('[NavigationService] Post location response missing coordinates');
            return;
        }

        // Navigate to the Map tab/screen with focus params
        navigation.navigate('Map', {
            focusLat: location.latitude,
            focusLng: location.longitude,
            zoom: 18,               // Street level per spec
            pinLabel: 'Photo Location',
        });
    } catch (err) {
        console.error('[NavigationService] Failed to fetch post location:', err.message);
        // Don't alert the user — silently fail to avoid disruption
    }
}

/**
 * Navigate to map with known coordinates (no API call needed — coords already known).
 * Use this when the post object already contains location data.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} navigation
 * @param {string} [pinLabel='Photo Location']
 */
export function navigateToCoordinates(latitude, longitude, navigation, pinLabel = 'Photo Location') {
    if (!navigation) return;
    navigation.navigate('Map', {
        focusLat: latitude,
        focusLng: longitude,
        zoom: 18,
        pinLabel,
    });
}

// ─── Double-tap detection helper ─────────────────────────────────────────

/** Maximum gap between two taps to count as a double-tap (ms) */
const DOUBLE_TAP_DELAY_MS = 300;

/**
 * Create a stateful double-tap handler.
 * Returns an `onPress` function that fires `onDoubleTap` when called twice
 * within DOUBLE_TAP_DELAY_MS milliseconds.
 *
 * Usage:
 *   const handler = createDoubleTapHandler(() => doSomething());
 *   <TouchableOpacity onPress={handler.onPress} />
 *
 * @param {function(): void} onDoubleTap  Called when double-tap is detected
 * @param {function(): void} [onSingleTap]  Called when single-tap is confirmed (after delay)
 * @returns {{ onPress: function }}
 */
export function createDoubleTapHandler(onDoubleTap, onSingleTap) {
    let lastTapTime = 0;
    let singleTapTimer = null;

    return {
        onPress() {
            const now = Date.now();
            const delta = now - lastTapTime;

            if (delta < DOUBLE_TAP_DELAY_MS && delta > 0) {
                // Double tap detected
                if (singleTapTimer) {
                    clearTimeout(singleTapTimer);
                    singleTapTimer = null;
                }
                lastTapTime = 0;
                onDoubleTap();
            } else {
                // First tap — wait to see if another comes
                lastTapTime = now;
                if (onSingleTap) {
                    singleTapTimer = setTimeout(() => {
                        singleTapTimer = null;
                        onSingleTap();
                    }, DOUBLE_TAP_DELAY_MS);
                }
            }
        },
    };
}
