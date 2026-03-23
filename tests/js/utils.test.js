import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { esc, calcWsjf, findById, debounce, calculateTeamStats, formatTeamStats, calcRiskScore, getRiskLevel, maxRiskScore, generateId } from '../../public/js/utils.js';

describe('esc()', () => {
  it('escapes &, <, >, "', () => {
    expect(esc('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
  });

  it('returns empty string for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(esc('')).toBe('');
  });

  it('passes through plain text unchanged', () => {
    expect(esc('Hello World')).toBe('Hello World');
  });

  it('handles multiple special chars in sequence', () => {
    expect(esc('<<>>')).toBe('&lt;&lt;&gt;&gt;');
  });
});

describe('calcWsjf()', () => {
  it('calculates WSJF correctly', () => {
    const ini = { businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 5 };
    // (8 + 5 + 3) / 5 = 3.2
    expect(calcWsjf(ini)).toBe(3.2);
  });

  it('rounds to one decimal place', () => {
    const ini = { businessValue: 1, timeCriticality: 1, riskReduction: 1, jobSize: 3 };
    // (1 + 1 + 1) / 3 = 1.0
    expect(calcWsjf(ini)).toBe(1);
  });

  it('returns null when businessValue is null', () => {
    expect(calcWsjf({ businessValue: null, timeCriticality: 5, riskReduction: 3, jobSize: 5 })).toBeNull();
  });

  it('returns null when timeCriticality is null', () => {
    expect(calcWsjf({ businessValue: 8, timeCriticality: null, riskReduction: 3, jobSize: 5 })).toBeNull();
  });

  it('returns null when riskReduction is null', () => {
    expect(calcWsjf({ businessValue: 8, timeCriticality: 5, riskReduction: null, jobSize: 5 })).toBeNull();
  });

  it('returns null when jobSize is null', () => {
    expect(calcWsjf({ businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: null })).toBeNull();
  });

  it('returns null when jobSize is 0', () => {
    expect(calcWsjf({ businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: 0 })).toBeNull();
  });

  it('returns null when jobSize is negative', () => {
    expect(calcWsjf({ businessValue: 8, timeCriticality: 5, riskReduction: 3, jobSize: -1 })).toBeNull();
  });

  it('handles large fibonacci values', () => {
    const ini = { businessValue: 21, timeCriticality: 21, riskReduction: 21, jobSize: 1 };
    expect(calcWsjf(ini)).toBe(63);
  });

  it('handles minimum values', () => {
    const ini = { businessValue: 1, timeCriticality: 1, riskReduction: 1, jobSize: 21 };
    // (3) / 21 = 0.142... → 0.1
    expect(calcWsjf(ini)).toBe(0.1);
  });
});

describe('findById()', () => {
  const arr = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
    { id: 3, name: 'C' },
  ];

  it('finds item by id', () => {
    expect(findById(arr, 2)).toEqual({ id: 2, name: 'B' });
  });

  it('returns undefined for non-existent id', () => {
    expect(findById(arr, 999)).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(findById([], 1)).toBeUndefined();
  });

  it('matches exact type (number)', () => {
    expect(findById(arr, '2')).toBeUndefined();
  });
});

describe('debounce()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets timer on repeated calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // reset timer
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a', 'b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });

  it('uses the latest arguments when debounced', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    vi.advanceTimersByTime(50);
    debounced('second');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('second');
  });
});

describe('calculateTeamStats()', () => {
  const initiatives = [
    { id: 1, team: 1, status: 'yellow', projektstatus: 'ok' },
    { id: 2, team: 1, status: 'fertig', projektstatus: 'kritisch' },
    { id: 3, team: 1, status: 'yellow', projektstatus: 'kritisch' },
    { id: 4, team: 2, status: 'yellow', projektstatus: 'ok' },
    { id: 5, team: 2, status: 'grey', projektstatus: 'ok' },
  ];

  it('counts total initiatives for a team', () => {
    const stats = calculateTeamStats(1, initiatives);
    expect(stats.total).toBe(3);
  });

  it('counts critical initiatives', () => {
    const stats = calculateTeamStats(1, initiatives);
    expect(stats.critical).toBe(2);
  });

  it('counts in-progress (yellow) initiatives', () => {
    const stats = calculateTeamStats(1, initiatives);
    expect(stats.inProgress).toBe(2);
  });

  it('returns zeros for team with no initiatives', () => {
    const stats = calculateTeamStats(999, initiatives);
    expect(stats).toEqual({ total: 0, critical: 0, inProgress: 0 });
  });

  it('handles different team with correct counts', () => {
    const stats = calculateTeamStats(2, initiatives);
    expect(stats.total).toBe(2);
    expect(stats.critical).toBe(0);
    expect(stats.inProgress).toBe(1);
  });

  it('returns zeros on empty initiatives array', () => {
    const stats = calculateTeamStats(1, []);
    expect(stats).toEqual({ total: 0, critical: 0, inProgress: 0 });
  });
});

describe('formatTeamStats()', () => {
  it('formats stats with icons', () => {
    const stats = { total: 5, critical: 2, inProgress: 3 };
    const result = formatTeamStats(stats);
    expect(result).toBe('📊 5 • ⚠️ 2 • 🚀 3');
  });

  it('formats zeros correctly', () => {
    const stats = { total: 0, critical: 0, inProgress: 0 };
    const result = formatTeamStats(stats);
    expect(result).toBe('📊 0 • ⚠️ 0 • 🚀 0');
  });

  it('formats large numbers', () => {
    const stats = { total: 100, critical: 45, inProgress: 67 };
    const result = formatTeamStats(stats);
    expect(result).toBe('📊 100 • ⚠️ 45 • 🚀 67');
  });

  it('maintains icon order: total, critical, inProgress', () => {
    const stats = { total: 1, critical: 2, inProgress: 3 };
    const result = formatTeamStats(stats);
    expect(result).toMatch(/📊.*⚠️.*🚀/);
  });
});

describe('calcRiskScore()', () => {
  it('multiplies probability × impact', () => {
    expect(calcRiskScore({ eintrittswahrscheinlichkeit: 3, schadensausmass: 4 })).toBe(12);
  });

  it('returns 1 for minimum values', () => {
    expect(calcRiskScore({ eintrittswahrscheinlichkeit: 1, schadensausmass: 1 })).toBe(1);
  });

  it('returns 25 for maximum values', () => {
    expect(calcRiskScore({ eintrittswahrscheinlichkeit: 5, schadensausmass: 5 })).toBe(25);
  });

  it('defaults to 1 for missing values', () => {
    expect(calcRiskScore({})).toBe(1);
  });
});

describe('getRiskLevel()', () => {
  it('returns Gering for score 1-4', () => {
    expect(getRiskLevel(1).label).toBe('Gering');
    expect(getRiskLevel(4).label).toBe('Gering');
    expect(getRiskLevel(4).css).toBe('risk-low');
  });

  it('returns Mittel for score 5-9', () => {
    expect(getRiskLevel(5).label).toBe('Mittel');
    expect(getRiskLevel(9).label).toBe('Mittel');
    expect(getRiskLevel(9).css).toBe('risk-medium');
  });

  it('returns Hoch for score 10-15', () => {
    expect(getRiskLevel(10).label).toBe('Hoch');
    expect(getRiskLevel(15).label).toBe('Hoch');
    expect(getRiskLevel(15).css).toBe('risk-high');
  });

  it('returns Kritisch for score 16-25', () => {
    expect(getRiskLevel(16).label).toBe('Kritisch');
    expect(getRiskLevel(25).label).toBe('Kritisch');
    expect(getRiskLevel(25).css).toBe('risk-critical');
  });
});

describe('maxRiskScore()', () => {
  const risks = [
    { id: 1, initiative: 10, eintrittswahrscheinlichkeit: 2, schadensausmass: 3 }, // 6
    { id: 2, initiative: 10, eintrittswahrscheinlichkeit: 4, schadensausmass: 5 }, // 20
    { id: 3, initiative: 20, eintrittswahrscheinlichkeit: 1, schadensausmass: 1 }, // 1
  ];

  it('returns highest score for initiative', () => {
    expect(maxRiskScore(risks, 10)).toBe(20);
  });

  it('returns score for single risk', () => {
    expect(maxRiskScore(risks, 20)).toBe(1);
  });

  it('returns null for initiative without risks', () => {
    expect(maxRiskScore(risks, 999)).toBeNull();
  });

  it('returns null for empty risks array', () => {
    expect(maxRiskScore([], 10)).toBeNull();
  });
});

describe('generateId()', () => {
  it('erzeugt numerische IDs', () => {
    const id = generateId();
    expect(typeof id).toBe('number');
    expect(Number.isFinite(id)).toBe(true);
  });

  it('erzeugt 1000 eindeutige IDs ohne Kollision', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) ids.add(generateId());
    expect(ids.size).toBe(1000);
  });

  it('erzeugt IDs die größer als 0 sind', () => {
    expect(generateId()).toBeGreaterThan(0);
  });
});
