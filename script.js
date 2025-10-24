const routine = [
    { name: "Программирование (Блок 1)", duration: 2 * 60 * 60 },
    { name: "Чтение книг на русском", duration: 1 * 60 * 60 },
    { name: "Программирование (Блок 2)", duration: 2 * 60 * 60 },
    { name: "Японский язык (JoJo-Time!)", duration: 1.5 * 60 * 60 }
];

const taskDisplay = document.getElementById('current-task');
const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const nextTaskInfo = document.getElementById('next-task-info');

let currentIndex = 0;
let timeRemaining = 0;
let isRunning = false;
let timerInterval = null;

const switchSound = new Audio('ding.mp3');
const finishSound = new Audio('finish.mp3');

function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateDisplay() {
    taskDisplay.textContent = routine[currentIndex].name;
    timerDisplay.textContent = formatTime(timeRemaining);

    if (currentIndex < routine.length - 1) {
        nextTaskInfo.textContent = `Далее: ${routine[currentIndex + 1].name}`;
    } else {
        nextTaskInfo.textContent = "Это последняя задача рутины!";
    }
}

function nextTask() {
    currentIndex++;
    if (currentIndex < routine.length) {
        timeRemaining = routine[currentIndex].duration;
        updateDisplay();
    } else {
        clearInterval(timerInterval);
        isRunning = false;
        taskDisplay.textContent = "РУТИНА ЗАВЕРШЕНА! 🎉";
        timerDisplay.textContent = "ГОТОВО!";
        startButton.style.display = 'none';
        resetButton.style.display = 'inline';
        finishSound.play();
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startButton.textContent = "ПАУЗА";
    resetButton.style.display = 'inline';
    switchSound.load();
    finishSound.load();

    if (timeRemaining === 0) {
        timeRemaining = routine[currentIndex].duration;
    }
    updateDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;

        if (timeRemaining <= 0) {
            if (currentIndex < routine.length - 1) {
                switchSound.pause();
                switchSound.currentTime = 0;
                switchSound.play();
            }
            nextTask();
        } else {
            updateDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startButton.textContent = "ПРОДОЛЖИТЬ";
}

function resetTimer() {
    pauseTimer();
    currentIndex = 0;
    timeRemaining = 0;
    isRunning = false;
    startButton.textContent = "СТАРТ РУТИНЫ";
    resetButton.style.display = 'none';
    taskDisplay.textContent = "Нажмите 'Старт', чтобы начать";
    timerDisplay.textContent = formatTime(0);
    nextTaskInfo.textContent = "";
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

timeRemaining = routine[currentIndex].duration;
updateDisplay();