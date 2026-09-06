// js/modules/wishlist.js
import { state } from '../state.js';
import { api } from '../api.js';

export function toggleWishlist(param) {
    if(window.playClick) window.playClick();
    
    let pcId = null;
    let isBtn = false;
    let btn = null;

    // 1. Αναγνώριση παραμέτρου (είναι ID ή Κουμπί;)
    if (typeof param === 'object' && param !== null && param.classList) {
        isBtn = true;
        btn = param;
        // Αν πατήθηκε το κουμπί από το Gallery, παίρνουμε το ενεργό PC από το state
        if (state.currentGalleryPC) {
            pcId = state.currentGalleryPC._id || state.currentGalleryPC.id;
        }
    } else {
        pcId = param;
    }

    if (!pcId) return;

    // 2. Εύρεση του υπολογιστή στο inventory
    const pc = state.inventory.find(p => (p._id || p.id) === pcId);
    if (!pc) return;

    // 3. Έλεγχος αν υπάρχει ήδη στη λίστα
    const index = state.wishlist.findIndex(p => (p._id || p.id) === pcId);

    let added;
    if (index > -1) {
        // Υπάρχει ήδη -> Αφαίρεση
        state.wishlist.splice(index, 1);
        if (window.showToast) window.showToast("TARGET REMOVED FROM WISHLIST", "normal");
        if (isBtn && btn) btn.classList.remove('locked');
        added = false;
    } else {
        // Δεν υπάρχει -> Προσθήκη
        state.wishlist.push(pc);
        if (window.showToast) window.showToast("TARGET LOCKED: SAVED TO PROFILE", "achievement");
        if (isBtn && btn) btn.classList.add('locked');
        added = true;
    }

    // 4. Αποθήκευση τοπικά
    localStorage.setItem('codex_wishlist', JSON.stringify(state.wishlist));

    // 4b. Συγχρονισμός με τον λογαριασμό, αν είναι συνδεδεμένος (best-effort, δεν μπλοκάρει το UI)
    if (state.isLoggedIn) {
        api.saveWishlist(pcId, added ? 'add' : 'remove').catch((e) => {
            if (!window.showToast) return;
            if (e && e.code === 'EMAIL_NOT_VERIFIED') {
                window.showToast("⚠ VERIFY YOUR EMAIL TO SYNC WISHLIST TO YOUR ACCOUNT", "error");
            } else {
                window.showToast("WISHLIST SYNC FAILED — SAVED LOCALLY ONLY", "error");
            }
        });
    }

    // 5. Ανανέωση UI
    if (window.renderCard) window.renderCard(); // Ανανεώνει το κεντρικό μενού αν χρειάζεται
    
    // Αν το Dashboard του Agent είναι ανοιχτό, το κάνουμε refresh για να δείξει αμέσως την αλλαγή
    const dashboard = document.getElementById('agent-dashboard-modal');
    if (dashboard && dashboard.classList.contains('active')) {
        if (window.openAgentDashboard) window.openAgentDashboard();
    }
}

// Εξαγωγή στο global scope για να παίζουν τα onclick του HTML
window.toggleWishlist = toggleWishlist;