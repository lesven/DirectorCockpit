/**
 * admin.test.js — Tests for admin.js via dynamic import.
 * admin.js has module-level DOM queries and an IIFE init,
 * so we set up DOM + mocks before importing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

// ── Mock auth.js ──────────────────────────────────────────────

vi.mock('../../public/js/auth.js', () => ({
  initAuth: vi.fn(),
}));

vi.mock('../../public/js/utils.js', () => ({
  debounce: (fn) => fn,
}));

// ── DOM setup ─────────────────────────────────────────────────

function setupAdminDom() {
  document.body.innerHTML = `
    <div class="admin-main">
      <div id="admin-error"></div>
      <input id="user-search" value="">
      <button id="user-search-clear"></button>
      <table><tbody id="user-tbody"></tbody></table>
      <button id="add-user-btn">Benutzer anlegen</button>
      <div id="create-modal">
        <div id="create-error"></div>
        <input id="new-email">
        <input id="new-password">
        <select id="new-role"><option value="ROLE_USER">User</option><option value="ROLE_ADMIN">Admin</option></select>
        <button id="create-submit">Erstellen</button>
        <button id="create-cancel">Abbrechen</button>
      </div>
      <table><tbody id="team-tbody"></tbody></table>
    </div>
  `;
}

const mockUsers = [
  { id: 1, email: 'admin@test.de', roles: ['ROLE_USER', 'ROLE_ADMIN'], createdAt: '2026-01-01T00:00:00+00:00' },
  { id: 2, email: 'user@test.de', roles: ['ROLE_USER'], createdAt: '2026-02-01T00:00:00+00:00' },
];

const mockTeams = [
  { id: 10, name: 'Team A', createdBy: 1 },
  { id: 20, name: 'Team B', createdBy: null },
];

// Helper to load the admin module fresh
async function loadAdminModule(opts = {}) {
  const { isAdmin = true, user = mockUsers[0] } = opts;
  setupAdminDom();
  vi.resetModules();

  // Re-mock after resetModules
  vi.doMock('../../public/js/auth.js', () => ({
    initAuth: vi.fn().mockResolvedValue(isAdmin ? user : (user || null)),
  }));
  vi.doMock('../../public/js/utils.js', () => ({
    debounce: (fn) => fn,
  }));

  // Setup fetch to respond to init calls (loadUsers + loadTeams)
  if (!mockFetch.mock.calls.length || !opts.skipFetchSetup) {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) }) // /api/admin/users
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTeams) }); // /api/admin/teams
  }

  globalThis.fetch = mockFetch;
  await import('../../public/js/admin.js');
  // Wait for IIFE init to complete
  await new Promise((r) => setTimeout(r, 20));
}

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.confirm = vi.fn().mockReturnValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ── Inline filterUsers tests (kept from original) ────────────

function filterUsers(users, query) {
  if (!query || query.length < 2) return users;
  const lower = query.toLowerCase();
  return users.filter(u => u.email.toLowerCase().includes(lower));
}

describe('filterUsers()', () => {
  it('returns all users when query is empty', () => {
    expect(filterUsers(mockUsers, '')).toEqual(mockUsers);
  });

  it('returns all users when query has only 1 character', () => {
    expect(filterUsers(mockUsers, 'a')).toEqual(mockUsers);
  });

  it('returns filtered results for query with 2+ characters', () => {
    const result = filterUsers(mockUsers, 'admin');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('admin@test.de');
  });

  it('performs case-insensitive matching', () => {
    expect(filterUsers(mockUsers, 'ADMIN')).toHaveLength(1);
  });

  it('returns empty array when no matches found', () => {
    expect(filterUsers(mockUsers, 'nomatch')).toEqual([]);
  });
});

// ── Init & Rendering ──────────────────────────────────────────

describe('admin.js – init & rendering', () => {
  it('loads and renders users on init', async () => {
    await loadAdminModule();
    const tbody = document.getElementById('user-tbody');
    expect(tbody.querySelectorAll('tr').length).toBe(2);
    expect(tbody.innerHTML).toContain('admin@test.de');
    expect(tbody.innerHTML).toContain('user@test.de');
  });

  it('renders role badges correctly', async () => {
    await loadAdminModule();
    const tbody = document.getElementById('user-tbody');
    expect(tbody.innerHTML).toContain('Admin');
    expect(tbody.innerHTML).toContain('role-badge');
  });

  it('marks current user with (Du) label', async () => {
    await loadAdminModule();
    const tbody = document.getElementById('user-tbody');
    expect(tbody.innerHTML).toContain('(Du)');
  });

  it('disables role select for current user', async () => {
    await loadAdminModule();
    const selects = document.querySelectorAll('.role-select');
    const selfSelect = [...selects].find(s => s.dataset.userId === '1');
    expect(selfSelect.disabled).toBe(true);
  });

  it('disables delete button for current user', async () => {
    await loadAdminModule();
    const btns = document.querySelectorAll('.del-user-btn');
    const selfBtn = [...btns].find(b => b.dataset.userId === '1');
    expect(selfBtn.disabled).toBe(true);
  });

  it('renders teams table', async () => {
    await loadAdminModule();
    const teamTbody = document.getElementById('team-tbody');
    expect(teamTbody.querySelectorAll('tr').length).toBe(2);
    expect(teamTbody.innerHTML).toContain('Team A');
    expect(teamTbody.innerHTML).toContain('Team B');
  });

  it('renders team owner labels', async () => {
    await loadAdminModule();
    const teamTbody = document.getElementById('team-tbody');
    expect(teamTbody.innerHTML).toContain('admin@test.de');
    expect(teamTbody.innerHTML).toContain('Kein Ersteller');
  });

  it('renders owner select with all users for each team', async () => {
    await loadAdminModule();
    const selects = document.querySelectorAll('.owner-select');
    expect(selects.length).toBe(2);
    expect(selects[0].options.length).toBe(3); // "Kein Ersteller" + 2 users
  });

  it('shows access denied for non-admin users', async () => {
    const nonAdmin = { id: 2, email: 'user@test.de', roles: ['ROLE_USER'] };
    mockFetch.mockReset(); // No API calls should happen
    await loadAdminModule({ isAdmin: true, user: nonAdmin });
    const main = document.querySelector('.admin-main');
    expect(main.innerHTML).toContain('Zugriff verweigert');
  });

  it('does nothing when initAuth returns null', async () => {
    mockFetch.mockReset();
    await loadAdminModule({ isAdmin: true, user: null });
    // Should not crash, user-tbody stays empty since no loadUsers call
    const tbody = document.getElementById('user-tbody');
    expect(tbody.innerHTML).toBe('');
  });

  it('shows error when loadUsers fails', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Serverfehler' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await loadAdminModule({ skipFetchSetup: true });
    const errorBox = document.getElementById('admin-error');
    expect(errorBox.textContent).toContain('Serverfehler');
  });

  it('shows empty teams message when no teams exist', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await loadAdminModule({ skipFetchSetup: true });
    const teamTbody = document.getElementById('team-tbody');
    expect(teamTbody.innerHTML).toContain('Keine Teams');
  });
});

// ── User search ───────────────────────────────────────────────

describe('admin.js – user search', () => {
  it('filters users on search input', async () => {
    await loadAdminModule();
    const search = document.getElementById('user-search');
    search.value = 'admin';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));

    const tbody = document.getElementById('user-tbody');
    expect(tbody.querySelectorAll('tr').length).toBe(1);
    expect(tbody.innerHTML).toContain('admin@test.de');
  });

  it('clears search and shows all users', async () => {
    await loadAdminModule();
    const search = document.getElementById('user-search');

    // First filter
    search.value = 'admin';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));

    // Clear
    document.getElementById('user-search-clear').click();
    await new Promise((r) => setTimeout(r, 10));

    const tbody = document.getElementById('user-tbody');
    expect(tbody.querySelectorAll('tr').length).toBe(2);
    expect(search.value).toBe('');
  });

  it('shows no-results message when search has no matches', async () => {
    await loadAdminModule();
    const search = document.getElementById('user-search');
    search.value = 'zzzzz_nomatch';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));

    const tbody = document.getElementById('user-tbody');
    expect(tbody.innerHTML).toContain('Kein Benutzer gefunden');
  });
});

// ── Role change ───────────────────────────────────────────────

describe('admin.js – role change', () => {
  it('sends PUT to change role and reloads users', async () => {
    await loadAdminModule();
    mockFetch.mockReset();

    // Role change response + subsequent loadUsers + loadTeams
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })           // PUT role
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) })     // loadUsers
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTeams) });    // loadTeams — not called but safe

    const select = document.querySelector('.role-select:not([disabled])');
    select.value = 'ROLE_ADMIN';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('shows error when role change fails', async () => {
    await loadAdminModule();
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Nicht erlaubt' }) });

    const select = document.querySelector('.role-select:not([disabled])');
    select.value = 'ROLE_ADMIN';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    const errorBox = document.getElementById('admin-error');
    expect(errorBox.textContent).toContain('Nicht erlaubt');
  });
});

// ── Delete user ───────────────────────────────────────────────

describe('admin.js – delete user', () => {
  it('sends DELETE after confirm and reloads users', async () => {
    await loadAdminModule();
    mockFetch.mockReset();
    globalThis.confirm = vi.fn().mockReturnValue(true);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })           // DELETE
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) });    // loadUsers

    const btn = document.querySelector('.del-user-btn:not([disabled])');
    btn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('does nothing when confirm is cancelled', async () => {
    await loadAdminModule();
    mockFetch.mockReset();
    globalThis.confirm = vi.fn().mockReturnValue(false);

    const btn = document.querySelector('.del-user-btn:not([disabled])');
    btn.click();
    await new Promise((r) => setTimeout(r, 10));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows error when delete fails', async () => {
    await loadAdminModule();
    mockFetch.mockReset();
    globalThis.confirm = vi.fn().mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Löschen verboten' }) });

    const btn = document.querySelector('.del-user-btn:not([disabled])');
    btn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(document.getElementById('admin-error').textContent).toContain('Löschen verboten');
  });
});

// ── Create user modal ─────────────────────────────────────────

describe('admin.js – create user modal', () => {
  it('opens modal on add button click', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    expect(document.getElementById('create-modal').classList.contains('open')).toBe(true);
  });

  it('closes modal on cancel click', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    document.getElementById('create-cancel').click();
    expect(document.getElementById('create-modal').classList.contains('open')).toBe(false);
  });

  it('closes modal on overlay click', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    const modal = document.getElementById('create-modal');
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.classList.contains('open')).toBe(false);
  });

  it('shows validation error when email or password is empty', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    document.getElementById('new-email').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('create-submit').click();
    await new Promise((r) => setTimeout(r, 10));
    expect(document.getElementById('create-error').textContent).toContain('E-Mail und Passwort');
  });

  it('sends POST and closes modal on success', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    document.getElementById('new-email').value = 'new@test.de';
    document.getElementById('new-password').value = 'SecurePass123!';
    document.getElementById('new-role').value = 'ROLE_USER';

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 3, email: 'new@test.de' }) }) // POST create
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) }); // loadUsers reload

    document.getElementById('create-submit').click();
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ method: 'POST' }));
    expect(document.getElementById('create-modal').classList.contains('open')).toBe(false);
  });

  it('shows error when create fails', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    document.getElementById('new-email').value = 'new@test.de';
    document.getElementById('new-password').value = 'SecurePass123!';

    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'E-Mail existiert bereits.' }) });

    document.getElementById('create-submit').click();
    await new Promise((r) => setTimeout(r, 20));

    expect(document.getElementById('create-error').textContent).toContain('E-Mail existiert bereits');
    expect(document.getElementById('create-modal').classList.contains('open')).toBe(true);
  });

  it('creates admin user when admin role selected', async () => {
    await loadAdminModule();
    document.getElementById('add-user-btn').click();
    document.getElementById('new-email').value = 'admin2@test.de';
    document.getElementById('new-password').value = 'SecurePass123!';
    document.getElementById('new-role').value = 'ROLE_ADMIN';

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 4 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) });

    document.getElementById('create-submit').click();
    await new Promise((r) => setTimeout(r, 20));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.roles).toContain('ROLE_ADMIN');
  });
});

// ── Team owner change ─────────────────────────────────────────

describe('admin.js – team owner change', () => {
  it('sends PUT to change owner and reloads teams', async () => {
    await loadAdminModule();
    mockFetch.mockReset();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })           // PUT owner
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTeams) });    // loadTeams

    const select = document.querySelector('.owner-select');
    select.value = '2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/teams/'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('shows error when owner change fails', async () => {
    await loadAdminModule();
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Fehler' }) });

    const select = document.querySelector('.owner-select');
    select.value = '2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(document.getElementById('admin-error').textContent).toContain('Fehler');
  });
});
