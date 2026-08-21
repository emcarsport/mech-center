const CACHE_NAME = 'mechcenter-v1';

// Fichiers à mettre en cache pour le mode offline
const ASSETS = [
    './planning.html',
    './index.html',
    './transfer.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Installation — mise en cache des assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Cache ouvert');
            // On ignore les erreurs si certains fichiers n'existent pas encore
            return Promise.allSettled(
                ASSETS.map(url => cache.add(url).catch(() => {}))
            );
        })
    );
    self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — Network First pour les requêtes API, Cache First pour les assets
self.addEventListener('fetch', function(event) {
    const url = new URL(event.request.url);

    // Toujours réseau pour Google Apps Script (données en temps réel)
    if (url.hostname.includes('script.google.com') ||
        url.hostname.includes('googleapis.com')) {
        event.respondWith(fetch(event.request).catch(function() {
            return new Response(JSON.stringify([]), {
                headers: { 'Content-Type': 'application/json' }
            });
        }));
        return;
    }

    // Cache First pour Tailwind, Google Fonts, images
    if (url.hostname.includes('cdn.tailwindcss.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('raw.githubusercontent.com')) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                return cached || fetch(event.request).then(function(response) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Network First pour les pages HTML (toujours à jour)
    event.respondWith(
        fetch(event.request).then(function(response) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            return response;
        }).catch(function() {
            return caches.match(event.request);
        })
    );
});