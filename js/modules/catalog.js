// js/modules/catalog.js
import { state } from '../state.js';
import { esc, escUrl, formatPrice, priceCentsOf } from '../utils.js';

export function switchTab(mode) {
    state.currentTab = mode;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-live', 'active-vault', 'active-starter', 'active-vote', 'active-gear'));
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
        if (state.currentTab === 'live') return (p.category === 'drop' || !p.category) && p.status !== 'coming'; 
        if (state.currentTab === 'vault') return p.status === 'coming'; 
        return true;
    }); 
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
    if (!state.filtered.length) {
        c.innerHTML = "<h3>NO SIGNAL</h3>";
        return;
    }

    const pc = state.filtered[state.index];
    const inCompare = state.compareList.find(p => p._id === pc._id); 
    const stock = pc.stock || 0;
    
    let stockHTML = ''; 
    if (stock === 0) stockHTML = '<div class="stock-badge out">SOLD OUT</div>'; 
    else if (stock < 5) stockHTML = `<div class="stock-badge low">LOW STOCK: ${stock} UNITS</div>`; 
    else stockHTML = '<div class="stock-badge in">IN STOCK</div>'; 

    let fpsHTML = ''; 
    if (pc.multitasking) {
        fpsHTML += `<div class="fps-row"><span class="fps-name">MULTI</span><div class="bar-track"><div class="bar-fill" data-width="${pc.multitasking}%" style="width:0%"></div></div><span class="fps-num">${pc.multitasking}</span></div>`; 
    }
    if (pc.fps) {
        pc.fps.forEach(f => {
            let max = 200;
            if (f.game === 'Fortnite') max = 300;
            const score = Number(f.score) || 0;
            fpsHTML += `<div class="fps-row"><span class="fps-name">${esc(f.game)}</span><div class="bar-track"><div class="bar-fill" data-width="${Math.min((score/max)*100,100)}%" style="width:0%"></div></div><span class="fps-num">${score}</span></div>`;
        });
    }

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
            ${stockHTML}
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

    // Ξεκινάμε το animation στις μπάρες
    setTimeout(()=> {
        document.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.getAttribute('data-width'));
    }, 50); 
}

// --- SWIPE BETWEEN PCs ---
// Swiping the card is what people try first on a phone; the arrows stay as the visible hint and for
// desktop. Horizontal-only and deliberate: a mostly-vertical gesture is a page scroll, so it's left
// alone, and passive listeners mean this never delays scrolling. A browser suppresses the click on
// release after a swipe like this, so INSPECT/wishlist taps aren't triggered by accident.
const SWIPE_MIN_PX = 50;
const SWIPE_LEARNED_KEY = 'codex_swipe_learned';
let touchStartX = 0, touchStartY = 0, touchTracking = false;

// The phone-only "swipe" hint (index.html, styled in mobile.css) teaches a gesture — once someone
// has swiped, it has done its job and would only be clutter. Also pointless with nothing to swipe to.
function updateSwipeHint() {
    const hint = document.getElementById('swipe-hint');
    if (!hint) return;
    let learned = false;
    try { learned = localStorage.getItem(SWIPE_LEARNED_KEY) === '1'; } catch (e) {}
    hint.classList.toggle('hidden', learned || state.filtered.length < 2);
}

function slideCard(dir) {
    const card = document.getElementById('main-card');
    if (!card) return;
    card.classList.remove('swipe-in-left', 'swipe-in-right');
    void card.offsetWidth; // restart the animation if swiping again before it finished
    card.classList.add(dir > 0 ? 'swipe-in-right' : 'swipe-in-left');
}

function initCardSwipe() {
    const wrapper = document.getElementById('carousel-wrapper');
    if (!wrapper) return;
    wrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) { touchTracking = false; return; }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchTracking = true;
    }, { passive: true });
    wrapper.addEventListener('touchend', (e) => {
        if (!touchTracking) return;
        touchTracking = false;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (state.filtered.length < 2) return;
        if (window.playClick) window.playClick();
        try { localStorage.setItem(SWIPE_LEARNED_KEY, '1'); } catch (e) {}
        if (dx < 0) { nextPC(); slideCard(1); } else { prevPC(); slideCard(-1); }
    }, { passive: true });
}
initCardSwipe();

// Εξαγωγή στο window
window.switchTab = switchTab;
window.selectPack = selectPack;
window.backToPacks = backToPacks;
window.filterInv = filterInv;
window.nextPC = nextPC;
window.prevPC = prevPC;
window.renderCard = renderCard;