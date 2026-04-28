import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock CONFIG (including auth URLs + ENTITY_URLS)
vi.mock('../../public/js/config.js', () => ({
  CONFIG: {
    API_URL: '/api/cockpit',
    LOGIN_URL: '/api/login',
    LOGOUT_URL: '/api/logout',
    ME_URL: '/api/me',
    LOGIN_PAGE: '/login.html',
    SAVE_DEBOUNCE_MS: 0,
    SAVE_INDICATOR_MS: 1400,
    ERROR_INDICATOR_MS: 3000,
    ENTITY_URLS: {
      teams: '/api/teams',
      initiatives: '/api/initiatives',
      milestones: '/api/milestones',
      risks: '/api/risks',
      nicht_vergessen: '/api/nicht-vergessen',
      kunden: '/api/kunden',
      metadata: '/api/metadata',
    },
  },
}));

// Mock utils.js debounce — pass-through für Tests
vi.mock('../../public/js/utils.js', () => ({
  debounce: (fn) => fn,
}));

// Mock dom.js — save-indicators werden im beforeEach gesetzt
vi.mock('../../public/js/dom.js', () => ({
  dom: {
    saveIndicators: [],
  },
}));

// Mock auth.js — we don't want actual redirects in unit tests
vi.mock('../../public/js/auth.js', () => ({
  redirectToLogin: vi.fn(),
  initAuth: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.de', roles: ['ROLE_USER'] }),
  logout: vi.fn(),
  fetchCurrentUser: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.de', roles: ['ROLE_USER'] }),
}));

import { data, load, save, setData, saveEntity, createEntity, deleteEntity, saveMetadata, dSaveEntity } from '../../public/js/store.js';
import { dom } from '../../public/js/dom.js';
import { redirectToLogin } from '../../public/js/auth.js';

beforeEach(() => {
  // Reset data to defaults
  setData({ kw: '', teams: [], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });

  // Setup minimal DOM for save indicator
  document.body.innerHTML = '<span id="save-ind" class="save-indicator"></span>';
  dom.saveIndicators = [...document.querySelectorAll('.save-indicator')];

  // Reset fetch mock und Console-Ausgaben unterdrücken
  vi.restoreAllMocks();
  redirectToLogin.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('setData()', () => {
  it('replaces data contents in-place', () => {
    const ref = data; // keep original reference
    setData({ kw: '12', teams: [{ id: 1 }], initiatives: [], nicht_vergessen: [] });
    expect(data).toBe(ref); // same object reference
    expect(data.kw).toBe('12');
    expect(data.teams).toHaveLength(1);
  });

  it('removes old keys not present in new data', () => {
    data.extraKey = 'should be removed';
    setData({ kw: '5', teams: [], initiatives: [], nicht_vergessen: [] });
    expect(data.extraKey).toBeUndefined();
  });

  it('initializes milestones array', () => {
    expect(data.milestones).toEqual([]);
  });

  it('initializes kunden array', () => {
    expect(data.kunden).toEqual([]);
  });
});

describe('load()', () => {
  it('loads data from API', async () => {
    const mockData = { kw: '10', teams: [{ id: 1 }], initiatives: [], nicht_vergessen: [] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    await load();
    expect(data.kw).toBe('10');
    expect(data.teams).toHaveLength(1);
  });

  it('redirects to login on 401 during load', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await load();
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it('falls back to default_data.json on API error', async () => {
    const fallbackData = { kw: '99', teams: [], initiatives: [], nicht_vergessen: [] };
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fallbackData),
      });

    await load();
    expect(data.kw).toBe('99');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to empty defaults when both fetches fail', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await load();
    expect(data.kw).toBe('');
    expect(data.teams).toEqual([]);
    expect(data.initiatives).toEqual([]);
  });
});

describe('save()', () => {
  it('is a no-op (backward compat)', () => {
    globalThis.fetch = vi.fn();
    save();
    expect(fetch).not.toHaveBeenCalled();
  });
});

// ─── load() offline banner ────────────────────────────────────

describe('load() offline banner', () => {
  it('creates an offline banner when API fails and fallback succeeds', async () => {
    const fallbackData = { kw: '42', teams: [], initiatives: [], nicht_vergessen: [] };
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fallbackData) });

    await load();
    const banner = document.getElementById('offline-banner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('Offline');
  });

  it('does not create duplicate banners on repeated calls', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('err'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ kw: '', teams: [], initiatives: [], nicht_vergessen: [] }) })
      .mockRejectedValueOnce(new Error('err'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ kw: '', teams: [], initiatives: [], nicht_vergessen: [] }) });

    await load();
    await load();
    const banners = document.querySelectorAll('#offline-banner');
    expect(banners).toHaveLength(1);
  });

  it('throws on non-ok (non-401) response and falls back', async () => {
    const fallbackData = { kw: 'fb', teams: [], initiatives: [], nicht_vergessen: [] };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fallbackData) });

    await load();
    expect(data.kw).toBe('fb');
  });
});

// ─── createEntity() ──────────────────────────────────────────

describe('createEntity()', () => {
  it('sends POST and returns created entity on success', async () => {
    const created = { id: 99, name: 'Neues Team' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(created),
    });

    const result = await createEntity('teams', { id: 99, name: 'Neues Team' });
    expect(result).toEqual(created);
    expect(fetch).toHaveBeenCalledWith('/api/teams', expect.objectContaining({ method: 'POST' }));
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('gespeichert');
  });

  it('redirects to login on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const result = await createEntity('teams', { id: 1 });
    expect(result).toBeNull();
    expect(redirectToLogin).toHaveBeenCalled();
  });

  it('shows access denied on 403', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const result = await createEntity('teams', { id: 1 });
    expect(result).toBeNull();
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toContain('Zugriff verweigert');
  });

  it('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await createEntity('teams', { id: 1 });
    expect(result).toBeNull();
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('Fehler!');
  });

  it('returns null on non-ok (500) response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await createEntity('teams', { id: 1 });
    expect(result).toBeNull();
  });
});

// ─── deleteEntity() ──────────────────────────────────────────

describe('deleteEntity()', () => {
  it('sends DELETE and returns true on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const result = await deleteEntity('teams', 42);
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/teams/42', expect.objectContaining({ method: 'DELETE' }));
  });

  it('redirects to login on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const result = await deleteEntity('teams', 1);
    expect(result).toBe(false);
    expect(redirectToLogin).toHaveBeenCalled();
  });

  it('shows access denied on 403', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const result = await deleteEntity('risks', 5);
    expect(result).toBe(false);
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toContain('Zugriff verweigert');
  });

  it('returns false on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await deleteEntity('teams', 1);
    expect(result).toBe(false);
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('Fehler!');
  });

  it('returns false on non-ok (500) response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await deleteEntity('milestones', 1);
    expect(result).toBe(false);
  });
});

// ─── saveMetadata() ──────────────────────────────────────────

describe('saveMetadata()', () => {
  it('sends PUT with kw data on success', async () => {
    data.kw = 'KW 17';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await saveMetadata();
    expect(fetch).toHaveBeenCalledWith('/api/metadata', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ kw: 'KW 17' }),
    }));
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('gespeichert');
  });

  it('redirects to login on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await saveMetadata();
    expect(redirectToLogin).toHaveBeenCalled();
  });

  it('shows error indicator on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await saveMetadata();
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('Fehler!');
  });

  it('shows error indicator on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await saveMetadata();
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('Fehler!');
  });
});

// ─── saveEntity() ────────────────────────────────────────────

describe('saveEntity()', () => {
  it('debounces and sends PUT for an existing entity', async () => {
    setData({ kw: '', teams: [{ id: 1, name: 'Team A' }], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    saveEntity('teams', 1);

    // SAVE_DEBOUNCE_MS is 0, so setTimeout fires immediately with vi.useFakeTimers or after a tick
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('/api/teams/1', expect.objectContaining({ method: 'PUT' }));
  });

  it('does nothing when type does not exist in data', () => {
    globalThis.fetch = vi.fn();
    saveEntity('nonexistent', 1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does nothing when entity id is not found', () => {
    setData({ kw: '', teams: [{ id: 1, name: 'A' }], initiatives: [], nicht_vergessen: [] });
    globalThis.fetch = vi.fn();
    saveEntity('teams', 999);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles 401 on save', async () => {
    setData({ kw: '', teams: [{ id: 1, name: 'A' }], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    saveEntity('teams', 1);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    // Allow the async _doEntitySave to complete
    await new Promise((r) => setTimeout(r, 10));
    expect(redirectToLogin).toHaveBeenCalled();
  });

  it('handles 403 on save', async () => {
    setData({ kw: '', teams: [{ id: 1, name: 'A' }], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    saveEntity('teams', 1);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toContain('Zugriff verweigert');
  });

  it('handles network error on save', async () => {
    setData({ kw: '', teams: [{ id: 1, name: 'A' }], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    saveEntity('teams', 1);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    const ind = document.querySelector('.save-indicator');
    expect(ind.textContent).toBe('Fehler!');
  });
});

// ─── dSaveEntity() ───────────────────────────────────────────

describe('dSaveEntity()', () => {
  it('is an alias that calls saveEntity logic', async () => {
    setData({ kw: '', teams: [{ id: 5, name: 'X' }], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    dSaveEntity('teams', 5);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('/api/teams/5', expect.objectContaining({ method: 'PUT' }));
  });
});
