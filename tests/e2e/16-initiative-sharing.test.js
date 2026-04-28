/**
 * E2E Test: Initiative-Sharing
 * Testet die Sharing-Sektion im Initiative-Detail-Modal.
 */
import { Selector } from 'testcafe';
import { setupTest, BASE_URL } from './helpers.js';

fixture('Initiative-Sharing')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('Freigaben-Sektion erscheint im Initiative-Detail-Modal', async (t) => {
  // Open first initiative detail
  const detailBtn = Selector('[data-action="openDetail"]').nth(0);
  await t.expect(detailBtn.exists).ok('Detail-Button nicht gefunden');
  await t.click(detailBtn);

  await t.expect(Selector('#detail-page').visible).ok('Detail-Seite sollte sichtbar sein');

  // Shares section should exist
  const sharesSection = Selector('#dp-ini-shares');
  await t.wait(1000); // Wait for async load
  await t.expect(sharesSection.exists).ok('Initiative-Freigaben-Sektion nicht gefunden');
});

test('Initiative-Detail zeigt Sharing-Add-UI für Owner', async (t) => {
  const detailBtn = Selector('[data-action="openDetail"]').nth(0);
  await t.click(detailBtn);

  await t.wait(1500); // Wait for shares to load
  // Owner sees the add section
  const addSection = Selector('#dp-ini-shares-add');
  await t.expect(addSection.exists).ok('Initiative-Shares-Add-Sektion sollte existieren');
});
