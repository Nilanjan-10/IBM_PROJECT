
const QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "The body achieves what the mind believes.",
  "You don't have to be extreme, just consistent.",
  "Small reps, done daily, beat big plans done never.",
  "The last rep is where the workout actually begins.",
  "Motivation gets you started. Habit keeps you going.",
  "Progress is a series of ordinary days nobody saw.",
  "Your only competition is who you were yesterday."
];

const STORAGE_KEY = "fitlog_entries";

let entries = loadEntries();

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDateReadable(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// ---------- QUOTE ----------
function showRandomQuote() {
  const quoteEl = document.getElementById("quoteText");
  const idx = Math.floor(Math.random() * QUOTES.length);
  quoteEl.textContent = QUOTES[idx];
}

document.getElementById("newQuoteBtn").addEventListener("click", showRandomQuote);

// ---------- STATS ----------
function renderStats() {
  const total = entries.length;
  const totalVolume = entries.reduce((sum, e) => sum + e.weight * e.reps * e.sets, 0);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const sessionsThisWeek = new Set(
    entries.filter(e => new Date(e.timestamp) >= weekAgo).map(e => e.date)
  ).size;

  const best = entries.reduce((max, e) => (e.weight > max.weight ? e : max), { weight: 0, exercise: null });

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statVolume").textContent = totalVolume.toLocaleString();
  document.getElementById("statWeek").textContent = sessionsThisWeek;
  document.getElementById("statBest").textContent = best.exercise ? `${best.weight}kg` : "—";
}

// ---------- STREAK ----------
function calcStreak() {
  const daysWithEntries = new Set(entries.map(e => e.date));
  let streak = 0;
  let cursor = new Date();


  if (!daysWithEntries.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daysWithEntries.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function renderStreak() {
  document.getElementById("streakNum").textContent = calcStreak();
}

function renderHeatmap() {
  const heatmap = document.getElementById("heatmap");
  heatmap.innerHTML = "";

  const dayCounts = {};
  entries.forEach(e => {
    dayCounts[e.date] = (dayCounts[e.date] || 0) + 1;
  });

  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  days.forEach(d => {
    const key = todayKey(d);
    const count = dayCounts[key] || 0;
    let level = 0;
    if (count >= 1) level = 1;
    if (count >= 3) level = 2;
    if (count >= 5) level = 3;

    const cell = document.createElement("div");
    cell.className = "heat-cell";
    cell.dataset.level = level;
    cell.title = `${d.toDateString()} — ${count} set${count === 1 ? "" : "s"}`;
    heatmap.appendChild(cell);
  });
}

// ---------- EXERCISE AUTOCOMPLETE ----------
function renderExerciseList() {
  const list = document.getElementById("exerciseList");
  const names = [...new Set(entries.map(e => e.exercise))];
  list.innerHTML = names.map(n => `<option value="${n}"></option>`).join("");
}

// ---------- ENTRY LIST (today only) ----------
function renderEntryList() {
  const listEl = document.getElementById("entryList");
  const key = todayKey();
  const todays = entries.filter(e => e.date === key).sort((a, b) => b.timestamp - a.timestamp);

  if (todays.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No sets logged yet today. Add your first one.</li>`;
    return;
  }

  listEl.innerHTML = todays.map(e => `
    <li class="entry-item" data-id="${e.id}">
      <div>
        <div class="entry-name">${escapeHtml(e.exercise)}</div>
        <div class="entry-meta">${e.weight}kg × ${e.reps} reps × ${e.sets} set${e.sets > 1 ? "s" : ""}</div>
      </div>
      <button class="entry-delete" aria-label="Delete entry" data-id="${e.id}">✕</button>
    </li>
  `).join("");

  listEl.querySelectorAll(".entry-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- ACTIONS ----------
function addEntry(exercise, weight, reps, sets) {
  const now = new Date();
  entries.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    exercise: exercise.trim(),
    weight: Number(weight),
    reps: Number(reps),
    sets: Number(sets),
    date: todayKey(now),
    timestamp: now.getTime()
  });
  saveEntries();
  renderAll();
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  renderAll();
}

// ---------- FORM ----------
document.getElementById("logForm").addEventListener("submit", (evt) => {
  evt.preventDefault();
  const exercise = document.getElementById("exerciseInput").value;
  const weight = document.getElementById("weightInput").value;
  const reps = document.getElementById("repsInput").value;
  const sets = document.getElementById("setsInput").value;

  if (!exercise || weight === "" || reps === "" || sets === "") return;

  addEntry(exercise, weight, reps, sets);
  evt.target.reset();
  document.getElementById("setsInput").value = 1;
  document.getElementById("exerciseInput").focus();
});

// ---------- INIT ----------
function renderAll() {
  renderStats();
  renderStreak();
  renderHeatmap();
  renderExerciseList();
  renderEntryList();
}

document.getElementById("todayDate").textContent = formatDateReadable();
showRandomQuote();
renderAll();
