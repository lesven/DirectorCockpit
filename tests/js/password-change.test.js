/**
 * password-change.test.js — Tests for the password-change modal (password-change.js).
 * Imports the real module to achieve coverage on the actual source lines.
 * Uses vi.resetModules() + dynamic import so each test gets a fresh modalEl = null.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

let openPasswordChangeModal;

beforeEach(async () => {
  document.body.innerHTML = '';
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Fresh module each time so internal modalEl resets to null
  vi.resetModules();
  const mod = await import('../../public/js/password-change.js');
  openPasswordChangeModal = mod.openPasswordChangeModal;
});

function getModal() {
  return document.getElementById('pw-change-modal');
}

function fillForm(current, newPw, confirm) {
  getModal().querySelector('#pc-current').value = current;
  getModal().querySelector('#pc-new').value = newPw;
  getModal().querySelector('#pc-confirm').value = confirm;
}

function clickSubmit() {
  getModal().querySelector('#pc-submit').click();
}

function clickCancel() {
  getModal().querySelector('#pc-cancel').click();
}

function errorText() {
  return getModal().querySelector('#pc-error').textContent;
}

function errorVisible() {
  return getModal().querySelector('#pc-error').style.display !== 'none';
}

function successText() {
  return getModal().querySelector('#pc-success').textContent;
}

describe('openPasswordChangeModal()', () => {
  it('creates and opens the modal on first call', () => {
    openPasswordChangeModal();
    const modal = getModal();
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('open')).toBe(true);
  });

  it('reuses the same modal on subsequent calls', () => {
    openPasswordChangeModal();
    const first = getModal();
    openPasswordChangeModal();
    const second = getModal();
    expect(first).toBe(second);
  });

  it('resets fields when reopened', () => {
    openPasswordChangeModal();
    fillForm('old', 'NewValid!Pass99', 'NewValid!Pass99');
    // Close and reopen
    clickCancel();
    openPasswordChangeModal();
    expect(getModal().querySelector('#pc-current').value).toBe('');
    expect(getModal().querySelector('#pc-new').value).toBe('');
    expect(getModal().querySelector('#pc-confirm').value).toBe('');
  });

  it('sets up the modal with all form fields', () => {
    openPasswordChangeModal();
    const modal = getModal();
    expect(modal.querySelector('#pc-current')).not.toBeNull();
    expect(modal.querySelector('#pc-new')).not.toBeNull();
    expect(modal.querySelector('#pc-confirm')).not.toBeNull();
    expect(modal.querySelector('#pc-submit')).not.toBeNull();
    expect(modal.querySelector('#pc-cancel')).not.toBeNull();
  });
});

describe('password modal – cancel / close', () => {
  beforeEach(() => openPasswordChangeModal());

  it('closes modal on cancel click', () => {
    clickCancel();
    expect(getModal().classList.contains('open')).toBe(false);
  });

  it('closes modal on overlay click', () => {
    // Click directly on the overlay (not the inner box)
    const modal = getModal();
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.classList.contains('open')).toBe(false);
  });
});

describe('password modal – client-side validation', () => {
  beforeEach(() => openPasswordChangeModal());

  it('shows error when current password is empty', () => {
    fillForm('', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();
    expect(errorVisible()).toBe(true);
    expect(errorText()).toContain('aktuelle');
  });

  it('shows error when new password is empty', () => {
    fillForm('old', '', '');
    clickSubmit();
    expect(errorVisible()).toBe(true);
    expect(errorText()).toContain('neues Passwort');
  });

  it('shows error when passwords do not match', () => {
    fillForm('old', 'NewValid!Pass99', 'Different!Pass99');
    clickSubmit();
    expect(errorText()).toContain('stimmen nicht');
  });

  it('shows error when password is too short', () => {
    fillForm('old', 'Short1!a', 'Short1!a');
    clickSubmit();
    expect(errorText()).toContain('12');
  });

  it('shows error when missing uppercase', () => {
    fillForm('old', 'nouppercase99!zz', 'nouppercase99!zz');
    clickSubmit();
    expect(errorText()).toContain('Großbuchstaben');
  });

  it('shows error when missing lowercase', () => {
    fillForm('old', 'NOLOWERCASE99!ZZ', 'NOLOWERCASE99!ZZ');
    clickSubmit();
    expect(errorText()).toContain('Kleinbuchstaben');
  });

  it('shows error when missing digit', () => {
    fillForm('old', 'NoDigitHere!!Abc', 'NoDigitHere!!Abc');
    clickSubmit();
    expect(errorText()).toContain('Ziffer');
  });

  it('shows error when missing special char', () => {
    fillForm('old', 'NoSpecialChar99Abc', 'NoSpecialChar99Abc');
    clickSubmit();
    expect(errorText()).toContain('Sonderzeichen');
  });

  it('does NOT call fetch when validation fails', () => {
    fillForm('', '', '');
    clickSubmit();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('password modal – API interaction', () => {
  beforeEach(() => openPasswordChangeModal());

  it('calls PUT /api/user/password with correct body on valid input', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Passwort erfolgreich geändert.' }),
    });

    fillForm('oldpass', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith('/api/user/password', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'NewValid!Pass99' }),
    }));
  });

  it('shows success message on 200 response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Passwort erfolgreich geändert.' }),
    });

    fillForm('oldpass', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();

    await vi.waitFor(() => expect(successText()).toContain('erfolgreich'));
  });

  it('shows error message on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Aktuelles Passwort ist falsch.' }),
    });

    fillForm('wrong', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();

    await vi.waitFor(() => expect(errorVisible()).toBe(true));
    expect(errorText()).toContain('Passwort');
  });

  it('shows fallback error when API returns no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    });

    fillForm('old', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();

    await vi.waitFor(() => expect(errorVisible()).toBe(true));
    expect(errorText()).toContain('konnte nicht geändert');
  });

  it('shows connection error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    fillForm('old', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();

    await vi.waitFor(() => expect(errorVisible()).toBe(true));
    expect(errorText()).toContain('Verbindungsfehler');
  });

  it('re-enables submit button after API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Fehler' }),
    });

    fillForm('old', 'NewValid!Pass99', 'NewValid!Pass99');
    clickSubmit();

    await vi.waitFor(() => expect(errorVisible()).toBe(true));
    expect(getModal().querySelector('#pc-submit').disabled).toBe(false);
  });
});
