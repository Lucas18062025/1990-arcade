import { mountInvaders } from '../src/games/invaders.js';

describe('Invaders mount', () => {
  it('mount produces a canvas element', () => {
    // Usa el document global del entorno jsdom de Vitest (ver tests/setup.js
    // para el stub de getContext: jsdom no implementa Canvas 2D).
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    mountInvaders(root);
    const canvas = root.querySelector('#inv-cv');
    expect(canvas).not.toBeNull();
    document.body.removeChild(root);
  });
});
