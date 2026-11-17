// The VS strip in the card (one PC picked: "add an opponent"; two: "compare them") gets a ✕ that clears the
// comparison, so nobody has to find each PC again to take it out. The strip and the ✕ are two buttons side by
// side, not a button inside a button. And with the stock pill gone, the card's price sits in the middle of its
// row. Run from this folder: npm test

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

const pick = async (page) => { await page.locator('#main-card .btn-card-compare').click(); await page.waitForTimeout(250); };
const next = async (page, name) => { await page.keyboard.press('ArrowRight'); await page.waitForFunction(n => document.querySelector('#main-card .tc-name')?.textContent === n, name); };
const picked = (page) => page.evaluate(() => import('./js/state.js').then(m => m.state.compareList.map(p => p.name)));
const strip = (page) => page.evaluate(() => { const s = document.getElementById('compare-float'); return { shown: getComputedStyle(s).display !== 'none', half: s.classList.contains('half'), active: s.classList.contains('active') }; });

describe('the VS strip: clearing the comparison', () => {
    it('with one PC picked, ✕ clears it, the strip goes and the card\'s button is back to "compare"', () => withPage({}, async (page) => {
        await pick(page);
        assert.deepEqual(await strip(page), { shown: true, half: true, active: false });
        await page.locator('#compare-float .cf-clear').click();
        assert.deepEqual(await picked(page), []);
        assert.equal((await strip(page)).shown, false);
        assert.match(await page.locator('#main-card .btn-card-compare').innerText(), /ΣΥΓΚΡΙΣΗ|Σύγκριση/i);
    }));

    it('with two picked, ✕ clears both and does not open the comparison', () => withPage({}, async (page) => {
        await pick(page);
        await next(page, 'TEST RIG 2');
        await pick(page);
        assert.deepEqual(await picked(page), ['TEST RIG 1', 'TEST RIG 2']);
        await page.locator('#compare-float .cf-clear').click();
        await page.waitForTimeout(300);
        assert.deepEqual(await picked(page), []);
        assert.equal(await page.locator('#compare-modal.active').count(), 0);
    }));

    it('the rest of the strip still opens the comparison', () => withPage({}, async (page) => {
        await pick(page);
        await next(page, 'TEST RIG 2');
        await pick(page);
        await page.locator('#compare-float .cf-open').click();
        await page.locator('#compare-modal.active').waitFor();
    }));

    it('two real buttons, side by side: the ✕ has a name, nothing is a button inside a button', () => withPage({}, async (page) => {
        await pick(page);
        const r = await page.evaluate(() => {
            const s = document.getElementById('compare-float'), x = s.querySelector('.cf-clear'), o = s.querySelector('.cf-open');
            return { stripRole: s.getAttribute('role'), open: o.tagName, clear: x.tagName, name: x.getAttribute('aria-label'), nested: !!s.querySelector('button button'), size: [Math.round(x.getBoundingClientRect().width), Math.round(x.getBoundingClientRect().height)] };
        });
        assert.equal(r.stripRole, null);
        assert.deepEqual([r.open, r.clear, r.nested], ['BUTTON', 'BUTTON', false]);
        assert.match(r.name, /Καθάρισε τη σύγκριση/);
        assert.ok(r.size[0] >= 32 && r.size[1] >= 32, `the ✕ is ${r.size.join('x')}`);
    }));

    for (const [label, size] of [['phone 360', { width: 360, height: 780 }], ['phone 390', { width: 390, height: 844 }]]) {
        it(`the words in the strip are not cut off — ${label}`, () => withPage(size, async (page) => {
            await pick(page);
            const cut = await page.evaluate(() => [...document.querySelectorAll('#compare-float .cf-text > *')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
            assert.deepEqual(cut, []);
        }));
    }
});

describe('the card\'s price', () => {
    for (const [label, size] of [['phone 390', { width: 390, height: 844 }], ['desktop 1440', { width: 1440, height: 900, mobile: false }]]) {
        it(`sits in the middle of its row when there is no pill beside it — ${label}`, () => withPage(size, async (page) => {
            const m = await page.evaluate(() => {
                const row = document.querySelector('#main-card .tc-row').getBoundingClientRect(), price = document.querySelector('#main-card .tc-price');
                const range = document.createRange(); range.selectNodeContents(price); const text = range.getBoundingClientRect();
                return { row: row.left + row.width / 2, text: text.left + text.width / 2 };
            });
            assert.ok(Math.abs(m.row - m.text) <= 2, `the price's words are ${Math.round(m.text - m.row)}px off the middle`);
        }));
    }

    it('a sold-out card keeps its price and pill side by side', () => withPage({}, async (page) => {
        await next(page, 'TEST RIG 2'); await next(page, 'TEST RIG 3');
        const r = await page.evaluate(() => { const p = document.querySelector('#main-card .tc-price').getBoundingClientRect(), b = document.querySelector('#main-card .stock-badge').getBoundingClientRect(); return { priceRight: p.right, pillLeft: b.left }; });
        assert.ok(r.pillLeft >= r.priceRight, 'the pill is to the right of the price');
    }));
});

describe('the VS strip: one line, the card does not jump', () => {
    for (const [label, size] of [['phone 360', { width: 360, height: 780 }], ['phone 390', { width: 390, height: 844 }], ['desktop 1440', { width: 1440, height: 900, mobile: false }]]) {
        it(`as tall with one PC picked as with two — ${label}`, () => withPage(size, async (page) => {
            const h = () => page.evaluate(() => Math.round(document.getElementById('main-card').getBoundingClientRect().height));
            await pick(page);
            const one = await h();
            await next(page, 'TEST RIG 2');
            await pick(page);
            assert.equal(await h(), one);
            // one line: its height is under twice its font size, and it never wraps
            const t = await page.evaluate(() => { const s = document.querySelector('#compare-float .cf-text strong'); return { h: s.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(s).fontSize), ws: getComputedStyle(s).whiteSpace }; });
            assert.ok(t.h < t.fs * 2 && t.ws === 'nowrap', `the title is on one line (${t.h}px for ${t.fs}px text)`);
        }));
    }
});
