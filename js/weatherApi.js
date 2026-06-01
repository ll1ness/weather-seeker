import { API_BASE, GEOCODE_BASE } from './config.js';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchWeatherByCoords(lat, lon) {
    const cacheKey = `weather-${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const now = Date.now();

    // Check cache
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }

    try {
        const response = await fetch(
            `${API_BASE}/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,cloudcover,visibility,surface_pressure,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,surface_pressure_max,precipitation_sum,sunrise,sunset,uv_index_max,winddirection_10m_dominant&forecast_days=16&timezone=auto`
        );

        if (!response.ok) {
            throw new Error(`Сервер погоды вернул ошибку: ${response.status}. Проверьте подключение к интернету.`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Cache the result
        cache.set(cacheKey, {
            data,
            timestamp: now
        });

        return data;
    } catch (error) {
        console.error('Error fetching weather:', error);
        throw error;
    }
}

export async function searchCity(city) {
    try {
        const response = await fetch(
            `${GEOCODE_BASE}/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error('Город не найден');
        }

        return data.results[0];
    } catch (error) {
        console.error('Error searching city:', error);
        throw error;
    }
}

export async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(
            `${GEOCODE_BASE}/reverse?latitude=${lat}&longitude=${lon}&language=ru`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return null;
    }
}

export function clearCache() {
    cache.clear();
}
