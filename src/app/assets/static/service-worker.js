const CACHE_NAME = 'steemcn-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/assets/app.js',
    '/assets/vendor.js',
    '/assets/steem.js',
    '/assets/utils.js',
    '/assets/manifest.js',
    '/assets/app.css',
    '/favicons/favicon.ico',
    '/images/steemit-logo.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// URL patterns and their cache strategies
const URL_PATTERNS = [
    { pattern: /\/assets\//, strategy: CACHE_STRATEGIES.CACHE_FIRST, maxAge: 86400000 }, // 1000 days
    { pattern: /\/favicons\//, strategy: CACHE_STRATEGIES.CACHE_FIRST, maxAge: 86400000 },
    { pattern: /\/images\//, strategy: CACHE_STRATEGIES.CACHE_FIRST, maxAge: 86400000 },
    { pattern: /\/api\//, strategy: CACHE_STRATEGIES.NETWORK_FIRST, maxAge: 300000 }, // 5 minutes
    { pattern: /\/@[^\/]+$/, strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE, maxAge: 600000 }, // 10 minutes
    { pattern: /\//, strategy: CACHE_STRATEGIES.NETWORK_FIRST, maxAge: 60000 } // 1 minute
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }

    const url = new URL(event.request.url);
    const matchedPattern = URL_PATTERNS.find(pattern => pattern.pattern.test(url.pathname));
    
    if (!matchedPattern) {
        return;
    }

    event.respondWith(
        handleRequest(event.request, matchedPattern.strategy, matchedPattern.maxAge)
    );
});

async function handleRequest(request, strategy, maxAge) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
            if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
                return cachedResponse;
            }
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                return cachedResponse || new Response('Network error', { status: 503 });
            }

        case CACHE_STRATEGIES.NETWORK_FIRST:
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                return cachedResponse || new Response('Network error', { status: 503 });
            }

        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            if (cachedResponse) {
                // Return cached response immediately
                fetch(request).then(networkResponse => {
                    if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                }).catch(() => {
                    // Ignore network errors for background updates
                });
                return cachedResponse;
            } else {
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    return new Response('Network error', { status: 503 });
                }
            }

        default:
            return fetch(request);
    }
}

function isExpired(response, maxAge) {
    const dateHeader = response.headers.get('date');
    if (!dateHeader) return false;
    
    const responseTime = new Date(dateHeader).getTime();
    const now = Date.now();
    return (now - responseTime) > maxAge;
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Implement background sync logic for offline actions
    console.log('Service Worker: Background sync triggered');
}

// Handle push notifications
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/favicons/favicon-96x96.png',
            badge: '/favicons/favicon-32x32.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});