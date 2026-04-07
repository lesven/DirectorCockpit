import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL } from './helpers.js';

// ── Seed mit überfälligen Meilensteinen ──────────────────────────────────────

const OVERDUE_SEED = {
  kw: '13',
  teams: [{ id: 9001, name: 'Overdue Team', status: 'yellow', fokus: '', schritt: '' }],
  initiatives: [
    {
      id: 9101,
      name: 'Initiative mit Fälligkeit',
      team: 9001,
      status: 'yellow',
      projektstatus: 'ok',
      schritt: '',
      frist: '',
      notiz: '',
      businessValue: null,
      timeCriticality: null,
      riskReduction: null,
      jobSize: null,
    },
    {
      id: 9102,
      name: 'Abgeschlossene Initiative',
      team: 9001,
      status: 'fertig',
      projektstatus: 'ok',
      schritt: '',
      frist: '',
      notiz: '',
      businessValue: null,
      timeCriticality: null,
      riskReduction: null,
      jobSize: null,
    },
  ],
  nicht_vergessen: [],
  risks: [],
  milestones: [
    {
      id: 9201,
      initiative: 9101,
      aufgabe: 'Überfälliger Task',
      owner: 'Max',
      status: 'offen',
      frist: '2026-03-10',
      bemerkung: '',
    },
    {
      id: 9202,
      initiative: 9101,
      aufgabe: 'Heute fälliger Task',
      owner: 'Anna',
      status: 'in_bearbeitung',
      frist: '2026-03-25',
      bemerkung: '',
    },
    {
      id: 9203,
      initiative: 9101,
      aufgabe: 'Erledigter Task',
      owner: 'Tom',
      status: 'erledigt',
      frist: '2026-03-01',
      bemerkung: '',
    },
    {
      id: 9204,
      initiative: 9101,
      aufgabe: 'Zukünftiger Task',
      owner: 'Lisa',
      status: 'offen',
      frist: '2099-12-31',
      bemerkung: '',
    },
    {
      id: 9205,
      initiative: 9102,
      aufgabe: 'Task in fertiger Ini',
      owner: 'Ben',
      status: 'offen',
      frist: '2026-03-10',
      bemerkung: '',
    },
  ],
};

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).then((r) => r.ok);
});

const reloadPage = ClientFunction(() => { location.reload(); });

fixture('US-15: Überfällige Meilensteine auf Startseite')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await seedViaAPI(JSON.stringify(OVERDUE_SEED));
    await t.deleteCookies('cockpit_view');
    await reloadPage();
    await Selector('#teams-grid .team-card', { timeout: 5000 })();
  });

// ── Selektoren ────────────────────────────────────────────────────────────────

const overdueSection   = Selector('#overdue-milestones-section');
const overdueBody      = Selector('#overdue-milestones-body');
const overdueRows      = Selector('#overdue-milestones-body .overdue-row');
const overdueCount     = Selector('#overdue-milestones-count');
const detailPage       = Selector('#detail-page');

// ── Tests ─────────────────────────────────────────────────────────────────────

test('AC-OVD-1: Abschnitt "Überfällige Meilensteine" ist sichtbar', async (t) => {
  await t
    .expect(overdueSection.exists).ok('Abschnitt existiert im DOM')
    .expect(overdueSection.hasAttribute('hidden')).notOk('Abschnitt ist nicht ausgeblendet');
});

test('AC-OVD-2: Sektion erscheint zwischen Teams und Initiativen', async (t) => {
  const teamsSection = Selector('#teams-grid').parent('section');
  const iniSection   = Selector('#ini-body').parent('table').parent('section');

  const overdueTop = await overdueSection.getBoundingClientRectProperty('top');
  const teamsBottom = await teamsSection.getBoundingClientRectProperty('bottom');
  const iniTop      = await iniSection.getBoundingClientRectProperty('top');

  await t
    .expect(overdueTop).gt(teamsBottom, 'Nach Teams-Sektion')
    .expect(overdueTop).lt(iniTop, 'Vor Initiativen-Sektion');
});

test('AC-OVD-3: Genau zwei überfällige/fällige Milestones sind sichtbar', async (t) => {
  // Erwartet: 9201 (offen, 2026-03-10) + 9202 (in_bearbeitung, 2026-03-25)
  // Nicht: 9203 (erledigt), 9204 (frist 2099), 9205 (ini fertig)
  await t.expect(overdueRows.count).eql(2, 'Genau 2 Zeilen');
});

test('AC-OVD-4: Count-Badge zeigt korrekte Anzahl', async (t) => {
  await t.expect(overdueCount.textContent).eql('2');
});

test('AC-OVD-5: Ältester Milestone erscheint zuerst (frist aufsteigend)', async (t) => {
  // 2026-03-10 < 2026-03-25
  const firstFrist = await overdueBody.find('.overdue-frist').nth(0).textContent;
  await t.expect(firstFrist).eql('2026-03-10', 'Älteste Frist oben');
});

test('AC-OVD-6: Klick auf Initiative-Button öffnet die Detail-Seite', async (t) => {
  const iniBtn = overdueBody.find('.overdue-ini-btn').nth(0);
  await t
    .expect(iniBtn.textContent).eql('Initiative mit Fälligkeit')
    .click(iniBtn)
    .expect(detailPage.hasAttribute('hidden')).notOk('Detail-Seite wurde geöffnet');
});

test('AC-OVD-7: Sektion verschwindet wenn alle Milestones erledigt sind', async (t) => {
  // Milestone-Status auf erledigt setzen via API (beide fälligen erledigen)
  const updatedSeed = JSON.parse(JSON.stringify(OVERDUE_SEED));
  updatedSeed.milestones.forEach((ms) => { ms.status = 'erledigt'; });

  await seedViaAPI(JSON.stringify(updatedSeed));
  await reloadPage();
  await Selector('#teams-grid .team-card', { timeout: 5000 })();

  await t.expect(overdueSection.hasAttribute('hidden')).ok('Sektion ist ausgeblendet');
});
