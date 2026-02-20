/**
 * useMapPins.js
 * React hook: fetches and manages colored map pins for the current viewport.
 * Connects MapScreen to MapService.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPinsInViewport, getMockPins } from '../services/MapService';

/**
 * @param {{ latitude, longitude, latitudeDelta, longitudeDelta } | null} region
 * @param {string} [categoryFilter='All']
 * @param {object} [options]
 * @param {boolean} [options.useMock=false]  Use mock data (for development without a backend)
 * @returns {{
 *   pins: Array,
 *   loading: boolean,
 *   error: string | null,
 *   refetch: function,
 * }}
 */
export function useMapPins(region, categoryFilter = 'All', options = {}) {
    const { useMock = false } = options;

    const [pins, setPins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Track in-flight fetch so we don't stack requests during fast pan/zoom
    const fetchingRef = useRef(false);

    const loadPins = useCallback(async (currentRegion, filter) => {
        if (!currentRegion) return;
        if (fetchingRef.current) return; // Skip if already fetching

        fetchingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            if (useMock) {
                // Dev / offline mode
                const mockPins = getMockPins();
                const filtered = filter === 'All'
                    ? mockPins
                    : mockPins.filter(p => p.category.toLowerCase() === filter.toLowerCase());
                setPins(filtered);
            } else {
                const fetchedPins = await fetchPinsInViewport(currentRegion, filter);
                setPins(fetchedPins);
            }
        } catch (err) {
            console.error('[useMapPins] Failed to fetch pins:', err.message);
            setError(err.message);
            // Fallback to mock data if API fails
            if (!useMock) {
                setPins(getMockPins());
            }
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [useMock]);

    // Reload pins when region or filter changes
    useEffect(() => {
        loadPins(region, categoryFilter);
    }, [region, categoryFilter, loadPins]);

    const refetch = useCallback(() => {
        loadPins(region, categoryFilter);
    }, [region, categoryFilter, loadPins]);

    return { pins, loading, error, refetch };
}

export default useMapPins;
