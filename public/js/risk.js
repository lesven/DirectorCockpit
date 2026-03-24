import { data, dSave, save } from './store.js';
import { findById, esc, calcRiskScore, getRiskLevel, generateId } from './utils.js';
import { renderEntity, autoGrow } from './render.js';
import { RISK_PROBABILITY_LABELS, RISK_IMPACT_LABELS, STATUS_LABELS, ROAM_STATUS_LABELS, ROAM_STATUS_CSS } from './config.js';
import { dom } from './dom.js';

let currentIniId = null;

function optionsHtml(labels, selected) {
  return Object.entries(labels)
    .map(([v, l]) => `<option value="${v}"${+v === selected ? ' selected' : ''}>${l} (${v})</option>`)
    .join('');
}

function renderIniSummary(ini) {
  const team = ini.team ? findById(data.teams, ini.team) : null;
  const teamName = team ? esc(team.name) : '— Kein Team —';
  const statusLabel = STATUS_LABELS[ini.status] || ini.status || '—';
  const psLabel = ini.projektstatus === 'kritisch' ? 'Kritisch' : 'Alles gut';
  const wsjf = ini.wsjf;
  const wsjfStr = wsjf != null ? wsjf : '–';

  return `
    <h2 class="risk-ini-title">${esc(ini.name) || 'Initiative'}</h2>
    <div class="risk-ini-details">
      <div class="risk-ini-detail">
        <span class="detail-label">Team</span>
        <span class="risk-ini-value">${teamName}</span>
      </div>
      <div class="risk-ini-detail">
        <span class="detail-label">Status</span>
        <span class="risk-ini-value">${statusLabel}</span>
      </div>
      <div class="risk-ini-detail">
        <span class="detail-label">Projektstatus</span>
        <span class="risk-ini-value">${psLabel}</span>
      </div>
      <div class="risk-ini-detail">
        <span class="detail-label">WSJF</span>
        <span class="risk-ini-value">${wsjfStr}</span>
      </div>
      <div class="risk-ini-detail">
        <span class="detail-label">Frist</span>
        <span class="risk-ini-value">${esc(ini.frist) || '–'}</span>
      </div>
      <div class="risk-ini-detail">
        <span class="detail-label">Nächster Schritt</span>
        <span class="risk-ini-value">${esc(ini.schritt) || '–'}</span>
      </div>
    </div>
    ${ini.notiz ? `<div class="risk-ini-notiz"><span class="detail-label">Notiz</span><p>${esc(ini.notiz)}</p></div>` : ''}
  `;
}

function roamBadgeHtml(roamStatus) {
  if (!roamStatus) return '';
  const label = ROAM_STATUS_LABELS[roamStatus] || roamStatus;
  const css = ROAM_STATUS_CSS[roamStatus] || '';
  return `<span class="roam-badge ${css}">${label}</span>`;
}

function roamOptionsHtml(selected) {
  const options = [['', '– kein Status –'], ...Object.entries(ROAM_STATUS_LABELS)];
  return options
    .map(([v, l]) => `<option value="${v}"${v === (selected || '') ? ' selected' : ''}>${l}</option>`)
    .join('');
}

function riskCardHtml(risk) {
  const score = calcRiskScore(risk);
  const level = getRiskLevel(score);
  return `
    <div class="risk-card" data-risk-id="${risk.id}" data-level="${level.css}">
      <div class="risk-card-header">
        <input class="risk-bezeichnung" value="${esc(risk.bezeichnung)}" placeholder="Risikobezeichnung"
               data-risk-id="${risk.id}" data-risk-field="bezeichnung">
        <span class="risk-badge ${level.css}">${level.label} (${score})</span>
        ${roamBadgeHtml(risk.roamStatus)}
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
      <div class="roam-section">
        <div class="risk-field">
          <label class="detail-label">ROAM-Status</label>
          <div class="detail-select-wrap">
            <select class="detail-input" data-risk-id="${risk.id}" data-risk-field="roamStatus">
              ${roamOptionsHtml(risk.roamStatus)}
            </select>
          </div>
        </div>
        <textarea class="risk-roam-notiz" placeholder="Begründung / Maßnahmen…"
                  data-risk-id="${risk.id}" data-risk-field="roamNotiz">${esc(risk.roamNotiz || '')}</textarea>
      </div>
    </div>
  `;
}

function renderRiskList() {
  const risks = data.risks.filter((r) => r.initiative === currentIniId);
  if (!risks.length) {
    dom.riskList.innerHTML = '<p class="risk-empty">Keine Risiken erfasst.</p>';
    return;
  }
  dom.riskList.innerHTML = risks.map(riskCardHtml).join('');
  requestAnimationFrame(() => dom.riskList.querySelectorAll('.risk-roam-notiz').forEach(autoGrow));
}

export function openRiskPage(initiativeId) {
  currentIniId = initiativeId;
  const ini = findById(data.initiatives, currentIniId);
  if (!ini) return;

  dom.riskIniSummary.innerHTML = renderIniSummary(ini);
  if (dom.riskPageIniName) dom.riskPageIniName.textContent = ini.name || 'Initiative';
  renderRiskList();

  dom.header.hidden = true;
  dom.main.hidden = true;
  dom.footer.hidden = true;
  // Detail-Modal schließen falls gerade offen
  if (dom.detailBackdrop && !dom.detailBackdrop.hidden) dom.detailBackdrop.hidden = true;

  dom.riskPage.hidden = false;
  window.scrollTo(0, 0);
}

export function closeRiskPage() {
  if (currentIniId === null) return;
  dom.riskPage.hidden = true;
  dom.header.hidden = false;
  dom.main.hidden = false;
  dom.footer.hidden = false;
  renderEntity('initiatives');
  currentIniId = null;
}

function addRisk() {
  if (currentIniId === null) return;
  const risk = {
    id: generateId(),
    initiative: currentIniId,
    bezeichnung: '',
    beschreibung: '',
    eintrittswahrscheinlichkeit: 1,
    schadensausmass: 1,
    roamStatus: null,
    roamNotiz: '',
  };
  data.risks.push(risk);
  save();
  renderRiskList();
  const inputs = dom.riskList.querySelectorAll('.risk-bezeichnung');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeRisk(riskId) {
  const risk = findById(data.risks, riskId);
  const name = risk && risk.bezeichnung ? `„${risk.bezeichnung}“` : 'dieses Risiko';
  if (!confirm(`${name} wirklich löschen?`)) return;
  data.risks = data.risks.filter((r) => r.id !== riskId);
  save();
  renderRiskList();
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
    renderRiskList();
  } else {
    risk[field] = el.value;
    if (field === 'roamNotiz') autoGrow(el);
  }
  dSave();
}

function handleRiskClick(e) {
  const target = e.target.closest('[data-action="removeRisk"]');
  if (target) removeRisk(+target.dataset.riskId);
}

export function bindRiskEvents() {
  dom.riskBack.addEventListener('click', closeRiskPage);
  dom.riskAdd.addEventListener('click', addRisk);

  dom.riskPage.addEventListener('input', handleRiskInput);
  dom.riskPage.addEventListener('change', handleRiskInput);
  dom.riskPage.addEventListener('click', handleRiskClick);
}
