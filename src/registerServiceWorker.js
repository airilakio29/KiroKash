/**
 * Progressive Web App Service Worker Registration Module
 * Provides registration, update listening, and standalone mode detection
 */

export function registerSW() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    // Service workers require HTTPS or localhost
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      console.warn('[PWA] Service Workers require HTTPS or localhost.');
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL || '/'}sw.js`.replace(/\/{2,}/g, '/');

      navigator.serviceWorker
        .register(swUrl, { scope: import.meta.env.BASE_URL || '/' })
        .then((registration) => {
          // Check for periodic background updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available
                  console.log('[PWA] New KampusKash version available.');
                  // Dispatch custom event for UI banners if needed
                  window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: registration }));
                } else {
                  console.log('[PWA] KampusKash content is cached for offline use.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        // Optional auto-refresh on controller change if update accepted
      }
    });
  }
}

/**
 * Check if the application is currently running in installed PWA standalone mode
 */
export function isPWAInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Detect if the client device is iOS (iPhone, iPad, iPod)
 */
export function isIOSDevice() {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
}
