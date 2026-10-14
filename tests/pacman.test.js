import { describe, it, expect } from 'vitest';
import {
  COLS,
  ROWS,
  MAZE,
  FRIGHT_TICKS,
  initialState,
  stepPac,
  stepGhost,
  checkCaught,
  isCleared,
  currentMode,
  passableForPac,
} from '../src/games/pacman/utils.js';

describe('Pac-Man maze', () => {
  it('mide 19x21 con filas parejas', () => {
    expect(COLS).toBe(19);
    expect(ROWS).toBe(21);
    expect(MAZE.length).toBe(21);
    for (const row of MAZE) expect(row.length).toBe(19);
  });

  it('tiene 1 inicio de pacman y 1 de fantasma', () => {
    const s = initialState();
    expect(s.pacStart).toEqual({ x: 10, y: 16 });
    expect(s.ghostStarts.length).toBe(1);
    expect(s.lives).toBe(3);
    expect(s.score).toBe(0);
    expect(s.pelletTotal).toBeGreaterThan(100);
  });
});

describe('Pac-Man movimiento y comida', () => {
  it('come pellet y suma 10 al moverse a la izquierda', () => {
    const s = initialState();
    const ate = stepPac(s);
    expect(ate).toBe('pellet');
    expect(s.score).toBe(10);
    expect(s.pac).toMatchObject({ x: 9, y: 16 });
    expect(s.pellets.has('9,16')).toBe(false);
  });

  it('no atraviesa paredes', () => {
    const s = initialState();
    s.pac = { x: 1, y: 1, dir: { x: -1, y: 0 }, nextDir: { x: -1, y: 0 } };
    expect(stepPac(s)).toBeNull();
    expect(s.pac).toMatchObject({ x: 1, y: 1 });
  });

  it('la puerta frena al pacman', () => {
    const s = initialState();
    s.pac = { x: 9, y: 8, dir: { x: 0, y: 1 }, nextDir: { x: 0, y: 1 } };
    expect(passableForPac(s.grid, 9, 9)).toBe(false);
    expect(stepPac(s)).toBeNull();
    expect(s.pac).toMatchObject({ x: 9, y: 8 });
  });

  it('power pellet activa frightened y suma 50', () => {
    const s = initialState();
    s.pac = { x: 1, y: 2, dir: { x: 0, y: 1 }, nextDir: { x: 0, y: 1 } };
    expect(stepPac(s)).toBe('power');
    expect(s.score).toBe(50);
    expect(s.frightened).toBe(FRIGHT_TICKS);
  });

  it('el túnel envuelve de borde a borde', () => {
    const s = initialState();
    s.pac = { x: 0, y: 10, dir: { x: -1, y: 0 }, nextDir: { x: -1, y: 0 } };
    stepPac(s);
    expect(s.pac).toMatchObject({ x: 18, y: 10 });
  });
});

describe('Pac-Man fantasma', () => {
  it('sale de la casa por la puerta', () => {
    const s = initialState();
    stepGhost(s, 0);
    expect(s.ghosts[0]).toMatchObject({ x: 9, y: 9 });
    stepGhost(s, 0);
    expect(s.ghosts[0]).toMatchObject({ x: 9, y: 8 });
  });

  it('en chase se mueve a una celda válida adyacente', () => {
    const s = initialState();
    s.ghosts = [{ x: 9, y: 8, dir: { x: 0, y: -1 } }];
    s.pac = { x: 1, y: 1, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } };
    stepGhost(s, 0);
    const g = s.ghosts[0];
    expect(Math.abs(g.x - 9) + Math.abs(g.y - 8)).toBe(1);
  });

  it('en frightened se mueve a una celda válida adyacente', () => {
    const s = initialState();
    s.ghosts = [{ x: 9, y: 8, dir: { x: 0, y: -1 } }];
    s.frightened = 10;
    stepGhost(s, 0, () => 0);
    const g = s.ghosts[0];
    expect(Math.abs(g.x - 9) + Math.abs(g.y - 8)).toBe(1);
  });

  it('detecta captura en la misma celda', () => {
    const s = initialState();
    expect(checkCaught(s)).toBe(-1);
    s.ghosts = [{ x: s.pac.x, y: s.pac.y, dir: { x: 0, y: 0 } }];
    expect(checkCaught(s)).toBe(0);
  });
});

describe('Pac-Man modos y victoria', () => {
  it('alterna chase y scatter', () => {
    expect(currentMode(0)).toBe('chase');
    expect(currentMode(45)).toBe('scatter');
    expect(currentMode(70)).toBe('chase');
  });

  it('isCleared solo con Sets vacíos', () => {
    const s = initialState();
    expect(isCleared(s)).toBe(false);
    s.pellets.clear();
    s.powers.clear();
    expect(isCleared(s)).toBe(true);
  });
});
