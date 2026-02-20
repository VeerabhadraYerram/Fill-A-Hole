/**
 * mediaClient.js
 * Axios API client for all 04_GIS_Media backend calls.
 * Wraps the 5 endpoints used by MapService, CameraService, VerificationService, NavigationService.
 */

import axios from 'axios';

// Pull from env — works with react-native-dotenv or Expo's babel plugin
const BASE_URL =
    (typeof process !== 'undefined' && process.env?.API_BASE_URL) ||
    'http://localhost:3000/api';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// ── Request interceptor: attach auth token if present ──────────────────────
client.interceptors.request.use((config) => {
    // Token gets set via setAuthToken() below
    return config;
});

// ── Response interceptor: normalise errors ─────────────────────────────────
client.interceptors.response.use(
    (res) => res.data,
    (err) => {
        const message =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'Network error';
        return Promise.reject(new Error(message));
    }
);

/**
 * Attach a Bearer token to all subsequent requests (call after login).
 * @param {string} token
 */
export function setAuthToken(token) {
    if (token) {
        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete client.defaults.headers.common['Authorization'];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1 — Map pins in viewport
// GET /api/map/pins?bounds=NE_LAT,NE_LNG,SW_LAT,SW_LNG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all verified issue pins within the current map viewport.
 * @param {{ northEast: {lat, lng}, southWest: {lat, lng} }} bounds
 * @returns {Promise<Array<{id, latitude, longitude, category, title, imageThumbnail, trustScore}>>}
 */
export function getMapPins(bounds) {
    const { northEast, southWest } = bounds;
    const boundsParam = `${northEast.lat},${northEast.lng},${southWest.lat},${southWest.lng}`;
    return client.get('/map/pins', { params: { bounds: boundsParam } });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2 — Upload photo with GPS metadata (temporary)
// POST /api/media/upload-temp
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a photo with embedded GPS metadata. Returns a temporary mediaId.
 * @param {string} photoUri  Local file URI from expo-camera
 * @param {object} gpsMetadata  { latitude, longitude, altitude, accuracy, timestamp, deviceInfo }
 * @returns {Promise<{ mediaId: string, uploadUrl: string }>}
 */
export async function uploadTempMedia(photoUri, gpsMetadata) {
    // Build multipart form data
    const formData = new FormData();
    const filename = photoUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', { uri: photoUri, name: filename, type });
    formData.append('metadata', JSON.stringify(gpsMetadata));

    return client.post('/media/upload-temp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 3 — Run EXIF verification on an uploaded media item
// POST /api/media/verify
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger EXIF verification on the backend for an uploaded media item.
 * @param {string} mediaId
 * @param {number} reportedLat
 * @param {number} reportedLng
 * @returns {Promise<{ trustScore: number, checks: string[], isVerified: boolean }>}
 */
export function verifyMedia(mediaId, reportedLat, reportedLng) {
    return client.post('/media/verify', { mediaId, reportedLat, reportedLng });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 4 — Poll verification status of a media item
// GET /api/media/:id/status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current verification status and trust score for a media item.
 * @param {string} mediaId
 * @returns {Promise<{ trustScore: number, decision: 'VERIFIED'|'PENDING'|'FLAGGED', checks: string[] }>}
 */
export function getMediaStatus(mediaId) {
    return client.get(`/media/${mediaId}/status`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 5 — Get post location for double-click map navigation
// GET /api/posts/:postId/location
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the exact GPS location of a post (for double-click → map navigation).
 * @param {string} postId
 * @returns {Promise<{ latitude: number, longitude: number }>}
 */
export function getPostLocation(postId) {
    return client.get(`/posts/${postId}/location`);
}

export default client;
