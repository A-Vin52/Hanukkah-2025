// ===== Hanukkah Menorah - Drag-and-Drop Shamash =====

// State object to track which candles are lit
let candleState = {
    shamash: false,
    candle1: false,
    candle2: false,
    candle3: false,
    candle4: false,
    candle5: false,
    candle6: false,
    candle7: false,
    candle8: false
};

// Current test day (null for auto)
let currentTestDay = null;
// Hanukkah dates data
let hanukkahDates = null;
// UI visibility state
let uiVisible = false;
// Video trigger state - only show video when day is complete
let videoTriggeredForDay = false;
// Developer mode state
let developerMode = false;

// Load Hanukkah dates (embedded for reliability)
function loadHanukkahDates() {
    hanukkahDates = {
        year: 2025,
        dates: {
            day1: "2025-12-14",
            day2: "2025-12-15",
            day3: "2025-12-16",
            day4: "2025-12-17",
            day5: "2025-12-18",
            day6: "2025-12-19",
            day7: "2025-12-20",
            day8: "2025-12-21"
        }
    };
}
// ===== Calculate Current Hanukkah Day =====
function getCurrentHanukkahDay() {
    if (!hanukkahDates) return null;

    // Use test day if set, otherwise use current date
    if (currentTestDay) {
        return currentTestDay;
    }

    const today = new Date();

    // Find which day of Hanukkah it is
    for (let day = 1; day <= 8; day++) {
        const dayDate = new Date(hanukkahDates.dates[`day${day}`]);
        const nextDay = day < 8 ? new Date(hanukkahDates.dates[`day${day + 1}`]) : new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);

        if (today >= dayDate && today < nextDay) {
            return day;
        }
    }

    return null; // Not Hanukkah
}

// ===== Update Background Based on Hanukkah Day =====
function updateBackgroundImage() {
    const currentDay = getCurrentHanukkahDay();
    const videoElement = document.getElementById('backgroundVideo');

    // Default background for non-Hanukkah periods
    let bgImage = 'Images/Hanukkah 2022 AV.jpg';
    let videoSrc = null;

    // Use day-specific background during Hanukkah
    if (currentDay && currentDay >= 1 && currentDay <= 8) {
        // Only show video if triggered for this day
        if (videoTriggeredForDay) {
            // Check for video first
            const videoPath = `Video/Day${currentDay}.mp4`;
            // Check if video exists (this will be true if file loads successfully)
            // For now, we'll assume videos exist for days that have them
            // The video element will handle missing files gracefully
            videoSrc = videoPath;
        }

        // Keep image as fallback in case video fails to load or not triggered
        bgImage = `Images/day${currentDay}.jpg`;
    }

    // Apply background
    if (videoSrc && videoTriggeredForDay) {
        // Set up video error handler to fall back to image
        videoElement.onerror = function() {
            // Video failed to load, fall back to image
            videoElement.style.display = 'none';
            videoElement.src = '';
            document.body.classList.remove('video-background');
            document.body.style.setProperty('--bg-image', `url('${bgImage}')`);

            // Stop audio
            const audioElement = document.getElementById('backgroundAudio');
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }

            // Video control button removed
        };

        // Show video background
        videoElement.src = videoSrc;
        videoElement.style.display = 'block';
        document.body.classList.add('video-background');

        // Set up and play background audio
        const audioElement = document.getElementById('backgroundAudio');
        if (audioElement) {
            audioElement.src = 'Music/Hanukkah song by English.mp3';
            audioElement.play().catch(error => {
                console.log('Audio play failed:', error);
            });
        }

        // Show video control button
        const controlBtn = document.getElementById('videoControl');
        const slowMotionBtn = document.getElementById('slowMotionBtn');
        const resetBtn = document.getElementById('resetBtn');
        if (controlBtn) {
            controlBtn.style.display = 'flex';
            controlBtn.textContent = '⏸️'; // Start with pause icon since video auto-plays
            controlBtn.title = 'Pause Video';
        }
        if (slowMotionBtn) {
            slowMotionBtn.style.display = 'flex';
        }
        // Hide reset button when video is playing to prevent accidental clicks
        if (resetBtn) {
            resetBtn.style.display = 'none';
        }

        // Set object-fit based on video orientation
        if (currentDay === 1) {
            // Day 1: vertical video - fit height, center horizontally
            videoElement.style.objectFit = 'contain';
            videoElement.style.width = 'auto';
            videoElement.style.height = '100vh';
            videoElement.style.left = '50%';
            videoElement.style.transform = 'translateX(-50%)';
        } else {
            // Default: landscape video - cover full screen
            videoElement.style.objectFit = 'cover';
            videoElement.style.width = '100vw';
            videoElement.style.height = '100vh';
            videoElement.style.left = '0';
            videoElement.style.transform = 'none';
        }
    } else {
        // Show image background
        videoElement.style.display = 'none';
        videoElement.src = '';
        document.body.classList.remove('video-background');
        document.body.style.setProperty('--bg-image', `url('${bgImage}')`);

        // Hide video control button
        const controlBtn = document.getElementById('videoControl');
        const slowMotionBtn = document.getElementById('slowMotionBtn');
        const resetBtn = document.getElementById('resetBtn');
        if (controlBtn) {
            controlBtn.style.display = 'none';
        }
        if (slowMotionBtn) {
            slowMotionBtn.style.display = 'none';
        }
        // Show reset button when video is not playing
        if (resetBtn) {
            resetBtn.style.display = 'block';
        }
    }
}

// Drag state
let isDragging = false;
let shamashElement = null;
let dragStartPos = { x: 0, y: 0 }; // NEW: Track start of drag
let dragOffset = { x: 0, y: 0 };
let isTilted = false;
let shamashDefaultPosition = null;
let tiltTimeout = null; // Timer for auto-tilting
let shamashWidth = 0;
let shamashHeight = 0;

// Proximity threshold in pixels
const PROXIMITY_THRESHOLD = 25;

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', async () => {
    shamashElement = document.querySelector('.shamash');

    // Save shamash's default position
    if (shamashElement) {
        const rect = shamashElement.getBoundingClientRect();
        shamashDefaultPosition = {
            left: rect.left,
            top: rect.top
        };
    }

    loadHanukkahDates();
    loadState();
    attachEventListeners();
    updateDayCounter();  // This will also update the background
    updateCandleVisibility();
});

// ===== Load State from localStorage =====
function loadState() {
    const savedState = localStorage.getItem('hanukkahMenorah');
    const currentDay = getCurrentHanukkahDay();

    // Only load saved state if it's Hanukkah or test day is selected
    if (savedState && currentDay) {
        try {
            candleState = JSON.parse(savedState);

            // Check current day and extinguish candles not available (right to left lighting)
            for (let i = 1; i <= 8; i++) {
                const candleId = `candle${i}`;
                const isAvailable = i >= (9 - currentDay);
                if (candleState[candleId] && !isAvailable) {
                    candleState[candleId] = false;
                }
            }

            // Apply saved state to UI
            Object.keys(candleState).forEach(candleId => {
                if (candleState[candleId]) {
                    const candleElement = document.querySelector(`[data-candle="${candleId}"]`);
                    if (candleElement) {
                        candleElement.classList.add('lit');
                    }
                }
            });
        } catch (error) {
            console.error('Error loading state:', error);
            resetState();
        }
    } else {
        // Not Hanukkah and no test day - start with all unlit
        resetState();
    }
}

// ===== Handle Test Day Change =====
function handleTestDayChange(event) {
    currentTestDay = event.target.value ? parseInt(event.target.value) : null;
    videoTriggeredForDay = false; // Reset video trigger when day changes
    updateDayCounter();
    updateCandleVisibility();

    // Background updates automatically via updateDayCounter()
}

// ===== Update Candle Visibility =====
function updateCandleVisibility() {
    const currentDay = getCurrentHanukkahDay();

    // If not Hanukkah and no test day selected, show all candles for testing
    const effectiveDay = currentDay || 8;

    // Show candles for current day (right to left), hide candle bodies but keep holders
    for (let i = 1; i <= 8; i++) {
        const candleElement = document.querySelector(`[data-candle="candle${i}"]`);
        if (candleElement) {
            const wax = candleElement.querySelector('.wax');
            const wick = candleElement.querySelector('.wick');
            const flame = candleElement.querySelector('.flame');

            // Candles are lit from right to left: day 1 = candle8, day 2 = candle7+8, etc.
            const isAvailable = i >= (9 - effectiveDay);
            if (isAvailable) {
                if (wax) wax.style.opacity = '1';
                if (wick) wick.style.opacity = '1';
                candleElement.style.pointerEvents = 'auto';
            } else {
                if (wax) wax.style.opacity = '0';
                if (wick) wick.style.opacity = '0';
                candleElement.style.pointerEvents = 'none';
                // Extinguish candles that are no longer available
                if (candleState[`candle${i}`]) {
                    candleElement.classList.remove('lit');
                    candleState[`candle${i}`] = false;
                }
            }
        }
    }
    saveState();
}

// ===== Save State to localStorage =====
function saveState() {
    try {
        localStorage.setItem('hanukkahMenorah', JSON.stringify(candleState));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

// ===== Attach Event Listeners =====
function attachEventListeners() {
    // Only Shamash can be clicked to light
    if (shamashElement) {
        shamashElement.addEventListener('click', handleShamashClick);
        shamashElement.addEventListener('mousedown', handleShamashMouseDown);
    }

    // Global mouse events for dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add reset button handler
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }

    // Video control button
    const videoControlBtn = document.getElementById('videoControl');
    if (videoControlBtn) {
        videoControlBtn.addEventListener('click', toggleVideoPlayback);
    }

    // Slow motion button
    const slowMotionBtn = document.getElementById('slowMotionBtn');
    if (slowMotionBtn) {
        slowMotionBtn.addEventListener('click', toggleSlowMotion);
    }

    // Test day selector - REMOVE FOR PRODUCTION
    const testDaySelect = document.getElementById('testDaySelect');
    if (testDaySelect) {
        testDaySelect.addEventListener('change', handleTestDayChange);
    }

    // Developer mode toggle
    document.addEventListener('keydown', handleKeyDown);
}

// ===== Toggle Video Playback =====
function toggleVideoPlayback() {
    const videoElement = document.getElementById('backgroundVideo');
    const audioElement = document.getElementById('backgroundAudio');
    const controlBtn = document.getElementById('videoControl');

    if (videoElement && controlBtn) {
        if (videoElement.paused) {
            videoElement.play();
            if (audioElement) audioElement.play();
            controlBtn.textContent = '⏸️';
            controlBtn.title = 'Pause Video';
        } else {
            videoElement.pause();
            if (audioElement) audioElement.pause();
            controlBtn.textContent = '▶️';
            controlBtn.title = 'Play Video';
        }
    }
}

// ===== Toggle Slow Motion =====
function toggleSlowMotion() {
    const videoElement = document.getElementById('backgroundVideo');
    const slowMotionBtn = document.getElementById('slowMotionBtn');

    if (videoElement && slowMotionBtn) {
        if (videoElement.playbackRate === 1.0) {
            videoElement.playbackRate = 0.5;
            slowMotionBtn.classList.add('active');
        } else {
            videoElement.playbackRate = 1.0;
            slowMotionBtn.classList.remove('active');
        }
    }
}

// ===== Handle Key Down (Developer Mode Toggle) =====
function handleKeyDown(event) {
    // Toggle developer mode with Ctrl + Alt + D
    if (event.ctrlKey && event.altKey && event.code === 'KeyD') {
        event.preventDefault();
        developerMode = !developerMode;

        const testControls = document.querySelector('.test-controls');
        const infoPanel = document.querySelector('.info-panel');

        if (testControls) {
            testControls.style.display = developerMode ? 'block' : 'none';
        }

        if (infoPanel) {
            // If turning developer mode on, force the info panel to be visible.
            // If turning it off, remove the inline style so the CSS class can take over.
            infoPanel.style.display = developerMode ? 'block' : '';
        }

        console.log('Developer mode:', developerMode ? 'ON' : 'OFF');
    }
}

// ===== Handle Shamash Click (to light it) =====
function handleShamashClick(event) {
    // Only light if not already lit and not dragging
    if (!candleState.shamash && !isDragging) {
        shamashElement.classList.add('lit');
        candleState.shamash = true;
        saveState();
        updateDayCounter();

        // NEW: Start a timer to tilt the shamash
        clearTimeout(tiltTimeout); // Clear any existing timer
        tiltTimeout = setTimeout(() => {
            if (candleState.shamash && !isDragging) { // Only tilt if it's still lit and not being dragged
                isTilted = true;
                shamashElement.style.transform = 'rotate(-45deg)';
            }
        }, 3000); // 3 seconds
    }
}

// ===== Handle Shamash Mouse Down (start drag) =====
function handleShamashMouseDown(event) {
    // Only allow dragging if Shamash is lit
    if (!candleState.shamash) {
        return;
    }

    event.preventDefault();

    // Temporarily remove transform to get accurate position of unrotated element
    const currentTransform = shamashElement.style.transform;
    shamashElement.style.transform = '';

    // Get the position of the unrotated element
    const rect = shamashElement.getBoundingClientRect();

    // Restore transform
    shamashElement.style.transform = currentTransform;

    // Store dimensions
    shamashWidth = rect.width;
    shamashHeight = rect.height;

    // Mark as dragging
    isDragging = true;

    // Calculate center position
    const centerX = rect.left + shamashWidth / 2;
    const centerY = rect.top + shamashHeight / 2;

    // Set fixed positioning
    shamashElement.style.position = 'fixed';
    shamashElement.style.left = (centerX - shamashWidth / 2) + 'px';
    shamashElement.style.top = (centerY - shamashHeight / 2) + 'px';
    shamashElement.style.right = 'auto';
    shamashElement.style.bottom = 'auto';
    shamashElement.style.zIndex = '1000';
    shamashElement.style.cursor = 'grabbing';
    shamashElement.style.transition = 'none';
    shamashElement.style.userSelect = 'none';
    shamashElement.style.webkitUserSelect = 'none';
    shamashElement.style.transformOrigin = 'center center';

    shamashElement.classList.add('dragging');

    // Calculate offset from mouse to element's center
    dragOffset.x = event.clientX - centerX;
    dragOffset.y = event.clientY - centerY;
}

// ===== Handle Mouse Move (drag Shamash) =====
function handleMouseMove(event) {
    if (!isDragging || !shamashElement) {
        return;
    }

    // Calculate new center position
    const newCenterX = event.clientX - dragOffset.x;
    const newCenterY = event.clientY - dragOffset.y;

    // Update Shamash position based on center
    shamashElement.style.left = (newCenterX - shamashWidth / 2) + 'px';
    shamashElement.style.top = (newCenterY - shamashHeight / 2) + 'px';

    // Check proximity to all unlit candles (only when tilted)
    if (isTilted) {
        checkProximityToCandles();
    }
}

// ===== Handle Mouse Up (stop drag) =====
function handleMouseUp(event) {
    if (!isDragging) {
        return;
    }

    isDragging = false;
    shamashElement.classList.remove('dragging');

    // Per the new logic, always return home on mouse up
    returnToDefaultPosition();

    // Remove ready-to-light class from all candles
    document.querySelectorAll('.candle.ready-to-light').forEach(candle => {
        candle.classList.remove('ready-to-light');
    });
}

// ===== Check Proximity to Candles =====
function checkProximityToCandles() {
    const shamashFlame = shamashElement.querySelector('.flame');
    if (!shamashFlame) return;

    const flameRect = shamashFlame.getBoundingClientRect();
    const flameCenterX = flameRect.left + flameRect.width / 2;
    const flameCenterY = flameRect.top + flameRect.height / 2;

    // Check all regular candles
    const currentDay = getCurrentHanukkahDay();
    for (let i = 1; i <= 8; i++) {
        const candleId = `candle${i}`;

        // Skip if already lit or not available for current day (right to left lighting)
        const isAvailable = currentDay && i >= (9 - currentDay);
        if (candleState[candleId] || !isAvailable) {
            continue;
        }

        const candleElement = document.querySelector(`[data-candle="${candleId}"]`);
        if (!candleElement) continue;

        const wick = candleElement.querySelector('.wick');
        if (!wick) continue;

        const wickRect = wick.getBoundingClientRect();
        const wickCenterX = wickRect.left + wickRect.width / 2;
        const wickCenterY = wickRect.top + wickRect.height / 2;

        // Calculate distance between flame and wick
        const distance = Math.sqrt(
            Math.pow(flameCenterX - wickCenterX, 2) +
            Math.pow(flameCenterY - wickCenterY, 2)
        );

        // Visual feedback when getting close
        if (distance < PROXIMITY_THRESHOLD + 40) {
            candleElement.classList.add('ready-to-light');
        } else {
            candleElement.classList.remove('ready-to-light');
        }

        // Light the candle when flame touches wick
        if (distance < PROXIMITY_THRESHOLD) {
            lightCandle(candleElement, candleId);
        }
    }
}

// ===== Light a Candle =====
function lightCandle(candleElement, candleId) {
    candleElement.classList.add('lit');
    candleElement.classList.remove('ready-to-light');
    candleState[candleId] = true;
    saveState();
    updateDayCounter();

    // Optional: Add celebration effect
    celebrateCandle(candleElement);
}

// ===== Update Blessings Display =====
function updateBlessings() {
    const currentDay = getCurrentHanukkahDay();
    const blessing3 = document.getElementById('blessing3');

    if (blessing3) {
        if (currentDay === 1) {
            blessing3.style.display = 'block';
        } else {
            blessing3.style.display = 'none';
        }
    }
}

// ===== Update UI Visibility based on Date =====
function updateUIVisibility() {
    const currentDay = getCurrentHanukkahDay();
    const isHanukkahOrTest = currentDay !== null;

    // Elements to toggle
    const elementsToToggle = [
        document.querySelector('.subtitle'),
        document.querySelector('.blessings'),
        document.querySelector('.info-panel'),
        document.querySelector('.menorah-container'),
        document.querySelector('.menorah-base'),
        document.querySelector('footer')
    ];
    const notHanukkahMessage = document.getElementById('notHanukkahMessage');

    const displayStyle = isHanukkahOrTest ? '' : 'none';
    elementsToToggle.forEach(el => {
        if (el) {
            el.style.display = displayStyle;
        }
    });

    if (notHanukkahMessage) {
        notHanukkahMessage.style.display = isHanukkahOrTest ? 'none' : 'block';
    }
}

// ===== Check if Day is Complete =====
function isDayComplete() {
    const currentDay = getCurrentHanukkahDay();
    if (!currentDay) return false;

    // Count how many candles should be lit for this day
    let requiredCandles = currentDay;

    // Count how many candles are actually lit
    let litCount = 0;
    for (let i = 1; i <= 8; i++) {
        if (candleState[`candle${i}`]) {
            litCount++;
        }
    }

    return litCount >= requiredCandles;
}

// ===== Update Day Counter =====
function updateDayCounter() {
    updateUIVisibility();

    const currentDay = getCurrentHanukkahDay();

    // Count lit candles (excluding shamash)
    let litCount = 0;
    for (let i = 1; i <= 8; i++) {
        if (candleState[`candle${i}`]) {
            litCount++;
        }
    }

    // Update the display
    const dayNumberElement = document.getElementById('dayNumber');
    if (dayNumberElement) {
        if (currentDay) {
            dayNumberElement.textContent = `Day ${currentDay}: ${litCount}/${currentDay}`;
        } else if (currentTestDay) {
            dayNumberElement.textContent = `Test Day ${currentTestDay}: ${litCount}/${currentTestDay}`;
        } else {
            dayNumberElement.textContent = 'Not Hanukkah - Select test day';
        }
    }

    // Update background for the new day
    updateBackgroundImage();

    // Update blessings display
    updateBlessings();
}

// ===== Handle Reset =====
function handleReset() {
    let confirmed = true;
    if (!developerMode) {
        confirmed = confirm('Are you sure you want to reset the menorah? All candles will be extinguished.');
    }

    if (confirmed) {
        resetState();
    }
}


// ===== Reset State =====
function resetState() {
    clearTimeout(tiltTimeout);
    tiltTimeout = null;
    videoTriggeredForDay = false; // Reset video trigger on reset

    // Stop and reset audio
    const audioElement = document.getElementById('backgroundAudio');
    if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
    }

    // Reset state object
    Object.keys(candleState).forEach(key => {
        candleState[key] = false;
    });

    // Remove 'lit' class from all candles
    const candles = document.querySelectorAll('.candle');
    candles.forEach(candle => {
        candle.classList.remove('lit');
        candle.classList.remove('ready-to-light');
    });

    // Reset Shamash position and state
    if (shamashElement) {
        shamashElement.style.transform = ''; // Clear any rotation
        isTilted = false;
        returnToDefaultPosition();
        shamashElement.classList.remove('lit'); // Ensure shamash is not lit
    }

    // Clear localStorage
    localStorage.removeItem('hanukkahMenorah');

    // Update UI
    updateDayCounter();
    updateCandleVisibility();
}

// ===== Return Shamash to Default Position =====
function returnToDefaultPosition() {
    if (!shamashElement) return;

    shamashElement.style.position = ''; // Allow CSS to determine position
    shamashElement.style.left = '';
    shamashElement.style.top = '';
    shamashElement.style.right = ''; // Restore CSS right positioning
    shamashElement.style.bottom = ''; // Restore CSS bottom positioning
    shamashElement.style.zIndex = '';

    // Always reset to vertical position
    shamashElement.style.transform = '';
    isTilted = false;

    // Check if day is complete and trigger video
    if (isDayComplete() && !videoTriggeredForDay) {
        videoTriggeredForDay = true;
        updateBackgroundImage(); // This will now show the video
    }
}

// ===== Celebration Effect =====
function celebrateCandle(candle) {
    // Add a brief pulse animation
    candle.style.animation = 'none';

    // Trigger reflow to restart animation
    void candle.offsetWidth;

    // Add temporary celebration class
    candle.classList.add('celebrating');

    setTimeout(() => {
        candle.classList.remove('celebrating');
    }, 600);
}

// ===== Add celebration animation to CSS dynamically =====
const style = document.createElement('style');
style.textContent = `
    @keyframes celebrate {
        0%, 100% {
            transform: scale(1.05);
        }
        25% {
            transform: scale(1.1) rotate(2deg);
        }
        75% {
            transform: scale(1.1) rotate(-2deg);
        }
    }
    
    .candle.celebrating {
        animation: celebrate 0.6s ease-in-out;
    }
`;
document.head.appendChild(style);
