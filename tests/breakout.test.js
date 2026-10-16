import { mountBreakout } from '../src/games/breakout.js';

describe('Breakout mount', () => {
  it('mount produces a canvas element', () => {
    // Usa el document global del entorno jsdom de Vitest (ver tests/setup.js
    // para el stub de getContext: jsdom no implementa Canvas 2D).
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    mountBreakout(root);
    const canvas = root.querySelector('#brk-cv');
    expect(canvas).not.toBeNull();
    document.body.removeChild(root);
  });
});
