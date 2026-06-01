/**
 * Weather Notifications — уведомления о погоде через Notification API.
 * 
 * Возможности:
 * - Мгновенное уведомление с текущей погодой
 * - Ежедневное уведомление в заданное время
 * - Уведомления об изменении погоды (дождь, гроза, снег)
 * - Настройки сохраняются в localStorage
 */

const NOTIFICATION_KEY = 'weather_notification_settings';

/**
 * Настройки по умолчанию.
 * @returns {Object}
 */
function defaultSettings() {
    return {
        enabled: false,          // Включены ли уведомления
        daily: false,            // Ежедневное уведомление
        dailyTime: '08:00',      // Время ежедневного уведомления
        alerts: true,            // Уведомления об осадках/грозе
        lastDailyDate: null,     // Дата последнего ежедневного уведомления (YYYY-MM-DD)
        lastWeatherCode: null    // Последний известный код погоды (для отслеживания изменений)
    };
}

/**
 * Загружает настройки из localStorage.
 * @returns {Object}
 */
export function getNotificationSettings() {
    try {
        const saved = localStorage.getItem(NOTIFICATION_KEY);
        if (saved) {
            return { ...defaultSettings(), ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('[Notifications] Failed to load settings:', e);
    }
    return defaultSettings();
}

/**
 * Сохраняет настройки в localStorage.
 * @param {Object} settings
 */
export function saveNotificationSettings(settings) {
    try {
        localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('[Notifications] Failed to save settings:', e);
    }
}

/**
 * Запрашивает разрешение на уведомления.
 * @returns {Promise<boolean>} — true, если разрешение получено
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('[Notifications] Notification API not supported');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('[Notifications] Permission denied by user');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (e) {
        console.warn('[Notifications] Permission request failed:', e);
        return false;
    }
}

/**
 * Отправляет уведомление о погоде.
 * @param {Object} data — данные о погоде (из weatherApi)
 * @param {string} cityName — название города
 * @param {string} type — тип уведомления ('current', 'daily', 'alert')
 * @returns {boolean} — true, если уведомление отправлено
 */
export function sendWeatherNotification(data, cityName, type = 'current') {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false;
    }

    const current = data.current_weather;
    const temp = Math.round(current.temperature);
    const wind = current.windspeed;
    const weatherCode = current.weathercode;
    const weatherEmoji = getWeatherEmoji(weatherCode);
    const weatherDesc = getWeatherDescription(weatherCode);

    let title, body;

    switch (type) {
        case 'daily':
            title = `🌤️ Доброе утро, ${cityName}!`;
            body = `${weatherEmoji} ${temp}°C, ${weatherDesc}\n💨 Ветер: ${wind} км/ч`;
            break;

        case 'alert':
            title = `⚠️ Изменение погоды в ${cityName}`;
            body = `${weatherEmoji} ${temp}°C, ${weatherDesc}\nРекомендуем проверить прогноз`;
            break;

        case 'current':
        default:
            title = `🌤️ Погода сейчас: ${cityName}`;
            body = `${weatherEmoji} ${temp}°C, ${weatherDesc}\n💨 Ветер: ${wind} км/ч`;
            break;
    }

    try {
        const notification = new Notification(title, {
            body: body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `weather-${type}-${cityName}`,
            requireInteraction: type === 'alert',
            silent: false
        });

        // При клике на уведомление — фокусируем окно
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return true;
    } catch (e) {
        console.warn('[Notifications] Failed to send notification:', e);
        return false;
    }
}

/**
 * Проверяет, нужно ли отправить ежедневное уведомление.
 * Вызывается при каждой загрузке погоды.
 * @param {Object} data — данные о погоде
 * @param {string} cityName — название города
 */
export function checkDailyNotification(data, cityName) {
    const settings = getNotificationSettings();
    if (!settings.enabled || !settings.daily) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Уже отправляли сегодня
    if (settings.lastDailyDate === today) return;

    // Проверяем, наступило ли заданное время
    const [hours, minutes] = settings.dailyTime.split(':').map(Number);
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);

    if (now < targetTime) return; // Ещё рано

    // Отправляем уведомление
    const sent = sendWeatherNotification(data, cityName, 'daily');
    if (sent) {
        settings.lastDailyDate = today;
        saveNotificationSettings(settings);
    }
}

/**
 * Проверяет, изменилась ли погода (для алертов).
 * Вызывается при каждой загрузке погоды.
 * @param {Object} data — данные о погоде
 * @param {string} cityName — название города
 */
export function checkWeatherChange(data, cityName) {
    const settings = getNotificationSettings();
    if (!settings.enabled || !settings.alerts) return;

    const currentCode = data.current_weather.weathercode;
    const lastCode = settings.lastWeatherCode;

    // Сохраняем текущий код
    settings.lastWeatherCode = currentCode;
    saveNotificationSettings(settings);

    // Если нет предыдущего кода — первый запуск, не алертим
    if (lastCode === null) return;

    // Определяем, ухудшилась ли погода
    const isBadWeather = (code) => code >= 51; // drizzle, rain, snow, thunderstorm
    const wasBad = isBadWeather(lastCode);
    const isBad = isBadWeather(currentCode);

    // Уведомляем только если погода ухудшилась
    if (!wasBad && isBad) {
        sendWeatherNotification(data, cityName, 'alert');
    }
}

/**
 * Возвращает эмодзи для кода погоды WMO.
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
 * Возвращает описание погоды на русском для кода WMO.
 */
function getWeatherDescription(code) {
    if (code === 0) return 'ясно';
    if (code <= 3) return 'облачно';
    if (code <= 48) return 'туман';
    if (code <= 57) return 'морось';
    if (code <= 67) return 'дождь';
    if (code <= 77) return 'снег';
    if (code <= 82) return 'ливень';
    if (code <= 86) return 'снегопад';
    if (code <= 99) return 'гроза';
    return 'неизвестно';
}

/**
 * Обновляет UI настроек уведомлений в соответствии с текущими настройками.
 */
export function updateNotificationUI() {
    const settings = getNotificationSettings();
    const toggle = document.getElementById('notifToggle');
    const dailyToggle = document.getElementById('notifDailyToggle');
    const alertsToggle = document.getElementById('notifAlertsToggle');
    const timeInput = document.getElementById('notifTime');
    const statusEl = document.getElementById('notifStatus');

    if (toggle) toggle.checked = settings.enabled;
    if (dailyToggle) {
        dailyToggle.checked = settings.daily;
        dailyToggle.disabled = !settings.enabled;
    }
    if (alertsToggle) {
        alertsToggle.checked = settings.alerts;
        alertsToggle.disabled = !settings.enabled;
    }
    if (timeInput) {
        timeInput.value = settings.dailyTime;
        timeInput.disabled = !settings.enabled || !settings.daily;
    }
    if (statusEl) {
        if (!('Notification' in window)) {
            statusEl.textContent = '❌ API уведомлений не поддерживается';
            statusEl.className = 'notif-status notif-status-error';
        } else if (Notification.permission === 'denied') {
            statusEl.textContent = '🚫 Уведомления заблокированы в настройках браузера';
            statusEl.className = 'notif-status notif-status-error';
        } else if (Notification.permission === 'granted') {
            statusEl.textContent = settings.enabled ? '✅ Уведомления активны' : '💤 Уведомления выключены';
            statusEl.className = 'notif-status notif-status-ok';
        } else {
            statusEl.textContent = '🔔 Требуется разрешение';
            statusEl.className = 'notif-status notif-status-pending';
        }
    }
}

/**
 * Инициализирует обработчики событий для настроек уведомлений.
 */
export function initNotificationControls() {
    const toggle = document.getElementById('notifToggle');
    const dailyToggle = document.getElementById('notifDailyToggle');
    const alertsToggle = document.getElementById('notifAlertsToggle');
    const timeInput = document.getElementById('notifTime');
    const requestBtn = document.getElementById('notifRequestBtn');

    // Основной включатель
    if (toggle) {
        toggle.addEventListener('change', async () => {
            const settings = getNotificationSettings();
            if (toggle.checked) {
                // Запрашиваем разрешение при включении
                const granted = await requestNotificationPermission();
                if (!granted) {
                    toggle.checked = false;
                    updateNotificationUI();
                    return;
                }
                settings.enabled = true;
            } else {
                settings.enabled = false;
            }
            saveNotificationSettings(settings);
            updateNotificationUI();
        });
    }

    // Ежедневное уведомление
    if (dailyToggle) {
        dailyToggle.addEventListener('change', () => {
            const settings = getNotificationSettings();
            settings.daily = dailyToggle.checked;
            if (!dailyToggle.checked) {
                settings.lastDailyDate = null; // Сброс при выключении
            }
            saveNotificationSettings(settings);
            updateNotificationUI();
        });
    }

    // Алерты об изменении погоды
    if (alertsToggle) {
        alertsToggle.addEventListener('change', () => {
            const settings = getNotificationSettings();
            settings.alerts = alertsToggle.checked;
            saveNotificationSettings(settings);
            updateNotificationUI();
        });
    }

    // Время ежедневного уведомления
    if (timeInput) {
        timeInput.addEventListener('change', () => {
            const settings = getNotificationSettings();
            settings.dailyTime = timeInput.value;
            settings.lastDailyDate = null; // Сброс, чтобы отправить в новое время
            saveNotificationSettings(settings);
        });
    }

    // Кнопка запроса разрешения
    if (requestBtn) {
        requestBtn.addEventListener('click', async () => {
            const granted = await requestNotificationPermission();
            updateNotificationUI();
            if (granted) {
                const settings = getNotificationSettings();
                settings.enabled = true;
                if (toggle) toggle.checked = true;
                saveNotificationSettings(settings);
                updateNotificationUI();
            }
        });
    }

    // Обновляем UI при загрузке
    updateNotificationUI();
}