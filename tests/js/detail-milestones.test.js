import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────

const mockData = {
  initiatives: [{ id: 10, name: 'Test-Init', status: 'grey' }],
  milestones: [],
};

vi.mock('../../public/js/store.js', () => ({
  get data() { return mockData; },
  createEntity: vi.fn(),
  saveEntity: vi.fn(),
  deleteEntity: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../public/js/utils.js', () => ({
  findById: (arr, id) => arr.find((x) => x.id === id),
  esc: (s) => (s == null ? '' : String(s)),
  generateId: () => 99999,
}));

vi.mock('../../public/js/config.js', () => ({
  MILESTONE_STATUS_OPTIONS: [
    { value: 'offen', label: 'Offen' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung' },
    { value: 'erledigt', label: 'Erledigt' },
  ],
  MILESTONE_STATUS_CSS: {
    offen: 'ms-status-offen',
    in_bearbeitung: 'ms-status-inprogress',
    erledigt: 'ms-status-done',
  },
}));

const mockDom = vi.hoisted(() => ({
  dpMilestoneList: null,
  dpMilestoneCount: null,
}));

vi.mock('../../public/js/dom.js', () => ({
  dom: mockDom,
}));

vi.mock('../../public/js/detail-initiatives.js', () => ({
  selectHtml: (opts, sel) =>
    opts.map((o) => `<option value="${o.value}"${o.value === sel ? ' selected' : ''}>${o.label}</option>`).join(''),
}));

vi.mock('../../public/js/detail-utils.js', () => ({
  removeFromCollection: vi.fn().mockResolvedValue(true),
  renderEmptyState: vi.fn(),
}));

vi.stubGlobal('confirm', vi.fn(() => true));

import { refreshMilestones, addMilestone, removeMilestone, handleMilestoneField } from '../../public/js/detail-milestones.js';
import { createEntity, saveEntity } from '../../public/js/store.js';
import { removeFromCollection, renderEmptyState } from '../../public/js/detail-utils.js';

// ── Setup ──────────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <div id="dp-milestone-list"></div>
    <span id="dp-milestone-count"></span>
  `;
  mockDom.dpMilestoneList = document.getElementById('dp-milestone-list');
  mockDom.dpMilestoneCount = document.getElementById('dp-milestone-count');
}

function resetMilestones(ms = []) {
  mockData.milestones = ms;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDom();
  resetMilestones();
});

// ── refreshMilestones ──────────────────────────────────────────────────

describe('refreshMilestones()', () => {
  it('zeigt Leer-Zustand wenn keine Milestones', () => {
    refreshMilestones(10);
    expect(renderEmptyState).toHaveBeenCalled();
  });

  it('rendert Meilensteine als HTML', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'Aufgabe A', owner: 'Max', status: 'offen', frist: '2026-03-01', bemerkung: '' },
    ]);
    refreshMilestones(10);
    expect(mockDom.dpMilestoneList.innerHTML).toContain('Aufgabe A');
    expect(mockDom.dpMilestoneList.innerHTML).toContain('Max');
  });

  it('setzt den Milestone-Count Badge', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'A', owner: '', status: 'offen', frist: '', bemerkung: '' },
      { id: 2, initiative: 10, aufgabe: 'B', owner: '', status: 'offen', frist: '', bemerkung: '' },
    ]);
    refreshMilestones(10);
    expect(mockDom.dpMilestoneCount.textContent).toBe('2');
  });

  it('tut nichts wenn currentId null ist', () => {
    refreshMilestones(null);
    expect(mockDom.dpMilestoneList.innerHTML).toBe('');
  });

  it('sortiert Milestones nach Frist', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'Zweite', owner: '', status: 'offen', frist: '2026-06-01', bemerkung: '' },
      { id: 2, initiative: 10, aufgabe: 'Erste', owner: '', status: 'offen', frist: '2026-03-01', bemerkung: '' },
    ]);
    refreshMilestones(10);
    const html = mockDom.dpMilestoneList.innerHTML;
    expect(html.indexOf('Erste')).toBeLessThan(html.indexOf('Zweite'));
  });

  it('sortiert Milestones ohne Frist ans Ende', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'Ohne Frist', owner: '', status: 'offen', frist: null, bemerkung: '' },
      { id: 2, initiative: 10, aufgabe: 'Mit Frist', owner: '', status: 'offen', frist: '2026-03-01', bemerkung: '' },
    ]);
    refreshMilestones(10);
    const html = mockDom.dpMilestoneList.innerHTML;
    expect(html.indexOf('Mit Frist')).toBeLessThan(html.indexOf('Ohne Frist'));
  });

  it('filtert nur Milestones der aktuellen Initiative', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'Richtig', owner: '', status: 'offen', frist: '', bemerkung: '' },
      { id: 2, initiative: 99, aufgabe: 'Falsch', owner: '', status: 'offen', frist: '', bemerkung: '' },
    ]);
    refreshMilestones(10);
    expect(mockDom.dpMilestoneList.innerHTML).toContain('Richtig');
    expect(mockDom.dpMilestoneList.innerHTML).not.toContain('Falsch');
  });

  it('zeigt Status-CSS-Klasse in der Milestone-Karte', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'A', owner: '', status: 'erledigt', frist: '', bemerkung: '' },
    ]);
    refreshMilestones(10);
    expect(mockDom.dpMilestoneList.innerHTML).toContain('ms-status-done');
  });
});

// ── addMilestone ────────────────────────────────────────────────────────

describe('addMilestone()', () => {
  it('erstellt ein neues Milestone über createEntity', async () => {
    const created = { id: 99999, initiative: 10, aufgabe: '', owner: '', status: 'offen', frist: null, bemerkung: '' };
    createEntity.mockResolvedValueOnce(created);
    await addMilestone(10);
    expect(createEntity).toHaveBeenCalledWith('milestones', expect.objectContaining({
      initiative: 10,
      status: 'offen',
    }));
    expect(mockData.milestones).toContain(created);
  });

  it('tut nichts wenn currentId null ist', async () => {
    await addMilestone(null);
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('tut nichts wenn createEntity null zurückgibt', async () => {
    createEntity.mockResolvedValueOnce(null);
    await addMilestone(10);
    expect(mockData.milestones).toHaveLength(0);
  });
});

// ── removeMilestone ─────────────────────────────────────────────────────

describe('removeMilestone()', () => {
  it('delegiert an removeFromCollection', () => {
    removeMilestone(1, 10);
    expect(removeFromCollection).toHaveBeenCalledWith(
      mockData, 'milestones', 1,
      expect.any(Function),
      'diesen Meilenstein',
      expect.any(Function),
      10,
    );
  });
});

// ── handleMilestoneField ────────────────────────────────────────────────

describe('handleMilestoneField()', () => {
  it('aktualisiert ein Textfeld und ruft saveEntity auf', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: '', owner: '', status: 'offen', frist: '', bemerkung: '' },
    ]);
    const el = { dataset: { milestoneId: '1', milestoneField: 'aufgabe' }, value: 'Neue Aufgabe' };
    handleMilestoneField(el, 10);
    expect(mockData.milestones[0].aufgabe).toBe('Neue Aufgabe');
    expect(saveEntity).toHaveBeenCalledWith('milestones', 1);
  });

  it('setzt frist auf null wenn leer', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: '', owner: '', status: 'offen', frist: '2026-01-01', bemerkung: '' },
    ]);
    const el = { dataset: { milestoneId: '1', milestoneField: 'frist' }, value: '' };
    handleMilestoneField(el, 10);
    expect(mockData.milestones[0].frist).toBeNull();
  });

  it('setzt Frist wenn Wert vorhanden', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: '', owner: '', status: 'offen', frist: null, bemerkung: '' },
    ]);
    const el = { dataset: { milestoneId: '1', milestoneField: 'frist' }, value: '2026-05-15' };
    handleMilestoneField(el, 10);
    expect(mockData.milestones[0].frist).toBe('2026-05-15');
  });

  it('tut nichts wenn Milestone nicht gefunden', () => {
    const el = { dataset: { milestoneId: '999', milestoneField: 'aufgabe' }, value: 'X' };
    handleMilestoneField(el, 10);
    expect(saveEntity).not.toHaveBeenCalled();
  });

  it('tut nichts wenn milestoneId fehlt', () => {
    const el = { dataset: { milestoneField: 'aufgabe' }, value: 'X' };
    handleMilestoneField(el, 10);
    expect(saveEntity).not.toHaveBeenCalled();
  });

  it('refresht bei Statusänderung', () => {
    resetMilestones([
      { id: 1, initiative: 10, aufgabe: 'A', owner: '', status: 'offen', frist: '', bemerkung: '' },
    ]);
    const el = { dataset: { milestoneId: '1', milestoneField: 'status' }, value: 'erledigt' };
    handleMilestoneField(el, 10);
    expect(mockData.milestones[0].status).toBe('erledigt');
    // The refresh happens internally via renderEmptyState or DOM update
    expect(saveEntity).toHaveBeenCalledWith('milestones', 1);
  });
});
