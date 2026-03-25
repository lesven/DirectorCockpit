import { CONFIG } from './config.js';
import { debounce } from './utils.js';
import { dom } from './dom.js';

export const data = { kw: '', teams: [], initiatives: [], nicht_vergessen: [], risks: [] };

let indicatorTimer;
let savePromise = null;
let saveQueued = false;

/**
 * Ersetzt den Inhalt von data durch newData (in-place),
 * damit alle Module dieselbe Objekt-Referenz behalten.
 */
export function setData(newData) {
  for (const k in data) delete data[k];
  Object.assign(data, newData);
}

export async function load() {
  try {
    const res = await fetch(CONFIG.API_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    setData(await res.json());
  } catch (e) {
    console.warn('Backend nicht erreichbar, lade Standarddaten:', e);
    try {
      const fallback = await fetch('/default_data.json');
      setData(await fallback.json());
    } catch {
      setData({ kw: '', teams: [], initiatives: [], nicht_vergessen: [], risks: [] });
    }
  }
}

function showIndicator(text, duration) {
  dom.saveIndicators.forEach((ind) => {
    ind.textContent = text;
    ind.classList.add('show');
  });
  clearTimeout(indicatorTimer);
  indicatorTimer = setTimeout(
    () => dom.saveIndicators.forEach((ind) => ind.classList.remove('show')),
    duration,
  );
}

async function _doSave() {
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showIndicator('gespeichert', CONFIG.SAVE_INDICATOR_MS);
  } catch (err) {
    console.error('Speichern fehlgeschlagen:', err);
    showIndicator('Fehler!', CONFIG.ERROR_INDICATOR_MS);
  }
}

export function save() {
  if (savePromise) {
    saveQueued = true;
    return;
  }
  saveQueued = false;
  savePromise = _doSave().finally(() => {
    savePromise = null;
    if (saveQueued) save();
  });
}

export const dSave = debounce(save, CONFIG.SAVE_DEBOUNCE_MS);
