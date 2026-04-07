import { describe, it, expect, vi } from 'vitest';

vi.mock('../../public/js/store.js', () => ({ data: {}, save: vi.fn() }));
vi.mock('../../public/js/render.js', () => ({ renderAll: vi.fn() }));

import { migrateData } from '../../public/js/io.js';

describe('migrateData()', () => {
  // ── Schlüssel-Migration ──────────────────────────────────

  it('migrates old key "inis" → "initiatives"', () => {
    const result = migrateData({ inis: [{ id: 1, name: 'A' }] });
    expect(result.initiatives).toHaveLength(1);
    expect(result.initiatives[0].name).toBe('A');
    expect(result.inis).toBeUndefined();
  });

  it('migrates old key "nvs" → "nicht_vergessen"', () => {
    const result = migrateData({ nvs: [{ id: 1, title: 'X' }] });
    expect(result.nicht_vergessen).toHaveLength(1);
    expect(result.nicht_vergessen[0].title).toBe('X');
    expect(result.nvs).toBeUndefined();
  });

  it('prefers "initiatives" over "inis" when both exist', () => {
    const result = migrateData({
      initiatives: [{ id: 1, name: 'New' }],
      inis: [{ id: 2, name: 'Old' }],
    });
    expect(result.initiatives).toHaveLength(1);
    expect(result.initiatives[0].name).toBe('New');
  });

  it('removes old keys after migration', () => {
    const result = migrateData({ inis: [], nvs: [] });
    expect(result).not.toHaveProperty('inis');
    expect(result).not.toHaveProperty('nvs');
  });

  // ── Defaults ─────────────────────────────────────────────

  it('defaults empty arrays for missing collections', () => {
    const result = migrateData({});
    expect(result.teams).toEqual([]);
    expect(result.initiatives).toEqual([]);
    expect(result.nicht_vergessen).toEqual([]);
    expect(result.milestones).toEqual([]);
  });

  it('defaults kw to empty string', () => {
    const result = migrateData({});
    expect(result.kw).toBe('');
  });

  // ── Team-Normalisierung ──────────────────────────────────

  it('normalizes team fields with defaults', () => {
    const result = migrateData({ teams: [{ id: 42 }] });
    const team = result.teams[0];
    expect(team.id).toBe(42);
    expect(team.name).toBe('');
    expect(team.status).toBe('grey');
    expect(team.fokus).toBe('');
    expect(team.schritt).toBe('');
  });

  it('preserves existing team values', () => {
    const result = migrateData({
      teams: [{ id: 1, name: 'Dev', status: 'yellow', fokus: 'Sprint', schritt: 'Deploy' }],
    });
    const team = result.teams[0];
    expect(team.name).toBe('Dev');
    expect(team.status).toBe('yellow');
  });

  // ── Initiative-Normalisierung ────────────────────────────

  it('normalizes initiative fields with defaults', () => {
    const result = migrateData({ initiatives: [{ id: 99 }] });
    const ini = result.initiatives[0];
    expect(ini.id).toBe(99);
    expect(ini.name).toBe('');
    expect(ini.team).toBeNull();
    expect(ini.status).toBe('grey');
    expect(ini.projektstatus).toBe('ok');
    expect(ini.schritt).toBe('');
    expect(ini.frist).toBeNull();
    expect(ini.notiz).toBe('');
    expect(ini.businessValue).toBeNull();
    expect(ini.timeCriticality).toBeNull();
    expect(ini.riskReduction).toBeNull();
    expect(ini.jobSize).toBeNull();
  });

  it('validates status and falls back to "grey" for invalid values', () => {
    const result = migrateData({ initiatives: [{ id: 1, status: 'invalid_status' }] });
    expect(result.initiatives[0].status).toBe('grey');
  });

  it('accepts valid status values', () => {
    ['fertig', 'yellow', 'grey', 'ungeplant'].forEach((s) => {
      const result = migrateData({ initiatives: [{ id: 1, status: s }] });
      expect(result.initiatives[0].status).toBe(s);
    });
  });

  it('preserves WSJF values', () => {
    const result = migrateData({
      initiatives: [{ id: 1, businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 5 }],
    });
    const ini = result.initiatives[0];
    expect(ini.businessValue).toBe(8);
    expect(ini.timeCriticality).toBe(5);
    expect(ini.riskReduction).toBe(3);
    expect(ini.jobSize).toBe(5);
  });

  it('preserves wsjf from backend response', () => {
    const result = migrateData({
      initiatives: [{ id: 1, businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 5, wsjf: 3.2 }],
    });
    expect(result.initiatives[0].wsjf).toBe(3.2);
  });

  it('sets wsjf to null when not present in data', () => {
    const result = migrateData({
      initiatives: [{ id: 1, businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 5 }],
    });
    expect(result.initiatives[0].wsjf).toBeNull();
  });

  // ── Nicht-vergessen-Normalisierung ───────────────────────

  it('normalizes nicht_vergessen fields with defaults', () => {
    const result = migrateData({ nicht_vergessen: [{ id: 7 }] });
    const nv = result.nicht_vergessen[0];
    expect(nv.id).toBe(7);
    expect(nv.title).toBe('');
    expect(nv.body).toBe('');
  });

  // ── Risk-Normalisierung ──────────────────────────────────

  it('normalizes risk fields with defaults', () => {
    const result = migrateData({ risks: [{ id: 10, initiative: 2 }] });
    const r = result.risks[0];
    expect(r.id).toBe(10);
    expect(r.initiative).toBe(2);
    expect(r.bezeichnung).toBe('');
    expect(r.beschreibung).toBe('');
    expect(r.eintrittswahrscheinlichkeit).toBe(1);
    expect(r.schadensausmass).toBe(1);
    expect(r.roamStatus).toBeNull();
    expect(r.roamNotiz).toBe('');
  });

  it('preserves existing risk values including roamStatus and roamNotiz', () => {
    const result = migrateData({
      risks: [{ id: 1, initiative: 3, bezeichnung: 'Kosten', beschreibung: 'Details', eintrittswahrscheinlichkeit: 3, schadensausmass: 4, roamStatus: 'mitigate', roamNotiz: 'Plan vorhanden' }],
    });
    const r = result.risks[0];
    expect(r.bezeichnung).toBe('Kosten');
    expect(r.beschreibung).toBe('Details');
    expect(r.eintrittswahrscheinlichkeit).toBe(3);
    expect(r.schadensausmass).toBe(4);
    expect(r.roamStatus).toBe('mitigate');
    expect(r.roamNotiz).toBe('Plan vorhanden');
  });

  // ── Vollständiger Roundtrip ──────────────────────────────

  it('handles a complete data object without changes', () => {
    const input = {
      kw: '12',
      teams: [{ id: 1, name: 'T1', status: 'fertig', fokus: 'f', schritt: 'sch' }],
      initiatives: [
        {
          id: 2,
          name: 'I1',
          team: 1,
          status: 'yellow',
          projektstatus: 'kritisch',
          schritt: 's',
          frist: '2026-04-01',
          notiz: 'n',
          businessValue: 3,
          timeCriticality: 5,
          riskReduction: 8,
          jobSize: 2,
        },
      ],
      nicht_vergessen: [{ id: 3, title: 'NV1', body: 'body' }],
    };
    const result = migrateData(structuredClone(input));
    expect(result.kw).toBe('12');
    expect(result.teams[0].name).toBe('T1');
    expect(result.initiatives[0].name).toBe('I1');
    expect(result.nicht_vergessen[0].title).toBe('NV1');
  });

  // ── Milestone-Normalisierung ─────────────────────────────

  it('normalizes milestone fields with defaults', () => {
    const result = migrateData({ milestones: [{ id: 50, initiative: 1 }] });
    const ms = result.milestones[0];
    expect(ms.id).toBe(50);
    expect(ms.initiative).toBe(1);
    expect(ms.aufgabe).toBe('');
    expect(ms.owner).toBe('');
    expect(ms.status).toBe('offen');
    expect(ms.frist).toBeNull();
    expect(ms.bemerkung).toBe('');
  });

  it('preserves existing milestone values', () => {
    const result = migrateData({
      milestones: [{ id: 1, initiative: 2, aufgabe: 'Design', owner: 'Max', status: 'erledigt', frist: '2026-04-01', bemerkung: 'Wichtig' }],
    });
    const ms = result.milestones[0];
    expect(ms.aufgabe).toBe('Design');
    expect(ms.owner).toBe('Max');
    expect(ms.status).toBe('erledigt');
    expect(ms.frist).toBe('2026-04-01');
    expect(ms.bemerkung).toBe('Wichtig');
  });

  it('validates milestone status and falls back to "offen" for invalid values', () => {
    const result = migrateData({ milestones: [{ id: 1, initiative: 1, status: 'done' }] });
    expect(result.milestones[0].status).toBe('offen');
  });

  it('accepts valid milestone status values', () => {
    ['offen', 'in_bearbeitung', 'erledigt', 'blockiert'].forEach((s) => {
      const result = migrateData({ milestones: [{ id: 1, initiative: 1, status: s }] });
      expect(result.milestones[0].status).toBe(s);
    });
  });

  // ── Regression En-2: deprecated "green" Status ───────────

  // REGRESSION En-2:
  // StatusEnum::Green existiert im PHP-Backend, wurde aber im Frontend nie unterstützt.
  // Ein exportierter Datensatz mit status:'green' wurde bisher stillschweigend zu 'grey'
  // normalisiert (silent data loss). Der Wert soll stattdessen explizit auf 'fertig'
  // gemappt werden, bis die DB-Migration alle 'green'-Einträge bereinigt hat.
  //
  // Status: ROT bis legacy-Mapping 'green' → 'fertig' in migrateData() ergänzt wird.
  it('maps deprecated "green" initiative status to "fertig" instead of silently dropping to "grey"', () => {
    const result = migrateData({
      initiatives: [{ id: 1, name: 'Legacy', status: 'green' }],
    });
    expect(result.initiatives[0].status).toBe('fertig');
  });

  // ── frist-Konvertierung ──────────────────────────────────

  it('konvertiert initiative.frist von DD.MM.YYYY nach YYYY-MM-DD', () => {
    const result = migrateData({ initiatives: [{ id: 1, frist: '25.04.2026' }] });
    expect(result.initiatives[0].frist).toBe('2026-04-25');
  });

  it('behält initiative.frist im Format YYYY-MM-DD unverändert', () => {
    const result = migrateData({ initiatives: [{ id: 1, frist: '2026-04-25' }] });
    expect(result.initiatives[0].frist).toBe('2026-04-25');
  });

  it('setzt initiative.frist auf null bei unbekanntem Format', () => {
    const result = migrateData({ initiatives: [{ id: 1, frist: 'Q2 2026' }] });
    expect(result.initiatives[0].frist).toBeNull();
  });

  it('setzt initiative.frist auf null bei leerem String', () => {
    const result = migrateData({ initiatives: [{ id: 1, frist: '' }] });
    expect(result.initiatives[0].frist).toBeNull();
  });

  it('konvertiert milestone.frist von DD.MM.YYYY nach YYYY-MM-DD', () => {
    const result = migrateData({ milestones: [{ id: 1, initiative: 1, frist: '01.12.2026' }] });
    expect(result.milestones[0].frist).toBe('2026-12-01');
  });

  it('behält milestone.frist im Format YYYY-MM-DD unverändert', () => {
    const result = migrateData({ milestones: [{ id: 1, initiative: 1, frist: '2026-12-01' }] });
    expect(result.milestones[0].frist).toBe('2026-12-01');
  });

  it('setzt milestone.frist auf null bei unbekanntem Format', () => {
    const result = migrateData({ milestones: [{ id: 1, initiative: 1, frist: 'Ende Q4' }] });
    expect(result.milestones[0].frist).toBeNull();
  });

  // ── Kunden ──────────────────────────────────────────────────

  it('setzt kunden auf leeres Array wenn fehlend (Legacy-Kompatibilität)', () => {
    const result = migrateData({});
    expect(result.kunden).toEqual([]);
  });

  it('behält vorhandenes kunden-Array', () => {
    const result = migrateData({ kunden: [{ id: 1, name: 'Acme' }] });
    expect(result.kunden).toHaveLength(1);
    expect(result.kunden[0].name).toBe('Acme');
  });

  it('normalisiert kunden: fehlender name wird zu leerem String', () => {
    const result = migrateData({ kunden: [{ id: 1 }] });
    expect(result.kunden[0].name).toBe('');
  });

  it('setzt customer in initiatives auf null wenn fehlend', () => {
    const result = migrateData({ initiatives: [{ id: 1, name: 'Ini' }] });
    expect(result.initiatives[0].customer).toBeNull();
  });

  it('behält customer-id in initiatives', () => {
    const result = migrateData({ initiatives: [{ id: 1, name: 'Ini', customer: 42 }] });
    expect(result.initiatives[0].customer).toBe(42);
  });
});
