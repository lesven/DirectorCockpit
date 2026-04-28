/**
 * kunden.js – Kundenstammdaten-Seite.
 * Verwaltet die Kunde-Liste über den zentralen /api/cockpit Sync.
 */
import { data, load, createEntity, deleteEntity, saveEntity } from './store.js';
import { generateId, esc, findById } from './utils.js';
import { initAuth } from './auth.js';

const tbody      = document.getElementById('kunden-body');
const countBadge = document.getElementById('kunden-count');
const addBtn     = document.getElementById('add-kunde-btn');

// ─── Render ──────────────────────────────────────────────────

function renderKunden() {
  tbody.innerHTML = '';
  const kunden = data.kunden || [];
  kunden.forEach((k) => tbody.appendChild(renderKundeRow(k)));
  countBadge.textContent = kunden.length || '';
}

function renderKundeRow(k) {
  const tr = document.createElement('tr');
  tr.className = 'ini-row';
  tr.innerHTML = `
    <td>
      <input class="ini-cell customer-name-input" value="${esc(k.name)}"
             placeholder="Kundenname" data-id="${k.id}" data-field="name" data-source="kunden">
    </td>
    <td>
      <button class="del-row-btn" data-action="removeKunde" data-id="${k.id}" title="Löschen">✕</button>
    </td>
  `;
  return tr;
}

// ─── Aktionen ────────────────────────────────────────────────

async function addKunde() {
  const id = generateId();
  const entityData = { id, name: 'Neuer Kunde' };
  const created = await createEntity('kunden', entityData);
  if (!created) return;
  if (!Array.isArray(data.kunden)) data.kunden = [];
  data.kunden.push(created);
  renderKunden();
  setTimeout(() => {
    const inputs = tbody.querySelectorAll('.customer-name-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 50);
}

async function removeKunde(id) {
  const k = findById(data.kunden || [], id);
  const name = k?.name ? `\u201E${k.name}\u201C` : 'diesen Kunden';
  if (!confirm(`${name} wirklich löschen?\n\nInitiativen, die diesem Kunden zugeordnet sind, werden nicht automatisch geändert.`)) return;
  const ok = await deleteEntity('kunden', id);
  if (!ok) return;
  data.kunden = (data.kunden || []).filter((item) => item.id !== id);
  renderKunden();
}

// ─── Events ──────────────────────────────────────────────────

addBtn.addEventListener('click', addKunde);

tbody.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'removeKunde') {
    removeKunde(+target.dataset.id);
  }
});

tbody.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;
  const source = el.dataset.source;
  if (!Array.isArray(data[source])) return;
  const item = findById(data[source], +el.dataset.id);
  if (!item) return;
  item[el.dataset.field] = el.value;
  saveEntity(source, +el.dataset.id);
});

// ─── Init ────────────────────────────────────────────────────

(async function init() {
  await initAuth();
  await load();
  renderKunden();
})();
