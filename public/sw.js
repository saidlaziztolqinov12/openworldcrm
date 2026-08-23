self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Dummy fetch handler to satisfy PWA requirements
});
