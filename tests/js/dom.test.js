import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let dom;

beforeAll(async () => {
  // cockpit.html ins jsdom laden
  const html = readFileSync(resolve(__dirname, '../../public/cockpit.html'), 'utf-8');
  document.documentElement.innerHTML = html;

  // dom.js importieren nachdem HTML im DOM ist
  const mod = await import('../../public/js/dom.js');
  dom = mod.dom;
});

describe('dom – gecachte statische Elemente', () => {
  const staticIds = [
    ['kwBadge', 'kw-badge'],
    ['loadingBanner', 'loading-banner'],
    ['filterName', 'filter-name'],
    ['filterTeam', 'filter-team'],
    ['filterStatus', 'filter-status'],
    ['filterProjektstatus', 'filter-projektstatus'],
    ['filterReset', 'filter-reset'],
    ['iniFilters', 'ini-filters'],
    ['teamsGrid', 'teams-grid'],
    ['iniBody', 'ini-body'],
    ['iniPagination', 'ini-pagination'],
    ['nvGrid', 'nv-grid'],
    ['teamsCount', 'teams-count'],
    ['inisCount', 'inis-count'],
    ['nvCount', 'nv-count'],
    ['detailPage',       'detail-page'],
    ['dpBack',           'dp-back'],
    ['dpName',           'dp-name'],
    ['dpHeaderBadges',   'dp-header-badges'],
    ['dpStammdaten',     'dp-stammdaten'],
    ['dpWsjf',           'dp-wsjf'],
    ['dpRiskCount',      'dp-risk-count'],
    ['dpRiskSummaryBar', 'dp-risk-summary-bar'],
    ['dpRiskList',       'dp-risk-list'],
    ['dpRiskAdd',        'dp-risk-add'],
  ];

  it.each(staticIds)('dom.%s referenziert #%s', (prop, id) => {
    expect(dom[prop]).not.toBeNull();
    expect(dom[prop].id).toBe(id);
  });
});

describe('dom – gecachte NodeLists', () => {
  it('saveIndicators enthält alle .save-indicator Elemente', () => {
    expect(dom.saveIndicators.length).toBeGreaterThanOrEqual(1);
    dom.saveIndicators.forEach((el) => {
      expect(el.classList.contains('save-indicator')).toBe(true);
    });
  });

  it('sortableHeaders enthält alle sortierbaren Spaltenköpfe', () => {
    expect(dom.sortableHeaders.length).toBeGreaterThanOrEqual(1);
    dom.sortableHeaders.forEach((el) => {
      expect(el.classList.contains('sortable')).toBe(true);
    });
  });
});

describe('dom – Layout-Sections', () => {
  it('header ist vorhanden', () => {
    expect(dom.header).not.toBeNull();
    expect(dom.header.tagName).toBe('HEADER');
  });

  it('main ist vorhanden', () => {
    expect(dom.main).not.toBeNull();
    expect(dom.main.tagName).toBe('MAIN');
  });

  it('footer ist vorhanden', () => {
    expect(dom.footer).not.toBeNull();
    expect(dom.footer.tagName).toBe('FOOTER');
  });
});
