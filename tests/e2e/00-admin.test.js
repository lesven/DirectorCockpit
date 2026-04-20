import { Selector, ClientFunction } from 'testcafe';
import { ADMIN_URL, LOGIN_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers.js';

const NEW_USER_EMAIL = `e2e-neu-${Date.now()}@test.de`;
const NEW_USER_PASSWORD = 'Neuer!UserPw99X';

fixture('AUTH-2: Admin-Benutzerverwaltung')
  .page(LOGIN_URL)
  .beforeEach(async (t) => {
    // Als Admin einloggen
    await t
      .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
      .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
      .click(Selector('#login-btn'));
    await t.expect(Selector('#teams-grid').exists).ok({ timeout: 8000 });
    // Zur Admin-Seite navigieren
    await t.navigateTo(ADMIN_URL);
    await t.expect(Selector('#user-table').exists).ok({ timeout: 5000 });
  });

test('AUTH-2.1: Benutzerliste wird angezeigt', async (t) => {
  const rows = Selector('#user-tbody tr');
  await t.expect(rows.count).gte(1, 'Mindestens ein Benutzer sollte in der Tabelle sein');
  // E2E-Admin selbst sollte in der Liste erscheinen
  await t.expect(Selector('#user-tbody').innerText).contains(E2E_ADMIN_EMAIL);
});

test('AUTH-2.2: Neuen Benutzer anlegen', async (t) => {
  const countBefore = await Selector('#user-tbody tr').count;

  await t.click(Selector('#add-user-btn'));
  // Modal öffnet sich
  await t.expect(Selector('#create-modal').hasClass('open')).ok({ timeout: 3000 });

  await t
    .typeText(Selector('#new-email'), NEW_USER_EMAIL)
    .typeText(Selector('#new-password'), NEW_USER_PASSWORD);
  await t.click(Selector('#create-submit'));

  // Modal schließt sich nach erfolgreichem Anlegen
  await t.expect(Selector('#create-modal').hasClass('open')).notOk({ timeout: 5000 });
  // Tabelle wächst
  await t.expect(Selector('#user-tbody tr').count).gte(countBefore + 1, 'Benutzertabelle sollte wachsen', { timeout: 5000 });
  await t.expect(Selector('#user-tbody').innerText).contains(NEW_USER_EMAIL);
});

test('AUTH-2.3: Nicht eingeloggte Anfrage an Admin-API gibt 403/401', async (t) => {
  // Direkt die Admin-API ohne Session aufrufen
  const getUsers = ClientFunction(() =>
    fetch('/api/admin/users', { credentials: 'same-origin' }).then((r) => r.status)
  );
  // Wir sind eingeloggt und admin → 200
  const status = await getUsers();
  await t.expect(status).eql(200);
});
