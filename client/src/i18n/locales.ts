/**
 * Flat locale dictionaries for REQ-HUD-004 (Localized UI Text by OS Language).
 *
 * Plain TypeScript only — no i18n framework/library dependency. Each dictionary
 * covers every user-facing string rendered by the nickname modal, HUD labels,
 * the respawn/death screen, and the page `<title>`.
 */

export type LocaleCode = 'pt-BR' | 'es' | 'en-US';

export interface LocaleStrings {
  /** `<title>` of the page, applied via `document.title` at startup. */
  pageTitle: string;
  /** Lobby card heading. */
  gameTitle: string;
  /** Lobby card subtitle. */
  subtitle: string;
  /** Label above the nickname `<input>`. */
  nicknameLabel: string;
  /** Placeholder text of the nickname `<input>`. */
  nicknamePlaceholder: string;
  /** Fallback nickname used when the input is left blank. */
  defaultNickname: string;
  /** Label above the skin selector, `{count}` is replaced with the skin count. */
  skinSelectLabel: string;
  /** "Play" button on the lobby card. */
  enterArena: string;
  /** Desktop controls hint line. */
  controlsHintDesktop: string;
  /** Mobile/tablet controls hint line. */
  controlsHintMobile: string;
  /** Death-screen modal heading. */
  eliminatedTitle: string;
  /** Death-screen subtext when eliminated by another player, `{killer}` is replaced. */
  defeatedByPlayer: string;
  /** Death-screen subtext when eliminated by the arena boundary. */
  defeatedByBoundary: string;
  /** Label for the final score stat on the death screen. */
  finalScoreLabel: string;
  /** Respawn button on the death screen. */
  respawnNow: string;
  /** Leaderboard card header. */
  leaderboardTitle: string;
  /** Live score stat row label. */
  scoreStatLabel: string;
  /** Live rank stat row label. */
  rankStatLabel: string;
}

export const LOCALES: Record<LocaleCode, LocaleStrings> = {
  'pt-BR': {
    pageTitle: 'Snake Battle Royale Multiplayer',
    gameTitle: '🐍 Snake Royale',
    subtitle: 'Arena Multiplayer Battle Royale (10+ Jogadores)',
    nicknameLabel: 'Escolha seu Apelido',
    nicknamePlaceholder: 'Digite seu apelido...',
    defaultNickname: 'Viper',
    skinSelectLabel: 'Escolha a Skin ({count} Estilos Mistos e Estampados)',
    enterArena: 'ENTRAR NA ARENA',
    controlsHintDesktop: '🖥️ <b>PC:</b> Mouse / WASD + Espaço / Clique Esquerdo (Turbo > 3.0 Massa)',
    controlsHintMobile: '📱 <b>Celular / Tablet:</b> Arraste + Toque Duplo e Segure (Turbo)',
    eliminatedTitle: '💀 ELIMINADO',
    defeatedByPlayer: 'Derrotado por {killer}',
    defeatedByBoundary: 'Derrotado pelo Limite da Arena',
    finalScoreLabel: 'Pontuação Final',
    respawnNow: 'RENASCER AGORA',
    leaderboardTitle: '🏆 TOP VÍBORAS',
    scoreStatLabel: 'PONTOS:',
    rankStatLabel: 'POSIÇÃO:',
  },
  es: {
    pageTitle: 'Snake Battle Royale Multiplayer',
    gameTitle: '🐍 Snake Royale',
    subtitle: 'Arena Multijugador Battle Royale (10+ Jugadores)',
    nicknameLabel: 'Elige tu Apodo',
    nicknamePlaceholder: 'Escribe tu apodo...',
    defaultNickname: 'Viper',
    skinSelectLabel: 'Elige Skin ({count} Estilos Mixtos y Estampados)',
    enterArena: 'ENTRAR A LA ARENA',
    controlsHintDesktop: '🖥️ <b>PC:</b> Ratón / WASD + Espacio / Clic Izquierdo (Turbo > 3.0 Masa)',
    controlsHintMobile: '📱 <b>Móvil / Tablet:</b> Arrastra + Doble Toque y Mantén (Turbo)',
    eliminatedTitle: '💀 ELIMINADO',
    defeatedByPlayer: 'Derrotado por {killer}',
    defeatedByBoundary: 'Derrotado por el Límite de la Arena',
    finalScoreLabel: 'Puntuación Final',
    respawnNow: 'REAPARECER AHORA',
    leaderboardTitle: '🏆 TOP VÍBORAS',
    scoreStatLabel: 'PUNTOS:',
    rankStatLabel: 'RANGO:',
  },
  'en-US': {
    pageTitle: 'Snake Battle Royale Multiplayer',
    gameTitle: '🐍 Snake Royale',
    subtitle: 'Multiplayer Battle Royale Arena (10+ Players)',
    nicknameLabel: 'Choose Nickname',
    nicknamePlaceholder: 'Enter your nickname...',
    defaultNickname: 'Viper',
    skinSelectLabel: 'Select Skin ({count} Mixed & Patterned Styles)',
    enterArena: 'ENTER ARENA',
    controlsHintDesktop: '🖥️ <b>PC:</b> Mouse / WASD + Space / Left-Click (Turbo > 3.0 Mass)',
    controlsHintMobile: '📱 <b>Mobile / Tablet:</b> Drag + Double-Tap & Hold (Turbo)',
    eliminatedTitle: '💀 ELIMINATED',
    defeatedByPlayer: 'Defeated by {killer}',
    defeatedByBoundary: 'Defeated by Arena Boundary',
    finalScoreLabel: 'Final Score',
    respawnNow: 'RESPAWN NOW',
    leaderboardTitle: '🏆 TOP VIPERS',
    scoreStatLabel: 'SCORE:',
    rankStatLabel: 'RANK:',
  },
};
