// js/modules/mascot.js
//
// The phoenix, the site's guardian. At rest it is the help button (its head, css/components/mascot.css).
// When someone asks for the admin (help → "Talk to the admin", chat.js) it comes out of the button
// whole, wings open, takes a glowing letter and flies off with it; then its speech bubble holds the
// link to the WhatsApp chat.
//
// Why a link in a bubble instead of opening WhatsApp at the end of the flight: browsers — iOS Safari
// above all — block a window opened after a delay, outside the tap that asked for it. An <a> the
// visitor taps always works, and the flight gets to be seen.
import { CONFIG } from '../config.js';
import { t } from '../i18n.js';

const FULL = 'assets/mascot/phoenix-full.png';
const FULL_RATIO = 246 / 300;               // width / height of that image
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fetched when the help opens, so the image is decoded by the time "Talk to the admin" is pressed
let preloaded = null;
export function preloadMascot() {
    if (preloaded) return preloaded;
    const img = new Image();
    img.src = FULL;
    preloaded = (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
    return preloaded;
}

let busy = false;

export async function mascotToAdmin() {
    closeBubble();
    const url = `https://wa.me/${CONFIG.WHATSAPP_NUM}`;
    const btn = document.querySelector('.mascot-btn');
    if (!btn || REDUCED.matches || !document.body.animate) { showBubble(url, btn); return; }
    if (busy) return;
    busy = true;
    try {
        await Promise.race([preloadMascot(), new Promise(r => setTimeout(r, 600))]);
        await fly(btn);
    } catch (e) { /* an animation that can't run is no reason to lose the link */ }
    finally {
        busy = false;
        btn.classList.remove('mascot-away');
        btn.classList.add('mascot-back');
        setTimeout(() => btn.classList.remove('mascot-back'), 600);
        showBubble(url, btn);
    }
}

// Comes out of the button, holds up the letter, flies off towards the top of the screen
async function fly(btn) {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const H = Math.round(Math.min(170, window.innerHeight * 0.24));
    const W = Math.round(H * FULL_RATIO);

    const stage = document.createElement('div');
    stage.className = 'mascot-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `<div class="mascot-fly"><img src="${FULL}" alt="" class="mascot-full"><i class="ph-fill ph-envelope-simple mascot-letter"></i></div>`;
    document.body.appendChild(stage);
    const body = stage.firstElementChild;
    const img = body.querySelector('.mascot-full');
    const letter = body.querySelector('.mascot-letter');
    // Feet just above the button, clamped inside the screen
    const left = Math.max(8, Math.min(cx - W / 2, window.innerWidth - W - 8));
    Object.assign(body.style, { width: W + 'px', height: H + 'px', left: left + 'px', top: Math.max(8, r.top - H - 4) + 'px' });

    btn.classList.add('mascot-away'); // the head goes out as the whole bird comes out
    const safety = (ms) => new Promise(res => setTimeout(res, ms));
    const done = (a, ms) => Promise.race([a.finished, safety(ms + 400)]);

    try {
        // 1. Rises out of the button
        await done(body.animate([
            { transform: 'translateY(45%) scale(0.25)', opacity: 0 },
            { transform: 'translateY(-5%) scale(1.05)', opacity: 1, offset: 0.7 },
            { transform: 'none', opacity: 1 }
        ], { duration: 380, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' }), 380);

        // 2. The letter lights up in its hands
        await done(letter.animate([
            { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1.3)', opacity: 1, offset: 0.6 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
        ], { duration: 260, easing: 'ease-out', fill: 'forwards' }), 260);
        await safety(160);

        // 3. Flies off up and towards the middle, wings beating, leaving sparks
        const dx = (window.innerWidth / 2 - cx) * 0.5 + 40;
        const dy = -(r.top + 60);
        img.animate([
            { transform: 'scaleX(1)' }, { transform: 'scaleX(0.86) translateY(-3%)' }, { transform: 'scaleX(1)' }
        ], { duration: 170, iterations: 4, easing: 'ease-in-out' });
        const flight = body.animate([
            { transform: 'none', opacity: 1 },
            { transform: `translate(${dx * 0.25}px, -30px) rotate(-5deg) scale(1)`, opacity: 1, offset: 0.25 },
            { transform: `translate(${dx}px, ${dy}px) rotate(-12deg) scale(0.45)`, opacity: 0 }
        ], { duration: 680, easing: 'cubic-bezier(0.5, 0, 0.75, 0.45)', fill: 'forwards' });
        const sparks = setInterval(() => spark(stage, body), 60);
        await done(flight, 680);
        clearInterval(sparks);
        await safety(120);
    } finally {
        stage.remove();
    }
}

function spark(stage, body) {
    const b = body.getBoundingClientRect();
    if (!b.width) return;
    const s = document.createElement('span');
    s.className = 'mascot-spark';
    s.style.left = (b.left + b.width * (0.3 + Math.random() * 0.4)) + 'px';
    s.style.top = (b.top + b.height * (0.55 + Math.random() * 0.3)) + 'px';
    stage.appendChild(s);
    const a = s.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: `translate(${(Math.random() - 0.5) * 30}px, ${18 + Math.random() * 20}px) scale(0)`, opacity: 0 }
    ], { duration: 520, easing: 'ease-out', fill: 'forwards' });
    a.onfinish = () => s.remove();
}

// --- The speech bubble with the link ---
let bubble = null;

function showBubble(url, btn) {
    closeBubble();
    bubble = document.createElement('div');
    bubble.className = 'mascot-bubble';
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-label', t('mascotAdminTitle'));
    bubble.innerHTML = `
        <button type="button" class="mascot-bubble-x" aria-label="${esc(t('closeLabel'))}"><i class="ph-bold ph-x"></i></button>
        <strong class="mascot-bubble-title">${esc(t('mascotAdminTitle'))}</strong>
        <p class="mascot-bubble-text">${esc(t('mascotAdminText'))}</p>
        <a class="mascot-bubble-go" href="${esc(url)}" target="_blank" rel="noopener">${esc(t('mascotAdminGo'))} <i class="ph-bold ph-arrow-right"></i></a>`;
    document.body.appendChild(bubble);

    // Above the phoenix button, its tail pointing at it, kept inside the screen
    const r = btn ? btn.getBoundingClientRect() : { left: window.innerWidth - 60, top: window.innerHeight - 100, width: 48 };
    const cx = r.left + r.width / 2;
    const bw = bubble.offsetWidth;
    const left = Math.max(12, Math.min(cx - bw + 40, window.innerWidth - bw - 12));
    bubble.style.left = left + 'px';
    bubble.style.bottom = (window.innerHeight - r.top + 14) + 'px';
    bubble.style.setProperty('--tail', Math.max(18, Math.min(bw - 18, cx - left)) + 'px');

    bubble.querySelector('.mascot-bubble-x').addEventListener('click', () => { if (window.playClick) window.playClick(); closeBubble(); });
    bubble.querySelector('.mascot-bubble-go').addEventListener('click', () => {
        if (window.playClick) window.playClick();
        setTimeout(closeBubble, 0); // after the browser has taken the link
    });
    // Focus goes to the link (not an input, so no phone keyboard pops up): Enter opens it, Escape closes
    bubble.querySelector('.mascot-bubble-go').focus({ preventScroll: true });
}

export function closeBubble() {
    if (!bubble) return;
    bubble.remove();
    bubble = null;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBubble(); });
document.addEventListener('pointerdown', (e) => {
    if (bubble && !e.target.closest('.mascot-bubble') && !e.target.closest('.mascot-btn')) closeBubble();
}, { capture: true });
document.addEventListener('codex:lang', closeBubble);

window.mascotToAdmin = mascotToAdmin;
window.preloadMascot = preloadMascot;
