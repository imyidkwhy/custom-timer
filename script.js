let routine = [
    { name: "Программирование (Блок 1)", duration: 2 * 60 * 60 },
    { name: "Чтение книг на русском", duration: 1 * 60 * 60 },
    { name: "Программирование (Блок 2)", duration: 2 * 60 * 60 },
    { name: "Японский язык (JoJo-Time!)", duration: 1.5 * 60 * 60 }
];

const taskDisplay = document.getElementById('current-task');
const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const skipButton = document.getElementById('skip-button');
const editButton = document.getElementById('edit-button');
const nextTaskInfo = document.getElementById('next-task-info');
const progressBar = document.getElementById('progress-bar');
const routineEditor = document.getElementById('routine-editor');
const routineInput = document.getElementById('routine-input');
const saveRoutineButton = document.getElementById('save-routine-button');

let currentIndex = 0;
let timeRemaining = 0;
let isRunning = false;
let timerInterval = null;
let startTime = 0;
let audioInitialized = false;

const switchSound = new Audio('ding.mp3');
const finishSound = new Audio('finish.mp3');

const ROUTINE_KEY = 'customRoutine';
const STATE_KEY = 'timerState';

function initializeAudio() {
    if (audioInitialized) return;

    switchSound.volume = 0;
    finishSound.volume = 0;

    switchSound.play().then(() => {
        switchSound.pause();
        switchSound.currentTime = 0;
    }).catch(e => console.log("Init switch audio blocked:", e));

    finishSound.play().then(() => {
        finishSound.pause();
        finishSound.currentTime = 0;
    }).catch(e => console.log("Init finish audio blocked:", e));

    switchSound.volume = 1;
    finishSound.volume = 1;

    audioInitialized = true;
}

function routineToString() {
    return routine.map(task => `${task.name};${task.duration / 3600}`).join('\n');
}

function stringToRoutine(str) {
    const lines = str.trim().split('\n').filter(line => line.trim() !== '');
    const newRoutine = [];

    for (const line of lines) {
        const parts = line.split(';');
        if (parts.length !== 2) {
            throw new Error(`Неверный формат строки: ${line}. Используйте "Имя;Часы".`);
        }

        const name = parts[0].trim();
        const hours = parseFloat(parts[1].trim().replace(',', '.'));

        if (!name || isNaN(hours) || hours <= 0) {
            throw new Error(`Неверное значение продолжительности: ${line}. Продолжительность должна быть положительным числом.`);
        }

        newRoutine.push({ name: name, duration: hours * 60 * 60 });
    }

    if (newRoutine.length === 0) {
        throw new Error("Список задач не может быть пустым.");
    }

    return newRoutine;
}

function toggleEditor() {
    if (routineEditor.style.display === 'none') {
        pauseTimer();
        routineInput.value = routineToString();
        routineEditor.style.display = 'block';
        timerDisplay.style.display = 'none';
        progressBar.parentElement.style.display = 'none';
        taskDisplay.style.display = 'none';
        nextTaskInfo.style.display = 'none';
    } else {
        routineEditor.style.display = 'none';
        timerDisplay.style.display = 'block';
        progressBar.parentElement.style.display = 'block';
        taskDisplay.style.display = 'block';
        nextTaskInfo.style.display = 'block';
    }
}

function saveRoutine() {
    const editorEl = document.getElementById('routine-editor');
    const oldTip = editorEl.querySelector('.editor-tip');

    if (oldTip) {
        oldTip.remove();
    }

    try {
        const newRoutine = stringToRoutine(routineInput.value);
        routine = newRoutine;
        localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine));
        resetTimer();
        toggleEditor();

        const successTip = document.createElement('p');
        successTip.className = 'editor-tip';
        successTip.style.color = 'var(--spotify-green)';
        successTip.textContent = "Рутина успешно сохранена и сброшена!";
        editorEl.appendChild(successTip);
        setTimeout(() => { successTip.remove(); }, 3000);

    } catch (error) {
        const errorTip = document.createElement('p');
        errorTip.className = 'editor-tip error-message';
        errorTip.textContent = `Ошибка: ${error.message}`;
        editorEl.appendChild(errorTip);
        setTimeout(() => { errorTip.remove(); }, 5000);
    }
}

function saveState() {
    if (isRunning) {
        const state = {
            currentIndex: currentIndex,
            startTime: startTime,
            duration: routine[currentIndex].duration,
            isPaused: false
        };
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } else {
    }
}

function loadRoutine() {
    const savedRoutine = localStorage.getItem(ROUTINE_KEY);
    if (savedRoutine) {
        try {
            const loadedRoutine = JSON.parse(savedRoutine);
            if (loadedRoutine.length > 0) {
                routine = loadedRoutine;
            }
        } catch (e) {
            console.error("Ошибка при загрузке рутины из localStorage:", e);
        }
    }
}

function loadState() {
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            currentIndex = state.currentIndex;

            if (state.isPaused) {
                timeRemaining = state.timeRemaining;

                isRunning = false;
                startButton.textContent = "ПРОДОЛЖИТЬ";
                startButton.classList.remove('primary-btn');
                startButton.classList.add('pause-btn');
                resetButton.style.display = 'inline';
                skipButton.style.display = 'inline';
                editButton.style.display = 'inline';
            } else {
                const timePassedSinceStart = Math.floor((Date.now() - state.startTime) / 1000);
                timeRemaining = Math.max(0, state.duration - timePassedSinceStart);

                if (timeRemaining > 0 && currentIndex < routine.length) {
                    startTime = Date.now() - (state.duration - timeRemaining) * 1000;
                    startTimer();
                } else if (currentIndex < routine.length) {
                    nextTask(true);
                }
            }

        } catch (e) {
            console.error("Ошибка при загрузке состояния таймера:", e);
            timeRemaining = routine[currentIndex].duration;
        }
    } else {
        timeRemaining = routine[currentIndex].duration;
    }
}

function formatTime(seconds) {
    seconds = Math.max(0, seconds);
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateDisplay() {
    taskDisplay.textContent = routine[currentIndex].name;
    timerDisplay.textContent = formatTime(timeRemaining);

    document.title = `${formatTime(timeRemaining)} | ${routine[currentIndex].name}`;

    const duration = routine[currentIndex].duration;
    const progress = (duration - timeRemaining) / duration;
    progressBar.style.transform = `translateX(${-100 + (progress * 100)}%)`;

    if (currentIndex < routine.length - 1) {
        nextTaskInfo.textContent = `Далее: ${routine[currentIndex + 1].name}`;
    } else {
        nextTaskInfo.textContent = "Это последняя задача рутины!";
    }
}

function playSound(audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(e => console.error("Ошибка воспроизведения звука:", e));
}

function nextTask(isInitialLoad = false) {
    currentIndex++;
    if (currentIndex < routine.length) {
        timeRemaining = 0;
        pauseTimer();
        if (!isInitialLoad) playSound(switchSound);
        startTimer();
    } else {
        clearInterval(timerInterval);
        isRunning = false;
        taskDisplay.textContent = "РУТИНА ЗАВЕРШЕНА";
        timerDisplay.textContent = "ГОТОВО!";
        document.title = "РУТИНА ЗАВЕРШЕНА";
        startButton.style.display = 'none';
        skipButton.style.display = 'none';
        resetButton.style.display = 'inline';
        localStorage.removeItem(STATE_KEY);
        if (!isInitialLoad) playSound(finishSound);
    }
}

function startTimer() {
    if (isRunning) return;

    isRunning = true;
    startButton.textContent = "ПАУЗА";
    startButton.classList.remove('pause-btn');
    startButton.classList.add('primary-btn');
    resetButton.style.display = 'inline';
    skipButton.style.display = 'inline';
    editButton.style.display = 'none';

    if (timeRemaining <= 0) {
        timeRemaining = routine[currentIndex].duration;
    }

    const durationInMs = routine[currentIndex].duration * 1000;
    const remainingInMs = timeRemaining * 1000;

    startTime = Date.now() - (durationInMs - remainingInMs);

    updateDisplay();
    saveState();

    timerInterval = setInterval(() => {

        const timePassed = Math.floor((Date.now() - startTime) / 1000);
        const actualTimeRemaining = Math.max(0, routine[currentIndex].duration - timePassed);

        if (timeRemaining !== actualTimeRemaining) {
            timeRemaining = actualTimeRemaining;
            updateDisplay();
            saveState();
        }

        if (timeRemaining <= 0) {
            nextTask();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startButton.textContent = "ПРОДОЛЖИТЬ";
    startButton.classList.remove('primary-btn');
    startButton.classList.add('pause-btn');
    document.title = "ПАУЗА | " + taskDisplay.textContent;
    editButton.style.display = 'inline';

    const state = {
        currentIndex: currentIndex,
        timeRemaining: timeRemaining,
        isPaused: true
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function resetTimer() {
    pauseTimer();
    currentIndex = 0;
    timeRemaining = routine[currentIndex].duration;
    isRunning = false;
    startButton.textContent = "СТАРТ РУТИНЫ";
    startButton.classList.remove('pause-btn');
    startButton.classList.add('primary-btn');
    startButton.style.display = 'inline';
    resetButton.style.display = 'none';
    skipButton.style.display = 'none';
    editButton.style.display = 'inline';
    taskDisplay.textContent = "Нажмите 'Старт', чтобы начать";
    timerDisplay.textContent = formatTime(timeRemaining);
    document.title = "Таймер";
    progressBar.style.transform = 'translateX(-100%)';
    localStorage.removeItem(STATE_KEY);

    if (routine.length > 1) {
        nextTaskInfo.textContent = `Далее: ${routine[currentIndex + 1].name}`;
    } else {
        nextTaskInfo.textContent = "Это единственная задача.";
    }

    switchSound.pause();
    switchSound.currentTime = 0;
    finishSound.pause();
    finishSound.currentTime = 0;
}

startButton.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetButton.addEventListener('click', resetTimer);
skipButton.addEventListener('click', nextTask);
editButton.addEventListener('click', toggleEditor);
saveRoutineButton.addEventListener('click', saveRoutine);


function firstInteractionHandler() {
    initializeAudio();
    document.body.removeEventListener('click', firstInteractionHandler);
    document.body.removeEventListener('keydown', firstInteractionHandler);
}
document.body.addEventListener('click', firstInteractionHandler);
document.body.addEventListener('keydown', firstInteractionHandler);


loadRoutine();
loadState();
updateDisplay();

if (!isRunning) {
    taskDisplay.textContent = "Нажмите 'Старт', чтобы начать";
    document.title = "Таймер";
}
