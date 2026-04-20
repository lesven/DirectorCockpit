import { Selector } from 'testcafe';
import { LOGIN_URL, selectors, loginAsAdmin } from './helpers.js';

fixture('US-9: Datenladen & Fallback')
  .page(LOGIN_URL)
  .beforeEach(async (t) => {
    await loginAsAdmin();
  });

test('AC-9.1: Bei erreichbarem Backend werden API-Daten geladen', async (t) => {
  // Seed data via API before loading the page
  await t.eval(() => {
    return fetch('/api/cockpit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        kw: '77',
        teams: [{ id: 5001, name: 'API Team', sub: '', status: 'grey', fokus: '', schritt: '' }],
        initiatives: [],
        nicht_vergessen: [],
      }),
    });
  });

  // Reload to force re-fetch from API
  await t.eval(() => location.reload());
  await t.wait(500);

  await t.expect(selectors.kwBadge.textContent).contains('77');
  await t.expect(selectors.teamCards.count).eql(1);
  await t.expect(selectors.teamNameInputs.nth(0).value).eql('API Team');
});

test('AC-9.2: Seite zeigt Daten auch nach API-Roundtrip korrekt an', async (t) => {
  // Create test data
  await t.eval(() => {
    return fetch('/api/cockpit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        kw: '33',
        teams: [
          { id: 6001, name: 'Roundtrip Team', sub: 'RT', status: 'green', fokus: 'F', schritt: 'S' },
        ],
        initiatives: [
          {
            id: 6002,
            name: 'Roundtrip Ini',
            team: 6001,
            status: 'yellow',
            projektstatus: 'kritisch',
            schritt: 'Test',
            frist: '2026-01-01',
            notiz: 'RT Notiz',
            businessValue: 5,
            timeCriticality: 3,
            riskReduction: 2,
            jobSize: 2,
          },
        ],
        nicht_vergessen: [{ id: 6003, title: 'RT NV', body: 'Roundtrip Body' }],
      }),
    });
  });

  await t.eval(() => location.reload());
  await t.wait(500);

  // Verify all data is correctly rendered
  await t.expect(selectors.kwBadge.textContent).contains('33');
  await t.expect(selectors.teamCards.count).eql(1);
  await t.expect(selectors.teamNameInputs.nth(0).value).eql('Roundtrip Team');
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Roundtrip Ini');
  await t.expect(selectors.nvCards.count).eql(1);
  await t.expect(selectors.nvTitleInputs.nth(0).value).eql('RT NV');
});
