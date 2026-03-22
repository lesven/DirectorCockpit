import { data, dSave } from './store.js';
import { findById, esc } from './utils.js';
import { renderEntity, autoGrow } from './render.js';
import { WSJF_SCALE } from './config.js';

const STATUS_OPTIONS = [
  { value: 'fertig', label: 'Fertig' },
  { value: 'yellow', label: 'In Arbeit' },
  { value: 'grey', label: 'Geplant' },
  { value: 'ungeplant', label: 'Ungeplant' },
];

const PROJEKTSTATUS_OPTIONS = [
  { value: 'ok', label: 'Alles gut' },
  { value: 'kritisch', label: 'Kritisch' },
];

function wsjfSelectHtml(selected) {
  const none = `<option value=""${selected == null ? ' selected' : ''}>–</option>`;
  const opts = WSJF_SCALE.map((v) => `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`).join('');
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

let currentId = null;
const backdrop = () => document.getElementById('detail-backdrop');
const body = () => document.getElementById('detail-body');

export function openDetail(id) {
  const ini = findById(data.initiatives, id);
  if (!ini) return;

  currentId = id;

  body().innerHTML = `
    <div class="detail-field">
      <label class="detail-label" for="d-name">Initiative / Projekt</label>
      <input class="detail-input" id="d-name" data-field="name" value="${esc(ini.name)}" placeholder="Projektname">
    </div>
    <div class="detail-row">
      <div class="detail-field">
        <label class="detail-label" for="d-team">Team</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-team" data-field="team">
            ${teamSelectHtml(ini.team)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="d-frist">Frist</label>
        <input class="detail-input" id="d-frist" data-field="frist" value="${esc(ini.frist)}" placeholder="TT.MM">
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-field">
        <label class="detail-label" for="d-status">Status</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-status" data-field="status">
            ${selectHtml(STATUS_OPTIONS, ini.status)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="d-projektstatus">Projektstatus</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-projektstatus" data-field="projektstatus">
            ${selectHtml(PROJEKTSTATUS_OPTIONS, ini.projektstatus)}
          </select>
        </div>
      </div>
    </div>
    <div class="detail-field">
      <label class="detail-label" for="d-schritt">Nächster Schritt</label>
      <input class="detail-input" id="d-schritt" data-field="schritt" value="${esc(ini.schritt)}" placeholder="Was muss als nächstes passieren?">
    </div>
    <div class="detail-field">
      <label class="detail-label" for="d-notiz">Notiz</label>
      <textarea class="detail-input" id="d-notiz" data-field="notiz" rows="4" placeholder="Weitere Hinweise…">${esc(ini.notiz)}</textarea>
    </div>
    <div class="detail-divider"></div>
    <div class="detail-field">
      <span class="detail-section-title">WSJF-Bewertung</span>
    </div>
    <div class="detail-row">
      <div class="detail-field">
        <label class="detail-label" for="d-businessValue">Business Value</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-businessValue" data-field="businessValue">
            ${wsjfSelectHtml(ini.businessValue)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="d-timeCriticality">Time Criticality</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-timeCriticality" data-field="timeCriticality">
            ${wsjfSelectHtml(ini.timeCriticality)}
          </select>
        </div>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-field">
        <label class="detail-label" for="d-riskReduction">Risk Reduction / Opportunity</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-riskReduction" data-field="riskReduction">
            ${wsjfSelectHtml(ini.riskReduction)}
          </select>
        </div>
      </div>
      <div class="detail-field">
        <label class="detail-label" for="d-jobSize">Job Size</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="d-jobSize" data-field="jobSize">
            ${wsjfSelectHtml(ini.jobSize)}
          </select>
        </div>
      </div>
    </div>
  `;

  backdrop().hidden = false;
  document.getElementById('d-name').focus();
}

export function closeDetail() {
  if (currentId === null) return;
  backdrop().hidden = true;
  renderEntity('initiatives');
  currentId = null;
}

function handleDetailInput(e) {
  const el = e.target;
  if (!el.dataset.field || !el.closest('#detail-body')) return;

  const ini = findById(data.initiatives, currentId);
  if (!ini) return;

  const WSJF_FIELDS = ['businessValue', 'timeCriticality', 'riskReduction', 'jobSize'];

  const field = el.dataset.field;
  if (field === 'team') {
    ini.team = el.value ? +el.value : null;
  } else if (WSJF_FIELDS.includes(field)) {
    ini[field] = el.value ? parseInt(el.value, 10) : null;
  } else {
    ini[field] = el.value;
  }
  dSave();
}

export function bindDetailEvents() {
  const bd = backdrop();

  // Close on backdrop click
  bd.addEventListener('click', (e) => {
    if (e.target === bd) closeDetail();
  });

  // Close button
  document.getElementById('detail-close').addEventListener('click', closeDetail);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !bd.hidden) closeDetail();
  });

  // Input & change events inside modal
  bd.addEventListener('input', handleDetailInput);
  bd.addEventListener('change', handleDetailInput);
}
