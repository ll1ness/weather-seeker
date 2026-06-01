import { weatherTips } from './config.js';

// Update current weather display
export function displayCurrentWeather(data, cityName) {
    const current = data.current_weather;
    const weatherCode = current.weathercode;
    const weather = getWeatherByCode(weatherCode);

    // Update background and animation
    updateWeatherBackground(weather.condition);
    startAnimation(weather.condition);

    // Get current time with timezone
    const now = new Date();
    const timezoneOffset = data.utc_offset_seconds || 0;
    const localTime = new Date(now.getTime() + (timezoneOffset * 1000));

    // Update content
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('dateTime').textContent = localTime.toLocaleDateString('ru-RU', {
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

    if (data.hourly && data.hourly.relativehumidity_2m) {
        const currentHour = localTime.getHours();
        humidity = data.hourly.relativehumidity_2m[currentHour] || '--';
    }
    if (data.hourly && data.hourly.cloudcover) {
        const currentHour = localTime.getHours();
        cloudcover = data.hourly.cloudcover[currentHour] || '--';
    }

    document.getElementById('humidity').textContent = humidity + '%';
    document.getElementById('windSpeed').textContent = current.windspeed + ' км/ч';
    document.getElementById('visibility').textContent = '-- км';
    document.getElementById('pressure').textContent = '-- гПа';
    document.getElementById('clouds').textContent = cloudcover + '%';
    document.getElementById('weatherIcon').textContent = weather.icon;
    document.getElementById('weatherDesc').textContent = weather.description;

    // Update additional info
    document.getElementById('coordinates').textContent = `${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E`;
    document.getElementById('localTime').textContent = localTime.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

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

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="date">${formatDate(date)}</div>
            <div class="icon">${weather.icon}</div>
            <div class="temp">${Math.round(tempAvg)}°C</div>
            <div class="temp-min">↓${Math.round(tempMin)}° ↑${Math.round(tempMax)}°</div>
            <div class="description">${weather.description}</div>
        `;
        forecastContainer.appendChild(card);
    }
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
        77: { description: 'снежные зерна', icon: '❄️', condition: 'snow' },
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
    }
}
