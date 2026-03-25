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
    expect(ini.frist).toBe('');
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
});
