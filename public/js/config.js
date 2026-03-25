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

export const WSJF_SCALE = [1, 2, 3, 5, 8, 13, 21];

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
