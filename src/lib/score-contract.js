// ═══════════════════════════════════════════════
// Contrato de puntuaciones — fuente única de verdad del cliente.
//
// IMPORTANTE: los límites y el nombre máximo están duplicados a propósito
// en `firestore.rules` (las reglas no pueden importar JS). Cualquier cambio
// acá debe replicarse en las reglas y `tests/score-contract.test.js` falla
// si ambos lados se desincronizan.
// ═══════════════════════════════════════════════

/** Juegos con ranking habilitado. Debe coincidir con la whitelist de Firestore. */
export const GAME_IDS = ["snake", "pacman", "invaders", "tetris", "breakout"];

/** Longitud máxima del nombre de jugador (localStorage + reglas). */
export const NAME_MAX = 12;

/**
 * Techo de puntaje por juego, derivado del máximo legítimo observado
 * (consulta read-only a producción, 18/11/2026) con margen de crecimiento:
 *
 *   snake      130   → 10.000   (tablero 40×20, comida +10)
 *   pacman   2.060   → 20.000   (pellets + fantasmas)
 *   invaders 1.260   → 20.000
 *   breakout   380   → 20.000
 *   tetris   6.100   → 50.000
 *
 * Un techo único de 999.999 (el anterior) no protegía nada: permitía
 * puntajes 160× superiores al máximo real.
 */
export const SCORE_LIMITS = Object.freeze({
  snake: 10000,
  pacman: 20000,
  invaders: 20000,
  tetris: 50000,
  breakout: 20000,
});

/**
 * Sanea un nombre de jugador para que pueda persistirse y publicarse:
 * solo letras, dígitos, espacio, guion y guion bajo; máx. 12; mayúsculas.
 * @param {unknown} raw
 * @returns {string} nombre válido o "ANON"
 */
export function sanitizeName(raw) {
  const clean = String(raw ?? "")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, NAME_MAX);
  return clean || "ANON";
}

/**
 * Valida un puntaje antes de encolarlo o escribirlo.
 * @param {string} game
 * @param {number} score
 * @returns {boolean}
 */
export function isValidScore(game, score) {
  if (!GAME_IDS.includes(game)) return false;
  if (!Number.isInteger(score)) return false;
  if (score <= 0) return false;
  return score <= SCORE_LIMITS[game];
}

/**
 * Motivo de rechazo legible para logs y para la UI.
 * @param {string} game
 * @param {number} score
 * @returns {"ok"|"unknown_game"|"not_integer"|"out_of_range"}
 */
export function scoreIssue(game, score) {
  if (!GAME_IDS.includes(game)) return "unknown_game";
  if (!Number.isInteger(score)) return "not_integer";
  if (score <= 0) return "out_of_range";
  if (score > SCORE_LIMITS[game]) return "out_of_range";
  return "ok";
}
