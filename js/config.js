export const CONFIG = {
    API_URL: 'https://codex-backend-9kij.onrender.com/api',
    WHATSAPP_NUM: '306912345678',
    INSTAGRAM_URL: 'https://instagram.com/codex_rigs',
    DEFAULT_THEME: '#ccff00',
    // Fallback only — the live price comes from /api/status (admin-editable). Used when the
    // status call fails and we boot in offline/fail-open mode.
    DEFAULT_PRO_CONFIG_PRICE: 30,

    // --- 🏅 ACHIEVEMENTS ---
    // Presentation only. Which badges are unlocked, what each is worth and what rank that adds up
    // to are all decided by the API (server.js ACHIEVEMENTS / RANKS) and arrive with /api/me — the
    // client never computes them, because a client that could compute them could also fake them.
    //
    // `source` mirrors the server's registry and is what the UI reads to decide whether to report
    // an id at all: 'client' badges are the ones checkAchievement() may POST, 'server' badges are
    // granted by the API on its own and any attempt to report one is refused.
    //
    // Titles and descriptions live here rather than in i18n.js because they're tabular data tied
    // to an id, not page chrome — keeping them next to the icon means adding a badge is one entry
    // in one place instead of four edits across two files.
    ACHIEVEMENTS_LIST: [
        { id: 'recruited', source: 'server', icon: 'ph-identification-card',
          title: { en: 'AGENT RECRUITED', el: 'ΣΤΡΑΤΟΛΟΓΗΘΗΚΕΣ' },
          desc:  { en: 'Created a CODEX account.', el: 'Δημιούργησες λογαριασμό στο CODEX.' } },
        { id: 'identity_confirmed', source: 'server', icon: 'ph-seal-check',
          title: { en: 'IDENTITY CONFIRMED', el: 'ΤΑΥΤΟΤΗΤΑ ΕΠΙΒΕΒΑΙΩΜΕΝΗ' },
          desc:  { en: 'Verified your email address.', el: 'Επιβεβαίωσες τη διεύθυνση email σου.' } },
        { id: 'first_target', source: 'server', icon: 'ph-crosshair',
          title: { en: 'FIRST TARGET', el: 'ΠΡΩΤΟΣ ΣΤΟΧΟΣ' },
          desc:  { en: 'Saved a system to your wishlist.', el: 'Αποθήκευσες ένα σύστημα στη wishlist.' } },
        { id: 'collector', source: 'server', icon: 'ph-bookmarks-simple',
          title: { en: 'COLLECTOR', el: 'ΣΥΛΛΕΚΤΗΣ' },
          desc:  { en: 'Five systems on your wishlist.', el: 'Πέντε συστήματα στη wishlist σου.' } },
        { id: 'hoarder', source: 'server', icon: 'ph-vault',
          title: { en: 'ARMOURY KEEPER', el: 'ΦΥΛΑΚΑΣ ΟΠΛΟΣΤΑΣΙΟΥ' },
          desc:  { en: 'Ten systems on your wishlist.', el: 'Δέκα συστήματα στη wishlist σου.' } },
        { id: 'vote_caster', source: 'server', icon: 'ph-thumbs-up',
          title: { en: 'VOTE CASTER', el: 'ΨΗΦΟΦΟΡΟΣ' },
          desc:  { en: 'Voted on a community drop.', el: 'Ψήφισες σε κοινοτικό drop.' } },
        { id: 'kingmaker', source: 'server', icon: 'ph-crown-simple',
          title: { en: 'KINGMAKER', el: 'ΡΥΘΜΙΣΤΗΣ' },
          desc:  { en: 'Voted on three community drops.', el: 'Ψήφισες σε τρία κοινοτικά drops.' } },
        { id: 'signal_intercepted', source: 'server', icon: 'ph-broadcast',
          title: { en: 'SIGNAL INTERCEPTED', el: 'ΣΗΜΑ ΣΕ ΑΚΡΟΑΣΗ' },
          desc:  { en: 'Subscribed to drop alerts.', el: 'Εγγράφηκες στις ειδοποιήσεις drop.' } },
        { id: 'field_report', source: 'server', icon: 'ph-note-pencil',
          title: { en: 'FIELD REPORT', el: 'ΑΝΑΦΟΡΑ ΠΕΔΙΟΥ' },
          desc:  { en: 'Submitted a review with a mission code.', el: 'Έστειλες κριτική με κωδικό αποστολής.' } },
        { id: 'veteran', source: 'server', icon: 'ph-medal-military',
          title: { en: 'VETERAN', el: 'ΒΕΤΕΡΑΝΟΣ' },
          desc:  { en: 'Account active for 30 days.', el: 'Λογαριασμός ενεργός για 30 ημέρες.' } },
        { id: 'founder', source: 'server', icon: 'ph-flag-banner',
          title: { en: 'FOUNDING AGENT', el: 'ΙΔΡΥΤΙΚΟ ΜΕΛΟΣ' },
          desc:  { en: 'One of the first 100 agents.', el: 'Ένας από τους πρώτους 100 πράκτορες.' } },

        { id: 'first_loot', source: 'client', icon: 'ph-shopping-cart',
          title: { en: 'FIRST LOOT', el: 'ΠΡΩΤΗ ΛΕΙΑ' },
          desc:  { en: 'Added an item to the cart.', el: 'Πρόσθεσες προϊόν στο καλάθι.' } },
        { id: 'comparator', source: 'client', icon: 'ph-scales',
          title: { en: 'COMPARATOR', el: 'ΣΥΓΚΡΙΤΗΣ' },
          desc:  { en: 'Compared two systems in VS mode.', el: 'Σύγκρινες δύο συστήματα σε VS mode.' } },
        { id: 'deep_scan', source: 'client', icon: 'ph-magnifying-glass-plus',
          title: { en: 'DEEP SCAN', el: 'ΒΑΘΙΑ ΣΑΡΩΣΗ' },
          desc:  { en: 'Flipped a card to read its full specs.', el: 'Γύρισες κάρτα για να δεις πλήρη specs.' } },
        { id: 'benchmarker', source: 'client', icon: 'ph-gauge',
          title: { en: 'BENCHMARKER', el: 'ΜΕΤΡΗΤΗΣ ΕΠΙΔΟΣΕΩΝ' },
          desc:  { en: 'Opened the FPS benchmark panel.', el: 'Άνοιξες τον πίνακα FPS.' } },
        { id: 'hacker', source: 'client', icon: 'ph-spiral',
          title: { en: 'HACKER', el: 'ΧΑΚΕΡ' },
          desc:  { en: 'Spun the reward wheel.', el: 'Γύρισες τον τροχό επάθλων.' } },
        { id: 'terminal_access', source: 'client', icon: 'ph-terminal-window',
          title: { en: 'TERMINAL ACCESS', el: 'ΠΡΟΣΒΑΣΗ ΤΕΡΜΑΤΙΚΟΥ' },
          desc:  { en: 'Ran a command in the terminal.', el: 'Έτρεξες εντολή στο τερματικό.' } },
        { id: 'polyglot', source: 'client', icon: 'ph-translate',
          title: { en: 'POLYGLOT', el: 'ΠΟΛΥΓΛΩΣΣΟΣ' },
          desc:  { en: 'Switched the interface language.', el: 'Άλλαξες τη γλώσσα της διεπαφής.' } },
        { id: 'night_owl', source: 'client', icon: 'ph-moon-stars',
          title: { en: 'NIGHT OWL', el: 'ΝΥΧΤΟΠΟΥΛΙ' },
          desc:  { en: 'Browsed the codex between 00:00 and 05:00.', el: 'Περιηγήθηκες μεταξύ 00:00 και 05:00.' } }
    ],

    // Display names for the ranks the API reports. Thresholds are deliberately NOT here — the
    // server owns them, and duplicating the numbers is how the two ends drift apart.
    RANK_NAMES: {
        recruit:    { en: 'RECRUIT',     el: 'ΝΕΟΣΥΛΛΕΚΤΟΣ' },
        operative:  { en: 'OPERATIVE',   el: 'ΠΡΑΚΤΟΡΑΣ' },
        fieldAgent: { en: 'FIELD AGENT', el: 'ΕΠΙΧΕΙΡΗΣΙΑΚΟΣ' },
        specialist: { en: 'SPECIALIST',  el: 'ΕΙΔΙΚΟΣ' },
        eliteAgent: { en: 'ELITE AGENT', el: 'ΕΠΙΛΕΚΤΟΣ' },
        phantom:    { en: 'PHANTOM',     el: 'ΦΑΝΤΑΣΜΑ' }
    }
};

// Εξαγωγή στο window για να υπάρχει πρόσβαση αν χρειαστεί κάπου global
window.CONFIG = CONFIG;
