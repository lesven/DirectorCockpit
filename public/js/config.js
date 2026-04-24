export const CONFIG = {
  API_URL: '/api/cockpit',
  LOGIN_URL: '/api/login',
  LOGOUT_URL: '/api/logout',
  ME_URL: '/api/me',
  LOGIN_PAGE: '/login.html',
  SAVE_DEBOUNCE_MS: 400,
  SAVE_INDICATOR_MS: 1400,
  ERROR_INDICATOR_MS: 3000,
  FOCUS_DELAY_MS: 50,
  ENTITY_URLS: {
    teams: '/api/teams',
    initiatives: '/api/initiatives',
    milestones: '/api/milestones',
    risks: '/api/risks',
    nicht_vergessen: '/api/nicht-vergessen',
    kunden: '/api/kunden',
    metadata: '/api/metadata',
  },
};

export const STATUSES = ['fertig', 'yellow', 'grey', 'ungeplant'];
export const STATUS_LABELS = { fertig: 'Fertig', yellow: 'In Arbeit', grey: 'Geplant', ungeplant: 'Ungeplant' };
export const STATUS_ORDER = { fertig: 0, yellow: 1, grey: 2, ungeplant: 3 };
export const STATUS_OPTIONS = [
  { value: 'fertig',     label: 'Fertig' },
  { value: 'yellow',    label: 'In Arbeit' },
  { value: 'grey',      label: 'Geplant' },
  { value: 'ungeplant', label: 'Ungeplant' },
];
export const STATUS_CSS_MAP = { fertig: 'pill-green', yellow: 'pill-yellow', grey: 'pill-grey', ungeplant: 'pill-red' };

export const PROJECT_STATUS_ORDER = { ok: 0, kritisch: 1 };

export const WSJF_SCALE = [1, 2, 3, 5, 8, 13, 21];
export const WSJF_FIELDS = ['businessValue', 'timeCriticality', 'riskReduction', 'jobSize'];

export const MILESTONE_STATUSES = ['offen', 'in_bearbeitung', 'erledigt', 'blockiert'];
export const MILESTONE_STATUS_LABELS = {
  offen:          'Offen',
  in_bearbeitung: 'In Bearbeitung',
  erledigt:       'Erledigt',
  blockiert:      'Blockiert',
};
export const MILESTONE_STATUS_OPTIONS = [
  { value: 'offen',           label: 'Offen' },
  { value: 'in_bearbeitung',  label: 'In Bearbeitung' },
  { value: 'erledigt',        label: 'Erledigt' },
  { value: 'blockiert',       label: 'Blockiert' },
];
export const MILESTONE_STATUS_CSS = {
  offen:          'ms-status-offen',
  in_bearbeitung: 'ms-status-in-bearbeitung',
  erledigt:       'ms-status-erledigt',
  blockiert:      'ms-status-blockiert',
};
export const MILESTONE_STATUS_COLORS = {
  offen:          { bg: '#e5e7eb', text: '#374151' },
  in_bearbeitung: { bg: '#fef3c7', text: '#92400e' },
  erledigt:       { bg: '#d1fae5', text: '#065f46' },
  blockiert:      { bg: '#fee2e2', text: '#991b1b' },
};

export const RISK_PROBABILITY_LABELS = {
  1: 'Sehr gering',
  2: 'Gering',
  3: 'Möglich',
  4: 'Wahrscheinlich',
  5: 'Sehr wahrscheinlich',
};

export const RISK_IMPACT_LABELS = {
  1: 'Vernachlässigbar',
  2: 'Gering',
  3: 'Merklich',
  4: 'Erheblich',
  5: 'Kritisch',
};

export const ROAM_STATUS_LABELS = {
  resolved: 'Resolved',
  owned: 'Owned',
  accepted: 'Accepted',
  mitigated: 'Mitigated',
};

export const ROAM_STATUS_CSS = {
  resolved: 'roam-resolved',
  owned: 'roam-owned',
  accepted: 'roam-accepted',
  mitigated: 'roam-mitigated',
};

export const RISK_LEVEL = [
  { max: 4, label: 'Gering', css: 'risk-low' },
  { max: 9, label: 'Mittel', css: 'risk-medium' },
  { max: 15, label: 'Hoch', css: 'risk-high' },
  { max: 25, label: 'Kritisch', css: 'risk-critical' },
];

export const ENTITY_DEFS = {
  teams: {
    labelField: 'name',
    fallback: 'dieses Team',
    defaults: { name: 'Neues Team', status: 'grey', fokus: '', schritt: '' },
    focusSelector: '.team-name',
  },
  initiatives: {
    labelField: 'name',
    fallback: 'diese Initiative',
    defaults: {
      name: '',
      team: null,
      status: 'grey',
      projektstatus: 'ok',
      schritt: '',
      frist: '',
      notiz: '',
      businessValue: null,
      timeCriticality: null,
      riskReduction: null,
      jobSize: null,
    },
    focusSelector: '.ini-name',
  },
  nicht_vergessen: {
    labelField: 'title',
    fallback: 'diesen Eintrag',
    defaults: { title: '', body: '' },
    focusSelector: '.nv-title',
  },
};
