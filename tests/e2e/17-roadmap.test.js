import { Selector, ClientFunction } from 'testcafe';

const ROADMAP_URL = 'http://localhost:8089/roadmap.html';

const seedViaAPI = ClientFunction((json) => {
  return fetch('/api/cockpit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).then((r) => r.ok);
});

const reloadPage = ClientFunction(() => {
  location.reload();
});

const SEED = {
  kw: '15',
  teams: [
    { id: 1, name: 'Frontend', status: 'yellow', fokus: '', schritt: '' },
    { id: 2, name: 'Backend', status: 'grey', fokus: '', schritt: '' },
  ],
  kunden: [
    { id: 901, name: 'Acme GmbH' },
    { id: 902, name: 'Beta AG' },
  ],
  initiatives: [
    { id: 101, name: 'Design System', team: 1, customer: 901, status: 'yellow', projektstatus: 'ok', schritt: 'Prototyp', frist: '2026-06-15', notiz: 'Prio', businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 5 },
    { id: 102, name: 'API Refactor', team: 2, customer: 901, status: 'grey', projektstatus: 'ok', schritt: 'Planung', frist: '2026-09-01', notiz: '', businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null },
    { id: 103, name: 'Fertig Init', team: 1, customer: 901, status: 'fertig', projektstatus: 'ok', schritt: '', frist: '2026-02-01', notiz: '', businessValue: 3, timeCriticality: 2, riskReduction: 1, jobSize: 2 },
    { id: 104, name: 'Ungeplant', team: 1, customer: null, status: 'ungeplant', projektstatus: 'ok', schritt: '', frist: null, notiz: '', businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null },
  ],
  milestones: [
    { id: 501, initiative: 101, aufgabe: 'Konzept fertig', owner: 'Max', status: 'erledigt', frist: '2026-04-01' },
    { id: 502, initiative: 101, aufgabe: 'Review Sprint', owner: 'Anna', status: 'offen', frist: '2026-07-01' },
    { id: 503, initiative: 102, aufgabe: 'Schema Migration', owner: 'Tom', status: 'in_bearbeitung', frist: '2026-08-15' },
  ],
  nicht_vergessen: [],
  risks: [],
};

async function setupRoadmapTest() {
  await seedViaAPI(JSON.stringify(SEED));
  await reloadPage();
  await Selector('.tab', { timeout: 5000 })();
}

// ─── Selektoren ──────────────────────────────────────────────

const tabs        = Selector('.tab');
const panels      = Selector('.pnl');
const kwBadge     = Selector('#kw');
const rows        = Selector('.row');
const groupLabels = Selector('.tab-group-label');
const tabSep      = Selector('.tab-sep');
const tipEl       = Selector('.tip');
const backLink    = Selector('.footer-back-link');

fixture('US-17: IT Roadmap Seite')
  .page(ROADMAP_URL)
  .beforeEach(async () => {
    await setupRoadmapTest();
  });

// ── Daten-Laden ─────────────────────────────────────────────

test('AC-17.1: Roadmap lädt Daten aus API und zeigt KW', async (t) => {
  await t.expect(kwBadge.textContent).contains('KW 15');
});

// ── Team-Tabs ───────────────────────────────────────────────

test('AC-17.2: Team-Tabs werden korrekt erstellt', async (t) => {
  const tabTexts = [];
  const count = await tabs.count;
  for (let i = 0; i < count; i++) {
    tabTexts.push(await tabs.nth(i).textContent);
  }
  await t.expect(tabTexts.some(t => t.includes('Frontend'))).ok('Frontend-Tab vorhanden');
  await t.expect(tabTexts.some(t => t.includes('Backend'))).ok('Backend-Tab vorhanden');
});

test('AC-17.3: Erstes Team-Panel ist standardmäßig aktiv', async (t) => {
  const firstPanel = Selector('#p-t-1');
  await t.expect(firstPanel.hasClass('on')).ok();
});

// ── Kunden-Tabs ─────────────────────────────────────────────

test('AC-17.4: Kunden-Tabs erscheinen nur für Kunden mit offenen Initiativen', async (t) => {
  const tabTexts = [];
  const count = await tabs.count;
  for (let i = 0; i < count; i++) {
    tabTexts.push(await tabs.nth(i).textContent);
  }
  // Acme hat offene Initiativen
  await t.expect(tabTexts.some(t => t.includes('Acme'))).ok('Acme-Tab vorhanden');
  // Beta AG hat keine Initiativen
  await t.expect(tabTexts.some(t => t.includes('Beta'))).notOk('Beta-Tab nicht vorhanden');
});

// ── Tab-Wechsel ─────────────────────────────────────────────

test('AC-17.5: Tab-Wechsel aktiviert das richtige Panel', async (t) => {
  // Finde Backend-Tab per data-pid Attribut
  const backendTab = Selector('[data-pid="p-t-2"]');
  await t.expect(backendTab.exists).ok('Backend-Tab existiert', { timeout: 5000 });
  await t.click(backendTab);

  const backendPanel = Selector('#p-t-2');
  await t.expect(backendPanel.hasClass('on')).ok('Backend-Panel aktiv');

  const frontendPanel = Selector('#p-t-1');
  await t.expect(frontendPanel.hasClass('on')).notOk('Frontend-Panel nicht mehr aktiv');
});

// ── Initiativen-Rendering ───────────────────────────────────

test('AC-17.6: Fertige Initiativen werden nicht angezeigt', async (t) => {
  // Frontend-Panel (Team 1) hat Init A, Ungeplant aber NICHT Fertig Init
  const frontendPanel = Selector('#p-t-1');
  const panelText = await frontendPanel.textContent;
  await t.expect(panelText).contains('Design System');
  await t.expect(panelText).notContains('Fertig Init');
});

test('AC-17.7: Initiativen zeigen Status-Badge und Kundenname', async (t) => {
  const badges = Selector('#p-t-1 .badge');
  await t.expect(badges.count).gte(1);

  const panelText = await Selector('#p-t-1').textContent;
  await t.expect(panelText).contains('Acme GmbH');
});

// ── Meilensteine ────────────────────────────────────────────

test('AC-17.8: Meilensteine werden als Dots auf der Timeline dargestellt', async (t) => {
  const dots = Selector('#p-t-1 .ms');
  await t.expect(dots.count).gte(1, 'Mindestens ein Meilenstein-Dot vorhanden');
});

// ── Frist-Diamanten ─────────────────────────────────────────

test('AC-17.9: Initiativen mit Frist zeigen Diamant-Marker', async (t) => {
  const diamonds = Selector('#p-t-1 .fr');
  await t.expect(diamonds.count).gte(1, 'Mindestens ein Frist-Diamant vorhanden');
});

// ── Tab-Gruppen & Separator ─────────────────────────────────

test('AC-17.10: Tab-Gruppen-Labels und Separator vorhanden', async (t) => {
  await t.expect(groupLabels.count).eql(2);
  await t.expect(groupLabels.nth(0).textContent).eql('Teams');
  await t.expect(groupLabels.nth(1).textContent).eql('Kunden');
  await t.expect(tabSep.exists).ok('Tab-Separator vorhanden');
});

// ── Legende ─────────────────────────────────────────────────

test('AC-17.11: Legende wird korrekt angezeigt', async (t) => {
  const legend = Selector('#p-t-1 .leg');
  await t.expect(legend.exists).ok('Legende vorhanden');

  const legendText = await legend.textContent;
  await t.expect(legendText).contains('Erledigt');
  await t.expect(legendText).contains('Offen');
  await t.expect(legendText).contains('Heute');
});

// ── Heute-Linie ─────────────────────────────────────────────

test('AC-17.12: Heute-Linie wird auf der Timeline dargestellt', async (t) => {
  const todayLine = Selector('#p-t-1 .tln');
  await t.expect(todayLine.exists).ok('Heute-Linie vorhanden');
});

// ── Navigation ──────────────────────────────────────────────

test('AC-17.13: Zurück-Link zum Cockpit vorhanden', async (t) => {
  await t.expect(backLink.exists).ok('Back-Link vorhanden');
  await t.expect(backLink.getAttribute('href')).eql('cockpit.html');
});

// ── Kunden-Panel ────────────────────────────────────────────

test('AC-17.14: Kunden-Panel zeigt Team-Chips', async (t) => {
  const acmeTab = Selector('[data-pid="p-k-901"]');
  await t.expect(acmeTab.exists).ok('Acme-Tab existiert', { timeout: 5000 });
  await t.click(acmeTab);

  const acmePanel = Selector('#p-k-901');
  await t.expect(acmePanel.hasClass('on')).ok('Acme-Panel aktiv');
  await t.expect(acmePanel.find('.team-chip').count).gte(1, 'Team-Chip vorhanden');
});
