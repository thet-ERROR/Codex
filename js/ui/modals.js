// Αρχικοποίηση Ήχων
const audioClick = new Audio('assets/audio/click.mp3');
const audioHover = new Audio('assets/audio/hover.mp3');

export function playClick() { 
    if(window.codexState && window.codexState.audioEnabled) { 
        audioClick.currentTime = 0; 
        audioClick.play().catch(()=>{}); 
    } 
}

export function playHover() { 
    if(window.codexState && window.codexState.audioEnabled) { 
        audioHover.currentTime = 0; 
        audioHover.play().catch(()=>{}); 
    } 
}

export function openModal(id) { 
    let m = document.getElementById(id) || document.getElementById(id + '-modal');
    if(m) {
        if (id === 'gallery-overlay') m.style.display = 'flex';
        else m.classList.add('active'); 
    }
}

export function closeModal(id) { 
    let m = document.getElementById(id) || document.getElementById(id + '-modal');
    if(m) {
        m.classList.remove('active'); 
        if (id === 'gallery-overlay') m.style.display = 'none';
    }
}

export function toggleSocials() {
    const menu = document.getElementById('social-menu');
    if(menu) menu.classList.toggle('active');
}

export function toggleMobileReviews() {
    const sidebar = document.querySelector('.right-sidebar');
    if(!sidebar) return;
    sidebar.classList.toggle('mobile-active');
    
    if(sidebar.classList.contains('mobile-active') && !document.getElementById('close-mobile-reviews')) {
        const closeBtn = document.createElement('button');
        closeBtn.id = 'close-mobile-reviews';
        closeBtn.innerHTML = 'CLOSE REVIEWS';
        closeBtn.style.cssText = 'width: 100%; margin-top: 20px; padding: 12px; background: var(--neon-purple); border: none; color: white; font-weight: bold; border-radius: 8px; cursor: pointer; font-family: var(--font-ui);';
        closeBtn.onclick = () => sidebar.classList.remove('mobile-active');
        sidebar.appendChild(closeBtn);
    }
}

export function toggleProfileMenu() {
    const m = document.getElementById('profile-menu');
    if(m) m.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('profile-menu');
    if (menu && menu.classList.contains('show')) {
        if (!e.target.closest('#profile-menu') && !e.target.closest('.profile-btn')) {
            menu.classList.remove('show');
        }
    }

    const cart = document.getElementById('cart-dropdown');
    if (cart && cart.classList.contains('show')) {
        if (!e.target.closest('#cart-dropdown') && !e.target.closest('.cart-btn')) {
            cart.classList.remove('show');
            const cartBtn = document.querySelector('.nav-btn.cart-btn');
            if (cartBtn) cartBtn.classList.remove('active');
        }
    }
});

// Εξαγωγή στο global scope
window.playClick = playClick;
window.playHover = playHover;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleSocials = toggleSocials;
window.toggleMobileReviews = toggleMobileReviews;
window.toggleProfileMenu = toggleProfileMenu;