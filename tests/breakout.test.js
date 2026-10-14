import { mountBreakout } from '../../src/games/breakout.js';
import { JSDOM } from 'jsdom';

describe('Breakout mount', () => {
  it('mount produces a canvas element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
    const root = dom.window.document.getElementById('root');
    mountBreakout(root);
    const canvas = root.querySelector('#brk-cv');
    expect(canvas).not.toBeNull();
  });
});
