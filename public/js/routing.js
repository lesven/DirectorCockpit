/**
 * Hash-basiertes Routing für Deep-Links.
 * Format: #initiative/{id}
 */

const HASH_PATTERN = /^#initiative\/(\d+)$/;

/**
 * Parst den aktuellen window.location.hash.
 * @returns {{ type: string, id: number } | null}
 */
export function parseHash(hash = window.location.hash) {
  const m = HASH_PATTERN.exec(hash);
  if (!m) return null;
  return { type: 'initiative', id: +m[1] };
}

/**
 * Setzt den URL-Hash via pushState (für Browser-History).
 */
export function setHash(type, id) {
  const hash = `#${type}/${id}`;
  window.history.pushState({ type, id }, '', hash);
}

/**
 * Entfernt den Hash aus der URL via pushState.
 */
export function clearHash() {
  window.history.pushState({}, '', window.location.pathname + window.location.search);
}

/**
 * Baut die vollständige Deep-Link-URL für eine Initiative.
 * @param {number} id
 * @returns {string}
 */
export function buildDeepLink(id) {
  return window.location.origin + window.location.pathname + '#initiative/' + id;
}
