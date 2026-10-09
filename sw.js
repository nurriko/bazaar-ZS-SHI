// Service Worker - Sistem Bazaar ZS & Shi (offline-first, lebih cepat)
const CACHE_NAME = 'zs-bazaar-v6';

// File lokal & library eksternal yang di-cache saat install
const LOCAL_ASSETS = ['./', './index.html', './manifest.json'];
const CDN_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'
];

// Lalu lintas database JANGAN dicegat (Firestore punya cache offline sendiri)
const BYPASS_HOSTS = ['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // allSettled: satu file gagal (mis. icon belum ada) tidak membatalkan seluruh instalasi
            Promise.allSettled([...LOCAL_ASSETS, ...CDN_ASSETS].map((url) => cache.add(url)))
        )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

// File aplikasi sendiri: Network First (update OTA), batas tunggu 4 detik lalu pakai cache
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timer);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const fallback = await cache.match('./index.html');
            if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

// Library CDN (Firebase SDK, font, scanner): tampil instan dari cache, diperbarui di belakang layar
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const refresh = fetch(request).then((response) => {
        if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
        return response;
    }).catch(() => null);
    return cached || (await refresh) || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (BYPASS_HOSTS.some((h) => url.hostname === h)) return;

    if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
    else event.respondWith(staleWhileRevalidate(request));
});
