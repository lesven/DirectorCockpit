import { Selector, ClientFunction } from 'testcafe';
import { BASE_URL, selectors } from './helpers.js';

// Seed mit 25 Initiativen (21x status='grey', 4x status='fertig')
const PAGINATION_SEED = (() => {
  const initiatives = Array.from({ length: 25 }, (_, i) => ({
    id: 3000 + i + 1,
    name: `Pagination Ini ${String(i + 1).padStart(2, '0')}`,
    team: i < 5 ? 5001 : null,
    status: i < 4 ? 'fertig' : 'grey',
    projektstatus: 'ok',
    schritt: '',
    frist: '',
    notiz: '',
    businessValue: null,
    timeCriticality: null,
    riskReduction: null,
    jobSize: null,
  }));
  return {
    kw: '12',
    teams: [{ id: 5001, name: 'Paging Team', sub: '', status: 'grey', fokus: '', schritt: '' }],
    initiatives,
    nicht_vergessen: [],
  };
})();

const seedViaAPI = ClientFunction((json) =>
  fetch('/api/cockpit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).then((r) => r.ok),
);

const reloadPage = ClientFunction(() => location.reload());

async function setupPaginationTest(t) {
  await seedViaAPI(JSON.stringify(PAGINATION_SEED));
  await reloadPage();
  await Selector('.ini-row', { timeout: 5000 })();
  // Clear stale view-state cookie
  await t.eval(() => {
    document.cookie = 'cockpit_view=; max-age=0; path=/';
  });
  await reloadPage();
  await Selector('.ini-row', { timeout: 5000 })();
}

const paginationEl = Selector('#ini-pagination');
const prevBtn = Selector('.pagination-btn').withText('‹');
const nextBtn = Selector('.pagination-btn').withText('›');
const paginationInfo = Selector('.pagination-info');

fixture('US-Pagination: Paginierung der Initiativen-Tabelle')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupPaginationTest(t);
  });

test('AC-P.1: Erste Seite zeigt maximal 20 Einträge bei 25 Datensätzen', async (t) => {
  await t.expect(selectors.iniRows.count).eql(20);
});

test('AC-P.2: Paginierungssteuerung ist sichtbar bei >20 Einträgen', async (t) => {
  await t.expect(paginationEl.exists).ok();
  await t.expect(nextBtn.exists).ok();
  await t.expect(prevBtn.exists).ok();
  await t.expect(paginationInfo.exists).ok();
});

test('AC-P.3: Info zeigt "1–20 von 25"', async (t) => {
  await t.expect(paginationInfo.innerText).eql('1–20 von 25');
});

test('AC-P.4: Weiter-Button navigiert zur Seite 2 mit 5 Einträgen', async (t) => {
  await t.click(nextBtn);
  await t.expect(selectors.iniRows.count).eql(5);
  await t.expect(paginationInfo.innerText).eql('21–25 von 25');
});

test('AC-P.5: Zurück-Button auf Seite 1 ist deaktiviert', async (t) => {
  await t.expect(prevBtn.hasAttribute('disabled')).ok();
});

test('AC-P.6: Zurück-Button auf Seite 2 navigiert zurück zu Seite 1', async (t) => {
  await t.click(nextBtn);
  await t.expect(selectors.iniRows.count).eql(5);
  await t.click(prevBtn);
  await t.expect(selectors.iniRows.count).eql(20);
  await t.expect(paginationInfo.innerText).eql('1–20 von 25');
});

test('AC-P.7: Weiter-Button auf letzter Seite ist deaktiviert', async (t) => {
  await t.click(nextBtn);
  await t.expect(nextBtn.hasAttribute('disabled')).ok();
});

test('AC-P.8: Filter wirkt über alle Seiten, setzt Seite auf 1 zurück', async (t) => {
  // Navigiere erst auf Seite 2
  await t.click(nextBtn);
  await t.expect(selectors.iniRows.count).eql(5);

  // Setze Filter: nur "fertig" (4 Einträge) → Seite springt auf 1
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="fertig"]'));
  await t.expect(selectors.iniRows.count).eql(4);
  // Bei 4 Einträgen keine Paginierung sichtbar
  await t.expect(paginationInfo.exists).notOk();
});

test('AC-P.9: Paginierung verschwindet wenn gefiltertes Ergebnis ≤20 Einträge', async (t) => {
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="fertig"]'));
  await t.expect(selectors.iniRows.count).eql(4);
  await t.expect(paginationEl.find('.pagination-nav').exists).notOk();
});

test('AC-P.10: Sortierung setzt Seite auf 1 zurück', async (t) => {
  await t.click(nextBtn);
  await t.expect(selectors.iniRows.count).eql(5); // Seite 2

  // Sortiere nach Name → zurück auf Seite 1
  const nameHeader = Selector('.ini-table th[data-sort="name"]');
  await t.click(nameHeader);
  await t.expect(selectors.iniRows.count).eql(20);
});

test('AC-P.11: Filter-Reset setzt Seite auf 1 zurück', async (t) => {
  await t.click(nextBtn);
  await t.expect(selectors.iniRows.count).eql(5);

  await t.click(selectors.filterReset);
  await t.expect(selectors.iniRows.count).eql(20);
  await t.expect(paginationInfo.innerText).eql('1–20 von 25');
});
