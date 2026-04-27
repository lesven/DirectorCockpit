/**
 * auth.js — Shared authentication utilities.
 *
 * Call `initAuth()` once per page to:
 *   1. Fetch the current user from /api/me
 *   2. Redirect to login.html if not authenticated (401)
 *   3. Populate the header user-info area
 *   4. Return the user object so the page can adapt its UI (admin links etc.)
 */

import { CONFIG } from './config.js';

/**
 * Redirects to the login page, preserving the current URL as ?redirect=...
 */
export function redirectToLogin() {
  const redirect = encodeURIComponent(window.location.pathname + window.location.hash);
  window.location.href = `${CONFIG.LOGIN_PAGE}?redirect=${redirect}`;
}

/**
 * Fetches /api/me.  Returns the user object or null if not authenticated.
 * On 401, redirects immediately and returns null.
 */
export async function fetchCurrentUser() {
  try {
    const res = await fetch(CONFIG.ME_URL, { credentials: 'same-origin' });
    if (res.status === 401) {
      redirectToLogin();
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Logs out the current user via POST /api/logout, then redirects to login.html.
 */
export async function logout() {
  try {
    await fetch(CONFIG.LOGOUT_URL, { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.href = CONFIG.LOGIN_PAGE;
  }
}

/**
 * Initialises authentication for a page:
 *   - Fetches current user (redirects on 401)
 *   - Populates #user-info in the header (username + logout button)
 *   - Shows/hides admin-only elements based on ROLE_ADMIN
 *
 * @returns {Promise<{id:number,email:string,roles:string[]}|null>} current user or null
 */
export async function initAuth() {
  const user = await fetchCurrentUser();
  if (!user) return null;

  // Expose user info globally for modules that need to check ownership
  window._currentUserId = user.id;
  window._currentUserIsAdmin = user.roles.includes('ROLE_ADMIN');

  _renderUserInfo(user);

  return user;
}

function _renderUserInfo(user) {
  const area = document.getElementById('user-info');
  if (!area) return;

  const isAdmin = user.roles.includes('ROLE_ADMIN');

  area.innerHTML = `
    <span class="user-email" title="${_esc(user.email)}">${_esc(user.email)}</span>
    ${isAdmin ? '<a href="/admin.html" class="header-link">Admin</a>' : ''}
    <button id="change-password-btn" class="header-btn" title="Passwort ändern">🔑</button>
    <button id="logout-btn" class="header-btn" title="Abmelden">Abmelden</button>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);

  document.getElementById('change-password-btn').addEventListener('click', () => {
    import('./password-change.js').then((m) => m.openPasswordChangeModal());
  });
}

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
