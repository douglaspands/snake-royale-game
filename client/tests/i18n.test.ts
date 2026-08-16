/**
 * Unit tests for REQ-HUD-004 (Localized UI Text by OS Language).
 *
 * `resolveLocale` is a pure function — no DOM/`navigator` access required —
 * so these scenarios exercise the D1 resolution order directly.
 */

import { describe, it, expect } from 'vitest';
import { resolveLocale } from '../src/i18n/detect';
import { LOCALES } from '../src/i18n/locales';

describe('i18n locale resolution (REQ-HUD-004)', () => {
  it('Scenario: browser reports a supported language (pt-BR) resolves to Brazilian Portuguese', () => {
    expect(resolveLocale(['pt-BR'])).toBe('pt-BR');
  });

  it('Scenario: browser reports an unsupported language (fr-FR) falls back to en-US', () => {
    expect(resolveLocale(['fr-FR'])).toBe('en-US');
  });

  it('Scenario: a regional variant (es-MX) matches its base language (es)', () => {
    expect(resolveLocale(['es-MX'])).toBe('es');
  });

  it('defaults to en-US when given an empty language list', () => {
    expect(resolveLocale([])).toBe('en-US');
  });

  it('matches exact codes before falling through to base-language matching', () => {
    // en-US is an exact match candidate ahead of a pt base match later in the list.
    expect(resolveLocale(['en-US', 'pt'])).toBe('en-US');
  });

  it('walks the full list for an exact match before trying base-language matching', () => {
    // fr-FR has no exact or base match; es-MX matches by base language.
    expect(resolveLocale(['fr-FR', 'es-MX'])).toBe('es');
  });

  it('is case-insensitive when matching exact locale codes', () => {
    expect(resolveLocale(['PT-br'])).toBe('pt-BR');
  });

  it('matches a bare base language code (pt) to its supported locale (pt-BR)', () => {
    expect(resolveLocale(['pt'])).toBe('pt-BR');
  });

  it('matches an unsupported English regional variant (en-GB) to en-US', () => {
    expect(resolveLocale(['en-GB'])).toBe('en-US');
  });

  it('ignores falsy entries in the language list', () => {
    expect(resolveLocale(['', 'es'])).toBe('es');
  });

  it('exposes a complete dictionary for every supported locale', () => {
    const keys = Object.keys(LOCALES['en-US']).sort();
    expect(Object.keys(LOCALES['pt-BR']).sort()).toEqual(keys);
    expect(Object.keys(LOCALES['es']).sort()).toEqual(keys);
  });
});
