// game/main.js — RAM RUSH, the hidden mini game.
//
// Nothing here is loaded with the site: the terminal's `ramrush` (js/modules/terminal.js) imports this file
// the moment the game is opened, and the game fetches its own art then. Everything it adds to the page lives
// under one element (#rr-overlay) and one <style> (#rr-style), both prefixed `rr-`, and both are removed on
// close together with every listener and the animation loop, so a closed game leaves nothing behind.
//
// Step 2 of the plan: the window, the loop and the moving city. Step 3: the hero runs on the road with his
// drone (hero.js). Step 3b: the game runs inside the terminal's own window (the output, the chips and the
// prompt step aside, the title bar says `ramrush`), and on a phone held upright the world sits on top with a
// touch area below it. Step 4: the controls (input.js) and the moves (hero.js), P pauses, and a short
// reminder of the keys (or of the swipes, on a phone) shows at the start. Step 5: the RAM throw (ram.js), by
// key, click or tap. The enemies come next.

import { createHero } from './hero.js';
import { createRams } from './ram.js';
import { createInput } from './input.js';

const ASSETS = new URL('./assets/', import.meta.url);
const W = 960, H = 540;                       // the game's own coordinates; the canvas is scaled to fit
const SPEED = 300;                            // px per second at parallax 1 (the road)
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
        paused: 'ΠΑΥΣΗ', resume: 'P για συνέχεια',
        keys: '↑ / W / Space άλμα (ξανά στον αέρα: διπλό)   ↓ / S slide   ← → κίνηση   J / X / κλικ RAM   P παύση   Esc έξοδος',
        swipes: ['Πάτα για ρίψη RAM', 'Σύρε ↑ για άλμα (ξανά στον αέρα: διπλό)', 'Σύρε ↓ για slide', 'Σύρε ← → για κίνηση'] },
    en: { title: 'RAM RUSH', close: 'Close the game', loading: 'Loading…', failed: 'The game did not load. Try again.',
        paused: 'PAUSED', resume: 'P to resume',
        keys: '↑ / W / Space jump (again in the air: double)   ↓ / S slide   ← → move   J / X / click RAM   P pause   Esc exit',
        swipes: ['Tap to throw a RAM', 'Swipe ↑ to jump (again in the air: double)', 'Swipe ↓ to slide', 'Swipe ← → to move'] }
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
.rr-pad { display: none; }
.rr-hint { margin: 0; padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center;
    color: rgba(241, 240, 247, 0.55); font-size: 14px; letter-spacing: 0.5px; text-align: center; pointer-events: none; user-select: none; }
/* A phone held upright: the terminal's window takes the whole screen, the world sits on top and the touch area fills the rest */
@media (orientation: portrait) {
    #cli-overlay.rr-in-term { width: calc(100vw - 20px) !important; height: calc(100dvh - env(safe-area-inset-top) - 20px) !important;
        top: calc(env(safe-area-inset-top) + 10px) !important; left: 50% !important; transform: translateX(-50%) !important; }
    .rr-overlay { flex: 1; min-height: 0; }
    .rr-canvas { width: 100%; }
    .rr-pad { display: block; flex: 1; width: 100%; min-height: 120px; padding-bottom: env(safe-area-inset-bottom);
        background: linear-gradient(180deg, #15132e, #0d0c1d); border-top: 1px solid rgba(34, 211, 238, 0.25); }
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
        <div class="rr-pad" aria-hidden="true"><p class="rr-hint">${txt().swipes.map(l => `<span>${l}</span>`).join('')}</p></div>
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

    const g = { overlay, style, raf: 0, last: 0, distance: 0, paused: false, userPaused: false, images: null, hero: null, closed: false,
        hintT: matchMedia('(pointer: fine)').matches ? 7 : 0 };   // the keys reminder (a phone has it in the touch area)
    game = g;
    const input = createInput(overlay);

    function drawHint() {
        const a = Math.min(1, g.hintT / 1.2);   // fades out over its last second
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = '600 15px system-ui, sans-serif';
        const w = ctx.measureText(txt().keys).width + 32;
        ctx.fillStyle = 'rgba(13, 12, 29, 0.72)';
        ctx.beginPath();
        ctx.roundRect((W - w) / 2, H - 46, w, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#f1f0f7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt().keys, W / 2, H - 31);
        ctx.restore();
    }
    function drawPause() {
        ctx.save();
        ctx.fillStyle = 'rgba(13, 12, 29, 0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f1f0f7';
        ctx.textAlign = 'center';
        ctx.font = '800 44px system-ui, sans-serif';
        ctx.fillText(txt().paused, W / 2, H / 2 - 6);
        ctx.font = '500 17px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(241, 240, 247, 0.75)';
        ctx.fillText(txt().resume, W / 2, H / 2 + 30);
        ctx.restore();
    }

    function frame(t) {
        g.raf = requestAnimationFrame(frame);
        const dt = Math.min((t - (g.last || t)) / 1000, 0.05);   // capped, so a hiccup never jumps the world
        g.last = t;
        const i = input.consume();   // read every frame, so nothing pressed while loading or paused piles up
        if (g.paused || !g.images) return;
        if (i.pause) {
            g.userPaused = !g.userPaused;
            if (g.userPaused) drawPause();   // drawn once over the last picture; the loop then waits
        }
        if (g.userPaused) return;
        g.distance += SPEED * dt;
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        g.hero.update(dt, i);
        if (i.throw) {
            // a click or tap on the world aims there; on the touch area below it (or by key) straight ahead
            const hand = g.hero.hand();
            let tx, ty;
            if (i.aim) {
                const r = canvas.getBoundingClientRect();
                if (i.aim.y <= r.bottom && i.aim.y >= r.top) { tx = (i.aim.x - r.left) * W / r.width; ty = (i.aim.y - r.top) * H / r.height; }
            }
            g.rams.throw(hand.x, hand.y, tx, ty);
        }
        g.rams.update(dt, []);
        for (const [name, factor, h, bottom] of LAYERS) drawLayer(ctx, g.images[name], factor, h, bottom, g.distance);
        g.hero.draw(ctx);
        g.rams.draw(ctx);
        if (g.hintT > 0) { g.hintT -= dt; drawHint(); }
    }

    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    function onVisibility() {
        g.paused = document.visibilityState !== 'visible';
        g.last = 0;   // no jump on return
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);

    g.teardown = () => {
        cancelAnimationFrame(g.raf);
        input.destroy();
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
        const [imgs, sheet, frames] = await Promise.all([
            Promise.all(LAYERS.map(([name]) => loadImage(name))),
            loadImage('sprites'),
            fetch(new URL('sprites.json', ASSETS)).then(r => { if (!r.ok) throw new Error('RAM RUSH: sprites.json'); return r.json(); })
        ]);
        if (g.closed) return g;
        g.hero = createHero(sheet, frames);
        g.rams = createRams();
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
        rams: game.rams.active(), thrown: game.rams.thrown,
        distance: game.distance, paused: game.userPaused
    };
};
