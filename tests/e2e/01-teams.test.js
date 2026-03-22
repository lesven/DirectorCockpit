import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-1: Team-Management')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-1.1: Neues Team anlegen erzeugt Karte mit Fokus auf Namensfeld', async (t) => {
  const initialCount = await selectors.teamCards.count;

  await t.click(selectors.addTeamBtn);

  await t.expect(selectors.teamCards.count).eql(initialCount + 1);

  // Das letzte Team-Namensfeld sollte den Defaultnamen haben
  const lastNameInput = selectors.teamNameInputs.nth(-1);
  await t.expect(lastNameInput.value).eql('Neues Team');
  // Fokus prüfen: das Element sollte fokussiert sein
  await t.expect(lastNameInput.focused).ok('Namensfeld sollte fokussiert sein');
});

test('AC-1.2: Inline-Bearbeitung von Team-Feldern persistiert', async (t) => {
  const nameInput = selectors.teamNameInputs.nth(0);
  const subInput = Selector('.team-card').nth(0).find('[data-field="sub"]');
  const fokusInput = Selector('.team-card').nth(0).find('[data-field="fokus"]');
  const schrittInput = Selector('.team-card').nth(0).find('[data-field="schritt"]');

  // Name ändern
  await t.selectText(nameInput).typeText(nameInput, 'Umbenanntes Team');
  await waitForSave();

  // Sub (Thema) ändern
  await t.selectText(subInput).typeText(subInput, 'Neues Thema');
  await waitForSave();

  // Fokus ändern
  await t.selectText(fokusInput).typeText(fokusInput, 'Neuer Fokus');
  await waitForSave();

  // Schritt ändern
  await t.selectText(schrittInput).typeText(schrittInput, 'Neuer Schritt');
  await waitForSave();

  // Reload und prüfen, dass Daten persistiert sind
  await t.wait(1000);
  await t.eval(() => location.reload());
  await t.wait(1000);

  // Reihenfolge kann sich nach API-Roundtrip ändern, daher nach Wert suchen
  const renamedCard = Selector('.team-card').filter((node) => {
    return node.querySelector('.team-name').value === 'Umbenanntes Team';
  });
  await t.expect(renamedCard.count).eql(1, 'Umbenanntes Team sollte existieren');
  await t.expect(renamedCard.find('[data-field="sub"]').value).eql('Neues Thema');
  await t.expect(renamedCard.find('[data-field="fokus"]').value).eql('Neuer Fokus');
  await t.expect(renamedCard.find('[data-field="schritt"]').value).eql('Neuer Schritt');
});

test('AC-1.3: Status-Dot zykelt durch STATUSES', async (t) => {
  // STATUSES = ['fertig', 'yellow', 'grey', 'ungeplant']
  // Finde das Team "Alpha Team" (status: grey in seed)
  const alphaCard = Selector('.team-card').filter((node) => {
    return node.querySelector('.team-name').value === 'Alpha Team';
  });
  const dot = alphaCard.find('[data-action="cycleStatus"]');

  // Initial: grey
  await t.expect(dot.hasClass('status-grey')).ok();

  // Klick 1: grey → ungeplant (grey ist index 2, nächster ist index 3)
  await t.click(dot);
  await t.expect(dot.hasClass('status-ungeplant')).ok();

  // Klick 2: ungeplant → fertig (wrap around)
  await t.click(dot);
  await t.expect(dot.hasClass('status-fertig')).ok();

  // Klick 3: fertig → yellow
  await t.click(dot);
  await t.expect(dot.hasClass('status-yellow')).ok();
});

test('AC-1.4: Löschen mit Bestätigung entfernt Team', async (t) => {
  const initialCount = await selectors.teamCards.count;

  await t.setNativeDialogHandler(() => true);
  // Hover über Karte, damit card-actions sichtbar wird
  await t.hover(selectors.teamCards.nth(0));
  await t.click(selectors.teamDeleteBtns.nth(0));

  await t.expect(selectors.teamCards.count).eql(initialCount - 1);
});

test('AC-1.4: Löschen abbrechen behält Team', async (t) => {
  const initialCount = await selectors.teamCards.count;

  await t.setNativeDialogHandler(() => false);
  await t.hover(selectors.teamCards.nth(0));
  await t.click(selectors.teamDeleteBtns.nth(0));

  await t.expect(selectors.teamCards.count).eql(initialCount);
});
