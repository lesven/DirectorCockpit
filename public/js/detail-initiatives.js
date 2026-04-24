/**
 * detail-initiatives.js
 * Verantwortlich für: Stammdaten-Render, WSJF-Render, Header-Badges,
 * Initiative-Input-Handling auf der Detail-Page.
 */
import { data, saveEntity } from './store.js';
import { findById, esc, calcWsjf, isCurrentlyBlocked } from './utils.js';
import {
  WSJF_SCALE,
  WSJF_FIELDS,
  STATUS_LABELS,
  STATUS_CSS_MAP,
  STATUS_OPTIONS,
} from './config.js';
import { dom } from './dom.js';

// ─── Select HTML Helpers (lokal benötigt) ───────────────────

export function wsjfSelectHtml(selected) {
  const none = `<option value=""${selected == null ? ' selected' : ''}>–</option>`;
  const opts = WSJF_SCALE
    .map((v) => `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`)
    .join('');
  return none + opts;
}

export function selectHtml(options, selected) {
  return options
    .map((o) => `<option value="${o.value}"${o.value === selected ? ' selected' : ''}>${esc(o.label)}</option>`)
    .join('');
}

export function teamSelectHtml(selectedId) {
  const none = `<option value=""${!selectedId ? ' selected' : ''}>— Kein Team —</option>`;
  const opts = data.teams
    .map((t) => `<option value="${t.id}"${t.id === selectedId ? ' selected' : ''}>${esc(t.name)}</option>`)
    .join('');
  return none + opts;
}

export function kundeSelectHtml(selectedId) {
  const none = `<option value=""${!selectedId ? ' selected' : ''}>— Kein Kunde —</option>`;
  const opts = (data.kunden || [])
    .map((k) => `<option value="${k.id}"${k.id === selectedId ? ' selected' : ''}>${esc(k.name)}</option>`)
    .join('');
  return none + opts;
}

// ─── WSJF Score Display ─────────────────────────────────────

export function wsjfScoreClass(score) {
  if (score == null) return 'dp-wsjf-score-empty';
  if (score >= 8)    return 'dp-wsjf-score-high';
  if (score >= 3)    return 'dp-wsjf-score-medium';
  return 'dp-wsjf-score-low';
}

// ─── Render: Header Badges ───────────────────────────────────

export function renderHeaderBadges(ini) {
  const statusCss   = STATUS_CSS_MAP[ini.status]   || 'pill-grey';
  const statusLabel = STATUS_LABELS[ini.status] || ini.status || '—';
  const psCss       = ini.projektstatus === 'kritisch' ? 'pill-red'   : 'pill-green';
  const psLabel     = ini.projektstatus === 'kritisch' ? 'Kritisch'   : 'Alles gut';
  const wsjfVal     = ini.wsjf != null ? ini.wsjf : '–';

  dom.dpHeaderBadges.innerHTML = `
    <span class="status-pill ${statusCss}" id="dp-status-badge"><span class="pill-dot"></span>${statusLabel}</span>
    <span class="status-pill ${psCss}" id="dp-ps-badge"><span class="pill-dot"></span>${psLabel}</span>
    <span class="dp-wsjf-header-badge" id="dp-wsjf-badge">WSJF ${wsjfVal}</span>
  `;
}

// ─── Render: Stammdaten ──────────────────────────────────────

const PROJEKTSTATUS_OPTIONS = [
  { value: 'ok',       label: 'Alles gut' },
  { value: 'kritisch', label: 'Kritisch' },
];

export function renderStammdaten(ini) {
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
        <label class="detail-label" for="dp-kunde">Kunde</label>
        <div class="detail-select-wrap">
          <select class="detail-input" id="dp-kunde" data-dp-field="customer">
            ${kundeSelectHtml(ini.customer)}
          </select>
        </div>
      </div>
    </div>
    <div class="detail-row">
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

// ─── Render: WSJF ───────────────────────────────────────────

export function renderWsjf(ini) {
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

// ─── Input-Handler für Initiative-Felder ────────────────────

export function handleIniField(el, currentId) {
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

  saveEntity('initiatives', currentId);
}

// ─── blockedBy: Blocker hinzufügen / entfernen ──────────────

export function addBlocker(ini, blockerId) {
  if (!Array.isArray(ini.blockedBy)) ini.blockedBy = [];
  if (!ini.blockedBy.includes(blockerId)) {
    ini.blockedBy = [...ini.blockedBy, blockerId];
    saveEntity('initiatives', ini.id);
    renderBlockedBy(ini);
  }
}

export function removeBlocker(ini, blockerId) {
  if (!Array.isArray(ini.blockedBy)) return;
  ini.blockedBy = ini.blockedBy.filter((id) => id !== blockerId);
  saveEntity('initiatives', ini.id);
  renderBlockedBy(ini);
}

// ─── Render: Abhängigkeiten (blockedBy) ─────────────────────

export function renderBlockedBy(ini) {
  if (!dom.dpBlockedBy) return;

  const blockedBySet = new Set(Array.isArray(ini.blockedBy) ? ini.blockedBy : []);
  const existingIds  = new Set(data.initiatives.map((i) => i.id));

  // Chips für aktuell gesetzte Blocker
  const chipsHtml = [...blockedBySet].map((id) => {
    const blocker = data.initiatives.find((i) => i.id === id);
    const label   = blocker ? esc(blocker.name || `(ID: ${id})`) : `(gelöscht, ID: ${id})`;
    const isGone  = !existingIds.has(id);
    return `<span class="bb-chip${isGone ? ' bb-chip-gone' : ''}" data-blocker-id="${id}">
      ${label}
      <button class="bb-chip-remove" data-action="removeBlocker" data-blocker-id="${id}" title="Entfernen" aria-label="Blocker entfernen">×</button>
    </span>`;
  }).join('');

  // Outgoing-Ansicht (read-only)
  const activeOutgoing = data.initiatives.filter(
    (i) => i.id !== ini.id && Array.isArray(i.blockedBy) && i.blockedBy.includes(ini.id) && isCurrentlyBlocked(i, data.initiatives)
  );
  const outgoingHtml = activeOutgoing.length > 0
    ? activeOutgoing.map((i) => `<span class="blocked-outgoing-item">${esc(i.name || `(ID: ${i.id})`)}</span>`).join('')
    : '<span class="blocked-outgoing-empty">–</span>';

  dom.dpBlockedBy.innerHTML = `
    <div class="detail-field">
      <label class="detail-label" for="dp-blocker-search">Blockiert durch</label>
      <div class="bb-widget">
        <div class="bb-chips" id="bb-chips">${chipsHtml || '<span class="bb-chips-empty">Keine Blocker</span>'}</div>
        <div class="bb-input-wrap">
          <input class="detail-input bb-search-input" id="dp-blocker-search"
                 type="text" placeholder="Initiative suchen…" autocomplete="off"
                 data-ini-id="${ini.id}">
          <ul class="bb-suggestions" id="bb-suggestions" hidden></ul>
        </div>
      </div>
    </div>
    <div class="detail-field">
      <label class="detail-label">Diese Initiative blockiert</label>
      <div class="blocked-outgoing-list">${outgoingHtml}</div>
    </div>
  `;
}

// ─── Find-as-you-type Logik ──────────────────────────────────

export function handleBlockerSearch(input) {
  const iniId       = +input.dataset.iniId;
  const ini         = findById(data.initiatives, iniId);
  if (!ini) return;

  const query       = input.value.trim().toLowerCase();
  const blockedBySet = new Set(Array.isArray(ini.blockedBy) ? ini.blockedBy : []);
  const suggestEl   = document.getElementById('bb-suggestions');
  if (!suggestEl) return;

  if (!query) {
    suggestEl.hidden = true;
    suggestEl.innerHTML = '';
    return;
  }

  const matches = data.initiatives
    .filter((i) => i.id !== iniId && !blockedBySet.has(i.id) && (i.name || '').toLowerCase().includes(query))
    .slice(0, 8);

  if (!matches.length) {
    suggestEl.hidden = true;
    suggestEl.innerHTML = '';
    return;
  }

  suggestEl.innerHTML = matches.map((i) =>
    `<li class="bb-suggestion-item" data-action="addBlocker" data-blocker-id="${i.id}" data-ini-id="${iniId}">${esc(i.name)}</li>`
  ).join('');
  suggestEl.hidden = false;
}

