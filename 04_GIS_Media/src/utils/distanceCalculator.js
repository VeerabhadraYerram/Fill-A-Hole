/**
 * distanceCalculator.js
 * Pure-JS Haversine distance formula — no external dependency required.
 * Used by ExifValidator for location-match check and by MapService for pin radius filtering.
 */

const EARTH_RADIUS_METERS = 6371000; // metres

/**
 * Calculate the distance in meters between two GPS coordinates using the Haversine formula.
 * @param {number} lat1  Latitude of point A (decimal degrees)
 * @param {number} lng1  Longitude of point A (decimal degrees)
 * @param {number} lat2  Latitude of point B (decimal degrees)
 * @param {number} lng2  Longitude of point B (decimal degrees)
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}

/**
 * Check if two points are within a given radius of each other.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @param {number} radiusMeters
 * @returns {boolean}
 */
export function isWithinRadius(lat1, lng1, lat2, lng2, radiusMeters) {
    return haversineDistance(lat1, lng1, lat2, lng2) <= radiusMeters;
}

/**
 * Format a distance in meters into a human-readable string.
 * @param {number} meters
 * @returns {string} e.g. "250 m" or "1.2 km"
 */
export function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}
