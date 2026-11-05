// The admin panel's ORDERS tab and order settings, against canned API data (helpers.js), served with
// the panel's strict production CSP. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

async function withAdmin(body) {
    const page = await newPage(browser, site, { width: 1600, height: 1000, mobile: false, page: 'admin.html' });
    try { await body(page); } finally { await page.context().close(); }
}
const openOrdersTab = async (page) => {
    await page.click('.center-tab[data-tab="orders"]');
    await page.locator('.ord-row').first().waitFor();
};
const openOrder = async (page, number) => {
    await page.click(`.ord-row[data-number="${number}"]`);
    await page.locator('#order-detail:not(.hidden) .ord-head').waitFor();
};
const lastCall = (page, pathPart) => page.apiLog.filter(c => c.path.includes(pathPart)).at(-1);

describe('admin: orders', () => {
    it('logs in under the strict CSP with no errors, and shows the new-orders badge', () => withAdmin(async (page) => {
        await page.waitForFunction(() => document.getElementById('orders-new-badge').textContent === '3');
        assert.equal(await page.locator('#orders-new-badge').isVisible(), true);
        assert.deepEqual(page.problems, []);
    }));

    it('lists the orders; a customer name carrying HTML is shown as text, never run', () => withAdmin(async (page) => {
        await openOrdersTab(page);
        assert.equal(await page.locator('.ord-row').count(), 3);
        const rows = await page.locator('#orders-list').innerText();
        assert.match(rows, /DEMO-0001/);
        assert.match(rows, /<img src=x onerror/);
        assert.equal(await page.locator('#orders-list img').count(), 0);
        assert.equal(await page.evaluate(() => window.__xss), undefined);
        assert.equal(await page.locator('.ord-row[data-number="DEMO-0002"] .ord-flag.warn').isVisible(), true, 'the no-show warning shows in the list');
        assert.deepEqual(page.problems, []);
    }));

    it('an order\'s detail has the customer, delivery, extras and totals', () => withAdmin(async (page) => {
        await openOrdersTab(page);
        await openOrder(page, 'DEMO-0001');
        const text = await page.locator('#order-detail').innerText();
        for (const piece of ['Nikos Papadopoulos', '6912345678', 'Egnatias 1, 54630 Thessaloniki', '+1TB SSD', 'Απόδειξη', 'Δεν έχει πληρωθεί', 'Όροι 2026-11']) {
            assert.ok(text.includes(piece), `missing: ${piece}`);
        }
        await page.click('[data-action="back"]');
        await page.locator('#orders-list-view:not(.hidden)').waitFor();
    }));

    it('moving it on sends the step and the note; sending it unpaid asks first, then forces', () => withAdmin(async (page) => {
        await openOrdersTab(page);
        await openOrder(page, 'DEMO-0001');
        await page.fill('#ord-note', 'called the customer');
        await page.click('[data-action="status"][data-status="building"]');
        await page.waitForFunction(() => document.querySelector('#order-detail .ord-status')?.textContent === 'ΣΕ ΚΑΤΑΣΚΕΥΗ');
        assert.deepEqual(lastCall(page, '/status').body, { status: 'building', note: 'called the customer', trackingNumber: '' });

        // Not paid: the panel asks; declining sends nothing more
        page.once('dialog', d => d.dismiss());
        await page.fill('#ord-tracking', 'ACS 123');
        await page.click('[data-action="status"][data-status="shipped"]');
        await page.waitForTimeout(300);
        assert.equal(page.apiLog.filter(c => c.path.endsWith('/status')).length, 2, 'one try, refused, and nothing forced');

        page.once('dialog', d => d.accept());
        await page.click('[data-action="status"][data-status="shipped"]');
        await page.waitForFunction(() => document.querySelector('#order-detail .ord-status')?.textContent === 'ΑΠΕΣΤΑΛΗ');
        assert.equal(lastCall(page, '/status').body.force, true);
        assert.equal(lastCall(page, '/status').body.trackingNumber, 'ACS 123');
        assert.match(await page.locator('#order-detail').innerText(), /ACS 123/);
    }));

    it('a no-show asks first and cancels with that reason', () => withAdmin(async (page) => {
        await openOrdersTab(page);
        await openOrder(page, 'DEMO-0002');
        assert.match(await page.locator('#order-detail .ord-alert').first().innerText(), /Ζήτα προκαταβολή/);
        page.once('dialog', d => d.accept());
        await page.click('[data-action="no-show"]');
        await page.waitForFunction(() => document.querySelector('#order-detail .ord-status')?.textContent === 'ΑΚΥΡΩΘΗΚΕ');
        assert.equal(lastCall(page, '/cancel').body.reason, 'no_show');
        assert.equal(await page.locator('[data-action="no-show"]').count(), 0, 'a cancelled order offers no more actions');
    }));
});

describe('admin: order settings', () => {
    it('loads the settings and saves them as the API expects', () => withAdmin(async (page) => {
        await page.waitForFunction(() => document.getElementById('os-areas').value.includes('Καλαμαριά'));
        await page.fill('#os-return-days', '30');
        await page.fill('#os-areas', 'Καλαμαριά\n  Θέρμη  \n\nΠυλαία');
        await page.click('#save-order-settings-btn');
        await page.waitForFunction(() => document.getElementById('os-result').textContent === 'Αποθηκεύτηκε.');
        const saved = page.apiLog.filter(c => c.method === 'POST' && c.path === '/site-config').at(-1).body;
        assert.deepEqual(saved, { returnDays: 30, handDeliveryAreas: ['Καλαμαριά', 'Θέρμη', 'Πυλαία'] });
    }));
});

describe('admin: two-factor sign-in', () => {
    const adminPage = (opts) => newPage(browser, site, { width: 1600, height: 1000, mobile: false, page: 'admin.html', ...opts });

    it('with 2FA on, the password leads to the code step; a wrong code stays there, the right one signs in', async () => {
        const page = await adminPage({ twoFactor: true, login: false });
        try {
            await page.fill('#admin-pass', 'test');
            await page.click('#login-btn');
            await page.locator('#login-step-2fa').waitFor({ state: 'visible' });
            assert.equal(await page.locator('#login-step-pass').isVisible(), false);
            page.once('dialog', d => d.dismiss());
            await page.fill('#admin-code', '000000');
            await page.click('#login-2fa-btn');
            await page.waitForTimeout(300);
            assert.equal(await page.locator('#dashboard-ui').isVisible(), false);
            await page.fill('#admin-code', '123456');
            await page.press('#admin-code', 'Enter');
            await page.locator('#dashboard-ui').waitFor({ state: 'visible' });
            assert.deepEqual(page.apiLog.filter(c => c.path === '/login/2fa').at(-1).body, { challenge: 'test-challenge', code: '123456' });
            assert.deepEqual(page.problems, []);
        } finally { await page.context().close(); }
    });

    it('without the phone, a recovery code signs in and the panel says how many are left', async () => {
        const page = await adminPage({ twoFactor: true, login: false });
        try {
            await page.fill('#admin-pass', 'test');
            await page.click('#login-btn');
            await page.click('#login-recovery-toggle');
            assert.equal(await page.locator('#admin-recovery').isVisible(), true);
            let said = '';
            page.once('dialog', d => { said = d.message(); d.accept(); });
            await page.fill('#admin-recovery', 'ABCD-EFGH');
            await page.click('#login-2fa-btn');
            await page.locator('#dashboard-ui').waitFor({ state: 'visible' });
            assert.match(said, /Σου μένουν 9/);
            assert.equal(page.apiLog.filter(c => c.path === '/login/2fa').at(-1).body.recoveryCode, 'ABCD-EFGH');
        } finally { await page.context().close(); }
    });

    it('turning it on: QR drawn under the strict CSP, code confirmed, recovery codes shown once, then the new token is used', () => withAdmin(async (page) => {
        await page.locator('#security-box [data-sec="setup"]').waitFor();
        await page.click('#security-box [data-sec="setup"]');
        await page.locator('#sec-qr svg').waitFor({ timeout: 5000 });
        assert.match(await page.locator('.sec-key').innerText(), /MZXW 6YTB OI/);
        await page.fill('#sec-code', '123456');
        await page.click('#security-box [data-sec="enable"]');
        await page.locator('.sec-codes code').first().waitFor();
        assert.equal(await page.locator('.sec-codes code').count(), 10);
        await page.click('#security-box [data-sec="done"]');
        await page.locator('.sec-state.on').waitFor();
        // A later change goes out with the token the server handed back
        await page.click('#save-order-settings-btn');
        await page.waitForFunction(() => document.getElementById('os-result').textContent !== '');
        assert.equal(page.apiLog.filter(c => c.path === '/site-config').at(-1).auth, 'Bearer admin-token-after-2fa');
        assert.deepEqual(page.problems, []);
    }));
});

describe('admin: customer requests on an order', () => {
    it('the list flags an order with an open request, and the detail shows the words as text', () => withAdmin(async (page) => {
        await openOrdersTab(page);
        assert.equal(await page.locator('.ord-row[data-number="DEMO-0003"] .ord-flag.req').isVisible(), true);
        assert.equal(await page.locator('.ord-row[data-number="DEMO-0001"] .ord-flag.req').count(), 0);
        await openOrder(page, 'DEMO-0003');
        const text = await page.locator('#order-detail').innerText();
        assert.match(text, /Πρόβλημα \(εγγύηση\)/);
        assert.match(text, /<b>rattles<\/b>/);
        assert.equal(await page.locator('#order-detail .ord-notes b').count(), 0, 'no markup from the customer is run');
    }));

    it('"Το χειρίστηκα" closes it with the note', () => withAdmin(async (page) => {
        await openOrdersTab(page);
        await openOrder(page, 'DEMO-0003');
        await page.fill('[data-request-note]', 'sent a new fan');
        await page.click('[data-action="handle-request"]');
        await page.locator('#order-detail .ord-request.handled').waitFor();
        assert.deepEqual(page.apiLog.filter(c => c.path.endsWith('/handle')).at(-1).body, { note: 'sent a new fan' });
        assert.match(await page.locator('#order-detail .ord-request').innerText(), /sent a new fan/);
        assert.equal(await page.locator('[data-action="handle-request"]').count(), 0);
        await page.click('[data-action="back"]');
        await page.locator('.ord-row').first().waitFor();
        assert.equal(await page.locator('.ord-row[data-number="DEMO-0003"] .ord-flag.req').count(), 0, 'the flag is gone from the list');
    }));
});
