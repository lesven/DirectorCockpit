import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockData = {
  kw: '',
  teams: [],
  initiatives: [],
  nicht_vergessen: [],
  risks: [],
  milestones: [],
};

vi.mock('../../public/js/store.js', () => ({
  get data() {
    return mockData;
  },
  save: vi.fn(),
}));

vi.mock('../../public/js/cookie.js', () => ({
  saveViewState: vi.fn(),
  loadViewState: vi.fn(() => null),
}));

// sort.js mit echten Implementierungen – nötig damit renderInis() sortiert/filtert
vi.mock('../../public/js/sort.js', () => ({
  sortState: { field: null, dir: 'asc' },
  filterState: { name: '', team: '', status: '', projektstatus: '' },
  pageState: { current: 1, pageSize: 20 },
  getSortedInis: () => mockData.initiatives,
  getPaginatedInis: () => ({
    items: mockData.initiatives,
    total: mockData.initiatives.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }),
}));

// dom.js mock – Elemente werden in buildDom() gesetzt
const mockDom = vi.hoisted(() => ({}));
vi.mock('../../public/js/dom.js', () => ({ dom: mockDom }));

import { renderEntity, renderAll } from '../../public/js/render.js';

// ── DOM-Setup ─────────────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <span id="kw-badge"></span>
    <div id="teams-grid"></div>
    <span id="teams-count"></span>
    <select id="filter-team"><option value="">Alle</option></select>
    <table>
      <tbody id="ini-body"></tbody>
    </table>
    <span id="inis-count"></span>
    <div id="ini-pagination"></div>
    <table><thead><tr>
      <th id="th-sort-name" data-sort="name" class="sortable"></th>
    </tr></thead></table>
    <div id="nv-grid"></div>
    <span id="nv-count"></span>
  `;
  mockDom.kwBadge          = document.getElementById('kw-badge');
  mockDom.teamsGrid        = document.getElementById('teams-grid');
  mockDom.teamsCount       = document.getElementById('teams-count');
  mockDom.filterTeam       = document.getElementById('filter-team');
  mockDom.iniBody          = document.getElementById('ini-body');
  mockDom.inisCount        = document.getElementById('inis-count');
  mockDom.iniPagination    = document.getElementById('ini-pagination');
  mockDom.sortableHeaders  = document.querySelectorAll('.sortable');
  mockDom.nvGrid           = document.getElementById('nv-grid');
  mockDom.nvCount          = document.getElementById('nv-count');
}

beforeEach(() => {
  buildDom();
  mockData.teams = [];
  mockData.initiatives = [];
  mockData.nicht_vergessen = [];
  mockData.risks = [];
  mockData.milestones = [];
  mockData.kw = '';
});

// ── Tests: renderEntity('teams') ─────────────────────────────────────────────

describe('renderEntity("teams")', () => {
  it('leert das Grid wenn teams leer', () => {
    mockData.teams = [];
    renderEntity('teams');
    expect(mockDom.teamsGrid.innerHTML).toBe('');
  });

  it('erzeugt eine Karte pro Team', () => {
    mockData.teams = [
      { id: 1, name: 'Alpha', status: 'grey', fokus: '', schritt: '' },
      { id: 2, name: 'Beta',  status: 'yellow', fokus: '', schritt: '' },
    ];
    renderEntity('teams');
    expect(mockDom.teamsGrid.querySelectorAll('.team-card').length).toBe(2);
  });

  it('zeigt Team-Namen im input', () => {
    mockData.teams = [{ id: 1, name: 'Mein Team', status: 'grey', fokus: '', schritt: '' }];
    renderEntity('teams');
    const input = mockDom.teamsGrid.querySelector('.team-name');
    expect(input?.value).toBe('Mein Team');
  });

  it('setzt data-id korrekt auf die Karte', () => {
    mockData.teams = [{ id: 42, name: 'Test', status: 'grey', fokus: '', schritt: '' }];
    renderEntity('teams');
    const btn = mockDom.teamsGrid.querySelector('[data-action="removeEntity"]');
    expect(btn?.dataset.id).toBe('42');
  });

  it('rendert status-dot mit korrekter CSS-Klasse', () => {
    mockData.teams = [{ id: 1, name: 'T', status: 'fertig', fokus: '', schritt: '' }];
    renderEntity('teams');
    const dot = mockDom.teamsGrid.querySelector('.status-dot');
    expect(dot?.classList.contains('status-fertig')).toBe(true);
  });

  it('aktualisiert teams-count', () => {
    mockData.teams = [
      { id: 1, name: 'A', status: 'grey', fokus: '', schritt: '' },
      { id: 2, name: 'B', status: 'grey', fokus: '', schritt: '' },
    ];
    renderEntity('teams');
    expect(mockDom.teamsCount.textContent).toBe('2');
  });

  it('HTML-escaped Sonderzeichen im Team-Namen', () => {
    mockData.teams = [{ id: 1, name: '<script>alert(1)</script>', status: 'grey', fokus: '', schritt: '' }];
    renderEntity('teams');
    // Kein <script>-Element darf im DOM entstehen
    expect(mockDom.teamsGrid.querySelector('script')).toBeNull();
    // Der Wert landet korrekt im input-Attribut (unescaped beim Auslesen)
    const input = mockDom.teamsGrid.querySelector('.team-name');
    expect(input?.value).toBe('<script>alert(1)</script>');
  });
});

// ── Tests: renderEntity('initiatives') – renderIniRow ────────────────────────

describe('renderEntity("initiatives")', () => {
  it('leert die Tabelle wenn initiatives leer', () => {
    mockData.initiatives = [];
    renderEntity('initiatives');
    expect(mockDom.iniBody.querySelectorAll('tr').length).toBe(0);
  });

  it('erzeugt eine Tabellenzeile pro Initiative', () => {
    mockData.initiatives = [
      { id: 1, name: 'Init A', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
      { id: 2, name: 'Init B', team: null, status: 'yellow', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    renderEntity('initiatives');
    expect(mockDom.iniBody.querySelectorAll('tr.ini-row').length).toBe(2);
  });

  it('zeigt WSJF-Wert wenn gesetzt', () => {
    mockData.initiatives = [
      { id: 1, name: 'X', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: 7.5 },
    ];
    renderEntity('initiatives');
    const wsjfEl = mockDom.iniBody.querySelector('.wsjf-value');
    expect(wsjfEl?.textContent).toBe('7.5');
    expect(wsjfEl?.classList.contains('wsjf-empty')).toBe(false);
  });

  it('zeigt wsjf-empty wenn kein WSJF-Wert', () => {
    mockData.initiatives = [
      { id: 1, name: 'X', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    renderEntity('initiatives');
    const wsjfEl = mockDom.iniBody.querySelector('.wsjf-value');
    expect(wsjfEl?.classList.contains('wsjf-empty')).toBe(true);
  });

  it('rendert Risk-Badge mit Anzahl wenn Risiken vorhanden', () => {
    mockData.initiatives = [
      { id: 10, name: 'Mit Risiken', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    mockData.risks = [
      { id: 1, initiative: 10, eintrittswahrscheinlichkeit: 3, schadensausmass: 3 },
      { id: 2, initiative: 10, eintrittswahrscheinlichkeit: 2, schadensausmass: 2 },
    ];
    renderEntity('initiatives');
    const badge = mockDom.iniBody.querySelector('.risk-badge-mini');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('2');
  });

  it('rendert keinen Risk-Badge wenn keine Risiken vorhanden', () => {
    mockData.initiatives = [
      { id: 10, name: 'Ohne Risiken', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    mockData.risks = [];
    renderEntity('initiatives');
    expect(mockDom.iniBody.querySelector('.risk-badge-mini')).toBeNull();
  });

  it('HTML-escaped den Initiativnamen', () => {
    mockData.initiatives = [
      { id: 1, name: '<b>XSS</b>', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    renderEntity('initiatives');
    // Kein <b>-Element darf im DOM entstehen
    expect(mockDom.iniBody.querySelector('b')).toBeNull();
    // Der Wert sitzt korrekt im input
    const input = mockDom.iniBody.querySelector('.ini-name');
    expect(input?.value).toBe('<b>XSS</b>');
  });

  it('setzt status-select-wrap Klasse passend zu Initiative-Status', () => {
    mockData.initiatives = [
      { id: 1, name: 'A', team: null, status: 'yellow', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    renderEntity('initiatives');
    const wrap = mockDom.iniBody.querySelector('.status-select-wrap');
    expect(wrap?.classList.contains('s-yellow')).toBe(true);
  });

  it('aktualisiert inis-count', () => {
    mockData.initiatives = [
      { id: 1, name: 'I1', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
      { id: 2, name: 'I2', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null },
    ];
    renderEntity('initiatives');
    expect(mockDom.inisCount.textContent).toBe('2');
  });
});

// ── Tests: renderEntity('nicht_vergessen') ───────────────────────────────────

describe('renderEntity("nicht_vergessen")', () => {
  it('erzeugt eine Karte pro NV-Eintrag', () => {
    mockData.nicht_vergessen = [
      { id: 1, title: 'Erledigen', body: 'Wichtig' },
      { id: 2, title: 'Nicht vergessen', body: '' },
    ];
    renderEntity('nicht_vergessen');
    expect(mockDom.nvGrid.querySelectorAll('.nv-card').length).toBe(2);
  });

  it('aktualisiert nv-count', () => {
    mockData.nicht_vergessen = [{ id: 1, title: 'X', body: '' }];
    renderEntity('nicht_vergessen');
    expect(mockDom.nvCount.textContent).toBe('1');
  });
});

// ── Tests: renderAll ─────────────────────────────────────────────────────────

describe('renderAll()', () => {
  it('rendert kw-badge', () => {
    mockData.kw = '13';
    renderAll();
    expect(mockDom.kwBadge.textContent).toBe('KW 13');
  });

  it('rendert kw-badge mit Strich wenn kw leer', () => {
    mockData.kw = '';
    renderAll();
    expect(mockDom.kwBadge.textContent).toBe('KW —');
  });

  it('rendert alle drei Bereiche ohne Fehler', () => {
    mockData.teams = [{ id: 1, name: 'T', status: 'grey', fokus: '', schritt: '' }];
    mockData.initiatives = [{ id: 1, name: 'I', team: 1, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', wsjf: null }];
    mockData.nicht_vergessen = [{ id: 1, title: 'N', body: '' }];
    expect(() => renderAll()).not.toThrow();
    expect(mockDom.teamsGrid.querySelectorAll('.team-card').length).toBe(1);
    expect(mockDom.iniBody.querySelectorAll('.ini-row').length).toBe(1);
    expect(mockDom.nvGrid.querySelectorAll('.nv-card').length).toBe(1);
  });
});
