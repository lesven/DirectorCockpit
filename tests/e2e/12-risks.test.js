import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-12: Risiko-Management (CRUD)')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

/** Öffnet die Risiko-Seite der ersten Initiative (Projekt Gamma). */
async function openRiskPage(t) {
  const riskBtn = selectors.iniRows.nth(0).find('[data-action="openRisks"]');
  await t.hover(selectors.iniRows.nth(0));
  await t.click(riskBtn);
  await t.expect(selectors.riskPage.hasAttribute('hidden')).notOk();
}

test('AC-R-WSJF-1: WSJF-Score der Initiative wird im Risk-Modal korrekt angezeigt', async (t) => {
  // Projekt Gamma: BV=8, TC=5, RR=3, JS=5 → WSJF = 3.2
  await openRiskPage(t);

  const wsjfValue = Selector('.risk-ini-details .risk-ini-value').withText('3.2');
  await t.expect(wsjfValue.exists).ok('WSJF-Score 3.2 sollte im Risk-Modal sichtbar sein');
});

test('AC-R-WSJF-2: Risk-Modal zeigt "–" wenn keine WSJF-Werte gesetzt sind', async (t) => {
  // Projekt Delta (Index 1) hat keine WSJF-Werte
  const riskBtn = selectors.iniRows.nth(1).find('[data-action="openRisks"]');
  await t.hover(selectors.iniRows.nth(1));
  await t.click(riskBtn);
  await t.expect(selectors.riskPage.hasAttribute('hidden')).notOk();

  const wsjfValue = Selector('.risk-ini-details').find('.risk-ini-value').withText('\u2013');
  await t.expect(wsjfValue.exists).ok('Kein WSJF-Score → "–" soll im Risk-Modal erscheinen');
});

// ── Navigation ────────────────────────────────────────────────────────────────

test('AC-R-1: Risk-Button in Initiativentabelle öffnet Risiko-Seite', async (t) => {
  await openRiskPage(t);

  await t.expect(selectors.riskPage.hasAttribute('hidden')).notOk();
  // Hauptansicht ist versteckt
  await t.expect(Selector('header').hasAttribute('hidden')).ok();
  await t.expect(Selector('main').hasAttribute('hidden')).ok();
});

test('AC-R-2: Risk-Button zeigt Anzahl der Risiken als Text', async (t) => {
  // Projekt Gamma (id 2001) hat 2 Risiken im Seed
  const riskBtn = selectors.iniRows.nth(0).find('[data-action="openRisks"]');
  await t.hover(selectors.iniRows.nth(0));
  await t.expect(riskBtn.textContent).contains('2', 'Button sollte Risikoanzahl enthalten');
});

test('AC-R-3: Initiative ohne Risiken zeigt leere Risiko-Seite', async (t) => {
  // Projekt Delta (idx 1) hat keine Risiken
  const riskBtn = selectors.iniRows.nth(1).find('[data-action="openRisks"]');
  await t.hover(selectors.iniRows.nth(1));
  await t.click(riskBtn);
  await t.expect(selectors.riskPage.hasAttribute('hidden')).notOk();
  await t.expect(selectors.riskCards.count).eql(0, 'Keine Risikokarten für Initiative ohne Risiken');
  await t.expect(Selector('.risk-empty').exists).ok('Leer-Hinweis sollte sichtbar sein');
});

// ── Risiko anlegen ────────────────────────────────────────────────────────────

test('AC-R-4: Neues Risiko anlegen erzeugt Karte', async (t) => {
  await openRiskPage(t);

  const countBefore = await selectors.riskCards.count;
  await t.click(selectors.riskAddBtn);
  await waitForSave();

  await t.expect(selectors.riskCards.count).eql(countBefore + 1, 'Eine neue Risikokarte sollte erscheinen');
});

test('AC-R-5: Neues Risiko wird nach Reload persistiert', async (t) => {
  await openRiskPage(t);

  await t.click(selectors.riskAddBtn);
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  // Projekt Gamma hatte 2 Risiken, jetzt muss es 3 sein
  const gamma2001Risks = apiData.risks.filter((r) => r.initiative === 2001);
  await t.expect(gamma2001Risks.length).eql(3, 'Neues Risiko muss persistiert sein');
});

// ── Bezeichnung & Beschreibung ────────────────────────────────────────────────

test('AC-R-6: Risiko-Bezeichnung bearbeiten und persistieren', async (t) => {
  await openRiskPage(t);

  const firstBezeichnung = selectors.riskBezeichnungInputs.nth(0);
  await t.selectText(firstBezeichnung).typeText(firstBezeichnung, 'Neuer Risikoname');
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4001);
  await t.expect(risk.bezeichnung).eql('Neuer Risikoname');
});

test('AC-R-7: Risiko-Beschreibung bearbeiten und persistieren', async (t) => {
  await openRiskPage(t);

  const firstBeschreibung = selectors.riskBeschreibungTextareas.nth(0);
  await t.click(firstBeschreibung).selectText(firstBeschreibung).typeText(firstBeschreibung, 'Neue Beschreibung');
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4001);
  await t.expect(risk.beschreibung).eql('Neue Beschreibung');
});

// ── Wahrscheinlichkeit & Schadensausmaß ──────────────────────────────────────

test('AC-R-8: Eintrittswahrscheinlichkeit ändern und persistieren', async (t) => {
  await openRiskPage(t);

  const firstWSelect = selectors.riskWahrscheinlichkeitSelects.nth(0);
  await t.click(firstWSelect).click(firstWSelect.find('option[value="5"]'));
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4001);
  await t.expect(risk.eintrittswahrscheinlichkeit).eql(5);
});

test('AC-R-9: Schadensausmaß ändern und persistieren', async (t) => {
  await openRiskPage(t);

  const firstSSelect = selectors.riskSchadensausmasSelects.nth(0);
  await t.click(firstSSelect).click(firstSSelect.find('option[value="2"]'));
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4001);
  await t.expect(risk.schadensausmass).eql(2);
});

// ── Score-Badge ───────────────────────────────────────────────────────────────

test('AC-R-10: Risiko-Score-Badge zeigt berechneten Wert an', async (t) => {
  await openRiskPage(t);

  // Seed: Risiko 4001 hat W=3, S=4 → Score = 12 → "Hoch"
  const firstBadge = selectors.riskCards.nth(0).find('.risk-badge');
  await t.expect(firstBadge.exists).ok('Score-Badge sollte vorhanden sein');
  await t.expect(firstBadge.textContent).contains('12', 'Score 3×4=12 sollte im Badge stehen');
});

test('AC-R-11: Score-Badge aktualisiert sich bei Änderung von W oder S', async (t) => {
  await openRiskPage(t);

  // Risiko 4001: W=3, S=4 → Score 12. Setze W=1 → Score = 1×4=4 → "Gering"
  const firstWSelect = selectors.riskWahrscheinlichkeitSelects.nth(0);
  await t.click(firstWSelect).click(firstWSelect.find('option[value="1"]'));

  const firstBadge = selectors.riskCards.nth(0).find('.risk-badge');
  await t.expect(firstBadge.textContent).contains('4', 'Score sollte nach Änderung 4 sein');
  await t.expect(firstBadge.hasClass('risk-low')).ok('Score 4 → "Gering"-Klasse');
});

// ── Löschen ───────────────────────────────────────────────────────────────────

test('AC-R-12: Risiko löschen mit Bestätigung entfernt Karte', async (t) => {
  await openRiskPage(t);

  const countBefore = await selectors.riskCards.count;
  await t.setNativeDialogHandler(() => true);
  await t.hover(selectors.riskCards.nth(0));
  await t.click(selectors.riskDeleteBtns.nth(0));

  await t.expect(selectors.riskCards.count).eql(countBefore - 1, 'Eine Karte sollte entfernt sein');
});

test('AC-R-13: Risiko löschen abbrechen behält Karte', async (t) => {
  await openRiskPage(t);

  const countBefore = await selectors.riskCards.count;
  await t.setNativeDialogHandler(() => false);
  await t.hover(selectors.riskCards.nth(0));
  await t.click(selectors.riskDeleteBtns.nth(0));

  await t.expect(selectors.riskCards.count).eql(countBefore, 'Anzahl sollte unverändert sein');
});

test('AC-R-14: Gelöschtes Risiko wird nach Reload nicht mehr angezeigt', async (t) => {
  await openRiskPage(t);

  await t.setNativeDialogHandler(() => true);
  await t.hover(selectors.riskCards.nth(0));
  await t.click(selectors.riskDeleteBtns.nth(0));
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk4001 = apiData.risks.find((r) => r.id === 4001);
  await t.expect(risk4001 === undefined || risk4001 === null).ok('Gelöschtes Risiko darf nicht mehr in API sein');
});

// ── Initiative-Isolation ─────────────────────────────────────────────────────

test('AC-R-15: Risiken einer Initiative sind von anderen isoliert', async (t) => {
  // Projekt Delta (idx 1) hat keine Risiken im Seed
  const riskBtn2 = selectors.iniRows.nth(1).find('[data-action="openRisks"]');
  await t.hover(selectors.iniRows.nth(1));
  await t.click(riskBtn2);
  await t.expect(selectors.riskPage.hasAttribute('hidden')).notOk();

  // Keine Risiken von Projekt Gamma sichtbar
  await t.expect(selectors.riskCards.count).eql(0, 'Projekt Delta hat keine Risiken');
});
