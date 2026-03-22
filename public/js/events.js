import { data, save, dSave } from './store.js';
import { addEntity, removeEntity, cycleStatus } from './crud.js';
import { findById } from './utils.js';
import { sortInis, sortState, filterState, resetPage, pageState } from './sort.js';
import { renderAll, renderEntity, autoGrow } from './render.js';
import { exportJSON, importJSON } from './io.js';
import { openDetail, bindDetailEvents } from './detail.js';
import { saveViewState } from './cookie.js';

/** Liest id, field, source aus data-Attributen eines Elements. */
function parseDataset(el) {
  return {
    id: +el.dataset.id,
    field: el.dataset.field,
    source: el.dataset.source,
  };
}

function updateResetBtn() {
  const active = filterState.name || filterState.team || filterState.status || filterState.projektstatus;
  document.getElementById('filter-reset').classList.toggle('active', !!active);
}

function applyFilter() {
  updateResetBtn();
  resetPage();
  renderEntity('initiatives');
  saveViewState(filterState, sortState);
}

function handleActionClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id ? +target.dataset.id : null;

  switch (action) {
    case 'editKW': {
      const v = prompt('Kalenderwoche:', data.kw || '');
      if (v !== null) {
        data.kw = v.trim();
        save();
        renderAll();
      }
      break;
    }
    case 'addEntity':
      addEntity(target.dataset.type);
      break;
    case 'removeEntity':
      removeEntity(target.dataset.type, id);
      break;
    case 'cycleStatus':
      cycleStatus(id, target.dataset.team === 'true');
      break;
    case 'sortInis':
      sortInis(target.dataset.sort);
      resetPage();
      renderEntity('initiatives');
      break;
    case 'openDetail':
      openDetail(id);
      break;
    case 'gotoPage': {
      const p = +target.dataset.page;
      if (!isNaN(p) && p >= 1) {
        pageState.current = p;
        renderEntity('initiatives');
      }
      break;
    }
    case 'exportJSON':
      exportJSON();
      break;
    case 'importJSON':
      importJSON();
      break;
  }
}

function handleFilterInput(e) {
  filterState.name = e.target.value;
  applyFilter();
}

function handleFilterChange(e) {
  const key = e.target.id.replace('filter-', '');
  filterState[key] = e.target.value;
  applyFilter();
}

function handleFilterReset() {
  filterState.name = '';
  filterState.team = '';
  filterState.status = '';
  filterState.projektstatus = '';
  document.getElementById('filter-name').value = '';
  document.getElementById('filter-team').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-projektstatus').value = '';
  applyFilter();
}

function handleInlineInput(e) {
  const el = e.target;
  if (el.tagName === 'SELECT') return;
  if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

  const { id, field, source } = parseDataset(el);

  if (el.classList.contains('ini-notiz')) autoGrow(el);

  const item = findById(data[source], id);
  if (!item) return;
  item[field] = el.value;
  dSave();
}

function handleInlineChange(e) {
  const el = e.target;
  if (el.tagName !== 'SELECT') return;
  if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

  const { id, field, source } = parseDataset(el);

  const item = findById(data[source], id);
  if (!item) return;
  item[field] = field === 'team' ? (el.value ? +el.value : null) : el.value;

  if (source === 'initiatives' && (field === 'status' || field === 'projektstatus')) {
    renderEntity('initiatives');
  }
  dSave();
}

export function bindEvents() {
  document.addEventListener('click', handleActionClick);
  document.getElementById('filter-name').addEventListener('input', handleFilterInput);
  ['filter-team', 'filter-status', 'filter-projektstatus'].forEach((id) => {
    document.getElementById(id).addEventListener('change', handleFilterChange);
  });
  document.getElementById('filter-reset').addEventListener('click', handleFilterReset);
  document.addEventListener('input', handleInlineInput);
  document.addEventListener('change', handleInlineChange);
  bindDetailEvents();
}
