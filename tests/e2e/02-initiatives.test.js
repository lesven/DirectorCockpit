import { Selector } from 'testcafe';
import { BASE_URL, setupTest, waitForSave, selectors } from './helpers.js';

fixture('US-2: Initiativen-Management')
  .page(BASE_URL)
  .beforeEach(async (t) => {
    await setupTest();
  });

test('AC-2.1: Neue Initiative hinzufügen erzeugt Tabellenzeile und öffnet Detail-Modal', async (t) => {
  const initialCount = await selectors.iniRows.count;

  await t.click(selectors.addIniBtn);

  // Detail-Modal muss automatisch geöffnet werden
  await t.expect(selectors.detailBackdrop.hasAttribute('hidden')).notOk();

  // Modal schließen, dann Zeilenanzahl prüfen
  await t.click(selectors.detailClose);

  await t.expect(selectors.iniRows.count).eql(initialCount + 1);
});

test('AC-2.2: Inline-Bearbeitung von Name, Schritt, Frist und Notiz', async (t) => {
  const row = selectors.iniRows.nth(0);
  const nameInput = row.find('.ini-name');
  const schrittInput = row.find('[data-field="schritt"]');
  const fristInput = row.find('[data-field="frist"]');
  const notizTextarea = row.find('[data-field="notiz"]');

  // Name ändern
  await t.selectText(nameInput).typeText(nameInput, 'Neuer Projektname');
  await waitForSave();

  // Schritt ändern
  await t.selectText(schrittInput).typeText(schrittInput, 'Neuer Schritt');
  await waitForSave();

  // Frist setzen
  await t.selectText(fristInput).typeText(fristInput, '30.06');
  await waitForSave();

  // Notiz ändern
  await t.selectText(notizTextarea).typeText(notizTextarea, 'Test-Notiz');
  await waitForSave();

  // Reload und prüfen
  await t.wait(1000);
  await t.eval(() => location.reload());
  await t.wait(1000);

  // Reihenfolge kann sich ändern, daher nach Wert suchen
  const renamedRow = Selector('.ini-row').filter((node) => {
    return node.querySelector('.ini-name').value === 'Neuer Projektname';
  });
  await t.expect(renamedRow.count).eql(1, 'Umbenannte Initiative sollte existieren');
  await t.expect(renamedRow.find('[data-field="schritt"]').value).eql('Neuer Schritt');
  await t.expect(renamedRow.find('[data-field="frist"]').value).eql('30.06');
  await t.expect(renamedRow.find('[data-field="notiz"]').value).eql('Test-Notiz');
});

test('AC-2.3: Team, Status und Projektstatus per Dropdown wählbar', async (t) => {
  const row = selectors.iniRows.nth(1); // Projekt Delta

  // Team-Zuordnung ändern
  const teamSelect = row.find('[data-field="team"]');
  await t.click(teamSelect).click(teamSelect.find('option').withText('Alpha Team'));
  await waitForSave();

  // Status ändern
  const statusSelect = row.find('[data-field="status"]');
  await t.click(statusSelect).click(statusSelect.find('option').withText('In Arbeit'));
  await waitForSave();

  // Projektstatus ändern
  const psSelect = row.find('[data-field="projektstatus"]');
  await t.click(psSelect).click(psSelect.find('option').withText('Alles gut'));
  await waitForSave();

  // Reload und prüfen
  await t.wait(1000);
  await t.eval(() => location.reload());
  await t.wait(1000);

  // Reihenfolge kann sich ändern - find die richtige Row per Teamänderung
  const updatedRow = Selector('.ini-row').filter((node) => {
    const teamSel = node.querySelector('[data-field="team"]');
    return teamSel && teamSel.value === '1001';
  }).nth(1); // zweite Row die Alpha Team zugeordnet ist (neben Gamma)
  // Alternativ: prüfe ob irgendeine Row status=yellow UND projektstatus=ok hat
  // und team=1001 (also Projekt Delta, umgeändert)
  // Einfacher: prüfe über die API
  const apiData = await t.eval(() => fetch('/api/cockpit').then(r => r.json()));
  const delta = apiData.initiatives.find(i => i.id === 2002);
  await t.expect(delta.team).eql(1001);
  await t.expect(delta.status).eql('yellow');
  await t.expect(delta.projektstatus).eql('ok');
});

test('AC-2.4: Löschen einer Initiative mit Bestätigung', async (t) => {
  const initialCount = await selectors.iniRows.count;

  await t.setNativeDialogHandler(() => true);
  const deleteBtn = selectors.iniRows.nth(0).find('[data-action="removeEntity"]');
  await t.hover(selectors.iniRows.nth(0));
  await t.click(deleteBtn);

  await t.expect(selectors.iniRows.count).eql(initialCount - 1);
});

test('AC-2.5: WSJF-Wert wird korrekt angezeigt', async (t) => {
  // Projekt Gamma: BV=8, TC=5, RR=3, JS=5 → WSJF = (8+5+3)/5 = 3.2
  const wsjfCell = selectors.iniRows.nth(0).find('.wsjf-value');
  await t.expect(wsjfCell.textContent).eql('3.2');

  // Projekt Delta: keine WSJF-Werte → "–"
  const wsjfEmpty = selectors.iniRows.nth(1).find('.wsjf-value');
  await t.expect(wsjfEmpty.textContent).eql('–');
});
