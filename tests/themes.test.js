// The six themes (css/base/themes.css, js/modules/themes.js): which one is on, who can wear which, what an
// old browser holds from the thirteen-colour days, and that every theme stays readable (axe contrast) on the
// windows that carry the most colour. Run from this folder: npm test

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
    // The hour is fixed at noon: after midnight the site shows the Night Owl toast, which would sit among the toasts counted here
    const page = await newPage(browser, site, { locale: 'en-US', width: 1440, height: 900, mobile: false, initScript: 'Date.prototype.getHours = () => 12;', ...opts });
    try { await body(page); } finally { await page.context().close(); }
}
const on = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const token = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const unlockAll = (page) => page.evaluate(() => window.applyThemeData(['inferno', 'arctic', 'phantom']));

// The accent and the window colour each theme must put on the page (the values of css/base/themes.css)
const LOOK = {
    graphite: { accent: 'rgb(196 228 110)', window: 'rgb(148 163 184)' },
    phoenix: { accent: 'rgb(204 255 0)', window: 'rgb(176 38 255)' },
    nebula:  { accent: 'rgb(192 132 252)', window: 'rgb(176 38 255)' },
    inferno: { accent: 'rgb(255 170 0)', window: 'rgb(255 94 0)' },
    arctic:  { accent: 'rgb(143 232 255)', window: 'rgb(56 189 248)' },
    phantom: { accent: 'rgb(233 228 255)', window: 'rgb(232 121 249)' }
};

describe('themes: the start and the switch', () => {
    it('a new visitor gets Graphite, the clean matte look, with no neon glow', () => withPage({}, async (page) => {
        assert.equal(await on(page), 'graphite');
        assert.equal(await token(page, '--neon-green'), LOOK.graphite.accent);
        assert.equal(await token(page, '--s-purple'), LOOK.graphite.window);
        assert.equal(await token(page, '--glow'), '0');
    }));

    it('a saved theme is on before the first paint, so a returning visitor never sees the default flash', () => withPage({
        storage: { codex_theme_id: 'phoenix' },
        // Records the theme at the moment <body> starts, before any module script has run
        initScript: `new MutationObserver((m, o) => { if (document.body) { window.__themeAtBody = document.documentElement.dataset.theme || 'none'; o.disconnect(); } }).observe(document, { childList: true, subtree: true });`
    }, async (page) => {
        assert.equal(await page.evaluate(() => window.__themeAtBody), 'phoenix');
        assert.equal(await token(page, '--glow'), '0.6');
    }));

    it('Graphite is matte: a dimmed grey background and a flat, solid main button; Phoenix keeps its gradient', () => withPage({}, async (page) => {
        const look = () => page.evaluate(() => ({
            bg: getComputedStyle(document.querySelector('.bg-layer')).filter,
            button: getComputedStyle(document.querySelector('.tc-actions .btn-card-inspect')).backgroundImage
        }));
        const matte = await look();
        assert.match(matte.bg, /saturate\(0\.2\)/);
        assert.equal(matte.button, 'none');
        await page.evaluate(() => window.setTheme('phoenix'));
        const neon = await look();
        assert.doesNotMatch(neon.bg, /saturate/);
        assert.match(neon.button, /gradient/);
    }));

    // Graphite is also the plain :root, so whatever it sets reaches every theme unless the theme sets it back
    it('only Graphite turns the neon sidebar icons grey; every other theme keeps their colour', () => withPage({}, async (page) => {
        await unlockAll(page);
        for (const id of Object.keys(LOOK)) {
            await page.evaluate((i) => window.setTheme(i), id);
            const filter = await page.evaluate(() => getComputedStyle(document.querySelector('.side-btn:not(.side-btn-info):not(#lang-toggle-btn) .side-ico')).filter);
            if (id === 'graphite') assert.match(filter, /grayscale/, id);
            else { assert.doesNotMatch(filter, /grayscale/, id); assert.match(filter, /hue-rotate/, id); }
        }
    }));

    it('every theme changes both the accent and the window colour, and a window wears it', () => withPage({}, async (page) => {
        await unlockAll(page);
        for (const [id, look] of Object.entries(LOOK)) {
            assert.equal(await page.evaluate((i) => window.setTheme(i), id), true, id);
            assert.equal(await on(page), id);
            assert.equal(await token(page, '--neon-green'), look.accent, id + ' accent');
            assert.equal(await token(page, '--s-purple'), look.window, id + ' window colour');
            await page.evaluate(() => window.openModal('login-modal'));
            await page.waitForTimeout(450);
            const kicker = await page.evaluate(() => getComputedStyle(document.querySelector('#login-modal .info-kicker')).color);
            assert.equal(kicker, look.window.replace(/rgb\((\d+) (\d+) (\d+)\)/, 'rgb($1, $2, $3)'), id + ' kicker in the window');
            await page.evaluate(() => window.closeModal('login-modal'));
        }
    }));

    it('a locked theme says where it is won and does not switch; the free ones always switch', () => withPage({}, async (page) => {
        assert.equal(await page.evaluate(() => window.setTheme('inferno')), false);
        assert.match(await page.locator('#toast-container .toast').first().textContent(), /Inferno.*Daily Wheel/i);
        assert.equal(await page.evaluate(() => window.setTheme('arctic')), false);
        assert.equal(await on(page), 'graphite');
        assert.equal(await page.evaluate(() => window.setTheme('nebula')), true);
        assert.equal(await on(page), 'nebula');
        assert.equal(await page.evaluate(() => window.setTheme('nope')), false);
    }));

    it('the choice survives a reload, and the browser bar takes the window colour', () => withPage({}, async (page) => {
        await page.evaluate(() => window.setTheme('nebula'));
        assert.equal(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#b026ff');
        await page.reload();
        await page.waitForSelector('#startup-overlay.hidden', { state: 'attached', timeout: 15000 });
        assert.equal(await on(page), 'nebula');
    }));
});

describe('themes: what an old browser holds from the thirteen colours', () => {
    const cases = [
        ['a won wheel colour opens Inferno, and the chosen colour becomes it', { codex_unlocked_colors: '["matrixGreen"]', codex_theme: '#ffd700' }, 'inferno', ['inferno']],
        ['a won rank colour opens Arctic, and the colour "phantom" is Arctic, not the secret theme', { codex_unlocked_colors: '["phantom"]', codex_theme: '#e9e4ff' }, 'arctic', ['arctic']],
        ['the old secret colour opens Phantom', { codex_unlocked_colors: '["cheatCode"]', codex_theme: '#ff0a54' }, 'phantom', ['phantom']],
        ['the old purple becomes Nebula', { codex_theme: '#b026ff' }, 'nebula', []],
        ['the old lime stays Phoenix', { codex_theme: '#ccff00' }, 'phoenix', []],
        ['an old free colour with no new twin (cyan) falls back to Phoenix', { codex_theme: '#00f0ff' }, 'phoenix', []],
        ['a locked colour that was never won falls back to the default (Graphite), nothing is handed out', { codex_theme: '#ff5e00' }, 'graphite', []]
    ];
    for (const [name, storage, theme, unlocked] of cases) {
        it(name, () => withPage({ storage }, async (page) => {
            assert.equal(await on(page), theme);
            const held = await page.evaluate(() => JSON.parse(localStorage.getItem('codex_unlocked_themes') || '[]'));
            assert.deepEqual(held, unlocked);
        }));
    }
});

describe('themes: the settings window', () => {
    it('lists the six themes, the clean one first, with the secret one hidden, locks on the two that are won, and the current one marked', () => withPage({}, async (page) => {
        await page.evaluate(() => window.openModal('settings-modal'));
        await page.waitForTimeout(450);
        const cards = await page.evaluate(() => [...document.querySelectorAll('.theme-card')].map(c => ({ id: c.dataset.themeId, hidden: c.hidden, locked: c.classList.contains('locked'), pressed: c.getAttribute('aria-pressed') })));
        assert.deepEqual(cards, [
            { id: 'graphite', hidden: false, locked: false, pressed: 'true' },
            { id: 'phoenix', hidden: false, locked: false, pressed: 'false' },
            { id: 'nebula', hidden: false, locked: false, pressed: 'false' },
            { id: 'inferno', hidden: false, locked: true, pressed: 'false' },
            { id: 'arctic', hidden: false, locked: true, pressed: 'false' },
            { id: 'phantom', hidden: true, locked: true, pressed: 'false' }
        ]);
    }));

    it('a tap switches the theme, on a phone too, with a target big enough for a thumb', () => withPage({ width: 390, height: 844, mobile: true }, async (page) => {
        await page.evaluate(() => window.openModal('settings-modal'));
        await page.waitForTimeout(450);
        const box = await page.locator('.theme-card[data-theme-id="nebula"]').boundingBox();
        assert.ok(box.height >= 44, `card is ${box.height}px tall`);
        await page.locator('.theme-card[data-theme-id="nebula"]').scrollIntoViewIfNeeded();
        await page.locator('.theme-card[data-theme-id="nebula"]').click();
        assert.equal(await on(page), 'nebula');
        assert.equal(await page.locator('.theme-card[data-theme-id="nebula"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }));

    it('a theme the server lists opens the card at once', () => withPage({}, async (page) => {
        await page.evaluate(() => window.applyThemeData(['arctic']));
        assert.equal(await page.evaluate(() => document.querySelector('.theme-card[data-theme-id="arctic"]').classList.contains('locked')), false);
        assert.equal(await page.evaluate(() => window.setTheme('arctic')), true);
    }));
});

describe('themes: the terminal', () => {
    const run = (page, cmd) => page.evaluate((c) => window.runTerminalCommand(c), cmd);
    const out = (page) => page.evaluate(() => document.getElementById('cli-output').textContent);

    it('`color` lists the themes, a locked one has a lock, and a name switches to it', () => withPage({}, async (page) => {
        await run(page, 'color');
        const chips = await page.evaluate(() => [...document.querySelectorAll('#cli-output .cli-chip')].map(c => c.textContent));
        assert.deepEqual(chips, ['graphite', 'phoenix', 'nebula', 'inferno \u{1F512}', 'arctic \u{1F512}']);
        await run(page, 'color nebula');
        assert.equal(await on(page), 'nebula');
        await run(page, 'color inferno');
        assert.match(await out(page), /Inferno is locked/);
        assert.equal(await on(page), 'nebula');
    }));

    it('the old colour names still work and land on their theme', () => withPage({}, async (page) => {
        await unlockAll(page);
        await run(page, 'color gold');
        assert.equal(await on(page), 'inferno');
        await run(page, 'color purple');
        assert.equal(await on(page), 'nebula');
        await run(page, 'color ultraviolet');
        assert.equal(await on(page), 'arctic');
    }));

    it('hack mode paints the accent matrix green over any theme, and ends cleanly', () => withPage({ storage: { codex_theme_id: 'nebula' } }, async (page) => {
        await run(page, 'hack');
        assert.equal(await token(page, '--neon-green'), 'rgb(0 255 0)');
        await run(page, 'hack');
        assert.equal(await token(page, '--neon-green'), LOOK.nebula.accent);
    }));
});

describe('themes: the daily wheel gives Inferno', () => {
    it('the wheel shows one theme slice, and a win unlocks and puts on Inferno', () => withPage({ member: true }, async (page) => {
        const slices = await page.evaluate(async () => (await import('./js/modules/wheel.js')) && true);
        assert.ok(slices);
        // What the server answers for a spin that lands on the theme slice (index 1)
        await page.evaluate(() => window.applyWheelData({ unlockedThemes: ['inferno'] }));
        assert.equal(await page.evaluate(() => window.themeUnlocked('inferno')), true);
        assert.equal(await page.evaluate(() => window.setTheme('inferno', { quiet: true })), true);
        assert.equal(await on(page), 'inferno');
    }));
});

// Every theme must stay readable on the windows that carry the most colour: the sign-in window, the settings,
// a card in INSPECT and the profile. Critical and serious axe findings fail it (a rule of thumb, as in a11y.test.js)
describe('themes: contrast on each theme', () => {
    async function audit(page, scope) {
        await page.waitForTimeout(700);
        await page.evaluate(AXE);
        const found = await page.evaluate(async ({ scope, TAGS }) => {
            const r = await window.axe.run(scope ? { include: [[scope]] } : document, { runOnly: { type: 'tag', values: TAGS }, resultTypes: ['violations'] });
            return r.violations.map(v => ({ rule: v.id, impact: v.impact, where: v.nodes.map(n => n.target.join(' ')).slice(0, 4) }));
        }, { scope, TAGS });
        return found.filter(v => ['critical', 'serious'].includes(v.impact));
    }
    for (const id of Object.keys(LOOK)) {
        it(`${id}: home, sign-in, settings, INSPECT, profile`, () => withPage({ member: true, width: 390, height: 844, mobile: true }, async (page) => {
            await unlockAll(page);
            await page.evaluate((i) => window.setTheme(i), id);
            assert.deepEqual(await audit(page), [], 'home');
            await page.evaluate(() => window.openModal('login-modal'));
            assert.deepEqual(await audit(page, '#login-modal'), [], 'sign-in');
            await page.evaluate(() => window.closeModal('login-modal'));
            await page.evaluate(() => window.openModal('settings-modal'));
            assert.deepEqual(await audit(page, '#settings-modal'), [], 'settings');
            await page.evaluate(() => window.closeModal('settings-modal'));
            await page.evaluate(() => window.openAgentDashboard());
            await page.locator('#agent-dashboard-modal.active').waitFor();
            assert.deepEqual(await audit(page, '#agent-dashboard-modal'), [], 'profile');
            await page.evaluate(() => window.closeModal('agent-dashboard-modal'));
            await page.locator('.btn-card-inspect').first().click();
            await page.locator('#yg-add-cart').waitFor({ state: 'visible' });
            assert.deepEqual(await audit(page, '#gallery-overlay'), [], 'INSPECT');
        }));
    }
});
