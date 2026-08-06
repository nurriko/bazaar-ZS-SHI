// Nama cache dibuat permanen, tidak perlu ganti-ganti versi lagi
const CACHE_NAME = 'zs-bazaar-ota-cache';

const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://unpkg.com/html5-qrcode'
];

// PROSES INSTALL: Memaksa Service Worker baru untuk langsung bekerja tanpa menunggu
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// PROSES AKTIVASI: Mengambil alih kontrol semua halaman yang terbuka
self.addEventListener('activate', (event) => {
    self.clients.claim();
});

// PROSES FETCH (STRATEGI OTA: Network First, Fallback to Cache)
self.addEventListener('fetch', (event) => {
    // Abaikan sinkronisasi database Firebase (biarkan Firebase SDK yang mengurus)
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // JIKA ONLINE: Berhasil dapat data baru dari internet (GitHub)
            // Simpan salinan data baru ini ke dalam memori Cache secara diam-diam
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse; // Tampilkan yang terbaru ke layar
            });
        }).catch(() => {
            // JIKA OFFLINE: Gagal terhubung ke internet
            // Ambil dari memori Cache
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Jika offline dan tidak ada di cache sama sekali, paksakan ke halaman awal
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
