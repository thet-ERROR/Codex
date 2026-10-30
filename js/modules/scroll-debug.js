// js/modules/scroll-debug.js
// Diagnostic only — main.js loads this when the URL ends in ?debug=scroll, never for visitors.
//
// Hunts the iPhone bug where a swipe at the bottom of the page throws it up to the middle. A small
// panel shows, every frame, where the page stands (y), how tall it is (H), the window height (vh),
// the visual viewport (vv: height/offset — moves when Safari shows or hides its toolbar) and the
// card's height. When the page moves by more than JUMP_PX during a gesture that wasn't a vertical
// scroll (a swipe or a tap), it freezes a JUMP report: from where to where, how long after the finger
// lifted, which of those numbers changed at that moment, and what happened just before — card
// rebuilt, snapshot thrown, a resize, or a script calling scrollTo / scrollIntoView / focus (with the
// file and line that called it). COPY puts the full log on the clipboard to paste into the chat.

const JUMP_PX = 40;        // page moved this far during a non-vertical gesture → a jump
const FRAMES_KEPT = 240;   // ~4 s at 60 fps
const EVENTS_KEPT = 60;

const frames = [];
const events = [];
const jumps = [];
let gesture = null;        // { x0, y0, kind: 'tap' | 'side' | 'vert', base: scrollY at touchstart, startT, endT, flagged }

const now = () => Math.round(performance.now());

function sample() {
    const se = document.scrollingElement || document.documentElement;
    const vv = window.visualViewport;
    const card = document.getElementById('main-card');
    return {
        t: now(), y: Math.round(window.scrollY), H: se.scrollHeight, vh: window.innerHeight,
        vvh: vv ? Math.round(vv.height) : 0, vvt: vv ? Math.round(vv.offsetTop) : 0,
        card: card ? card.offsetHeight : 0
    };
}

function logEvent(msg) {
    events.push({ t: now(), msg });
    if (events.length > EVENTS_KEPT) events.shift();
}

// "fn@js/modules/catalog.js:520" — the first stack line outside this file
function caller() {
    const lines = (new Error().stack || '').split('\n').map(l => l.trim())
        .filter(l => l && l !== 'Error' && !l.includes('scroll-debug'));
    return (lines[0] || '?').replace(/https?:\/\/[^/]+\//, '').replace(/^at /, '').slice(0, 70);
}

// --- every way a script can move the page, reported with who called it ---
function wrap(owner, name, label, skip) {
    const original = owner[name];
    if (typeof original !== 'function') return;
    owner[name] = function (...args) {
        if (!skip || !skip(args)) logEvent(`${label}(${JSON.stringify(args[0] ?? '').slice(0, 40)}) by ${caller()}`);
        return original.apply(this, args);
    };
}
wrap(window, 'scrollTo', 'scrollTo');
wrap(window, 'scroll', 'scroll');
wrap(window, 'scrollBy', 'scrollBy');
wrap(Element.prototype, 'scrollIntoView', 'scrollIntoView');
// focus() scrolls the focused element into view unless told not to
wrap(HTMLElement.prototype, 'focus', 'focus', (args) => args[0] && args[0].preventScroll);

// --- the gesture ---
window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    gesture = { x0: t.clientX, y0: t.clientY, kind: 'tap', base: Math.round(window.scrollY), startT: now(), endT: 0, flagged: false };
    logEvent(`touchstart y=${gesture.base}`);
}, { passive: true, capture: true });

window.addEventListener('touchmove', (e) => {
    if (!gesture || gesture.kind !== 'tap') return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - gesture.x0), dy = Math.abs(t.clientY - gesture.y0);
    if (dx > 8 || dy > 8) {
        gesture.kind = dx > dy ? 'side' : 'vert';
        logEvent(`gesture = ${gesture.kind}`);
    }
}, { passive: true, capture: true });

const touchEnd = (e) => {
    if (!gesture) return;
    gesture.endT = now();
    logEvent(`${e.type} (${gesture.kind}) y=${Math.round(window.scrollY)}`);
};
window.addEventListener('touchend', touchEnd, { passive: true, capture: true });
window.addEventListener('touchcancel', touchEnd, { passive: true, capture: true });

window.addEventListener('resize', () => logEvent(`resize vh=${window.innerHeight}`));
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () =>
        logEvent(`vv resize h=${Math.round(window.visualViewport.height)}`));
}

// --- the card being rebuilt, the swipe snapshot appearing ---
function watchCard() {
    const wrapper = document.getElementById('carousel-wrapper');
    if (!wrapper) return;
    new MutationObserver((list) => {
        for (const m of list) {
            if (m.target.id === 'main-card') { logEvent('card rebuilt'); break; }
            if ([...m.addedNodes].some(n => n.classList && n.classList.contains('card-ghost'))) logEvent('ghost thrown');
        }
    }).observe(wrapper, { childList: true, subtree: true });
}

// --- jump detection ---
const FIELDS = ['H', 'vh', 'vvh', 'vvt', 'card'];

function checkJump(f) {
    const g = gesture;
    // A vertical scroll moves the page on purpose, momentum included — only swipes and taps count
    if (!g || g.kind === 'vert' || g.flagged || Math.abs(f.y - g.base) < JUMP_PX) return;
    g.flagged = true;
    const since = frames.filter(x => x.t >= g.startT);
    // The frame where the page first left its place, and the one before it
    const i = since.findIndex(x => Math.abs(x.y - g.base) > 1);
    const start = since[Math.max(0, i)] || f;
    const before = since[Math.max(0, i - 1)] || start;
    const changed = FIELDS.filter(k => before[k] !== start[k]).map(k => `${k} ${before[k]}→${start[k]}`);
    jumps.push({
        at: start.t,
        text: `JUMP ${g.base}→${f.y} (${f.y - g.base > 0 ? '+' : ''}${f.y - g.base}) during ${g.kind}`
            + (g.endT ? `, ${start.t - g.endT} ms after lift` : ', finger still down'),
        changed: changed.length ? changed.join(', ') : 'nothing else changed',
        events: events.filter(e => e.t >= g.startT - 50).map(e => `+${e.t - g.startT} ${e.msg}`),
        frames: since.slice(Math.max(0, i - 5), i + 15)
    });
    if (jumps.length > 3) jumps.shift();
}

// --- the panel ---
const panel = document.createElement('div');
panel.setAttribute('aria-hidden', 'true');
Object.assign(panel.style, {
    position: 'fixed', top: 'calc(env(safe-area-inset-top) + 4px)', left: '4px', right: '4px', zIndex: 2147483647,
    font: '10px/1.35 ui-monospace, Menlo, monospace', color: '#7CFC00', background: 'rgba(0, 0, 0, 0.86)',
    border: '1px solid #7CFC00', borderRadius: '6px', padding: '5px 6px', pointerEvents: 'none',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '45vh', overflow: 'hidden'
});
const text = document.createElement('div');
const buttons = document.createElement('div');
buttons.style.cssText = 'display:flex;gap:6px;margin-top:4px;pointer-events:auto';
const button = (label, onTap) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'font:inherit;font-weight:700;color:#000;background:#7CFC00;border:0;border-radius:4px;padding:4px 10px';
    b.addEventListener('click', () => onTap(b));
    buttons.appendChild(b);
};
button('COPY', async (b) => {
    try { await navigator.clipboard.writeText(report()); b.textContent = 'COPIED'; }
    catch (err) { b.textContent = 'COPY FAILED'; }
    setTimeout(() => { b.textContent = 'COPY'; }, 1500);
});
button('CLEAR', () => { jumps.length = 0; events.length = 0; });
panel.append(text, buttons);

const row = (f) => `y ${f.y}  H ${f.H}  vh ${f.vh}  vv ${f.vvh}/${f.vvt}  card ${f.card}`;

function report() {
    const out = [`scroll-debug  ${navigator.userAgent}`, `now: ${row(sample())}`, ''];
    if (!jumps.length) out.push('no jump recorded');
    for (const j of jumps) {
        out.push(j.text, `changed: ${j.changed}`, 'events:', ...j.events.map(e => '  ' + e), 'frames:',
            ...j.frames.map(f => `  +${f.t - j.at} ${row(f)}`), '');
    }
    return out.join('\n');
}

let paintedAt = 0;
function draw(f) {
    if (f.t - paintedAt < 100) return; // ten times a second is plenty to read
    paintedAt = f.t;
    const j = jumps[jumps.length - 1];
    const lines = [row(f), `gesture: ${gesture ? gesture.kind : '-'}   jumps: ${jumps.length}`];
    if (j) lines.push('', j.text, `changed: ${j.changed}`, ...j.events.slice(-8));
    else lines.push('', 'scroll to the bottom and swipe the card…');
    text.textContent = lines.join('\n');
}

function tick() {
    const f = sample();
    frames.push(f);
    if (frames.length > FRAMES_KEPT) frames.shift();
    checkJump(f);
    draw(f);
    requestAnimationFrame(tick);
}

function start() {
    document.body.appendChild(panel);
    watchCard();
    logEvent('scroll-debug on');
    requestAnimationFrame(tick);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
