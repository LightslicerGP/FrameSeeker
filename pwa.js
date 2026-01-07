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

// ===== Share / Launch Handling =====

// Handle files from Windows launchQueue (if supported)
if ("launchQueue" in window) {
    launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;
        for (const handle of launchParams.files) {
            const file = await handle.getFile();
            loadVideo(file, file.name);
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
    navigator.serviceWorker.addEventListener("message", async (event) => {
        if (event.data && event.data.type === "frameseeker-share") {
            const payload = event.data.payload || {};

            if (payload && payload.type === "frame") {
                await handleShareRequest({ json: async () => payload });
                return;
            }

            const files = payload.files || [];
            if (Array.isArray(files) && files.length > 0) {
                const file = files[0];
                try {
                    const blobUrl = URL.createObjectURL(file);
                    baseFilename = file.name ? file.name.replace(/\.[^/.]+$/, "") : "Video";
                    video.src = blobUrl;
                    video.style.display = "block";
                    seekbarContainer.style.display = "flex";
                    updateChooseVideoBtnVisibility();
                    updatePopupFileUI();
                    updateJumpToFrameInput();
                } catch (e) {
                    console.error("Failed to load shared video:", e);
                }
            }
        }
    });
}
