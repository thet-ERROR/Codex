// js/modules/catalog.js
import { state } from '../state.js';
import { esc, escUrl, formatPrice, priceCentsOf, stockState, stockLabel, membersOnlyActive, formatShortDateTime, PACK_ICONS } from '../utils.js';

// --- STAGE HEADING ---
// The title over the card: a >// kicker in the terminal's voice, a translated title, and how many PCs
// are in this list. It used to be a hardcoded English "// SYSTEM SELECT //" on every tab.
// Rebuilt on every tab/pack switch, list change and language switch (applyLanguage → renderCard).
let stageView = { kind: 'live', pack: null };

const PACK_KEYS = { gaming: 'packGaming', streaming: 'packStreaming', coding: 'packCoding' };

export function renderStageHeading() {
    const t = window.t || (k => k);
    const kicker = document.getElementById('stage-kicker');
    const title = document.getElementById('stage-label');
    const count = document.getElementById('stage-count');
    if (!title) return;
    const { kind, pack } = stageView;
    const packName = pack ? t(PACK_KEYS[pack] || pack) : '';
    const view = {
        live:    { k: 'LIVE_DROPS',     title: t('stageLive') },
        starter: { k: 'STARTER_PACKS',  title: t('stageStarter') },
        pack:    { k: 'STARTER_PACKS / ' + String(pack || '').toUpperCase(), title: t('stagePack', { pack: packName }) },
        vote:    { k: 'COMMUNITY_VOTE', title: t('stageVote') },
        gear:    { k: 'ARMORY',         title: t('armoryLocked') }
    }[kind] || { k: '', title: '' };
    if (kind === 'starter') renderPackCounts();
    if (kicker) kicker.textContent = view.k.replace(/_/g, ' ');
    title.textContent = view.title;
    if (count) {
        // Only where a list of PCs is on screen
        const n = state.filtered.length;
        const show = (kind === 'live' || kind === 'pack') && n > 0;
        count.classList.toggle('hidden', !show);
        if (show) count.textContent = n === 1 ? t('stageCountOne') : t('stageCountMany', { n });
    }
    // Active budget filter: a chip you can dismiss, shown even when it matched nothing
    const chip = document.getElementById('stage-filter');
    if (chip) {
        const on = priceFilter && kind === 'live';
        chip.classList.toggle('hidden', !on);
        if (on) chip.querySelector('span').textContent = priceLabel();
    }
}

// "3 systems" on each pack tile, so nobody opens an empty pack
function renderPackCounts() {
    const t = window.t || (k => k);
    document.querySelectorAll('[data-pack-count]').forEach(el => {
        const n = state.inventory.filter(p => p.category === el.dataset.packCount).length;
        el.textContent = n === 0 ? t('packSoon') : (n === 1 ? t('stageCountOne') : t('stageCountMany', { n }));
        el.classList.toggle('empty', n === 0);
    });
}

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

    if (mode === 'vote') {
        document.getElementById('vote-view').classList.remove('hidden');
        stageView = { kind: 'vote', pack: null };
        // Fresh count, and the unlock sequence if one is waiting to be seen (vote.js)
        if (window.onVoteTabShown) window.onVoteTabShown();
    } else if (mode === 'starter') {
        document.getElementById('starter-menu').classList.remove('hidden');
        stageView = { kind: 'starter', pack: null };
    } else if (mode === 'gear') {
        document.getElementById('gear-view').classList.remove('hidden');
        stageView = { kind: 'gear', pack: null };
    } else {
        document.getElementById('carousel-wrapper').classList.remove('hidden');
        stageView = { kind: 'live', pack: null };
        filterInv();
    }
    renderStageHeading();
}

export function selectPack(cat) {
    document.getElementById('starter-menu').classList.add('hidden');
    document.getElementById('carousel-wrapper').classList.remove('hidden');
    const backBtn = document.getElementById('back-to-packs-btn');
    if (backBtn) backBtn.classList.remove('hidden');
    state.filtered = state.inventory.filter(p => p.category === cat);
    state.index = 0;
    stageView = { kind: 'pack', pack: cat };
    renderCard();
}

export function backToPacks() {
    document.getElementById('carousel-wrapper').classList.add('hidden');
    document.getElementById('starter-menu').classList.remove('hidden');
    const backBtn = document.getElementById('back-to-packs-btn');
    if (backBtn) backBtn.classList.add('hidden');
    stageView = { kind: 'starter', pack: null };
    renderStageHeading();
}

// Price filter for LIVE DROPS, set by the help assistant's budget choices (chat.js). Euro bounds;
// max null = no ceiling. The heading shows it as a chip with ✕, so it's never a hidden state.
let priceFilter = null;

export function setPriceFilter(minEuro, maxEuro) {
    priceFilter = { min: minEuro || 0, max: maxEuro || null };
    stageView = { kind: 'live', pack: null };
    switchTab('live');
}

export function clearPriceFilter() {
    priceFilter = null;
    if (state.currentTab === 'live') switchTab('live');
}

function priceLabel() {
    const t = window.t || (k => k);
    const { min, max } = priceFilter;
    if (!min && max) return t('budgetUnder', { max });
    if (min && !max) return t('budgetOver', { min });
    return `€${min} – €${max}`;
}

export function filterInv() {
    state.filtered = state.inventory.filter(p => {
        if (state.currentTab === 'live') {
            if (!(p.category === 'drop' || !p.category)) return false;
            if (priceFilter) {
                const euros = priceCentsOf(p) / 100;
                if (euros < priceFilter.min || (priceFilter.max && euros > priceFilter.max)) return false;
            }
            return true;
        }
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


// The wishlist target on the card. toggleWishlist (wishlist.js) rebuilds the card, so the id is noted
// for that one render: the fresh button comes out spinning, and lit if it's now on the list.
let wishJustToggled = null;
export function cardWish(id) {
    wishJustToggled = id;
    try { if (window.toggleWishlist) window.toggleWishlist(id); }
    finally { wishJustToggled = null; }
}

export function renderCard() {
    const c = document.getElementById('main-card'); 
    if (!c) return;
    updateSwipeHint(); // before the early return, so an empty list hides it too
    renderDots();
    renderStageHeading(); // count + language
    if (!state.filtered.length) {
        // An empty list says so in the visitor's language, inside the card frame
        const t = window.t || (k => k);
        c.innerHTML = `<div class="tc-face"><div class="card-empty"><i class="ph-duotone ph-cpu"></i><div>${esc(t('stageEmpty'))}</div>${priceFilter ? `<button type="button" class="card-empty-btn" onclick="clearPriceFilter()">${esc(t('budgetClear'))}</button>` : ''}</div></div>`;
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
    const rawId = pc._id || pc.id;
    const inWishlist = state.wishlist.some(p => (p._id || p.id) === rawId);
    // The target spins when it was just pressed (cardWish below) — the card is rebuilt by the toggle,
    // so the new button is the one that has to carry the spin
    const wishSpin = wishJustToggled === rawId ? ' spin' : '';

    const pcId = esc(rawId);
    // The card is a collectible, laid out like a trading card (css/components/tcg-card.css): a title
    // bar with the name and a badge for the kind of build, the photo as a window, a type line with the
    // stock and the price, the brief as the text box, and the two buttons at the bottom.
    const nPhotos = (pc.images || []).length;
    c.innerHTML = `
        <div class="tc-face">
            <i class="tc-orn tc-o1"></i><i class="tc-orn tc-o2"></i><i class="tc-orn tc-o3"></i><i class="tc-orn tc-o4"></i>
            <div class="tc-title">
                <span class="tc-name">${esc(pc.name)}</span>
                <span class="tc-attr"><i class="ph-fill ${PACK_ICONS[pc.category] || PACK_ICONS.drop}"></i></span>
            </div>
            <div class="tc-art" onclick="openGallery()">
                <img src="${escUrl(pc.images && pc.images[0]) || 'assets/images/bg.jpg'}" class="tc-img" alt="">
                ${nPhotos > 1 ? `<span class="hero-photos" aria-hidden="true"><i class="ph-bold ph-images"></i> ${nPhotos}</span>` : ''}
                <button type="button" class="card-wish${inWishlist ? ' on' : ''}${wishSpin}" aria-pressed="${inWishlist}" aria-label="Wishlist" onclick="event.stopPropagation(); cardWish('${pcId}')"><i class="ph-bold ph-crosshair"></i></button>
            </div>
            <div class="tc-type">
                <div class="tc-row">${stockHTML}<div class="tc-price">${formatPrice(priceCentsOf(pc))}</div></div>
                ${(pc.communityDrop || membersOnlyActive(pc)) ? `<div class="tc-flags">${pc.communityDrop ? `<div class="community-badge"><i class="ph-fill ph-users-three"></i> ${esc(window.t ? window.t('communityDropBadge') : 'COMMUNITY DROP')}</div>` : ''}${membersOnlyActive(pc) ? `<div class="members-badge"><i class="ph-fill ph-lock-key"></i> ${esc(window.t ? window.t('membersOnlyBadge', { until: formatShortDateTime(pc.membersOnlyUntil) }) : 'MEMBERS FIRST')}</div>` : ''}</div>` : ''}
            </div>
            <div class="tc-brief">
                <div class="tc-brief-title">${esc(window.t ? window.t('classifiedBrief') : '>// CLASSIFIED_BRIEF')}</div>
                <div class="tc-brief-text">${esc(pcLore)}</div>
                <button type="button" class="tc-brief-more hidden">${esc(window.t ? window.t('briefMore') : 'more')}</button>
            </div>
            <!-- The VS strip (compare.js updateCompareFloat): inside the card, between the brief and the buttons, so it can
                 never cover them. One PC picked: "half" — a lit slot and an empty one with a + ("add one more"); two: ready. -->
            <div class="compare-float ${state.compareList.length === 2 ? 'active' : state.compareList.length === 1 ? 'half' : ''}" id="compare-float" role="button" tabindex="0" onclick="playClick(); openCompareModal()">
                <span class="cf-slot cf-a"><i class="ph-bold ph-scales"></i></span>
                <span class="cf-label cf-ready">${esc(window.t ? window.t('vsModeReady') : 'VS MODE READY')}</span>
                <span class="cf-label cf-wait">${esc(window.t ? window.t('vsHalf') : '1/2 · ADD ONE MORE')}</span>
                <span class="cf-slot cf-b"><i class="ph-bold ph-plus"></i></span>
            </div>
            <div class="tc-actions">
                <button class="btn-card-inspect" onclick="openGallery()">${esc(window.t ? window.t('inspectSystemBtn') : 'INSPECT SYSTEM')}</button>
                <button class="btn-card-compare ${inCompare ? 'selected' : ''}" onclick="toggleCompare('${pcId}', this)">${esc(inCompare ? (window.t ? window.t('addedToVs') : 'ADDED TO VS') : (window.t ? window.t('compareBtn') : 'COMPARE'))}</button>
            </div>
        </div>
        <i class="tc-holo" aria-hidden="true"></i>
    `;

    // The brief is clamped to 3 lines so the card keeps its proportions. The toggle only appears when
    // the clamp actually cut something; opening it lets the card grow.
    const briefText = c.querySelector('.tc-brief-text');
    const briefMore = c.querySelector('.tc-brief-more');
    if (briefText && briefMore) {
        const t = window.t || (k => k);
        briefMore.classList.toggle('hidden', briefText.scrollHeight <= briefText.clientHeight + 1);
        briefMore.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const brief = briefMore.closest('.tc-brief');
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
// Kept quiet on purpose: the change of PC should feel like a soft slide, not a show — a small lean,
// a short throw, and a new card that is almost already in place when it appears.
const THROW_MS = 200;           // old card flying off
const RISE_MS = 220;            // new card settling in underneath
const SPRING_MS = 260;          // cancelled drag returning to centre
const TILT_DEG = 4;             // lean at a full card width of drag
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

// The card leans the way it's dragged (TILT_DEG at a full card width), like a card held at the bottom
const pose = (x, width) => `translate3d(${x}px, 0, 0) rotate(${(x / (width || 1)) * TILT_DEG}deg)`;

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
    const duration = speed > 0.6 ? Math.max(140, Math.min(THROW_MS, Math.abs(endX - fromX) / speed)) : THROW_MS;
    const anim = ghost.animate([
        { transform: pose(fromX, w), opacity: 1 },
        { transform: `translate3d(${endX}px, 6px, 0) rotate(${(endX / w) * TILT_DEG}deg)`, opacity: 0 }
    ], { duration, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'forwards' });
    const done = () => ghost.remove();
    anim.onfinish = done;
    anim.oncancel = done;
    setTimeout(done, duration + 400); // safety net if the tab is hidden mid-flight
}

// dir > 0: next PC (finger moved left / right arrow), dir < 0: previous one. fromX/velocity come from
// a drag, so the throw continues the finger's motion; the arrows and keys throw from rest.
//
// The work is split across frames. In the frame the gesture ends only cheap things happen: the old
// card is snapshotted and its throw starts (a compositor animation — once started it runs on the GPU
// whatever the main thread is doing), the pills move, and the real card is hidden under the
// snapshot. Building the new card (innerHTML, layout, image decode, raster) waits two frames.
// Doing it all in one frame is what cost a visible hitch on phones; a fast desktop never showed it.
let pendingRender = 0;

function finishPendingRender() {
    if (!pendingRender) return;
    cancelAnimationFrame(pendingRender);
    pendingRender = 0;
    showNewCard(false);
}

function showNewCard(animate) {
    const card = document.getElementById('main-card');
    renderCard();
    if (!card) return;
    card.style.opacity = '';
    if (!animate) return;
    card.animate([
        { transform: 'translate3d(0, 4px, 0) scale(0.98)', opacity: 0.8 },
        { transform: 'none', opacity: 1 }
    ], { duration: RISE_MS, easing: EASE_OUT });
}

export function swipeCard(dir, fromX = 0, velocity = 0) {
    const card = document.getElementById('main-card');
    const n = state.filtered.length;
    if (!card || n < 2) return;
    // A second swipe before the last one finished building: build it now, so the snapshot is of the
    // card actually on screen
    finishPendingRender();
    stopCardAnimations(card);
    card.style.transform = '';
    card.classList.remove('dragging');
    state.index = (state.index + (dir > 0 ? 1 : -1) + n) % n;

    if (REDUCED_MOTION.matches) { renderCard(); return; }
    throwGhost(card, dir, fromX, velocity);
    card.style.opacity = '0';
    renderDots(); // the pill moves at once — the one thing that should answer instantly
    pendingRender = requestAnimationFrame(() => {
        pendingRender = requestAnimationFrame(() => {
            pendingRender = 0;
            showNewCard(true);
        });
    });
}

function springBack(card, fromX, width) {
    card.style.transform = '';
    card.classList.remove('dragging');
    if (!fromX || REDUCED_MOTION.matches) return;
    // A touch of overshoot so it settles like something physical, not a snap
    card.animate([{ transform: pose(fromX, width) }, { transform: 'none' }],
        { duration: SPRING_MS, easing: 'cubic-bezier(0.3, 1.2, 0.5, 1)' });
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
        // Once the gesture is a sideways drag, keep the page still under it — including on the very
        // event that decided it — otherwise vertical drift of the thumb also scrolled the page and the
        // card wobbled diagonally
        if (e.cancelable) e.preventDefault();
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
    // Not passive: it has to be able to stop the page scrolling during a sideways drag (above). It
    // only ever does that after the drag has locked sideways, so a vertical scroll that starts on the
    // card is never held back, and the handler is a few arithmetic operations.
    }, { passive: false });

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

// --- HOLO TILT (desktop) ---
// With a mouse, the card leans towards the pointer and a holographic sheen in the accent colour slides
// across it (.tc-holo, tcg-card.css) — a collectible caught in the light. Only where there's a real
// hover and a fine pointer: on a phone the same finger swipes the card, and the two would fight.
// The lean uses the separate `rotate` property, not `transform`, so it composes with the deck
// transition and the INSPECT morph (both animate `transform`) instead of being overwritten by them.
const TILT_MAX_DEG = 8;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)');

function initCardTilt() {
    const card = document.getElementById('main-card');
    if (!card) return;
    let raf = 0, last = null;

    const apply = () => {
        raf = 0;
        if (!last) return;
        const r = card.getBoundingClientRect();
        if (!r.width) return;
        const nx = Math.max(-1, Math.min(1, ((last.x - r.left) / r.width) * 2 - 1));
        const ny = Math.max(-1, Math.min(1, ((last.y - r.top) / r.height) * 2 - 1));
        const mag = Math.min(1, Math.hypot(nx, ny));
        // Axis (-ny, nx): pointer on the right → right edge goes away, pointer at the top → top goes away
        card.style.rotate = mag > 0.02 ? `${(-ny).toFixed(3)} ${nx.toFixed(3)} 0 ${(mag * TILT_MAX_DEG).toFixed(2)}deg` : '';
        card.style.setProperty('--mx', `${((nx + 1) * 50).toFixed(1)}%`);
        card.style.setProperty('--my', `${((ny + 1) * 50).toFixed(1)}%`);
        card.classList.add('tilting');
    };
    const reset = () => {
        last = null;
        cancelAnimationFrame(raf); raf = 0;
        card.classList.remove('tilting');
        card.style.rotate = '';
    };

    card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !FINE_POINTER.matches || REDUCED_MOTION.matches || state.filtered.length === 0) return;
        last = { x: e.clientX, y: e.clientY };
        if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener('pointerleave', reset);
    // Straight before INSPECT measures the card for its morph, and before a click does anything else
    card.addEventListener('pointerdown', reset);
}
initCardTilt();

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
window.renderStageHeading = renderStageHeading;
window.setPriceFilter = setPriceFilter;
window.clearPriceFilter = clearPriceFilter;
window.swipeCard = swipeCard;
window.cardWish = cardWish;