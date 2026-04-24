import { Selector, ClientFunction } from 'testcafe';
import { LOGIN_URL, setupTest, waitForSave, loginAsAdmin } from './helpers.js';

const KUNDEN_URL = 'http://localhost:8089/kunden.html';

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: json,
  }).then((r) => r.ok);
});

const reloadPage = ClientFunction(() => {
  location.reload();
});

async function setupKundenTest(t) {
  await loginAsAdmin();
  await seedViaAPI(
    JSON.stringify({
      kw: '',
      kunden: [
        { id: 9001, name: 'Acme GmbH' },
        { id: 9002, name: 'Beta AG' },
      ],
      teams: [],
      initiatives: [],
      nicht_vergessen: [],
    }),
  );
  await t.navigateTo(KUNDEN_URL);
  await Selector('#kunden-body tr', { timeout: 5000 })();
}

const kundenRows  = Selector('#kunden-body tr.ini-row');
const addBtn      = Selector('#add-kunde-btn');
const kundenCount = Selector('#kunden-count');

fixture('US-16: Kundenstammdaten-Seite')
  .page(LOGIN_URL)
  .beforeEach(async (t) => {
    await setupKundenTest(t);
  });

// ── CRUD ─────────────────────────────────────────────────────

test('AC-16.1: Vorhandene Kunden werden geladen und angezeigt', async (t) => {
  await t.expect(kundenRows.count).eql(2);
  await t.expect(kundenCount.textContent).eql('2');

  const names = [
    await kundenRows.nth(0).find('input').value,
    await kundenRows.nth(1).find('input').value,
  ];
  await t.expect(names).contains('Acme GmbH');
  await t.expect(names).contains('Beta AG');
});

test('AC-16.2: Neuen Kunden anlegen erhöht Anzahl und fokussiert Eingabefeld', async (t) => {
  const before = await kundenRows.count;
  await t.click(addBtn);

  await t.expect(kundenRows.count).eql(before + 1);

  // Das neue Input-Feld sollte leer und fokussiert sein
  const lastInput = kundenRows.nth(-1).find('input');
  await t.expect(lastInput.value).eql('');
  await t.expect(lastInput.focused).ok('Neues Feld sollte fokussiert sein');
});

test('AC-16.3: Kundennamen inline bearbeiten und persistieren', async (t) => {
  const firstInput = kundenRows.nth(0).find('input');
  await t.selectText(firstInput).typeText(firstInput, 'Umbenannte Firma');
  await waitForSave();

  // Seite neu laden und prüfen
  await reloadPage();
  await Selector('#kunden-body tr', { timeout: 5000 })();

  const inputs = kundenRows.find('input');
  const count  = await inputs.count;
  let found    = false;
  for (let i = 0; i < count; i++) {
    if ((await inputs.nth(i).value) === 'Umbenannte Firma') {
      found = true;
      break;
    }
  }
  await t.expect(found).ok('Umbenannter Kunde sollte nach Reload vorhanden sein');
});

test('AC-16.4: Kunden löschen mit Bestätigung entfernt Zeile', async (t) => {
  const before = await kundenRows.count;
  await t.setNativeDialogHandler(() => true);
  await t.click(kundenRows.nth(0).find('[data-action="removeKunde"]'));

  await t.expect(kundenRows.count).eql(before - 1);
  await t.expect(kundenCount.textContent).eql(String(before - 1));
});

test('AC-16.4: Löschen abbrechen behält Kunden', async (t) => {
  const before = await kundenRows.count;
  await t.setNativeDialogHandler(() => false);
  await t.click(kundenRows.nth(0).find('[data-action="removeKunde"]'));

  await t.expect(kundenRows.count).eql(before);
});

test('AC-16.5: Neuer Kunde wird nach Speichern persistent', async (t) => {
  await t.click(addBtn);
  const lastInput = kundenRows.nth(-1).find('input');
  await t.typeText(lastInput, 'Neue Firma GmbH');
  await waitForSave();

  await reloadPage();
  await Selector('#kunden-body tr', { timeout: 5000 })();

  const inputs = kundenRows.find('input');
  const count  = await inputs.count;
  let found    = false;
  for (let i = 0; i < count; i++) {
    if ((await inputs.nth(i).value) === 'Neue Firma GmbH') {
      found = true;
      break;
    }
  }
  await t.expect(found).ok('Neuer Kunde sollte nach Reload gespeichert sein');
});

// ── Navigation ───────────────────────────────────────────────

test('AC-16.6: Footer-Link zurück zum Cockpit navigiert korrekt', async (t) => {
  const backLink = Selector('footer a[href="cockpit.html"]');
  await t.expect(backLink.exists).ok('Zurück-Link im Footer sollte vorhanden sein');
  await t.click(backLink);

  await t.expect(Selector('#teams-grid').exists).ok('Cockpit sollte nach Klick geladen sein');
});

// ── Cockpit-Integration ──────────────────────────────────────

test('AC-16.7: Footer-Link "Kunden" auf cockpit.html öffnet die Kundenseite', async (t) => {
  await t.navigateTo('http://localhost:8089/cockpit.html');
  // Seed für cockpit.html aufrufen (setupTest verwendet SEED_PAYLOAD mit kunden)
  await setupTest();

  const kundenLink = Selector('footer a[href="kunden.html"]');
  await t.expect(kundenLink.exists).ok('Kunden-Link im Cockpit-Footer sollte vorhanden sein');
  await t.click(kundenLink);

  await t.expect(Selector('#add-kunde-btn').exists).ok('Kundenseite sollte nach Klick geladen sein');
});

test('AC-16.8: Kunden sind im Kunden-Dropdown der Initiative-Tabelle wählbar', async (t) => {
  await t.navigateTo('http://localhost:8089/cockpit.html');
  await setupTest();

  // Erste Initiativen-Zeile hat einen Kunden-Select
  const kundeSelect = Selector('.ini-row').nth(0).find('[data-field="customer"]');
  await t.expect(kundeSelect.exists).ok('Kunden-Select sollte in Initiative-Zeile vorhanden sein');

  // Die Optionen müssen die Seed-Kunden enthalten
  const acmeOption = kundeSelect.find('option[value="9001"]');
  await t.expect(acmeOption.exists).ok('Acme GmbH Option sollte im Select vorhanden sein');
  await t.expect(acmeOption.textContent).eql('Acme GmbH');
});

test('AC-16.9: Kunden-Feld im Detail-Modal wird angezeigt und ist wählbar', async (t) => {
  await t.navigateTo('http://localhost:8089/cockpit.html');
  await setupTest();

  // Detail-Modal der ersten Initiative öffnen
  await t.click(Selector('.ini-name-detail-btn').nth(0));
  await t.expect(Selector('#detail-page').visible).ok();

  const dpKunde = Selector('#dp-kunde');
  await t.expect(dpKunde.exists).ok('Kunden-Select im Detail-Modal sollte vorhanden sein');

  // Kunden-Option wählen
  await t.click(dpKunde).click(dpKunde.find('option[value="9002"]'));
  await waitForSave();

  // Detail schließen, Seite neu laden und prüfen
  await t.click(Selector('#dp-back'));
  await reloadPage();
  await Selector('.ini-row', { timeout: 5000 })();

  // Die Initiative sollte jetzt Beta AG (9002) als Kunden haben
  const detailBtn = Selector('.ini-name-detail-btn').nth(0);
  await t.click(detailBtn);
  await t.expect(Selector('#dp-kunde').value).eql('9002');
});
