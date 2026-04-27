import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../public/js/utils.js', () => ({
  findById: (arr, id) => arr.find((x) => x.id === id) ?? null,
}));

const mockDeleteEntity = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('../../public/js/store.js', () => ({
  save: vi.fn(),
  deleteEntity: mockDeleteEntity,
}));

import { removeFromCollection, renderEmptyState } from '../../public/js/detail-utils.js';

// ─── removeFromCollection ────────────────────────────────────

describe('removeFromCollection', () => {
  let data;
  let refreshFn;

  beforeEach(() => {
    mockDeleteEntity.mockClear();
    mockDeleteEntity.mockResolvedValue(true);
    data = {
      milestones: [
        { id: 1, aufgabe: 'Planung' },
        { id: 2, aufgabe: 'Umsetzung' },
      ],
    };
    refreshFn = vi.fn();
    vi.stubGlobal('confirm', () => true);
  });

  it('entfernt das Entity aus der Collection', async () => {
    await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Eintrag', refreshFn, 10);

    expect(data.milestones).toHaveLength(1);
    expect(data.milestones[0].id).toBe(2);
  });

  it('ruft deleteEntity() nach dem Löschen auf', async () => {
    await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Eintrag', refreshFn, 10);

    expect(mockDeleteEntity).toHaveBeenCalledWith('milestones', 1);
  });

  it('ruft refreshFn mit currentId auf', async () => {
    await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Eintrag', refreshFn, 42);

    expect(refreshFn).toHaveBeenCalledWith(42);
  });

  it('gibt true zurück wenn gelöscht', async () => {
    const result = await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Eintrag', refreshFn, 10);

    expect(result).toBe(true);
  });

  it('löscht nicht wenn confirm abgebrochen wird', async () => {
    vi.stubGlobal('confirm', () => false);

    const result = await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Eintrag', refreshFn, 10);

    expect(result).toBe(false);
    expect(data.milestones).toHaveLength(2);
    expect(mockDeleteEntity).not.toHaveBeenCalled();
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it('nutzt emptyFallback wenn Entity kein Label hat', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    data.milestones = [{ id: 1, aufgabe: '' }];

    await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Meilenstein', refreshFn, 10);

    expect(confirm).toHaveBeenCalledWith('diesen Meilenstein wirklich löschen?');
  });

  it('zeigt Entityname in confirm-Dialog wenn vorhanden', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));

    await removeFromCollection(data, 'milestones', 1, (e) => e.aufgabe, 'diesen Meilenstein', refreshFn, 10);

    expect(confirm).toHaveBeenCalledWith('„Planung" wirklich löschen?');
  });
});

// ─── renderEmptyState ────────────────────────────────────────

describe('renderEmptyState', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('rendert Leer-Zustand in Container', () => {
    const onAdd = vi.fn();
    renderEmptyState(container, {
      cssClass: 'dp-milestone-empty',
      icon: '📋',
      text: 'Noch keine Einträge.',
      btnId: 'test-add-btn',
      btnText: '+ Hinzufügen',
      onAdd,
    });

    expect(container.querySelector('.dp-milestone-empty')).not.toBeNull();
    expect(container.querySelector('.dp-milestone-empty-icon').textContent).toBe('📋');
    expect(container.querySelector('p').textContent).toBe('Noch keine Einträge.');
    expect(container.querySelector('#test-add-btn').textContent).toBe('+ Hinzufügen');
  });

  it('registriert den onAdd-Handler am Button', () => {
    const onAdd = vi.fn();
    renderEmptyState(container, {
      cssClass: 'dp-risk-empty',
      icon: '🛡',
      text: 'Keine Risiken.',
      btnId: 'risk-add-empty-test',
      btnText: '+ Risiko',
      onAdd,
    });

    document.getElementById('risk-add-empty-test').click();

    expect(onAdd).toHaveBeenCalledOnce();
  });
});
