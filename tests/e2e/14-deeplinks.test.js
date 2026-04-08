import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL, setupTest, selectors } from './helpers.js';

const getLocationHash = ClientFunction(() => window.location.hash);
const getLocationHref = ClientFunction(() => window.location.href);

fixture('US-14: Deep-Links für Initiativen')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-14.1: Edit-Button setzt URL-Hash', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  const hash = await getLocationHash();
  await t.expect(hash).eql('#initiative/2001');
});

test('AC-14.2: Deep-Link öffnet Detailseite direkt', async (t) => {
  // Navigiere direkt zu Deep-Link
  await t.navigateTo(BASE_URL + '#initiative/2001');
  // Warte bis Daten geladen und Detail-Seite sichtbar
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk({ timeout: 5000 });

  const nameInput = Selector('#dp-name');
  await t.expect(nameInput.value).eql('Projekt Gamma');
});

test('AC-14.3: Ungültige ID zeigt Toast und Cockpit', async (t) => {
  await t.navigateTo(BASE_URL + '#initiative/9999999');

  const toast = Selector('#toast');
  await t.expect(toast.hasAttribute('hidden')).notOk({ timeout: 5000 });
  await t.expect(toast.textContent).contains('nicht gefunden');

  // Cockpit-Hauptansicht soll sichtbar sein
  await t.expect(Selector('main').hasAttribute('hidden')).notOk();
});

test('AC-14.4: Schließen entfernt Hash aus URL', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  await t.click(selectors.detailClose);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).ok();

  const hash = await getLocationHash();
  await t.expect(hash).eql('');
});

test('AC-14.5: Link-kopieren-Button existiert auf Detailseite', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  const copyBtn = Selector('#dp-copy-link');
  await t.expect(copyBtn.exists).ok();
});

test('AC-14.6: Escape schließt Detailseite und entfernt Hash', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  await t.pressKey('esc');
  await t.expect(selectors.detailPage.hasAttribute('hidden')).ok();

  const hash = await getLocationHash();
  await t.expect(hash).eql('');
});

test('AC-14.7: Zweite Initiative hat eigenen Hash', async (t) => {
  await t.click(selectors.detailBtns.nth(1));
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  const hash = await getLocationHash();
  await t.expect(hash).eql('#initiative/2002');
});

test('AC-14.8: Deeplink auf fertige Initiative öffnet Modal (auch wenn Fertige ausgeblendet)', async (t) => {
  // Projekt Epsilon (2003) ist fertig und standardmäßig ausgeblendet
  await t.navigateTo(BASE_URL + '#initiative/2003');
  // Detail-Modal soll trotzdem geöffnet werden
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk({ timeout: 5000 });

  const nameInput = Selector('#dp-name');
  await t.expect(nameInput.value).eql('Projekt Epsilon');
});
