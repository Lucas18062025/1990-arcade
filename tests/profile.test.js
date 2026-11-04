import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateLevel,
  addXP,
  getPlayerXP,
  getUnlockedAchievements,
  unlockAchievement,
  getTodayChallenge,
  checkDailyChallenge,
  checkScoreAchievements,
  ACHIEVEMENTS,
} from "../src/lib/profile.js";

describe("Profile, XP & Level System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates level 1 for 0 XP with correct boundaries", () => {
    const lvl = calculateLevel(0);
    expect(lvl.level).toBe(1);
    expect(lvl.title).toBe("ROOKIE");
    expect(lvl.progress).toBe(0);
  });

  it("calculates level 2 when reaching 150 XP", () => {
    const lvl = calculateLevel(150);
    expect(lvl.level).toBe(2);
    expect(lvl.title).toBe("NOVICE");
    expect(lvl.progress).toBe(0);
  });

  it("adds XP and updates player total", () => {
    expect(getPlayerXP()).toBe(0);
    addXP(100);
    expect(getPlayerXP()).toBe(100);
    addXP(75);
    expect(getPlayerXP()).toBe(175);
  });
});

describe("Achievements System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("contains 11 defined achievements", () => {
    expect(ACHIEVEMENTS.length).toBe(11);
  });

  it("unlocks an achievement and awards XP only once", () => {
    expect(getUnlockedAchievements()).toEqual([]);
    const ok = unlockAchievement("FIRST_RUN");
    expect(ok).toBe(true);
    expect(getUnlockedAchievements()).toContain("FIRST_RUN");
    expect(getPlayerXP()).toBe(50);

    // Second unlock attempt should return false and not add double XP
    const retry = unlockAchievement("FIRST_RUN");
    expect(retry).toBe(false);
    expect(getPlayerXP()).toBe(50);
  });

  it("triggers game-specific achievements on score", () => {
    checkScoreAchievements("snake", 120);
    const unlocked = getUnlockedAchievements();
    expect(unlocked).toContain("SNAKE_MASTER");
  });

  it("triggers HIGH_ROLLER_1K when score reaches 1000", () => {
    checkScoreAchievements("tetris", 1200);
    const unlocked = getUnlockedAchievements();
    expect(unlocked).toContain("HIGH_ROLLER_1K");
    expect(unlocked).toContain("LINE_CLEARER");
  });
});

describe("Daily Challenges", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a deterministic daily challenge for today", () => {
    const challenge = getTodayChallenge();
    expect(challenge).toBeDefined();
    expect(challenge.gameId).toBeTruthy();
    expect(challenge.goal).toBeGreaterThan(0);
    expect(challenge.isCompleted).toBe(false);
  });

  it("completes daily challenge when goal is reached for the matching game", () => {
    const challenge = getTodayChallenge();
    // Score below goal does not complete
    const notYet = checkDailyChallenge(challenge.gameId, challenge.goal - 10);
    expect(notYet).toBe(false);
    expect(getTodayChallenge().isCompleted).toBe(false);

    // Score meeting or exceeding goal completes it
    const done = checkDailyChallenge(challenge.gameId, challenge.goal);
    expect(done).toBe(true);
    expect(getTodayChallenge().isCompleted).toBe(true);
    expect(getPlayerXP()).toBe(challenge.xp);
  });
});
