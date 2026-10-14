import { mountTetris } from '../../src/games/tetris.js';
import { JSDOM } from 'jsdom';

describe('Tetris mount', () => {
  it('mount produces a canvas element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
    const root = dom.window.document.getElementById('root');
    mountTetris(root);
    const canvas = root.querySelector('#tetris-cv');
    expect(canvas).not.toBeNull();
  });
});
