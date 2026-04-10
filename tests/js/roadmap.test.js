import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockData = vi.hoisted(() => ({
  kw: '15',
  teams: [
    { id: 1, name: 'Team Alpha' },
    { id: 2, name: 'Team Beta' },
  ],
  initiatives: [
    { id: 101, name: 'Init A', team: 1, customer: 10, status: 'yellow', frist: '2026-06-15', schritt: 'Nächster Schritt', notiz: 'Testnotiz' },
    { id: 102, name: 'Init B', team: 1, customer: null, status: 'grey', frist: null },
    { id: 103, name: 'Init Fertig', team: 1, customer: 10, status: 'fertig', frist: '2026-03-01' },
    { id: 104, name: 'Init C', team: 2, customer: 10, status: 'ungeplant', frist: '2026-09-01' },
  ],
  milestones: [
    { id: 201, initiative: 101, aufgabe: 'MS 1', owner: 'Max', status: 'erledigt', frist: '2026-04-01', bemerkung: 'Fertig!' },
    { id: 202, initiative: 101, aufgabe: 'MS 2', owner: 'Anna', status: 'offen', frist: '2026-07-01', bemerkung: '' },
    { id: 203, initiative: 101, aufgabe: 'MS Überfällig', owner: null, status: 'in_bearbeitung', frist: '2026-03-01', bemerkung: 'Verzögert' },
    { id: 204, initiative: 104, aufgabe: 'MS Team2', owner: 'Tom', status: 'offen', frist: '2026-08-15' },
  ],
  kunden: [
    { id: 10, name: 'Kunde X' },
    { id: 20, name: 'Kunde Y' },
  ],
  nicht_vergessen: [],
  risks: [],
}));

vi.mock('../../public/js/store.js', () => ({
  get data() { return mockData; },
  load: vi.fn(async () => {}),
  save: vi.fn(),
  dSave: vi.fn(),
}));

const mockDom = vi.hoisted(() => ({}));
vi.mock('../../public/js/dom.js', () => ({ dom: mockDom }));

import { sc, sbg, mc, sl, ml, fd, addM, som, diffM, reg, resetTips, getTips, buildPanel, buildCustomerPanel, render } from '../../public/js/roadmap.js';

// ── DOM-Setup ─────────────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <div class="hdr">
      <span class="kw" id="kw">KW –</span>
    </div>
    <div class="tabs" id="tabs"></div>
    <div class="main" id="main"></div>
    <div class="tip" id="tip"></div>
  `;
}

beforeEach(() => {
  buildDom();
  resetTips();
});

// ─── Status-Farben ────────────────────────────────────────────────────────────

describe('sc() – Status-Farben', () => {
  it('gibt korrekte CSS-Variable für jeden Status', () => {
    expect(sc('fertig')).toBe('var(--gr)');
    expect(sc('yellow')).toBe('var(--am)');
    expect(sc('grey')).toBe('var(--gy)');
    expect(sc('ungeplant')).toBe('var(--gy)');
    expect(sc('red')).toBe('var(--re)');
    expect(sc('green')).toBe('var(--gr)');
  });

  it('gibt Fallback für unbekannten Status', () => {
    expect(sc('unknown')).toBe('var(--gy)');
    expect(sc(undefined)).toBe('var(--gy)');
  });
});

describe('sbg() – Status-Hintergrundfarben', () => {
  it('gibt korrekte Background-Variable', () => {
    expect(sbg('fertig')).toBe('var(--gr-bg)');
    expect(sbg('yellow')).toBe('var(--am-bg)');
    expect(sbg('grey')).toBe('var(--gy-bg)');
    expect(sbg('ungeplant')).toBe('var(--gy-bg)');
  });

  it('gibt Fallback für unbekannten Status', () => {
    expect(sbg('xyz')).toBe('var(--gy-bg)');
  });
});

describe('mc() – Meilenstein-Farben', () => {
  it('gibt korrekte Farbe pro Meilenstein-Status', () => {
    expect(mc('erledigt')).toBe('var(--gr)');
    expect(mc('in_bearbeitung')).toBe('var(--am)');
    expect(mc('offen')).toBe('var(--gy)');
  });

  it('gibt Fallback für unbekannten Status', () => {
    expect(mc('blockiert')).toBe('var(--gy)');
  });
});

// ─── Status-Labels ────────────────────────────────────────────────────────────

describe('sl() – Status-Labels', () => {
  it('gibt korrekte Labels', () => {
    expect(sl('fertig')).toBe('Fertig');
    expect(sl('yellow')).toBe('In Arbeit');
    expect(sl('grey')).toBe('Geplant');
    expect(sl('ungeplant')).toBe('Ungeplant');
  });

  it('gibt den Eingabewert für unbekannten Status zurück', () => {
    expect(sl('unknown')).toBe('unknown');
  });
});

describe('ml() – Meilenstein-Labels', () => {
  it('gibt korrekte Labels', () => {
    expect(ml('erledigt')).toBe('Erledigt');
    expect(ml('in_bearbeitung')).toBe('In Bearb.');
    expect(ml('offen')).toBe('Offen');
  });

  it('gibt den Eingabewert für unbekannten Status zurück', () => {
    expect(ml('blockiert')).toBe('blockiert');
  });
});

// ─── Datums-Hilfsfunktionen ──────────────────────────────────────────────────

describe('fd() – Datumsformatierung', () => {
  it('formatiert ein Datum korrekt', () => {
    const result = fd('2026-04-10');
    expect(result).toMatch(/10/);
    expect(result).toMatch(/Apr/i);
  });

  it('gibt Strich bei fehlenden Datum zurück', () => {
    expect(fd(null)).toBe('\u2013');
    expect(fd(undefined)).toBe('\u2013');
    expect(fd('')).toBe('\u2013');
  });
});

describe('addM() – Monate addieren', () => {
  it('addiert Monate korrekt', () => {
    const result = addM(new Date(2026, 0, 15), 3);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getFullYear()).toBe(2026);
  });

  it('wechselt Jahresgrenze', () => {
    const result = addM(new Date(2026, 10, 1), 3);
    expect(result.getMonth()).toBe(1); // Februar
    expect(result.getFullYear()).toBe(2027);
  });

  it('subtrahiert Monate', () => {
    const result = addM(new Date(2026, 3, 1), -2);
    expect(result.getMonth()).toBe(1); // Februar
  });
});

describe('som() – Monatsanfang', () => {
  it('gibt den 1. des Monats zurück', () => {
    const result = som(new Date(2026, 5, 17));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5);
    expect(result.getFullYear()).toBe(2026);
  });
});

describe('diffM() – Monatsdifferenz', () => {
  it('berechnet Monatsdifferenz korrekt', () => {
    expect(diffM(new Date(2026, 0, 1), new Date(2026, 5, 1))).toBe(5);
    expect(diffM(new Date(2025, 11, 1), new Date(2026, 2, 1))).toBe(3);
    expect(diffM(new Date(2026, 3, 1), new Date(2026, 3, 1))).toBe(0);
  });
});

// ─── Tooltip-System ──────────────────────────────────────────────────────────

describe('reg() / resetTips() / getTips()', () => {
  it('registriert Tooltips mit aufsteigenden IDs', () => {
    const id1 = reg('<b>Tip 1</b>');
    const id2 = reg('<b>Tip 2</b>');
    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(getTips()[1]).toBe('<b>Tip 1</b>');
    expect(getTips()[2]).toBe('<b>Tip 2</b>');
  });

  it('resetTips() leert die Tooltip-Map', () => {
    reg('test');
    resetTips();
    expect(Object.keys(getTips()).length).toBe(0);
  });
});

// ─── buildPanel() ────────────────────────────────────────────────────────────

describe('buildPanel()', () => {
  const team = { id: 1, name: 'Team Alpha' };
  const msMap = {};
  const km = { 10: 'Kunde X' };

  beforeEach(() => {
    // Build msMap
    Object.keys(msMap).forEach(k => delete msMap[k]);
    mockData.milestones.forEach(m => {
      if (!msMap[m.initiative]) msMap[m.initiative] = [];
      msMap[m.initiative].push(m);
    });
  });

  it('rendert Timeline für Team mit Initiativen', () => {
    const html = buildPanel(mockData, team, msMap, km);
    expect(html).toContain('Init A');
    expect(html).toContain('Init B');
    expect(html).toContain('Team Alpha');
    expect(html).toContain('Initiativen');
  });

  it('filtert fertige Initiativen heraus', () => {
    const html = buildPanel(mockData, team, msMap, km);
    expect(html).not.toContain('Init Fertig');
  });

  it('zeigt Kundenname als Badge', () => {
    const html = buildPanel(mockData, team, msMap, km);
    expect(html).toContain('Kunde X');
  });

  it('zeigt nächsten Schritt', () => {
    const html = buildPanel(mockData, team, msMap, km);
    expect(html).toContain('Nächster Schritt');
  });

  it('rendert Meilenstein-Dots', () => {
    const html = buildPanel(mockData, team, msMap, km);
    expect(html).toContain('data-tip=');
    expect(html).toContain('class="ms');
  });

  it('gibt leere Meldung wenn keine Initiativen', () => {
    const emptyTeam = { id: 99, name: 'Leer' };
    const html = buildPanel(mockData, emptyTeam, msMap, km);
    expect(html).toContain('Keine Initiativen');
  });

  it('rendert Frist-Diamant für Initiativen mit frist', () => {
    const html = buildPanel(mockData, team, msMap, km);
    expect(html).toContain('class="fr');
  });
});

// ─── buildCustomerPanel() ────────────────────────────────────────────────────

describe('buildCustomerPanel()', () => {
  const kunde = { id: 10, name: 'Kunde X' };
  const msMap = {};
  const teamMap = { 1: 'Team Alpha', 2: 'Team Beta' };

  beforeEach(() => {
    Object.keys(msMap).forEach(k => delete msMap[k]);
    mockData.milestones.forEach(m => {
      if (!msMap[m.initiative]) msMap[m.initiative] = [];
      msMap[m.initiative].push(m);
    });
  });

  it('rendert Timeline für Kunden mit Initiativen', () => {
    const html = buildCustomerPanel(mockData, kunde, msMap, teamMap);
    expect(html).toContain('Init A');
    expect(html).toContain('Init C');
    expect(html).toContain('Kunde X');
  });

  it('filtert fertige Initiativen heraus', () => {
    const html = buildCustomerPanel(mockData, kunde, msMap, teamMap);
    expect(html).not.toContain('Init Fertig');
  });

  it('zeigt Team-Chip', () => {
    const html = buildCustomerPanel(mockData, kunde, msMap, teamMap);
    expect(html).toContain('team-chip');
    expect(html).toContain('Team Alpha');
  });

  it('gibt leere Meldung wenn Kunde keine offenen Initiativen hat', () => {
    const leerKunde = { id: 20, name: 'Kunde Y' };
    const html = buildCustomerPanel(mockData, leerKunde, msMap, teamMap);
    expect(html).toContain('Keine Initiativen');
  });
});

// ─── render() ────────────────────────────────────────────────────────────────

describe('render()', () => {
  it('setzt Kalenderwoche im Header', () => {
    render(mockData);
    expect(document.getElementById('kw').textContent).toBe('KW 15');
  });

  it('erstellt Team-Tabs', () => {
    render(mockData);
    const tabs = document.querySelectorAll('.tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2); // Team Alpha, Team Beta
  });

  it('erstellt Kunden-Tabs für Kunden mit Initiativen', () => {
    render(mockData);
    const tabTexts = [...document.querySelectorAll('.tab')].map(t => t.textContent);
    expect(tabTexts.some(t => t.includes('Kunde X'))).toBe(true);
    // Kunde Y hat keine Initiativen
    expect(tabTexts.some(t => t.includes('Kunde Y'))).toBe(false);
  });

  it('erstellt Panels für jedes Team', () => {
    render(mockData);
    const panels = document.querySelectorAll('.pnl');
    expect(panels.length).toBeGreaterThanOrEqual(3); // 2 Teams + 1 Kunde
  });

  it('aktiviert erstes Team-Panel', () => {
    render(mockData);
    const firstPanel = document.getElementById('p-t-1');
    expect(firstPanel.classList.contains('on')).toBe(true);
  });

  it('erstellt Tab-Gruppen-Labels', () => {
    render(mockData);
    const labels = document.querySelectorAll('.tab-group-label');
    expect(labels.length).toBe(2); // "Teams" + "Kunden"
    expect(labels[0].textContent).toBe('Teams');
    expect(labels[1].textContent).toBe('Kunden');
  });

  it('erstellt Tab-Separator', () => {
    render(mockData);
    const sep = document.querySelector('.tab-sep');
    expect(sep).not.toBeNull();
  });
});

// ─── XSS-Schutz ─────────────────────────────────────────────────────────────

describe('XSS-Schutz', () => {
  it('escaped HTML in Initiativnamen', () => {
    const xssData = {
      ...mockData,
      initiatives: [{ id: 999, name: '<script>alert("xss")</script>', team: 1, status: 'yellow', frist: '2026-06-01' }],
    };
    const msMap = {};
    const html = buildPanel(xssData, { id: 1, name: 'Test' }, msMap, {});
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escaped HTML in Meilenstein-Titeln (Tooltip)', () => {
    const xssData = {
      ...mockData,
      initiatives: [{ id: 999, name: 'Safe', team: 1, status: 'yellow', frist: '2026-06-01' }],
      milestones: [{ id: 888, initiative: 999, aufgabe: '<img onerror=alert(1)>', status: 'offen', frist: '2026-05-01' }],
    };
    const msMap = { 999: xssData.milestones };
    resetTips();
    buildPanel(xssData, { id: 1, name: 'Test' }, msMap, {});
    const tips = getTips();
    const allTipHtml = Object.values(tips).join('');
    expect(allTipHtml).not.toContain('<img');
    expect(allTipHtml).toContain('&lt;img');
  });
});
