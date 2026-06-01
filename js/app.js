import { fetchWeatherByCoords, searchCity } from './weatherApi.js';
import { displayCurrentWeather, displayForecast, showLoading } from './ui.js';
import { startAnimation } from './animations.js';

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
        displayForecast(5, data);
        
        // Update forecast city name
        updateForecastCity();
        
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

// Theme Management - Auto mode only (based on weather)
function applyTheme(shouldBeDark) {
    const body = document.body;
    
    if (shouldBeDark) {
        body.style.setProperty('--glass-bg', 'rgba(0, 0, 0, 0.35)');
        body.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.25)');
        body.style.setProperty('--glass-shadow', 'rgba(0, 0, 0, 0.5)');
        body.style.setProperty('--text-primary', '#1a1a1a');
        body.style.setProperty('--text-secondary', 'rgba(0, 0, 0, 0.7)');
        body.style.setProperty('--accent', 'rgba(0, 0, 0, 0.15)');
        body.style.setProperty('--liquid-gradient', 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.03) 100%)');
    } else {
        body.style.removeProperty('--glass-bg');
        body.style.removeProperty('--glass-border');
        body.style.removeProperty('--glass-shadow');
        body.style.removeProperty('--text-primary');
        body.style.removeProperty('--text-secondary');
        body.style.removeProperty('--accent');
        body.style.removeProperty('--liquid-gradient');
    }
}

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
        hideSuggestions();
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
    loadWeather(lat, lon, city);
}

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
        }
    });
});

// Initialize - show current section and try to get current location
// (DOM is already ready since script is at end of body)
switchSection('current');
loadAllFacts();
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
