import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SCORE_EVENT,
  __resetQueueForTests,
  __restoreQueueForTests,
  flushScores,
  getPendingScores,
  playerName,
  saveBest,
  setPlayerName,
  topScores,
} from "../src/lib/scores.js";
import { networkMode } from "../src/lib/firebase.js";

let events = [];
const onScore = (e) => events.push(e.detail);

beforeEach(() => {
  localStorage.clear();
  __resetQueueForTests();
  events = [];
  window.addEventListener(SCORE_EVENT, onScore);
});

afterEach(() => {
  window.removeEventListener(SCORE_EVENT, onScore);
  __resetQueueForTests();
});

describe("Política de red de Firebase", () => {
  it("en desarrollo/tests no hay red: npm run dev nunca escribe en producción", () => {
    expect(networkMode()).toBe("off");
  });

  it("topScores devuelve [] sin red (no rompe el hub)", async () => {
    await expect(topScores(5, "snake")).resolves.toEqual([]);
    await expect(topScores(5, null)).resolves.toEqual([]);
  });
});

describe("Cola de escritura del ranking", () => {
  it("rechaza puntajes imposibles sin encolarlos", () => {
    saveBest("snake", 999999);
    saveBest("snake", 0);
    saveBest("snake", -10);
    saveBest("snake", "no-es-un-numero");
    saveBest("asteroids", 500);

    expect(getPendingScores()).toEqual({});
    expect(events.filter((e) => e.status === "rejected")).toHaveLength(5);
  });

  it("agrupa varios récords del mismo juego en una sola escritura", () => {
    saveBest("invaders", 600);
    saveBest("invaders", 650);
    saveBest("invaders", 620); // retrocede: no reemplaza el máximo pendiente
    saveBest("invaders", 720);

    expect(getPendingScores()).toEqual({ invaders: 720 });
    expect(events.filter((e) => e.status === "queued")).toHaveLength(3);
    expect(events.filter((e) => e.status === "skipped")).toHaveLength(1);
  });

  it("mantiene un valor pendiente por juego", () => {
    saveBest("snake", 100);
    saveBest("tetris", 4000);
    saveBest("snake", 130);

    expect(getPendingScores()).toEqual({ snake: 130, tetris: 4000 });
  });

  it("sin red conserva la cola en disco (no pierde el récord)", async () => {
    saveBest("pacman", 900);
    const res = await flushScores();

    expect(res).toEqual({ saved: 0, failed: 0 });
    expect(getPendingScores()).toEqual({ pacman: 900 });
    expect(JSON.parse(localStorage.getItem("arcade-queue-v1"))).toEqual({ pacman: 900 });
    expect(events.some((e) => e.status === "offline")).toBe(true);
  });

  it("persiste el máximo por juego antes de tocar la red", () => {
    saveBest("snake", 100);
    saveBest("snake", 140);

    expect(JSON.parse(localStorage.getItem("arcade-queue-v1"))).toEqual({ snake: 140 });
  });

  it("una cola corrupta en disco no rompe el arranque", () => {
    localStorage.setItem("arcade-queue-v1", "{no-json");
    expect(__restoreQueueForTests()).toEqual({});
  });

  it("no reencola un récord ya guardado", () => {
    localStorage.setItem("arcade-saved-snake", "500");
    saveBest("snake", 500);
    saveBest("snake", 400);

    expect(getPendingScores()).toEqual({});
    expect(events.every((e) => e.status === "skipped")).toBe(true);
  });
});

describe("Nombre de jugador", () => {
  it("sanea y persiste sólo caracteres válidos", () => {
    setPlayerName("  lucas<script>  ");
    expect(playerName()).toBe("LUCASSCRIPT");
    expect(playerName().length).toBeLessThanOrEqual(12);
  });

  it("cae a ANON cuando no hay nombre", () => {
    expect(playerName()).toBe("ANON");
  });

  it("limpia valores heredados inválidos al leer", () => {
    localStorage.setItem("arcade-name", "josé pérez");
    expect(playerName()).toBe("JOS PREZ");
  });
});
