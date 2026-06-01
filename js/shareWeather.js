/**
 * Share Weather — делится текущей погодой через Web Share API
 * или копирует в буфер обмена (fallback для десктопа).
 */

/**
 * Форматирует данные погоды в текст для отправки.
 * @param {Object} data — данные о погоде (из weatherApi)
 * @param {string} cityName — название города
 * @returns {string} — отформатированный текст
 */
function formatShareText(data, cityName) {
    const current = data.current_weather;
    const temp = Math.round(current.temperature);
    const wind = current.windspeed;
    const weatherCode = current.weathercode;
    const weather = getWeatherEmoji(weatherCode);

    // Получаем дополнительные данные из почасового
    let humidity = '--';
    let feelsLike = temp;
    if (data.hourly && data.hourly.relativehumidity_2m) {
        const hour = new Date().getHours();
        humidity = data.hourly.relativehumidity_2m[hour] ?? '--';
    }

    const lines = [
        `🌤️ Погода сейчас: ${cityName}`,
        `━━━━━━━━━━━━━━━━`,
        `${weather} ${temp}°C (ощущается как ${feelsLike}°C)`,
        `💧 Влажность: ${humidity}%`,
        `💨 Ветер: ${wind} км/ч`,
        `━━━━━━━━━━━━━━━━`,
        `📍 Weather Seeker`,
        `🔗 ${window.location.origin}`
    ];

    return lines.join('\n');
}

/**
 * Возвращает эмодзи для кода погоды WMO.
 * @param {number} code — WMO weather code
 * @returns {string} — эмодзи
 */
function getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌧️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    if (code <= 99) return '⛈️';
    return '🌡️';
}

/**
 * Основная функция — поделиться погодой.
 * Использует Web Share API, если доступен, иначе копирует в буфер.
 * @param {Object} data — данные о погоде
 * @param {string} cityName — название города
 */
export async function shareWeather(data, cityName) {
    const text = formatShareText(data, cityName);

    // Web Share API (мобильные устройства, Chrome, Edge)
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Погода в ${cityName}`,
                text: text,
                url: window.location.origin
            });
            return 'shared';
        } catch (err) {
            // Пользователь отменил — не ошибка
            if (err.name === 'AbortError') return 'cancelled';
            // Если share не сработал — падаем на clipboard
            console.warn('[Share] Web Share API failed:', err);
        }
    }

    // Fallback: копирование в буфер обмена
    try {
        await navigator.clipboard.writeText(text);
        return 'copied';
    } catch (err) {
        // Clipboard API тоже недоступен — показываем текст в модалке
        console.warn('[Share] Clipboard API failed:', err);
        return 'fallback';
    }
}

/**
 * Возвращает готовый HTML для модального окна с текстом для копирования вручную.
 * @param {Object} data — данные о погоде
 * @param {string} cityName — название города
 * @returns {string} — HTML
 */
export function getShareFallbackHTML(data, cityName) {
    const text = formatShareText(data, cityName);
    return `
        <div class="share-fallback">
            <p class="share-fallback-title">📋 Скопируйте текст вручную:</p>
            <textarea class="share-fallback-text" readonly rows="8">${escapeHtml(text)}</textarea>
            <button class="share-fallback-copy" onclick="copyShareText(this)">
                <span class="material-icons">content_copy</span>
                Копировать
            </button>
        </div>
    `;
}

/**
 * Экранирует HTML-спецсимволы для безопасной вставки.
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Глобальная функция для кнопки "Копировать" в fallback-модалке.
 */
window.copyShareText = async function(btn) {
    const textarea = btn.parentElement.querySelector('.share-fallback-text');
    if (!textarea) return;
    try {
        await navigator.clipboard.writeText(textarea.value);
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="material-icons">check</span> Скопировано!';
        setTimeout(() => { btn.innerHTML = original; }, 2000);
    } catch {
        // Выделяем текст для ручного копирования
        textarea.select();
        textarea.focus();
    }
};