/**
 * gpsHelpers.js
 * GPS coordinate utilities for Fill-A-Hole GIS Media module.
 */

/**
 * Format decimal lat/lng into a human-readable string.
 * @param {number} lat
 * @param {number} lng
 * @returns {string} e.g. "16.5062°N, 80.6480°E"
 */
export function formatCoords(lat, lng) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/**
 * Validate that latitude and longitude are within valid ranges.
 * @param {number} lat  -90 to 90
 * @param {number} lng  -180 to 180
 * @returns {boolean}
 */
export function isValidGPS(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (isNaN(lat) || isNaN(lng)) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Convert Degrees-Minutes-Seconds to decimal degrees.
 * @param {number} degrees
 * @param {number} minutes
 * @param {number} seconds
 * @param {string} direction 'N' | 'S' | 'E' | 'W'
 * @returns {number} Decimal degrees
 */
export function dmsToDecimal(degrees, minutes, seconds, direction) {
    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }
    return decimal;
}

/**
 * Format GPS accuracy into a human-readable strength label.
 * @param {number} accuracy  Accuracy in meters
 * @returns {{ label: string, level: 'strong' | 'acceptable' | 'weak' }}
 */
export function getGpsStrengthLabel(accuracy) {
    if (accuracy < 20) {
        return { label: `Strong (±${Math.round(accuracy)}m)`, level: 'strong' };
    } else if (accuracy < 50) {
        return { label: `Acceptable (±${Math.round(accuracy)}m)`, level: 'acceptable' };
    }
    return { label: `Weak (±${Math.round(accuracy)}m)`, level: 'weak' };
}

/**
 * Format an expo-location coords object into a clean metadata object.
 * @param {object} coords  expo-location coords
 * @returns {object}
 */
export function extractGpsMetadata(coords) {
    return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude ?? null,
        accuracy: coords.accuracy ?? null,
        altitudeAccuracy: coords.altitudeAccuracy ?? null,
        heading: coords.heading ?? null,
        speed: coords.speed ?? null,
    };
}
