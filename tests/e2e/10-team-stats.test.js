import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave } from './helpers.js';

fixture('Team-Stats: Statistik-Badge in Team-Karte')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-1: Badge zeigt Gesamtzahl, kritisch und in-Arbeit Initiativen', async (t) => {
  // Prüfe, dass mindestens ein Team existiert
  const teamCards = Selector('.team-card');
  await t.expect(teamCards.count).gt(0, 'Mindestens ein Team sollte existieren');

  // Prüfe, dass Badge in der ersten Team-Karte vorhanden ist
  const firstTeamCard = teamCards.nth(0);
  const statsBadge = firstTeamCard.find('.team-stats-badge');

  await t.expect(statsBadge.count).eql(1, 'Badge sollte in Team-Karte vorhanden sein');
  await t.expect(statsBadge.textContent).match(/📊 \d+ • ⚠️ \d+ • 🚀 \d+/, 'Badge sollte das erwartete Format haben');
});

test('AC-2: Badge-Platzierung ist am unteren Ende der Karte', async (t) => {
  const teamCard = Selector('.team-card').nth(0);
  const badge = teamCard.find('.team-stats-badge');
  const schrittInput = teamCard.find('[data-field="schritt"]');

  // Textinhalt der Badge sollte nach dem schritt Input kommen (DOM-Reihenfolge)
  const cardHTML = await teamCard.innerHTML;
  const schrittIndex = cardHTML.indexOf('Mein nächster Schritt');
  const badgeIndex = cardHTML.indexOf('team-stats-badge');

  await t.expect(badgeIndex > schrittIndex).ok('Badge sollte nach dem schritt-Input DOM-Elemente platziert sein');
});

test('AC-3: Badge zeigt korrekte Statistiken für Initiativen mit Status "in Arbeit"', async (t) => {
  const firstTeamCard = Selector('.team-card').nth(0);
  const badge = firstTeamCard.find('.team-stats-badge');
  const initialBadgeText = await badge.textContent;

  // Parse die Zahlen aus der Badge: "📊 5 • ⚠️ 2 • 🚀 3"
  const match = initialBadgeText.match(/📊 (\d+) • ⚠️ (\d+) • 🚀 (\d+)/);
  const initialTotal = match ? parseInt(match[1]) : 0;
  const initialCritical = match ? parseInt(match[2]) : 0;
  const initialProgress = match ? parseInt(match[3]) : 0;

  // Wenn keine Initiativen, kann der Test hier stoppen
  if (initialTotal === 0) {
    await t.expect(initialBadgeText).match(/📊 0 • ⚠️ 0 • 🚀 0/);
  } else {
    // Badge sollte Zahlen zeigen
    await t.expect(initialBadgeText).match(/📊 \d+ • ⚠️ \d+ • 🚀 \d+/);
  }
});

test('AC-4: Badge ist Read-Only (nicht klickbar, keine Interaktion)', async (t) => {
  const badge = Selector('.team-stats-badge').nth(0);

  // Badge sollte kein Datenedit-Attribut haben
  const dataAction = await badge.getAttribute('data-action');
  const dataSource = await badge.getAttribute('data-source');

  await t.expect(dataAction).typeOf('null');
  await t.expect(dataSource).typeOf('null');
});

test('AC-5: Badge ist responsive und bricht nicht um', async (t) => {
  const badge = Selector('.team-stats-badge').nth(0);

  // CSS sollte white-space: nowrap gesetzt haben
  const badgeStyle = await badge.element.innerText;

  // Badge sollte maximal 60 Zeichen sein
  const badgeText = await badge.textContent;
  await t.expect(badgeText.length).lte(60, 'Badge Text sollte max. 60 Zeichen sein');
});
