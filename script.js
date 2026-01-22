let routine = [
    { name: "Development", duration: 120 * 60 },
    { name: "Reading", duration: 60 * 60 },
    { name: "Deep Work", duration: 120 * 60 },
    { name: "Planning", duration: 30 * 60 }
];

let state = {
    currentIndex: 0,
    timeRemaining: 0,
    isRunning: false,
    timer: null,
    startTime: 0,
    lastTick: Date.now()
};

const STORAGE_KEYS = {
    CONFIG: 'zen_premium_config',
    STATE: 'zen_premium_state',
    STATS: 'zen_premium_stats'
};

const sounds = {
    next: new Audio('ding.mp3'),
    end: new Audio('finish.mp3')
};

function playSound(type) {
    const s = sounds[type];
    if (s) {
        s.pause();
        s.currentTime = 0;
        s.play().catch(e => console.log("Audio play blocked or missing:", e));
    }
}

const timerEl = document.getElementById('timer-display');
const taskEl = document.getElementById('task-name');
const mainBtn = document.getElementById('main-btn');
const skipBtn = document.getElementById('skip-btn');
const progressEl = document.getElementById('progress-bar');
const timelineEl = document.getElementById('timeline');
const nextLabel = document.getElementById('next-label');
const modEditor = document.getElementById('modal-editor');
const modStats = document.getElementById('modal-stats');

function initTimeline() {
    timelineEl.innerHTML = '';
    routine.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = `dot ${i === state.currentIndex ? 'active' : (i < state.currentIndex ? 'completed' : '')}`;
        timelineEl.appendChild(dot);
    });
}

function updateDisplay() {
    const task = routine[state.currentIndex];
    taskEl.textContent = task ? task.name : "Session Complete";

    const h = Math.floor(state.timeRemaining / 3600);
    const m = Math.floor((state.timeRemaining % 3600) / 60);
    const s = state.timeRemaining % 60;
    timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const perc = task ? ((task.duration - state.timeRemaining) / task.duration) * 100 : 100;
    progressEl.style.width = `${perc}%`;

    const next = routine[state.currentIndex + 1];
    nextLabel.textContent = next ? `Next: ${next.name}` : "Last Task";
    initTimeline();
}

function trackTime(sec) {
    if (!routine[state.currentIndex]) return;
    let stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS)) || {};
    let name = routine[state.currentIndex].name;
    stats[name] = (stats[name] || 0) + sec;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

function start() {
    if (state.isRunning) return;
    state.isRunning = true;
    state.lastTick = Date.now();
    mainBtn.textContent = "Pause";
    skipBtn.classList.remove('hidden');

    if (state.timeRemaining <= 0) state.timeRemaining = routine[state.currentIndex].duration;
    state.startTime = Date.now() - (routine[state.currentIndex].duration - state.timeRemaining) * 1000;

    state.timer = setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - state.lastTick) / 1000);

        if (delta >= 1) {
            trackTime(delta);
            state.lastTick = now;
        }

        state.timeRemaining = Math.max(0, routine[state.currentIndex].duration - Math.floor((now - state.startTime) / 1000));
        updateDisplay();

        if (state.timeRemaining <= 0) finishTask();
    }, 1000);
}

function pause() {
    clearInterval(state.timer);
    state.isRunning = false;
    mainBtn.textContent = "Resume";
    saveLocalState();
}

function finishTask() {
    clearInterval(state.timer);
    state.isRunning = false;
    state.currentIndex++;

    if (state.currentIndex < routine.length) {
        playSound('next');
        state.timeRemaining = routine[state.currentIndex].duration;
        start();
    } else {
        playSound('end');
        state.currentIndex = routine.length;
        updateDisplay();
        mainBtn.textContent = "Restart Session";
        skipBtn.classList.add('hidden');
    }
}

function saveLocalState() {
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify({
        idx: state.currentIndex,
        rem: state.timeRemaining
    }));
}

function loadAll() {
    const savedConf = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (savedConf) routine = JSON.parse(savedConf);

    const savedState = localStorage.getItem(STORAGE_KEYS.STATE);
    if (savedState) {
        const s = JSON.parse(savedState);
        state.currentIndex = s.idx || 0;
        state.timeRemaining = s.rem || (routine[0] ? routine[0].duration : 0);
    } else {
        state.timeRemaining = routine[0] ? routine[0].duration : 0;
    }
    updateDisplay();
}

mainBtn.onclick = () => {
    if (state.currentIndex >= routine.length) {
        state.currentIndex = 0;
        state.timeRemaining = routine[0].duration;
        start();
    } else {
        state.isRunning ? pause() : start();
    }
};

skipBtn.onclick = finishTask;

document.getElementById('edit-trigger').onclick = () => {
    pause();
    document.getElementById('routine-input').value = routine.map(r => `${r.name};${r.duration / 3600}`).join('\n');
    modEditor.classList.remove('hidden');
};

document.getElementById('save-btn').onclick = () => {
    try {
        const val = document.getElementById('routine-input').value.trim();
        routine = val.split('\n').map(l => {
            const [n, h] = l.split(';');
            return { name: n.trim(), duration: parseFloat(h.replace(',', '.')) * 3600 };
        });
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(routine));
        state.currentIndex = 0;
        state.timeRemaining = routine[0].duration;
        modEditor.classList.add('hidden');
        updateDisplay();
    } catch (e) {
        alert("Format Error!");
    }
};

document.getElementById('stats-trigger').onclick = () => {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS)) || {};
    const list = document.getElementById('stats-list');
    list.innerHTML = Object.keys(stats).length ? '' : '<p class="text-white/20 text-center py-10 italic">No data yet</p>';

    for (let name in stats) {
        list.innerHTML += `
                    <div class="flex justify-between items-center py-4 border-b border-white/5">
                        <span class="text-[11px] uppercase tracking-widest text-white/50">${name}</span>
                        <span class="font-bold text-sm text-white">${(stats[name] / 3600).toFixed(2)} h</span>
                    </div>`;
    }
    modStats.classList.remove('hidden');
};

document.getElementById('clear-stats').onclick = () => {
    if (confirm("Clear all statistics?")) {
        localStorage.removeItem(STORAGE_KEYS.STATS);
        modStats.classList.add('hidden');
    }
};

document.querySelectorAll('#close-editor, #close-stats').forEach(b => b.onclick = () => {
    modEditor.classList.add('hidden');
    modStats.classList.add('hidden');
});

loadAll();
