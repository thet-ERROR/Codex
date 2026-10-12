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

// --- MODAL MANAGER ---
// Every window used to close only through its own little "X" — a <span>, so not reachable by keyboard —
// and nothing else: no Escape, no tap outside, focus left wherever it was behind the window. The
// stack below remembers what's open (top = the one Escape closes) and who opened it (so focus goes
// back there on close).
const modalStack = [];

// Windows where "dismiss" isn't simply "hide": declining the paint consent un-ticks its checkbox, and
// skipping the tour marks it as seen
const DISMISS_HOOKS = {
    'paint-consent-modal': () => window.declinePaintConsent && window.declinePaintConsent(),
    'tutorial-lang-modal': () => window.skipTutorial && window.skipTutorial()
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function resolveModal(id) {
    return document.getElementById(id) || document.getElementById(id + '-modal');
}

export function openModal(id) {
    let m = resolveModal(id);
    if(m) {
        if (id === 'gallery-overlay') { m.style.display = 'flex'; return; }
        const wasActive = m.classList.contains('active');
        m.classList.add('active');
        if (wasActive) return;
        const opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        modalStack.push({ el: m, opener });
        // The window itself takes focus (not an input — that would pop a phone keyboard open), so
        // Tab starts inside it and Escape works at once
        const box = m.querySelector('.modal-content') || m;
        if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
        box.focus({ preventScroll: true });
    }
}

export function closeModal(id) {
    let m = resolveModal(id);
    if(m) {
        m.classList.remove('active');
        if (id === 'gallery-overlay') m.style.display = 'none';
        const i = modalStack.findIndex(s => s.el === m);
        if (i !== -1) {
            const [{ opener }] = modalStack.splice(i, 1);
            // Back to the button that opened it — unless the window was closed to open something else,
            // which has already taken focus
            if (opener && opener.isConnected && (document.activeElement === document.body || m.contains(document.activeElement))) {
                opener.focus({ preventScroll: true });
            }
        }
    }
}

function dismissTop() {
    // Windows closed some other way can linger in the stack; skip to one that's really open
    while (modalStack.length && !modalStack[modalStack.length - 1].el.classList.contains('active')) modalStack.pop();
    const top = modalStack[modalStack.length - 1];
    if (top) {
        (DISMISS_HOOKS[top.el.id] || (() => closeModal(top.el.id)))();
        // A hook may only have changed state (declining paint un-ticks and closes by itself; be sure)
        if (top.el.classList.contains('active')) closeModal(top.el.id);
        return true;
    }
    const gallery = document.getElementById('gallery-overlay');
    if (gallery && gallery.style.display === 'flex') { closeModal('gallery-overlay'); return true; }
    return false;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (dismissTop()) e.preventDefault();
        return;
    }
    // Keep Tab inside the open window instead of wandering off into the page behind it
    if (e.key === 'Tab') {
        const top = modalStack[modalStack.length - 1];
        if (!top || !top.el.classList.contains('active')) return;
        const items = Array.from(top.el.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        const box = top.el.querySelector('.modal-content') || top.el;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});

// A tap on the dim area outside a window closes it. Only when the press STARTED there too: selecting
// text in a field and releasing outside the box fires a click on the overlay, and must not close it.
let pressedOn = null;
document.addEventListener('pointerdown', (e) => { pressedOn = e.target; }, true);
document.addEventListener('click', (e) => {
    const overlay = e.target;
    if (!overlay.classList || !overlay.classList.contains('modal-overlay') || pressedOn !== overlay) return;
    if (!overlay.classList.contains('active')) return;
    (DISMISS_HOOKS[overlay.id] || (() => closeModal(overlay.id)))();
    if (overlay.classList.contains('active')) closeModal(overlay.id);
});

// The old "X" spans/divs: make them real controls (focusable, announced, Enter/Space) and a size a
// thumb can hit. The label follows the language.
function enhanceCloseButtons() {
    const label = window.t ? window.t('closeLabel') : 'Close';
    document.querySelectorAll('.close-modal, .close-btn, .modal-close, .yg-close-btn, .yg-close-back').forEach(el => {
        if (el.tagName === 'BUTTON') { if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', label); return; }
        el.setAttribute('role', 'button');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', label);
    });
}
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"].close-modal, [role="button"].close-btn, [role="button"].yg-close-btn, [role="button"].yg-close-back')) {
        e.preventDefault();
        e.target.click();
    }
});
// --- ONE SHELL FOR EVERY WINDOW ---
// The older windows (login, sign-up, achievements, newsletter, review, …) were each a .modal-content
// with its own inline width, title style and a loose "X" — on a phone a 600px box that couldn't
// shrink past its content, so the X ended up off-screen. Rather than hand-edit eleven blocks of
// markup, they're moved into the same shell as Information/Settings at start-up: kicker + title +
// 44px close button in a header that stays put, the rest in a scrolling body. Ids, data-i18n and
// handlers are untouched — elements are moved, not rebuilt.
const SHELL_KICKERS = {
    'login-modal': 'AUTH', 'signup-modal': 'NEW_RECRUIT', 'forgot-modal': 'RECOVERY', 'reset-modal': 'RECOVERY',
    'achievements-modal': 'AGENT_RECORD', 'newsletter-modal': 'DROP_ALERTS', 'review-code-modal': 'FIELD_REPORT',
    'spec-info-modal': 'COMPONENT', 'proconfig-info-modal': 'PRO_CONFIG', 'paint-consent-modal': 'CUSTOM_PAINT',
    'tutorial-lang-modal': 'TOUR'
};
const SHELL_SMALL = ['login-modal', 'signup-modal', 'forgot-modal', 'reset-modal', 'newsletter-modal', 'review-code-modal', 'spec-info-modal', 'tutorial-lang-modal'];

function upgradeModalShells() {
    Object.keys(SHELL_KICKERS).forEach(id => {
        const overlay = document.getElementById(id);
        const box = overlay && overlay.querySelector(':scope > .modal-content');
        if (!box || box.classList.contains('info-box')) return;

        const close = box.querySelector(':scope > .close-modal, :scope > .close-btn');
        const title = box.querySelector(':scope > h2');
        const head = document.createElement('div');
        head.className = 'info-head';
        const headText = document.createElement('div');
        headText.className = 'info-head-text';
        const kicker = document.createElement('span');
        kicker.className = 'info-kicker';
        kicker.textContent = '>// ' + SHELL_KICKERS[id];
        headText.appendChild(kicker);
        if (title) {
            title.removeAttribute('style');
            title.className = 'info-title';
            headText.appendChild(title);
        }
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'modal-x';
        x.dataset.i18nAria = 'closeLabel';
        x.setAttribute('aria-label', window.t ? window.t('closeLabel') : 'Close');
        x.innerHTML = '<i class="ph-bold ph-x"></i>';
        // Same action as the old X (some decline or skip rather than just close)
        x.setAttribute('onclick', (close && close.getAttribute('onclick')) || `closeModal('${id}')`);
        if (close) close.remove();
        head.append(headText, x);

        const body = document.createElement('div');
        body.className = 'info-body';
        while (box.firstChild) body.appendChild(box.firstChild);
        box.append(head, body);

        box.classList.add('info-box');
        if (SHELL_SMALL.includes(id)) box.classList.add('info-box--sm');
        box.style.width = '';           // the inline widths were the phone overflow
        box.style.borderColor = '';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        if (title) {
            if (!title.id) title.id = id + '-title';
            box.setAttribute('aria-labelledby', title.id);
        }
    });
}

upgradeModalShells();
enhanceCloseButtons();
document.addEventListener('codex:lang', enhanceCloseButtons);

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
    // A click whose target was removed by its own handler (the cart's × re-renders the item list) has
    // no ancestors left, so every "is it inside?" check below says no — and removing one item used to
    // close the whole cart. A detached target was, by definition, inside something that re-rendered.
    if (!e.target.isConnected) return;
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