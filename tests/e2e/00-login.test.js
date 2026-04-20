import { Selector } from 'testcafe';
import { LOGIN_URL, BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers.js';

fixture('AUTH-1: Login/Logout')
  .page(LOGIN_URL);

test('AUTH-1.1: Erfolgreicher Login leitet auf cockpit.html weiter', async (t) => {
  await t
    .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
    .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
    .click(Selector('button[type="submit"]'));

  await t.expect(Selector('#teams-grid').exists).ok('cockpit.html sollte geladen sein', { timeout: 6000 });
});

test('AUTH-1.2: Falsche Anmeldedaten zeigen Fehlermeldung', async (t) => {
  await t
    .typeText(Selector('#email'), 'falsch@test.de')
    .typeText(Selector('#password'), 'FalschesPasswort!99')
    .click(Selector('button[type="submit"]'));

  const errorMsg = Selector('#login-error');
  await t.expect(errorMsg.visible).ok('Fehlermeldung sollte erscheinen', { timeout: 3000 });
  await t.expect(errorMsg.innerText).contains('Anmeldedaten');
  // URL bleibt login.html
  await t.expect(Selector('form').exists).ok();
});

test('AUTH-1.3: Unauthentifizierter Zugriff auf cockpit.html leitet zu login.html', async (t) => {
  // Erst ohne eingeloggt zu sein direkt cockpit.html aufrufen
  await t.navigateTo(BASE_URL);
  // Sollte zu login.html umgeleitet werden
  await t.expect(Selector('#email').exists).ok('Login-Formular sollte erscheinen', { timeout: 4000 });
});

test('AUTH-1.4: Logout funktioniert und leitet zu login.html', async (t) => {
  // Erst einloggen
  await t
    .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
    .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
    .click(Selector('button[type="submit"]'));

  await t.expect(Selector('#teams-grid').exists).ok({ timeout: 6000 });

  // Abmelden-Button klicken
  const logoutBtn = Selector('[data-action="logout"], #logout-btn, button').withText('Abmelden');
  await t.click(logoutBtn.nth(0));

  // Sollte zu login.html weitergeleitet werden
  await t.expect(Selector('#email').exists).ok('Login-Formular nach Logout', { timeout: 4000 });
});
