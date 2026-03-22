import { data, save } from './store.js';
import { renderAll } from './render.js';

/**
 * Normalisiert importierte JSON-Daten auf das aktuelle Format.
 * Akzeptiert BEIDE Schlüssel-Versionen:
 *   - Alt (vor Refactoring): inis, nvs
 *   - Neu (aktuell):         initiatives, nicht_vergessen
 */
function migrateData(parsed) {
  // Schlüssel-Migration: altes Format → neues Format
  if (!Array.isArray(parsed.initiatives) && Array.isArray(parsed.inis)) {
    parsed.initiatives = parsed.inis;
  }
  if (!Array.isArray(parsed.nicht_vergessen) && Array.isArray(parsed.nvs)) {
    parsed.nicht_vergessen = parsed.nvs;
  }

  // Defaults sicherstellen
  if (!Array.isArray(parsed.teams))           parsed.teams           = [];
  if (!Array.isArray(parsed.initiatives))     parsed.initiatives     = [];
  if (!Array.isArray(parsed.nicht_vergessen)) parsed.nicht_vergessen = [];
  if (!parsed.kw) parsed.kw = '';

  // Alte Schlüssel entfernen, damit der API-Sync keine leeren Arrays drüberschreibt
  delete parsed.inis;
  delete parsed.nvs;

  parsed.teams = parsed.teams.map(t => ({
    id:      t.id      ?? Date.now(),
    name:    t.name    ?? '',
    sub:     t.sub     ?? '',
    status:  t.status  ?? 'grey',
    fokus:   t.fokus   ?? '',
    schritt: t.schritt ?? '',
  }));

  const validStatus = ['fertig', 'yellow', 'grey', 'ungeplant'];
  parsed.initiatives = parsed.initiatives.map(i => ({
    id:            i.id             ?? Date.now(),
    name:          i.name           ?? '',
    team:          i.team           ?? null,
    status:        validStatus.includes(i.status) ? i.status : 'grey',
    projektstatus: i.projektstatus  ?? 'ok',
    schritt:       i.schritt        ?? '',
    frist:         i.frist          ?? '',
    notiz:         i.notiz          ?? '',
    businessValue:  i.businessValue  ?? null,
    timeCriticality: i.timeCriticality ?? null,
    riskReduction:  i.riskReduction  ?? null,
    jobSize:        i.jobSize        ?? null,
  }));

  parsed.nicht_vergessen = parsed.nicht_vergessen.map(n => ({
    id:    n.id    ?? Date.now(),
    title: n.title ?? '',
    body:  n.body  ?? '',
  }));

  return parsed;
}

export function exportJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const kw = data.kw ? `_KW${data.kw}` : '';
  a.href = url;
  a.download = `cockpit${kw}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('Ungültiges Format');
        const migrated = migrateData(parsed);
        const summary = `${migrated.teams.length} Teams, ${migrated.initiatives.length} Initiativen, ${migrated.nicht_vergessen.length} Nicht-vergessen-Einträge`;
        if (!confirm(`Daten aus \u201E${file.name}\u201C importieren?\n(${summary})\n\nAktuelle Daten werden überschrieben.`)) return;
        // Overwrite data properties in-place so all modules see the change
        Object.assign(data, migrated);
        save();
        renderAll();
      } catch (err) {
        alert('Import fehlgeschlagen: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
