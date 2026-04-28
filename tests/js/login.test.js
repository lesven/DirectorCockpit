/**
 * login.test.js — Tests for login.js via dynamic import.
 * login.js has no exports and binds to DOM at module-level,
 * so we set up DOM before importing and drive it via events.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function setupLoginDom() {
  document.body.innerHTML = `
    <form id="login-form">
      <input id="email" type="email" value="">
      <input id="password" type="password" value="">
      <button id="login-btn" type="submit">Anmelden</button>
      <div id="login-error"></div>
    </form>
  `;
}

async function loadLoginModule() {
  setupLoginDom();
  vi.resetModules();
  await import('../../public/js/login.js');
}

async function submitForm() {
  const form = document.getElementById('login-form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  // Allow microtasks (fetch calls) to settle
  await new Promise((r) => setTimeout(r, 0));
}

describe('login.js – validation', () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    await loadLoginModule();
  });

  it('shows error when email is empty on submit', async () => {
    document.getElementById('email').value = '';
    document.getElementById('password').value = 'ValidPass99!Z';
    await submitForm();

    const errorBox = document.getElementById('login-error');
    expect(errorBox.textContent).toContain('E-Mail und Passwort');
    expect(errorBox.classList.contains('visible')).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows error when password is empty on submit', async () => {
    document.getElementById('email').value = 'test@test.de';
    document.getElementById('password').value = '';
    await submitForm();

    const errorBox = document.getElementById('login-error');
    expect(errorBox.textContent).toContain('E-Mail und Passwort');
    expect(errorBox.classList.contains('visible')).toBe(true);
  });
});

describe('login.js – API interaction', () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    // Save original location, provide a mock one
    globalThis._originalLocation = globalThis.location;
    delete globalThis.location;
    globalThis.location = { href: '', search: '', pathname: '/login.html', hash: '' };
    await loadLoginModule();
  });

  afterEach(() => {
    if (globalThis._originalLocation) {
      globalThis.location = globalThis._originalLocation;
      delete globalThis._originalLocation;
    }
  });

  it('sends POST /api/login on valid submit', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ email: 'a@b.de' }) });

    document.getElementById('email').value = 'a@b.de';
    document.getElementById('password').value = 'ValidPass99!Z';
    await submitForm();

    expect(mockFetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('redirects to cockpit.html on successful login', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    document.getElementById('email').value = 'a@b.de';
    document.getElementById('password').value = 'ValidPass99!Z';
    await submitForm();

    expect(globalThis.location.href).toContain('/cockpit.html');
  });

  it('shows error message on failed login', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Ungültige Anmeldedaten.' }),
    });

    document.getElementById('email').value = 'x@y.de';
    document.getElementById('password').value = 'wrong';
    await submitForm();

    const errorBox = document.getElementById('login-error');
    expect(errorBox.classList.contains('visible')).toBe(true);
    expect(errorBox.textContent).toContain('Ungültige');
  });

  it('shows connection error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    document.getElementById('email').value = 'a@b.de';
    document.getElementById('password').value = 'ValidPass99!Z';
    await submitForm();

    const errorBox = document.getElementById('login-error');
    expect(errorBox.classList.contains('visible')).toBe(true);
    expect(errorBox.textContent).toContain('Verbindungsfehler');
  });

  it('disables button during submit and re-enables after', async () => {
    let resolvePromise;
    mockFetch.mockImplementation(() => new Promise((r) => { resolvePromise = r; }));

    document.getElementById('email').value = 'a@b.de';
    document.getElementById('password').value = 'ValidPass99!Z';

    const btn = document.getElementById('login-btn');
    const form = document.getElementById('login-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Button should be disabled while waiting
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Anmelden');

    // Resolve the fetch
    resolvePromise({ ok: true, json: () => Promise.resolve({}) });
    await new Promise((r) => setTimeout(r, 10));

    expect(btn.disabled).toBe(false);
  });

  it('shows fallback error when API returns no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    });

    document.getElementById('email').value = 'a@b.de';
    document.getElementById('password').value = 'ValidPass99!Z';
    await submitForm();

    const errorBox = document.getElementById('login-error');
    expect(errorBox.classList.contains('visible')).toBe(true);
    expect(errorBox.textContent).toContain('fehlgeschlagen');
  });
});
