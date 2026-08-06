const CACHE_NAME = 'zs-bazaar-cache-v3';

// Daftar file yang wajib disimpan ke memori HP agar bisa dibuka offline
const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://unpkg.com/html5-qrcode'
];

// PROSES INSTALL: Menyimpan file ke Cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Menyimpan file ke cache...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// PROSES AKTIVASI: Membersihkan Cache versi lama jika ada pembaruan
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Menghapus cache lama...');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// PROSES FETCH: Memotong antrean request saat aplikasi dibuka
self.addEventListener('fetch', (event) => {
    // PENTING: Jangan cache request ke database Firebase. Biarkan Firebase SDK mengurus offline-nya sendiri.
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Jika file ada di cache, gunakan itu (bisa offline). Jika tidak, ambil dari internet.
            return cachedResponse || fetch(event.request);
        }).catch(() => {
            // Jika internet mati dan file tidak ada di cache, arahkan kembali ke halaman utama
            if (event.request.mode === 'navigate') {
                return caches.match('./Bazaar_Fixed.html');
            }
        })
    );
});
