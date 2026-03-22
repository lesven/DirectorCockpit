import { data, dSave } from './store.js';
import { findById } from './crud.js';
import { renderEntity, autoGrow } from './render.js';

const STATUS_OPTIONS = [
  { value: 'fertig',    label: 'Fertig' },
  { value: 'yellow',    label: 'In Arbeit' },
  { value: 'grey',      label: 'Geplant' },
  { value: 'ungeplant', label: 'Ungeplant' },
];

const PROJEKTSTATUS_OPTIONS = [
  { value: 'ok',       label: 'Alles gut' },
  { value: 'kritisch', label: 'Kritisch' },
];

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function selectHtml(options, selected) {
  return options.map(o =>
    `<option value="${o.value}"${o.value === selected ? ' selected' : ''}>${esc(o.label)}</option>`
  ).join('');
}

function teamSelectHtml(selectedId) {
  const none = `<option value=""${!selectedId ? ' selected' : ''}>— Kein Team —</option>`;
  const opts = data.teams.map(t =>
    `<option value="${t.id}"${t.id === selectedId ? ' selected' : ''}>${esc(t.name)}</option>`
  ).join('');
  return none + opts;
}

let currentId = null;
const backdrop = () => document.getElementById('detail-backdrop');
const body     = () => document.getElementById('detail-body');

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

  const field = el.dataset.field;
  if (field === 'team') {
    ini.team = el.value ? +el.value : null;
  } else {
    ini[field] = el.value;
  }
  dSave();
}

export function bindDetailEvents() {
  const bd = backdrop();

  // Close on backdrop click
  bd.addEventListener('click', e => {
    if (e.target === bd) closeDetail();
  });

  // Close button
  document.getElementById('detail-close').addEventListener('click', closeDetail);

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !bd.hidden) closeDetail();
  });

  // Input & change events inside modal
  bd.addEventListener('input', handleDetailInput);
  bd.addEventListener('change', handleDetailInput);
}
