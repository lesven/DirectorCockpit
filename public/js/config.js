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

export const DEFAULT_DATA = {
  kw: '',
  teams: [
    { id: 1, name: 'IT Service', sub: 'Endgeräte & User', status: 'green', fokus: '', schritt: '' },
    { id: 2, name: 'IT Infrastruktur', sub: 'RZ, Netzwerk, Betrieb', status: 'green', fokus: '', schritt: '' },
    { id: 3, name: 'DevOps', sub: 'K8s, GitLab, Azure DevOps', status: 'yellow', fokus: '', schritt: '' },
    { id: 4, name: 'Konzernapplikationen', sub: 'Navision, MSSQL, CRM', status: 'green', fokus: '', schritt: '' },
  ],
  initiatives: [
    { id: 1, name: 'Update Azure DevOps', team: 3, status: 'yellow', schritt: 'Versionsplanung abschließen', frist: '', notiz: '' },
    { id: 2, name: 'Update GitLab', team: 3, status: 'yellow', schritt: 'Upgrade-Pfad definieren', frist: '', notiz: '' },
    { id: 3, name: 'Onboarding SVA Fortinet', team: 2, status: 'green', schritt: 'Kick-off durchführen', frist: '', notiz: '' },
    { id: 4, name: 'Onboarding SVA MSSQL', team: 4, status: 'green', schritt: 'Anforderungen & SLA klären', frist: '', notiz: '' },
  ],
  nicht_vergessen: [],
};
