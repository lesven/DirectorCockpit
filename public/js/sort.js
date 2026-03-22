import { STATUS_ORDER, PROJECT_STATUS_ORDER } from './config.js';
import { data } from './store.js';
import { findById, calcWsjf } from './utils.js';
import { saveViewState } from './cookie.js';

export const sortState = { field: null, dir: 'asc' };

export const filterState = { name: '', team: '', status: '', projektstatus: '' };

export const pageState = { current: 1, pageSize: 20 };

export function resetPage() {
  pageState.current = 1;
}

const VALID_SORT_FIELDS = ['name', 'team', 'status', 'projektstatus', 'frist', 'wsjf'];

export function applyViewState(saved) {
  if (!saved || typeof saved !== 'object') return;
  const f = saved.filter;
  if (f && typeof f === 'object') {
    if (typeof f.name === 'string') filterState.name = f.name;
    if (typeof f.team === 'string') filterState.team = f.team;
    if (typeof f.status === 'string') filterState.status = f.status;
    if (typeof f.projektstatus === 'string') filterState.projektstatus = f.projektstatus;
  }
  const s = saved.sort;
  if (s && typeof s === 'object') {
    if (VALID_SORT_FIELDS.includes(s.field)) sortState.field = s.field;
    if (s.dir === 'asc' || s.dir === 'desc') sortState.dir = s.dir;
  }
}

export function sortInis(field) {
  if (sortState.field === field) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.field = field;
    sortState.dir = field === 'wsjf' ? 'desc' : 'asc';
  }
  saveViewState(filterState, sortState);
}

export function getSortedInis() {
  const filtered = data.initiatives.filter((ini) => {
    if (filterState.name && !ini.name.toLowerCase().includes(filterState.name.toLowerCase())) return false;
    if (filterState.team && String(ini.team) !== filterState.team) return false;
    if (filterState.status && ini.status !== filterState.status) return false;
    if (filterState.projektstatus && ini.projektstatus !== filterState.projektstatus) return false;
    return true;
  });
  if (!sortState.field) return filtered;
  const { field, dir } = sortState;
  return filtered.sort((a, b) => {
    let va, vb;
    if (field === 'team') {
      const ta = findById(data.teams, a.team);
      const tb = findById(data.teams, b.team);
      va = ta ? ta.name.toLowerCase() : 'zzz';
      vb = tb ? tb.name.toLowerCase() : 'zzz';
    } else if (field === 'projektstatus') {
      va = PROJECT_STATUS_ORDER[a.projektstatus] ?? 9;
      vb = PROJECT_STATUS_ORDER[b.projektstatus] ?? 9;
    } else if (field === 'status') {
      va = STATUS_ORDER[a.status] ?? 9;
      vb = STATUS_ORDER[b.status] ?? 9;
    } else if (field === 'frist') {
      va = a.frist || 'zzz';
      vb = b.frist || 'zzz';
    } else if (field === 'wsjf') {
      const wa = calcWsjf(a);
      const wb = calcWsjf(b);
      va = wa != null ? wa : dir === 'asc' ? Infinity : -Infinity;
      vb = wb != null ? wb : dir === 'asc' ? Infinity : -Infinity;
    } else {
      va = (a[field] || '').toLowerCase();
      vb = (b[field] || '').toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export function getPaginatedInis() {
  const all = getSortedInis();
  const total = all.length;
  const { pageSize } = pageState;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Clamp current page in case items were deleted
  if (pageState.current > totalPages) pageState.current = totalPages;
  const page = pageState.current;
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return { items, total, page, pageSize, totalPages };
}
