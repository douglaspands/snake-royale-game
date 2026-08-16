/**
 * Locale resolution (REQ-HUD-004, Decision D1).
 *
 * Pure, DOM-free function so it is unit-testable without `navigator`/`document`.
 * Callers pass in the ordered language list (typically `navigator.languages`
 * falling back to `[navigator.language]`) rather than this module reaching
 * into globals itself.
 */

import { LocaleCode } from './locales';

const SUPPORTED_LOCALES: LocaleCode[] = ['pt-BR', 'es', 'en-US'];

/** Base language -> supported locale, used once no exact code match is found. */
const BASE_LANGUAGE_TO_LOCALE: Record<string, LocaleCode> = {
  pt: 'pt-BR',
  es: 'es',
  en: 'en-US',
};

const DEFAULT_LOCALE: LocaleCode = 'en-US';

function baseLanguage(code: string): string {
  return code.split('-')[0].toLowerCase();
}

/**
 * Resolves the active locale from an ordered list of BCP-47 language tags.
 *
 * Order of resolution (D1): walk the list once looking for an exact
 * (case-insensitive) match against a supported locale code; if none is
 * found, walk the list again matching by base language; otherwise fall
 * back to `en-US`.
 */
export function resolveLocale(languages: string[]): LocaleCode {
  const candidates = languages.filter((lang): lang is string => Boolean(lang));

  for (const lang of candidates) {
    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lang.toLowerCase());
    if (exact) {
      return exact;
    }
  }

  for (const lang of candidates) {
    const matched = BASE_LANGUAGE_TO_LOCALE[baseLanguage(lang)];
    if (matched) {
      return matched;
    }
  }

  return DEFAULT_LOCALE;
}
