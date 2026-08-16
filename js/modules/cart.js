// js/modules/cart.js
import { state } from '../state.js';

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
            return `<div class="mini-cart-item">
                        <img src="${item.img}" class="mc-img">
                        <div class="mc-details">
                            <div class="mc-name">${item.name}</div>
                            <div class="mc-opt">${item.option}</div>
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
    if(!state.currentGalleryPC) return;
    if(state.currentGalleryPC.stock === 0) return alert("SOLD OUT!"); 
    
    const sel = document.getElementById('storage-select');
    const extra = sel ? parseInt(sel.value) : 0; 
    const base = parseInt(state.currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    
    state.cart.push({ 
        name: state.currentGalleryPC.name, 
        price: base + extra, 
        option: extra === 50 ? "+1TB HDD" : (extra === 80 ? "+1TB SSD" : "Standard"), 
        img: state.currentGalleryPC.images[0] 
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

export function handleCheckout() { 
    if(state.cart.length === 0) return alert("Cart is empty!");
    window.open("https://wa.me/306912345678", "_blank"); 
}

// Εξαγωγή στο global scope για να δουλεύουν τα onclick στο index.html
window.toggleCartDropdown = toggleCartDropdown;
window.updateCartUI = updateCartUI;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;