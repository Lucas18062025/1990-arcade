import { mountInvaders } from '../../src/games/invaders.js';
import { JSDOM } from 'jsdom';

describe('Invaders mount', () => {
  it('mount produces a canvas element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
    const root = dom.window.document.getElementById('root');
    mountInvaders(root);
    const canvas = root.querySelector('#inv-cv');
    expect(canvas).not.toBeNull();
  });
});
