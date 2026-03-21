import { data, save, dSave } from './store.js';
import { addEntity, removeEntity, cycleStatus, findById } from './crud.js';
import { sortInis } from './sort.js';
import { renderAll, renderEntity, autoGrow } from './render.js';
import { exportJSON, importJSON } from './io.js';

export function bindEvents() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id ? +target.dataset.id : null;

    switch (action) {
      case 'editKW': {
        const v = prompt('Kalenderwoche:', data.kw || '');
        if (v !== null) { data.kw = v.trim(); save(); renderAll(); }
        break;
      }
      case 'addEntity':     addEntity(target.dataset.type); break;
      case 'removeEntity':  removeEntity(target.dataset.type, id); break;
      case 'cycleStatus':   cycleStatus(id, target.dataset.team === 'true'); break;
      case 'sortInis':      sortInis(target.dataset.sort); renderEntity('inis'); break;
      case 'exportJSON':    exportJSON(); break;
      case 'importJSON':    importJSON(); break;
    }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.tagName === 'SELECT') return;
    if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

    const id = +el.dataset.id;
    const field = el.dataset.field;
    const source = el.dataset.source;

    if (el.classList.contains('ini-notiz')) autoGrow(el);

    const item = findById(data[source], id);
    if (!item) return;
    item[field] = el.value;
    dSave();
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.tagName !== 'SELECT') return;
    if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

    const id = +el.dataset.id;
    const field = el.dataset.field;
    const source = el.dataset.source;

    const item = findById(data[source], id);
    if (!item) return;
    item[field] = (field === 'team') ? (el.value ? +el.value : null) : el.value;

    if (source === 'inis' && (field === 'status' || field === 'projektstatus')) {
      renderEntity('inis');
    }
    dSave();
  });
}
