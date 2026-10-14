import { describe, it, expect, beforeEach } from 'vitest';
import { getSnakeInitialState, moveSnake, checkCollision } from '../../src/games/snake/utils.js';

/**
 * Tests de ejemplo para el juego Snake.
 */

describe('Snake game logic', () => {
  let state;

  beforeEach(() => {
    state = getSnakeInitialState();
  });

  it('inicializa la serpiente con longitud 3', () => {
    expect(state.snake.length).toBe(3);
    expect(state.direction).toBe('right');
  });

  it('mueve la serpiente correctamente hacia la derecha', () => {
    const newState = moveSnake(state);
    expect(newState.snake[0].x).toBe(state.snake[0].x + 1);
    expect(newState.snake[0].y).toBe(state.snake[0].y);
  });

  it('detecta colisión con la pared', () => {
    // colocar serpiente al borde derecho
    state.snake[0] = { x: 19, y: 10 };
    const moved = moveSnake(state);
    expect(checkCollision(moved)).toBe(true);
  });
});
