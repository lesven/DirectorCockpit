import { Selector } from 'testcafe';
import { LOGIN_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers.js';

fixture('AUTH-3: Passwort-Änderung')
  .page(LOGIN_URL)
  .beforeEach(async (t) => {
    await t
      .typeText(Selector('#email'), E2E_ADMIN_EMAIL)
      .typeText(Selector('#password'), E2E_ADMIN_PASSWORD)
      .click(Selector('button[type="submit"]'));
    await t.expect(Selector('#teams-grid').exists).ok({ timeout: 6000 });
  });

test('AUTH-3.1: Passwort-Ändern-Button öffnet Modal', async (t) => {
  // Passwort-Ändern-Button (🔑) im Header
  const pwBtn = Selector('button, [role="button"]').withText('🔑');
  await t.expect(pwBtn.exists).ok('Passwort-Ändern-Button sollte im Header existieren', { timeout: 4000 });
  await t.click(pwBtn);

  // Modal sollte erscheinen
  const modal = Selector('#pw-change-modal, .pw-change-modal, dialog');
  await t.expect(modal.exists).ok('Passwort-Ändern-Modal sollte erscheinen', { timeout: 3000 });
});

test('AUTH-3.2: Falsches aktuelles Passwort zeigt Fehlermeldung', async (t) => {
  const pwBtn = Selector('button, [role="button"]').withText('🔑');
  await t.click(pwBtn);

  const modal = Selector('#pw-change-modal, .pw-change-modal, dialog');
  await t.typeText(modal.find('#current-password, [name="currentPassword"]'), 'FalschesPasswort!99');
  await t.typeText(modal.find('#new-password, [name="newPassword"]'), 'NeuesValid!Pw12');
  await t.typeText(modal.find('#confirm-password, [name="confirmPassword"]'), 'NeuesValid!Pw12');
  await t.click(modal.find('button[type="submit"]'));

  const errMsg = modal.find('.error-message, .alert-error, [data-testid="error"]');
  await t.expect(errMsg.visible).ok('Fehlermeldung bei falschem Passwort', { timeout: 3000 });
});

test('AUTH-3.3: Client-Validierung bei zu kurzem Passwort', async (t) => {
  const pwBtn = Selector('button, [role="button"]').withText('🔑');
  await t.click(pwBtn);

  const modal = Selector('#pw-change-modal, .pw-change-modal, dialog');
  await t.typeText(modal.find('#current-password, [name="currentPassword"]'), E2E_ADMIN_PASSWORD);
  await t.typeText(modal.find('#new-password, [name="newPassword"]'), 'kurz');
  await t.typeText(modal.find('#confirm-password, [name="confirmPassword"]'), 'kurz');
  await t.click(modal.find('button[type="submit"]'));

  const errMsg = modal.find('.error-message, .alert-error, [data-testid="error"]');
  await t.expect(errMsg.visible).ok('Fehlermeldung bei zu kurzem Passwort', { timeout: 2000 });
});
