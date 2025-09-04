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

        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        let client = clientList && clientList.length ? clientList[0] : null;
        if (!client) {
            const rootUrl = new URL('./', self.registration.scope).href;
            client = await clients.openWindow(rootUrl);
        }
        if (client) {
            client.postMessage({ type: 'frameseeker-share', payload });
        }

        // Respond with a simple page; Android will show this after sharing
        return new Response('<!doctype html><title>FrameSeeker</title><meta name="viewport" content="width=device-width, initial-scale=1" /><body style="font-family: system-ui, sans-serif; padding: 24px;">Shared to FrameSeeker. You can close this tab.</body>', { headers: { 'Content-Type': 'text/html' } });
    } catch (err) {
        return new Response('Failed to handle share: ' + (err && err.message ? err.message : String(err)), { status: 500 });
    }
}