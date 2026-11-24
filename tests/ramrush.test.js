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
        for (const l of ['sky', 'far', 'mid', 'rail', 'road', 'sprites']) assert.ok(files.includes(`/game/assets/${l}.webp`), l);
        assert.ok(files.includes('/game/hero.js') && files.includes('/game/assets/sprites.json'), files.join());
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

    it('the easter egg: typing r-a-m on the page opens it (by key, so a Greek layout works too)', () => withPage({ width: 1440, height: 900 }, async (page) => {
        for (const k of ['KeyR', 'KeyA', 'KeyM']) await page.keyboard.press(k);
        await page.locator('#rr-overlay').waitFor({ timeout: 8000 });
    }));

    it('…but not while typing in a field, not with Ctrl, and not out of order', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await page.evaluate(() => window.toggleCLI());
        await page.locator('#cli-input').focus();
        for (const k of ['KeyR', 'KeyA', 'KeyM']) await page.keyboard.press(k);
        await page.evaluate(() => { document.activeElement.blur(); window.toggleCLI(); });
        for (const k of ['Control+KeyR', 'Control+KeyA', 'Control+KeyM']) await page.keyboard.press(k);
        for (const k of ['KeyR', 'KeyM', 'KeyA']) await page.keyboard.press(k);
        await page.waitForTimeout(600);
        assert.equal(await page.locator('#rr-overlay').count(), 0);
    }));

    it('is a secret: `help` does not list it', () => withPage({}, async (page) => {
        await page.evaluate(() => window.runTerminalCommand('help'));
        assert.doesNotMatch(await page.evaluate(() => document.getElementById('cli-output').textContent), /ramrush/i);
    }));
});

// Samples the running game's state (game/main.js `state()`, the same module instance the terminal loaded)
const samples = (page, n, gapMs) => page.evaluate(async ([n, gapMs]) => {
    const m = await import('/game/main.js');
    const out = [];
    for (let i = 0; i < n; i++) { out.push(m.state()); await new Promise(r => setTimeout(r, gapMs)); }
    return out;
}, [n, gapMs]);

describe('RAM RUSH: the hero and his drone', () => {
    it('the hero runs on the road: feet on the ground line, the two run frames take turns, a small bob', () => withPage({}, async (page) => {
        await openGame(page);
        const s = await samples(page, 24, 40);
        assert.ok(s.every(x => x.hero.y === 460), 'feet on the road');
        assert.deepEqual([...new Set(s.map(x => x.hero.frame))].sort(), ['run0', 'run1']);
        assert.ok(s.every(x => x.hero.bob >= 0 && x.hero.bob <= 4), 'lifts, never sinks');
        assert.ok(s.some(x => x.hero.bob > 1), 'and it does lift');
    }));

    it('the drone follows him smoothly: behind and above, no jumps', () => withPage({}, async (page) => {
        await openGame(page);
        const s = await samples(page, 30, 30);
        for (const x of s) {
            assert.ok(x.drone.x < x.hero.x && x.drone.y < x.hero.y - 100, JSON.stringify(x));
            assert.ok(Math.hypot(x.drone.x - x.hero.x, x.drone.y - x.hero.y) < 220, 'stays close');
        }
        for (let i = 1; i < s.length; i++) assert.ok(Math.abs(s[i].drone.y - s[i - 1].drone.y) < 8, `jump at ${i}`);
        assert.ok(new Set(s.map(x => Math.round(x.drone.y))).size > 3, 'and it hovers');
    }));

    it('the hero is solid: only his outline is see-through, not his dark clothes', () => withPage({}, async (page) => {
        await openGame(page);
        const half = await page.evaluate(async () => {
            const frames = await (await fetch('/game/assets/sprites.json')).json();
            const img = new Image(); img.src = '/game/assets/sprites.webp'; await img.decode();
            const res = {};
            for (const k of ['run0', 'run1']) {
                const f = frames[k];
                const c = new OffscreenCanvas(f.w, f.h).getContext('2d');
                c.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
                const a = c.getImageData(0, 0, f.w, f.h).data;
                let partial = 0, seen = 0;
                for (let i = 3; i < a.length; i += 4) if (a[i] > 8) { seen++; if (a[i] < 230) partial++; }
                res[k] = partial / seen;
            }
            return res;
        });
        for (const [k, v] of Object.entries(half)) assert.ok(v < 0.12, `${k}: ${(v * 100).toFixed(1)}% half-transparent`);
    }));
});

describe('RAM RUSH: on a phone', () => {
    const box = (page, sel) => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: r.height, shown: getComputedStyle(el).display !== 'none' }; });

    it('held upright: the world on top, full width and under the ✕, a touch area below it to the bottom', () => withPage({ width: 390, height: 844, mobile: true }, async (page) => {
        await openGame(page);
        const [canvas, pad, x] = [await box(page, '.rr-canvas'), await box(page, '.rr-pad'), await box(page, '.rr-close')];
        assert.equal(Math.round(canvas.w), 390);
        assert.ok(canvas.top >= x.bottom, 'the ✕ does not cover the world');
        assert.ok(pad.shown && pad.top >= canvas.bottom - 1 && Math.round(pad.bottom) === 844 && pad.h > 300, JSON.stringify(pad));
    }));

    it('held sideways (or on a desktop): the world fills the screen and there is no touch area', () => withPage({ width: 844, height: 390, mobile: true }, async (page) => {
        await openGame(page);
        const [canvas, pad] = [await box(page, '.rr-canvas'), await box(page, '.rr-pad')];
        assert.equal(pad.shown, false);
        assert.equal(Math.round(canvas.h), 390);
    }));
});
