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

import './modules/gallery.js';
import './modules/compare.js';
import './modules/wishlist.js';
import './modules/chat.js';
import './modules/achievements.js';

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

window.updateVolume = (val) => {
    const decimal = val / 100;
    bgMusic.volume = decimal;
    state.bgVolume = decimal;
    const volDisplay = document.getElementById('vol-display');
    if(volDisplay) volDisplay.innerText = val + "%";
    localStorage.setItem('codex_volume', decimal);
};

window.toggleCRT = () => {
    state.crtEnabled = !state.crtEnabled;
    localStorage.setItem('codex_crt', state.crtEnabled);
    const scanlines = document.querySelector('.scanlines');
    if (scanlines) scanlines.style.display = state.crtEnabled ? 'block' : 'none';
    
    // UI Update
    const crtBtn = document.getElementById('set-crt');
    if (crtBtn) {
        crtBtn.className = state.crtEnabled ? 'setting-card active' : 'setting-card'; 
        const cTitle = crtBtn.querySelector('.s-title');
        if (cTitle) cTitle.innerText = state.crtEnabled ? 'CRT FX: ON' : 'CRT FX: OFF'; 
    }
};

window.setTheme = (color) => {
    state.currentTheme = color;
    localStorage.setItem('codex_theme', color);
    document.documentElement.style.setProperty('--neon-green', color);
};

// --- SYSTEM INITIALIZATION SEQUENCE ---
const initApp = async () => {
    console.log(">> SYSTEM INITIALIZING. WAITING FOR MODULES...");

    // 1. Setup Auth & Listeners
    checkSavedSession();
    initTerminal();

    // 2. Apply Saved Settings
    if (!state.crtEnabled) {
        const scanlines = document.querySelector('.scanlines');
        if (scanlines) scanlines.style.display = 'none';
    }
    document.documentElement.style.setProperty('--neon-green', state.currentTheme);
    
    const volSlider = document.getElementById('vol-slider');
    const volDisp = document.getElementById('vol-display');
    if(volSlider) volSlider.value = state.bgVolume * 100;
    if(volDisp) volDisp.innerText = Math.round(state.bgVolume * 100) + "%";

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