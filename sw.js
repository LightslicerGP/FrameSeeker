// This is the "Offline page" service worker

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page";

const offlineFallbackPage = "index.html";

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener('install', async (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.add(offlineFallbackPage))
    );
});

if (workbox.navigationPreload.isSupported()) {
    workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const preloadResp = await event.preloadResponse;

                if (preloadResp) {
                    return preloadResp;
                }

                const networkResp = await fetch(event.request);
                return networkResp;
            } catch (error) {

                const cache = await caches.open(CACHE);
                const cachedResp = await cache.match(offlineFallbackPage);
                return cachedResp;
            }
        })());
    }
});

self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    clients.claim();
});

let lastSharePayload = null;

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isShareTarget = url.pathname.endsWith('/videoIncoming') || url.pathname.endsWith('videoIncoming');
    if (isShareTarget && event.request.method === 'POST') {
        event.respondWith(handleShare(event.request));
        return;
    }
    if (isShareTarget && event.request.method === 'GET' && event.request.destination === 'document') {
        const rootUrl = new URL('./', self.registration.scope).href;
        event.respondWith(Response.redirect(rootUrl));
        return;
    }
});

self.addEventListener('message', async (event) => {
    if (!event || !event.data) return;
    if (event.data.type === 'request-last-share' && lastSharePayload) {
        try {
            event.source && event.source.postMessage({ type: 'frameseeker-share', payload: lastSharePayload });
            lastSharePayload = null;
        } catch (_) { }
    }
});

async function handleShare(request) {
    try {
        const formData = await request.formData();
        const title = formData.get('title') || '';
        const text = formData.get('text') || '';
        const url = formData.get('url') || '';

        const files = [];
        // Prefer the declared param name "video", but also collect any video/* files
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

        // Respond with a simple page; Android will show this after sharing
        return new Response('<!doctype html><title>FrameSeeker</title><meta name="viewport" content="width=device-width, initial-scale=1" /><body style="font-family: system-ui, sans-serif; padding: 24px;">Shared to FrameSeeker. You can close this tab.</body>', { headers: { 'Content-Type': 'text/html' } });
    } catch (err) {
        return new Response('Failed to handle share: ' + (err && err.message ? err.message : String(err)), { status: 500 });
    }
}