/**
 * i18n entry point (REQ-HUD-004).
 *
 * Resolves the active locale once at module load (application startup) from
 * `navigator.languages`/`navigator.language`, with no page reload, network
 * request, or manual selection involved. Consumers import `t` for the
 * resolved string dictionary and `activeLocale` for the resolved code.
 */

import { resolveLocale } from './detect';
import { LOCALES, LocaleCode, LocaleStrings } from './locales';

/** Reads the browser's preferred languages, guarded for non-browser test environments. */
function readNavigatorLanguages(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }
  if (navigator.languages && navigator.languages.length > 0) {
    return Array.from(navigator.languages);
  }
  return navigator.language ? [navigator.language] : [];
}

export const activeLocale: LocaleCode = resolveLocale(readNavigatorLanguages());

export const t: LocaleStrings = LOCALES[activeLocale];

export { resolveLocale } from './detect';
export type { LocaleCode, LocaleStrings } from './locales';
