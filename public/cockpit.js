import { load, data } from './js/store.js';
import { renderAll } from './js/render.js';
import { bindEvents } from './js/events.js';
import { loadViewState } from './js/cookie.js';
import { applyViewState, filterState } from './js/sort.js';

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
    document.getElementById('filter-name').value = filterState.name;
    document.getElementById('filter-team').value = filterState.team;
    document.getElementById('filter-status').value = filterState.status;
    document.getElementById('filter-projektstatus').value = filterState.projektstatus;
    document
      .getElementById('filter-reset')
      .classList.toggle(
        'active',
        !!(filterState.name || filterState.team || filterState.status || filterState.projektstatus),
      );
  }
  renderAll();
  bindEvents();
  // Loading-Banner ausblenden nach erfolgreichem Laden
  const loadingBanner = document.getElementById('loading-banner');
  if (loadingBanner) loadingBanner.hidden = true;
});
