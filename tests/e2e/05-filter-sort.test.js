import { Selector } from 'testcafe';
import { BASE_URL, setupTest, selectors } from './helpers.js';

fixture('US-5: Filtern & Sortieren von Initiativen')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
    // Clear cookies to ensure no stale viewstate
    await t.eval(() => {
      document.cookie = 'cockpit_view=; max-age=0; path=/';
    });
  });

test('AC-5.1: Textsuche filtert Initiativen nach Name', async (t) => {
  // Seed hat 3 Initiativen: Gamma, Delta, Epsilon
  await t.expect(selectors.iniRows.count).eql(3);

  await t.typeText(selectors.filterName, 'Gamma');
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.1: Textsuche ist case-insensitive', async (t) => {
  await t.typeText(selectors.filterName, 'gamma');
  await t.expect(selectors.iniRows.count).eql(1);
});

test('AC-5.2: Team-Dropdown filtert nach Team', async (t) => {
  // Filter nach dem Seed-Team via Value (id=1001)
  const teamOption = selectors.filterTeam.find('option[value="1001"]');
  await t.click(selectors.filterTeam).click(teamOption);
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.3: Status-Dropdown filtert korrekt', async (t) => {
  // Filter: Fertig → nur Projekt Epsilon
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="fertig"]'));
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Epsilon');
});

test('AC-5.3: Projektstatus-Dropdown filtert korrekt', async (t) => {
  // Filter: Kritisch → nur Projekt Delta
  await t
    .click(selectors.filterProjektstatus)
    .click(selectors.filterProjektstatus.find('option[value="kritisch"]'));
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Delta');
});

test('AC-5.4: Filter sind kombinierbar', async (t) => {
  // Setze Status = "In Arbeit" UND Projektstatus = "Alles gut"
  await t.click(selectors.filterStatus).click(selectors.filterStatus.find('option[value="yellow"]'));
  await t
    .click(selectors.filterProjektstatus)
    .click(selectors.filterProjektstatus.find('option[value="ok"]'));

  // Nur Projekt Gamma passt (status=yellow, projektstatus=ok)
  await t.expect(selectors.iniRows.count).eql(1);
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.5: Reset-Button setzt alle Filter zurück', async (t) => {
  // Setze Filter
  await t.typeText(selectors.filterName, 'Gamma');
  await t.expect(selectors.iniRows.count).eql(1);

  // Reset-Button sollte aktiv sein
  await t.expect(selectors.filterReset.hasClass('active')).ok();

  // Reset klicken
  await t.click(selectors.filterReset);

  // Alle Initiativen sollten wieder sichtbar sein
  await t.expect(selectors.iniRows.count).eql(3);
  await t.expect(selectors.filterName.value).eql('');
});

test('AC-5.6: Sortierung per Spaltenklick mit visuellem Feedback', async (t) => {
  // Klick auf den ersten sortierbaren Header (Name)
  const nameHeader = Selector('th.sortable[data-sort="name"]');
  await t.click(nameHeader);

  await t.expect(nameHeader.hasClass('sort-asc')).ok();
  // Alphabetisch: Delta, Epsilon, Gamma
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Delta');

  // Erneuter Klick → DESC
  await t.click(nameHeader);
  await t.expect(nameHeader.hasClass('sort-desc')).ok();
  // Umgekehrt: Gamma, Epsilon, Delta
  await t.expect(selectors.iniRows.nth(0).find('.ini-name').value).eql('Projekt Gamma');
});

test('AC-5.6: WSJF-Sortierung default DESC', async (t) => {
  const wsjfHeader = selectors.sortHeaders.withText('WSJF');
  await t.click(wsjfHeader);

  await t.expect(wsjfHeader.hasClass('sort-desc')).ok();
});

test('AC-5.7: Filter und Sortierung überleben Page-Reload', async (t) => {
  // Setze Filter
  await t.typeText(selectors.filterName, 'Gamma');
  await t.expect(selectors.iniRows.count).eql(1);

  // Reload
  await t.eval(() => location.reload());
  await t.wait(500);

  // Filter sollte erhalten sein
  await t.expect(selectors.filterName.value).eql('Gamma');
  await t.expect(selectors.iniRows.count).eql(1);
});
