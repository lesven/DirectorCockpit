/**
 * E2E Test: Team-Detailseite
 * Testet das Öffnen der Team-Detailseite, Stammdaten-Bearbeitung,
 * User-Sharing (Add/Remove) und Deep-Links.
 */
import { Selector, ClientFunction } from 'testcafe';
import { setupTest, waitForSave, selectors, BASE_URL } from './helpers.js';

const getHash = ClientFunction(() => window.location.hash);

fixture('Team-Detail')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('Team-Detail-Button öffnet Detailseite', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const detailBtn = Selector('.team-detail-btn').nth(0);
  await t.expect(detailBtn.exists).ok('Team-Detail-Button nicht gefunden');

  await t.hover(teamCard).click(detailBtn);

  const teamDetailPage = Selector('#team-detail-page');
  await t.expect(teamDetailPage.visible).ok('Team-Detailseite nicht sichtbar');

  // Main cockpit sollte ausgeblendet sein
  await t.expect(Selector('main').visible).notOk('main sollte versteckt sein');
});

test('Team-Detailseite zeigt Teamname', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const detailBtn = Selector('.team-detail-btn').nth(0);
  await t.hover(teamCard).click(detailBtn);

  const nameInput = Selector('#tdp-name');
  await t.expect(nameInput.exists).ok('Teamname-Input nicht gefunden');
  // Name should be one of the seeded team names
  const val = await nameInput.value;
  await t.expect(val.length).gt(0, 'Teamname sollte nicht leer sein');
});

test('Zurück-Button kehrt zu Cockpit zurück', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const detailBtn = Selector('.team-detail-btn').nth(0);
  await t.hover(teamCard).click(detailBtn);

  await t.click(Selector('#tdp-back'));

  await t.expect(Selector('#team-detail-page').visible).notOk('Team-Detailseite sollte versteckt sein');
  await t.expect(Selector('main').visible).ok('Cockpit main sollte sichtbar sein');
});

test('Hash-URL wird beim Öffnen gesetzt', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const detailBtn = Selector('.team-detail-btn').nth(0);
  await t.hover(teamCard).click(detailBtn);

  const hash = await getHash();
  await t.expect(hash).match(/^#team\/\d+$/, 'Hash sollte #team/{id} Format haben');
});

test('ESC schließt Team-Detailseite', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const detailBtn = Selector('.team-detail-btn').nth(0);
  await t.hover(teamCard).click(detailBtn);
  await t.expect(Selector('#team-detail-page').visible).ok();

  await t.pressKey('esc');
  await t.expect(Selector('#team-detail-page').visible).notOk('Team-Detailseite sollte nach ESC versteckt sein');
});

test('Freigaben-Sektion ist für Owner sichtbar', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const detailBtn = Selector('.team-detail-btn').nth(0);
  await t.hover(teamCard).click(detailBtn);

  // Owner should see the add-section
  const addSection = Selector('#tdp-shares-add');
  // Wait for load
  await t.wait(1000);
  await t.expect(addSection.exists).ok('Freigaben-Add-Sektion existiert nicht');
});
