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
    inTerm: document.getElementById('cli-overlay').classList.contains('rr-in-term')
}));
const termOpen = (page) => page.evaluate(() => document.getElementById('cli-overlay').classList.contains('active'));

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
        assert.deepEqual([s.playing, await page.evaluate(() => document.body.classList.contains('ui-locked'))], [true, true]);
        assert.equal(await page.evaluate(() => document.querySelector('.bg-video').paused), true);
    }));

    for (const [how, act] of [['Esc', (p) => p.keyboard.press('Escape')], ["the terminal bar's ✕", (p) => p.locator('.cli-close').click()]]) {
        it(`${how} ends the game, leaves nothing behind, keeps the terminal open at its prompt, and it opens again`, () => withPage({ width: 1440, height: 900 }, async (page) => {
            await openGame(page);
            const title = await page.locator('.cli-bar-title').textContent();
            assert.match(title, /ramrush/);
            await act(page);
            assert.deepEqual(await leftovers(page), { overlay: false, style: false, playing: false, inTerm: false });
            assert.equal(await termOpen(page), true, 'back to the terminal');
            assert.doesNotMatch(await page.locator('.cli-bar-title').textContent(), /ramrush/);
            assert.equal(await page.evaluate(() => document.activeElement.id), 'cli-input', 'at the prompt');
            assert.equal(await page.locator('.cli-input-line').isVisible(), true);
            await openGame(page);
            assert.equal(await page.locator('.rr-overlay').count(), 1, 'one window, not two');
        }));
    }

    it("the terminal's own close (the ` key) closes the game with it", () => withPage({}, async (page) => {
        await openGame(page);
        await page.evaluate(() => window.toggleCLI());
        await page.waitForFunction(() => !document.getElementById('rr-overlay'));
        assert.deepEqual(await leftovers(page), { overlay: false, style: false, playing: false, inTerm: false });
        assert.equal(await termOpen(page), false);
    }));

    it("it plays inside the terminal's window: output, chips and prompt step aside, and the window fits the screen", () => withPage({ width: 1440, height: 900 }, async (page) => {
        await openGame(page);
        const r = await page.evaluate(() => {
            const b = (sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return { shown: getComputedStyle(e).display !== 'none', l: r.left, t: r.top, w: r.width, h: r.height }; };
            return { cli: b('#cli-overlay'), game: b('#rr-overlay'), canvas: b('.rr-canvas'), out: b('.cli-output'), chips: b('.cli-chips'), line: b('.cli-input-line') };
        });
        assert.deepEqual([r.out.shown, r.chips.shown, r.line.shown], [false, false, false]);
        assert.ok(r.cli.w > 900 && r.cli.w <= 960, `window width ${r.cli.w}`);
        assert.ok(r.game.l >= r.cli.l && r.game.l + r.game.w <= r.cli.l + r.cli.w + 1, 'the game is inside the window');
        assert.ok(Math.abs(r.canvas.w / r.canvas.h - 16 / 9) < 0.02, 'still 16:9');
        assert.ok(r.cli.t >= 0 && r.cli.t + r.cli.h <= 900, 'fits the screen');
    }));

    it('on a short desktop window the terminal shrinks to fit the screen', () => withPage({ width: 1280, height: 600 }, async (page) => {
        await openGame(page);
        const r = await page.locator('#cli-overlay').evaluate(e => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom }; });
        assert.ok(r.t >= 0 && r.b <= 600, JSON.stringify(r));
    }));

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

    it('typed in an open terminal, the game opens in that same window; from the page, it opens the terminal first', () => withPage({}, async (page) => {
        await page.evaluate(() => window.toggleCLI());
        await openGame(page);
        assert.equal(await termOpen(page), true);
        await page.keyboard.press('Escape');
        await page.evaluate(() => window.toggleCLI());
        assert.equal(await termOpen(page), false);
        await openGame(page);
        assert.equal(await termOpen(page), true, 'opened from a closed terminal');
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

    it('held upright: the terminal window fills the screen, the world on top under the title bar, a touch area below it', () => withPage({ width: 390, height: 844, mobile: true }, async (page) => {
        await openGame(page);
        const [cli, canvas, pad, bar] = [await box(page, '#cli-overlay'), await box(page, '.rr-canvas'), await box(page, '.rr-pad'), await box(page, '.cli-bar')];
        assert.ok(cli.h > 780 && cli.bottom <= 844, JSON.stringify(cli));
        assert.ok(canvas.w >= 340 && canvas.w <= 370, `canvas ${canvas.w}`);
        assert.ok(canvas.top >= bar.bottom, 'the title bar does not cover the world');
        assert.ok(pad.shown && pad.top >= canvas.bottom - 1 && pad.bottom <= cli.bottom && pad.h > 300, JSON.stringify(pad));
        assert.ok(cli.bottom - pad.bottom < 16, "the pad runs to the window's bottom");
    }));

    it('held sideways (or on a desktop): the world fills the screen and there is no touch area', () => withPage({ width: 844, height: 390, mobile: true }, async (page) => {
        await openGame(page);
        const [canvas, pad] = [await box(page, '.rr-canvas'), await box(page, '.rr-pad')];
        assert.equal(pad.shown, false);
        assert.ok(canvas.top >= 0 && canvas.bottom <= 390, JSON.stringify(canvas));
        assert.ok(Math.abs(canvas.w / canvas.h - 16 / 9) < 0.02);
        // nothing from the page (the header's buttons) is drawn over the game
        const over = await page.evaluate(() => {
            const r = document.querySelector('.rr-canvas').getBoundingClientRect();
            for (let i = 1; i < 20; i++) for (let j = 1; j < 10; j++) {
                const hit = document.elementFromPoint(r.left + r.width * i / 20, r.top + r.height * j / 10);
                if (hit && hit.closest('#toast-container')) continue;   // a toast may rightly pass over it
                if (!hit || !hit.closest('#cli-overlay')) return false;
            }
            return true;
        });
        assert.equal(over, true, 'the game is on top');
    }));
});
