/**
 * colorMapper.js
 * Maps issue categories to their designated pin colors for the map.
 * Colors match the Fill-A-Hole design spec exactly.
 */

/** @type {Record<string, string>} */
const CATEGORY_COLORS = {
    // Primary categories
    Infrastructure: '#EF4444',   // Red — roads, potholes, bridges
    Safety: '#F59E0B',           // Orange — hazards, lighting
    Water: '#3B82F6',            // Blue — leaks, flooding
    Sanitation: '#8B5CF6',       // Purple — waste, sewage
    Green: '#10B981',            // Green — parks, trees
    Urgent: '#8B5CF6',           // Purple — high priority
    Resolved: '#6B7280',         // Gray — closed/fixed issues

    // Alternate casings & aliases
    infrastructure: '#EF4444',
    safety: '#F59E0B',
    water: '#3B82F6',
    sanitation: '#8B5CF6',
    green: '#10B981',
    urgent: '#8B5CF6',
    resolved: '#6B7280',

    // Common aliases
    Roads: '#EF4444',
    Potholes: '#EF4444',
    Flooding: '#3B82F6',
    Waste: '#8B5CF6',
    Parks: '#10B981',
    Cleanliness: '#8B5CF6',
};

/** Default color for unknown categories */
const DEFAULT_COLOR = '#6B7280';

/**
 * Get the hex pin color for a given issue category.
 * @param {string} category
 * @returns {string} hex color string
 */
export function getCategoryColor(category) {
    if (!category) return DEFAULT_COLOR;
    return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

/**
 * Get all defined category → color pairs (for rendering legends).
 * @returns {Array<{ category: string, color: string }>}
 */
export function getCategoryLegend() {
    return [
        { category: 'Infrastructure', color: '#EF4444' },
        { category: 'Safety', color: '#F59E0B' },
        { category: 'Water', color: '#3B82F6' },
        { category: 'Sanitation', color: '#8B5CF6' },
        { category: 'Green', color: '#10B981' },
        { category: 'Urgent', color: '#8B5CF6' },
        { category: 'Resolved', color: '#6B7280' },
    ];
}

/**
 * Get a lighter background shade for a category (for badges/chips).
 * @param {string} category
 * @returns {string} hex color with 20% opacity as rgba string
 */
export function getCategoryColorAlpha(category) {
    const hex = getCategoryColor(category);
    // Convert hex to RGB and apply 0.15 alpha
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
}
