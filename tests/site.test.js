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
            assert.equal(sent.termsVersion, '2026-11');
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

    it('in person lists the Thessaloniki areas, even when the map cannot load', () => withPage({ width: 390, height: 844 }, async (page) => {
        await toCheckout(page);
        await page.locator('.co-method:has(input[value="hand"])').click();
        await page.locator('#co-area').waitFor({ state: 'visible' });
        const areas = await page.locator('#co-area option').allInnerTexts();
        assert.ok(areas.includes('Καλαμαριά'));
        assert.match(await page.locator('#co-areas').innerText(), /Θεσσαλονίκη/);
        // The map host is offline in tests: the window says so instead of showing an empty box
        await page.waitForFunction(() => document.getElementById('co-map').classList.contains('is-failed'), null, { timeout: 5000 });
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
