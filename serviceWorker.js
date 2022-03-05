if('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js')
            .then((registration) => {
                console.log("Service Worker registration successful")
            }, (err) => {
                console.error("Service Worker registration failed")
                console.error(err);
            });
    });
}
var VERSION = '1.0.1';
let cache_name = 'WordMishmash-v'+ VERSION;
let urls_to_cache = [
    '/index.html',
    '/css/index.css',
    '/images/example.png',
    '/images/logo.png',
    '/js/index.js',
    '/js/words.js',
    '/dist/bootstrap-5.0.2-dist/js/bootstrap.bundle.min.js',
    '/dist/jquery-3.6.0-dist/jquery-3.6.0.min.js',
    '/dist/bootstrap-5.0.2-dist/css/bootstrap.min.css',
    '/android-icon-36x36.png',
    '/android-icon-48x48.png',
    '/android-icon-72x72.png',
    '/android-icon-96x96.png',
    '/android-icon-144x144.png',
    '/android-icon-192x192.png',
    '/apple-icon-57x57.png',
    '/apple-icon-60x60.png',
    '/apple-icon-72x72.png',
    '/apple-icon-76x76.png',
    '/apple-icon-114x114.png',
    '/apple-icon-120x120.png',
    '/apple-icon-144x144.png',
    '/apple-icon-152x152.png',
    '/apple-icon-180x180.png',
    '/apple-icon-precomposed.png',
    '/apple-icon.png',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon-96x96.png',
    '/favicon.ico',
    '/ms-icon-70x70.png',
    '/ms-icon-144x144.png',
    '/ms-icon-150x150.png',
    '/ms-icon-310x310.png'
];
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