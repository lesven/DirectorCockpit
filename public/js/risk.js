import { data, dSave, save } from './store.js';
import { findById, esc, calcRiskScore, getRiskLevel } from './utils.js';
import { renderEntity } from './render.js';
import { RISK_PROBABILITY_LABELS, RISK_IMPACT_LABELS } from './config.js';

let currentIniId = null;
const backdrop = () => document.getElementById('risk-backdrop');
const body = () => document.getElementById('risk-body');

function optionsHtml(labels, selected) {
  return Object.entries(labels)
    .map(([v, l]) => `<option value="${v}"${+v === selected ? ' selected' : ''}>${l} (${v})</option>`)
    .join('');
}

function riskCardHtml(risk) {
  const score = calcRiskScore(risk);
  const level = getRiskLevel(score);
  return `
    <div class="risk-card" data-risk-id="${risk.id}">
      <div class="risk-card-header">
        <input class="risk-bezeichnung" value="${esc(risk.bezeichnung)}" placeholder="Risikobezeichnung"
               data-risk-id="${risk.id}" data-risk-field="bezeichnung">
        <span class="risk-badge ${level.css}">${level.label} (${score})</span>
        <button class="icon-btn risk-delete" data-action="removeRisk" data-risk-id="${risk.id}" title="Risiko löschen">✕</button>
      </div>
      <textarea class="risk-beschreibung" rows="2" placeholder="Beschreibung…"
                data-risk-id="${risk.id}" data-risk-field="beschreibung">${esc(risk.beschreibung)}</textarea>
      <div class="risk-row">
        <div class="risk-field">
          <label class="detail-label">Eintrittswahrscheinlichkeit</label>
          <div class="detail-select-wrap">
            <select class="detail-input" data-risk-id="${risk.id}" data-risk-field="eintrittswahrscheinlichkeit">
              ${optionsHtml(RISK_PROBABILITY_LABELS, risk.eintrittswahrscheinlichkeit)}
            </select>
          </div>
        </div>
        <div class="risk-field">
          <label class="detail-label">Schadensausmaß</label>
          <div class="detail-select-wrap">
            <select class="detail-input" data-risk-id="${risk.id}" data-risk-field="schadensausmass">
              ${optionsHtml(RISK_IMPACT_LABELS, risk.schadensausmass)}
            </select>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRiskBody() {
  const risks = data.risks.filter((r) => r.initiative === currentIniId);
  const ini = findById(data.initiatives, currentIniId);
  const title = document.getElementById('risk-title');
  title.textContent = ini ? `Risiken — ${ini.name || 'Initiative'}` : 'Risiken';

  if (!risks.length) {
    body().innerHTML = '<p class="risk-empty">Keine Risiken erfasst.</p>';
    return;
  }
  body().innerHTML = risks.map(riskCardHtml).join('');
}

export function openRiskModal(initiativeId) {
  currentIniId = initiativeId;
  renderRiskBody();
  backdrop().hidden = false;
}

export function closeRiskModal() {
  if (currentIniId === null) return;
  backdrop().hidden = true;
  renderEntity('initiatives');
  currentIniId = null;
}

function addRisk() {
  if (currentIniId === null) return;
  const risk = {
    id: Date.now(),
    initiative: currentIniId,
    bezeichnung: '',
    beschreibung: '',
    eintrittswahrscheinlichkeit: 1,
    schadensausmass: 1,
  };
  data.risks.push(risk);
  save();
  renderRiskBody();
  const inputs = body().querySelectorAll('.risk-bezeichnung');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeRisk(riskId) {
  const risk = findById(data.risks, riskId);
  const name = risk && risk.bezeichnung ? `„${risk.bezeichnung}"` : 'dieses Risiko';
  if (!confirm(`${name} wirklich löschen?`)) return;
  data.risks = data.risks.filter((r) => r.id !== riskId);
  save();
  renderRiskBody();
}

function handleRiskInput(e) {
  const el = e.target;
  if (!el.dataset.riskField || !el.dataset.riskId) return;
  const riskId = +el.dataset.riskId;
  const field = el.dataset.riskField;
  const risk = findById(data.risks, riskId);
  if (!risk) return;

  if (field === 'eintrittswahrscheinlichkeit' || field === 'schadensausmass') {
    risk[field] = parseInt(el.value, 10);
    // Re-render to update score badge
    renderRiskBody();
  } else {
    risk[field] = el.value;
  }
  dSave();
}

function handleRiskClick(e) {
  const target = e.target.closest('[data-action="removeRisk"]');
  if (target) {
    removeRisk(+target.dataset.riskId);
  }
}

export function bindRiskEvents() {
  const bd = backdrop();

  bd.addEventListener('click', (e) => {
    if (e.target === bd) closeRiskModal();
  });

  document.getElementById('risk-close').addEventListener('click', closeRiskModal);
  document.getElementById('risk-add').addEventListener('click', addRisk);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !bd.hidden) closeRiskModal();
  });

  bd.addEventListener('input', handleRiskInput);
  bd.addEventListener('change', handleRiskInput);
  bd.addEventListener('click', handleRiskClick);
}
