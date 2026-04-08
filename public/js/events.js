import { data, save, dSave } from './store.js';
import { addEntity, removeEntity, cycleStatus } from './crud.js';
import { findById } from './utils.js';
import { sortInis, sortState, filterState, resetPage, pageState, setHideFertig, isHideFertig, setShowOnlyBlocked, isShowOnlyBlocked } from './sort.js';
import { renderAll, renderEntity, autoGrow } from './render.js';
import { exportJSON, importJSON } from './io.js';
import { openDetail, bindDetailEvents } from './detail.js';
import { saveViewState } from './cookie.js';
import { dom } from './dom.js';

let teamsCollapsed = false;

export function isTeamsCollapsed() {
  return teamsCollapsed;
}

/** Liest id, field, source aus data-Attributen eines Elements. */
function parseDataset(el) {
  return {
    id: +el.dataset.id,
    field: el.dataset.field,
    source: el.dataset.source,
  };
}

function updateResetBtn() {
  const active = filterState.name || filterState.team || filterState.status || filterState.projektstatus || filterState.kunde || pageState.current > 1;
  dom.filterReset.classList.toggle('active', !!active);
  dom.iniFilters.classList.toggle('has-active-filters', !!active);
}

function applyFilter() {
  updateResetBtn();
  resetPage();
  renderEntity('initiatives');
  saveViewState(filterState, sortState, isHideFertig(), teamsCollapsed, isShowOnlyBlocked());
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
      sortInis(target.dataset.sort, teamsCollapsed);
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
        updateResetBtn();
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

function updateToggleFertigBtn() {
  if (!dom.toggleFertig) return;
  const hiding = isHideFertig();
  dom.toggleFertig.classList.toggle('active', hiding);
  dom.toggleFertig.textContent = hiding ? 'Fertige ausblenden' : 'Fertige einblenden';
}

function handleToggleFertig() {
  setHideFertig(!isHideFertig());
  updateToggleFertigBtn();
  resetPage();
  renderEntity('initiatives');
  saveViewState(filterState, sortState, isHideFertig(), teamsCollapsed, isShowOnlyBlocked());
}

function updateToggleBlockedBtn() {
  if (!dom.toggleBlocked) return;
  const active = isShowOnlyBlocked();
  dom.toggleBlocked.classList.toggle('active', active);
}

function handleToggleBlocked() {
  setShowOnlyBlocked(!isShowOnlyBlocked());
  updateToggleBlockedBtn();
  resetPage();
  renderEntity('initiatives');
  saveViewState(filterState, sortState, isHideFertig(), teamsCollapsed, isShowOnlyBlocked());
}

function updateToggleTeamsBtn() {
  if (!dom.toggleTeams) return;
  dom.toggleTeams.classList.toggle('collapsed', teamsCollapsed);
  dom.toggleTeams.title = teamsCollapsed ? 'Teams ausklappen' : 'Teams einklappen';
}

function handleToggleTeams() {
  teamsCollapsed = !teamsCollapsed;
  dom.teamsGrid.classList.toggle('collapsed', teamsCollapsed);
  updateToggleTeamsBtn();
  saveViewState(filterState, sortState, isHideFertig(), teamsCollapsed, isShowOnlyBlocked());
}

function handleFilterReset() {
  filterState.name = '';
  filterState.team = '';
  filterState.status = '';
  filterState.projektstatus = '';
  filterState.kunde = '';
  dom.filterName.value = '';
  dom.filterTeam.value = '';
  if (dom.filterKunde) dom.filterKunde.value = '';
  dom.filterStatus.value = '';
  dom.filterProjektstatus.value = '';
  applyFilter();
}

export function initToggleFertig() {
  updateToggleFertigBtn();
  updateToggleBlockedBtn();
}

export function initToggleTeams(collapsed = false) {
  teamsCollapsed = collapsed;
  if (collapsed && dom.teamsGrid) {
    // Zustand ohne Animation beim Start setzen
    dom.teamsGrid.style.transition = 'none';
    dom.teamsGrid.classList.add('collapsed');
    requestAnimationFrame(() => {
      dom.teamsGrid.style.transition = '';
    });
  }
  updateToggleTeamsBtn();
}

function handleInlineInput(e) {
  const el = e.target;
  if (el.tagName === 'SELECT') return;
  if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

  const { id, field, source } = parseDataset(el);

  if (el.classList.contains('ini-notiz') || el.classList.contains('ini-schritt')) autoGrow(el);

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
  item[field] = (field === 'team' || field === 'customer') ? (el.value ? +el.value : null) : el.value;

  if (source === 'initiatives' && (field === 'status' || field === 'projektstatus')) {
    renderEntity('initiatives');
  }
  dSave();
}

export function bindEvents() {
  document.addEventListener('click', handleActionClick);
  dom.filterName.addEventListener('input', handleFilterInput);
  [dom.filterTeam, dom.filterKunde, dom.filterStatus, dom.filterProjektstatus].filter(Boolean).forEach((el) => {
    el.addEventListener('change', handleFilterChange);
  });
  dom.filterReset.addEventListener('click', handleFilterReset);
  if (dom.toggleFertig) dom.toggleFertig.addEventListener('click', handleToggleFertig);
  if (dom.toggleBlocked) dom.toggleBlocked.addEventListener('click', handleToggleBlocked);
  if (dom.toggleTeams) dom.toggleTeams.addEventListener('click', handleToggleTeams);
  document.addEventListener('input', handleInlineInput);
  document.addEventListener('change', handleInlineChange);
  bindDetailEvents();
}
