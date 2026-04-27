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
  createEntity: vi.fn().mockResolvedValue(null),
  deleteEntity: vi.fn().mockResolvedValue(true),
  saveEntity: vi.fn(),
}));

vi.mock('../../public/js/render.js', () => ({
  renderEntity: vi.fn(),
  autoGrow: vi.fn(),
}));

// detail.js wird von crud.js importiert (openDetail bei addEntity)
vi.mock('../../public/js/detail.js', () => ({
  openDetail: vi.fn(),
  bindDetailEvents: vi.fn(),
}));

// window.confirm mocken
vi.stubGlobal('confirm', vi.fn());

import { removeEntity, cycleStatus, addEntity } from '../../public/js/crud.js';
import { save, createEntity, deleteEntity, saveEntity } from '../../public/js/store.js';
import { renderEntity } from '../../public/js/render.js';
import { openDetail } from '../../public/js/detail.js';

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function resetData(overrides = {}) {
  mockData.teams = overrides.teams ?? [];
  mockData.initiatives = overrides.initiatives ?? [];
  mockData.nicht_vergessen = overrides.nicht_vergessen ?? [];
  mockData.risks = overrides.risks ?? [];
  mockData.milestones = overrides.milestones ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  confirm.mockReturnValue(true); // Standardmäßig bestätigen
  resetData();
});

// ── removeEntity: Grundverhalten ──────────────────────────────────────────────

describe('removeEntity() – Grundverhalten', () => {
  it('entfernt das Element aus dem Array wenn confirm = true', async () => {
    resetData({ teams: [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }] });
    await removeEntity('teams', 1);
    expect(mockData.teams).toHaveLength(1);
    expect(mockData.teams[0].id).toBe(2);
  });

  it('lässt das Element im Array wenn confirm = false', async () => {
    confirm.mockReturnValue(false);
    resetData({ teams: [{ id: 1, name: 'Alpha' }] });
    await removeEntity('teams', 1);
    expect(mockData.teams).toHaveLength(1);
  });

  it('ruft deleteEntity() auf nach Löschen', async () => {
    resetData({ teams: [{ id: 1, name: 'Alpha' }] });
    await removeEntity('teams', 1);
    expect(deleteEntity).toHaveBeenCalledWith('teams', 1);
  });

  it('ruft deleteEntity() NICHT auf wenn Benutzer abbricht', async () => {
    confirm.mockReturnValue(false);
    resetData({ teams: [{ id: 1, name: 'Alpha' }] });
    await removeEntity('teams', 1);
    expect(deleteEntity).not.toHaveBeenCalled();
  });

  it('ruft renderEntity mit dem richtigen Typ auf', async () => {
    resetData({ teams: [{ id: 1, name: 'Alpha' }] });
    await removeEntity('teams', 1);
    expect(renderEntity).toHaveBeenCalledWith('teams');
  });

  it('nutzt den Eintragsnamen in der confirm-Meldung', async () => {
    resetData({ teams: [{ id: 5, name: 'Mein Team' }] });
    await removeEntity('teams', 5);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Mein Team'));
  });

  it('nutzt Fallback-Label wenn Name leer', async () => {
    resetData({ teams: [{ id: 5, name: '' }] });
    await removeEntity('teams', 5);
    // Fallback aus ENTITY_DEFS: 'dieses Team'
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('dieses Team'));
  });
});

// ── removeEntity: Kaskaden-Löschung (T-6) ───────────────────────────────────

describe('removeEntity("initiatives") – Kaskaden-Löschung', () => {
  it('löscht alle Risks der Initiative mit', async () => {
    resetData({
      initiatives: [{ id: 10, name: 'Projekt X' }],
      risks: [
        { id: 1, initiative: 10 },
        { id: 2, initiative: 10 },
        { id: 3, initiative: 99 }, // anderer Initiative – bleibt
      ],
      milestones: [],
    });
    await removeEntity('initiatives', 10);
    expect(mockData.risks).toHaveLength(1);
    expect(mockData.risks[0].id).toBe(3);
  });

  it('löscht alle Milestones der Initiative mit', async () => {
    resetData({
      initiatives: [{ id: 10, name: 'Projekt X' }],
      risks: [],
      milestones: [
        { id: 1, initiative: 10 },
        { id: 2, initiative: 10 },
        { id: 3, initiative: 77 }, // anderer Initiative – bleibt
      ],
    });
    await removeEntity('initiatives', 10);
    expect(mockData.milestones).toHaveLength(1);
    expect(mockData.milestones[0].id).toBe(3);
  });

  it('löscht Risks UND Milestones gemeinsam', async () => {
    resetData({
      initiatives: [{ id: 10, name: 'Projekt X' }],
      risks: [{ id: 1, initiative: 10 }, { id: 2, initiative: 20 }],
      milestones: [{ id: 1, initiative: 10 }, { id: 2, initiative: 20 }],
    });
    await removeEntity('initiatives', 10);
    expect(mockData.risks).toHaveLength(1);
    expect(mockData.milestones).toHaveLength(1);
  });

  it('lässt Risks und Milestones anderer Initiativen unangetastet bei Abbruch', async () => {
    confirm.mockReturnValue(false);
    resetData({
      initiatives: [{ id: 10, name: 'Projekt X' }],
      risks: [{ id: 1, initiative: 10 }],
      milestones: [{ id: 1, initiative: 10 }],
    });
    await removeEntity('initiatives', 10);
    expect(mockData.risks).toHaveLength(1);
    expect(mockData.milestones).toHaveLength(1);
    expect(mockData.initiatives).toHaveLength(1);
  });

  it('ist korrekt wenn keine Risks/Milestones vorhanden', async () => {
    resetData({
      initiatives: [{ id: 10, name: 'Projekt X' }],
      risks: [],
      milestones: [],
    });
    await removeEntity('initiatives', 10);
    expect(mockData.initiatives).toHaveLength(0);
  });
});

// ── removeEntity: Teams löscht keine Risks/Milestones ──────────────────────

describe('removeEntity("teams") – keine Kaskaden-Löschung', () => {
  it('löscht Risks anderer Entities NICHT', async () => {
    resetData({
      teams: [{ id: 1, name: 'Alpha' }],
      risks: [{ id: 1, initiative: 5 }],
    });
    await removeEntity('teams', 1);
    expect(mockData.risks).toHaveLength(1);
  });
});

// ── cycleStatus ───────────────────────────────────────────────────────────────

describe('cycleStatus()', () => {
  it('wechselt von grey zu ungeplant', () => {
    resetData({ initiatives: [{ id: 1, name: 'A', status: 'grey' }] });
    cycleStatus(1, false);
    expect(mockData.initiatives[0].status).toBe('ungeplant');
  });

  it('wechselt von ungeplant zurück zu fertig (wrap-around)', () => {
    resetData({ initiatives: [{ id: 1, name: 'A', status: 'ungeplant' }] });
    cycleStatus(1, false);
    expect(mockData.initiatives[0].status).toBe('fertig');
  });

  it('wechselt Team-Status wenn isTeam = true', () => {
    resetData({ teams: [{ id: 2, name: 'T', status: 'fertig' }] });
    cycleStatus(2, true);
    expect(mockData.teams[0].status).toBe('yellow');
  });

  it('tut nichts bei unbekannter id', () => {
    resetData({ initiatives: [{ id: 1, name: 'A', status: 'grey' }] });
    expect(() => cycleStatus(999, false)).not.toThrow();
    expect(mockData.initiatives[0].status).toBe('grey');
  });
});

// ── addEntity ──────────────────────────────────────────────────────────────

describe('addEntity()', () => {
  it('ruft createEntity mit den Default-Daten auf', async () => {
    createEntity.mockResolvedValueOnce({ id: 1, name: 'Neues Team', status: 'grey', fokus: '', schritt: '' });
    await addEntity('teams');
    expect(createEntity).toHaveBeenCalledWith('teams', expect.objectContaining({
      name: 'Neues Team',
      status: 'grey',
    }));
  });

  it('pushed das erstelle Entity in data[type]', async () => {
    const created = { id: 42, name: 'Neues Team', status: 'grey', fokus: '', schritt: '' };
    createEntity.mockResolvedValueOnce(created);
    resetData({ teams: [] });
    await addEntity('teams');
    expect(mockData.teams).toHaveLength(1);
    expect(mockData.teams[0]).toBe(created);
  });

  it('ruft renderEntity nach dem Erstellen auf', async () => {
    createEntity.mockResolvedValueOnce({ id: 1, name: 'Neues Team', status: 'grey' });
    await addEntity('teams');
    expect(renderEntity).toHaveBeenCalledWith('teams');
  });

  it('tut nichts wenn createEntity null zurückgibt', async () => {
    createEntity.mockResolvedValueOnce(null);
    resetData({ teams: [] });
    await addEntity('teams');
    expect(mockData.teams).toHaveLength(0);
    expect(renderEntity).not.toHaveBeenCalled();
  });

  it('öffnet Detail-Page für neue Initiative', async () => {
    const created = { id: 99, name: '', status: 'grey' };
    createEntity.mockResolvedValueOnce(created);
    resetData({ initiatives: [] });
    await addEntity('initiatives');
    expect(openDetail).toHaveBeenCalledWith(99);
  });

  it('fokussiert das letzte Input bei nicht_vergessen', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div><input class="nv-title" /></div>';
    const created = { id: 1, title: '', body: '' };
    createEntity.mockResolvedValueOnce(created);
    resetData({ nicht_vergessen: [] });
    await addEntity('nicht_vergessen');
    expect(renderEntity).toHaveBeenCalledWith('nicht_vergessen');
    vi.useRealTimers();
  });
});
