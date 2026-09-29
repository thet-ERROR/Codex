// js/main.js
import { state } from './state.js';
import { api } from './api.js';

import { checkSavedSession, hydrateProfile } from './modules/auth.js';
import { updateCartUI } from './modules/cart.js';
import { filterInv } from './modules/catalog.js';
import { renderVoteState, updateTimer } from './modules/vote.js';
import { renderGlobalReviews } from './modules/reviews.js';
import { initTerminal, initMatrix } from './modules/terminal.js';
import { initInteractiveTutorial } from './modules/tutorial.js';
import { initDayNightCycle } from './modules/time.js';
import { initStageFit } from './modules/stagefit.js';
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

// --- BOOT BUDGET ---
// The splash used to wait on six API calls made one after another, with no timeout on any of them.
// On a cold Render instance the first call alone takes ~50s, and if any call hung — or anything
// threw between them — the splash never left at all. Now the whole boot shares one deadline: past
// it the site renders with what it has, and whatever arrives late is applied when it lands.
const BOOT_BUDGET_MS = 10000;
let bootDeadline = 0;
function withinBudget(promise) {
    const remaining = Math.max(0, bootDeadline - Date.now());
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('boot-timeout')), remaining))
    ]);
}

function applyStatus(status) {
    if (!status) return;
    if (typeof status.proConfigPrice === 'number') state.proConfigPrice = status.proConfigPrice;
    if (typeof status.voteInfoText === 'string') state.voteInfoText = status.voteInfoText;
    if (typeof status.voteInfoTextEl === 'string') state.voteInfoTextEl = status.voteInfoTextEl;
}

function showMaintenance(status) {
    const overlay = document.getElementById('startup-overlay');
    const startupText = document.getElementById('startup-text');
    if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('maintenance-active'); }
    if (startupText) startupText.innerText = status.message || "SYSTEM UNDER MAINTENANCE";
}

// --- SYSTEM INITIALIZATION SEQUENCE ---
const initApp = async () => {
    console.log(">> SYSTEM INITIALIZING. WAITING FOR MODULES...");
    bootDeadline = Date.now() + BOOT_BUDGET_MS;

    // Started up front and in parallel rather than one after another — the catalogue doesn't depend
    // on the session or the status call, so there's no reason for it to queue behind them.
    // The .catch() handlers only silence "unhandled rejection" noise; each is still awaited below.
    const statusPromise = api.checkStatus();
    const dataPromise = Promise.all([api.fetchDrops(), api.fetchVoteEvent()]);
    statusPromise.catch(() => {});
    dataPromise.catch(() => {});

    // A cold start is otherwise indistinguishable from a broken site — say what's happening.
    const startupText = document.getElementById('startup-text');
    const slowNotice = setTimeout(() => {
        if (startupText) startupText.innerText = window.t ? window.t('bootWakingServer') : 'WAKING UP SERVER...';
    }, 4000);

    // 0. Maintenance Kill Switch Check
    try {
        const status = await withinBudget(statusPromise);
        if (status.maintenance) {
            clearTimeout(slowNotice);
            showMaintenance(status);
            return; // never hides #startup-overlay, never renders the rest of the site
        }
        applyStatus(status);
    } catch (e) {
        // Out of budget or network error: fail open and boot normally. If the answer turns up later
        // and says maintenance, honour it then instead of never finding out.
        statusPromise.then(s => {
            if (s && s.maintenance) showMaintenance(s);
            else applyStatus(s);
        }).catch(() => {});
    }

    // 0.5 Email verification — the emailed link points here with ?verify=<token>. This POSTs the
    // token itself rather than the link being a GET straight to the API: a mail client's
    // automatic link-preview scan fetches the raw URL but never executes page JavaScript, so it
    // can't silently verify an account nobody asked it to (same reasoning as the mission-code fix).
    const verifyToken = new URLSearchParams(location.search).get('verify');
    if (verifyToken) {
        try {
            const result = await api.verifyEmail(verifyToken);
            if (result.success) {
                state.emailVerified = true;
                if (window.showToast) window.showToast('✅ EMAIL VERIFIED — FULL ACCESS UNLOCKED', 'achievement');
            } else if (window.showToast) {
                window.showToast('❌ ' + (result.error || 'VERIFICATION LINK INVALID OR EXPIRED'), 'error');
            }
        } catch (e) {
            if (window.showToast) window.showToast('CONNECTION ERROR DURING VERIFICATION', 'error');
        }
        // Strip the token from the URL — a refresh, share, or browser-history entry shouldn't
        // keep resubmitting (or exposing) it once it's been used.
        history.replaceState({}, '', location.pathname);
    }

    // 0.6 "Wasn't you?" — the same email's second button, ?report=<token>. Same POST-not-GET
    // reasoning as verification above. Deliberately public: whoever clicks this almost certainly
    // has no session on this device (they didn't create the account), so it can't be gated behind
    // being logged in.
    const reportToken = new URLSearchParams(location.search).get('report');
    if (reportToken) {
        try {
            const result = await api.reportUnauthorizedSignup(reportToken);
            if (result.success && result.alreadyVerified) {
                if (window.showToast) window.showToast('THIS ACCOUNT IS ALREADY VERIFIED — NO ACTION NEEDED', 'normal');
            } else if (result.success) {
                if (window.showToast) window.showToast('🔒 ACCOUNT SECURED — LOCKED FOR 5 DAYS', 'achievement');
            } else if (window.showToast) {
                window.showToast('❌ ' + (result.error || 'INVALID OR EXPIRED SECURITY LINK'), 'error');
            }
        } catch (e) {
            if (window.showToast) window.showToast('CONNECTION ERROR', 'error');
        }
        history.replaceState({}, '', location.pathname);
    }

    // 1. Setup Auth & Listeners
    // Runs after the ?verify= step above, so an agent who just confirmed their email has
    // 'identity_confirmed' in the profile this call fetches rather than one page load later.
    // Bounded like everything else: if it runs out of budget it keeps going in the background and
    // updates the profile whenever /api/me answers — it just no longer holds the splash hostage.
    await withinBudget(checkSavedSession()).catch(() => {});

    // Local clock on purpose — the badge is about when the agent is browsing, not about UTC
    const hour = new Date().getHours();
    if (hour < 5 && window.checkAchievement) window.checkAchievement('night_owl');

    initTerminal();
    initDayNightCycle();

    // 2. Apply Saved Settings
    document.documentElement.style.setProperty('--neon-green', state.currentTheme);
    if (window.refreshColorLocks) window.refreshColorLocks();
    applyLanguage(localStorage.getItem('codex_lang') || 'en');

    // 3. Setup Audio Triggers
    if (state.audioEnabled) audioStart.play().catch(e => console.log("Audio autoplay blocked"));
    document.body.addEventListener('click', function() {
        if (state.audioEnabled && bgMusic.paused) { bgMusic.play().catch(()=>{}); }
    }, { once: true });

    // 4. Connect to Codex Database (Backend)
    // Array.isArray, not `|| []`: during maintenance /api/drops answers with a JSON object, and
    // filterInv() calls .filter() on whatever lands here.
    const applyData = ([drops, voteEvent]) => {
        state.inventory = Array.isArray(drops) ? drops : [];
        state.activeEvent = voteEvent || null;
    };
    let voteTimerStarted = false;
    const hydrate = () => {
        filterInv();
        renderGlobalReviews();
        if (state.activeEvent && state.activeEvent.title) {
            renderVoteState();
            if (!voteTimerStarted) { setInterval(updateTimer, 1000); voteTimerStarted = true; }
        } else {
            const vTitle = document.getElementById('v-title');
            const vBtn = document.getElementById('v-btn');
            if (vTitle) vTitle.innerText = "NO ACTIVE VOTE";
            if (vBtn) vBtn.disabled = true;
        }
    };

    try {
        applyData(await withinBudget(dataPromise));
    } catch (e) {
        console.error("⛔ API BOOT SLOW OR FAILED — rendering now, filling in when it answers", e);
        // Late arrival: the site is already on screen by then, so fill it in rather than drop it
        dataPromise.then(result => {
            applyData(result);
            hydrate();
            if (window.showToast) window.showToast(window.t ? window.t('bootDataArrived') : 'CATALOGUE LOADED', 'normal');
        }).catch(err => console.error("⛔ API BOOT FAILED", err));
    }

    // 5 + 6. Hydrate UI, then remove the splash. The finally is what guarantees the splash leaves:
    // previously any exception thrown while hydrating left it covering the page forever.
    try {
        hydrate();
        updateCartUI();
        initMatrix();
        // Last, once the real card content is in the DOM — the layout has no scroll by design, so on
        // a viewport too short for it (a laptop at 125% OS scale with browser chrome, i.e. anyone
        // not in fullscreen) this scales the stage down uniformly to fit. No-op when it already fits.
        initStageFit();
    } catch (e) {
        console.error("⛔ UI HYDRATION FAILED", e);
    } finally {
        clearTimeout(slowNotice);
        const overlay = document.getElementById('startup-overlay');
        const bar = document.getElementById('loader-fill');
        setTimeout(() => { if (bar) bar.style.width = "100%"; }, 500);
        setTimeout(() => {
            if (overlay) overlay.classList.add('hidden');
            initInteractiveTutorial();
        }, 1500);
    }
};

// Εκκίνηση μόλις το DOM είναι έτοιμο
document.addEventListener('DOMContentLoaded', initApp);

// Verification frequently completes in a browser context this tab knows nothing about — a mail
// app's in-app browser is the common case, opened by tapping the button in the confirmation email,
// which has no relation to the tab where someone registered and is now sitting waiting. That
// original tab has no event to react to, so without this it looks "stuck" until a manual reload.
// Re-checking on focus (rather than polling on a timer) means this costs nothing while the tab
// isn't being watched, and reacts the moment someone actually looks back at it.
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!state.isLoggedIn || state.emailVerified) return;
    try {
        await hydrateProfile();
        // hydrateProfile() only succeeds past the backend's requireVerified gate if this JUST
        // became true — reaching here at all means it did.
        state.emailVerified = true;
        if (window.updateAuthUI) window.updateAuthUI(localStorage.getItem('codex_username'));
        if (window.showToast) window.showToast('✅ EMAIL VERIFIED — FULL ACCESS UNLOCKED', 'achievement');
        // If the dossier happens to be open right now, its banner and RESEND button are stale too
        const dashboard = document.getElementById('agent-dashboard-modal');
        if (dashboard && dashboard.classList.contains('active') && window.openAgentDashboard) {
            window.openAgentDashboard();
        }
    } catch (e) {
        // Still unverified, or offline — stay quiet, this fires every time the tab regains focus
    }
});