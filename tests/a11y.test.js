// Accessibility, checked with axe-core on the screens that matter: nothing critical or serious may
// come back. A rule of thumb, not a certificate: axe finds roughly a third of real problems, and it
// can't judge text over photos or gradients. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { serveSite, launch, newPage } from './helpers.js';

const AXE = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

async function withPage(opts, body) {
    const page = await newPage(browser, site, { locale: 'el-GR', ...opts });
    try { await body(page); } finally { await page.context().close(); }
}

// The windows animate in: contrast is only meaningful once they've settled
async function audit(page, scope) {
    await page.waitForTimeout(700);
    await page.evaluate(AXE);
    const found = await page.evaluate(async ({ scope, TAGS }) => {
        const r = await window.axe.run(scope ? { include: [[scope]] } : document, { runOnly: { type: 'tag', values: TAGS }, resultTypes: ['violations'] });
        return r.violations.map(v => ({ rule: v.id, impact: v.impact, where: v.nodes.map(n => n.target.join(' ')).slice(0, 5) }));
    }, { scope, TAGS });
    const bad = found.filter(v => ['critical', 'serious'].includes(v.impact));
    assert.deepEqual(bad, []);
}

const PHONE = { width: 390, height: 844 }, DESKTOP = { width: 1440, height: 900, mobile: false };

describe('accessibility: the shop', () => {
    for (const [label, size] of [['phone', PHONE], ['desktop', DESKTOP]]) {
        it(`the home page — ${label}`, () => withPage(size, p => audit(p)));
    }

    it('INSPECT', () => withPage(DESKTOP, async (p) => {
        await p.locator('.btn-card-inspect').first().click();
        await p.locator('#yg-add-cart').waitFor({ state: 'visible' });
        await audit(p, '#gallery-overlay');
    }));

    it('the customer\'s order page', () => withPage({ ...PHONE, query: `?order=DEMO-0002&t=${'a'.repeat(48)}` }, async (p) => {
        await p.locator('#order-modal.active').waitFor({ timeout: 5000 });
        await audit(p, '#order-modal');
    }));

    it('the profile', () => withPage({ ...PHONE, member: true }, async (p) => {
        await p.evaluate(() => window.openAgentDashboard());
        await p.locator('#agent-dashboard-modal.active').waitFor();
        await audit(p, '#agent-dashboard-modal');
    }));

    it('all achievements', () => withPage({ ...PHONE, member: true }, async (p) => {
        await p.evaluate(() => window.openAchievements());
        await p.locator('#achievements-modal.active').waitFor();
        await audit(p, '#achievements-modal');
    }));

    for (const id of ['review-code-modal', 'mission-code-modal', 'mission-modal', 'qr-modal', 'login-modal']) {
        it(`the window ${id}`, () => withPage(PHONE, async (p) => {
            await p.evaluate(i => window.openModal(i), id);
            await audit(p, `#${id}`);
        }));
    }

    it('every window says it is a dialog and has a name', () => withPage(DESKTOP, async (p) => {
        const unnamed = await p.evaluate(() => [...document.querySelectorAll('.modal-overlay')].filter(m => {
            const d = m.matches('[role=dialog]') ? m : m.querySelector('[role=dialog]');
            return !d || !(d.getAttribute('aria-label') || d.getAttribute('aria-labelledby'));
        }).map(m => m.id));
        assert.deepEqual(unnamed, []);
    }));

    it('the page has its landmarks, once each', () => withPage(DESKTOP, async (p) => {
        const count = await p.evaluate(() => ['main', 'header', 'nav', 'aside'].map(t => document.querySelectorAll(t).length));
        assert.deepEqual(count, [1, 1, 1, 1]);
        assert.deepEqual(p.problems, []);
    }));
});

describe('accessibility: the admin panel', () => {
    const ADMIN = { width: 1600, height: 1000, mobile: false, page: 'admin.html' };
    it('sign-in', () => withPage({ ...ADMIN, login: false }, p => audit(p)));
    it('the dashboard', () => withPage(ADMIN, p => audit(p)));
    it('an order', () => withPage(ADMIN, async (p) => {
        await p.click('.center-tab[data-tab="orders"]');
        await p.locator('.ord-row').first().waitFor();
        await p.click('.ord-row[data-number="DEMO-0003"]');
        await p.locator('#order-detail:not(.hidden) .ord-head').waitFor();
        await audit(p);
    }));
});
