// RAM RUSH, the hidden mini game (game/): opened from the terminal, loaded only then, and closed without a trace.
// Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

async function withPage(opts, body) {
    const page = await newPage(browser, site, { locale: 'el-GR', initScript: 'Date.prototype.getHours = () => 12;', ...opts });
    try { await body(page); } finally { await page.context().close(); }
}
const gameFiles = (page) => page.evaluate(() => performance.getEntriesByType('resource').map(r => new URL(r.name).pathname).filter(p => p.startsWith('/game/')));
const openGame = async (page) => {
    await page.evaluate(() => window.runTerminalCommand('ramrush'));
    await page.locator('#rr-overlay').waitFor();
    await page.waitForFunction(() => document.querySelector('#rr-overlay .rr-status')?.textContent === '', null, { timeout: 8000 });
};
const leftovers = (page) => page.evaluate(() => ({
    overlay: !!document.getElementById('rr-overlay'),
    style: !!document.getElementById('rr-style'),
    playing: document.body.classList.contains('rr-playing'),
    locked: document.body.classList.contains('ui-locked')
}));

describe('RAM RUSH: open and close', () => {
    it('`ramrush` in the terminal opens the game, and only then are its files fetched', () => withPage({}, async (page) => {
        assert.deepEqual(await gameFiles(page), [], 'nothing before');
        await openGame(page);
        const files = await gameFiles(page);
        assert.ok(files.includes('/game/main.js'), files.join());
        for (const l of ['sky', 'far', 'mid', 'rail', 'road']) assert.ok(files.includes(`/game/assets/${l}.webp`), l);
        assert.deepEqual(page.problems, []);
    }));

    it('the city moves: the picture changes from one moment to the next', () => withPage({}, async (page) => {
        await openGame(page);
        const shot = () => page.evaluate(() => document.querySelector('.rr-canvas').toDataURL('image/png'));
        const a = await shot();
        await page.waitForTimeout(300);
        const b = await shot();
        assert.notEqual(a, b);
    }));

    it('while it is open the page behind is locked and its background video paused', () => withPage({}, async (page) => {
        await page.evaluate(() => document.querySelector('.bg-video').play().catch(() => {}));
        await openGame(page);
        const s = await leftovers(page);
        assert.deepEqual([s.playing, s.locked], [true, true]);
        assert.equal(await page.evaluate(() => document.querySelector('.bg-video').paused), true);
    }));

    for (const [how, act] of [['Esc', (p) => p.keyboard.press('Escape')], ['the ✕', (p) => p.locator('.rr-close').click()]]) {
        it(`${how} closes it and leaves nothing behind, and it opens again`, () => withPage({}, async (page) => {
            await openGame(page);
            await act(page);
            assert.deepEqual(await leftovers(page), { overlay: false, style: false, playing: false, locked: false });
            await openGame(page);
            assert.equal(await page.locator('.rr-overlay').count(), 1, 'one window, not two');
        }));
    }

    it('a closed game stops drawing (its loop is gone)', () => withPage({}, async (page) => {
        await openGame(page);
        await page.evaluate(() => {
            window.__frames = 0;
            const raf = window.requestAnimationFrame.bind(window);
            window.requestAnimationFrame = (cb) => raf((t) => { window.__frames++; cb(t); });
        });
        await page.keyboard.press('Escape');
        await page.evaluate(() => { window.__frames = 0; });
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => window.__frames), 0);
    }));

    it('typed in an open terminal, it closes the terminal and opens the game', () => withPage({}, async (page) => {
        await page.evaluate(() => window.toggleCLI ? window.toggleCLI() : document.getElementById('cli-overlay').classList.add('active'));
        assert.equal(await page.evaluate(() => document.getElementById('cli-overlay').classList.contains('active')), true);
        await openGame(page);
        assert.equal(await page.evaluate(() => document.getElementById('cli-overlay').classList.contains('active')), false);
    }));

    it('is a secret: `help` does not list it', () => withPage({}, async (page) => {
        await page.evaluate(() => window.runTerminalCommand('help'));
        assert.doesNotMatch(await page.evaluate(() => document.getElementById('cli-output').textContent), /ramrush/i);
    }));
});
