import { Selector, ClientFunction, t } from 'testcafe';

/** Base URL - uses TestCafe baseUrl from config */
export const BASE_URL = 'http://localhost:8089/cockpit.html';
export const LOGIN_URL = 'http://localhost:8089/login.html';
export const ADMIN_URL = 'http://localhost:8089/admin.html';

/** E2E test admin credentials — must exist in running Docker container */
export const E2E_ADMIN_EMAIL = 'e2e-admin@test.internal';
export const E2E_ADMIN_PASSWORD = 'E2eAdmin!2025X';

/** E2E test non-admin user credentials — created via Admin API in setupNonAdminUser() */
export const E2E_USER_EMAIL = 'e2e-user@test.internal';
export const E2E_USER_PASSWORD = 'E2eUser!2025X9';

const SEED_PAYLOAD = {
  kw: '12',
  kunden: [
    { id: 9001, name: 'Acme GmbH' },
    { id: 9002, name: 'Beta AG' },
  ],
  teams: [
    { id: 1001, name: 'Alpha Team', sub: 'Frontend', status: 'grey', fokus: 'Sprint 42', schritt: 'Review' },
    { id: 1002, name: 'Beta Team', sub: 'Backend', status: 'yellow', fokus: 'API rebuild', schritt: 'Design' },
  ],
  initiatives: [
    {
      id: 2001,
      name: 'Projekt Gamma',
      team: 1001,
      customer: 9001,
      status: 'yellow',
      projektstatus: 'ok',
      schritt: 'Prototyp',
      frist: '2026-04-15',
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
      customer: 9002,
      status: 'grey',
      projektstatus: 'kritisch',
      schritt: 'Planung',
      frist: '2026-06-01',
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
      customer: null,
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
  milestones: [
    {
      id: 5001,
      initiative: 2001,
      aufgabe: 'Konzept erstellen',
      owner: 'Max',
      status: 'erledigt',
      frist: '2026-03-01',
    },
    {
      id: 5002,
      initiative: 2001,
      aufgabe: 'Implementierung',
      owner: 'Anna',
      status: 'in_bearbeitung',
      frist: '2026-04-15',
    },
  ],
};

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: json,
  }).then((r) => r.ok);
});

const reloadPage = ClientFunction(() => {
  location.reload();
});

const clearViewState = ClientFunction(() => {
  localStorage.removeItem('cockpit_view');
});

/**
 * Logs in via the login page. Call this before navigating to other pages.
 * Waits until the redirect to cockpit.html completes (#teams-grid is present).
 */
export async function loginAsAdmin() {
  await t.navigateTo(LOGIN_URL);
  await t.typeText(Selector('#email'), E2E_ADMIN_EMAIL);
  await t.typeText(Selector('#password'), E2E_ADMIN_PASSWORD);
  await t.click(Selector('#login-btn'));
  // Wait until redirected to cockpit.html and page is ready
  await t.expect(Selector('#teams-grid').exists).ok('Login fehlgeschlagen oder Weiterleitung zu cockpit.html nicht erfolgt', { timeout: 8000 });
}

/**
 * Creates the non-admin test user via Admin API (idempotent — skips if user already exists).
 * Must be called while logged in as admin.
 */
const ensureNonAdminUser = ClientFunction((email, password) => {
  return fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password, roles: ['ROLE_USER'] }),
  }).then((r) => r.ok || r.status === 409 || r.status === 400);
});

/**
 * Logs in as a non-admin user. Creates the user first if needed.
 */
export async function loginAsUser() {
  // First, login as admin to create the user
  await loginAsAdmin();
  await ensureNonAdminUser(E2E_USER_EMAIL, E2E_USER_PASSWORD);
  // Logout admin
  await t.navigateTo(LOGIN_URL);
  // Login as non-admin user
  await t.typeText(Selector('#email'), E2E_USER_EMAIL);
  await t.typeText(Selector('#password'), E2E_USER_PASSWORD);
  await t.click(Selector('#login-btn'));
  await t.expect(Selector('#teams-grid').exists).ok('Non-Admin Login fehlgeschlagen', { timeout: 8000 });
}

/**
 * Seeds data via API and navigates to the cockpit page.
 * Call this in beforeEach hooks.
 */
export async function setupTest() {
  await loginAsAdmin();
  await seedViaAPI(JSON.stringify(SEED_PAYLOAD));
  await t.deleteCookies('cockpit_view');
  await clearViewState();
  await reloadPage();
  // Wait for page to re-render with seeded data
  await Selector('#teams-grid .team-card', { timeout: 5000 })();
  // Also wait for initiative rows to be rendered (avoids race condition)
  await Selector('#ini-body .ini-row', { timeout: 5000 })();
}

/**
 * Waits for the save to complete.
 * Uses a generous timeout to account for debounced saves (400ms) + network latency.
 * Falls back to a fixed wait if the indicator was already shown and hidden.
 */
export async function waitForSave() {
  const indicator = Selector('#save-ind');
  try {
    await t.expect(indicator.hasClass('show')).ok({ timeout: 5000 });
  } catch {
    // Indicator may have already appeared and disappeared — wait for debounce + network instead
    await t.wait(1500);
  }
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
  filterKunde: Selector('#filter-kunde'),
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

  // Detail-Seite (früher Modal – jetzt Full-Page)
  detailPage: Selector('#detail-page'),
  detailBackdrop: Selector('#detail-page'),   // Alias für Abwärtskompatibilität
  detailClose: Selector('#dp-back'),
  detailBtns: Selector('.detail-btn'),

  // Footer
  importBtn: Selector('[data-action="importJSON"]'),
  exportBtn: Selector('[data-action="exportJSON"]'),

  // Detail-Page Felder
  dpBack: Selector('#dp-back'),

  // Risk-Seite (jetzt Teil der Detail-Seite)
  riskBtns: Selector('[data-action="openDetail"]'),
  riskPage: Selector('#detail-page'),
  riskBack: Selector('#dp-back'),
  riskAddBtn: Selector('#dp-risk-add'),
  riskCards: Selector('.dp-risk-card'),
  riskRoamSelects: Selector('[data-risk-field="roamStatus"]'),
  riskRoamNotiz: Selector('[data-risk-field="roamNotiz"]'),
  roamBadges: Selector('.roam-badge'),
  riskBezeichnungInputs: Selector('[data-risk-field="bezeichnung"]'),
  riskBeschreibungTextareas: Selector('[data-risk-field="beschreibung"]'),
  riskWahrscheinlichkeitSelects: Selector('[data-risk-field="eintrittswahrscheinlichkeit"]'),
  riskSchadensausmasSelects: Selector('[data-risk-field="schadensausmass"]'),
  riskDeleteBtns: Selector('[data-action="removeRisk"]'),
  riskScoreBadges: Selector('.risk-badge'),

  // Milestones
  milestoneCards: Selector('.dp-milestone-row'),
  milestoneAddBtn: Selector('#dp-milestone-add'),
  milestoneCopyBtn: Selector('#dp-milestone-copy'),
  milestoneAufgabeInputs: Selector('[data-milestone-field="aufgabe"]'),
  milestoneOwnerInputs: Selector('[data-milestone-field="owner"]'),
  milestoneStatusSelects: Selector('[data-milestone-field="status"]'),
  milestoneFristInputs: Selector('[data-milestone-field="frist"]'),
  milestoneDeleteBtns: Selector('[data-action="removeMilestone"]'),
};
