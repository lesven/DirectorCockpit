import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock CONFIG (including auth URLs)
vi.mock('../../public/js/config.js', () => ({
  CONFIG: {
    API_URL: '/api/cockpit',
    LOGIN_URL: '/api/login',
    LOGOUT_URL: '/api/logout',
    ME_URL: '/api/me',
    LOGIN_PAGE: '/login.html',
    SAVE_DEBOUNCE_MS: 400,
    SAVE_INDICATOR_MS: 1400,
    ERROR_INDICATOR_MS: 3000,
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

import { data, load, save, setData } from '../../public/js/store.js';
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
