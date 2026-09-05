// js/modules/cart.js
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n.js';
import { getBreakdown, getActiveImages, needsPaintAck } from './gallery.js';

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toggleCartDropdown() { 
    const d = document.getElementById('cart-dropdown'); 
    const btn = document.querySelector('.nav-btn.cart-btn'); 
    if(d) d.classList.toggle('show'); 
    if(btn) btn.classList.toggle('active'); 
}

export function updateCartUI() { 
    const cCount = document.getElementById('cart-count');
    if(cCount) cCount.innerText = state.cart.length; 
    
    const items = document.getElementById('mini-cart-items'); 
    let total = 0; 
    if (state.cart.length === 0) { 
        if(items) items.innerHTML = '<div style="color:#666; text-align:center; padding:20px; font-size:0.9rem;">CART IS EMPTY</div>'; 
    } else { 
        if(items) items.innerHTML = state.cart.map((item, i) => {
            total += item.price;
            // item.options is the current shape; item.option is the pre-extras string kept so
            // carts already sitting in localStorage still render after this update.
            const optHTML = Array.isArray(item.options) && item.options.length
                ? item.options.map(o => `<div class="mc-opt">+ ${esc(o.label)} <span class="mc-opt-price">+€${o.price}</span></div>`).join('')
                : `<div class="mc-opt">${esc(item.option || t('cartOptStandard'))}</div>`;

            return `<div class="mini-cart-item">
                        <img src="${esc(item.img)}" class="mc-img">
                        <div class="mc-details">
                            <div class="mc-name">${esc(item.name)}</div>
                            ${optHTML}
                            <div class="mc-price">€${item.price}</div>
                        </div>
                        <i class="ph-bold ph-x mc-remove" onclick="removeFromCart(${i})"></i>
                    </div>`;
        }).join('');
    } 
    const mcTotal = document.getElementById('mc-total');
    if(mcTotal) mcTotal.innerText = "€" + total; 
}

export function addToCart() {
    const pc = state.currentGalleryPC;
    if(!pc) return;
    if(pc.stock === 0) return alert(t('alertSoldOut'));
    // Made-to-order paint can't be ordered without accepting the personalisation terms
    if(needsPaintAck()) return alert(t('alertPaintAck'));

    const { base, lines, total } = getBreakdown();

    state.cart.push({
        name: pc.name,
        basePrice: base,
        price: total,
        options: lines.map(l => ({ label: l.label, price: l.price })),
        // Recorded so the order message can state the terms were accepted
        paintAck: !!state.build.paint,
        // The painted photo when paint is on, so the cart shows what was actually ordered
        img: getActiveImages(pc)[0] || ''
    });

    localStorage.setItem('codex_cart', JSON.stringify(state.cart)); 
    updateCartUI(); 
    
    const dropdown = document.getElementById('cart-dropdown'); 
    if(dropdown) {
        dropdown.classList.add('show'); 
        setTimeout(() => dropdown.classList.remove('show'), 2000); 
    }
    
    // Κλήση σε global functions (που υπάρχουν ήδη στο window)
    if(window.closeModal) window.closeModal('gallery-overlay'); 
    if(window.showToast) window.showToast("ITEM ADDED TO CART", "normal"); 
    if(window.checkAchievement) window.checkAchievement('cart'); 
}

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
        total += item.price;
        msg.push(`${i + 1}. ${item.name} — €${item.price}`);
        if (Array.isArray(item.options)) {
            item.options.forEach(o => msg.push(`   • ${o.label} (+€${o.price})`));
        } else if (item.option) {
            msg.push(`   • ${item.option}`);
        }
    });
    msg.push('', `${t('orderMsgTotal')}: €${total}`);
    if (state.cart.some(item => item.paintAck)) msg.push('', `✔ ${t('orderMsgPaintAck')}`);

    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUM}?text=${encodeURIComponent(msg.join('\n'))}`, "_blank");
}

// Εξαγωγή στο global scope για να δουλεύουν τα onclick στο index.html
window.toggleCartDropdown = toggleCartDropdown;
window.updateCartUI = updateCartUI;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;