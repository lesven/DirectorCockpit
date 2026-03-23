import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom implementiert window.scrollTo nicht — Warnung unterdrücken
vi.stubGlobal('scrollTo', () => {});

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockData = {
  kw: '',
  teams: [],
  initiatives: [],
  nicht_vergessen: [],
  risks: [],
};

vi.mock('../../public/js/store.js', () => ({
  get data() { return mockData; },
  dSave: vi.fn(),
  save: vi.fn(),
}));

vi.mock('../../public/js/utils.js', () => ({
  findById: (arr, id) => arr.find((x) => x.id === id),
  esc: (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')),
  calcRiskScore: (r) => r.eintrittswahrscheinlichkeit * r.schadensausmass,
  getRiskLevel: (score) => {
    if (score <= 4)  return { label: 'Gering',   css: 'risk-low' };
    if (score <= 9)  return { label: 'Mittel',   css: 'risk-medium' };
    if (score <= 15) return { label: 'Hoch',     css: 'risk-high' };
    return              { label: 'Kritisch', css: 'risk-critical' };
  },
  calcWsjf: () => null,
}));

vi.mock('../../public/js/render.js', () => ({
  renderEntity: vi.fn(),
  autoGrow: vi.fn(),
}));

// Echte config.js verwenden, damit ROAM-Konstanten getestet werden
import {
  ROAM_STATUS_LABELS,
  ROAM_STATUS_CSS,
} from '../../public/js/config.js';

import { openRiskPage } from '../../public/js/risk.js';

// ── DOM-Hilfsfunktion ─────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <header></header>
    <main></main>
    <footer></footer>
    <div id="risk-page" hidden>
      <div id="risk-page-header-bar">
        <span id="risk-page-ini-name"></span>
        <button id="risk-back"></button>
      </div>
      <div id="risk-ini-summary"></div>
      <button id="risk-add">+ Risiko</button>
      <div id="risk-list"></div>
    </div>
  `;
}

function baseRisk(overrides = {}) {
  return {
    id: 1,
    initiative: 10,
    bezeichnung: 'Testrisiko',
    beschreibung: '',
    eintrittswahrscheinlichkeit: 2,
    schadensausmass: 2,
    roamStatus: null,
    roamNotiz: '',
    ...overrides,
  };
}

function baseIni() {
  return {
    id: 10,
    name: 'Test-Initiative',
    team: null,
    status: 'grey',
    projektstatus: 'ok',
    schritt: '',
    frist: '',
    notiz: '',
    businessValue: null,
    timeCriticality: null,
    riskReduction: null,
    jobSize: null,
  };
}

// ── Tests: ROAM-Konstanten (config.js) ───────────────────────────────────────

describe('ROAM_STATUS_LABELS', () => {
  it('enthält genau die vier ROAM-Werte', () => {
    expect(Object.keys(ROAM_STATUS_LABELS)).toEqual(['resolved', 'owned', 'accepted', 'mitigated']);
  });

  it('hat lesbare deutsche/englische Labels', () => {
    expect(ROAM_STATUS_LABELS.resolved).toBe('Resolved');
    expect(ROAM_STATUS_LABELS.owned).toBe('Owned');
    expect(ROAM_STATUS_LABELS.accepted).toBe('Accepted');
    expect(ROAM_STATUS_LABELS.mitigated).toBe('Mitigated');
  });
});

describe('ROAM_STATUS_CSS', () => {
  it('enthält CSS-Klassen für alle vier ROAM-Werte', () => {
    expect(Object.keys(ROAM_STATUS_CSS)).toEqual(['resolved', 'owned', 'accepted', 'mitigated']);
  });

  it('jede CSS-Klasse beginnt mit roam-', () => {
    Object.values(ROAM_STATUS_CSS).forEach((cls) => {
      expect(cls).toMatch(/^roam-/);
    });
  });

  it('ROAM-Werte und CSS-Schlüssel stimmen überein', () => {
    expect(Object.keys(ROAM_STATUS_CSS)).toEqual(Object.keys(ROAM_STATUS_LABELS));
  });
});

// ── Tests: ROAM-UI im gerenderten HTML ───────────────────────────────────────

describe('ROAM-UI in der Risikokarte', () => {
  beforeEach(() => {
    buildDom();
    mockData.initiatives = [baseIni()];
    mockData.teams = [];
    mockData.risks = [];
  });

  it('zeigt kein roam-badge wenn kein ROAM-Status gesetzt ist', () => {
    mockData.risks = [baseRisk({ roamStatus: null })];
    openRiskPage(10);
    const badge = document.querySelector('.roam-badge');
    expect(badge).toBeNull();
  });

  it('zeigt ein roam-badge mit korrektem Label für "resolved"', () => {
    mockData.risks = [baseRisk({ roamStatus: 'resolved' })];
    openRiskPage(10);
    const badge = document.querySelector('.roam-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Resolved');
  });

  it('setzt die korrekte CSS-Klasse am Badge für jeden ROAM-Status', () => {
    const statusMap = {
      resolved: 'roam-resolved',
      owned: 'roam-owned',
      accepted: 'roam-accepted',
      mitigated: 'roam-mitigated',
    };

    for (const [status, expectedCss] of Object.entries(statusMap)) {
      buildDom();
      mockData.risks = [baseRisk({ roamStatus: status })];
      openRiskPage(10);
      const badge = document.querySelector('.roam-badge');
      expect(badge?.classList.contains(expectedCss)).toBe(true);
    }
  });

  it('rendert den ROAM-Status-Select mit allen vier Optionen plus Leer-Option', () => {
    mockData.risks = [baseRisk()];
    openRiskPage(10);
    const select = document.querySelector('select[data-risk-field="roamStatus"]');
    expect(select).not.toBeNull();
    // 4 ROAM-Werte + 1 Leer-Option
    expect(select.options.length).toBe(5);
  });

  it('wählt den gespeicherten ROAM-Status im Select vor', () => {
    mockData.risks = [baseRisk({ roamStatus: 'accepted' })];
    openRiskPage(10);
    const select = document.querySelector('select[data-risk-field="roamStatus"]');
    expect(select.value).toBe('accepted');
  });

  it('wählt die Leer-Option wenn kein ROAM-Status gesetzt ist', () => {
    mockData.risks = [baseRisk({ roamStatus: null })];
    openRiskPage(10);
    const select = document.querySelector('select[data-risk-field="roamStatus"]');
    expect(select.value).toBe('');
  });

  it('rendert das ROAM-Notizfeld', () => {
    mockData.risks = [baseRisk()];
    openRiskPage(10);
    const notiz = document.querySelector('.risk-roam-notiz');
    expect(notiz).not.toBeNull();
  });

  it('zeigt den gespeicherten ROAM-Notiztext an', () => {
    mockData.risks = [baseRisk({ roamNotiz: 'Fallback-Lieferant organisiert' })];
    openRiskPage(10);
    const notiz = document.querySelector('.risk-roam-notiz');
    expect(notiz.textContent).toBe('Fallback-Lieferant organisiert');
  });

  it('hat data-risk-field="roamNotiz" am Notiz-Textarea', () => {
    mockData.risks = [baseRisk()];
    openRiskPage(10);
    const notiz = document.querySelector('[data-risk-field="roamNotiz"]');
    expect(notiz).not.toBeNull();
    expect(notiz.tagName.toLowerCase()).toBe('textarea');
  });

  it('escapet Sonderzeichen im Notizfeld', () => {
    mockData.risks = [baseRisk({ roamNotiz: '<script>alert(1)</script>' })];
    openRiskPage(10);
    const notiz = document.querySelector('.risk-roam-notiz');
    expect(notiz.innerHTML).not.toContain('<script>');
    expect(notiz.innerHTML).toContain('&lt;script&gt;');
  });
});
