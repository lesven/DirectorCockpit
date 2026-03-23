/**
 * Gecachte DOM-Referenzen für statische Elemente.
 * Nur Elemente die permanent im HTML existieren werden hier gecacht.
 * Modale/temporäre Elemente (z.B. wsjf-calc, d-name) über Lazy-Accessors.
 */

export const dom = {
  // Header
  kwBadge: document.getElementById('kw-badge'),
  loadingBanner: document.getElementById('loading-banner'),

  // Filter
  filterName: document.getElementById('filter-name'),
  filterTeam: document.getElementById('filter-team'),
  filterStatus: document.getElementById('filter-status'),
  filterProjektstatus: document.getElementById('filter-projektstatus'),
  filterReset: document.getElementById('filter-reset'),
  iniFilters: document.getElementById('ini-filters'),

  // Grids & Container
  teamsGrid: document.getElementById('teams-grid'),
  iniBody: document.getElementById('ini-body'),
  iniPagination: document.getElementById('ini-pagination'),
  nvGrid: document.getElementById('nv-grid'),

  // Count-Badges
  teamsCount: document.getElementById('teams-count'),
  inisCount: document.getElementById('inis-count'),
  nvCount: document.getElementById('nv-count'),

  // Detail-Modal
  detailBackdrop: document.getElementById('detail-backdrop'),
  detailBody: document.getElementById('detail-body'),
  detailClose: document.getElementById('detail-close'),

  // Risk-Page
  riskPage: document.getElementById('risk-page'),
  riskList: document.getElementById('risk-list'),
  riskIniSummary: document.getElementById('risk-ini-summary'),
  riskPageIniName: document.getElementById('risk-page-ini-name'),
  riskBack: document.getElementById('risk-back'),
  riskAdd: document.getElementById('risk-add'),

  // Save-Indicators (NodeList → Array)
  saveIndicators: [...document.querySelectorAll('.save-indicator')],

  // Sortable Headers
  sortableHeaders: [...document.querySelectorAll('.ini-table th.sortable')],

  // Layout-Sections (für Risk-Page show/hide)
  header: document.querySelector('header'),
  main: document.querySelector('main'),
  footer: document.querySelector('footer'),
};
