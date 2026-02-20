/**
 * useVerification.js
 * React hook: orchestrates the full verification flow for a captured photo.
 * Drives the VerificationStatusScreen display.
 */

import { useState, useCallback } from 'react';
import { submitForVerification, getVerificationBadge } from '../services/VerificationService';

/**
 * @returns {{
 *   verifying: boolean,
 *   trustScore: number | null,
 *   decision: 'VERIFIED' | 'PENDING' | 'FLAGGED' | null,
 *   checks: Array,
 *   badge: object | null,
 *   mediaId: string | null,
 *   error: string | null,
 *   submit: function,
 *   reset: function,
 * }}
 */
export function useVerification() {
    const [verifying, setVerifying] = useState(false);
    const [trustScore, setTrustScore] = useState(null);
    const [decision, setDecision] = useState(null);
    const [checks, setChecks] = useState([]);
    const [badge, setBadge] = useState(null);
    const [mediaId, setMediaId] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Submit a photo for verification.
     * @param {string} photoUri         Local file URI
     * @param {object} metadata         From CameraService.capturePhotoWithMetadata()
     * @param {number} reportedLat      Latitude of the issue being reported
     * @param {number} reportedLng      Longitude of the issue being reported
     * @returns {Promise<object>}       Verification result
     */
    const submit = useCallback(async (photoUri, metadata, reportedLat, reportedLng) => {
        setVerifying(true);
        setError(null);
        setTrustScore(null);
        setDecision(null);
        setChecks([]);
        setBadge(null);
        setMediaId(null);

        try {
            const result = await submitForVerification(
                photoUri,
                metadata,
                reportedLat,
                reportedLng
            );

            setTrustScore(result.trustScore);
            setDecision(result.decision);
            setChecks(result.checks || []);
            setBadge(result.badge || getVerificationBadge(result.trustScore));
            setMediaId(result.mediaId || null);

            return result;
        } catch (err) {
            const errorMsg = err.message || 'Verification failed';
            setError(errorMsg);
            // Fail safe: set a FLAGGED state so UI shows something meaningful
            setTrustScore(0);
            setDecision('FLAGGED');
            setBadge(getVerificationBadge(0));
            throw err;
        } finally {
            setVerifying(false);
        }
    }, []);

    /** Reset all state (e.g. when user retakes photo) */
    const reset = useCallback(() => {
        setVerifying(false);
        setTrustScore(null);
        setDecision(null);
        setChecks([]);
        setBadge(null);
        setMediaId(null);
        setError(null);
    }, []);

    return {
        verifying,
        trustScore,
        decision,
        checks,
        badge,
        mediaId,
        error,
        submit,
        reset,
    };
}

export default useVerification;
