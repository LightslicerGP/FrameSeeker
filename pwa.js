let deferredPrompt;
const installBtn = document.getElementById("install-btn");

// Detect if app is already installed
const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

if (!isStandalone && installBtn) {
    installBtn.style.display = "none";
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = "block";
    });
    installBtn.addEventListener("click", async () => {
        installBtn.style.display = "none";
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt = null;
        }
    });
} else if (installBtn) {
    installBtn.style.display = "none";
}

// ==========================================
// 1. REGISTER SERVICE WORKER
// ==========================================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => console.log("SW Registered"))
            .catch(err => console.error("SW Fail:", err));
    });
}

// ==========================================
// 2. CHECK FOR SHARED FILES (CACHE METHOD)
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
    // 1. Check if we were redirected here by the Service Worker
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('share_target')) {
        console.log("Detecting Share Target redirect...");
        
        // Remove the query param so refresh doesn't trigger it again
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        try {
            // Open the specific cache we used in sw.js
            const cache = await caches.open('share-target-buffer');
            const response = await cache.match('/video-share-temp');

            if (response) {
                console.log("Found shared file in cache!");
                
                // Convert the response to a Blob
                const blob = await response.blob();
                
                // Use the Response constructor to parse the multipart data
                // This works because 'response.headers' contains the correct Boundary
                const multipartResponse = new Response(blob, {
                    headers: response.headers
                });
                
                const formData = await multipartResponse.formData();
                
                // Retrieve the file (name 'files' must match manifest.json)
                const file = formData.get('files'); // or formData.getAll('files')[0]

                if (file) {
                    console.log("File extracted:", file.name);
                    if (typeof loadVideoFile === "function") {
                        loadVideoFile(file);
                    } else {
                        console.error("loadVideoFile function missing");
                    }
                }

                // Cleanup: Delete the temp file from cache
                await cache.delete('/video-share-temp');
            }
        } catch (err) {
            console.error("Error reading shared file from cache:", err);
            // Optional: alert("Error loading shared video: " + err.message);
        }
    }
    
    // Regular initializers
    if(typeof updateChooseVideoBtnVisibility === 'function') updateChooseVideoBtnVisibility();
});

// Handle standard Launch Queue (Windows/Desktop)
if ("launchQueue" in window) {
    launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;
        const fileHandle = launchParams.files[0];
        const file = await fileHandle.getFile();
        if (typeof loadVideoFile === "function") loadVideoFile(file);
    });
}