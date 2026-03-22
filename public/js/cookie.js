const COOKIE_NAME = 'cockpit_view';
const MAX_AGE = 31536000; // 365 Tage

export function saveViewState(filterState, sortState) {
  const payload = {
    filter: {
      name: filterState.name,
      team: filterState.team,
      status: filterState.status,
      projektstatus: filterState.projektstatus,
    },
    sort: {
      field: sortState.field,
      dir: sortState.dir,
    },
  };
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function loadViewState() {
  try {
    const match = document.cookie.split('; ').find((c) => c.startsWith(COOKIE_NAME + '='));
    if (!match) return null;
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}
