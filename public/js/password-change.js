/**
 * password-change.js — Modal for changing the current user's password.
 * Lazy-loaded when the user clicks the 🔑 button in the header.
 */

let modalEl = null;

export function openPasswordChangeModal() {
  if (!modalEl) {
    modalEl = _buildModal();
    document.body.appendChild(modalEl);
  }
  _reset();
  modalEl.classList.add('open');
  modalEl.querySelector('#pc-current').focus();
}

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id = 'pw-change-modal';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Passwort ändern');
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:360px">
      <h3>Passwort ändern</h3>
      <div class="modal-field">
        <label for="pc-current">Aktuelles Passwort</label>
        <input type="password" id="pc-current" autocomplete="current-password">
      </div>
      <div class="modal-field">
        <label for="pc-new">Neues Passwort</label>
        <input type="password" id="pc-new" autocomplete="new-password">
        <small style="color:var(--text2);font-size:.72rem">Min. 12 Zeichen, Groß/Klein/Zahl/Sonderzeichen</small>
      </div>
      <div class="modal-field">
        <label for="pc-confirm">Neues Passwort bestätigen</label>
        <input type="password" id="pc-confirm" autocomplete="new-password">
      </div>
      <div id="pc-error" style="display:none;padding:.5rem .7rem;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);border-radius:6px;color:#fca5a5;font-size:.82rem;margin-top:.5rem" role="alert"></div>
      <div id="pc-success" style="display:none;padding:.5rem .7rem;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);border-radius:6px;color:#86efac;font-size:.82rem;margin-top:.5rem"></div>
      <div class="modal-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.2rem">
        <button id="pc-cancel" class="btn-secondary" style="background:transparent;border:1px solid var(--border);color:var(--text2);padding:6px 14px;border-radius:6px;cursor:pointer;font-family:inherit">Abbrechen</button>
        <button id="pc-submit" class="btn-primary" style="background:var(--accent,#3b82f6);border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:500">Speichern</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) _close(); });
  overlay.querySelector('#pc-cancel').addEventListener('click', _close);
  overlay.querySelector('#pc-submit').addEventListener('click', _submit);

  return overlay;
}

function _close() {
  if (modalEl) modalEl.classList.remove('open');
}

function _reset() {
  ['#pc-current', '#pc-new', '#pc-confirm'].forEach((sel) => { modalEl.querySelector(sel).value = ''; });
  _hideMsg('#pc-error');
  _hideMsg('#pc-success');
  modalEl.querySelector('#pc-submit').disabled = false;
}

function _showMsg(id, msg) {
  const el = modalEl.querySelector(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function _hideMsg(id) {
  modalEl.querySelector(id).style.display = 'none';
}

function _validateClientSide(current, newPw, confirm) {
  if (!current) return 'Bitte das aktuelle Passwort eingeben.';
  if (!newPw) return 'Bitte ein neues Passwort eingeben.';
  if (newPw !== confirm) return 'Die neuen Passwörter stimmen nicht überein.';
  if (newPw.length < 12) return 'Das neue Passwort muss mindestens 12 Zeichen lang sein.';
  if (!/[A-Z]/.test(newPw)) return 'Das Passwort muss mindestens einen Großbuchstaben enthalten.';
  if (!/[a-z]/.test(newPw)) return 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.';
  if (!/[0-9]/.test(newPw)) return 'Das Passwort muss mindestens eine Ziffer enthalten.';
  if (!/[\W_]/.test(newPw)) return 'Das Passwort muss mindestens ein Sonderzeichen enthalten.';
  return null;
}

async function _submit() {
  _hideMsg('#pc-error');
  _hideMsg('#pc-success');

  const current = modalEl.querySelector('#pc-current').value;
  const newPw = modalEl.querySelector('#pc-new').value;
  const confirm = modalEl.querySelector('#pc-confirm').value;

  const err = _validateClientSide(current, newPw, confirm);
  if (err) { _showMsg('#pc-error', err); return; }

  const submitBtn = modalEl.querySelector('#pc-submit');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/user/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      _showMsg('#pc-error', data.error ?? 'Passwort konnte nicht geändert werden.');
      return;
    }

    _showMsg('#pc-success', data.message ?? 'Passwort erfolgreich geändert.');
    setTimeout(_close, 1800);
  } catch {
    _showMsg('#pc-error', 'Verbindungsfehler. Bitte erneut versuchen.');
  } finally {
    submitBtn.disabled = false;
  }
}
