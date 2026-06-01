// Open-Meteo API Configuration
export const API_BASE = 'https://api.open-meteo.com/v1';
export const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1';

// Weather code mapping (WMO codes)
// https://open-meteo.com/en/docs
export const weatherCodes = {
    0: { description: 'ясно', icon: 'wb_sunny', condition: 'clear' },
    1: { description: 'преимущественно ясно', icon: 'wb_cloudy', condition: 'clear' },
    2: { description: 'переменная облачность', icon: 'cloud', condition: 'clouds' },
    3: { description: 'пасмурно', icon: 'cloud', condition: 'clouds' },
    45: { description: 'туман', icon: 'foggy', condition: 'fog' },
    48: { description: 'инейный туман', icon: 'foggy', condition: 'fog' },
    51: { description: 'морось слабая', icon: 'grain', condition: 'rain' },
    53: { description: 'морось умеренная', icon: 'grain', condition: 'rain' },
    55: { description: 'морось сильная', icon: 'grain', condition: 'rain' },
    56: { description: 'замерзающая морось', icon: 'ac_unit', condition: 'snow' },
    57: { description: 'сильная замерзающая морось', icon: 'ac_unit', condition: 'snow' },
    61: { description: 'дождь слабый', icon: 'grain', condition: 'rain' },
    63: { description: 'дождь умеренный', icon: 'grain', condition: 'rain' },
    65: { description: 'дождь сильный', icon: 'grain', condition: 'rain' },
    66: { description: 'замерзающий дождь', icon: 'ac_unit', condition: 'snow' },
    67: { description: 'сильный замерзающий дождь', icon: 'ac_unit', condition: 'snow' },
    71: { description: 'снег слабый', icon: 'ac_unit', condition: 'snow' },
    73: { description: 'снег умеренный', icon: 'ac_unit', condition: 'snow' },
    75: { description: 'снег сильный', icon: 'ac_unit', condition: 'snow' },
    77: { description: 'снежные зерна', icon: 'ac_unit', condition: 'snow' },
    80: { description: 'ливни слабые', icon: 'grain', condition: 'rain' },
    81: { description: 'ливни умеренные', icon: 'grain', condition: 'rain' },
    82: { description: 'ливни сильные', icon: 'thunderstorm', condition: 'thunderstorm' },
    85: { description: 'снегопад слабый', icon: 'ac_unit', condition: 'snow' },
    86: { description: 'снегопад сильный', icon: 'ac_unit', condition: 'snow' },
    95: { description: 'гроза', icon: 'thunderstorm', condition: 'thunderstorm' },
    96: { description: 'гроза с градом', icon: 'thunderstorm', condition: 'thunderstorm' },
    99: { description: 'сильная гроза с градом', icon: 'thunderstorm', condition: 'thunderstorm' }
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
