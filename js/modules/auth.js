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

    if (username) {
        state.isLoggedIn = true;
        if (dossierName) dossierName.innerText = username.toUpperCase();
        if (userDisplay) userDisplay.innerText = username.toUpperCase();
        if (dossierRank) dossierRank.innerText = "OPERATIVE";
        
        if (signInBtn) signInBtn.style.display = 'none';
        if (signUpBtn) signUpBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

        if (menu) {
            menu.innerHTML = `
                <div class="p-item" onclick="playClick(); toggleProfileMenu(); openAgentDashboard();" style="color: var(--neon-green);">📊 DASHBOARD</div>
                <div class="p-item" onclick="playClick(); logout(); toggleProfileMenu();" style="color: #ff3333;">❌ SIGN OUT</div>
            `;
        }
    } else {
        state.isLoggedIn = false;
        if (dossierName) dossierName.innerText = "UNKNOWN_USER";
        if (userDisplay) userDisplay.innerText = "AGENT";
        if (dossierRank) dossierRank.innerText = "RECRUIT";
        
        if (signInBtn) signInBtn.style.display = 'block';
        if (signUpBtn) signUpBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';

        if (menu) {
            menu.innerHTML = `
                <div class="p-item" onclick="playClick(); toggleProfileMenu(); openModal('login-modal');">SIGN IN</div>
                <div class="p-item" onclick="playClick(); toggleProfileMenu(); openModal('signup-modal');">REGISTER</div>
            `;
        }
    }
}

// --- SESSION CHECK ---
export function checkSavedSession() {
    const savedUser = localStorage.getItem('codex_username');
    if (savedUser) {
        state.isLoggedIn = true;
        updateAuthUI(savedUser);
    } else {
        state.isLoggedIn = false;
        updateAuthUI(null);
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
        updateAuthUI(d.username);
        if(window.showToast) window.showToast('WELCOME BACK, AGENT ' + d.username.toUpperCase(), 'normal');
        if(window.closeModal) window.closeModal('login-modal');
        if(window.checkAchievement) window.checkAchievement('login');
        if(window.refreshWheelButton) window.refreshWheelButton();
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
        updateAuthUI(d.username);
        if(window.showToast) window.showToast("WELCOME AGENT: " + d.username.toUpperCase(), "achievement");
        if(window.closeModal) window.closeModal('signup-modal');
        if(window.checkAchievement) window.checkAchievement('login');
        if(window.refreshWheelButton) window.refreshWheelButton();
    } else { 
        alert(d?.error || "REGISTRATION FAILED"); 
    }
}

// --- LOGOUT LOGIC ---
export function logout() { 
    state.isLoggedIn = false; 
    localStorage.removeItem('codex_username');
    updateAuthUI(null);
    if(window.refreshWheelButton) window.refreshWheelButton();
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