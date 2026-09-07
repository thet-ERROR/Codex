import { CONFIG } from './config.js';

// The three ids the site used before the achievement rewrite. The API maps these too, but a
// browser holding an old cache renders before /api/me ever answers, so the same mapping has to
// exist here or a returning agent briefly sees their badges missing.
const LEGACY_ACHIEVEMENT_IDS = { login: 'recruited', cart: 'first_loot', vote: 'vote_caster' };

function loadAchievements() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem('codex_achievements')); } catch (e) { return []; }
    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && typeof raw === 'object') list = Object.keys(raw).filter(k => raw[k]); // old {id: bool} shape
    return list.map(id => LEGACY_ACHIEVEMENT_IDS[id] || id);
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
    // Hard gate on the backend: dossier/wishlist/achievements/vote all 403 until this is true.
    // Set from register/login responses and from /api/me; never assume true by default.
    emailVerified: false,
    currentTicketCode: "",
    achievements: loadAchievements(),
    // XP and rank are reported by the API, never computed here — see CONFIG.ACHIEVEMENTS_LIST.
    // These defaults are what a logged-out or offline agent sees; applyProfile() overwrites them
    // with the server's answer the moment one arrives.
    xp: 0,
    rank: 'recruit',
    nextRank: null,
    nextRankXp: null,
    rankProgress: 0,
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