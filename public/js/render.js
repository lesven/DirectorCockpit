import { STATUS_LABELS } from './config.js';
import { data } from './store.js';
import { getSortedInis, sortState, filterState } from './sort.js';
import { esc, calcWsjf } from './utils.js';

function statusClass(s) {
  return 'status-' + (s || 'grey');
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export { autoGrow };

function renderKW() {
  const el = document.getElementById('kw-badge');
  el.textContent = data.kw ? 'KW ' + data.kw : 'KW \u2014';
}

function populateTeamFilter() {
  const sel = document.getElementById('filter-team');
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

function renderTeams() {
  populateTeamFilter();
  const grid = document.getElementById('teams-grid');
  grid.innerHTML = '';
  data.teams.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.innerHTML = `
      <div class="team-card-top">
        <div class="status-dot ${statusClass(t.status)}" title="Status wechseln: ${STATUS_LABELS[t.status] || t.status}" data-action="cycleStatus" data-id="${t.id}" data-team="true"></div>
        <input class="team-name" value="${esc(t.name)}" placeholder="Teamname" data-id="${t.id}" data-field="name" data-source="teams">
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-action="removeEntity" data-type="teams" data-id="${t.id}" title="Löschen">✕</button>
      </div>
      <div class="field-row">
        <div class="field-label">Thema</div>
        <input class="field-input" value="${esc(t.sub)}" placeholder="Kurzbeschreibung" data-id="${t.id}" data-field="sub" data-source="teams">
      </div>
      <div class="field-row">
        <div class="field-label">Aktueller Fokus</div>
        <textarea class="field-input" rows="2" placeholder="Was läuft gerade?" data-id="${t.id}" data-field="fokus" data-source="teams">${esc(t.fokus)}</textarea>
      </div>
      <div class="field-row">
        <div class="field-label">Mein nächster Schritt</div>
        <input class="field-input" value="${esc(t.schritt)}" placeholder="Was muss ich tun?" data-id="${t.id}" data-field="schritt" data-source="teams">
      </div>
    `;
    grid.appendChild(card);
  });
}

function teamOptions(selectedId) {
  const none = `<option value=""${!selectedId ? ' selected' : ''}>—</option>`;
  const opts = data.teams
    .map((t) => `<option value="${t.id}"${t.id === selectedId ? ' selected' : ''}>${esc(t.name)}</option>`)
    .join('');
  return none + opts;
}

function updateSortHeaders() {
  document.querySelectorAll('.ini-table th.sortable').forEach((th) => {
    th.classList.remove('sort-asc', 'sort-desc');
    const field = th.dataset.sort;
    if (field === sortState.field) {
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function renderInis() {
  const tbody = document.getElementById('ini-body');
  tbody.innerHTML = '';
  updateSortHeaders();

  // teamOptions einmal vorberechnen statt O(initiatives × teams)-mal aufzurufen.
  // selected-Wert wird per select.value nach DOM-Einfügung gesetzt.
  const teamOptsBase =
    '<option value="">—</option>' + data.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');

  getSortedInis().forEach((ini) => {
    const s = ini.status || 'grey';
    const ps = ini.projektstatus || 'ok';
    const tr = document.createElement('tr');
    tr.className = 'ini-row';
    tr.innerHTML = `
      <td><input class="ini-cell ini-name" value="${esc(ini.name)}" placeholder="Projektname" data-id="${ini.id}" data-field="name" data-source="initiatives"></td>
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
      <td><span class="wsjf-value${calcWsjf(ini) == null ? ' wsjf-empty' : ''}">${calcWsjf(ini) != null ? calcWsjf(ini) : '\u2013'}</span></td>
      <td><input class="ini-cell" value="${esc(ini.schritt)}" placeholder="Nächster Schritt" data-id="${ini.id}" data-field="schritt" data-source="initiatives"></td>
      <td><input class="ini-cell" value="${esc(ini.frist)}" placeholder="TT.MM" data-id="${ini.id}" data-field="frist" data-source="initiatives"></td>
      <td><textarea class="ini-cell ini-notiz" placeholder="Notiz" data-id="${ini.id}" data-field="notiz" data-source="initiatives" rows="1">${esc(ini.notiz)}</textarea></td>
      <td>
        <button class="detail-btn" data-action="openDetail" data-id="${ini.id}" title="Details">✎</button>
        <button class="del-row-btn" data-action="removeEntity" data-type="initiatives" data-id="${ini.id}" title="Löschen">✕</button>
      </td>
    `;
    // team-Select auf den richtigen Wert stellen (vermeidet selected-Duplikate im Template)
    tr.querySelector('[data-field="team"]').value = ini.team ?? '';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.ini-notiz').forEach(autoGrow);
}

function renderNVs() {
  const grid = document.getElementById('nv-grid');
  grid.innerHTML = '';
  data.nicht_vergessen.forEach((nv) => {
    const card = document.createElement('div');
    card.className = 'nv-card';
    card.innerHTML = `
      <div class="card-actions">
        <button class="icon-btn" data-action="removeEntity" data-type="nicht_vergessen" data-id="${nv.id}" title="L\u00f6schen">✕</button>
      </div>
      <input class="nv-title" value="${esc(nv.title)}" placeholder="Thema" data-id="${nv.id}" data-field="title" data-source="nicht_vergessen">
      <textarea class="nv-body" rows="3" placeholder="Warum wichtig / n\u00e4chste Aktion..." data-id="${nv.id}" data-field="body" data-source="nicht_vergessen">${esc(nv.body)}</textarea>
    `;
    grid.appendChild(card);
  });
}

const RENDER_MAP = {
  teams: renderTeams,
  initiatives: renderInis,
  nicht_vergessen: renderNVs,
};

export function renderEntity(type) {
  RENDER_MAP[type]?.();
}

export function renderAll() {
  renderKW();
  renderTeams();
  renderInis();
  renderNVs();
}
