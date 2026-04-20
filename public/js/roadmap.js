/**
 * roadmap.js – IT Roadmap Timeline Visualisierung.
 * Read-only Ansicht der Initiativen/Meilensteine als Gantt-Timeline.
 * Daten werden über store.js aus /api/cockpit geladen.
 */
import { data, load } from './store.js';
import { esc } from './utils.js';
import { initAuth } from './auth.js';

// ─── Konstanten ──────────────────────────────────────────────

const TCOLS = {1:'var(--ac)', 2:'var(--gr)', 3:'var(--am)', 4:'var(--vi)'};
const TIPS = {};
let TIP_ID = 0;

// ─── Status-Farben & Labels (roadmap-spezifisch) ────────────

export function sc(s) {
  return {fertig:'var(--gr)',yellow:'var(--am)',red:'var(--re)',ungeplant:'var(--gy)',green:'var(--gr)',grey:'var(--gy)'}[s] || 'var(--gy)';
}

export function sbg(s) {
  return {fertig:'var(--gr-bg)',yellow:'var(--am-bg)',red:'var(--re-bg)',ungeplant:'var(--gy-bg)',green:'var(--gr-bg)',grey:'var(--gy-bg)'}[s] || 'var(--gy-bg)';
}

export function mc(s) {
  return s === 'erledigt' ? 'var(--gr)' : s === 'in_bearbeitung' ? 'var(--am)' : 'var(--gy)';
}

export function sl(s) {
  return {fertig:'Fertig',yellow:'In Arbeit',red:'Kritisch',ungeplant:'Ungeplant',green:'OK',grey:'Geplant'}[s] || s;
}

export function ml(s) {
  return {erledigt:'Erledigt',in_bearbeitung:'In Bearb.',offen:'Offen'}[s] || s;
}

// ─── Datums-Hilfsfunktionen ─────────────────────────────────

export function fd(d) {
  return d ? new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'2-digit'}) : '\u2013';
}

export function addM(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function som(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function diffM(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
}

// ─── Tooltip-System ─────────────────────────────────────────

export function reg(html) {
  const id = ++TIP_ID;
  TIPS[id] = html;
  return id;
}

export function resetTips() {
  Object.keys(TIPS).forEach(k => delete TIPS[k]);
  TIP_ID = 0;
}

export function getTips() { return TIPS; }

function initTooltips() {
  const tipEl = document.getElementById('tip');
  if (!tipEl) return;
  let tipTimer;

  document.addEventListener('mousemove', e => {
    if (tipEl.classList.contains('show')) {
      let x = e.clientX + 16, y = e.clientY - 8;
      if (x + tipEl.offsetWidth > window.innerWidth) x = e.clientX - tipEl.offsetWidth - 10;
      if (y + tipEl.offsetHeight > window.innerHeight) y = window.innerHeight - tipEl.offsetHeight - 8;
      tipEl.style.left = x + 'px';
      tipEl.style.top  = y + 'px';
    }
  });

  function showTip(id) {
    clearTimeout(tipTimer);
    tipEl.innerHTML = TIPS[id] || '';
    tipEl.classList.add('show');
  }

  function hideTip() {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tipEl.classList.remove('show'), 80);
  }

  document.addEventListener('mouseenter', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el) showTip(+el.dataset.tip);
  }, true);

  document.addEventListener('mouseleave', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el) hideTip();
  }, true);
}

function attachTips() {
  // Tips are now handled by event delegation in initTooltips()
  // This function is kept for backwards compatibility
}

// ─── Timeline-Berechnung ────────────────────────────────────

function calcTimeRange(inits, msMap) {
  const today = new Date();
  today.setHours(0,0,0,0);
  let minD = new Date(today);
  minD.setMonth(minD.getMonth() - 1);
  let maxD = new Date(today);
  maxD.setMonth(maxD.getMonth() + 4);

  inits.forEach(init => {
    if (init.frist) { const d = new Date(init.frist); if (d > maxD) maxD = d; if (d < minD) minD = d; }
    (msMap[init.id] || []).forEach(m => {
      if (m.frist) { const d = new Date(m.frist); if (d > maxD) maxD = d; if (d < minD) minD = d; }
    });
  });

  minD = som(minD);
  maxD = addM(som(maxD), 1);
  const nMo = diffM(minD, maxD) + 1;
  const months = [];
  for (let i = 0; i < nMo; i++) months.push(addM(minD, i));
  const span = maxD - minD;

  return { today, minD, maxD, months, span };
}

function buildMonthHeaders(months, today) {
  return months.map(m => {
    const cur = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
    return '<div class="mo' + (cur ? ' cur' : '') + '">'
      + m.toLocaleDateString('de-DE', {month:'short',year:'2-digit'}) + '</div>';
  }).join('');
}

function buildGridLines(months, minD, span) {
  return months.slice(1).map(m =>
    '<div class="gl" style="left:' + ((m - minD) / span * 100).toFixed(2) + '%"></div>'
  ).join('');
}

function buildTodayLine(today, minD, span) {
  const tPct = (today - minD) / span * 100;
  return (tPct >= 0 && tPct <= 100)
    ? '<div class="tln" style="left:' + tPct.toFixed(2) + '%"></div>' : '';
}

function buildMilestoneDots(msList, minD, span) {
  return msList.map(m => {
    const d = new Date(m.frist);
    const pct = (d - minD) / span * 100;
    if (pct < -3 || pct > 103) return '';
    const today2 = new Date(); today2.setHours(0,0,0,0);
    const overdue = m.status !== 'erledigt' && new Date(m.frist) < today2;
    const c = overdue ? 'var(--re)' : mc(m.status);
    const tipHtml = '<div class="tt">' + esc(m.aufgabe || '(kein Titel)') + '</div>'
      + '<div class="ts">&#128197; ' + fd(m.frist)
      + (m.owner ? ' &nbsp;&middot;&nbsp; &#128100; ' + esc(m.owner) : '') + '</div>'
      + (overdue ? '<div style="color:var(--re);margin-top:3px;font-size:11px;font-weight:700">&#9888; Verzug</div>'
        : (m.status !== 'offen' ? '<div style="color:'+c+';margin-top:3px;font-size:11px">&#9679; '+ml(m.status)+'</div>' : ''))
      + (m.bemerkung ? '<div style="margin-top:5px;color:var(--mu);font-size:11px">'+esc(m.bemerkung)+'</div>' : '');
    const tid = reg(tipHtml);
    const msCls = overdue ? 'ms overdue' : 'ms';
    return '<div class="' + msCls + '" data-tip="' + tid + '" style="left:' + pct.toFixed(2)
      + '%;background:' + c + ';border-color:' + c + '"></div>';
  }).join('');
}

function buildFristDiamond(init, minD, span) {
  if (!init.frist) return '';
  const d2 = new Date(init.frist);
  const p2 = (d2 - minD) / span * 100;
  if (p2 < -3 || p2 > 103) return '';
  const _tod = new Date(); _tod.setHours(0,0,0,0);
  const fristOvd = new Date(init.frist) < _tod;
  const col = sc(init.status);
  const fcol = fristOvd ? 'var(--re)' : col;
  const fcls = fristOvd ? 'fr overdue-fr' : 'fr';
  const tipHtml = '<div class="tt">&#127937; Zieldatum Initiative</div>'
    + '<div class="ts">&#128197; ' + fd(init.frist) + '</div>'
    + (fristOvd ? '<div style="color:var(--re);margin-top:3px;font-size:11px;font-weight:700">&#9888; Verzug</div>' : '')
    + (init.notiz ? '<div style="margin-top:5px;font-size:11px;color:var(--di)">'+esc(init.notiz)+'</div>' : '');
  const tid = reg(tipHtml);
  return '<div class="' + fcls + '" data-tip="' + tid + '" style="left:' + p2.toFixed(2)
    + '%;background:' + fcol + ';border-color:' + fcol + '"></div>';
}

function buildLegend() {
  return '<div class="leg">'
    + '<span style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)">Meilensteine:</span>'
    + '<div class="li"><span class="ldot" style="background:var(--gr);border-color:var(--gr)"></span>Erledigt</div>'
    + '<div class="li"><span class="ldot" style="background:var(--am);border-color:var(--am)"></span>In Bearb.</div>'
    + '<div class="li"><span class="ldot" style="background:var(--gy);border-color:var(--gy)"></span>Offen</div>'
    + '<span style="width:1px;height:14px;background:var(--bd);flex-shrink:0"></span>'
    + '<div class="li"><span class="ldia" style="border-color:var(--di)"></span>Zieldatum</div>'
    + '<div class="li" style="margin-left:auto">'
      + '<span style="display:inline-block;width:12px;height:2px;background:var(--to);opacity:.6;margin-right:6px;vertical-align:middle"></span>'
      + 'Heute</div>'
    + '</div>';
}

function sortByFrist(inits) {
  return [...inits].sort((a, b) => {
    if (!a.frist && !b.frist) return 0;
    if (!a.frist) return 1;
    if (!b.frist) return -1;
    return new Date(a.frist) - new Date(b.frist);
  });
}

// ─── Panel-Builder ──────────────────────────────────────────

export function buildPanel(d, team, msMap, km) {
  const inits = d.initiatives.filter(i => i.team === team.id && i.status !== 'fertig');
  if (!inits.length) return '<div class="empty">Keine Initiativen</div>';

  const { today, minD, months, span } = calcTimeRange(inits, msMap);
  const moHTML = buildMonthHeaders(months, today);
  const grids = buildGridLines(months, minD, span);
  const todayLn = buildTodayLine(today, minD, span);

  const rows = sortByFrist(inits).map(init => {
    const msList = (msMap[init.id] || []).filter(m => m.frist);
    const col = sc(init.status), bg = sbg(init.status);
    const cust = init.customer ? (km[init.customer] || '') : '';
    const dots = buildMilestoneDots(msList, minD, span);
    const fristEl = buildFristDiamond(init, minD, span);

    const custEl = cust
      ? '<span class="badge" style="background:var(--surf2);color:var(--mu);border:1px solid var(--bd)">'+esc(cust)+'</span>' : '';
    const schrEl = init.schritt
      ? '<div class="rs" title="'+esc(init.schritt)+'">&rarr; '+esc(init.schritt)+'</div>' : '';

    return '<div class="row">'
      + '<div class="rl">'
        + '<div class="rn">'+esc(init.name)+'</div>'
        + '<div class="rm"><span class="badge" style="background:'+bg+';color:'+col+'">'+sl(init.status)+'</span>'+custEl+'</div>'
        + schrEl
      + '</div>'
      + '<div class="rtl">'+grids+todayLn+dots+fristEl+'</div>'
      + '</div>';
  }).join('');

  return '<div class="tlw">'
    + '<div class="tlh">'
      + '<div class="tlhl">'+esc(team.name)+'&nbsp;&middot;&nbsp;'+inits.length+' Initiativen</div>'
      + '<div class="mos">'+moHTML+'</div>'
    + '</div>'
    + rows
    + buildLegend()
  + '</div>';
}

export function buildCustomerPanel(d, kunde, msMap, teamMap) {
  const inits = d.initiatives.filter(i => i.customer === kunde.id && i.status !== 'fertig');
  if (!inits.length) return '<div class="empty">Keine Initiativen</div>';

  const { today, minD, months, span } = calcTimeRange(inits, msMap);
  const moHTML = buildMonthHeaders(months, today);
  const grids = buildGridLines(months, minD, span);
  const todayLn = buildTodayLine(today, minD, span);
  const CHIP_COLS = {1:['var(--ac)','var(--ac-bg)'],2:['var(--gr)','var(--gr-bg)'],3:['var(--am)','var(--am-bg)'],4:['var(--vi)','rgba(167,139,250,.12)']};

  const rows = sortByFrist(inits).map(init => {
    const msList = (msMap[init.id] || []).filter(m => m.frist);
    const col = sc(init.status), bg = sbg(init.status);
    const [tc, tbg] = CHIP_COLS[init.team] || ['var(--gy)','var(--gy-bg)'];
    const teamName = teamMap[init.team] || '\u2013';
    const dots = buildMilestoneDots(msList, minD, span);
    const fristEl = buildFristDiamond(init, minD, span);

    const teamChip = '<span class="team-chip" style="color:'+tc+';background:'+tbg+';border-color:'+tc+'">'+esc(teamName)+'</span>';
    const schrEl = init.schritt
      ? '<div class="rs" title="'+esc(init.schritt)+'">&rarr; '+esc(init.schritt)+'</div>' : '';

    return '<div class="row">'
      + '<div class="rl">'
        + '<div class="rn">'+esc(init.name)+'</div>'
        + '<div class="rm"><span class="badge" style="background:'+bg+';color:'+col+'">'+sl(init.status)+'</span>'+teamChip+'</div>'
        + schrEl
      + '</div>'
      + '<div class="rtl">'+grids+todayLn+dots+fristEl+'</div>'
      + '</div>';
  }).join('');

  return '<div class="tlw">'
    + '<div class="tlh">'
      + '<div class="tlhl">'+esc(kunde.name)+' &nbsp;&middot;&nbsp; '+inits.length+' Initiativen</div>'
      + '<div class="mos">'+moHTML+'</div>'
    + '</div>'
    + rows
    + buildLegend()
  + '</div>';
}

// ─── Haupt-Render ───────────────────────────────────────────

export function render(d) {
  resetTips();
  document.getElementById('kw').textContent = 'KW ' + d.kw;
  const tabsEl = document.getElementById('tabs');
  const mainEl = document.getElementById('main');
  tabsEl.innerHTML = '';
  mainEl.innerHTML = '';

  const msMap = {};
  (d.milestones || []).forEach(m => {
    if (!msMap[m.initiative]) msMap[m.initiative] = [];
    msMap[m.initiative].push(m);
  });
  const km = {};
  (d.kunden || []).forEach(k => { km[k.id] = k.name; });
  const teamMap = {};
  (d.teams || []).forEach(t => { teamMap[t.id] = t.name; });

  function makeTab(label, pid, col, isFirst) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (isFirst ? ' on' : '');
    tab.dataset.pid = pid;
    const pip = document.createElement('span');
    pip.className = 'pip';
    pip.style.background = col;
    tab.appendChild(pip);
    tab.appendChild(document.createTextNode(label));
    tab.onclick = () => activate(tab.dataset.pid);
    return tab;
  }

  // ── Teams ──
  const teamLabel = document.createElement('span');
  teamLabel.className = 'tab-group-label';
  teamLabel.textContent = 'Teams';
  tabsEl.appendChild(teamLabel);

  d.teams.forEach((team, i) => {
    const col = TCOLS[team.id] || 'var(--gy)';
    tabsEl.appendChild(makeTab(team.name, 'p-t-' + team.id, col, i === 0));
    const pnl = document.createElement('div');
    pnl.className = 'pnl' + (i === 0 ? ' on' : '');
    pnl.id = 'p-t-' + team.id;
    pnl.innerHTML = buildPanel(d, team, msMap, km);
    mainEl.appendChild(pnl);
  });

  // ── Separator ──
  const sep = document.createElement('span');
  sep.className = 'tab-sep';
  tabsEl.appendChild(sep);

  // ── Kunden ──
  const kundeLabel = document.createElement('span');
  kundeLabel.className = 'tab-group-label';
  kundeLabel.textContent = 'Kunden';
  tabsEl.appendChild(kundeLabel);

  const kundenMitInits = (d.kunden || []).filter(k =>
    d.initiatives.some(i => i.customer === k.id)
  );

  kundenMitInits.forEach(kunde => {
    tabsEl.appendChild(makeTab(kunde.name, 'p-k-' + kunde.id, 'var(--to)', false));
    const pnl = document.createElement('div');
    pnl.className = 'pnl';
    pnl.id = 'p-k-' + kunde.id;
    pnl.innerHTML = buildCustomerPanel(d, kunde, msMap, teamMap);
    mainEl.appendChild(pnl);
  });

  attachTips();
}

function activate(pid) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.pid === pid));
  document.querySelectorAll('.pnl').forEach(p => p.classList.toggle('on', p.id === pid));
}

// ─── Init ───────────────────────────────────────────────────

export async function init() {
  initTooltips();
  await initAuth();
  await load();
  render(data);
}

// Auto-init wenn nicht als Test geladen
if (typeof import.meta.env === 'undefined' || import.meta.env.MODE !== 'test') {
  init();
}
