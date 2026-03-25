import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-4: Nicht-vergessen-Einträge')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-4.1: Neuer Eintrag erzeugt Karte mit Titel und Body', async (t) => {
  const initialCount = await selectors.nvCards.count;

  await t.click(selectors.addNvBtn);

  await t.expect(selectors.nvCards.count).eql(initialCount + 1);

  // Neuer Eintrag sollte fokussiert sein
  const lastTitle = selectors.nvTitleInputs.nth(-1);
  await t.expect(lastTitle.focused).ok('Titelfeld sollte fokussiert sein');
});

test('AC-4.2: Titel und Body editierbar und persistiert', async (t) => {
  const titleInput = selectors.nvTitleInputs.nth(0);
  const bodyTextarea = selectors.nvBodyTextareas.nth(0);

  // Titel ändern
  await t.selectText(titleInput).typeText(titleInput, 'Neuer Titel');
  await waitForSave();

  // Body ändern
  await t.selectText(bodyTextarea).typeText(bodyTextarea, 'Neuer Body-Text');
  await waitForSave();

  // Reload und prüfen per API
  await t.wait(1000);
  await t.eval(() => location.reload());
  await t.wait(1000);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const nv = apiData.nicht_vergessen.find((n) => n.id === 3001);
  await t.expect(nv.title).eql('Neuer Titel');
  await t.expect(nv.body).eql('Neuer Body-Text');
});

test('AC-4.3: Löschen mit Bestätigung', async (t) => {
  const initialCount = await selectors.nvCards.count;

  await t.setNativeDialogHandler(() => true);
  await t.hover(selectors.nvCards.nth(0));
  await t.click(selectors.nvDeleteBtns.nth(0));

  await t.expect(selectors.nvCards.count).eql(initialCount - 1);
});

test('AC-4.3: Löschen abbrechen behält Eintrag', async (t) => {
  const initialCount = await selectors.nvCards.count;

  await t.setNativeDialogHandler(() => false);
  await t.hover(selectors.nvCards.nth(0));
  await t.click(selectors.nvDeleteBtns.nth(0));

  await t.expect(selectors.nvCards.count).eql(initialCount);
});
