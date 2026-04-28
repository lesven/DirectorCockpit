/**
 * detail-initiatives.test.js — Tests for detail-initiatives.js
 * Covers: HTML helpers, rendering functions, input handling, blocker logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

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
  saveEntity: vi.fn(),
}));

vi.mock('../../public/js/utils.js', () => ({
  findById: (arr, id) => arr.find((x) => x.id === id),
  esc: (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')),
  debounce: (fn) => fn,
  calcWsjf: (ini) => {
    const { businessValue, timeCriticality, riskReduction, jobSize } = ini;
    if (businessValue == null || timeCriticality == null || riskReduction == null || !jobSize) return null;
    return Math.round(((businessValue + timeCriticality + riskReduction) / jobSize) * 10) / 10;
  },
  isCurrentlyBlocked: () => false,
}));

const mockDom = vi.hoisted(() => ({}));
vi.mock('../../public/js/dom.js', () => ({
  dom: mockDom,
}));

// Use real config for WSJF_SCALE, STATUS_*, etc.
import {
  WSJF_SCALE,
  WSJF_FIELDS,
  STATUS_LABELS,
  STATUS_CSS_MAP,
  STATUS_OPTIONS,
  CONFIG,
} from '../../public/js/config.js';

import { saveEntity } from '../../public/js/store.js';

import {
  wsjfSelectHtml,
  selectHtml,
  teamSelectHtml,
  kundeSelectHtml,
  wsjfScoreClass,
  renderHeaderBadges,
  renderStammdaten,
  renderWsjf,
  handleIniField,
  addBlocker,
  removeBlocker,
  renderBlockedBy,
  handleBlockerSearch,
} from '../../public/js/detail-initiatives.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function baseIni(overrides = {}) {
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
    wsjf: null,
    customer: null,
    blockedBy: [],
    ...overrides,
  };
}

function buildDom() {
  document.body.innerHTML = `
    <div id="dp-header-badges"></div>
    <div id="dp-stammdaten"></div>
    <div id="dp-wsjf"></div>
    <div id="dp-blocked-by"></div>
    <div id="bb-suggestions" hidden></div>
  `;
  mockDom.dpHeaderBadges = document.getElementById('dp-header-badges');
  mockDom.dpStammdaten = document.getElementById('dp-stammdaten');
  mockDom.dpWsjf = document.getElementById('dp-wsjf');
  mockDom.dpBlockedBy = document.getElementById('dp-blocked-by');
}

beforeEach(() => {
  buildDom();
  mockData.teams = [{ id: 1, name: 'Team Alpha' }, { id: 2, name: 'Team Beta' }];
  mockData.initiatives = [baseIni()];
  mockData.kunden = [{ id: 100, name: 'Kunde A' }];
  mockData.risks = [];
  mockData.milestones = [];
  vi.clearAllMocks();
});

// ── wsjfSelectHtml() ─────────────────────────────────────────────────────────

describe('wsjfSelectHtml()', () => {
  it('renders "–" as first option when selected is null', () => {
    const html = wsjfSelectHtml(null);
    expect(html).toContain('<option value="" selected>–</option>');
  });

  it('selects the correct Fibonacci value', () => {
    const html = wsjfSelectHtml(5);
    expect(html).toContain('<option value="5" selected>5</option>');
    // "–" should NOT be selected
    expect(html).not.toContain('value="" selected');
  });

  it('includes all WSJF_SCALE values', () => {
    const html = wsjfSelectHtml(null);
    for (const v of WSJF_SCALE) {
      expect(html).toContain(`value="${v}"`);
    }
  });
});

// ── selectHtml() ─────────────────────────────────────────────────────────────

describe('selectHtml()', () => {
  it('renders options with correct values and labels', () => {
    const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
    const html = selectHtml(options, 'b');
    expect(html).toContain('<option value="a">Alpha</option>');
    expect(html).toContain('<option value="b" selected>Beta</option>');
  });

  it('selects nothing when selected does not match', () => {
    const html = selectHtml([{ value: 'x', label: 'X' }], 'y');
    expect(html).not.toContain('selected');
  });
});

// ── teamSelectHtml() ─────────────────────────────────────────────────────────

describe('teamSelectHtml()', () => {
  it('renders "Kein Team" first when no team selected', () => {
    const html = teamSelectHtml(null);
    expect(html).toContain('— Kein Team —');
    expect(html).toContain('selected');
  });

  it('renders all teams from data', () => {
    const html = teamSelectHtml(1);
    expect(html).toContain('Team Alpha');
    expect(html).toContain('Team Beta');
  });

  it('selects the correct team', () => {
    const html = teamSelectHtml(2);
    expect(html).toContain(`value="2" selected`);
  });
});

// ── kundeSelectHtml() ────────────────────────────────────────────────────────

describe('kundeSelectHtml()', () => {
  it('renders "Kein Kunde" first', () => {
    const html = kundeSelectHtml(null);
    expect(html).toContain('— Kein Kunde —');
  });

  it('selects the correct customer', () => {
    const html = kundeSelectHtml(100);
    expect(html).toContain(`value="100" selected`);
    expect(html).toContain('Kunde A');
  });

  it('handles empty kunden array', () => {
    mockData.kunden = [];
    const html = kundeSelectHtml(null);
    expect(html).toContain('— Kein Kunde —');
  });
});

// ── wsjfScoreClass() ─────────────────────────────────────────────────────────

describe('wsjfScoreClass()', () => {
  it('returns empty class for null', () => {
    expect(wsjfScoreClass(null)).toBe('dp-wsjf-score-empty');
  });

  it('returns high for score >= 8', () => {
    expect(wsjfScoreClass(8)).toBe('dp-wsjf-score-high');
    expect(wsjfScoreClass(15)).toBe('dp-wsjf-score-high');
  });

  it('returns medium for score >= 3 and < 8', () => {
    expect(wsjfScoreClass(3)).toBe('dp-wsjf-score-medium');
    expect(wsjfScoreClass(7.9)).toBe('dp-wsjf-score-medium');
  });

  it('returns low for score < 3', () => {
    expect(wsjfScoreClass(1)).toBe('dp-wsjf-score-low');
    expect(wsjfScoreClass(2.9)).toBe('dp-wsjf-score-low');
  });
});

// ── renderHeaderBadges() ─────────────────────────────────────────────────────

describe('renderHeaderBadges()', () => {
  it('renders status and projektstatus badges', () => {
    const ini = baseIni({ status: 'yellow', projektstatus: 'ok', wsjf: 5.2 });
    renderHeaderBadges(ini);
    const html = mockDom.dpHeaderBadges.innerHTML;
    expect(html).toContain('In Arbeit');
    expect(html).toContain('Alles gut');
    expect(html).toContain('WSJF 5.2');
  });

  it('shows "Kritisch" for projektstatus kritisch', () => {
    const ini = baseIni({ projektstatus: 'kritisch' });
    renderHeaderBadges(ini);
    expect(mockDom.dpHeaderBadges.innerHTML).toContain('Kritisch');
  });

  it('shows "–" when WSJF is null', () => {
    const ini = baseIni({ wsjf: null });
    renderHeaderBadges(ini);
    expect(mockDom.dpHeaderBadges.innerHTML).toContain('WSJF –');
  });

  it('applies correct CSS class for each status', () => {
    for (const [status, css] of Object.entries(STATUS_CSS_MAP)) {
      const ini = baseIni({ status });
      renderHeaderBadges(ini);
      expect(mockDom.dpHeaderBadges.innerHTML).toContain(css);
    }
  });
});

// ── renderStammdaten() ───────────────────────────────────────────────────────

describe('renderStammdaten()', () => {
  it('renders team select, status select, frist input, schritt input, notiz textarea', () => {
    const ini = baseIni({ team: 1, status: 'grey', frist: '2026-05-01', schritt: 'Nächster', notiz: 'Hinweis' });
    renderStammdaten(ini);
    const html = mockDom.dpStammdaten.innerHTML;
    expect(html).toContain('data-dp-field="team"');
    expect(html).toContain('data-dp-field="status"');
    expect(html).toContain('data-dp-field="frist"');
    expect(html).toContain('data-dp-field="schritt"');
    expect(html).toContain('data-dp-field="notiz"');
    expect(html).toContain('2026-05-01');
    expect(html).toContain('Nächster');
  });

  it('renders customer select', () => {
    const ini = baseIni({ customer: 100 });
    renderStammdaten(ini);
    expect(mockDom.dpStammdaten.innerHTML).toContain('data-dp-field="customer"');
    expect(mockDom.dpStammdaten.innerHTML).toContain('Kunde A');
  });

  it('renders projektstatus select', () => {
    const ini = baseIni({ projektstatus: 'kritisch' });
    renderStammdaten(ini);
    const html = mockDom.dpStammdaten.innerHTML;
    expect(html).toContain('data-dp-field="projektstatus"');
    expect(html).toContain('Kritisch');
  });
});

// ── renderWsjf() ─────────────────────────────────────────────────────────────

describe('renderWsjf()', () => {
  it('renders WSJF score and all 4 select fields', () => {
    const ini = baseIni({ businessValue: 5, timeCriticality: 3, riskReduction: 2, jobSize: 1, wsjf: 10 });
    renderWsjf(ini);
    const html = mockDom.dpWsjf.innerHTML;
    expect(html).toContain('10');
    expect(html).toContain('data-dp-field="businessValue"');
    expect(html).toContain('data-dp-field="timeCriticality"');
    expect(html).toContain('data-dp-field="riskReduction"');
    expect(html).toContain('data-dp-field="jobSize"');
  });

  it('shows "–" when WSJF is null', () => {
    const ini = baseIni();
    renderWsjf(ini);
    expect(mockDom.dpWsjf.innerHTML).toContain('–');
  });

  it('applies correct score CSS class', () => {
    const ini = baseIni({ wsjf: 10 });
    renderWsjf(ini);
    expect(mockDom.dpWsjf.innerHTML).toContain('dp-wsjf-score-high');
  });
});

// ── handleIniField() ─────────────────────────────────────────────────────────

describe('handleIniField()', () => {
  it('updates team to int or null', () => {
    const ini = baseIni();
    mockData.initiatives = [ini];
    const el = { dataset: { dpField: 'team' }, value: '2' };
    handleIniField(el, 10);
    expect(ini.team).toBe(2);
    expect(saveEntity).toHaveBeenCalledWith('initiatives', 10);

    el.value = '';
    handleIniField(el, 10);
    expect(ini.team).toBeNull();
  });

  it('updates WSJF field and recalculates score', () => {
    const ini = baseIni({ businessValue: 5, timeCriticality: 3, riskReduction: 2, jobSize: 1 });
    mockData.initiatives = [ini];

    // Provide score display elements
    document.body.innerHTML += '<span id="dp-wsjf-score"></span><span id="dp-wsjf-badge"></span>';

    const el = { dataset: { dpField: 'businessValue' }, value: '8' };
    handleIniField(el, 10);
    expect(ini.businessValue).toBe(8);
    expect(ini.wsjf).not.toBeNull();
    expect(saveEntity).toHaveBeenCalledWith('initiatives', 10);
  });

  it('sets WSJF field to null for empty value', () => {
    const ini = baseIni({ businessValue: 5 });
    mockData.initiatives = [ini];
    const el = { dataset: { dpField: 'businessValue' }, value: '' };
    handleIniField(el, 10);
    expect(ini.businessValue).toBeNull();
  });

  it('updates text fields directly', () => {
    const ini = baseIni();
    mockData.initiatives = [ini];
    const el = { dataset: { dpField: 'schritt' }, value: 'Do something' };
    handleIniField(el, 10);
    expect(ini.schritt).toBe('Do something');
    expect(saveEntity).toHaveBeenCalledWith('initiatives', 10);
  });

  it('re-renders header badges on status change', () => {
    const ini = baseIni({ status: 'grey' });
    mockData.initiatives = [ini];
    const el = { dataset: { dpField: 'status' }, value: 'fertig' };
    handleIniField(el, 10);
    expect(ini.status).toBe('fertig');
    // Header badges should have been re-rendered
    expect(mockDom.dpHeaderBadges.innerHTML).toContain('Fertig');
  });

  it('re-renders header badges on projektstatus change', () => {
    const ini = baseIni({ projektstatus: 'ok' });
    mockData.initiatives = [ini];
    const el = { dataset: { dpField: 'projektstatus' }, value: 'kritisch' };
    handleIniField(el, 10);
    expect(ini.projektstatus).toBe('kritisch');
    expect(mockDom.dpHeaderBadges.innerHTML).toContain('Kritisch');
  });

  it('does nothing when initiative not found', () => {
    mockData.initiatives = [];
    const el = { dataset: { dpField: 'name' }, value: 'X' };
    handleIniField(el, 999);
    expect(saveEntity).not.toHaveBeenCalled();
  });

  it('does nothing when field is empty', () => {
    const ini = baseIni();
    mockData.initiatives = [ini];
    const el = { dataset: {}, value: 'X' };
    handleIniField(el, 10);
    expect(saveEntity).not.toHaveBeenCalled();
  });
});

// ── addBlocker() / removeBlocker() ───────────────────────────────────────────

describe('addBlocker()', () => {
  it('adds a blocker ID to the initiative', () => {
    const ini = baseIni({ blockedBy: [] });
    mockData.initiatives = [ini];
    addBlocker(ini, 20);
    expect(ini.blockedBy).toContain(20);
    expect(saveEntity).toHaveBeenCalledWith('initiatives', 10);
  });

  it('does not add duplicate blocker', () => {
    const ini = baseIni({ blockedBy: [20] });
    mockData.initiatives = [ini];
    addBlocker(ini, 20);
    expect(ini.blockedBy.filter((id) => id === 20)).toHaveLength(1);
  });

  it('initializes blockedBy array if not present', () => {
    const ini = baseIni();
    delete ini.blockedBy;
    mockData.initiatives = [ini];
    addBlocker(ini, 30);
    expect(ini.blockedBy).toContain(30);
  });
});

describe('removeBlocker()', () => {
  it('removes a blocker ID from the initiative', () => {
    const ini = baseIni({ blockedBy: [20, 30] });
    mockData.initiatives = [ini];
    removeBlocker(ini, 20);
    expect(ini.blockedBy).not.toContain(20);
    expect(ini.blockedBy).toContain(30);
    expect(saveEntity).toHaveBeenCalledWith('initiatives', 10);
  });

  it('does nothing when blockedBy is not an array', () => {
    const ini = baseIni();
    delete ini.blockedBy;
    mockData.initiatives = [ini];
    removeBlocker(ini, 20);
    expect(saveEntity).not.toHaveBeenCalled();
  });
});

// ── renderBlockedBy() ────────────────────────────────────────────────────────

describe('renderBlockedBy()', () => {
  it('renders "Keine Blocker" when blockedBy is empty', () => {
    const ini = baseIni({ blockedBy: [] });
    mockData.initiatives = [ini];
    renderBlockedBy(ini);
    expect(mockDom.dpBlockedBy.innerHTML).toContain('Keine Blocker');
  });

  it('renders chips for existing blockers', () => {
    const blocker = baseIni({ id: 20, name: 'Blocker-Initiative' });
    const ini = baseIni({ blockedBy: [20] });
    mockData.initiatives = [ini, blocker];
    renderBlockedBy(ini);
    const html = mockDom.dpBlockedBy.innerHTML;
    expect(html).toContain('Blocker-Initiative');
    expect(html).toContain('data-blocker-id="20"');
    expect(html).toContain('data-action="removeBlocker"');
  });

  it('marks deleted blockers as gone', () => {
    const ini = baseIni({ blockedBy: [999] });
    mockData.initiatives = [ini];
    renderBlockedBy(ini);
    expect(mockDom.dpBlockedBy.innerHTML).toContain('bb-chip-gone');
    expect(mockDom.dpBlockedBy.innerHTML).toContain('gelöscht');
  });

  it('renders search input for adding blockers', () => {
    const ini = baseIni();
    mockData.initiatives = [ini];
    renderBlockedBy(ini);
    expect(mockDom.dpBlockedBy.innerHTML).toContain('dp-blocker-search');
  });

  it('does nothing when dpBlockedBy is null', () => {
    mockDom.dpBlockedBy = null;
    const ini = baseIni();
    expect(() => renderBlockedBy(ini)).not.toThrow();
  });
});

// ── handleBlockerSearch() ────────────────────────────────────────────────────

describe('handleBlockerSearch()', () => {
  it('shows suggestions matching query', () => {
    const ini = baseIni({ blockedBy: [] });
    const other = baseIni({ id: 20, name: 'Other Initiative' });
    mockData.initiatives = [ini, other];

    renderBlockedBy(ini); // Creates the bb-suggestions element

    const input = document.getElementById('dp-blocker-search');
    input.value = 'other';
    handleBlockerSearch(input);

    const suggestions = document.getElementById('bb-suggestions');
    expect(suggestions.hidden).toBe(false);
    expect(suggestions.innerHTML).toContain('Other Initiative');
  });

  it('hides suggestions when query is empty', () => {
    const ini = baseIni();
    mockData.initiatives = [ini];
    renderBlockedBy(ini);

    const input = document.getElementById('dp-blocker-search');
    input.value = '';
    handleBlockerSearch(input);

    const suggestions = document.getElementById('bb-suggestions');
    expect(suggestions.hidden).toBe(true);
  });

  it('hides suggestions when no matches', () => {
    const ini = baseIni();
    mockData.initiatives = [ini];
    renderBlockedBy(ini);

    const input = document.getElementById('dp-blocker-search');
    input.value = 'zzzzz_no_match';
    handleBlockerSearch(input);

    const suggestions = document.getElementById('bb-suggestions');
    expect(suggestions.hidden).toBe(true);
  });

  it('excludes self from suggestions', () => {
    const ini = baseIni({ name: 'Self' });
    mockData.initiatives = [ini];
    renderBlockedBy(ini);

    const input = document.getElementById('dp-blocker-search');
    input.value = 'self';
    handleBlockerSearch(input);

    const suggestions = document.getElementById('bb-suggestions');
    expect(suggestions.innerHTML).not.toContain('Self');
  });

  it('excludes already blocked initiatives from suggestions', () => {
    const other = baseIni({ id: 20, name: 'Already Blocked' });
    const ini = baseIni({ blockedBy: [20] });
    mockData.initiatives = [ini, other];
    renderBlockedBy(ini);

    const input = document.getElementById('dp-blocker-search');
    input.value = 'already';
    handleBlockerSearch(input);

    const suggestions = document.getElementById('bb-suggestions');
    expect(suggestions.innerHTML).not.toContain('Already Blocked');
  });

  it('does nothing when initiative not found', () => {
    const input = document.createElement('input');
    input.dataset.iniId = '999';
    input.value = 'test';
    mockData.initiatives = [];
    expect(() => handleBlockerSearch(input)).not.toThrow();
  });

  it('limits suggestions to 8', () => {
    const ini = baseIni({ blockedBy: [] });
    const others = Array.from({ length: 12 }, (_, i) => baseIni({ id: 100 + i, name: `Match ${i}` }));
    mockData.initiatives = [ini, ...others];
    renderBlockedBy(ini);

    const input = document.getElementById('dp-blocker-search');
    input.value = 'match';
    handleBlockerSearch(input);

    const suggestions = document.getElementById('bb-suggestions');
    const items = suggestions.querySelectorAll('.bb-suggestion-item');
    expect(items.length).toBe(8);
  });
});
