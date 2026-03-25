import { describe, it, expect, vi, beforeEach } from 'vitest';

let parseHash, setHash, clearHash, buildDeepLink;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../public/js/routing.js');
  parseHash = mod.parseHash;
  setHash = mod.setHash;
  clearHash = mod.clearHash;
  buildDeepLink = mod.buildDeepLink;
});

describe('parseHash()', () => {
  it('parst gültigen Initiative-Hash', () => {
    expect(parseHash('#initiative/123')).toEqual({ type: 'initiative', id: 123 });
  });

  it('parst große IDs (timestamp-basiert)', () => {
    expect(parseHash('#initiative/1740307200000001')).toEqual({
      type: 'initiative',
      id: 1740307200000001,
    });
  });

  it('gibt null bei leerem Hash', () => {
    expect(parseHash('')).toBeNull();
  });

  it('gibt null bei reinem #', () => {
    expect(parseHash('#')).toBeNull();
  });

  it('gibt null bei unbekanntem Typ', () => {
    expect(parseHash('#team/123')).toBeNull();
  });

  it('gibt null bei nicht-numerischer ID', () => {
    expect(parseHash('#initiative/abc')).toBeNull();
  });

  it('gibt null bei fehlendem Slash', () => {
    expect(parseHash('#initiative123')).toBeNull();
  });

  it('gibt null bei Trailing-Slash', () => {
    expect(parseHash('#initiative/123/')).toBeNull();
  });

  it('gibt null bei zusätzlichem Pfad', () => {
    expect(parseHash('#initiative/123/risks')).toBeNull();
  });

  it('nutzt window.location.hash als Default', () => {
    window.location.hash = '#initiative/42';
    expect(parseHash()).toEqual({ type: 'initiative', id: 42 });
    window.location.hash = '';
  });
});

describe('setHash()', () => {
  it('ruft history.pushState mit korrektem Hash auf', () => {
    const spy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    setHash('initiative', 99);
    expect(spy).toHaveBeenCalledWith(
      { type: 'initiative', id: 99 },
      '',
      '#initiative/99',
    );
    spy.mockRestore();
  });
});

describe('clearHash()', () => {
  it('ruft history.pushState ohne Hash auf', () => {
    const spy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    clearHash();
    expect(spy).toHaveBeenCalledWith(
      {},
      '',
      expect.stringMatching(/^[^#]*$/),
    );
    spy.mockRestore();
  });
});

describe('buildDeepLink()', () => {
  it('baut vollständige URL mit Hash', () => {
    const link = buildDeepLink(42);
    expect(link).toContain('#initiative/42');
    expect(link).toMatch(/^https?:\/\//);
  });

  it('enthält den aktuellen Pfadnamen', () => {
    const link = buildDeepLink(1);
    expect(link).toContain(window.location.pathname);
  });
});
