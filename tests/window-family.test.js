// One window language: the purple HUD shell (login, checkout, settings...) is also what Information, drop alerts, the QR window,
// the review code window and "How the vote works" wear. Same corners, same close button, same kicker colour, same
// main button, on a phone and on a desktop. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

// The shell's colours checked here are Phoenix's (the purple HUD); the default theme is now Graphite
const PHOENIX = { codex_theme_id: 'phoenix' };

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

const WINDOWS = [
    { id: 'info-modal', open: () => window.openInfo(), main: false },
    { id: 'newsletter-modal', open: () => window.openModal('newsletter-modal'), main: true },
    { id: 'review-code-modal', open: () => window.openModal('review-code-modal'), main: true },
    { id: 'vote-info-modal', open: () => window.openModal('vote-info-modal'), main: false },
    { id: 'mission-code-modal', open: () => window.openModal('mission-code-modal'), main: true },
    { id: 'qr-modal', open: () => window.openQr(), main: true }
];

async function measure(page, w) {
    await page.evaluate(w.open);
    await page.locator(`#${w.id}.active`).waitFor();
    await page.waitForTimeout(450);
    return page.evaluate((id) => {
        const q = (s) => document.querySelector(`#${id} ${s}`);
        const box = q('.info-box'), x = q('.modal-x'), k = q('.info-kicker'), b = q('.auth-form .btn-inspect') || q('.qr-actions .info-btn.primary');
        const bs = getComputedStyle(box), xr = x.getBoundingClientRect(), head = q('.info-head').getBoundingClientRect();
        const p = q('.info-body > p');
        return {
            radiusTop: bs.borderTopLeftRadius, gradientRim: bs.backgroundImage.includes('linear-gradient') && bs.borderTopColor === 'rgba(0, 0, 0, 0)',
            closeW: Math.round(xr.width), closeH: Math.round(xr.height), closeRadius: getComputedStyle(x).borderTopLeftRadius,
            kicker: getComputedStyle(k).color, chip: !!q('.set-head-ico'),
            btn: b && { family: getComputedStyle(b).fontFamily, h: Math.round(b.getBoundingClientRect().height), radius: getComputedStyle(b).borderTopLeftRadius },
            blurbBelowHeader: p ? p.getBoundingClientRect().top >= head.bottom - 1 : true,
            overflowX: document.documentElement.scrollWidth > innerWidth
        };
    }, w.id);
}

for (const [name, opts] of [['desktop', { width: 1440, height: 900, mobile: false }], ['phone', { width: 390, height: 844, mobile: true }]]) {
    describe(`window family on a ${name}`, () => {
        for (const w of WINDOWS) {
            it(`${w.id} wears the HUD shell`, async () => {
                const page = await newPage(browser, site, { locale: 'el-GR', storage: PHOENIX, ...opts });
                try {
                    const m = await measure(page, w);
                    // 24px corners on a desktop; a phone sheet rounds only the top, at 22px
                    assert.equal(m.radiusTop, name === 'phone' ? '22px' : '24px');
                    assert.ok(m.gradientRim, 'a gradient rim, like the login window');
                    assert.deepEqual([m.closeW, m.closeH, m.closeRadius], [44, 44, '12px'], 'the one close button');
                    assert.equal(m.kicker, 'rgb(176, 38, 255)', 'the kicker is the HUD purple, not lime');
                    assert.ok(m.chip, 'an icon chip in the header');
                    if (w.main) {
                        assert.match(m.btn.family, /Rajdhani/);
                        assert.deepEqual([m.btn.h >= 54, m.btn.radius], [true, '14px']);
                    }
                    assert.ok(m.blurbBelowHeader, 'the text under the title is not tucked behind the header');
                    assert.equal(m.overflowX, false);
                    assert.deepEqual(page.problems, []);
                } finally { await page.context().close(); }
            });
        }
    });
}

// The windows that keep their own inside: the same frame and close button, and their green follows the theme
describe('windows with their own inside', () => {
    async function look(page, open, ready, sel) {
        await page.evaluate(open);
        await page.locator(ready).waitFor();
        await page.waitForTimeout(450);
        return page.evaluate((s) => {
            const el = document.querySelector(s.frame), x = document.querySelector(s.close), r = x.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return { radius: cs.borderTopLeftRadius, rim: cs.backgroundImage.includes('linear-gradient'), closeW: Math.round(r.width), closeH: Math.round(r.height), closeRadius: getComputedStyle(x).borderTopLeftRadius,
                body: s.text && getComputedStyle(document.querySelector(s.text)).color, accent: getComputedStyle(document.body).getPropertyValue('--neon-green').trim() };
        }, sel);
    }
    it('wheel and the rig window: slab and square close', async () => {
        for (const [open, ready, frame] of [[() => window.openModal('wheel-modal'), '#wheel-modal.active', '#wheel-modal .modal-content'], [() => window.openModal('mission-modal'), '#mission-modal.active', '#mission-modal .modal-content']]) {
            const page = await newPage(browser, site, { locale: 'el-GR', width: 1440, height: 900, mobile: false, storage: PHOENIX });
            try {
                const m = await look(page, open, ready, { frame, close: frame + ' .close-modal' });
                assert.deepEqual([m.radius, m.rim, m.closeW, m.closeH, m.closeRadius], ['24px', true, 44, 44, '12px'], frame);
            } finally { await page.context().close(); }
        }
    });
    it('whoami and the terminal: the square close, and the text is the theme accent (not a fixed #0f0)', async () => {
        const page = await newPage(browser, site, { locale: 'el-GR', width: 1440, height: 900, mobile: false, storage: { codex_theme_id: 'nebula' } });
        try {
            const w = await look(page, () => window.openModal('whoami-modal'), '#whoami-modal.active', { frame: '#whoami-modal .modal-content', close: '#whoami-modal .close-modal', text: '#whoami-modal .whoami-body' });
            assert.deepEqual([w.closeW, w.closeH, w.closeRadius], [44, 44, '12px']);
            assert.equal(w.body, 'rgb(192, 132, 252)', "the text is the theme's accent (Nebula's), not a fixed green");
            await page.evaluate(() => window.closeModal('whoami-modal'));
            const t = await look(page, () => window.toggleCLI(), '#cli-overlay.active', { frame: '#cli-overlay', close: '#cli-overlay .cli-close' });
            assert.deepEqual([t.closeW, t.closeH, t.closeRadius], [44, 44, '12px']);
            assert.deepEqual(page.problems, []);
        } finally { await page.context().close(); }
    });
});

// The compare window and the profile are their own designs, but their close is the family's 44px rounded square
describe('compare and profile: the shared close', () => {
    const close = (page, sel) => page.evaluate((s) => { const x = document.querySelector(s), r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), getComputedStyle(x).borderTopLeftRadius, getComputedStyle(x).borderTopColor]; }, sel);
    for (const [name, opts] of [['desktop', { width: 1440, height: 900, mobile: false }], ['phone', { width: 390, height: 844, mobile: true }]]) {
        it(`compare close on a ${name}`, async () => {
            const page = await newPage(browser, site, { locale: 'el-GR', storage: PHOENIX, ...opts });
            try {
                await page.evaluate(() => import('./js/state.js').then(m => { m.state.compareList = m.state.inventory.slice(0, 2); window.openCompareModal(); }));
                await page.locator('#compare-modal.active').waitFor();
                await page.waitForTimeout(450);
                assert.deepEqual(await close(page, '#compare-modal .vs-close'), [44, 44, '12px', 'rgba(176, 38, 255, 0.45)']);
            } finally { await page.context().close(); }
        });
        it(`profile close on a ${name}`, async () => {
            const page = await newPage(browser, site, { locale: 'el-GR', member: true, storage: PHOENIX, ...opts });
            try {
                await page.evaluate(() => window.openAgentDashboard());
                await page.locator('#agent-dashboard-modal.active').waitFor();
                await page.waitForTimeout(450);
                assert.deepEqual(await close(page, '#agent-dashboard-modal .dossier-box .modal-close'), [44, 44, '12px', 'rgba(176, 38, 255, 0.45)']);
            } finally { await page.context().close(); }
        });
    }
});
