import { RISK_LEVEL } from './config.js';

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

/**
 * Berechne Risikoscore aus Eintrittswahrscheinlichkeit × Schadensausmaß
 */
export function calcRiskScore(risk) {
  return (risk.eintrittswahrscheinlichkeit || 1) * (risk.schadensausmass || 1);
}

/**
 * Ermittle Risikostufe (Label + CSS-Klasse) anhand des Scores
 */
export function getRiskLevel(score) {
  for (const level of RISK_LEVEL) {
    if (score <= level.max) return level;
  }
  return RISK_LEVEL[RISK_LEVEL.length - 1];
}

/**
 * Höchster Risikoscore aller Risiken einer Initiative
 */
export function maxRiskScore(risks, initiativeId) {
  const iniRisks = risks.filter((r) => r.initiative === initiativeId);
  if (!iniRisks.length) return null;
  return Math.max(...iniRisks.map(calcRiskScore));
}

let idCounter = 0;

/**
 * Erzeugt eine kollisionssichere numerische ID.
 * Kombination aus Timestamp und Counter verhindert Duplikate
 * bei schnellen Aufrufen im selben Millisekunden-Tick.
 */
export function generateId() {
  return Date.now() * 1000 + (idCounter++ % 1000);
}

/**
 * Gibt alle Meilensteine zurück die fällig (frist <= today) und noch nicht erledigt sind.
 * Meilensteine von abgeschlossenen Initiativen (status = 'fertig') werden ausgeschlossen.
 * Sortierung: frist aufsteigend (älteste zuerst).
 *
 * @param {Array} milestones - Array von Milestone-Objekten mit frist (String 'YYYY-MM-DD') und status
 * @param {Array} initiatives - Array von Initiative-Objekten (für Status- und Namens-Lookup)
 * @param {Date} [today] - Referenzdatum (Standard: aktuelles Datum)
 * @returns {Array<{milestone: Object, initiative: Object}>}
 */
export function getOverdueMilestones(milestones, initiatives, today = new Date()) {
  try {
    if (!Array.isArray(milestones) || !Array.isArray(initiatives)) return [];

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const activeInisById = new Map(
      initiatives
        .filter((ini) => ini.status !== 'fertig')
        .map((ini) => [ini.id, ini]),
    );

    const result = [];
    for (const ms of milestones) {
      if (ms.status === 'erledigt') continue;
      if (!ms.frist) continue;

      const fristDate = new Date(ms.frist);
      if (isNaN(fristDate.getTime())) continue;

      const fristStart = new Date(fristDate.getFullYear(), fristDate.getMonth(), fristDate.getDate());
      if (fristStart > todayStart) continue;

      const ini = activeInisById.get(ms.initiative);
      if (!ini) continue;

      result.push({ milestone: ms, initiative: ini });
    }

    result.sort((a, b) => new Date(a.milestone.frist) - new Date(b.milestone.frist));
    return result;
  } catch (e) {
    console.error('[getOverdueMilestones] Fehler:', e);
    return [];
  }
}
