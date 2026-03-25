/**
 * detail-risks.js
 * Verantwortlich für: Risiko-CRUD, Risiko-Render (Liste + Summary-Bar),
 * Risk-Input-Handling auf der Detail-Page.
 */
import { data, save, dSave } from './store.js';
import { findById, esc, calcRiskScore, getRiskLevel, generateId } from './utils.js';
import {
  RISK_PROBABILITY_LABELS,
  RISK_IMPACT_LABELS,
  ROAM_STATUS_LABELS,
  ROAM_STATUS_CSS,
} from './config.js';
import { autoGrow } from './render.js';
import { dom } from './dom.js';

// ─── Select HTML Helpers (lokal benötigt) ───────────────────

function riskOptionsHtml(labels, selected) {
  return Object.entries(labels)
    .map(([v, l]) => `<option value="${v}"${+v === selected ? ' selected' : ''}>${l} (${v})</option>`)
    .join('');
}

function roamOptionsHtml(selected) {
  const options = [['', '– kein Status –'], ...Object.entries(ROAM_STATUS_LABELS)];
  return options
    .map(([v, l]) => `<option value="${v}"${v === (selected || '') ? ' selected' : ''}>${l}</option>`)
    .join('');
}

// ─── Render: Summary-Bar ─────────────────────────────────────

export function renderRiskSummaryBar(risks) {
  if (!risks.length) {
    dom.dpRiskSummaryBar.innerHTML = '';
    return;
  }

  const counts = { 'risk-critical': 0, 'risk-high': 0, 'risk-medium': 0, 'risk-low': 0 };
  const labels = { 'risk-critical': 'Kritisch', 'risk-high': 'Hoch', 'risk-medium': 'Mittel', 'risk-low': 'Gering' };

  risks.forEach((r) => {
    const level = getRiskLevel(calcRiskScore(r));
    counts[level.css]++;
  });

  const segments = ['risk-critical', 'risk-high', 'risk-medium', 'risk-low']
    .filter((k) => counts[k] > 0)
    .map((k) => `<span class="dp-risk-seg ${k}">${labels[k]}: ${counts[k]}</span>`)
    .join('');

  dom.dpRiskSummaryBar.innerHTML = `<div class="dp-risk-summary-bar">${segments}</div>`;
}

// ─── Render: Risk-Karte ──────────────────────────────────────

function roamBadgeHtml(roamStatus) {
  if (!roamStatus) return '';
  const label = ROAM_STATUS_LABELS[roamStatus] || roamStatus;
  const css   = ROAM_STATUS_CSS[roamStatus]    || '';
  return `<span class="roam-badge ${css}">${label}</span>`;
}

function riskCardHtml(risk) {
  const score = calcRiskScore(risk);
  const level = getRiskLevel(score);

  return `
    <div class="dp-risk-card" data-risk-id="${risk.id}" data-level="${level.css}">
      <div class="dp-risk-card-header">
        <input class="dp-risk-bezeichnung"
               value="${esc(risk.bezeichnung)}"
               placeholder="Risikobezeichnung"
               data-risk-id="${risk.id}" data-risk-field="bezeichnung">
        <span class="risk-badge ${level.css}">${level.label} (${score})</span>
        ${roamBadgeHtml(risk.roamStatus)}
        <button class="icon-btn dp-risk-delete"
                data-action="removeRisk" data-risk-id="${risk.id}"
                title="Risiko löschen">✕</button>
      </div>
      <div class="dp-risk-dropdowns">
        <div class="detail-field">
          <label class="detail-label">Eintrittswahrscheinlichkeit</label>
          <div class="detail-select-wrap">
            <select class="detail-input"
                    data-risk-id="${risk.id}" data-risk-field="eintrittswahrscheinlichkeit">
              ${riskOptionsHtml(RISK_PROBABILITY_LABELS, risk.eintrittswahrscheinlichkeit)}
            </select>
          </div>
        </div>
        <div class="detail-field">
          <label class="detail-label">Schadensausmaß</label>
          <div class="detail-select-wrap">
            <select class="detail-input"
                    data-risk-id="${risk.id}" data-risk-field="schadensausmass">
              ${riskOptionsHtml(RISK_IMPACT_LABELS, risk.schadensausmass)}
            </select>
          </div>
        </div>
        <div class="detail-field">
          <label class="detail-label">ROAM-Status</label>
          <div class="detail-select-wrap">
            <select class="detail-input"
                    data-risk-id="${risk.id}" data-risk-field="roamStatus">
              ${roamOptionsHtml(risk.roamStatus)}
            </select>
          </div>
        </div>
      </div>
      <div class="dp-risk-notes">
        <div class="dp-risk-notes-left">
          <label class="detail-label">Beschreibung</label>
          <textarea class="dp-risk-beschreibung"
                    placeholder="Was könnte schiefgehen?"
                    data-risk-id="${risk.id}" data-risk-field="beschreibung">${esc(risk.beschreibung)}</textarea>
        </div>
        <div class="dp-risk-notes-right">
          <label class="detail-label">Begründung / Maßnahmen</label>
          <textarea class="dp-risk-roam-notiz"
                    placeholder="Begründung oder Maßnahmen…"
                    data-risk-id="${risk.id}" data-risk-field="roamNotiz">${esc(risk.roamNotiz || '')}</textarea>
        </div>
      </div>
    </div>
  `;
}

// ─── Render: Risk-Liste ──────────────────────────────────────

function renderRiskList(risks, onAddFirst) {
  if (!risks.length) {
    dom.dpRiskList.innerHTML = `
      <div class="dp-risk-empty">
        <span class="dp-risk-empty-icon">🛡</span>
        <p>Noch keine Risiken erfasst.</p>
        <button class="add-btn" id="dp-risk-add-empty">+ Erstes Risiko hinzufügen</button>
      </div>
    `;
    document.getElementById('dp-risk-add-empty')?.addEventListener('click', onAddFirst);
    return;
  }

  const sorted = [...risks].sort((a, b) => calcRiskScore(b) - calcRiskScore(a));
  dom.dpRiskList.innerHTML = sorted.map(riskCardHtml).join('');
  requestAnimationFrame(() => {
    dom.dpRiskList.querySelectorAll('.dp-risk-roam-notiz, .dp-risk-beschreibung').forEach(autoGrow);
  });
}

export function refreshRisks(currentId) {
  if (currentId === null) return;
  const risks = data.risks.filter((r) => r.initiative === currentId);
  dom.dpRiskCount.textContent = risks.length || '';
  renderRiskSummaryBar(risks);
  renderRiskList(risks, () => addRisk(currentId));
}

// ─── CRUD: Risiken ───────────────────────────────────────────

export function addRisk(currentId) {
  if (currentId === null) return;
  const risk = {
    id: generateId(),
    initiative: currentId,
    bezeichnung: '',
    beschreibung: '',
    eintrittswahrscheinlichkeit: 1,
    schadensausmass: 1,
    roamStatus: null,
    roamNotiz: '',
  };
  data.risks.push(risk);
  save();
  refreshRisks(currentId);
  const inputs = dom.dpRiskList.querySelectorAll('.dp-risk-bezeichnung');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

export function removeRisk(riskId, currentId) {
  const risk = findById(data.risks, riskId);
  const name = risk && risk.bezeichnung ? `„${risk.bezeichnung}"` : 'dieses Risiko';
  if (!confirm(`${name} wirklich löschen?`)) return;
  data.risks = data.risks.filter((r) => r.id !== riskId);
  save();
  refreshRisks(currentId);
}

// ─── Input-Handler für Risk-Felder ──────────────────────────

export function handleRiskField(el, currentId) {
  const riskId = el.dataset.riskId ? +el.dataset.riskId : null;
  const field  = el.dataset.riskField;
  if (!riskId || !field) return;

  const risk = findById(data.risks, riskId);
  if (!risk) return;

  if (field === 'eintrittswahrscheinlichkeit' || field === 'schadensausmass') {
    risk[field] = parseInt(el.value, 10);
    refreshRisks(currentId);
  } else if (field === 'roamStatus') {
    risk.roamStatus = el.value || null;
    refreshRisks(currentId);
  } else {
    risk[field] = el.value;
    if (field === 'roamNotiz' || field === 'beschreibung') autoGrow(el);
  }
  dSave();
}
