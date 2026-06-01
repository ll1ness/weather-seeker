// Favorites Module
// Stores favorite cities in localStorage

const STORAGE_KEY = 'weather-seeker-favorites';
const MAX_FAVORITES = 10;

/**
 * Get favorite cities from localStorage
 * @returns {Array<{name: string, lat: number, lon: number}>}
 */
export function getFavorites() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Failed to read favorites:', e);
        return [];
    }
}

/**
 * Check if a city is in favorites
 * @param {number} lat
 * @param {number} lon
 * @returns {boolean}
 */
export function isFavorite(lat, lon) {
    if (lat == null || lon == null) return false;
    const favorites = getFavorites();
    const key = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    return favorites.some(item => {
        const itemKey = `${item.lat.toFixed(2)}-${item.lon.toFixed(2)}`;
        return itemKey === key;
    });
}

/**
 * Toggle a city in favorites (add if not exists, remove if exists)
 * @param {string} name - City display name
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} - New state: true if added, false if removed
 */
export function toggleFavorite(name, lat, lon) {
    if (!name || lat == null || lon == null) return false;

    const favorites = getFavorites();
    const key = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const existingIndex = favorites.findIndex(item => {
        const itemKey = `${item.lat.toFixed(2)}-${item.lon.toFixed(2)}`;
        return itemKey === key;
    });

    if (existingIndex !== -1) {
        // Remove from favorites
        favorites.splice(existingIndex, 1);
        saveFavorites(favorites);
        return false; // removed
    } else {
        // Add to favorites
        if (favorites.length >= MAX_FAVORITES) {
            favorites.pop(); // remove oldest
        }
        favorites.unshift({ name, lat, lon });
        saveFavorites(favorites);
        return true; // added
    }
}

/**
 * Remove a city from favorites
 * @param {number} lat
 * @param {number} lon
 */
export function removeFavorite(lat, lon) {
    if (lat == null || lon == null) return;
    const favorites = getFavorites();
    const key = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const filtered = favorites.filter(item => {
        const itemKey = `${item.lat.toFixed(2)}-${item.lon.toFixed(2)}`;
        return itemKey !== key;
    });
    saveFavorites(filtered);
}

/**
 * Save favorites array to localStorage
 * @param {Array} favorites
 */
function saveFavorites(favorites) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
        console.warn('Failed to save favorites:', e);
    }
}

/**
 * Clear all favorites
 */
export function clearFavorites() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear favorites:', e);
    }
}