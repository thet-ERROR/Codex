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

// The share menu sits at body level (see index.html for why), so it's placed against the button
// here. Where the sidebar is a vertical rail (desktop) it opens to the button's right; where it's the
// horizontal bottom bar (tablet/phone — tablet.css and mobile.css switch it to flex-direction:row)
// it opens as a row centred above the button, clamped to the screen edges.
function positionSocialMenu(menu, btn) {
    const bar = document.querySelector('.left-sidebar');
    const horizontal = !!bar && getComputedStyle(bar).flexDirection === 'row';
    menu.classList.toggle('is-horizontal', horizontal);

    // Measured after .active and the orientation class are applied — before that it's display:none
    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    if (horizontal) {
        const left = Math.max(10, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 10));
        menu.style.left = `${left}px`;
        menu.style.top = `${Math.max(10, r.top - h - 12)}px`;
    } else {
        menu.style.left = `${r.right + 12}px`;
        menu.style.top = `${Math.max(10, Math.min(r.top, window.innerHeight - h - 10))}px`;
    }
}

export function toggleSocials() {
    const menu = document.getElementById('social-menu');
    const btn = document.getElementById('social-toggle-btn');
    if (!menu) return;
    menu.classList.toggle('active');
    if (menu.classList.contains('active') && btn) positionSocialMenu(menu, btn);
}

window.addEventListener('resize', () => {
    const menu = document.getElementById('social-menu');
    const btn = document.getElementById('social-toggle-btn');
    if (menu && btn && menu.classList.contains('active')) positionSocialMenu(menu, btn);
});

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

    // Now that it floats free of the sidebar, a tap anywhere else should close it like the others
    const socials = document.getElementById('social-menu');
    if (socials && socials.classList.contains('active')) {
        if (!e.target.closest('#social-menu') && !e.target.closest('#social-toggle-btn')) {
            socials.classList.remove('active');
        }
    }

    const cart = document.getElementById('cart-dropdown');
    if (cart && cart.classList.contains('show')) {
        // Both cart buttons (nav bar + the phone one beside the profile) and the "added" hint, which
        // opens the cart itself, count as "inside" — otherwise this closes what they just opened.
        if (!e.target.closest('#cart-dropdown') && !e.target.closest('.cart-btn, .cart-btn-mobile, #cart-hint')) {
            cart.classList.remove('show');
            document.querySelectorAll('.nav-btn.cart-btn, .cart-btn-mobile').forEach(b => b.classList.remove('active'));
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