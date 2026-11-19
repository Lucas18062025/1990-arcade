import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Red habilitada con un backend falso: se prueba la lógica real de la cola
// (persistencia, reintentos, deduplicación) sin tocar Firebase.
vi.mock("../src/lib/firebase.js", () => ({
  networkEnabled: () => true,
  getFirebase: async () => ({ db: { fake: true }, uid: "uid_test_1" }),
}));

import {
  __resetQueueForTests,
  __restoreQueueForTests,
  __setScoreBackendForTests,
  flushScores,
  getPendingScores,
  saveBest,
  scoreDocId,
  SCORE_EVENT,
} from "../src/lib/scores.js";

function makeBackend() {
  const state = { writes: [], exists: new Set(), failNext: 0 };
  const mod = {
    doc: (_db, _collection, id) => ({ id }),
    serverTimestamp: () => "SERVER_TS",
    setDoc: async (ref, data) => {
      if (state.failNext > 0) {
        state.failNext--;
        throw Object.assign(new Error("denied"), { code: "permission-denied" });
      }
      if (state.exists.has(ref.id)) {
        throw Object.assign(new Error("exists"), { code: "permission-denied" });
      }
      state.writes.push({ id: ref.id, ...data });
      state.exists.add(ref.id);
    },
    getDoc: async (ref) => ({ exists: () => state.exists.has(ref.id) }),
  };
  return { state, mod };
}

let backend;
let events;
const onScore = (e) => events.push(e.detail);

beforeEach(() => {
  localStorage.clear();
  __resetQueueForTests();
  backend = makeBackend();
  __setScoreBackendForTests(async () => backend.mod);
  events = [];
  window.addEventListener(SCORE_EVENT, onScore);
});

afterEach(() => {
  window.removeEventListener(SCORE_EVENT, onScore);
  __resetQueueForTests();
});

describe("Escritura online del ranking", () => {
  it("escribe una vez, con ID determinista y el contrato completo", async () => {
    saveBest("snake", 120);
    const res = await flushScores();

    expect(res).toEqual({ saved: 1, failed: 0 });
    expect(backend.state.writes).toHaveLength(1);
    expect(backend.state.writes[0]).toEqual({
      id: scoreDocId("uid_test_1", "snake", 120),
      game: "snake",
      name: "ANON",
      score: 120,
      at: "SERVER_TS",
      uid: "uid_test_1",
    });
    expect(getPendingScores()).toEqual({});
  });

  it("agrupa el máximo por juego en una escritura cada uno", async () => {
    saveBest("invaders", 600);
    saveBest("invaders", 650);
    saveBest("invaders", 720);
    saveBest("tetris", 4000);

    const res = await flushScores();

    expect(res).toEqual({ saved: 2, failed: 0 });
    expect(backend.state.writes.map((w) => w.id)).toEqual([
      scoreDocId("uid_test_1", "invaders", 720),
      scoreDocId("uid_test_1", "tetris", 4000),
    ]);
  });

  it("no duplica si el documento ya existe (reintento tras recarga)", async () => {
    // Otra pestaña ya escribió exactamente el mismo récord.
    backend.state.exists.add(scoreDocId("uid_test_1", "snake", 130));
    saveBest("snake", 130);

    const res = await flushScores();

    expect(res).toEqual({ saved: 1, failed: 0 });
    expect(backend.state.writes).toHaveLength(0);
    expect(events.some((e) => e.status === "saved" && e.duplicate === true)).toBe(true);
    expect(localStorage.getItem("arcade-saved-snake")).toBe("130");
    expect(getPendingScores()).toEqual({});
  });

  it("ante un fallo conserva el récord en disco y lo reintenta después", async () => {
    backend.state.failNext = 1;
    saveBest("pacman", 900);

    const first = await flushScores();
    expect(first).toEqual({ saved: 0, failed: 1 });
    expect(getPendingScores()).toEqual({ pacman: 900 });
    expect(localStorage.getItem("arcade-queue-v1")).toBe(JSON.stringify({ pacman: 900 }));

    const second = await flushScores();
    expect(second).toEqual({ saved: 1, failed: 0 });
    expect(backend.state.writes).toHaveLength(1);
    expect(getPendingScores()).toEqual({});
  });

  it("una recarga restaura la cola persistida y la escribe", async () => {
    localStorage.setItem("arcade-queue-v1", JSON.stringify({ breakout: 380 }));

    expect(__restoreQueueForTests()).toEqual({ breakout: 380 });
    const res = await flushScores();

    expect(res).toEqual({ saved: 1, failed: 0 });
    expect(backend.state.writes[0].id).toBe(scoreDocId("uid_test_1", "breakout", 380));
  });

  it("descarta de la cola restaurada un valor inválido o ya guardado", () => {
    localStorage.setItem("arcade-saved-snake", "500");
    localStorage.setItem(
      "arcade-queue-v1",
      JSON.stringify({ snake: 300, asteroids: 10, tetris: 999999, pacman: 700 })
    );

    expect(__restoreQueueForTests()).toEqual({ pacman: 700 });
  });

  it("el ID determinista codifica uid, juego y puntaje", () => {
    expect(scoreDocId("abc123", "tetris", 6100)).toBe("abc123_tetris_6100");
  });
});
