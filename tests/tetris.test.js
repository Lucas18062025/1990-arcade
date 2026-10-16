import { mountTetris } from '../src/games/tetris.js';

describe('Tetris mount', () => {
  it('mount produces a canvas element', () => {
    // Usa el document global del entorno jsdom de Vitest (ver tests/setup.js
    // para el stub de getContext: jsdom no implementa Canvas 2D).
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    mountTetris(root);
    const canvas = root.querySelector('#tet-cv');
    expect(canvas).not.toBeNull();
    document.body.removeChild(root);
  });
});
