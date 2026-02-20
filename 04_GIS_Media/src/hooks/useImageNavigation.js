/**
 * useImageNavigation.js
 * React hook: double-tap any image to navigate to its exact map location.
 * Works on: FeedScreen, PostDetailScreen, ProfileScreen, MapScreen, VerificationStatusScreen.
 */

import { useCallback, useRef } from 'react';
import { navigateToPhotoLocation, navigateToCoordinates } from '../services/NavigationService';

/** Maximum milliseconds between taps to count as a double-tap */
const DOUBLE_TAP_DELAY_MS = 300;

/**
 * @param {object} navigation  React Navigation navigation prop
 * @returns {{
 *   handleImagePress: function,        Call onPress with { postId }
 *   handleImagePressWithCoords: function, Call onPress with { latitude, longitude }
 *   createImagePressHandler: function, Factory: creates handler for a specific postId
 * }}
 */
export function useImageNavigation(navigation) {
    // Track last tap time per image (keyed by postId or coordinate string)
    const lastTapRef = useRef({});

    /**
     * Universal double-tap handler.
     * Pass different `key`s for different images so taps don't bleed across cards.
     *
     * @param {string} key      Unique key (postId or `${lat},${lng}`)
     * @param {function} action Function to call on double-tap
     */
    const handleDoubleTap = useCallback((key, action) => {
        const now = Date.now();
        const lastTap = lastTapRef.current[key] || 0;
        const delta = now - lastTap;

        if (delta < DOUBLE_TAP_DELAY_MS && delta > 0) {
            // Double-tap confirmed
            lastTapRef.current[key] = 0; // Reset to prevent triple-tap issues
            action();
        } else {
            // First tap — record time
            lastTapRef.current[key] = now;
        }
    }, []);

    /**
     * Handle an image press using only postId (fetches location from API).
     * @param {string} postId
     */
    const handleImagePress = useCallback((postId) => {
        if (!postId) return;
        handleDoubleTap(`post:${postId}`, () => {
            navigateToPhotoLocation(postId, navigation);
        });
    }, [handleDoubleTap, navigation]);

    /**
     * Handle an image press when coordinates are already known (no API call).
     * Faster — use this on PostDetailScreen where coords are in the post object.
     * @param {number} latitude
     * @param {number} longitude
     * @param {string} [label='Photo Location']
     */
    const handleImagePressWithCoords = useCallback((latitude, longitude, label = 'Photo Location') => {
        const key = `coord:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        handleDoubleTap(key, () => {
            navigateToCoordinates(latitude, longitude, navigation, label);
        });
    }, [handleDoubleTap, navigation]);

    /**
     * Factory function — creates a memoised `onPress` handler for a specific postId.
     * Use this with FlatList renderItem to avoid creating a new function on every render.
     *
     * Example:
     *   const onPress = createImagePressHandler(post.id);
     *   <TouchableOpacity onPress={onPress} />
     *
     * @param {string} postId
     * @returns {function}
     */
    const createImagePressHandler = useCallback((postId) => {
        return () => handleImagePress(postId);
    }, [handleImagePress]);

    return {
        handleImagePress,
        handleImagePressWithCoords,
        createImagePressHandler,
    };
}

export default useImageNavigation;
