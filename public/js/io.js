import { data, save, setData } from './store.js';
import { renderAll } from './render.js';
import { generateId } from './utils.js';
import { MILESTONE_STATUSES } from './config.js';

/**
 * Konvertiert ein frist-Wert aus einem importierten JSON auf YYYY-MM-DD.
 * Akzeptiert: null, '', YYYY-MM-DD → unveränderter Rückgabe (null → null, '' → null).
 * DD.MM.YYYY → wird auf YYYY-MM-DD umgestellt.
 * Sonstige Formate → null (ungültig, API würde 400 zurückgeben).
 */
function convertFrist(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const m = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/**
 * Normalisiert importierte JSON-Daten auf das aktuelle Format.
 * Akzeptiert BEIDE Schlüssel-Versionen:
 *   - Alt (vor Refactoring): inis, nvs
 *   - Neu (aktuell):         initiatives, nicht_vergessen
 */
export function migrateData(parsed) {
  // Schlüssel-Migration: altes Format → neues Format
  if (!Array.isArray(parsed.initiatives) && Array.isArray(parsed.inis)) {
    parsed.initiatives = parsed.inis;
  }
  if (!Array.isArray(parsed.nicht_vergessen) && Array.isArray(parsed.nvs)) {
    parsed.nicht_vergessen = parsed.nvs;
  }

  // Defaults sicherstellen
  if (!Array.isArray(parsed.teams)) parsed.teams = [];
  if (!Array.isArray(parsed.initiatives)) parsed.initiatives = [];
  if (!Array.isArray(parsed.nicht_vergessen)) parsed.nicht_vergessen = [];
  if (!parsed.kw) parsed.kw = '';

  // Alte Schlüssel entfernen, damit der API-Sync keine leeren Arrays drüberschreibt
  delete parsed.inis;
  delete parsed.nvs;

  // Risks-Array sicherstellen
  if (!Array.isArray(parsed.risks)) parsed.risks = [];

  // Milestones-Array sicherstellen
  if (!Array.isArray(parsed.milestones)) parsed.milestones = [];

  parsed.teams = parsed.teams.map((t) => ({
    id: t.id ?? generateId(),
    name: t.name ?? '',
    status: t.status ?? 'grey',
    fokus: t.fokus ?? '',
    schritt: t.schritt ?? '',
  }));

  const validStatus = ['fertig', 'yellow', 'grey', 'ungeplant'];
  // Legacy-Mapping: 'green' war in StatusEnum::Green definiert, wird aber im
  // Frontend nicht unterstützt. Explizit auf 'fertig' mappen statt still zu 'grey'.
  const legacyStatusMap = { green: 'fertig' };
  parsed.initiatives = parsed.initiatives.map((i) => ({
    id: i.id ?? generateId(),
    name: i.name ?? '',
    team: i.team ?? null,
    status: validStatus.includes(i.status) ? i.status : (legacyStatusMap[i.status] ?? 'grey'),
    projektstatus: i.projektstatus ?? 'ok',
    schritt: i.schritt ?? '',
    frist: convertFrist(i.frist),
    notiz: i.notiz ?? '',
    businessValue: i.businessValue ?? null,
    timeCriticality: i.timeCriticality ?? null,
    riskReduction: i.riskReduction ?? null,
    jobSize: i.jobSize ?? null,
    wsjf: i.wsjf ?? null,
  }));

  parsed.nicht_vergessen = parsed.nicht_vergessen.map((n) => ({
    id: n.id ?? generateId(),
    title: n.title ?? '',
    body: n.body ?? '',
  }));

  parsed.risks = parsed.risks.map((r) => ({
    id: r.id ?? generateId(),
    initiative: r.initiative,
    bezeichnung: r.bezeichnung ?? '',
    beschreibung: r.beschreibung ?? '',
    eintrittswahrscheinlichkeit: r.eintrittswahrscheinlichkeit ?? 1,
    schadensausmass: r.schadensausmass ?? 1,
    roamStatus: r.roamStatus ?? null,
    roamNotiz: r.roamNotiz ?? '',
  }));

  parsed.milestones = parsed.milestones.map((m) => ({
    id: m.id ?? generateId(),
    initiative: m.initiative,
    aufgabe: m.aufgabe ?? '',
    beschreibung: m.beschreibung ?? '',
    owner: m.owner ?? '',
    status: MILESTONE_STATUSES.includes(m.status) ? m.status : 'offen',
    frist: convertFrist(m.frist),
    bemerkung: m.bemerkung ?? '',
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
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('Ungültiges Format');
        const migrated = migrateData(parsed);
        const summary = `${migrated.teams.length} Teams, ${migrated.initiatives.length} Initiativen, ${migrated.nicht_vergessen.length} Nicht-vergessen-Einträge, ${migrated.risks.length} Risiken, ${migrated.milestones.length} Meilensteine`;
        if (
          !confirm(
            `Daten aus \u201E${file.name}\u201C importieren?\n(${summary})\n\nAktuelle Daten werden überschrieben.`,
          )
        )
          return;
        setData(migrated);
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
