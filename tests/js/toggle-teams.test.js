import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../public/js/store.js', () => ({
  data: { kw: '', teams: [], initiatives: [], nicht_vergessen: [], risks: [], milestones: [] },
  save: vi.fn(),
  dSave: vi.fn(),
}));

vi.mock('../../public/js/crud.js', () => ({
  addEntity: vi.fn(),
  removeEntity: vi.fn(),
  cycleStatus: vi.fn(),
}));

vi.mock('../../public/js/utils.js', () => ({
  findById: vi.fn(),
  debounce: (fn) => fn,
  esc: (s) => String(s || ''),
}));

vi.mock('../../public/js/sort.js', () => ({
  sortInis: vi.fn(),
  sortState: { field: null, dir: 'asc' },
  filterState: { name: '', team: '', status: '', projektstatus: '', kunde: '' },
  resetPage: vi.fn(),
  pageState: { current: 1 },
  setHideFertig: vi.fn(),
  isHideFertig: vi.fn(() => true),
  setShowOnlyBlocked: vi.fn(),
  isShowOnlyBlocked: vi.fn(() => false),
}));

vi.mock('../../public/js/render.js', () => ({
  renderAll: vi.fn(),
  renderEntity: vi.fn(),
  autoGrow: vi.fn(),
}));

vi.mock('../../public/js/io.js', () => ({
  exportJSON: vi.fn(),
  importJSON: vi.fn(),
}));

vi.mock('../../public/js/detail.js', () => ({
  openDetail: vi.fn(),
  bindDetailEvents: vi.fn(),
}));

const mockSaveViewState = vi.fn();
vi.mock('../../public/js/cookie.js', () => ({
  saveViewState: (...args) => mockSaveViewState(...args),
}));

// ── DOM-Setup ─────────────────────────────────────────────────────────────────

let mockTeamsGrid;
let mockToggleTeams;
const mockDom = vi.hoisted(() => ({}));

vi.mock('../../public/js/dom.js', () => ({ dom: mockDom }));

function buildDom() {
  document.body.innerHTML = `
    <div id="teams-grid"></div>
    <button id="toggle-teams">▼</button>
    <input id="filter-name" />
    <select id="filter-team"></select>
    <select id="filter-status"></select>
    <select id="filter-projektstatus"></select>
    <button id="filter-reset"></button>
  `;
  mockTeamsGrid = document.getElementById('teams-grid');
  mockToggleTeams = document.getElementById('toggle-teams');

  Object.assign(mockDom, {
    teamsGrid: mockTeamsGrid,
    toggleTeams: mockToggleTeams,
    filterName: document.getElementById('filter-name'),
    filterTeam: document.getElementById('filter-team'),
    filterKunde: null,
    filterStatus: document.getElementById('filter-status'),
    filterProjektstatus: document.getElementById('filter-projektstatus'),
    filterReset: document.getElementById('filter-reset'),
    toggleFertig: null,
    iniFilters: document.createElement('div'),
  });
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  buildDom();
});

// ── initToggleTeams ──────────────────────────────────────────────────────────

describe('initToggleTeams()', () => {
  it('setzt keine collapsed-Klasse wenn collapsed=false', async () => {
    const { initToggleTeams } = await import('../../public/js/events.js');
    initToggleTeams(false);

    expect(mockTeamsGrid.classList.contains('collapsed')).toBe(false);
  });

  it('setzt collapsed-Klasse sofort wenn collapsed=true', async () => {
    const { initToggleTeams } = await import('../../public/js/events.js');
    initToggleTeams(true);

    expect(mockTeamsGrid.classList.contains('collapsed')).toBe(true);
  });

  it('setzt Button-Title auf "einklappen" wenn ausgeklappt', async () => {
    const { initToggleTeams } = await import('../../public/js/events.js');
    initToggleTeams(false);

    expect(mockToggleTeams.title).toContain('einklappen');
  });

  it('setzt Button-Title auf "ausklappen" wenn eingeklappt', async () => {
    const { initToggleTeams } = await import('../../public/js/events.js');
    initToggleTeams(true);

    expect(mockToggleTeams.title).toContain('ausklappen');
  });

  it('setzt collapsed-Klasse auf Button wenn eingeklappt', async () => {
    const { initToggleTeams } = await import('../../public/js/events.js');
    initToggleTeams(true);

    expect(mockToggleTeams.classList.contains('collapsed')).toBe(true);
  });
});

// ── isTeamsCollapsed ─────────────────────────────────────────────────────────

describe('isTeamsCollapsed()', () => {
  it('gibt false zurück nach initToggleTeams(false)', async () => {
    const { initToggleTeams, isTeamsCollapsed } = await import('../../public/js/events.js');
    initToggleTeams(false);
    expect(isTeamsCollapsed()).toBe(false);
  });

  it('gibt true zurück nach initToggleTeams(true)', async () => {
    const { initToggleTeams, isTeamsCollapsed } = await import('../../public/js/events.js');
    initToggleTeams(true);
    expect(isTeamsCollapsed()).toBe(true);
  });
});

// ── Toggle-Button-Klick ──────────────────────────────────────────────────────

describe('Toggle-Button Klick', () => {
  it('klappt Teams ein beim ersten Klick (war ausgeklappt)', async () => {
    const { initToggleTeams, bindEvents } = await import('../../public/js/events.js');
    initToggleTeams(false);
    bindEvents();

    mockToggleTeams.click();

    expect(mockTeamsGrid.classList.contains('collapsed')).toBe(true);
  });

  it('klappt Teams aus beim zweiten Klick', async () => {
    const { initToggleTeams, bindEvents } = await import('../../public/js/events.js');
    initToggleTeams(false);
    bindEvents();

    mockToggleTeams.click();
    mockToggleTeams.click();

    expect(mockTeamsGrid.classList.contains('collapsed')).toBe(false);
  });

  it('ruft saveViewState mit teamsCollapsed=true auf nach Einklappen', async () => {
    const { initToggleTeams, bindEvents } = await import('../../public/js/events.js');
    initToggleTeams(false);
    bindEvents();

    mockToggleTeams.click();

    expect(mockSaveViewState).toHaveBeenCalledWith(
      expect.any(Object), // filterState
      expect.any(Object), // sortState
      expect.any(Boolean), // hideFertig
      true,               // teamsCollapsed
      expect.any(Boolean), // showOnlyBlocked
    );
  });

  it('ruft saveViewState mit teamsCollapsed=false auf nach Ausklappen', async () => {
    const { initToggleTeams, bindEvents } = await import('../../public/js/events.js');
    initToggleTeams(true);
    bindEvents();

    mockToggleTeams.click();

    expect(mockSaveViewState).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Boolean),
      false,
      expect.any(Boolean),
    );
  });

  it('aktualisiert isTeamsCollapsed() nach Klick', async () => {
    const { initToggleTeams, bindEvents, isTeamsCollapsed } = await import('../../public/js/events.js');
    initToggleTeams(false);
    bindEvents();

    mockToggleTeams.click();
    expect(isTeamsCollapsed()).toBe(true);

    mockToggleTeams.click();
    expect(isTeamsCollapsed()).toBe(false);
  });
});
