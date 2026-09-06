// js/modules/auth.js
import { state } from '../state.js';
import { api } from '../api.js';

// --- AUTHENTICATION UI UPDATER ---
export function updateAuthUI(username) {
    const menu = document.getElementById('profile-menu');
    const dossierName = document.getElementById('dossier-username');
    const dossierRank = document.getElementById('dossier-rank');
    const signInBtn = document.getElementById('dossier-signin-btn');
    const signUpBtn = document.getElementById('dossier-signup-btn');
    const logoutBtn = document.getElementById('dossier-logout-btn');
    const userDisplay = document.getElementById('user-display');

    const t = window.t || (k => k);

    if (username) {
        state.isLoggedIn = true;
        if (dossierName) dossierName.innerText = username.toUpperCase();
        if (userDisplay) userDisplay.innerText = username.toUpperCase();
        if (dossierRank) dossierRank.innerText = t('rankOperative');

        if (signInBtn) signInBtn.style.display = 'none';
        if (signUpBtn) signUpBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

        if (menu) {
            // Backend hard-gates dossier/wishlist/achievements/vote behind a verified email —
            // surface that here so it's not a silent dead end the first time something 403s.
            const verifyItem = !state.emailVerified
                ? `<div class="p-item" onclick="playClick(); resendVerification(); toggleProfileMenu();" style="color: #ffaa00;">⚠ ${t('menuVerifyEmail')}</div>`
                : '';
            menu.innerHTML = `
                ${verifyItem}
                <div class="p-item" onclick="playClick(); toggleProfileMenu(); openAgentDashboard();" style="color: var(--neon-green);">📊 ${t('menuDashboard')}</div>
                <div class="p-item" onclick="playClick(); logout(); toggleProfileMenu();" style="color: #ff3333;">❌ ${t('menuSignOut')}</div>
            `;
        }
    } else {
        state.isLoggedIn = false;
        if (dossierName) dossierName.innerText = t('unknownUser');
        if (userDisplay) userDisplay.innerText = t('agentFallback');
        if (dossierRank) dossierRank.innerText = t('rankRecruit');

        if (signInBtn) signInBtn.style.display = 'block';
        if (signUpBtn) signUpBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';

        if (menu) {
            menu.innerHTML = `
                <div class="p-item" onclick="playClick(); toggleProfileMenu(); openModal('login-modal');">${t('menuSignIn')}</div>
                <div class="p-item" onclick="playClick(); toggleProfileMenu(); openModal('signup-modal');">${t('menuRegister')}</div>
            `;
        }
    }
}

// --- SESSION CHECK ---
export async function checkSavedSession() {
    const savedUser = localStorage.getItem('codex_username');
    const token = localStorage.getItem('codex_token');

    if (!savedUser) {
        state.isLoggedIn = false;
        updateAuthUI(null);
        return;
    }

    // Show the cached local state immediately, then reconcile with the server.
    state.isLoggedIn = true;
    updateAuthUI(savedUser);

    if (!token) return; // pre-JWT session on this browser: stay on local-only data

    try {
        const me = await api.getMe();
        // Reaching here at all means requireVerified passed on the backend
        state.emailVerified = true;
        state.wishlist = me.wishlist || [];
        state.achievements = Array.isArray(me.achievements) ? me.achievements : [];
        localStorage.setItem('codex_wishlist', JSON.stringify(state.wishlist));
        localStorage.setItem('codex_achievements', JSON.stringify(state.achievements));
        updateAuthUI(savedUser);
        if (window.refreshColorLocks) window.refreshColorLocks();
    } catch (e) {
        if (e && e.status === 401) {
            // Expired/invalid token: fall back to logged-out rather than trust stale local data as an account session.
            localStorage.removeItem('codex_token');
            localStorage.removeItem('codex_username');
            state.isLoggedIn = false;
            updateAuthUI(null);
        } else if (e && e.code === 'EMAIL_NOT_VERIFIED') {
            // Valid session, just gated — reflect that in the menu instead of pretending the
            // stale (usually empty, pre-this-feature) cached wishlist/achievements are current.
            state.emailVerified = false;
            updateAuthUI(savedUser);
        }
        // Any other error (network, etc.): fail open, keep using cached local data.
    }
}

// --- LOGIN LOGIC ---
export async function handleLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!user || !pass) {
        alert(window.t ? window.t('alertBothFields') : "SYSTEM ALERT: ENTER BOTH USERNAME & PASSWORD");
        return;
    }

    // Κλήση στο backend μέσω του api.js
    let d;
    try {
        d = await api.loginUser(user, pass);
    } catch (e) {
        // A network/CORS failure here used to leave the button looking like it did nothing —
        // the request can still reach and be processed by the server even when the browser
        // then blocks reading the response, so silence here is actively misleading.
        console.error("Login request failed:", e);
        alert(window.t ? window.t('connectionErrorAlert') : "⚠️ CONNECTION ERROR!\nThe server is not responding.");
        return;
    }

    if (d && d.success) {
        localStorage.setItem('codex_username', d.username);
        if (d.token) localStorage.setItem('codex_token', d.token);
        state.emailVerified = !!d.emailVerified;
        updateAuthUI(d.username);
        if(window.showToast) {
            window.showToast('WELCOME BACK, AGENT ' + d.username.toUpperCase(), 'normal');
            if (!state.emailVerified) {
                window.showToast(window.t ? window.t('toastVerifyReminder') : '⚠ VERIFY YOUR EMAIL TO UNLOCK WISHLIST, ACHIEVEMENTS & VOTING', 'error');
            }
        }
        if(window.closeModal) window.closeModal('login-modal');
        if(window.checkAchievement) window.checkAchievement('login');
    } else {
        alert(d?.error || (window.t ? window.t('alertInvalidCreds') : "ACCESS DENIED: INVALID CREDENTIALS"));
    }
}

// --- SIGNUP LOGIC ---
export async function handleSignup() {
    const user = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const subscribed = document.getElementById('reg-subscribe')?.checked || false;

    if(!user || !email || !pass) {
        alert(window.t ? window.t('alertAllFieldsRecruit') : "SYSTEM ALERT: ALL FIELDS REQUIRED FOR RECRUITMENT");
        return;
    }

    let d;
    try {
        d = await api.registerUser(user, email, pass, subscribed);
    } catch (e) {
        // Same reasoning as handleLogin: a network/CORS failure must not look like the button
        // silently did nothing, especially here — the account can still end up created
        // server-side even though the browser never let this code see the response.
        console.error("Register request failed:", e);
        alert(window.t ? window.t('connectionErrorAlert') : "⚠️ CONNECTION ERROR!\nThe server is not responding.");
        return;
    }

    if(d && d.success) {
        localStorage.setItem('codex_username', d.username);
        if (d.token) localStorage.setItem('codex_token', d.token);
        state.emailVerified = !!d.emailVerified;
        updateAuthUI(d.username);
        if(window.showToast) {
            window.showToast("WELCOME AGENT: " + d.username.toUpperCase(), "achievement");
            // New accounts always start unverified — this is the very first thing they need to know
            window.showToast(window.t ? window.t('toastCheckEmailToVerify') : '📧 CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT', 'normal');
        }
        if(window.closeModal) window.closeModal('signup-modal');
        if(window.checkAchievement) window.checkAchievement('login');
    } else {
        alert(d?.error || (window.t ? window.t('alertRegistrationFailed') : "REGISTRATION FAILED"));
    }
}

// --- EMAIL VERIFICATION ---
export async function resendVerification() {
    try {
        const d = await api.resendVerification();
        if (d.alreadyVerified) {
            state.emailVerified = true;
            updateAuthUI(localStorage.getItem('codex_username'));
            if (window.showToast) window.showToast(window.t ? window.t('toastAlreadyVerified') : 'YOUR EMAIL IS ALREADY VERIFIED', 'normal');
        } else if (d.success) {
            if (window.showToast) window.showToast(window.t ? window.t('toastVerificationSent') : '📧 VERIFICATION EMAIL SENT — CHECK YOUR INBOX', 'achievement');
        } else {
            if (window.showToast) window.showToast(d.error || 'FAILED TO SEND VERIFICATION EMAIL', 'error');
        }
    } catch (e) {
        if (window.showToast) window.showToast('CONNECTION ERROR', 'error');
    }
}

// --- LOGOUT LOGIC ---
export function logout() {
    state.isLoggedIn = false;
    state.emailVerified = false;
    localStorage.removeItem('codex_username');
    localStorage.removeItem('codex_token');
    updateAuthUI(null);
    if(window.showToast) window.showToast("AGENT DISCONNECTED", "error");
}

// --- PASSWORD RECOVERY ---
export function openRecovery() { 
    if(window.closeModal) window.closeModal('login-modal'); 
    if(window.openModal) window.openModal('forgot-modal'); 
}

// Εξαγωγή στο window για να λειτουργούν τα onclick στο HTML
window.checkSavedSession = checkSavedSession;
window.updateAuthUI = updateAuthUI;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.logout = logout;
window.openRecovery = openRecovery;
window.resendVerification = resendVerification;