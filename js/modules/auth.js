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
            menu.innerHTML = `
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
        }
        // Any other error (network, etc.): fail open, keep using cached local data.
    }
}

// --- LOGIN LOGIC ---
export async function handleLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!user || !pass) {
        alert("SYSTEM ALERT: ENTER BOTH USERNAME & PASSWORD");
        return;
    }

    // Κλήση στο backend μέσω του api.js
    const d = await api.loginUser(user, pass);

    if (d && d.success) {
        localStorage.setItem('codex_username', d.username);
        if (d.token) localStorage.setItem('codex_token', d.token);
        updateAuthUI(d.username);
        if(window.showToast) window.showToast('WELCOME BACK, AGENT ' + d.username.toUpperCase(), 'normal');
        if(window.closeModal) window.closeModal('login-modal');
        if(window.checkAchievement) window.checkAchievement('login');
    } else {
        alert(d?.error || "ACCESS DENIED: INVALID CREDENTIALS");
    }
}

// --- SIGNUP LOGIC ---
export async function handleSignup() {
    const user = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const subscribed = document.getElementById('reg-subscribe')?.checked || false;

    if(!user || !email || !pass) {
        alert("SYSTEM ALERT: ALL FIELDS REQUIRED FOR RECRUITMENT");
        return;
    }

    const d = await api.registerUser(user, email, pass, subscribed);
    
    if(d && d.success) {
        localStorage.setItem('codex_username', d.username);
        if (d.token) localStorage.setItem('codex_token', d.token);
        updateAuthUI(d.username);
        if(window.showToast) window.showToast("WELCOME AGENT: " + d.username.toUpperCase(), "achievement");
        if(window.closeModal) window.closeModal('signup-modal');
        if(window.checkAchievement) window.checkAchievement('login');
    } else {
        alert(d?.error || "REGISTRATION FAILED");
    }
}

// --- LOGOUT LOGIC ---
export function logout() {
    state.isLoggedIn = false;
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