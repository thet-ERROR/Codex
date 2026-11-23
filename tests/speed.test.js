// What keeps the first visit fast on a phone: the modules asked for up front, the intro that does not
// wait on top of a slow load, the background video kept off the connection while the site loads, and
// card photos fetched at card size. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite, launch, newPage } from './helpers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Every module main.js reaches through static imports, main.js itself left out
function moduleGraph() {
    const seen = new Set(), out = [];
    (function walk(f) {
        if (seen.has(f)) return;
        seen.add(f);
        const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
        for (const m of src.matchAll(/^\s*import\s[^'"]*['"](\.[^'"]+)['"]/gm)) walk(path.posix.join(path.posix.dirname(f), m[1]));
        out.push(f);
    })('js/main.js');
    return out.filter(f => f !== 'js/main.js').sort();
}

describe('speed — index.html', () => {
    it('preloads exactly the modules main.js imports', () => {
        const preloaded = [...HTML.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]).sort();
        assert.deepEqual(preloaded, moduleGraph());
    });

    it('the background video neither autoplays nor loads with the page', () => {
        const tag = HTML.match(/<video class="bg-video"[^>]*>/)[0];
        assert.doesNotMatch(tag, /\sautoplay/);
        assert.match(tag, /preload="none"/);
        assert.match(tag, /poster="assets\/images\/bg\.jpg"/);
    });

    it('opens the API connection early', () => {
        assert.match(HTML, /<link rel="preconnect" href="https:\/\/codex-backend-9kij\.onrender\.com" crossorigin>/);
    });
});

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser?.close(); await site?.close(); });

async function withPage(opts, body) {
    const page = await newPage(browser, site, opts);
    try { await body(page); } finally { await page.context().close(); }
}

describe('speed — in the browser', () => {
    it('card photos from Imgur are asked for at card size, everything else is left alone', () => withPage({}, async (page) => {
        const out = await page.evaluate(async () => {
            const { photoAt } = await import('/js/utils.js');
            return [
                photoAt('https://i.imgur.com/xahPh5H.jpeg'),
                photoAt('https://i.imgur.com/nS4zEaq.png', 'l'),
                photoAt('https://i.imgur.com/xahPh5Hh.jpg'),        // already sized
                photoAt('https://i.imgur.com/a/xahPh5H'),           // an album, not a photo
                photoAt('https://example.com/xahPh5H.jpeg'),
                photoAt('assets/images/icon-512.png'),
                photoAt(undefined)
            ];
        });
        assert.deepEqual(out, [
            'https://i.imgur.com/xahPh5Hh.jpg',
            'https://i.imgur.com/nS4zEaql.jpg',
            'https://i.imgur.com/xahPh5Hh.jpg',
            'https://i.imgur.com/a/xahPh5H',
            'https://example.com/xahPh5H.jpeg',
            'assets/images/icon-512.png',
            undefined
        ]);
    }));

    it('the stage card shows the sized photo, INSPECT the original', () => withPage({
        pcPatch: { 0: { images: ['https://i.imgur.com/xahPh5H.jpeg'] } }
    }, async (page) => {
        assert.equal(await page.getAttribute('#main-card .tc-img', 'src'), 'https://i.imgur.com/xahPh5Hh.jpg');
        await page.evaluate(() => window.openGallery());
        await page.waitForTimeout(600);
        assert.equal(await page.getAttribute('#yg-main-img', 'src'), 'https://i.imgur.com/xahPh5H.jpeg');
    }));

    it('a slow load is not followed by a fixed wait: the intro hides soon after the card is drawn', () => withPage({}, async (page) => {
        // The catalogue answers 2.5 s late, as on a slow phone connection or a waking server
        await page.context().route(u => u.pathname.endsWith('/api/drops'), async r => { await new Promise(t => setTimeout(t, 2500)); await r.fallback(); });
        await page.context().addInitScript(() => {
            window.__t = {};
            new MutationObserver(() => {
                if (!window.__t.card && document.querySelector('#main-card .tc-name')) window.__t.card = performance.now();
                if (!window.__t.hide && document.getElementById('startup-overlay')?.classList.contains('hidden')) window.__t.hide = performance.now();
            }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
        });
        await page.reload();
        await page.waitForFunction(() => window.__t?.hide, null, { timeout: 15000 });
        const t = await page.evaluate(() => window.__t);
        assert.ok(t.card > 2500, `the delay applied (card at ${Math.round(t.card)} ms)`);
        assert.ok(t.hide - t.card < 700, `intro hid ${Math.round(t.hide - t.card)} ms after the card`);
    }));

    it('the background video starts once the intro has gone', () => withPage({}, async (page) => {
        await page.waitForFunction(() => !document.querySelector('.bg-video').paused, null, { timeout: 5000 });
    }));
});
