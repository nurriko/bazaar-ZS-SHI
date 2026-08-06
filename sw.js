const CACHE_NAME = 'zs-bazaar-ota-cache';

const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://unpkg.com/html5-qrcode'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    self.clients.claim();
});

// Strategi OTA: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse; 
            });
        }).catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
