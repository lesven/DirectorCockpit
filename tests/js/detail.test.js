import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('scrollTo', () => {});

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockData = {
  kw: '',
  teams: [{ id: 1, name: 'Team A', status: 'grey' }],
  initiatives: [
    { id: 10, name: 'Test-Initiative', team: 1, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '', businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null },
  ],
  nicht_vergessen: [],
  risks: [],
  milestones: [],
};

vi.mock('../../public/js/store.js', () => ({
  get data() { return mockData; },
  dSave: vi.fn(),
  save: vi.fn(),
  saveEntity: vi.fn(),
  createEntity: vi.fn(),
  deleteEntity: vi.fn(),
}));

vi.mock('../../public/js/utils.js', () => ({
  findById: (arr, id) => arr.find((x) => x.id === id),
  esc: (s) => (s == null ? '' : String(s)),
  calcRiskScore: () => 0,
  getRiskLevel: () => ({ label: 'Gering', css: 'risk-low' }),
  calcWsjf: () => null,
  generateId: () => Date.now(),
}));

vi.mock('../../public/js/render.js', () => ({
  renderEntity: vi.fn(),
  autoGrow: vi.fn(),
}));

const mockDom = vi.hoisted(() => ({}));
vi.mock('../../public/js/dom.js', () => ({
  dom: mockDom,
}));

const { mockSetHash, mockClearHash } = vi.hoisted(() => ({
  mockSetHash: vi.fn(),
  mockClearHash: vi.fn(),
}));

vi.mock('../../public/js/routing.js', () => ({
  setHash: mockSetHash,
  clearHash: mockClearHash,
  buildDeepLink: (id) => `http://localhost/cockpit.html#initiative/${id}`,
}));

import { openDetail, closeDetail, bindDetailEvents } from '../../public/js/detail.js';
import { saveEntity } from '../../public/js/store.js';

// ── DOM Setup ─────────────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <header></header>
    <main></main>
    <footer></footer>
    <section id="detail-page" hidden>
      <div class="dp-header-bar">
        <button id="dp-back"></button>
        <input id="dp-name">
        <div id="dp-header-badges"></div>
        <button id="dp-copy-link"></button>
        <span id="dp-save-ind"></span>
      </div>
      <div class="dp-content">
        <div id="dp-stammdaten"></div>
        <div id="dp-wsjf"></div>
        <span id="dp-risk-count"></span>
        <button id="dp-risk-add"></button>
        <div id="dp-risk-summary-bar"></div>
        <div id="dp-risk-list"></div>
        <span id="dp-milestone-count"></span>
        <button id="dp-milestone-add"></button>
        <button id="dp-milestone-copy">📋 Kopieren</button>
        <div id="dp-milestone-list"></div>
      </div>
    </section>
    <div id="toast" hidden></div>
  `;
  mockDom.detailPage       = document.getElementById('detail-page');
  mockDom.dpBack           = document.getElementById('dp-back');
  mockDom.dpName           = document.getElementById('dp-name');
  mockDom.dpHeaderBadges   = document.getElementById('dp-header-badges');
  mockDom.dpStammdaten     = document.getElementById('dp-stammdaten');
  mockDom.dpWsjf           = document.getElementById('dp-wsjf');
  mockDom.dpRiskCount      = document.getElementById('dp-risk-count');
  mockDom.dpRiskSummaryBar = document.getElementById('dp-risk-summary-bar');
  mockDom.dpRiskList       = document.getElementById('dp-risk-list');
  mockDom.dpRiskAdd        = document.getElementById('dp-risk-add');
  mockDom.dpMilestoneCount = document.getElementById('dp-milestone-count');
  mockDom.dpMilestoneList  = document.getElementById('dp-milestone-list');
  mockDom.dpMilestoneAdd   = document.getElementById('dp-milestone-add');
  mockDom.dpMilestoneCopy  = document.getElementById('dp-milestone-copy');
  mockDom.dpCopyLink       = document.getElementById('dp-copy-link');
  mockDom.toast            = document.getElementById('toast');
  mockDom.header           = document.querySelector('header');
  mockDom.main             = document.querySelector('main');
  mockDom.footer           = document.querySelector('footer');
}

beforeEach(() => {
  buildDom();
  mockSetHash.mockClear();
  mockClearHash.mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('openDetail() Routing-Integration', () => {
  it('ruft setHash auf beim Öffnen', () => {
    openDetail(10);
    expect(mockSetHash).toHaveBeenCalledWith('initiative', 10);
  });

  it('ruft setHash NICHT auf wenn pushState=false', () => {
    openDetail(10, { pushState: false });
    expect(mockSetHash).not.toHaveBeenCalled();
  });

  it('öffnet Detail-Seite trotz pushState=false', () => {
    openDetail(10, { pushState: false });
    expect(mockDom.detailPage.hidden).toBe(false);
  });

  it('ruft setHash nicht auf bei ungültiger ID', () => {
    openDetail(99999);
    expect(mockSetHash).not.toHaveBeenCalled();
  });
});

describe('closeDetail() Routing-Integration', () => {
  it('ruft clearHash auf beim Schließen', () => {
    openDetail(10);
    mockClearHash.mockClear();
    closeDetail();
    expect(mockClearHash).toHaveBeenCalled();
  });

  it('ruft clearHash NICHT auf wenn pushState=false', () => {
    openDetail(10);
    mockClearHash.mockClear();
    closeDetail({ pushState: false });
    expect(mockClearHash).not.toHaveBeenCalled();
  });

  it('schließt Detail-Seite trotz pushState=false', () => {
    openDetail(10);
    closeDetail({ pushState: false });
    expect(mockDom.detailPage.hidden).toBe(true);
  });

  it('tut nichts wenn keine Detail-Seite offen', () => {
    closeDetail();
    expect(mockClearHash).not.toHaveBeenCalled();
  });
});

// ── bindDetailEvents ──────────────────────────────────────────────────────────

describe('bindDetailEvents()', () => {
  it('registriert Events ohne Fehler', () => {
    // Mock clipboard API
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    expect(() => bindDetailEvents()).not.toThrow();
  });

  it('Back-Button schließt die Detail-Seite', () => {
    bindDetailEvents();
    openDetail(10);
    mockClearHash.mockClear();
    mockDom.dpBack.click();
    expect(mockDom.detailPage.hidden).toBe(true);
  });

  it('Escape-Taste schließt die Detail-Seite', () => {
    bindDetailEvents();
    openDetail(10);
    mockClearHash.mockClear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mockDom.detailPage.hidden).toBe(true);
  });

  it('Input auf dp-name aktualisiert Initiative-Name', () => {
    bindDetailEvents();
    openDetail(10);
    mockDom.dpName.value = 'Neuer Name';
    mockDom.detailPage.dispatchEvent(new Event('input', { bubbles: true }));
    // The event handler checks if el === dom.dpName, so we simulate it directly
    const inputEvt = new Event('input', { bubbles: true });
    Object.defineProperty(inputEvt, 'target', { value: mockDom.dpName });
    mockDom.detailPage.dispatchEvent(inputEvt);
    expect(saveEntity).toHaveBeenCalled();
  });
});

// ── openDetail Rendering ───────────────────────────────────────────────────

describe('openDetail() Rendering', () => {
  it('setzt den Name im Input-Feld', () => {
    buildDom();
    mockData.initiatives[0].name = 'Test-Initiative'; // Reset after mutation
    openDetail(10);
    expect(mockDom.dpName.value).toBe('Test-Initiative');
  });

  it('versteckt Header, Main und Footer', () => {
    openDetail(10);
    expect(mockDom.header.hidden).toBe(true);
    expect(mockDom.main.hidden).toBe(true);
    expect(mockDom.footer.hidden).toBe(true);
  });

  it('zeigt die Detail-Seite', () => {
    openDetail(10);
    expect(mockDom.detailPage.hidden).toBe(false);
  });
});

describe('closeDetail() Rendering', () => {
  it('stellt Header, Main und Footer wieder her', () => {
    openDetail(10);
    closeDetail();
    expect(mockDom.header.hidden).toBe(false);
    expect(mockDom.main.hidden).toBe(false);
    expect(mockDom.footer.hidden).toBe(false);
  });
});
