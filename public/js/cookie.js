const STORAGE_KEY = 'cockpit_view';
const LEGACY_COOKIE = 'cockpit_view';

export function saveViewState(filterState, sortState, hideFertig = true, teamsCollapsed = false) {
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
    hideFertig: !!hideFertig,
    teamsCollapsed: !!teamsCollapsed,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage voll oder nicht verfügbar – stiller Fehler
  }
}

function migrateLegacyCookie() {
  try {
    const match = document.cookie.split('; ').find((c) => c.startsWith(LEGACY_COOKIE + '='));
    if (!match) return null;
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // In localStorage übernehmen
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    // Legacy-Cookie löschen
    document.cookie = `${LEGACY_COOKIE}=; Path=/; Max-Age=0`;
    return parsed;
  } catch {
    return null;
  }
}

export function loadViewState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // korrupte Daten ignorieren
  }
  // Fallback: Legacy-Cookie migrieren
  return migrateLegacyCookie();
}
