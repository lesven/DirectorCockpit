import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-11: ROAMing für Risiken')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

/** Öffnet die Detail-Seite der ersten Initiative (Projekt Gamma, id 2001). */
async function openRiskPage(t) {
  const riskBtn = selectors.iniRows.nth(0).find('[data-action="openRisks"]');
  await t.hover(selectors.iniRows.nth(0));
  await t.click(riskBtn);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk('Detail-Seite sollte sichtbar sein');
}

test('AC-ROAM-1: Risiko-Seite öffnet sich und zeigt Risiken der Initiative', async (t) => {
  await openRiskPage(t);

  await t.expect(selectors.riskCards.count).eql(2, 'Projekt Gamma hat 2 Risiken im Seed');
});

test('AC-ROAM-2: ROAM-Badge wird für Risiken mit gesetztem Status angezeigt', async (t) => {
  await openRiskPage(t);

  // Risiko 4001 hat roamStatus: 'mitigated' → badge sichtbar
  const firstCard = selectors.riskCards.nth(0);
  await t.expect(firstCard.find('.roam-badge').exists).ok('Risiko mit ROAM-Status zeigt Badge');
  await t.expect(firstCard.find('.roam-badge').textContent).eql('Mitigated');
});

test('AC-ROAM-3: Kein ROAM-Badge für Risiko ohne Status', async (t) => {
  await openRiskPage(t);

  // Risiko 4002 hat roamStatus: null → kein badge
  const secondCard = selectors.riskCards.nth(1);
  await t.expect(secondCard.find('.roam-badge').exists).notOk('Risiko ohne ROAM-Status zeigt kein Badge');
});

test('AC-ROAM-4: ROAM-Select zeigt gespeicherten Status vorausgewählt', async (t) => {
  await openRiskPage(t);

  const firstSelect = selectors.riskRoamSelects.nth(0);
  await t.expect(firstSelect.value).eql('mitigated', 'Vorausgewählter Wert muss "mitigated" sein');
});

test('AC-ROAM-5: ROAM-Select für Risiko ohne Status zeigt Leer-Option', async (t) => {
  await openRiskPage(t);

  const secondSelect = selectors.riskRoamSelects.nth(1);
  await t.expect(secondSelect.value).eql('', 'Kein Status → Leer-Option ausgewählt');
});

test('AC-ROAM-6: ROAM-Status setzen und nach Reload persistiert', async (t) => {
  await openRiskPage(t);

  // Zweites Risiko (ohne Status) → setze auf "owned"
  const secondSelect = selectors.riskRoamSelects.nth(1);
  await t.click(secondSelect).click(secondSelect.find('option[value="owned"]'));
  await waitForSave();

  // Zurück und Seite neu laden
  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  // Über API prüfen
  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4002);
  await t.expect(risk.roamStatus).eql('owned', 'ROAM-Status muss persistiert sein');
});

test('AC-ROAM-7: ROAM-Status zurücksetzen auf kein Status', async (t) => {
  await openRiskPage(t);

  // Erstes Risiko hat 'mitigated' → auf Leer setzen
  const firstSelect = selectors.riskRoamSelects.nth(0);
  await t.click(firstSelect).click(firstSelect.find('option[value=""]'));
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4001);
  await t
    .expect(risk.roamStatus === null || risk.roamStatus === '')
    .ok('ROAM-Status muss null/leer sein nach Zurücksetzen');
});

test('AC-ROAM-8: ROAM-Notizfeld zeigt gespeicherten Text', async (t) => {
  await openRiskPage(t);

  const firstNotiz = selectors.riskRoamNotiz.nth(0);
  await t
    .expect(firstNotiz.value)
    .eql('Fallback-Lieferant vertraglich gesichert', 'Vorhandene ROAM-Notiz wird angezeigt');
});

test('AC-ROAM-9: ROAM-Notiz bearbeiten und persistieren', async (t) => {
  await openRiskPage(t);

  const secondNotiz = selectors.riskRoamNotiz.nth(1);
  await t.click(secondNotiz).typeText(secondNotiz, 'Mehrere Angebote einholen');
  await waitForSave();

  await t.click(selectors.riskBack);
  await t.eval(() => location.reload());
  await t.wait(800);

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const risk = apiData.risks.find((r) => r.id === 4002);
  await t.expect(risk.roamNotiz).eql('Mehrere Angebote einholen', 'ROAM-Notiz muss persistiert sein');
});

test('AC-ROAM-10: Neues Risiko hat standardmäßig keinen ROAM-Status', async (t) => {
  await openRiskPage(t);

  const countBefore = await selectors.riskCards.count;
  await t.click(selectors.riskAddBtn);
  await waitForSave();

  // Das neue Risiko ist das letzte
  const lastSelect = selectors.riskRoamSelects.nth(countBefore);
  await t.expect(lastSelect.value).eql('', 'Neues Risiko hat keinen ROAM-Status');
});

test('AC-ROAM-11: ROAM-Select hat genau 5 Optionen (4 + Leer)', async (t) => {
  await openRiskPage(t);

  const select = selectors.riskRoamSelects.nth(0);
  await t.expect(select.find('option').count).eql(5, '4 ROAM-Werte + 1 Leer-Option');
});

test('AC-ROAM-12: Zurück-Button schließt Detail-Seite und zeigt Hauptansicht', async (t) => {
  await openRiskPage(t);

  await t.click(selectors.riskBack);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).ok('Detail-Seite sollte versteckt sein');
  await t.expect(Selector('header').hasAttribute('hidden')).notOk('Header sollte wieder sichtbar sein');
});
