import { ENTITY_DEFS, STATUSES, CONFIG } from './config.js';
import { data, save } from './store.js';
import { renderEntity } from './render.js';

export function findById(arr, id) {
  return arr.find(x => x.id === id);
}

export function addEntity(type) {
  const def = ENTITY_DEFS[type];
  const id = Date.now();
  data[type].push({ id, ...def.defaults });
  save();
  renderEntity(type);

  if (def.focusSelector) {
    setTimeout(() => {
      const inputs = document.querySelectorAll(def.focusSelector);
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, CONFIG.FOCUS_DELAY_MS);
  }
}

export function removeEntity(type, id) {
  const def = ENTITY_DEFS[type];
  const item = findById(data[type], id);
  const name = item && item[def.labelField] ? `\u201E${item[def.labelField]}\u201C` : def.fallback;
  if (!confirm(`${name} wirklich löschen?`)) return;
  data[type] = data[type].filter(x => x.id !== id);
  save();
  renderEntity(type);
}

export function cycleStatus(id, isTeam) {
  const arr = isTeam ? data.teams : data.initiatives;
  const item = findById(arr, id);
  if (!item) return;
  const idx = STATUSES.indexOf(item.status);
  item.status = STATUSES[(idx + 1) % STATUSES.length];
  save();
  renderEntity(isTeam ? 'teams' : 'initiatives');
}
