const CACHE_NAME = 'pdvmarket-cloud-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/@google/genai@^1.22.0',
  'https://aistudiocdn.com/framer-motion@^12.23.22',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/recharts@^3.2.1',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/recharts/umd/Recharts.min.js',
  'https://unpkg.com/framer-motion@latest/dist/framer-motion.umd.js',
  'https://unpkg.com/heroicons@2.1.1/24/outline/index.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
            // Generic fallback for failed fetches
            // In a real app, you might want a specific offline page
            console.log('Fetch failed, no network or cache hit.');
        });
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
