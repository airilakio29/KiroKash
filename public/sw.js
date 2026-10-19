/**
 * KampusKash Progressive Web App Service Worker
 * Secure App-Shell Caching with Zero-Cache for Sensitive Financial Endpoints
 */

const CACHE_NAME = 'kampuskash-appshell-v1';
const OFFLINE_URL = '/offline.html';

// Core static assets for initial App Shell
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  '/kiro-logo.png'
];

/**
 * Determine if a request must NEVER be cached by the service worker.
 * Sensitive items strictly bypassed:
 * - Internal /api/* endpoints (Gemini AI chat, insights, backend logic)
 * - Firebase Authentication endpoints (tokens, refresh, sign-in)
 * - Firestore REST / streaming databases
 * - Non-GET requests (mutations, action execution, approvals)
 */
function isSensitiveOrBypass(request) {
  if (request.method !== 'GET') return true;

  const url = new URL(request.url);

  // Exclude chrome-extension and unsupported schemes
  if (!['http:', 'https:'].includes(url.protocol)) return true;

  // Never cache backend /api routes
  if (url.pathname.startsWith('/api')) return true;

  // Never cache Firebase Auth, Google APIs, or Firestore
  const bypassHosts = [
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firestore.googleapis.com',
    'firebaseinstallations.googleapis.com',
    'fcmregistrations.googleapis.com',
    'accounts.google.com',
    'apis.google.com'
  ];

  if (bypassHosts.some(host => url.hostname.includes(host))) {
    return true;
  }

  // Never cache authentication or token-bearing query params
  if (url.searchParams.has('key') || url.searchParams.has('token') || url.searchParams.has('oobCode')) {
    return true;
  }

  return false;
}

// Service Worker Installation: Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        console.warn('[SW] Pre-caching completed with partial assets:', err);
      }
    })
  );
  self.skipWaiting();
});

// Service Worker Activation: Purge Outdated Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event Handler: Secure Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. If sensitive or mutation: completely bypass service worker caching
  if (isSensitiveOrBypass(request)) {
    return; // Browser performs default direct network request
  }

  const url = new URL(request.url);

  // 2. Navigation requests (HTML document loads / SPA route changes)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, attempt cached document first, then branded offline page
          const cachedDoc = await caches.match(request);
          if (cachedDoc) return cachedDoc;

          const cachedRoot = await caches.match('/index.html');
          if (cachedRoot) return cachedRoot;

          const offlineFallback = await caches.match(OFFLINE_URL);
          if (offlineFallback) return offlineFallback;

          return new Response('Network offline. Please check connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 3. Static Assets: JS, CSS, fonts, images
  // Strategy: Stale-While-Revalidate for local assets and Google Fonts
  const isStatic =
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cached asset immediately if available; fetch update in background
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Message listener to trigger immediate skipWaiting when new version is available
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
