/**
 * kunden.test.js — Tests for kunden.js via dynamic import.
 * kunden.js has module-level DOM queries and an IIFE init,
 * so we set up DOM + mocks before importing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

const mockData = {
  kw: '',
  teams: [],
  initiatives: [],
  nicht_vergessen: [],
  risks: [],
  milestones: [],
  kunden: [],
};

vi.mock('../../public/js/store.js', () => ({
  get data() { return mockData; },
  load: vi.fn().mockResolvedValue(undefined),
  createEntity: vi.fn(),
  deleteEntity: vi.fn(),
  saveEntity: vi.fn(),
}));

vi.mock('../../public/js/utils.js', () => ({
  generateId: vi.fn(() => 999),
  esc: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  findById: (arr, id) => arr.find((x) => x.id === id),
}));

vi.mock('../../public/js/auth.js', () => ({
  initAuth: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.de', roles: ['ROLE_USER'] }),
}));

function setupKundenDom() {
  document.body.innerHTML = `
    <table><tbody id="kunden-body"></tbody></table>
    <span id="kunden-count"></span>
    <button id="add-kunde-btn">+ Neuer Kunde</button>
  `;
}

let createEntity, deleteEntity, saveEntity;

beforeEach(async () => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  globalThis.confirm = vi.fn().mockReturnValue(true);

  mockData.kunden = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'Globex Inc' },
  ];

  setupKundenDom();
  vi.resetModules();

  // Re-apply mocks after reset
  vi.doMock('../../public/js/store.js', () => ({
    get data() { return mockData; },
    load: vi.fn().mockResolvedValue(undefined),
    createEntity: vi.fn(),
    deleteEntity: vi.fn(),
    saveEntity: vi.fn(),
  }));
  vi.doMock('../../public/js/utils.js', () => ({
    generateId: vi.fn(() => 999),
    esc: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    findById: (arr, id) => arr.find((x) => x.id === id),
  }));
  vi.doMock('../../public/js/auth.js', () => ({
    initAuth: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.de', roles: ['ROLE_USER'] }),
  }));

  await import('../../public/js/kunden.js');
  // Wait for IIFE init
  await new Promise((r) => setTimeout(r, 20));

  // Get fresh references to mocked functions
  const storeMod = await import('../../public/js/store.js');
  createEntity = storeMod.createEntity;
  deleteEntity = storeMod.deleteEntity;
  saveEntity = storeMod.saveEntity;
});

// ── Rendering ─────────────────────────────────────────────────

describe('kunden.js – rendering', () => {
  it('renders all customers on init', () => {
    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(2);
    expect(tbody.innerHTML).toContain('Acme Corp');
    expect(tbody.innerHTML).toContain('Globex Inc');
  });

  it('shows count badge', () => {
    const badge = document.getElementById('kunden-count');
    expect(badge.textContent).toBe('2');
  });

  it('renders input fields with correct data attributes', () => {
    const inputs = document.querySelectorAll('.customer-name-input');
    expect(inputs.length).toBe(2);
    expect(inputs[0].dataset.id).toBe('1');
    expect(inputs[0].dataset.field).toBe('name');
    expect(inputs[0].dataset.source).toBe('kunden');
  });

  it('renders delete buttons for each customer', () => {
    const btns = document.querySelectorAll('[data-action="removeKunde"]');
    expect(btns.length).toBe(2);
  });

  it('handles empty kunden list', async () => {
    mockData.kunden = [];
    setupKundenDom();
    vi.resetModules();
    vi.doMock('../../public/js/store.js', () => ({
      get data() { return mockData; },
      load: vi.fn().mockResolvedValue(undefined),
      createEntity: vi.fn(),
      deleteEntity: vi.fn(),
      saveEntity: vi.fn(),
    }));
    vi.doMock('../../public/js/utils.js', () => ({
      generateId: vi.fn(() => 999),
      esc: (s) => String(s || ''),
      findById: (arr, id) => arr.find((x) => x.id === id),
    }));
    vi.doMock('../../public/js/auth.js', () => ({
      initAuth: vi.fn().mockResolvedValue({ id: 1 }),
    }));
    await import('../../public/js/kunden.js');
    await new Promise((r) => setTimeout(r, 20));

    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(0);
    expect(document.getElementById('kunden-count').textContent).toBe('');
  });
});

// ── Add customer ──────────────────────────────────────────────

describe('kunden.js – addKunde', () => {
  it('creates a new customer and re-renders', async () => {
    const newKunde = { id: 999, name: 'Neuer Kunde' };
    createEntity.mockResolvedValue(newKunde);

    document.getElementById('add-kunde-btn').click();
    await new Promise((r) => setTimeout(r, 60));

    expect(createEntity).toHaveBeenCalledWith('kunden', { id: 999, name: 'Neuer Kunde' });
    expect(mockData.kunden).toContainEqual(newKunde);

    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(3);
  });

  it('does not add when createEntity returns null', async () => {
    createEntity.mockResolvedValue(null);

    document.getElementById('add-kunde-btn').click();
    await new Promise((r) => setTimeout(r, 60));

    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(2);
  });
});

// ── Remove customer ───────────────────────────────────────────

describe('kunden.js – removeKunde', () => {
  it('deletes a customer after confirm and re-renders', async () => {
    deleteEntity.mockResolvedValue(true);
    globalThis.confirm = vi.fn().mockReturnValue(true);

    const btn = document.querySelector('[data-action="removeKunde"][data-id="1"]');
    btn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(deleteEntity).toHaveBeenCalledWith('kunden', 1);
    expect(mockData.kunden.find((k) => k.id === 1)).toBeUndefined();

    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(1);
  });

  it('does nothing when confirm is cancelled', async () => {
    globalThis.confirm = vi.fn().mockReturnValue(false);

    const btn = document.querySelector('[data-action="removeKunde"][data-id="1"]');
    btn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(deleteEntity).not.toHaveBeenCalled();
    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(2);
  });

  it('does not remove when deleteEntity returns false', async () => {
    deleteEntity.mockResolvedValue(false);
    globalThis.confirm = vi.fn().mockReturnValue(true);

    const btn = document.querySelector('[data-action="removeKunde"][data-id="1"]');
    btn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(mockData.kunden.find((k) => k.id === 1)).toBeTruthy();
    const tbody = document.getElementById('kunden-body');
    expect(tbody.querySelectorAll('tr').length).toBe(2);
  });
});

// ── Inline edit ───────────────────────────────────────────────

describe('kunden.js – inline edit', () => {
  it('updates customer name and calls saveEntity on input', async () => {
    const input = document.querySelector('.customer-name-input[data-id="1"]');
    input.value = 'Updated Corp';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));

    expect(mockData.kunden.find((k) => k.id === 1).name).toBe('Updated Corp');
    expect(saveEntity).toHaveBeenCalledWith('kunden', 1);
  });

  it('ignores input events on elements without data attributes', async () => {
    const tbody = document.getElementById('kunden-body');
    const span = document.createElement('span');
    tbody.appendChild(span);
    span.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));

    // saveEntity should only have been called if there was a proper input
    // no additional call expected
  });
});
