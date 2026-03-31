/**
 * detail-milestones.js
 * Verantwortlich für: Milestone-CRUD, Milestone-Render, Milestone-Input-Handling
 * auf der Detail-Page.
 */
import { data, save, dSave } from './store.js';
import { findById, esc, generateId } from './utils.js';
import { MILESTONE_STATUS_OPTIONS, MILESTONE_STATUS_CSS } from './config.js';
import { dom } from './dom.js';
import { selectHtml } from './detail-initiatives.js';

// ─── Render: Milestone-Karte ─────────────────────────────────

function milestoneCardHtml(ms) {
  const statusCss = MILESTONE_STATUS_CSS[ms.status] || 'ms-status-offen';

  return `
    <div class="dp-milestone-row" data-milestone-id="${ms.id}" data-ms-status="${ms.status}">
      <textarea class="dp-ms-aufgabe"
                placeholder="Aufgabe…"
                data-milestone-id="${ms.id}" data-milestone-field="aufgabe">${esc(ms.aufgabe)}</textarea>
      <input class="dp-ms-owner"
             value="${esc(ms.owner)}"
             placeholder="Owner…"
             data-milestone-id="${ms.id}" data-milestone-field="owner">
      <input type="date" class="dp-ms-frist"
             value="${esc(ms.frist ?? '')}"
             data-milestone-id="${ms.id}" data-milestone-field="frist">
      <div class="dp-ms-status-wrap">
        <select class="dp-ms-status ${statusCss}"
                data-milestone-id="${ms.id}" data-milestone-field="status">
          ${selectHtml(MILESTONE_STATUS_OPTIONS, ms.status)}
        </select>
      </div>
      <input class="dp-ms-bemerkung"
             value="${esc(ms.bemerkung || '')}"
             placeholder="Bemerkung…"
             data-milestone-id="${ms.id}" data-milestone-field="bemerkung">
      <button class="icon-btn dp-ms-delete"
              data-action="removeMilestone" data-milestone-id="${ms.id}"
              title="Meilenstein löschen">✕</button>
    </div>
  `;
}

// ─── Render: Milestone-Liste ─────────────────────────────────

function renderMilestoneList(milestones, onAddFirst) {
  if (!milestones.length) {
    dom.dpMilestoneList.innerHTML = `
      <div class="dp-milestone-empty">
        <span class="dp-milestone-empty-icon">📋</span>
        <p>Noch keine Meilensteine erfasst.</p>
        <button class="add-btn" id="dp-milestone-add-empty">+ Ersten Meilenstein hinzufügen</button>
      </div>
    `;
    document.getElementById('dp-milestone-add-empty')?.addEventListener('click', onAddFirst);
    return;
  }

  const sorted = [...milestones].sort((a, b) => {
    if (!a.frist && !b.frist) return 0;
    if (!a.frist) return 1;
    if (!b.frist) return -1;
    return a.frist.localeCompare(b.frist);
  });
  dom.dpMilestoneList.innerHTML =
    `<div class="dp-ms-header-row">
       <span class="dp-ms-h-aufgabe">Aufgabe</span>
       <span class="dp-ms-h-owner">Owner</span>
       <span class="dp-ms-h-frist">Frist</span>
       <span class="dp-ms-h-status">Status</span>
       <span class="dp-ms-h-bemerkung">Bemerkung</span>
       <span class="dp-ms-h-del"></span>
     </div>` +
    sorted.map(milestoneCardHtml).join('');
}

export function refreshMilestones(currentId) {
  if (currentId === null) return;
  const milestones = data.milestones.filter((m) => m.initiative === currentId);
  dom.dpMilestoneCount.textContent = milestones.length || '';
  renderMilestoneList(milestones, () => addMilestone(currentId));
}

// ─── CRUD: Meilensteine ──────────────────────────────────────

export function addMilestone(currentId) {
  if (currentId === null) return;
  const ms = {
    id: generateId(),
    initiative: currentId,
    aufgabe: '',
    owner: '',
    status: 'offen',
    frist: null,
    bemerkung: '',
  };
  data.milestones.push(ms);
  save();
  refreshMilestones(currentId);
  const inputs = dom.dpMilestoneList.querySelectorAll('.dp-ms-aufgabe');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

export function removeMilestone(msId, currentId) {
  const ms = findById(data.milestones, msId);
  const name = ms && ms.aufgabe ? `„${ms.aufgabe}"` : 'diesen Meilenstein';
  if (!confirm(`${name} wirklich löschen?`)) return;
  data.milestones = data.milestones.filter((m) => m.id !== msId);
  save();
  refreshMilestones(currentId);
}

// ─── Input-Handler für Milestone-Felder ─────────────────────

export function handleMilestoneField(el, currentId) {
  const msId  = el.dataset.milestoneId ? +el.dataset.milestoneId : null;
  const field = el.dataset.milestoneField;
  if (!msId || !field) return;

  const ms = findById(data.milestones, msId);
  if (!ms) return;

  ms[field] = (field === 'frist') ? (el.value || null) : el.value;

  if (field === 'status') {
    refreshMilestones(currentId);
  }
  dSave();
}
