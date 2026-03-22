export const CONFIG = {
  API_URL: '/api/cockpit',
  SAVE_DEBOUNCE_MS: 400,
  SAVE_INDICATOR_MS: 1400,
  ERROR_INDICATOR_MS: 3000,
  FOCUS_DELAY_MS: 50,
};

export const STATUSES = ['fertig', 'yellow', 'grey', 'ungeplant'];
export const STATUS_LABELS = { fertig: 'Fertig', yellow: 'In Arbeit', grey: 'Geplant', ungeplant: 'Ungeplant' };
export const STATUS_ORDER = { fertig: 0, yellow: 1, grey: 2, ungeplant: 3 };
export const PROJECT_STATUS_ORDER = { ok: 0, kritisch: 1 };

export const ENTITY_DEFS = {
  teams: {
    labelField: 'name',
    fallback: 'dieses Team',
    defaults: { name: 'Neues Team', sub: '', status: 'grey', fokus: '', schritt: '' },
    focusSelector: '.team-name',
  },
  initiatives: {
    labelField: 'name',
    fallback: 'diese Initiative',
    defaults: { name: '', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '' },
    focusSelector: '.ini-name',
  },
  nicht_vergessen: {
    labelField: 'title',
    fallback: 'diesen Eintrag',
    defaults: { title: '', body: '' },
    focusSelector: '.nv-title',
  },
};
