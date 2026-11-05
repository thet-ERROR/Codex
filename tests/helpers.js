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

// Orders as the customer's own page gets them (the server's publicView), kept per page so a cancel or
// a request changes what the next read says
const T0 = '2026-11-04T10:00:00Z';
const publicOrder = (number, over = {}) => ({
    number, demo: true, status: 'new', history: [{ status: 'new', at: T0 }],
    customer: { firstName: 'Nikos', lastName: 'Papadopoulos' },
    delivery: { method: 'courier', city: 'Thessaloniki', trackingNumber: null },
    items: [{ name: 'TEST RIG 1', basePriceCents: 110000, extras: [{ key: 'storage', choice: 'ssd', priceCents: 8000 }], totalCents: 118000, paint: false }],
    subtotalCents: 118000, discountCents: 0, coupon: null, totalCents: 118000,
    createdAt: T0, deliveredAt: null, returnDeadline: null, warrantyUntil: null,
    canCancel: true, canReturn: false, canReportProblem: false, requests: [],
    ...over
});
const STORE_TOKEN = 'a'.repeat(48);
const storeOrders = () => ({
    'DEMO-0001': publicOrder('DEMO-0001'),
    'DEMO-0002': publicOrder('DEMO-0002', {
        status: 'delivered', canCancel: false, canReturn: true, canReportProblem: true,
        history: [{ status: 'new', at: T0 }, { status: 'paid', at: T0 }, { status: 'shipped', at: T0 }, { status: 'delivered', at: '2026-11-08T10:00:00Z' }],
        delivery: { method: 'hand', area: 'Καλαμαριά', trackingNumber: 'ACS 123' },
        deliveredAt: '2026-11-08T10:00:00Z', returnDeadline: '2026-11-22T10:00:00Z', warrantyUntil: '2028-11-08T10:00:00Z'
    })
});

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
    adminOrder(2, { customer: { firstName: '<img src=x onerror="window.__xss=1">', lastName: 'X', phone: '6900000000', email: 'x@gmail.com' }, priorNoShows: 1 }),
    adminOrder(3, {
        status: 'delivered', payment: { method: 'agreed', paidAt: '2026-11-05T10:00:00Z' }, deliveredAt: '2026-11-08T10:00:00Z', returnDeadline: '2026-11-22T10:00:00Z',
        requests: [{ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', type: 'problem', message: 'The fan <b>rattles</b>', createdAt: '2026-11-09T10:00:00Z' }], openRequests: 1,
        history: [{ status: 'new', at: '2026-11-04T10:00:00Z', by: 'customer' }, { status: 'delivered', at: '2026-11-08T10:00:00Z', by: 'customer', note: 'box code entered' }],
        reviewCodes: [{ code: 'CDX-0123456789', pcName: 'TEST RIG 1', status: 'active', itemIndex: 0 }]
    })
];
const SITE_CONFIG = {
    maintenanceMode: false, maintenanceMessage: '', proConfigPrice: 30, voteInfoText: '', voteInfoTextEl: '',
    returnDays: 14, handDeliveryAreas: ['Θεσσαλονίκη', 'Καλαμαριά'], handDeliveryRadiusKm: 10, handDeliveryCenter: { lat: 40.64, lng: 22.94 },
    deliveriesBadgeOn: true, deliveriesBadgeMin: 10
};

// log: every request that changes something ({ method, path, body, auth }), for the tests to read.
// sec: the admin's two-factor state for this page (on/off), changed by the setup calls.
async function answer(route, log, adminOrders, sec, store, opts) {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    const body = method === 'GET' ? null : (req.postDataJSON() ?? null);
    if (method !== 'GET') log.push({ method, path: p, body, auth: req.headers()['authorization'] || null });
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

    // --- the storefront ---
    if (p === '/status') return json({ ...STATUS, ...opts.status });
    if (p === '/drops') return json(opts.reviews ? PCS.map((pc, i) => (i === 0 ? { ...pc, reviews: opts.reviews } : pc)) : PCS);
    if (p === '/vote-event') return json({});
    if (p === '/orders' && method === 'POST') {
        // Priced the way the real server does it: from its own data, base prices only here
        const totalCents = body.items.reduce((sum, i) => sum + (PCS.find(pc => pc._id === i.pcId)?.priceCents || 0), 0);
        const number = `DEMO-${String(log.filter(l => l.path === '/orders').length).padStart(4, '0')}`;
        return json({ success: true, number, demo: true, accessToken: 'a'.repeat(48), order: { number, totalCents, subtotalCents: totalCents, discountCents: 0, items: [] } });
    }

    // --- the customer's order page ---
    const om = p.match(/^\/orders\/([A-Z0-9-]+)(\/cancel|\/request)?$/);
    if (om && om[1] !== '' && p !== '/orders') {
        const o = store[om[1]];
        const token = method === 'GET' ? url.searchParams.get('t') : body?.t;
        const member = req.headers()['authorization'] === 'Bearer member-token';
        if (!o || (token !== STORE_TOKEN && !member)) return json({ error: 'Order not found' }, 404);
        if (!om[2]) return json(o);
        if (om[2] === '/cancel') {
            if (!o.canCancel) return json({ error: 'too late', code: 'NOT_CANCELLABLE' }, 409);
            o.status = 'cancelled'; o.canCancel = false; o.history.push({ status: 'cancelled', at: T0 });
            return json({ success: true, order: o });
        }
        if (body.message.trim().length < 5) return json({ error: 'short', field: 'message' }, 400);
        if (!(body.type === 'return' ? o.canReturn : o.canReportProblem)) return json({ error: 'no', code: 'NOT_ALLOWED' }, 409);
        o.requests.push({ type: body.type, message: body.message, createdAt: T0, handled: false });
        if (body.type === 'return') o.canReturn = false; else o.canReportProblem = false;
        return json({ success: true, order: o });
    }
    if (p === '/my-orders') return json(Object.values(store));
    if (p === '/me') {
        return json({ username: 'Tester', wishlist: [], achievements: ['recruited'], xp: 25, rank: 'recruit', rankMinXp: 0, nextRank: 'operative', nextRankXp: 100, progress: 25, ranks: [], bonusSpins: 0, rankRewards: [], coupons: [], unlockedColors: [] });
    }

    // --- the admin panel ---
    if (p === '/login' && method === 'POST') {
        return json(sec.enabled ? { success: true, twoFactorRequired: true, challenge: 'test-challenge' } : { success: true, token: 'admin-test-token' });
    }
    if (p === '/login/2fa' && method === 'POST') {
        const ok = body.challenge === 'test-challenge' && (body.code === '123456' || body.recoveryCode === 'ABCD-EFGH');
        return ok ? json({ success: true, token: 'admin-test-token', usedRecovery: !!body.recoveryCode, recoveryCodesLeft: 9 })
            : json({ success: false, error: 'Wrong code' }, 401);
    }
    if (p === '/admin/2fa') return json({ enabled: sec.enabled, keyConfigured: true, recoveryCodesLeft: sec.enabled ? 10 : 0, enabledAt: sec.enabled ? '2026-11-04T12:00:00Z' : null });
    if (p === '/admin/2fa/setup') return json({ otpauthUrl: 'otpauth://totp/PHOENIX%20CODEX%3Aadmin?secret=MZXW6YTBOI&issuer=PHOENIX%20CODEX', secret: 'MZXW6YTBOI' });
    if (p === '/admin/2fa/enable') {
        if (body.code !== '123456') return json({ error: 'Wrong code' }, 400);
        sec.enabled = true;
        return json({ success: true, token: 'admin-token-after-2fa', recoveryCodes: Array.from({ length: 10 }, (_, i) => `AAA${i}-BBB${i}`) });
    }
    if (p === '/users/count') return json({ count: 2 });
    if (p === '/admin/order-stats') {
        const s = (n) => ({ delivered: n, delivered30: n, completed: n, inReturnWindow: 0, returns: 0, returns30: 0, problems: 2, problems30: 1, openRequests: 1 });
        return json({ live: { ...s(12), publicCount: 12 }, demo: s(3) });
    }
    if (p === '/users' || p === '/tickets' || p === '/newsletter') return json([]);
    if (p === '/site-config') return json(method === 'GET' ? SITE_CONFIG : { success: true, config: { ...SITE_CONFIG, ...body } });
    if (p === '/admin/orders') {
        const status = url.searchParams.get('status');
        return json(adminOrders.filter(o => !status || o.status === status));
    }
    const hm = p.match(/^\/admin\/orders\/([A-Z0-9-]+)\/requests\/([a-f0-9]+)\/handle$/);
    if (hm) {
        const o = adminOrders.find(x => x.number === hm[1]);
        const r = o?.requests?.find(x => x._id === hm[2] && !x.handledAt);
        if (!r) return json({ error: 'Request not found or already handled' }, 404);
        r.handledAt = '2026-11-10T09:00:00Z'; r.handledNote = body.note || '';
        o.openRequests = o.requests.filter(x => !x.handledAt).length;
        return json(o);
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

// page: '' for the storefront, 'admin.html' for the panel (logged in, dashboard showing; with
// twoFactor the sign-in takes the code step too, unless login: false leaves it at the login screen)
export async function newPage(browser, site, { width = 390, height = 844, locale = 'en-US', storage = {}, mobile = width < 700, tourDone = true, page: which = '', twoFactor = false, login = true, member = false, query = '', status = {}, reviews = null } = {}) {
    const context = await browser.newContext({
        viewport: { width, height }, locale, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile,
        // Fixed, so the mascot / tour / "night mode" never depend on the time the suite is run at
        timezoneId: 'Europe/Athens'
    });
    // Saved settings go in before any of the site's code runs. The tour is marked done: it would
    // open over the page and block every click (it has its own test).
    await context.addInitScript(({ storage, tourDone, member }) => {
        try {
            if (tourDone) localStorage.setItem('codex_tutorial_done', 'true');
            if (member) { localStorage.setItem('codex_token', 'member-token'); localStorage.setItem('codex_username', 'Tester'); }
            for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
        } catch (e) {}
    }, { storage, tourDone, member });
    const log = [];
    const adminOrders = ADMIN_ORDERS();
    const sec = { enabled: twoFactor };
    const store = storeOrders();
    await context.route(url => url.href.startsWith(API), route => answer(route, log, adminOrders, sec, store, { status, reviews }));
    // Everything that is neither the site nor the API stays offline
    await context.route(url => !url.href.startsWith(site.url) && !url.href.startsWith(API) && /^https?:/.test(url.href), r => r.abort());

    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) problems.push(`console: ${m.text()}`); });
    page.problems = problems;
    page.apiLog = log;
    Object.defineProperty(page, 'orders', { get: () => log.filter(l => l.path === '/orders').map(l => l.body) });
    await page.goto(site.url + which + query);
    if (which === 'admin.html') {
        if (!login) return page;
        await page.fill('#admin-pass', 'test');
        await page.click('#login-btn');
        if (twoFactor) {
            await page.waitForSelector('#login-step-2fa', { state: 'visible' });
            await page.fill('#admin-code', '123456');
            await page.click('#login-2fa-btn');
        }
        await page.waitForSelector('#dashboard-ui', { state: 'visible' });
        return page;
    }
    // The splash leaves once the catalogue is drawn
    await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#main-card .tc-name');
    return page;
}

export const cardName = (page) => page.locator('#main-card .tc-name').first().innerText();
