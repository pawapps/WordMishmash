if('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log("Service Worker registration successful")
            }, (err) => {
                console.error("Registration failed")
                console.error(err);
            });
    });
}

let cache_name = 'WordMishmash-v0.0.1'
let urls_to_cache = [
    '/index.html',
    '/js/index.js'
]
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(cache_name).then((cache) => {
        return cache.addAll(urls_to_cache)
    }) );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((response) => {
        if(response)
            return response
        else
            return fetch(e.request)
    }) );
});