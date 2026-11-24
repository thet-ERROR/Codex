// game/main.js — RAM RUSH, the hidden mini game.
//
// Nothing here is loaded with the site: the terminal's `ramrush` (js/modules/terminal.js) imports this file
// the moment the game is opened, and the game fetches its own art then. Everything it adds to the page lives
// under one element (#rr-overlay) and one <style> (#rr-style), both prefixed `rr-`, and both are removed on
// close together with every listener and the animation loop, so a closed game leaves nothing behind.
//
// Step 2 of the plan: the window, the loop and the moving city. The hero, the controls and the enemies come next.

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
    el: { title: 'RAM RUSH', close: 'Κλείσιμο', loading: 'Φόρτωση…', failed: 'Το παιχνίδι δεν φόρτωσε. Δοκίμασε ξανά.' },
    en: { title: 'RAM RUSH', close: 'Close', loading: 'Loading…', failed: 'The game did not load. Try again.' }
};
const txt = () => TEXT[document.documentElement.lang === 'en' ? 'en' : 'el'];

const CSS = `
.rr-overlay { position: fixed; inset: 0; z-index: 2147482000; display: flex; align-items: center; justify-content: center;
    background: #0d0c1d; color: #f1f0f7; font-family: system-ui, sans-serif; touch-action: none; }
.rr-canvas { display: block; width: min(100vw, calc(100dvh * 16 / 9)); height: auto; aspect-ratio: 16 / 9; image-rendering: auto; }
.rr-close { position: absolute; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right));
    width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(241, 240, 247, 0.35); background: rgba(13, 12, 29, 0.7);
    color: #f1f0f7; font-size: 22px; line-height: 1; cursor: pointer; }
.rr-close:focus-visible { outline: 2px solid #22d3ee; outline-offset: 2px; }
.rr-status { position: absolute; inset: auto 0 50% 0; text-align: center; font-size: 15px; letter-spacing: 1px; pointer-events: none; }
`;

let game = null;           // the one running game, or null

function loadImage(name) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
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
    const opener = document.activeElement;

    const style = document.createElement('style');
    style.id = 'rr-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'rr-overlay';
    overlay.className = 'rr-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', txt().title);
    overlay.innerHTML = `<canvas class="rr-canvas" width="${W}" height="${H}"></canvas>
        <p class="rr-status" aria-live="polite">${txt().loading}</p>
        <button type="button" class="rr-close" aria-label="${txt().close}">✕</button>`;
    document.body.appendChild(overlay);
    // js/ui/ui-lock.js sees this class: it locks the page behind and pauses the site's background video
    document.body.classList.add('rr-playing');

    const canvas = overlay.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const status = overlay.querySelector('.rr-status');
    const closeBtn = overlay.querySelector('.rr-close');
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(1, '#0d0c1d');

    const g = { overlay, style, raf: 0, last: 0, distance: 0, paused: false, images: null, closed: false };
    game = g;

    function frame(t) {
        g.raf = requestAnimationFrame(frame);
        const dt = Math.min((t - (g.last || t)) / 1000, 0.05);   // capped, so a hiccup never jumps the world
        g.last = t;
        if (g.paused || !g.images) return;
        g.distance += SPEED * dt;
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        for (const [name, factor, h, bottom] of LAYERS) drawLayer(ctx, g.images[name], factor, h, bottom, g.distance);
    }

    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    function onVisibility() {
        g.paused = document.visibilityState !== 'visible';
        g.last = 0;   // no jump on return
    }
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);

    g.teardown = () => {
        cancelAnimationFrame(g.raf);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
        overlay.remove();
        style.remove();
        document.body.classList.remove('rr-playing');
        if (opener && typeof opener.focus === 'function' && opener.isConnected) opener.focus();
    };

    closeBtn.focus();
    g.raf = requestAnimationFrame(frame);
    try {
        const imgs = await Promise.all(LAYERS.map(([name]) => loadImage(name)));
        if (g.closed) return g;
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
