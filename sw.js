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
    const url = new URL(event.request.url);

    // === SHARE TARGET ===
    if (url.pathname.startsWith("/videoIncoming")) {
        if (event.request.method === "POST") {
            event.respondWith((async () => {
                try {
                    return await handleShare(event.request);
                } catch (err) {
                    return new Response("Share failed", { status: 500 });
                }
            })());
            return;
        }

        event.respondWith(Response.redirect("./", 303));
        return;
    }

    // === NORMAL CACHE LOGIC ===
    event.respondWith(
        (async () => {
            try {
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
        const formData = await request.formData();
        const title = formData.get('title') || '';
        const text = formData.get('text') || '';
        const url = formData.get('url') || '';

        const files = [];
        const declared = formData.getAll('video');
        for (const item of declared) {
            if (item && item instanceof File) files.push(item);
        }
        if (files.length === 0) {
            for (const [key, value] of formData.entries()) {
                if (value instanceof File && value.type && value.type.startsWith('video/')) {
                    files.push(value);
                }
            }
        }

        const payload = { title, text, url, files };
        lastSharePayload = payload;

        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        let client = clientList && clientList.length ? clientList[0] : null;
        if (!client) {
            const rootUrl = new URL('./', self.registration.scope).href;
            client = await clients.openWindow(rootUrl);
        }
        if (client) {
            try { client.postMessage({ type: 'frameseeker-share', payload }); } catch (_) { }
        }

        return Response.redirect("./", 303);

    } catch (err) {
        return new Response('Failed to handle share: ' + (err && err.message ? err.message : String(err)), { status: 500 });
    }
}
