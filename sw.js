self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    clients.claim();
});
    
self.addEventListener('fetch', event => {
    if (event.request.method === 'POST' && event.request.url.includes('/frameseeker-share')) {
      event.respondWith(handleShare(event.request));
    }
  });