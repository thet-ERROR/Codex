// js/modules/catalog.js
import { state } from '../state.js';
import { esc, escUrl, formatPrice, priceCentsOf, stockState, stockLabel } from '../utils.js';

export function switchTab(mode) {
    // LAST CALL ('vault') was removed — its "coming soon" PCs now sit at the end of LIVE DROPS
    // (filterInv). A stale caller asking for it lands there instead of on an empty stage.
    if (mode === 'vault') mode = 'live';
    state.currentTab = mode;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-live', 'active-starter', 'active-vote', 'active-gear'));
    const tabBtn = document.getElementById(`tab-${mode}`);
    if (tabBtn) tabBtn.classList.add(`active-live`);

    ['carousel-wrapper', 'starter-menu', 'gear-view', 'vote-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const backBtn = document.getElementById('back-to-packs-btn');
    if (backBtn) backBtn.classList.add('hidden');

    const label = document.getElementById('stage-label');
    if (mode === 'vote') { 
        document.getElementById('vote-view').classList.remove('hidden');
        if (label) label.innerText = "// COMMUNITY VOTE //";
        // Fresh count, and the unlock sequence if one is waiting to be seen (vote.js)
        if (window.onVoteTabShown) window.onVoteTabShown();
    } else if (mode === 'starter') { 
        document.getElementById('starter-menu').classList.remove('hidden'); 
        if (label) label.innerText = "// STARTER PACKS //"; 
    } else if (mode === 'gear') { 
        document.getElementById('gear-view').classList.remove('hidden'); 
        if (label) label.innerText = "// ARMORY //"; 
    } else { 
        document.getElementById('carousel-wrapper').classList.remove('hidden'); 
        if (label) label.innerText = "// SYSTEM SELECT //"; 
        filterInv(); 
    } 
}

export function selectPack(cat) {
    document.getElementById('starter-menu').classList.add('hidden');
    document.getElementById('carousel-wrapper').classList.remove('hidden');
    const backBtn = document.getElementById('back-to-packs-btn');
    if (backBtn) backBtn.classList.remove('hidden');
    state.filtered = state.inventory.filter(p => p.category === cat);
    state.index = 0;
    renderCard();
}

export function backToPacks() {
    document.getElementById('carousel-wrapper').classList.add('hidden');
    document.getElementById('starter-menu').classList.remove('hidden');
    const backBtn = document.getElementById('back-to-packs-btn');
    if (backBtn) backBtn.classList.add('hidden');
}

export function filterInv() { 
    state.filtered = state.inventory.filter(p => {
        if (state.currentTab === 'live') return p.category === 'drop' || !p.category;
        return true;
    });
    // What can be bought now comes first, coming-soon builds last. sort() is stable, so the admin's
    // own order is kept within each group.
    state.filtered.sort((a, b) => (a.status === 'coming') - (b.status === 'coming'));
    state.index = 0; 
    renderCard(); 
}

export function nextPC() { 
    if (state.filtered.length) { 
        state.index = (state.index + 1) % state.filtered.length; 
        renderCard(); 
    } 
}

export function prevPC() { 
    if (state.filtered.length) { 
        state.index = (state.index - 1 + state.filtered.length) % state.filtered.length; 
        renderCard(); 
    } 
}

export function renderCard() { 
    const c = document.getElementById('main-card'); 
    if (!c) return;
    updateSwipeHint(); // before the early return, so an empty list hides it too
    renderDots();
    if (!state.filtered.length) {
        c.innerHTML = "<h3>NO SIGNAL</h3>";
        return;
    }

    const pc = state.filtered[state.index];
    const inCompare = state.compareList.find(p => p._id === pc._id); 
    // 'last' (exactly one unit) blinks red — see .stock-badge.last in stage.css
    const stockHTML = `<div class="stock-badge ${stockState(pc)}">${esc(stockLabel(pc))}</div>`;
    // (FPS bars used to be built here too, but were never placed in the card — FPS lives in INSPECT.)

    const isGreek = (localStorage.getItem('codex_lang') || 'en') === 'el';
    const loreFallback = window.t ? window.t('loreFallback') : "Σύστημα τακτικών επιχειρήσεων. Οι πλήρεις προδιαγραφές βρίσκονται στον φάκελο INSPECT. Απαιτείται εξουσιοδότηση.";
    const pcLore = (isGreek && pc.loreEl) ? pc.loreEl : (pc.lore || loreFallback);
    const inWishlist = state.wishlist.find(p => (p._id || p.id) === (pc._id || pc.id));
    const wishColor = inWishlist ? "var(--neon-green)" : "#555";

    const pcId = esc(pc._id || pc.id);
    c.innerHTML = `
        <div class="holo-card-inner">
            <div class="hero-img-frame" onclick="openGallery()" style="cursor:pointer;"><img src="${escUrl(pc.images && pc.images[0]) || 'assets/images/bg.jpg'}" class="hero-img"></div>
            <button onclick="toggleWishlist('${pcId}')" style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.7); border:1px solid ${wishColor}; color:${wishColor}; border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; cursor:pointer; z-index:10; transition:all 0.3s;">
                <i class="ph-bold ph-crosshair" style="font-size:1.3rem;"></i>
            </button>
            ${stockHTML}${pc.communityDrop ? `<div class="community-badge"><i class="ph-fill ph-users-three"></i> ${esc(window.t ? window.t('communityDropBadge') : 'COMMUNITY DROP')}</div>` : ''}
            <div class="pc-title">${esc(pc.name)}</div>
            <div class="card-price-row">
                <div class="pc-price">${formatPrice(priceCentsOf(pc))}</div>
            </div>

            <div class="sys-brief">
                <div class="sys-brief-title">${esc(window.t ? window.t('classifiedBrief') : '>// CLASSIFIED_BRIEF')}</div>
                <div class="sys-brief-text">${esc(pcLore)}</div>
                <button type="button" class="sys-brief-more hidden">${esc(window.t ? window.t('briefMore') : 'more')}</button>
            </div>

            <button class="btn-card-inspect" onclick="openGallery()">${esc(window.t ? window.t('inspectSystemBtn') : 'INSPECT SYSTEM')}</button>
            <button class="btn-card-compare ${inCompare ? 'selected' : ''}" onclick="toggleCompare('${pcId}', this)">
                ${esc(inCompare ? (window.t ? window.t('addedToVs') : 'ADDED TO VS') : (window.t ? window.t('compareBtn') : 'COMPARE'))}
            </button>
        </div>
    `;
    
    // On phones the brief is clamped to 3 lines (mobile.css) so INSPECT SYSTEM isn't pushed under the
    // bottom bar. The toggle only appears when the clamp actually cut something — short lore, or any
    // desktop layout (no clamp there), never shows it.
    const briefText = c.querySelector('.sys-brief-text');
    const briefMore = c.querySelector('.sys-brief-more');
    if (briefText && briefMore) {
        const t = window.t || (k => k);
        briefMore.classList.toggle('hidden', briefText.scrollHeight <= briefText.clientHeight + 1);
        briefMore.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const brief = briefMore.closest('.sys-brief');
            const open = brief.classList.toggle('expanded');
            briefMore.textContent = open ? t('briefLess') : t('briefMore');
        });
    }

    preloadNeighbours();
}

// The next swipe lands on a photo that's already downloaded and decoded, instead of an empty frame that
// pops in a moment after the card slides.
function preloadNeighbours() {
    const n = state.filtered.length;
    if (n < 2) return;
    [1, -1].forEach(step => {
        const src = state.filtered[(state.index + step + n) % n]?.images?.[0];
        // escUrl is the "is this a safe URL" check; the raw value is what the browser should fetch
        // (its output is HTML-escaped, which would mangle a `&` in a query string)
        // decode() also does the decoding up front, off the frame where the card swaps in
        if (src && escUrl(src)) { const img = new Image(); img.src = src; img.decode().catch(() => {}); }
    });
}

// One pill per PC under the card; the current one is lit. Built once per list length and then only the
// highlight moves, so the pill widens smoothly instead of the row being rebuilt on every swipe.
function renderDots() {
    const box = document.getElementById('pc-dots');
    if (!box) return;
    const n = state.filtered.length;
    box.classList.toggle('hidden', n < 2);
    if (n < 2) return;
    if (box.children.length !== n) box.innerHTML = '<span class="pc-dot"></span>'.repeat(n);
    for (let i = 0; i < n; i++) box.children[i].classList.toggle('active', i === state.index);
}

// --- SWIPE BETWEEN PCs ---
// Swiping the card is what people try first on a phone; arrows (and ←/→ keys) do the same on desktop.
// The card follows the finger 1:1 from the first few pixels, and on release it either flies off — from
// exactly where the finger left it — or springs back. A mostly-vertical gesture is a page scroll and is
// left alone; listeners are passive, so they never delay scrolling. A browser suppresses the click on
// release after a drag like this, so INSPECT/wishlist taps aren't triggered by accident.
const SWIPE_LEARNED_KEY = 'codex_swipe_learned';
const LOCK_PX = 8;              // movement needed before deciding "sideways drag" vs "page scroll"
const COMMIT_RATIO = 0.22;      // dragged past this share of the card's width → go to the next PC
const COMMIT_VELOCITY = 0.45;   // px/ms — a quick flick commits even when it's short
const THROW_MS = 260;           // old card flying off
const RISE_MS = 300;            // new card settling in underneath
const SPRING_MS = 280;          // cancelled drag returning to centre
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.3, 1)';
let drag = null;

// The phone-only "swipe" hint (index.html, styled in mobile.css) teaches a gesture — once someone
// has swiped, it has done its job and would only be clutter. Also pointless with nothing to swipe to.
function updateSwipeHint() {
    const hint = document.getElementById('swipe-hint');
    if (!hint) return;
    let learned = false;
    try { learned = localStorage.getItem(SWIPE_LEARNED_KEY) === '1'; } catch (e) {}
    hint.classList.toggle('hidden', learned || state.filtered.length < 2);
}

// --- DECK TRANSITION ---
// Moving to another PC plays like dealing from a deck: a snapshot of the old card is laid on top and
// thrown off to the side, tilting and fading, while the new card rises from just underneath it.
// Web Animations (element.animate) rather than CSS classes, because a throw has to start from wherever
// the finger left the card — a value only known at that moment. Only transform and opacity move, so
// the GPU runs it without repainting anything.
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

// The card leans the way it's dragged: ~10° at a full card width, like a card held at the bottom
const pose = (x, width) => `translate3d(${x}px, 0, 0) rotate(${(x / (width || 1)) * 10}deg)`;

function stopCardAnimations(card) {
    if (card.getAnimations) card.getAnimations().forEach(a => a.cancel());
}

function throwGhost(card, dir, fromX, velocity) {
    const col = card.parentElement;
    if (!col || !card.firstElementChild) return; // nothing rendered yet
    // At most two in flight: a third quick swipe drops the oldest instead of stacking snapshots
    const flying = col.querySelectorAll('.card-ghost');
    if (flying.length > 1) flying[0].remove();

    const w = card.offsetWidth;
    // The wrapper carries the motion and the fade; the clone inside just looks like the card. (The
    // clone is a .holo-card, and fading it directly would fight that class's styling.)
    const ghost = document.createElement('div');
    ghost.className = 'card-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    Object.assign(ghost.style, {
        width: w + 'px', height: card.offsetHeight + 'px',
        left: card.offsetLeft + 'px', top: card.offsetTop + 'px'
    });
    const face = card.cloneNode(true);
    face.removeAttribute('id');
    face.removeAttribute('style'); // drop the drag transform — the wrapper holds the pose now
    face.className = 'holo-card';
    // .holo-card's padding differs from #main-card's on some layouts (tablet.css) — copy the real one
    // so the snapshot's content doesn't shift at the moment it replaces the card
    face.style.padding = getComputedStyle(card).padding;
    ghost.appendChild(face);
    col.appendChild(ghost);

    const endX = -dir * w * 1.15;
    // A fast flick keeps its speed instead of slowing to the fixed duration
    const speed = Math.abs(velocity);
    const duration = speed > 0.6 ? Math.max(160, Math.min(THROW_MS, Math.abs(endX - fromX) / speed)) : THROW_MS;
    const anim = ghost.animate([
        { transform: pose(fromX, w), opacity: 1 },
        { transform: `translate3d(${endX}px, 18px, 0) rotate(${(endX / w) * 10}deg)`, opacity: 0 }
    ], { duration, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'forwards' });
    const done = () => ghost.remove();
    anim.onfinish = done;
    anim.oncancel = done;
    setTimeout(done, duration + 400); // safety net if the tab is hidden mid-flight
}

// dir > 0: next PC (finger moved left / right arrow), dir < 0: previous one. fromX/velocity come from
// a drag, so the throw continues the finger's motion; the arrows and keys throw from rest.
export function swipeCard(dir, fromX = 0, velocity = 0) {
    const card = document.getElementById('main-card');
    if (!card || state.filtered.length < 2) return;
    stopCardAnimations(card);
    const animate = !REDUCED_MOTION.matches;
    if (animate) throwGhost(card, dir, fromX, velocity);
    card.style.transform = '';
    card.classList.remove('dragging');
    if (dir > 0) nextPC(); else prevPC();
    if (!animate) return;
    card.animate([
        { transform: 'translate3d(0, 12px, 0) scale(0.94)', opacity: 0.35 },
        { transform: 'none', opacity: 1 }
    ], { duration: RISE_MS, easing: EASE_OUT });
}

function springBack(card, fromX, width) {
    card.style.transform = '';
    card.classList.remove('dragging');
    if (!fromX || REDUCED_MOTION.matches) return;
    // A touch of overshoot so it settles like something physical, not a snap
    card.animate([{ transform: pose(fromX, width) }, { transform: 'none' }],
        { duration: SPRING_MS, easing: 'cubic-bezier(0.3, 1.35, 0.5, 1)' });
}

function initCardSwipe() {
    const wrapper = document.getElementById('carousel-wrapper');
    if (!wrapper) return;

    wrapper.addEventListener('touchstart', (e) => {
        const card = document.getElementById('main-card');
        if (e.touches.length !== 1 || state.filtered.length < 2 || !card) { drag = null; return; }
        const t = e.touches[0];
        drag = { card, x0: t.clientX, y0: t.clientY, dx: 0, locked: false, lastX: t.clientX, lastT: e.timeStamp, v: 0, scale: 1, width: 0, raf: 0 };
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
        const d = drag;
        if (!d) return;
        const t = e.touches[0];
        const dx = t.clientX - d.x0, dy = t.clientY - d.y0;
        if (!d.locked) {
            if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
            if (Math.abs(dy) >= Math.abs(dx)) { drag = null; return; } // a page scroll — not ours
            d.locked = true;
            // Measured once per gesture. On phones mobile.css scales the carousel to 0.85, so a finger
            // move of N screen px is N / 0.85 card px — dividing keeps the card exactly under the finger.
            d.width = d.card.offsetWidth;
            d.scale = (d.card.getBoundingClientRect().width / d.width) || 1;
            stopCardAnimations(d.card); // grabbing a card that is still rising freezes it in place
            d.card.classList.add('dragging');
            const hint = document.getElementById('swipe-hint');
            if (hint) hint.classList.add('hidden');
        }
        // Velocity, weighted towards the latest movement, for flick detection on release
        const dt = e.timeStamp - d.lastT;
        if (dt > 0) d.v = 0.8 * ((t.clientX - d.lastX) / dt) + 0.2 * d.v;
        d.lastX = t.clientX;
        d.lastT = e.timeStamp;
        d.dx = dx / d.scale;
        // One style write per frame, however many touchmove events arrive in it
        if (!d.raf) d.raf = requestAnimationFrame(() => {
            d.raf = 0;
            if (drag === d) d.card.style.transform = pose(d.dx, d.width);
        });
    }, { passive: true });

    const release = (e) => {
        const d = drag;
        drag = null;
        if (!d || !d.locked) return;
        cancelAnimationFrame(d.raf);
        // A finger that stopped before lifting has no flick left in it
        const v = (e.timeStamp - d.lastT > 80) ? 0 : d.v / d.scale;
        const far = Math.abs(d.dx) > d.width * COMMIT_RATIO;
        const flick = Math.abs(v) > COMMIT_VELOCITY && Math.sign(v) === Math.sign(d.dx) && Math.abs(d.dx) > 12;
        if (e.type === 'touchend' && (far || flick)) {
            if (window.playClick) window.playClick();
            try { localStorage.setItem(SWIPE_LEARNED_KEY, '1'); } catch (err) {}
            swipeCard(d.dx < 0 ? 1 : -1, d.dx, v);
        } else {
            springBack(d.card, d.dx, d.width);
            updateSwipeHint(); // a cancelled drag hasn't taught the gesture yet
        }
    };
    wrapper.addEventListener('touchend', release, { passive: true });
    wrapper.addEventListener('touchcancel', release, { passive: true });
}
initCardSwipe();

// ←/→ on desktop, when the PC carousel is what's on screen. Not while typing (terminal, forms), not
// over a modal or the inspect card, and not during the tour — driver.js uses the arrows to step.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    if (document.body.classList.contains('ui-locked') || document.body.classList.contains('driver-active')) return;
    const wrapper = document.getElementById('carousel-wrapper');
    if (!wrapper || wrapper.classList.contains('hidden') || state.filtered.length < 2) return;
    e.preventDefault();
    if (window.playClick) window.playClick();
    swipeCard(e.key === 'ArrowRight' ? 1 : -1);
});

// Εξαγωγή στο window
window.switchTab = switchTab;
window.selectPack = selectPack;
window.backToPacks = backToPacks;
window.filterInv = filterInv;
window.nextPC = nextPC;
window.prevPC = prevPC;
window.renderCard = renderCard;
window.swipeCard = swipeCard;