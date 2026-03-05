const baseEmojis = [
    '🐶', '🚗', '😭', '🍎', '☀️', '🤳', '🍞', '👨', '🦄', '✈️',
    '⛰️', '💦', '🧀', '🍺', '😷', '🏖️', '🌙', '🐱', '🚲️', '❤️'
];

const decoyEmojis = [
    '😵‍💫', '💋', '👩', '🧊', '🗺️', '🏠️', '🌃', '🚅', '🛳️', '🌈'
];

const MIN_PASSWORD_LENGTH = 4;
const MAX_LOGIN_ATTEMPTS = 3;

// Application State
let state = {
    participantId: '',
    isExperimentalMode: false,
    currentTask: 1, // 1: Register, 2: Login, 3: Lockout Test
    currentPassword: [], // What user is currently typing
    taskStartTime: 0,
    loginAttempts: 0,
    isTransitioning: false, // Prevents input during successful submit delays
    resultsData: [], // Array to hold completed task data
    currentRunStartIndex: 0, // Track where the current test session started
    showLastChar: false, // Flag to show the last typed character in experimental mode
    maskTimeout: null // Holds the setTimeout ID
};

// DOM Elements
const views = {
    setup: document.getElementById('view-setup'),
    task: document.getElementById('view-task'),
    locked: document.getElementById('view-locked'),
    results: document.getElementById('view-results')
};

const UI = {
    participantIdInput: document.getElementById('participantId'),
    btnStartTasks: document.getElementById('btnStartTasks'),
    currentUserDisplay: document.getElementById('currentUserDisplay'),
    modeToggle: document.getElementById('modeToggle'),
    taskTitle: document.getElementById('taskTitle'),
    taskInstructions: document.getElementById('taskInstructions'),
    passwordDisplay: document.getElementById('passwordDisplay'),
    charCount: document.getElementById('charCount'),
    errorMessage: document.getElementById('errorMessage'),
    emojiKeyboard: document.getElementById('emojiKeyboard'),
    btnClear: document.getElementById('btnClear'),
    btnSubmit: document.getElementById('btnSubmit'),
    btnContinueAfterLock: document.getElementById('btnContinueAfterLock'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnResetApp: document.getElementById('btnResetApp'),
    dataBody: document.getElementById('dataBody'),
    toast: document.getElementById('toastContent')
};

// --- Initialization & View Management ---

function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
}

function showToast(message, isError = false) {
    UI.toast.textContent = message;
    UI.toast.style.backgroundColor = isError ? 'var(--error-color)' : 'var(--success-color)';
    UI.toast.classList.add('show');
    setTimeout(() => UI.toast.classList.remove('show'), 3000);
}

// --- Setup View Logic ---

UI.btnStartTasks.addEventListener('click', () => {
    const pId = UI.participantIdInput.value.trim();
    if (!pId) {
        alert("Please enter a Participant ID!");
        return;
    }
    state.participantId = pId;
    UI.currentUserDisplay.textContent = `Participant: ${pId}`;
    startTask(1); // Start with Task 1 (Registration)
});

UI.modeToggle.addEventListener('change', (e) => {
    state.isExperimentalMode = e.target.checked;
    // If we are mid-task, we need to reset/re-render the keyboard
    if (views.task.classList.contains('active')) {
        resetCurrentTaskInput();
        renderKeyboard();
    }
});

// --- Task Logic ---

function startTask(taskNumber) {
    state.currentTask = taskNumber;
    state.taskStartTime = Date.now();
    state.isTransitioning = false; // Release input lock
    resetCurrentTaskInput();

    switchView('task');
    setupTaskUI();
    renderKeyboard();
}

function setupTaskUI() {
    switch (state.currentTask) {
        case 1:
            UI.taskTitle.textContent = "Task 1: Create Emoji Password";
            UI.taskInstructions.innerHTML = `
                Please set up your password using the keyboard below (no length limit, minimum ${MIN_PASSWORD_LENGTH} characters).<br>
                <em>Test Instruction: Try to set a password that is too simple (select 4 identical emojis consecutively) to see the security warning, then complete the registration normally.</em>
            `;
            break;
        case 2:
            UI.taskTitle.textContent = "Task 2: Secure Login";
            UI.taskInstructions.innerHTML = `
                Please log in using the password you just created in Task 1.<br>
                <em>Experiment Setup: The experimenter or an observer will perform "shoulder surfing" (attempt to peek) to evaluate security.</em>
            `;
            state.loginAttempts = 0;
            break;
        case 3:
            UI.taskTitle.textContent = "Task 3: Trigger Security Lockout";
            UI.taskInstructions.innerHTML = `
                Please intentionally enter the wrong password <strong>3 consecutive times</strong> to observe the system's response.
            `;
            state.loginAttempts = 0;
            break;
    }
}

function resetCurrentTaskInput() {
    state.currentPassword = [];
    state.showLastChar = false;
    if (state.maskTimeout) clearTimeout(state.maskTimeout);
    UI.errorMessage.classList.add('hidden');
    updatePasswordDisplay();
}

// --- Keyboard Logic ---

// Utility: Fisher-Yates shuffle
function shuffleArray(array) {
    let curId = array.length;
    while (0 !== curId) {
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
    }
    return array;
}

function renderKeyboard() {
    UI.emojiKeyboard.innerHTML = '';

    let currentEmojis = [...baseEmojis];
    // Add decoys if in experimental mode AND it is task 2 or 3
    if (state.isExperimentalMode && state.currentTask > 1) {
        currentEmojis = currentEmojis.concat(decoyEmojis);
    }

    // Always keep the 5-column grid layout CSS. With 25 items (20 + 5 decoys), it forms a perfect 5x5 grid.

    // Shuffle if in experimental mode
    if (state.isExperimentalMode) {
        currentEmojis = shuffleArray(currentEmojis);
    }

    currentEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn';
        btn.textContent = emoji;
        btn.onclick = () => handleEmojiClick(emoji);
        UI.emojiKeyboard.appendChild(btn);
    });
}

// --- Input Handling ---

function handleEmojiClick(emoji) {
    if (state.isTransitioning) return; // Block input while moving to next task

    state.currentPassword.push(emoji);
    UI.errorMessage.classList.add('hidden'); // Ensure error goes away upon new input

    if (state.isExperimentalMode) {
        // Show last character temporarily
        if (state.maskTimeout) clearTimeout(state.maskTimeout);
        state.showLastChar = true;
        updatePasswordDisplay();

        state.maskTimeout = setTimeout(() => {
            state.showLastChar = false;
            updatePasswordDisplay();
        }, 1000); // Wait 1 second before turning to *

        // Dynamic reflow
        renderKeyboard();
    } else {
        updatePasswordDisplay();
    }
}

function hasConsecutiveIdentical(pwdArray, count = 4) {
    if (pwdArray.length < count) return false;
    for (let i = 0; i <= pwdArray.length - count; i++) {
        let allSame = true;
        for (let j = 1; j < count; j++) {
            if (pwdArray[i] !== pwdArray[i + j]) {
                allSame = false;
                break;
            }
        }
        if (allSame) return true;
    }
    return false;
}

function updatePasswordDisplay() {
    const len = state.currentPassword.length;

    // We update the character count to show how many they have inputted
    UI.charCount.textContent = `Entered: ${len} chars`;

    if (len === 0) {
        UI.passwordDisplay.classList.add('empty');
        UI.passwordDisplay.textContent = `Click emojis below to enter password (min ${MIN_PASSWORD_LENGTH} chars)`;
        UI.btnSubmit.disabled = true;
    } else {
        UI.passwordDisplay.classList.remove('empty');

        if (state.isExperimentalMode) {
            // Mask input but optionally show last char
            if (state.showLastChar && len > 0) {
                UI.passwordDisplay.textContent = '*'.repeat(len - 1) + state.currentPassword[len - 1];
            } else {
                UI.passwordDisplay.textContent = '*'.repeat(len);
            }
        } else {
            // Show plaintext
            UI.passwordDisplay.textContent = state.currentPassword.join('');
        }

        // Enable submit button once minimum length is reached
        UI.btnSubmit.disabled = (len < MIN_PASSWORD_LENGTH);
    }
}

UI.btnClear.addEventListener('click', resetCurrentTaskInput);

// --- Task Submission ---

UI.btnSubmit.addEventListener('click', () => {
    const timeTaken = ((Date.now() - state.taskStartTime) / 1000).toFixed(2);
    const modeName = state.isExperimentalMode ? 'Experimental (Dynamic+Mask+Decoy)' : 'Baseline (Static)';

    if (state.currentTask === 1) {
        // Validation: Must not contain 4 consecutive identical characters
        if (hasConsecutiveIdentical(state.currentPassword, 4)) {
            UI.errorMessage.classList.remove('hidden');
            setTimeout(() => {
                state.currentPassword = [];
                updatePasswordDisplay();
            }, 50); // slight delay to allow message render
            return; // Do NOT proceed to task 2
        }

        // Registration success
        UI.errorMessage.classList.add('hidden');
        state.registeredPassword = [...state.currentPassword];
        recordResult(`Task 1: Register`, modeName, 1, timeTaken, 'Success');
        showToast('Registration successful! Proceeding to Task 2...');
        state.isTransitioning = true; // Lock keyboard
        setTimeout(() => startTask(2), 1500);

    } else if (state.currentTask === 2) {
        // Login task
        state.loginAttempts++;
        if (state.currentPassword.join('') === state.registeredPassword.join('')) {
            recordResult(`Task 2: Login`, modeName, state.loginAttempts, timeTaken, 'Success');
            showToast('Login successful! Proceeding to Task 3...');
            state.isTransitioning = true; // Lock keyboard
            setTimeout(() => startTask(3), 1500);
        } else {
            if (state.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                // Task 2 Failed -> Trigger Lockout
                recordResult(`Task 2: Login`, modeName, state.loginAttempts, timeTaken, 'Failed');
                recordResult(`Task 3: Lockout Test`, modeName, 0, 0, 'Auto-Completed by Task 2 Failure');
                document.getElementById('lockoutMessage').innerHTML = `
                    <p>Detected 3 consecutive failed login attempts in Task 2. This demonstrates the system's defense mechanism against brute-force or shoulder surfing attacks is active.</p>
                    <p>Since the lockout was triggered during your login attempt, Task 3 (Security Lockout Test) has been automatically completed!</p>
                `;
                switchView('locked');
            } else {
                showToast(`Incorrect password! (Attempt ${state.loginAttempts}/${MAX_LOGIN_ATTEMPTS})`, true);
                resetCurrentTaskInput();
            }
        }

    } else if (state.currentTask === 3) {
        // Lockout test task
        if (state.currentPassword.join('') === state.registeredPassword.join('')) {
            showToast(`Please fail intentionally! That is the goal of Task 3.`, true);
            resetCurrentTaskInput();
            return; // Stops here, attempt is NOT incremented
        }

        // Reaches here ONLY if the password was genuinely incorrect
        state.loginAttempts++;

        if (state.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            // Trigger Lockout normally
            recordResult(`Task 3: Lockout Test`, modeName, state.loginAttempts, timeTaken, 'Success');
            document.getElementById('lockoutMessage').innerHTML = `
                <p>Detected 3 consecutive failed login attempts. This demonstrates the system's defense mechanism against brute-force or shoulder surfing attacks is active.</p>
                <p>Task 3 analysis complete!</p>
            `;
            switchView('locked');
        } else {
            showToast(`Incorrect password! (Attempt ${state.loginAttempts}/${MAX_LOGIN_ATTEMPTS})`, true);
            resetCurrentTaskInput();
        }
    }
});

// --- Post Task Lockout & Results ---

UI.btnContinueAfterLock.addEventListener('click', () => {
    updateResultsTable();
    switchView('results');
});

function recordResult(taskName, mode, attempts, time, status) {
    state.resultsData.push({
        pId: state.participantId,
        taskName: taskName,
        mode: mode,
        attempts: attempts,
        time: time,
        status: status
    });
}

function updateResultsTable() {
    UI.dataBody.innerHTML = '';

    // Only display results for the current run, not the whole history
    const currentRunData = state.resultsData.slice(state.currentRunStartIndex);

    currentRunData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.pId}</td>
            <td>${row.mode}</td>
            <td>${row.taskName}</td>
            <td>${row.attempts}</td>
            <td>${row.time}</td>
            <td>${row.status}</td>
        `;
        UI.dataBody.appendChild(tr);
    });
}

// --- App Reset ---
UI.btnResetApp.addEventListener('click', () => {
    // We keep results data for export, but reset the task flow for the new run
    state.currentRunStartIndex = state.resultsData.length; // Set marker for the new run

    state.participantId = '';
    state.registeredPassword = [];
    UI.participantIdInput.value = '';
    UI.currentUserDisplay.textContent = 'Participant: Not Set';
    UI.modeToggle.checked = false; // Reset to baseline manually if desired
    state.isExperimentalMode = false;
    switchView('setup');
});

// --- CSV Export ---
UI.btnExportCSV.addEventListener('click', () => {
    if (state.resultsData.length === 0) {
        alert("No data available to export yet!");
        return;
    }

    const headers = ['Participant ID', 'Mode', 'Task', 'Attempts', 'Time(s)', 'Status'];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
        headers.join(",") + "\n" +
        state.resultsData.map(e => `${e.pId},"${e.mode}",${e.taskName},${e.attempts},${e.time},${e.status}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HCS_Experiment_Data_${new Date().getTime()}.csv`);
    document.body.appendChild(link); // Required for FF

    link.click();
    link.remove();
});
