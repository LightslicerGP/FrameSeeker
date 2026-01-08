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

// ==================
// State Variables
// ==================
let fileInput = null;
let isSeeking = false;
let selectedFramerate = 30; // Default value
let popupJustOpened = false;

// For directory picker support
let saveDirHandle = null;

// --- AUTO-HIDE CONTROLS state ---
let controlsAutoHideTimer = null;
const AUTOHIDE_DELAY = 3000;
function isControlsVisible() {
    return (
        controls && !controls.classList.contains('hidden') ||
        playbackControls && !playbackControls.classList.contains('hidden')
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
        // Only run the hideUI if the popup is not open
        if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
            if (controls && !controls.classList.contains('hidden')) controls.classList.add('hidden');
            if (playbackControls && !playbackControls.classList.contains('hidden')) playbackControls.classList.add('hidden');
            clearControlsAutoHideTimer();
        }
    }, AUTOHIDE_DELAY);
}
function resetControlsAutoHide() {
    // Only run hide logic if popup is not open
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    } else {
        clearControlsAutoHideTimer();
    }
}

// Helper to get current frame duration safely from framerate
function getFrameDuration() {
    return selectedFramerate && selectedFramerate > 0 ? 1 / selectedFramerate : 1 / 30;
}

// ==================
// Utility Functions
// ==================
function hideResumeBlockBtns() {
    if (playpauseBtn) playpauseBtn.style.display = 'none';
    if (back15Btn) back15Btn.style.display = 'none';
    if (forward15Btn) forward15Btn.style.display = 'none';
}
function showResumeBlockBtns() {
    if (playpauseBtn) playpauseBtn.style.display = '';
    if (back15Btn) back15Btn.style.display = '';
    if (forward15Btn) forward15Btn.style.display = '';
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
    seekbarSlider.value = (currentTime / duration) * 100;
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
    controls.classList.toggle('hidden');
    playbackControls.classList.toggle('hidden');
    // Only run hide UI if popup is not open
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    } else {
        clearControlsAutoHideTimer();
    }
    console.log('toggleControls called');
}

// --- NEW: Utility for 'Jump to Frame'
function getCurrentFrameNumber() {
    if (!video) return 0;
    return Math.floor(video.currentTime * selectedFramerate);
}
function getTimeForFrame(frameNumber) {
    return Math.max(0, frameNumber / selectedFramerate);
}

// =======
// SAVE FRAME/CAPTURE BUTTON LOGIC (MODIFIED PADDING)
// =======

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

// ---- Directory picker helpers for saving image if supported ----

async function requestSaveDirectory() {
    if (!window.showDirectoryPicker) return null;
    try {
        const handle = await window.showDirectoryPicker({ startIn: "pictures" });
        const perm = await handle.requestPermission({ mode: "readwrite" });
        if (perm === "granted") {
            saveDirHandle = handle;
            return handle;
        }
    } catch (e) {
        // user may cancel
    }
    return null;
}

async function ensureSaveDirectory() {
    if (saveDirHandle) {
        try {
            const perm = await saveDirHandle.queryPermission({ mode: "readwrite" });
            if (perm === "granted") return saveDirHandle;
        } catch (e) { }
    }
    return await requestSaveDirectory();
}

async function saveBlobToDir(filename, blob) {
    const dir = await ensureSaveDirectory();
    if (!dir) return false;
    try {
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
    } catch (e) {
        // Permission denied or user cancelled
    }
    return false;
}

if (saveFrameBtn) {
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
            // Advanced: offer directory picker
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png', 1.0);
            });
            if (!blob) return;
            const saved = await saveBlobToDir(filename, blob);
            if (!saved) {
                // fallback to download if user cancels or permission fails
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
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
            // fallback, just download
            canvas.toBlob(function (blob) {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
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
}

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

// ==================
// Main Event Listeners
// ==================

// ---- Seekbar Listeners
if (seekbarSlider) {
    seekbarSlider.addEventListener('input', () => {
        isSeeking = true;
        if (video && video.duration) {
            const seekTime = (seekbarSlider.value / 100) * video.duration;
            video.currentTime = seekTime;
            const useHours = video.duration >= 3600;
            currentTimeDisplay.textContent = formatTime(seekTime, useHours);
        }
        // Only run hide logic if popup is not open
        resetControlsAutoHide();
        console.log('seekbarSlider input');
    });
    seekbarSlider.addEventListener('mousedown', () => {
        isSeeking = true;
        resetControlsAutoHide();
        console.log('seekbarSlider mousedown');
    });
    seekbarSlider.addEventListener('mouseup', () => {
        isSeeking = false;
        resetControlsAutoHide();
        console.log('seekbarSlider mouseup');
    });
    seekbarSlider.addEventListener('touchstart', () => {
        isSeeking = true;
        resetControlsAutoHide();
        console.log('seekbarSlider touchstart');
    });
    seekbarSlider.addEventListener('touchend', () => {
        isSeeking = false;
        resetControlsAutoHide();
        console.log('seekbarSlider touchend');
    });
    seekbarSlider.addEventListener('click', (e) => {
        e.stopPropagation();
        resetControlsAutoHide();
        console.log('seekbarSlider clicked');
    });
}

// ---- Video Event Listeners for Seekbar/State
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
}

// ---- Play/Pause and Skip Controls
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
    console.log('playpauseBtn clicked');
});
video.addEventListener('play', () => {
    updatePlayPauseIcon();
    // Only run hide UI if popup is not open
    if (!popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
    console.log('video play event (icon update)');
});
video.addEventListener('pause', () => {
    updatePlayPauseIcon();
    // Only run hide UI if popup is not open
    if (!popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
    console.log('video pause event (icon update)');
});
back15Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(-15);
    resetControlsAutoHide();
    console.log('back15Btn clicked');
});
forward15Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(15);
    resetControlsAutoHide();
    console.log('forward15Btn clicked');
});
back5Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(-5);
    resetControlsAutoHide();
    console.log('back5Btn clicked');
});
forward5Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(5);
    resetControlsAutoHide();
    console.log('forward5Btn clicked');
});
prevFrameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(-getFrameDuration());
    resetControlsAutoHide();
    console.log('prevFrameBtn clicked');
});
nextFrameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipVideo(getFrameDuration());
    resetControlsAutoHide();
    console.log('nextFrameBtn clicked');
});
document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        resetControlsAutoHide();
        console.log('A .button element was clicked');
    });
});

// ---- Controls Visibility (Overlay toggle)
video.addEventListener('click', () => {
    toggleControls();
    // Only run hide UI if popup is not open
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
    console.log('video element clicked');
});
controls.addEventListener('click', (e) => {
    if (popupOverlay.classList.contains('active')) return;
    if (!e.target.closest('.button')) {
        toggleControls();
        console.log('controls clicked');
    } else {
        resetControlsAutoHide();
    }
});
playbackControls.addEventListener('click', (e) => {
    if (popupOverlay.classList.contains('active')) return;
    if (!e.target.closest('.button')) {
        toggleControls();
        console.log('playbackControls clicked');
    } else {
        resetControlsAutoHide();
    }
});
document.body.addEventListener('click', (e) => {
    // Handle resumePrompt closing
    const resumeDiv = document.getElementById('resumePrompt');
    if (resumeDiv) {
        const clickedInsideResume = resumeDiv.contains(e.target);
        if (!clickedInsideResume) {
            resumeDiv.remove();
            showResumeBlockBtns();
            resetControlsAutoHide();
            console.log('resumePrompt closed by body click outside');
            // Don't run any further logic if the resumePrompt was open and now closed
            return;
        }
    }
    if (popupOverlay.classList.contains('active')) {
        const clickedInsidePopup = popupOverlay.contains(e.target);
        const clickedTopLeftButtons = e.target.closest('#topLeftButtons');
        if (!clickedInsidePopup && !clickedTopLeftButtons) {
            hidePopup();
            console.log('popupOverlay was open and body clicked');
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
        console.log('document.body clicked (outside controls/buttons)');
    }
});

// Detect user *activity* (for touch/click/move) to restart timer
// Only reset auto-hide if popup is not open
document.addEventListener('mousemove', () => {
    if (!popupOverlay.classList.contains('active')) resetControlsAutoHide();
}, { passive: true });
document.addEventListener('touchstart', () => {
    if (!popupOverlay.classList.contains('active')) resetControlsAutoHide();
}, { passive: true });
document.addEventListener('keydown', () => {
    if (!popupOverlay.classList.contains('active')) resetControlsAutoHide();
}, { passive: true });

// ---- Popup Overlay

// --- Update framerate on framerate box input
popupInput.addEventListener('input', () => {
    const mode = popupOverlay.dataset.mode;
    const val = parseFloat(popupInput.value);

    if (mode === 'framerate') {
        if (!isNaN(val) && val > 0) {
            selectedFramerate = val;
            console.log('Framerate changed live:', selectedFramerate);
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

framerateSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPopup('framerate');
    console.log('framerateSelectorBtn clicked');
});
timestampSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPopup('timestamp');
    console.log('timestampSelectorBtn clicked');
});

function showPopup(mode) {
    popupOverlay.dataset.mode = mode;
    popupOverlay.classList.add('active');
    buttons.style.display = 'none';

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
            console.log('Framerate saved:', value);
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
    buttons.style.display = 'flex';

    // Only start auto-hide if popup is not now open
    if (!popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
}

popupOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('popupOverlay clicked');
});

// ==================
// DOMContentLoaded Initialization
// ==================
document.addEventListener('DOMContentLoaded', () => {
    // ---- File Input and Choose Handler
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*,.mkv';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    chooseVideoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
        resetControlsAutoHide();
        console.log('chooseVideoBtn clicked');
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        loadVideoFile(file);
    });

    // ---- Resume Prompt after load
    if (!blurLayer || !video) return;

    const savedState = JSON.parse(localStorage.getItem('videoState') || '{}');
    if (savedState && savedState.name) {
        const resumeDiv = document.createElement('div');
        resumeDiv.className = 'glassy';
        resumeDiv.id = 'resumePrompt';

        const textEl = document.createElement('p');
        textEl.textContent = `Resume "${savedState.name}"?`;
        textEl.style.margin = '0';
        textEl.style.padding = '0';
        textEl.style.fontSize = '16px';

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'row';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.alignItems = 'center';
        btnContainer.style.gap = '16px';
        btnContainer.style.width = 'calc(96px * 2 + 16px)';

        const yesButton = document.createElement('button');
        yesButton.id = 'resumeBtn';
        yesButton.textContent = 'Yes';
        Object.assign(yesButton.style, {
            width: '96px',
            height: '48px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            border: 'none',
            borderRadius: '16px',
            background: 'rgba(0,128,255,0.5)',
            cursor: 'pointer',
            transition: 'background 0.15s'
        });

        const noButton = document.createElement('button');
        noButton.id = 'cancelResumeBtn';
        noButton.textContent = 'No';
        Object.assign(noButton.style, {
            width: '96px',
            height: '48px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            border: 'none',
            borderRadius: '16px',
            background: 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            transition: 'background 0.15s'
        });

        btnContainer.appendChild(yesButton);
        btnContainer.appendChild(noButton);

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
            boxSizing: 'border-box',
            gap: '8px'
        });

        textEl.style.marginleft = '8px';
        textEl.style.marginright = '8px';
        textEl.style.maxWidth = 'calc(96px*2 + 16px - 16px)';
        textEl.style.wordBreak = 'break-word';

        document.body.appendChild(resumeDiv);

        hideResumeBlockBtns();

        yesButton.addEventListener('click', () => {
            fileInput.style.display = '';
            setTimeout(() => {
                fileInput.click();
                fileInput.style.display = 'none';
            }, 0);
            resumeDiv.remove();
            showResumeBlockBtns();
            resetControlsAutoHide();
            console.log('resumePrompt: Yes button clicked');
        });

        noButton.addEventListener('click', () => {
            resumeDiv.remove();
            showResumeBlockBtns();
            resetControlsAutoHide();
            console.log('resumePrompt: No button clicked');
        });
    }

    // ---- Blur Layer/Canvas Setup
    const ctx = blurLayer.getContext('2d');
    function resizeCanvas() {
        blurLayer.width = window.innerWidth;
        blurLayer.height = window.innerHeight;
    }
    window.addEventListener('resize', () => {
        resizeCanvas();
        console.log('window resized');
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

    // Only start auto-hide if popup is not open
    if (isControlsVisible() && !popupOverlay.classList.contains('active')) {
        scheduleControlsAutoHide();
    }
});


function loadVideoFile(file) {
    const url = URL.createObjectURL(file);

    video.dataset.name = file.name;
    video.dataset.lastModified = file.lastModified;

    video.src = url;
    video.currentTime = 0;

    localStorage.setItem('videoState', JSON.stringify({
        currentTime: 0,
        name: file.name,
        lastModified: file.lastModified
    }));

    updatePlayPauseIcon();
    updateChooseVideoBtnVisibility();
    updatePopupFileUI();
    updateJumpToFrameInput();
}
