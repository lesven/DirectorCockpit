import { STATUS_LABELS } from './config.js';
import { data } from './store.js';
import { getSortedInis, sortState, filterState, getPaginatedInis, pageState } from './sort.js';
import { esc, calculateTeamStats, formatTeamStats, maxRiskScore, getRiskLevel, getOverdueMilestones, isCurrentlyBlocked } from './utils.js';
import { dom } from './dom.js';

function statusClass(s) {
  return 'status-' + (s || 'grey');
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export { autoGrow };

function renderKW() {
  dom.kwBadge.textContent = data.kw ? 'KW ' + data.kw : 'KW \u2014';
}

function populateTeamFilter() {
  const sel = dom.filterTeam;
  if (!sel) return;
  const currentVal = sel.value || filterState.team;
  while (sel.options.length > 1) sel.remove(1);
  data.teams.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
  sel.value = currentVal;
  filterState.team = sel.value; // sync if previously-filtered team was deleted
}

function populateKundeFilter() {
  const sel = dom.filterKunde;
  if (!sel) return;
  const currentVal = sel.value || filterState.kunde;
  while (sel.options.length > 1) sel.remove(1);
  (data.kunden || []).forEach((k) => {
    const opt = document.createElement('option');
    opt.value = String(k.id);
    opt.textContent = k.name;
    sel.appendChild(opt);
  });
  sel.value = currentVal;
  filterState.kunde = sel.value; // sync if previously-filtered kunde was deleted
}

function renderTeamCard(t) {
  const card = document.createElement('div');
  card.className = 'team-card';
  const stats = calculateTeamStats(t.id, data.initiatives);
  const statsStr = formatTeamStats(stats);
  card.innerHTML = `
      <div class="team-card-top">
        <div class="status-dot ${statusClass(t.status)}" title="Status wechseln: ${STATUS_LABELS[t.status] || t.status}" data-action="cycleStatus" data-id="${t.id}" data-team="true"></div>
        <input class="team-name" value="${esc(t.name)}" placeholder="Teamname" data-id="${t.id}" data-field="name" data-source="teams">
      </div>
      <div class="card-actions">
        <button class="icon-btn team-detail-btn" data-action="openTeamDetail" data-id="${t.id}" title="Team-Details &amp; Freigaben">↗</button>
        <span class="card-actions-sep"></span>
        <button class="icon-btn" data-action="removeEntity" data-type="teams" data-id="${t.id}" title="Löschen">✕</button>
      </div>
      <div class="field-row">
        <div class="field-label">Aktueller Fokus</div>
        <textarea class="field-input" rows="2" placeholder="Was läuft gerade?" data-id="${t.id}" data-field="fokus" data-source="teams">${esc(t.fokus)}</textarea>
      </div>
      <div class="field-row">
        <div class="field-label">Mein nächster Schritt</div>
        <input class="field-input" value="${esc(t.schritt)}" placeholder="Was muss ich tun?" data-id="${t.id}" data-field="schritt" data-source="teams">
      </div>
      <div class="team-stats-badge">${statsStr}</div>
    `;
  return card;
}

function renderTeams() {
  populateTeamFilter();
  populateKundeFilter();
  teamOptsCacheKey = ''; // Cache invalidieren, Teams haben sich ggf. geändert
  kundeOptsCacheKey = ''; // Cache invalidieren, Kunden haben sich ggf. geändert
  dom.teamsGrid.innerHTML = '';
  data.teams.forEach((t) => dom.teamsGrid.appendChild(renderTeamCard(t)));
  dom.teamsCount.textContent = data.teams.length || '';
}

function updateSortHeaders() {
  dom.sortableHeaders.forEach((th) => {
    th.classList.remove('sort-asc', 'sort-desc');
    const field = th.dataset.sort;
    if (field === sortState.field) {
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function renderIniRow(ini, teamOptsBase, kundeOptsBase) {
  const s = ini.status || 'grey';
  const ps = ini.projektstatus || 'ok';
  const wsjf = ini.wsjf;
  const riskCount = data.risks ? data.risks.filter((r) => r.initiative === ini.id).length : 0;
  const topScore = maxRiskScore(data.risks || [], ini.id);
  const riskLevel = topScore ? getRiskLevel(topScore) : null;
  const riskBadgeHtml = riskLevel
    ? `<span class="risk-badge-mini ${riskLevel.css}">${riskCount}</span>`
    : (riskCount ? `<span class="risk-badge-mini">${riskCount}</span>` : '');
  const blockedBadgeHtml = isCurrentlyBlocked(ini, data.initiatives)
    ? `<span class="ini-blocked-badge" title="Blockiert durch andere Initiative">🚧</span>`
    : '';
  const tr = document.createElement('tr');
  tr.className = 'ini-row';
  tr.innerHTML = `
      <td>
        <div class="ini-name-wrap">
          <button class="detail-btn ini-name-detail-btn" data-action="openDetail" data-id="${ini.id}" title="Details öffnen" aria-label="Initiative-Details öffnen">↗</button>
          <textarea class="ini-cell ini-name" placeholder="Projektname" data-id="${ini.id}" data-field="name" data-source="initiatives">${esc(ini.name)}</textarea>
          ${blockedBadgeHtml}
        </div>
      </td>
      <td>
        <div class="select-wrap">
          <select class="ini-select" data-id="${ini.id}" data-field="customer" data-source="initiatives">
            ${kundeOptsBase}
          </select>
        </div>
      </td>
      <td>
        <div class="select-wrap">
          <select class="ini-select" data-id="${ini.id}" data-field="team" data-source="initiatives">
            ${teamOptsBase}
          </select>
        </div>
      </td>
      <td>
        <div class="status-select-wrap s-${s}">
          <select class="status-select s-${s}" data-id="${ini.id}" data-field="status" data-source="initiatives">
            <option value="fertig"${s === 'fertig' ? ' selected' : ''}>Fertig</option>
            <option value="yellow"${s === 'yellow' ? ' selected' : ''}>In Arbeit</option>
            <option value="grey"${s === 'grey' ? ' selected' : ''}>Geplant</option>
            <option value="ungeplant"${s === 'ungeplant' ? ' selected' : ''}>Ungeplant</option>
          </select>
        </div>
      </td>
      <td>
        <div class="status-select-wrap ps-${ps}">
          <select class="status-select ps-select ps-${ps}" data-id="${ini.id}" data-field="projektstatus" data-source="initiatives">
            <option value="ok"${ps === 'ok' ? ' selected' : ''}>Alles gut</option>
            <option value="kritisch"${ps === 'kritisch' ? ' selected' : ''}>Kritisch</option>
          </select>
        </div>
      </td>
      <td><span class="wsjf-value${wsjf == null ? ' wsjf-empty' : ''}">${wsjf != null ? wsjf : '\u2013'}</span></td>
      <td><textarea class="ini-cell ini-schritt" rows="1" maxlength="550" placeholder="Nächster Schritt" data-id="${ini.id}" data-field="schritt" data-source="initiatives">${esc(ini.schritt)}</textarea></td>
      <td><input type="date" class="ini-cell ini-frist-date" value="${esc(ini.frist ?? '')}" data-id="${ini.id}" data-field="frist" data-source="initiatives"></td>
      <td><textarea class="ini-cell ini-notiz" placeholder="Notiz" data-id="${ini.id}" data-field="notiz" data-source="initiatives" rows="1">${esc(ini.notiz)}</textarea></td>
      <td>
        <button class="risk-btn" data-action="openDetail" data-id="${ini.id}" title="Risiken">🛡${riskBadgeHtml}</button>
        <button class="del-row-btn" data-action="removeEntity" data-type="initiatives" data-id="${ini.id}" title="Löschen">✕</button>
      </td>
    `;
  tr.querySelector('[data-field="customer"]').value = ini.customer ?? '';
  tr.querySelector('[data-field="team"]').value = ini.team ?? '';
  return tr;
}

function renderPagination(total, page, pageSize, totalPages) {
  const el = dom.iniPagination;
  el.innerHTML = '';
  if (total <= pageSize) return;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const info = document.createElement('span');
  info.className = 'pagination-info';
  info.textContent = `${start}\u2013${end} von ${total}`;
  el.appendChild(info);

  const nav = document.createElement('div');
  nav.className = 'pagination-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '\u2039';
  prevBtn.disabled = page === 1;
  prevBtn.dataset.action = 'gotoPage';
  prevBtn.dataset.page = String(page - 1);
  nav.appendChild(prevBtn);

  const delta = 2;
  let pStart = Math.max(1, page - delta);
  let pEnd = Math.min(totalPages, page + delta);
  if (pEnd - pStart < 4) {
    if (pStart === 1) pEnd = Math.min(totalPages, pStart + 4);
    else pStart = Math.max(1, pEnd - 4);
  }

  if (pStart > 1) {
    const first = document.createElement('button');
    first.className = 'pagination-btn';
    first.textContent = '1';
    first.dataset.action = 'gotoPage';
    first.dataset.page = '1';
    nav.appendChild(first);
    if (pStart > 2) {
      const dots = document.createElement('span');
      dots.className = 'pagination-dots';
      dots.textContent = '\u2026';
      nav.appendChild(dots);
    }
  }

  for (let p = pStart; p <= pEnd; p++) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (p === page ? ' active' : '');
    btn.textContent = String(p);
    btn.dataset.action = 'gotoPage';
    btn.dataset.page = String(p);
    nav.appendChild(btn);
  }

  if (pEnd < totalPages) {
    if (pEnd < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = 'pagination-dots';
      dots.textContent = '\u2026';
      nav.appendChild(dots);
    }
    const last = document.createElement('button');
    last.className = 'pagination-btn';
    last.textContent = String(totalPages);
    last.dataset.action = 'gotoPage';
    last.dataset.page = String(totalPages);
    nav.appendChild(last);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = '\u203a';
  nextBtn.disabled = page === totalPages;
  nextBtn.dataset.action = 'gotoPage';
  nextBtn.dataset.page = String(page + 1);
  nav.appendChild(nextBtn);

  el.appendChild(nav);
}

let teamOptsCache = null;
let teamOptsCacheKey = '';
let kundeOptsCache = null;
let kundeOptsCacheKey = '';

function getTeamOptsBase() {
  const key = data.teams.map((t) => `${t.id}:${t.name}`).join('|');
  if (key !== teamOptsCacheKey) {
    teamOptsCacheKey = key;
    teamOptsCache =
      '<option value="">\u2014</option>' +
      data.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  }
  return teamOptsCache;
}

function getKundeOptsBase() {
  const kunden = data.kunden || [];
  const key = kunden.map((k) => `${k.id}:${k.name}`).join('|');
  if (key !== kundeOptsCacheKey) {
    kundeOptsCacheKey = key;
    kundeOptsCache =
      '<option value="">\u2014</option>' +
      kunden.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  }
  return kundeOptsCache;
}

function renderInis() {
  dom.iniBody.innerHTML = '';
  updateSortHeaders();
  populateKundeFilter();

  const teamOptsBase  = getTeamOptsBase();
  const kundeOptsBase = getKundeOptsBase();

  const { items, total, page, pageSize, totalPages } = getPaginatedInis();
  items.forEach((ini) => dom.iniBody.appendChild(renderIniRow(ini, teamOptsBase, kundeOptsBase)));
  dom.iniBody.querySelectorAll('.ini-notiz, .ini-schritt').forEach(autoGrow);
  renderPagination(total, page, pageSize, totalPages);
  dom.inisCount.textContent = total || '';
}

function renderNVCard(nv) {
  const card = document.createElement('div');
  card.className = 'nv-card';
  card.innerHTML = `
      <div class="card-actions">
        <button class="icon-btn" data-action="removeEntity" data-type="nicht_vergessen" data-id="${nv.id}" title="L\u00f6schen">✕</button>
      </div>
      <input class="nv-title" value="${esc(nv.title)}" placeholder="Thema" data-id="${nv.id}" data-field="title" data-source="nicht_vergessen">
      <textarea class="nv-body" rows="3" placeholder="Warum wichtig / n\u00e4chste Aktion..." data-id="${nv.id}" data-field="body" data-source="nicht_vergessen">${esc(nv.body)}</textarea>
    `;
  return card;
}

function renderNVs() {
  dom.nvGrid.innerHTML = '';
  data.nicht_vergessen.forEach((nv) => dom.nvGrid.appendChild(renderNVCard(nv)));
  dom.nvCount.textContent = data.nicht_vergessen.length || '';
}

function renderOverdueMilestones() {
  const section = dom.overdueMilestonesSection;
  const tbody = dom.overdueMilestonesBody;
  const countBadge = dom.overdueMilestonesCount;
  if (!section || !tbody) return;

  const entries = getOverdueMilestones(data.milestones || [], data.initiatives || []);

  tbody.innerHTML = '';
  if (entries.length === 0) {
    section.hidden = true;
    return;
  }

  entries.forEach(({ milestone, initiative }) => {
    const tr = document.createElement('tr');
    tr.className = 'overdue-row';
    tr.innerHTML = `
      <td class="overdue-aufgabe">${esc(milestone.aufgabe)}</td>
      <td class="overdue-frist">${esc(milestone.frist)}</td>
      <td class="overdue-ini">
        <button class="overdue-ini-btn" data-action="openDetail" data-id="${initiative.id}">${esc(initiative.name)}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (countBadge) countBadge.textContent = entries.length;
  section.hidden = false;
}

const RENDER_MAP = {
  teams: renderTeams,
  kunden: renderInis,
  initiatives: renderInis,
  nicht_vergessen: renderNVs,
};

export function renderEntity(type) {
  RENDER_MAP[type]?.();
}

export function renderAll() {
  renderKW();
  renderTeams();
  renderOverdueMilestones();
  renderInis();
  renderNVs();
}
