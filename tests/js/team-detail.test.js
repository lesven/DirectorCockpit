import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../../public/js/config.js', () => ({
  CONFIG: {
    ENTITY_URLS: { teams: '/api/teams' },
    USERS_SEARCH_URL: '/api/users',
    TEAM_SHARES_URL: (id) => `/api/teams/${id}/shares`,
    INITIATIVE_SHARES_URL: (id) => `/api/initiatives/${id}/shares`,
    LOGIN_PAGE: '/login.html',
    SAVE_DEBOUNCE_MS: 0,
  },
}));

vi.mock('../../public/js/utils.js', () => ({
  esc: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  debounce: (fn) => fn,
  findById: (arr, id) => arr.find((x) => x.id === id),
}));

vi.mock('../../public/js/routing.js', () => ({
  setHash: vi.fn(),
  clearHash: vi.fn(),
}));

vi.mock('../../public/js/store.js', () => ({
  data: { teams: [{ id: 1, name: 'Test Team', status: 'grey', fokus: '', schritt: '', createdBy: 99 }] },
}));

// Setup DOM before importing module
function setupDOM() {
  document.body.innerHTML = `
    <header></header>
    <main></main>
    <footer></footer>
    <section id="detail-page" hidden></section>
    <section id="team-detail-page" hidden>
      <div id="tdp-save-ind" class="save-indicator"></div>
      <button id="tdp-back"></button>
      <input id="tdp-name">
      <div id="tdp-stammdaten"></div>
      <div id="tdp-shares-list"></div>
      <span id="tdp-shares-count"></span>
      <div id="tdp-shares-add" hidden></div>
      <input id="tdp-user-search">
      <ul id="tdp-user-suggestions" hidden></ul>
    </section>
  `;
}

vi.mock('../../public/js/dom.js', () => {
  const dom = {};
  return {
    get dom() {
      return {
        header: document.querySelector('header'),
        main: document.querySelector('main'),
        footer: document.querySelector('footer'),
        detailPage: document.getElementById('detail-page'),
        teamDetailPage: document.getElementById('team-detail-page'),
        tdpBack: document.getElementById('tdp-back'),
        tdpName: document.getElementById('tdp-name'),
        tdpStammdaten: document.getElementById('tdp-stammdaten'),
        tdpSharesList: document.getElementById('tdp-shares-list'),
        tdpSharesCount: document.getElementById('tdp-shares-count'),
        tdpSharesAdd: document.getElementById('tdp-shares-add'),
        tdpUserSearch: document.getElementById('tdp-user-search'),
        tdpUserSuggestions: document.getElementById('tdp-user-suggestions'),
      };
    },
  };
});

let openTeamDetail, closeTeamDetail, addShare, removeShare;

beforeEach(async () => {
  vi.resetModules();
  setupDOM();
  // Re-apply mocks after reset
  vi.mock('../../public/js/config.js', () => ({
    CONFIG: {
      ENTITY_URLS: { teams: '/api/teams' },
      USERS_SEARCH_URL: '/api/users',
      TEAM_SHARES_URL: (id) => `/api/teams/${id}/shares`,
      INITIATIVE_SHARES_URL: (id) => `/api/initiatives/${id}/shares`,
      LOGIN_PAGE: '/login.html',
      SAVE_DEBOUNCE_MS: 0,
    },
  }));
  const mod = await import('../../public/js/team-detail.js');
  openTeamDetail = mod.openTeamDetail;
  closeTeamDetail = mod.closeTeamDetail;
  addShare = mod.addShare;
  removeShare = mod.removeShare;
});

describe('closeTeamDetail()', () => {
  it('zeigt Hauptlayout wieder an', () => {
    const page = document.getElementById('team-detail-page');
    page.hidden = false;
    document.querySelector('header').hidden = true;
    document.querySelector('main').hidden = true;
    document.querySelector('footer').hidden = true;

    closeTeamDetail({ pushState: false });

    expect(page.hidden).toBe(true);
    expect(document.querySelector('header').hidden).toBe(false);
    expect(document.querySelector('main').hidden).toBe(false);
    expect(document.querySelector('footer').hidden).toBe(false);
  });
});

describe('addShare()', () => {
  it('zeigt Fehler bei 409 Conflict', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
    });

    const ind = document.getElementById('tdp-save-ind');
    await addShare(1, 5, 'target@test.de');

    // Indicator should show error
    expect(ind.textContent).toMatch(/Bereits geteilt/);
  });

  it('aktualisiert Shares-Liste nach erfolgreichem Hinzufügen', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 5, email: 'target@test.de' }),
    });

    await addShare(1, 5, 'target@test.de');

    const sharesList = document.getElementById('tdp-shares-list');
    expect(sharesList.innerHTML).toContain('target@test.de');
  });
});

describe('removeShare()', () => {
  it('ruft DELETE Endpoint auf nach Bestätigung', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.confirm = vi.fn().mockReturnValue(true);

    await removeShare(1, 5);

    expect(fetch).toHaveBeenCalledWith('/api/teams/1/shares/5', expect.objectContaining({ method: 'DELETE' }));
  });

  it('tut nichts wenn confirm abgelehnt', async () => {
    global.fetch = vi.fn();
    global.confirm = vi.fn().mockReturnValue(false);

    await removeShare(1, 5);

    expect(fetch).not.toHaveBeenCalled();
  });
});
