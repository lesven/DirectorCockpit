(function() {
  'use strict';

  // ── Konstanten ──────────────────────────────────────────────
  const STORAGE_KEY = 'directors_cockpit_v2';
  const STATUSES = ['fertig', 'yellow', 'grey', 'ungeplant'];
  const STATUS_LABELS = { fertig: 'Fertig', yellow: 'In Arbeit', grey: 'Geplant', ungeplant: 'Ungeplant' };
  const STATUS_ORDER = { fertig: 0, yellow: 1, grey: 2, ungeplant: 3 };
  const DEFAULT_DATA = {
    kw: '',
    teams: [
      { id: 1, name: 'IT Service', sub: 'Endgeräte & User', status: 'green', fokus: '', schritt: '' },
      { id: 2, name: 'IT Infrastruktur', sub: 'RZ, Netzwerk, Betrieb', status: 'green', fokus: '', schritt: '' },
      { id: 3, name: 'DevOps', sub: 'K8s, GitLab, Azure DevOps', status: 'yellow', fokus: '', schritt: '' },
      { id: 4, name: 'Konzernapplikationen', sub: 'Navision, MSSQL, CRM', status: 'green', fokus: '', schritt: '' },
    ],
    inis: [
      { id: 1, name: 'Update Azure DevOps', team: 3, status: 'yellow', schritt: 'Versionsplanung abschließen', frist: '', notiz: '' },
      { id: 2, name: 'Update GitLab', team: 3, status: 'yellow', schritt: 'Upgrade-Pfad definieren', frist: '', notiz: '' },
      { id: 3, name: 'Onboarding SVA Fortinet', team: 2, status: 'green', schritt: 'Kick-off durchführen', frist: '', notiz: '' },
      { id: 4, name: 'Onboarding SVA MSSQL', team: 4, status: 'green', schritt: 'Anforderungen & SLA klären', frist: '', notiz: '' },
    ],
    nvs: []
  };

  // ── State ───────────────────────────────────────────────────
  let data;
  let saveTimer;
  let sortState = { field: null, dir: 'asc' };

  // ── Persistence (load/save) ─────────────────────────────────
  async function load() {
    try {
      const res = await fetch('/api/cockpit');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    } catch (e) {
      console.warn('Backend nicht erreichbar, verwende Standarddaten:', e);
      data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  function save() {
    const ind = document.getElementById('save-ind');
    fetch('/api/cockpit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      ind.textContent = 'gespeichert';
      ind.classList.add('show');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => ind.classList.remove('show'), 1400);
    }).catch(err => {
      console.error('Speichern fehlgeschlagen:', err);
      ind.textContent = 'Fehler!';
      ind.classList.add('show');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => ind.classList.remove('show'), 3000);
    });
  }

  function debounce(fn, ms = 400) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  const dSave = debounce(save);

  // ── Hilfsfunktionen ─────────────────────────────────────────
  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function findById(arr, id) {
    return arr.find(x => x.id === id);
  }

  function confirmRemove(arrKey, id, labelField, fallback, renderFn) {
    const item = findById(data[arrKey], id);
    const name = item && item[labelField] ? `\u201E${item[labelField]}\u201C` : fallback;
    if (!confirm(`${name} wirklich löschen?`)) return;
    data[arrKey] = data[arrKey].filter(x => x.id !== id);
    save();
    renderFn();
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function statusClass(s) {
    return 'status-' + (s || 'grey');
  }

  // ── Render: KW ──────────────────────────────────────────────
  function renderKW() {
    const el = document.getElementById('kw-badge');
    el.textContent = data.kw ? 'KW ' + data.kw : 'KW \u2014';
  }

  // ── Render: Teams ───────────────────────────────────────────
  function renderTeams() {
    const grid = document.getElementById('teams-grid');
    grid.innerHTML = '';
    data.teams.forEach(t => {
      const card = document.createElement('div');
      card.className = 'team-card';
      card.innerHTML = `
        <div class="team-card-top">
          <div class="status-dot ${statusClass(t.status)}" title="Status wechseln: ${STATUS_LABELS[t.status]}" data-action="cycleStatus" data-id="${t.id}" data-team="true"></div>
          <input class="team-name" value="${esc(t.name)}" placeholder="Teamname" data-id="${t.id}" data-field="name" data-source="teams">
        </div>
        <div class="card-actions">
          <button class="icon-btn" data-action="removeTeam" data-id="${t.id}" title="Löschen">✕</button>
        </div>
        <div class="field-row">
          <div class="field-label">Thema</div>
          <input class="field-input" value="${esc(t.sub)}" placeholder="Kurzbeschreibung" data-id="${t.id}" data-field="sub" data-source="teams">
        </div>
        <div class="field-row">
          <div class="field-label">Aktueller Fokus</div>
          <textarea class="field-input" rows="2" placeholder="Was läuft gerade?" data-id="${t.id}" data-field="fokus" data-source="teams">${esc(t.fokus)}</textarea>
        </div>
        <div class="field-row">
          <div class="field-label">Mein nächster Schritt</div>
          <input class="field-input" value="${esc(t.schritt)}" placeholder="Was muss ich tun?" data-id="${t.id}" data-field="schritt" data-source="teams">
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ── Render: Initiativen ─────────────────────────────────────
  function teamOptions(selectedId) {
    const none = `<option value=""${!selectedId ? ' selected' : ''}>—</option>`;
    const opts = data.teams.map(t =>
      `<option value="${t.id}"${t.id === selectedId ? ' selected' : ''}>${esc(t.name)}</option>`
    ).join('');
    return none + opts;
  }

  function getSortedInis() {
    if (!sortState.field) return [...data.inis];
    const { field, dir } = sortState;
    return [...data.inis].sort((a, b) => {
      let va, vb;
      if (field === 'team') {
        const ta = findById(data.teams, a.team);
        const tb = findById(data.teams, b.team);
        va = ta ? ta.name.toLowerCase() : 'zzz';
        vb = tb ? tb.name.toLowerCase() : 'zzz';
      } else if (field === 'projektstatus') {
        const PS_ORDER = { ok: 0, kritisch: 1 };
        va = PS_ORDER[a.projektstatus] ?? 9;
        vb = PS_ORDER[b.projektstatus] ?? 9;
      } else if (field === 'status') {
        va = STATUS_ORDER[a.status] ?? 9;
        vb = STATUS_ORDER[b.status] ?? 9;
      } else if (field === 'frist') {
        va = a.frist || 'zzz';
        vb = b.frist || 'zzz';
      } else {
        va = (a[field] || '').toLowerCase();
        vb = (b[field] || '').toLowerCase();
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function updateSortHeaders() {
    document.querySelectorAll('.ini-table th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      const field = th.dataset.sort;
      if (field === sortState.field) {
        th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  function renderInis() {
    const tbody = document.getElementById('ini-body');
    tbody.innerHTML = '';
    updateSortHeaders();
    getSortedInis().forEach(ini => {
      const s = ini.status || 'grey';
      const ps = ini.projektstatus || 'ok';
      const tr = document.createElement('tr');
      tr.className = 'ini-row';
      tr.innerHTML = `
        <td><input class="ini-cell ini-name" value="${esc(ini.name)}" placeholder="Projektname" data-id="${ini.id}" data-field="name" data-source="inis"></td>
        <td>
          <div class="select-wrap">
            <select class="ini-select" data-id="${ini.id}" data-field="team" data-source="inis">
              ${teamOptions(ini.team)}
            </select>
          </div>
        </td>
        <td>
          <div class="status-select-wrap s-${s}">
            <select class="status-select s-${s}" data-id="${ini.id}" data-field="status" data-source="inis">
              <option value="fertig"${s === 'fertig' ? ' selected' : ''}>Fertig</option>
              <option value="yellow"${s === 'yellow' ? ' selected' : ''}>In Arbeit</option>
              <option value="grey"${s === 'grey' ? ' selected' : ''}>Geplant</option>
              <option value="ungeplant"${s === 'ungeplant' ? ' selected' : ''}>Ungeplant</option>
            </select>
          </div>
        </td>
        <td>
          <div class="status-select-wrap ps-${ps}">
            <select class="status-select ps-select ps-${ps}" data-id="${ini.id}" data-field="projektstatus" data-source="inis">
              <option value="ok"${ps === 'ok' ? ' selected' : ''}>Alles gut</option>
              <option value="kritisch"${ps === 'kritisch' ? ' selected' : ''}>Kritisch</option>
            </select>
          </div>
        </td>
        <td><input class="ini-cell" value="${esc(ini.schritt)}" placeholder="Nächster Schritt" data-id="${ini.id}" data-field="schritt" data-source="inis"></td>
        <td><input class="ini-cell" value="${esc(ini.frist)}" placeholder="TT.MM" data-id="${ini.id}" data-field="frist" data-source="inis"></td>
        <td><textarea class="ini-cell ini-notiz" placeholder="Notiz" data-id="${ini.id}" data-field="notiz" data-source="inis" rows="1">${esc(ini.notiz)}</textarea></td>
        <td><button class="del-row-btn" data-action="removeIni" data-id="${ini.id}" title="Löschen">✕</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.ini-notiz').forEach(autoGrow);
  }

  // ── Render: Nicht vergessen ─────────────────────────────────
  function renderNVs() {
    const grid = document.getElementById('nv-grid');
    grid.innerHTML = '';
    data.nvs.forEach(nv => {
      const card = document.createElement('div');
      card.className = 'nv-card';
      card.innerHTML = `
        <div class="card-actions">
          <button class="icon-btn" data-action="removeNV" data-id="${nv.id}" title="Löschen">✕</button>
        </div>
        <input class="nv-title" value="${esc(nv.title)}" placeholder="Thema" data-id="${nv.id}" data-field="title" data-source="nvs">
        <textarea class="nv-body" rows="3" placeholder="Warum wichtig / nächste Aktion..." data-id="${nv.id}" data-field="body" data-source="nvs">${esc(nv.body)}</textarea>
      `;
      grid.appendChild(card);
    });
  }

  // ── Render: All ─────────────────────────────────────────────
  function renderAll() {
    renderKW();
    renderTeams();
    renderInis();
    renderNVs();
  }

  // ── Actions ─────────────────────────────────────────────────
  function addTeam() {
    const id = Date.now();
    data.teams.push({ id, name: 'Neues Team', sub: '', status: 'grey', fokus: '', schritt: '' });
    save(); renderTeams();
  }

  function removeTeam(id) {
    confirmRemove('teams', id, 'name', 'dieses Team', renderTeams);
  }

  function addIni() {
    const id = Date.now();
    data.inis.push({ id, name: '', team: null, status: 'grey', projektstatus: 'ok', schritt: '', frist: '', notiz: '' });
    save(); renderInis();
    setTimeout(() => {
      const inputs = document.querySelectorAll('.ini-name');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
  }

  function removeIni(id) {
    confirmRemove('inis', id, 'name', 'diese Initiative', renderInis);
  }

  function addNV() {
    const id = Date.now();
    data.nvs.push({ id, title: '', body: '' });
    save(); renderNVs();
    setTimeout(() => {
      const inputs = document.querySelectorAll('.nv-title');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
  }

  function removeNV(id) {
    confirmRemove('nvs', id, 'title', 'diesen Eintrag', renderNVs);
  }

  function cycleStatus(id, isTeam) {
    const arr = isTeam ? data.teams : data.inis;
    const item = findById(arr, id);
    if (!item) return;
    const idx = STATUSES.indexOf(item.status);
    item.status = STATUSES[(idx + 1) % STATUSES.length];
    save();
    isTeam ? renderTeams() : renderInis();
  }

  function sortInis(field) {
    if (sortState.field === field) {
      sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.field = field;
      sortState.dir = 'asc';
    }
    renderInis();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const kw = data.kw ? `_KW${data.kw}` : '';
    a.href = url;
    a.download = `cockpit${kw}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function migrateData(parsed) {
    if (!Array.isArray(parsed.teams)) parsed.teams = [];
    if (!Array.isArray(parsed.inis))  parsed.inis  = [];
    if (!Array.isArray(parsed.nvs))   parsed.nvs   = [];
    if (!parsed.kw) parsed.kw = '';

    parsed.teams = parsed.teams.map(t => ({
      id:      t.id      ?? Date.now(),
      name:    t.name    ?? '',
      sub:     t.sub     ?? '',
      status:  t.status  ?? 'grey',
      fokus:   t.fokus   ?? '',
      schritt: t.schritt ?? '',
    }));

    const validStatus = ['fertig', 'yellow', 'grey', 'ungeplant'];
    parsed.inis = parsed.inis.map(i => ({
      id:             i.id             ?? Date.now(),
      name:           i.name           ?? '',
      team:           i.team           ?? null,
      status:         validStatus.includes(i.status) ? i.status : 'grey',
      projektstatus:  i.projektstatus  ?? 'ok',
      schritt:        i.schritt        ?? '',
      frist:          i.frist          ?? '',
      notiz:          i.notiz          ?? '',
    }));

    parsed.nvs = parsed.nvs.map(n => ({
      id:    n.id    ?? Date.now(),
      title: n.title ?? '',
      body:  n.body  ?? '',
    }));

    return parsed;
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (typeof parsed !== 'object' || parsed === null) throw new Error('Ungültiges Format');
          const migrated = migrateData(parsed);
          const summary = `${migrated.teams.length} Teams, ${migrated.inis.length} Initiativen, ${migrated.nvs.length} Nicht-vergessen-Einträge`;
          if (!confirm(`Daten aus \u201E${file.name}\u201C importieren?\n(${summary})\n\nAktuelle Daten werden überschrieben.`)) return;
          data = migrated;
          save();
          renderAll();
        } catch (err) {
          alert('Import fehlgeschlagen: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Event-Delegation ────────────────────────────────────────
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id ? +target.dataset.id : null;

    switch (action) {
      case 'editKW': {
        const v = prompt('Kalenderwoche:', data.kw || '');
        if (v !== null) { data.kw = v.trim(); save(); renderKW(); }
        break;
      }
      case 'addTeam':      addTeam(); break;
      case 'removeTeam':   removeTeam(id); break;
      case 'addIni':       addIni(); break;
      case 'removeIni':    removeIni(id); break;
      case 'addNV':        addNV(); break;
      case 'removeNV':     removeNV(id); break;
      case 'cycleStatus':  cycleStatus(id, target.dataset.team === 'true'); break;
      case 'sortInis':     sortInis(target.dataset.sort); break;
      case 'exportJSON':   exportJSON(); break;
      case 'importJSON':   importJSON(); break;
    }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.tagName === 'SELECT') return;
    if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

    const id = +el.dataset.id;
    const field = el.dataset.field;
    const source = el.dataset.source;

    if (el.classList.contains('ini-notiz')) autoGrow(el);

    const item = findById(data[source], id);
    if (!item) return;
    item[field] = el.value;
    dSave();
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.tagName !== 'SELECT') return;
    if (!el.dataset.field || !el.dataset.id || !el.dataset.source) return;

    const id = +el.dataset.id;
    const field = el.dataset.field;
    const source = el.dataset.source;

    const item = findById(data[source], id);
    if (!item) return;
    item[field] = (field === 'team') ? (el.value ? +el.value : null) : el.value;

    if (source === 'inis' && (field === 'status' || field === 'projektstatus')) {
      renderInis();
      save();
    } else {
      dSave();
    }
  });

  // ── Init ────────────────────────────────────────────────────
  load().then(() => renderAll());
})();
