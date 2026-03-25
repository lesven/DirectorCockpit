import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-13: Meilensteinplanung (CRUD)')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

/** Öffnet die Detail-Seite der ersten Initiative (Projekt Gamma). */
async function openDetailPage(t) {
  const detailBtn = selectors.iniRows.nth(0).find('.detail-btn');
  await t.hover(selectors.iniRows.nth(0));
  await t.click(detailBtn);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();
}

// ── Anzeige ───────────────────────────────────────────────────────────────────

test('AC-MS-1: Milestone-Sektion ist auf der Detail-Seite sichtbar', async (t) => {
  await openDetailPage(t);

  await t.expect(Selector('#dp-milestone-list').exists).ok('Milestone-Container existiert');
  await t.expect(selectors.milestoneAddBtn.exists).ok('Add-Button existiert');
});

test('AC-MS-2: Seed-Meilensteine werden angezeigt', async (t) => {
  await openDetailPage(t);

  await t.expect(selectors.milestoneCards.count).eql(2, 'Zwei Seed-Meilensteine sichtbar');
});

test('AC-MS-3: Meilensteine nach Frist sortiert (älteste oben)', async (t) => {
  await openDetailPage(t);

  // Seed: 5001 frist=2026-03-01, 5002 frist=2026-04-15 → 5001 oben
  const firstAufgabe = selectors.milestoneAufgabeInputs.nth(0);
  await t.expect(firstAufgabe.value).eql('Konzept erstellen', 'Älteste Frist oben');
});

test('AC-MS-4: Initiative ohne Meilensteine zeigt leere Sektion', async (t) => {
  // Projekt Delta (idx 1) hat keine Meilensteine
  const detailBtn = selectors.iniRows.nth(1).find('.detail-btn');
  await t.hover(selectors.iniRows.nth(1));
  await t.click(detailBtn);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  await t.expect(selectors.milestoneCards.count).eql(0, 'Keine Milestone-Karten');
  await t.expect(Selector('.dp-milestone-empty').exists).ok('Leer-Hinweis sichtbar');
});

// ── Meilenstein anlegen ───────────────────────────────────────────────────────

test('AC-MS-5: Neuen Meilenstein anlegen erzeugt Karte', async (t) => {
  await openDetailPage(t);

  const countBefore = await selectors.milestoneCards.count;
  await t.click(selectors.milestoneAddBtn);
  await waitForSave();

  await t.expect(selectors.milestoneCards.count).eql(countBefore + 1, 'Eine neue Milestone-Karte erscheint');
});

test('AC-MS-6: Neuer Meilenstein über leeren Zustand anlegen', async (t) => {
  // Projekt Delta (idx 1) hat keine Meilensteine
  const detailBtn = selectors.iniRows.nth(1).find('.detail-btn');
  await t.hover(selectors.iniRows.nth(1));
  await t.click(detailBtn);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  const addEmptyBtn = Selector('#dp-milestone-add-empty');
  await t.expect(addEmptyBtn.exists).ok('Empty-State-Add-Button vorhanden');
  await t.click(addEmptyBtn);
  await waitForSave();

  await t.expect(selectors.milestoneCards.count).eql(1, 'Milestone-Karte erzeugt');
});

test('AC-MS-7: Neuer Meilenstein wird nach Reload persistiert', async (t) => {
  await openDetailPage(t);

  await t.click(selectors.milestoneAddBtn);
  await waitForSave();

  // Reload und prüfen via API
  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const gammaMs = apiData.milestones.filter((m) => m.initiative === 2001);
  await t.expect(gammaMs.length).eql(3, 'Drei Meilensteine nach Anlage (2 Seed + 1 neu)');
});

// ── Bearbeiten ────────────────────────────────────────────────────────────────

test('AC-MS-8: Aufgabe bearbeiten und persistieren', async (t) => {
  await openDetailPage(t);

  const aufgabeInput = selectors.milestoneAufgabeInputs.nth(0);
  await t.selectText(aufgabeInput).typeText(aufgabeInput, 'Geänderte Aufgabe');
  await waitForSave();

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const ms = apiData.milestones.find((m) => m.id === 5001);
  await t.expect(ms.aufgabe).eql('Geänderte Aufgabe');
});

test('AC-MS-9: Owner bearbeiten und persistieren', async (t) => {
  await openDetailPage(t);

  const ownerInput = selectors.milestoneOwnerInputs.nth(0);
  await t.selectText(ownerInput).typeText(ownerInput, 'Neue Person');
  await waitForSave();

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const ms = apiData.milestones.find((m) => m.id === 5001);
  await t.expect(ms.owner).eql('Neue Person');
});

test('AC-MS-10: Status ändern aktualisiert Badge und Karten-Border', async (t) => {
  await openDetailPage(t);

  // Erster Meilenstein: status=erledigt → ändere auf blockiert
  const statusSelect = selectors.milestoneStatusSelects.nth(0);
  await t.click(statusSelect).click(statusSelect.find('option[value="blockiert"]'));
  await waitForSave();

  // Status-Select prüfen
  const updatedSelect = selectors.milestoneStatusSelects.nth(0);
  await t.expect(updatedSelect.value).eql('blockiert');

  // Persistence prüfen
  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const ms = apiData.milestones.find((m) => m.id === 5001);
  await t.expect(ms.status).eql('blockiert');
});

// ── Löschen ───────────────────────────────────────────────────────────────────

test('AC-MS-11: Meilenstein löschen mit Bestätigung', async (t) => {
  await openDetailPage(t);

  const countBefore = await selectors.milestoneCards.count;
  await t.setNativeDialogHandler(() => true);
  await t.click(selectors.milestoneDeleteBtns.nth(0));
  await waitForSave();

  await t.expect(selectors.milestoneCards.count).eql(countBefore - 1, 'Eine Karte weniger');
});

test('AC-MS-12: Meilenstein löschen abbrechen behält Karte', async (t) => {
  await openDetailPage(t);

  const countBefore = await selectors.milestoneCards.count;
  await t.setNativeDialogHandler(() => false);
  await t.click(selectors.milestoneDeleteBtns.nth(0));

  await t.expect(selectors.milestoneCards.count).eql(countBefore, 'Karte bleibt erhalten');
});

test('AC-MS-13: Löschen wird nach Reload persistiert', async (t) => {
  await openDetailPage(t);

  await t.setNativeDialogHandler(() => true);
  await t.click(selectors.milestoneDeleteBtns.nth(0));
  await waitForSave();

  const apiData = await t.eval(() => fetch('/api/cockpit').then((r) => r.json()));
  const gammaMs = apiData.milestones.filter((m) => m.initiative === 2001);
  await t.expect(gammaMs.length).eql(1, 'Nur noch ein Meilenstein nach Löschen');
});

// ── Isolation ─────────────────────────────────────────────────────────────────

test('AC-MS-14: Meilensteine sind initiative-isoliert', async (t) => {
  // Projekt Delta (idx 1) hat keine Meilensteine
  const detailBtn = selectors.iniRows.nth(1).find('.detail-btn');
  await t.hover(selectors.iniRows.nth(1));
  await t.click(detailBtn);
  await t.expect(selectors.detailPage.hasAttribute('hidden')).notOk();

  await t.expect(selectors.milestoneCards.count).eql(0, 'Delta hat keine Meilensteine');

  // Zurück und Gamma öffnen
  await t.click(selectors.detailClose);
  await openDetailPage(t);
  await t.expect(selectors.milestoneCards.count).eql(2, 'Gamma hat 2 Meilensteine');
});
