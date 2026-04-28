import { Selector } from 'testcafe';
import { LOGIN_URL, BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers.js';

fixture('AUTH-1: Login/Logout')
  .page(LOGIN_URL);

test('AUTH-1.1: Erfolgreicher Login leitet auf cockpit.html weiter', async (t) => {
  await t
    .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
    .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
    .click(Selector('#login-btn'));

  await t.expect(Selector('#teams-grid').exists).ok('cockpit.html sollte geladen sein', { timeout: 8000 });
});

test('AUTH-1.2: Falsche Anmeldedaten zeigen Fehlermeldung', async (t) => {
  await t
    .typeText(Selector('#email'), 'falsch@test.de')
    .typeText(Selector('#password'), 'FalschesPasswort!99')
    .click(Selector('#login-btn'));

  const errorMsg = Selector('#login-error');
  await t.expect(errorMsg.visible).ok('Fehlermeldung sollte erscheinen', { timeout: 3000 });
  await t.expect(errorMsg.innerText).contains('Anmeldedaten');
  // Formular bleibt sichtbar
  await t.expect(Selector('#login-form').exists).ok();
});

test('AUTH-1.3: Unauthentifizierter Zugriff auf cockpit.html leitet zu login.html', async (t) => {
  // Ohne Session direkt cockpit.html aufrufen
  await t.navigateTo(BASE_URL);
  // auth.js ruft /api/me auf, bekommt 401 und leitet zu login.html weiter
  await t.expect(Selector('#login-form').exists).ok('Login-Formular sollte erscheinen', { timeout: 6000 });
});

test('AUTH-1.4: Logout funktioniert und leitet zu login.html', async (t) => {
  // Einloggen
  await t
    .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
    .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
    .click(Selector('#login-btn'));

  await t.expect(Selector('#teams-grid').exists).ok({ timeout: 8000 });

  // Abmelden-Button (gerendert von auth.js)
  await t.click(Selector('#logout-btn'));

  // Zu login.html weitergeleitet
  await t.expect(Selector('#login-form').exists).ok('Login-Formular nach Logout', { timeout: 6000 });
});
