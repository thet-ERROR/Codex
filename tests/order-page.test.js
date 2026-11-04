// The customer's order page: opened from the private link in the email, from the confirmation and from
// the profile; following the order, cancelling it, and asking for a return or reporting a problem.
// Against canned API data (helpers.js). Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

const TOKEN = 'a'.repeat(48);
const link = (number, token = TOKEN) => `?order=${number}&t=${token}`;

async function withOrderPage(opts, body) {
    const page = await newPage(browser, site, { width: 390, height: 844, ...opts });
    try { await body(page); } finally { await page.context().close(); }
}
const modal = (page) => page.locator('#order-modal.active');
const steps = (page) => page.locator('#op-body .op-step');

describe('the order page', () => {
    it('opens from the link in the email, shows the order, and takes the token out of the address bar', () => withOrderPage({ query: link('DEMO-0001') }, async (page) => {
        await modal(page).waitFor();
        assert.match(await page.locator('#op-body').innerText(), /DEMO-0001/);
        assert.equal(await page.locator('#op-body .co-demo').isVisible(), true, 'the DEMO notice is shown on a demo order');
        assert.equal(await steps(page).count(), 7);
        assert.equal(await page.locator('#op-body .op-step.now').count(), 1);
        assert.match(await page.locator('#op-body .op-step.now').innerText(), /Placed/);
        assert.match(await page.locator('#op-body').innerText(), /1.180,00/);
        const lines = await page.locator('#op-body .co-line-name').first().innerText();
        assert.match(lines, /\+ 1TB SSD/);
        assert.doesNotMatch(lines, /\+\s*\+/, 'the extra must not carry two plus signs');
        assert.equal(new URL(page.url()).search, '', 'the token must not stay in the address');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex_orders'))[0].number), 'DEMO-0001');
        assert.deepEqual(page.problems, []);
    }));

    it('a wrong token says the order was not found, instead of opening anything', () => withOrderPage({ query: link('DEMO-0001', '0'.repeat(48)) }, async (page) => {
        await page.waitForTimeout(800);
        assert.equal(await modal(page).count(), 0);
        assert.match(await page.locator('#toast-container').innerText(), /not found/i);
    }));

    it('a new order can be cancelled; it then shows as cancelled with nothing left to do', () => withOrderPage({ query: link('DEMO-0001') }, async (page) => {
        await modal(page).waitFor();
        page.once('dialog', d => d.accept());
        await page.click('[data-op="cancel"]');
        await page.locator('#op-body .op-step.cancelled').waitFor();
        assert.equal(await page.locator('[data-op="cancel"]').count(), 0);
        assert.deepEqual(page.apiLog.filter(c => c.path === '/orders/DEMO-0001/cancel').at(-1).body, { t: TOKEN });
    }));

    it('declining the confirmation cancels nothing', () => withOrderPage({ query: link('DEMO-0001') }, async (page) => {
        await modal(page).waitFor();
        page.once('dialog', d => d.dismiss());
        await page.click('[data-op="cancel"]');
        await page.waitForTimeout(300);
        assert.equal(page.apiLog.filter(c => c.path.endsWith('/cancel')).length, 0);
    }));

    it('a delivered order offers a return and a problem report, not a cancel', () => withOrderPage({ query: link('DEMO-0002') }, async (page) => {
        await modal(page).waitFor();
        assert.equal(await page.locator('[data-op="cancel"]').count(), 0);
        assert.equal(await page.locator('[data-op="open-return"]').isVisible(), true);
        assert.equal(await page.locator('[data-op="open-problem"]').isVisible(), true);
        assert.match(await page.locator('#op-body').innerText(), /ACS 123/);
    }));

    it('a problem report needs words, then is sent, shown as open, and the button is gone', () => withOrderPage({ query: link('DEMO-0002') }, async (page) => {
        await modal(page).waitFor();
        await page.click('[data-op="open-problem"]');
        await page.fill('#op-message', 'no');
        await page.click('[data-op="send"]');
        assert.equal(await page.locator('#op-error').isVisible(), true);
        assert.equal(page.apiLog.filter(c => c.path.endsWith('/request')).length, 0, 'nothing sent for a too-short message');

        await page.fill('#op-message', 'The PC will not turn on <b>at all</b>');
        await page.click('[data-op="send"]');
        await page.locator('#op-body .op-request').waitFor();
        assert.deepEqual(page.apiLog.filter(c => c.path.endsWith('/request')).at(-1).body, { t: TOKEN, type: 'problem', message: 'The PC will not turn on <b>at all</b>' });
        const request = await page.locator('#op-body .op-request').innerText();
        assert.match(request, /I have a problem/);
        assert.match(request, /<b>at all<\/b>/, 'the words show as text');
        assert.equal(await page.locator('#op-body .op-request b b').count(), 0);
        assert.equal(await page.locator('[data-op="open-problem"]').count(), 0, 'one open request of a kind at a time');
        assert.equal(await page.locator('[data-op="open-return"]').isVisible(), true);
    }));

    it('the back button closes the form without sending', () => withOrderPage({ query: link('DEMO-0002') }, async (page) => {
        await modal(page).waitFor();
        await page.click('[data-op="open-return"]');
        await page.fill('#op-message', 'half written');
        await page.click('[data-op="close-form"]');
        assert.equal(await page.locator('#op-message').count(), 0);
        assert.equal(page.apiLog.filter(c => c.path.endsWith('/request')).length, 0);
    }));

    it('fits a 360px phone without sideways scrolling', () => withOrderPage({ width: 360, height: 760, query: link('DEMO-0002') }, async (page) => {
        await modal(page).waitFor();
        const m = await page.evaluate(() => {
            const box = document.querySelector('#order-modal .info-box');
            return { right: box.getBoundingClientRect().right, inner: box.scrollWidth - box.clientWidth, vw: innerWidth };
        });
        assert.ok(m.right <= m.vw + 1 && m.inner <= 1, JSON.stringify(m));
    }));
});

describe('orders in the profile', () => {
    it('a signed-in member sees their orders and opens one without any token', () => withOrderPage({ member: true }, async (page) => {
        await page.waitForFunction(() => window.codexState.isLoggedIn && window.codexState.emailVerified);
        await page.evaluate(() => window.openAgentDashboard());
        await page.locator('.dossier-order-row').first().waitFor();
        assert.equal(await page.locator('.dossier-order-row').count(), 2);
        await page.locator('.dossier-order-row[data-order="DEMO-0001"]').click();
        await modal(page).waitFor();
        assert.match(await page.locator('#op-body').innerText(), /DEMO-0001/);
        page.once('dialog', d => d.accept());
        await page.click('[data-op="cancel"]');
        await page.locator('#op-body .op-step.cancelled').waitFor();
        // The member's session was the proof: no token was sent
        assert.equal(page.apiLog.filter(c => c.path === '/orders/DEMO-0001/cancel').at(-1).body.t, '');
    }));
});
