import { CONFIG } from './config.js';
import { debounce } from './utils.js';
import { dom } from './dom.js';
import { redirectToLogin } from './auth.js';

export const data = { kw: '', teams: [], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] };

let indicatorTimer;

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
    const res = await fetch(CONFIG.API_URL, { credentials: 'same-origin' });
    if (res.status === 401) {
      redirectToLogin();
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    setData(await res.json());
  } catch (e) {
    console.warn('Backend nicht erreichbar, lade Standarddaten:', e);
    showOfflineBanner();
    try {
      const fallback = await fetch('/default_data.json');
      setData(await fallback.json());
    } catch {
      setData({ kw: '', teams: [], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });
    }
  }
}

function showOfflineBanner() {
  let banner = document.getElementById('offline-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px 16px;' +
      'background:#b91c1c;color:#fff;text-align:center;font-size:14px;';
    banner.textContent = '⚠ Backend nicht erreichbar – Offline-Standarddaten werden angezeigt.';
    document.body.prepend(banner);
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

// ─── Per-Entity REST Operations ──────────────────────────────

const _debounceTimers = new Map();
const _savePromises = new Map();

async function _doEntitySave(type, id, entityData) {
  const url = `${CONFIG.ENTITY_URLS[type]}/${id}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entityData),
      credentials: 'same-origin',
    });
    if (res.status === 401) { redirectToLogin(); return; }
    if (res.status === 403) {
      showIndicator('Zugriff verweigert!', CONFIG.ERROR_INDICATOR_MS);
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showIndicator('gespeichert', CONFIG.SAVE_INDICATOR_MS);
  } catch (err) {
    console.error('Speichern fehlgeschlagen:', err);
    showIndicator('Fehler!', CONFIG.ERROR_INDICATOR_MS);
  }
}

export function saveEntity(type, id) {
  const arr = data[type];
  if (!arr) return;
  const entity = arr.find((e) => e.id === id);
  if (!entity) return;

  const key = `${type}:${id}`;
  clearTimeout(_debounceTimers.get(key));
  _debounceTimers.set(key, setTimeout(() => {
    _debounceTimers.delete(key);
    const p = _doEntitySave(type, id, entity).finally(() => {
      if (_savePromises.get(key) === p) _savePromises.delete(key);
    });
    _savePromises.set(key, p);
  }, CONFIG.SAVE_DEBOUNCE_MS));
}

export function dSaveEntity(type, id) {
  saveEntity(type, id);
}

export async function createEntity(type, entityData) {
  const url = CONFIG.ENTITY_URLS[type];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entityData),
      credentials: 'same-origin',
    });
    if (res.status === 401) { redirectToLogin(); return null; }
    if (res.status === 403) {
      showIndicator('Zugriff verweigert!', CONFIG.ERROR_INDICATOR_MS);
      return null;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const created = await res.json();
    showIndicator('gespeichert', CONFIG.SAVE_INDICATOR_MS);
    return created;
  } catch (err) {
    console.error('Erstellen fehlgeschlagen:', err);
    showIndicator('Fehler!', CONFIG.ERROR_INDICATOR_MS);
    return null;
  }
}

export async function deleteEntity(type, id) {
  const url = `${CONFIG.ENTITY_URLS[type]}/${id}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (res.status === 401) { redirectToLogin(); return false; }
    if (res.status === 403) {
      showIndicator('Zugriff verweigert!', CONFIG.ERROR_INDICATOR_MS);
      return false;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showIndicator('gespeichert', CONFIG.SAVE_INDICATOR_MS);
    return true;
  } catch (err) {
    console.error('Löschen fehlgeschlagen:', err);
    showIndicator('Fehler!', CONFIG.ERROR_INDICATOR_MS);
    return false;
  }
}

export async function saveMetadata() {
  try {
    const res = await fetch(CONFIG.ENTITY_URLS.metadata, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kw: data.kw }),
      credentials: 'same-origin',
    });
    if (res.status === 401) { redirectToLogin(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showIndicator('gespeichert', CONFIG.SAVE_INDICATOR_MS);
  } catch (err) {
    console.error('Metadata-Speichern fehlgeschlagen:', err);
    showIndicator('Fehler!', CONFIG.ERROR_INDICATOR_MS);
  }
}

// Legacy compatibility: save() and dSave() now no-ops for import flows that reload after
export function save() {
  // noop – individual entity saves handle persistence
}

export const dSave = debounce(save, CONFIG.SAVE_DEBOUNCE_MS);
