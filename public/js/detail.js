/**
 * detail.js – Orchestrierung der Detail-Page.
 * Koordiniert Open/Close und Event-Binding.
 * Render-/CRUD-Logik liegt in den Teilmodulen:
 *   detail-initiatives.js | detail-risks.js | detail-milestones.js
 */
import { data, dSave } from './store.js';
import { copyMilestonesToClipboard } from './milestoneExport.js';
import { findById } from './utils.js';
import { renderEntity } from './render.js';
import { dom } from './dom.js';
import { setHash, clearHash, buildDeepLink } from './routing.js';

import {
  renderHeaderBadges,
  renderStammdaten,
  renderWsjf,
  renderBlockedBy,
  handleIniField,
} from './detail-initiatives.js';
import {
  refreshRisks,
  addRisk,
  removeRisk,
  handleRiskField,
} from './detail-risks.js';
import {
  refreshMilestones,
  addMilestone,
  removeMilestone,
  handleMilestoneField,
} from './detail-milestones.js';


let currentId = null;

// ─── Open / Close ────────────────────────────────────────────

export function openDetail(id, { pushState = true } = {}) {
  const ini = findById(data.initiatives, id);
  if (!ini) return;
  currentId = id;

  dom.dpName.value = ini.name || '';
  renderHeaderBadges(ini);
  renderStammdaten(ini);
  renderBlockedBy(ini);
  renderWsjf(ini);
  refreshRisks(currentId);
  refreshMilestones(currentId);

  dom.header.hidden = true;
  dom.main.hidden   = true;
  dom.footer.hidden = true;
  dom.detailPage.hidden = false;
  window.scrollTo(0, 0);

  if (pushState) setHash('initiative', id);
}

export function closeDetail({ pushState = true } = {}) {
  if (currentId === null) return;
  dom.detailPage.hidden = true;
  dom.header.hidden = false;
  dom.main.hidden   = false;
  dom.footer.hidden = false;
  renderEntity('initiatives');
  currentId = null;

  if (pushState) clearHash();
}

// ─── Input-Dispatcher ────────────────────────────────────────

function handleDetailInput(e) {
  const el = e.target;

  if (el === dom.dpName) {
    const ini = findById(data.initiatives, currentId);
    if (ini) { ini.name = el.value; dSave(); }
    return;
  }

  if (el.dataset.riskField) {
    handleRiskField(el, currentId);
    return;
  }

  if (el.dataset.milestoneField) {
    handleMilestoneField(el, currentId);
    return;
  }

  if (el.dataset.dpField) {
    handleIniField(el, currentId);
  }
}

// ─── Milestone Copy Handler ──────────────────────────────────

async function handleMilestoneCopy() {
  const btn = dom.dpMilestoneCopy;
  const milestones = data.milestones.filter((m) => m.initiative === currentId);
  const ini = findById(data.initiatives, currentId);
  const initiativeName = ini ? ini.name : '';

  try {
    await copyMilestonesToClipboard(milestones, initiativeName);
    const original = btn.textContent;
    btn.textContent = '✓ Kopiert!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1500);
  } catch (_err) {
    const original = btn.textContent;
    btn.textContent = '⚠ Fehler';
    setTimeout(() => { btn.textContent = original; }, 2000);
  }
}

// ─── Deep-Link Copy Handler ──────────────────────────────────

async function handleCopyLink() {
  if (currentId === null) return;
  const btn = dom.dpCopyLink;
  try {
    await navigator.clipboard.writeText(buildDeepLink(currentId));
    const original = btn.textContent;
    btn.textContent = '✓';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1500);
  } catch (_err) {
    console.warn('Deep-Link kopieren fehlgeschlagen', _err);
  }
}

// ─── Event Binding ───────────────────────────────────────────

export function bindDetailEvents() {
  dom.dpBack.addEventListener('click', () => closeDetail());
  dom.dpRiskAdd.addEventListener('click', () => addRisk(currentId));
  dom.dpMilestoneAdd.addEventListener('click', () => addMilestone(currentId));
  dom.dpMilestoneCopy.addEventListener('click', handleMilestoneCopy);
  dom.dpCopyLink.addEventListener('click', handleCopyLink);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.detailPage.hidden) closeDetail();
  });

  dom.detailPage.addEventListener('input',  handleDetailInput);
  dom.detailPage.addEventListener('change', handleDetailInput);

  // Re-sort milestones only after the date field loses focus, not during editing.
  dom.detailPage.addEventListener('focusout', (e) => {
    if (e.target.dataset?.milestoneField === 'frist') {
      refreshMilestones(currentId);
    }
  });

  dom.detailPage.addEventListener('click', (e) => {
    const riskTarget = e.target.closest('[data-action="removeRisk"]');
    if (riskTarget) removeRisk(+riskTarget.dataset.riskId, currentId);

    const msTarget = e.target.closest('[data-action="removeMilestone"]');
    if (msTarget) removeMilestone(+msTarget.dataset.milestoneId, currentId);
  });
}


