import { fetchWeatherByCoords, searchCity, fetchAirQuality } from './weatherApi.js';
import { displayCurrentWeather, displayForecast, showLoading, displayAirQuality } from './ui.js';
import { startAnimation } from './animations.js';
import { getHistory, addToHistory, clearHistory, formatTimestamp } from './searchHistory.js';
import { getFavorites, isFavorite, toggleFavorite, removeFavorite } from './favorites.js';
import { renderCharts, hideCharts } from './charts.js';
import { THEMES, getThemePreference, setThemePreference, shouldUseDarkMode, applyTheme, initTheme, listenForSystemTheme } from './theme.js';
import { initRadar, playRadarAnimation, pauseRadarAnimation, updateRadarPosition, updateRadarTheme, destroyRadar } from './radar.js';
import { renderMoonSection, initMoonCalendar } from './moon.js';
import { shareWeather, getShareFallbackHTML } from './shareWeather.js';
import { initNotificationControls, checkDailyNotification, checkWeatherChange, updateNotificationUI } from './notifications.js';

// Check if running on a server (not file://)
if (location.protocol === 'file:') {
    alert('Для корректной работы приложения запустите локальный сервер.\n\nИспользуйте: python3 -m http.server 8000\nЗатем откройте: http://localhost:8000');
}

// Helper: get city name from coordinates using BigDataCloud API (no CORS issues)
async function getCityName(lat, lon) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // Extract city and country
            if (data.locality) {
                return data.locality + (data.countryName ? ', ' + data.countryName : '');
            } else if (data.city) {
                return data.city + (data.countryName ? ', ' + data.countryName : '');
            } else if (data.principalSubdivision) {
                return data.principalSubdivision + (data.countryName ? ', ' + data.countryName : '');
            }
        }
        return null;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return null;
    }
}

// State
let currentCity = '';
let currentLat = null;
let currentLon = null;
let forecastData = null;

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');
const navItems = document.querySelectorAll('.nav-item');
const forecastButtons = document.querySelectorAll('.forecast-btn');
const sections = {
    current: document.getElementById('currentSection'),
    forecast: document.getElementById('forecastSection'),
    compare: document.getElementById('compareSection'),
    radar: document.getElementById('radarSection'),
    moon: document.getElementById('moonSection'),
    info: document.getElementById('infoSection'),
    facts: document.getElementById('factsSection')
};

// Expose animation function globally for UI module
window.startAnimationLogic = startAnimation;

// Theme system
let currentThemePref = initTheme();

// Listen for system theme changes
const unsubscribeSystemTheme = listenForSystemTheme((isDark) => {
    applyTheme(isDark);
    updateThemeButtons(getThemePreference());
    updateRadarTheme(isDark);
});

// Theme toggle buttons (3 separate buttons at bottom of sidebar)
const themeDark = document.getElementById('themeDark');
const themeLight = document.getElementById('themeLight');
const themeAuto = document.getElementById('themeAuto');

// Initialize theme button active state after DOM elements are available
updateThemeButtons(currentThemePref);

if (themeDark) {
    themeDark.addEventListener('click', () => {
        setThemePreference(THEMES.DARK);
        applyTheme(true);
        updateThemeButtons(THEMES.DARK);
        updateRadarTheme(true);
    });
}
if (themeLight) {
    themeLight.addEventListener('click', () => {
        setThemePreference(THEMES.LIGHT);
        applyTheme(false);
        updateThemeButtons(THEMES.LIGHT);
        updateRadarTheme(false);
    });
}
if (themeAuto) {
    themeAuto.addEventListener('click', () => {
        setThemePreference(THEMES.AUTO);
        const isDark = shouldUseDarkMode(THEMES.AUTO);
        applyTheme(isDark);
        updateThemeButtons(THEMES.AUTO);
        updateRadarTheme(isDark);
    });
}

function updateThemeButtons(preference) {
    [themeDark, themeLight, themeAuto].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (preference === THEMES.DARK && themeDark) themeDark.classList.add('active');
    else if (preference === THEMES.LIGHT && themeLight) themeLight.classList.add('active');
    else if (themeAuto) themeAuto.classList.add('active');
}

// DOM Elements for favorites
const favoriteBtn = document.getElementById('favoriteBtn');
const favoritesList = document.getElementById('favoritesList');

// ===== COMPARISON STATE =====
const compareState = {
    city1: null, // { lat, lon, name, data }
    city2: null  // { lat, lon, name, data }
};

// Comparison DOM elements
const compareInput1 = document.getElementById('compareCity1');
const compareInput2 = document.getElementById('compareCity2');
const compareSuggestions1 = document.getElementById('compareSuggestions1');
const compareSuggestions2 = document.getElementById('compareSuggestions2');
const compareResults = document.getElementById('compareResults');
const comparePlaceholder = document.getElementById('comparePlaceholder');

// Load weather by coordinates
async function loadWeather(lat, lon, cityName = null) {
    try {
        showLoading(true);
        const data = await fetchWeatherByCoords(lat, lon);
        forecastData = data;
        currentLat = lat;
        currentLon = lon;
        
        if (cityName) {
            currentCity = cityName;
        }
        
        displayCurrentWeather(data, currentCity);
        updateFavoriteButton();
        displayForecast(5, data);
        // Render charts with daily data
        if (data.daily) {
            renderCharts(data.daily, 5);
        }
        
        // Update forecast city name
        updateForecastCity();
        
        // Fetch air quality data in parallel (non-blocking, doesn't delay UI)
        fetchAirQuality(lat, lon).then(aqiData => {
            if (aqiData) {
                window.__aqiData = aqiData;
                const aqiEl = document.getElementById('aqiValue');
                if (aqiEl) {
                    displayAirQuality(aqiData);
                }
            }
        }).catch(err => console.warn('AQI fetch failed:', err));
        
        // Initialize radar with current position (lazy init when section is opened)
        // Store coordinates for radar use
        window.__radarCoords = { lat, lon };

        // Check notifications
        checkDailyNotification(data, currentCity);
        checkWeatherChange(data, currentCity);
        
        // Switch to current section
        switchSection('current');
        
    } catch (error) {
        console.error('Error loading weather:', error);
        alert('Ошибка загрузки погоды: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Search city
async function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        try {
            showLoading(true);
            const result = await searchCity(city);
            currentLat = result.latitude;
            currentLon = result.longitude;
            currentCity = result.name;
            if (result.country) {
                currentCity += ', ' + result.country;
            }
            // Keep the city name in input after search
            cityInput.value = currentCity;
            // Save to search history
            addToHistory(currentCity, currentLat, currentLon);
            await loadWeather(currentLat, currentLon, currentCity);
        } catch (error) {
            console.error('Error searching city:', error);
            alert('Ошибка поиска города: ' + error.message);
        } finally {
            showLoading(false);
        }
    }
}

// Use current location
async function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async position => {
                const { latitude, longitude } = position.coords;
                currentLat = latitude;
                currentLon = longitude;
                
                // Try to get real city name via reverse geocoding (with proxy fallback)
                const city = await getCityName(latitude, longitude);
                currentCity = city || 'Текущее местоположение';
                
                // Don't set cityInput - keep it empty
                await loadWeather(latitude, longitude, currentCity);
            },
            error => {
                let msg = 'Не удалось определить местоположение. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        msg += 'Запрещён доступ к геолокации. Разрешите доступ в браузере или введите город вручную.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg += 'Информация о местоположении недоступна. Проверьте интернет-соединение.';
                        break;
                    case error.TIMEOUT:
                        msg += 'Истекло время определения местоположения. Попробуйте ещё раз.';
                        break;
                    default:
                        msg += 'Неизвестная ошибка. Введите город вручную.';
                }
                alert(msg);
            }
        );
    } else {
        alert('Геолокация не поддерживается вашим браузером');
    }
}

// Navigation
function switchSection(sectionName) {
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });
    
    Object.keys(sections).forEach(key => {
        const section = sections[key];
        if (section) {
            section.classList.toggle('active', key === sectionName);
        }
    });
    
    // Initialize radar when switching to radar section
    if (sectionName === 'radar') {
        const coords = window.__radarCoords;
        if (coords) {
            initRadar(coords.lat, coords.lon);
        } else {
            // Default to Moscow if no location selected
            initRadar(55.7558, 37.6173);
        }
    }
    
    // Initialize moon section when switching to it
    if (sectionName === 'moon') {
        renderMoonSection();
        initMoonCalendar();
    }
    
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.remove('open');
    }
}

// Theme Management - delegated to theme.js module

// Update forecast city name display
function updateForecastCity() {
    const forecastCityEl = document.getElementById('forecastCity');
    if (forecastCityEl && currentCity) {
        forecastCityEl.textContent = `Для: ${currentCity}`;
    }
}

// Load a single random fact from Useless Facts API (Russian)
async function loadRandomFact() {
    try {
        const response = await fetch('https://uselessfacts.jsph.pl/random.json?language=ru');
        if (!response.ok) throw new Error('Failed to fetch fact');
        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error loading fact:', error);
        return null;
    }
}

// Load all facts at startup
async function loadAllFacts() {
    const factCards = document.querySelectorAll('.fact-card');
    if (factCards.length === 0) return;

    // Load facts for all cards
    const promises = Array(factCards.length).fill(null).map(() => loadRandomFact());
    const facts = await Promise.all(promises);

    factCards.forEach((card, index) => {
        const factTextEl = card.querySelector('p');
        if (factTextEl && facts[index]) {
            factTextEl.textContent = facts[index];
        }
    });
}

// Load dynamic fact (for periodic updates)
async function loadDynamicFacts() {
    const factCards = document.querySelectorAll('.fact-card');
    if (factCards.length === 0) return;

    const fact = await loadRandomFact();
    if (!fact) return;

    // Update a random card
    const randomIndex = Math.floor(Math.random() * factCards.length);
    const randomCard = factCards[randomIndex];
    const factTextEl = randomCard.querySelector('p');
    if (factTextEl) {
        factTextEl.textContent = fact;
    }
}

// ===== FAVORITES LOGIC =====

// Update favorite button state
function updateFavoriteButton() {
    if (!favoriteBtn) return;
    const isFav = isFavorite(currentLat, currentLon);
    const icon = favoriteBtn.querySelector('.material-icons');
    if (icon) {
        icon.textContent = isFav ? 'star' : 'star_border';
    }
    favoriteBtn.classList.toggle('active', isFav);
    favoriteBtn.title = isFav ? 'Удалить из избранного' : 'Добавить в избранное';
}

// Toggle favorite on button click
if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
        if (currentLat == null || currentLon == null) return;
        const cityName = document.getElementById('cityName')?.textContent || currentCity;
        toggleFavorite(cityName, currentLat, currentLon);
        updateFavoriteButton();
        renderFavoritesList();
    });
}

// Render favorites list in sidebar
function renderFavoritesList() {
    if (!favoritesList) return;
    const favorites = getFavorites();

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<div class="favorites-empty">Нет избранных городов</div>';
        return;
    }

    favoritesList.innerHTML = favorites.map((item, index) => `
        <div class="favorite-item" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${item.name}">
            <span class="favorite-item-icon material-icons">location_on</span>
            <span class="favorite-item-name">${item.name}</span>
            <button class="favorite-item-remove" data-index="${index}" title="Удалить">
                <span class="material-icons">close</span>
            </button>
        </div>
    `).join('');

    // Click on favorite item → load weather
    favoritesList.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking remove button
            if (e.target.closest('.favorite-item-remove')) return;
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            const name = item.dataset.name;
            cityInput.value = name;
            handleSearchWithCoords(lat, lon, name);
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar?.classList.remove('open');
            }
        });
    });

    // Remove button
    favoritesList.querySelectorAll('.favorite-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const favorites = getFavorites();
            if (favorites[index]) {
                removeFavorite(favorites[index].lat, favorites[index].lon);
                renderFavoritesList();
                updateFavoriteButton();
            }
        });
    });
}

// ===== END FAVORITES LOGIC =====

// Periodically update facts (every 30 seconds)
let factsInterval;
function startFactsUpdater() {
    factsInterval = setInterval(loadDynamicFacts, 30000);
}

function stopFactsUpdater() {
    if (factsInterval) {
        clearInterval(factsInterval);
    }
}

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        hideSuggestions();
        handleSearch();
    }
});

// Autocomplete functionality
let debounceTimer;
cityInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = cityInput.value.trim();
    if (query.length < 2) {
        // Show history when input is empty or too short
        if (query.length === 0) {
            showSearchHistory();
        } else {
            hideSuggestions();
        }
        return;
    }
    debounceTimer = setTimeout(fetchSuggestions, 300, query);
});

async function fetchSuggestions(query) {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=ru&format=json`);
        const data = await response.json();
        displaySuggestions(data.results || []);
    } catch (error) {
        console.error('Geocoding error:', error);
        hideSuggestions();
    }
}

function displaySuggestions(results) {
    if (!results.length) {
        hideSuggestions();
        return;
    }

    suggestionsDropdown.innerHTML = results.map(city => `
        <div class="suggestion-item" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${city.name}${city.admin1 ? ', ' + city.admin1 : ''}${city.country ? ', ' + city.country : ''}">
            <span class="name">${city.name}</span>
            <span class="country">${city.country || ''}</span>
        </div>
    `).join('');

    suggestionsDropdown.classList.add('active');

    // Add click listeners
    suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            cityInput.value = item.dataset.name;
            hideSuggestions();
            handleSearchWithCoords(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), item.dataset.name);
        });
    });
}

function hideSuggestions() {
    suggestionsDropdown.classList.remove('active');
    suggestionsDropdown.innerHTML = '';
}

function handleSearchWithCoords(lat, lon, city) {
    currentLat = lat;
    currentLon = lon;
    currentCity = city;
    // Save to search history
    addToHistory(city, lat, lon);
    loadWeather(lat, lon, city);
}

// ===== COMPARISON LOGIC =====

// Fetch suggestions for a comparison input
async function fetchCompareSuggestions(query, inputIndex) {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=ru&format=json`);
        const data = await response.json();
        displayCompareSuggestions(data.results || [], inputIndex);
    } catch (error) {
        console.error('Geocoding error:', error);
        hideCompareSuggestions(inputIndex);
    }
}

// Display suggestions for a comparison input
function displayCompareSuggestions(results, inputIndex) {
    const dropdown = inputIndex === 1 ? compareSuggestions1 : compareSuggestions2;
    if (!results.length) {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        return;
    }

    dropdown.innerHTML = results.map(city => `
        <div class="suggestion-item" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${city.name}${city.admin1 ? ', ' + city.admin1 : ''}${city.country ? ', ' + city.country : ''}">
            <span class="name">${city.name}</span>
            <span class="country">${city.country || ''}</span>
        </div>
    `).join('');

    dropdown.classList.add('active');

    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const input = inputIndex === 1 ? compareInput1 : compareInput2;
            input.value = item.dataset.name;
            hideCompareSuggestions(inputIndex);
            selectCompareCity(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), item.dataset.name, inputIndex);
        });
    });
}

// Hide suggestions for a comparison input
function hideCompareSuggestions(inputIndex) {
    const dropdown = inputIndex === 1 ? compareSuggestions1 : compareSuggestions2;
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
}

// Select a city for comparison and fetch its weather
async function selectCompareCity(lat, lon, name, inputIndex) {
    try {
        // Show loading state on the input
        const input = inputIndex === 1 ? compareInput1 : compareInput2;
        input.style.opacity = '0.6';
        input.disabled = true;

        const data = await fetchWeatherByCoords(lat, lon);

        if (inputIndex === 1) {
            compareState.city1 = { lat, lon, name, data };
        } else {
            compareState.city2 = { lat, lon, name, data };
        }

        // If both cities are selected, render comparison
        if (compareState.city1 && compareState.city2) {
            displayComparison();
        }
    } catch (error) {
        console.error('Error fetching comparison city:', error);
        alert('Ошибка загрузки данных для сравнения: ' + error.message);
    } finally {
        const input = inputIndex === 1 ? compareInput1 : compareInput2;
        input.style.opacity = '1';
        input.disabled = false;
    }
}

// Render the comparison view
function displayComparison() {
    const c1 = compareState.city1;
    const c2 = compareState.city2;
    if (!c1 || !c2) return;

    // Helper to extract current values from weather data
    function getCurrentValues(data) {
        const current = data.current_weather;
        const hourly = data.hourly || {};
        const timezoneOffset = data.utc_offset_seconds || 0;
        const cityTime = new Date(Date.now() + timezoneOffset * 1000);
        const currentHour = cityTime.getUTCHours();

        const humidity = hourly.relativehumidity_2m ? (hourly.relativehumidity_2m[currentHour] ?? '--') : '--';
        const cloudcover = hourly.cloudcover ? (hourly.cloudcover[currentHour] ?? '--') : '--';
        const pressureHPa = hourly.surface_pressure ? (hourly.surface_pressure[currentHour] ?? null) : null;
        const pressure = pressureHPa !== null ? Math.round(pressureHPa * 0.750062) : '--';
        const uv = hourly.uv_index ? (hourly.uv_index[currentHour] ?? '--') : '--';

        return {
            temp: Math.round(current.temperature),
            feels: Math.round(current.temperature),
            humidity,
            wind: current.windspeed,
            pressure,
            clouds: cloudcover,
            uv: uv !== '--' ? (uv === 0 ? '0' : uv.toFixed(1)) : '--'
        };
    }

    const v1 = getCurrentValues(c1.data);
    const v2 = getCurrentValues(c2.data);

    // Populate panel 1
    document.getElementById('compCity1').textContent = c1.name;
    document.getElementById('compTemp1').textContent = v1.temp + '°C';
    document.getElementById('compFeels1').textContent = v1.feels + '°C';
    document.getElementById('compHumidity1').textContent = v1.humidity + '%';
    document.getElementById('compWind1').textContent = v1.wind + ' км/ч';
    document.getElementById('compPressure1').textContent = v1.pressure + ' мм';
    document.getElementById('compClouds1').textContent = v1.clouds + '%';
    document.getElementById('compUV1').textContent = v1.uv;

    // Populate panel 2
    document.getElementById('compCity2').textContent = c2.name;
    document.getElementById('compTemp2').textContent = v2.temp + '°C';
    document.getElementById('compFeels2').textContent = v2.feels + '°C';
    document.getElementById('compHumidity2').textContent = v2.humidity + '%';
    document.getElementById('compWind2').textContent = v2.wind + ' км/ч';
    document.getElementById('compPressure2').textContent = v2.pressure + ' мм';
    document.getElementById('compClouds2').textContent = v2.clouds + '%';
    document.getElementById('compUV2').textContent = v2.uv;

    // Calculate and display differences
    const diffsContainer = document.getElementById('compareDiffs');
    const diffItems = [
        {
            label: 'Температура',
            val1: v1.temp,
            val2: v2.temp,
            unit: '°C',
            higherBetter: false
        },
        {
            label: 'Влажность',
            val1: v1.humidity,
            val2: v2.humidity,
            unit: '%',
            higherBetter: false
        },
        {
            label: 'Ветер',
            val1: v1.wind,
            val2: v2.wind,
            unit: ' км/ч',
            higherBetter: false
        },
        {
            label: 'Давление',
            val1: v1.pressure,
            val2: v2.pressure,
            unit: ' мм',
            higherBetter: true
        },
        {
            label: 'Облачность',
            val1: v1.clouds,
            val2: v2.clouds,
            unit: '%',
            higherBetter: false
        },
        {
            label: 'УФ-индекс',
            val1: v1.uv,
            val2: v2.uv,
            unit: '',
            higherBetter: false
        }
    ];

    diffsContainer.innerHTML = diffItems.map(item => {
        const val1 = parseFloat(item.val1);
        const val2 = parseFloat(item.val2);
        if (isNaN(val1) || isNaN(val2)) {
            return `
                <div class="compare-diff-item">
                    <span class="compare-diff-label">${item.label}</span>
                    <span class="compare-diff-value neutral">--</span>
                </div>
            `;
        }

        let diffClass, diffText;
        if (val1 > val2) {
            diffClass = item.higherBetter ? 'positive' : 'negative';
            diffText = `${c1.name} выше на ${(val1 - val2).toFixed(1)}${item.unit}`;
        } else if (val2 > val1) {
            diffClass = item.higherBetter ? 'positive' : 'negative';
            diffText = `${c2.name} выше на ${(val2 - val1).toFixed(1)}${item.unit}`;
        } else {
            diffClass = 'neutral';
            diffText = 'Одинаково';
        }

        return `
            <div class="compare-diff-item">
                <span class="compare-diff-label">${item.label}</span>
                <span class="compare-diff-value ${diffClass}">${diffText}</span>
            </div>
        `;
    }).join('');

    // Show results, hide placeholder
    compareResults.style.display = 'block';
    comparePlaceholder.style.display = 'none';
}

// ===== END COMPARISON LOGIC =====

// Show search history in the suggestions dropdown
function showSearchHistory() {
    const history = getHistory();
    if (history.length === 0) {
        hideSuggestions();
        return;
    }

    suggestionsDropdown.innerHTML = `
        <div class="history-header">
            <span class="history-title">📜 История поиска</span>
            <button class="history-clear" id="clearHistoryBtn">Очистить</button>
        </div>
        ${history.map((item, index) => `
            <div class="suggestion-item history-item" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${item.name}">
                <span class="history-icon material-icons">history</span>
                <span class="name">${item.name}</span>
                <span class="history-time">${formatTimestamp(item.timestamp)}</span>
            </div>
        `).join('')}
    `;

    suggestionsDropdown.classList.add('active');

    // Add click listeners for history items
    suggestionsDropdown.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            cityInput.value = item.dataset.name;
            hideSuggestions();
            handleSearchWithCoords(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), item.dataset.name);
        });
    });

    // Clear history button
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearHistory();
            hideSuggestions();
        });
    }
}

// Show history on focus (if input is empty)
cityInput.addEventListener('focus', () => {
    if (cityInput.value.trim().length === 0) {
        showSearchHistory();
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
        hideSuggestions();
    }
});
locationBtn.addEventListener('click', useCurrentLocation);

// ===== COMPARISON EVENT LISTENERS =====

// Debounced autocomplete for comparison input 1
let compareDebounce1;
if (compareInput1) {
    compareInput1.addEventListener('input', () => {
        clearTimeout(compareDebounce1);
        const query = compareInput1.value.trim();
        if (query.length < 2) {
            hideCompareSuggestions(1);
            return;
        }
        compareDebounce1 = setTimeout(fetchCompareSuggestions, 300, query, 1);
    });

    compareInput1.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideCompareSuggestions(1);
            const query = compareInput1.value.trim();
            if (query.length > 0) {
                searchCity(query).then(result => {
                    const name = result.name + (result.country ? ', ' + result.country : '');
                    compareInput1.value = name;
                    hideCompareSuggestions(1);
                    selectCompareCity(result.latitude, result.longitude, name, 1);
                }).catch(err => {
                    console.error('Compare search error:', err);
                    alert('Город не найден: ' + err.message);
                });
            }
        }
    });
}

// Debounced autocomplete for comparison input 2
let compareDebounce2;
if (compareInput2) {
    compareInput2.addEventListener('input', () => {
        clearTimeout(compareDebounce2);
        const query = compareInput2.value.trim();
        if (query.length < 2) {
            hideCompareSuggestions(2);
            return;
        }
        compareDebounce2 = setTimeout(fetchCompareSuggestions, 300, query, 2);
    });

    compareInput2.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideCompareSuggestions(2);
            const query = compareInput2.value.trim();
            if (query.length > 0) {
                searchCity(query).then(result => {
                    const name = result.name + (result.country ? ', ' + result.country : '');
                    compareInput2.value = name;
                    hideCompareSuggestions(2);
                    selectCompareCity(result.latitude, result.longitude, name, 2);
                }).catch(err => {
                    console.error('Compare search error:', err);
                    alert('Город не найден: ' + err.message);
                });
            }
        }
    });
}

// Close comparison suggestions when clicking outside
document.addEventListener('click', (e) => {
    const isInput1 = compareInput1 && compareInput1.contains(e.target);
    const isInput2 = compareInput2 && compareInput2.contains(e.target);
    const isDropdown1 = compareSuggestions1 && compareSuggestions1.contains(e.target);
    const isDropdown2 = compareSuggestions2 && compareSuggestions2.contains(e.target);
    if (!isInput1 && !isInput2 && !isDropdown1 && !isDropdown2) {
        hideCompareSuggestions(1);
        hideCompareSuggestions(2);
    }
});

// ===== END COMPARISON EVENT LISTENERS =====

// ===== RADAR EVENT LISTENERS =====

// Play button
const radarPlayBtn = document.getElementById('radarPlayBtn');
if (radarPlayBtn) {
    radarPlayBtn.addEventListener('click', playRadarAnimation);
}

// Pause button
const radarPauseBtn = document.getElementById('radarPauseBtn');
if (radarPauseBtn) {
    radarPauseBtn.addEventListener('click', pauseRadarAnimation);
}

// Opacity slider
const radarOpacitySlider = document.getElementById('radarOpacitySlider');
if (radarOpacitySlider) {
    radarOpacitySlider.addEventListener('input', () => {
        // Will be applied on next frame update
        // The radar module reads the slider value when showing frames
    });
}

// ===== END RADAR EVENT LISTENERS =====

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchSection(item.dataset.section);
    });
});

forecastButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        forecastButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const days = parseInt(btn.dataset.days);
        if (forecastData) {
            displayForecast(days, forecastData);
            if (forecastData.daily) {
                renderCharts(forecastData.daily, days);
            }
        }
    });
});

// Initialize - show current section and try to get current location
// (DOM is already ready since script is at end of body)
switchSection('current');
loadAllFacts();
renderFavoritesList();
setTimeout(useCurrentLocation, 500);
startFactsUpdater();

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
} else {
    console.warn('Menu toggle or sidebar not found');
}

// Expose theme function globally for UI module
window.applyThemeSettings = applyTheme;
window.__themeApply = applyTheme;

// ─── PWA Install Prompt ──────────────────────────────────────
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67+ from automatically showing the prompt
    e.preventDefault();
    deferredPrompt = e;
    // Show the install button
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
            console.log('[PWA] User accepted install');
        } else {
            console.log('[PWA] User dismissed install');
        }
        // Reset — can only be used once
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });
}

// Hide install button if already installed (display-mode: standalone)
window.addEventListener('appinstalled', () => {
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    deferredPrompt = null;
    console.log('[PWA] App installed successfully');
});

// ─── Share Weather ───────────────────────────────────────────
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        if (!forecastData || !currentCity) {
            showToast('⚠️ Сначала загрузите погоду');
            return;
        }
        const result = await shareWeather(forecastData, currentCity);
        if (result === 'shared') {
            showToast('✅ Погода отправлена');
        } else if (result === 'copied') {
            showToast('📋 Текст скопирован в буфер');
        } else if (result === 'fallback') {
            // Показываем модалку с текстом для ручного копирования
            const overlay = document.getElementById('modalOverlay');
            const details = document.getElementById('modalDetails');
            const header = document.querySelector('.modal-header');
            if (overlay && details && header) {
                header.innerHTML = '<div class="modal-date">📤 Поделиться погодой</div>';
                details.innerHTML = getShareFallbackHTML(forecastData, currentCity);
                overlay.classList.add('active');
            }
        }
    });
}

/**
 * Показывает toast-уведомление внизу экрана.
 * @param {string} message — текст уведомления
 */
function showToast(message) {
    // Удаляем старый toast, если есть
    const old = document.querySelector('.share-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.innerHTML = `<span class="material-icons">info</span> ${message}`;
    document.body.appendChild(toast);

    // Анимация появления
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Авто-скрытие через 2.5 секунды
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

// ─── Weather Notifications ───────────────────────────────────
initNotificationControls();
