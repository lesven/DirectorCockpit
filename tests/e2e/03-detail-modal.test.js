import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-3: Detail-Modal für Initiativen')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-3.1: Klick auf ✎ öffnet Modal mit allen Feldern', async (t) => {
  // Modal sollte initial hidden sein
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).ok();

  // Klick auf Detail-Button der ersten Initiative
  await t.click(selectors.detailBtns.nth(0));

  // Modal sollte sichtbar sein
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).notOk();

  // Felder prüfen
  const nameInput = Selector('#d-name');
  const teamSelect = Selector('#d-team');
  const fristInput = Selector('#d-frist');
  const statusSelect = Selector('#d-status');
  const psSelect = Selector('#d-projektstatus');
  const schrittInput = Selector('#d-schritt');
  const notizTextarea = Selector('#d-notiz');

  await t.expect(nameInput.exists).ok();
  await t.expect(teamSelect.exists).ok();
  await t.expect(fristInput.exists).ok();
  await t.expect(statusSelect.exists).ok();
  await t.expect(psSelect.exists).ok();
  await t.expect(schrittInput.exists).ok();
  await t.expect(notizTextarea.exists).ok();

  // Werte prüfen (Projekt Gamma)
  await t.expect(nameInput.value).eql('Projekt Gamma');
  await t.expect(fristInput.value).eql('15.04');

  // WSJF-Felder prüfen
  const bvSelect = Selector('#d-businessValue');
  const tcSelect = Selector('#d-timeCriticality');
  const rrSelect = Selector('#d-riskReduction');
  const jsSelect = Selector('#d-jobSize');

  await t.expect(bvSelect.exists).ok();
  await t.expect(tcSelect.exists).ok();
  await t.expect(rrSelect.exists).ok();
  await t.expect(jsSelect.exists).ok();

  await t.expect(bvSelect.value).eql('8');
  await t.expect(tcSelect.value).eql('5');
  await t.expect(rrSelect.value).eql('3');
  await t.expect(jsSelect.value).eql('5');
});

test('AC-3.2: WSJF-Dropdowns aktualisieren Berechnung', async (t) => {
  // Öffne Detail-Modal für Initiative ohne WSJF (Projekt Delta)
  await t.click(selectors.detailBtns.nth(1));

  // Setze WSJF-Werte
  const bvSelect = Selector('#d-businessValue');
  const tcSelect = Selector('#d-timeCriticality');
  const rrSelect = Selector('#d-riskReduction');
  const jsSelect = Selector('#d-jobSize');

  await t.click(bvSelect).click(bvSelect.find('option[value="13"]'));
  await t.click(tcSelect).click(tcSelect.find('option[value="8"]'));
  await t.click(rrSelect).click(rrSelect.find('option[value="5"]'));
  await t.click(jsSelect).click(jsSelect.find('option[value="3"]'));
  await waitForSave();

  // Modal schließen
  await t.click(selectors.detailClose);

  // Tabelle prüfen: WSJF = (13+8+5)/3 ≈ 8.7
  const wsjfCell = selectors.iniRows.nth(1).find('.wsjf-value');
  await t.expect(wsjfCell.textContent).eql('8.7');
});

test('AC-3.2b: WSJF-Live-Preview aktualisiert sich sofort beim Ändern der Dropdowns', async (t) => {
  // Öffne Modal für Projekt Gamma: BV=8, TC=5, RR=3, JS=5 → initial 3.2
  await t.click(selectors.detailBtns.nth(0));

  const calcEl = Selector('#wsjf-calc');
  await t.expect(calcEl.textContent).eql('3.2');

  // Job Size auf 2 ändern → (8+5+3)/2 = 8.0
  const jsSelect = Selector('#d-jobSize');
  await t.click(jsSelect).click(jsSelect.find('option[value="2"]'));

  await t.expect(calcEl.textContent).eql('8');
});

test('AC-3.2c: WSJF auf null zurücksetzen zeigt "–" in der Tabelle', async (t) => {
  // Projekt Gamma hat WSJF 3.2 — alle Felder auf leer setzen
  await t.click(selectors.detailBtns.nth(0));

  const bvSelect = Selector('#d-businessValue');
  const tcSelect = Selector('#d-timeCriticality');
  const rrSelect = Selector('#d-riskReduction');
  const jsSelect = Selector('#d-jobSize');

  await t.click(bvSelect).click(bvSelect.find('option[value=""]'));
  await t.click(tcSelect).click(tcSelect.find('option[value=""]'));
  await t.click(rrSelect).click(rrSelect.find('option[value=""]'));
  await t.click(jsSelect).click(jsSelect.find('option[value=""]'));
  await waitForSave();

  await t.click(selectors.detailClose);

  const wsjfCell = selectors.iniRows.nth(0).find('.wsjf-value');
  await t.expect(wsjfCell.textContent).eql('\u2013');
  await t.expect(wsjfCell.hasClass('wsjf-empty')).ok();
});

test('AC-3.2d: WSJF-Wert bleibt nach Page-Reload korrekt', async (t) => {
  // Projekt Gamma hat WSJF 3.2 aus dem Seed
  const wsjfCell = selectors.iniRows.nth(0).find('.wsjf-value');
  await t.expect(wsjfCell.textContent).eql('3.2');

  // Reload — Backend liefert berechnetes wsjf, kein Frontend-Fallback nötig
  await t.eval(() => location.reload());
  await t.expect(Selector('#teams-grid .team-card').exists).ok({ timeout: 5000 });

  await t.expect(selectors.iniRows.nth(0).find('.wsjf-value').textContent).eql('3.2');
});

test('AC-3.2e: Partielles WSJF-Update – nur ein Feld gesetzt lässt WSJF auf null', async (t) => {
  // Projekt Delta: initial kein WSJF – nur BV setzen, Rest null lassen
  await t.click(selectors.detailBtns.nth(1));

  const bvSelect = Selector('#d-businessValue');
  await t.click(bvSelect).click(bvSelect.find('option[value="8"]'));
  await waitForSave();

  // Live-Preview: TC, RR, JS fehlen noch → "–"
  const calcEl = Selector('#wsjf-calc');
  await t.expect(calcEl.textContent).eql('–');

  await t.click(selectors.detailClose);

  // Tabelle: WSJF weiterhin "–" und CSS-Klasse wsjf-empty noch gesetzt
  const wsjfCell = selectors.iniRows.nth(1).find('.wsjf-value');
  await t.expect(wsjfCell.textContent).eql('–');
  await t.expect(wsjfCell.hasClass('wsjf-empty')).ok();
});

test('AC-3.3: Modal schließen per ESC', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).notOk();

  await t.pressKey('esc');
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).ok();
});

test('AC-3.3: Modal schließen per Backdrop-Click', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).notOk();

  // Klick auf den Backdrop (nicht auf das Modal selbst)
  await t.click(selectors.detailBackdrop, { offsetX: 10, offsetY: 10 });
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).ok();
});

test('AC-3.3: Modal schließen per Close-Button', async (t) => {
  await t.click(selectors.detailBtns.nth(0));
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).notOk();

  await t.click(selectors.detailClose);
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).ok();
});

test('AC-3.4: Änderungen im Modal sind nach Schließen in Tabelle sichtbar', async (t) => {
  await t.click(selectors.detailBtns.nth(0));

  // Name ändern
  const nameInput = Selector('#d-name');
  await t.selectText(nameInput).typeText(nameInput, 'Geändertes Projekt');

  // Schritt ändern
  const schrittInput = Selector('#d-schritt');
  await t.selectText(schrittInput).typeText(schrittInput, 'Neuer Modal-Schritt');
  await waitForSave();

  // Modal schließen
  await t.click(selectors.detailClose);

  // Tabelle prüfen
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Geändertes Projekt');
  await t
    .expect(selectors.iniRows.nth(0).find('[data-field="schritt"]').value)
    .eql('Neuer Modal-Schritt');

  // Reload und prüfen (Persistenz)
  await t.wait(1000);
  await t.eval(() => location.reload());
  await t.wait(1000);
  // Prüfe über API, da Reihenfolge sich ändern kann
  const apiData = await t.eval(() => fetch('/api/cockpit').then(r => r.json()));
  const gamma = apiData.initiatives.find(i => i.id === 2001);
  await t.expect(gamma.name).eql('Geändertes Projekt');
});
