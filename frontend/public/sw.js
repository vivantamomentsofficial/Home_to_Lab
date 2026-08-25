const CACHE_NAME = 'cloudvault-v5-cache';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/fonts/InstagramSans-Regular.woff',
  '/fonts/InstagramSans-Medium.woff',
  '/fonts/InstagramSans-Bold.woff',
  '/fonts/InstagramSansHead-Bold.woff',
  '/assets/android-chrome-192x192.png',
  '/assets/android-chrome-512x512.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon.svg',
];

// ─── Install: Pre-cache all static assets ──────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate: Remove old caches ───────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Network-first with cache fallback ──────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip external APIs & CDN fonts - never cache these in SW fetch interceptor
  const skipOrigins = ['supabase.co', 'onrender.com', 'cloudflare.com', 'emailjs.com', 'ipify.org', 'googleapis.com', 'gstatic.com', 'cdnfonts.com'];
  if (skipOrigins.some((o) => url.hostname.includes(o))) return;

  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        // Clone and cache successful response
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return networkRes;
      })
      .catch(() => {
        // Offline fallback: return from cache or app shell
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve the app shell
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// ─── Message: Force update ─────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
