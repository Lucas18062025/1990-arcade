import { checkScoreAchievements } from "./profile.js";
import { getFirebase, networkEnabled } from "./firebase.js";
import { GAME_IDS, sanitizeName, scoreIssue } from "./score-contract.js";

const NAME_KEY = "arcade-name";
const SAVED_KEY_PREFIX = "arcade-saved-";
const QUEUE_KEY = "arcade-queue-v1";
const FS_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Cola de escritura ──────────────────────────────────────────────
// Antes: cada nuevo récord generaba un addDoc inmediato (una partida de
// Invaders producía ~20 documentos en 20 segundos). Ahora:
//   · se acumula el máximo por juego,
//   · se escribe UNA vez, 6 s después del último récord,
//   · la cola se persiste en localStorage antes de tocar la red, así que
//     cerrar la pestaña, recargar o quedarse sin conexión no pierde nada,
//   · el ID del documento es determinista (uid_juego_puntaje), por lo que
//     un reintento nunca duplica un récord ya escrito.
const QUIET_MS = 6000;
// Reintentos con backoff: 6 s → 12 s → 24 s → 48 s y se detiene hasta el
// próximo récord, el próximo `online` o el próximo flush manual.
const MAX_ATTEMPTS = 4;

/** @type {Map<string, number>} */
const pending = new Map();
let flushTimer = null;
let flushing = false;
let attempts = 0;
// Inyectable en tests: evita cargar el SDK real desde gstatic.
let backend = null;

/** Sólo para tests: reemplaza el cargador del SDK de Firestore. */
export function __setScoreBackendForTests(fn) {
  backend = fn;
}

function loadFirestore() {
  return backend ? backend() : import(/* @vite-ignore */ FS_URL);
}

export const SCORE_EVENT = "arcade:score-sync";

function emit(status, detail = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(SCORE_EVENT, { detail: { status, ...detail } }));
  } catch {
    /* entorno sin CustomEvent */
  }
}

function lastSaved(game) {
  try {
    return Number(localStorage.getItem(SAVED_KEY_PREFIX + game) || 0) || 0;
  } catch {
    return 0;
  }
}

function markSaved(game, score) {
  try {
    localStorage.setItem(SAVED_KEY_PREFIX + game, String(score));
  } catch {
    /* storage lleno o bloqueado */
  }
}

/** Persiste la cola. Se llama ANTES de cualquier await de red. */
function persistQueue() {
  try {
    if (pending.size === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(Object.fromEntries(pending)));
  } catch {
    /* storage lleno o bloqueado: la cola sigue en memoria */
  }
}

/** Restaura la cola de una sesión anterior (recarga / pestaña cerrada). */
function restoreQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      localStorage.removeItem(QUEUE_KEY);
      return;
    }
    for (const [game, value] of Object.entries(parsed)) {
      const score = Math.floor(Number(value) || 0);
      if (scoreIssue(game, score) === "ok" && score > lastSaved(game)) pending.set(game, score);
    }
  } catch {
    /* JSON corrupto: se descarta */
  }
}

/**
 * ID determinista del documento. Hace la escritura idempotente: el mismo
 * uid + juego + puntaje siempre apunta al mismo documento, así que un
 * reintento tras una recarga no puede duplicar el récord.
 * @param {string} uid
 * @param {string} game
 * @param {number} score
 */
export function scoreDocId(uid, game, score) {
  return `${uid}_${game}_${score}`;
}

export function playerName() {
  try {
    return sanitizeName(localStorage.getItem(NAME_KEY));
  } catch {
    return "ANON";
  }
}

export function setPlayerName(n) {
  try {
    localStorage.setItem(NAME_KEY, sanitizeName(n));
  } catch {
    /* noop */
  }
}

/**
 * Registra un récord. Local e inmediato (logros y reto diario), y encolado
 * en disco antes de cualquier intento de red.
 * @param {string} game
 * @param {number} score
 */
export function saveBest(game, score) {
  const value = Math.floor(Number(score) || 0);
  const issue = scoreIssue(game, value);
  if (issue !== "ok") {
    emit("rejected", { game, score: value, reason: issue });
    return;
  }

  // Logros y desafío diario son locales: no deben esperar a la red.
  checkScoreAchievements(game, value);

  if (value <= lastSaved(game) || value <= (pending.get(game) || 0)) {
    emit("skipped", { game, score: value });
    return;
  }

  pending.set(game, value);
  persistQueue();
  attempts = 0;
  emit("queued", { game, score: value });
  scheduleFlush();
}

function scheduleFlush(delay = QUIET_MS) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushScores();
  }, delay);
}

/**
 * Vacía la cola. Idempotente: si ya hay un flush en curso, espera ese.
 * @returns {Promise<{saved: number, failed: number}>}
 */
export async function flushScores() {
  if (flushing) return { saved: 0, failed: 0 };
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pending.size === 0) return { saved: 0, failed: 0 };

  if (!networkEnabled()) {
    // Modo local: la cola se conserva (no se pierde el récord si el
    // jugador abre el sitio real más tarde).
    emit("offline", { count: pending.size, reason: "network_disabled" });
    return { saved: 0, failed: 0 };
  }

  flushing = true;
  let saved = 0;
  let failed = 0;
  try {
    const fb = await getFirebase();
    if (!fb) {
      attempts++;
      emit("error", { reason: "auth_unavailable" });
      if (attempts < MAX_ATTEMPTS) scheduleFlush(QUIET_MS * 2 ** attempts);
      else emit("error", { reason: "retries_exhausted", count: pending.size });
      return { saved: 0, failed: pending.size };
    }

    const mod = await loadFirestore();
    const { doc, setDoc, getDoc, serverTimestamp } = mod;
    const entries = [...pending.entries()];

    for (const [game, score] of entries) {
      if (score <= lastSaved(game)) {
        pending.delete(game);
        persistQueue();
        continue;
      }

      const id = scoreDocId(fb.uid, game, score);
      try {
        await setDoc(doc(fb.db, "scores", id), {
          game,
          name: playerName(),
          score,
          at: serverTimestamp(),
          uid: fb.uid,
          scoreId: `${fb.uid}_${game}_${score}`,
        });
        markSaved(game, score);
        pending.delete(game);
        persistQueue();
        saved++;
        emit("saved", { game, score });
      } catch (err) {
        // Si el documento ya existe con este mismo ID, el récord está
        // guardado: el reintento llegó tarde, no hay nada que perder.
        if (await docExists(fb.db, id, getDoc, doc)) {
          markSaved(game, score);
          pending.delete(game);
          persistQueue();
          saved++;
          emit("saved", { game, score, duplicate: true });
          continue;
        }
        failed++;
        emit("error", { game, score, reason: err?.code || "write_failed" });
      }
    }

    if (pending.size > 0) {
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        scheduleFlush(QUIET_MS * 2 ** attempts);
      } else {
        emit("error", { reason: "retries_exhausted", count: pending.size });
      }
    } else {
      attempts = 0;
    }
  } finally {
    flushing = false;
  }
  return { saved, failed };
}

async function docExists(db, id, getDoc, docFn) {
  try {
    const snap = await getDoc(docFn(db, "scores", id));
    return snap.exists();
  } catch {
    return false;
  }
}

/** Diagnóstico: copia de la cola pendiente. */
export function getPendingScores() {
  return Object.fromEntries(pending);
}

/** Sólo para tests: limpia la cola sin escribir. */
export function __resetQueueForTests() {
  pending.clear();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  flushing = false;
  attempts = 0;
  backend = null;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Sólo para tests: simula una recarga leyendo la cola desde localStorage.
 * @returns {Record<string, number>}
 */
export function __restoreQueueForTests() {
  pending.clear();
  restoreQueue();
  return getPendingScores();
}

/**
 * Red de durabilidad para el cierre a mitad de partida.
 *
 * Cada juego escribe su récord en `arcade-best-<game>` en el instante en que
 * lo marca, pero `saveBest()` ahora se llama una sola vez al terminar la
 * partida. Si el jugador cierra la pestaña con una partida en curso, ese
 * máximo nunca llegaría a la cola: este barrido lo encola antes de que el
 * navegador termine. No duplica nada — el ID del documento es determinista y
 * `arcade-saved-*` marca lo ya escrito.
 *
 * No se ejecuta al arrancar a propósito: abrir el sitio no debe generar
 * escrituras si el jugador no jugó. Sólo corre en el cierre de sesión.
 *
 * @returns {number} cantidad de juegos encolados por esta vía
 */
function seedFromLocalBests() {
  let seeded = 0;
  for (const game of GAME_IDS) {
    let best = 0;
    try {
      best = Math.floor(Number(localStorage.getItem("arcade-best-" + game) || 0) || 0);
    } catch {
      return seeded; // storage bloqueado: no hay nada que rescatar
    }
    if (best <= 0) continue;
    if (scoreIssue(game, best) !== "ok") continue;
    if (best <= lastSaved(game)) continue;
    if (best <= (pending.get(game) || 0)) continue;
    pending.set(game, best);
    seeded++;
  }
  if (seeded > 0) persistQueue();
  return seeded;
}

/** Sólo para tests: ejecuta el barrido de mejores locales. */
export function __seedQueueForTests() {
  return seedFromLocalBests();
}

/**
 * Top de puntajes. Devuelve [] si la red está deshabilitada (modo local).
 * @param {number} n
 * @param {string|null} game
 */
export async function topScores(n = 5, game = null) {
  if (!networkEnabled()) return [];
  try {
    const fb = await getFirebase();
    if (!fb) return [];
    const mod = await import(/* @vite-ignore */ FS_URL);
    const { collection, query, orderBy, limit, getDocs, where } = mod;
    const ref = collection(fb.db, "scores");

    if (game && !GAME_IDS.includes(game)) return [];

    try {
      const q = game
        ? query(ref, where("game", "==", game), orderBy("score", "desc"), limit(n))
        : query(ref, orderBy("score", "desc"), limit(n));
      const snap = await getDocs(q);
      return snap.docs.map((x) => x.data());
    } catch {
      // Fallback por si el índice compuesto no está desplegado todavía.
      if (!game) return [];
      const snap = await getDocs(query(ref, where("game", "==", game), limit(n * 4)));
      return snap.docs
        .map((x) => x.data())
        .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
        .slice(0, n);
    }
  } catch {
    return [];
  }
}

// Los récords pendientes sobreviven al cierre de pestaña, la recarga y la
// pérdida de conexión: están en localStorage antes de tocar la red.
if (typeof window !== "undefined") {
  restoreQueue();
  if (pending.size > 0) scheduleFlush(1500);

  window.addEventListener("pagehide", () => {
    // Recoge la partida en curso (ver seedFromLocalBests) antes de vaciar.
    seedFromLocalBests();
    flushScores();
  });
  window.addEventListener("online", () => {
    if (pending.size === 0) return;
    attempts = 0;
    scheduleFlush(0);
  });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden") return;
      seedFromLocalBests();
      flushScores();
    });
  }
}
