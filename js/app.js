/* ============================================================
   Life Dashboard — app.js
   Challenges implemented:
     1. Light / Dark mode
     2. Custom name in greeting
     3. Prevent duplicate tasks
   ============================================================ */

// ── Helpers ──────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Local Storage helpers ─────────────────────────────────────
const LS = {
  get: (key, fallback = null) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

/* ============================================================
   1. CLOCK & GREETING
   ============================================================ */
function padTwo(n) { return String(n).padStart(2, '0'); }

function updateClock() {
  const now = new Date();
  const h = padTwo(now.getHours());
  const m = padTwo(now.getMinutes());
  const s = padTwo(now.getSeconds());
  $('clock').textContent = `${h}:${m}:${s}`;

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  $('date').textContent =
    `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const hour = now.getHours();
  let greet = 'Good Evening';
  if (hour >= 5  && hour < 12) greet = 'Good Morning';
  else if (hour >= 12 && hour < 18) greet = 'Good Afternoon';

  const name = LS.get('userName', '');
  $('greeting').textContent = name ? `${greet}, ${name}!` : `${greet}!`;
}

setInterval(updateClock, 1000);
updateClock();

/* ============================================================
   2. DARK / LIGHT MODE  (Challenge #1)
   ============================================================ */
(function initTheme() {
  const saved = LS.get('theme', 'light');
  document.documentElement.setAttribute('data-theme', saved);
  $('theme-toggle').textContent = saved === 'dark' ? '☀️' : '🌙';
})();

$('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  LS.set('theme', next);
  $('theme-toggle').textContent = next === 'dark' ? '☀️' : '🌙';
});

/* ============================================================
   3. CUSTOM NAME  (Challenge #2)
   ============================================================ */
function renderName() {
  const name = LS.get('userName', '');
  $('name-display').textContent = name ? `👋 ${name}` : 'Set your name';
}

renderName();

$('edit-name-btn').addEventListener('click', () => {
  $('name-input').value = LS.get('userName', '');
  $('name-modal').classList.remove('hidden');
  $('name-input').focus();
});

$('save-name-btn').addEventListener('click', saveName);
$('cancel-name-btn').addEventListener('click', () => $('name-modal').classList.add('hidden'));

$('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });

function saveName() {
  const name = $('name-input').value.trim();
  LS.set('userName', name);
  renderName();
  updateClock(); // refresh greeting immediately
  $('name-modal').classList.add('hidden');
}

// Close modal on backdrop click
$('name-modal').addEventListener('click', (e) => {
  if (e.target === $('name-modal')) $('name-modal').classList.add('hidden');
});

/* ============================================================
   4. FOCUS TIMER
   ============================================================ */
let timerDuration = (LS.get('pomoDuration', 25)) * 60; // seconds
let timerRemaining = timerDuration;
let timerInterval  = null;
let timerRunning   = false;

$('custom-minutes').value = LS.get('pomoDuration', 25);

function formatTime(sec) {
  return `${padTwo(Math.floor(sec / 60))}:${padTwo(sec % 60)}`;
}

function renderTimer() {
  $('timer-display').textContent = formatTime(timerRemaining);
}

renderTimer();

$('apply-time-btn').addEventListener('click', () => {
  if (timerRunning) { showToast('Stop the timer before changing the duration.'); return; }
  const val = parseInt($('custom-minutes').value, 10);
  if (isNaN(val) || val < 1 || val > 99) { showToast('Enter a value between 1 and 99.'); return; }
  timerDuration  = val * 60;
  timerRemaining = timerDuration;
  LS.set('pomoDuration', val);
  renderTimer();
  showToast(`Timer set to ${val} minute${val !== 1 ? 's' : ''}.`);
});

$('start-btn').addEventListener('click', () => {
  if (timerRunning) return;
  if (timerRemaining <= 0) timerRemaining = timerDuration;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerRemaining--;
    renderTimer();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      showToast('⏰ Focus session complete!');
    }
  }, 1000);
});

$('stop-btn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
});

$('reset-btn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning   = false;
  timerRemaining = timerDuration;
  renderTimer();
});

/* ============================================================
   5. TO-DO LIST
   ============================================================ */
let tasks = LS.get('tasks', []); // [{id, text, done}]

function saveTasks() { LS.set('tasks', tasks); }

function getSortedTasks() {
  const sort = $('sort-select').value;
  const copy = [...tasks];
  if (sort === 'az')   return copy.sort((a,b) => a.text.localeCompare(b.text));
  if (sort === 'za')   return copy.sort((a,b) => b.text.localeCompare(a.text));
  if (sort === 'done') return copy.sort((a,b) => Number(a.done) - Number(b.done));
  return copy; // default: insertion order
}

function renderTasks() {
  const list = $('task-list');
  list.innerHTML = '';

  getSortedTasks().forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    // Checkbox
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = task.done;
    cb.addEventListener('change', () => toggleTask(task.id));

    // Editable text
    const span = document.createElement('input');
    span.type      = 'text';
    span.className = 'task-text';
    span.value     = task.text;
    span.readOnly  = true;

    // Double-click to edit
    span.addEventListener('dblclick', () => startEdit(span, task.id));
    span.addEventListener('blur',     () => finishEdit(span, task.id));
    span.addEventListener('keydown',  (e) => {
      if (e.key === 'Enter') span.blur();
      if (e.key === 'Escape') { span.value = task.text; span.blur(); }
    });

    // Delete button
    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.textContent = 'Delete';
    del.addEventListener('click', () => deleteTask(task.id));

    li.append(cb, span, del);
    list.appendChild(li);
  });
}

function startEdit(input, id) {
  input.readOnly = false;
  input.classList.add('editing');
  input.focus();
  input.select();
}

function finishEdit(input, id) {
  input.readOnly = true;
  input.classList.remove('editing');
  const newText = input.value.trim();
  if (!newText) { input.value = tasks.find(t => t.id === id)?.text || ''; return; }

  // Prevent duplicate on edit (Challenge #3)
  const isDuplicate = tasks.some(
    (t) => t.id !== id && t.text.toLowerCase() === newText.toLowerCase()
  );
  if (isDuplicate) {
    showToast('⚠️ A task with that name already exists.');
    input.value = tasks.find(t => t.id === id)?.text || '';
    return;
  }

  const task = tasks.find(t => t.id === id);
  if (task) { task.text = newText; saveTasks(); }
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) { task.done = !task.done; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function addTask() {
  const text = $('task-input').value.trim();
  if (!text) { showToast('Please enter a task.'); return; }

  // Challenge #3: Prevent duplicates
  const duplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (duplicate) { showToast('⚠️ Task already exists!'); return; }

  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  renderTasks();
  $('task-input').value = '';
  $('task-input').focus();
}

$('add-task-btn').addEventListener('click', addTask);
$('task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
$('sort-select').addEventListener('change', renderTasks);

renderTasks();

/* ============================================================
   6. QUICK LINKS
   ============================================================ */
let links = LS.get('quickLinks', [
  { id: 1, name: 'Google',   url: 'https://google.com'       },
  { id: 2, name: 'Gmail',    url: 'https://mail.google.com'  },
  { id: 3, name: 'Calendar', url: 'https://calendar.google.com' },
]);

function saveLinks() { LS.set('quickLinks', links); }

function renderLinks() {
  const container = $('links-container');
  container.innerHTML = '';
  links.forEach((link) => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';

    const a = document.createElement('a');
    a.href        = link.url;
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    a.textContent = link.name;

    const btn = document.createElement('button');
    btn.className   = 'remove-link';
    btn.textContent = '✕';
    btn.title       = 'Remove link';
    btn.addEventListener('click', () => removeLink(link.id));

    chip.append(a, btn);
    container.appendChild(chip);
  });
}

function removeLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

function addLink() {
  const name = $('link-name-input').value.trim();
  const url  = $('link-url-input').value.trim();
  if (!name) { showToast('Please enter a link name.'); return; }
  if (!url)  { showToast('Please enter a URL.'); return; }

  // Basic URL validation
  let fullUrl = url;
  if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;
  try { new URL(fullUrl); } catch { showToast('Please enter a valid URL.'); return; }

  links.push({ id: Date.now(), name, url: fullUrl });
  saveLinks();
  renderLinks();
  $('link-name-input').value = '';
  $('link-url-input').value  = '';
  $('link-name-input').focus();
}

$('add-link-btn').addEventListener('click', addLink);
$('link-url-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });

renderLinks();
