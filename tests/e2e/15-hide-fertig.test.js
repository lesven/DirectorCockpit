import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL, setupTest, selectors } from './helpers.js';

const deleteCockpitViewStorage = ClientFunction(() => {
  localStorage.removeItem('cockpit_view');
});

fixture('US-15: Fertige Initiativen standardmäßig ausblenden')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

// ── Standard-Verhalten ────────────────────────────────────

test('AC-15.1: Fertige Initiativen initial ausgeblendet', async (t) => {
  // Seed: 3 Initiativen, davon Projekt Epsilon (fertig) → 2 sichtbar
  await t.expect(selectors.iniRows.count).eql(2);

  // Projekt Epsilon darf nicht in der Tabelle erscheinen
  const iniNames = selectors.iniRows.find('.ini-name');
  for (let i = 0; i < await iniNames.count; i++) {
    await t.expect(iniNames.nth(i).value).notContains('Epsilon');
  }
});

test('AC-15.2: Toggle-Button initial mit Klasse "active" und Text "Fertige ausblenden"', async (t) => {
  const btn = Selector('#toggle-fertig');
  await t.expect(btn.exists).ok();
  await t.expect(btn.hasClass('active')).ok();
  await t.expect(btn.textContent).eql('Fertige ausblenden');
});

// ── Toggle-Verhalten ─────────────────────────────────────

test('AC-15.3: Toggle zeigt Fertige nach Klick', async (t) => {
  const btn = Selector('#toggle-fertig');
  await t.click(btn);

  // Alle 3 Initiativen sichtbar
  await t.expect(selectors.iniRows.count).eql(3);

  // Button-State: kein "active", Text gewechselt
  await t.expect(btn.hasClass('active')).notOk();
  await t.expect(btn.textContent).eql('Fertige einblenden');
});

test('AC-15.4: Zweiter Toggle-Klick blendet Fertige wieder aus', async (t) => {
  const btn = Selector('#toggle-fertig');
  await t.click(btn); // einblenden
  await t.expect(selectors.iniRows.count).eql(3);

  await t.click(btn); // ausblenden
  await t.expect(selectors.iniRows.count).eql(2);
  await t.expect(btn.hasClass('active')).ok();
  await t.expect(btn.textContent).eql('Fertige ausblenden');
});

test('AC-15.5: Erneut eingeblendet zeigt Projekt Epsilon', async (t) => {
  const btn = Selector('#toggle-fertig');
  await t.click(btn);

  // Textarea-Values sind kein DOM-Text – direkt über den Value suchen
  const epsilonRow = selectors.iniRows.filter((node) =>
    node.querySelector('.ini-name') && node.querySelector('.ini-name').value === 'Projekt Epsilon'
  );
  await t.expect(epsilonRow.exists).ok();
});

// ── Persistenz ───────────────────────────────────────────

test('AC-15.6: "Fertige ausblenden" überlebt Page-Reload (Cookie-Persistenz)', async (t) => {
  // Standard: hideFertig=true — Reload → muss erhalten bleiben
  await t.eval(() => location.reload());
  await t.wait(500);

  await t.expect(selectors.iniRows.count).eql(2);
  const btn = Selector('#toggle-fertig');
  await t.expect(btn.hasClass('active')).ok();
});

test('AC-15.7: "Fertige einblenden" überlebt Page-Reload (Cookie-Persistenz)', async (t) => {
  const btn = Selector('#toggle-fertig');
  await t.click(btn); // einblenden
  await t.expect(selectors.iniRows.count).eql(3);

  await t.eval(() => location.reload());
  await t.wait(500);

  // Alle 3 Initiativen bleiben sichtbar
  await t.expect(selectors.iniRows.count).eql(3);
  await t.expect(Selector('#toggle-fertig').hasClass('active')).notOk();
});

test('AC-15.8: Frischer Start (kein Cookie) blendet Fertige aus', async (t) => {
  // localStorage löschen → Default-Verhalten
  await deleteCockpitViewStorage();
  await t.eval(() => location.reload());
  await t.wait(500);

  await t.expect(selectors.iniRows.count).eql(2);
  await t.expect(Selector('#toggle-fertig').hasClass('active')).ok();
});

// ── Interaktion mit anderen Filtern ──────────────────────

test('AC-15.9: Fertige + Status-Filter kombinierbar', async (t) => {
  // hideFertig=true + Status-Filter "yellow" → nur Projekt Gamma
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="yellow"]'));
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-15.10: Status-Filter "fertig" + hideFertig=true → keine Ergebnisse', async (t) => {
  // hideFertig filtert Fertige raus, dann nochmal explizit nach fertig filtern → leer
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="fertig"]'));
  await t.expect(selectors.iniRows.count).eql(0);
});

// ── Team-Stats-Badge ─────────────────────────────────────

test('AC-15.11: Team-Badge zeigt fertig-Anzahl bei Initiativen mit Team', async (t) => {
  // Projekt Epsilon hat kein Team → das fertig-Badge taucht in keiner Team-Karte auf
  // Direkt Badge über Index: Alpha Team ist 1. Team-Karte im Seed
  const alphaBadge = Selector('.team-card').nth(0).find('.team-stats-badge');
  await t.expect(alphaBadge.exists).ok();
  await t.expect(alphaBadge.textContent).notContains('fertig');
});
