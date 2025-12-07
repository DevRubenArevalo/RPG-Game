/**
 * SERVICE WORKER - Handles caching to bust browser cache on updates
 * 
 * HOW IT WORKS:
 * 1. Loads version number from version.js
 * 2. Creates a versioned cache (e.g., "from-nothing-v0.3.2")
 * 3. When version changes, old cache is deleted automatically
 * 4. Users always get fresh files when you deploy
 * 
 * WORKFLOW:
 * - Update version.js → Push to GitHub → Users get new version automatically
 */

// Load version from single source of truth
importScripts('./resources/js/version.js');
const CACHE_NAME = `from-nothing-v${self.VERSION}`;

// List of files to cache (add new JS/CSS files here as needed)
const FILES_TO_CACHE = [
  './index.html',
  './favicon.ico',
  './resources/css/custom.css',
  './resources/js/main.js',
  './resources/js/audioManager.js',
  './resources/js/constants.js',
  './resources/js/enemy.js',
  './resources/js/gameLoop.js',
  './resources/js/gameOverManager.js',
  './resources/js/gameState.js',
  './resources/js/inputManager.js',
  './resources/js/player.js',
  './resources/js/playerManager.js',
  './resources/js/projectile.js',
  './resources/js/renderer.js',
  './resources/js/room.js',
  './resources/js/roomController.js',
  './resources/js/shopController.js',
  './resources/js/shopManager.js',
  './resources/js/uiManager.js',
  './resources/js/upgrades.js',
  './resources/js/utils.js',
  './resources/js/version.js',
  './resources/js/worldController.js',
  './resources/upgrades.json',
];

// INSTALL: Cache all files when service worker first installs
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${self.VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// ACTIVATE: Delete old caches (happens when version changes)
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating v${self.VERSION}`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete any cache that doesn't match current version
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('from-nothing-') && name !== CACHE_NAME)
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control of all pages
  );
});

// FETCH: Network-first strategy (always try to get fresh files)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests from our domain
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          // Update cache with fresh version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - fall back to cache (enables offline play)
        return caches.match(event.request);
      })
  );
});
