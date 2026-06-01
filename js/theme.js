// Theme Module
// Manages light/dark/auto theme switching with localStorage persistence

const STORAGE_KEY = 'weather-seeker-theme';

/**
 * Available theme modes
 */
export const THEMES = {
    DARK: 'dark',
    LIGHT: 'light',
    AUTO: 'auto'
};

/**
 * Get saved theme preference
 * @returns {string} 'dark', 'light', or 'auto'
 */
export function getThemePreference() {
    try {
        return localStorage.getItem(STORAGE_KEY) || THEMES.DARK;
    } catch (e) {
        return THEMES.DARK;
    }
}

/**
 * Save theme preference
 * @param {string} theme - 'dark', 'light', or 'auto'
 */
export function setThemePreference(theme) {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
        console.warn('Failed to save theme preference:', e);
    }
}

/**
 * Determine if dark mode should be active based on preference and time
 * @param {string} preference - 'dark', 'light', or 'auto'
 * @returns {boolean} true if dark mode
 */
export function shouldUseDarkMode(preference) {
    if (preference === THEMES.DARK) return true;
    if (preference === THEMES.LIGHT) return false;
    
    // Auto: use system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
    }
    return false;
}

/**
 * Apply theme to the document
 * @param {boolean} isDark - true for dark mode, false for light
 */
export function applyTheme(isDark) {
    const body = document.body;
    
    if (isDark) {
        body.classList.remove('light-theme');
        // Reset to CSS variable defaults (dark theme)
        body.style.removeProperty('--glass-bg');
        body.style.removeProperty('--glass-border');
        body.style.removeProperty('--glass-shadow');
        body.style.removeProperty('--text-primary');
        body.style.removeProperty('--text-secondary');
        body.style.removeProperty('--accent');
        body.style.removeProperty('--liquid-gradient');
        body.style.removeProperty('--bg-color');
    } else {
        body.classList.add('light-theme');
        // Light theme overrides
        body.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.7)');
        body.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.12)');
        body.style.setProperty('--glass-shadow', 'rgba(0, 0, 0, 0.1)');
        body.style.setProperty('--text-primary', '#1a1a2e');
        body.style.setProperty('--text-secondary', 'rgba(26, 26, 46, 0.7)');
        body.style.setProperty('--accent', 'rgba(0, 0, 0, 0.08)');
        body.style.setProperty('--liquid-gradient', 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.1) 100%)');
        body.style.setProperty('--bg-color', '#f0f2f5');
    }
}

/**
 * Initialize theme system
 * @returns {string} current theme preference
 */
export function initTheme() {
    const preference = getThemePreference();
    const isDark = shouldUseDarkMode(preference);
    applyTheme(isDark);
    return preference;
}

/**
 * Listen for system theme changes (for auto mode)
 * @param {Function} callback - called with boolean (isDark)
 */
export function listenForSystemTheme(callback) {
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            const preference = getThemePreference();
            if (preference === THEMES.AUTO) {
                callback(e.matches);
            }
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }
    return () => {};
}