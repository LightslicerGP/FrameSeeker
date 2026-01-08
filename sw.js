const CACHE_NAME = "pwa-cache";
const ASSETS = [
    "/",
    "/index.html",
    "/index.css",
    "/index.js",
    "/pwa.js",
    "/manifest.json"
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

    // === SHARE TARGET ===
    if (event.request.method !== "GET" && event.request.method !== "POST") return;

    const url = new URL(event.request.url);

    if (url.pathname.startsWith("/videoIncoming")) {
        event.respondWith(handleShare(event.request));
        return;
    }

    if (event.request.method !== "GET") return;

    // === NORMAL CACHE LOGIC ===
    event.respondWith(
        (async () => {
            try {
                if (event.request.method !== "GET") {
                    return;
                }
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            } catch {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;
                if (event.request.mode === "navigate") {
                    return caches.match("/index.html");
                }
                throw err;
            }
        })()
    );
});



// Skip waiting message (optional)
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// ===== Web Share Target =====
let lastSharePayload = null;

self.addEventListener('message', async (event) => {
    if (!event || !event.data) return;
    if (event.data.type === 'request-last-share' && lastSharePayload) {
        try {
            event.source && event.source.postMessage({ type: 'frameseeker-share', payload: lastSharePayload });
            lastSharePayload = null;
        } catch (_) { }
    }
});

// Share handler
async function handleShare(request) {
    try {
        const cloned = request.clone();
        const formData = await cloned.formData();
        const title = formData.get('title') || '';
        const text = formData.get('text') || '';
        const url = formData.get('url') || '';

        const files = [];
        for (const value of formData.values()) {
            if (value instanceof File && value.type.startsWith("video/")) {
                files.push(value);
            }
        }

        const payload = { title, text, url, files };
        lastSharePayload = payload;

        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        let client = clientList[0];

        if (!client) {
            client = await clients.openWindow("./");
        }

        client?.postMessage({ type: 'frameseeker-share', payload });

        // ALWAYS redirect after share
        return Response.redirect("./", 303);
    } catch (err) {
        console.error("Share handler crash:", err);
        return new Response(
            "Failed to handle share: " + err.message,
            { status: 500 }
        );
    }
}
