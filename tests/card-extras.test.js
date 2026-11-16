// The card's EXTRAS tab always lists the three extras (storage, Pro Configuration, custom paint). One the admin
// hasn't ticked for this PC is shown locked ("Not available on this system") instead of being left out, so the
// tab is always full and every card has the same tabs. Run from this folder: npm test

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

const ALL_ON = { storage: { enabled: true, hdd: 50, ssd: 80 }, proConfig: { enabled: true }, paint: { enabled: true, price: 40, colorName: 'Red', colorNameEl: 'Κόκκινο', colorHex: '#ff0000', images: [] } };
const ALL_OFF = { storage: { enabled: false, hdd: 50, ssd: 80 }, proConfig: { enabled: false }, paint: { enabled: false, price: 40, images: [] } };
const LOCKED_EL = 'Μη διαθέσιμο σε αυτό το σύστημα';

const openExtras = async (page) => { await page.locator('#main-card .tc-tab[data-tc-tab="extras"]').click(); await page.locator('#main-card .tc-extras.active').waitFor(); };
const rows = (page) => page.evaluate(() => [...document.querySelectorAll('#main-card .tc-extras .tc-ex-row')].map(r => ({
    locked: r.classList.contains('locked'), button: r.tagName === 'BUTTON', text: r.innerText.replace(/\s+/g, ' ').trim(), lock: !!r.querySelector('.ph-lock-simple')
})));

describe('the card\'s EXTRAS tab: always three, the unticked ones locked', () => {
    it('one ticked (storage): it is a button with its price, the other two are locked with the words', () => withPage({}, async (page) => {
        await openExtras(page);
        const r = await rows(page);
        assert.equal(r.length, 3);
        assert.deepEqual(r.map(x => x.locked), [false, true, true]);
        assert.deepEqual(r.map(x => x.button), [true, false, false], 'a locked one cannot be pressed');
        assert.match(r[0].text, /Επέκταση αποθηκευτικού χώρου.*50,00/);
        assert.match(r[1].text, new RegExp(`^Pro Configuration ${LOCKED_EL}$`));
        assert.match(r[2].text, new RegExp(`^Custom βαφή ${LOCKED_EL}$`));
        assert.deepEqual(r.map(x => x.lock), [false, true, true]);
        assert.doesNotMatch(r[1].text + r[2].text, /€/, 'no price on something that cannot be bought');
    }));

    it('none ticked: the tab is still there, with three locked rows', () => withPage({ pcPatch: { 0: { options: ALL_OFF } } }, async (page) => {
        assert.equal(await page.locator('#main-card .tc-tabs').count(), 1);
        assert.equal(await page.locator('#main-card .tc-face.no-tabs').count(), 0);
        await openExtras(page);
        assert.deepEqual((await rows(page)).map(x => x.locked), [true, true, true]);
    }));

    it('all ticked: three buttons, nothing locked, the paint with its colour', () => withPage({ pcPatch: { 0: { options: ALL_ON } } }, async (page) => {
        await openExtras(page);
        const r = await rows(page);
        assert.deepEqual(r.map(x => x.locked), [false, false, false]);
        assert.match(r[2].text, /Custom βαφή — Κόκκινο/);
    }));

    it('storage ticked but with no price on either drive counts as not offered', () => withPage({ pcPatch: { 0: { options: { ...ALL_ON, storage: { enabled: true, hdd: 0, ssd: 0 } } } } }, async (page) => {
        await openExtras(page);
        assert.deepEqual((await rows(page)).map(x => x.locked), [true, false, false]);
    }));

    it('says it in English', () => withPage({ locale: 'en-US' }, async (page) => {
        await openExtras(page);
        assert.match((await rows(page))[1].text, /^Pro Configuration Not available on this system$/);
    }));

    it('pressing a locked row does nothing; pressing an offered one opens INSPECT on its extras', () => withPage({}, async (page) => {
        await openExtras(page);
        await page.locator('#main-card .tc-ex-row.locked').first().click();
        await page.waitForTimeout(450);
        assert.equal(await page.locator('#yg-add-cart').isVisible(), false);
        await page.locator('#main-card button.tc-ex-row').first().click();
        await page.locator('#yg-add-cart').waitFor({ state: 'visible' });
    }));

    for (const [label, size, locale] of [['phone 390 el', { width: 390, height: 844 }, 'el-GR'], ['phone 360 el', { width: 360, height: 780 }, 'el-GR'], ['phone 390 en', { width: 390, height: 844 }, 'en-US'], ['tablet 820 el', { width: 820, height: 1180 }, 'el-GR'], ['desktop 1440 el', { width: 1440, height: 900, mobile: false }, 'el-GR']]) {
        for (const [what, options] of [['all locked', ALL_OFF], ['mixed', undefined]]) {
            it(`the three rows fit their box and no words are cut — ${label}, ${what}`, () => withPage({ ...size, locale, pcPatch: options ? { 0: { options } } : null }, async (page) => {
                await openExtras(page);
                const m = await page.evaluate(() => {
                    const box = document.querySelector('#main-card .tc-extras'), b = box.getBoundingClientRect();
                    const rws = [...box.querySelectorAll('.tc-ex-row')].map(r => r.getBoundingClientRect());
                    const cut = [...box.querySelectorAll('.tc-ex-row.locked .tc-ex-why, .tc-ex-row.locked .tc-ex-name')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
                    const small = [...box.querySelectorAll('.tc-ex-why')].map(e => parseFloat(getComputedStyle(e).fontSize));
                    return { top: b.top, bottom: b.bottom, first: rws[0].top, last: rws[2].bottom, overflow: box.scrollHeight - box.clientHeight, cut, small };
                });
                assert.ok(m.first >= m.top - 0.5 && m.last <= m.bottom + 0.5, `rows from ${m.first.toFixed(1)} to ${m.last.toFixed(1)} in a box from ${m.top.toFixed(1)} to ${m.bottom.toFixed(1)}`);
                assert.ok(m.overflow <= 1, `the box overflows by ${m.overflow}px`);
                assert.deepEqual(m.cut, [], 'cut off with an ellipsis');
                for (const s of m.small) assert.ok(s >= 10.5, `the words are ${s}px`);
            }));
        }
    }

    it('a card with nothing ticked is as tall as one with everything ticked', async () => {
        const height = async (options) => { let h; await withPage({ pcPatch: { 0: { options } } }, async (page) => { h = (await page.locator('#main-card').boundingBox()).height; }); return h; };
        assert.equal(await height(ALL_OFF), await height(ALL_ON));
    });
});
