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
        assert.ok(files.includes('/game/assets/enemies.webp') && files.includes('/game/assets/enemies.json'), files.join());
        assert.deepEqual(page.problems, []);
    }));

    it('the city moves: the picture changes from one moment to the next', () => withPage(DESK, async (page) => {
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
    it('the hero runs on the road: feet on the ground line, the two run frames take turns, a small bob', () => withPage(DESK, async (page) => {
        await openGame(page);
        const s = await samples(page, 24, 40);
        assert.ok(s.every(x => x.hero.y === 460), 'feet on the road');
        assert.deepEqual([...new Set(s.map(x => x.hero.frame))].sort(), ['run0', 'run1']);
        assert.ok(s.every(x => x.hero.bob >= 0 && x.hero.bob <= 4), 'lifts, never sinks');
        assert.ok(s.some(x => x.hero.bob > 1), 'and it does lift');
    }));

    it('the drone follows him smoothly: behind and above, no jumps', () => withPage(DESK, async (page) => {
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

describe('RAM RUSH: on a phone, held sideways only (8c.6)', () => {
    const UP = { width: 390, height: 844, mobile: true }, SIDE = { width: 844, height: 390, mobile: true };
    const box = (page, sel) => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, bottom: r.bottom, w: r.width, h: r.height }; });
    // the cyan of the phone drawn in the request to turn (its top edge, in the middle)
    const rotateShown = (page) => page.evaluate(() => {
        const [r, g, b] = document.querySelector('.rr-canvas').getContext('2d').getImageData(480, 125, 1, 1).data;
        return Math.abs(r - 34) < 30 && Math.abs(g - 211) < 30 && Math.abs(b - 238) < 30;
    });

    it('held sideways: the window is the whole screen, the world as big as the height allows (16:9), nothing of the page over it, no touch area', () => withPage(SIDE, async (page) => {
        await openGame(page);
        const [cli, canvas, bar] = [await box(page, '#cli-overlay'), await box(page, '.rr-canvas'), await box(page, '.cli-bar')];
        assert.deepEqual([cli.left, cli.top, cli.w, cli.h], [0, 0, 844, 390]);
        assert.ok(canvas.top >= bar.bottom - 1 && canvas.bottom <= 390.5, JSON.stringify(canvas));
        assert.ok(canvas.h > 390 - bar.h - 3, `the world takes the height: ${canvas.h}`);
        assert.ok(Math.abs(canvas.w / canvas.h - 16 / 9) < 0.02);
        assert.equal(await page.locator('.rr-pad').count(), 0, 'no touch area under it any more');
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

    it('turned upright while playing: it asks to turn the phone back and waits; sideways again it waits on the pause screen, and a tap on ▶ goes on', () => withPage(SIDE, async (page) => {
        await openSettled(page);
        await page.setViewportSize({ width: 390, height: 844 });
        await waitState(page, (s) => s.upright === true, 3000);
        const d0 = (await gameState(page)).distance;
        await page.waitForTimeout(400);
        assert.equal((await gameState(page)).distance, d0, 'the world waits');
        assert.equal(await rotateShown(page), true, 'the request to turn is drawn');
        await page.setViewportSize({ width: 844, height: 390 });
        await waitState(page, (s) => s.upright === false && s.paused === true, 3000);
        assert.equal(await rotateShown(page), false, 'the picture of the game is back, under the pause screen');
        await page.waitForTimeout(300);
        assert.equal((await gameState(page)).distance, d0, 'still waiting');
        const b = await page.evaluate(async () => {
            const { PAUSE_BUTTON: b } = await import('/game/config.js');
            const s = (await import('/game/main.js')).state().hudScale;
            const r = document.querySelector('.rr-canvas').getBoundingClientRect(), k = r.width / 960;
            return { x: r.left + (960 - (960 - b.x) * s) * k, y: r.top + b.y * s * k };
        });
        await page.evaluate(([x, y]) => {
            const c = document.querySelector('.rr-canvas');
            const o = { bubbles: true, pointerId: 31, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y };
            c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o));
        }, [b.x, b.y]);
        await waitState(page, (s) => s.paused === false && s.distance > 0, 2000);
        await page.waitForTimeout(200);
        assert.ok((await gameState(page)).distance > d0, 'on its way again');
        assert.deepEqual(page.problems, []);
    }));

    it('opened held upright, nothing has run yet: it asks to turn, and turned sideways the run simply starts', () => withPage(UP, async (page) => {
        await openGame(page);
        await waitState(page, (s) => s.upright === true, 3000);
        assert.equal((await gameState(page)).distance, 0);
        assert.equal(await rotateShown(page), true);
        await page.setViewportSize({ width: 844, height: 390 });
        await waitState(page, (s) => s.upright === false && s.paused === false && s.distance > 0, 3000);
    }));

    it('a desktop window narrower than tall is not a phone: it plays', () => withPage({ width: 700, height: 900, mobile: false }, async (page) => {
        await openGame(page);
        await waitState(page, (s) => s.distance > 0, 3000);
        assert.equal((await gameState(page)).upright, false);
    }));
});

describe('RAM RUSH: the HUD on a phone (8c.6)', () => {
    const SIDE = { width: 844, height: 390, mobile: true };

    it('it grows so its text is at least 14 px on the screen (never past 2.2×); a desktop keeps it as it was', () => withPage(SIDE, async (page) => {
        await openGame(page);
        const r = await page.evaluate(async () => {
            const { HUD_SCALE } = await import('/game/config.js');
            const s = (await import('/game/main.js')).state(), k = document.querySelector('.rr-canvas').getBoundingClientRect().width / 960;
            return { s: s.hudScale, compact: s.compact, px: HUD_SCALE.baseFont * k * s.hudScale, max: HUD_SCALE.max };
        });
        assert.ok(r.s > 1 && r.s <= r.max, `scale ${r.s}`);
        assert.ok(r.px >= 13.99, `${r.px.toFixed(1)} px on the screen`);
        assert.equal(r.compact, true, 'a phone canvas is small: the secondary parts hide');
    }).then(() => withPage(DESK, async (page) => {
        await openGame(page);
        const s = await gameState(page);
        assert.deepEqual([s.hudScale, s.compact], [1, false]);
    })));

    it('small: a power-up row is its icon and time bar only (no name, no effect, no MHz); and on a touch screen the pause screen says "tap ▶"', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createHud } = await import('/game/hud.js');
            const { createPowerups } = await import('/game/powerups.js');
            const { POWERUPS } = await import('/game/config.js');
            // a drawing surface that only notes the words written on it
            const words = [];
            const ctx = new Proxy({}, {
                get: (t, k) => k === 'fillText' ? (w) => words.push(w) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : () => {}),
                set: (t, k, v) => { t[k] = v; return true; }
            });
            const fx = { speed: 'speed', rate: 'rate', damage: 'damage', shield: () => 'shield', drone: () => 'drone' };
            const txt = () => ({ fx, paused: 'PAUSED', resume: 'P to resume', resumeTouch: 'Tap ▶ to resume' });
            const p = createPowerups();
            p.activate('xmp');
            const seen = {};
            for (const compact of [false, true]) {
                const h = createHud(ctx, { hudScale: compact ? 1.9 : 1, compact }, { txt, touchUI: compact });
                words.length = 0;
                h.powerups(p, 104);
                seen[compact ? 'small' : 'big'] = [...words];
                words.length = 0;
                h.pause();
                seen[compact ? 'pauseTouch' : 'pause'] = [...words];
            }
            return { seen, name: POWERUPS.xmp.name };
        });
        assert.ok(out.seen.big.includes(out.name) && out.seen.big.some(w => /^RAM ×/.test(w)) && out.seen.big.some(w => /MHz/.test(w)), out.seen.big.join(' | '));
        assert.deepEqual(out.seen.small, []);
        assert.deepEqual([out.seen.pause[1], out.seen.pauseTouch[1]], ['P to resume', 'Tap ▶ to resume']);
    }));

    it('the reminder at the start tells the swipes, on the world (a desktop: the keys)', () => withPage(SIDE, async (page) => {
        await openGame(page);
        assert.deepEqual((await gameState(page)).hint, ['Πάτα: RAM   Σύρε ↑ άλμα, ξανά: διπλό', 'Σύρε ↓ slide   Σύρε ← → κίνηση']);
    }).then(() => withPage(DESK, async (page) => {
        await openGame(page);
        const h = (await gameState(page)).hint;
        assert.ok(h.length === 1 && /Esc/.test(h[0]), JSON.stringify(h));
    })));
});

// Records the game's state every ~16ms while the keys are pressed, then hands the whole run back
const startRec = (page) => page.evaluate(async () => {
    const m = await import('/game/main.js');
    window.__rec = [];
    window.__recId = setInterval(() => { const s = m.state(); if (s) window.__rec.push(s); }, 16);
});
const stopRec = (page) => page.evaluate(() => { clearInterval(window.__recId); return window.__rec; });
const gameState = (page) => page.evaluate(async () => (await import('/game/main.js')).state());
// Timing tests start once the frames flow evenly: opened the instant the page loads, the site's own start-up
// (its intro, the catalog) can hold a frame back for a moment, which a jump timed in ms would feel.
// (A loop inside the page: page.waitForFunction does not wait for a promise, it takes it as "true" at once.)
const settle = (page) => page.evaluate(async () => {
    const window250 = () => new Promise(r => {
        let worst = 0, last = performance.now(); const t0 = last;
        const f = (t) => { worst = Math.max(worst, t - last); last = t; if (t - t0 < 250) requestAnimationFrame(f); else r(worst); };
        requestAnimationFrame(f);
    });
    for (const t0 = performance.now(); performance.now() - t0 < 10000;) if (await window250() < 40) return;
    throw new Error('the frames never flowed evenly');
});
// Waits (in the page, frame by frame) until the game's state passes the test; fails after `ms`
// (Sent as source text: Playwright runs it through DevTools, so the page's CSP, which forbids eval, has no say.)
const waitState = (page, test, ms = 3000) => page.evaluate(`(async () => {
    const m = await import('/game/main.js');
    const ok = ${test.toString()};
    for (const t0 = performance.now(); performance.now() - t0 < ${ms};) {
        if (ok(m.state())) return;
        await new Promise(r => requestAnimationFrame(r));
    }
    throw new Error('waited ${ms} ms for ' + ${JSON.stringify(test.toString())});
})()`);
// … on a quiet road: no enemies of the game's own, so a test about the moves is not disturbed by one
const openSettled = async (page) => {
    await openGame(page);
    await page.evaluate(async () => (await import('/game/main.js')).testQuiet());
    await settle(page);
};
const apex = (rec) => 460 - Math.min(...rec.map(s => s.hero.y));
const airTime = (rec) => rec.filter(s => !s.hero.onGround).length;
const DESK = { width: 1440, height: 900 };

describe('RAM RUSH: the controls', () => {
    it('↑ held: a full jump, well over his height, and he lands back on the road', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await startRec(page);
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(450); await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(600);
        const rec = await stopRec(page);
        assert.ok(apex(rec) > 150 && apex(rec) < 230, `apex ${apex(rec)}`);
        const frames = new Set(rec.map(s => s.hero.frame));
        assert.ok(frames.has('jump') && frames.has('land'), [...frames].join());
        const last = rec.at(-1).hero;
        assert.deepEqual([last.y, last.onGround, last.jumps], [460, true, 0]);
    }));

    it('a quick tap is a hop: letting go early cuts the jump short', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await startRec(page);
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(700);
        const rec = await stopRec(page);
        assert.ok(apex(rec) > 10 && apex(rec) < 110, `hop ${apex(rec)}`);
    }));

    it('↑ again in the air: the double jump, higher, with the boost flames; a third press does nothing', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await startRec(page);
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(200); await page.keyboard.up('ArrowUp');
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(250); await page.keyboard.up('ArrowUp');
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(1200);
        const rec = await stopRec(page);
        assert.ok(apex(rec) > 240, `apex ${apex(rec)}`);
        assert.ok(rec.some(s => s.hero.frame === 'boost'), 'boost frame');
        assert.equal(Math.max(...rec.map(s => s.hero.jumps)), 2);
        assert.equal(rec.at(-1).hero.onGround, true);
    }));

    it('↓ on the road: a slide, low (under head-height things) and then back to running', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await startRec(page);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(900);
        const rec = await stopRec(page);
        const sliding = rec.filter(s => s.hero.frame === 'slide');
        assert.ok(sliding.length > 5, 'slides');
        assert.ok(sliding.every(s => s.hero.box.h < 70), 'low while sliding');
        assert.ok(/^run/.test(rec.at(-1).hero.frame) && rec.at(-1).hero.box.h > 100, 'running again');
    }));

    it('↓ in the air: a fast fall, back on the road sooner', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await startRec(page);
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(450); await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(700);
        const plain = airTime(await stopRec(page));
        await startRec(page);
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.press('ArrowDown'); await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(700);
        const fast = airTime(await stopRec(page));
        assert.ok(fast < plain * 0.75, `fast ${fast} vs plain ${plain}`);
    }));

    it('← / → move him along the road, never off it', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(300);
        let s = await gameState(page);
        assert.ok(s.hero.x > 330, `forward to ${s.hero.x}`);
        await page.keyboard.down('KeyA'); await page.waitForTimeout(2500); await page.keyboard.up('KeyA');
        await page.waitForTimeout(300);
        s = await gameState(page);
        assert.ok(s.hero.x >= 109 && s.hero.x < 125, `back to ${s.hero.x}`);
    }));

    it("the game's keys stay in the game: Space jumps (never presses the ✕), the page hears nothing, and after closing it hears them again", () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(() => { window.__pageKeys = 0; document.addEventListener('keydown', (e) => { if (/^Arrow|Space/.test(e.code)) window.__pageKeys++; }); });
        await startRec(page);
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(400);
        const rec = await stopRec(page);
        assert.ok(rec.some(s => !s.hero.onGround), 'Space jumped');
        assert.equal(await page.locator('#rr-overlay').count(), 1, 'still playing');
        assert.equal(await page.evaluate(() => window.__pageKeys), 0);
        await page.keyboard.press('Escape');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => window.__pageKeys), 1);
    }));

    it('P pauses the world, P again carries on', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.keyboard.press('KeyP');
        await page.waitForTimeout(100);
        const a = await gameState(page);
        await page.waitForTimeout(300);
        const b = await gameState(page);
        assert.equal(a.paused, true);
        assert.equal(a.distance, b.distance, 'frozen');
        await page.keyboard.press('KeyP');
        await page.waitForTimeout(300);
        const c = await gameState(page);
        assert.equal(c.paused, false);
        assert.ok(c.distance > b.distance, 'moving again');
    }));
});

describe('RAM RUSH: the swipes, on a phone held sideways', () => {
    const PHONE = { width: 844, height: 390, mobile: true };
    // A finger on the world: down, a few moves along (dx, dy), up
    const swipe = (page, dx, dy) => page.evaluate(([dx, dy]) => {
        const c = document.querySelector('.rr-canvas');
        const r = c.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const ev = (type, k) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + dx * k, clientY: y + dy * k }));
        ev('pointerdown', 0); ev('pointermove', 0.3); ev('pointermove', 0.7); ev('pointermove', 1); ev('pointerup', 1);
    }, [dx, dy]);

    it('swipe up jumps, twice is the double jump; swipe down slides; sideways steps him over', () => withPage(PHONE, async (page) => {
        await openSettled(page);
        await startRec(page);
        await swipe(page, 0, -90);
        await page.waitForTimeout(180);
        await swipe(page, 0, -90);
        await page.waitForTimeout(1400);
        let rec = await stopRec(page);
        assert.equal(Math.max(...rec.map(s => s.hero.jumps)), 2, 'double jump');
        assert.ok(apex(rec) > 240, `apex ${apex(rec)}`);

        await startRec(page);
        await swipe(page, 0, 90);
        await page.waitForTimeout(250);
        rec = await stopRec(page);
        assert.ok(rec.some(s => s.hero.frame === 'slide'), 'slide');

        const x0 = rec.at(-1).hero.x;
        await swipe(page, 100, 0);
        await page.waitForTimeout(500);
        const x1 = (await gameState(page)).hero.x;
        assert.ok(x1 - x0 > 120, `stepped ${x1 - x0}`);
        assert.equal((await gameState(page)).thrown, 0, 'a swipe never throws');
    }));

    it('a tap on the world throws a RAM toward it', () => withPage(PHONE, async (page) => {
        await openSettled(page);
        await page.evaluate(() => {
            const c = document.querySelector('.rr-canvas');
            const r = c.getBoundingClientRect(), k = r.width / 960;
            const o = { bubbles: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.left + 600 * k, clientY: r.top + 220 * k };
            c.dispatchEvent(new PointerEvent('pointerdown', o));
            c.dispatchEvent(new PointerEvent('pointerup', o));
        });
        await page.waitForTimeout(150);
        const s = await gameState(page);
        assert.equal(s.thrown, 1);
        assert.ok(s.rams.length === 1 && s.rams[0].vx > 0 && s.rams[0].vy < -1, `up and ahead, toward the tap: ${JSON.stringify(s.rams)}`);
    }));
});

describe('RAM RUSH: the RAM throw', () => {
    it('J throws one straight ahead from his hand; it flies off and its stick comes back for the next throw', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(120);
        const a = await gameState(page);
        assert.equal(a.rams.length, 1);
        const r = a.rams[0];
        assert.ok(r.x > a.hero.x && r.vx > 800 && Math.abs(r.vy) < 1, JSON.stringify(r));
        assert.ok(r.y < a.hero.y - 40 && r.y > a.hero.y - 120, 'at hand height');
        await page.waitForTimeout(1300);
        assert.equal((await gameState(page)).rams.length, 0, 'gone once off the screen');
        await page.keyboard.press('KeyX');
        await page.waitForTimeout(80);
        assert.equal((await gameState(page)).rams.length, 1, 'X throws too');
    }));

    it('the cooldown: five presses in a blink are one throw, held a moment apart they are more', () => withPage(DESK, async (page) => {
        await openSettled(page);
        for (let k = 0; k < 5; k++) await page.keyboard.press('KeyJ');
        await page.waitForTimeout(100);
        assert.equal((await gameState(page)).thrown, 1);
        await page.waitForTimeout(400);
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(450);
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(50);
        assert.equal((await gameState(page)).thrown, 3);
    }));

    it('a click on the world aims it there (only forward, and not too steep)', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const box = await page.locator('.rr-canvas').boundingBox();
        const at = (gx, gy) => [box.x + gx * box.width / 960, box.y + gy * box.height / 540];
        await page.mouse.click(...at(700, 150));
        await page.waitForTimeout(60);
        let r = (await gameState(page)).rams[0];
        assert.ok(r.vy < -200 && r.vx > 0, `up and ahead ${JSON.stringify(r)}`);
        assert.ok(Math.atan2(-r.vy, r.vx) <= 35 * Math.PI / 180 + 0.01, 'at most 35°');
        await page.waitForTimeout(450);
        await page.mouse.click(...at(60, 400));        // behind him: straight ahead instead
        await page.waitForTimeout(60);
        const rams = (await gameState(page)).rams;
        r = rams.at(-1);
        assert.ok(r.vx > 800 && Math.abs(r.vy) < 1, `behind = straight ${JSON.stringify(r)}`);
    }));

    it('the auto-aim bends a throw toward a target ahead, a little; never one behind or far off its line', () => withPage(DESK, async (page) => {
        const out = await page.evaluate(async () => {
            const { createRams } = await import('/game/ram.js');
            const fly = (targets) => {
                const r = createRams();
                r.throw(100, 300);
                for (let k = 0; k < 20; k++) r.update(1 / 60, targets);
                return r.active()[0];
            };
            return {
                none: fly([]),
                ahead: fly([{ x: 520, y: 220 }]),
                behind: fly([{ x: 40, y: 220 }]),
                offLine: fly([{ x: 420, y: 20 }])
            };
        });
        assert.equal(out.none.vy, 0);
        assert.ok(out.ahead.vy < -100 && out.ahead.y < 300, `bent up ${JSON.stringify(out.ahead)}`);
        assert.ok(Math.atan2(-out.ahead.vy, out.ahead.vx) < 0.85, 'a little, not a homing missile');
        assert.equal(out.behind.vy, 0);
        assert.equal(out.offLine.vy, 0);
    }));

    it('hit(): a stick inside a box is spent on it and gives its damage', () => withPage(DESK, async (page) => {
        const out = await page.evaluate(async () => {
            const { createRams } = await import('/game/ram.js');
            const r = createRams();
            r.throw(100, 300);
            r.update(0.1, []);                       // now at x ≈ 190
            const miss = r.hit({ x: 400, y: 260, w: 60, h: 80 });
            const hit = r.hit({ x: 170, y: 260, w: 60, h: 80 });
            return { miss, hit, left: r.active().length };
        });
        assert.deepEqual(out, { miss: 0, hit: 1, left: 0 });
    }));
});

describe('RAM RUSH: power-ups, XMP first', () => {
    it('XMP: faster, more often, harder for 10s; the same again refills the time, never stacks; then it ends', () => withPage(DESK, async (page) => {
        const out = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const p = createPowerups();
            const stats = () => ['speedMult', 'rofMult', 'damageMult'].map(n => p.getStat(n));
            const off = stats();
            p.activate('xmp');
            const on = stats();
            p.update(6, 0, 0);
            const left = p.remaining('xmp');
            p.activate('xmp');
            const again = { stats: stats(), remaining: p.remaining('xmp'), count: p.active.size };
            p.update(10.1, 0, 0);
            return { off, on, left, again, after: stats(), isOn: p.isOn('xmp') };
        });
        assert.deepEqual(out.off, [1, 1, 1]);
        assert.deepEqual(out.on, [1.6, 0.6, 1.5]);
        assert.ok(Math.abs(out.left - 4) < 1e-9);
        assert.deepEqual(out.again, { stats: [1.6, 0.6, 1.5], remaining: 10, count: 1 });
        assert.deepEqual(out.after, [1, 1, 1]);
        assert.equal(out.isOn, false);
    }));

    it('whatever multiplies a stat, it stays inside its cap', () => withPage(DESK, async (page) => {
        const v = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const { POWERUPS } = await import('/game/config.js');
            POWERUPS.xmp.mults.speedMult = 99;           // a runaway upgrade, say
            const p = createPowerups(); p.activate('xmp');
            const s = p.getStat('speedMult');
            POWERUPS.xmp.mults.speedMult = 1.6;
            return s;
        });
        assert.equal(v, 2.2);
    }));

    it('pickups come along the road no closer than 400 m apart', () => withPage(DESK, async (page) => {
        const out = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const p = createPowerups({ rng });
            const at = [];
            for (let m = 0; m < 3000; m += 1) {
                const next = p.nextAtM;
                p.update(0.1, 2000, m);                  // a big scroll: each pickup leaves before the next
                if (p.nextAtM !== next) at.push(m);       // one was put on the road at this metre
            }
            return at;
        });
        assert.ok(out.length >= 4, out.join());
        assert.ok(out[0] >= 400, `first at ${out[0]}`);
        for (let i = 1; i < out.length; i++) assert.ok(out[i] - out[i - 1] >= 400, out.join());
    }));

    it('running into a pickup turns XMP on: the throws fly 1.6× faster, come 0.6× as often, hit 1.5× harder, with the hot trail', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnPickup('xmp', 330, 400));
        await page.waitForTimeout(500);
        let s = await gameState(page);
        assert.equal(s.taken, 1);
        assert.equal(s.powerups[0].id, 'xmp');
        assert.equal(s.pickups.length, 0, 'taken off the road');
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(40);
        s = await gameState(page);
        const r = s.rams[0];
        assert.ok(Math.abs(r.vx - 1440) < 1, `speed ${r.vx}`);
        assert.equal(r.damage, 1.5);
        assert.equal(r.hot, true);
        assert.ok(s.cooldown <= 0.24 && s.cooldown > 0.15, `cooldown ${s.cooldown}`);
    }));

    it('a RAM that hits a pickup takes it too', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnPickup('xmp', 700, 380));
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(600);
        const s = await gameState(page);
        assert.equal(s.taken, 1);
        assert.equal(s.rams.length, 0, 'the stick was spent on it');
    }));

    it('P freezes its time; the MHz meter climbs while on', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnPickup('xmp', 300, 400));
        await page.waitForTimeout(900);
        await page.keyboard.press('KeyP');
        await page.waitForTimeout(50);
        const a = await gameState(page);
        await page.waitForTimeout(500);
        const b = await gameState(page);
        assert.equal(a.powerups[0].remaining, b.powerups[0].remaining, 'frozen while paused');
        assert.ok(a.mhz > 4500, `mhz ${a.mhz}`);
        await page.keyboard.press('KeyP');
        await page.waitForTimeout(300);
        assert.ok((await gameState(page)).powerups[0].remaining < b.powerups[0].remaining, 'runs again');
    }));
});

const spawnEnemy = (page, id, x) => page.evaluate(async ([id, x]) => (await import('/game/main.js')).testSpawnEnemy(id, x), [id, x]);

describe('RAM RUSH: enemies, the Orange Bot first, and the hero\'s life', () => {
    it('the sheet: every frame has its box, stands on its feet and faces left', () => withPage(DESK, async (page) => {
        await openGame(page);
        const f = await page.evaluate(async () => (await fetch('/game/assets/enemies.json')).json());
        for (const k of ['orangeBot.walk.0', 'orangeBot.walk.1', 'orangeBot.walk.2']) {
            assert.ok(f[k], k);
            assert.deepEqual([f[k].anchor, f[k].faces], [[0.5, 1], 'left']);
        }
        const walk = ['0', '1', '2'].map(n => f[`orangeBot.walk.${n}`]);
        assert.ok(walk.every(w => w.w === walk[0].w && w.h === walk[0].h), 'one box for the walk: the feet do not jump');
    }));

    it('an Orange Bot walks in from the right toward the hero, faster than the road, its legs moving', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await spawnEnemy(page, 'orangeBot', 900);
        await startRec(page);
        await page.waitForTimeout(500);
        const rec = await stopRec(page);
        const xs = rec.map(s => s.enemies[0]?.x).filter(x => x !== undefined);
        const speed = (xs[0] - xs.at(-1)) / ((xs.length - 1) * 0.016);
        assert.ok(speed > 300, `moves left at ${speed.toFixed(0)} px/s, more than the road's 300`);
        assert.ok(rec.every(s => !s.enemies[0] || s.enemies[0].y === 460), 'on the road');
    }));

    it('two RAMs bring it down: the first makes it flash white, the second ends it, the score counts it, the pool takes it back', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await spawnEnemy(page, 'orangeBot', 760);
        await page.keyboard.press('KeyJ');
        // read at the moment of the hit: the flash lasts only 80 ms
        const flash = await page.evaluate(async () => {
            const m = await import('/game/main.js');
            for (const t0 = performance.now(); performance.now() - t0 < 2000;) {
                const e = m.state().enemies[0];
                if (e && e.hp === 1) return { flash: e.flash };
                await new Promise(r => requestAnimationFrame(r));
            }
            return { flash: 'never hit' };
        });
        assert.ok(flash.flash > 0, 'flashes when hit');
        let s;
        await page.waitForTimeout(420);
        await page.keyboard.press('KeyJ');
        await waitState(page, (s) => s.killed === 1, 2000);
        s = await gameState(page);
        assert.deepEqual([s.score, s.xp], [10, 5]);
        await page.waitForTimeout(400);
        assert.equal((await gameState(page)).enemies.length, 0, 'gone after its pop');
        assert.equal((await gameState(page)).hp, 3, 'never touched him');
    }));

    it('the auto-aim now follows the enemies: a throw a bit too high still bends toward one ahead', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await spawnEnemy(page, 'orangeBot', 900);
        const box = await page.locator('.rr-canvas').boundingBox();
        await page.mouse.click(box.x + 900 * box.width / 960, box.y + 330 * box.height / 540);   // above its head
        await page.waitForTimeout(250);
        const r = (await gameState(page)).rams[0];
        assert.ok(!r || r.vy > -30, `bent down toward it: ${JSON.stringify(r)}`);
    }));

    it('touching it costs one heart, then he blinks and is safe for 1.2 s; a second one in that time does no harm', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await spawnEnemy(page, 'orangeBot', 300);
        await page.waitForTimeout(250);
        let s = await gameState(page);
        assert.equal(s.hp, 2);
        assert.ok(s.invuln > 0.8, `safe for a while: ${s.invuln}`);
        await spawnEnemy(page, 'orangeBot', 280);
        await page.waitForTimeout(250);
        assert.equal((await gameState(page)).hp, 2, 'safe');
    }));

    it('jumped over, it does no harm', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(250);                 // high in the air now
        await spawnEnemy(page, 'orangeBot', 260);       // right under him
        await page.waitForTimeout(200);
        await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(600);
        assert.equal((await gameState(page)).hp, 3);
    }));

    it('at the last heart lost: GAME OVER, the world stops; a jump starts a new run with full life', () => withPage(DESK, async (page) => {
        await openSettled(page);
        for (let k = 0; k < 3; k++) {
            await spawnEnemy(page, 'orangeBot', 300);
            await page.waitForTimeout(1350);
        }
        let s = await gameState(page);
        assert.equal(s.hp, 0);
        assert.equal(s.over, true);
        await page.waitForTimeout(300);
        assert.equal((await gameState(page)).distance, s.distance, 'the world stopped');
        await page.waitForTimeout(500);
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        s = await gameState(page);
        assert.deepEqual([s.over, s.hp, s.enemies.length, s.score], [false, 3, 0, 0]);
        assert.ok(s.distance < 200, 'from the start');
    }));

    it('the spawner: nothing before 60 m, then only Orange Bots, never closer than 25 m apart; a kill may drop an XMP', () => withPage(DESK, async (page) => {
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const e = createEnemies(null, frames, { rng });
            e.bossAtM = Infinity;   // the boss holds the others back: it has a test of its own
            const at = [];
            for (let m = 0; m < 1200; m++) {
                const before = e.nextAtM;
                e.update(0.016, 2000, m, null, null, null);   // a big scroll clears each one before the next
                if (e.nextAtM !== before) at.push(m);
            }
            // a sure drop: rng always 0
            const drops = [];
            const sure = createEnemies(null, frames, { rng: () => 0 });
            sure.natural = false;
            sure.spawn('orangeBot', 500);
            const rams = { hit: () => 5 };
            sure.update(0.016, 0, 0, null, rams, { spawn: (id, x, y) => drops.push(id) });
            return { at, drops, ids: e.list().map(x => x.id) };
        });
        assert.ok(out.at[0] >= 60, `first at ${out.at[0]}`);
        // never closer than 25 m, times the difficulty's gap scale at that distance (1 at the start, 0.75 from 3000 m)
        for (let k = 1; k < out.at.length; k++) assert.ok(out.at[k] - out.at[k - 1] >= 25 * (1 - 0.25 * Math.min(1, out.at[k - 1] / 3000)) - 1e-9, out.at.join());
        assert.ok(out.at.length > 20, 'they keep coming');
        assert.deepEqual(out.drops, ['xmp']);
    }));
});

// Plan 5b: the enemies' own attacks. The logic runs in the page on its own (no game loop), step by step at
// 60 fps against a hero standing at x 230, so every number is exact; one test plays it for real.
const rollRun = (page, opts = {}) => page.evaluate(async (opts) => {
    const { createEnemies } = await import('/game/enemies.js');
    const { createRams } = await import('/game/ram.js');
    const frames = await (await fetch('/game/assets/enemies.json')).json();
    const e = createEnemies(null, frames, { rng: () => opts.rng ?? 0 });
    e.natural = false;
    const rams = createRams();
    const hero = { box: { x: 204, y: 342, w: 52, h: 118 }, hit: () => false };
    for (const x of opts.at || [900]) e.spawn(opts.id || 'orangeBot', x, true);
    const log = [], rlog = [];
    let thrownAir = null, thrownDown = null;
    for (let f = 0; f < 60 * (opts.secs || 4); f++) {
        // a RAM straight into the ball high in the air, and one into it lying curled after
        const b = e.list()[0];
        if (opts.throws && b && !thrownAir && b.state === 'attack' && (b.h > 90 || (opts.id === 'blueRunner' && b.x < 600))) {
            rams.throw(b.box.x - 4, b.box.y + b.box.h / 2); thrownAir = { hp: b.hp };
        }
        if (opts.throws && b && thrownAir && !thrownDown && b.state === 'recover') {
            rams.cooldown = 0; rams.throw(b.box.x - 4, b.box.y + b.box.h / 2); thrownDown = { hp: b.hp };
        }
        rams.update(1 / 60, []);
        e.update(1 / 60, 5, 0, hero, rams, null);
        log.push(e.list().map(s => ({ state: s.state, x: s.x, h: s.h, hop: s.hop, hops: s.hops, hp: s.hp, vul: s.vulnerable, clink: s.clink })));
        if (opts.throws) rlog.push(rams.active());
    }
    return opts.throws ? { log, rlog } : log;
}, opts);
const runsOf = (log, k = 0) => {                 // the states one enemy went through, with how long each lasted
    const out = [];
    for (const l of log) {
        const s = l[k]?.state;
        if (!s) continue;
        if (out.at(-1)?.state === s) out.at(-1).frames++; else out.push({ state: s, frames: 1 });
    }
    return out;
};

describe('RAM RUSH: the enemies\' attacks (5b), the Orange Bot\'s Roll & Bounce first', () => {
    it('the sheet has the curl and the ball', () => withPage(DESK, async (page) => {
        await openGame(page);
        const f = await page.evaluate(async () => (await fetch('/game/assets/enemies.json')).json());
        for (const k of ['orangeBot.curl.0', 'orangeBot.ball.0']) assert.deepEqual([f[k]?.anchor, f[k]?.faces], [[0.5, 1], 'left'], k);
    }));

    it('it walks, curls up for half a second (standing still on the road), bounces 2–3 times toward the hero, lies open, then walks on, once', () => withPage(DESK, async (page) => {
        await openGame(page);
        const log = await rollRun(page, { secs: 5 });
        const runs = runsOf(log);
        assert.deepEqual(runs.map(r => r.state), ['patrol', 'telegraph', 'attack', 'recover', 'patrol'], JSON.stringify(runs));
        assert.ok(runs[1].frames >= 30, `the warning lasts at least 0.5 s: ${runs[1].frames} frames`);
        const tele = log.filter(l => l[0]?.state === 'telegraph').map(l => l[0]);
        assert.ok(tele.every((s, i) => s.h === 0 && (i === 0 || Math.abs(tele[i - 1].x - s.x - 5) < 1e-6)), 'still on the road, only scrolled');
        const atk = log.filter(l => l[0]?.state === 'attack').map(l => l[0]);
        assert.ok([2, 3].includes(atk[0].hops), `hops ${atk[0].hops}`);
        assert.ok(Math.max(...atk.map(s => s.h)) > 110, 'bounces high: a slide passes under it');
        assert.ok(atk.every((s, i) => i === 0 || s.x < atk[i - 1].x), 'always toward the hero');
        const landed = log.find(l => l[0]?.state === 'recover')[0];
        assert.ok(landed.x < 230 && landed.x > 100, `the last bounce lands just past him: ${landed.x}`);
    }));

    it('in the air the ball is armoured: a RAM glances off with a spark and is spent; lying curled after, a RAM hurts it', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log, rlog } = await rollRun(page, { secs: 5, throws: true });
        const atk = log.filter(l => l[0]?.state === 'attack');
        assert.ok(atk.some(l => l[0].clink > 0), 'the spark');
        assert.ok(rlog.some(rs => rs.some(r => r.spent && r.vx < 0)), 'the RAM flew back, spent');
        assert.ok(atk.every(l => l[0].hp === 2), 'no harm in the air');
        assert.ok(atk.filter(l => l[0].h > 30).every(l => !l[0].vul) && atk.some(l => l[0].vul), 'open only as it touches the road');
        assert.equal(log.filter(l => l[0]).at(-1)[0].hp, 1, 'hurt while lying curled');
    }));

    it('the director: two in range, only one attacks at a time, the other after the first is done and a short rest', () => withPage(DESK, async (page) => {
        await openGame(page);
        const log = await rollRun(page, { at: [700, 760], secs: 6 });
        const busy = log.map(l => l.filter(s => s.state === 'telegraph' || s.state === 'attack').length);
        assert.ok(busy.every(n => n <= 1), 'never two at once');
        const a = runsOf(log, 0), b = runsOf(log, 1);
        assert.ok(a.some(r => r.state === 'attack'), JSON.stringify(a));
        // the second did not get its turn while the first one attacked (it walked on, or attacked after)
        const firstEnd = log.findIndex(l => l[0]?.state === 'recover');
        const secondStart = log.findIndex(l => l[1]?.state === 'telegraph');
        assert.ok(secondStart === -1 || secondStart >= firstEnd + 0.8 * 60 - 1, `${firstEnd} → ${secondStart}; ${JSON.stringify(b)}`);
    }));

    it('left to chance (config: 75 %), some attack and some only walk; the tests\' own spawns stay calm', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            const yes = createEnemies(null, frames, { rng: () => 0.5 }), no = createEnemies(null, frames, { rng: () => 0.9 });
            yes.spawn('orangeBot', 900); no.spawn('orangeBot', 900);
            return [yes.list()[0].attacks, no.list()[0].attacks];
        });
        assert.deepEqual(out, [true, false]);
        await spawnEnemy(page, 'orangeBot', 900);
        assert.equal((await gameState(page)).enemies[0].attacks, false);
    }));

    it('in the game: it curls, bounces and catches a hero who stands still (one heart)', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('orangeBot', 980, { attack: true }));
        await startRec(page);
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'recover', 4000);
        const rec = await stopRec(page);
        const seen = [...new Set(rec.map(s => s.enemies[0]?.state).filter(Boolean))];
        assert.deepEqual(seen.slice(0, 3), ['patrol', 'telegraph', 'attack'], seen.join());
        assert.equal((await gameState(page)).hp, 2);
        assert.deepEqual(page.problems, []);
    }));
});

describe('RAM RUSH: the Blue Runner and its Charge (5b)', () => {
    it('the sheet: its three run frames share one box, and the charge pose; all stand on their feet facing left', () => withPage(DESK, async (page) => {
        await openGame(page);
        const f = await page.evaluate(async () => (await fetch('/game/assets/enemies.json')).json());
        const run = ['0', '1', '2'].map(n => f[`blueRunner.run.${n}`]);
        assert.ok(run.every(r => r && r.w === run[0].w && r.h === run[0].h), 'one box for the run');
        for (const r of [...run, f['blueRunner.charge.0']]) assert.deepEqual([r.anchor, r.faces], [[0.5, 1], 'left']);
    }));

    it('it runs in, crouches still for 0.6 s with its visor red, charges past the hero at over 600 px/s, stands open, runs on', () => withPage(DESK, async (page) => {
        await openGame(page);
        const log = await rollRun(page, { id: 'blueRunner', secs: 4 });
        const runs = runsOf(log);
        assert.deepEqual(runs.map(r => r.state).slice(0, 4), ['patrol', 'telegraph', 'attack', 'recover'], JSON.stringify(runs));
        assert.ok(runs[1].frames >= 36, `the warning lasts at least 0.6 s: ${runs[1].frames} frames`);
        const tele = log.filter(l => l[0]?.state === 'telegraph').map(l => l[0]);
        assert.ok(tele.every((s, i) => i === 0 || Math.abs(tele[i - 1].x - s.x - 5) < 1e-6), 'crouched, only scrolled with the road');
        const atk = log.filter(l => l[0]?.state === 'attack').map(l => l[0]);
        const speed = (atk[0].x - atk.at(-1).x) / ((atk.length - 1) / 60);
        assert.ok(speed > 600, `charges at ${speed.toFixed(0)} px/s`);
        assert.ok(atk.at(-1).x < 230 - 150, `on past the hero: ${atk.at(-1).x}`);
        assert.ok(log.every(l => !l[0] || l[0].h === 0), 'always on the road');
    }));

    it('a RAM in the charge stops it short: one hp less, thrown back a little, standing open', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log } = await rollRun(page, { id: 'blueRunner', secs: 3, throws: true });
        const k = log.findIndex(l => l[0]?.state === 'attack' && l[0].hp === 1);
        const stopped = log.findIndex(l => l[0]?.hp === 1);
        assert.ok(stopped > 0 && k === -1, 'never charges on once hit');
        assert.equal(log[stopped][0].state, 'recover');
        assert.ok(log[stopped][0].x > log[stopped - 1][0].x, 'thrown back');
        assert.ok(log[stopped][0].x > 300, `stopped well before the hero: ${log[stopped][0].x}`);
    }));

    it('it comes from 500 m on: before that only Orange Bots, from 500 to 1000 m both', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            let seed = 11; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const e = createEnemies(null, frames, { rng });
            e.bossAtM = Infinity;   // the boss holds the others back: it has a test of its own
            const seen = [];
            let m = 0;
            const spawn = e.spawn;
            e.spawn = (id, x, a) => { seen.push([m, id]); return spawn(id, x, a); };
            for (; m < 2500; m++) e.update(0.016, 2000, m, null, null, null);
            return seen;
        });
        assert.ok(out.filter(([m]) => m < 500).every(([, id]) => id === 'orangeBot'), 'only Orange Bots first');
        const later = new Set(out.filter(([m]) => m >= 500 && m < 1000).map(([, id]) => id));
        assert.deepEqual([...later].sort(), ['blueRunner', 'orangeBot']);
    }));

    it('in the game: standing still costs a heart; jumped over in time, it does no harm', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const spawn = () => page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('blueRunner', 980, { attack: true }));
        await spawn();
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'recover', 4000);
        assert.equal((await gameState(page)).hp, 2);
        await waitState(page, (s) => s.enemies.length === 0 && s.invuln === 0, 4000);
        await spawn();
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'attack' && s.enemies[0].x < 470, 4000);
        await page.keyboard.down('ArrowUp');
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'recover', 3000);
        await page.keyboard.up('ArrowUp');
        assert.equal((await gameState(page)).hp, 2, 'cleared it');
        assert.deepEqual(page.problems, []);
    }));
});

// The Spy Drone, in the page on its own at 60 fps: hero(f) gives the hero's box for frame f
const droneRun = (page, opts = {}) => page.evaluate(async (opts) => {
    const { createEnemies } = await import('/game/enemies.js');
    const { ATTACKS } = await import('/game/config.js');
    const frames = await (await fetch('/game/assets/enemies.json')).json();
    const e = createEnemies(null, frames, { rng: () => 0 });
    e.natural = false;
    const stand = { x: 204, y: 342, w: 52, h: 118 }, slide = { x: 175, y: 398, w: 110, h: 62 };
    let hits = 0;
    const hero = { box: stand, hit: () => { hits++; return true; } };
    e.spawn('spyDrone', 900, true);
    const log = [];
    const lockAt = ATTACKS.laser.telegraph - ATTACKS.laser.lock;
    for (let f = 0; f < 60 * 4; f++) {
        const d = e.list()[0];
        // the slide: started as the aim locks, it lasts 0.55 s
        if (opts.slide && d && d.state === 'telegraph' && d.st > lockAt + 0.02 && !hero.slid) { hero.slid = f; hero.box = slide; }
        if (hero.slid && f - hero.slid > 33) hero.box = stand;
        if (opts.ram && d && d.state === 'telegraph' && d.st > 0.2 && !hero.rammed) {
            hero.rammed = true;
            e.update(0, 0, 0, null, { hit: () => 1 }, null);   // a RAM lands on it
        }
        e.update(1 / 60, 5, 0, hero, null, null);
        log.push(e.list().map(s => ({ state: s.state, x: s.x, y: s.y, h: s.h, st: s.st, ax: s.ax, ay: s.ay, dying: s.dying })));
    }
    return { log, hits, lockAt };
}, opts);

describe('RAM RUSH: the Spy Drone and its Laser (5b)', () => {
    it('the sheet: three frames (the propellers), one box, facing left', () => withPage(DESK, async (page) => {
        await openGame(page);
        const f = await page.evaluate(async () => (await fetch('/game/assets/enemies.json')).json());
        const fly = ['0', '1', '2'].map(n => f[`spyDrone.fly.${n}`]);
        assert.ok(fly.every(r => r && r.w === fly[0].w && r.h === fly[0].h && r.faces === 'left'));
    }));

    it('it flies over his head, stops in the air (the road goes on under it), charges 0.7 s aiming at him, locks, fires 0.35 s, cools, flies on', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log, hits, lockAt } = await droneRun(page);
        const runs = runsOf(log);
        assert.deepEqual(runs.map(r => r.state).slice(0, 5), ['patrol', 'telegraph', 'attack', 'recover', 'patrol'], JSON.stringify(runs));
        assert.ok(Math.abs(runs[1].frames - 42) <= 1 && Math.abs(runs[2].frames - 21) <= 1, JSON.stringify(runs));
        assert.ok(log.every(l => !l[0] || l[0].y <= 460 - 150), 'never down on the road: over his head (342)');
        const held = log.filter(l => ['telegraph', 'attack', 'recover'].includes(l[0]?.state)).map(l => l[0].x);
        assert.ok(held.every(x => x === held[0]), 'holds its place on screen');
        const tele = log.filter(l => l[0]?.state === 'telegraph').map(l => l[0]);
        const locked = tele.filter(s => s.st > lockAt + 0.02);
        assert.ok(locked.length >= 12 && locked.every(s => s.ax === locked[0].ax && s.ay === locked[0].ay), 'the aim is locked for the last 0.25 s');
        assert.ok(locked[0].ax < 0 && locked[0].ay > 0, 'down and back, at him');
        assert.equal(hits, 1, 'a hero who stands still is hit, once');
    }));

    it('a slide as the aim locks: the beam passes over him', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log, hits } = await droneRun(page, { slide: true });
        assert.ok(log.some(l => l[0]?.state === 'attack'), 'it did fire');
        assert.equal(hits, 0);
    }));

    it('one RAM before it fires brings it down: no beam', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log, hits } = await droneRun(page, { ram: true });
        assert.ok(log.some(l => l[0]?.dying > 0), 'it went down');
        assert.ok(!log.some(l => l[0]?.state === 'attack' && !(l[0].dying > 0)), 'never fired');
        assert.equal(hits, 0);
    }));

    it('from 1000 m on: before that no drones, after it they come too', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const e = createEnemies(null, frames, { rng });
            e.bossAtM = Infinity;   // the boss holds the others back: it has a test of its own
            const seen = [];
            let m = 0;
            const spawn = e.spawn;
            e.spawn = (id, x, a) => { seen.push([m, id]); return spawn(id, x, a); };
            for (; m < 3000; m++) e.update(0.016, 2000, m, null, null, null);
            return seen;
        });
        assert.ok(out.filter(([m]) => m < 1000).every(([, id]) => id !== 'spyDrone'));
        assert.ok(out.some(([m, id]) => m >= 1000 && id === 'spyDrone'));
    }));

    it('in the game: standing still under it costs a heart', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('spyDrone', 980, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'recover', 4000);
        assert.equal((await gameState(page)).hp, 2);
        assert.deepEqual(page.problems, []);
    }));
});

// The Fire Crawler, in the page on its own at 60 fps. hero: 'stand', 'slide', or 'jump' (in the air, 130px
// up, while a spike that is up is near him); opts.ram: a RAM on it during its warning; opts.bot: an Orange
// Bot walking through the spikes
const fireRun = (page, opts = {}) => page.evaluate(async (opts) => {
    const { createEnemies } = await import('/game/enemies.js');
    const frames = await (await fetch('/game/assets/enemies.json')).json();
    const e = createEnemies(null, frames, { rng: () => 0 });
    e.natural = false;
    const stand = { x: 204, y: 342, w: 52, h: 118 }, slide = { x: 175, y: 398, w: 110, h: 62 };
    const up = { x: 204, y: 342 - 130, w: 52, h: 118 };
    const hits = [];
    let f = 0;
    const hero = { box: opts.hero === 'slide' ? slide : stand, hit: () => { hits.push(f); return true; } };
    e.spawn('fireCrawler', 900, true);
    const log = [];
    let rammed = false;
    for (; f < 60 * 4; f++) {
        const c = e.list().find(s => s.id === 'fireCrawler');
        if (opts.ram && c && c.state === 'telegraph' && !rammed) {
            rammed = true; e.update(0, 0, 0, null, { hit: () => 5 }, null);
        }
        if (opts.bot && f === 60) e.spawn('orangeBot', 520, false);
        if (opts.hero === 'jump') hero.box = e.spikes().some(p => p.up > 0 && Math.abs(p.x - 230) < 120) ? up : stand;
        e.update(1 / 60, 5, 0, hero, null, null);
        log.push({ c: e.list().find(s => s.id === 'fireCrawler') || null, bot: e.list().find(s => s.id === 'orangeBot') || null,
            spikes: e.spikes().map(p => ({ x: p.x, up: p.up })) });
    }
    return { log, hits };
}, opts);

describe('RAM RUSH: the Fire Crawler and its Spikes (5b)', () => {
    it('the sheet: four crawl frames in one box; three spike frames, each taller, standing on the road', () => withPage(DESK, async (page) => {
        await openGame(page);
        const f = await page.evaluate(async () => (await fetch('/game/assets/enemies.json')).json());
        const crawl = ['0', '1', '2', '3'].map(n => f[`fireCrawler.crawl.${n}`]);
        assert.ok(crawl.every(r => r && r.w === crawl[0].w && r.h === crawl[0].h && r.faces === 'left'));
        const sp = ['0', '1', '2'].map(n => f[`spikes.rise.${n}`]);
        assert.ok(sp[0].h < sp[1].h && sp[1].h < sp[2].h, sp.map(r => r.h).join());
        assert.ok(sp.every(r => r.anchor[1] === 1));
    }));

    it('it stops; for 0.6 s the road cracks and glows in a row ahead of the hero; then three spikes burst out ~200px ahead and ride the road to him; it stays, then crawls on', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log } = await fireRun(page);
        const runs = runsOf(log.map(l => [l.c].filter(Boolean)));
        assert.deepEqual(runs.map(r => r.state).slice(0, 5), ['patrol', 'telegraph', 'attack', 'recover', 'patrol'], JSON.stringify(runs));
        assert.ok(runs[1].frames >= 36, `warning ${runs[1].frames} frames`);
        const cracks = log.filter(l => l.c?.state === 'telegraph').slice(1);   // they open on its second frame
        assert.ok(cracks.every(l => l.spikes.length === 3 && l.spikes.every(p => p.up === 0)), 'three cracks, nothing up yet');
        const xs = cracks[0].spikes.map(p => p.x);
        assert.ok(xs[1] - xs[0] === 50 && xs[2] - xs[1] === 50, xs.join());
        const out = log.find(l => l.spikes.some(p => p.up === 1));
        assert.ok(out.spikes[0].x > 230 + 150, `they come up well ahead of him: ${out.spikes[0].x}`);
        const riding = log.filter(l => l.spikes.length).map(l => l.spikes[0].x);
        assert.ok(riding.every((x, i) => i === 0 || Math.abs(riding[i - 1] - x - 5) < 1e-6), 'they ride the road');
        assert.ok(log.at(-1).spikes.length === 0, 'and go back down');
    }));

    it('standing still they hurt; a slide does not help; a jump over them does', () => withPage(DESK, async (page) => {
        await openGame(page);
        // only the spikes' hits (the crawler itself, riding the road behind them, comes to him after)
        const before = (r) => r.hits.filter(f => r.log[f - 1]?.spikes.some(p => p.up > 0.5 && Math.abs(p.x - 230) < 60)).length;
        const stand = await fireRun(page, { hero: 'stand' });
        const slide = await fireRun(page, { hero: 'slide' });
        const jump = await fireRun(page, { hero: 'jump' });
        assert.deepEqual([before(stand) > 0, before(slide) > 0, before(jump)], [true, true, 0]);
    }));

    it('a RAM kill in its warning closes the cracks: no spikes', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log } = await fireRun(page, { ram: true });
        assert.ok(log.every(l => l.spikes.every(p => p.up === 0)));
        assert.ok(log.at(-1).spikes.length === 0);
    }));

    it('they are the road\'s, not a weapon against enemies: an Orange Bot walks through them unharmed', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log } = await fireRun(page, { bot: true });
        const met = log.filter(l => l.bot && l.spikes.some(p => p.up > 0.5 && Math.abs(p.x - l.bot.x) < 30));
        assert.ok(met.length > 0, 'it did cross them');
        assert.ok(log.every(l => !l.bot || l.bot.hp === 2));
    }));

    it('from 1500 m on: not before', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            let seed = 9; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const e = createEnemies(null, frames, { rng });
            e.bossAtM = Infinity;   // the boss holds the others back: it has a test of its own
            const seen = [];
            let m = 0;
            const spawn = e.spawn;
            e.spawn = (id, x, a) => { seen.push([m, id]); return spawn(id, x, a); };
            for (; m < 3500; m++) e.update(0.016, 2000, m, null, null, null);
            return seen;
        });
        assert.ok(out.filter(([m]) => m < 1500).every(([, id]) => id !== 'fireCrawler'));
        assert.ok(out.some(([m, id]) => m >= 1500 && id === 'fireCrawler'));
    }));

    it('in the game: standing still, the spikes cost a heart', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('fireCrawler', 980, { attack: true }));
        await waitState(page, (s) => s.spikes.some(p => p.up === 1), 4000);
        await waitState(page, (s) => s.hp === 2, 3000);
        assert.deepEqual(page.problems, []);
    }));
});

// The Malware Core, in the page on its own at 60 fps. hero: 'stand', or 'dodge' (a slide under a high
// beam, a jump over a low one, while it fires)
const bossRun = (page, opts = {}) => page.evaluate(async (opts) => {
    const { createEnemies } = await import('/game/enemies.js');
    const frames = await (await fetch('/game/assets/enemies.json')).json();
    const e = createEnemies(null, frames, { rng: () => 0.3 });
    e.natural = false;
    const stand = { x: 204, y: 342, w: 52, h: 118 }, slide = { x: 175, y: 398, w: 110, h: 62 }, jump = { x: 204, y: 342 - 110, w: 52, h: 118 };
    const hits = [];
    let f = 0;
    const hero = { box: stand, hit: (d) => { hits.push([f, d]); return true; } };
    e.spawn('mechBoss', 1020, true);
    const log = [];
    for (; f < 60 * (opts.secs || 8); f++) {
        const b = e.list()[0];
        hero.box = opts.hero === 'dodge' && b && (b.state === 'attack' || (b.state === 'telegraph' && b.st > 0.75)) ? (b.lane === 'high' ? slide : jump) : stand;
        e.update(1 / 60, 5, 0, hero, null, null);
        const s = e.list()[0];
        log.push(s ? { state: s.state, x: s.x, lane: s.lane, st: s.st } : null);
    }
    return { log, hits };
}, opts);

describe('RAM RUSH: the Malware Core (mini-boss) and its Beam (5b)', () => {
    it('the sheet: its four steps share one box; charge, shot and stunned are in; the sheet fits a phone (2048px)', () => withPage(DESK, async (page) => {
        await openGame(page);
        const f = await page.evaluate(async () => (await fetch('/game/assets/enemies.json')).json());
        const walk = ['0', '1', '2', '3'].map(n => f[`mechBoss.walk.${n}`]);
        assert.ok(walk.every(r => r && r.w === walk[0].w && r.h === walk[0].h));
        for (const k of ['mechBoss.charge.0', 'mechBoss.fire.0', 'mechBoss.stunned.0']) assert.ok(f[k], k);
        const img = await page.evaluate(async () => { const i = new Image(); i.src = '/game/assets/enemies.webp'; await i.decode(); return [i.width, i.height]; });
        assert.ok(img[0] <= 2048, `no wider than 2048px: ${img[0]}`);
    }));

    it('it walks in, holds its place (the road runs under it), and fires again and again: 0.9 s warning, 0.5 s beam, high and low in turn', () => withPage(DESK, async (page) => {
        await openGame(page);
        const { log } = await bossRun(page);
        const held = log.filter(l => l && l.x <= 760);
        assert.ok(held.length > 300 && held.every(l => l.x === 760), 'stands at 760');
        const runs = runsOf(log.map(l => [l].filter(Boolean)));
        const teles = runs.filter(r => r.state === 'telegraph'), shots = runs.filter(r => r.state === 'attack');
        assert.ok(teles.length >= 2, JSON.stringify(runs));
        assert.ok(teles.every(r => Math.abs(r.frames - 54) <= 1) && shots.every(r => Math.abs(r.frames - 30) <= 1), JSON.stringify(runs));
        const order = log.filter((l, i) => l?.state === 'telegraph' && log[i - 1]?.state !== 'telegraph').map(l => l.lane);
        assert.ok(order.length >= 2 && order.every((x, i) => i === 0 || x !== order[i - 1]), order.join());
    }));

    it('its beam takes two hearts from a hero who stands; a slide under the high one and a jump over the low one take none', () => withPage(DESK, async (page) => {
        await openGame(page);
        const stand = await bossRun(page, { hero: 'stand' });
        const dodge = await bossRun(page, { hero: 'dodge' });
        assert.ok(stand.hits.length >= 2 && stand.hits.every(([, d]) => d === 2), JSON.stringify(stand.hits));
        assert.deepEqual(dodge.hits, []);
    }));

    it('RAMs bring it down (16 hits): the score, and the director is free again', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            const e = createEnemies(null, frames, { rng: () => 0.99 });
            e.natural = false;
            e.spawn('mechBoss', 760, true);
            const hero = { box: { x: 204, y: 342, w: 52, h: 118 }, hit: () => true };
            for (let f = 0; f < 80; f++) e.update(1 / 60, 5, 0, hero, null, null);   // into its warning
            const busy = e.list()[0].state;
            for (let k = 0; k < 16; k++) e.update(1 / 60, 5, 0, hero, { hit: () => 1 }, null);
            for (let f = 0; f < 50; f++) e.update(1 / 60, 5, 0, hero, null, null);    // its pop, the rest after an attack
            e.spawn('orangeBot', 800, true);
            const states = [];
            for (let f = 0; f < 60; f++) { e.update(1 / 60, 5, 0, hero, null, null); const b = e.list().find(s => s.id === 'orangeBot'); if (b) states.push(b.state); }
            return { busy, killed: e.killed, score: e.score, states: [...new Set(states)] };
        });
        assert.equal(out.busy, 'telegraph');
        assert.deepEqual([out.killed, out.score], [1, 200]);
        assert.ok(out.states.includes('telegraph'), `another may attack now: ${out.states}`);
    }));

    it('it comes every 1000 m, and while it stands nothing else comes; after it, they come again', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            let seed = 3; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const e = createEnemies(null, frames, { rng });
            const seen = [];
            let m = 0;
            const spawn = e.spawn;
            e.spawn = (id, x, a) => { seen.push([m, id]); return spawn(id, x, a); };
            const kill = { hit: () => 99 };
            let standing = 0;
            for (; m < 2100; m++) {
                e.update(0.016, 30, m, null, m === 1100 || m === 2050 ? kill : null, null);   // a RAM storm at 1100 m
                if (m === 1099) standing = e.list().filter(s => s.id === 'mechBoss').length;
            }
            return { seen, standing };
        });
        const bosses = out.seen.filter(([, id]) => id === 'mechBoss').map(([m]) => m);
        assert.deepEqual(bosses, [1000, 2000]);
        assert.equal(out.standing, 1);
        assert.ok(!out.seen.some(([m]) => m > 1000 && m < 1100), 'nothing while it stands');
        assert.ok(out.seen.some(([m, id]) => m > 1100 && m < 2000 && id !== 'mechBoss'), 'they come again after it');
    }));

    it('in the game: it walks in, and a beam on a hero who stands takes two hearts', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('mechBoss', 1060, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'recover', 6000);
        assert.equal((await gameState(page)).hp, 1);
        assert.deepEqual(page.problems, []);
    }));
});

// Parry (5b): the logic on its own (a boss in the page, 60 fps), then the keys, the mouse and the touch button
const parryRun = (page, opts) => page.evaluate(async (opts) => {
    const { createEnemies } = await import('/game/enemies.js');
    const { ATTACKS } = await import('/game/config.js');
    const frames = await (await fetch('/game/assets/enemies.json')).json();
    const e = createEnemies(null, frames, { rng: () => 0.3 });
    e.natural = false;
    const hits = [];
    const hero = { box: { x: 204, y: 342, w: 52, h: 118 }, hit: (d) => { hits.push(d); return true; } };
    e.spawn('mechBoss', 760, true);
    const log = [];
    let result = null, f = 0, hpAfterRam = null;
    for (; f < 60 * 5; f++) {
        const b = e.list()[0];
        // pressed `before` seconds before the beam would land
        if (result === null && b.state === 'telegraph' && ATTACKS.beam.telegraph - b.st <= opts.before) result = e.parry();
        if (opts.ram && result === 'perfect' && hpAfterRam === null && b.state === 'stunned') {
            e.update(0, 0, 0, null, { hit: () => 1 }, null); hpAfterRam = e.list()[0].hp;
        }
        e.update(1 / 60, 5, 0, hero, null, null);
        log.push(e.list()[0].state);
    }
    return { result, hits, log, xp: e.xp, parries: e.parries, hpAfterRam, none: (() => { const n = createEnemies(null, frames); return n.parry(); })() };
}, opts);

describe('RAM RUSH: Parry (5b)', () => {
    it('pressed in the last 0.25 s before the beam: perfect, the shot never comes, the boss is stunned 1.5 s, bonus XP', () => withPage(DESK, async (page) => {
        await openGame(page);
        const r = await parryRun(page, { before: 0.2 });
        assert.equal(r.result, 'perfect');
        assert.deepEqual(r.hits, [], 'no beam on him');
        const stunned = runsOf(r.log.map(s => [{ state: s }])).find(x => x.state === 'stunned');
        assert.ok(stunned && Math.abs(stunned.frames - 90) <= 1, JSON.stringify(stunned));
        assert.deepEqual([r.xp, r.parries], [20, 1]);
        assert.ok(r.log.lastIndexOf('telegraph') > r.log.indexOf('stunned'), 'and then it fights on');
    }));

    it('stunned, a RAM hurts it twice as much (and the parry itself did it no harm)', () => withPage(DESK, async (page) => {
        await openGame(page);
        const r = await parryRun(page, { before: 0.2, ram: true });
        assert.equal(r.hpAfterRam, 16 - 2);
    }));

    it('too early (0.4 s before) or with no boss there: a miss, and the beam lands as ever', () => withPage(DESK, async (page) => {
        await openGame(page);
        const r = await parryRun(page, { before: 0.4 });
        assert.equal(r.result, 'miss');
        assert.ok(r.hits.length >= 1 && r.hits[0] === 2);
        assert.ok(!r.log.includes('stunned'));
        assert.equal(r.none, 'miss');
    }));

    it('in the game: E at the right moment parries; a miss rests the parry 1 s, and pressing again then does nothing', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('mechBoss', 1060, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.12 && s.enemies[0].st < 0.3, 6000);
        await page.keyboard.press('KeyE');                  // far too early
        let s = await gameState(page);
        assert.ok(s.parryCool > 0.8, `resting: ${s.parryCool}`);
        await waitState(page, (s) => s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.72, 3000);
        await page.keyboard.press('KeyE');                  // the right moment, but still resting: nothing
        await waitState(page, (s) => s.enemies[0].state !== 'telegraph', 2000);
        s = await gameState(page);
        assert.deepEqual([s.enemies[0].state, s.parries], ['attack', 0]);
        await waitState(page, (s) => s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.72, 6000);
        await page.keyboard.press('KeyE');
        await waitState(page, (s) => s.enemies[0].state !== 'telegraph', 2000);
        s = await gameState(page);
        assert.deepEqual([s.enemies[0].state, s.parries], ['stunned', 1]);
        assert.deepEqual(page.problems, []);
    }));

    it('a perfect parry freezes the world for a blink (hit-stop)', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('mechBoss', 1060, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.72, 6000);
        const d = await page.evaluate(async () => {
            const m = await import('/game/main.js');
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
            // by time, not by frames (the test browser may draw faster than 60 fps)
            const t0 = performance.now(), d0 = m.state().distance;
            let still = null;
            while (performance.now() - t0 < 300) {
                await new Promise(r => requestAnimationFrame(r));
                if (still === null && m.state().distance !== d0) still = performance.now() - t0;
            }
            return { still, moved: m.state().distance - d0 };
        });
        assert.ok(d.still >= 50 && d.still <= 200, `held still ${d.still} ms`);
        assert.ok(d.moved > 0, 'then on');
    }));

    it('the right mouse button parries, and its menu does not open over the game', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('mechBoss', 1060, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.72, 6000);
        const box = await page.locator('.rr-canvas').boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
        await waitState(page, (s) => s.enemies[0].state === 'stunned', 1000);
        assert.equal((await gameState(page)).thrown, 0, 'not a throw');
        const blocked = await page.evaluate(() => !document.querySelector('.rr-canvas').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        assert.equal(blocked, true);
    }));

    it('on a touch screen: a PARRY button at the bottom right; a touch on it parries and throws nothing', () => withPage({ width: 844, height: 390, mobile: true }, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('mechBoss', 1060, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.72, 6000);
        await page.evaluate(async () => {
            const { PARRY } = await import('/game/config.js');
            // it grows with the HUD from the bottom right corner, by at most maxScale
            const b = PARRY.button, s = Math.min((await import('/game/main.js')).state().hudScale, b.maxScale);
            const c = document.querySelector('.rr-canvas'), r = c.getBoundingClientRect();
            const o = { bubbles: true, pointerId: 11, pointerType: 'touch', isPrimary: true,
                clientX: r.left + (960 - (960 - b.x) * s) * r.width / 960, clientY: r.top + (540 - (540 - b.y) * s) * r.height / 540 };
            c.dispatchEvent(new PointerEvent('pointerdown', o));
            c.dispatchEvent(new PointerEvent('pointerup', o));
        });
        await waitState(page, (s) => s.enemies[0].state === 'stunned', 1000);
        assert.equal((await gameState(page)).thrown, 0);
    }));
});

describe('RAM RUSH: power-ups, Liquid Cooling (4b)', () => {
    it('a shield for 8 s: it takes the next blow and breaks; picked again it is one shield, with its time refilled', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const p = createPowerups();
            const none = p.absorb();
            p.activate('cooling');
            p.update(3, 0, 0);
            p.activate('cooling');
            const refilled = [p.remaining('cooling'), p.active.size];
            const first = p.absorb();
            const after = [p.isOn('cooling'), p.absorb()];
            p.activate('cooling');
            p.update(8.1, 0, 0);
            return { none, refilled, first, after, ended: p.isOn('cooling'), stats: ['speedMult', 'rofMult', 'damageMult'].map(n => p.getStat(n)) };
        });
        assert.equal(out.none, 0, 'no shield, nothing taken');
        assert.deepEqual(out.refilled, [8, 1]);
        assert.ok(out.first > 0.5, 'took it, and he is safe a moment');
        assert.deepEqual(out.after, [false, 0], 'broken: the next one is his');
        assert.equal(out.ended, false, 'over after 8 s');
        assert.deepEqual(out.stats, [1, 1, 1], 'it changes no throw');
    }));

    it('on the road both come (XMP more often); a fallen enemy may drop either', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const { createEnemies } = await import('/game/enemies.js');
            let seed = 4; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const p = createPowerups({ rng });
            const road = { xmp: 0, cooling: 0 };
            for (let k = 0; k < 500; k++) road[p.pick('road')]++;
            // an enemy that falls with the dice: 0.5 (it walks), 0 (it drops), then which one: a die just past
            // XMP's share of the chances is Liquid Cooling, whatever comes after in the list
            const { POWERUPS } = await import('/game/config.js');
            const total = Object.values(POWERUPS).reduce((a, d) => a + d.dropChance, 0);
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            const dice = [0.5, 0, (POWERUPS.xmp.dropChance + 0.001) / total]; let n = 0;
            const e = createEnemies(null, frames, { rng: () => dice[n++ % dice.length] });
            e.natural = false;
            e.spawn('orangeBot', 500);
            const drops = [];
            e.update(0.016, 0, 0, null, { hit: () => 5 }, { spawn: (id) => drops.push(id) });
            return { road, drops };
        });
        assert.ok(out.road.xmp > out.road.cooling && out.road.cooling > 100, JSON.stringify(out.road));
        assert.deepEqual(out.drops, ['cooling']);
    }));

    it('in the game: run into it, the bubble is on; an Orange Bot breaks it instead of a heart, and the next blow is his', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnPickup('cooling', 330, 400));
        await waitState(page, (s) => s.powerups.some(p => p.id === 'cooling'), 3000);
        await spawnEnemy(page, 'orangeBot', 300);
        await waitState(page, (s) => !s.powerups.some(p => p.id === 'cooling'), 2000);
        let s = await gameState(page);
        assert.equal(s.hp, 3);
        assert.ok(s.invuln > 0.4, `safe a moment: ${s.invuln}`);
        await waitState(page, (s) => s.invuln === 0 && s.enemies.length === 0, 3000);
        await spawnEnemy(page, 'orangeBot', 300);
        await waitState(page, (s) => s.hp === 2, 2000);
        assert.deepEqual(page.problems, []);
    }));
});

describe('RAM RUSH: power-ups, Drone Assist (4b)', () => {
    it('8 s: every 0.8 s one bolt at the nearest target ahead of the drone and in range; none behind it, none out of range, none when off', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const { createRams } = await import('/game/ram.js');
            const drone = { x: 150, y: 310 };
            const run = (targets, secs, on = true) => {
                const p = createPowerups(), r = createRams();
                if (on) p.activate('drone');
                const seen = [];
                for (let f = 0; f < secs * 60; f++) {
                    p.update(1 / 60, 0, 0);
                    p.droneStep(1 / 60, drone, targets, r);
                    r.update(1 / 60, []);
                    for (const b of r.bolts()) if (!seen.some(q => Math.abs(q.vx - b.vx) < 1e-6 && Math.abs(q.vy - b.vy) < 1e-6 && q.x > b.x - 200)) seen.push(b);
                }
                return { shots: p.droneShots || 0, first: r.bolts()[0] || null, p };
            };
            const near = { x: 450, y: 400 }, far = { x: 700, y: 400 }, behind = { x: 60, y: 400 }, tooFar = { x: 900, y: 400 };
            const a = run([far, near], 2.5);       // 3 shots in 2.5 s (at 0, 0.8, 1.6, and 2.4)
            const b = run([behind, tooFar], 2);
            const c = run([near], 2, false);
            // the aim: the nearest one
            const p = createPowerups(), r = createRams(); p.activate('drone');
            p.droneStep(0.016, drone, [far, near], r);
            const bolt = r.bolts()[0];
            return { shots: [a.shots, b.shots, c.shots], aim: [Math.sign(bolt.vx), Math.sign(bolt.vy), Math.round(Math.atan2(bolt.vy, bolt.vx) * 100) / 100,
                Math.round(Math.atan2(near.y - drone.y, near.x - (drone.x + 12)) * 100) / 100] };
        });
        assert.deepEqual(out.shots, [4, 0, 0]);
        assert.equal(out.aim[2], out.aim[3], 'at the nearest');
    }));

    it('its bolt hurts an enemy like a RAM, and glances off the Orange Bot ball in the air', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createRams } = await import('/game/ram.js');
            const r = createRams();
            r.bolt(100, 300, 300, 300, 1000, 1);
            r.update(0.15, []);
            const dmg = r.hit({ x: 230, y: 280, w: 40, h: 40 });
            r.bolt(100, 300, 300, 300, 1000, 1);
            r.update(0.15, []);
            const at = r.deflect({ x: 230, y: 280, w: 40, h: 40 });
            const after = r.bolts()[0];
            return { dmg, spark: !!at, back: after.vx < 0, nothing: r.hit({ x: 230, y: 200, w: 60, h: 160 }) };
        });
        assert.deepEqual(out, { dmg: 1, spark: true, back: true, nothing: 0 });
    }));

    it('in the game: run into it, the drone glows and brings down an Orange Bot on its own; the hero threw nothing', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnPickup('drone', 330, 400));
        await waitState(page, (s) => s.powerups.some(p => p.id === 'drone'), 3000);
        await spawnEnemy(page, 'orangeBot', 820);
        await waitState(page, (s) => s.killed === 1, 6000);
        const s = await gameState(page);
        assert.ok(s.droneShots >= 2, `shots ${s.droneShots}`);
        assert.equal(s.thrown, 0, 'not a throw of his');
        assert.deepEqual(page.problems, []);
    }));

    it('on the road it comes too, with its own look (a lime ring)', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            let seed = 8; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const p = createPowerups({ rng });
            const n = { xmp: 0, cooling: 0, drone: 0 };
            for (let k = 0; k < 600; k++) n[p.pick('road')]++;
            return n;
        });
        assert.ok(out.drone > 100 && out.xmp > out.drone, JSON.stringify(out));
    }));
});

describe('RAM RUSH: XP, levels and the RAM tier (step 7)', () => {
    it('xpNeeded = 100 × level^1.5; the level follows the total; each level is one RAM tier up, the last one holds', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createProgression, xpNeeded } = await import('/game/progression.js');
            const p = createProgression();
            const steps = [];
            for (const total of [99, 100, 100 + 283 - 1, 100 + 283, 100 + 283 + 520 + 800 + 1118, 99999]) {
                const up = p.set(total);
                steps.push([p.level, p.into, up, p.tier().name]);
            }
            return { need: [1, 2, 3, 4].map(xpNeeded), steps, run: p.fromRun(10, 95), back: p.set(5) };
        });
        assert.deepEqual(out.need, [100, 283, 520, 800]);
        assert.deepEqual(out.steps.slice(0, 4), [[1, 99, 0, 'DDR3'], [2, 0, 1, 'DDR4'], [2, 282, 0, 'DDR4'], [3, 0, 1, 'DDR5']]);
        assert.deepEqual(out.steps[4].slice(0, 2), [6, 0], 'several levels at once');
        assert.equal(out.steps[4][2], 3);
        assert.equal(out.steps[5][3], 'DDR5-8000', 'the last tier holds');
        assert.equal(out.run, 10 + 9, 'enemies + 1 per 10 m');
        assert.equal(out.back, 0, 'XP never goes down');
    }));

    it('his tier multiplies under XMP, and the two together stay inside the cap', () => withPage(DESK, async (page) => {
        await openGame(page);
        const v = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const p = createPowerups();
            p.base.damageMult = 1.5;
            const ddr5 = p.getStat('damageMult');
            p.activate('xmp');
            const both = p.getStat('damageMult');
            p.base.damageMult = 2;
            return [ddr5, both, p.getStat('damageMult')];
        });
        assert.deepEqual(v, [1.5, 2.25, 2.5]);
    }));

    it('in the game: running gives XP; enough of it is a level up to DDR4, and the throws hit 1.25×', () => withPage(DESK, async (page) => {
        await openSettled(page);
        let s = await gameState(page);
        assert.deepEqual([s.level, s.tier], [1, 'DDR3']);
        await page.waitForTimeout(2500);
        s = await gameState(page);
        assert.ok(s.xpTotal >= 2, `from the distance: ${s.xpTotal}`);
        await page.evaluate(async () => (await import('/game/main.js')).testXp(100));
        await waitState(page, (s) => s.level === 2, 1000);
        await page.keyboard.press('KeyJ');
        await waitState(page, (s) => s.rams.length > 0, 1000);
        s = await gameState(page);
        assert.deepEqual([s.tier, s.rams[0].damage], ['DDR4', 1.25]);
        assert.deepEqual(page.problems, []);
    }));

    it('game over keeps the records (score, distance, level); a new run starts again at level 1 with DDR3', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(async () => (await import('/game/main.js')).testXp(100));
        await waitState(page, (s) => s.level === 2, 1000);
        for (let k = 0; k < 3; k++) {
            await spawnEnemy(page, 'orangeBot', 300);
            await page.waitForTimeout(1350);
        }
        let s = await gameState(page);
        assert.equal(s.over, true);
        assert.equal(s.records.level, 2);
        assert.ok(s.records.distance > 0);
        const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ramrush-records')));
        assert.deepEqual(stored, s.records);
        await page.waitForTimeout(500);
        await page.keyboard.press('Space');
        await waitState(page, (s) => !s.over, 1000);
        s = await gameState(page);
        assert.deepEqual([s.level, s.tier, s.records.level], [1, 'DDR3', 2]);
    }));

    it('a record is only ever raised: a worse run leaves it as it was', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { saveRecords, readRecords } = await import('/game/progression.js');
            localStorage.removeItem('ramrush-records');
            const a = saveRecords({ score: 50, level: 3, distance: 400 });
            const b = saveRecords({ score: 20, level: 4, distance: 100 });
            return { a: a.beat, b: b.beat, now: readRecords() };
        });
        assert.deepEqual(out.a, { score: true, level: true, distance: true });
        assert.deepEqual(out.b, { score: false, level: true, distance: false });
        assert.deepEqual(out.now, { score: 50, level: 4, distance: 400 });
    }));

    it('with storage refused (a private window), it plays the same and only forgets', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { saveRecords, readRecords } = await import('/game/progression.js');
            Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
            return { saved: saveRecords({ score: 5, level: 1, distance: 10 }).best, read: readRecords() };
        });
        assert.deepEqual(out.read, { score: 0, level: 0, distance: 0 });
        assert.deepEqual(out.saved, { score: 5, level: 1, distance: 10 });
    }));
});

describe('RAM RUSH: difficulty that rises (step 8)', () => {
    it('over 3000 m the road goes from 300 to 450 px/s and the enemies come 25 % closer together; then it holds', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { difficulty } = await import('/game/config.js');
            return [0, 1500, 3000, 9000].map(m => { const d = difficulty(m); return [d.speed, d.gapScale]; });
        });
        assert.deepEqual(out, [[300, 1], [375, 0.875], [450, 0.75], [450, 0.75]]);
    }));

    it('in the game: far along, the road really runs faster', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const speedNow = () => page.evaluate(async () => {
            const m = await import('/game/main.js');
            const t0 = performance.now(), d0 = m.state().distance;
            await new Promise(r => setTimeout(r, 500));
            return (m.state().distance - d0) / ((performance.now() - t0) / 1000);
        });
        const start = await speedNow();
        await page.evaluate(async () => (await import('/game/main.js')).testWarp(3200));
        const late = await speedNow();
        assert.ok(start > 260 && start < 340, `at the start ${start.toFixed(0)}`);
        assert.ok(late > 400 && late < 500, `far along ${late.toFixed(0)}`);
        assert.equal((await gameState(page)).speed, 450);
    }));

    it('the enemies come closer together in time far along than at the start', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const { difficulty, PX_PER_M } = await import('/game/config.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            const secondsApart = (from) => {
                let seed = 6; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
                const e = createEnemies(null, frames, { rng });
                e.bossAtM = Infinity; e.nextAtM = from;
                let m = from, t = 0; const at = [];
                while (at.length < 30) {
                    const sp = difficulty(m).speed, dt = 1 / 60;
                    const before = e.nextAtM;
                    e.update(dt, 2000, m, null, null, null);
                    if (e.nextAtM !== before) at.push(t);
                    m += sp * dt / PX_PER_M; t += dt;
                }
                return (at.at(-1) - at[0]) / (at.length - 1);
            };
            return [secondsApart(60), secondsApart(4000)];
        });
        assert.ok(out[1] < out[0] * 0.6, `seconds between two: ${out.map(x => x.toFixed(2)).join(' → ')}`);
    }));

    it('fair at full speed: the spikes still come up ~220 px ahead of the hero, and every warning lasts as long', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            const run = (scroll) => {
                const e = createEnemies(null, frames, { rng: () => 0 });
                e.natural = false;
                const hero = { box: { x: 204, y: 342, w: 52, h: 118 }, hit: () => true };
                e.spawn('fireCrawler', 960, true);
                let warn = 0, upAt = null;
                for (let f = 0; f < 240 && upAt === null; f++) {
                    e.update(1 / 60, scroll, 0, hero, null, null);
                    if (e.list()[0]?.state === 'telegraph') warn++;
                    const sp = e.spikes();
                    if (sp.length && sp[0].up > 0) upAt = sp[0].x;
                }
                return { warn, upAt };
            };
            return [run(5), run(7.5)];
        });
        for (const r of out) {
            assert.ok(Math.abs(r.warn - 36) <= 1, `warning frames ${r.warn}`);
            assert.ok(r.upAt - 230 > 190 && r.upAt - 230 < 240, `comes up ${(r.upAt - 230).toFixed(0)} px ahead`);
        }
    }));
});

describe('RAM RUSH: the pause button (8c.2)', () => {
    const PHONE_L = { width: 844, height: 390, mobile: true };
    // where the button is on the screen (it grows with the HUD from the top right corner: s), and how many
    // CSS px a game px is
    const btn = (page) => page.evaluate(async () => {
        const { PAUSE_BUTTON: b } = await import('/game/config.js');
        const s = (await import('/game/main.js')).state().hudScale;
        const r = document.querySelector('.rr-canvas').getBoundingClientRect(), k = r.width / 960;
        return { x: r.left + (960 - (960 - b.x) * s) * k, y: r.top + b.y * s * k, k, s };
    });
    const touchAt = (page, x, y) => page.evaluate(([x, y]) => {
        const c = document.querySelector('.rr-canvas');
        const o = { bubbles: true, pointerId: 21, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y };
        c.dispatchEvent(new PointerEvent('pointerdown', o));
        c.dispatchEvent(new PointerEvent('pointerup', o));
    }, [x, y]);

    it('a click on it pauses (the same as P), another resumes; nothing is thrown', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const b = await btn(page);
        await page.mouse.click(b.x, b.y);
        await waitState(page, (s) => s.paused === true, 2000);
        const a = await gameState(page);
        await page.waitForTimeout(300);
        assert.equal((await gameState(page)).distance, a.distance, 'the world stands still');
        await page.mouse.click(b.x, b.y);
        await waitState(page, (s) => s.paused === false, 2000);
        assert.equal((await gameState(page)).thrown, 0, 'not a throw');
        await page.keyboard.press('KeyP');
        await waitState(page, (s) => s.paused === true, 2000);
        assert.deepEqual(page.problems, []);
    }));

    it('a tap on a phone held sideways pauses and throws nothing', () => withPage(PHONE_L, async (page) => {
        await openSettled(page);
        const b = await btn(page);
        await touchAt(page, b.x, b.y);
        await waitState(page, (s) => s.paused === true, 2000);
        assert.equal((await gameState(page)).thrown, 0);
        await touchAt(page, b.x, b.y);
        await waitState(page, (s) => s.paused === false, 2000);
    }));

    it('its reach is at least 44 CSS px on the screen, even on a small canvas; just outside, it is only a tap on the world', () => withPage(PHONE_L, async (page) => {
        await openSettled(page);
        const b = await btn(page);
        assert.ok(b.k * b.s * 34 < 44, `the drawn button is smaller than a finger here: ${(b.k * b.s * 34).toFixed(0)} px`);
        await touchAt(page, b.x - 20, b.y + 20);            // 20 px off each way: inside 44 × 44
        await waitState(page, (s) => s.paused === true, 2000);
        await touchAt(page, b.x - 20, b.y + 20);
        await waitState(page, (s) => s.paused === false, 2000);
        await touchAt(page, b.x - 30, b.y);                 // 30 px to the side: outside
        await page.waitForTimeout(150);
        const s = await gameState(page);
        assert.deepEqual([s.paused, s.thrown], [false, 1], 'a tap on the world: it threw');
    }));
});

describe('RAM RUSH: the hearts (8c.3)', () => {
    const setHp = (page, n) => page.evaluate(async (n) => (await import('/game/main.js')).testHp(n), n);
    // count the coloured pixels of the heart row (the full hearts' red, the flash, the pulse's glow)
    const redPixels = (page) => page.evaluate(() => {
        const d = document.querySelector('.rr-canvas').getContext('2d').getImageData(10, 12, 170, 36).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 110 && d[i + 2] < 110) n++;
        return n;
    });

    it('losing one: the row shakes for 0.3 s, the heart that went flashes and drains, then it is empty; the others stay full', () => withPage(DESK, async (page) => {
        await openSettled(page);
        let s = await gameState(page);
        assert.deepEqual([s.hp, s.hearts.shake, s.hearts.last], [3, 0, false]);
        const full = await redPixels(page);
        await setHp(page, 2);
        await waitState(page, (s) => s.hearts.shake > 0.2, 1000);
        s = await gameState(page);
        assert.equal(s.hearts.lost, 2, 'the third heart went');
        await waitState(page, (s) => s.hearts.shake === 0, 1000);
        const two = await redPixels(page);
        assert.ok(two < full * 0.75 && two > full * 0.5, `two full hearts of three: ${two} of ${full} red pixels`);
        assert.deepEqual(page.problems, []);
    }));

    it('gaining one: it pops, 1.3 → 1, over 0.3 s', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await setHp(page, 1);
        await waitState(page, (s) => s.hearts.lost === 1 && s.hearts.shake === 0, 1000);   // the loss, seen and over
        await setHp(page, 2);
        await waitState(page, (s) => s.hearts.pop > 0.2, 1000);
        await waitState(page, (s) => s.hearts.pop === 0, 1000);
    }));

    it('the last heart: a slow pulse (it keeps changing), and a red outline; with two it is still', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await setHp(page, 1);
        await waitState(page, (s) => s.hearts.lost === 1 && s.hearts.shake === 0, 1000);   // the loss (its shake and flash) over
        const seen = new Set();
        for (let k = 0; k < 14; k++) { seen.add(await redPixels(page)); await page.waitForTimeout(90); }
        const v = [...seen];
        assert.ok((Math.max(...v) - Math.min(...v)) / Math.max(...v) > 0.15, `it pulses: ${v.join()}`);
        await setHp(page, 2);
        await waitState(page, (s) => s.hearts.pop > 0, 1000);              // the HUD has seen the new heart …
        await waitState(page, (s) => s.hearts.pop === 0 && !s.hearts.last, 1500);   // … and its pop is over
        const still = new Set();
        for (let k = 0; k < 6; k++) { still.add(await redPixels(page)); await page.waitForTimeout(90); }
        assert.equal(still.size, 1, `no pulse with two: ${[...still].join()}`);
    }));

    it('with reduced motion: no shake, no pop, no pulse; the colours still change', () => withPage(DESK, async (page) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openSettled(page);
        await setHp(page, 1);
        await waitState(page, (s) => s.hearts.last, 1000);
        await page.waitForTimeout(400);
        const seen = new Set();
        for (let k = 0; k < 8; k++) { seen.add(await redPixels(page)); await page.waitForTimeout(80); }
        const v = [...seen];
        // (a few pixels of its glow blend with the road scrolling behind: a pulse would change it by far more)
        assert.ok((Math.max(...v) - Math.min(...v)) / Math.max(...v) < 0.05, `a still last heart: ${v.join()}`);
        assert.ok(Math.min(...v) > 100, 'but red');
        // the row does not move while it loses one: the left edge of the first heart stays where it was
        const edge = () => page.evaluate(() => {
            const d = document.querySelector('.rr-canvas').getContext('2d').getImageData(0, 14, 40, 30).data;
            for (let x = 0; x < 40; x++) for (let y = 0; y < 30; y++) { const i = (y * 40 + x) * 4; if (d[i] > 200 && d[i + 1] < 120) return x; }
            return -1;
        });
        await setHp(page, 2);
        await waitState(page, (s) => !s.hearts.last && s.hearts.lost === 1, 1000);
        await page.waitForTimeout(100);                                        // its pop (none: reduced motion) has had its frame
        await setHp(page, 1);
        await waitState(page, (s) => s.hearts.shake > 0.1, 1000);
        const xs = [];
        for (let k = 0; k < 6; k++) { xs.push(await edge()); await page.waitForTimeout(40); }
        assert.equal(new Set(xs).size, 1, `it does not shake: ${xs.join()}`);
    }));
});

describe('RAM RUSH: the XP bar and the level (8c.4)', () => {
    const addXp = (page, n) => page.evaluate(async (n) => (await import('/game/main.js')).testXp(n), n);
    const bar = async (page) => (await gameState(page)).hearts.bar;

    it('it shows "LV n" and xp / xpNeeded, and fills smoothly toward it (never in one jump)', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await addXp(page, 60);
        await waitState(page, (s) => s.hearts.bar.nums.startsWith('6'), 1000);
        const shown = [];
        for (let k = 0; k < 6; k++) { shown.push((await bar(page)).shown); await page.waitForTimeout(40); }
        assert.ok(shown[0] < 0.55 && shown.at(-1) > shown[0], `it climbs: ${shown.map(x => x.toFixed(2)).join()}`);
        await page.waitForTimeout(700);
        const b = await bar(page);
        assert.match(b.nums, /^6\d \/ 100$/);
        assert.ok(Math.abs(b.shown - 0.6) < 0.05, `settled near 60 %: ${b.shown}`);
        assert.equal(b.level, 1);
    }));

    it('a level up: the bar runs to the end first, flashes, then starts again from the XP left over; the tier follows the bar', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await addXp(page, 140);                                   // 100 for level 2, about 40 over
        await waitState(page, (s) => s.level === 2, 1000);
        let b = await bar(page);
        assert.equal(b.level, 1, 'still showing level 1 while it fills to the end');
        assert.equal(b.nums, '', 'no numbers while it runs to the end');
        await waitState(page, (s) => s.hearts.bar.flash > 0, 2000);
        b = await bar(page);
        assert.ok(b.level === 2 && b.shown < 0.1, `then from the bottom: ${JSON.stringify(b)}`);
        await page.waitForTimeout(800);
        b = await bar(page);
        const s = await gameState(page);
        assert.equal(b.nums, `${s.xpInto} / ${s.xpNeed}`);
        assert.ok(Math.abs(b.shown - s.xpInto / s.xpNeed) < 0.05, `the rest: ${b.shown}`);
        assert.equal(s.xpNeed, 283);
    }));

    it('several levels at once: it runs through each, one after the other', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await addXp(page, 100 + 283 + 10);                        // two levels
        await waitState(page, (s) => s.level === 3, 1000);
        const seen = new Set();
        const t0 = Date.now();
        while (Date.now() - t0 < 3000) {
            const b = await bar(page); seen.add(b.level);
            if (b.level === 3) break;
            await page.waitForTimeout(30);
        }
        assert.deepEqual([...seen].sort(), [1, 2, 3]);
    }));

    it('a new run: back to level 1, an empty bar', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await addXp(page, 140);
        await waitState(page, (s) => s.hearts.bar.level === 2, 3000);
        for (let k = 0; k < 3; k++) { await spawnEnemy(page, 'orangeBot', 300); await page.waitForTimeout(1350); }
        await waitState(page, (s) => s.over, 2000);
        await page.waitForTimeout(500);
        await page.keyboard.press('Space');
        await waitState(page, (s) => !s.over && s.hearts.bar.level === 1, 2000);
        assert.ok((await bar(page)).shown < 0.05);
    }));
});

describe('RAM RUSH: the power-up rows (8c.5)', () => {
    const take = (page, ids) => page.evaluate(async (ids) => {
        const m = await import('/game/main.js');
        ids.forEach((id, k) => m.testSpawnPickup(id, 250 + k * 15, 400));
    }, ids);

    it('what each does is written from its numbers in config.js, in the page language', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const fx = await page.evaluate(async () => (await import('/game/main.js')).hudEffects());
        assert.deepEqual(fx, { xmp: 'RAM ×1.6 ταχύτητα · ×1.7 ρυθμός · ×1.5 ζημιά', cooling: 'ασπίδα · 1 χτύπημα', drone: 'drone · βολή ανά 0.8 s' });
    }));

    it('a row per power-up on, in the order taken; taken, its icon pops and its name shines for 1 s; taken again, it does so again', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await take(page, ['cooling', 'drone']);
        await waitState(page, (s) => s.rows.length === 2, 3000);
        let s = await gameState(page);
        assert.deepEqual(s.rows.map(r => r.id), ['cooling', 'drone']);
        assert.ok(s.rows[0].since < 0.5, 'just taken');
        await page.waitForTimeout(1200);
        s = await gameState(page);
        assert.ok(s.rows.every(r => r.since > 1), 'the shine is over');
        await take(page, ['cooling']);
        await waitState(page, (s) => s.rows[0].since < 0.5, 3000);
        s = await gameState(page);
        assert.deepEqual(s.rows.map(r => r.id), ['cooling', 'drone'], 'the same row, not a second one');
        assert.ok(Math.abs(s.rows[0].remaining - 8) < 0.5, 'its time refilled');
    }));

    it('the last 3 s blink (not before); with reduced motion they do not', () => withPage(DESK, async (page) => {
        await openSettled(page);
        const blinks = await page.evaluate(async () => {
            const { createPowerups } = await import('/game/powerups.js');
            const out = {};
            for (const rm of [false, true]) {
                const p = createPowerups({ reducedMotion: rm });
                p.activate('drone');
                const seen = { early: new Set(), late: new Set() };
                for (let f = 0; f < 8 * 60; f++) {
                    p.update(1 / 60, 0, 0);
                    const left = p.remaining('drone');
                    if (left > 3.05) seen.early.add(p.blinkOff(left));
                    else if (left > 0.05) seen.late.add(p.blinkOff(left));
                }
                out[rm ? 'reduced' : 'normal'] = { early: [...seen.early], late: [...seen.late].sort() };
            }
            return out;
        });
        assert.deepEqual(blinks.normal, { early: [false], late: [false, true] });
        assert.deepEqual(blinks.reduced, { early: [false], late: [false] });
    }));
});

describe('RAM RUSH: the floating +XP and the boss bar (8c.7)', () => {
    it('an enemy beaten: "+XP" rises over it, drifts back with the road, and is gone in under a second', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await spawnEnemy(page, 'orangeBot', 760);
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(420);
        await page.keyboard.press('KeyJ');
        // read at the moment it falls: where it was, and the float that came up
        const seen = await page.evaluate(async () => {
            const m = await import('/game/main.js');
            let lastX = null;
            for (const t0 = performance.now(); performance.now() - t0 < 2500;) {
                const s = m.state();
                if (s.enemies[0] && s.enemies[0].dying <= 0) lastX = s.enemies[0].x;
                if (s.floats.length) return { f: s.floats[0], lastX };
                await new Promise(r => requestAnimationFrame(r));
            }
            return null;
        });
        assert.ok(seen, 'a float came up');
        assert.equal(seen.f.text, '+5 XP');
        assert.ok(Math.abs(seen.f.x - seen.lastX) < 60, `over it: ${seen.f.x} vs ${seen.lastX}`);
        assert.ok(seen.f.y < 460 - 40, 'at the top of it, not at its feet');
        await page.waitForTimeout(300);
        const later = (await gameState(page)).floats[0];
        assert.ok(later && later.t > seen.f.t && later.x < seen.f.x, 'it ages and drifts back with the road');
        await waitState(page, (s) => s.floats.length === 0, 1500);
    }));

    it('at most 8 at once: the oldest gives way to the newest', () => withPage(DESK, async (page) => {
        await openGame(page);
        const texts = await page.evaluate(async () => {
            const { createHud } = await import('/game/hud.js');
            const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
            const fx = { shield: () => '', drone: () => '' };
            const h = createHud(ctx, { hudScale: 1 }, { txt: () => ({ fx }) });
            for (let n = 1; n <= 10; n++) { h.floatXp(100, 200, n); h.floats(0.01, 0); }
            return h.floatInfo().map(f => f.text).sort();
        });
        assert.equal(texts.length, 8);
        assert.ok(!texts.includes('+1 XP') && !texts.includes('+2 XP') && texts.includes('+10 XP'), texts.join());
    }));

    it('the boss: a life bar over its head only while it stands; a blow leaves a pale trail that waits, then drains down to the life; a perfect parry floats its XP too', () => withPage(DESK, async (page) => {
        await openSettled(page);
        assert.equal((await gameState(page)).bossBar, null, 'no boss, no bar');
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('mechBoss', 900));
        await waitState(page, (s) => s.bossBar && s.bossBar.life === 1, 2000);
        // RAMs until one lands; read the bar right after the blow
        const hit = await page.evaluate(async () => {
            const m = await import('/game/main.js');
            for (const t0 = performance.now(); performance.now() - t0 < 6000;) {
                const b = m.state().bossBar;
                if (b && b.life < 1) return b;
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', bubbles: true }));
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', bubbles: true }));
                await new Promise(r => setTimeout(r, 50));
            }
            return null;
        });
        assert.ok(hit, 'a RAM landed');
        assert.ok(hit.trail > hit.life + 0.02 && hit.hold > 0, `the trail waits above the life: ${JSON.stringify(hit)}`);
        await page.waitForTimeout(1200);
        const b = (await gameState(page)).bossBar;
        assert.ok(Math.abs(b.trail - b.life) < 0.001, `drained down to it: ${JSON.stringify(b)}`);

        // a perfect parry: its XP floats over the boss
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'telegraph' && s.enemies[0].st > 0.72, 8000);
        await page.keyboard.press('KeyE');
        await waitState(page, (s) => s.enemies[0].state === 'stunned', 1000);
        const { xp } = await page.evaluate(async () => (await import('/game/config.js')).PARRY);
        const f = (await gameState(page)).floats;
        assert.ok(f.some(o => o.text === `+${xp} XP`), JSON.stringify(f));
    }));
});

describe('RAM RUSH: the sounds', () => {
    const sound = async (page) => (await gameState(page)).sound;
    const asked = async (page, name) => (await sound(page)).asked[name] || 0;
    const waitAsked = (page, name, ms = 4000) => page.evaluate(`(async () => {
        const m = await import('/game/main.js');
        for (const t0 = performance.now(); performance.now() - t0 < ${ms};) {
            if ((m.state().sound.asked[${JSON.stringify(name)}] || 0) > 0) return;
            await new Promise(r => requestAnimationFrame(r));
        }
        throw new Error('no ' + ${JSON.stringify(name)} + ' in ${ms} ms');
    })()`);
    const ready = (page) => waitState(page, (s) => s.sound.loaded === 19, 8000);

    it('fetched only once the game is open (none with the page); all 19 decode; the music loops at exactly 16 s', () => withPage(DESK, async (page) => {
        assert.deepEqual((await gameFiles(page)).filter(f => f.includes('/audio/')), [], 'nothing before');
        await openSettled(page);
        await ready(page);
        const files = await gameFiles(page);
        assert.ok(files.includes('/game/assets/audio/sounds.json') && files.includes('/game/assets/audio/music/loop_main.mp3'), files.join());
        const s = await sound(page);
        assert.deepEqual([s.music, s.loop], [true, { loop: true, loopStart: 0, loopEnd: 16 }]);
        assert.deepEqual(page.problems, []);
    }));

    it('the moves and the fight: a throw, a jump, a hit, a pop, a pickup, a blow taken', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await ready(page);
        await page.keyboard.press('KeyJ');
        await waitAsked(page, 'ram_throw');
        await page.keyboard.press('ArrowUp');
        await waitAsked(page, 'jump');
        await page.waitForTimeout(900);
        await spawnEnemy(page, 'orangeBot', 760);
        await page.keyboard.press('KeyJ');
        await waitAsked(page, 'enemy_hit');
        await page.waitForTimeout(420);
        await page.keyboard.press('KeyJ');
        await waitAsked(page, 'enemy_pop');
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnPickup('xmp', 300, 400));
        await waitAsked(page, 'powerup_xmp');
        await spawnEnemy(page, 'orangeBot', 560);           // calm: it walks into him
        await waitAsked(page, 'hero_hurt', 6000);
        const s = await sound(page);
        assert.ok(s.heard.ram_throw >= 1 && s.heard.enemy_pop === 1, 'and they were heard: ' + JSON.stringify(s.heard));
    }));

    it("an attack's warning is heard as long as it lasts: the Spy Drone's charge, then its shot; the Blue Runner's dash", () => withPage(DESK, async (page) => {
        await openSettled(page);
        await ready(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('spyDrone', 900, { attack: true }));
        await waitState(page, (s) => s.enemies[0] && s.enemies[0].state === 'telegraph', 6000);
        assert.equal(await asked(page, 'laser_charge_short'), 1, 'the charge starts with the warning');
        assert.equal(await asked(page, 'laser_fire'), 0);
        await waitAsked(page, 'laser_fire', 3000);
    }).then(() => withPage(DESK, async (page) => {
        // (alone: one attack at a time, so not while the drone is still about)
        await openSettled(page);
        await ready(page);
        await page.evaluate(async () => (await import('/game/main.js')).testSpawnEnemy('blueRunner', 980, { attack: true }));
        await waitAsked(page, 'enemy_dash', 8000);
    })));

    it('paused (P), the sound holds still and comes back with the game; a hidden tab is silent too', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await ready(page);
        await page.keyboard.press('KeyP');
        await waitState(page, (s) => s.sound.ctx === 'suspended', 2000);
        await page.keyboard.press('KeyP');
        await waitState(page, (s) => s.sound.ctx === 'running', 2000);
        await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await waitState(page, (s) => s.sound.ctx === 'suspended', 2000);
        await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await waitState(page, (s) => s.sound.ctx === 'running', 2000);
    }));

    it('M (or the speaker button) turns it off and on; off is remembered next time; and nothing is heard meanwhile', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await ready(page);
        await page.keyboard.press('KeyM');
        await waitState(page, (s) => s.sound.muted === true, 2000);
        assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('ramrush-sound'))), { muted: true });
        const before = await sound(page);
        await page.keyboard.press('KeyJ');
        await waitState(page, (s) => s.thrown === 1, 2000);
        const after = await sound(page);
        assert.equal(after.asked.ram_throw, (before.asked.ram_throw || 0) + 1);
        assert.equal(after.heard.ram_throw || 0, before.heard.ram_throw || 0, 'off: not heard');
        assert.deepEqual([after.gain, after.music], [0, true], 'the music goes on, unheard (it comes back in time with the game)');
        await page.keyboard.press('Escape');
        await openGame(page);
        assert.equal((await sound(page)).muted, true, 'still off');
        // the speaker button, left of the pause button
        const b = await page.evaluate(async () => {
            const { SOUND_BUTTON: b } = await import('/game/config.js');
            const r = document.querySelector('.rr-canvas').getBoundingClientRect(), k = r.width / 960;
            return { x: r.left + b.x * k, y: r.top + b.y * k };
        });
        await page.mouse.click(b.x, b.y);
        await waitState(page, (s) => s.sound.muted === false, 2000);
        const s = await gameState(page);
        assert.deepEqual([s.paused, s.thrown], [false, 0], 'only the sound: no pause, no throw');
    }));

    it('game over: the music stops and its sound plays; a new run starts the music again; closed, the sound is gone', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await ready(page);
        await page.evaluate(async () => (await import('/game/main.js')).testHp(0));
        await waitState(page, (s) => s.over === true, 2000);
        let s = await sound(page);
        assert.deepEqual([s.music, s.asked.game_over], [false, 1]);
        await page.waitForTimeout(800);
        await page.keyboard.press('KeyJ');
        await waitState(page, (s) => s.over === false && s.sound.music === true, 2000);
        await page.evaluate(async () => { window.__rrAudio = (await import('/game/main.js')).testAudio(); });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__rrAudio.state() === 'closed', null, { timeout: 2000 });
    }));

    it('with the browser keeping no storage, the sound still turns off and on', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await page.evaluate(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('denied'); } }); });
        await page.keyboard.press('KeyM');
        await waitState(page, (s) => s.sound.muted === true, 2000);
        await page.keyboard.press('KeyM');
        await waitState(page, (s) => s.sound.muted === false, 2000);
        assert.deepEqual(page.problems, []);
    }));
});

describe('RAM RUSH: obstacles on the road (6, 6c)', () => {
    // Presses a key the moment an obstacle's hurting part comes within `lead` px of his front (in the page,
    // frame by frame, so the timing does not depend on the test's own pace); holds it `holdMs`
    const pressWhenNear = (page, code, lead, holdMs = 0) => page.evaluate(async ([code, lead, holdMs]) => {
        const m = await import('/game/main.js');
        for (const t0 = performance.now(); performance.now() - t0 < 6000;) {
            const s = m.state(), o = s.obstacles[0];
            if (o && o.hazard.x < s.hero.box.x + s.hero.box.w + lead) break;
            await new Promise(r => requestAnimationFrame(r));
        }
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        await new Promise(r => setTimeout(r, holdMs));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    }, [code, lead, holdMs]);
    const spawnObstacle = (page, id, x) => page.evaluate(async ([id, x]) => (await import('/game/main.js')).testSpawnObstacle(id, x), [id, x]);
    // until the obstacle has gone past him (its hurting part behind his back)
    const passed = (page) => waitState(page, (s) => !s.obstacles[0] || s.obstacles[0].hazard.x + s.obstacles[0].hazard.w < s.hero.box.x - 5, 6000);

    it('their art is fetched only with the game, one sheet', () => withPage(DESK, async (page) => {
        assert.deepEqual((await gameFiles(page)).filter(f => f.includes('obstacles')), []);
        await openGame(page);
        const files = await gameFiles(page);
        assert.ok(files.includes('/game/assets/obstacles.webp') && files.includes('/game/assets/obstacles.json'), files.join());
    }));

    it('a barrier: run into it and it costs a heart (once); jumped, nothing', () => withPage(DESK, async (page) => {
        await openSettled(page);
        await spawnObstacle(page, 'barrier', 700);
        await passed(page);
        let s = await gameState(page);
        assert.deepEqual([s.hp, s.obstacleHits], [2, 1]);
        await page.waitForTimeout(1300);                       // his safe time over
        await spawnObstacle(page, 'barrier', 900);
        await pressWhenNear(page, 'ArrowUp', 20, 400);
        await passed(page);
        s = await gameState(page);
        assert.deepEqual([s.hp, s.obstacleHits], [2, 1], 'jumped clean over it');
    }));

    for (const id of ['boomGate', 'cables', 'sign']) {
        it(`${id}: standing, it costs a heart; a slide just before goes under, and he stays down until he is out (longer than a slide)`, () => withPage(DESK, async (page) => {
            await openSettled(page);
            await spawnObstacle(page, id, 700);
            await passed(page);
            assert.equal((await gameState(page)).hp, 2, 'standing: hit');
            await page.waitForTimeout(1300);
            await spawnObstacle(page, id, 900);
            await startRec(page);
            await pressWhenNear(page, 'ArrowDown', 30);
            await passed(page);
            await page.waitForTimeout(250);
            const rec = await stopRec(page);
            assert.equal(rec.at(-1).hp, 2, 'slid under it');
            const low = rec.filter(s => s.hero.frame === 'slide');
            const ms = (low.length - 1) * 16;
            assert.ok(ms > 700, `down for ${ms} ms, more than one slide (550)`);
            assert.ok(rec.some(s => s.ceiling) && rec.at(-1).hero.frame !== 'slide', 'up again once out');
        }));
    }

    it('the laser grid: off, its lenses blinking (0.3 s), then the beam on (1.2 s), and again; it hurts only while on', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createObstacles } = await import('/game/obstacles.js');
            const frames = await (await fetch('/game/assets/obstacles.json')).json();
            const at = (t) => { const o = createObstacles(null, frames); o.natural = false; o.spawn('laserGrid', 0); o.update(t, 0, 0, null, null); return o.list()[0].phase; };
            const phases = [0.2, 0.6, 0.9, 1.9, 2.1, 2.6].map(at);
            // he stands under the beam from the start: hurt only once it is on
            const o = createObstacles(null, frames); o.natural = false; o.spawn('laserGrid', 0);
            const b = o.list()[0].hazard;
            let hitAt = null, t = 0;
            const hero = { box: { x: b.x + 100, y: 460 - 118, w: 52, h: 118 }, hit: () => { if (hitAt === null) hitAt = t; return true; } };
            for (; t < 2; t += 1 / 60) o.update(1 / 60, 0, 0, hero, null);
            // and slid under it, never
            const o2 = createObstacles(null, frames); o2.natural = false; o2.spawn('laserGrid', 0);
            let low = 0;
            const slider = { box: { x: b.x + 100, y: 460 - 62, w: 110, h: 62 }, hit: () => { low++; return true; } };
            for (let k = 0; k < 240; k++) o2.update(1 / 60, 0, 0, slider, null);
            return { phases, hitAt, low };
        });
        assert.deepEqual(out.phases, ['off', 'warn', 'on', 'on', 'off', 'warn']);
        assert.ok(out.hitAt > 0.77 && out.hitAt < 0.85, `hurt as it lit (0.8 s): ${out.hitAt}`);
        assert.equal(out.low, 0);
    }));

    it('where they come: from 120 m, the kinds of each zone, never closer than 400 px; none while a boss stands; only barriers while a laser is about', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createObstacles } = await import('/game/obstacles.js');
            const { OBSTACLE_SPAWNS, SPAWNS, PX_PER_M } = await import('/game/config.js');
            const frames = await (await fetch('/game/assets/obstacles.json')).json();
            const run = (enemies, seed) => {
                const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
                const o = createObstacles(null, frames, { rng });
                const seen = [];
                let m = 0, gapOk = true;
                const spawn = o.spawn;
                o.spawn = (id, x) => {
                    const before = o.list();
                    const right = Math.max(-Infinity, ...before.map(b => b.x + b.w));
                    if (before.length && 1000 - right < OBSTACLE_SPAWNS.minGap) gapOk = false;
                    seen.push([m, id]);
                    return spawn(id, x);
                };
                const scroll = 10;
                for (; m < 2600; m += scroll / PX_PER_M) o.update(1 / 60, scroll, m, null, enemies);
                return { seen, gapOk };
            };
            const calm = { boss: () => null, justIn: () => false, lasersAbout: () => false, hold() {} };
            return {
                calm: run(calm, 3), zones: OBSTACLE_SPAWNS.zones, zoneM: SPAWNS.zoneM,
                boss: run({ ...calm, boss: () => ({}) }, 3).seen.length,
                // even with the metres between them all but gone, the 400 px rule holds on its own
                tight: (() => { const was = OBSTACLE_SPAWNS.gapM; OBSTACLE_SPAWNS.gapM = [1, 2]; const r = run(calm, 4); OBSTACLE_SPAWNS.gapM = was; return r; })(),
                lasers: [...new Set(run({ ...calm, lasersAbout: () => true }, 3).seen.map(([, id]) => id))]
            };
        });
        const { seen, gapOk } = out.calm;
        assert.ok(seen.length > 15, `${seen.length} of them`);
        assert.ok(seen[0][0] >= 120, `the first at ${seen[0][0]} m`);
        for (const [m, id] of seen) assert.ok(out.zones[Math.min(out.zones.length - 1, Math.floor(m / out.zoneM))].includes(id), `${id} at ${m} m`);
        assert.ok(seen.some(([, id]) => id === 'laserGrid'), 'all kinds come, in the end');
        assert.equal(gapOk, true, 'never closer than 400 px');
        assert.ok(out.tight.seen.length > 50 && out.tight.gapOk, `packed tight: ${out.tight.seen.length}, still 400 px apart`);
        assert.equal(out.boss, 0);
        assert.deepEqual(out.lasers, ['barrier']);
    }));

    it('while a slide obstacle is on the road, no laser comes: a Spy Drone gives way to an Orange Bot, the boss waits', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createEnemies } = await import('/game/enemies.js');
            const frames = await (await fetch('/game/assets/enemies.json')).json();
            let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const e = createEnemies(null, frames, { rng });
            e.bossAtM = 2000;
            e.noLasers = true;
            const seen = [];
            const spawn = e.spawn;
            let m = 1000;
            e.spawn = (id, x, a) => { seen.push(id); return spawn(id, x, a); };
            for (; m < 3000; m++) e.update(0.016, 2000, m, null, null, null);
            return [...new Set(seen)];
        });
        assert.ok(!out.includes('spyDrone') && !out.includes('mechBoss'), out.join());
        assert.ok(out.includes('orangeBot'));
    }));

    it('flying cars pass far behind now and then, some the other way (the art faces left: those are mirrored)', () => withPage(DESK, async (page) => {
        await openGame(page);
        const out = await page.evaluate(async () => {
            const { createObstacles } = await import('/game/obstacles.js');
            const frames = await (await fetch('/game/assets/obstacles.json')).json();
            let seed = 9; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const o = createObstacles(null, frames, { rng });
            o.natural = false;
            const ways = new Set(); let most = 0; const moved = [];
            for (let k = 0; k < 60 * 60; k++) {
                const before = o.cars();
                o.update(1 / 60, 5, 0, null, null);
                const after = o.cars();
                most = Math.max(most, after.length);
                for (const c of after) ways.add(c.back);
                if (before.length === 1 && after.length === 1 && before[0].back === after[0].back) moved.push(after[0].back ? after[0].x > before[0].x : after[0].x < before[0].x);
            }
            return { ways: [...ways].sort(), most, moved: moved.every(Boolean) };
        });
        assert.deepEqual(out.ways, [false, true]);
        assert.ok(out.most >= 1 && out.most <= 3);
        assert.equal(out.moved, true, 'each keeps its way across');
    }));
});
