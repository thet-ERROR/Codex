// The storefront's basics, in a real browser (Edge), against canned backend data (helpers.js).
// Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage, cardName } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

// Runs a test body with a fresh page, and always closes it
async function withPage(opts, body) {
    const page = await newPage(browser, site, opts);
    try { await body(page); } finally { await page.context().close(); }
}

// A finger drag across the card, sent as real touch events
async function swipe(page, dir) {
    const box = await page.locator('#main-card').boundingBox();
    const y = box.y + box.height / 2;
    const a = box.x + box.width * (dir > 0 ? 0.8 : 0.2);
    const b = box.x + box.width * (dir > 0 ? 0.15 : 0.85);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', a);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', a + (b - a) * i / 8); await page.waitForTimeout(16); }
    await touch('touchEnd', b);
}

const waitForCard = (page, name) => page.waitForFunction(
    n => document.querySelector('#main-card .tc-name')?.textContent === n, name, { timeout: 5000 });

for (const [label, width, height] of [['phone 390', 390, 844], ['tablet 820', 820, 1180], ['desktop 1440', 1440, 900]]) {
    describe(`boot — ${label}`, () => {
        it('loads without errors and shows the first PC', () => withPage({ width, height }, async (page) => {
            assert.equal(await cardName(page), 'TEST RIG 1');
            assert.deepEqual(page.problems, []);
        }));

        it('INSPECT opens, shows the PC, and closes again', () => withPage({ width, height }, async (page) => {
            await page.locator('.btn-card-inspect').first().click();
            await page.locator('#yg-add-cart').waitFor({ state: 'visible' });
            await page.locator('.yg-close-btn, .yg-close-back').filter({ visible: true }).first().click();
            await page.locator('#yg-add-cart').waitFor({ state: 'hidden' });
            assert.deepEqual(page.problems, []);
        }));
    });
}

describe('defaults for a first-time visitor', () => {
    it('English browser → English, sound off', () => withPage({ locale: 'en-US' }, async (page) => {
        assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
        assert.equal(await page.evaluate(() => window.codexState.audioEnabled), false);
    }));

    it('Greek browser → Greek', () => withPage({ locale: 'el-GR' }, async (page) => {
        assert.equal(await page.evaluate(() => document.documentElement.lang), 'el');
        assert.equal(await page.evaluate(() => document.body.classList.contains('lang-el')), true);
    }));

    it('a saved choice beats the browser language', () => withPage({ locale: 'el-GR', storage: { codex_lang: 'en' } }, async (page) => {
        assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    }));

    it('sound the visitor switched on earlier stays on', () => withPage({ storage: { codex_audio: 'true' } }, async (page) => {
        assert.equal(await page.evaluate(() => window.codexState.audioEnabled), true);
    }));
});

describe('the tour', () => {
    for (const width of [320, 360, 390]) {
        it(`opens for a new visitor and fits a ${width}px screen`, () => withPage({ width, height: 800, tourDone: false }, async (page) => {
            await page.locator('#tutorial-lang-modal.active').waitFor({ timeout: 5000 });
            for (const btn of await page.locator('.tutorial-lang-btn').all()) {
                const box = await btn.boundingBox();
                assert.ok(box.x >= 0 && box.x + box.width <= width, `a language button sticks out: ${JSON.stringify(box)}`);
            }
        }));
    }

    for (const [label, width, height] of [['phone 390', 390, 844], ['tablet 820', 820, 1180], ['desktop 1440', 1440, 900]]) {
        for (const lang of ['en', 'el']) {
            it(`is seven steps and every popover stays on screen — ${label}, ${lang}`, () => withPage({ width, height, locale: lang === 'el' ? 'el-GR' : 'en-US' }, async (page) => {
                // driver.js comes from a CDN the suite blocks: the same pinned version (1.0.1) is kept in tests/fixtures
                const fix = (f) => new URL(`./fixtures/${f}`, import.meta.url);
                await page.route('https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js', r => r.fulfill({ path: fix('driver.js.iife.js').pathname.replace(/^\/([A-Za-z]:)/, '$1'), contentType: 'application/javascript' }));
                await page.route('https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css', r => r.fulfill({ path: fix('driver.css').pathname.replace(/^\/([A-Za-z]:)/, '$1'), contentType: 'text/css' }));
                await page.reload();
                await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
                await page.evaluate((l) => window.startTutorialTour(l), lang);
                const titles = [];
                for (let i = 0; i < 12; i++) {
                    await page.locator('.driver-popover').waitFor({ timeout: 5000 });
                    await page.waitForTimeout(450);
                    const m = await page.evaluate(() => {
                        const p = document.querySelector('.driver-popover').getBoundingClientRect();
                        const hl = document.querySelector('.driver-active-element');
                        const hb = hl && hl.getBoundingClientRect();
                        return { title: document.querySelector('.driver-popover-title').textContent, progress: document.querySelector('.driver-popover-progress-text')?.textContent || '',
                            inView: p.left >= -1 && p.top >= -1 && p.right <= innerWidth + 1 && p.bottom <= innerHeight + 1,
                            // The welcome step has no target (driver.js points at an empty dummy element)
                            targetShown: !hl || hl.id === 'driver-dummy-element' || (hb.width > 0 && hb.height > 0) };
                    });
                    titles.push(m.title);
                    assert.ok(m.inView, `popover "${m.title}" is on screen`);
                    assert.ok(m.targetShown, `the target of "${m.title}" is visible`);
                    const done = await page.locator('.driver-popover-next-btn').textContent();
                    await page.locator('.driver-popover-next-btn').click();
                    if (/ΤΕΛΟΣ|FINISH/.test(done)) break;
                }
                assert.equal(titles.length, 7, titles.join(' | '));
                await page.locator('.driver-popover').waitFor({ state: 'detached', timeout: 3000 });
            }));
        }
    }
    it('Skip tour closes it and is remembered', () => withPage({ tourDone: false }, async (page) => {
        await page.locator('#tutorial-lang-modal.active').waitFor({ timeout: 5000 });
        await page.locator('.tutorial-skip-link').click();
        await page.locator('#tutorial-lang-modal.active').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
        assert.equal(await page.evaluate(() => localStorage.getItem('codex_tutorial_done')), 'true');
        assert.equal(await page.locator('#tutorial-lang-modal.active').count(), 0);
    }));
});

describe('swiping between PCs on a phone', () => {
    it('a swipe moves to the next PC and back', () => withPage({}, async (page) => {
        await swipe(page, 1);
        await waitForCard(page, 'TEST RIG 2');
        await swipe(page, -1);
        await waitForCard(page, 'TEST RIG 1');
        assert.deepEqual(page.problems, []);
    }));

    it('a swipe at the bottom of the page does not move the page', () => withPage({ height: 600 }, async (page) => {
        const y = async () => page.evaluate(() => Math.round(window.scrollY));
        await page.evaluate(() => window.scrollTo(0, 99999));
        const bottom = await y();
        assert.ok(bottom > 0, 'the page must be scrollable here for this test to mean anything');
        await swipe(page, 1);
        await waitForCard(page, 'TEST RIG 2');
        await page.waitForTimeout(600);
        assert.equal(await y(), bottom);
    }));
});

describe('cart', () => {
    const addFromInspect = async (page) => {
        await page.locator('.btn-card-inspect').first().click();
        await page.locator('#yg-add-cart').waitFor({ state: 'visible' });
        await page.locator('#yg-add-cart').click();
    };
    const cartSize = (page) => page.evaluate(() => window.codexState.cart.length);

    it('adds a PC from INSPECT', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await addFromInspect(page);
        await page.waitForFunction(() => window.codexState.cart.length === 1);
        assert.equal(await page.evaluate(() => window.codexState.cart[0].name), 'TEST RIG 1');
    }));

    it('cannot put more of a PC in the cart than the shop has', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await page.keyboard.press('ArrowRight');   // TEST RIG 2: one in stock
        await waitForCard(page, 'TEST RIG 2');
        await addFromInspect(page);
        await page.waitForFunction(() => window.codexState.cart.length === 1);
        // Adding closes INSPECT, so a second try means opening it again, as a customer would
        await page.locator('#yg-add-cart').waitFor({ state: 'hidden' });
        await addFromInspect(page);
        await page.waitForTimeout(400);
        assert.equal(await cartSize(page), 1);
    }));

    it('remembers the chosen extras on the cart line, for the server to price', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await addFromInspect(page);
        await page.waitForFunction(() => window.codexState.cart.length === 1);
        assert.deepEqual(await page.evaluate(() => window.codexState.cart[0].build), { storage: '', proConfig: false, paint: false });
    }));

    it('a sold-out PC cannot be added', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await page.keyboard.press('ArrowRight');
        await waitForCard(page, 'TEST RIG 2');
        await page.keyboard.press('ArrowRight');
        await waitForCard(page, 'TEST RIG 3');
        await page.locator('.btn-card-inspect').first().click();
        await page.locator('#yg-add-cart').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#yg-add-cart').isDisabled(), true);
        assert.equal(await cartSize(page), 0);
    }));
});

describe('the PC card header and hover', () => {
    it('the title has no cube icon in front of it', () => withPage({ width: 1440, height: 900 }, async (page) => {
        assert.equal(await page.locator('#main-card .tc-title .tc-cube').count(), 0);
        assert.equal(await page.locator('#main-card .tc-title .tc-name').count(), 1);
    }));

    it('the card does not lift, lean or glow when the mouse is over it', () => withPage({ width: 1440, height: 900 }, async (page) => {
        const look = () => page.evaluate(() => {
            const s = getComputedStyle(document.getElementById('main-card'));
            return { transform: s.transform, rotate: s.rotate, scale: s.scale, shadow: s.boxShadow };
        });
        const before = await look();
        const box = await page.locator('#main-card').boundingBox();
        // Over the card and moving around in it, as a visitor reading it would
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2, { steps: 6 });
        await page.waitForTimeout(700);
        assert.deepEqual(await look(), before);
    }));

    it('the title is not cut off for a normal PC name, on a phone and a desktop', async () => {
        for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
            await withPage(size, async (page) => {
                const fits = await page.evaluate(() => { const n = document.querySelector('#main-card .tc-name'); return n.scrollWidth <= n.clientWidth; });
                assert.equal(fits, true);
            });
        }
    });
});

describe('the full achievements window (UI brief 02)', () => {
    for (const [label, width, height] of [['phone 390', 390, 844], ['desktop 1440', 1440, 900]]) {
        it(`every achievement is a filled card with a body, and nothing is cut off — ${label}`, () => withPage({ width, height, member: true, locale: 'el-GR' }, async (page) => {
            await page.evaluate(() => window.openAchievements());
            await page.locator('#achievements-modal.active').waitFor();
            await page.waitForTimeout(500);
            const rows = await page.evaluate(() => [...document.querySelectorAll('#ach-list .ach-card')].map(c => {
                const s = getComputedStyle(c), p = c.querySelector('.ach-info p'), ico = getComputedStyle(c.querySelector('.ach-icon'));
                return {
                    unlocked: c.classList.contains('unlocked'),
                    filled: s.backgroundImage.includes('gradient'),
                    opacity: s.opacity,
                    radius: parseFloat(s.borderTopLeftRadius),
                    divider: parseFloat(ico.borderRightWidth),
                    descNowrap: getComputedStyle(p).whiteSpace === 'nowrap',
                    descCut: p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1
                };
            }));
            assert.ok(rows.length >= 10, 'the list is drawn');
            assert.ok(rows.some(r => r.unlocked) && rows.some(r => !r.unlocked), 'the test needs both kinds of row');
            for (const r of rows) {
                assert.equal(r.filled, true, 'a row is a filled card, not text on the dark background');
                assert.equal(r.opacity, '1', 'a locked row is not faded into the background');
                assert.ok(r.radius >= 14, 'rounded');
                assert.equal(r.divider, 1, 'a divider line between the icon and the text');
                assert.equal(r.descNowrap, false);
                assert.equal(r.descCut, false, 'the description is not cut off');
            }
            // Unlocked and locked must still look different
            const look = await page.evaluate(() => { const g = k => getComputedStyle(document.querySelector(`#ach-list .ach-card${k}`)); return [g('.unlocked').borderTopColor, g(':not(.unlocked)').borderTopColor]; });
            assert.notEqual(look[0], look[1]);
        }));
    }
});

// The profile window (UI brief 01 + 04): SIGN OUT always at the bottom, the wishlist filling the space
// down to it (scrolling inside itself when long), rounded panels instead of cut corners.
const API = 'https://codex-backend-9kij.onrender.com/api';
async function openProfile(page, wishCount) {
    const wishlist = Array.from({ length: wishCount }, (_, i) => ({ _id: `w${i}`, name: `PROJECT ${i}`, priceCents: 34000 + i * 1000, images: ['assets/images/icon-512.png'] }));
    const me = { username: 'Tester', emailVerified: true, wishlist, achievements: ['recruited'], xp: 25, rank: 'recruit', rankMinXp: 0, nextRank: 'operative', nextRankXp: 100, progress: 25,
        ranks: [{ id: 'recruit', minXp: 0, rewards: {} }, { id: 'operative', minXp: 100, rewards: { spins: 1 } }, { id: 'fieldAgent', minXp: 250, rewards: { color: 'ultraviolet' } }],
        bonusSpins: 0, rankRewards: [], coupons: [], unlockedColors: [] };
    await page.route(u => u.href === `${API}/me`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) }));
    await page.reload();
    await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
    await page.evaluate(() => window.openAgentDashboard());
    await page.locator('#agent-dashboard-modal.active').waitFor();
    await page.waitForTimeout(500);
    return page.evaluate(() => {
        const r = s => document.querySelector(s).getBoundingClientRect();
        const box = document.querySelector('#agent-dashboard-modal .dossier-box');
        return { box: r('#agent-dashboard-modal .dossier-box'), logout: r('#dossier-logout-btn'),
            boxScrolls: box.scrollHeight > box.clientHeight + 1,
            sideways: document.documentElement.scrollWidth > innerWidth || box.scrollWidth > box.clientWidth + 1,
            rows: document.querySelectorAll('#dossier-wishlist .dossier-wish-row').length };
    });
}
const openPanel = (page) => page.evaluate(() => {
    const p = document.querySelector('#agent-dashboard-modal .dossier-panel:not([hidden])');
    const t = document.querySelector('#agent-dashboard-modal [role="tab"][aria-selected="true"]');
    return { panel: p && p.id, tab: t && t.dataset.dtab, scrolls: p ? p.scrollHeight > p.clientHeight + 1 : null, shown: document.querySelectorAll('#agent-dashboard-modal .dossier-panel:not([hidden])').length };
});
// The profile (UI brief 01 + 04, then the owner's 2026-11-12 call): a header, four tabs and ONE open
// section — five panels side by side crowded laptops and tablets. SIGN OUT stays at the bottom.
describe('the profile: tabs and one section at a time', () => {
    for (const [label, width, height] of [['laptop 1366×768', 1366, 768], ['tablet 820', 820, 1180], ['desktop 1440', 1440, 900]]) {
        it(`the window does not scroll, SIGN OUT is at the bottom, a long list scrolls inside its section — ${label}`, () => withPage({ width, height, member: true }, async (page) => {
            for (const n of [1, 12]) {
                const m = await openProfile(page, n);
                assert.equal(m.rows, n);
                assert.equal(m.boxScrolls, false, 'the window itself does not scroll');
                assert.ok(m.logout.bottom <= m.box.bottom && m.box.bottom - m.logout.bottom < 90, 'SIGN OUT is at the bottom of the window');
                assert.equal(m.sideways, false);
                await page.locator('#dtab-wishlist').click();
                const p = await openPanel(page);
                assert.deepEqual([p.panel, p.tab, p.shown], ['dpanel-wishlist', 'wishlist', 1]);
                assert.equal(p.scrolls, n === 12, 'twelve saved systems scroll inside the section');
                await page.evaluate(() => window.closeModal('agent-dashboard-modal'));
            }
        }));
    }
    for (const [label, width, height, locale] of [['laptop el', 1366, 768, 'el-GR'], ['laptop en', 1366, 768, 'en-US'], ['phone 360 el', 360, 740, 'el-GR'], ['phone 390 en', 390, 844, 'en-US']]) {
        it(`every tab shows its whole name and its count — ${label}`, () => withPage({ width, height, member: true, locale }, async (page) => {
            await openProfile(page, 3);
            const tabs = await page.evaluate(() => [...document.querySelectorAll('#agent-dashboard-modal .dossier-tab')].map(t => {
                const l = t.querySelector('.dtab-label'), b = t.getBoundingClientRect();
                return { name: t.dataset.dtab, cut: l.scrollWidth > l.clientWidth + 1, count: t.querySelector('.dtab-count').textContent, h: b.height, w: b.width };
            }));
            assert.equal(tabs.length, 4);
            for (const t of tabs) { assert.equal(t.cut, false, `${t.name} label is not cut`); assert.ok(t.h >= 40 && t.w >= 60, `${t.name} is a full-size target`); }
            assert.equal(tabs.find(t => t.name === 'wishlist').count, '3');
            assert.match(tabs.find(t => t.name === 'achievements').count, /^\d+\/\d+$/);
        }));
    }
    it('tabs switch by click and by arrow keys, and the window opens on the last one this visit', () => withPage({ width: 1366, height: 768, member: true }, async (page) => {
        await openProfile(page, 2);
        assert.equal((await openPanel(page)).panel, 'dpanel-orders', 'orders first');
        await page.locator('#dtab-achievements').click();
        assert.equal((await openPanel(page)).panel, 'dpanel-achievements');
        await page.keyboard.press('ArrowRight');
        let p = await openPanel(page);
        assert.equal(p.panel, 'dpanel-ranks');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'dtab-ranks', 'focus moves with the selection');
        await page.keyboard.press('ArrowRight');
        assert.equal((await openPanel(page)).panel, 'dpanel-orders', 'wraps around');
        await page.keyboard.press('End');
        assert.equal((await openPanel(page)).panel, 'dpanel-ranks');
        await page.evaluate(() => { window.closeModal('agent-dashboard-modal'); window.openAgentDashboard(); });
        await page.waitForTimeout(300);
        p = await openPanel(page);
        assert.equal(p.panel, 'dpanel-ranks', 'reopens where it was left');
        // The current rank and the next one are both in view, and so is the RANKS title
        const ladder = await page.evaluate(() => {
            const panel = document.getElementById('dpanel-ranks').getBoundingClientRect();
            const inView = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= panel.top - 1 && b.bottom <= panel.bottom + 1; };
            return { current: inView('.rank-step.current'), next: inView('.rank-step.next') };
        });
        assert.deepEqual(ladder, { current: true, next: true });
    }));
    it('on a phone the tabs stay on top and SIGN OUT at the bottom while the window scrolls', () => withPage({ width: 390, height: 844, member: true }, async (page) => {
        const m = await openProfile(page, 10);
        assert.equal(m.sideways, false);
        await page.locator('#dtab-wishlist').click();
        for (const at of [0, 0.5, 1]) {
            const seen = await page.evaluate(f => {
                const box = document.querySelector('#agent-dashboard-modal .dossier-box');
                box.scrollTop = (box.scrollHeight - box.clientHeight) * f;
                const b = box.getBoundingClientRect(), l = document.getElementById('dossier-logout-btn').getBoundingClientRect(), t = document.querySelector('.dossier-tabs').getBoundingClientRect();
                return { logout: l.top >= b.top && l.bottom <= b.bottom, tabs: t.top >= b.top - 1 && t.bottom <= b.bottom };
            }, at);
            assert.deepEqual(seen, { logout: true, tabs: true }, `at scroll ${at}`);
        }
    }));
    it('panels are rounded, with no cut corners', () => withPage({ width: 1440, height: 900, member: true }, async (page) => {
        await openProfile(page, 1);
        const panels = await page.evaluate(() => [...document.querySelectorAll('#agent-dashboard-modal :is(.dossier-box, .dossier-header, .dossier-list, .wishlist-grid, .dossier-ladder, .dossier-heading, #dossier-logout-btn)')]
            .map(e => ({ clip: getComputedStyle(e).clipPath, radius: parseFloat(getComputedStyle(e).borderTopLeftRadius) })));
        assert.ok(panels.length >= 8);
        for (const p of panels) { assert.equal(p.clip, 'none'); assert.ok(p.radius >= 10); }
    }));
});

// The QR window (UI brief 03): the artwork around a QR drawn from the real address, a white quiet zone
// that nothing decorative reaches, working buttons, a phone fit, and motion that stops when asked.
describe('the hidden terminal commands (changes doc, step 1)', () => {
    const run = (page, cmd) => page.evaluate((c) => window.runTerminalCommand(c), cmd);
    const out = (page) => page.evaluate(() => document.getElementById('cli-output').textContent);
    const mine = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('codex_achievements') || '[]'));
    it('sudo answers with a joke and unlocks NICE TRY; help does not list it', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await run(page, 'sudo rm -rf /');
        assert.match(await out(page), /Nice try, agent/);
        assert.ok((await mine(page)).includes('nice_try'));
        await run(page, 'help');
        const text = await out(page);
        for (const c of ['sudo', 'whoami', 'matrix']) assert.ok(!new RegExp(`\\n  ${c}\\s`).test(text), `${c} is not in help`);
    }));
    it('rm -rf / pretends, then says it was a joke, and unlocks SCORCHED EARTH; other rm is refused', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await run(page, 'rm notes.txt');
        assert.match(await out(page), /permission denied/);
        assert.ok(!(await mine(page)).includes('scorched_earth'));
        await run(page, 'rm -rf /');
        const text = await out(page);
        assert.match(text, /Deleting/);
        assert.match(text, /Just kidding/);
        assert.ok((await mine(page)).includes('scorched_earth'));
    }));
    it('ls lists the systems, whoami opens the identity window, matrix is hack; all three together unlock CURIOUS AGENT', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await run(page, 'ls');
        assert.match(await out(page), /projects\/\n\s+\S/);
        assert.ok(!(await mine(page)).includes('curious_agent'), 'one command is not enough');
        await run(page, 'whoami');
        await page.locator('#whoami-modal.active').waitFor();
        await page.evaluate(() => closeModal('whoami-modal'));
        assert.ok(!(await mine(page)).includes('curious_agent'), 'two are not enough');
        await run(page, 'matrix');
        assert.match(await out(page), /visitor@codex:~\$ matrix/);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()), '#00ff00', 'matrix does what hack does');
        assert.ok((await mine(page)).includes('curious_agent'));
    }));
    it('a secret stays a riddle in the list until it is found', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await page.evaluate(() => window.openAchievements());
        const locked = await page.evaluate(() => [...document.querySelectorAll('#ach-list .ach-card.secret')].map(c => c.textContent));
        assert.equal(locked.length, 4);
        for (const t of locked) { assert.match(t, /\?\?\?/); assert.ok(!/NICE TRY|SCORCHED|CURIOUS|CHEAT CODE/.test(t), 'name not revealed'); }
        await page.evaluate(() => { window.closeModal('achievements-modal'); });
        await run(page, 'sudo');
        await page.evaluate(() => window.openAchievements());
        const after = await page.evaluate(() => [...document.querySelectorAll('#ach-list .ach-card.secret')].length);
        assert.equal(after, 3);
        assert.ok(await page.evaluate(() => document.querySelector('#ach-list').textContent.includes('NICE TRY')));
    }));
});

describe('the wheel for everyone, and the way between sign-in and sign-up (changes doc, step 2)', () => {
    const wheelStatus = { attemptsLeft: 3, maxAttempts: 3, nextAvailableAt: null, bonusSpins: 0, unlockedColors: [], coupons: [] };
    it('a guest sees the wheel; INITIATE asks for the sign-in; signing in brings the wheel back', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await page.route(u => u.href === `${API}/user-login`, r => r.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ success: true, username: 'Tester', token: 'member-token', emailVerified: true }) }));
        await page.route(u => u.href === `${API}/wheel`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wheelStatus) }));
        await page.evaluate(() => window.openWheelFromSettings());
        await page.locator('#wheel-modal.active').waitFor();
        assert.match(await page.locator('#wheel-attempts').textContent(), /SIGN IN TO SPIN/);
        assert.equal(await page.locator('#login-modal.active').count(), 0, 'no sign-in form at the door');

        await page.locator('#wheel-initiate-btn').click({ force: true });   // it pulses (wheel.css)
        await page.locator('#login-modal.active').waitFor();
        assert.equal(await page.locator('#wheel-modal.active').count(), 0);

        await page.fill('#login-user', 'Tester');
        await page.fill('#login-pass', 'secret123');
        await page.locator('#login-modal .auth-form .btn-inspect').click();
        await page.locator('#wheel-modal.active').waitFor({ timeout: 5000 });
        assert.match(await page.locator('#wheel-attempts').textContent(), /SPINS LEFT: 3\/3/);
    }));
    it('a signed-in visitor without a verified email sees the wheel and is reminded at INITIATE', () => withPage({ width: 1440, height: 900, locale: 'en-US', member: true }, async (page) => {
        // The same module instance the site uses: mark the email unverified
        const signedIn = await page.evaluate(() => import('./js/state.js').then(m => { m.state.emailVerified = false; return m.state.isLoggedIn; }));
        assert.equal(signedIn, true);
        await page.evaluate(() => window.openWheelFromSettings());
        await page.locator('#wheel-modal.active').waitFor();
        assert.match(await page.locator('#wheel-attempts').textContent(), /VERIFY YOUR EMAIL/);
        // The button pulses (wheel.css), which Playwright reads as "not stable"
        await page.locator('#wheel-initiate-btn').click({ force: true });
        assert.equal(await page.locator('#wheel-modal.active').count(), 1, 'stays on the wheel');
        assert.equal(await page.locator('#login-modal.active').count(), 0);
    }));
    for (const [label, width, height] of [['desktop', 1440, 900], ['phone 390', 390, 844]]) {
        it(`sign-in links to sign-up and back, in both languages — ${label}`, () => withPage({ width, height, locale: 'el-GR' }, async (page) => {
            await page.evaluate(() => window.openModal('login-modal'));
            const toSignup = page.locator('#login-modal .auth-switch-btn');
            assert.equal((await toSignup.textContent()).trim(), 'Εγγραφή');
            const box = await toSignup.boundingBox();
            assert.ok(box.height >= 40, `touch target ${box.height}px`);
            await toSignup.click();
            await page.locator('#signup-modal.active').waitFor();
            assert.equal(await page.locator('#login-modal.active').count(), 0);
            await page.locator('#signup-modal .auth-switch-btn').click();
            await page.locator('#login-modal.active').waitFor();
            assert.equal(await page.locator('#signup-modal.active').count(), 0);
        }));
    }
});

describe('the empty stage (changes doc, step 4)', () => {
    const text = (page) => page.locator('#main-card .card-empty').textContent();
    for (const [lang, locale, custom, none] of [['en', 'en-US', /build custom/, /No systems here yet/], ['el', 'el-GR', /φτιάχνω custom/, /Δεν υπάρχουν συστήματα/]]) {
        it(`a budget with nothing in it invites a custom build; no systems at all says they are coming — ${lang}`, () => withPage({ width: 390, height: 844, locale }, async (page) => {
            await page.evaluate(() => window.setPriceFilter(50000, null));   // over €50,000: nothing matches
            await page.locator('#main-card .card-empty').waitFor();
            assert.match(await text(page), custom);
            assert.equal(await page.locator('#main-card .card-empty-btn').count(), 1);
            // "Talk to me" opens the help assistant, where the admin is one tap away
            await page.locator('#main-card .card-empty-btn').click();
            assert.ok(await page.evaluate(() => document.getElementById('chat-widget').classList.contains('open')));
            await page.evaluate(() => window.toggleChat());
            // ...and the quiet link clears the filter and brings the systems back
            await page.locator('#main-card .card-empty-link').click();
            await page.locator('#main-card .stock-badge').waitFor();
            assert.equal(await page.locator('#main-card .card-empty').count(), 0);
        }));
        it(`with no systems at all, even a budget filter does not invite a custom build — ${lang}`, () => withPage({ width: 390, height: 844, locale }, async (page) => {
            await page.evaluate(() => import('./js/state.js').then(m => { m.state.inventory = []; }));
            await page.evaluate(() => window.setPriceFilter(0, 100));
            await page.locator('#main-card .card-empty').waitFor();
            assert.match(await text(page), none);
            assert.equal(await page.locator('#main-card .card-empty-link').count(), 0);
        }));
    }
});

describe('title, share preview, headings and names (changes doc, step 5)', () => {
    it('the title and the share preview describe the shop, not a version number', () => withPage({ width: 1440, height: 900 }, async (page) => {
        const m = await page.evaluate(() => ({ title: document.title, og: document.querySelector('meta[property="og:title"]').content,
            desc: document.querySelector('meta[name="description"]').content, ogDesc: document.querySelector('meta[property="og:description"]').content }));
        assert.equal(m.title, 'PHOENIX CODEX | Custom Gaming PCs Θεσσαλονίκη');
        assert.equal(m.og, m.title);
        for (const s of [m.title, m.og, m.desc, m.ogDesc]) assert.ok(!/v52|TERMINAL/.test(s), s);
        assert.match(m.desc, /Θεσσαλονίκη/);
        assert.match(m.desc, /custom/i);
    }));
    it('there is exactly one h1, and it is not visible', () => withPage({ width: 1440, height: 900 }, async (page) => {
        const h1 = await page.evaluate(() => [...document.querySelectorAll('h1')].filter(h => h.id !== 'yg-title' && !h.closest('.modal-overlay, #gallery-overlay')).map(h => ({ t: h.textContent, w: h.getBoundingClientRect().width })));
        assert.equal(h1.length, 1);
        assert.match(h1[0].t, /PHOENIX CODEX/);
        assert.ok(h1[0].w <= 1, 'invisible');
    }));
    for (const lang of ['en-US', 'el-GR']) {
        it(`every icon-only button has a name, and every X is a button — ${lang}`, () => withPage({ width: 1440, height: 900, locale: lang }, async (page) => {
            const bad = await page.evaluate(() => [...document.querySelectorAll('.side-btn, .cli-btn, .cart-btn-mobile, .profile-btn, .close-modal, .modal-close, .modal-x')].filter(b => {
                const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
                return !name || (b.matches('.close-modal, .modal-close') && b.tagName !== 'BUTTON');
            }).map(b => b.outerHTML.slice(0, 90)));
            assert.deepEqual(bad, []);
            const wheel = await page.evaluate(() => document.querySelector('[data-i18n-aria="sideWheel"]').getAttribute('aria-label'));
            assert.equal(wheel, lang === 'el-GR' ? 'Καθημερινή περιστροφή' : 'Daily Spin', 'the name follows the language');
        }));
    }
    it('an X works from the keyboard and still looks like a bare X', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await page.evaluate(() => window.openModal('wheel-modal'));
        await page.locator('#wheel-modal.active').waitFor();
        const style = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#wheel-modal .close-modal')); return [s.backgroundColor, s.borderTopWidth]; });
        assert.deepEqual(style, ['rgba(0, 0, 0, 0)', '0px']);
        await page.locator('#wheel-modal .close-modal').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !document.getElementById('wheel-modal').classList.contains('active'));
    }));
    it('robots.txt and sitemap.xml are served, and the admin panel is kept out of the index', () => withPage({ width: 1440, height: 900 }, async (page) => {
        const get = (p) => page.evaluate(async (u) => { const r = await fetch(u); return { ok: r.ok, text: await r.text() }; }, p);
        const robots = await get('/robots.txt');
        assert.ok(robots.ok);
        assert.match(robots.text, /Disallow: \/admin\.html/);
        assert.match(robots.text, /Sitemap: https:\/\/\S+\/sitemap\.xml/);
        const sitemap = await get('/sitemap.xml');
        assert.ok(sitemap.ok);
        assert.match(sitemap.text, /<loc>https:\/\/\S+\/<\/loc>/);
    }));
});

describe('the Konami code and its hidden colour (changes doc, step 6)', () => {
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    const type = async (page, keys) => { for (const k of keys) await page.keyboard.press(k); };
    const secretShown = (page) => page.evaluate(() => !document.querySelector('.color-btn[data-id="cheatCode"]').hidden);
    const terminalColors = async (page) => {
        await page.evaluate(() => window.runTerminalCommand('color'));
        return page.evaluate(() => [...document.querySelectorAll('#cli-output .cli-chip')].map(c => c.textContent));
    };
    it('the colour is nowhere until the code is entered — not in the settings, not in the terminal, not by name', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        assert.equal(await secretShown(page), false);
        assert.ok(!(await terminalColors(page)).some(c => /cheat/i.test(c)), 'not even locked in the list');
        await page.evaluate(() => window.runTerminalCommand('color cheatcode'));
        assert.match(await page.evaluate(() => document.getElementById('cli-output').textContent), /cheatcode[\s\S]*(Unknown|Άγνωστ|[Cc]olou?rs?)/);
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()), '#ff0a54');
    }));
    it('↑↑↓↓←→←→BA unlocks the badge and the colour, puts it on, and shows it in the settings and the terminal', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await type(page, ['ArrowUp', ...KONAMI]);     // a stray extra ↑ first does not spoil it
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()), '#ff0a54');
        const mine = await page.evaluate(() => ({ ach: JSON.parse(localStorage.getItem('codex_achievements') || '[]'), colors: JSON.parse(localStorage.getItem('codex_unlocked_colors') || '[]') }));
        assert.ok(mine.ach.includes('cheat_code'));
        assert.ok(mine.colors.includes('cheatCode'));
        assert.equal(await secretShown(page), true);
        assert.ok((await terminalColors(page)).some(c => c === 'cheatcode'));
        // ...and it survives a reload
        await page.reload();
        await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
        assert.equal(await secretShown(page), true);
    }));
    it('a signed-in agent reports the badge to the account (the server grants the colour with it)', () => withPage({ width: 1440, height: 900, locale: 'en-US', member: true }, async (page) => {
        await page.evaluate(() => import('./js/state.js').then(m => { m.state.emailVerified = true; }));
        await type(page, KONAMI);
        await page.waitForTimeout(300);
        const sent = page.apiLog.filter(c => c.path === '/achievements').map(c => c.body && c.body.id);
        assert.ok(sent.includes('cheat_code'), JSON.stringify(sent));
    }));
    it('typing the code into a field does nothing', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await page.evaluate(() => window.toggleCLI());
        await page.locator('#cli-input').focus();
        await type(page, KONAMI);
        assert.equal(await secretShown(page), false);
    }));
});

// What keeps the site smooth on a weak machine. Each of these was measured (CPU throttled 6x): an animated
// drop-shadow recalculated style on every frame of the whole visit, an !important transform kept the flip
// off the compositor, and the page under INSPECT was drawn on every frame behind it.
describe('staying smooth on a slow machine', () => {
    it('nothing on the page animates a filter that moves pixels (it cannot run on the compositor)', () => withPage({ width: 1366, height: 768 }, async (page) => {
        await page.waitForTimeout(600);
        const bad = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').flatMap(a => {
            const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
            return kf.some(k => /drop-shadow|blur/.test(k.filter || '')) ? [a.animationName] : [];
        }));
        assert.deepEqual(bad, []);
        // The logo still glows and still breathes — by opacity
        const logo = await page.evaluate(() => ({ glow: getComputedStyle(document.querySelector('.logo')).filter, aura: getComputedStyle(document.querySelector('.logo-aura')).animationName }));
        assert.match(logo.glow, /drop-shadow/);
        assert.equal(logo.aura, 'logoAura');
    }));
    it('the flip is a plain transform, so the browser can run it on the compositor', () => withPage({ width: 1366, height: 768 }, async (page) => {
        const prio = await page.evaluate(() => {
            for (const sheet of document.styleSheets) {
                let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
                for (const r of rules) if (r.selectorText === '.yg-card.flipped') return { value: r.style.getPropertyValue('transform'), priority: r.style.getPropertyPriority('transform') };
            }
            return null;
        });
        assert.ok(prio, 'the rule exists');
        assert.match(prio.value, /rotateY\(180deg\)/);
        assert.equal(prio.priority, '', 'not !important');
        await page.evaluate(() => window.openGallery());
        await page.evaluate(() => document.getElementById('yg-card').classList.add('flipped'));
        await page.waitForTimeout(900);
        assert.match(await page.evaluate(() => getComputedStyle(document.getElementById('yg-card')).transform), /matrix3d\(-1/, 'and it still flips');
    }));
    for (const [label, width, height] of [['phone', 390, 844], ['laptop', 1366, 768]]) {
        it(`the page under INSPECT is switched off once it is open and is back before it closes — ${label}`, () => withPage({ width, height }, async (page) => {
            const under = () => page.evaluate(() => ({ solo: document.body.classList.contains('inspect-solo'), stage: getComputedStyle(document.querySelector('main.stage')).visibility,
                video: document.querySelector('.bg-video').paused }));
            await page.evaluate(() => document.querySelector('.bg-video').play().catch(() => {}));
            await page.evaluate(() => window.openGallery());
            assert.equal((await under()).solo, false, 'not while the card is still growing out of the page');
            await page.waitForTimeout(900);
            const open = await under();
            assert.deepEqual([open.solo, open.stage, open.video], [true, 'hidden', true]);
            await page.evaluate(() => window.closeModal('gallery-overlay'));
            await page.waitForTimeout(120);   // well inside the 340ms shrink
            const closing = await under();
            assert.deepEqual([closing.solo, closing.stage], [false, 'visible'], 'the page is there for the card to shrink into');
            await page.waitForTimeout(700);
            assert.equal(await page.evaluate(() => document.getElementById('gallery-overlay').style.display), 'none');
            // Opened and closed at once: the page must not be left switched off
            await page.evaluate(() => { window.openGallery(); window.closeModal('gallery-overlay'); });
            await page.waitForTimeout(1200);
            assert.equal((await under()).solo, false);
        }));
    }
    it('the matrix rain costs nothing while it is off, runs when switched on, and lets go when switched off', () => withPage({ width: 1366, height: 768 }, async (page) => {
        // Off: no full-screen canvas held, and no timer waking the page up
        const canvasSize = () => page.evaluate(() => { const c = document.getElementById('matrix-canvas'); return [c.width, c.height]; });
        const [w0, h0] = await canvasSize();
        assert.ok(w0 <= 300 && h0 <= 150, `not a full-screen canvas before it is needed (${w0}×${h0})`);
        const wakes = await page.evaluate(async () => {
            let n = 0; const orig = window.setTimeout;
            const ctx = document.getElementById('matrix-canvas').getContext('2d'); const fill = ctx.fillText.bind(ctx);
            ctx.fillText = (...a) => { n++; return fill(...a); };
            await new Promise(r => orig(r, 500));
            return n;
        });
        assert.equal(wakes, 0, 'nothing is drawn while it is off');
        await page.evaluate(() => window.runTerminalCommand('matrix'));
        await page.waitForTimeout(300);
        assert.deepEqual(await canvasSize(), [1366, 768]);
        const drawn = await page.evaluate(async () => {
            let n = 0; const ctx = document.getElementById('matrix-canvas').getContext('2d'); const fill = ctx.fillText.bind(ctx);
            ctx.fillText = (...a) => { n++; return fill(...a); };
            await new Promise(r => setTimeout(r, 400));
            return n;
        });
        assert.ok(drawn > 0, 'it rains');
        await page.evaluate(() => window.runTerminalCommand('matrix'));
        assert.deepEqual(await canvasSize(), [0, 0], 'switched off, the canvas is given back');
    }));
    it('nothing behind an open window is blurred, and the dimming is not !important (so it stays on the compositor)', () => withPage({ width: 1366, height: 768 }, async (page) => {
        await page.evaluate(() => window.openModal('settings'));
        await page.waitForTimeout(500);
        const m = await page.evaluate(() => {
            const blurred = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return e.getClientRects().length && (/blur/.test(s.filter) || /blur/.test(s.backdropFilter)); })
                .map(e => e.className || e.tagName).filter(c => !/nav-bar/.test(c));   // the tab bar is real glass over the video
            let important = null;
            for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
                for (const r of rules) if (r.selectorText && r.selectorText.includes('body.ui-locked header')) important = r.style.getPropertyPriority('opacity'); }
            return { blurred, important, stage: getComputedStyle(document.querySelector('.stage')).opacity };
        });
        assert.deepEqual(m.blurred, []);
        assert.equal(m.important, '');
        assert.equal(m.stage, '0.5', 'the page still steps back');
    }));
    it('the background video pauses behind a window and plays again after, but not behind the terminal', () => withPage({ width: 1366, height: 768 }, async (page) => {
        const paused = () => page.evaluate(() => document.querySelector('.bg-video').paused);
        await page.evaluate(() => document.querySelector('.bg-video').play().catch(() => {}));
        await page.waitForTimeout(200);
        assert.equal(await paused(), false);
        await page.evaluate(() => window.openModal('settings'));
        await page.waitForTimeout(100);
        assert.equal(await paused(), true, 'nobody can see it behind the window');
        await page.evaluate(() => window.closeModal('settings-modal'));
        await page.waitForTimeout(200);
        assert.equal(await paused(), false, 'back once the window is gone');
        await page.evaluate(() => window.toggleCLI());
        await page.waitForTimeout(100);
        assert.equal(await paused(), false, 'the terminal does not cover the page');
    }));
    it('INSPECT is filled once while the page is idle, without showing or changing anything', () => withPage({ width: 390, height: 844 }, async (page) => {
        await page.waitForFunction(() => document.getElementById('yg-title').textContent.trim() === 'TEST RIG 1', null, { timeout: 12000 });
        const m = await page.evaluate(() => import('./js/state.js').then(s => ({ shown: document.getElementById('gallery-overlay').style.display === 'flex',
            visible: getComputedStyle(document.getElementById('gallery-overlay')).visibility, pc: s.state.currentGalleryPC, solo: document.body.classList.contains('inspect-solo') })));
        assert.equal(m.shown, false);
        assert.equal(m.visible, 'hidden');
        assert.equal(m.pc, null, 'no PC is "open"');
        assert.equal(m.solo, false);
    }));
});

describe('the QR window (UI brief 03)', () => {
    const openQr = async (page) => {
        await page.evaluate(() => window.openQr());
        await page.locator('#qr-tile svg').waitFor({ timeout: 5000 });
        await page.waitForTimeout(400);
    };
    it('the QR is drawn from the page address, with a white quiet zone nothing covers', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await openQr(page);
        const m = await page.evaluate(() => {
            const tile = document.getElementById('qr-tile'), svg = tile.querySelector('svg'), path = svg.querySelector('path');
            const vb = svg.viewBox.baseVal, bb = path.getBBox();
            const r = tile.getBoundingClientRect();
            // Every point over the tile must hit the tile itself, not the loop, a chip or a canister
            const covered = [];
            for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
                // 6px in from the edge: the tile's rounded corners show the socket behind them
                const x = r.left + 6 + (r.width - 12) * i / 10, y = r.top + 6 + (r.height - 12) * j / 10;
                const hit = document.elementFromPoint(x, y);
                if (!tile.contains(hit)) covered.push(`${hit?.className} @${i},${j}`);
            }
            // One module's size: the code's drawn width over its module count (the same library, same input)
            const q = window.qrcode(0, 'M'); q.addData(location.origin + '/'); q.make();
            const cell = bb.width / q.getModuleCount();
            return { url: document.getElementById('qr-url').textContent, bg: getComputedStyle(tile).backgroundColor,
                margin: Math.min(bb.x, bb.y, vb.width - bb.x - bb.width, vb.height - bb.y - bb.height) / cell, covered };
        });
        assert.equal(m.url, site.url.replace(/^https?:\/\//, ''));
        assert.equal(m.bg, 'rgb(255, 255, 255)');
        assert.ok(m.margin >= 3.9, `a 4-module white margin around the code, got ${m.margin}`);
        assert.deepEqual(m.covered, [], 'nothing decorative over the code');
    }));
    it('Copy link copies the same address the QR holds', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = async (s) => { window.__copied = s; }; });
        await openQr(page);
        await page.locator('#qr-modal .qr-actions .info-btn.primary').click();
        assert.equal(await page.evaluate(() => window.__copied), site.url);
    }));
    for (const [label, width, height] of [['phone 390', 390, 844], ['phone 360', 360, 740]]) {
        it(`fits the screen with full-size buttons and the close button — ${label}`, () => withPage({ width, height }, async (page) => {
            await openQr(page);
            const m = await page.evaluate(() => {
                const box = document.querySelector('#qr-modal .info-box').getBoundingClientRect();
                return { sideways: document.documentElement.scrollWidth > innerWidth, fitsWide: box.left >= 0 && box.right <= innerWidth,
                    btns: [...document.querySelectorAll('#qr-modal .qr-actions .info-btn:not([hidden]), #qr-modal .modal-x')].map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)) };
            });
            assert.equal(m.sideways, false);
            assert.equal(m.fitsWide, true);
            for (const b of m.btns) assert.ok(b >= 40, `touch target ${b}px`);
            await page.locator('#qr-modal .modal-x').click();
            await page.waitForFunction(() => !document.getElementById('qr-modal').classList.contains('active'));
        }));
    }
    it('the liquid stands still for reduced motion', () => withPage({ width: 390, height: 844 }, async (page) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openQr(page);
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#qr-modal .qr-can-liquid')).animationName), 'none');
    }));
});

describe('the vote card (UI brief 06)', () => {
    const now = Date.now();
    const drop = (over) => ({
        _id: 'ev1', title: 'PROJECT CASTLE', image: 'assets/images/ProjectX.jpeg', price: '480', priceCents: 48000, targetVotes: 10, currentVotes: 6,
        startDate: new Date(now - 86400000).toISOString(), endsAt: new Date(now + 3 * 86400000).toISOString(), serverNow: new Date(now).toISOString(),
        lore: 'A test lore line.', phase: 'open', ...over
    });
    const openVote = async (page, ev) => {
        await page.route(u => u.href === `${API}/vote-event`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ev) }));
        await page.addInitScript(() => { try { localStorage.setItem('codex_vote_unlock_seen', 'ev1'); } catch (e) {} });
        await page.reload();
        await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
        await page.evaluate(() => window.switchTab('vote'));
        await page.waitForTimeout(500);
    };
    it('keeps its parts and labels, the slime never covers the lock, the decoration stays out of screen readers', () => withPage({ width: 1440, height: 900, locale: 'en-US' }, async (page) => {
        await openVote(page, drop());
        const m = await page.evaluate(() => {
            const lock = document.getElementById('v-lock').getBoundingClientRect();
            const hit = document.elementFromPoint(lock.left + lock.width / 2, lock.top + lock.height / 2);
            return { phase: document.getElementById('vote-container').dataset.phase, title: document.getElementById('v-title').textContent,
                btn: document.getElementById('v-btn-label').textContent, action: document.getElementById('v-btn').dataset.action,
                inspect: document.querySelector('.vote-inspect').textContent.trim(), lockHit: hit && (hit.id === 'v-lock' || hit.id === 'v-img'),
                tubeHidden: document.querySelector('.vote-tube').getAttribute('aria-hidden') };
        });
        assert.equal(m.phase, 'open');
        assert.equal(m.title, 'PROJECT CASTLE');
        assert.equal(m.action, 'login');
        assert.equal(m.btn, 'Sign in to vote');
        assert.equal(m.inspect, 'INSPECT SYSTEM');
        assert.equal(m.lockHit, true, 'the lock shows through the slime frame');
        assert.equal(m.tubeHidden, 'true');
    }));
    for (const [label, width, height] of [['phone 390', 390, 844], ['phone 360', 360, 740]]) {
        it(`unlocked: SEE IT IN LIVE DROPS and INSPECT are full-size and reachable, nothing sideways — ${label}`, () => withPage({ width, height }, async (page) => {
            await openVote(page, drop({ phase: 'unlocked', status: 'unlocked', currentVotes: 10, pcId: 'pc1' }));
            const m = await page.evaluate(() => {
                const card = document.getElementById('vote-container').getBoundingClientRect();
                const ins = document.querySelector('.vote-inspect');
                // Scrolled all the way down, as a visitor would: the page leaves room for the bottom bar
                window.scrollTo(0, document.scrollingElement.scrollHeight);
                const r = ins.getBoundingClientRect();
                const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                return { sideways: document.documentElement.scrollWidth > innerWidth, fitsWide: card.left >= 0 && card.right <= innerWidth,
                    action: document.getElementById('v-btn').dataset.action, btnH: document.getElementById('v-btn').getBoundingClientRect().height,
                    insH: r.height, insReachable: ins.contains(hit) };
            });
            assert.equal(m.sideways, false);
            assert.equal(m.fitsWide, true);
            assert.equal(m.action, 'golive');
            assert.ok(m.btnH >= 40 && m.insH >= 40, `touch targets ${m.btnH} / ${m.insH}`);
            assert.equal(m.insReachable, true, 'INSPECT is not under the bottom bar once scrolled to');
            await page.locator('#v-btn').click();
            // The button still takes you there
            await page.waitForFunction(() => document.getElementById('vote-view').classList.contains('hidden'), null, { timeout: 5000 });
        }));
    }
    for (const [label, width, height, locale] of [['phone 390 el', 390, 844, 'el-GR'], ['phone 360 el', 360, 740, 'el-GR'], ['phone 390 en', 390, 844, 'en-US']]) {
        it(`both pills in the top row show their words and fit, and INSPECT is a plain pill — ${label}`, () => withPage({ width, height, locale }, async (page) => {
            await openVote(page, drop());
            const m = await page.evaluate(() => {
                const card = document.getElementById('vote-container').getBoundingClientRect();
                const st = document.getElementById('v-status').getBoundingClientRect(), info = document.querySelector('.vote-info-btn');
                const ib = info.getBoundingClientRect(), insp = getComputedStyle(document.querySelector('.vote-inspect'), '::before').content;
                return { infoText: info.textContent.trim(), infoLabelShown: getComputedStyle(info.querySelector('span')).display !== 'none',
                    row: st.right <= ib.left + 1 && ib.right <= card.right && st.left >= card.left, inspBefore: insp, sideways: document.documentElement.scrollWidth > innerWidth };
            });
            assert.ok(m.infoLabelShown, 'the words are there');
            assert.ok(m.infoText.length > 3);
            assert.ok(m.row, 'status and "how it works" side by side inside the card');
            assert.ok(m.inspBefore === 'none' || m.inspBefore === 'normal', 'no decoration on INSPECT');
            assert.equal(m.sideways, false);
        }));
    }
    it('SEE IT IN LIVE DROPS sits in its own ring and the card has no tubes, only the monitor', () => withPage({ width: 390, height: 844, locale: 'en-US' }, async (page) => {
        await openVote(page, drop({ phase: 'unlocked', status: 'unlocked', currentVotes: 10, pcId: 'pc1' }));
        const m = await page.evaluate(() => ({ ring: getComputedStyle(document.getElementById('v-btn')).outlineStyle, tube: document.querySelectorAll('.vote-tube .vt-glass, .vote-tube .vt-cap').length,
            monitor: document.querySelectorAll('.vote-tube .vt-monitor').length }));
        assert.equal(m.ring, 'solid');
        assert.equal(m.tube, 0);
        assert.equal(m.monitor, 1);
    }));
    it('the countdown stays plain text beside the count on a phone', () => withPage({ width: 390, height: 844 }, async (page) => {
        await openVote(page, drop());
        const bg = await page.evaluate(() => getComputedStyle(document.getElementById('v-timer')).backgroundColor);
        assert.equal(bg, 'rgba(0, 0, 0, 0)');
    }));
    it('the slime stands still for reduced motion', () => withPage({ width: 390, height: 844 }, async (page) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openVote(page, drop({ phase: 'unlocked', status: 'unlocked', currentVotes: 10, pcId: 'pc1' }));
        const names = await page.evaluate(() => ['.vote-progress-fill', '.vote-tube .vt-monitor polyline']
            .map(s => getComputedStyle(document.querySelector(s)).animationName)
            .concat(getComputedStyle(document.getElementById('v-btn'), '::after').animationName));
        assert.deepEqual(names, ['none', 'none', 'none']);
    }));
});

// Cumulative Layout Shift while the page loads: the card grows from an empty box to its full size when
// the catalogue arrives. That happens under the splash, but Chrome (and WebPageTest) count it anyway —
// it was 0.08 on a desktop and 0.11 on a phone, where "good" is 0.1 or less.
const CLS_OBSERVER = `window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });`;
describe('loading without jumping', () => {
    for (const [label, width, height] of [['phone 390', 390, 844], ['desktop 1440', 1440, 900]]) {
        it(`the page does not shift while it loads — ${label}`, () => withPage({ width, height, initScript: CLS_OBSERVER }, async (page) => {
            await page.waitForTimeout(1500);
            const cls = await page.evaluate(() => window.__cls);
            assert.ok(cls < 0.02, `layout shift while loading was ${cls.toFixed(3)}`);
        }));
    }
});

describe('reviews', () => {
    const REVIEWS = [
        { _id: 'r1', user: 'Maria', rating: 5, text: 'Fast and quiet', date: '2026-11-20T10:00:00Z', verified: true },
        { _id: 'r2', user: 'Shop', rating: 4, text: 'Typed by hand', date: '2026-11-19T10:00:00Z' }
    ];
    const openList = (page) => page.locator('#review-list .review-card').first().waitFor({ state: 'attached' });

    it('a review written with the box code says verified purchase; one typed by hand does not', () => withPage({ width: 1440, height: 900, reviews: REVIEWS }, async (page) => {
        await openList(page);
        const cards = page.locator('#review-list .review-card');
        assert.equal(await cards.nth(0).locator('.r-verified').count(), 1);
        assert.match(await cards.nth(0).innerText(), /Verified purchase/);
        assert.equal(await cards.nth(1).locator('.r-verified').count(), 0);
        assert.match(await page.locator('#reviews-meta').innerText(), /only inside the PC's box/, 'says how the ✓ is earned');
    }));

    it('"N deliveries" shows only when the server sends a number', () => withPage({ width: 1440, height: 900, reviews: REVIEWS, status: { deliveries: 37 } }, async (page) => {
        await openList(page);
        await page.waitForFunction(() => /37 deliveries/.test(document.getElementById('reviews-meta').innerText));
    }));

    it('nothing above the list with no number and no verified review', () => withPage({ width: 1440, height: 900, status: { deliveries: null } }, async (page) => {
        assert.equal(await page.locator('#reviews-meta').isHidden(), true);
    }));

    it('in Greek', () => withPage({ width: 1440, height: 900, locale: 'el-GR', reviews: REVIEWS, status: { deliveries: 12 } }, async (page) => {
        await openList(page);
        await page.waitForFunction(() => /12 παραδόσεις/.test(document.getElementById('reviews-meta').innerText));
        assert.match(await page.locator('.r-verified').innerText(), /Επαληθευμένη αγορά/);
    }));
});

describe('checkout', () => {
    // One PC in the cart, then the checkout window open
    async function toCheckout(page) {
        await page.locator('.btn-card-inspect').first().click();
        await page.locator('#yg-add-cart').waitFor({ state: 'visible' });
        await page.locator('#yg-add-cart').click();
        await page.waitForFunction(() => window.codexState.cart.length === 1);
        await page.locator('#yg-add-cart').waitFor({ state: 'hidden' });
        await page.evaluate(() => window.handleCheckout());
        await page.locator('#checkout-modal.active').waitFor();
    }
    async function fill(page) {
        await page.fill('#co-first', 'Nikos');
        await page.fill('#co-last', 'Papadopoulos');
        await page.fill('#co-phone', '6912345678');
        await page.fill('#co-email', 'nikos@gmail.com');
        await page.fill('#co-address', 'Egnatias 1');
        await page.fill('#co-postcode', '54630');
        await page.fill('#co-city', 'Thessaloniki');
    }

    for (const [label, width, height] of [['phone 390', 390, 844], ['desktop 1440', 1440, 900]]) {
        it(`places an order and shows the number — ${label}`, () => withPage({ width, height }, async (page) => {
            await toCheckout(page);
            assert.equal(await page.locator('#co-demo').isVisible(), true, 'the DEMO notice must be shown while orders are not live');
            assert.match(await page.locator('#co-summary-lines').innerText(), /TEST RIG 1/);
            await fill(page);
            await page.check('#co-terms');
            await page.check('#co-adult');
            await page.locator('#co-submit').click();

            await page.locator('#co-done').waitFor({ state: 'visible' });
            assert.match(await page.locator('#co-done').innerText(), /DEMO-0001/);
            assert.equal(await page.evaluate(() => window.codexState.cart.length), 0, 'the cart is emptied');
            assert.match(await page.locator('.co-wa-btn').getAttribute('href'), /^https:\/\/wa\.me\/.+DEMO-0001/);

            const [sent] = page.orders;
            assert.deepEqual(sent.items, [{ pcId: 'pc1', storage: '', proConfig: false, paint: false, paintAck: false }]);
            assert.equal('priceCents' in sent.items[0], false, 'the page must send choices, not prices');
            assert.equal(sent.delivery.method, 'courier');
            assert.equal(sent.termsVersion, '2026-11-2');
            assert.equal(sent.lang, 'en', 'the emails follow the language the order was placed in');
            assert.equal(sent.acceptTerms, true);
            assert.equal(sent.adultOrGuardian, true);
            assert.deepEqual(page.problems, []);
        }));
    }

    it('nothing is sent until the terms and the 18+ box are ticked', () => withPage({ width: 1440, height: 900 }, async (page) => {
        await toCheckout(page);
        await fill(page);
        await page.locator('#co-submit').click();
        assert.equal(await page.locator('#co-error').isVisible(), true);
        await page.check('#co-terms');
        await page.locator('#co-submit').click();
        assert.match(await page.locator('#co-error').innerText(), /age|ηλικία/i, 'the second box is the one asked about now');
        assert.equal(page.orders.length, 0);
    }));

    it('in person lists the Thessaloniki areas, and no map is fetched', () => withPage({ width: 390, height: 844 }, async (page) => {
        await toCheckout(page);
        await page.locator('.co-method:has(input[value="hand"])').click();
        await page.locator('#co-area').waitFor({ state: 'visible' });
        const areas = await page.locator('#co-area option').allInnerTexts();
        assert.ok(areas.includes('Καλαμαριά'));
        assert.match(await page.locator('#co-areas').innerText(), /Θεσσαλονίκη/);
        assert.equal(await page.locator('#co-map').count(), 0);
        assert.equal(await page.evaluate(() => [...document.scripts].some(s => /leaflet/i.test(s.src))), false, 'no map library is loaded');
        assert.equal(await page.locator('#co-address').isVisible(), false, 'the courier fields are hidden');
    }));

    it('fits a 360px phone without sideways scrolling', () => withPage({ width: 360, height: 760 }, async (page) => {
        await toCheckout(page);
        const overflow = await page.evaluate(() => {
            const box = document.querySelector('#checkout-modal .info-box');
            return { box: box.getBoundingClientRect().right, inner: box.scrollWidth - box.clientWidth, vw: innerWidth };
        });
        assert.ok(overflow.box <= overflow.vw + 1, `window wider than the screen: ${JSON.stringify(overflow)}`);
        assert.ok(overflow.inner <= 1, `content wider than the window: ${JSON.stringify(overflow)}`);
    }));
});
