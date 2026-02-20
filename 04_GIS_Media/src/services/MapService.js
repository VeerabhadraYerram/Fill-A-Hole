/**
 * MapService.js
 * Manages Google Maps initialisation, colored pin generation, and viewport-based pin fetching.
 * Used by useMapPins.js and MapScreen.js
 */

import { getCategoryColor } from '../utils/colorMapper';
import { getMapPins } from '../api/mediaClient';
import { isValidGPS } from '../utils/gpsHelpers';

// ─── Region helpers ────────────────────────────────────────────────────────

/**
 * Build the map viewport bounds from a react-native-maps region object.
 * @param {{ latitude, longitude, latitudeDelta, longitudeDelta }} region
 * @returns {{ northEast: {lat, lng}, southWest: {lat, lng} }}
 */
export function regionToBounds(region) {
    return {
        northEast: {
            lat: region.latitude + region.latitudeDelta / 2,
            lng: region.longitude + region.longitudeDelta / 2,
        },
        southWest: {
            lat: region.latitude - region.latitudeDelta / 2,
            lng: region.longitude - region.longitudeDelta / 2,
        },
    };
}

/**
 * Build a react-native-maps initialRegion centered on the user's location.
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [delta=0.05]  Zoom span in degrees
 * @returns {object} initialRegion
 */
export function buildInitialRegion(latitude, longitude, delta = 0.05) {
    return {
        latitude,
        longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
    };
}

// ─── Pin data transformation ──────────────────────────────────────────────

/**
 * Convert a raw API pin response into a descriptor ready for <Marker> rendering.
 * @param {object} pin  Raw API pin object
 * @returns {{
 *   id: string,
 *   coordinate: { latitude: number, longitude: number },
 *   color: string,
 *   title: string,
 *   imageThumbnail: string,
 *   trustScore: number,
 *   category: string,
 * }}
 */
export function buildPinDescriptor(pin) {
    if (!isValidGPS(pin.latitude, pin.longitude)) {
        return null; // Reject pins with bad coordinates
    }
    return {
        id: pin.id,
        coordinate: {
            latitude: pin.latitude,
            longitude: pin.longitude,
        },
        color: getCategoryColor(pin.category),
        title: pin.title || 'Community Issue',
        imageThumbnail: pin.imageThumbnail || null,
        trustScore: pin.trustScore ?? 0,
        category: pin.category || 'Unknown',
    };
}

// ─── Fetching ─────────────────────────────────────────────────────────────

/**
 * Fetch and transform all verified pins in the current viewport.
 * @param {{ latitude, longitude, latitudeDelta, longitudeDelta }} region
 * @param {string} [categoryFilter='All']  Filter by category name, or 'All'
 * @returns {Promise<Array>} Transformed pin descriptors
 */
export async function fetchPinsInViewport(region, categoryFilter = 'All') {
    const bounds = regionToBounds(region);
    const rawPins = await getMapPins(bounds);

    const pins = (rawPins || [])
        .map(buildPinDescriptor)
        .filter(Boolean); // Remove nulls from invalid GPS coords

    if (categoryFilter === 'All') return pins;
    return pins.filter(
        (p) => p.category.toLowerCase() === categoryFilter.toLowerCase()
    );
}

// ─── Mock data for offline/dev use ────────────────────────────────────────

/**
 * Returns a realistic set of mock pins for development & testing.
 * Located around Vijayawada, India (matches existing MapScreen fixture data).
 * @returns {Array}
 */
export function getMockPins() {
    return [
        {
            id: 'mock-1',
            latitude: 16.5062,
            longitude: 80.6480,
            category: 'Infrastructure',
            title: 'Large pothole on MG Road',
            imageThumbnail: null,
            trustScore: 96,
        },
        {
            id: 'mock-2',
            latitude: 16.5100,
            longitude: 80.6400,
            category: 'Safety',
            title: 'Broken street light',
            imageThumbnail: null,
            trustScore: 82,
        },
        {
            id: 'mock-3',
            latitude: 16.5000,
            longitude: 80.6500,
            category: 'Water',
            title: 'Overflowing drain near school',
            imageThumbnail: null,
            trustScore: 91,
        },
        {
            id: 'mock-4',
            latitude: 16.5020,
            longitude: 80.6380,
            category: 'Resolved',
            title: 'Road patch completed',
            imageThumbnail: null,
            trustScore: 88,
        },
        {
            id: 'mock-5',
            latitude: 16.5080,
            longitude: 80.6550,
            category: 'Urgent',
            title: 'Tree fallen on road',
            imageThumbnail: null,
            trustScore: 94,
        },
    ].map(buildPinDescriptor).filter(Boolean);
}
