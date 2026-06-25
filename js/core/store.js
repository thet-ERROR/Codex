// js/core/store.js
export const store = {
    state: {
        inventory: [],
        filtered: [],
        currentTab: 'live',
        user: null, // null σημαίνει guest
        cart: [],
        wishlist: [],
        achievements: { login: false, cart: false, vote: false }
    },

    init() {
        // Ανάκτηση δεδομένων από το LocalStorage κατά την εκκίνηση
        const savedUser = localStorage.getItem('codex_username');
        if (savedUser) this.state.user = savedUser;

        this.state.cart = JSON.parse(localStorage.getItem('codex_cart')) || [];
        this.state.wishlist = JSON.parse(localStorage.getItem('codex_wishlist')) || [];
        this.state.achievements = JSON.parse(localStorage.getItem('codex_achievements')) || this.state.achievements;
    },

    // --- AUTHENTICATION ---
    setUser(username) {
        this.state.user = username;
        localStorage.setItem('codex_username', username);
        this.unlockAchievement('login');
    },

    logout() {
        this.state.user = null;
        localStorage.removeItem('codex_username');
        // Προαιρετικά: Μπορείς να καθαρίζεις το wishlist στο logout, ή να το κρατάς τοπικά.
    },

    // --- WISHLIST ---
    toggleWishlist(pc) {
        const index = this.state.wishlist.findIndex(item => (item._id || item.id) === (pc._id || pc.id));
        let added = false;

        if (index > -1) {
            this.state.wishlist.splice(index, 1);
        } else {
            this.state.wishlist.push(pc);
            added = true;
        }

        localStorage.setItem('codex_wishlist', JSON.stringify(this.state.wishlist));
        return added; // Επιστρέφει true αν προστέθηκε, false αν αφαιρέθηκε (χρήσιμο για τα Toasts στο UI)
    },

    // --- CART ---
    addToCart(item) {
        this.state.cart.push(item);
        localStorage.setItem('codex_cart', JSON.stringify(this.state.cart));
        if (this.state.user) this.unlockAchievement('cart');
    },

    removeFromCart(index) {
        this.state.cart.splice(index, 1);
        localStorage.setItem('codex_cart', JSON.stringify(this.state.cart));
    },

    // --- ACHIEVEMENTS ---
    unlockAchievement(id) {
        // Κανόνας 3: Μόνο οι Logged In χρήστες ξεκλειδώνουν achievements
        if (!this.state.user || this.state.achievements[id]) return false; 
        
        this.state.achievements[id] = true;
        localStorage.setItem('codex_achievements', JSON.stringify(this.state.achievements));
        return true; // Σήμα για να πετάξει το UI το Toast
    }
};

// Αρχικοποίηση με το που φορτώσει το module
store.init();