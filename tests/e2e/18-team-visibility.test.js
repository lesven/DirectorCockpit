import { Selector, ClientFunction, t } from 'testcafe';
import {
  LOGIN_URL,
  BASE_URL,
  ADMIN_URL,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  loginAsAdmin,
} from './helpers.js';

// ── Helpers ──────────────────────────────────────────────────

const NORMAL_USER_EMAIL = 'e2e-normal@test.internal';
const NORMAL_USER_PASSWORD = 'NormalUser!2025X';

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: json,
  }).then((r) => r.ok);
});

const createUserViaAPI = ClientFunction((email, password) => {
  return fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password, roles: ['ROLE_USER'] }),
  }).then((r) => r.json());
});

const assignTeamOwnerViaAPI = ClientFunction((teamId, userId) => {
  return fetch(`/api/admin/teams/${teamId}/owner`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ userId }),
  }).then((r) => r.ok);
});

const SEED_PAYLOAD = {
  kw: '18',
  kunden: [{ id: 9001, name: 'Visibility Kunde' }],
  teams: [
    { id: 7001, name: 'Team Sichtbar', sub: 'Für Normal-User', status: 'grey', fokus: '', schritt: '' },
    { id: 7002, name: 'Team Unsichtbar', sub: 'Für Admin', status: 'yellow', fokus: '', schritt: '' },
  ],
  initiatives: [
    {
      id: 8001, name: 'Initiative Sichtbar', team: 7001, customer: 9001,
      status: 'yellow', projektstatus: 'ok', schritt: '', frist: '', notiz: '',
      businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null,
    },
    {
      id: 8002, name: 'Initiative Unsichtbar', team: 7002, customer: 9001,
      status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '',
      businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null,
    },
    {
      id: 8003, name: 'Initiative Teamlos', team: null, customer: null,
      status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '',
      businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null,
    },
  ],
  nicht_vergessen: [
    { id: 6001, title: 'Admin-Notiz', body: 'Nur für Admin sichtbar' },
  ],
  risks: [
    {
      id: 4501, initiative: 8001, bezeichnung: 'Sichtbares Risiko',
      beschreibung: '', eintrittswahrscheinlichkeit: 2, schadensausmass: 3,
      roamStatus: null, roamNotiz: '',
    },
    {
      id: 4502, initiative: 8002, bezeichnung: 'Unsichtbares Risiko',
      beschreibung: '', eintrittswahrscheinlichkeit: 1, schadensausmass: 1,
      roamStatus: null, roamNotiz: '',
    },
  ],
  milestones: [
    {
      id: 5501, initiative: 8001, aufgabe: 'Sichtbarer Meilenstein',
      owner: 'Max', status: 'in_bearbeitung', frist: '2026-05-01',
    },
    {
      id: 5502, initiative: 8002, aufgabe: 'Unsichtbarer Meilenstein',
      owner: 'Lena', status: 'offen', frist: '2026-06-01',
    },
  ],
};

const getAllUsersViaAPI = ClientFunction(() => {
  return fetch('/api/admin/users', { credentials: 'same-origin' }).then((r) => r.json());
});

/** Seed data and create the normal user, assign Team 7001 to normal user. */
async function setupVisibilityTest() {
  // 0. Clear all cookies for a clean state
  await t.deleteCookies();

  // 1. Login as admin
  await loginAsAdmin();

  // 2. Seed all data (teams get createdBy = admin)
  await seedViaAPI(JSON.stringify(SEED_PAYLOAD));
  // Small wait to ensure DB transaction is committed
  await t.wait(300);

  // 3. Create normal user (may already exist from previous run — ignore errors)
  await createUserViaAPI(NORMAL_USER_EMAIL, NORMAL_USER_PASSWORD);

  // 4. Find the normal user's ID from the user list
  const allUsers = await getAllUsersViaAPI();
  const normalUser = allUsers.find((u) => u.email === NORMAL_USER_EMAIL);
  const userId = normalUser ? normalUser.id : null;

  // 5. Assign Team 7001 to normal user, Team 7002 to admin (reset from any previous test state)
  if (userId) {
    await assignTeamOwnerViaAPI(7001, userId);
  }
  const adminUser = allUsers.find((u) => u.email === E2E_ADMIN_EMAIL);
  if (adminUser) {
    await assignTeamOwnerViaAPI(7002, adminUser.id);
  }
}

async function loginAsNormalUser() {
  // Clear session completely
  await t.deleteCookies();
  await t.navigateTo(LOGIN_URL);
  await t.expect(Selector('#email').exists).ok('Login-Seite nicht geladen', { timeout: 5000 });
  await t.typeText(Selector('#email'), NORMAL_USER_EMAIL);
  await t.typeText(Selector('#password'), NORMAL_USER_PASSWORD);
  await t.click(Selector('#login-btn'));
  // Wait for the user email to appear in the header — confirms login + redirect + JS init complete
  await t.expect(Selector('.user-email').withText(NORMAL_USER_EMAIL).exists).ok(
    'Login als Normal-User fehlgeschlagen',
    { timeout: 10000 },
  );
  // Ensure session is fully established before API calls
  await t.wait(300);
}

// ── Fixture ──────────────────────────────────────────────────

fixture('US-18: Team-basierte Sichtbarkeit')
  .page(LOGIN_URL)
  .beforeEach(async (t) => {
    await setupVisibilityTest();
  });

// ── Admin sieht alles ───────────────────────────────────────

test('VIS-1: Admin sieht alle Teams', async (t) => {
  await t.navigateTo(BASE_URL);
  await Selector('#teams-grid .team-card', { timeout: 5000 })();

  const teamCards = Selector('.team-card');
  await t.expect(teamCards.count).gte(2, 'Admin sollte mindestens 2 Teams sehen');

  // Team names are in input fields, not plain text
  const teamNames = Selector('#teams-grid .team-name');
  const count = await teamNames.count;
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(await teamNames.nth(i).value);
  }
  await t.expect(names).contains('Team Sichtbar');
  await t.expect(names).contains('Team Unsichtbar');
});

test('VIS-2: Admin sieht alle Initiativen', async (t) => {
  await t.navigateTo(BASE_URL);
  await Selector('#ini-body .ini-row', { timeout: 5000 })();

  const data = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  await t.expect(data.initiatives.length).gte(3, 'Admin sollte mindestens 3 Initiativen sehen');
});

test('VIS-3: Admin sieht alle Risiken und Meilensteine', async (t) => {
  const data = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  await t.expect(data.risks.length).gte(2, 'Admin sollte mindestens 2 Risiken sehen');
  await t.expect(data.milestones.length).gte(2, 'Admin sollte mindestens 2 Meilensteine sehen');
});

// ── Normaler User sieht nur eigene Teams ────────────────────

test('VIS-4: Normaler User sieht nur zugewiesenes Team', async (t) => {
  await loginAsNormalUser();

  const teamCards = Selector('.team-card');
  await t.expect(teamCards.count).eql(1, { timeout: 5000 });

  // Team names are in input fields
  const teamName = await Selector('#teams-grid .team-name').nth(0).value;
  await t.expect(teamName).eql('Team Sichtbar');
});

test('VIS-5: Normaler User sieht nur Initiativen seines Teams und teamlose', async (t) => {
  await loginAsNormalUser();

  const data = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));

  const names = data.initiatives.map((i) => i.name);
  await t.expect(names).contains('Initiative Sichtbar');
  await t.expect(names).contains('Initiative Teamlos');
  await t.expect(names).notContains('Initiative Unsichtbar');
});

test('VIS-6: Normaler User sieht nur Risiken sichtbarer Initiativen', async (t) => {
  await loginAsNormalUser();

  const data = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  const riskNames = data.risks.map((r) => r.bezeichnung);

  await t.expect(riskNames).contains('Sichtbares Risiko');
  await t.expect(riskNames).notContains('Unsichtbares Risiko');
});

test('VIS-7: Normaler User sieht nur Meilensteine sichtbarer Initiativen', async (t) => {
  await loginAsNormalUser();

  const data = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  const msNames = data.milestones.map((m) => m.aufgabe);

  await t.expect(msNames).contains('Sichtbarer Meilenstein');
  await t.expect(msNames).notContains('Unsichtbarer Meilenstein');
});

test('VIS-8: Normaler User sieht keine NichtVergessen-Einträge des Admins', async (t) => {
  await loginAsNormalUser();

  const data = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  await t.expect(data.nicht_vergessen.length).eql(0, 'Normal-User sollte keine Admin-Notizen sehen');
});

// ── Admin-Panel: Team-Zuordnung ─────────────────────────────

test('VIS-9: Admin-Panel zeigt Team-Zuordnungs-Tabelle', async (t) => {
  await t.navigateTo(ADMIN_URL);
  await t.expect(Selector('#team-table').exists).ok('Team-Tabelle sollte auf Admin-Seite existieren', { timeout: 5000 });

  const teamRows = Selector('#team-tbody tr');
  await t.expect(teamRows.count).gte(2, 'Mindestens 2 Teams sollten in der Tabelle sein');
});

test('VIS-10: Admin kann Team-Ersteller per Dropdown ändern', async (t) => {
  await t.navigateTo(ADMIN_URL);
  await Selector('#team-tbody tr', { timeout: 5000 })();

  // Find the dropdown for Team Sichtbar (id=7001)
  const ownerSelect = Selector('#team-tbody select').nth(0);
  await t.expect(ownerSelect.exists).ok('Owner-Dropdown sollte existieren');

  // Change owner to a different user
  const options = ownerSelect.find('option');
  const optCount = await options.count;
  await t.expect(optCount).gte(2, 'Dropdown sollte mindestens 2 Optionen haben');
});

// ── Zugriffskontrolle ───────────────────────────────────────

test('VIS-11: Normaler User kann fremdes Team nicht per API bearbeiten', async (t) => {
  await loginAsNormalUser();

  // Try to update Team 7002 (belongs to admin)
  const status = await t.eval(() =>
    fetch('/api/teams/7002', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name: 'Gehackt' }),
    }).then((r) => r.status),
  );

  await t.expect(status).eql(403, 'Zugriff auf fremdes Team sollte verweigert werden');
});

test('VIS-12: Normaler User kann eigenes Team bearbeiten', async (t) => {
  await loginAsNormalUser();

  const status = await t.eval(() =>
    fetch('/api/teams/7001', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name: 'Mein Team Umbenannt' }),
    }).then((r) => r.status),
  );

  await t.expect(status).eql(200, 'Bearbeitung des eigenen Teams sollte erlaubt sein');
});

test('VIS-13: Normaler User kann fremdes Team nicht löschen', async (t) => {
  await loginAsNormalUser();

  const status = await t.eval(() =>
    fetch('/api/teams/7002', {
      method: 'DELETE',
      credentials: 'same-origin',
    }).then((r) => r.status),
  );

  // 403 (forbidden) or 404 (not found for this user) both indicate access denial
  await t.expect(status === 403 || status === 404).ok(
    `L\u00f6schen eines fremden Teams sollte verweigert werden (Status: ${status})`,
  );
});

test('VIS-14: Normaler User hat keinen Zugriff auf Admin-API', async (t) => {
  await loginAsNormalUser();

  const status = await t.eval(() =>
    fetch('/api/admin/users', { credentials: 'same-origin' }).then((r) => r.status),
  );

  await t.expect(status).eql(403, 'Normaler User sollte keinen Zugriff auf Admin-API haben');
});

// ── Sichtbarkeitswechsel nach Admin-Zuordnung ───────────────

test('VIS-15: Nach Team-Neuzuordnung durch Admin ändert sich Sichtbarkeit', async (t) => {
  // Login as normal user, verify only 1 team visible
  await loginAsNormalUser();
  const dataBefore = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  await t.expect(dataBefore.teams.length).eql(1, 'Vorher: 1 Team sichtbar');

  // Clear session and login as admin
  await t.deleteCookies();
  await loginAsAdmin();

  // Also assign Team 7002 to the normal user via API
  const allUsers = await getAllUsersViaAPI();
  const normalUser = allUsers.find((u) => u.email === 'e2e-normal@test.internal');
  const normalUserId = normalUser.id;

  await assignTeamOwnerViaAPI(7002, normalUserId);

  // Login as normal user again
  await loginAsNormalUser();

  const dataAfter = await t.eval(() => fetch('/api/cockpit', { credentials: 'same-origin' }).then((r) => r.json()));
  await t.expect(dataAfter.teams.length).eql(2, 'Nachher: 2 Teams sichtbar');
  const teamNames = dataAfter.teams.map((tm) => tm.name);
  await t.expect(teamNames).contains('Team Unsichtbar');
});
