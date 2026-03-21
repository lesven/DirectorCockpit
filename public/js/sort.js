import { STATUS_ORDER } from './config.js';
import { data } from './store.js';
import { findById } from './crud.js';

export const sortState = { field: null, dir: 'asc' };

export function sortInis(field) {
  if (sortState.field === field) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.field = field;
    sortState.dir = 'asc';
  }
}

export function getSortedInis() {
  if (!sortState.field) return [...data.inis];
  const { field, dir } = sortState;
  return [...data.inis].sort((a, b) => {
    let va, vb;
    if (field === 'team') {
      const ta = findById(data.teams, a.team);
      const tb = findById(data.teams, b.team);
      va = ta ? ta.name.toLowerCase() : 'zzz';
      vb = tb ? tb.name.toLowerCase() : 'zzz';
    } else if (field === 'projektstatus') {
      const PS_ORDER = { ok: 0, kritisch: 1 };
      va = PS_ORDER[a.projektstatus] ?? 9;
      vb = PS_ORDER[b.projektstatus] ?? 9;
    } else if (field === 'status') {
      va = STATUS_ORDER[a.status] ?? 9;
      vb = STATUS_ORDER[b.status] ?? 9;
    } else if (field === 'frist') {
      va = a.frist || 'zzz';
      vb = b.frist || 'zzz';
    } else {
      va = (a[field] || '').toLowerCase();
      vb = (b[field] || '').toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
