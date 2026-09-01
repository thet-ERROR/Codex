// js/modules/achievements.js
import { state } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';

export function checkAchievement(id) {
    if (!state.achievements.includes(id)) {
        state.achievements.push(id);
        localStorage.setItem('codex_achievements', JSON.stringify(state.achievements));
        if(window.showToast) window.showToast(`ACHIEVEMENT UNLOCKED: ${id.toUpperCase()}`, "achievement");
        if (state.isLoggedIn) api.saveAchievement(id).catch(() => {});
    }
}

export function openAchievements() { 
    if(!state.isLoggedIn) { 
        if(window.showToast) window.showToast("ACCESS DENIED. LOGIN REQUIRED.", "normal"); 
        if(window.openModal) window.openModal('login-modal'); 
        return; 
    } 
    
    const list = document.getElementById('ach-list'); 
    if(list) {
        list.innerHTML = CONFIG.ACHIEVEMENTS_LIST.map(a => { 
            const unlocked = state.achievements.includes(a.id);
            return `<div class="ach-card ${unlocked ? 'unlocked' : ''}">
                        <i class="ph-fill ${a.icon} ach-icon"></i>
                        <div class="ach-info">
                            <h4>${a.title}</h4>
                            <p>${a.desc}</p>
                        </div>
                        <div class="ach-status">${unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
                    </div>`; 
        }).join(''); 
    }
    if(window.openModal) window.openModal('achievements-modal'); 
}

export function openAgentDashboard() {
    // 1. Έλεγχος αν είναι συνδεδεμένος
    if(!state.isLoggedIn) { 
        if(window.showToast) window.showToast("ACCESS DENIED. LOGIN REQUIRED.", "error"); 
        if(window.openModal) window.openModal('login-modal'); 
        return; 
    }

    // 2. Ενημέρωση Ονόματος
    const userName = document.getElementById('user-display')?.innerText || 'UNKNOWN_AGENT';
    const dossierNameEl = document.getElementById('dossier-username');
    if(dossierNameEl) dossierNameEl.innerText = userName;

    // 3. Υπολογισμός Rank (βάσει ξεκλειδωμένων achievements)
    let unlockedCount = state.achievements.length;
    let rank = "RECRUIT";
    if (unlockedCount >= 1) rank = "OPERATIVE";
    if (unlockedCount >= 3) rank = "ELITE AGENT";
    
    const rankEl = document.getElementById('dossier-rank');
    if(rankEl) rankEl.innerText = rank;

    const totalAchievements = CONFIG.ACHIEVEMENTS_LIST.length;
    const rankFillEl = document.getElementById('dossier-rank-fill');
    if(rankFillEl) rankFillEl.style.width = Math.min((unlockedCount / totalAchievements) * 100, 100) + '%';

    const statsEl = document.getElementById('dossier-stats');
    if(statsEl) {
        statsEl.innerHTML = `
            <div class="dossier-stat-chip">${state.wishlist.length} WISHLIST</div>
            <div class="dossier-stat-chip">${unlockedCount}/${totalAchievements} ACHIEVEMENTS</div>
            <div class="dossier-stat-chip">${state.cart.length} IN CART</div>
        `;
    }

    // 4. Ενημέρωση Achievements μέσα στο Dashboard
    const achListContainer = document.getElementById('dossier-achievements');
    if(achListContainer) {
        achListContainer.innerHTML = CONFIG.ACHIEVEMENTS_LIST.map(a => { 
            const unlocked = state.achievements.includes(a.id);
            return `<div class="ach-card ${unlocked ? 'unlocked' : ''}" style="margin-bottom:10px; width:100%; box-sizing:border-box;">
                        <i class="ph-fill ${a.icon} ach-icon"></i>
                        <div class="ach-info">
                            <h4>${a.title}</h4>
                            <p style="font-size:0.7rem; color:#888;">${a.desc}</p>
                        </div>
                        <div class="ach-status" style="font-size:0.7rem;">${unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
                    </div>`; 
        }).join(''); 
    }

    // 5. Ενημέρωση Wishlist μέσα στο Dashboard
    const wishlistContainer = document.getElementById('dossier-wishlist');
    if(wishlistContainer) {
        if(state.wishlist.length === 0) {
            wishlistContainer.innerHTML = '<div class="dossier-empty">> NO TARGETS LOCKED.</div>';
        } else {
            wishlistContainer.innerHTML = state.wishlist.map(pc => `
                <div style="display:flex; align-items:center; gap:15px; background:rgba(0,0,0,0.5); padding:10px; border:1px solid #333; border-radius:6px; width:100%; box-sizing:border-box; margin-bottom:10px;">
                    <img src="${pc.images[0]}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid var(--neon-purple);">
                    <div>
                        <div style="color:#fff; font-family:var(--font-ui); font-size:0.9rem;">${pc.name}</div>
                        <div style="color:var(--neon-green); font-size:0.8rem; font-family:monospace;">${pc.price}</div>
                    </div>
                    <button onclick="toggleWishlist('${pc._id || pc.id}')" style="margin-left:auto; background:transparent; border:none; color:#ff3333; cursor:pointer; font-size:1.2rem; transition:0.2s;">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    // 6. Άνοιγμα του παραθύρου!
    if(window.openModal) window.openModal('agent-dashboard-modal');
}

// Εξαγωγή στο global scope για να λειτουργούν τα onclick στο HTML
window.checkAchievement = checkAchievement;
window.openAchievements = openAchievements;
window.openAgentDashboard = openAgentDashboard;