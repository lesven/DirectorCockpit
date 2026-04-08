import { load, data } from './js/store.js';
import { renderAll } from './js/render.js';
import { bindEvents, initToggleFertig, initToggleTeams } from './js/events.js';
import { loadViewState } from './js/cookie.js';
import { applyViewState, filterState } from './js/sort.js';
import { dom } from './js/dom.js';
import { openDetail, closeDetail } from './js/detail.js';
import { parseHash } from './js/routing.js';
import { findById } from './js/utils.js';

function showToast(message) {
  const el = dom.toast;
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  // Restart animation
  el.style.animation = 'none';
  el.offsetHeight; // force reflow
  el.style.animation = '';
  setTimeout(() => { el.hidden = true; }, 4000);
}

function handleDeepLink() {
  const route = parseHash();
  if (!route) return;
  const ini = findById(data.initiatives, route.id);
  if (ini) {
    openDetail(route.id, { pushState: false });
  } else {
    console.warn(`Deep-Link: Initiative ${route.id} nicht gefunden`);
    showToast(`Initiative nicht gefunden (ID ${route.id})`);
  }
}

load().then(() => {
  const saved = loadViewState();
  if (saved) {
    // Verwaiste Team-ID verwerfen
    if (saved.filter && saved.filter.team) {
      const teamExists = data.teams.some((t) => String(t.id) === saved.filter.team);
      if (!teamExists) saved.filter.team = '';
    }
    applyViewState(saved);
    // Filter-UI VOR renderAll befüllen, damit populateTeamFilter()
    // den richtigen currentVal liest und filterState.team nicht überschreibt.
    dom.filterName.value = filterState.name;
    dom.filterTeam.value = filterState.team;
    dom.filterStatus.value = filterState.status;
    dom.filterProjektstatus.value = filterState.projektstatus;
    dom.filterReset.classList.toggle(
      'active',
      !!(filterState.name || filterState.team || filterState.status || filterState.projektstatus),
    );
  }
  renderAll();
  bindEvents();
  initToggleFertig();
  initToggleTeams(saved?.teamsCollapsed === true);
  // Loading-Banner ausblenden nach erfolgreichem Laden
  if (dom.loadingBanner) dom.loadingBanner.hidden = true;

  // Deep-Link auswerten (Hash in URL)
  handleDeepLink();

  // Browser-Zurück/Vorwärts unterstützen
  window.addEventListener('popstate', () => {
    const route = parseHash();
    if (route) {
      const ini = findById(data.initiatives, route.id);
      if (ini) {
        openDetail(route.id, { pushState: false });
      } else {
        closeDetail({ pushState: false });
        showToast(`Initiative nicht gefunden (ID ${route.id})`);
      }
    } else {
      closeDetail({ pushState: false });
    }
  });
});
