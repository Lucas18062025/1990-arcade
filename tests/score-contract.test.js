import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GAME_IDS,
  NAME_MAX,
  SCORE_LIMITS,
  isValidScore,
  sanitizeName,
  scoreIssue,
} from "../src/lib/score-contract.js";

// En jsdom `import.meta.url` no es `file:`; resolvemos contra el root del repo.
const RULES_PATH = resolve(process.cwd(), "firestore.rules");
const rules = readFileSync(RULES_PATH, "utf8");

describe("Contrato de puntuaciones", () => {
  it("expone los cinco juegos del arcade", () => {
    expect(GAME_IDS).toEqual(["snake", "pacman", "invaders", "tetris", "breakout"]);
  });

  it("sanitiza nombres para que puedan publicarse", () => {
    expect(sanitizeName("  lucas  ")).toBe("LUCAS");
    expect(sanitizeName("josé")).toBe("JOS");
    expect(sanitizeName("a<b>c")).toBe("ABC");
    expect(sanitizeName("")).toBe("ANON");
    expect(sanitizeName(null)).toBe("ANON");
    expect(sanitizeName("x".repeat(40))).toHaveLength(NAME_MAX);
    expect(sanitizeName("_GUION-1")).toBe("_GUION-1");
  });

  it("valida puntajes por juego", () => {
    for (const game of GAME_IDS) {
      const max = SCORE_LIMITS[game];
      expect(isValidScore(game, 1)).toBe(true);
      expect(isValidScore(game, max)).toBe(true);
      expect(isValidScore(game, max + 1)).toBe(false);
      expect(isValidScore(game, 0)).toBe(false);
      expect(isValidScore(game, -5)).toBe(false);
      expect(isValidScore(game, 12.5)).toBe(false);
    }
    expect(isValidScore("asteroids", 100)).toBe(false);
    expect(scoreIssue("snake", 999999)).toBe("out_of_range");
    expect(scoreIssue("snake", 100)).toBe("ok");
  });

  it("usa techos distintos por juego (no un límite universal)", () => {
    const limits = GAME_IDS.map((g) => SCORE_LIMITS[g]);
    expect(new Set(limits).size).toBeGreaterThan(1);
    expect(SCORE_LIMITS.snake).toBeLessThan(SCORE_LIMITS.tetris);
  });
});

describe("Sincronización entre firestore.rules y el cliente", () => {
  it("exige autenticación para crear", () => {
    expect(rules).toMatch(/allow create:\s*if request\.auth != null/);
  });

  it("acepta exactamente los campos que envía el cliente", () => {
    expect(rules).toMatch(/hasOnly\(\['game', 'name', 'score', 'at', 'uid'\]\)/);
  });

  it("valida el uid contra el token", () => {
    expect(rules).toMatch(/request\.resource\.data\.uid == request\.auth\.uid/);
  });

  it("incluye los cinco juegos en la whitelist", () => {
    const whitelist = rules.match(/data\.game in \[([^\]]+)\]/);
    expect(whitelist).not.toBeNull();
    for (const game of GAME_IDS) {
      expect(whitelist[1]).toContain(`'${game}'`);
    }
  });

  it("declara el mismo techo por juego que el cliente", () => {
    for (const game of GAME_IDS) {
      const line = rules.match(new RegExp(`game == '${game}'\\s*\\?\\s*(\\d+)`));
      expect(line, `sin techo para ${game} en firestore.rules`).not.toBeNull();
      expect(Number(line[1])).toBe(SCORE_LIMITS[game]);
    }
  });

  it("limita el nombre al mismo largo que el cliente", () => {
    expect(rules).toContain(`name.size() <= ${NAME_MAX}`);
  });

  it("no permite editar ni borrar récords", () => {
    expect(rules).toMatch(/allow update, delete: if false/);
  });

  it("exige el ID determinista uid_juego_puntaje (escritura idempotente)", () => {
    expect(rules).toMatch(
      /scoreId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.game\s*\+ '_' \+ string\(request\.resource\.data\.score\)/
    );
  });

  it("bloquea el resto de la base", () => {
    expect(rules).toMatch(/match \/\{document=\*\*\}/);
  });
});
