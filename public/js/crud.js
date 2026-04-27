import { ENTITY_DEFS, STATUSES, CONFIG } from './config.js';
import { data, createEntity, deleteEntity, saveEntity } from './store.js';
import { renderEntity } from './render.js';
import { findById, generateId } from './utils.js';
import { openDetail } from './detail.js';

export async function addEntity(type) {
  const def = ENTITY_DEFS[type];
  const id = generateId();
  const entityData = { id, ...def.defaults };

  const created = await createEntity(type, entityData);
  if (!created) return;

  data[type].push(created);
  renderEntity(type);

  if (type === 'initiatives') {
    openDetail(created.id);
    return;
  }

  if (def.focusSelector) {
    setTimeout(() => {
      const inputs = document.querySelectorAll(def.focusSelector);
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, CONFIG.FOCUS_DELAY_MS);
  }
}

export async function removeEntity(type, id) {
  const def = ENTITY_DEFS[type];
  const item = findById(data[type], id);
  const name = item && item[def.labelField] ? `\u201E${item[def.labelField]}\u201C` : def.fallback;
  if (!confirm(`${name} wirklich löschen?`)) return;

  const ok = await deleteEntity(type, id);
  if (!ok) return;

  data[type] = data[type].filter((x) => x.id !== id);
  if (type === 'initiatives') {
    data.risks = data.risks.filter((r) => r.initiative !== id);
    data.milestones = data.milestones.filter((m) => m.initiative !== id);
  }
  renderEntity(type);
}

export function cycleStatus(id, isTeam) {
  const type = isTeam ? 'teams' : 'initiatives';
  const arr = data[type];
  const item = findById(arr, id);
  if (!item) return;
  const idx = STATUSES.indexOf(item.status);
  item.status = STATUSES[(idx + 1) % STATUSES.length];
  saveEntity(type, id);
  renderEntity(type);
}
