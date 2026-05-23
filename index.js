// ==================
// Global debug flag
const debug = false;

// ==================
// Element Selectors
// ==================
const video = document.getElementById('video');
const blurLayer = document.getElementById('video-blur');
const controls = document.getElementById('controls');
const playbackControls = document.getElementById('playbackControls');
const playpauseBtn = document.getElementById('playpauseBtn');
const chooseVideoBtn = document.getElementById('chooseVideoBtn');
const popupOverlay = document.getElementById('popupOverlay');
const framerateSelectorBtn = document.getElementById('framerateSelectorBtn');
const timestampSelectorBtn = document.getElementById('timestampSelectorBtn');
const seekbarSlider = document.getElementById('seekbarSlider');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const back15Btn = document.getElementById('back15Btn');
const forward15Btn = document.getElementById('forward15Btn');
const back5Btn = document.getElementById('back5Btn');
const forward5Btn = document.getElementById('forward5Btn');
const prevFrameBtn = document.getElementById('prevFrameBtn');
const nextFrameBtn = document.getElementById('nextFrameBtn');
const buttons = document.getElementById('topLeftButtons');
const popupLabel = document.getElementById('popupLabel');
const popupInput = document.getElementById('popupValue');
const leftSection = document.querySelector('#controls > #top > .left');
const saveFrameBtn = document.getElementById('saveFrameBtn');
const settingsBtn = document.getElementById('settings-btn');
const settingsDiv = document.getElementById('settings');
const framerateTextDisplay = document.getElementById('framerateText');
const saveToBtn = document.getElementById('saveTo');
const controlsHelpBtn = document.getElementById('controlsHelp');
const fullscreenBtn = document.getElementById('fullscreen');
const fillScreenBtn = document.getElementById('fillScreen');
const speedBtn = document.getElementById('speed');

// ============
// FIT SCREEN & FILL SCREEN TOGGLE LOGIC
// ============
let isFillScreenActive = false;
let isFitScreenActive = false;

// Store original objectFit to restore it
let originalVideoObjectFit = '';
let originalVideoPosition = '';
let originalVideoWidth = '';
let originalVideoHeight = '';
let originalVideoLeft = '';
let originalVideoTop = '';
let originalVideoTransform = '';
let originalVideoZ = '';
let originalFillScreenInnerHTML = '';
let originalFitScreenInnerHTML = '';

// Fit screen button SVG + label from index.html lines 209-216
const fitScreenInnerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M5 9l4 0l0 -4" /><path d="M3 3l6 6" />
        <path d="M5 15l4 0l0 4" /><path d="M3 21l6 -6" />
        <path d="M19 9l-4 0l0 -4" /><path d="M15 9l6 -6" />
        <path d="M19 15l-4 0l0 4" /><path d="M15 15l6 6" />
    </svg>
    <p>Fit Screen</p>
`;

// Save the default innerHTML of the button for toggling back
function cacheOriginalFillScreenInnerHTML() {
    if (fillScreenBtn && !originalFillScreenInnerHTML) {
        originalFillScreenInnerHTML = fillScreenBtn.innerHTML;
    }
}
function cacheOriginalFitScreenInnerHTML() {
    if (fillScreenBtn && !originalFitScreenInnerHTML) {
        originalFitScreenInnerHTML = fitScreenInnerHTML;
    }
}

// Toggle between fill screen and fit screen on clicking the button
if (fillScreenBtn && video && blurLayer) {
    cacheOriginalFillScreenInnerHTML();
    fillScreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // If currently in fill screen, switch to fit screen
        if (!isFitScreenActive && !isFillScreenActive) {
            // ---- Enter "Fill Screen" mode ----
            isFillScreenActive = true;
            isFitScreenActive = false;

            // Save original styles
            originalVideoObjectFit = video.style.objectFit;
            originalVideoPosition = video.style.position;
            originalVideoWidth = video.style.width;
            originalVideoHeight = video.style.height;
            originalVideoLeft = video.style.left;
            originalVideoTop = video.style.top;
            originalVideoTransform = video.style.transform;
            originalVideoZ = video.style.zIndex;

            // Make video cover everything, cropping as needed
            video.style.position = 'fixed';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100vw';
            video.style.height = '100vh';
            video.style.objectFit = 'cover';
            if (originalVideoZ) {
                video.style.zIndex = originalVideoZ;
            }

            // Hide the blurLayer background to save GPU
            blurLayer.style.display = 'none';

            // Indicate mode
            fillScreenBtn.classList.add('active');

            // Change icon to "Fit Screen"
            cacheOriginalFillScreenInnerHTML();
            fillScreenBtn.innerHTML = fitScreenInnerHTML;

            if (debug) console.log('Fill screen mode activated');
        } else if (isFillScreenActive && !isFitScreenActive) {
            // ---- Enter "Fit Screen" mode, restore video, change icon back ----
            // Restore previous video style
            video.style.objectFit = originalVideoObjectFit;
            video.style.position = originalVideoPosition;
            video.style.width = originalVideoWidth;
            video.style.height = originalVideoHeight;
            video.style.left = originalVideoLeft;
            video.style.top = originalVideoTop;
            video.style.transform = originalVideoTransform;
            video.style.zIndex = originalVideoZ;

            // Show the blurLayer again
            blurLayer.style.display = '';

            // Remove indication
            fillScreenBtn.classList.remove('active');

            // Restore the original icon 
            fillScreenBtn.innerHTML = originalFillScreenInnerHTML;

            // Reset state
            isFillScreenActive = false;
            isFitScreenActive = false;

            if (debug) console.log('Fill screen mode deactivated');
        }
    });
}

// ==================
// IndexedDB Handle Storage (To remember the Save Folder)
// ==================
async function getDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('FrameSeekerAppDB', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('settings');
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function storeDirHandle(handle) {
    try {
        const db = await getDB();
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(handle, 'saveDirectory');
    } catch (e) {
        console.error("Could not save directory to IndexedDB", e);
    }
}

async function loadDirHandle() {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get('saveDirectory');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

if (settingsBtn && settingsDiv && chooseVideoBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsBtn.classList.add('removed');
        settingsDiv.classList.remove('removed');
        chooseVideoBtn.classList.add('removed');
    });

    if (saveToBtn && fullscreenBtn) {
        saveToBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            settingsDiv.classList.add('removed');
            settingsBtn.classList.remove('removed');
            chooseVideoBtn.classList.remove('removed');
            const handle = await requestSaveDirectory();
            if (handle) {
                saveDirHandle = handle;
                await storeDirHandle(handle);
                if (debug) console.log("New save directory selected and stored in IndexedDB.");
            }
        });

        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsDiv.classList.add('removed');
            settingsBtn.classList.remove('removed');
            chooseVideoBtn.classList.remove('removed');

            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error("Error attempting to enable fullscreen:", err);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    document.addEventListener('mousedown', (e) => {
        if (
            !settingsDiv.classList.contains('removed') &&
            !settingsDiv.contains(e.target) &&
            e.target !== settingsBtn
        ) {
            settingsDiv.classList.add('removed');
            settingsBtn.classList.remove('removed');
            chooseVideoBtn.classList.remove('removed');
        }
    });

    document.addEventListener('touchstart', (e) => {
        if (
            !settingsDiv.classList.contains('removed') &&
            !settingsDiv.contains(e.target) &&
            e.target !== settingsBtn
        ) {
            settingsDiv.classList.add('removed');
            settingsBtn.classList.remove('removed');
            chooseVideoBtn.classList.remove('removed');
        }
    }, { passive: true });
}

// ==================
// State Variables
// ==================
let fileInput = null;
let isSeeking = false;
let selectedFramerate = 30;
let popupJustOpened = false;

let saveDirHandle = null;

let _pendingResumeCurrentTime = null;

let controlsAutoHideTimer = null;
const AUTOHIDE_DELAY = 3000;
function isControlsVisible() {
    return (
        controls && !controls.classList.contains('transparent') ||
        playbackControls && !playbackControls.classList.contains('transparent')
    );
}
function clearControlsAutoHideTimer() {
    if (controlsAutoHideTimer) {
        clearTimeout(controlsAutoHideTimer);
        controlsAutoHideTimer = null;
    }
}
function scheduleControlsAutoHide() {
    clearControlsAutoHideTimer();
    if (popupOverlay.classList.contains('active')) return;
    if (!isControlsVisible()) return;
    controlsAutoHideTimer = setTimeout(() => {
        if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
            if (controls && !controls.classList.contains('transparent')) controls.classList.add('transparent');
            if (playbackControls && !playbackControls.classList.contains('transparent')) playbackControls.classList.add('transparent');
            clearControlsAutoHideTimer();
        }
    }, AUTOHIDE_DELAY);
}
function resetControlsAutoHide() {
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    } else {
        clearControlsAutoHideTimer();
    }
}

function getFrameDuration() {
    return selectedFramerate && selectedFramerate > 0 ? 1 / selectedFramerate : 1 / 30;
}

// ==================
// Utility Functions
// ==================
function hideResumeBlockBtns() {
    if (playpauseBtn) playpauseBtn.classList.add('removed');
    if (back15Btn) back15Btn.classList.add('removed');
    if (forward15Btn) forward15Btn.classList.add('removed');
}
function showResumeBlockBtns() {
    if (playpauseBtn) playpauseBtn.classList.remove('removed');
    if (back15Btn) back15Btn.classList.remove('removed');
    if (forward15Btn) forward15Btn.classList.remove('removed');
}

function formatTime(seconds, useHours = false) {
    if (isNaN(seconds) || !isFinite(seconds)) return useHours ? '00:00:00' : '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (useHours || hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

function updateSeekbar() {
    if (!video || !video.duration || !seekbarSlider || !currentTimeDisplay || !totalTimeDisplay) return;
    const currentTime = video.currentTime;
    const duration = video.duration;
    const useHours = duration >= 3600;
    const ratio = currentTime / duration;
    seekbarSlider.value = ratio * 100;
    seekbarSlider.parentElement.style.setProperty('--progress-ratio', ratio);
    currentTimeDisplay.textContent = formatTime(currentTime, useHours);
    totalTimeDisplay.textContent = formatTime(duration, useHours);
}

function updateTotalTimeDisplay() {
    if (video && totalTimeDisplay) {
        const useHours = video.duration >= 3600;
        totalTimeDisplay.textContent = formatTime(video.duration, useHours);
    }
}

function updatePlayPauseIcon() {
    if (video && !video.paused) {
        playpauseBtn.innerHTML = pauseSVG;
    } else {
        playpauseBtn.innerHTML = playSVG;
    }
}

function skipVideo(seconds) {
    if (!video || !video.duration) return;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    video.currentTime = newTime;
    updateSeekbar();
}

function toggleControls() {
    controls.classList.toggle('transparent');
    playbackControls.classList.toggle('transparent');
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    } else {
        clearControlsAutoHideTimer();
    }
    if (debug) console.log('toggleControls called');
}

function getCurrentFrameNumber() {
    if (!video) return 0;
    return Math.floor(video.currentTime * selectedFramerate);
}
function getTimeForFrame(frameNumber) {
    return Math.max(0, frameNumber / selectedFramerate);
}

// ==================
// SAVE FRAME/CAPTURE BUTTON LOGIC (MODIFIED PADDING)
// ==================

function getFramePaddingLength() {
    if (video && video.duration && selectedFramerate) {
        const maxFrame = Math.max(1, Math.round(video.duration * selectedFramerate));
        return String(maxFrame).length;
    }
    return 4;
}
function getZSpacing(frameNumber, zSpacing = 0) {
    return 'z' + '0'.repeat(zSpacing) + frameNumber;
}
function getMaxFrameNumber() {
    if (video && video.duration && selectedFramerate) {
        return Math.max(1, Math.round(video.duration * selectedFramerate));
    }
    return 9999;
}

const CAPTURE_FILENAME_Z_SPACING = 0;

function getCaptureFileName() {
    let base = "capture";
    if (video && video.dataset && video.dataset.name) {
        base = video.dataset.name.replace(/\.[^/.]+$/, "");
    }
    const padding = getFramePaddingLength();
    const frameNumRaw = getCurrentFrameNumber();
    const frameNumPadded = String(frameNumRaw).padStart(padding, "0");
    let framePortion = frameNumPadded;
    if (CAPTURE_FILENAME_Z_SPACING > 0) {
        framePortion += getZSpacing(frameNumPadded, CAPTURE_FILENAME_Z_SPACING);
    }
    return `${base}-Frame${framePortion}-FrameSeeker.png`;
}

// ==================
// Directory picker helpers for saving image if supported
// ==================

async function requestSaveDirectory() {
    if (!window.showDirectoryPicker) {
        console.error("showDirectoryPicker is not available.");
        return null;
    }
    try {
        const handle = await window.showDirectoryPicker({ startIn: "pictures" });
        const perm = await handle.requestPermission({ mode: "readwrite" });
        if (perm === "granted") {
            return handle;
        }
    } catch (e) {
        console.error("User cancelled or error requesting directory:", e);
    }
    return null;
}

async function ensureSaveDirectory() {
    if (saveDirHandle) {
        try {
            let perm = await saveDirHandle.queryPermission({ mode: "readwrite" });
            if (perm === "prompt") {
                perm = await saveDirHandle.requestPermission({ mode: "readwrite" });
            }
            if (perm === "granted") {
                return saveDirHandle;
            } else {
                console.warn("Permission for the saved directory was denied. Falling back to default download.");
            }
        } catch (e) {
            console.error("Error verifying directory permission:", e);
        }
    }
    return null;
}

async function saveBlobToDir(filename, blob) {
    const dir = await ensureSaveDirectory();
    if (!dir) {
        return false;
    }
    try {
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
    } catch (e) {
        console.error("Error saving blob directly to directory:", e);
        return false;
    }
}

saveFrameBtn.addEventListener('click', async function (e) {
    e.stopPropagation();

    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const filename = getCaptureFileName();

    if (window.showDirectoryPicker) {
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });
        if (!blob) return;
        const saved = await saveBlobToDir(filename, blob);
        if (!saved) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.classList.add('removed');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    } else {
        canvas.toBlob(function (blob) {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.classList.add('removed');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, 'image/png', 1.0);
    }
});

// ==================
// SVG Icon Constants
// ==================
const playSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
</svg>`;

const pauseSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
</svg>`;

// -- Video Speed Barrel Switch (SVG + behavior) --
const speedSteps = [.5, 1, 2, 4];
let currentSpeedIdx = 1;

function getSpeedText(speed) {
    return speed === 0.5 ? '.5x' : `${speed}x`;
}

function updateSpeedSVG() {
    if (!speedBtn) return;
    let svg = speedBtn.querySelector('svg');
    const speedText = getSpeedText(speedSteps[currentSpeedIdx]);
    if (!svg) {
        speedBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <text x="12" y="12" text-anchor="middle" dominant-baseline="middle" fill="white">${speedText}</text>
</svg>`;
    } else {
        let text = svg.querySelector('text');
        if (!text) {
            svg.innerHTML = `<text x="12" y="12" text-anchor="middle" dominant-baseline="middle" fill="white">${speedText}</text>`;
        } else {
            text.textContent = speedText;
        }
    }
}

if (speedBtn && video) {
    updateSpeedSVG();
    speedBtn.addEventListener('click', e => {
        e.stopPropagation();
        currentSpeedIdx = (currentSpeedIdx + 1) % speedSteps.length;
        video.playbackRate = speedSteps[currentSpeedIdx];
        updateSpeedSVG();
    });
    video.addEventListener('ratechange', updateSpeedSVG);
    video.playbackRate = speedSteps[currentSpeedIdx];
}
// ==================
// Main Event Listeners
// ==================

if (seekbarSlider) {
    seekbarSlider.addEventListener('input', () => {
        isSeeking = true;
        if (video && video.duration) {
            const val = seekbarSlider.value;
            const ratio = val / 100;
            seekbarSlider.parentElement.style.setProperty('--progress-ratio', ratio);
            const seekTime = ratio * video.duration;
            video.currentTime = seekTime;
            const useHours = video.duration >= 3600;
            currentTimeDisplay.textContent = formatTime(seekTime, useHours);
        }
        resetControlsAutoHide();
        if (debug) console.log('seekbarSlider input');
    });
    seekbarSlider.addEventListener('mousedown', () => {
        isSeeking = true;
        seekbarSlider.classList.add('is-seeking');
        resetControlsAutoHide();
        if (debug) console.log('seekbarSlider mousedown');
    });
    seekbarSlider.addEventListener('mouseup', () => {
        isSeeking = false;
        seekbarSlider.classList.remove('is-seeking');
        resetControlsAutoHide();
        if (debug) console.log('seekbarSlider mouseup');
    });
    seekbarSlider.addEventListener('touchstart', () => {
        isSeeking = true;
        seekbarSlider.classList.add('is-seeking');
        resetControlsAutoHide();
        if (debug) console.log('seekbarSlider touchstart');
    });
    seekbarSlider.addEventListener('touchend', () => {
        isSeeking = false;
        seekbarSlider.classList.remove('is-seeking');
        resetControlsAutoHide();
        if (debug) console.log('seekbarSlider touchend');
    });
    seekbarSlider.addEventListener('touchcancel', () => {
        isSeeking = false;
        seekbarSlider.classList.remove('is-seeking');
        resetControlsAutoHide();
    });
    seekbarSlider.addEventListener('click', (e) => {
        e.stopPropagation();
        resetControlsAutoHide();
        if (debug) console.log('seekbarSlider clicked');
    });
}

if (video) {
    video.addEventListener('loadedmetadata', updateSeekbar);
    video.addEventListener('loadedmetadata', updateTotalTimeDisplay);
    video.addEventListener('durationchange', updateSeekbar);
    video.addEventListener('durationchange', updateTotalTimeDisplay);
    video.addEventListener('timeupdate', () => {
        if (!isSeeking) {
            updateSeekbar();
        }
        if (!video.src) return;
        const videoState = {
            currentTime: video.currentTime,
            name: video.dataset.name || '',
            lastModified: video.dataset.lastModified || '',
        };
        localStorage.setItem('videoState', JSON.stringify(videoState));
    });
    video.addEventListener('seeked', () => {
        if (!isSeeking) updateSeekbar();
    });
}

playpauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!video || !video.src) return;
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
    updatePlayPauseIcon();
    resetControlsAutoHide();
    if (debug) console.log('playpauseBtn clicked');
});
video.addEventListener('play', () => {
    updatePlayPauseIcon();
    if (!popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
    if (debug) console.log('video play event (icon update)');
});
video.addEventListener('pause', () => {
    updatePlayPauseIcon();
    if (!popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
    if (debug) console.log('video pause event (icon update)');
});
back15Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(-15);
    resetControlsAutoHide();
    if (debug) console.log('back15Btn clicked');
});
forward15Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(15);
    resetControlsAutoHide();
    if (debug) console.log('forward15Btn clicked');
});
back5Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(-5);
    resetControlsAutoHide();
    if (debug) console.log('back5Btn clicked');
});
forward5Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(5);
    resetControlsAutoHide();
    if (debug) console.log('forward5Btn clicked');
});
prevFrameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(-getFrameDuration());
    resetControlsAutoHide();
    if (debug) console.log('prevFrameBtn clicked');
});
nextFrameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(getFrameDuration());
    resetControlsAutoHide();
    if (debug) console.log('nextFrameBtn clicked');
});
document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        resetControlsAutoHide();
        if (debug) console.log('A .button element was clicked');
    });
});

video.addEventListener('click', () => {
    toggleControls();
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
    if (debug) console.log('video element clicked');
});
controls.addEventListener('click', (e) => {
    if (popupOverlay.classList.contains('active')) return;
    if (!e.target.closest('.button')) {
        toggleControls();
        if (debug) console.log('controls clicked');
    } else {
        resetControlsAutoHide();
    }
});
playbackControls.addEventListener('click', (e) => {
    if (popupOverlay.classList.contains('active')) return;
    if (!e.target.closest('.button')) {
        toggleControls();
        if (debug) console.log('playbackControls clicked');
    } else {
        resetControlsAutoHide();
    }
});
document.body.addEventListener('click', (e) => {
    const resumeDiv = document.getElementById('resumePrompt');
    if (resumeDiv) {
        const clickedInsideResume = resumeDiv.contains(e.target);
        if (!clickedInsideResume) {
            resumeDiv.remove();
            showResumeBlockBtns();
            resetControlsAutoHide();
            if (debug) console.log('resumePrompt closed by body click outside');
            return;
        }
    }
    if (popupOverlay.classList.contains('active')) {
        const clickedInsidePopup = popupOverlay.contains(e.target);
        const clickedTopLeftButtons = e.target.closest('#topLeftButtons');
        if (!clickedInsidePopup && !clickedTopLeftButtons) {
            hidePopup();
            if (debug) console.log('popupOverlay was open and body clicked');
        }
        return;
    }
    if (
        !e.target.closest('.button') &&
        !e.target.closest('#controls') &&
        !e.target.closest('#playbackControls') &&
        e.target !== video
    ) {
        toggleControls();
        if (debug) console.log('document.body clicked (outside controls/buttons)');
    }
});

document.addEventListener('mousemove', () => {
    if (!popupOverlay.classList.contains('active')) resetControlsAutoHide();
}, { passive: true });
document.addEventListener('touchstart', () => {
    if (!popupOverlay.classList.contains('active')) resetControlsAutoHide();
}, { passive: true });
document.addEventListener('keydown', () => {
    if (!popupOverlay.classList.contains('active')) resetControlsAutoHide();
}, { passive: true });

// ==================
// KEYBOARD SHORTCUTS
// ==================
// README mappings (q=-15s, e=+15s, z=-5s, c=+5s, a=-frame, d=+frame, space=play/pause, s=capture, w=set framerate, x=jump to frame)
document.addEventListener('keydown', function (e) {
    if (popupOverlay.classList.contains('active')) return;
    const tag = e.target.tagName.toLowerCase();
    if ((tag === 'input' || tag === 'textarea') && !e.target.classList.contains('allow-hotkey')) return;

    switch (e.key) {
        case ' ':
        case 'Spacebar':
            e.preventDefault();
            if (!video || !video.src) return;
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
            updatePlayPauseIcon();
            resetControlsAutoHide();
            break;
        case 'q':
        case 'Q':
            e.preventDefault();
            skipVideo(-15);
            resetControlsAutoHide();
            break;
        case 'e':
        case 'E':
            e.preventDefault();
            skipVideo(15);
            resetControlsAutoHide();
            break;
        case 'z':
        case 'Z':
            e.preventDefault();
            skipVideo(-5);
            resetControlsAutoHide();
            break;
        case 'c':
        case 'C':
            e.preventDefault();
            skipVideo(5);
            resetControlsAutoHide();
            break;
        case 'a':
        case 'A':
            e.preventDefault();
            skipVideo(-getFrameDuration());
            resetControlsAutoHide();
            break;
        case 'd':
        case 'D':
            e.preventDefault();
            skipVideo(getFrameDuration());
            resetControlsAutoHide();
            break;
        case 's':
        case 'S':
            e.preventDefault();
            if (saveFrameBtn) {
                saveFrameBtn.click();
            }
            resetControlsAutoHide();
            break;
        case 'w':
        case 'W':
            e.preventDefault();
            showPopup('framerate');
            break;
        case 'x':
        case 'X':
            e.preventDefault();
            showPopup('timestamp');
            break;
    }
});

// ==================
// Popup Overlay
// ==================

popupInput.addEventListener('input', () => {
    const mode = popupOverlay.dataset.mode;
    const val = parseFloat(popupInput.value);

    if (mode === 'framerate') {
        if (!isNaN(val) && val > 0) {
            selectedFramerate = val;
            updateFramerateIconUI();
            if (debug) console.log('Framerate changed live:', selectedFramerate);
        }
    }

    if (mode === 'timestamp') {
        if (!isNaN(val) && val >= 0 && video && video.duration) {
            const time = getTimeForFrame(val);
            video.currentTime = Math.min(time, video.duration);
        }
    }
});

popupInput.addEventListener('blur', () => {
    if (popupOverlay.classList.contains('active')) {
        hidePopup();
    }
});

popupInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && popupOverlay.classList.contains('active')) {
        popupInput.blur();
    }
});

function updateFramerateIconUI() {
    if (framerateTextDisplay) {
        framerateTextDisplay.textContent = selectedFramerate;
    }
}

framerateSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPopup('framerate');
    if (debug) console.log('framerateSelectorBtn clicked');
});
timestampSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPopup('timestamp');
    if (debug) console.log('timestampSelectorBtn clicked');
});

function showPopup(mode) {
    if (mode === 'framerate') {
        popupLabel.textContent = 'Select Framerate:';
        popupInput.type = 'number';
        popupInput.step = '1';
        popupInput.min = '1';
        popupInput.value = selectedFramerate;
    } else if (mode === 'timestamp') {
        popupLabel.textContent = 'Jump to Frame:';
        popupInput.type = 'number';
        popupInput.step = '1';
        popupInput.min = '0';
        popupInput.value = getCurrentFrameNumber();
    }

    popupOverlay.dataset.mode = mode;
    popupOverlay.classList.add('active');
    buttons.classList.add('removed');

    popupInput.focus();
    popupInput.select();

    clearControlsAutoHideTimer();
}

function hidePopup() {
    if (!popupOverlay.classList.contains('active')) return;

    const mode = popupOverlay.dataset.mode;
    const value = parseFloat(popupInput.value);

    if (mode === 'framerate') {
        if (!isNaN(value) && value > 0) {
            selectedFramerate = value;
            localStorage.setItem('selectedFramerate', value);
            updateFramerateIconUI();
            if (debug) console.log('Framerate saved:', value);
        }
    }

    if (mode === 'timestamp') {
        if (!isNaN(value) && value >= 0) {
            const time = getTimeForFrame(value);
            video.currentTime = Math.min(time, video.duration || time);
        }
    }

    popupOverlay.classList.remove('active');
    popupOverlay.dataset.mode = '';
    buttons.classList.remove('removed');

    if (!popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
}

popupOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (debug) console.log('popupOverlay clicked');
});

// ==================
// DOMContentLoaded Initialization
// ==================
document.addEventListener('DOMContentLoaded', async () => {
    saveDirHandle = await loadDirHandle();
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*,.mkv';
    fileInput.classList.add('removed');
    document.body.appendChild(fileInput);

    chooseVideoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
        resetControlsAutoHide();
        if (debug) console.log('chooseVideoBtn clicked');
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        loadVideoFile(file, _pendingResumeCurrentTime);
        _pendingResumeCurrentTime = null;
    });

    if (!blurLayer || !video) return;

    const isShareTarget = new URLSearchParams(window.location.search).has('share_target');

    const savedState = JSON.parse(localStorage.getItem('videoState') || '{}');

    if (savedState && savedState.name && !isShareTarget) {
        const resumeDiv = document.createElement('div');
        resumeDiv.className = 'glassy clearer permLight';
        resumeDiv.id = 'resumePrompt';

        const textEl = document.createElement('p');
        textEl.innerHTML = `Resume<br>"${savedState.name}"?`;

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'row';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.alignItems = 'center';
        btnContainer.style.gap = '8px';
        btnContainer.style.width = 'calc(88px * 2 + 8px)';

        const yesButton = document.createElement('button');
        yesButton.id = 'resumeBtn';
        yesButton.textContent = 'Yes';
        Object.assign(yesButton.style, {
            width: '88px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '16px',
            border: 'none',
            borderRadius: '16px',
            background: 'rgba(0,128,255,0.5)',
            cursor: 'pointer',
            transition: 'background 0.25s'
        });

        const noButton = document.createElement('button');
        noButton.id = 'cancelResumeBtn';
        noButton.textContent = 'No';
        Object.assign(noButton.style, {
            width: '88px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '16px',
            border: 'none',
            borderRadius: '16px',
            background: 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            transition: 'background 0.25s'
        });

        btnContainer.appendChild(noButton);
        btnContainer.appendChild(yesButton);

        resumeDiv.appendChild(textEl);
        resumeDiv.appendChild(btnContainer);

        Object.assign(resumeDiv.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px',
            borderRadius: '32px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
        });

        textEl.style.marginleft = '8px';
        textEl.style.marginright = '8px';
        textEl.style.width = 'calc(88px*2 + 8px - 16px)';
        textEl.style.wordBreak = 'break-word';

        document.body.appendChild(resumeDiv);

        hideResumeBlockBtns();

        yesButton.addEventListener('click', () => {
            _pendingResumeCurrentTime = (
                savedState && typeof savedState.currentTime === "number"
                    ? savedState.currentTime
                    : null
            );
            fileInput.classList.remove('removed');
            setTimeout(() => {
                fileInput.click();
                fileInput.classList.add('removed');
            }, 0);
            resumeDiv.remove();
            showResumeBlockBtns();
            resetControlsAutoHide();
            if (debug) console.log('resumePrompt: Yes button clicked');
        });

        noButton.addEventListener('click', () => {
            resumeDiv.remove();
            showResumeBlockBtns();
            resetControlsAutoHide();
            if (debug) console.log('resumePrompt: No button clicked');
        });
    }

    const ctx = blurLayer.getContext('2d');
    function resizeCanvas() {
        blurLayer.width = window.innerWidth;
        blurLayer.height = window.innerHeight;
    }
    window.addEventListener('resize', () => {
        resizeCanvas();
        if (debug) console.log('window resized');
    });
    resizeCanvas();

    let blurLoopActive = false;
    function drawBlurVideo() {
        if (
            video.readyState >= 2 &&
            !video.ended &&
            video.videoWidth &&
            video.videoHeight
        ) {
            const w = blurLayer.width;
            const h = blurLayer.height;

            ctx.clearRect(0, 0, w, h);

            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = w / h;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (canvasRatio > videoRatio) {
                drawWidth = w;
                drawHeight = w / videoRatio;
            } else {
                drawHeight = h;
                drawWidth = h * videoRatio;
            }

            offsetX = (w - drawWidth) / 2;
            offsetY = (h - drawHeight) / 2;

            ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        }
        if (blurLoopActive) {
            requestAnimationFrame(drawBlurVideo);
        }
    }

    function startBlurLoop() {
        if (!blurLoopActive) {
            blurLoopActive = true;
            drawBlurVideo();
        }
    }
    function stopBlurLoop() {
        blurLoopActive = false;
    }

    ['loadedmetadata', 'canplay', 'canplaythrough', 'play'].forEach(evt => {
        video.addEventListener(evt, startBlurLoop);
    });
    video.addEventListener('ended', stopBlurLoop);

    window.updateSeekbar = updateSeekbar;
    window.formatTime = formatTime;

    const savedRate = parseFloat(localStorage.getItem('selectedFramerate'));
    if (!isNaN(savedRate) && savedRate > 0) {
        selectedFramerate = savedRate;
    }
    updateFramerateIconUI();

    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
});

function loadVideoFile(file, resumeCurrentTime) {
    if (debug) console.log("Loading file:", file.name, "Type:", file.type, "Size:", file.size);

    const url = URL.createObjectURL(file);

    video.dataset.name = file.name;
    video.dataset.lastModified = file.lastModified;

    video.src = url;
    video.load();

    if (typeof resumeCurrentTime === "number" && resumeCurrentTime > 0) {
        const handleLoadedMetadata = () => {
            let seekTo = Math.max(0, Math.min(resumeCurrentTime, video.duration || resumeCurrentTime));
            video.currentTime = seekTo;
            updateSeekbar();
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            if (debug) console.log("Restored video position to", seekTo);
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
    } else {
        video.currentTime = 0;
    }

    localStorage.setItem('videoState', JSON.stringify({
        currentTime: typeof resumeCurrentTime === "number" && resumeCurrentTime > 0 ? resumeCurrentTime : 0,
        name: file.name,
        lastModified: file.lastModified
    }));

    if (typeof updatePlayPauseIcon === "function") {
        updatePlayPauseIcon();
    }

    if (typeof updatePopupFileUI === "function") {
        updatePopupFileUI();
    }

    if (typeof updateJumpToFrameInput === "function") {
        updateJumpToFrameInput();
    }
}