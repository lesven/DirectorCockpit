import { data, dSave, save } from './store.js';
import {
  findById,
  esc,
  calcWsjf,
  calcRiskScore,
  getRiskLevel,
  generateId,
} from './utils.js';
import { renderEntity, autoGrow } from './render.js';
import {
  WSJF_SCALE,
  RISK_PROBABILITY_LABELS,
  RISK_IMPACT_LABELS,
  ROAM_STATUS_LABELS,
  ROAM_STATUS_CSS,
} from './config.js';
import { dom } from './dom.js';

const STATUS_OPTIONS = [
  { value: 'fertig',    label: 'Fertig' },
  { value: 'yellow',   label: 'In Arbeit' },
  { value: 'grey',     label: 'Geplant' },
  { value: 'ungeplant', label: 'Ungeplant' },
];

const PROJEKTSTATUS_OPTIONS = [
  { value: 'ok',       label: 'Alles gut' },
  { value: 'kritisch', label: 'Kritisch' },
];

const WSJF_FIELDS = ['businessValue', 'timeCriticality', 'riskReduction', 'jobSize'];

const STATUS_CSS_MAP   = { fertig: 'pill-green', yellow: 'pill-yellow', grey: 'pill-grey', ungeplant: 'pill-red' };
const STATUS_LABEL_MAP = { fertig: 'Fertig', yellow: 'In Arbeit', grey: 'Geplant', ungeplant: 'Ungeplant' };

let currentId = null;

// ─── Select HTML Helpers ────────────────────────────────────

function wsjfSelectHtml(selected) {
  const none = `<option value=""${selected == null ? ' selected' : ''}>–</option>`;
  const opts = WSJF_SCALE
    .map((v) => `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`)
    .join('');
  return none + opts;
}

function selectHtml(options, selected) {
  return options
    .map((o) => `<option value="${o.value}"${o.value === selected ? ' selected' : ''}>${esc(o.label)}</option>`)
    .join('');
}

function teamSelectHtml(selectedId) {
  const none = `<option value=""${!selectedId ? ' selected' : ''}>— Kein Team —</option>`;
  const opts = data.teams
    .map((t) => `<option value="${t.id}"${t.id === selectedId ? ' selected' : ''}>${esc(t.name)}</option>`)
    .join('');
  return none + opts;
}

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

// ─── WSJF Score Display ─────────────────────────────────────

function wsjfScoreClass(score) {
  if (score == null) return 'dp-wsjf-score-empty';
  if (score >= 8)    return 'dp-wsjf-score-high';
  if (score >= 3)    return 'dp-wsjf-score-medium';
  return 'dp-wsjf-score-low';
}

// ─── Header Badges ──────────────────────────────────────────

function renderHeaderBadges(ini) {
  const statusCss   = STATUS_CSS_MAP[ini.status]   || 'pill-grey';
  const statusLabel = STATUS_LABEL_MAP[ini.status] || ini.status || '—';
  const psCss       = ini.projektstatus === 'kritisch' ? 'pill-red'   : 'pill-green';
  const psLabel     = ini.projektstatus === 'kritisch' ? 'Kritisch'   : 'Alles gut';
  const wsjfVal     = ini.wsjf != null ? ini.wsjf : '–';

  dom.dpHeaderBadges.innerHTML = `
    <span class="status-pill ${statusCss}" id="dp-status-badge"><span class="pill-dot"></span>${statusLabel}</span>
    <span class="status-pill ${psCss}" id="dp-ps-badge"><span class="pill-dot"></span>${psLabel}</span>
    <span class="dp-wsjf-header-badge" id="dp-wsjf-badge">WSJF ${wsjfVal}</span>
  `;
}

// ─── Stammdaten Section ─────────────────────────────────────

function renderStammdaten(ini) {
  dom.dpStammdaten.innerHTML = `
    <div class="detail-row">
      <div class="detail-field">
        <label class="detail-label" for="dp-team">Team</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-team" data-dp-field="team">
            ${teamSelectHtml(ini.team)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="dp-frist">Frist</label>
        <input type="date" class="detail-input" id="dp-frist" data-dp-field="frist"
               value="${esc(ini.frist)}">
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-field">
        <label class="detail-label" for="dp-status">Status</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-status" data-dp-field="status">
            ${selectHtml(STATUS_OPTIONS, ini.status)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="dp-projektstatus">Projektstatus</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-projektstatus" data-dp-field="projektstatus">
            ${selectHtml(PROJEKTSTATUS_OPTIONS, ini.projektstatus)}
          </select>
        </div>
      </div>
    </div>
    <div class="detail-field">
      <label class="detail-label" for="dp-schritt">Nächster Schritt</label>
      <input class="detail-input" id="dp-schritt" data-dp-field="schritt"
             value="${esc(ini.schritt)}" placeholder="Was muss als nächstes passieren?">
    </div>
    <div class="detail-field">
      <label class="detail-label" for="dp-notiz">Notiz</label>
      <textarea class="detail-input" id="dp-notiz" data-dp-field="notiz"
                rows="5" placeholder="Weitere Hinweise, Kontext, Links…">${esc(ini.notiz)}</textarea>
    </div>
  `;
}

// ─── WSJF Section ───────────────────────────────────────────

function renderWsjf(ini) {
  const score      = ini.wsjf;
  const scoreClass = wsjfScoreClass(score);

  dom.dpWsjf.innerHTML = `
    <div class="dp-wsjf-score-wrap">
      <span class="dp-wsjf-score ${scoreClass}" id="dp-wsjf-score">${score != null ? score : '–'}</span>
      <span class="dp-wsjf-score-label">WSJF-Score</span>
    </div>
    <div class="dp-wsjf-formula">
      <span class="dp-wsjf-formula-part">Business Value</span>
      <span class="dp-wsjf-formula-op">+</span>
      <span class="dp-wsjf-formula-part">Time Criticality</span>
      <span class="dp-wsjf-formula-op">+</span>
      <span class="dp-wsjf-formula-part">Risk Reduction</span>
      <span class="dp-wsjf-formula-op">÷</span>
      <span class="dp-wsjf-formula-part">Job Size</span>
    </div>
    <div class="dp-wsjf-fields">
      <div class="detail-field">
        <label class="detail-label" for="dp-bv">Business Value</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-bv" data-dp-field="businessValue">
            ${wsjfSelectHtml(ini.businessValue)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="dp-tc">Time Criticality</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-tc" data-dp-field="timeCriticality">
            ${wsjfSelectHtml(ini.timeCriticality)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="dp-rr">Risk Reduction / Opportunity</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-rr" data-dp-field="riskReduction">
            ${wsjfSelectHtml(ini.riskReduction)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="dp-js">Job Size</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-js" data-dp-field="jobSize">
            ${wsjfSelectHtml(ini.jobSize)}
          </select>
        </div>
      </div>
    </div>
  `;
}

// ─── Risk Summary Bar ────────────────────────────────────────

function renderRiskSummaryBar(risks) {
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

// ─── Risk Card HTML ──────────────────────────────────────────

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
      <div class="dp-risk-body">
        <div class="dp-risk-body-left">
          <label class="detail-label">Beschreibung</label>
          <textarea class="dp-risk-beschreibung" rows="3"
                    placeholder="Was könnte schiefgehen?"
                    data-risk-id="${risk.id}" data-risk-field="beschreibung">${esc(risk.beschreibung)}</textarea>
        </div>
        <div class="dp-risk-body-right">
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
        </div>
      </div>
      <div class="dp-risk-roam">
        <div class="detail-field">
          <label class="detail-label">ROAM-Status</label>
          <div class="detail-select-wrap">
            <select class="detail-input"
                    data-risk-id="${risk.id}" data-risk-field="roamStatus">
              ${roamOptionsHtml(risk.roamStatus)}
            </select>
          </div>
        </div>
        <div class="detail-field">
          <label class="detail-label">Begründung / Maßnahmen</label>
          <textarea class="dp-risk-roam-notiz"
                    placeholder="Begründung oder Maßnahmen…"
                    data-risk-id="${risk.id}" data-risk-field="roamNotiz">${esc(risk.roamNotiz || '')}</textarea>
        </div>
      </div>
    </div>
  `;
}

// ─── Risk List ───────────────────────────────────────────────

function renderRiskList(risks) {
  if (!risks.length) {
    dom.dpRiskList.innerHTML = `
      <div class="dp-risk-empty">
        <span class="dp-risk-empty-icon">🛡</span>
        <p>Noch keine Risiken erfasst.</p>
        <button class="add-btn" id="dp-risk-add-empty">+ Erstes Risiko hinzufügen</button>
      </div>
    `;
    document.getElementById('dp-risk-add-empty')?.addEventListener('click', addRisk);
    return;
  }

  const sorted = [...risks].sort((a, b) => calcRiskScore(b) - calcRiskScore(a));
  dom.dpRiskList.innerHTML = sorted.map(riskCardHtml).join('');
  requestAnimationFrame(() =>
    dom.dpRiskList.querySelectorAll('.dp-risk-roam-notiz').forEach(autoGrow),
  );
}

function refreshRisks() {
  if (currentId === null) return;
  const risks = data.risks.filter((r) => r.initiative === currentId);
  if (dom.dpRiskCount) dom.dpRiskCount.textContent = risks.length || '';
  renderRiskSummaryBar(risks);
  renderRiskList(risks);
}

// ─── Add / Remove Risks ─────────────────────────────────────

function addRisk() {
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
  refreshRisks();
  const inputs = dom.dpRiskList.querySelectorAll('.dp-risk-bezeichnung');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeRisk(riskId) {
  const risk = findById(data.risks, riskId);
  const name = risk && risk.bezeichnung ? `„${risk.bezeichnung}"` : 'dieses Risiko';
  if (!confirm(`${name} wirklich löschen?`)) return;
  data.risks = data.risks.filter((r) => r.id !== riskId);
  save();
  refreshRisks();
}

// ─── Open / Close ────────────────────────────────────────────

export function openDetail(id) {
  const ini = findById(data.initiatives, id);
  if (!ini) return;
  currentId = id;

  dom.dpName.value = ini.name || '';
  renderHeaderBadges(ini);
  renderStammdaten(ini);
  renderWsjf(ini);
  refreshRisks();

  dom.header.hidden = true;
  dom.main.hidden   = true;
  dom.footer.hidden = true;
  dom.detailPage.hidden = false;
  window.scrollTo(0, 0);
}

export function closeDetail() {
  if (currentId === null) return;
  dom.detailPage.hidden = true;
  dom.header.hidden = false;
  dom.main.hidden   = false;
  dom.footer.hidden = false;
  renderEntity('initiatives');
  currentId = null;
}

// ─── Input Handling ──────────────────────────────────────────

function handleIniField(el) {
  const ini   = findById(data.initiatives, currentId);
  const field = el.dataset.dpField;
  if (!ini || !field) return;

  if (field === 'team') {
    ini.team = el.value ? +el.value : null;
  } else if (WSJF_FIELDS.includes(field)) {
    ini[field] = el.value ? parseInt(el.value, 10) : null;
    ini.wsjf   = calcWsjf(ini);

    const scoreEl = document.getElementById('dp-wsjf-score');
    if (scoreEl) {
      scoreEl.textContent = ini.wsjf != null ? ini.wsjf : '–';
      scoreEl.className   = `dp-wsjf-score ${wsjfScoreClass(ini.wsjf)}`;
    }
    const badgeEl = document.getElementById('dp-wsjf-badge');
    if (badgeEl) badgeEl.textContent = `WSJF ${ini.wsjf != null ? ini.wsjf : '–'}`;
  } else {
    ini[field] = el.value;
  }

  if (field === 'status' || field === 'projektstatus') {
    renderHeaderBadges(ini);
  }

  dSave();
}

function handleRiskField(el) {
  const riskId = el.dataset.riskId ? +el.dataset.riskId : null;
  const field  = el.dataset.riskField;
  if (!riskId || !field) return;

  const risk = findById(data.risks, riskId);
  if (!risk) return;

  if (field === 'eintrittswahrscheinlichkeit' || field === 'schadensausmass') {
    risk[field] = parseInt(el.value, 10);
    refreshRisks();
  } else if (field === 'roamStatus') {
    risk.roamStatus = el.value || null;
    refreshRisks();
  } else {
    risk[field] = el.value;
    if (field === 'roamNotiz') autoGrow(el);
  }
  dSave();
}

function handleDetailInput(e) {
  const el = e.target;

  if (el === dom.dpName) {
    const ini = findById(data.initiatives, currentId);
    if (ini) { ini.name = el.value; dSave(); }
    return;
  }

  if (el.dataset.riskField) {
    handleRiskField(el);
    return;
  }

  if (el.dataset.dpField) {
    handleIniField(el);
  }
}

// ─── Event Binding ───────────────────────────────────────────

export function bindDetailEvents() {
  dom.dpBack.addEventListener('click', closeDetail);
  dom.dpRiskAdd.addEventListener('click', addRisk);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.detailPage.hidden) closeDetail();
  });

  dom.detailPage.addEventListener('input',  handleDetailInput);
  dom.detailPage.addEventListener('change', handleDetailInput);

  dom.detailPage.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action="removeRisk"]');
    if (target) removeRisk(+target.dataset.riskId);
  });
}
