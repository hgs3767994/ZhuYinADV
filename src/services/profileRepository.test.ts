import { describe, expect, it } from 'vitest';
import {
  createGuestProfile,
  GUEST_AVATAR_RECIPE,
  normalizeProfileName,
  validateProfileName
} from './profileRepository';

describe('profile name rules', () => {
  it('allows Chinese, English, numbers, visible symbols and simple emoji', () => {
    expect(validateProfileName('小明_A12★🙂')).toBe('小明_A12★🙂');
  });

  it('requires at least one letter or number', () => {
    expect(() => validateProfileName('!!!★')).toThrow('至少需要');
  });

  it('rejects invisible control characters', () => {
    expect(() => validateProfileName('小\u200B明')).toThrow('看不見');
  });

  it('normalizes case, full-width forms and whitespace for duplicate detection', () => {
    expect(normalizeProfileName(' Ｔｏｍ　 Lin ')).toBe(normalizeProfileName('tom Lin'));
  });

  it('counts user-perceived characters instead of UTF-16 units', () => {
    expect(validateProfileName(`A${'🙂'.repeat(19)}`)).toHaveLength(39);
    expect(() => validateProfileName(`A${'🙂'.repeat(20)}`)).toThrow('最多 20');
  });
});

describe('guest avatar rules', () => {
  it('uses the approved fixed visitor appearance', () => {
    expect(createGuestProfile().avatar).toEqual(GUEST_AVATAR_RECIPE);
    expect(GUEST_AVATAR_RECIPE).toEqual({
      version: 2,
      face: 'round',
      skinTone: 'peach',
      hair: 'c02',
      hairColor: 'brown',
      brows: '01',
      eyes: '02',
      nose: '01',
      mouth: '02',
      glasses: 'none',
      hairAccessory: 'none'
    });
  });
});
