export const CONFIG = {
    API_URL: 'https://phoenix-codex.onrender.com/api',
    WHATSAPP_NUM: '306912345678',
    INSTAGRAM_URL: 'https://instagram.com/codex_rigs',
    DEFAULT_THEME: '#ccff00',
    // Fallback only — the live price comes from /api/status (admin-editable). Used when the
    // status call fails and we boot in offline/fail-open mode.
    DEFAULT_PRO_CONFIG_PRICE: 30,
    ACHIEVEMENTS_LIST: [
        { id: 'login', title: 'AGENT RECRUITED', desc: 'Logged in for the first time.', icon: 'ph-identification-card' },
        { id: 'cart', title: 'FIRST LOOT', desc: 'Added an item to the cart.', icon: 'ph-shopping-cart' },
        { id: 'vote', title: 'VOTE CASTER', desc: 'Participated in a community vote.', icon: 'ph-thumbs-up' }
    ]
};

// Εξαγωγή στο window για να υπάρχει πρόσβαση αν χρειαστεί κάπου global
window.CONFIG = CONFIG;