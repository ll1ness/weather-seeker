/**
 * Weather Radar / Map module
 * Uses RainViewer API for radar data and Leaflet.js for map rendering
 * RainViewer API: https://www.rainviewer.com/api.html
 */

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';

let map = null;
let radarLayer = null;
let animationFrames = [];
let currentFrameIndex = 0;
let animationInterval = null;
let isPlaying = false;
let isInitialized = false;

/**
 * Initialize the radar map
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
export async function initRadar(lat, lon) {
    const mapContainer = document.getElementById('radarMap');
    if (!mapContainer) return;

    // Show loading
    const loading = document.getElementById('radarLoading');
    if (loading) loading.style.display = 'flex';

    // If map already exists, just update the view
    if (map) {
        map.setView([lat, lon], 6);
        await loadRadarData();
        return;
    }

    // Create Leaflet map
    map = L.map('radarMap', {
        center: [lat, lon],
        zoom: 6,
        zoomControl: true,
        attributionControl: true
    });

    // Add OpenStreetMap tile layer (dark theme friendly)
    const isDark = document.body.classList.contains('light-theme') ? false : true;
    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Load radar data
    await loadRadarData();

    isInitialized = true;
}

/**
 * Load radar data from RainViewer API
 */
async function loadRadarData() {
    try {
        const response = await fetch(RAINVIEWER_API);
        if (!response.ok) throw new Error(`RainViewer API error: ${response.status}`);
        
        const data = await response.json();
        
        if (!data.radar || !data.radar.past || data.radar.past.length === 0) {
            throw new Error('No radar data available');
        }

        // Build animation frames from past radar data (last 2 hours)
        const pastFrames = data.radar.past;
        // Use last 12 frames (about 2 hours at 10-min intervals)
        const frames = pastFrames.slice(-12);
        
        animationFrames = frames.map(frame => ({
            time: frame.time,
            url: `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
        }));

        // Also add forecast frames if available
        if (data.radar.forecast && data.radar.forecast.length > 0) {
            const forecastFrames = data.radar.forecast.slice(0, 6); // Next ~60 min
            forecastFrames.forEach(frame => {
                animationFrames.push({
                    time: frame.time,
                    url: `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
                });
            });
        }

        // Display the latest frame
        if (animationFrames.length > 0) {
            currentFrameIndex = animationFrames.length - 1;
            showRadarFrame(currentFrameIndex);
            updateTimestamp(currentFrameIndex);
        }

        // Hide loading
        const loading = document.getElementById('radarLoading');
        if (loading) loading.style.display = 'none';

    } catch (error) {
        console.error('Error loading radar data:', error);
        const loading = document.getElementById('radarLoading');
        if (loading) {
            loading.innerHTML = `
                <span class="material-icons" style="font-size: 2rem; opacity: 0.5;">error_outline</span>
                <span>Не удалось загрузить радарные данные</span>
            `;
        }
    }
}

/**
 * Show a specific radar frame
 * @param {number} index - Frame index
 */
function showRadarFrame(index) {
    if (!map || !animationFrames[index]) return;

    // Remove previous radar layer
    if (radarLayer) {
        map.removeLayer(radarLayer);
    }

    const frame = animationFrames[index];
    
    // Create new tile layer with opacity
    const opacitySlider = document.getElementById('radarOpacitySlider');
    const opacity = opacitySlider ? parseInt(opacitySlider.value) / 100 : 0.6;

    radarLayer = L.tileLayer(frame.url, {
        opacity: opacity,
        transparent: true,
        attribution: 'Radar data &copy; <a href="https://www.rainviewer.com" target="_blank">RainViewer</a>'
    }).addTo(map);

    currentFrameIndex = index;
    updateTimestamp(index);
}

/**
 * Update the timestamp display
 * @param {number} index - Frame index
 */
function updateTimestamp(index) {
    const timestampEl = document.getElementById('radarTimestamp');
    if (!timestampEl || !animationFrames[index]) return;

    const date = new Date(animationFrames[index].time * 1000);
    timestampEl.textContent = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short'
    });
}

/**
 * Play radar animation
 */
export function playRadarAnimation() {
    if (isPlaying || animationFrames.length < 2) return;
    isPlaying = true;

    const playBtn = document.getElementById('radarPlayBtn');
    const pauseBtn = document.getElementById('radarPauseBtn');
    if (playBtn) playBtn.classList.remove('active');
    if (pauseBtn) pauseBtn.classList.add('active');

    // Start from the beginning if at the end
    if (currentFrameIndex >= animationFrames.length - 1) {
        currentFrameIndex = 0;
    }

    animationInterval = setInterval(() => {
        currentFrameIndex++;
        if (currentFrameIndex >= animationFrames.length) {
            // Loop back to start
            currentFrameIndex = 0;
        }
        showRadarFrame(currentFrameIndex);
    }, 500); // 500ms per frame
}

/**
 * Pause radar animation
 */
export function pauseRadarAnimation() {
    isPlaying = false;
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    const playBtn = document.getElementById('radarPlayBtn');
    const pauseBtn = document.getElementById('radarPauseBtn');
    if (playBtn) playBtn.classList.add('active');
    if (pauseBtn) pauseBtn.classList.remove('active');
}

/**
 * Update map center position
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
export function updateRadarPosition(lat, lon) {
    if (map) {
        map.setView([lat, lon], 6);
    }
}

/**
 * Update map tiles for theme change
 */
export function updateRadarTheme(isDark) {
    if (!map) return;
    
    // Remove existing tile layers (except radar)
    map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer && !layer._url.includes('rainviewer')) {
            map.removeLayer(layer);
        }
    });

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

/**
 * Clean up radar resources
 */
export function destroyRadar() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    isPlaying = false;
    isInitialized = false;
    animationFrames = [];
    currentFrameIndex = 0;
    
    if (map) {
        map.remove();
        map = null;
    }
    radarLayer = null;
}