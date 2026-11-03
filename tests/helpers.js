// Shared set-up for the browser tests.
//
// Nothing here touches the site: the page is served from the repo as it is, and the backend is
// replaced from the outside — every request the page makes to the real API is answered with the
// canned data below. External hosts (fonts, icon CDN, Imgur) are cut off so a run never depends on
// the internet, and never leaves the machine.
//
// The pages are served with the same security headers Vercel sends (read from vercel.json), so a
// script or style the Content-Security-Policy would block in production is blocked here too, and
// shows up as a test failure instead of a broken page after the deploy.

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

// vercel.json's header rules: "/(.*)" and literal paths are all it uses. For the same header, a later
// matching rule replaces an earlier one (the admin page's stricter CSP over the site-wide one).
const HEADER_RULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers.map(rule => ({
    re: new RegExp(`^${rule.source.replace(/[.+?^${}|[\]\\]/g, '\\$&').replace(/\\?\(\.\*\)/g, '(.*)')}$`),
    headers: rule.headers
}));
function securityHeaders(urlPath) {
    const out = {};
    for (const rule of HEADER_RULES) if (rule.re.test(urlPath)) for (const h of rule.headers) out[h.key] = h.value;
    // HSTS on a plain-http localhost would only be ignored; leave it out
    delete out['Strict-Transport-Security'];
    return out;
}

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
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', ...securityHeaders(rel) });
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

const STATUS = {
    maintenance: false, message: null, proConfigPrice: 30, voteInfoText: 'Vote info', voteInfoTextEl: 'Πληροφορίες ψηφοφορίας',
    orders: { live: false, returnDays: 14, handDeliveryAreas: ['Θεσσαλονίκη', 'Καλαμαριά'], handDeliveryCenter: { lat: 40.64, lng: 22.94 }, handDeliveryRadiusKm: 10 }
};

// Orders as the admin API returns them. One has a customer name that is an HTML injection attempt:
// the panel must show it as text.
const adminOrder = (n, over = {}) => ({
    number: `DEMO-000${n}`, demo: true, status: 'new', createdAt: '2026-11-04T10:00:00Z',
    history: [{ status: 'new', at: '2026-11-04T10:00:00Z', by: 'customer' }],
    customer: { firstName: 'Nikos', lastName: 'Papadopoulos', phone: '6912345678', email: 'nikos@gmail.com' },
    delivery: { method: 'courier', address: 'Egnatias 1', postcode: '54630', city: 'Thessaloniki' },
    invoice: { type: 'receipt' },
    items: [{ pcId: 'pc1', name: 'TEST RIG 1', basePriceCents: 110000, extras: [{ key: 'storage', choice: 'ssd', priceCents: 8000 }], totalCents: 118000, paint: false }],
    subtotalCents: 118000, discountCents: 0, totalCents: 118000, notes: '',
    consent: { termsVersion: '2026-11', acceptedAt: '2026-11-04T10:00:00Z', adultOrGuardian: true },
    payment: { method: 'agreed' }, refundDue: false, noShow: false, priorNoShows: 0,
    ...over
});
const ADMIN_ORDERS = () => [
    adminOrder(1),
    adminOrder(2, { customer: { firstName: '<img src=x onerror="window.__xss=1">', lastName: 'X', phone: '6900000000', email: 'x@gmail.com' }, priorNoShows: 1 })
];
const SITE_CONFIG = {
    maintenanceMode: false, maintenanceMessage: '', proConfigPrice: 30, voteInfoText: '', voteInfoTextEl: '',
    returnDays: 14, handDeliveryAreas: ['Θεσσαλονίκη', 'Καλαμαριά'], handDeliveryRadiusKm: 10, handDeliveryCenter: { lat: 40.64, lng: 22.94 }
};

// log: every request that changes something ({ method, path, body }), for the tests to read
async function answer(route, log, adminOrders) {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    const body = method === 'GET' ? null : (req.postDataJSON() ?? null);
    if (method !== 'GET') log.push({ method, path: p, body });
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

    // --- the storefront ---
    if (p === '/status') return json(STATUS);
    if (p === '/drops') return json(PCS);
    if (p === '/vote-event') return json({});
    if (p === '/orders' && method === 'POST') {
        // Priced the way the real server does it: from its own data, base prices only here
        const totalCents = body.items.reduce((sum, i) => sum + (PCS.find(pc => pc._id === i.pcId)?.priceCents || 0), 0);
        const number = `DEMO-${String(log.filter(l => l.path === '/orders').length).padStart(4, '0')}`;
        return json({ success: true, number, demo: true, accessToken: 'a'.repeat(48), order: { number, totalCents, subtotalCents: totalCents, discountCents: 0, items: [] } });
    }

    // --- the admin panel ---
    if (p === '/login' && method === 'POST') return json({ success: true, token: 'admin-test-token' });
    if (p === '/users/count') return json({ count: 2 });
    if (p === '/users' || p === '/tickets' || p === '/newsletter') return json([]);
    if (p === '/site-config') return json(method === 'GET' ? SITE_CONFIG : { success: true, config: { ...SITE_CONFIG, ...body } });
    if (p === '/admin/orders') {
        const status = url.searchParams.get('status');
        return json(adminOrders.filter(o => !status || o.status === status));
    }
    const m = p.match(/^\/admin\/orders\/([A-Z0-9-]+)(\/status|\/cancel)?$/);
    if (m) {
        const o = adminOrders.find(x => x.number === m[1]);
        if (!o) return json({ error: 'Order not found' }, 404);
        if (!m[2]) return json(o);
        if (m[2] === '/status') {
            if (['shipped', 'delivered'].includes(body.status) && !o.payment.paidAt && !body.force) {
                return json({ error: 'This order is not marked paid.', code: 'NOT_PAID' }, 409);
            }
            o.status = body.status;
            if (body.status === 'paid') o.payment.paidAt = '2026-11-04T11:00:00Z';
            if (body.trackingNumber) o.delivery.trackingNumber = body.trackingNumber;
            o.history.push({ status: body.status, at: '2026-11-04T11:00:00Z', by: 'admin', note: body.note || undefined });
            return json(o);
        }
        o.status = 'cancelled';
        o.noShow = body.reason === 'no_show';
        o.history.push({ status: 'cancelled', at: '2026-11-04T11:00:00Z', by: 'admin' });
        return json(o);
    }
    // Anything else (wishlist…) is not part of these tests: refuse loudly rather than guess
    return json({ error: `mock API has no ${method} ${p}` }, 404);
}

// --- a ready page ---
export async function launch() {
    // Microsoft Edge, already on the machine — nothing to download
    return chromium.launch({ channel: 'msedge' });
}

// page: '' for the storefront, 'admin.html' for the panel (logged in, dashboard showing)
export async function newPage(browser, site, { width = 390, height = 844, locale = 'en-US', storage = {}, mobile = width < 700, tourDone = true, page: which = '' } = {}) {
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
    const log = [];
    const adminOrders = ADMIN_ORDERS();
    await context.route(url => url.href.startsWith(API), route => answer(route, log, adminOrders));
    // Everything that is neither the site nor the API stays offline
    await context.route(url => !url.href.startsWith(site.url) && !url.href.startsWith(API) && /^https?:/.test(url.href), r => r.abort());

    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) problems.push(`console: ${m.text()}`); });
    page.problems = problems;
    page.apiLog = log;
    Object.defineProperty(page, 'orders', { get: () => log.filter(l => l.path === '/orders').map(l => l.body) });
    await page.goto(site.url + which);
    if (which === 'admin.html') {
        await page.fill('#admin-pass', 'test');
        await page.click('#login-btn');
        await page.waitForSelector('#dashboard-ui', { state: 'visible' });
        return page;
    }
    // The splash leaves once the catalogue is drawn
    await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#main-card .tc-name');
    return page;
}

export const cardName = (page) => page.locator('#main-card .tc-name').first().innerText();
