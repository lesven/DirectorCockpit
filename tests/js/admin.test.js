import { describe, it, expect } from 'vitest';

/**
 * filterUsers(users, query) — Pure function to filter users by email
 * Returns all users if query < 2 chars, otherwise filters by substring match (case-insensitive)
 */

function filterUsers(users, query) {
  if (!query || query.length < 2) {
    return users;
  }
  const lower = query.toLowerCase();
  return users.filter(u => u.email.toLowerCase().includes(lower));
}

describe('filterUsers()', () => {
  const mockUsers = [
    { id: 1, email: 'alice@example.com', roles: ['ROLE_USER'] },
    { id: 2, email: 'bob.admin@example.com', roles: ['ROLE_USER', 'ROLE_ADMIN'] },
    { id: 3, email: 'charlie@example.org', roles: ['ROLE_USER'] },
  ];

  it('returns all users when query is empty', () => {
    const result = filterUsers(mockUsers, '');
    expect(result).toEqual(mockUsers);
    expect(result).toHaveLength(3);
  });

  it('returns all users when query has only 1 character', () => {
    const result = filterUsers(mockUsers, 'a');
    expect(result).toEqual(mockUsers);
  });

  it('returns filtered results for query with 2+ characters', () => {
    const result = filterUsers(mockUsers, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('alice@example.com');
  });

  it('performs case-insensitive matching', () => {
    const result = filterUsers(mockUsers, 'ALICE');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('alice@example.com');
  });

  it('performs substring matching (not just prefix)', () => {
    const result = filterUsers(mockUsers, 'admin');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('bob.admin@example.com');
  });

  it('returns empty array when no matches found', () => {
    const result = filterUsers(mockUsers, 'nomatch');
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('handles empty users array', () => {
    const result = filterUsers([], 'alice');
    expect(result).toEqual([]);
  });

  it('matches domain part of email', () => {
    const result = filterUsers(mockUsers, 'example.org');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('charlie@example.org');
  });
});
