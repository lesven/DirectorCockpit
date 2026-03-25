import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Dynamisch importieren, damit wir localStorage/cookie vorher mocken können
let saveViewState, loadViewState;

beforeEach(async () => {
  localStorage.clear();
  // Legacy-Cookie bereinigen
  document.cookie = 'cockpit_view=; Path=/; Max-Age=0';

  // Modul frisch importieren um gecachte State zurückzusetzen
  vi.resetModules();
  const mod = await import('../../public/js/cookie.js');
  saveViewState = mod.saveViewState;
  loadViewState = mod.loadViewState;
});

afterEach(() => {
  localStorage.clear();
  document.cookie = 'cockpit_view=; Path=/; Max-Age=0';
});

describe('saveViewState()', () => {
  it('schreibt Filter/Sort-State in localStorage', () => {
    const filter = { name: 'test', team: '2', status: 'fertig', projektstatus: 'ok' };
    const sort = { field: 'name', dir: 'asc' };
    saveViewState(filter, sort);

    const stored = JSON.parse(localStorage.getItem('cockpit_view'));
    expect(stored.filter).toEqual(filter);
    expect(stored.sort).toEqual(sort);
  });

  it('überschreibt bestehenden State', () => {
    const filter1 = { name: 'a', team: '', status: '', projektstatus: '' };
    const sort1 = { field: null, dir: 'asc' };
    saveViewState(filter1, sort1);

    const filter2 = { name: 'b', team: '3', status: 'yellow', projektstatus: 'kritisch' };
    const sort2 = { field: 'team', dir: 'desc' };
    saveViewState(filter2, sort2);

    const stored = JSON.parse(localStorage.getItem('cockpit_view'));
    expect(stored.filter.name).toBe('b');
    expect(stored.sort.field).toBe('team');
  });

  it('schreibt NICHT in document.cookie', () => {
    const filter = { name: '', team: '', status: '', projektstatus: '' };
    const sort = { field: null, dir: 'asc' };
    saveViewState(filter, sort);

    expect(document.cookie).not.toContain('cockpit_view');
  });
});

describe('loadViewState()', () => {
  it('liest State aus localStorage', () => {
    const payload = { filter: { name: 'x', team: '1', status: '', projektstatus: '' }, sort: { field: 'name', dir: 'desc' } };
    localStorage.setItem('cockpit_view', JSON.stringify(payload));

    const result = loadViewState();
    expect(result).toEqual(payload);
  });

  it('gibt null zurück wenn localStorage leer', () => {
    expect(loadViewState()).toBeNull();
  });

  it('gibt null zurück bei korruptem JSON in localStorage', () => {
    localStorage.setItem('cockpit_view', '{broken json!!!');
    expect(loadViewState()).toBeNull();
  });

  it('gibt null zurück wenn gespeicherter Wert kein Objekt ist', () => {
    localStorage.setItem('cockpit_view', '"just a string"');
    expect(loadViewState()).toBeNull();
  });
});

describe('Legacy-Cookie-Migration', () => {
  it('migriert bestehenden Cookie nach localStorage', () => {
    const payload = { filter: { name: 'legacy', team: '', status: '', projektstatus: '' }, sort: { field: null, dir: 'asc' } };
    document.cookie = `cockpit_view=${encodeURIComponent(JSON.stringify(payload))}; Path=/`;

    const result = loadViewState();
    expect(result).toEqual(payload);
    // Jetzt in localStorage
    expect(localStorage.getItem('cockpit_view')).not.toBeNull();
  });

  it('löscht Legacy-Cookie nach Migration', () => {
    const payload = { filter: { name: 'old', team: '', status: '', projektstatus: '' }, sort: { field: 'name', dir: 'asc' } };
    document.cookie = `cockpit_view=${encodeURIComponent(JSON.stringify(payload))}; Path=/`;

    loadViewState();
    // Cookie sollte gelöscht sein
    const match = document.cookie.split('; ').find((c) => c.startsWith('cockpit_view='));
    expect(!match || match === 'cockpit_view=').toBe(true);
  });

  it('bevorzugt localStorage vor Cookie', () => {
    const lsPayload = { filter: { name: 'ls', team: '', status: '', projektstatus: '' }, sort: { field: null, dir: 'asc' } };
    localStorage.setItem('cockpit_view', JSON.stringify(lsPayload));

    const cookiePayload = { filter: { name: 'cookie', team: '', status: '', projektstatus: '' }, sort: { field: null, dir: 'asc' } };
    document.cookie = `cockpit_view=${encodeURIComponent(JSON.stringify(cookiePayload))}; Path=/`;

    const result = loadViewState();
    expect(result.filter.name).toBe('ls');
  });

  it('gibt null zurück wenn weder localStorage noch Cookie existieren', () => {
    expect(loadViewState()).toBeNull();
  });
});
