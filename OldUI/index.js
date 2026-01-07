
let baseFilename = "Video";
let fps;

let isControlsVisible = true;

// Popup Overlay
const popupOverlay = document.getElementById("popupOverlay");
const closePopupBtn = document.getElementById("closePopupBtn");
const framerateSelect = document.getElementById("framerateSelect");
const popupFileLabel = document.getElementById("popupFileLabel");
const popupFileText = document.getElementById("popupFileText");
const popupFileName = document.getElementById("popupFileName");
const jumpToFrameInput = document.getElementById("jumpToFrameInput");
const jumpToFrameBtn = document.getElementById("jumpToFrameBtn");

if (jumpToFrameInput) {
    jumpToFrameInput.addEventListener("focus", function (e) {
        setTimeout(() => {
            if (document.activeElement === jumpToFrameInput) {
                jumpToFrameInput.select();
            }
        }, 0);
    });
    jumpToFrameInput.addEventListener("mouseup", function (e) {
        e.preventDefault();
    });
}

popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
        popupOverlay.style.display = "none";
    }
});

closePopupBtn.addEventListener("click", () => {
    popupOverlay.style.display = "none";
    if (framerateSelect.value && !isNaN(framerateSelect.value)) {
        fps = Number(framerateSelect.value);
        setCookie("currentfps", fps, 365);
        console.log(`FPS: ${fps}`);
    }
});

popupFileLabel.addEventListener("click", (e) => {
    if (!(video.src && video.style.display !== "none")) {
        fileInput.value = "";
    }
});

function getCurrentFrameNumber() {
    if (!fps || isNaN(fps) || !video) return 0;
    return Math.round((video.currentTime || 0) * fps);
}

function setFramerateInput() {
    const frInput = document.getElementById("framerateSelect");
    if (frInput) {
        frInput.value = fps;
    }
    if (jumpToFrameInput) {
        jumpToFrameInput.value = getCurrentFrameNumber();
    }
}

function jumpToFrame(frameNum) {
    if (!fps || isNaN(fps) || !video || isNaN(frameNum)) return;
    frameNum = Math.max(0, Math.floor(frameNum));
    const duration = video.duration || 0;
    const maxFrame = Math.floor(duration * fps);
    if (frameNum > maxFrame) frameNum = maxFrame;
    video.currentTime = frameNum / fps;
}

if (jumpToFrameBtn && jumpToFrameInput) {
    jumpToFrameBtn.addEventListener("click", () => {
        const val = Number(jumpToFrameInput.value);
        if (!isNaN(val) && val >= 0) {
            jumpToFrame(val);
        }
    });
    jumpToFrameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const val = Number(jumpToFrameInput.value);
            if (!isNaN(val) && val >= 0) {
                jumpToFrame(val);
            }
        }
    });
}

function updateJumpToFrameInput() {
    if (jumpToFrameInput) {
        jumpToFrameInput.value = getCurrentFrameNumber();
    }
}

// Seekbar
const seekbarContainer = document.getElementById("seekbarContainer");
const seekbar = document.getElementById("seekbar");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const durationLabel = document.getElementById("durationLabel");

let isSeeking = false;

seekbar.addEventListener("input", (e) => {
    isSeeking = true;
    currentTimeLabel.textContent = formatTime(Number(seekbar.value));
});

seekbar.addEventListener("change", (e) => {
    video.currentTime = Number(seekbar.value);
    isSeeking = false;
});

seekbar.addEventListener("mousedown", () => {
    showControls();
});

// Control Buttons
const controls = document.getElementById("controls");
const preVideoMenu = document.getElementById("preVideo");
const chooseVideoBtn = document.getElementById("chooseVideoBtn");
const otherBtn = document.getElementById("other");
const back10Btn = document.getElementById("back10");
const prevFrameBtn = document.getElementById("prevFrame");
const playPauseBtn = document.getElementById("playPause");
const pauseIcon = document.getElementById("pauseIcon");
const playIcon = document.getElementById("playIcon");
const nextFrameBtn = document.getElementById("nextFrame");
const forward10Btn = document.getElementById("forward10");
const captureBtn = document.getElementById("captureFrame");

if (chooseVideoBtn) {
    chooseVideoBtn.addEventListener("click", () => {
        fileInput.value = "";
        fileInput.click();
    });
}

otherBtn.addEventListener("click", () => {
    setFramerateInput();
    updateJumpToFrameInput();
    popupOverlay.style.display = "flex";
    updatePopupFileUI();
});

back10Btn.onclick = () => {
    video.currentTime -= 10;
};

prevFrameBtn.onclick = () => {
    video.pause();
    video.currentTime -= 1 / fps;
    updateJumpToFrameInput();
};

playPauseBtn.addEventListener("click", () => {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
});

function updatePlayPauseIcon() {
    if (video.paused) {
        playIcon.classList.add("active");
        pauseIcon.classList.remove("active");
    } else {
        pauseIcon.classList.add("active");
        playIcon.classList.remove("active");
    }
}

nextFrameBtn.onclick = () => {
    video.pause();
    video.currentTime += 1 / fps;
    updateJumpToFrameInput();
};

forward10Btn.onclick = () => {
    video.currentTime += 10;
};

let saveDirHandle = null;

async function requestSaveDirectory() {
    if (!window.showDirectoryPicker) return null;
    try {
        const handle = await window.showDirectoryPicker({ startIn: "pictures" });
        const perm = await handle.requestPermission({ mode: "readwrite" });
        if (perm === "granted") {
            saveDirHandle = handle;
            return handle;
        }
    } catch (_) { }
    return null;
}

async function ensureSaveDirectory() {
    if (saveDirHandle) {
        const perm = await saveDirHandle.queryPermission({ mode: "readwrite" });
        if (perm === "granted") return saveDirHandle;
    }
    return await requestSaveDirectory();
}

async function saveBlobToDir(filename, blob) {
    const dir = await ensureSaveDirectory();
    if (!dir) return false;
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
}

captureBtn.addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frameNumber = Math.round(video.currentTime * fps);
    const filename = `${baseFilename}-Frame${frameNumber.toString().padStart(padLength, "0")}-FrameSeeker.png`;

    if (window.showDirectoryPicker) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        const ok = await saveBlobToDir(filename, blob);
        if (!ok) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        }
    } else {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = filename;
        link.click();
    }
});

function showControls() {
    if (controls && seekbarContainer) {
        controls.classList.remove("hidden");
        seekbarContainer.classList.remove("hidden");
        isControlsVisible = true;
    }
}

function hideControls() {
    if (controls && seekbarContainer) {
        controls.classList.add("hidden");
        seekbarContainer.classList.add("hidden");
        isControlsVisible = false;
    }
}

document.addEventListener("click", (e) => {
    const isClickOnControls = controls.contains(e.target);
    const isClickOnSeekbar = seekbarContainer.contains(e.target);
    const isClickOnPopup = popupOverlay.contains(e.target);

    if (!isClickOnControls && !isClickOnSeekbar && !isClickOnPopup) {
        if (isControlsVisible) {
            hideControls();
        } else {
            showControls();
        }
    }
});

window.addEventListener("focus", () => {
    showControls();
});

// Other Elements
const video = document.getElementById("video");
const fileInput = document.getElementById("fileInput");

if (video.src === "" || video.style.display === "none") {
    seekbarContainer.style.display = "none";
}

video.addEventListener("play", () => {
    updatePlayPauseIcon();
});

video.addEventListener("pause", () => {
    updatePlayPauseIcon();
    showControls();
});
updatePlayPauseIcon();

video.addEventListener("timeupdate", () => {
    if (!isNaN(video.duration)) {
        seekbar.value = video.currentTime;
        currentTimeLabel.textContent = formatTime(video.currentTime);
        if (popupOverlay.style.display === "flex") {
            updateJumpToFrameInput();
        }
    }
});

// video.addEventListener("click", () => {});

let padLength = 3;
video.addEventListener("loadedmetadata", () => {
    const duration = video.duration;
    const totalFrames = video.getVideoPlaybackQuality().totalVideoFrames;
    console.log(video.getVideoPlaybackQuality());

    console.log(`Duration: ${duration}`);
    console.log(`Total Frames: ${totalFrames}`);

    if (duration > 0 && totalFrames > 0) {
        const averageFps = totalFrames / duration;
        fps = averageFps;
        setCookie("currentfps", fps, 365);
    } else {
        if (!getCookie("currentfps")) {
            fps = 30;
            setCookie("currentfps", fps, 365);
        }
    }
    console.log(`FPS: ${fps}`);

    seekbar.max = duration;
    seekbar.value = 0;
    durationLabel.textContent = formatTime(duration);
    currentTimeLabel.textContent = formatTime(0);
    seekbarContainer.style.display = "flex";

    if (fps && !isNaN(fps)) {
        const maxFrame = Math.floor(duration * fps);
        padLength = maxFrame.toString().length;
        console.log(`Padding length set to ${padLength}`);
    }

    updateChooseVideoBtnVisibility();
    updatePopupFileUI();
    updateJumpToFrameInput();
});

video.addEventListener("emptied", () => {
    updateChooseVideoBtnVisibility();
    updatePopupFileUI();
    updateJumpToFrameInput();
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        loadVideo(file, file.name);
    } else {
        loadVideo(null, "");
    }
    updateJumpToFrameInput();
});

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    } else {
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
}

function updatePopupFileUI() {
    if (video.src && video.style.display !== "none") {
        let name = baseFilename;
        if (!name || name === "Video") {
            name = "Video loaded";
        }
        popupFileText.textContent = "Video Loaded:";
        popupFileName.textContent = name;
    } else {
        popupFileText.textContent = "Choose Video";
        popupFileName.textContent = "";
    }
}

function updateChooseVideoBtnVisibility() {
    if (video.src && video.style.display !== "none") {
        preVideoMenu.remove();
    } else {
        chooseVideoBtn.style.display = "flex";
    }
}

function loadVideo(file, filename) {
    if (file) {
        baseFilename = filename.replace(/\.[^/.]+$/, "");
        video.src = URL.createObjectURL(file);
        video.style.display = "block";
        seekbarContainer.style.display = "flex";
    } else {
        video.src = "";
        video.style.display = "none";
        seekbarContainer.style.display = "none";
    }
    updateChooseVideoBtnVisibility();
    updatePopupFileUI();
    updateJumpToFrameInput();
}

// Cookies

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function loadFpsFromCookie() {
    const cookieFps = getCookie("currentfps");
    if (cookieFps && !isNaN(cookieFps)) {
        fps = Number(cookieFps);
    } else {
        fps = 30;
    }
}
loadFpsFromCookie();