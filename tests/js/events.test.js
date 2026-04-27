import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockData = { kw: 'KW1', teams: [], initiatives: [], nicht_vergessen: [], risks: [], milestones: [], kunden: [] };
const mockSaveEntity = vi.hoisted(() => vi.fn());
const mockSaveMetadata = vi.hoisted(() => vi.fn());

vi.mock('../../public/js/store.js', () => ({
  get data() { return mockData; },
  save: vi.fn(),
  dSave: vi.fn(),
  saveEntity: mockSaveEntity,
  saveMetadata: mockSaveMetadata,
}));

const mockAddEntity    = vi.hoisted(() => vi.fn());
const mockRemoveEntity = vi.hoisted(() => vi.fn());
const mockCycleStatus  = vi.hoisted(() => vi.fn());

vi.mock('../../public/js/crud.js', () => ({
  addEntity: mockAddEntity,
  removeEntity: mockRemoveEntity,
  cycleStatus: mockCycleStatus,
}));

const mockFindById = vi.hoisted(() => vi.fn());
vi.mock('../../public/js/utils.js', () => ({
  findById: mockFindById,
  debounce: (fn) => fn,
  esc: (s) => String(s || ''),
}));

const mockFilterState = { name: '', team: '', status: '', projektstatus: '', kunde: '' };
const mockSortState   = {};
const mockPageState   = { current: 1 };
const mockSortInis         = vi.hoisted(() => vi.fn());
const mockResetPage        = vi.hoisted(() => vi.fn());
const mockSetHideFertig    = vi.hoisted(() => vi.fn());
const mockIsHideFertig     = vi.hoisted(() => vi.fn(() => false));
const mockSetShowOnly      = vi.hoisted(() => vi.fn());
const mockIsShowOnlyBlocked = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../public/js/sort.js', () => ({
  get sortState()   { return mockSortState; },
  get filterState() { return mockFilterState; },
  get pageState()   { return mockPageState; },
  sortInis: mockSortInis,
  resetPage: mockResetPage,
  setHideFertig: mockSetHideFertig,
  isHideFertig: mockIsHideFertig,
  setShowOnlyBlocked: mockSetShowOnly,
  isShowOnlyBlocked: mockIsShowOnlyBlocked,
}));

const mockRenderAll    = vi.hoisted(() => vi.fn());
const mockRenderEntity = vi.hoisted(() => vi.fn());
const mockAutoGrow     = vi.hoisted(() => vi.fn());

vi.mock('../../public/js/render.js', () => ({
  renderAll: mockRenderAll,
  renderEntity: mockRenderEntity,
  autoGrow: mockAutoGrow,
}));

vi.mock('../../public/js/io.js', () => ({
  exportJSON: vi.fn(),
  importJSON: vi.fn(),
}));

const mockOpenDetail      = vi.hoisted(() => vi.fn());
const mockBindDetailEvents = vi.hoisted(() => vi.fn());

vi.mock('../../public/js/detail.js', () => ({
  openDetail: mockOpenDetail,
  bindDetailEvents: mockBindDetailEvents,
}));

const mockSaveViewState = vi.hoisted(() => vi.fn());
vi.mock('../../public/js/cookie.js', () => ({
  saveViewState: mockSaveViewState,
}));

// DOM-Elemente die events.js über dom.js erwartet
const mockDom = vi.hoisted(() => ({
  filterReset:        null,
  iniFilters:         null,
  filterName:         null,
  filterTeam:         null,
  filterStatus:       null,
  filterProjektstatus: null,
  filterKunde:        null,
  toggleFertig:       null,
  toggleBlocked:      null,
  toggleTeams:        null,
  teamsGrid:          null,
  kwBadge:            null,
}));

vi.mock('../../public/js/dom.js', () => ({ dom: mockDom }));

// ── Test-Setup ────────────────────────────────────────────────────────────────

import { isTeamsCollapsed, initToggleFertig, initToggleTeams, bindEvents } from '../../public/js/events.js';

function createBtn(action, extra = {}) {
  const btn = document.createElement('button');
  btn.dataset.action = action;
  Object.entries(extra).forEach(([k, v]) => (btn.dataset[k] = v));
  document.body.appendChild(btn);
  return btn;
}

function createDomFixture() {
  const make = (tag = 'div') => {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
  };
  mockDom.filterReset        = make();
  mockDom.iniFilters         = make();
  mockDom.filterName         = make('input');
  mockDom.filterTeam         = make('select');
  mockDom.filterStatus       = make('select');
  mockDom.filterProjektstatus = make('select');
  mockDom.filterKunde        = null;
  mockDom.toggleFertig       = make('button');
  mockDom.toggleBlocked      = make('button');
  mockDom.toggleTeams        = make('button');
  mockDom.teamsGrid          = make();
}

beforeEach(() => {
  document.body.innerHTML = '';
  mockSaveEntity.mockClear(); mockSaveMetadata.mockClear();
  ;
  mockAddEntity.mockClear();
  mockRemoveEntity.mockClear();
  mockCycleStatus.mockClear();
  mockRenderAll.mockClear();
  mockRenderEntity.mockClear();
  mockResetPage.mockClear();
  mockOpenDetail.mockClear();
  mockIsHideFertig.mockReturnValue(false);
  mockIsShowOnlyBlocked.mockReturnValue(false);
  mockPageState.current = 1;
  mockFilterState.name  = '';
  createDomFixture();
  bindEvents();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('isTeamsCollapsed', () => {
  it('gibt false zurück nach initToggleTeams(false)', () => {
    initToggleTeams(false);
    expect(isTeamsCollapsed()).toBe(false);
  });

  it('gibt true zurück nach initToggleTeams(true)', () => {
    initToggleTeams(true);
    expect(isTeamsCollapsed()).toBe(true);
  });
});

describe('handleActionClick – addEntity', () => {
  it('ruft addEntity mit dem richtigen Typ auf', () => {
    const btn = createBtn('addEntity', { type: 'team' });
    btn.click();
    expect(mockAddEntity).toHaveBeenCalledWith('team');
  });
});

describe('handleActionClick – removeEntity', () => {
  it('ruft removeEntity mit Typ und ID auf', () => {
    const btn = createBtn('removeEntity', { type: 'initiative', id: '42' });
    btn.click();
    expect(mockRemoveEntity).toHaveBeenCalledWith('initiative', 42);
  });
});

describe('handleActionClick – cycleStatus', () => {
  it('ruft cycleStatus mit ID auf', () => {
    const btn = createBtn('cycleStatus', { id: '7' });
    btn.click();
    expect(mockCycleStatus).toHaveBeenCalledWith(7, false);
  });
});

describe('handleActionClick – openDetail', () => {
  it('ruft openDetail mit ID auf', () => {
    const btn = createBtn('openDetail', { id: '99' });
    btn.click();
    expect(mockOpenDetail).toHaveBeenCalledWith(99);
  });
});

describe('handleActionClick – sortInis', () => {
  it('ruft sortInis und resetPage auf', () => {
    const btn = createBtn('sortInis', { sort: 'name' });
    btn.click();
    expect(mockSortInis).toHaveBeenCalled();
    expect(mockResetPage).toHaveBeenCalled();
    expect(mockRenderEntity).toHaveBeenCalledWith('initiatives');
  });
});

describe('handleActionClick – gotoPage', () => {
  it('setzt pageState.current und rendert Initiativen', () => {
    const btn = createBtn('gotoPage', { page: '3' });
    btn.click();
    expect(mockPageState.current).toBe(3);
    expect(mockRenderEntity).toHaveBeenCalledWith('initiatives');
  });

  it('ignoriert ungültige Seitennummer', () => {
    mockRenderEntity.mockClear();
    const btn = createBtn('gotoPage', { page: 'abc' });
    btn.click();
    expect(mockRenderEntity).not.toHaveBeenCalled();
  });
});

describe('handleActionClick – editKW', () => {
  it('setzt kw und ruft save + renderAll auf', () => {
    vi.stubGlobal('prompt', () => '42');
    const btn = createBtn('editKW');
    btn.click();
    expect(mockData.kw).toBe('42');
    expect(mockSaveMetadata).toHaveBeenCalled();
    expect(mockRenderAll).toHaveBeenCalled();
  });

  it('macht nichts wenn prompt abgebrochen wird', () => {
    vi.stubGlobal('prompt', () => null);
    const oldKw = mockData.kw;
    const btn = createBtn('editKW');
    btn.click();
    expect(mockData.kw).toBe(oldKw);
    expect(mockSaveMetadata).not.toHaveBeenCalled();
  });
});

describe('handleToggleFertig', () => {
  it('ruft setHideFertig auf und rendert Initiativen', () => {
    mockDom.toggleFertig.click();
    expect(mockSetHideFertig).toHaveBeenCalled();
    expect(mockResetPage).toHaveBeenCalled();
    expect(mockRenderEntity).toHaveBeenCalledWith('initiatives');
  });
});

describe('handleToggleTeams', () => {
  it('toggled teamsCollapsed und aktualisiert CSS-Klasse', () => {
    initToggleTeams(false);
    mockDom.toggleTeams.click();
    expect(isTeamsCollapsed()).toBe(true);
    expect(mockDom.teamsGrid.classList.contains('collapsed')).toBe(true);
  });

  it('speichert Zustand per saveViewState', () => {
    mockDom.toggleTeams.click();
    expect(mockSaveViewState).toHaveBeenCalled();
  });
});

describe('handleInlineInput', () => {
  it('aktualisiert item[field] und ruft dSave auf', () => {
    const item = { id: 5, name: 'alt' };
    mockFindById.mockReturnValue(item);

    const input = document.createElement('input');
    input.dataset.id     = '5';
    input.dataset.field  = 'name';
    input.dataset.source = 'teams';
    input.value = 'neu';
    document.body.appendChild(input);

    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(item.name).toBe('neu');
    expect(mockSaveEntity).toHaveBeenCalled();
  });

  it('ignoriert SELECTs', () => {
    const sel = document.createElement('select');
    sel.dataset.id     = '5';
    sel.dataset.field  = 'status';
    sel.dataset.source = 'teams';
    document.body.appendChild(sel);

    sel.dispatchEvent(new Event('input', { bubbles: true }));
    expect(mockSaveEntity).not.toHaveBeenCalled();
  });
});

describe('handleInlineChange', () => {
  it('aktualisiert item[field] bei SELECT-Change', () => {
    const item = { id: 3, status: 'grey' };
    mockFindById.mockReturnValue(item);

    const sel = document.createElement('select');
    sel.dataset.id     = '3';
    sel.dataset.field  = 'status';
    sel.dataset.source = 'initiatives';
    const opt = document.createElement('option');
    opt.value = 'green';
    sel.appendChild(opt);
    sel.value = 'green';
    document.body.appendChild(sel);

    sel.dispatchEvent(new Event('change', { bubbles: true }));

    expect(item.status).toBe('green');
    expect(mockSaveEntity).toHaveBeenCalled();
  });

  it('konvertiert team-Feld zu Integer', () => {
    const item = { id: 7, team: null };
    mockFindById.mockReturnValue(item);

    const sel = document.createElement('select');
    sel.dataset.id     = '7';
    sel.dataset.field  = 'team';
    sel.dataset.source = 'initiatives';
    const opt = document.createElement('option');
    opt.value = '10';
    sel.appendChild(opt);
    sel.value = '10';
    document.body.appendChild(sel);

    sel.dispatchEvent(new Event('change', { bubbles: true }));

    expect(item.team).toBe(10);
  });
});

describe('initToggleFertig', () => {
  it('aktualisiert toggleFertig-Button-Text wenn fertige ausgeblendet sind', () => {
    mockIsHideFertig.mockReturnValue(true);
    initToggleFertig();
    expect(mockDom.toggleFertig.textContent).toBe('Fertige ausblenden');
    expect(mockDom.toggleFertig.classList.contains('active')).toBe(true);
  });

  it('setzt Button-Text wenn fertige eingeblendet sind', () => {
    mockIsHideFertig.mockReturnValue(false);
    initToggleFertig();
    expect(mockDom.toggleFertig.textContent).toBe('Fertige einblenden');
  });
});
