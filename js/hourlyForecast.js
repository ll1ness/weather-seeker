// Hourly Forecast Module
// Displays hourly weather forecast as a horizontal scrollable carousel

/**
 * Weather codes with emoji icons (matching ui.js display style)
 */
const hourlyWeatherCodes = {
    0: { description: 'ясно', icon: '☀️' },
    1: { description: 'преимущественно ясно', icon: '⛅' },
    2: { description: 'переменная облачность', icon: '⛅' },
    3: { description: 'пасмурно', icon: '☁️' },
    45: { description: 'туман', icon: '🌫️' },
    48: { description: 'инейный туман', icon: '🌫️' },
    51: { description: 'морось слабая', icon: '🌦️' },
    53: { description: 'морось умеренная', icon: '🌦️' },
    55: { description: 'морось сильная', icon: '🌧️' },
    56: { description: 'замерзающая морось', icon: '🌧️' },
    57: { description: 'сильная замерзающая морось', icon: '❄️' },
    61: { description: 'дождь слабый', icon: '🌦️' },
    63: { description: 'дождь умеренный', icon: '🌧️' },
    65: { description: 'дождь сильный', icon: '🌧️' },
    66: { description: 'замерзающий дождь', icon: '❄️' },
    67: { description: 'сильный замерзающий дождь', icon: '❄️' },
    71: { description: 'снег слабый', icon: '❄️' },
    73: { description: 'снег умеренный', icon: '❄️' },
    75: { description: 'снег сильный', icon: '❄️' },
    77: { description: 'снежные зерна', icon: '❄️' },
    80: { description: 'ливни слабые', icon: '🌧️' },
    81: { description: 'ливни умеренные', icon: '🌧️' },
    82: { description: 'ливни сильные', icon: '⛈️' },
    85: { description: 'снегопад слабый', icon: '❄️' },
    86: { description: 'снегопад сильный', icon: '❄️' },
    95: { description: 'гроза', icon: '⛈️' },
    96: { description: 'гроза с градом', icon: '⛈️' },
    99: { description: 'сильная гроза с градом', icon: '⛈️' }
};

function getWeatherByCode(code) {
    return hourlyWeatherCodes[code] || { description: 'неизвестно', icon: '🌡️' };
}

/**
 * Format hour for display
 * @param {string} timeStr - ISO time string (e.g., "2026-06-01T10:00")
 * @returns {string}
 */
function formatHour(timeStr) {
    const date = new Date(timeStr);
    const now = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Check if this is the current hour
    if (date.getHours() === now.getHours() && 
        date.getDate() === now.getDate() && 
        date.getMonth() === now.getMonth()) {
        return 'Сейчас';
    }
    
    return `${hours}:${minutes}`;
}

/**
 * Get a temperature-based color
 * @param {number} temp - Temperature in Celsius
 * @returns {string}
 */
function getTempColor(temp) {
    if (temp >= 35) return '#ff4444';
    if (temp >= 25) return '#ff8c00';
    if (temp >= 15) return '#ffd700';
    if (temp >= 5) return '#4ecdc4';
    if (temp >= -5) return '#45b7d1';
    if (temp >= -15) return '#6c5ce7';
    return '#a29bfe';
}

/**
 * Render hourly forecast
 * @param {Object} hourly - Hourly data from API
 * @param {number} hoursToShow - Number of hours to display (default: 24)
 */
export function renderHourlyForecast(hourly, hoursToShow = 24) {
    const container = document.getElementById('hourlyForecast');
    if (!container || !hourly || !hourly.time) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = now.toISOString().split('T')[0];

    // Find the starting index: current hour today
    let startIndex = hourly.time.findIndex(t => {
        const d = new Date(t);
        return d.getHours() >= currentHour && t.startsWith(currentDate);
    });

    // If no matching hour found today, start from the beginning
    if (startIndex === -1) {
        startIndex = 0;
    }

    const endIndex = Math.min(startIndex + hoursToShow, hourly.time.length);
    const hoursToRender = Math.min(endIndex - startIndex, 48);

    container.innerHTML = '';

    for (let i = 0; i < hoursToRender; i++) {
        const idx = startIndex + i;
        if (idx >= hourly.time.length) break;

        const timeStr = hourly.time[idx];
        const temp = hourly.temperature_2m ? Math.round(hourly.temperature_2m[idx]) : '--';
        const weatherCode = hourly.weathercode ? hourly.weathercode[idx] : 0;
        const weather = getWeatherByCode(weatherCode);
        const precip = hourly.precipitation_probability ? hourly.precipitation_probability[idx] : null;
        const wind = hourly.windspeed_10m ? Math.round(hourly.windspeed_10m[idx]) : null;

        const isNow = i === 0;
        const tempColor = typeof temp === 'number' ? getTempColor(temp) : 'var(--text-primary)';

        const card = document.createElement('div');
        card.className = `hourly-card${isNow ? ' now' : ''}`;
        card.innerHTML = `
            <div class="hourly-time">${isNow ? 'Сейчас' : formatHour(timeStr)}</div>
            <div class="hourly-icon">${weather.icon}</div>
            <div class="hourly-temp" style="color: ${tempColor}">${temp}°</div>
            ${precip !== null ? `<div class="hourly-precip">${precip > 0 ? '💧' : ''} ${precip > 0 ? precip + '%' : ''}</div>` : ''}
            ${wind !== null ? `<div class="hourly-wind">💨 ${wind}</div>` : ''}
            <div class="hourly-desc">${weather.description}</div>
        `;
        container.appendChild(card);
    }
}

/**
 * Clear hourly forecast
 */
export function clearHourlyForecast() {
    const container = document.getElementById('hourlyForecast');
    if (container) {
        container.innerHTML = '';
    }
}