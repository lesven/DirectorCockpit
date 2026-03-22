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
