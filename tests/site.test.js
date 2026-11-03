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
