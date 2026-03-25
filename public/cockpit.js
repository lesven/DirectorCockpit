import { load, data } from './js/store.js';
import { renderAll } from './js/render.js';
import { bindEvents } from './js/events.js';
import { loadViewState } from './js/cookie.js';
import { applyViewState, filterState } from './js/sort.js';
import { dom } from './js/dom.js';

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
  // Loading-Banner ausblenden nach erfolgreichem Laden
  if (dom.loadingBanner) dom.loadingBanner.hidden = true;
});
