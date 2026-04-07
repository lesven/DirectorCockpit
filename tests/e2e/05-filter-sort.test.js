import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-5: Filtern & Sortieren von Initiativen')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-5.1: Textsuche filtert Initiativen nach Name', async (t) => {
  // Standard: Fertige ausgeblendet → 2 Initiativen sichtbar (Gamma, Delta)
  await t.expect(selectors.iniRows.count).eql(2);

  await t.typeText(selectors.filterName, 'Gamma');
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.1: Textsuche ist case-insensitive', async (t) => {
  await t.typeText(selectors.filterName, 'gamma');
  await t.expect(selectors.iniRows.count).eql(1);
});

test('AC-5.2: Team-Dropdown filtert nach Team', async (t) => {
  // Filter nach dem Seed-Team via Value (id=1001)
  const teamOption = selectors.filterTeam.find('option[value="1001"]');
  await t.click(selectors.filterTeam).click(teamOption);
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.3: Status-Dropdown filtert korrekt', async (t) => {
  // Filter: Fertig einblenden (Toggle), dann Status-Filter auf Fertig setzen
  const toggleFertig = Selector('#toggle-fertig');
  // Zuerst Fertige einblenden
  await t.click(toggleFertig);
  await t.expect(selectors.iniRows.count).eql(3);
  // Dann Status-Filter auf Fertig
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="fertig"]'));
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Epsilon');
});

test('AC-5.3: Projektstatus-Dropdown filtert korrekt', async (t) => {
  // Filter: Kritisch → nur Projekt Delta
  await t
    .click(selectors.filterProjektstatus)
    .click(selectors.filterProjektstatus.find('option[value="kritisch"]'));
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Delta');
});

test('AC-5.4: Filter sind kombinierbar', async (t) => {
  // Setze Status = "In Arbeit" UND Projektstatus = "Alles gut"
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="yellow"]'));
  await t
    .click(selectors.filterProjektstatus)
    .click(selectors.filterProjektstatus.find('option[value="ok"]'));

  // Nur Projekt Gamma passt (status=yellow, projektstatus=ok)
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.5: Reset-Button setzt alle Filter zurück', async (t) => {
  // Setze Filter
  await t.typeText(selectors.filterName, 'Gamma');
  await t.expect(selectors.iniRows.count).eql(1);

  // Reset-Button sollte aktiv sein
  await t.expect(selectors.filterReset.hasClass('active')).ok();

  // Reset klicken
  await t.click(selectors.filterReset);

  // Fertige bleiben ausgeblendet (hideFertig bleibt erhalten), daher 2 Zeilen
  await t.expect(selectors.iniRows.count).eql(2);
  await t.expect(selectors.filterName.value).eql('');
});

test('AC-5.6: Sortierung per Spaltenklick mit visuellem Feedback', async (t) => {
  // Klick auf den ersten sortierbaren Header (Name)
  const nameHeader = Selector('th.sortable[data-sort="name"]');
  await t.click(nameHeader);

  await t.expect(nameHeader.hasClass('sort-asc')).ok();
  // Alphabetisch (ohne Epsilon, da fertig ausgeblendet): Delta, Gamma
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Delta');

  // Erneuter Klick → DESC
  await t.click(nameHeader);
  await t.expect(nameHeader.hasClass('sort-desc')).ok();
  // Umgekehrt: Gamma, Delta
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.6: WSJF-Sortierung default DESC', async (t) => {
  const wsjfHeader = selectors.sortHeaders.withText('WSJF');
  await t.click(wsjfHeader);

  await t.expect(wsjfHeader.hasClass('sort-desc')).ok();
});

test('AC-5.6b: WSJF-Sortierung DESC zeigt höchsten Wert zuerst', async (t) => {
  // Seed (ohne Epsilon, da fertig ausgeblendet): Gamma=3.2, Delta=null
  const wsjfHeader = selectors.sortHeaders.withText('WSJF');
  await t.click(wsjfHeader); // erster Klick → DESC

  // Gamma (3.2) vor Delta (null)
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
  await t.expect(selectors.iniRows.nth(1).find('.ini-name').value).eql('Projekt Delta');
});

test('AC-5.6c: WSJF-Sortierung ASC zeigt niedrigsten Wert zuerst, null zuletzt', async (t) => {
  const wsjfHeader = selectors.sortHeaders.withText('WSJF');
  await t.click(wsjfHeader); // DESC
  await t.click(wsjfHeader); // ASC

  await t.expect(wsjfHeader.hasClass('sort-asc')).ok();

  // Gamma (3.2) vor Delta (null) — Epsilon ausgeblendet
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
  await t.expect(selectors.iniRows.nth(1).find('.ini-name').value).eql('Projekt Delta');
});

test('AC-5.7: Filter und Sortierung überleben Page-Reload', async (t) => {
  // Setze Filter
  await t.typeText(selectors.filterName, 'Gamma');
  await t.expect(selectors.iniRows.count).eql(1);

  // Reload
  await t.eval(() => location.reload());
  await t.wait(500);

  // Filter sollte erhalten sein
  await t.expect(selectors.filterName.value).eql('Gamma');
  await t.expect(selectors.iniRows.count).eql(1);
});

test('AC-5.6d: WSJF-Sortierung passt sich nach Bearbeitung einer Initiative an', async (t) => {
  // Projekt Delta bekommt WSJF = (21+21+21)/3 = 21.0 → wird zum höchsten Wert
  await t.click(selectors.detailBtns.nth(1)); // Projekt Delta (2. sichtbare Zeile)

  const bvSelect = Selector('#dp-bv');
  const tcSelect = Selector('#dp-tc');
  const rrSelect = Selector('#dp-rr');
  const jsSelect = Selector('#dp-js');

  await t.click(bvSelect).click(bvSelect.find('option[value="21"]'));
  await t.click(tcSelect).click(tcSelect.find('option[value="21"]'));
  await t.click(rrSelect).click(rrSelect.find('option[value="21"]'));
  await t.click(jsSelect).click(jsSelect.find('option[value="3"]'));
  await waitForSave();
  await t.click(selectors.detailClose);

  // WSJF-Tabellenzelle von Delta zeigt 21 (= 63/3)
  await t.expect(selectors.iniRows.nth(1).find('.wsjf-value').textContent).eql('21');

  // WSJF DESC sortieren → Delta (21) soll als erste Zeile erscheinen
  const wsjfHeader = selectors.sortHeaders.withText('WSJF');
  await t.click(wsjfHeader);
  await t.expect(wsjfHeader.hasClass('sort-desc')).ok();

  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Delta');
  await t.expect(selectors.iniRows.nth(1).find('.ini-name').value).eql('Projekt Gamma'); // 3.2
});

test('AC-5.7: Kunden-Dropdown filtert nach Kunde', async (t) => {
  // Seed: Gamma → Acme GmbH (9001), Delta → Beta AG (9002), Epsilon → kein Kunde (ausgeblendet)
  await t.expect(selectors.iniRows.count).eql(2);

  const kundeOption = selectors.filterKunde.find('option[value="9001"]');
  await t.click(selectors.filterKunde).click(kundeOption);

  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.7: Kunden-Filter auf zweiten Kunden zeigt korrekte Initiative', async (t) => {
  const kundeOption = selectors.filterKunde.find('option[value="9002"]');
  await t.click(selectors.filterKunde).click(kundeOption);

  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Delta');
});

test('AC-5.7: Reset-Button setzt auch Kunden-Filter zurück', async (t) => {
  const kundeOption = selectors.filterKunde.find('option[value="9001"]');
  await t.click(selectors.filterKunde).click(kundeOption);
  await t.expect(selectors.iniRows.count).eql(1);

  await t.click(selectors.filterReset);
  // hideFertig bleibt erhalten → 2 sichtbare Initiativen
  await t.expect(selectors.iniRows.count).eql(2);
  await t.expect(selectors.filterKunde.value).eql('');
});

test('AC-5.7: Kunden-Filter und Textsuche kombinierbar', async (t) => {
  // Filter: Acme GmbH (9001) + Name "Gamma" → genau eine Zeile
  const kundeOption = selectors.filterKunde.find('option[value="9001"]');
  await t.click(selectors.filterKunde).click(kundeOption);
  await t.typeText(selectors.filterName, 'Gamma');

  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});
