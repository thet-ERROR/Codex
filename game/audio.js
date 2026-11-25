// game/audio.js — RAM RUSH's sounds: the sound effects and the music loop (files in assets/audio/,
// listed with their volumes in assets/audio/sounds.json).
//
// One AudioContext, made when the game opens (that is always a click, a tap or a key: the browser lets
// sound start then); if it was still held back, the first key or touch in the game frees it. The files are
// fetched and decoded after the game has opened, never with the page, and the game never waits for them:
// a sound asked for before it is ready (or with the sound off) is simply not heard.
//
// play(name): at most VOICES at once (more are dropped, not queued); the frequent ones vary their pitch a
// little so they do not tire the ear. music(on): the loop, cut at exactly 16 s for a clean seam.
// pause()/resume(): everything holds still (the paused game, a hidden tab, a phone held upright).
// The sound on or off (M, or the speaker button) is remembered on this device.

const BASE = new URL('./assets/audio/', import.meta.url);
const VOICES = 8;
const VARY = new Set(['ram_throw', 'enemy_hit', 'ball_bounce', 'ram_ricochet']);   // pitch 0.95–1.05
const KEY = 'ramrush-sound';

export function readMuted() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}').muted === true; } catch (e) { return false; }
}
function saveMuted(muted) {
    try { localStorage.setItem(KEY, JSON.stringify({ muted })); } catch (e) { /* not kept: still works now */ }
}

export function createAudio() {
    const a = { muted: readMuted(), loaded: 0, voices: 0, asked: {}, heard: {}, musicOn: false, closed: false };
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    try { ctx = Ctx ? new Ctx() : null; } catch (e) { ctx = null; }
    a.ctx = ctx;
    if (!ctx) return Object.assign(a, { play() {}, music() {}, pause() {}, resume() {}, unlock() {}, toggle() { a.muted = !a.muted; saveMuted(a.muted); return a.muted; }, close() {}, ready: Promise.resolve() });

    const master = ctx.createGain();
    master.gain.value = a.muted ? 0 : 1;
    master.connect(ctx.destination);
    const buffers = {};          // name → AudioBuffer, once decoded
    const vol = {};              // name → its volume from sounds.json
    let loop = null, loopDef = null;
    let held = false;            // paused by the game: a key that frees the context must not undo that

    a.ready = fetch(new URL('sounds.json', BASE)).then(r => r.json()).then(list => {
        const all = { ...list.sfx, ...list.music };
        loopDef = list.music.loop_main;
        return Promise.all(Object.entries(all).map(([name, d]) => {
            vol[name] = d.volume;
            return fetch(new URL(d.file, BASE)).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))
                .then(buf => { if (!a.closed) { buffers[name] = buf; a.loaded++; } }, () => {});
        }));
    }).then(() => { if (a.musicOn) startLoop(); }, () => {});

    a.play = (name, { volume = 1 } = {}) => {
        a.asked[name] = (a.asked[name] || 0) + 1;
        const buf = buffers[name];
        if (!buf || a.muted || a.closed || a.voices >= VOICES) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        if (VARY.has(name)) src.playbackRate.value = 0.95 + Math.random() * 0.1;
        const g = ctx.createGain();
        g.gain.value = vol[name] * volume;
        src.connect(g).connect(master);
        a.voices++;
        a.heard[name] = (a.heard[name] || 0) + 1;
        src.onended = () => { a.voices--; g.disconnect(); };
        src.start();
    };

    function startLoop() {
        if (loop || !buffers.loop_main || a.closed) return;
        loop = ctx.createBufferSource();
        loop.buffer = buffers.loop_main;
        loop.loop = true; loop.loopStart = 0; loop.loopEnd = loopDef.duration;   // exactly 16 s: no gap at the seam
        const g = ctx.createGain();
        g.gain.value = loopDef.volume;
        loop.connect(g).connect(master);
        loop.start();
    }
    // on: the loop plays (from the start, when it was off); off: it stops
    a.music = (on) => {
        a.musicOn = on;
        if (on) startLoop();
        else if (loop) { try { loop.stop(); } catch (e) { /* already */ } loop = null; }
    };
    a.loop = () => loop && { loop: loop.loop, loopStart: loop.loopStart, loopEnd: loop.loopEnd };

    a.pause = () => { held = true; if (ctx.state === 'running') ctx.suspend().catch(() => {}); };
    a.resume = () => { held = false; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
    // a key or a touch in the game: the browser now lets the sound start (unless the game holds it)
    a.unlock = () => { if (!held && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
    a.toggle = () => {
        a.muted = !a.muted;
        master.gain.value = a.muted ? 0 : 1;
        saveMuted(a.muted);
        return a.muted;
    };
    a.state = () => ctx.state;
    a.gain = () => master.gain.value;            // 0 when off: the music too is silent
    a.close = () => { a.closed = true; a.music(false); ctx.close().catch(() => {}); };
    return a;
}
