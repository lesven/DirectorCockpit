// ─── Milestone HTML Export ───────────────────────────────────

const STATUS_COLORS = {
  offen:          { bg: '#e5e7eb', text: '#374151' },
  in_bearbeitung: { bg: '#fef3c7', text: '#92400e' },
  erledigt:       { bg: '#d1fae5', text: '#065f46' },
  blockiert:      { bg: '#fee2e2', text: '#991b1b' },
};

const STATUS_LABELS = {
  offen:          'Offen',
  in_bearbeitung: 'In Bearbeitung',
  erledigt:       'Erledigt',
  blockiert:      'Blockiert',
};

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFrist(frist) {
  if (!frist) return '—';
  // YYYY-MM-DD → DD.MM.YYYY
  const parts = frist.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return escHtml(frist);
}

export function buildMilestoneTableHtml(milestones, initiativeName) {
  const title = initiativeName ? escHtml(initiativeName) : 'Meilensteine';

  const tdBase = 'padding:8px 12px;border:1px solid #d1d5db;font-family:Arial,Helvetica,sans-serif;font-size:13px;vertical-align:top;';
  const thBase = tdBase + 'background-color:#1e3a5f;color:#ffffff;font-weight:bold;white-space:nowrap;';

  const header = `
    <tr>
      <th style="${thBase}">Aufgabe</th>
      <th style="${thBase}">Beschreibung</th>
      <th style="${thBase}">Owner</th>
      <th style="${thBase}">Frist</th>
      <th style="${thBase}">Status</th>
      <th style="${thBase}">Bemerkung</th>
    </tr>`;

  if (!milestones || milestones.length === 0) {
    const emptyTd = `style="${tdBase}color:#6b7280;font-style:italic;" colspan="6"`;
    return `<table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;">
      <caption style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-align:left;padding-bottom:8px;">${title}</caption>
      <thead>${header}</thead>
      <tbody><tr><td ${emptyTd}>Keine Meilensteine vorhanden.</td></tr></tbody>
    </table>`;
  }

  const sorted = [...milestones].sort((a, b) => {
    if (!a.frist && !b.frist) return 0;
    if (!a.frist) return 1;
    if (!b.frist) return -1;
    return a.frist.localeCompare(b.frist);
  });

  const rows = sorted.map((ms) => {
    const colors = STATUS_COLORS[ms.status] || STATUS_COLORS.offen;
    const statusLabel = STATUS_LABELS[ms.status] || escHtml(ms.status);
    const statusTd = `style="${tdBase}background-color:${colors.bg};color:${colors.text};white-space:nowrap;font-weight:600;"`;
    const beschreibung = ms.beschreibung ? escHtml(ms.beschreibung) : '<span style="color:#9ca3af;">—</span>';

    return `<tr>
      <td style="${tdBase}">${escHtml(ms.aufgabe) || '—'}</td>
      <td style="${tdBase}">${beschreibung}</td>
      <td style="${tdBase}">${escHtml(ms.owner) || '—'}</td>
      <td style="${tdBase};white-space:nowrap;">${formatFrist(ms.frist)}</td>
      <td ${statusTd}>${statusLabel}</td>
      <td style="${tdBase}">${ms.bemerkung ? escHtml(ms.bemerkung) : '<span style="color:#9ca3af;">—</span>'}</td>
    </tr>`;
  }).join('');

  return `<table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;">
    <caption style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-align:left;padding-bottom:8px;">${title}</caption>
    <thead>${header}</thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export async function copyMilestonesToClipboard(milestones, initiativeName) {
  if (!milestones || milestones.length === 0) {
    console.warn('[milestoneExport] Keine Meilensteine zum Kopieren vorhanden.');
  }

  const html = buildMilestoneTableHtml(milestones, initiativeName);

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const blob = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
    } else {
      // Fallback: temporäres Element + execCommand
      const el = document.createElement('div');
      el.innerHTML = html;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      document.body.removeChild(el);
    }
  } catch (err) {
    console.error('[milestoneExport] Fehler beim Kopieren in die Zwischenablage:', err);
    throw err;
  }
}
