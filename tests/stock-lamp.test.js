// The stock lamp: a small light on the card's photo that says how many are left, and says it in words when it is
// pressed. Green with a soft pulse (2 or more: "5 units available", the real number), steady red (1 left), steady
// orange (coming soon). Sold out has no lamp: the pill under the photo says so. Run from this folder: npm test

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
const tip = (page) => page.locator('#main-card .tc-lamp-tip');
const tipShown = (page) => page.evaluate(() => { const t = document.querySelector('#main-card .tc-lamp-tip'); return !!t && getComputedStyle(t).opacity === '1' && t.closest('.tc-lamp-wrap').classList.contains('open'); });
// The ring that pulses around the dot (a pseudo-element, so the pulse is cheap): is something animating?
const pulsing = (page) => page.evaluate(() => { const d = document.querySelector('#main-card .tc-lamp-dot'); return getComputedStyle(d, '::after').animationName !== 'none'; });
// A coming-soon system is listed last, so it isn't the first card: walk to it by name
const goTo = async (page, name) => { for (let i = 0; i < 4; i++) { if ((await page.locator('#main-card .tc-name').innerText()) === name) return; await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450); } };
const next = async (page) => { await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.querySelector('#main-card .tc-name')?.textContent === 'TEST RIG 2'); };

describe('the stock lamp: the three lights', () => {
    it('green with a soft pulse when there are 2 or more, saying the real number', () => withPage({ pcPatch: { 0: { stock: 12 } } }, async (page) => {
        await lamp(page).waitFor();
        assert.match(await lamp(page).getAttribute('class'), /\bmany\b/);
        assert.equal(await lamp(page).getAttribute('aria-label'), '12 τεμάχια διαθέσιμα');
        assert.equal(await pulsing(page), true);
        assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-dot')).backgroundColor), /^rgb\(\s*(4\d|5\d|6\d),\s*2[0-9]{2},/, 'green');
    }));

    it('steady red when one is left', () => withPage({}, async (page) => {
        await next(page);                                   // TEST RIG 2: one in stock
        assert.match(await lamp(page).getAttribute('class'), /\blast\b/);
        assert.equal(await lamp(page).getAttribute('aria-label'), '1 τεμάχιο διαθέσιμο');
        assert.equal(await pulsing(page), false, 'steady, not pulsing');
        const [r, g] = (await page.evaluate(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-dot')).backgroundColor)).match(/\d+/g).map(Number);
        assert.ok(r > 200 && g < 100, 'red');
    }));

    it('steady orange when it is coming soon', () => withPage({ pcPatch: { 0: { status: 'coming' } } }, async (page) => {
        await goTo(page, 'TEST RIG 1');
        assert.match(await lamp(page).getAttribute('class'), /\bsoon\b/);
        assert.equal(await lamp(page).getAttribute('aria-label'), 'Αναμένεται σύντομα');
        assert.equal(await pulsing(page), false);
        const [r, g, b] = (await page.evaluate(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-dot')).backgroundColor)).match(/\d+/g).map(Number);
        assert.ok(r > 200 && g > 120 && g < 200 && b < 80, 'orange');
    }));

    it('no lamp when it is sold out: the pill says so', () => withPage({}, async (page) => {
        await next(page); await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('#main-card .tc-name')?.textContent === 'TEST RIG 3');
        assert.equal(await lamp(page).count(), 0);
        assert.equal((await page.locator('#main-card .stock-badge').innerText()).trim(), 'ΕΞΑΝΤΛΗΘΗΚΕ');
    }));

    it('the old stock pill is gone where there is a lamp, and the price has the whole row', () => withPage({}, async (page) => {
        await lamp(page).waitFor();
        assert.equal(await page.locator('#main-card .stock-badge').count(), 0);
        const r = await page.evaluate(() => { const row = document.querySelector('#main-card .tc-row').getBoundingClientRect(), p = document.querySelector('#main-card .tc-price').getBoundingClientRect(); return { row: row.width, price: p.width }; });
        assert.ok(r.price >= r.row - 2, `the price panel fills the row (${Math.round(r.price)} of ${Math.round(r.row)})`);
    }));

    it('says it in English too', () => withPage({ locale: 'en-US' }, async (page) => {
        await lamp(page).waitFor();
        assert.equal(await lamp(page).getAttribute('aria-label'), '3 units available');
        await next(page);
        assert.equal(await lamp(page).getAttribute('aria-label'), '1 unit available');
    }));

    it('and in English for coming soon', () => withPage({ locale: 'en-US', pcPatch: { 0: { status: 'coming' } } }, async (page) => {
        await goTo(page, 'TEST RIG 1');
        assert.equal(await lamp(page).getAttribute('aria-label'), 'Coming soon');
    }));
});

describe('the stock lamp: pressing it', () => {
    for (const [label, size] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900, mobile: false }]]) {
        it(`shows its words below the lamp, inside the photo — ${label}`, () => withPage(size, async (page) => {
            await lamp(page).waitFor();
            assert.equal(await tipShown(page), false, 'nothing is shown until it is pressed');
            await lamp(page).click();
            await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '1');
            assert.equal((await tip(page).innerText()).trim(), '3 τεμάχια διαθέσιμα');
            assert.equal(await lamp(page).getAttribute('aria-expanded'), 'true');
            const g = await page.evaluate(() => { const t = document.querySelector('#main-card .tc-lamp-tip').getBoundingClientRect(), a = document.querySelector('#main-card .tc-art').getBoundingClientRect(), l = document.querySelector('#main-card .tc-lamp').getBoundingClientRect(); return { tl: t.left, tt: t.top, tr: t.right, tb: t.bottom, al: a.left, at: a.top, ar: a.right, ab: a.bottom, lb: l.bottom }; });
            assert.ok(g.tl >= g.al && g.tr <= g.ar && g.tb <= g.ab && g.tt >= g.at, 'the words fit inside the photo');
            assert.ok(g.tt >= g.lb - 12, 'and sit under the lamp');
        }));
    }

    it('pressing it does not open INSPECT (the photo is a button too)', () => withPage({}, async (page) => {
        await lamp(page).click();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('#yg-add-cart').isVisible(), false);
    }));

    it('pressing it again closes it', () => withPage({}, async (page) => {
        await lamp(page).click(); await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '1');
        await lamp(page).click();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '0');
        assert.equal(await lamp(page).getAttribute('aria-expanded'), 'false');
    }));

    it('pressing anywhere else closes it', () => withPage({}, async (page) => {
        await lamp(page).click(); await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '1');
        await page.locator('#main-card .tc-price').click();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '0');
    }));

    it('Escape closes it', () => withPage({ width: 1440, height: 900, mobile: false }, async (page) => {
        await lamp(page).click(); await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '1');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '0');
    }));

    it('it closes by itself after a few seconds', () => withPage({}, async (page) => {
        await lamp(page).click(); await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '1');
        await page.waitForTimeout(4600);
        assert.equal(await tipShown(page), false);
    }));

    it('works from the keyboard: Tab to it, Enter opens it', () => withPage({ width: 1440, height: 900, mobile: false }, async (page) => {
        await lamp(page).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#main-card .tc-lamp-tip')).opacity === '1');
        assert.equal(await lamp(page).getAttribute('aria-expanded'), 'true');
    }));

    it('a press is easy to hit on a phone: at least 36px', () => withPage({}, async (page) => {
        const b = await lamp(page).boundingBox();
        assert.ok(b.width >= 36 && b.height >= 36, `${Math.round(b.width)}x${Math.round(b.height)}`);
    }));
});

describe('the stock lamp: with the rest of the photo', () => {
    it('does not sit on the community badge', () => withPage({ pcPatch: { 0: { communityDrop: true } } }, async (page) => {
        await page.locator('#main-card .community-badge').waitFor();
        const r = await page.evaluate(() => { const l = document.querySelector('#main-card .tc-lamp').getBoundingClientRect(), c = document.querySelector('#main-card .community-badge').getBoundingClientRect(); return { lampRight: l.right, badgeLeft: c.left }; });
        assert.ok(r.badgeLeft >= r.lampRight - 1, `the badge starts at ${Math.round(r.badgeLeft)}, the lamp ends at ${Math.round(r.lampRight)}`);
    }));

    it('stops pulsing for a visitor who asked for less motion', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'el-GR' });
        const p = await ctx.newPage();
        try {
            await p.route(u => !u.href.startsWith(site.url) && !u.href.startsWith('https://codex-backend-9kij.onrender.com') && /^https?:/.test(u.href), r => r.abort());
            await newPage; // (the shared helper sets up the canned API for its own pages; this page only needs the markup rules)
            await p.goto(site.url);
            await p.waitForSelector('#main-card .tc-lamp', { timeout: 8000 }).catch(() => {});
            const none = await p.evaluate(() => { const d = document.querySelector('.tc-lamp-dot'); return d ? getComputedStyle(d, '::after').animationName === 'none' : true; });
            assert.equal(none, true);
        } finally { await ctx.close(); }
    });

    it('is still there after swiping to the next PC and back, and shows that PC\'s own words', () => withPage({}, async (page) => {
        await lamp(page).waitFor();
        await next(page);
        assert.equal(await lamp(page).getAttribute('aria-label'), '1 τεμάχιο διαθέσιμο');
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(() => document.querySelector('#main-card .tc-name')?.textContent === 'TEST RIG 1');
        assert.equal(await lamp(page).getAttribute('aria-label'), '3 τεμάχια διαθέσιμα');
        assert.equal(await tipShown(page), false, 'a new card starts with the words closed');
    }));

    it('the words are text, never markup', () => withPage({ pcPatch: { 0: { stock: 7 } } }, async (page) => {
        await lamp(page).waitFor();
        assert.equal(await page.locator('#main-card .tc-lamp-tip *').count(), 0);
        assert.deepEqual(page.problems, []);
    }));
});
