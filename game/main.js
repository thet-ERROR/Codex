// game/main.js — RAM RUSH, the hidden mini game.
//
// Nothing here is loaded with the site: the terminal's `ramrush` (js/modules/terminal.js) imports this file
// the moment the game is opened, and the game fetches its own art then. Everything it adds to the page lives
// under one element (#rr-overlay) and one <style> (#rr-style), both prefixed `rr-`, and both are removed on
// close together with every listener and the animation loop, so a closed game leaves nothing behind.
//
// Step 2 of the plan: the window, the loop and the moving city. Step 3: the hero runs on the road with his
// drone (hero.js). Step 3b: the game runs inside the terminal's own window (the output, the chips and the
// prompt step aside, the title bar says `ramrush`). Plan §8c.6: a phone plays it held sideways only, the
// window then the whole screen (held upright, it is asked to turn and the game waits). Step 4: the controls
// (input.js) and the moves (hero.js), P pauses, and a short reminder of the keys (or of the swipes, on a
// phone) shows at the start. Step 5: the RAM throw (ram.js), by
// key, click or tap. Plan §4b: the power-ups (powerups.js, numbers in config.js), XMP first. Step 6: the
// enemies (enemies.js, the Orange Bot first), the hero's life, and a plain game over that starts a new run.

import { createHero } from './hero.js';
import { createRams } from './ram.js';
import { createPowerups } from './powerups.js';
import { createEnemies } from './enemies.js';
import { createObstacles } from './obstacles.js';
import { createPlatforms } from './platforms.js';
import { createProgression, saveRecords, readRecords } from './progression.js';
import { PX_PER_M, POWERUPS, PARRY, PAUSE_BUTTON, SOUND_BUTTON, XP_BAR, HUD_SCALE, difficulty } from './config.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';

const ASSETS = new URL('./assets/', import.meta.url);
const W = 960, H = 540;                       // the game's own coordinates; the canvas is scaled to fit
// the road's speed (px per second at parallax 1) comes from config DIFFICULTY: it rises with the distance
// Back to front: file, parallax factor, drawn height, y of the bottom edge (from parallax-preview.html)
const LAYERS = [
    ['sky', 0.03, 440, 440],
    ['far', 0.15, 190, 415],
    ['mid', 0.40, 250, 432],
    ['rail', 0.85, 56, 452],
    ['road', 1.00, 180, 612]
];

const TEXT = {
    el: { title: 'RAM RUSH', close: 'Κλείσιμο παιχνιδιού', loading: 'Φόρτωση…', failed: 'Το παιχνίδι δεν φόρτωσε. Δοκίμασε ξανά.',
        paused: 'ΠΑΥΣΗ', resume: 'P για συνέχεια · M ήχος', resumeTouch: 'Πάτα ▶ για συνέχεια',
        over: 'GAME OVER', again: 'Space / J / πάτα για νέο παιχνίδι', againTouch: 'Πάτα για νέο παιχνίδι', score: 'Σκορ', kills: 'εχθροί',
        rotate: 'Γύρισε το κινητό', rotateSub: 'Το RAM RUSH παίζεται οριζόντια',
        levelUp: 'LEVEL UP!', best: 'Ρεκόρ', newBest: 'ΝΕΟ ΡΕΚΟΡ!', boss: 'MALWARE CORE',
        fx: { speed: 'ταχύτητα', rate: 'ρυθμός', damage: 'ζημιά', shield: (n) => `ασπίδα · ${n} χτύπημα`, drone: (s) => `drone · βολή ανά ${s} s`,
            sprint: (x) => `sprint ${x} · ασυλία σε εμπόδια` },
        keys: '↑ / W / Space άλμα (×2 διπλό)   ↓ / S slide   ← → κίνηση   J / X / κλικ RAM   E / δεξί κλικ parry   P παύση   M ήχος   Esc έξοδος',
        swipes: ['Πάτα: RAM   Σύρε ↑ άλμα, ξανά: διπλό', 'Σύρε ↓ slide   Σύρε ← → κίνηση'] },
    en: { title: 'RAM RUSH', close: 'Close the game', loading: 'Loading…', failed: 'The game did not load. Try again.',
        paused: 'PAUSED', resume: 'P to resume · M sound', resumeTouch: 'Tap ▶ to resume',
        over: 'GAME OVER', again: 'Space / J / tap for a new run', againTouch: 'Tap for a new run', score: 'Score', kills: 'enemies',
        rotate: 'Turn your phone sideways', rotateSub: 'RAM RUSH is played in landscape',
        levelUp: 'LEVEL UP!', best: 'Best', newBest: 'NEW RECORD!', boss: 'MALWARE CORE',
        fx: { speed: 'speed', rate: 'rate', damage: 'damage', shield: (n) => `shield · ${n} hit${n > 1 ? 's' : ''}`, drone: (s) => `drone · a shot every ${s} s`,
            sprint: (x) => `sprint ${x} · obstacles can't touch you` },
        keys: '↑ / W / Space jump (×2 double)   ↓ / S slide   ← → move   J / X / click RAM   E / right click parry   P pause   M sound   Esc exit',
        swipes: ['Tap: RAM   Swipe ↑ jump, again: double', 'Swipe ↓ slide   Swipe ← → move'] }
};
const txt = () => TEXT[document.documentElement.lang === 'en' ? 'en' : 'el'];

const CSS = `
/* The terminal's window becomes the game's: wider on a desktop (but never taller than the screen),
   and its own output, chips, prompt and logo step aside while the game is in it */
#cli-overlay.rr-in-term { width: min(960px, 96vw, calc((100dvh - 150px) * 16 / 9 + 20px)) !important; max-width: none !important;
    height: auto !important; max-height: none !important; padding: 10px !important;
    z-index: 10050 !important; /* above the header (10000), which a window this big can reach on a short screen */ }
#cli-overlay.rr-in-term > .cli-output, #cli-overlay.rr-in-term > .cli-chips, #cli-overlay.rr-in-term > .cli-input-line { display: none !important; }
#cli-overlay.rr-in-term::after { display: none !important; }
#cli-overlay.rr-in-term .cli-bar { margin: -10px -10px 10px; }
.rr-overlay { position: relative; display: flex; flex-direction: column; align-items: center; background: #0d0c1d;
    color: #f1f0f7; font-family: system-ui, sans-serif; touch-action: none; border-radius: 6px; overflow: hidden; }
.rr-canvas { display: block; width: min(100%, calc((100dvh - 150px) * 16 / 9)); height: auto; aspect-ratio: 16 / 9; image-rendering: auto; }
.rr-status { position: absolute; top: 0; left: 0; right: 0; aspect-ratio: 16 / 9; display: flex; align-items: center;
    justify-content: center; font-size: 15px; letter-spacing: 1px; pointer-events: none; }
.rr-overlay:focus { outline: none; }
/* A phone held sideways (plan §8c.6): the terminal's window is the whole screen, its title bar slim (its ✕
   still a thumb's size), and the world as big as the height allows; the swipes and taps land on the world */
@media (pointer: coarse) and (orientation: landscape) {
    #cli-overlay.rr-in-term { width: 100vw !important; height: 100dvh !important; max-height: none !important; top: 0 !important; left: 0 !important;
        transform: none !important; border-radius: 0 !important; border: none !important;
        padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left) !important; }
    #cli-overlay.rr-in-term .cli-bar { margin: 0; height: 44px; box-sizing: border-box; padding: 0 0 0 12px; border-radius: 0; }
    #cli-overlay.rr-in-term .cli-close { width: 44px; height: 44px; }
    .rr-overlay { flex: 1; min-height: 0; width: 100%; justify-content: center; border-radius: 0; }
    .rr-canvas { width: min(100%, calc((100dvh - 44px - env(safe-area-inset-bottom)) * 16 / 9)); }
}
/* Held upright it is asked to turn (drawn on the canvas): the window in the middle of the screen */
@media (pointer: coarse) and (orientation: portrait) {
    #cli-overlay.rr-in-term { top: 50% !important; transform: translate(-50%, -50%) !important; }
}
`;

let game = null;           // the one running game, or null

function loadImage(name) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // decoded before the first frame: drawn undecoded, the big layers stalled the loop for ~0.5s at the start
        img.onload = () => img.decode().catch(() => {}).then(() => resolve(img));
        img.onerror = () => reject(new Error(`RAM RUSH: ${name} did not load`));
        img.src = new URL(`${name}.webp`, ASSETS).href;
    });
}

// Draws one tileable layer across the width, scrolled by the distance travelled
function drawLayer(ctx, img, factor, h, bottom, distance) {
    const w = img.width * h / img.height;
    const y = bottom - h;
    let x = -((distance * factor) % w);
    for (; x < W; x += w) ctx.drawImage(img, x, y, w, h);
}

export async function open() {
    if (game) return game;
    const cli = document.getElementById('cli-overlay');
    if (!cli) throw new Error('RAM RUSH: no terminal window to run in');
    const opener = document.activeElement;
    // Opened from the page (the r-a-m shortcut) the terminal is not open yet: open it, the game lives in it
    if (!cli.classList.contains('active') && window.toggleCLI) window.toggleCLI();

    const style = document.createElement('style');
    style.id = 'rr-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'rr-overlay';
    overlay.className = 'rr-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', txt().title);
    overlay.tabIndex = -1;           // it takes the focus, so Space can never "click" the bar's ✕
    overlay.innerHTML = `<canvas class="rr-canvas" width="${W}" height="${H}"></canvas>
        <p class="rr-status" aria-live="polite">${txt().loading}</p>`;
    cli.appendChild(overlay);
    cli.classList.add('rr-in-term');
    // js/ui/ui-lock.js sees this class: it locks the page behind and pauses the site's background video
    document.body.classList.add('rr-playing');

    // The title bar says what is running, and its ✕ now ends the game (back to the prompt), not the terminal
    const titleEl = cli.querySelector('.cli-bar-title');
    const closeBtn = cli.querySelector('.cli-close');
    const wasTitle = titleEl ? titleEl.innerHTML : '';
    const wasLabel = closeBtn ? closeBtn.getAttribute('aria-label') : null;
    if (titleEl) titleEl.innerHTML = '<i class="ph-bold ph-terminal-window"></i> codex@terminal — ramrush';
    if (closeBtn) closeBtn.setAttribute('aria-label', txt().close);
    const onBarClose = (e) => { e.preventDefault(); e.stopImmediatePropagation(); close(); };
    if (closeBtn) closeBtn.addEventListener('click', onBarClose, true);
    // The terminal closed some other way (the ` key): the game goes with it
    const watch = new MutationObserver(() => { if (!cli.classList.contains('active')) close(); });
    watch.observe(cli, { attributes: true, attributeFilter: ['class'] });

    const canvas = overlay.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const status = overlay.querySelector('.rr-status');
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(1, '#0d0c1d');

    // the sound: made now, while the click, tap or key that opened the game still counts (see audio.js)
    const audio = createAudio();
    const g = { immune: { box: null, hit: () => false }, overlay, style, raf: 0, last: 0, distance: 0, paused: false, userPaused: false, images: null, hero: null, closed: false, audio,
        hintT: 7,                    // the keys reminder (on a phone: the swipes)
        hudScale: 1, compact: false, upright: false, drawn: false };
    game = g;
    const touchUI = matchMedia('(pointer: coarse)').matches;
    // A phone plays it held sideways only (plan §8c.6): held upright it is asked to turn, and waits
    const portrait = matchMedia('(orientation: portrait)');
    // The HUD's size on a touch screen (plan §8c.6): its text never under HUD_SCALE.minFont px on the screen;
    // on a small canvas the secondary parts hide. Measured when the canvas changes size, not each frame.
    const fit = () => {
        const w = canvas.getBoundingClientRect().width, k = w / W, S = HUD_SCALE;
        g.hudScale = touchUI && k > 0 ? Math.min(S.max, Math.max(1, S.minFont / (S.baseFont * k))) : 1;
        g.compact = touchUI && w > 0 && w < S.compactBelow;
    };
    const sizes = new ResizeObserver(fit);
    sizes.observe(canvas);
    fit();
    // The parry button on a touch screen, bottom right of the world (it grows with the HUD, from that corner)
    const onParryButton = (cx, cy) => {
        if (!touchUI) return false;
        const r = canvas.getBoundingClientRect(), b = PARRY.button, s = Math.min(g.hudScale, b.maxScale);
        const x = (cx - r.left) * W / r.width, y = (cy - r.top) * H / r.height;
        return Math.hypot(x - (W - (W - b.x) * s), y - (H - (H - b.y) * s)) <= b.hit * s;
    };
    // The pause button (it grows with the HUD, from the top right corner): its reach on the screen is never
    // under minHit CSS px, however small the canvas shows
    const onPauseButton = (cx, cy) => {
        const r = canvas.getBoundingClientRect(), b = PAUSE_BUTTON, scale = r.width / W, s = g.hudScale;
        const half = Math.max(b.size * s, b.minHit / scale) / 2;
        const x = (cx - r.left) / scale, y = (cy - r.top) / scale;
        return Math.abs(x - (W - (W - b.x) * s)) <= half && Math.abs(y - b.y * s) <= half;
    };
    // Held upright the picture of the moment is kept aside, under the request to turn, and put back after
    const shot = document.createElement('canvas');
    shot.width = W; shot.height = H;
    // The sound button, left of it: the same reach, the same growth from the top right corner
    const onSoundButton = (cx, cy) => {
        const r = canvas.getBoundingClientRect(), b = SOUND_BUTTON, scale = r.width / W, s = g.hudScale;
        const half = Math.max(b.size * s, b.minHit / scale) / 2;
        const x = (cx - r.left) / scale, y = (cy - r.top) / scale;
        return Math.abs(x - (W - (W - b.x) * s)) <= half && Math.abs(y - b.y * s) <= half;
    };
    const input = createInput(overlay, { isParry: onParryButton, isPause: onPauseButton, isMute: onSoundButton });
    let newRun = () => {};
    const hud = createHud(ctx, g, { txt, touchUI, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
    g.hud = hud;

    // The parry: a shield arc before the hero; bright and wide on a perfect one (its touch button is in hud.js)
    function drawParry() {
        if (g.parryFx > 0) {
            const k = g.parryFx / 0.25, b = g.heroLink.box, perfect = g.parryPerfect;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = perfect ? `rgba(240, 253, 255, ${k})` : `rgba(34, 211, 238, ${0.6 * k})`;
            ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = perfect ? 24 : 10;
            ctx.lineWidth = perfect ? 6 : 3;
            ctx.beginPath();
            ctx.arc(b.x + b.w / 2, b.y + b.h / 2, (perfect ? 78 : 64) + (1 - k) * 12, -1.1, 1.1);
            ctx.stroke();
            ctx.restore();
        }
        if (g.flashT > 0) {                            // the perfect parry's flash over the world
            ctx.save();
            ctx.fillStyle = `rgba(240, 253, 255, ${0.35 * g.flashT / 0.12})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
    }

    function frame(t) {
        g.raf = requestAnimationFrame(frame);
        const dt = Math.min((t - (g.last || t)) / 1000, 0.05);   // capped, so a hiccup never jumps the world
        g.last = t;
        const i = input.consume();   // read every frame, so nothing pressed while loading or paused piles up
        if (i.any) audio.unlock();
        if (g.paused || !g.images) return;
        // a phone held upright: the request to turn, and the game waits. Turned back, it waits on the pause
        // screen (a tap on ▶ goes on), so play never starts by surprise; a run not yet begun simply starts.
        const upright = touchUI && portrait.matches;
        if (upright !== g.upright) {
            g.upright = upright;
            if (upright) { shot.getContext('2d').drawImage(canvas, 0, 0); hud.rotate(); audio.pause(); }
            else {
                ctx.drawImage(shot, 0, 0);
                if (g.drawn && !g.over && !g.userPaused) { g.userPaused = true; hud.pause(); hud.pauseButton(true); hud.soundButton(audio.muted, true); }
                else if (!g.userPaused) audio.resume();
            }
        }
        if (upright) return;
        if (i.mute) {
            audio.toggle();
            audio.play('ui_click');
            if (g.userPaused) hud.soundButton(audio.muted, true);   // the loop waits: drawn over the pause screen now
        }
        if (i.pause) {
            g.userPaused = !g.userPaused;
            // drawn once over the last picture; the loop then waits, and so does the sound
            if (g.userPaused) { hud.pause(); hud.pauseButton(true); hud.soundButton(audio.muted, true); audio.pause(); }
            else { audio.resume(); audio.play('ui_click'); }
        }
        if (g.userPaused) return;
        if (g.over) {
            // the run is over: the picture waits under the GAME OVER; a jump, a throw or a tap starts anew
            // (after a short moment, so the key that was being pressed when he fell does not skip it)
            g.overT += dt;
            if (g.overT > 0.7 && (i.jump || i.throw)) newRun();
            return;
        }
        // the parry: perfect (the boss's shot never comes) or a miss (it rests a while)
        g.parryCool = Math.max(0, g.parryCool - dt);
        g.parryFx = Math.max(0, g.parryFx - dt);
        g.flashT = Math.max(0, g.flashT - dt);
        if (i.parry && g.parryCool <= 0) {
            g.parryPerfect = g.enemies.parry() === 'perfect';
            g.parryFx = 0.25;
            if (g.parryPerfect) { g.stop = PARRY.hitStop; g.flashT = 0.12; audio.play('parry'); } else g.parryCool = PARRY.cooldown;
        }
        // the hit-stop: for a blink the world holds still (the picture is still drawn)
        const wdt = g.stop > 0 ? 0 : dt;
        g.stop = Math.max(0, g.stop - dt);
        // Overclock CPU: a sprint (POWERUPS.overclock.sprint × the road's speed)
        g.speed = difficulty(g.distance / PX_PER_M).speed * (g.powerups.isOn('overclock') ? POWERUPS.overclock.sprint : 1);
        g.distance += g.speed * wdt;
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        g.drawn = true;
        const jumps = g.hero.jumps, thrown = g.rams.thrown, shots = g.powerups.droneShots || 0, taken = g.powerups.taken;
        g.hero.ceiling = g.obstacles.overhead(g.hero.x);        // under a bar, he stays down
        g.hero.update(wdt, i);
        if (g.hero.jumps > jumps) audio.play('jump');
        if (i.throw) {
            // a click or tap on the world aims there; by key straight ahead
            const hand = g.hero.hand();
            let tx, ty;
            if (i.aim) {
                const r = canvas.getBoundingClientRect();
                if (i.aim.y <= r.bottom && i.aim.y >= r.top) { tx = (i.aim.x - r.left) * W / r.width; ty = (i.aim.y - r.top) * H / r.height; }
            }
            const pu = g.powerups;
            g.rams.throw(hand.x, hand.y, tx, ty, {
                speed: pu.getStat('speedMult'), cooldown: pu.getStat('rofMult'), damage: pu.getStat('damageMult'), hot: pu.isOn('xmp')
            });
        }
        g.powerups.droneStep(wdt, g.hero.drone, g.enemies.targets(), g.rams);
        g.rams.update(wdt, g.enemies.targets());
        g.heroLink.box = g.hero.box();
        g.platforms.update(wdt, g.speed * wdt, g.distance / PX_PER_M, g.obstacles);
        // overclocked, the obstacles cannot touch him: they meet a link that takes no blow
        g.immune.box = g.heroLink.box;
        g.obstacles.update(wdt, g.speed * wdt, g.distance / PX_PER_M, g.powerups.isOn('overclock') ? g.immune : g.heroLink, g.enemies);
        g.enemies.noLasers = g.obstacles.blocksLasers();
        g.enemies.update(wdt, g.speed * wdt, g.distance / PX_PER_M, g.heroLink, g.rams, g.powerups);
        g.powerups.update(wdt, g.speed * wdt, g.distance / PX_PER_M, g.heroLink.box, g.rams);
        if (g.rams.thrown > thrown) audio.play('ram_throw');
        if ((g.powerups.droneShots || 0) > shots) audio.play('ram_throw', { volume: 0.5 });   // the drone's, softer
        if (g.powerups.taken > taken) audio.play('powerup_xmp');
        for (const [name, factor, h, bottom] of LAYERS) {
            drawLayer(ctx, g.images[name], factor, h, bottom, g.distance);
            if (name === 'mid') g.obstacles.drawCars(ctx);       // the flying cars, far behind the rail
        }
        g.platforms.draw(ctx);
        g.obstacles.draw(ctx);
        g.powerups.draw(ctx);
        g.enemies.draw(ctx);
        g.powerups.drawAura(ctx, g.heroLink.box);
        g.hero.draw(ctx);
        g.powerups.drawDrone(ctx, g.hero.drone);
        g.rams.draw(ctx);
        hud.bossBar(g.enemies.boss(), dt);
        hud.floats(wdt, g.speed * wdt);
        drawParry();
        hud.parryButton();
        hud.pauseButton(false);
        hud.soundButton(audio.muted);
        // XP: the enemies' and the distance's; a level up raises his RAM tier (the throws hit harder)
        if (g.prog.set(g.prog.fromRun(g.enemies.xp, g.distance / PX_PER_M))) {
            g.levelT = XP_BAR.banner;
            g.powerups.base.damageMult = g.prog.tier().damage;
            audio.play('level_up');
        }
        g.levelT = Math.max(0, g.levelT - dt);
        hud.life(dt);
        hud.xp(dt);
        hud.powerups(g.powerups, 104);
        if (g.levelT > 0) hud.levelUp();
        if (g.hintT > 0) { g.hintT -= dt; hud.hint(); }
        if (g.hero.hp <= 0) {
            g.over = true; g.overT = 0;
            g.records = saveRecords({ score: g.enemies.score, level: g.prog.level, distance: Math.floor(g.distance / PX_PER_M) });
            hud.over();
            audio.music(false);
            audio.play('game_over');
        }
    }

    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    function onVisibility() {
        g.paused = document.visibilityState !== 'visible';
        g.last = 0;   // no jump on return
        // a hidden tab: silence; back: the sound again, unless the game itself is waiting
        if (g.paused) audio.pause(); else if (!g.userPaused && !g.upright) audio.resume();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);

    g.teardown = () => {
        cancelAnimationFrame(g.raf);
        input.destroy();
        audio.close();
        sizes.disconnect();
        watch.disconnect();
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
        if (closeBtn) { closeBtn.removeEventListener('click', onBarClose, true); if (wasLabel !== null) closeBtn.setAttribute('aria-label', wasLabel); }
        if (titleEl) titleEl.innerHTML = wasTitle;
        overlay.remove();
        style.remove();
        cli.classList.remove('rr-in-term');
        document.body.classList.remove('rr-playing');
        // Back to the prompt if the terminal is still open (no keyboard pop-up on a phone), else to where the visitor was
        const prompt = document.getElementById('cli-input');
        if (cli.classList.contains('active')) { if (prompt && !matchMedia('(max-width: 768px)').matches) prompt.focus(); }
        else if (opener && typeof opener.focus === 'function' && opener.isConnected) opener.focus();
    };

    overlay.focus({ preventScroll: true });
    g.raf = requestAnimationFrame(frame);
    try {
        const json = (name) => fetch(new URL(`${name}.json`, ASSETS)).then(r => { if (!r.ok) throw new Error(`RAM RUSH: ${name}.json`); return r.json(); });
        const [imgs, sheet, frames, enemySheet, enemyFrames, obstacleSheet, obstacleFrames] = await Promise.all([
            Promise.all(LAYERS.map(([name]) => loadImage(name))),
            loadImage('sprites'), json('sprites'),
            loadImage('enemies'), json('enemies'),
            loadImage('obstacles'), json('obstacles')
        ]);
        if (g.closed) return g;
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        // a run: everything that starts over on GAME OVER
        newRun = () => {
            g.hero = createHero(sheet, frames, { reducedMotion });
            g.rams = createRams();
            g.powerups = createPowerups({ reducedMotion });
            g.enemies = createEnemies(enemySheet, enemyFrames, { reducedMotion, onXp: (x, y, n) => hud.floatXp(x, y, n), sound: (n) => audio.play(n) });
            hud.clearFloats();
            g.enemies.natural = !g.quiet;
            g.obstacles = createObstacles(obstacleSheet, obstacleFrames, { reducedMotion });
            g.obstacles.natural = !g.quiet;
            g.platforms = createPlatforms(obstacleSheet, obstacleFrames, { reducedMotion });
            g.platforms.natural = !g.quiet;
            g.hero.floors = g.platforms;
            // a blow goes to the shield first (Liquid Cooling), then to his life
            g.heroLink = { box: g.hero.box(), hit: (d) => {
                if (g.hero.invuln > 0 || g.hero.hp <= 0) return false;
                const safe = g.powerups.absorb();
                if (safe) { g.hero.invuln = safe; audio.play('ram_ricochet'); return true; }   // it glances off the shield
                const hurt = g.hero.hit(d);
                if (hurt) audio.play('hero_hurt');
                return hurt;
            } };
            g.distance = 0; g.over = false; g.overT = 0;
            g.parryCool = 0; g.parryFx = 0; g.parryPerfect = false; g.stop = 0; g.flashT = 0;
            g.prog = createProgression(); g.xpShown = 0; g.levelT = 0;
            audio.music(true);
        };
        newRun();
        g.images = Object.fromEntries(LAYERS.map(([name], i) => [name, imgs[i]]));
        status.textContent = '';
    } catch (e) {
        if (!g.closed) status.textContent = txt().failed;
    }
    return g;
}

export function close() {
    if (!game) return;
    game.closed = true;
    game.teardown();
    game = null;
}

export const isOpen = () => !!game;

// A read-only look at the running game, for the tests (tests/ramrush.test.js)
export const state = () => {
    if (!game || !game.hero) return null;
    const h = game.hero;
    return {
        hero: { x: h.x, y: h.y, vy: h.vy, bob: h.bob, frame: h.frame, onGround: h.onGround, jumps: h.jumps, box: h.box() },
        drone: { x: h.drone.x, y: h.drone.y },
        rams: game.rams.active(), bolts: game.rams.bolts(), droneShots: game.powerups.droneShots || 0, thrown: game.rams.thrown, cooldown: game.rams.cooldown,
        powerups: [...game.powerups.active.values()].map(a => ({ ...a })), pickups: game.powerups.pickups(),
        mhz: game.powerups.mhz, taken: game.powerups.taken,
        hearts: game.hud && game.hud.info(),
        hudScale: game.hudScale, compact: game.compact, upright: game.upright,
        hint: game.hintT > 0 && game.hud ? game.hud.hintLines() : null,
        rows: game.hud && game.powerups ? game.hud.rows(game.powerups) : [],
        floats: game.hud ? game.hud.floatInfo() : [], bossBar: game.hud ? game.hud.bossInfo() : null,
        sound: { muted: game.audio.muted, loaded: game.audio.loaded, ctx: game.audio.state ? game.audio.state() : 'none',
            gain: game.audio.gain ? game.audio.gain() : 0, asked: { ...game.audio.asked }, heard: { ...game.audio.heard }, loop: game.audio.loop ? game.audio.loop() : null, music: game.audio.musicOn },
        hp: h.hp, invuln: h.invuln, over: !!game.over,
        platforms: game.platforms.list(), obstacles: game.obstacles.list(), cars: game.obstacles.cars(), obstacleHits: game.obstacles.hits, ceiling: h.ceiling,
        enemies: game.enemies.list(), spikes: game.enemies.spikes(), killed: game.enemies.killed, score: game.enemies.score, xp: game.enemies.xp,
        parryCool: game.parryCool, parries: game.enemies.parries,
        speed: game.speed || 0,
        level: game.prog.level, xpTotal: game.prog.total, xpInto: game.prog.into, xpNeed: game.prog.need, tier: game.prog.tier().name,
        records: readRecords(),
        distance: game.distance, paused: game.userPaused
    };
};

// For the tests only: put a pickup on the road (the natural ones come every 400–700 m, ~40 s apart)
export const testSpawnPickup = (id, x, y) => !!(game && game.powerups && game.powerups.spawn(id, x, y));
// … an enemy (the natural ones start at 60 m, ~6 s in) …
// (calm, only walking, unless { attack: true })
export const testSpawnEnemy = (id, x, opts = {}) => !!(game && game.enemies && game.enemies.spawn(id, x, !!opts.attack));
// … and a quiet road: no enemies of their own, so a test about something else is not disturbed
export const testQuiet = () => { if (game) { game.quiet = true; if (game.enemies) game.enemies.natural = false; if (game.obstacles) game.obstacles.natural = false; if (game.platforms) game.platforms.natural = false; } };
// … a platform: x, its height over the road, how many pieces, breakable or not
export const testSpawnPlatform = (x, height, n, breakable) => !!(game && game.platforms && game.platforms.spawn(x, height, n, breakable));
// … an obstacle on the road (the natural ones start at 120 m)
export const testSpawnObstacle = (id, x) => !!(game && game.obstacles && game.obstacles.spawn(id, x));
// … and XP, as if enemies had given it (the level ups come at their own pace otherwise)
export const testXp = (n) => { if (game && game.enemies) game.enemies.xp += n; };
// … and further along the road at once (the difficulty follows the distance)
export const testWarp = (m) => { if (game) game.distance = m * PX_PER_M; };
// … and his life set, as if he had taken a blow or been healed (nothing heals him yet)
export const testHp = (n) => { if (game && game.hero) game.hero.hp = n; };
// … and the sound itself (to see it closed with the game)
export const testAudio = () => (game ? game.audio : null);
// … and what the HUD writes under each power-up (made from config.js)
export const hudEffects = () => (game && game.hud ? { ...game.hud.effects } : null);
