import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config FIRST (before any imports that depend on it)
vi.mock('../../public/js/config.js', () => ({
  CONFIG: {
    API_URL: '/api/cockpit',
    LOGIN_URL: '/api/login',
    LOGOUT_URL: '/api/logout',
    ME_URL: '/api/me',
    LOGIN_PAGE: '/login.html',
  },
}));

import { fetchCurrentUser, redirectToLogin, logout, initAuth } from '../../public/js/auth.js';

const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
  globalThis.location = { href: '', pathname: '/cockpit.html', hash: '', search: '' };
});

describe('redirectToLogin()', () => {
  it('sets window.location.href to login page with redirect param', () => {
    redirectToLogin();
    expect(globalThis.location.href).toContain('/login.html');
    expect(globalThis.location.href).toContain('redirect=');
  });
});

describe('fetchCurrentUser()', () => {
  it('returns user data on 200 response', async () => {
    const user = { id: 1, email: 'a@b.de', roles: ['ROLE_USER'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });

    const result = await fetchCurrentUser();
    expect(result).toEqual(user);
  });

  it('redirects and returns null on 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });

    const result = await fetchCurrentUser();
    expect(result).toBeNull();
    expect(globalThis.location.href).toContain('/login.html');
  });

  it('returns null on network error without throwing', async () => {
    // Use mockImplementation instead of mockRejectedValue to avoid unhandled rejection warnings
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

    const result = await fetchCurrentUser();
    expect(result).toBeNull();
  });
});

describe('logout()', () => {
  it('calls POST /api/logout and redirects to login page', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await logout();

    expect(mockFetch).toHaveBeenCalledWith('/api/logout', expect.objectContaining({ method: 'POST' }));
    expect(globalThis.location.href).toBe('/login.html');
  });
});

describe('initAuth()', () => {
  it('returns user object when authenticated', async () => {
    const user = { id: 1, email: 'admin@test.de', roles: ['ROLE_USER', 'ROLE_ADMIN'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });
    document.body.innerHTML = '<nav id="user-info"></nav>';

    const result = await initAuth();
    expect(result).toEqual(user);
  });

  it('returns null when not authenticated', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });

    const result = await initAuth();
    expect(result).toBeNull();
  });

  it('renders user email in #user-info area', async () => {
    const user = { id: 1, email: 'test@example.de', roles: ['ROLE_USER'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });
    document.body.innerHTML = '<nav id="user-info"></nav>';

    await initAuth();
    const area = document.getElementById('user-info');
    expect(area.innerHTML).toContain('test@example.de');
    expect(area.innerHTML).toContain('Abmelden');
  });

  it('shows Admin link for ROLE_ADMIN users', async () => {
    const user = { id: 1, email: 'admin@test.de', roles: ['ROLE_USER', 'ROLE_ADMIN'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });
    document.body.innerHTML = '<nav id="user-info"></nav>';

    await initAuth();
    expect(document.getElementById('user-info').innerHTML).toContain('Admin');
    expect(document.getElementById('user-info').innerHTML).toContain('/admin.html');
  });

  it('does not show Admin link for normal users', async () => {
    const user = { id: 1, email: 'user@test.de', roles: ['ROLE_USER'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });
    document.body.innerHTML = '<nav id="user-info"></nav>';

    await initAuth();
    expect(document.getElementById('user-info').innerHTML).not.toContain('Admin');
  });

  it('does not crash when #user-info is missing', async () => {
    const user = { id: 1, email: 'test@test.de', roles: ['ROLE_USER'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });
    document.body.innerHTML = '';

    const result = await initAuth();
    expect(result).toEqual(user);
  });

  it('registers logout button click handler', async () => {
    const user = { id: 1, email: 'test@test.de', roles: ['ROLE_USER'] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(user) });
    document.body.innerHTML = '<nav id="user-info"></nav>';

    await initAuth();
    const logoutBtn = document.getElementById('logout-btn');
    expect(logoutBtn).toBeTruthy();
  });
});
