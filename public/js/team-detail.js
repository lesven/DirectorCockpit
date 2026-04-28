/**
 * team-detail.js
 * Team-Detailseite: Stammdaten bearbeiten + User-Sharing verwalten.
 * Route: #team/{id}
 */

import { CONFIG } from './config.js';
import { dom } from './dom.js';
import { data } from './store.js';
import { esc, debounce, findById } from './utils.js';
import { setHash, clearHash } from './routing.js';

/** Aktuell geöffnete Team-ID */
let currentTeamId = null;

/** Ob der aktuelle User Sharing verwalten darf */
let currentIsOwner = false;

/** Gecachte Shares für das aktuell angezeigte Team */
let currentShares = [];

let indicatorTimer;

// ─── Indicator ───────────────────────────────────────────────────────────────

function showIndicator(text, isError = false) {
  const el = document.getElementById('tdp-save-ind');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(indicatorTimer);
  indicatorTimer = setTimeout(() => el.classList.remove('show'), isError ? 3000 : 1400);
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

/**
 * Öffnet die Team-Detailseite für das gegebene Team.
 * @param {number} teamId
 * @param {{ pushState?: boolean }} opts
 */
export async function openTeamDetail(teamId, { pushState = true } = {}) {
  currentTeamId = teamId;
  if (pushState) setHash('team', teamId);

  dom.header.hidden = true;
  dom.main.hidden = true;
  dom.footer.hidden = true;
  dom.detailPage.hidden = true;
  dom.teamDetailPage.hidden = false;

  await _loadAndRender(teamId);
}

/**
 * Schließt die Team-Detailseite und kehrt zum Cockpit zurück.
 * @param {{ pushState?: boolean }} opts
 */
export function closeTeamDetail({ pushState = true } = {}) {
  if (pushState) clearHash();

  dom.teamDetailPage.hidden = true;
  dom.header.hidden = false;
  dom.main.hidden = false;
  dom.footer.hidden = false;

  currentTeamId = null;
  currentIsOwner = false;
  currentShares = [];
}

// ─── Load & Render ────────────────────────────────────────────────────────────

async function _loadAndRender(teamId) {
  try {
    const res = await fetch(`${CONFIG.ENTITY_URLS.teams}/${teamId}`, { credentials: 'same-origin' });
    if (res.status === 401) { window.location.href = CONFIG.LOGIN_PAGE; return; }
    if (!res.ok) {
      showIndicator('Fehler beim Laden!', true);
      return;
    }
    const { team, shares, isOwner } = await res.json();
    currentIsOwner = isOwner;
    currentShares = shares;

    _renderName(team);
    _renderStammdaten(team);
    _renderShares(shares, isOwner);
    _bindNameInput(team);
  } catch {
    showIndicator('Netzwerkfehler!', true);
  }
}

function _renderName(team) {
  if (dom.tdpName) {
    dom.tdpName.value = team.name || '';
    dom.tdpName.dataset.teamId = String(team.id);
  }
}

function _renderStammdaten(team) {
  if (!dom.tdpStammdaten) return;

  const statusOptions = ['fertig', 'yellow', 'grey', 'ungeplant']
    .map((v) => `<option value="${esc(v)}" ${team.status === v ? 'selected' : ''}>${esc(_statusLabel(v))}</option>`)
    .join('');

  dom.tdpStammdaten.innerHTML = `
    <label class="dp-label">Status
      <select class="dp-select" data-field="status" data-team-id="${team.id}">
        ${statusOptions}
      </select>
    </label>
    <label class="dp-label">Fokus
      <textarea class="dp-textarea" data-field="fokus" data-team-id="${team.id}" rows="4" placeholder="Woran arbeitet das Team gerade?">${esc(team.fokus || '')}</textarea>
    </label>
    <label class="dp-label">Nächster Schritt
      <textarea class="dp-textarea" data-field="schritt" data-team-id="${team.id}" rows="3" placeholder="Was ist der nächste konkrete Schritt?">${esc(team.schritt || '')}</textarea>
    </label>
  `;
}

function _renderShares(shares, isOwner) {
  if (!dom.tdpSharesList || !dom.tdpSharesCount) return;

  dom.tdpSharesCount.textContent = shares.length ? `(${shares.length})` : '';

  if (shares.length === 0) {
    dom.tdpSharesList.innerHTML = `<p class="tdp-shares-empty">${isOwner ? 'Noch keine Freigaben — suche nach einem Benutzer.' : 'Keine weiteren Benutzer mit Zugriff.'}</p>`;
  } else {
    dom.tdpSharesList.innerHTML = shares
      .map((s) => {
        const initial = s.email ? s.email[0].toUpperCase() : '?';
        return `
        <div class="tdp-share-row" data-user-id="${s.id}">
          <span class="tdp-share-avatar" aria-hidden="true">${esc(initial)}</span>
          <span class="tdp-share-email" title="${esc(s.email)}">${esc(s.email)}</span>
          ${isOwner ? `<button class="tdp-share-remove icon-btn" data-user-id="${s.id}" title="Freigabe entfernen" aria-label="Freigabe für ${esc(s.email)} entfernen">✕</button>` : ''}
        </div>`;
      })
      .join('');
  }

  // Show/hide the Add section
  if (dom.tdpSharesAdd) dom.tdpSharesAdd.hidden = !isOwner;
}

// ─── Save Team Fields ─────────────────────────────────────────────────────────

const _debouncedSaveField = debounce(async (teamId, field, value) => {
  const localTeam = findById(data.teams, teamId);
  if (localTeam) localTeam[field] = value;

  try {
    const res = await fetch(`${CONFIG.ENTITY_URLS.teams}/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ [field]: value }),
    });
    if (res.status === 401) { window.location.href = CONFIG.LOGIN_PAGE; return; }
    if (!res.ok) { showIndicator('Fehler!', true); return; }
    showIndicator('gespeichert');
  } catch {
    showIndicator('Netzwerkfehler!', true);
  }
}, CONFIG.SAVE_DEBOUNCE_MS);

export function handleTeamField(teamId, field, value) {
  _debouncedSaveField(teamId, field, value);
}

// ─── Name Input ───────────────────────────────────────────────────────────────

function _bindNameInput(team) {
  if (!dom.tdpName) return;
  dom.tdpName.oninput = () => {
    handleTeamField(team.id, 'name', dom.tdpName.value);
  };
}

// ─── Shares: Add ─────────────────────────────────────────────────────────────

const _debouncedSearch = debounce(async (query) => {
  if (query.length < 2) {
    _hideSuggestions();
    return;
  }
  try {
    const res = await fetch(`${CONFIG.USERS_SEARCH_URL}?q=${encodeURIComponent(query)}`, {
      credentials: 'same-origin',
    });
    if (!res.ok) return;
    const users = await res.json();
    _renderSuggestions(users);
  } catch {
    _hideSuggestions();
  }
}, 300);

function _renderSuggestions(users) {
  if (!dom.tdpUserSuggestions) return;
  if (!users.length) { _hideSuggestions(); return; }

  dom.tdpUserSuggestions.innerHTML = users
    .map((u) => `<li class="tdp-suggestion-item" data-user-id="${u.id}" data-email="${esc(u.email)}">${esc(u.email)}</li>`)
    .join('');
  dom.tdpUserSuggestions.hidden = false;
}

function _hideSuggestions() {
  if (dom.tdpUserSuggestions) dom.tdpUserSuggestions.hidden = true;
}

export async function addShare(teamId, userId, email) {
  try {
    const res = await fetch(CONFIG.TEAM_SHARES_URL(teamId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ userId }),
    });
    if (res.status === 401) { window.location.href = CONFIG.LOGIN_PAGE; return; }
    if (res.status === 409) { showIndicator('Bereits geteilt!', true); return; }
    if (!res.ok) { showIndicator('Fehler!', true); return; }

    currentShares = [...currentShares, { id: userId, email }];
    _renderShares(currentShares, currentIsOwner);
    if (dom.tdpUserSearch) dom.tdpUserSearch.value = '';
    _hideSuggestions();
    showIndicator('Freigabe hinzugefügt');
  } catch {
    showIndicator('Netzwerkfehler!', true);
  }
}

export async function removeShare(teamId, userId) {
  if (!confirm('Freigabe für diesen Benutzer wirklich entfernen?')) return;

  try {
    const res = await fetch(`${CONFIG.TEAM_SHARES_URL(teamId)}/${userId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (res.status === 401) { window.location.href = CONFIG.LOGIN_PAGE; return; }
    if (!res.ok) { showIndicator('Fehler!', true); return; }

    currentShares = currentShares.filter((s) => s.id !== userId);
    _renderShares(currentShares, currentIsOwner);
    showIndicator('Freigabe entfernt');
  } catch {
    showIndicator('Netzwerkfehler!', true);
  }
}

// ─── Event Handling (delegated) ───────────────────────────────────────────────

export function bindTeamDetailEvents() {
  const page = dom.teamDetailPage;
  if (!page) return;

  // Back button
  dom.tdpBack?.addEventListener('click', () => closeTeamDetail());

  // Field changes (select, textarea)
  page.addEventListener('change', (e) => {
    const el = e.target;
    const teamId = Number(el.dataset.teamId);
    const field = el.dataset.field;
    if (!teamId || !field) return;
    handleTeamField(teamId, field, el.value);
  });

  page.addEventListener('input', (e) => {
    const el = e.target;
    const teamId = Number(el.dataset.teamId);
    const field = el.dataset.field;
    if (!teamId || !field) return;
    handleTeamField(teamId, field, el.value);
  });

  // User search input
  dom.tdpUserSearch?.addEventListener('input', (e) => {
    _debouncedSearch(e.target.value.trim());
  });

  // Suggestion click → add share
  dom.tdpUserSuggestions?.addEventListener('click', (e) => {
    const li = e.target.closest('.tdp-suggestion-item');
    if (!li || currentTeamId === null) return;
    const userId = Number(li.dataset.userId);
    const email = li.dataset.email;
    addShare(currentTeamId, userId, email);
  });

  // Remove share button
  page.addEventListener('click', (e) => {
    const btn = e.target.closest('.tdp-share-remove');
    if (!btn || currentTeamId === null) return;
    const userId = Number(btn.dataset.userId);
    removeShare(currentTeamId, userId);
  });

  // ESC closes team detail
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.teamDetailPage.hidden) {
      closeTeamDetail();
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _statusLabel(status) {
  const map = { fertig: 'Fertig', yellow: 'In Arbeit', grey: 'Geplant', ungeplant: 'Ungeplant' };
  return map[status] || status;
}
