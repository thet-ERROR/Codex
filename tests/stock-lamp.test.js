// The stock label: a small light and its words on the card's photo, always in view. Green with a soft pulse
// (2 or more: "5 διαθέσιμα", the real number), steady red (the last one), steady orange (coming soon). Nothing
// to press, and the colour is never the only way to know. Sold out has no label: the pill under the photo says
// so. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });
async function withPage(opts, body) {
    const page = await newPage(browser, site, { locale: 'el-GR', width: 390, height: 844, ...opts });
    try { await body(page); } finally { await page.context().close(); }
}

const lamp = (page) => page.locator('#main-card .tc-lamp');
const words = async (page) => (await page.locator('#main-card .tc-lamp-text').innerText()).trim();
const dotColour = (page) => page.evaluate(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-dot')).backgroundColor.match(/\d+/g).map(Number));
// The ring that pulses around the dot (a pseudo-element, so the pulse is cheap): is something animating?
const pulsing = (page) => page.evaluate(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-dot'), '::after').animationName !== 'none');
// A coming-soon system is listed last, so it isn't the first card: walk to a card by its name
const goTo = async (page, name) => { for (let i = 0; i < 4; i++) { if ((await page.locator('#main-card .tc-name').innerText()) === name) return; await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450); } };

describe('the stock label: the three lights and their words', () => {
    it('green with a soft pulse when there are 2 or more, with the real number', () => withPage({ pcPatch: { 0: { stock: 12 } } }, async (page) => {
        await lamp(page).waitFor();
        assert.match(await lamp(page).getAttribute('class'), /\bmany\b/);
        assert.equal(await words(page), '12 διαθέσιμα');
        assert.equal(await pulsing(page), true);
        const [r, g] = await dotColour(page);
        assert.ok(g > 200 && r < 100, 'green');
    }));

    it('steady red when one is left', () => withPage({}, async (page) => {
        await goTo(page, 'TEST RIG 2');                     // one in stock
        assert.match(await lamp(page).getAttribute('class'), /\blast\b/);
        assert.equal(await words(page), 'Τελευταίο τεμάχιο');
        assert.equal(await pulsing(page), false, 'steady, not pulsing');
        const [r, g] = await dotColour(page);
        assert.ok(r > 200 && g < 100, 'red');
    }));

    it('steady orange when it is coming soon', () => withPage({ pcPatch: { 0: { status: 'coming' } } }, async (page) => {
        await goTo(page, 'TEST RIG 1');
        assert.match(await lamp(page).getAttribute('class'), /\bsoon\b/);
        assert.equal(await words(page), 'Έρχεται σύντομα');
        assert.equal(await pulsing(page), false);
        const [r, g, b] = await dotColour(page);
        assert.ok(r > 200 && g > 120 && g < 200 && b < 80, 'orange');
    }));

    it('no label when it is sold out: the pill under the photo says so', () => withPage({}, async (page) => {
        await goTo(page, 'TEST RIG 3');
        assert.equal(await lamp(page).count(), 0);
        assert.equal((await page.locator('#main-card .stock-badge').innerText()).trim(), 'ΕΞΑΝΤΛΗΘΗΚΕ');
    }));

    it('where there is a label there is no pill beside the price, which has the whole row', () => withPage({}, async (page) => {
        await lamp(page).waitFor();
        assert.equal(await page.locator('#main-card .stock-badge').count(), 0);
        const r = await page.evaluate(() => { const row = document.querySelector('#main-card .tc-row').getBoundingClientRect(), p = document.querySelector('#main-card .tc-price').getBoundingClientRect(); return { row: row.width, price: p.width }; });
        assert.ok(r.price >= r.row - 2, `the price panel fills the row (${Math.round(r.price)} of ${Math.round(r.row)})`);
    }));

    it('in English', () => withPage({ locale: 'en-US' }, async (page) => {
        await lamp(page).waitFor();
        assert.equal(await words(page), '3 available');
        await goTo(page, 'TEST RIG 2');
        assert.equal(await words(page), 'Last one');
    }));

    it('in English for coming soon', () => withPage({ locale: 'en-US', pcPatch: { 0: { status: 'coming' } } }, async (page) => {
        await goTo(page, 'TEST RIG 1');
        assert.equal(await words(page), 'Coming soon');
    }));
});

describe('the stock label: always readable, never in the way', () => {
    for (const [label, size] of [['phone 390', { width: 390, height: 844 }], ['phone 360', { width: 360, height: 780 }], ['desktop 1440', { width: 1440, height: 900, mobile: false }]]) {
        it(`the words are in view without pressing anything, whole, inside the photo — ${label}`, () => withPage({ ...size, pcPatch: { 0: { stock: 128 } } }, async (page) => {
            await lamp(page).waitFor();
            const g = await page.evaluate(() => {
                const l = document.querySelector('#main-card .tc-lamp'), t = l.querySelector('.tc-lamp-text'), a = document.querySelector('#main-card .tc-art').getBoundingClientRect(), r = l.getBoundingClientRect(), w = document.querySelector('#main-card .card-wish').getBoundingClientRect(), s = getComputedStyle(l);
                return { visible: s.visibility === 'visible' && s.opacity === '1', cut: t.scrollWidth > t.clientWidth + 1, font: parseFloat(s.fontSize), inside: r.left >= a.left && r.top >= a.top && r.right <= a.right && r.bottom <= a.bottom, clearOfWish: r.right < w.left };
            });
            assert.deepEqual(g, { visible: true, cut: false, font: g.font, inside: true, clearOfWish: true });
            assert.ok(g.font >= 11, `the words are ${g.font}px`);
        }));
    }

    it('it is not a control: a tap on it opens INSPECT like the rest of the photo', () => withPage({}, async (page) => {
        const b = await lamp(page).boundingBox();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await page.locator('#yg-add-cart').waitFor({ state: 'visible', timeout: 4000 });
    }));

    it('the community badge sits under it, not on it', () => withPage({ pcPatch: { 0: { communityDrop: true } } }, async (page) => {
        await page.locator('#main-card .community-badge').waitFor();
        const r = await page.evaluate(() => { const l = document.querySelector('#main-card .tc-lamp').getBoundingClientRect(), c = document.querySelector('#main-card .community-badge').getBoundingClientRect(); return { lampBottom: l.bottom, badgeTop: c.top }; });
        assert.ok(r.badgeTop >= r.lampBottom, `the badge starts at ${Math.round(r.badgeTop)}, the label ends at ${Math.round(r.lampBottom)}`);
    }));

    it('each card shows its own words after going to the next PC and back', () => withPage({}, async (page) => {
        await lamp(page).waitFor();
        await goTo(page, 'TEST RIG 2');
        assert.equal(await words(page), 'Τελευταίο τεμάχιο');
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(() => document.querySelector('#main-card .tc-name')?.textContent === 'TEST RIG 1');
        assert.equal(await words(page), '3 διαθέσιμα');
    }));

    it('the words are text, never markup, and the page has no errors', () => withPage({ pcPatch: { 0: { stock: 7 } } }, async (page) => {
        await lamp(page).waitFor();
        assert.equal(await page.locator('#main-card .tc-lamp-text *').count(), 0);
        assert.deepEqual(page.problems, []);
    }));
});
