/**
 * Gecachte DOM-Referenzen für statische Elemente.
 * Nur Elemente die permanent im HTML existieren werden hier gecacht.
 * Modale/temporäre Elemente über Lazy-Accessors.
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

  // Detail-Page (ersetzt Modal + Risk-Page)
  detailPage: document.getElementById('detail-page'),
  dpBack: document.getElementById('dp-back'),
  dpName: document.getElementById('dp-name'),
  dpHeaderBadges: document.getElementById('dp-header-badges'),
  dpStammdaten: document.getElementById('dp-stammdaten'),
  dpWsjf: document.getElementById('dp-wsjf'),
  dpRiskCount: document.getElementById('dp-risk-count'),
  dpRiskSummaryBar: document.getElementById('dp-risk-summary-bar'),
  dpRiskList: document.getElementById('dp-risk-list'),
  dpRiskAdd: document.getElementById('dp-risk-add'),

  // Milestone-Detail
  dpMilestoneCount: document.getElementById('dp-milestone-count'),
  dpMilestoneList: document.getElementById('dp-milestone-list'),
  dpMilestoneAdd: document.getElementById('dp-milestone-add'),
  dpMilestoneCopy: document.getElementById('dp-milestone-copy'),

  // Save-Indicators (NodeList → Array)
  saveIndicators: [...document.querySelectorAll('.save-indicator')],

  // Toast
  toast: document.getElementById('toast'),

  // Deep-Link copy button
  dpCopyLink: document.getElementById('dp-copy-link'),

  // Sortable Headers
  sortableHeaders: [...document.querySelectorAll('.ini-table th.sortable')],

  // Layout-Sections (für Detail-Page show/hide)
  header: document.querySelector('header'),
  main: document.querySelector('main'),
  footer: document.querySelector('footer'),

  // Überfällige Meilensteine
  overdueMilestonesSection: document.getElementById('overdue-milestones-section'),
  overdueMilestonesBody: document.getElementById('overdue-milestones-body'),
  overdueMilestonesCount: document.getElementById('overdue-milestones-count'),
};
