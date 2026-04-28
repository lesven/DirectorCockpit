const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btn = document.getElementById('login-btn');
const errorBox = document.getElementById('login-error');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('visible');
}

function hideError() {
  errorBox.classList.remove('visible');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Bitte E-Mail und Passwort eingeben.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Anmelden…';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'same-origin',
    });

    if (res.ok) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/cockpit.html';
      window.location.href = redirect;
      return;
    }

    const data = await res.json().catch(() => ({}));
    showError(data.error ?? 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
  } catch {
    showError('Verbindungsfehler. Bitte erneut versuchen.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Anmelden';
  }
});
