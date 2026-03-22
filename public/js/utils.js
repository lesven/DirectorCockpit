/**
 * Gemeinsame Hilfsfunktionen — aus render.js, detail.js, crud.js und store.js extrahiert.
 */

export function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function calcWsjf(ini) {
  const { businessValue, timeCriticality, riskReduction, jobSize } = ini;
  if (businessValue == null || timeCriticality == null || riskReduction == null || jobSize == null || jobSize <= 0)
    return null;
  return Math.round(((businessValue + timeCriticality + riskReduction) / jobSize) * 10) / 10;
}

export function findById(arr, id) {
  return arr.find((x) => x.id === id);
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Berechne Team-Statistiken: Gesamtzahl Initiativen, kritisch und in Arbeit
 * @param {number} teamId - Team ID
 * @param {Array} initiatives - Array von Initiative-Objekten
 * @returns {Object} {total, critical, inProgress}
 */
export function calculateTeamStats(teamId, initiatives) {
  const teamInis = initiatives.filter((ini) => ini.team === teamId);
  const total = teamInis.length;
  const critical = teamInis.filter((ini) => ini.projektstatus === 'kritisch').length;
  const inProgress = teamInis.filter((ini) => ini.status === 'yellow').length;
  return { total, critical, inProgress };
}

/**
 * Formatiere Team-Statistiken als Badge-String
 * @param {Object} stats - Objekt mit {total, critical, inProgress}
 * @returns {string} Formatierte Statistics wie "📊 5 • ⚠️ 2 • 🚀 3"
 */
export function formatTeamStats(stats) {
  const { total, critical, inProgress } = stats;
  return `📊 ${total} • ⚠️ ${critical} • 🚀 ${inProgress}`;
}
