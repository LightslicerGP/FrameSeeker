const CACHE_NAME = "pwa-cache";
const SHARE_CACHE = "share-target-buffer"; // New dedicated cache
const ASSETS = [
    "./",
    "./index.html",
    "./index.css",
    "./index.js",
    "./pwa.js",
    "./manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // ==========================================
    // SHARE TARGET HANDLER (STREAM TO DISK)
    // ==========================================
    // We check endsWith to support subdirectories
    if (event.request.method === "POST" && url.pathname.endsWith("videoIncoming")) {
        event.respondWith((async () => {
            try {
                // 1. Open the dedicated share cache
                const cache = await caches.open(SHARE_CACHE);

                // 2. Create a stream-based response.
                // CRITICAL: We pass the 'Content-Type' header so the boundary string
                // is preserved. This allows the Client to parse the multipart data later.
                const responseToCache = new Response(event.request.body, {
                    headers: {
                        'Content-Type': event.request.headers.get('Content-Type')
                    }
                });

                // 3. Save the stream directly to disk (this avoids RAM crashes)
                await cache.put('/video-share-temp', responseToCache);

                // 4. Redirect the user to the app with a flag
                return Response.redirect("./?share_target=1", 303);

            } catch (err) {
                // If this fails, we return a simple error page
                return new Response("Share Error: " + err.message, { status: 500 });
            }
        })());
        return;
    }

    // === NORMAL CACHE LOGIC ===
    if (event.request.method === "GET") {
        event.respondWith(
            (async () => {
                try {
                    // Try network first
                    const networkResponse = await fetch(event.request);
                    // Update cache
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                } catch {
                    // Fallback to cache
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) return cachedResponse;
                    
                    // If navigating (loading the page), return index.html
                    if (event.request.mode === "navigate") {
                        return caches.match("./index.html");
                    }
                    // Return nothing (let it fail) or a placeholder if needed
                }
            })()
        );
    }
});