// Open-Meteo API Configuration
export const API_BASE = 'https://api.open-meteo.com/v1';
export const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1';

// Weather code mapping (WMO codes)
// https://open-meteo.com/en/docs
export const weatherCodes = {
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

// Weather tips based on conditions
export const weatherTips = {
    clear: 'Сегодня отличная погода! Не забудьте солнцезащитные очки и крем от загара.',
    clouds: 'Облачная погода. Возьмите с собой лёгкую куртку на случай ветра.',
    rain: 'Ожидается дождь! Не забудьте зонт и водонепроницаемую обувь.',
    snow: 'Снегопад! Одевайтесь тепло и будьте осторожны на дорогах.',
    thunderstorm: 'Гроза! Постарайтесь оставаться в помещении, избегайте открытых пространств.',
    fog: 'Туман может снижать видимость. Будьте внимательны на дороге.',
    default: 'Проверьте прогноз перед выходом. Одевайтесь по погоде!'
};
