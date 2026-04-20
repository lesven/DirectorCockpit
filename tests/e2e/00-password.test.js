import { Selector } from 'testcafe';
import { LOGIN_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers.js';

fixture('AUTH-3: Passwort-Änderung')
  .page(LOGIN_URL)
  .beforeEach(async (t) => {
    await t
      .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
      .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
      .click(Selector('#login-btn'));
    await t.expect(Selector('#teams-grid').exists).ok({ timeout: 8000 });
  });

test('AUTH-3.1: Passwort-Ändern-Button öffnet Modal', async (t) => {
  // #change-password-btn wird von auth.js in #user-info gerendert
  await t.expect(Selector('#change-password-btn').exists).ok('Passwort-Ändern-Button sollte im Header existieren', { timeout: 5000 });
  await t.click(Selector('#change-password-btn'));

  // Modal wird lazy-geladen und als #pw-change-modal eingefügt
  await t.expect(Selector('#pw-change-modal').hasClass('open')).ok('Passwort-Ändern-Modal sollte erscheinen', { timeout: 4000 });
});

test('AUTH-3.2: Falsches aktuelles Passwort zeigt Fehlermeldung', async (t) => {
  await t.click(Selector('#change-password-btn'));
  await t.expect(Selector('#pw-change-modal').hasClass('open')).ok({ timeout: 4000 });

  await t
    .typeText(Selector('#pc-current'), 'FalschesPasswort!99')
    .typeText(Selector('#pc-new'), 'NeuesValid!Pw12X')
    .typeText(Selector('#pc-confirm'), 'NeuesValid!Pw12X');
  await t.click(Selector('#pc-submit'));

  // Server gibt 422 zurück, #pc-error erscheint
  await t.expect(Selector('#pc-error').visible).ok('Fehlermeldung bei falschem Passwort', { timeout: 4000 });
});

test('AUTH-3.3: Client-Validierung bei zu kurzem Passwort', async (t) => {
  await t.click(Selector('#change-password-btn'));
  await t.expect(Selector('#pw-change-modal').hasClass('open')).ok({ timeout: 4000 });

  await t
    .typeText(Selector('#pc-current'), E2E_ADMIN_PASSWORD)
    .typeText(Selector('#pc-new'), 'kurz')
    .typeText(Selector('#pc-confirm'), 'kurz');
  await t.click(Selector('#pc-submit'));

  // Client-seitige Validierung: #pc-error erscheint sofort ohne Server-Call
  await t.expect(Selector('#pc-error').visible).ok('Fehlermeldung bei zu kurzem Passwort', { timeout: 2000 });
  await t.expect(Selector('#pc-error').innerText).contains('12 Zeichen');
});
