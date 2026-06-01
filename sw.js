/* ============================================================
   Weather Seeker — Service Worker
   Version: 1.0.0
   ============================================================ */

const CACHE_VERSION = 'weather-seeker-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;
const CDN_CACHE = `${CACHE_VERSION}-cdn`;

// ─── Resources to pre-cache on install ───────────────────────
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/js/app.js',
  '/js/ui.js',
  '/js/weatherApi.js',
  '/js/config.js',
  '/js/animations.js',
  '/js/theme.js',
  '/js/searchHistory.js',
  '/js/favorites.js',
  '/js/charts.js',
  '/js/hourlyForecast.js',
  '/js/radar.js',
  '/js/moon.js',
  '/js/shareWeather.js',
  '/js/notifications.js'
];

// ─── CDN / external resources to cache ───────────────────────
const CDN_URLS = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js'
];

// ─── API patterns (network-first) ────────────────────────────
const API_PATTERNS = [
  /geocoding-api\.open-meteo\.com/,
  /api\.open-meteo\.com/,
  /air-quality-api\.open-meteo\.com/,
  /api\.rainviewer\.com/
];

// ─── Install event — pre-cache critical assets ───────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Cache what we can; don't fail if some URLs are unavailable
      for (const url of PRECACHE_URLS) {
        try {
          const request = new Request(url, { credentials: 'same-origin' });
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (err) {
          // Silently skip — will be cached on first visit
        }
      }
    })()
  );
});

// ─── Activate event — clean old caches ───────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [STATIC_CACHE, API_CACHE, FONT_CACHE, CDN_CACHE];
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('weather-seeker-') && !validCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })()
  );
  self.clients.claim();
});

// ─── Helper: is this request an API call? ────────────────────
function isApiRequest(url) {
  return API_PATTERNS.some((pattern) => pattern.test(url));
}

// ─── Helper: is this a CDN / external resource? ──────────────
function isCdnRequest(url) {
  return CDN_URLS.some((cdnUrl) => url.startsWith(cdnUrl) || url.includes(cdnUrl));
}

// ─── Helper: is this a Google Font stylesheet? ───────────────
function isFontRequest(url) {
  return url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');
}

// ─── Helper: is this a static asset of our app? ──────────────
function isStaticAsset(url) {
  const { pathname, origin } = new URL(url);
  // Same-origin assets
  if (origin === self.location.origin) {
    return (
      pathname.endsWith('.html') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.json') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.ico')
    );
  }
  return false;
}

// ─── Fetch event — routing logic ─────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // ── API requests: Network First, fall back to cache ──
  if (isApiRequest(url.href)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ── CDN resources: Cache First with network update ──
  if (isCdnRequest(url.href)) {
    event.respondWith(cacheFirstWithRefresh(request, CDN_CACHE));
    return;
  }

  // ── Font resources: Cache First ──
  if (isFontRequest(url.href)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // ── Static assets: Cache First ──
  if (isStaticAsset(url.href)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Everything else: Network Only ──
  // (don't interfere with analytics, etc.)
});

// ─── Cache strategy: Cache First ─────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Don't block on caching
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not in cache — return a fallback
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Cache strategy: Cache First, refresh in background ──────
async function cacheFirstWithRefresh(request, cacheName) {
  const cached = await caches.match(request);
  // Return cached immediately (even if stale)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(cacheName);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);

  if (cached) {
    // Return cached version, update in background
    return cached;
  }
  // Nothing cached — wait for network
  return fetchPromise;
}

// ─── Cache strategy: Network First, fall back to cache ───────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Clone so we can cache and return
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // API call failed and not cached — return a meaningful error
    return new Response(
      JSON.stringify({ error: 'Вы офлайн. Данные недоступны.' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ─── Message handler ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((name) => name.startsWith('weather-seeker-'))
            .map((name) => caches.delete(name))
        );
      })()
    );
  }
});