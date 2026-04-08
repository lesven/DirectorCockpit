import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL, setupTest } from './helpers.js';

const toggleBtn = Selector('#toggle-teams');
const teamsGrid = Selector('#teams-grid');

const getTeamsCollapsedFromStorage = ClientFunction(() => {
  try {
    const stored = localStorage.getItem('cockpit_view');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.teamsCollapsed ?? null;
  } catch {
    return null;
  }
});

const clearTeamsCollapsedFromStorage = ClientFunction(() => {
  try {
    const stored = localStorage.getItem('cockpit_view');
    if (!stored) return;
    const parsed = JSON.parse(stored);
    delete parsed.teamsCollapsed;
    localStorage.setItem('cockpit_view', JSON.stringify(parsed));
  } catch { /* ignore */ }
});

fixture('US-15: Teams ein-/ausklappen')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
    await clearTeamsCollapsedFromStorage();
    await t.eval(() => location.reload());
    await t.wait(800);
  });

test('AC-15.1: Toggle-Button ist im Teams-Header sichtbar', async (t) => {
  await t.expect(toggleBtn.exists).ok('Toggle-Button #toggle-teams sollte existieren');
  await t.expect(toggleBtn.visible).ok('Toggle-Button sollte sichtbar sein');
});

test('AC-15.2: Teams-Grid ist standardmäßig ausgeklappt', async (t) => {
  const hasCollapsed = await teamsGrid.hasClass('collapsed');
  await t.expect(hasCollapsed).notOk('Teams-Grid sollte standardmäßig nicht collapsed sein');
});

test('AC-15.3: Klick klappt Teams ein (collapsed-Klasse wird gesetzt)', async (t) => {
  await t.click(toggleBtn);

  await t.expect(teamsGrid.hasClass('collapsed')).ok('Teams-Grid sollte collapsed-Klasse haben');
});

test('AC-15.4: Zweiter Klick klappt Teams wieder aus', async (t) => {
  await t.click(toggleBtn);
  await t.click(toggleBtn);

  await t.expect(teamsGrid.hasClass('collapsed')).notOk('Teams-Grid sollte nicht mehr collapsed sein');
});

test('AC-15.5: Button bekommt collapsed-Klasse beim Einklappen', async (t) => {
  await t.click(toggleBtn);

  await t.expect(toggleBtn.hasClass('collapsed')).ok('Toggle-Button sollte collapsed-Klasse haben');
});

test('AC-15.6: teamsCollapsed=true wird in localStorage gespeichert', async (t) => {
  await t.click(toggleBtn);

  const stored = await getTeamsCollapsedFromStorage();
  await t.expect(stored).eql(true, 'localStorage cockpit_view.teamsCollapsed sollte true sein');
});

test('AC-15.7: teamsCollapsed=false wird nach Ausklappen gespeichert', async (t) => {
  await t.click(toggleBtn); // einklappen
  await t.click(toggleBtn); // ausklappen

  const stored = await getTeamsCollapsedFromStorage();
  await t.expect(stored).eql(false, 'localStorage cockpit_view.teamsCollapsed sollte false sein');
});

test('AC-15.8: Eingeklappter Zustand bleibt nach Page-Reload erhalten', async (t) => {
  await t.click(toggleBtn); // einklappen

  // Warten bis localStorage gespeichert
  await t.wait(200);

  // Seite neu laden
  await t.eval(() => location.reload());
  await t.wait(800);

  await t.expect(teamsGrid.hasClass('collapsed')).ok('Teams-Grid sollte nach Reload noch collapsed sein');
  await t.expect(toggleBtn.hasClass('collapsed')).ok('Toggle-Button sollte nach Reload noch collapsed sein');
});

test('AC-15.9: Ausgeklappter Zustand bleibt nach Page-Reload erhalten', async (t) => {
  await t.click(toggleBtn); // einklappen
  await t.wait(200);
  await t.click(toggleBtn); // ausklappen
  await t.wait(200);

  await t.eval(() => location.reload());
  await t.wait(800);

  await t.expect(teamsGrid.hasClass('collapsed')).notOk('Teams-Grid sollte nach Reload nicht collapsed sein');
});

test('AC-15.10: Einklappen beeinflusst nicht den Initiativen-Bereich', async (t) => {
  const iniSection = Selector('#ini-body');

  await t.click(toggleBtn); // Teams einklappen

  await t.expect(iniSection.exists).ok('Initiativen-Body sollte noch vorhanden sein');
});
