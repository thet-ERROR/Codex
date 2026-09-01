// js/main.js
import { state } from './state.js';
import { api } from './api.js';

import { checkSavedSession } from './modules/auth.js';
import { updateCartUI } from './modules/cart.js';
import { filterInv } from './modules/catalog.js';
import { renderVoteState, updateTimer } from './modules/vote.js';
import { renderGlobalReviews } from './modules/reviews.js';
import { initTerminal, initMatrix } from './modules/terminal.js';
import { initInteractiveTutorial } from './modules/tutorial.js';
import { initDayNightCycle } from './modules/time.js';
import { applyLanguage } from './i18n.js';

import './modules/gallery.js';
import './modules/compare.js';
import './modules/wishlist.js';
import './modules/chat.js';
import './modules/achievements.js';
import './modules/whoami.js';
import './modules/wheel.js';

// --- ΠΡΟΣΘΕΣΕ ΑΥΤΕΣ ΤΙΣ 3 ΓΡΑΜΜΕΣ ΕΔΩ ---
// 3. UI Helpers (Παράθυρα, Ήχοι, Ειδοποιήσεις)
import './ui/modals.js';
import './ui/toast.js';
import './ui/ui-lock.js'; 
// ----------------------------------------

// ... (το υπόλοιπο αρχείο παραμένει ίδιο)
// --- SYSTEM AUDIO SETUP ---
const audioStart = new Audio('assets/audio/startup.mp3');
const bgMusic = new Audio('assets/audio/bg.mp3');
bgMusic.loop = true;
bgMusic.volume = state.bgVolume;

// --- GLOBAL SETTINGS FUNCTIONS ---
window.toggleAudio = () => {
    state.audioEnabled = !state.audioEnabled;
    localStorage.setItem('codex_audio', state.audioEnabled);
    if (state.audioEnabled) { bgMusic.play().catch(()=>{}); } else { bgMusic.pause(); }
    
    // UI Update
    const audBtn = document.getElementById('set-audio'); 
    if (audBtn) {
        audBtn.className = state.audioEnabled ? 'setting-card active' : 'setting-card'; 
        const sTitle = audBtn.querySelector('.s-title');
        if (sTitle) sTitle.innerText = state.audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF'; 
    }
};

window.setTheme = (color, id) => {
    if (id && !state.unlockedColors.includes(id)) {
        if (window.showToast) window.showToast('LOCKED. SPIN THE WHEEL TO UNLOCK.', 'error');
        return;
    }
    state.currentTheme = color;
    localStorage.setItem('codex_theme', color);
    document.documentElement.style.setProperty('--neon-green', color);
};

// --- SYSTEM INITIALIZATION SEQUENCE ---
const initApp = async () => {
    console.log(">> SYSTEM INITIALIZING. WAITING FOR MODULES...");

    // 0. Maintenance Kill Switch Check
    try {
        const status = await api.checkStatus();
        if (status.maintenance) {
            const overlay = document.getElementById('startup-overlay');
            const startupText = document.getElementById('startup-text');
            if (overlay) overlay.classList.add('maintenance-active');
            if (startupText) startupText.innerText = status.message || "SYSTEM UNDER MAINTENANCE";
            return; // never hides #startup-overlay, never renders the rest of the site
        }
    } catch (e) {
        // Network/API error: fail open, proceed with normal boot
    }

    // 1. Setup Auth & Listeners
    checkSavedSession();
    initTerminal();
    initDayNightCycle();

    // 2. Apply Saved Settings
    document.documentElement.style.setProperty('--neon-green', state.currentTheme);
    if (window.refreshColorLocks) window.refreshColorLocks();
    if (window.refreshWheelButton) window.refreshWheelButton();
    applyLanguage(localStorage.getItem('codex_lang') || 'el');

    // 3. Setup Audio Triggers
    if (state.audioEnabled) audioStart.play().catch(e => console.log("Audio autoplay blocked"));
    document.body.addEventListener('click', function() {
        if (state.audioEnabled && bgMusic.paused) { bgMusic.play().catch(()=>{}); }
    }, { once: true });

    // 4. Connect to Codex Database (Backend)
    try {
        const drops = await api.fetchDrops();
        const voteEvent = await api.fetchVoteEvent();
        
        state.inventory = drops || [];
        state.activeEvent = voteEvent || null;
    } catch (e) {
        console.error("⛔ CRITICAL ERROR: API BOOT FAILED", e);
    }

    // 5. Hydrate UI (Φόρτωση δεδομένων στα γραφικά)
    filterInv(); 
    updateCartUI(); 
    renderGlobalReviews(); 
    initMatrix();

    if (state.activeEvent && state.activeEvent.title) { 
        renderVoteState(); 
        setInterval(updateTimer, 1000); 
    } else { 
        const vTitle = document.getElementById('v-title');
        const vBtn = document.getElementById('v-btn');
        if (vTitle) vTitle.innerText = "NO ACTIVE VOTE"; 
        if (vBtn) vBtn.disabled = true; 
    }

    // 6. Remove Splash Screen & Run Tutorial
    const overlay = document.getElementById('startup-overlay');
    const bar = document.getElementById('loader-fill');
    
    setTimeout(() => { if (bar) bar.style.width = "100%"; }, 500);
    setTimeout(() => { 
        if (overlay) overlay.classList.add('hidden'); 
        initInteractiveTutorial();
    }, 1500);
};

// Εκκίνηση μόλις το DOM είναι έτοιμο
document.addEventListener('DOMContentLoaded', initApp);
function fetchWithTimeout(promise, ms = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
    ]);
}