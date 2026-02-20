/**
 * useGeoCamera.js
 * React hook: manages GPS watch and camera state for the GeoCameraScreen.
 * Connects GeoCameraScreen to CameraService.
 *
 * Key invariant: canShoot is only true when GPS accuracy < 20m (strict spec requirement)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    requestLocationPermission,
    startGpsWatch,
    capturePhotoWithMetadata,
    reverseGeocode,
    isGpsLocked,
    getGpsQuality,
} from '../services/CameraService';

/**
 * @returns {{
 *   gpsAccuracy: number,        Current GPS accuracy in meters (100 = no lock yet)
 *   gpsQuality: string,         'locked' | 'acceptable' | 'weak'
 *   canShoot: boolean,          true only when accuracy < 20m
 *   location: object | null,    Current GPS coords
 *   address: string,            Human-readable address from reverse geocode
 *   locationGranted: boolean,
 *   capturePhoto: function,     Call with (cameraRef) to take a photo
 *   capturing: boolean,
 *   lastCapture: object | null, { uri, metadata } from last successful capture
 *   error: string | null,
 * }}
 */
export function useGeoCamera() {
    const [gpsAccuracy, setGpsAccuracy] = useState(100);   // 100m default = no lock
    const [gpsQuality, setGpsQuality] = useState('weak');
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('Locating...');
    const [locationGranted, setLocationGranted] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [lastCapture, setLastCapture] = useState(null);
    const [error, setError] = useState(null);

    const subscriptionRef = useRef(null);
    const geocodeTimerRef = useRef(null);

    // Start the GPS watch on mount
    useEffect(() => {
        let mounted = true;

        (async () => {
            // Request location permission
            const { locationGranted: granted } = await requestLocationPermission();
            if (!mounted) return;
            setLocationGranted(granted);

            if (!granted) {
                setError('Location permission denied. GPS lock required to take photos.');
                return;
            }

            // Start continuous GPS watch
            try {
                const sub = await startGpsWatch(({ accuracy, coords }) => {
                    if (!mounted) return;

                    setGpsAccuracy(accuracy);
                    setGpsQuality(getGpsQuality(accuracy));
                    setLocation(coords);

                    // Debounce reverse geocoding — run only when GPS is decent
                    if (accuracy < 50) {
                        if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
                        geocodeTimerRef.current = setTimeout(async () => {
                            const addr = await reverseGeocode(coords.latitude, coords.longitude);
                            if (mounted) setAddress(addr);
                        }, 2000); // Wait 2s after last update before geocoding
                    }
                });
                subscriptionRef.current = sub;
            } catch (err) {
                if (mounted) setError('Failed to start GPS: ' + err.message);
            }
        })();

        return () => {
            mounted = false;
            // Clean up GPS watch subscription
            if (subscriptionRef.current?.remove) {
                subscriptionRef.current.remove();
            }
            if (geocodeTimerRef.current) {
                clearTimeout(geocodeTimerRef.current);
            }
        };
    }, []);

    /**
     * Capture a photo. Will throw if called when GPS is not locked.
     * @param {object} cameraRef  expo-camera CameraView ref
     * @returns {Promise<{ uri: string, metadata: object }>}
     */
    const capturePhoto = useCallback(async (cameraRef) => {
        if (!isGpsLocked(gpsAccuracy)) {
            throw new Error('Cannot capture: GPS lock not achieved (accuracy must be < 20m)');
        }
        if (!location) {
            throw new Error('Cannot capture: waiting for first GPS fix');
        }

        setCapturing(true);
        setError(null);

        try {
            const result = await capturePhotoWithMetadata(cameraRef, location);
            setLastCapture(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setCapturing(false);
        }
    }, [gpsAccuracy, location]);

    return {
        gpsAccuracy,
        gpsQuality,
        canShoot: isGpsLocked(gpsAccuracy), // STRICT: only true when < 20m
        location,
        address,
        locationGranted,
        capturePhoto,
        capturing,
        lastCapture,
        error,
    };
}

export default useGeoCamera;
