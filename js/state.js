import { CONFIG } from './config.js';

function loadAchievements() {
    const raw = JSON.parse(localStorage.getItem('codex_achievements'));
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.keys(raw).filter(k => raw[k]); // migrate old {id: bool} shape
    return [];
}

export const state = {
    inventory: [],
    filtered: [],
    currentTab: 'live',
    index: 0,
    compareList: [],
    currentGalleryPC: null,
    galleryIndex: 0,
    cart: JSON.parse(localStorage.getItem('codex_cart')) || [],
    activeEvent: null,
    isLoggedIn: false, // Αρχικά false, θα ελέγχεται στο auth.js
    currentTicketCode: "",
    achievements: loadAchievements(),
    wishlist: JSON.parse(localStorage.getItem('codex_wishlist')) || [],
    audioEnabled: localStorage.getItem('codex_audio') !== 'false',
    currentTheme: localStorage.getItem('codex_theme') || CONFIG.DEFAULT_THEME,
    matrixEnabled: false,
    isHacked: false,
    // Global price of the Pro Config extra, refreshed from /api/status at boot.
    proConfigPrice: CONFIG.DEFAULT_PRO_CONFIG_PRICE,
    // Extras chosen for the PC currently open in the gallery. Reset on every openGallery().
    // Single source of truth for pricing, the image set shown, and what lands in the cart.
    // paint only ever goes true through the consent modal's Accept button (js/modules/gallery.js
    // acceptPaintConsent), so it never needs a separate "did they ack it" flag.
    build: { storage: '', proConfig: false, paint: false },
    bgVolume: 0.1,
    unlockedColors: JSON.parse(localStorage.getItem('codex_unlocked_colors')) || []
};

window.codexState = state;