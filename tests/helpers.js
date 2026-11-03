// Shared set-up for the browser tests.
//
// Nothing here touches the site: the page is served from the repo as it is, and the backend is
// replaced from the outside — every request the page makes to the real API is answered with the
// canned data below. External hosts (fonts, icon CDN, Imgur) are cut off so a run never depends on
// the internet, and never leaves the machine.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://codex-backend-9kij.onrender.com/api';

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.gif': 'image/gif', '.ico': 'image/x-icon'
};

// --- the site, served from the repo root ---
export function serveSite() {
    const server = http.createServer((req, res) => {
        const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
        // Never serve anything outside the repo (or the tests' own folder)
        if (!file.startsWith(ROOT) || file.startsWith(path.join(ROOT, 'tests')) || file.includes('node_modules')) {
            res.writeHead(404).end();
            return;
        }
        fs.readFile(file, (err, body) => {
            if (err) { res.writeHead(404).end(); return; }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
            res.end(body);
        });
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
        resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => server.close(r)) });
    }));
}

// --- canned backend data ---
// Three PCs, enough to swipe between: plenty of stock, exactly one left, and a sold-out one.
const PHOTO = 'assets/images/icon-512.png';
const pc = (n, over = {}) => ({
    _id: `pc${n}`, name: `TEST RIG ${n}`, priceCents: 100000 + n * 10000, price: `€${1000 + n * 100}`,
    description: `Test build number ${n}.`, lore: `Lore of test rig ${n}.`, loreEl: `Ιστορία του test rig ${n}.`,
    stock: 3, status: 'available', category: 'drop', images: [PHOTO], multitasking: 0,
    specs: { cpu: 'Test CPU', gpu: 'Test GPU', ram: '32GB', ssd: '1TB', mobo: 'Test board', psu: '750W', case: 'Test case' },
    specDetails: {}, fps: [{ game: 'Test Game', score: 120 }], reviews: [], votes: 0,
    options: { storage: { enabled: true, hdd: 50, ssd: 80 }, proConfig: { enabled: false }, paint: { enabled: false, price: 40, images: [] } },
    ...over
});
export const PCS = [pc(1), pc(2, { stock: 1 }), pc(3, { stock: 0 })];

const STATUS = { maintenance: false, message: null, proConfigPrice: 30, voteInfoText: 'Vote info', voteInfoTextEl: 'Πληροφορίες ψηφοφορίας' };

async function answer(route) {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^\/api/, '');
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/status') return json(STATUS);
    if (p === '/drops') return json(PCS);
    if (p === '/vote-event') return json({});
    // Anything else (login, wishlist…) is not part of these tests: refuse loudly rather than guess
    return json({ error: `mock API has no ${route.request().method()} ${p}` }, 404);
}

// --- a ready page ---
export async function launch() {
    // Microsoft Edge, already on the machine — nothing to download
    return chromium.launch({ channel: 'msedge' });
}

export async function newPage(browser, site, { width = 390, height = 844, locale = 'en-US', storage = {}, mobile = width < 700, tourDone = true } = {}) {
    const context = await browser.newContext({
        viewport: { width, height }, locale, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile,
        // Fixed, so the mascot / tour / "night mode" never depend on the time the suite is run at
        timezoneId: 'Europe/Athens'
    });
    // Saved settings go in before any of the site's code runs. The tour is marked done: it would
    // open over the page and block every click (it has its own test).
    await context.addInitScript(({ storage, tourDone }) => {
        try {
            if (tourDone) localStorage.setItem('codex_tutorial_done', 'true');
            for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
        } catch (e) {}
    }, { storage, tourDone });
    await context.route(url => url.href.startsWith(API), answer);
    // Everything that is neither the site nor the API stays offline
    await context.route(url => !url.href.startsWith(site.url) && !url.href.startsWith(API) && /^https?:/.test(url.href), r => r.abort());

    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) problems.push(`console: ${m.text()}`); });
    page.problems = problems;
    await page.goto(site.url);
    // The splash leaves once the catalogue is drawn
    await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#main-card .tc-name');
    return page;
}

export const cardName = (page) => page.locator('#main-card .tc-name').first().innerText();
