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

describe('RAM RUSH: the swipes, on a phone', () => {
    const PHONE = { width: 390, height: 844, mobile: true };
    // A finger on the touch area: down, a few moves along (dx, dy), up
    const swipe = (page, dx, dy) => page.evaluate(([dx, dy]) => {
        const pad = document.querySelector('.rr-pad');
        const r = pad.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const ev = (type, k) => pad.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + dx * k, clientY: y + dy * k }));
        ev('pointerdown', 0); ev('pointermove', 0.3); ev('pointermove', 0.7); ev('pointermove', 1); ev('pointerup', 1);
    }, [dx, dy]);

    it('the touch area tells what the swipes do', () => withPage(PHONE, async (page) => {
        await openSettled(page);
        assert.equal((await page.locator('.rr-hint span').allTextContents()).length, 4);
        assert.ok(await page.locator('.rr-hint').isVisible());
    }));

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

    it('a tap on the touch area throws a RAM straight ahead', () => withPage(PHONE, async (page) => {
        await openSettled(page);
        await page.evaluate(() => {
            const pad = document.querySelector('.rr-pad');
            const r = pad.getBoundingClientRect();
            const o = { bubbles: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.left + 50, clientY: r.top + 50 };
            pad.dispatchEvent(new PointerEvent('pointerdown', o));
            pad.dispatchEvent(new PointerEvent('pointerup', o));
        });
        await page.waitForTimeout(150);
        const s = await gameState(page);
        assert.equal(s.thrown, 1);
        assert.ok(s.rams.length === 1 && s.rams[0].vx > 0 && Math.abs(s.rams[0].vy) < 1, JSON.stringify(s.rams));
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
        for (let k = 1; k < out.at.length; k++) assert.ok(out.at[k] - out.at[k - 1] >= 25, out.at.join());
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
    for (const x of opts.at || [900]) e.spawn('orangeBot', x, true);
    const log = [], rlog = [];
    let thrownAir = null, thrownDown = null;
    for (let f = 0; f < 60 * (opts.secs || 4); f++) {
        // a RAM straight into the ball high in the air, and one into it lying curled after
        const b = e.list()[0];
        if (opts.throws && b && !thrownAir && b.state === 'attack' && b.h > 90) {
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
