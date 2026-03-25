import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-7: Kalenderwoche bearbeiten')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-7.1: Klick auf KW-Badge öffnet Prompt-Dialog', async (t) => {
  // Seed hat kw = "12"
  await t.expect(selectors.kwBadge.textContent).contains('12');

  // Prompt mit neuem Wert bestätigen
  await t.setNativeDialogHandler(() => '42');
  await t.click(selectors.kwBadge);
  await waitForSave();

  // Badge sollte neuen Wert zeigen
  await t.expect(selectors.kwBadge.textContent).contains('42');
});

test('AC-7.2: KW-Änderung wird persistiert', async (t) => {
  await t.setNativeDialogHandler(() => '99');
  await t.click(selectors.kwBadge);
  await waitForSave();

  // Reload und prüfen
  await t.eval(() => location.reload());
  await t.wait(500);

  await t.expect(selectors.kwBadge.textContent).contains('99');
});

fixture('US-8: Speicherstatus-Anzeige')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-8.1: Nach Änderung erscheint "gespeichert"', async (t) => {
  const nameInput = selectors.teamNameInputs.nth(0);

  // Änderung vornehmen
  await t.selectText(nameInput).typeText(nameInput, 'Test Save Indicator');

  // Warten auf "gespeichert" Anzeige
  const indicator = selectors.saveIndicator;
  await t.expect(indicator.textContent).eql('gespeichert', { timeout: 3000 });
  await t.expect(indicator.hasClass('show')).ok({ timeout: 3000 });
});
