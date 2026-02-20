/**
 * VerificationService.js
 * Orchestrates the full photo verification flow:
 * upload → verify → decision → shadow ban.
 * Used by useVerification.js
 */

import { uploadTempMedia, verifyMedia } from '../api/mediaClient';
import { validatePhotoMetadata, getTrustBadge } from './ExifValidator';

// ─── Core verification flow ───────────────────────────────────────────────

/**
 * Submit a captured photo for verification.
 * Performs on-device pre-validation, then hits the backend for server-side check.
 *
 * Flow:
 *  1. On-device pre-check via ExifValidator (instant feedback)
 *  2. Upload photo to /api/media/upload-temp → get mediaId
 *  3. Call /api/media/verify → get server trust score & checks
 *  4. Merge and return final result
 *
 * @param {string} photoUri             Local file URI from CameraService
 * @param {object} metadata             Full metadata from CameraService.capturePhotoWithMetadata()
 * @param {number} reportedLat          Latitude of the issue being filed
 * @param {number} reportedLng          Longitude of the issue being filed
 * @returns {Promise<{
 *   trustScore: number,
 *   decision: 'VERIFIED' | 'PENDING' | 'FLAGGED',
 *   checks: Array,
 *   passedIds: string[],
 *   badge: object,
 *   mediaId: string | null,
 *   source: 'device' | 'server',
 * }>}
 */
export async function submitForVerification(photoUri, metadata, reportedLat, reportedLng) {
    // ── Step 1: Instant on-device pre-check ───────────────────────────────
    const deviceResult = validatePhotoMetadata(metadata, reportedLat, reportedLng);

    // If GPS is completely absent we fail immediately — no point uploading
    if (!deviceResult.passedIds.includes('GPS_PRESENT')) {
        return {
            ...deviceResult,
            badge: getTrustBadge(deviceResult.trustScore),
            mediaId: null,
            source: 'device',
        };
    }

    // ── Step 2: Upload to backend ─────────────────────────────────────────
    let mediaId = null;
    let serverResult = null;

    try {
        const uploadResponse = await uploadTempMedia(photoUri, metadata);
        mediaId = uploadResponse?.mediaId || null;
    } catch (uploadErr) {
        console.warn('[VerificationService] Upload failed, using device result:', uploadErr.message);
        // Degrade gracefully: use device-only result
        return {
            ...deviceResult,
            badge: getTrustBadge(deviceResult.trustScore),
            mediaId: null,
            source: 'device',
        };
    }

    // ── Step 3: Server-side verification ─────────────────────────────────
    if (mediaId) {
        try {
            serverResult = await verifyMedia(mediaId, reportedLat, reportedLng);
        } catch (verifyErr) {
            console.warn('[VerificationService] Server verify failed, using device result:', verifyErr.message);
        }
    }

    // ── Step 4: Use server result if available, else device result ────────
    if (serverResult) {
        const score = serverResult.trustScore ?? deviceResult.trustScore;
        const decision = serverResult.isVerified
            ? 'VERIFIED'
            : score >= 50 ? 'PENDING' : 'FLAGGED';

        return {
            trustScore: score,
            decision,
            checks: deviceResult.checks, // Use device check details for UI display
            passedIds: serverResult.checksPassed || deviceResult.passedIds,
            badge: getTrustBadge(score),
            mediaId,
            source: 'server',
        };
    }

    // Fallback: device pre-check result
    return {
        ...deviceResult,
        badge: getTrustBadge(deviceResult.trustScore),
        mediaId,
        source: 'device',
    };
}

// ─── Shadow ban logic ─────────────────────────────────────────────────────

/**
 * Determine if a post should be visible to a given user.
 *
 * SHADOW BAN RULE:
 *  - VERIFIED posts: visible to everyone
 *  - PENDING posts: visible to everyone (limited reach, but still shown)
 *  - FLAGGED posts: ONLY visible to the uploader themselves
 *    → The uploader sees their post normally (no notification they're banned)
 *    → All other users never see it
 *
 * @param {object} post                   Post object from Firestore/API
 * @param {string} post.uploaderId        userId of who created the post
 * @param {string} post.decision          'VERIFIED' | 'PENDING' | 'FLAGGED'
 * @param {string | null} currentUserId   userId of who is viewing (null = not logged in)
 * @returns {boolean}
 */
export function shouldShowToUser(post, currentUserId) {
    if (!post) return false;

    const decision = post.decision || post.verificationData?.decision || 'PENDING';

    // FLAGGED posts are shadow banned — only the uploader sees them
    if (decision === 'FLAGGED') {
        return currentUserId != null && currentUserId === post.uploaderId;
    }

    // VERIFIED and PENDING are publicly visible
    return true;
}

/**
 * Filter an array of posts by visibility rules for a given user.
 * @param {Array<object>} posts
 * @param {string | null} currentUserId
 * @returns {Array<object>}
 */
export function filterVisiblePosts(posts, currentUserId) {
    if (!Array.isArray(posts)) return [];
    return posts.filter((post) => shouldShowToUser(post, currentUserId));
}

// ─── Badge / presentation helpers ────────────────────────────────────────

/**
 * Get badge props for displaying verification status in the UI.
 * Delegates to ExifValidator.getTrustBadge.
 * @param {number} score
 * @returns {{ label: string, color: string, icon: string, decision: string }}
 */
export { getTrustBadge as getVerificationBadge } from './ExifValidator';

/**
 * Get a short status description suitable for a feed post subtitle.
 * @param {'VERIFIED' | 'PENDING' | 'FLAGGED'} decision
 * @returns {string}
 */
export function getStatusDescription(decision) {
    switch (decision) {
        case 'VERIFIED': return 'Verified evidence — maximum community trust';
        case 'PENDING': return 'Under review — limited visibility';
        case 'FLAGGED': return 'Could not verify — review required';
        default: return 'Verification pending';
    }
}
