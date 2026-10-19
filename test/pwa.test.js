import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('KampusKash Progressive Web App (PWA) Validation', () => {
  const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
  const manifestJsonPath = path.join(rootDir, 'public', 'manifest.json');
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const offlineHtmlPath = path.join(rootDir, 'public', 'offline.html');
  const indexPath = path.join(rootDir, 'index.html');
  const vercelPath = path.join(rootDir, 'vercel.json');
  const iconsDir = path.join(rootDir, 'public', 'icons');

  test('Web App Manifest exists, is valid JSON, and contains all required metadata', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
    assert.ok(fs.existsSync(manifestJsonPath), 'manifest.json must exist');

    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    assert.strictEqual(manifest.name, 'KampusKash', 'Manifest name must be KampusKash');
    assert.strictEqual(manifest.short_name, 'KampusKash', 'Manifest short_name must be KampusKash');
    assert.strictEqual(manifest.description, 'Your personal student financial management assistant.');
    assert.strictEqual(manifest.start_url, '/');
    assert.strictEqual(manifest.display, 'standalone');
    assert.strictEqual(manifest.orientation, 'portrait-primary');
    assert.ok(manifest.background_color === '#180F2B' || manifest.background_color === '#0A0A0F', 'Valid dark background color');
    assert.strictEqual(manifest.theme_color, '#8B5CF6');

    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifest must declare required icons');

    const sizes = manifest.icons.map(i => i.sizes);
    assert.ok(sizes.includes('192x192'), '192x192 icon must be present');
    assert.ok(sizes.includes('512x512'), '512x512 icon must be present');

    const maskable = manifest.icons.filter(i => i.purpose === 'maskable');
    assert.ok(maskable.length >= 2, 'Maskable icons for 192x192 and 512x512 must be declared');
  });

  test('All required PWA icon image files exist with exact pixel dimensions and non-zero size', () => {
    const requiredIcons = [
      { name: 'icon-192x192.png', width: 192, height: 192 },
      { name: 'icon-512x512.png', width: 512, height: 512 },
      { name: 'maskable-icon-192x192.png', width: 192, height: 192 },
      { name: 'maskable-icon-512x512.png', width: 512, height: 512 },
      { name: 'apple-touch-icon.png', width: 180, height: 180 },
      { name: 'favicon-32x32.png', width: 32, height: 32 },
      { name: 'favicon-16x16.png', width: 16, height: 16 }
    ];

    for (const icon of requiredIcons) {
      const filePath = path.join(iconsDir, icon.name);
      assert.ok(fs.existsSync(filePath), `Icon file ${icon.name} must exist`);
      const buffer = fs.readFileSync(filePath);
      assert.ok(buffer.length > 500, `Icon file ${icon.name} must have valid non-empty byte length`);

      // Read PNG dimensions from IHDR chunk (bytes 16-23)
      const w = buffer.readUInt32BE(16);
      const h = buffer.readUInt32BE(20);
      assert.strictEqual(w, icon.width, `${icon.name} width must be ${icon.width}`);
      assert.strictEqual(h, icon.height, `${icon.name} height must be ${icon.height}`);
    }
  });

  test('Service Worker implements safe app shell caching and strictly excludes sensitive financial data', () => {
    assert.ok(fs.existsSync(swPath), 'sw.js must exist');
    const swContent = fs.readFileSync(swPath, 'utf8');

    // Sensitive data safety checks
    assert.ok(swContent.includes('/api'), 'sw.js must explicitly bypass /api endpoints');
    assert.ok(swContent.includes('identitytoolkit.googleapis.com'), 'sw.js must bypass Firebase Auth');
    assert.ok(swContent.includes('firestore.googleapis.com'), 'sw.js must bypass Firestore');
    assert.ok(swContent.includes('request.method !== \'GET\''), 'sw.js must bypass non-GET requests');

    // App shell and offline handling
    assert.ok(swContent.includes('/offline.html'), 'sw.js must reference offline fallback page');
    assert.ok(swContent.includes('skipWaiting'), 'sw.js must support skipWaiting for fast updates');
    assert.ok(swContent.includes('clients.claim'), 'sw.js must support clients.claim');
  });

  test('Offline fallback page is properly formatted and contains student finance security notice', () => {
    assert.ok(fs.existsSync(offlineHtmlPath), 'offline.html must exist');
    const html = fs.readFileSync(offlineHtmlPath, 'utf8');

    assert.ok(html.includes('KampusKash'), 'offline.html must reference KampusKash');
    assert.ok(html.includes("You're Offline") || html.includes('offline'), 'offline.html must state offline status');
    assert.ok(html.includes('internet connection') || html.includes('connection'), 'offline.html must explain connection need');
    assert.ok(html.includes('Retry Connection'), 'offline.html must provide retry action');
  });

  test('index.html contains full PWA manifest, Apple touch icon, and viewport-fit meta tags', () => {
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    assert.ok(indexContent.includes('rel="manifest"'), 'index.html must link to manifest');
    assert.ok(indexContent.includes('rel="apple-touch-icon"'), 'index.html must link to apple-touch-icon');
    assert.ok(indexContent.includes('apple-mobile-web-app-capable'), 'index.html must enable apple-mobile-web-app-capable');
    assert.ok(indexContent.includes('apple-mobile-web-app-status-bar-style'), 'index.html must set status-bar-style');
    assert.ok(indexContent.includes('viewport-fit=cover'), 'index.html must include viewport-fit=cover');
    assert.ok(indexContent.includes('KampusKash'), 'index.html title/branding must be KampusKash');
  });

  test('vercel.json specifies no-cache for sw.js and correct manifest headers', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

    assert.ok(Array.isArray(vercelConfig.headers), 'vercel.json must have headers section');

    const swHeaderRule = vercelConfig.headers.find(h => h.source === '/sw.js');
    assert.ok(swHeaderRule, 'vercel.json must configure headers for /sw.js');

    const cacheControlHeader = swHeaderRule.headers.find(h => h.key === 'Cache-Control');
    assert.ok(cacheControlHeader && cacheControlHeader.value.includes('no-cache'), 'sw.js must be no-cache');

    const manifestRule = vercelConfig.headers.find(h => h.source === '/manifest.webmanifest');
    assert.ok(manifestRule, 'vercel.json must configure headers for manifest');
  });

  test('Client registration module and PWA components exist and are properly structured', () => {
    const regPath = path.join(rootDir, 'src', 'registerServiceWorker.js');
    const bannerPath = path.join(rootDir, 'src', 'components', 'OfflineBanner.jsx');
    const installPath = path.join(rootDir, 'src', 'components', 'PWAInstallPrompt.jsx');

    assert.ok(fs.existsSync(regPath), 'registerServiceWorker.js must exist');
    assert.ok(fs.existsSync(bannerPath), 'OfflineBanner.jsx must exist');
    assert.ok(fs.existsSync(installPath), 'PWAInstallPrompt.jsx must exist');

    const regContent = fs.readFileSync(regPath, 'utf8');
    assert.ok(regContent.includes('registerSW'), 'registerServiceWorker must export registerSW');
    assert.ok(regContent.includes('isPWAInstalled'), 'registerServiceWorker must export isPWAInstalled');
    assert.ok(regContent.includes('isIOSDevice'), 'registerServiceWorker must export isIOSDevice');

    const installContent = fs.readFileSync(installPath, 'utf8');
    assert.ok(installContent.includes('beforeinstallprompt'), 'PWAInstallPrompt must handle beforeinstallprompt');
    assert.ok(installContent.includes('Install on iPhone'), 'PWAInstallPrompt must provide iOS guide');
  });
});
