import { CONFIG, DEFAULT_DATA } from './config.js';

export let data;

let saveTimer;
let saveInFlight = false;
let saveQueued = false;

export async function load() {
  try {
    const res = await fetch(CONFIG.API_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  } catch (e) {
    console.warn('Backend nicht erreichbar, verwende Standarddaten:', e);
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

export function save() {
  if (saveInFlight) {
    saveQueued = true;
    return;
  }

  saveInFlight = true;
  const ind = document.getElementById('save-ind');

  fetch(CONFIG.API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ind.textContent = 'gespeichert';
    ind.classList.add('show');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => ind.classList.remove('show'), CONFIG.SAVE_INDICATOR_MS);
  }).catch(err => {
    console.error('Speichern fehlgeschlagen:', err);
    ind.textContent = 'Fehler!';
    ind.classList.add('show');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => ind.classList.remove('show'), CONFIG.ERROR_INDICATOR_MS);
  }).finally(() => {
    saveInFlight = false;
    if (saveQueued) {
      saveQueued = false;
      save();
    }
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const dSave = debounce(save, CONFIG.SAVE_DEBOUNCE_MS);
