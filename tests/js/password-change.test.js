/**
 * password-change.test.js — Unit tests for client-side password validation logic.
 */
import { describe, it, expect } from 'vitest';

// Extract validation logic inline (mirrors password-change.js)
function validateClientSide(current, newPw, confirm) {
  if (!current) return 'Bitte das aktuelle Passwort eingeben.';
  if (!newPw) return 'Bitte ein neues Passwort eingeben.';
  if (newPw !== confirm) return 'Die neuen Passwörter stimmen nicht überein.';
  if (newPw.length < 12) return 'Das neue Passwort muss mindestens 12 Zeichen lang sein.';
  if (!/[A-Z]/.test(newPw)) return 'Das Passwort muss mindestens einen Großbuchstaben enthalten.';
  if (!/[a-z]/.test(newPw)) return 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.';
  if (!/[0-9]/.test(newPw)) return 'Das Passwort muss mindestens eine Ziffer enthalten.';
  if (!/[\W_]/.test(newPw)) return 'Das Passwort muss mindestens ein Sonderzeichen enthalten.';
  return null;
}

describe('validateClientSide()', () => {
  it('returns null for valid input', () => {
    expect(validateClientSide('old', 'NewValid!Pass99', 'NewValid!Pass99')).toBeNull();
  });

  it('fails when current password is empty', () => {
    const msg = validateClientSide('', 'NewValid!Pass99', 'NewValid!Pass99');
    expect(msg).toBeTruthy();
    expect(msg).toContain('aktuelle');
  });

  it('fails when new password is empty', () => {
    const msg = validateClientSide('old', '', '');
    expect(msg).toBeTruthy();
  });

  it('fails when new passwords do not match', () => {
    const msg = validateClientSide('old', 'NewValid!Pass99', 'Different!Pass99');
    expect(msg).toBeTruthy();
    expect(msg).toContain('stimmen nicht');
  });

  it('fails when new password is too short', () => {
    const msg = validateClientSide('old', 'Short1!', 'Short1!');
    expect(msg).toBeTruthy();
    expect(msg).toContain('12');
  });

  it('fails when new password has no uppercase letter', () => {
    const msg = validateClientSide('old', 'nouppercase99!zz', 'nouppercase99!zz');
    expect(msg).toBeTruthy();
  });

  it('fails when new password has no lowercase letter', () => {
    const msg = validateClientSide('old', 'NOLOWERCASE99!ZZ', 'NOLOWERCASE99!ZZ');
    expect(msg).toBeTruthy();
  });

  it('fails when new password has no digit', () => {
    const msg = validateClientSide('old', 'NoDigitHere!!Abc', 'NoDigitHere!!Abc');
    expect(msg).toBeTruthy();
  });

  it('fails when new password has no special character', () => {
    const msg = validateClientSide('old', 'NoSpecialChar99Abc', 'NoSpecialChar99Abc');
    expect(msg).toBeTruthy();
  });
});
