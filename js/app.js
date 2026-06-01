import { fetchWeatherByCoords, searchCity, fetchAirQuality } from './weatherApi.js';
import { displayCurrentWeather, displayForecast, showLoading } from './ui.js';
import { startAnimation } from './animations.js';
import { getHistory, addToHistory, clearHistory, formatTimestamp } from './searchHistory.js';
import { getFavorites, isFavorite, toggleFavorite, removeFavorite } from './favorites.js';
import { renderCharts, hideCharts } from './charts.js';
import { THEMES, getThemePreference, setThemePreference, shouldUseDarkMode, applyTheme, initTheme, listenForSystemTheme } from './theme.js';

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
    });
}
if (themeLight) {
    themeLight.addEventListener('click', () => {
        setThemePreference(THEMES.LIGHT);
        applyTheme(false);
        updateThemeButtons(THEMES.LIGHT);
    });
}
if (themeAuto) {
    themeAuto.addEventListener('click', () => {
        setThemePreference(THEMES.AUTO);
        const isDark = shouldUseDarkMode(THEMES.AUTO);
        applyTheme(isDark);
        updateThemeButtons(THEMES.AUTO);
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
                    // Use the displayAirQuality function from ui.js
                    import('./ui.js').then(({ displayAirQuality }) => {
                        displayAirQuality(aqiData);
                    });
                }
            }
        }).catch(err => console.warn('AQI fetch failed:', err));
        
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
