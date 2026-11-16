// The little robot sitting on the VOTE tab (assets/images/vote-bot.webp). Run from this folder: npm test
//
// It is a decorative animated picture over the header. These tests keep it where it should be (sitting on the
// tab, whole, not cut off by the bar that scrolls sideways on a phone), cheap (a size budget, loaded without
// holding the page up), still when the visitor asked for less motion, and out of the way of a window.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite, launch, newPage } from './helpers.js';

const IMAGES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });
async function withPage(opts, body) {
    const page = await newPage(browser, site, { locale: 'el-GR', ...opts });
    try { await body(page); } finally { await page.context().close(); }
}

// Where the robot, the tab and the bar that holds it are, once the picture has loaded
const place = (page) => page.evaluate(async () => {
    const img = document.querySelector('#tab-vote .vote-bot img');
    if (!img) return null;
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 3000); });
    const r = img.getBoundingClientRect(), t = document.getElementById('tab-vote').getBoundingClientRect(), bar = document.getElementById('tab-vote').parentElement.getBoundingClientRect();
    return { robot: { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }, tab: { l: t.left, t: t.top, r: t.right, b: t.bottom, w: t.width }, bar: { t: bar.top }, loaded: img.naturalWidth > 0, vw: innerWidth };
});

describe('the robot on the VOTE tab: the file', () => {
    const file = fs.readFileSync(path.join(IMAGES, 'vote-bot.webp'));
    // RIFF/WebP chunks: VP8X (flags: animation 0x02, alpha 0x10), ANIM, then one ANMF per frame
    const chunks = (() => { const out = []; let p = 12; while (p < file.length - 8) { const id = file.toString('latin1', p, p + 4), sz = file.readUInt32LE(p + 4); out.push({ id, flags: file[p + 8] }); p += 8 + sz + (sz & 1); } return out; })();

    it('is an animated WebP with a transparent background', () => {
        assert.equal(file.toString('latin1', 0, 4), 'RIFF');
        const flags = chunks.find(c => c.id === 'VP8X').flags;
        assert.ok(flags & 0x02, 'animated');
        assert.ok(flags & 0x10, 'with an alpha channel, so it can sit on the tab');
        assert.ok(chunks.filter(c => c.id === 'ANMF').length >= 16, 'enough frames to move smoothly');
    });

    it('stays small: the page is on a phone connection', () => {
        assert.ok(file.length <= 50 * 1024, `the animation is ${(file.length / 1024).toFixed(1)} KB, the budget is 50 KB`);
        assert.ok(fs.statSync(path.join(IMAGES, 'vote-bot-still.webp')).size <= 8 * 1024, 'the still picture for reduced motion is small too');
    });
});

describe('the robot on the VOTE tab: on the page', () => {
    for (const [label, size] of [['phone 390x844', { width: 390, height: 844 }], ['small phone 360x780', { width: 360, height: 780 }], ['tablet 820x1180', { width: 820, height: 1180 }], ['desktop 1440x900', { width: 1440, height: 900, mobile: false }]]) {
        it(`sits on the tab, whole and in view — ${label}`, () => withPage(size, async (page) => {
            const m = await place(page);
            assert.ok(m, 'the robot is inside the VOTE button');
            assert.equal(m.loaded, true, 'the picture loads');
            assert.ok(m.robot.h >= 30 && m.robot.h <= 46, `a small robot, not a banner (${Math.round(m.robot.h)}px tall)`);
            // sitting on it: its feet a little inside the tab's top edge (on a desktop the bar's rim, a few px higher), the head above
            assert.ok(m.robot.b > m.tab.t - 12 && m.robot.b <= m.tab.t + 14, `the feet are on the tab (robot bottom ${Math.round(m.robot.b)}, tab top ${Math.round(m.tab.t)})`);
            assert.ok(m.robot.t < m.tab.t - 18, 'and the rest of it is above the tab');
            assert.ok(Math.abs((m.robot.l + m.robot.r) / 2 - (m.tab.l + m.tab.r) / 2) <= 3, 'in the middle of the tab');
            assert.ok(m.robot.t >= 0, 'not cut off by the top of the screen');
            assert.ok(m.robot.t >= m.bar.t - 0.5 || size.mobile === false, 'nor by the bar that scrolls sideways (it has overflow)');
            assert.deepEqual(page.problems, []);
        }));
    }

    it('is decoration: no name of its own, the tab still says VOTE, and it cannot be tapped', () => withPage({ width: 390, height: 844 }, async (page) => {
        const r = await page.evaluate(() => { const tab = document.getElementById('tab-vote'), pic = tab.querySelector('.vote-bot'); return { text: tab.textContent.trim(), hidden: pic.getAttribute('aria-hidden'), alt: pic.querySelector('img').getAttribute('alt'), events: getComputedStyle(pic).pointerEvents }; });
        assert.deepEqual(r, { text: 'VOTE', hidden: 'true', alt: '', events: 'none' });
    }));

    it('is a still picture when the visitor asked for less motion', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'el-GR' });
        const p2 = await ctx.newPage();
        try {
            await p2.route(u => !u.href.startsWith(site.url) && /^https?:/.test(u.href), r => r.abort());
            await p2.goto(site.url);
            await p2.waitForSelector('#tab-vote .vote-bot img');
            const src = await p2.evaluate(() => document.querySelector('#tab-vote .vote-bot img').currentSrc);
            assert.match(src, /vote-bot-still\.webp$/);
        } finally { await ctx.close(); }
    });

    it('does not hold up the page: low priority, and the card does not move when it arrives', () => withPage({ width: 390, height: 844 }, async (page) => {
        const r = await page.evaluate(() => { const i = document.querySelector('#tab-vote .vote-bot img'); return { priority: i.getAttribute('fetchpriority'), w: i.getAttribute('width'), h: i.getAttribute('height'), pos: getComputedStyle(i.parentElement).position }; });
        assert.deepEqual(r, { priority: 'low', w: '75', h: '100', pos: 'absolute' });
    }));

    it('is hidden while a window is open, so it is not animating under it', () => withPage({ width: 1440, height: 900, mobile: false }, async (page) => {
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#tab-vote .vote-bot')).visibility), 'visible');
        await page.evaluate(() => window.openModal('info-modal'));
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#tab-vote .vote-bot')).visibility), 'hidden');
    }));

    it('a short phone gets no robot (the room above the tab costs the card its size)', () => withPage({ width: 360, height: 600 }, async (page) => {
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#tab-vote .vote-bot')).display), 'none');
    }));
});
