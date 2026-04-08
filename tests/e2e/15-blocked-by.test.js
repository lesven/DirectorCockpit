/**
 * E2E-Tests: Initiative blockedBy – Dominoeffekt-Tracking
 */
import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL, waitForSave } from './helpers.js';

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).then((r) => r.ok);
});

const clearViewState = ClientFunction(() => {
  localStorage.removeItem('cockpit_view');
});

const reloadPage = ClientFunction(() => location.reload());

const SEED = {
  kw: '16',
  kunden: [],
  teams: [{ id: 6001, name: 'Blocker-Team', status: 'grey', fokus: '', schritt: '' }],
  initiatives: [
    {
      id: 7001,
      name: 'Blocker-Initiative',
      team: 6001,
      customer: null,
      status: 'yellow',
      projektstatus: 'ok',
      schritt: '',
      frist: null,
      notiz: '',
      blockedBy: [],
    },
    {
      id: 7002,
      name: 'Blockierte-Initiative',
      team: 6001,
      customer: null,
      status: 'yellow',
      projektstatus: 'ok',
      schritt: '',
      frist: null,
      notiz: '',
      blockedBy: [7001],
    },
    {
      id: 7003,
      name: 'Freie-Initiative',
      team: 6001,
      customer: null,
      status: 'grey',
      projektstatus: 'ok',
      schritt: '',
      frist: null,
      notiz: '',
      blockedBy: [],
    },
  ],
  nicht_vergessen: [],
  risks: [],
  milestones: [],
};

async function seedAndOpen(t) {
  await seedViaAPI(JSON.stringify(SEED));
  await t.deleteCookies('cockpit_view');
  await clearViewState();
  await reloadPage();
  await Selector('#ini-body .ini-row', { timeout: 5000 })();
}

fixture('US-15: BlockedBy – Dominoeffekt')
  .page(BASE_URL)
  .beforeEach((t) => seedAndOpen(t));

// ─── AC 1: Badge sichtbar wenn blockiert ─────────────────────

test('Blockierte Initiative zeigt 🚧-Badge, freie Initiative nicht', async (t) => {
  // hideFertig deaktivieren damit alle Reihen sichtbar sind
  const toggleFertig = Selector('#toggle-fertig');
  if (await toggleFertig.hasClass('active')) {
    await t.click(toggleFertig);
  }

  const rows = Selector('.ini-row');
  const blockedRow = rows.withText('Blockierte-Initiative');
  const freeRow    = rows.withText('Freie-Initiative');

  await t.expect(blockedRow.find('.ini-blocked-badge').exists).ok('Blockierte-Initiative soll Badge haben');
  await t.expect(freeRow.find('.ini-blocked-badge').exists).notOk('Freie-Initiative soll kein Badge haben');
});

// ─── AC 2: Blocker fertig → Badge verschwindet ───────────────

test('Badge verschwindet wenn Blocker-Initiative auf fertig gesetzt wird', async (t) => {
  // hideFertig deaktivieren
  const toggleFertig = Selector('#toggle-fertig');
  if (await toggleFertig.hasClass('active')) {
    await t.click(toggleFertig);
  }

  // Blocker auf fertig setzen
  const blockerRow      = Selector('.ini-row').withText('Blocker-Initiative');
  const blockerStatus   = blockerRow.find('[data-field="status"]');
  await t.click(blockerStatus).click(blockerStatus.find('option[value="fertig"]'));
  await waitForSave();

  // Badge soll weg sein
  const blockedRow = Selector('.ini-row').withText('Blockierte-Initiative');
  await t.expect(blockedRow.find('.ini-blocked-badge').exists).notOk('Badge soll nach fertig verschwinden');
});

// ─── AC 3: Filter „Blockierte" zeigt nur blockierte Initiativen ──

test('Toggle Blockierte zeigt nur aktuell blockierte Initiativen', async (t) => {
  // hideFertig deaktivieren
  const toggleFertig = Selector('#toggle-fertig');
  if (await toggleFertig.hasClass('active')) {
    await t.click(toggleFertig);
  }

  // Vorher: 3 Zeilen sichtbar
  await t.expect(Selector('.ini-row').count).gte(3);

  // Toggle aktivieren
  await t.click(Selector('#toggle-blocked'));

  // Nur Blockierte-Initiative soll sichtbar sein
  await t.expect(Selector('.ini-row').count).eql(1);
  await t.expect(Selector('.ini-row').withText('Blockierte-Initiative').exists).ok();

  // Toggle deaktivieren → alle wieder sichtbar
  await t.click(Selector('#toggle-blocked'));
  await t.expect(Selector('.ini-row').count).gte(3);
});

// ─── AC 4: blockedBy im Detail-Modal bearbeitbar ────────────────

test('Detail-Modal zeigt blockedBy-Sektion und Outgoing-Liste', async (t) => {
  // hideFertig deaktivieren
  const toggleFertig = Selector('#toggle-fertig');
  if (await toggleFertig.hasClass('active')) {
    await t.click(toggleFertig);
  }

  // Detail der Blockierte-Initiative öffnen
  const blockedRow   = Selector('.ini-row').withText('Blockierte-Initiative');
  const detailBtn    = blockedRow.find('[data-action="openDetail"]').nth(0);
  await t.click(detailBtn);

  const detailPage = Selector('#detail-page');
  await t.expect(detailPage.hasAttribute('hidden')).notOk('Detail-Page muss offen sein');

  // blockedBy-Sektion vorhanden
  const blockedBySelect = Selector('#dp-blocked-by-select');
  await t.expect(blockedBySelect.exists).ok('blockedBy-Multi-Select muss existieren');

  // Blocker-Initiative muss als selected erscheinen
  const selectedOption = blockedBySelect.find('option[value="7001"]');
  await t.expect(selectedOption.exists).ok();

  // Outgoing-Sektion muss vorhanden sein
  const outgoingList = Selector('.blocked-outgoing-list');
  await t.expect(outgoingList.exists).ok('Outgoing-Liste muss existieren');
});
