const baseEmojis = [
    '😀', '😂', '😍', '🥳', '🥺', '😎', '😡', '😭', '🤯', '🥶',
    '🐶', '🐱', '🐭', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵', '🦄'
];

const decoyEmojis = [
    '😃', '😁', '😅', '🤣', '😇'
];

const MIN_PASSWORD_LENGTH = 4;
const MAX_LOGIN_ATTEMPTS = 3;

// Application State
let state = {
    participantId: '',
    isExperimentalMode: false,
    currentTask: 1, // 1: Register, 2: Login, 3: Lockout Test
    currentPassword: [], // What user is currently typing
    registeredPassword: [], // Store the successful registration password for Login task
    taskStartTime: 0,
    loginAttempts: 0,
    resultsData: [] // Array to hold completed task data
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
        alert("请输入参与者编号！");
        return;
    }
    state.participantId = pId;
    UI.currentUserDisplay.textContent = `参与者: ${pId}`;
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
    resetCurrentTaskInput();

    switchView('task');
    setupTaskUI();
    renderKeyboard();
}

function setupTaskUI() {
    switch (state.currentTask) {
        case 1:
            UI.taskTitle.textContent = "Task 1: 创建表情密码";
            UI.taskInstructions.innerHTML = `
                请使用键盘设置您的密码（长度不限，至少 ${MIN_PASSWORD_LENGTH} 位）。<br>
                <em>测试要求：请尝试设置过于简单的密码（连续选择4个相同的表情），查看安全提示，然后再正常完成注册。</em>
            `;
            break;
        case 2:
            UI.taskTitle.textContent = "Task 2: 安全登录";
            UI.taskInstructions.innerHTML = `
                请使用您刚刚在 Task 1 中创建的密码进行登录。<br>
                <em>实验配合：请主导人员或观察者进行“肩窥(测试偷看)”，评估安全性。</em>
            `;
            state.loginAttempts = 0;
            break;
        case 3:
            UI.taskTitle.textContent = "Task 3: 触发安全警报";
            UI.taskInstructions.innerHTML = `
                请故意连续 <strong>输错 3 次</strong> 密码，看看系统会有什么响应。
            `;
            state.loginAttempts = 0;
            break;
    }
}

function resetCurrentTaskInput() {
    state.currentPassword = [];
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
    state.currentPassword.push(emoji);
    UI.errorMessage.classList.add('hidden'); // Ensure error goes away upon new input
    updatePasswordDisplay();

    // Dynamic reflow
    if (state.isExperimentalMode) {
        renderKeyboard();
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
    UI.charCount.textContent = `已输入: ${len}位`;

    if (len === 0) {
        UI.passwordDisplay.classList.add('empty');
        UI.passwordDisplay.textContent = `请点击下方表情输入密码 (至少 ${MIN_PASSWORD_LENGTH} 位)`;
        UI.btnSubmit.disabled = true;
    } else {
        UI.passwordDisplay.classList.remove('empty');

        if (state.isExperimentalMode) {
            // Mask input
            UI.passwordDisplay.textContent = '*'.repeat(len);
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
    const modeName = state.isExperimentalMode ? '实验模式(动态+掩码+混淆)' : '普通模式(静态)';

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
        recordResult(`Task 1: 注册`, modeName, 1, timeTaken, '成功');
        showToast('注册成功！正在进入 Task 2...');
        setTimeout(() => startTask(2), 1500);

    } else if (state.currentTask === 2) {
        // Login task
        state.loginAttempts++;
        if (state.currentPassword.join('') === state.registeredPassword.join('')) {
            recordResult(`Task 2: 登录`, modeName, state.loginAttempts, timeTaken, '成功');
            showToast('登录成功！正在进入 Task 3...');
            setTimeout(() => startTask(3), 1500);
        } else {
            showToast(`密码错误！(尝试 ${state.loginAttempts}/${MAX_LOGIN_ATTEMPTS})`, true);
            resetCurrentTaskInput();
        }

    } else if (state.currentTask === 3) {
        // Lockout test task
        state.loginAttempts++;
        if (state.currentPassword.join('') === state.registeredPassword.join('')) {
            showToast(`请故意输错！这才是 Task 3 的目的。`, true);
            resetCurrentTaskInput();
            return;
        }

        if (state.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            // Trigger Lockout
            recordResult(`Task 3: 锁屏测试`, modeName, state.loginAttempts, timeTaken, '成功触发锁定');
            switchView('locked');
        } else {
            showToast(`密码错误！(尝试 ${state.loginAttempts}/${MAX_LOGIN_ATTEMPTS})`, true);
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
    state.resultsData.forEach(row => {
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
    // We keep results data for export, but reset the task flow
    state.participantId = '';
    state.registeredPassword = [];
    UI.participantIdInput.value = '';
    UI.currentUserDisplay.textContent = '参与者: 未设置';
    UI.modeToggle.checked = false; // Reset to baseline manually if desired
    state.isExperimentalMode = false;
    switchView('setup');
});

// --- CSV Export ---
UI.btnExportCSV.addEventListener('click', () => {
    if (state.resultsData.length === 0) {
        alert("暂无数据可导出！");
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
