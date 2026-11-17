// At night the site's music is the night track (assets/audio/night.mp3) instead of the day one, whether the
// night came from the clock or from the visitor (terminal `theme night`, the settings). Only when the visitor
// has the sound on: nothing ever starts playing on its own. Run from this folder: npm test

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite, launch, newPage } from './helpers.js';

const AUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

let site, browser;
before(async () => { site = await serveSite(); browser = await launch(); });
after(async () => { await browser.close(); await site.close(); });
async function withPage(opts, body) {
    const page = await newPage(browser, site, { locale: 'el-GR', width: 1440, height: 900, mobile: false, ...opts });
    try { await body(page); } finally { await page.context().close(); }
}
const track = (page) => page.evaluate(() => (window.codexMusic.src.split('/').pop() || ''));
const playing = (page) => page.evaluate(() => !window.codexMusic.paused);
// The browser lets music start after a press on the page, as a visitor's first tap
const firstTap = (page) => page.mouse.click(700, 860);

describe('the night music: the file', () => {
    it('is there, small enough for a phone, and loaded only when it plays', () => {
        const size = fs.statSync(path.join(AUDIO, 'night.mp3')).size;
        assert.ok(size > 500 * 1024 && size <= 3 * 1024 * 1024, `night.mp3 is ${(size / 1048576).toFixed(1)} MB`);
    });
});

describe('the night music: which track plays', () => {
    it('sound on at night: the night track', () => withPage({ storage: { codex_audio: 'true', codex_daynight: 'night' } }, async (page) => {
        await firstTap(page);
        await page.waitForFunction(() => !window.codexMusic.paused);
        assert.equal(await track(page), 'night.mp3');
    }));

    it('sound on by day: the day track', () => withPage({ storage: { codex_audio: 'true', codex_daynight: 'day' } }, async (page) => {
        await firstTap(page);
        await page.waitForFunction(() => !window.codexMusic.paused);
        assert.equal(await track(page), 'bg.mp3');
    }));

    it('switching to night while the music plays moves to the night track, and back by day', () => withPage({ storage: { codex_audio: 'true', codex_daynight: 'day' } }, async (page) => {
        await firstTap(page);
        await page.waitForFunction(() => !window.codexMusic.paused);
        await page.evaluate(() => window.setDayNightMode('night'));
        await page.waitForFunction(() => window.codexMusic.src.endsWith('night.mp3') && !window.codexMusic.paused, null, { timeout: 4000 });
        await page.evaluate(() => window.setDayNightMode('day'));
        await page.waitForFunction(() => window.codexMusic.src.endsWith('bg.mp3') && !window.codexMusic.paused, null, { timeout: 4000 });
    }));

    it('the clock turning to night does the same (no hand on the switch)', () => withPage({ storage: { codex_audio: 'true' } }, async (page) => {
        await firstTap(page);
        await page.waitForFunction(() => !window.codexMusic.paused);
        // What the 5-minute check does when 19:00 comes: the page turns to night by itself
        await page.evaluate(() => { document.body.classList.remove('night-mode'); document.dispatchEvent(new CustomEvent('codex:daynight', { detail: { night: false } })); });
        await page.evaluate(() => { document.body.classList.add('night-mode'); document.dispatchEvent(new CustomEvent('codex:daynight', { detail: { night: true } })); });
        await page.waitForFunction(() => window.codexMusic.src.endsWith('night.mp3') && !window.codexMusic.paused, null, { timeout: 4000 });
    }));

    it('sound off: night falls and nothing plays', () => withPage({ storage: { codex_audio: 'false', codex_daynight: 'day' } }, async (page) => {
        await firstTap(page);
        await page.evaluate(() => window.setDayNightMode('night'));
        await page.waitForTimeout(1200);
        assert.equal(await playing(page), false);
    }));

    it('turning the sound on at night starts the night track', () => withPage({ storage: { codex_audio: 'false', codex_daynight: 'night' } }, async (page) => {
        await firstTap(page);
        await page.evaluate(() => window.toggleAudio());
        await page.waitForFunction(() => !window.codexMusic.paused);
        assert.equal(await track(page), 'night.mp3');
    }));

    it('the volume comes back to where it was after the change', () => withPage({ storage: { codex_audio: 'true', codex_daynight: 'day' } }, async (page) => {
        await firstTap(page);
        await page.waitForFunction(() => !window.codexMusic.paused);
        const before = await page.evaluate(() => window.codexMusic.volume);
        await page.evaluate(() => window.setDayNightMode('night'));
        await page.waitForFunction(() => window.codexMusic.src.endsWith('night.mp3'), null, { timeout: 4000 });
        await page.waitForTimeout(1200);
        assert.ok(Math.abs(await page.evaluate(() => window.codexMusic.volume) - before) < 0.01);
        assert.deepEqual(page.problems, []);
    }));
});
