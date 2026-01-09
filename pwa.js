let deferredPrompt;
const installBtn = document.getElementById("install-btn");

// Detect if app is already installed (PWA mode)
const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

if (!isStandalone) {
    installBtn.style.display = "none"; // start hidden

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = "block";
    });

    installBtn.addEventListener("click", async () => {
        installBtn.style.display = "none";

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const outcome = await deferredPrompt.userChoice;
            console.log("Install choice:", outcome);
            deferredPrompt = null;
        }
    });
} else {
    installBtn.style.display = "none";
}

// Register service worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then(() => console.log("Service worker registered"))
            .catch((err) => console.error("Service worker error:", err));
    });
}

// ==========================================
// 2. CHECK FOR SHARED FILES (ROBUST SLICE METHOD)
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('share_target')) {
        console.log("Detecting Share Target redirect...");

        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        try {
            const cache = await caches.open('share-target-buffer');
            const response = await cache.match('/video-share-temp');

            if (response) {
                console.log("Found shared file in cache!");
                const blob = await response.blob();
                const contentType = response.headers.get('Content-Type') || '';

                // Try to extract the file using our memory-safe parser
                const file = await parseMultipartFile(blob, contentType);

                if (file) {
                    console.log("File extracted safely:", file.name);
                    if (typeof loadVideoFile === "function") {
                        loadVideoFile(file);
                    } else {
                        console.error("loadVideoFile function missing");
                    }
                } else {
                    console.error("Failed to parse multipart data.");
                }

                // Cleanup
                await cache.delete('/video-share-temp');
            }
        } catch (err) {
            console.error("Error reading shared file:", err);
        }
    }

    // Regular initializers
    if (typeof updateChooseVideoBtnVisibility === 'function') updateChooseVideoBtnVisibility();
});

// ==========================================
// HELPER: Memory-Safe Multipart Parser
// ==========================================
async function parseMultipartFile(blob, contentType) {
    try {
        // 1. Get the boundary string from headers
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!boundaryMatch) {
            console.error("No boundary found in Content-Type");
            return null;
        }
        const boundary = boundaryMatch[1] || boundaryMatch[2];

        // 2. Read just the start of the file (header section) to find metadata
        // We only read the first 10KB, which is enough for headers.
        const headerChunk = blob.slice(0, 1024 * 10);
        const text = await headerChunk.text();

        // 3. Find where the file data actually starts
        // Look for the filename to ensure we are looking at the file part
        const filePartIndex = text.indexOf('filename="');
        if (filePartIndex === -1) return null;

        // Find the end of the headers (double newline)
        // We search starting from the filename position to ensure we get the right section
        const headerEndIndex = text.indexOf('\r\n\r\n', filePartIndex);
        if (headerEndIndex === -1) return null;

        // The data starts after the double newline (4 bytes)
        const dataStartIndex = headerEndIndex + 4;

        // 4. Calculate where the data ends
        // The file ends at the final boundary.
        // Approx: Total Size - (Boundary Length + Extra dashes/newlines)
        // We can safely shave off ~100 bytes from the end to remove the footer.
        // Precise calculation:
        const footerLength = boundary.length + 8; // --boundary--\r\n approx
        const dataEndIndex = blob.size - footerLength;

        // 5. Slice the Blob! (This is instant and uses no RAM)
        const videoBlob = blob.slice(dataStartIndex, dataEndIndex, "video/mp4");

        // 6. Create a File object (Fake name, or extract real name if you want)
        // We can extract the real name from the 'text' variable if needed.
        let filename = "shared-video.mp4";
        const nameMatch = text.match(/filename="([^"]+)"/);
        if (nameMatch) filename = nameMatch[1];

        return new File([videoBlob], filename, { type: "video/mp4" });

    } catch (e) {
        console.error("Manual parse failed:", e);
        return null;
    }
}

// Handle standard Launch Queue (Windows/Desktop)
if ("launchQueue" in window) {
    launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;
        const fileHandle = launchParams.files[0];
        const file = await fileHandle.getFile();
        if (typeof loadVideoFile === "function") loadVideoFile(file);
    });
}