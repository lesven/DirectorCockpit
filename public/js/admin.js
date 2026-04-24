import { initAuth } from './auth.js';
import { debounce } from './utils.js';

const tbody = document.getElementById('user-tbody');
const errorBox = document.getElementById('admin-error');
const addBtn = document.getElementById('add-user-btn');
const createModal = document.getElementById('create-modal');
const createError = document.getElementById('create-error');
const createSubmit = document.getElementById('create-submit');
const createCancel = document.getElementById('create-cancel');
const newEmail = document.getElementById('new-email');
const newPassword = document.getElementById('new-password');
const newRole = document.getElementById('new-role');
const userSearch = document.getElementById('user-search');
const userSearchClear = document.getElementById('user-search-clear');

let currentUser = null;
let allUsers = [];
let currentQuery = '';

// ─── API helpers ──────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ─── Search/Filter ───────────────────────────────────────────

function filterUsers(users, query) {
  if (!query || query.length < 2) {
    return users;
  }
  const lower = query.toLowerCase();
  return users.filter(u => u.email.toLowerCase().includes(lower));
}

function applyFilter() {
  const filtered = filterUsers(allUsers, currentQuery);
  renderUsers(filtered);
}

// ─── Render ───────────────────────────────────────────────────

function formatRoles(roles) {
  return roles
    .filter((r) => r !== 'ROLE_USER' || roles.length === 1)
    .map((r) => {
      const label = r === 'ROLE_ADMIN' ? 'Admin' : 'User';
      const cls = r === 'ROLE_ADMIN' ? 'role-badge admin' : 'role-badge';
      return `<span class="${cls}">${label}</span>`;
    })
    .join('');
}

function renderUsers(users) {
  tbody.innerHTML = '';
  
  // Show "no results" message if active search and no matches
  if (currentQuery.length >= 2 && users.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align: center; color: var(--text2); padding: 1rem;">Kein Benutzer gefunden für „${esc(currentQuery)}"</td>`;
    tbody.appendChild(tr);
    return;
  }
  
  users.forEach((u) => {
    const tr = document.createElement('tr');
    const isAdmin = u.roles.includes('ROLE_ADMIN');
    const isSelf = currentUser && u.id === currentUser.id;
    const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('de-DE') : '—';

    tr.innerHTML = `
      <td>${esc(u.email)}${isSelf ? ' <em style="font-size:.7rem;color:var(--text2)">(Du)</em>' : ''}</td>
      <td>${formatRoles(u.roles)}</td>
      <td>
        <select data-user-id="${u.id}" class="role-select" ${isSelf ? 'disabled title="Eigene Rolle nicht änderbar"' : ''}>
          <option value="ROLE_USER" ${!isAdmin ? 'selected' : ''}>User</option>
          <option value="ROLE_ADMIN" ${isAdmin ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>${date}</td>
      <td>
        <button class="btn-danger del-user-btn" data-user-id="${u.id}" data-email="${esc(u.email)}"
          ${isSelf ? 'disabled title="Eigenes Konto nicht löschbar"' : ''}>Löschen</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function showError(box, msg) {
  box.textContent = msg;
  box.classList.add('visible');
}
function hideError(box) {
  box.classList.remove('visible');
}
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Load users ───────────────────────────────────────────────

async function loadUsers() {
  const { ok, data } = await apiFetch('/api/admin/users');
  if (!ok) { showError(errorBox, data.error ?? 'Fehler beim Laden der Benutzer.'); return; }
  allUsers = data;
  applyFilter();
}

// ─── User search ──────────────────────────────────────────────

const handleSearchInput = debounce(() => {
  currentQuery = userSearch.value.trim();
  applyFilter();
}, 300);

userSearch.addEventListener('input', handleSearchInput);

userSearchClear.addEventListener('click', () => {
  userSearch.value = '';
  currentQuery = '';
  applyFilter();
  userSearch.focus();
});

// ─── Role change ──────────────────────────────────────────────

tbody.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('role-select')) return;
  const userId = Number(e.target.dataset.userId);
  const role = e.target.value;
  const roles = role === 'ROLE_ADMIN' ? ['ROLE_USER', 'ROLE_ADMIN'] : ['ROLE_USER'];

  const { ok, data } = await apiFetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roles }),
  });
  if (!ok) { showError(errorBox, data.error ?? 'Rolle konnte nicht geändert werden.'); return; }
  hideError(errorBox);
  await loadUsers();
});

// ─── Delete user ─────────────────────────────────────────────

tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.del-user-btn');
  if (!btn) return;
  const userId = Number(btn.dataset.userId);
  const email = btn.dataset.email;
  if (!confirm(`Benutzer "${email}" wirklich löschen?`)) return;

  const { ok, data } = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
  if (!ok) { showError(errorBox, data.error ?? 'Benutzer konnte nicht gelöscht werden.'); return; }
  hideError(errorBox);
  await loadUsers();
});

// ─── Create user modal ────────────────────────────────────────

addBtn.addEventListener('click', () => {
  newEmail.value = '';
  newPassword.value = '';
  newRole.value = 'ROLE_USER';
  hideError(createError);
  createModal.classList.add('open');
  newEmail.focus();
});

createCancel.addEventListener('click', () => createModal.classList.remove('open'));
createModal.addEventListener('click', (e) => { if (e.target === createModal) createModal.classList.remove('open'); });

createSubmit.addEventListener('click', async () => {
  hideError(createError);
  const email = newEmail.value.trim();
  const password = newPassword.value;
  const role = newRole.value;
  const roles = role === 'ROLE_ADMIN' ? ['ROLE_USER', 'ROLE_ADMIN'] : ['ROLE_USER'];

  if (!email || !password) { showError(createError, 'Bitte E-Mail und Passwort eingeben.'); return; }

  createSubmit.disabled = true;
  const { ok, data } = await apiFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, roles }),
  });
  createSubmit.disabled = false;

  if (!ok) { showError(createError, data.error ?? 'Benutzer konnte nicht angelegt werden.'); return; }
  createModal.classList.remove('open');
  await loadUsers();
});

// ─── Init ─────────────────────────────────────────────────────

const teamTbody = document.getElementById('team-tbody');

let allTeams = [];

async function loadTeams() {
  const { ok, data } = await apiFetch('/api/admin/teams');
  if (!ok) { showError(errorBox, data.error ?? 'Fehler beim Laden der Teams.'); return; }
  allTeams = data;
  renderTeams(allTeams);
}

function renderTeams(teams) {
  teamTbody.innerHTML = '';
  if (!teams.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" style="text-align: center; color: var(--text2); padding: 1rem;">Keine Teams vorhanden</td>`;
    teamTbody.appendChild(tr);
    return;
  }
  teams.forEach((t) => {
    const tr = document.createElement('tr');
    const ownerUser = t.createdBy ? allUsers.find(u => u.id === t.createdBy) : null;
    const ownerLabel = ownerUser ? esc(ownerUser.email) : (t.createdBy ? `User #${t.createdBy}` : '<em style="color:var(--text2)">Kein Ersteller</em>');
    const opts = [`<option value="">— Kein Ersteller —</option>`]
      .concat(allUsers.map(u => `<option value="${u.id}"${u.id === t.createdBy ? ' selected' : ''}>${esc(u.email)}</option>`))
      .join('');
    tr.innerHTML = `
      <td>${esc(t.name || '(unbenannt)')}</td>
      <td>${ownerLabel}</td>
      <td><select data-team-id="${t.id}" class="owner-select">${opts}</select></td>
    `;
    teamTbody.appendChild(tr);
  });
}

teamTbody.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('owner-select')) return;
  const teamId = Number(e.target.dataset.teamId);
  const userId = e.target.value ? Number(e.target.value) : null;
  const { ok, data } = await apiFetch(`/api/admin/teams/${teamId}/owner`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!ok) { showError(errorBox, data.error ?? 'Team-Ersteller konnte nicht geändert werden.'); return; }
  hideError(errorBox);
  await loadTeams();
});

(async function init() {
  currentUser = await initAuth();
  if (!currentUser) return;
  if (!currentUser.roles.includes('ROLE_ADMIN')) {
    document.querySelector('.admin-main').innerHTML = '<p style="color:#fca5a5">Zugriff verweigert. Nur Admins dürfen diese Seite aufrufen.</p>';
    return;
  }
  await loadUsers();
  await loadTeams();
})();
