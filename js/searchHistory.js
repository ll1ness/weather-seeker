// Search History Module
// Stores recent city searches in localStorage

const STORAGE_KEY = 'weather-seeker-history';
const MAX_ITEMS = 15;

/**
 * Get search history from localStorage
 * @returns {Array<{name: string, lat: number, lon: number, timestamp: number}>}
 */
export function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Failed to read search history:', e);
        return [];
    }
}

/**
 * Add a city to search history
 * @param {string} name - City display name
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
export function addToHistory(name, lat, lon) {
    if (!name || lat == null || lon == null) return;

    const history = getHistory();
    
    // Remove duplicate if exists (by lat/lon rounded to 2 decimals)
    const key = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const filtered = history.filter(item => {
        const itemKey = `${item.lat.toFixed(2)}-${item.lon.toFixed(2)}`;
        return itemKey !== key;
    });

    // Add new entry at the beginning
    filtered.unshift({
        name: name,
        lat: lat,
        lon: lon,
        timestamp: Date.now()
    });

    // Trim to max items
    if (filtered.length > MAX_ITEMS) {
        filtered.length = MAX_ITEMS;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.warn('Failed to save search history:', e);
    }
}

/**
 * Clear all search history
 */
export function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear search history:', e);
    }
}

/**
 * Format timestamp for display
 * @param {number} timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    // Less than 1 minute
    if (diff < 60000) return 'только что';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
    }
    // Older
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}