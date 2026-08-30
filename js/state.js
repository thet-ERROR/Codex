import { CONFIG } from './config.js';

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
    achievements: JSON.parse(localStorage.getItem('codex_achievements')) || { 'login': false, 'cart': false, 'vote': false },
    wishlist: JSON.parse(localStorage.getItem('codex_wishlist')) || [],
    audioEnabled: localStorage.getItem('codex_audio') !== 'false',
    currentTheme: localStorage.getItem('codex_theme') || CONFIG.DEFAULT_THEME,
    matrixEnabled: false,
    isHacked: false,
    bgVolume: localStorage.getItem('codex_volume') ? parseFloat(localStorage.getItem('codex_volume')) : 0.1
};

window.codexState = state;