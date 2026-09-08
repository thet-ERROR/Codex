// js/modules/auth.js
import { state } from '../state.js';
import { api } from '../api.js';
import { applyProfile, pushLocalAchievements } from './achievements.js';

// --- AUTHENTICATION UI UPDATER ---
export function updateAuthUI(username) {
    const menu = document.getElementById('profile-menu');
    const dossierName = document.getElementById('dossier-username');
    const signInBtn = document.getElementById('dossier-signin-btn');
    const signUpBtn = document.getElementById('dossier-signup-btn');
    const logoutBtn = document.getElementById('dossier-logout-btn');
    const userDisplay = document.getElementById('user-display');

    const t = window.t || (k => k);

    if (username) {
        state.isLoggedIn = true;
        if (dossierName) dossierName.innerText = username.toUpperCase();
        if (userDisplay) userDisplay.innerText = username.toUpperCase();
        // The rank line is owned by refreshProgressionUI() — it comes from the API's XP total now,
        // and hardcoding "OPERATIVE" for anyone logged in used to overwrite the real one.

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

// Pulls wishlist + progression from the account. Shared by the boot-time session check, a fresh
// login, and main.js's focus-triggered re-check (verification often finishes in a different
// browser context — a mail app's in-app browser — so the tab someone is actually watching has no
// way to know until it asks again). Keeping one copy is what stops these paths from drifting into
// showing different profiles for the same agent.
export async function hydrateProfile() {
    const me = await api.getMe();
    state.wishlist = me.wishlist || [];
    localStorage.setItem('codex_wishlist', JSON.stringify(state.wishlist));
    // Badges earned while logged out (or while the account was still unverified) live only in
    // localStorage. Hand them over before trusting the server's list, or applying it would simply
    // erase them. Whatever comes back last is the authoritative profile.
    const merged = await pushLocalAchievements(me.achievements);
    applyProfile(merged || me);
    return me;
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
        await hydrateProfile();
        // Reaching here at all means requireVerified passed on the backend
        state.emailVerified = true;
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
        // 'recruited' is granted by the API itself now, so there's nothing to report here — but
        // the profile does have to be pulled in, otherwise rank and XP stay at their logged-out
        // defaults until the next page load.
        // Not awaited: the modal should close on the login, not on a cold dyno's first response.
        if (state.emailVerified) hydrateProfile().catch(() => {});
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
        // No achievement to report: a brand-new account is unverified, so every account-bound
        // badge stays locked until the email link is used — which is the whole point of the gate.
    } else {
        alert(d?.error || (window.t ? window.t('alertRegistrationFailed') : "REGISTRATION FAILED"));
    }
}

// --- EMAIL VERIFICATION ---

// Client-side cooldown, purely for UI (disabling the button, showing a countdown) so a bored click
// doesn't queue several emails before the server's own 60s cooldown ever gets a chance to answer.
// The server is still the real enforcement — see the 429/retryAfterMs handling below, which
// resyncs this to the server's clock whenever they disagree (multi-tab, multi-device, or just a
// browser clock that drifted).
const RESEND_COOLDOWN_KEY = 'codex_verify_resend_until';
const RESEND_COOLDOWN_MS = 60 * 1000;

function resendCooldownRemainingMs() {
    const until = parseInt(localStorage.getItem(RESEND_COOLDOWN_KEY)) || 0;
    return Math.max(0, until - Date.now());
}

let resendCooldownInterval = null;

// Ties the dossier's RESEND EMAIL button to whatever cooldown is currently active. Called after
// every send attempt and again whenever the dossier opens, since a cooldown started from one
// place (say, the profile-menu shortcut) has to be reflected the next time this button renders.
export function refreshResendCooldownUI() {
    const btn = document.getElementById('dossier-resend-btn');
    if (!btn) return;
    clearInterval(resendCooldownInterval);

    const tick = () => {
        const remaining = resendCooldownRemainingMs();
        if (remaining <= 0) {
            btn.disabled = false;
            btn.textContent = window.t ? window.t('dossierResendBtn') : 'RESEND EMAIL';
            clearInterval(resendCooldownInterval);
            return;
        }
        btn.disabled = true;
        const s = Math.ceil(remaining / 1000);
        btn.textContent = window.t ? window.t('dossierResendCountdown', { s }) : `RESEND IN ${s}s`;
    };
    tick();
    resendCooldownInterval = setInterval(tick, 1000);
}

function startResendCooldown(ms) {
    localStorage.setItem(RESEND_COOLDOWN_KEY, String(Date.now() + ms));
    refreshResendCooldownUI();
}

export async function resendVerification() {
    const remaining = resendCooldownRemainingMs();
    if (remaining > 0) {
        const s = Math.ceil(remaining / 1000);
        if (window.showToast) window.showToast(window.t ? window.t('toastResendCooldown', { s }) : `WAIT ${s}s BEFORE RESENDING`, 'error');
        return;
    }
    try {
        const d = await api.resendVerification();
        if (d.alreadyVerified) {
            state.emailVerified = true;
            updateAuthUI(localStorage.getItem('codex_username'));
            // The gate just came off, so the account's real profile is now readable
            hydrateProfile().catch(() => {});
            if (window.showToast) window.showToast(window.t ? window.t('toastAlreadyVerified') : 'YOUR EMAIL IS ALREADY VERIFIED', 'normal');
        } else if (d.success) {
            startResendCooldown(RESEND_COOLDOWN_MS);
            if (window.showToast) window.showToast(window.t ? window.t('toastVerificationSent') : '📧 VERIFICATION EMAIL SENT — CHECK YOUR INBOX', 'achievement');
        } else {
            // A 429 here means another tab/device already started a cooldown this one didn't know
            // about — sync to the server's authoritative remaining time instead of guessing.
            if (d.retryAfterMs) startResendCooldown(d.retryAfterMs);
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
    // Progression belongs to the account, not the browser — leaving the old rank and XP on screen
    // after signing out would show the next person someone else's profile.
    state.xp = 0;
    state.rank = 'recruit';
    state.nextRank = null;
    state.nextRankXp = null;
    state.rankProgress = 0;
    localStorage.removeItem('codex_username');
    localStorage.removeItem('codex_token');
    updateAuthUI(null);
    if (window.refreshProgressionUI) window.refreshProgressionUI();
    if(window.showToast) window.showToast("AGENT DISCONNECTED", "error");
}

// --- PASSWORD RECOVERY ---
export function openRecovery() {
    if(window.closeModal) window.closeModal('login-modal');
    if(window.openModal) window.openModal('forgot-modal');
}

// Step 1: ask for a reset token by email. index.html has always called this from the "SEND TOKEN"
// button, but it was never actually implemented — the whole recovery flow was dead on the
// frontend even though both backend routes existed.
export async function requestReset() {
    const emailEl = document.getElementById('forgot-email');
    const email = emailEl ? emailEl.value.trim() : '';
    const t = window.t || (k => k);

    if (!email) {
        alert(t('alertEnterEmail'));
        return;
    }

    try {
        await api.forgotPassword(email);
        // The backend answers identically whether or not the address has an account (so nobody
        // can probe for registered emails), so this wording must not imply one exists either.
        if (window.showToast) window.showToast(t('toastResetSent'), 'normal');
        if (window.closeModal) window.closeModal('forgot-modal');
        if (window.openModal) window.openModal('reset-modal');
    } catch (e) {
        console.error("Password reset request failed:", e);
        alert(t('connectionErrorAlert'));
    }
}

// Step 2: exchange that token plus a new password for a working login.
export async function completeReset() {
    const tokenEl = document.getElementById('reset-token');
    const passEl = document.getElementById('new-pass');
    const token = tokenEl ? tokenEl.value.trim() : '';
    const newPass = passEl ? passEl.value : '';
    const t = window.t || (k => k);

    if (!token || !newPass) {
        alert(t('alertTokenAndPassword'));
        return;
    }

    try {
        await api.resetPassword(token, newPass);
        if (window.showToast) window.showToast(t('toastPasswordUpdated'), 'achievement');
        if (tokenEl) tokenEl.value = '';
        if (passEl) passEl.value = '';
        if (window.closeModal) window.closeModal('reset-modal');
        if (window.openModal) window.openModal('login-modal');
    } catch (e) {
        // Surfaces the backend's own reason (expired/invalid token, password too short)
        alert(e && e.error ? e.error : t('connectionErrorAlert'));
    }
}

// Εξαγωγή στο window για να λειτουργούν τα onclick στο HTML
window.checkSavedSession = checkSavedSession;
window.updateAuthUI = updateAuthUI;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.logout = logout;
window.openRecovery = openRecovery;
window.resendVerification = resendVerification;
window.refreshResendCooldownUI = refreshResendCooldownUI;
window.requestReset = requestReset;
window.completeReset = completeReset;