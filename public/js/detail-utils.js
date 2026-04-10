/**
 * detail-utils.js
 * Gemeinsame Hilfsfunktionen für Detail-Seiten-Module (Milestones, Risks).
 * Vermeidet Duplikation der confirm/filter/save- und EmptyState-Muster.
 */
import { findById } from './utils.js';
import { save } from './store.js';

/**
 * Entfernt ein Entity aus einem benannten data-Array nach Bestätigung.
 *
 * @param {object}   data         – Der globale data-Store (wird direkt mutiert)
 * @param {string}   key          – Schlüssel im data-Objekt (z. B. 'milestones')
 * @param {number}   id           – ID des zu löschenden Eintrags
 * @param {function} labelFn      – Funktion die aus dem Entity einen Anzeigetext liefert
 * @param {string}   emptyFallback – Fallback-Text wenn kein Label vorhanden
 * @param {function} refreshFn    – Wird nach dem Löschen mit currentId aufgerufen
 * @param {number}   currentId    – ID der aktuellen Initiative
 * @returns {boolean} true wenn gelöscht, false wenn abgebrochen
 */
export function removeFromCollection(data, key, id, labelFn, emptyFallback, refreshFn, currentId) {
  const entity = findById(data[key], id);
  const label = entity && labelFn(entity) ? `„${labelFn(entity)}"` : emptyFallback;
  if (!confirm(`${label} wirklich löschen?`)) return false;
  data[key] = data[key].filter((e) => e.id !== id);
  save();
  refreshFn(currentId);
  return true;
}

/**
 * Rendert einen Leer-Zustand in einen Container.
 *
 * @param {HTMLElement} container
 * @param {object}      opts
 * @param {string}      opts.cssClass  – BEM-Block für den Leer-Zustand (z. B. 'dp-milestone-empty')
 * @param {string}      opts.icon      – Emoji/Icon-Text
 * @param {string}      opts.text      – Hinweistext
 * @param {string}      opts.btnId     – ID des Add-Buttons
 * @param {string}      opts.btnText   – Beschriftung des Add-Buttons
 * @param {function}    opts.onAdd     – Click-Handler für den Add-Button
 */
export function renderEmptyState(container, { cssClass, icon, text, btnId, btnText, onAdd }) {
  container.innerHTML = `
    <div class="${cssClass}">
      <span class="${cssClass}-icon">${icon}</span>
      <p>${text}</p>
      <button class="add-btn" id="${btnId}">${btnText}</button>
    </div>
  `;
  document.getElementById(btnId)?.addEventListener('click', onAdd);
}
