import { weatherTips } from './config.js';

// Update current weather display
export function displayCurrentWeather(data, cityName) {
    const current = data.current_weather;
    const weatherCode = current.weathercode;
    const weather = getWeatherByCode(weatherCode);

    // Update background and animation
    updateWeatherBackground(weather.condition);
    startAnimation(weather.condition);
    
    // Update theme based on weather (light background → dark UI)
    updateTheme(weather.condition);

    // Get current time with timezone - use UTC to avoid timezone conversion issues
    const timezoneOffset = data.utc_offset_seconds || 0;
    const cityTime = new Date(Date.now() + timezoneOffset * 1000);

    // Update content
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('dateTime').textContent = cityTime.toLocaleDateString('ru-RU', {
        timeZone: 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('temperature').textContent = Math.round(current.temperature);
    document.getElementById('feelsLike').textContent = Math.round(current.temperature) + '°C';

    // Get hourly data if available
    let humidity = '--';
    let cloudcover = '--';
    let visibility = '--';
    let pressure = '--';
    let uvIndex = '--';

    if (data.hourly && data.hourly.relativehumidity_2m) {
        const currentHour = cityTime.getUTCHours();
        humidity = data.hourly.relativehumidity_2m[currentHour] || '--';
    }
    if (data.hourly && data.hourly.cloudcover) {
        const currentHour = cityTime.getUTCHours();
        cloudcover = data.hourly.cloudcover[currentHour] || '--';
    }
    if (data.hourly && data.hourly.visibility) {
        const currentHour = cityTime.getUTCHours();
        // Visibility in meters, convert to km
        const visMeters = data.hourly.visibility[currentHour];
        visibility = visMeters ? (visMeters / 1000).toFixed(1) : '--';
    }
    if (data.hourly && data.hourly.surface_pressure) {
        const currentHour = cityTime.getUTCHours();
        const pressureHPa = data.hourly.surface_pressure[currentHour];
        if (pressureHPa !== null && pressureHPa !== undefined) {
            // Convert hPa to mm Hg: 1 hPa ≈ 0.750062 mm Hg
            pressure = Math.round(pressureHPa * 0.750062);
        } else {
            pressure = '--';
        }
    }
    if (data.hourly && data.hourly.uv_index) {
        const currentHour = cityTime.getUTCHours();
        const uv = data.hourly.uv_index[currentHour];
        uvIndex = uv !== null && uv !== undefined ? (uv === 0 ? '0' : uv.toFixed(1)) : '--';
    }

    document.getElementById('humidity').textContent = humidity + '%';
    document.getElementById('windSpeed').textContent = current.windspeed + ' км/ч';
    document.getElementById('visibility').textContent = visibility + ' км';
    document.getElementById('pressure').textContent = pressure + ' мм рт.ст.';
    document.getElementById('clouds').textContent = cloudcover + '%';
    document.getElementById('uvIndex').textContent = uvIndex;
    document.getElementById('weatherIcon').textContent = weather.icon;
    document.getElementById('weatherDesc').textContent = weather.description;

    // Update wind direction (with degrees and rotating arrow)
    if (current.winddirection !== undefined && current.winddirection !== null) {
        const direction = getWindDirection(current.winddirection);
        const windDeg = Math.round(current.winddirection);
        const windDirElement = document.getElementById('windDirection');
        windDirElement.innerHTML = `${direction} (${windDeg}°) <span class="wind-arrow">↑</span>`;
        const arrow = windDirElement.querySelector('.wind-arrow');
        if (arrow) {
            arrow.style.transform = `rotate(${windDeg}deg)`;
        }
    } else {
        document.getElementById('windDirection').innerHTML = '-- <span class="wind-arrow">↑</span>';
    }

    // Update additional info
    document.getElementById('coordinates').textContent = `${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E`;
    document.getElementById('localTime').textContent = cityTime.toLocaleTimeString('ru-RU', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Update sunrise and sunset
    if (data.daily && data.daily.sunrise && data.daily.sunset) {
        const todayIndex = 0; // Today's data
        const sunrise = data.daily.sunrise[todayIndex];
        const sunset = data.daily.sunset[todayIndex];
        if (sunrise) {
            const sunriseDate = new Date(sunrise);
            document.getElementById('sunrise').textContent = sunriseDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            document.getElementById('sunrise').textContent = '--';
        }
        if (sunset) {
            const sunsetDate = new Date(sunset);
            document.getElementById('sunset').textContent = sunsetDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            document.getElementById('sunset').textContent = '--';
        }
    } else {
        document.getElementById('sunrise').textContent = '--';
        document.getElementById('sunset').textContent = '--';
    }

    // Update weather tip
    const tip = weatherTips[weather.condition] || weatherTips.default;
    document.getElementById('weatherTip').textContent = tip;
}

export function displayForecast(days, forecastData) {
    if (!forecastData || !forecastData.daily) return;

    const daily = forecastData.daily;
    const availableDays = daily.time.length;
    const maxDays = 16;
    const forecastContainer = document.getElementById('forecastContainer');

    forecastContainer.innerHTML = '';

    if (days > maxDays) {
        const infoCard = document.createElement('div');
        infoCard.className = 'forecast-card';
        infoCard.style.gridColumn = '1 / -1';
        infoCard.style.textAlign = 'center';
        infoCard.style.background = 'rgba(255, 200, 100, 0.3)';
        infoCard.innerHTML = `
            <p style="font-size: 1rem; margin: 10px;">
                Open-Meteo предоставляет прогноз на максимум ${maxDays} дней.<br>
                Запрошено: ${days} дней.<br>
                <small>Показываю доступные ${availableDays} дней:</small>
            </p>
        `;
        forecastContainer.appendChild(infoCard);
    }

    const displayCount = Math.min(days, availableDays, maxDays);

    for (let i = 0; i < displayCount; i++) {
        const date = new Date(daily.time[i] + 'T00:00:00');
        const weatherCode = daily.weathercode[i];
        const weather = getWeatherByCode(weatherCode);
        const tempMax = daily.temperature_2m_max[i];
        const tempMin = daily.temperature_2m_min[i];
        const tempAvg = (tempMax + tempMin) / 2;

        // Get additional daily data
        const windSpeed = daily.windspeed_10m_max ? Math.round(daily.windspeed_10m_max[i]) : '--';
        const windDir = daily.winddirection_10m_dominant ? Math.round(daily.winddirection_10m_dominant[i]) : null;
        const pressure = daily.surface_pressure_max ? Math.round(daily.surface_pressure_max[i] * 0.750062) : '--';
        const precipitation = daily.precipitation_sum ? daily.precipitation_sum[i].toFixed(1) : '--';
        const uvIndex = daily.uv_index_max ? daily.uv_index_max[i] : null;
        const sunrise = daily.sunrise ? daily.sunrise[i] : null;
        const sunset = daily.sunset ? daily.sunset[i] : null;

        // Format wind direction
        const windDirText = windDir !== null ? `${getWindDirection(windDir)} (${windDir}°)` : '--';
        
        // Format UV index
        const uvText = uvIndex !== null ? (uvIndex === 0 ? '0' : uvIndex.toFixed(1)) : '--';
        
        // Format sunrise/sunset
        const timeStr = (timeStr) => {
            if (!timeStr) return '--';
            const d = new Date(timeStr);
            return d.toLocaleTimeString('ru-RU', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
        };
        const sunriseText = timeStr(sunrise);
        const sunsetText = timeStr(sunset);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="date">${formatDate(date)}</div>
            <div class="icon">${weather.icon}</div>
            <div class="temp">${Math.round(tempAvg)}°C</div>
            <div class="temp-min">↓${Math.round(tempMin)}° ↑${Math.round(tempMax)}°</div>
            <div class="description">${weather.description}</div>
            <div class="details">
                <div class="detail-item">
                    <span class="material-icons">air</span>
                    <div>
                        <p class="label">Ветер</p>
                        <p class="value">${windSpeed} км/ч</p>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="material-icons">explore</span>
                    <div>
                        <p class="label">Направление</p>
                        <p class="value">${windDirText}</p>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="material-icons">speed</span>
                    <div>
                        <p class="label">Давление</p>
                        <p class="value">${pressure} мм рт.ст.</p>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="material-icons">water</span>
                    <div>
                        <p class="label">Осадки</p>
                        <p class="value">${precipitation} мм</p>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="material-icons">wb_sunny</span>
                    <div>
                        <p class="label">УФ-индекс</p>
                        <p class="value">${uvText}</p>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="material-icons">wb_twilight</span>
                    <div>
                        <p class="label">Восход/Закат</p>
                        <p class="value">${sunriseText} / ${sunsetText}</p>
                    </div>
                </div>
            </div>
        `;
        // Add click handler to open modal
        card.addEventListener('click', () => {
            openModal({
                date: formatDate(date),
                icon: weather.icon,
                temp: Math.round(tempAvg) + '°C',
                description: weather.description,
                windSpeed: windSpeed,
                windDir: windDirText,
                windDirDeg: windDir,
                pressure: pressure,
                precipitation: precipitation,
                uv: uvText,
                sunrise: sunriseText,
                sunset: sunsetText
            });
        });

        forecastContainer.appendChild(card);
    }
}

// Convert wind direction in degrees to compass direction
function getWindDirection(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function getWeatherByCode(code) {
    const weatherCodes = {
        0: { description: 'ясно', icon: '☀️', condition: 'clear' },
        1: { description: 'преимущественно ясно', icon: '⛅', condition: 'clear' },
        2: { description: 'переменная облачность', icon: '⛅', condition: 'clouds' },
        3: { description: 'пасмурно', icon: '☁️', condition: 'clouds' },
        45: { description: 'туман', icon: '🌫️', condition: 'fog' },
        48: { description: 'инейный туман', icon: '🌫️', condition: 'fog' },
        51: { description: 'морось слабая', icon: '🌦️', condition: 'rain' },
        53: { description: 'морось умеренная', icon: '🌦️', condition: 'rain' },
        55: { description: 'морось сильная', icon: '🌧️', condition: 'rain' },
        56: { description: 'замерзающая морось', icon: '🌧️', condition: 'snow' },
        57: { description: 'сильная замерзающая морось', icon: '❄️', condition: 'snow' },
        61: { description: 'дождь слабый', icon: '🌦️', condition: 'rain' },
        63: { description: 'дождь умеренный', icon: '🌧️', condition: 'rain' },
        65: { description: 'дождь сильный', icon: '🌧️', condition: 'rain' },
        66: { description: 'замерзающий дождь', icon: '❄️', condition: 'snow' },
        67: { description: 'сильный замерзающий дождь', icon: '❄️', condition: 'snow' },
        71: { description: 'снег слабый', icon: '❄️', condition: 'snow' },
        73: { description: 'снег умеренный', icon: '❄️', condition: 'snow' },
        75: { description: 'снег сильный', icon: '❄️', condition: 'snow' },
        77: { description: 'снежные зёрна', icon: '❄️', condition: 'snow' },
        80: { description: 'ливни слабые', icon: '🌧️', condition: 'rain' },
        81: { description: 'ливни умеренные', icon: '🌧️', condition: 'rain' },
        82: { description: 'ливни сильные', icon: '⛈️', condition: 'thunderstorm' },
        85: { description: 'снегопад слабый', icon: '❄️', condition: 'snow' },
        86: { description: 'снегопад сильный', icon: '❄️', condition: 'snow' },
        95: { description: 'гроза', icon: '⛈️', condition: 'thunderstorm' },
        96: { description: 'гроза с градом', icon: '⛈️', condition: 'thunderstorm' },
        99: { description: 'сильная гроза с градом', icon: '⛈️', condition: 'thunderstorm' }
    };
    return weatherCodes[code] || { description: 'неизвестно', icon: '🌡️', condition: 'clear' };
}

function updateWeatherBackground(condition) {
    const weatherBackground = document.getElementById('weatherBackground');
    // Remove all weather classes
    weatherBackground.classList.remove('clear', 'clouds', 'rain', 'snow', 'thunderstorm', 'fog');

    // Add appropriate class
    if (condition === 'clear') {
        weatherBackground.classList.add('clear');
    } else if (condition === 'clouds') {
        weatherBackground.classList.add('clouds');
    } else if (condition === 'rain' || condition === 'drizzle') {
        weatherBackground.classList.add('rain');
    } else if (condition === 'snow') {
        weatherBackground.classList.add('snow');
    } else if (condition === 'thunderstorm') {
        weatherBackground.classList.add('thunderstorm');
    } else if (condition === 'mist' || condition === 'fog' || condition === 'haze') {
        weatherBackground.classList.add('fog');
    } else {
        weatherBackground.classList.add('clear');
    }
}

function updateTheme(condition) {
    // Force dark appearance: light text on dark background
    // Always use light theme (remove dark overrides)
    if (typeof window.applyThemeSettings === 'function') {
        window.applyThemeSettings(false); // false = light theme (light text on dark)
    } else {
        const body = document.body;
        body.style.removeProperty('--glass-bg');
        body.style.removeProperty('--glass-border');
        body.style.removeProperty('--glass-shadow');
        body.style.removeProperty('--text-primary');
        body.style.removeProperty('--text-secondary');
        body.style.removeProperty('--accent');
        body.style.removeProperty('--liquid-gradient');
    }
}

function startAnimation(condition) {
    const animationContainer = document.getElementById('animationContainer');
    // Import and use animations module
    window.startAnimationLogic(condition, animationContainer);
}

function formatDate(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Завтра';
    } else {
        return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    }
}

export function showLoading(show) {
    const loading = document.getElementById('loading');
    const weatherContent = document.getElementById('weatherContent');
    loading.style.display = show ? 'block' : 'none';
    if (show) {
        weatherContent.style.display = 'none';
    } else {
        weatherContent.style.display = 'block';
    }
}

// Modal functionality
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');

function openModal(dayData) {
    if (!dayData) return;

    // Populate modal
    document.getElementById('modalDate').textContent = dayData.date;
    document.getElementById('modalIcon').textContent = dayData.icon;
    document.getElementById('modalTemp').textContent = dayData.temp;
    document.getElementById('modalDesc').textContent = dayData.description;

    // Build details grid
    const detailsContainer = document.getElementById('modalDetails');
    detailsContainer.innerHTML = '';
    const details = [
        { icon: 'air', label: 'Ветер', value: dayData.windSpeed + ' км/ч' },
        { icon: 'explore', label: 'Направление', value: dayData.windDir, hasArrow: dayData.windDirDeg },
        { icon: 'speed', label: 'Давление', value: dayData.pressure + ' мм рт.ст.' },
        { icon: 'water', label: 'Осадки', value: dayData.precipitation + ' мм' },
        { icon: 'wb_sunny', label: 'УФ-индекс', value: dayData.uv },
        { icon: 'wb_twilight', label: 'Восход/Закат', value: dayData.sunrise + ' / ' + dayData.sunset }
    ];

    details.forEach(det => {
        const item = document.createElement('div');
        item.className = 'detail-item';
        const arrowHtml = (det.hasArrow !== undefined && det.hasArrow !== null)
            ? `<span class="wind-arrow" style="transform: rotate(${det.hasArrow}deg)">↑</span>`
            : '';
        item.innerHTML = `
            <span class="material-icons">${det.icon}</span>
            <div>
                <p class="label">${det.label}</p>
                <p class="value">${det.value}${arrowHtml}</p>
            </div>
        `;
        detailsContainer.appendChild(item);
    });

    // Show modal
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// Close modal events
if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}
if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});
