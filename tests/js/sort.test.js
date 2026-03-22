import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock wird gehoisted — daher vi.hoisted() für die geteilte Referenz
const mockData = vi.hoisted(() => ({ teams: [], initiatives: [] }));

vi.mock('../../public/js/store.js', () => ({ data: mockData }));
vi.mock('../../public/js/cookie.js', () => ({ saveViewState: vi.fn() }));

import { getSortedInis, sortState, filterState, applyViewState, sortInis, getPaginatedInis, pageState, resetPage } from '../../public/js/sort.js';

function resetState() {
  filterState.name = '';
  filterState.team = '';
  filterState.status = '';
  filterState.projektstatus = '';
  sortState.field = null;
  sortState.dir = 'asc';
  pageState.current = 1;
  pageState.pageSize = 20;
}

function setInis(inis) {
  mockData.initiatives = inis;
}
function setTeams(teams) {
  mockData.teams = teams;
}

const INI_A = { id: 1, name: 'Alpha', team: 10, status: 'yellow', projektstatus: 'ok', frist: '01.04', businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 5 };
const INI_B = { id: 2, name: 'Beta', team: 20, status: 'fertig', projektstatus: 'kritisch', frist: '15.03', businessValue: 1, timeCriticality: 1, riskReduction: 1, jobSize: 21 };
const INI_C = { id: 3, name: 'Charlie', team: null, status: 'grey', projektstatus: 'ok', frist: '', businessValue: null, timeCriticality: null, riskReduction: null, jobSize: null };

const TEAM_A = { id: 10, name: 'Frontend' };
const TEAM_B = { id: 20, name: 'Backend' };

beforeEach(() => {
  resetState();
  setTeams([TEAM_A, TEAM_B]);
  setInis([INI_A, INI_B, INI_C]);
});

// ── Filtering ────────────────────────────────────────────

describe('getSortedInis() — Filtering', () => {
  it('returns all initiatives when no filter is set', () => {
    const result = getSortedInis();
    expect(result).toHaveLength(3);
  });

  it('filters by name (case-insensitive)', () => {
    filterState.name = 'alpha';
    expect(getSortedInis().map((i) => i.id)).toEqual([1]);
  });

  it('filters by name substring', () => {
    filterState.name = 'et'; // matches "Beta"
    expect(getSortedInis().map((i) => i.id)).toEqual([2]);
  });

  it('filters by team id', () => {
    filterState.team = '20';
    expect(getSortedInis().map((i) => i.id)).toEqual([2]);
  });

  it('excludes initiatives with null team when team filter is set', () => {
    filterState.team = '10';
    const result = getSortedInis();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by status', () => {
    filterState.status = 'grey';
    expect(getSortedInis().map((i) => i.id)).toEqual([3]);
  });

  it('filters by projektstatus', () => {
    filterState.projektstatus = 'kritisch';
    expect(getSortedInis().map((i) => i.id)).toEqual([2]);
  });

  it('combines multiple filters (AND)', () => {
    filterState.status = 'yellow';
    filterState.projektstatus = 'ok';
    expect(getSortedInis().map((i) => i.id)).toEqual([1]);
  });

  it('returns empty array when no initiatives match', () => {
    filterState.name = 'nonexistent';
    expect(getSortedInis()).toEqual([]);
  });
});

// ── Sorting ──────────────────────────────────────────────

describe('getSortedInis() — Sorting', () => {
  it('returns unsorted when sortState.field is null', () => {
    expect(getSortedInis().map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('sorts by name asc', () => {
    sortState.field = 'name';
    sortState.dir = 'asc';
    expect(getSortedInis().map((i) => i.name)).toEqual(['Alpha', 'Beta', 'Charlie']);
  });

  it('sorts by name desc', () => {
    sortState.field = 'name';
    sortState.dir = 'desc';
    expect(getSortedInis().map((i) => i.name)).toEqual(['Charlie', 'Beta', 'Alpha']);
  });

  it('sorts by team name asc (null team last)', () => {
    sortState.field = 'team';
    sortState.dir = 'asc';
    const names = getSortedInis().map((i) => i.id);
    // Backend (20) < Frontend (10) < zzz (null)
    expect(names).toEqual([2, 1, 3]);
  });

  it('sorts by status using STATUS_ORDER', () => {
    sortState.field = 'status';
    sortState.dir = 'asc';
    // fertig=0, yellow=1, grey=2
    expect(getSortedInis().map((i) => i.id)).toEqual([2, 1, 3]);
  });

  it('sorts by projektstatus using PROJECT_STATUS_ORDER', () => {
    sortState.field = 'projektstatus';
    sortState.dir = 'asc';
    // ok=0(x2), kritisch=1
    const result = getSortedInis();
    expect(result[result.length - 1].projektstatus).toBe('kritisch');
  });

  it('sorts by frist asc (empty last)', () => {
    sortState.field = 'frist';
    sortState.dir = 'asc';
    // "01.04", "15.03", "" → "15.03" < "01.04" (string) ... actually "01.04" < "15.03"
    const result = getSortedInis();
    expect(result[result.length - 1].frist).toBe(''); // empty is last ('zzz')
  });

  it('sorts by wsjf desc (null last)', () => {
    sortState.field = 'wsjf';
    sortState.dir = 'desc';
    const result = getSortedInis();
    // INI_A: (8+5+3)/5 = 3.2, INI_B: (1+1+1)/21 ≈ 0.14, INI_C: null → -Infinity
    expect(result[0].id).toBe(1); // highest WSJF
    expect(result[1].id).toBe(2);
    expect(result[2].id).toBe(3); // null → last
  });

  it('sorts by wsjf asc (null last)', () => {
    sortState.field = 'wsjf';
    sortState.dir = 'asc';
    const result = getSortedInis();
    // INI_B: ~0.14, INI_A: 3.2, INI_C: null → Infinity (last)
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(3);
  });
});

// ── Filtering + Sorting combined ─────────────────────────

describe('getSortedInis() — Filter + Sort combined', () => {
  it('filters first, then sorts', () => {
    filterState.projektstatus = 'ok'; // removes INI_B
    sortState.field = 'name';
    sortState.dir = 'desc';
    expect(getSortedInis().map((i) => i.name)).toEqual(['Charlie', 'Alpha']);
  });
});

// ── applyViewState ───────────────────────────────────────

describe('applyViewState()', () => {
  it('restores filter and sort from saved object', () => {
    applyViewState({
      filter: { name: 'test', team: '10', status: 'yellow', projektstatus: 'ok' },
      sort: { field: 'name', dir: 'desc' },
    });
    expect(filterState.name).toBe('test');
    expect(filterState.team).toBe('10');
    expect(sortState.field).toBe('name');
    expect(sortState.dir).toBe('desc');
  });

  it('ignores invalid sort fields', () => {
    applyViewState({ sort: { field: 'invalid_field', dir: 'asc' } });
    expect(sortState.field).toBeNull();
  });

  it('ignores invalid sort direction', () => {
    applyViewState({ sort: { field: 'name', dir: 'invalid' } });
    expect(sortState.dir).toBe('asc'); // unchanged default
  });

  it('handles null/undefined gracefully', () => {
    expect(() => applyViewState(null)).not.toThrow();
    expect(() => applyViewState(undefined)).not.toThrow();
  });

  it('handles partial saved state', () => {
    applyViewState({ filter: { name: 'partial' } });
    expect(filterState.name).toBe('partial');
    expect(filterState.team).toBe(''); // unchanged
  });
});

// ── sortInis ─────────────────────────────────────────────

describe('sortInis()', () => {
  it('sets field and asc direction on first call', () => {
    sortInis('name');
    expect(sortState.field).toBe('name');
    expect(sortState.dir).toBe('asc');
  });

  it('toggles direction on same field', () => {
    sortInis('name');
    expect(sortState.dir).toBe('asc');
    sortInis('name');
    expect(sortState.dir).toBe('desc');
    sortInis('name');
    expect(sortState.dir).toBe('asc');
  });

  it('defaults to desc for wsjf field', () => {
    sortInis('wsjf');
    expect(sortState.dir).toBe('desc');
  });

  it('resets direction when switching fields', () => {
    sortInis('name');
    sortInis('name'); // now desc
    sortInis('status'); // switch field → asc
    expect(sortState.field).toBe('status');
    expect(sortState.dir).toBe('asc');
  });
});

// ── getPaginatedInis ──────────────────────────────────────

function makeInis(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Ini ${i + 1}`,
    team: null,
    status: 'grey',
    projektstatus: 'ok',
    frist: '',
    businessValue: null,
    timeCriticality: null,
    riskReduction: null,
    jobSize: null,
  }));
}

describe('getPaginatedInis()', () => {
  it('returns all items when count <= pageSize', () => {
    setInis(makeInis(5));
    const { items, total, page, totalPages } = getPaginatedInis();
    expect(items).toHaveLength(5);
    expect(total).toBe(5);
    expect(page).toBe(1);
    expect(totalPages).toBe(1);
  });

  it('returns first page of 20 when there are 25 items', () => {
    setInis(makeInis(25));
    const { items, total, page, totalPages } = getPaginatedInis();
    expect(items).toHaveLength(20);
    expect(total).toBe(25);
    expect(page).toBe(1);
    expect(totalPages).toBe(2);
  });

  it('returns second page with remaining items', () => {
    setInis(makeInis(25));
    pageState.current = 2;
    const { items, total, page } = getPaginatedInis();
    expect(items).toHaveLength(5);
    expect(total).toBe(25);
    expect(page).toBe(2);
  });

  it('clamps current page when items are deleted', () => {
    setInis(makeInis(25));
    pageState.current = 2; // page 2 exists
    setInis(makeInis(10)); // now only 1 page
    const { page, totalPages } = getPaginatedInis();
    expect(totalPages).toBe(1);
    expect(page).toBe(1);
    expect(pageState.current).toBe(1);
  });

  it('respects filter when paginating', () => {
    setInis(makeInis(25));
    filterState.name = 'Ini 2'; // matches only "Ini 2", "Ini 20", "Ini 21"…"Ini 25" — actually just "Ini 2" and "Ini 2x"
    // Let's use a more deterministic filter
    filterState.name = 'Ini 1'; // matches Ini 1, Ini 10..19 = 11 items
    const { total, totalPages } = getPaginatedInis();
    expect(total).toBeLessThan(25);
    expect(totalPages).toBe(1); // less than 20
  });

  it('returns exactly 20 items on page with 40 total', () => {
    setInis(makeInis(40));
    const { items, totalPages } = getPaginatedInis();
    expect(items).toHaveLength(20);
    expect(totalPages).toBe(2);
  });
});

describe('resetPage()', () => {
  it('resets current page to 1', () => {
    pageState.current = 5;
    resetPage();
    expect(pageState.current).toBe(1);
  });
});
