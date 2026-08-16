## ADDED Requirements

### Requirement: REQ-HUD-004 Localized UI Text by OS Language
The client MUST detect the host operating system's or browser's preferred language via `navigator.language` and `navigator.languages` once at startup, and MUST render all user-facing UI text — the nickname modal, HUD labels, the respawn screen, and the page title — in the matching supported locale: Brazilian Portuguese (`pt-BR`), Spanish (`es`), or U.S. English (`en-US`). The client MUST fall back to `en-US` when the detected language matches none of the three supported locales. The client MUST NOT require a page reload, network request, or manual selection to apply the detected locale.

#### Scenario: Browser reports a supported language
- **GIVEN** `navigator.language` reports `pt-BR`
- **WHEN** the application loads
- **THEN** the nickname modal, HUD labels, respawn screen, and page title all render in Brazilian Portuguese

#### Scenario: Browser reports an unsupported language
- **GIVEN** `navigator.language` reports `fr-FR`
- **WHEN** the application loads
- **THEN** all UI text renders in `en-US`, the default fallback

#### Scenario: A regional variant matches its base language
- **GIVEN** `navigator.language` reports `es-MX`
- **WHEN** the application loads
- **THEN** all UI text renders in Spanish, matched by the base language code
