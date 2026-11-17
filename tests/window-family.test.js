// One window language: the purple HUD shell (login, checkout, settings...) is also what Information, drop alerts,
// the review code window and "How the vote works" wear. Same corners, same close button, same kicker colour, same
// main button, on a phone and on a desktop. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, newPage } from './helpers.js';

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });

const WINDOWS = [
    { id: 'info-modal', open: () => window.openInfo(), main: false },
    { id: 'newsletter-modal', open: () => window.openModal('newsletter-modal'), main: true },
    { id: 'review-code-modal', open: () => window.openModal('review-code-modal'), main: true },
    { id: 'vote-info-modal', open: () => window.openModal('vote-info-modal'), main: false }
];

async function measure(page, w) {
    await page.evaluate(w.open);
    await page.locator(`#${w.id}.active`).waitFor();
    await page.waitForTimeout(450);
    return page.evaluate((id) => {
        const q = (s) => document.querySelector(`#${id} ${s}`);
        const box = q('.info-box'), x = q('.modal-x'), k = q('.info-kicker'), b = q('.auth-form .btn-inspect');
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
                const page = await newPage(browser, site, { locale: 'el-GR', ...opts });
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
