import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildMilestoneTableHtml, copyMilestonesToClipboard } from '../../public/js/milestoneExport.js';

// ─── Hilfsfunktion ─────────────────────────────────────────

function makeMilestone(overrides = {}) {
  return {
    id: 1,
    initiative: 100,
    aufgabe: 'Testaufgabe',
    owner: 'Max Mustermann',
    frist: '2026-06-30',
    status: 'offen',
    ...overrides,
  };
}

// ─── buildMilestoneTableHtml ────────────────────────────────

describe('buildMilestoneTableHtml()', () => {
  it('enthält alle 4 Spaltenköpfe', () => {
    const html = buildMilestoneTableHtml([makeMilestone()]);
    expect(html).toContain('Aufgabe');
    expect(html).toContain('Owner');
    expect(html).toContain('Frist');
    expect(html).toContain('Status');
  });

  it('enthält die Initiativenbezeichnung als Caption', () => {
    const html = buildMilestoneTableHtml([makeMilestone()], 'Projekt Alpha');
    expect(html).toContain('Projekt Alpha');
  });

  it('rendert Wert der aufgabe', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ aufgabe: 'Kick-off planen' })]);
    expect(html).toContain('Kick-off planen');
  });

  it('rendert Wert des owner', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ owner: 'Erika Musterfrau' })]);
    expect(html).toContain('Erika Musterfrau');
  });

  it('konvertiert frist von YYYY-MM-DD nach TT.MM.YYYY', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ frist: '2026-06-30' })]);
    expect(html).toContain('30.06.2026');
    expect(html).not.toContain('2026-06-30');
  });

  it('zeigt — wenn frist leer ist', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ frist: '' })]);
    expect(html).toContain('—');
  });

  it('rendert Status "Offen" für status=offen', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'offen' })]);
    expect(html).toContain('Offen');
  });

  it('rendert Status "In Bearbeitung" für status=in_bearbeitung', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'in_bearbeitung' })]);
    expect(html).toContain('In Bearbeitung');
  });

  it('rendert Status "Erledigt" für status=erledigt', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'erledigt' })]);
    expect(html).toContain('Erledigt');
  });

  it('rendert Status "Blockiert" für status=blockiert', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'blockiert' })]);
    expect(html).toContain('Blockiert');
  });

  it('Status-Farbkodierung: offen → grauer Hintergrund', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'offen' })]);
    expect(html).toContain('#e5e7eb');
  });

  it('Status-Farbkodierung: in_bearbeitung → amber Hintergrund', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'in_bearbeitung' })]);
    expect(html).toContain('#fef3c7');
  });

  it('Status-Farbkodierung: erledigt → grüner Hintergrund', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'erledigt' })]);
    expect(html).toContain('#d1fae5');
  });

  it('Status-Farbkodierung: blockiert → roter Hintergrund', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ status: 'blockiert' })]);
    expect(html).toContain('#fee2e2');
  });

  it('sortiert Meilensteine nach frist aufsteigend', () => {
    const ms1 = makeMilestone({ id: 1, aufgabe: 'Spät',  frist: '2026-12-01' });
    const ms2 = makeMilestone({ id: 2, aufgabe: 'Früh',  frist: '2026-03-01' });
    const ms3 = makeMilestone({ id: 3, aufgabe: 'Mitte', frist: '2026-06-01' });
    const html = buildMilestoneTableHtml([ms1, ms2, ms3]);
    const posEarly = html.indexOf('Früh');
    const posMid   = html.indexOf('Mitte');
    const posLate  = html.indexOf('Spät');
    expect(posEarly).toBeLessThan(posMid);
    expect(posMid).toBeLessThan(posLate);
  });

  it('verschiebt Meilensteine ohne frist ans Ende', () => {
    const ms1 = makeMilestone({ id: 1, aufgabe: 'MitFrist',  frist: '2026-01-01' });
    const ms2 = makeMilestone({ id: 2, aufgabe: 'OhneFrist', frist: '' });
    const html = buildMilestoneTableHtml([ms2, ms1]);
    expect(html.indexOf('MitFrist')).toBeLessThan(html.indexOf('OhneFrist'));
  });

  it('zeigt — wenn frist null ist', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ frist: null })]);
    expect(html).toContain('—');
  });

  it('verschiebt Meilensteine mit frist=null ans Ende', () => {
    const ms1 = makeMilestone({ id: 1, aufgabe: 'MitFrist',  frist: '2026-01-01' });
    const ms2 = makeMilestone({ id: 2, aufgabe: 'OhneFrist', frist: null });
    const html = buildMilestoneTableHtml([ms2, ms1]);
    expect(html.indexOf('MitFrist')).toBeLessThan(html.indexOf('OhneFrist'));
  });

  it('gibt leere-Tabelle mit Hinweistext zurück bei keinen Meilensteinen', () => {
    const html = buildMilestoneTableHtml([]);
    expect(html).toContain('<table');
    expect(html).toContain('Keine Meilensteine vorhanden');
  });

  it('gibt leere-Tabelle zurück wenn milestones=null', () => {
    const html = buildMilestoneTableHtml(null);
    expect(html).toContain('Keine Meilensteine vorhanden');
  });

  it('enthält vollständiges border-collapse style (email-kompatibel)', () => {
    const html = buildMilestoneTableHtml([makeMilestone()]);
    expect(html).toContain('border-collapse:collapse');
  });

  it('enthält Inline-CSS in td-Elementen (kein class-Attribut)', () => {
    const html = buildMilestoneTableHtml([makeMilestone()]);
    // Inline-style muss vorhanden sein, class-Attribut darf nicht vorkommen
    expect(html).toMatch(/style="[^"]+padding/);
    expect(html).not.toContain('class=');
  });

  // ─── XSS-Escaping ────────────────────────────────────────

  it('escaped < und > in aufgabe', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ aufgabe: '<script>alert(1)</script>' })]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escaped " in owner', () => {
    const html = buildMilestoneTableHtml([makeMilestone({ owner: 'Max "der Chef" M.' })]);
    expect(html).toContain('Max &quot;der Chef&quot; M.');
  });

  it('escaped Initiative-Name', () => {
    const html = buildMilestoneTableHtml([], '<b>Böses HTML</b>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
  });
});

// ─── copyMilestonesToClipboard ──────────────────────────────

describe('copyMilestonesToClipboard()', () => {
  let originalClipboard;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
  });

  it('ruft navigator.clipboard.write mit einem ClipboardItem auf', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
    });
    global.ClipboardItem = class {
      constructor(data) { this.data = data; }
    };

    await copyMilestonesToClipboard([makeMilestone()], 'Test-Ini');

    expect(writeMock).toHaveBeenCalledTimes(1);
    const [items] = writeMock.mock.calls[0];
    expect(items[0]).toBeInstanceOf(global.ClipboardItem);
  });

  it('übergibt HTML-Blob mit korrektem MIME-Type', async () => {
    let capturedItem = null;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: vi.fn(async (items) => { capturedItem = items[0]; }),
      },
      configurable: true,
    });
    global.ClipboardItem = class {
      constructor(data) { this.data = data; }
    };

    await copyMilestonesToClipboard([makeMilestone()], '');

    expect(capturedItem.data['text/html']).toBeInstanceOf(Blob);
    expect(capturedItem.data['text/html'].type).toBe('text/html');
  });

  it('wirft Fehler wenn clipboard.write einen Fehler wirft', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      configurable: true,
    });
    global.ClipboardItem = class {
      constructor(data) { this.data = data; }
    };

    await expect(copyMilestonesToClipboard([makeMilestone()], '')).rejects.toThrow('Permission denied');
    errorSpy.mockRestore();
  });

  it('loggt Warnung wenn Meilensteine-Liste leer ist', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
    });
    global.ClipboardItem = class {
      constructor(data) { this.data = data; }
    };

    await copyMilestonesToClipboard([], '');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[milestoneExport]'));
    warnSpy.mockRestore();
  });
});
