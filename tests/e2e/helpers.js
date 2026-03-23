import { Selector, ClientFunction, t } from 'testcafe';

/** Base URL - uses TestCafe baseUrl from config */
export const BASE_URL = 'http://localhost:8089/cockpit.html';

const SEED_PAYLOAD = {
  kw: '12',
  teams: [
    { id: 1001, name: 'Alpha Team', sub: 'Frontend', status: 'grey', fokus: 'Sprint 42', schritt: 'Review' },
    { id: 1002, name: 'Beta Team', sub: 'Backend', status: 'yellow', fokus: 'API rebuild', schritt: 'Design' },
  ],
  initiatives: [
    {
      id: 2001,
      name: 'Projekt Gamma',
      team: 1001,
      status: 'yellow',
      projektstatus: 'ok',
      schritt: 'Prototyp',
      frist: '15.04',
      notiz: 'Wichtig',
      businessValue: 8,
      timeCriticality: 5,
      riskReduction: 3,
      jobSize: 5,
    },
    {
      id: 2002,
      name: 'Projekt Delta',
      team: 1002,
      status: 'grey',
      projektstatus: 'kritisch',
      schritt: 'Planung',
      frist: '01.06',
      notiz: '',
      businessValue: null,
      timeCriticality: null,
      riskReduction: null,
      jobSize: null,
    },
    {
      id: 2003,
      name: 'Projekt Epsilon',
      team: null,
      status: 'fertig',
      projektstatus: 'ok',
      schritt: '',
      frist: '',
      notiz: 'Abgeschlossen',
      businessValue: 3,
      timeCriticality: 2,
      riskReduction: 1,
      jobSize: 2,
    },
  ],
  nicht_vergessen: [
    { id: 3001, title: 'Budget Review', body: 'Q2 Zahlen prüfen' },
    { id: 3002, title: 'Stakeholder Update', body: 'Montag versenden' },
  ],
  risks: [
    {
      id: 4001,
      initiative: 2001,
      bezeichnung: 'Lieferantenausfall',
      beschreibung: 'Hauptlieferant könnte ausfallen',
      eintrittswahrscheinlichkeit: 3,
      schadensausmass: 4,
      roamStatus: 'mitigated',
      roamNotiz: 'Fallback-Lieferant vertraglich gesichert',
    },
    {
      id: 4002,
      initiative: 2001,
      bezeichnung: 'Budgetüberschreitung',
      beschreibung: 'Scope könnte wachsen',
      eintrittswahrscheinlichkeit: 2,
      schadensausmass: 3,
      roamStatus: null,
      roamNotiz: '',
    },
  ],
};

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).then((r) => r.ok);
});

const reloadPage = ClientFunction(() => {
  location.reload();
});

/**
 * Seeds data via API and navigates to the cockpit page.
 * Call this in beforeEach hooks.
 */
export async function setupTest() {
  await seedViaAPI(JSON.stringify(SEED_PAYLOAD));
  await t.deleteCookies('cockpit_view');
  await reloadPage();
  // Wait for page to re-render with seeded data
  await Selector('#teams-grid .team-card', { timeout: 5000 })();
}

/**
 * Waits for the save indicator to appear and then disappear.
 */
export async function waitForSave() {
  const indicator = Selector('#save-ind');
  await t.expect(indicator.hasClass('show')).ok('Save indicator should appear', { timeout: 3000 });
}

/**
 * Waits for an element to be removed from the DOM or become invisible.
 */
export async function waitForRemoval(selector) {
  await t.expect(selector.exists).notOk({ timeout: 3000 });
}

// ---- Common Selectors ----

export const selectors = {
  // Header
  kwBadge: Selector('#kw-badge'),
  saveIndicator: Selector('#save-ind'),

  // Teams
  teamsGrid: Selector('#teams-grid'),
  teamCards: Selector('.team-card'),
  addTeamBtn: Selector('[data-action="addEntity"][data-type="teams"]'),
  teamNameInputs: Selector('.team-name'),
  teamStatusDots: Selector('[data-action="cycleStatus"][data-team="true"]'),
  teamDeleteBtns: Selector('[data-action="removeEntity"][data-type="teams"]'),

  // Initiatives
  iniBody: Selector('#ini-body'),
  iniRows: Selector('.ini-row'),
  addIniBtn: Selector('[data-action="addEntity"][data-type="initiatives"]'),
  iniNameInputs: Selector('.ini-name'),

  // Filters
  filterName: Selector('#filter-name'),
  filterTeam: Selector('#filter-team'),
  filterStatus: Selector('#filter-status'),
  filterProjektstatus: Selector('#filter-projektstatus'),
  filterReset: Selector('#filter-reset'),

  // Sort headers
  sortHeaders: Selector('.ini-table th.sortable'),

  // Nicht vergessen
  nvGrid: Selector('#nv-grid'),
  nvCards: Selector('.nv-card'),
  addNvBtn: Selector('[data-action="addEntity"][data-type="nicht_vergessen"]'),
  nvTitleInputs: Selector('.nv-title'),
  nvBodyTextareas: Selector('.nv-body'),
  nvDeleteBtns: Selector('[data-action="removeEntity"][data-type="nicht_vergessen"]'),

  // Detail modal
  detailBackdrop: Selector('#detail-backdrop'),
  detailModal: Selector('#detail-modal'),
  detailClose: Selector('#detail-close'),
  detailBtns: Selector('.detail-btn'),

  // Footer
  importBtn: Selector('[data-action="importJSON"]'),
  exportBtn: Selector('[data-action="exportJSON"]'),

  // Risk-Seite
  riskBtns: Selector('[data-action="openRisks"]'),
  riskPage: Selector('#risk-page'),
  riskBack: Selector('#risk-back'),
  riskAddBtn: Selector('#risk-add'),
  riskCards: Selector('.risk-card'),
  riskRoamSelects: Selector('[data-risk-field="roamStatus"]'),
  riskRoamNotiz: Selector('[data-risk-field="roamNotiz"]'),
  roamBadges: Selector('.roam-badge'),
  riskBezeichnungInputs: Selector('[data-risk-field="bezeichnung"]'),
  riskBeschreibungTextareas: Selector('[data-risk-field="beschreibung"]'),
  riskWahrscheinlichkeitSelects: Selector('[data-risk-field="eintrittswahrscheinlichkeit"]'),
  riskSchadensausmasSelects: Selector('[data-risk-field="schadensausmass"]'),
  riskDeleteBtns: Selector('[data-action="removeRisk"]'),
  riskScoreBadges: Selector('.risk-badge'),
};
