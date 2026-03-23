import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock CONFIG
vi.mock('../../public/js/config.js', () => ({
  CONFIG: {
    API_URL: '/api/cockpit',
    SAVE_DEBOUNCE_MS: 400,
    SAVE_INDICATOR_MS: 1400,
    ERROR_INDICATOR_MS: 3000,
  },
}));

// Mock utils.js debounce — pass-through für Tests
vi.mock('../../public/js/utils.js', () => ({
  debounce: (fn) => fn,
}));

import { data, load, save, setData } from '../../public/js/store.js';

beforeEach(() => {
  // Reset data to defaults
  setData({ kw: '', teams: [], initiatives: [], nicht_vergessen: [] });

  // Setup minimal DOM for save indicator
  document.body.innerHTML = '<span id="save-ind" class="save-indicator"></span>';

  // Reset fetch mock und Console-Ausgaben unterdrücken
  vi.restoreAllMocks();
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
});

describe('load()', () => {
  it('loads data from API', async () => {
    const mockData = { kw: '10', teams: [{ id: 1 }], initiatives: [], nicht_vergessen: [] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await load();
    expect(data.kw).toBe('10');
    expect(data.teams).toHaveLength(1);
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
  it('sends PUT request with current data', async () => {
    setData({ kw: '5', teams: [], initiatives: [], nicht_vergessen: [] });
    let resolvePromise;
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    save();
    expect(fetch).toHaveBeenCalledWith('/api/cockpit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    // Resolve to avoid unhandled promise
    resolvePromise({ ok: true });
    await vi.waitFor(() => expect(document.getElementById('save-ind').textContent).toBe('gespeichert'));
  });

  it('shows error indicator on failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    save();
    await vi.waitFor(() => expect(document.getElementById('save-ind').textContent).toBe('Fehler!'));
  });

  it('queues save when one is already in-flight', async () => {
    let resolveFirst;
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({ ok: true });
    });

    // First save starts
    save();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Second save while first is in-flight → should queue
    save();
    expect(fetch).toHaveBeenCalledTimes(1); // still only 1

    // Complete first save → queued save should fire
    resolveFirst({ ok: true });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('only triggers one queued save even if called multiple times', async () => {
    let resolveFirst;
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({ ok: true });
    });

    save(); // starts first save
    save(); // queued
    save(); // re-queued (replaces the previous queue)
    save(); // re-queued again
    expect(fetch).toHaveBeenCalledTimes(1);

    resolveFirst({ ok: true });
    // Should result in exactly one more save (the queued one)
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
