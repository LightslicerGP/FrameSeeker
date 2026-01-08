let deferredPrompt;
const installBtn = document.getElementById("install-btn");

// Detect if app is already installed (PWA mode)
const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

if (!isStandalone && installBtn) {
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
} else if (installBtn) {
    installBtn.style.display = "none";
}

// ==========================================
// SERVICE WORKER & SHARE HANDLING
// ==========================================
if ("serviceWorker" in navigator) {

    // 1. Register the Service Worker
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then((registration) => {
                console.log("Service worker registered");

                // 2. HANDSHAKE: Ask SW if there is a shared file waiting
                if (registration.active) {
                    registration.active.postMessage({ type: 'request-last-share' });
                }
            })
            .catch((err) => console.error("Service worker error:", err));
    });

    // 3. Listen for the file from the Service Worker
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "frameseeker-share") {
            const payload = event.data.payload;
            console.log("PWA received shared payload:", payload);

            if (payload?.files && payload.files.length > 0) {
                const file = payload.files[0];

                // Ensure loadVideoFile exists (from index.js)
                if (typeof loadVideoFile === "function") {
                    loadVideoFile(file);
                } else {
                    console.error("loadVideoFile function not found!");
                }
            }
        }
    });
}

// Handle files from Windows launchQueue (Desktop PWA)
if ("launchQueue" in window) {
    launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;
        for (const handle of launchParams.files) {
            const file = await handle.getFile();
            if (typeof loadVideoFile === "function") {
                loadVideoFile(file);
            }
            break;
        }
    });
}

// DOM ready tasks
window.addEventListener("DOMContentLoaded", () => {
    setFramerateInput();
    updateChooseVideoBtnVisibility();
    updatePopupFileUI();
    updateJumpToFrameInput();
});

// Handle shared frames or videos from service worker
async function handleShareRequest(request) {
    try {
        const data = await request.json();
        if (data && data.type === "frame" && data.imageData) {
            const filename = data.filename || "frame.png";
            if (window.showDirectoryPicker) {
                try {
                    const res = await fetch(data.imageData);
                    const blob = await res.blob();
                    const ok = await saveBlobToDir(filename, blob);
                    if (!ok) throw new Error("saveBlobToDir failed");
                } catch (_) {
                    const a = document.createElement("a");
                    a.href = data.imageData;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            } else {
                const a = document.createElement("a");
                a.href = data.imageData;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            return new Response(JSON.stringify({ status: "success" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } else {
            return new Response(JSON.stringify({ status: "error", message: "Invalid data" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ status: "error", message: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// Listen to messages from service worker (share-target)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.ready.then((registration) => {
            if (registration.active) {
                registration.active.postMessage({ type: 'request-last-share' });
            }
        });
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "frameseeker-share") {
            const payload = event.data.payload;

            if (payload?.files && payload.files.length > 0) {
                const file = payload.files[0];

                if (typeof loadVideoFile === "function") {
                    loadVideoFile(file);
                } else {
                    console.error("loadVideoFile function not found!");
                }
            }
        }
    });
}