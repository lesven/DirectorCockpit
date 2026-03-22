import { STATUS_ORDER, PROJECT_STATUS_ORDER } from './config.js';
import { data } from './store.js';
import { findById } from './crud.js';

export const sortState = { field: null, dir: 'asc' };

export const filterState = { name: '', team: '', status: '', projektstatus: '' };

export function sortInis(field) {
  if (sortState.field === field) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.field = field;
    sortState.dir = field === 'wsjf' ? 'desc' : 'asc';
  }
}

export function getSortedInis() {
  const filtered = data.initiatives.filter(ini => {
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
      const calcW = i => {
        const { businessValue, timeCriticality, riskReduction, jobSize } = i;
        if (businessValue == null || timeCriticality == null || riskReduction == null || jobSize == null || jobSize <= 0) return null;
        return (businessValue + timeCriticality + riskReduction) / jobSize;
      };
      const wa = calcW(a);
      const wb = calcW(b);
      va = wa != null ? wa : (dir === 'asc' ? Infinity : -Infinity);
      vb = wb != null ? wb : (dir === 'asc' ? Infinity : -Infinity);
    } else {
      va = (a[field] || '').toLowerCase();
      vb = (b[field] || '').toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
