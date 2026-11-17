// The help assistant's "Find me a PC": one question (up to how much), then the PCs that fit, each with the
// strong points the admin wrote for it (what a buyer gains, not specs), and a button to see it on the stage.
// The budgets come from the real prices, so a choice is never empty. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });
async function withPage(opts, body) {
    const page = await newPage(browser, site, { locale: 'el-GR', width: 1440, height: 900, mobile: false, ...opts });
    try { await body(page); } finally { await page.context().close(); }
}

// The test shop: 1100 € (3 left), 1200 € (1 left), 1300 € (sold out). Strong points on the first two.
const HL = {
    0: { highlights: { el: ['Έξι πυρήνες: παίζει άνετα σε υψηλά γραφικά', 'Αναβαθμίζεται εύκολα στο μέλλον'], en: ['Six cores: smooth on high settings'] } },
    1: { highlights: { el: ['Αθόρυβο και δροσερό'], en: [] } }
};
// A bigger shop, so the budget question has something to split: prices 400 to 1000 €, all in stock
const SIX = Object.fromEntries([400, 500, 600, 800, 900, 1000].map((e, i) => [i, { priceCents: e * 100, stock: 2, status: 'available' }]));
const sixPcs = (page) => page.evaluate((patch) => import('./js/state.js').then(m => {
    const base = m.state.inventory[0];
    m.state.inventory = Object.values(patch).map((p, i) => ({ ...base, _id: 'pcx' + i, name: 'RIG ' + (i + 1), category: 'drop', images: base.images, highlights: { el: [], en: [] }, ...p }));
}), SIX);

const openFinder = async (page) => {
    await page.evaluate(() => window.toggleChat());
    await page.locator('#chat-widget.open').waitFor();
    await page.locator('[data-chat-open="find"]').click();
    await page.locator('#chat-menu-sub.active-screen').waitFor();
    await page.waitForTimeout(450);                  // the screen slides in (0.35s)
};
const subText = (page) => page.locator('#chat-menu-sub').innerText();
const results = (page) => page.evaluate(() => [...document.querySelectorAll('#chat-menu-sub .fr-pc')].map(c => ({
    name: c.querySelector('.fr-name').textContent.trim(),
    price: c.querySelector('.fr-price').textContent.replace(/\s+/g, ' ').trim(),
    points: [...c.querySelectorAll('.fr-points li')].map(l => l.textContent.trim())
})));

describe('the assistant: its menu', () => {
    it('"Find me a PC" replaces "Which PC do I need?" and "By budget"; the rest stay', () => withPage({}, async (page) => {
        await page.evaluate(() => window.toggleChat());
        const ids = await page.evaluate(() => [...document.querySelectorAll('#chat-menu-home [data-chat-open]')].map(b => b.dataset.chatOpen));
        assert.deepEqual(ids, ['find', 'buy', 'returns', 'admin']);
        assert.match(await page.locator('[data-chat-open="find"]').innerText(), /Βρες μου PC/);
    }));
});

describe('the assistant: up to how much', () => {
    it('the budgets come from the real prices, each says how many fit, none is empty', () => withPage({}, async (page) => {
        await sixPcs(page);
        await openFinder(page);
        const rows = await page.evaluate(() => [...document.querySelectorAll('#chat-menu-sub [data-find-max]')].map(b => ({ max: b.dataset.findMax, text: b.innerText.replace(/\s+/g, ' ').trim() })));
        assert.deepEqual(rows.map(r => r.max), ['500', '800', '']);
        assert.match(rows[0].text, /Έως 500 €.*2 συστήματα/);
        assert.match(rows[1].text, /Έως 800 €.*4 συστήματα/);
        assert.match(rows[2].text, /Όσο χρειαστεί.*6 συστήματα/);
    }));

    it('only what can be bought now counts: sold out and coming soon are left out', () => withPage({}, async (page) => {
        await sixPcs(page);
        await page.evaluate(() => import('./js/state.js').then(m => { m.state.inventory[1].stock = 0; m.state.inventory[2].status = 'coming'; }));
        await openFinder(page);
        assert.match(await page.locator('#chat-menu-sub [data-find-max=""]').innerText(), /4 συστήματα/);
    }));

    it('with two or fewer to choose from it skips the question and shows them', () => withPage({ pcPatch: HL }, async (page) => {
        await openFinder(page);                          // the test shop: two can be bought
        assert.equal(await page.locator('#chat-menu-sub [data-find-max]').count(), 0);
        assert.equal((await results(page)).length, 2);
    }));

    it('with nothing to buy it says so, and offers the systems that are coming', () => withPage({}, async (page) => {
        await page.evaluate(() => import('./js/state.js').then(m => { m.state.inventory.forEach(p => { p.stock = 0; }); }));
        await openFinder(page);
        assert.match(await subText(page), /Δεν υπάρχει διαθέσιμο σύστημα αυτή τη στιγμή/);
        assert.equal(await page.locator('#chat-menu-sub .fr-pc').count(), 0);
    }));
});

describe('the assistant: what fits', () => {
    it('the PCs within the budget, the dearest first, each with its strong points and price', () => withPage({ pcPatch: HL }, async (page) => {
        await openFinder(page);
        const r = await results(page);
        assert.deepEqual(r.map(x => x.name), ['TEST RIG 2', 'TEST RIG 1']);
        assert.match(r[1].price, /1\.100,00/);
        assert.deepEqual(r[1].points, ['Έξι πυρήνες: παίζει άνετα σε υψηλά γραφικά', 'Αναβαθμίζεται εύκολα στο μέλλον']);
        assert.deepEqual(r[0].points, ['Αθόρυβο και δροσερό']);
    }));

    it('a budget shows only what fits it', () => withPage({}, async (page) => {
        await sixPcs(page);
        await openFinder(page);
        await page.locator('#chat-menu-sub [data-find-max="500"]').click();
        assert.deepEqual((await results(page)).map(x => x.name), ['RIG 2', 'RIG 1']);
    }));

    it('at most three at first, the rest one press away', () => withPage({}, async (page) => {
        await sixPcs(page);
        await openFinder(page);
        await page.locator('#chat-menu-sub [data-find-max=""]').click();
        assert.equal((await results(page)).length, 3);
        await page.locator('#chat-menu-sub [data-find-more]').click();
        assert.equal((await results(page)).length, 6);
        assert.equal(await page.locator('#chat-menu-sub [data-find-more]').count(), 0);
    }));

    it('a PC with no strong points written shows none: nothing is made up from its specs', () => withPage({}, async (page) => {
        await openFinder(page);
        const r = await results(page);
        assert.ok(r.length > 0);
        for (const x of r) assert.deepEqual(x.points, []);
        assert.doesNotMatch(await subText(page), /Test CPU|Test GPU|32GB/, 'no specs');
    }));

    it('in English it shows the English strong points, and none where only Greek was written', () => withPage({ locale: 'en-US', pcPatch: HL }, async (page) => {
        await openFinder(page);
        const r = await results(page);
        assert.deepEqual(r.find(x => x.name === 'TEST RIG 1').points, ['Six cores: smooth on high settings']);
        assert.deepEqual(r.find(x => x.name === 'TEST RIG 2').points, []);
        assert.match(await subText(page), /2 fit you/);
    }));

    it('"See it" closes the assistant and puts that PC on the stage', () => withPage({ pcPatch: HL }, async (page) => {
        await openFinder(page);
        await page.locator('#chat-menu-sub .fr-pc', { hasText: 'TEST RIG 2' }).locator('[data-find-see]').click();
        await page.waitForFunction(() => document.querySelector('#main-card .tc-name')?.textContent === 'TEST RIG 2');
        assert.equal(await page.evaluate(() => document.getElementById('chat-widget').classList.contains('open')), false);
    }));

    it('a starter-pack PC opens in its pack', () => withPage({ pcPatch: { 1: { category: 'gaming' } } }, async (page) => {
        await openFinder(page);
        await page.locator('#chat-menu-sub .fr-pc', { hasText: 'TEST RIG 2' }).locator('[data-find-see]').click();
        await page.waitForFunction(() => document.querySelector('#main-card .tc-name')?.textContent === 'TEST RIG 2');
        assert.equal(await page.evaluate(() => document.getElementById('tab-starter').classList.contains('active-live')), true);
    }));

    it('back goes to the budgets, then home', () => withPage({}, async (page) => {
        await sixPcs(page);
        await openFinder(page);
        await page.locator('#chat-menu-sub [data-find-max="800"]').click();
        await page.locator('#chat-menu-sub [data-chat-back]').click();
        assert.equal(await page.locator('#chat-menu-sub [data-find-max]').count(), 3);
        await page.locator('#chat-menu-sub [data-chat-back]').click();
        await page.waitForFunction(() => !document.getElementById('chat-menu-sub').classList.contains('active-screen'));
    }));

    it('the words are text, never markup, and there are no errors', () => withPage({ pcPatch: { 0: { highlights: { el: ['<img src=x onerror="window.__xss=1">'], en: [] } } } }, async (page) => {
        await openFinder(page);
        assert.equal(await page.locator('#chat-menu-sub .fr-points img').count(), 0);
        assert.equal(await page.evaluate(() => window.__xss), undefined);
        assert.deepEqual(page.problems, []);
    }));

    for (const [label, size] of [['phone 390', { width: 390, height: 844, mobile: true }], ['phone 360', { width: 360, height: 780, mobile: true }]]) {
        it(`fits a phone: nothing sticks out sideways — ${label}`, () => withPage({ ...size, pcPatch: HL }, async (page) => {
            await openFinder(page);
            const m = await page.evaluate(() => { const s = document.getElementById('chat-menu-sub'); return { sideways: s.scrollWidth - s.clientWidth, right: Math.max(...[...s.querySelectorAll('.fr-pc')].map(c => c.getBoundingClientRect().right)), vw: innerWidth }; });
            assert.ok(m.sideways <= 1, `scrolls sideways by ${m.sideways}px`);
            assert.ok(m.right <= m.vw, 'inside the screen');
        }));
    }
});

// On a phone the assistant sits over the page. While it is open the page behind must not move: a finger on the
// page, or one that reaches the end of the assistant's list, used to scroll the whole site underneath.
describe('the assistant on a phone: the page behind stays still', () => {
    const drag = async (page, x, y0, y1) => {
        const cdp = await page.context().newCDPSession(page);
        const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
        await touch('touchStart', y0);
        for (let i = 1; i <= 10; i++) { await touch('touchMove', y0 + (y1 - y0) * i / 10); await page.waitForTimeout(16); }
        await touch('touchEnd', y1);
        await page.waitForTimeout(400);
    };
    const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
    const PHONE = { width: 390, height: 600, mobile: true };

    it('a finger on the page does not scroll it while the assistant is open', () => withPage(PHONE, async (page) => {
        await openFinder(page);
        const before = await scrollY(page);
        await drag(page, 30, 560, 120);                       // on the page, left of the assistant
        assert.equal(await scrollY(page), before);
    }));

    it('the assistant\'s own list still scrolls, and its end does not carry on into the page', () => withPage({ ...PHONE, pcPatch: { 0: { stock: 5 }, 2: { stock: 2 } } }, async (page) => {
        await sixPcs(page);
        await openFinder(page);
        await page.locator('#chat-menu-sub [data-find-max=""]').click();
        await page.locator('#chat-menu-sub [data-find-more]').click();
        const box = await page.locator('#chat-menu-sub').boundingBox();
        const before = await scrollY(page);
        await drag(page, box.x + box.width / 2, box.y + box.height - 20, box.y + 20);   // scroll the list down
        const list = await page.evaluate(() => document.getElementById('chat-menu-sub').scrollTop);
        assert.ok(list > 0, 'the list moved');
        await drag(page, box.x + box.width / 2, box.y + box.height - 20, box.y + 20);   // and again, past its end
        await drag(page, box.x + box.width / 2, box.y + box.height - 20, box.y + 20);
        assert.equal(await scrollY(page), before, 'the page did not');
    }));

    it('once the assistant is closed the page scrolls again', () => withPage(PHONE, async (page) => {
        await openFinder(page);
        await page.evaluate(() => window.toggleChat());
        await page.waitForTimeout(400);
        const before = await scrollY(page);
        await drag(page, 30, 560, 120);
        assert.ok(await scrollY(page) > before);
    }));
});

describe('the assistant: the budget question fits without scrolling', () => {
    for (const [label, size] of [['desktop 1440', { width: 1440, height: 900, mobile: false }], ['laptop 1280', { width: 1280, height: 720, mobile: false }], ['phone 390', { width: 390, height: 844, mobile: true }], ['phone 360', { width: 360, height: 640, mobile: true }]]) {
        it(`nothing to scroll on the budget screen — ${label}`, () => withPage(size, async (page) => {
            await sixPcs(page);
            await openFinder(page);
            const over = await page.evaluate(() => { const s = document.getElementById('chat-menu-sub'); return s.scrollHeight - s.clientHeight; });
            assert.ok(over <= 0, `the screen is ${over}px taller than its window`);
        }));
    }
});
