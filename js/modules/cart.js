// js/modules/cart.js
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n.js';
import { getBreakdown, getActiveImages } from './gallery.js';
import { esc, escUrl, formatPrice } from '../utils.js';

// Matches css/components/cart.css's declared width — the dropdown is display:none until .show
// is added, so offsetWidth reads 0 at the point this needs it. Keep the two in sync if that ever
// changes.
const CART_DROPDOWN_WIDTH = 350;

// .nav-bar (holding the cart button) is centered independently of .right-header-group (profile,
// terminal) — the dropdown used to sit at a fixed top-right corner offset, which happened to land
// under THOSE buttons instead of under the one that actually opened it, on every viewport where
// the nav bar isn't exactly as wide as the header is generous with padding. Anchoring to the
// button's own rect fixes that at any width, including on resize while it's open.
function positionCartDropdown(d, btn) {
    const rect = btn.getBoundingClientRect();
    const gap = 10;
    const left = Math.max(10, Math.min(rect.right - CART_DROPDOWN_WIDTH, window.innerWidth - CART_DROPDOWN_WIDTH - 10));

    // Clear the right-hand controls (achievements / terminal / profile) as well as the cart button
    // itself. .nav-bar is position:absolute and centred, so it's out of the header's flex flow —
    // which means as the window narrows it can drift over .right-header-group, taking the cart
    // button (and anything anchored to it) with it. Measuring that group's real bottom instead of
    // trusting the cart button's alone keeps the dropdown below those buttons at any width rather
    // than depending on the two happening to line up.
    const headerGroup = document.querySelector('.right-header-group');
    const groupBottom = headerGroup ? headerGroup.getBoundingClientRect().bottom : 0;

    d.style.top = `${Math.max(rect.bottom, groupBottom) + gap}px`;
    d.style.left = `${left}px`;
    d.style.right = 'auto';
}

// Two cart buttons exist: the nav bar's (desktop/tablet) and the round one beside the profile
// button (phones, where the nav bar's copy is hidden). Whichever is actually on screen is the one to
// anchor to, highlight and point the "added" hint at.
export function visibleCartButton() {
    for (const sel of ['.cart-btn-mobile', '.nav-btn.cart-btn']) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null && el.getBoundingClientRect().width > 0) return el;
    }
    return null;
}

export function toggleCartDropdown() {
    const d = document.getElementById('cart-dropdown');
    const btn = visibleCartButton();
    if (!d || !btn) return;
    hideCartHint();

    // Only worth computing on the way in — closing doesn't need a position, and recomputing then
    // would just be wasted work the instant before the element hides.
    if (!d.classList.contains('show')) positionCartDropdown(d, btn);

    d.classList.toggle('show');
    btn.classList.toggle('active');
}

// Keeps the dropdown glued to the button across a resize (rotating a tablet, a laptop window
// being resized) instead of freezing wherever it was computed when opened. The mobile media query
// in css/responsive/mobile.css still wins on narrow viewports via !important regardless of what
// inline top/left this sets.
window.addEventListener('resize', () => {
    const d = document.getElementById('cart-dropdown');
    const btn = visibleCartButton();
    if (d && btn && d.classList.contains('show')) positionCartDropdown(d, btn);
    hideCartHint(); // a rotation or resize moves the button out from under the arrow
});

export function updateCartUI() {
    const cCount = document.getElementById('cart-count');
    if(cCount) cCount.innerText = state.cart.length;
    // The phone button's badge only appears once there's something in the cart — a permanent "0"
    // on a round icon reads as a notification that never clears.
    const mCount = document.getElementById('cart-count-mobile');
    if (mCount) {
        mCount.innerText = state.cart.length;
        mCount.classList.toggle('hidden', state.cart.length === 0);
    }
    
    const items = document.getElementById('mini-cart-items'); 
    let total = 0; 
    if (state.cart.length === 0) { 
        if(items) items.innerHTML = '<div style="color:#666; text-align:center; padding:20px; font-size:0.9rem;">CART IS EMPTY</div>'; 
    } else { 
        if(items) items.innerHTML = state.cart.map((item, i) => {
            total += item.priceCents;
            // item.options is the current shape; item.option is the pre-extras string kept so
            // carts already sitting in localStorage still render after this update.
            const optHTML = Array.isArray(item.options) && item.options.length
                ? item.options.map(o => `<div class="mc-opt">+ ${esc(o.label)} <span class="mc-opt-price">+${formatPrice(o.priceCents)}</span></div>`).join('')
                : `<div class="mc-opt">${esc(item.option || t('cartOptStandard'))}</div>`;

            return `<div class="mini-cart-item">
                        <img src="${escUrl(item.img)}" class="mc-img">
                        <div class="mc-details">
                            <div class="mc-name">${esc(item.name)}</div>
                            ${optHTML}
                            <div class="mc-price">${formatPrice(item.priceCents)}</div>
                        </div>
                        <i class="ph-bold ph-x mc-remove" onclick="removeFromCart(${i})"></i>
                    </div>`;
        }).join('');
    }
    const mcTotal = document.getElementById('mc-total');
    if(mcTotal) mcTotal.innerText = formatPrice(total);
}

export function addToCart() {
    const pc = state.currentGalleryPC;
    if(!pc) return;
    if(pc.stock === 0) return alert(t('alertSoldOut'));

    const { base, lines, total } = getBreakdown();

    state.cart.push({
        name: pc.name,
        // getBreakdown() works in cents throughout — see gallery.js
        basePriceCents: base,
        priceCents: total,
        options: lines.map(l => ({ label: l.label, priceCents: l.price })),
        // build.paint only ever goes true through the consent modal's Accept button, so this
        // doubles as "the personalisation terms were accepted" for the order message.
        paintAck: !!state.build.paint,
        // The painted photo when paint is on, so the cart shows what was actually ordered
        img: getActiveImages(pc)[0] || ''
    });

    localStorage.setItem('codex_cart', JSON.stringify(state.cart));
    updateCartUI();

    // Κλήση σε global functions (που υπάρχουν ήδη στο window)
    if(window.closeModal) window.closeModal('gallery-overlay');
    // Replaces what used to happen here: the dropdown flashed open for 2s (unpositioned, so on
    // desktop it appeared at the fallback corner) plus a toast at the bottom. Neither told a first-
    // time visitor where the cart actually is — the hint points at it.
    showCartHint();
    if(window.checkAchievement) window.checkAchievement('first_loot');
}

// --- "ADDED" HINT ---
// A bubble with an arrow pointing at the cart button. Nice on desktop; on phones it's the difference
// between a visitor finding the cart and not. Created on first use rather than living in index.html.
const HINT_MS = 4000;
let hintTimer = null;
let hintShownAt = 0;

function hintElement() {
    let el = document.getElementById('cart-hint');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'cart-hint';
    el.className = 'cart-hint';
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="cart-hint-arrow"></div>
        <div class="cart-hint-title"><i class="ph-bold ph-check-circle"></i> <span class="cart-hint-title-text"></span></div>
        <div class="cart-hint-text"></div>`;
    // Tapping the hint opens the cart it's pointing at
    el.addEventListener('click', () => toggleCartDropdown());
    document.body.appendChild(el);
    return el;
}

export function hideCartHint() {
    clearTimeout(hintTimer);
    const el = document.getElementById('cart-hint');
    if (el) el.classList.remove('show');
}

function placeCartHint(btn) {
    const el = hintElement();
    // Re-read every time so a language switch since the last add is respected
    el.querySelector('.cart-hint-title-text').textContent = t('cartHintTitle');
    el.querySelector('.cart-hint-text').textContent = t('cartHintText');

    const r = btn.getBoundingClientRect();
    const w = el.offsetWidth; // measurable: hidden with opacity, not display:none
    const centre = r.left + r.width / 2;
    const left = Math.max(10, Math.min(centre - w / 2, window.innerWidth - w - 10));
    el.style.top = `${r.bottom + 14}px`;
    el.style.left = `${left}px`;
    // The arrow tracks the button even when the bubble had to be clamped to a screen edge
    el.querySelector('.cart-hint-arrow').style.left = `${centre - left - 8}px`;

    el.classList.add('show');
    hintShownAt = Date.now();
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideCartHint, HINT_MS);
}

function showCartHint() {
    const btn = visibleCartButton();
    if (!btn) {
        if (window.showToast) window.showToast(t('cartHintTitle'), 'normal');
        return;
    }
    // On phones the header scrolls with the page, so after browsing down to a card the cart
    // button can be above the screen — bring it back into view before pointing at it.
    const r = btn.getBoundingClientRect();
    const offscreen = r.top < 0 || r.bottom > window.innerHeight;
    if (offscreen) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => placeCartHint(btn), offscreen ? 450 : 0);
}

// Scrolling away means the arrow no longer points at anything. The grace period ignores the
// scroll this file just started itself.
window.addEventListener('scroll', () => {
    if (Date.now() - hintShownAt > 500) hideCartHint();
}, { passive: true });

export function removeFromCart(i) {
    state.cart.splice(i, 1); 
    localStorage.setItem('codex_cart', JSON.stringify(state.cart)); 
    updateCartUI(); 
    if(window.playClick) window.playClick();
}

// Checkout hands the order to WhatsApp. The message is prefilled with every line and every
// chosen extra — without this the configured build never reaches the shop.
export function handleCheckout() {
    if(state.cart.length === 0) return alert(t('alertCartEmpty'));

    const msg = [t('orderMsgIntro'), ''];
    let total = 0;
    state.cart.forEach((item, i) => {
        total += item.priceCents;
        msg.push(`${i + 1}. ${item.name} — ${formatPrice(item.priceCents)}`);
        if (Array.isArray(item.options)) {
            item.options.forEach(o => msg.push(`   • ${o.label} (+${formatPrice(o.priceCents)})`));
        } else if (item.option) {
            msg.push(`   • ${item.option}`);
        }
    });
    msg.push('', `${t('orderMsgTotal')}: ${formatPrice(total)}`);
    if (state.cart.some(item => item.paintAck)) msg.push('', `✔ ${t('orderMsgPaintAck')}`);

    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUM}?text=${encodeURIComponent(msg.join('\n'))}`, "_blank");
}

// Εξαγωγή στο global scope για να δουλεύουν τα onclick στο index.html
window.toggleCartDropdown = toggleCartDropdown;
window.updateCartUI = updateCartUI;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;