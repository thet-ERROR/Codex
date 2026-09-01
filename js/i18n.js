// js/i18n.js
const translations = {
    el: {
        sideSettings: "Ρυθμίσεις Συστήματος", sideTrust: "Εγγύηση & Αξιοπιστία", sideRules: "Κανόνες", sideHelp: "Βοήθεια",
        sideWheel: "Καθημερινή Περιστροφή", sideLang: "Αλλαγή Γλώσσας", sideSocial: "Κοινωνικά Δίκτυα", sideDiscord: "Discord",
        sideInstagram: "Instagram", sideDropAlerts: "Ειδοποιήσεις Νέων PC", sideReviews: "Κριτικές", sideTerminal: "Τερματικό",

        reviewsLabel: "ΚΡΙΤΙΚΕΣ", writeReviewBtn: "[+] ΓΡΑΨΕ ΚΡΙΤΙΚΗ", cartLabel: "ΚΑΛΑΘΙ",
        packGaming: "GAMING", packStreaming: "STREAMING", packCoding: "CODING",
        armoryLocked: "ΟΠΛΟΣΤΑΣΙΟ ΚΛΕΙΔΩΜΕΝΟ", voteCommunityDrop: "ΚΟΙΝΟΤΙΚΟ DROP!", voteProgressLabel: "ΠΡΟΟΔΟΣ",
        vsModeReady: "ΛΕΙΤΟΥΡΓΙΑ VS ΕΤΟΙΜΗ", chatTop: "CODEX AI",

        storageLabel: "Επέκταση Αποθηκευτικού Χώρου", storageOptStandard: "Στάνταρ (Χωρίς Επιπλέον)",
        storageOptHdd: "+ 1TB HDD (€50)", storageOptSsd: "+ 1TB SSD (€80)",

        wheelTitle: "ΓΥΡΙΣΕ ΤΟΝ ΤΡΟΧΟ", wheelLegendTitle: "ΠΙΘΑΝΑ ΕΠΑΘΛΑ",
        rewardCyberGold: "SKIN CYBER GOLD", rewardToxicOrange: "SKIN TOXIC ORANGE", rewardNeonPink: "SKIN NEON PINK",
        rewardMatrixGreen: "SKIN MATRIX GREEN", rewardCoupon: "ΚΟΥΠΟΝΙ 5%",

        trustTitle: "ΠΡΩΤΟΚΟΛΛΑ ΕΜΠΙΣΤΟΣΥΝΗΣ",
        trustWarrantyTitle: "ΝΟΜΙΜΗ ΕΓΓΥΗΣΗ 2 ΕΤΩΝ",
        trustWarrantyText: "Κάθε σύστημα καλύπτεται από τη νόμιμη εγγύηση 2 ετών για ελαττώματα, σύμφωνα με την ισχύουσα νομοθεσία περί προστασίας καταναλωτή.",
        trustReturnTitle: "ΔΙΚΑΙΩΜΑ ΥΠΑΝΑΧΩΡΗΣΗΣ 14 ΗΜΕΡΩΝ",
        trustReturnText: "Έχετε δικαίωμα υπαναχώρησης εντός 14 ημερολογιακών ημερών από την παραλαβή, χωρίς αιτιολόγηση, σύμφωνα με την ενωσιακή νομοθεσία εξ αποστάσεως πωλήσεων.",
        trustShippingTitle: "ΑΠΟΣΤΟΛΗ ΕΝΤΟΣ ΕΛΛΑΔΑΣ",
        trustShippingText: "Ασφαλής συσκευασία και παράδοση σε όλη την Ελλάδα, με πλήρη έλεγχο λειτουργίας πριν την αποστολή.",

        settingsTitle: "ΡΥΘΜΙΣΕΙΣ ΣΥΣΤΗΜΑΤΟΣ", accentColorLabel: "ΧΡΩΜΑ ΤΟΝΙΣΜΟΥ",

        newsletterTitle: "ΕΙΔΟΠΟΙΗΣΕΙΣ ΝΕΩΝ PC", newsletterDesc: "Ειδοποιήσου μόλις βγει νέο PC ή ξεκινήσει ψηφοφορία.", newsletterBtn: "ΕΝΕΡΓΟΠΟΙΗΣΗ ΕΙΔΟΠΟΙΗΣΕΩΝ",
        reviewCodeTitle: "ΕΠΙΒΕΒΑΙΩΜΕΝΗ ΚΡΙΤΙΚΗ", reviewCodeBtn: "ΑΠΟΣΤΟΛΗ", rcUserPlaceholder: "Όνομα Πράκτορα", rcTextPlaceholder: "Απόδοση συστήματος...",

        missionTitle: "ΕΠΙΚΥΡΩΣΗ ΣΥΣΤΗΜΑΤΟΣ", missionWindowLabel: "Ο ΧΡΟΝΟΣ ΕΠΙΚΥΡΩΣΗΣ ΛΗΓΕΙ ΣΕ:",
        missionKeepBtn: "ΤΟ ΣΥΣΤΗΜΑ ΛΕΙΤΟΥΡΓΕΙ (ΚΡΑΤΑ & ΑΞΙΟΛΟΓΗΣΕ)", missionReportTitle: "Αναφορά Βλάβης Συστήματος",
        missionSelectReason: "Επίλεξε Πρωτόκολλο Σφάλματος...", missionReason1: "1. Απόκλιση FPS", missionReason2: "2. Βλάβη Υλικού (DOA)",
        missionReturnBtn: "ΕΝΑΡΞΗ ΕΠΙΣΤΡΟΦΗΣ",

        loginTitle: "ΣΥΝΔΕΣΗ ΠΡΑΚΤΟΡΑ", usernamePlaceholder: "ΟΝΟΜΑ ΧΡΗΣΤΗ", passwordPlaceholder: "ΚΩΔΙΚΟΣ",
        loginBtn: "ΣΥΝΔΕΣΗ", lostAccessLink: "[ ΞΕΧΑΣΕΣ ΤΟΝ ΚΩΔΙΚΟ; ]",

        dossierProfileLabel: "[ΠΡΟΦΙΛ ΠΡΑΚΤΟΡΑ]", dossierOrdersHeading: ">// ΟΙ ΠΑΡΑΓΓΕΛΙΕΣ ΜΟΥ", dossierNoOrders: "> ΔΕΝ ΥΠΑΡΧΟΥΝ ΠΑΡΑΓΓΕΛΙΕΣ ΑΚΟΜΑ.",
        dossierWishlistHeading: ">// ΛΙΣΤΑ ΕΠΙΘΥΜΙΩΝ", dossierWishlistSub: "(ΑΠΟΘΗΚΕΥΜΕΝΑ ΣΥΣΤΗΜΑΤΑ)",
        dossierAchievementsHeading: ">// ΕΠΙΤΕΥΓΜΑΤΑ", dossierSignIn: "> ΣΥΝΔΕΣΗ", dossierRegister: "> ΕΓΓΡΑΦΗ", dossierSignOut: "> ΑΠΟΣΥΝΔΕΣΗ",

        signupTitle: "ΝΕΟΣ ΣΤΡΑΤΟΛΟΓΗΜΕΝΟΣ", emailPlaceholder: "EMAIL",
        regSubscribeLabel: "🔔 ΘΕΛΩ ΕΙΔΟΠΟΙΗΣΕΙΣ ΓΙΑ ΝΕΑ DROPS", signupBtn: "ΕΓΓΡΑΦΗ",

        forgotTitle: "ΠΡΩΤΟΚΟΛΛΟ ΑΝΑΚΤΗΣΗΣ", forgotBtn: "ΑΠΟΣΤΟΛΗ ΚΩΔΙΚΟΥ",
        resetTitle: "ΝΕΑ ΣΤΟΙΧΕΙΑ ΠΡΟΣΒΑΣΗΣ", resetTokenPlaceholder: "Κωδικός", resetNewPassPlaceholder: "Νέος Κωδικός", resetBtn: "ΕΝΗΜΕΡΩΣΗ ΣΥΣΤΗΜΑΤΟΣ",

        achievementsTitle: "ΑΡΧΕΙΟ ΠΡΑΚΤΟΡΑ", compareTitle: "ΛΕΙΤΟΥΡΓΙΑ VS",
        voteInfoTitle: "ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ", voteInfoText: "1. Η ψηφοφορία ανοίγει στην καθορισμένη ημερομηνία.<br>2. Συγκεντρώστε τις απαιτούμενες ψήφους για να ξεκλειδώσει το drop.",

        rulesTitle: "ΟΡΟΙ & ΠΡΟΫΠΟΘΕΣΕΙΣ",
        rules1: "1. Οι διαθέσιμες ποσότητες εμφανίζονται σε πραγματικό χρόνο· η παραγγελία ολοκληρώνεται με την επιβεβαίωση πληρωμής.",
        rules2: "2. Οι τιμές περιλαμβάνουν ΦΠΑ, εκτός αν αναφέρεται διαφορετικά.",
        rules3: "3. Ισχύει δικαίωμα υπαναχώρησης 14 ημερών και νόμιμη εγγύηση 2 ετών (βλ. Trust Protocols).",
        rules4: "4. Για πλήρεις όρους χρήσης και πολιτική απορρήτου, επικοινωνήστε μαζί μας.",

        helpTitle: "ΥΠΟΣΤΗΡΙΞΗ",
        helpText: "Για ερωτήσεις σχετικά με παραγγελίες, εγγύηση ή τεχνική υποστήριξη, επικοινωνήστε στο <strong>d.codexphoenix@gmail.com</strong> ή μέσω του chat κάτω αριστερά.",

        cartYourLoot: "Η ΛΕΙΑ ΣΟΥ", cartTotalLabel: "ΣΥΝΟΛΟ", cartCheckoutBtn: "ΑΣΦΑΛΗΣ ΟΛΟΚΛΗΡΩΣΗ",
        tickerDelivery: "⚡ ΑΣΦΑΛΗΣ ΠΑΡΑΔΟΣΗ 24Ω ΣΕ ΟΛΗ ΤΗ ΘΕΣΣΑΛΟΝΙΚΗ ⚡", tickerAssembled: "ΣΥΣΤΗΜΑΤΑ ΠΛΗΡΩΣ ΣΥΝΑΡΜΟΛΟΓΗΜΕΝΑ & ΕΛΕΓΜΕΝΑ",

        classifiedBrief: ">// ΔΙΑΒΑΘΜΙΣΜΕΝΗ ΑΝΑΦΟΡΑ", inspectSystemBtn: "ΕΠΙΘΕΩΡΗΣΗ ΣΥΣΤΗΜΑΤΟΣ", addedToVs: "ΠΡΟΣΤΕΘΗΚΕ ΣΤΟ VS", compareBtn: "ΣΥΓΚΡΙΣΗ",
        descFallback: "Αναλυτικές προδιαγραφές για αυτό το σύστημα.", taglineFallback: "ΕΞΟΥΣΙΟΔΟΤΗΜΕΝΗ ΚΑΤΑΣΚΕΥΗ ΣΥΣΤΗΜΑΤΟΣ", systemDetailsFallback: "Στοιχεία Συστήματος"
    },
    en: {
        sideSettings: "System Settings", sideTrust: "Warranty & Trust", sideRules: "Rules", sideHelp: "Help",
        sideWheel: "Daily Spin", sideLang: "Toggle Language", sideSocial: "Social Networks", sideDiscord: "Discord",
        sideInstagram: "Instagram", sideDropAlerts: "Drop Alerts", sideReviews: "Reviews", sideTerminal: "Terminal",

        reviewsLabel: "REVIEWS", writeReviewBtn: "[+] WRITE REVIEW", cartLabel: "CART",
        packGaming: "GAMING", packStreaming: "STREAMING", packCoding: "CODING",
        armoryLocked: "ARMORY LOCKED", voteCommunityDrop: "COMMUNITY DROP!", voteProgressLabel: "PROGRESS",
        vsModeReady: "VS MODE READY", chatTop: "CODEX AI",

        storageLabel: "Storage Expansion", storageOptStandard: "Standard (No Extra)",
        storageOptHdd: "+ 1TB HDD (€50)", storageOptSsd: "+ 1TB SSD (€80)",

        wheelTitle: "SPIN THE WHEEL", wheelLegendTitle: "POSSIBLE REWARDS",
        rewardCyberGold: "CYBER GOLD SKIN", rewardToxicOrange: "TOXIC ORANGE SKIN", rewardNeonPink: "NEON PINK SKIN",
        rewardMatrixGreen: "MATRIX GREEN SKIN", rewardCoupon: "5% COUPON",

        trustTitle: "TRUST PROTOCOLS",
        trustWarrantyTitle: "2-YEAR LEGAL WARRANTY",
        trustWarrantyText: "Every system is covered by the 2-year statutory warranty against defects, in accordance with current consumer protection law.",
        trustReturnTitle: "14-DAY RIGHT OF WITHDRAWAL",
        trustReturnText: "You have the right to withdraw within 14 calendar days of receipt, without justification, in accordance with EU distance-selling law.",
        trustShippingTitle: "GR SHIPPING",
        trustShippingText: "Secure packaging and delivery across Greece, with a full functionality check before shipping.",

        settingsTitle: "SYSTEM PREFERENCES", accentColorLabel: "ACCENT COLOR",

        newsletterTitle: "DROP ALERTS", newsletterDesc: "Get notified the moment a new PC drops or a vote starts.", newsletterBtn: "ACTIVATE ALERTS",
        reviewCodeTitle: "VERIFIED REVIEW", reviewCodeBtn: "SUBMIT TRANSMISSION", rcUserPlaceholder: "Agent Name", rcTextPlaceholder: "System performance...",

        missionTitle: "SYSTEM VALIDATION", missionWindowLabel: "VALIDATION WINDOW CLOSES IN:",
        missionKeepBtn: "SYSTEM OPERATIONAL (KEEP & REVIEW)", missionReportTitle: "Report System Failure",
        missionSelectReason: "Select Error Protocol...", missionReason1: "1. FPS Mismatch", missionReason2: "2. Hardware Defect (DOA)",
        missionReturnBtn: "INITIATE RETURN",

        loginTitle: "AGENT LOGIN", usernamePlaceholder: "USERNAME", passwordPlaceholder: "PASSWORD",
        loginBtn: "AUTHENTICATE", lostAccessLink: "[ LOST ACCESS? ]",

        dossierProfileLabel: "[AGENT PROFILE]", dossierOrdersHeading: ">// MY ORDERS", dossierNoOrders: "> NO ORDERS YET.",
        dossierWishlistHeading: ">// WISHLIST", dossierWishlistSub: "(SAVED SYSTEMS)",
        dossierAchievementsHeading: ">// ACHIEVEMENTS", dossierSignIn: "> SIGN IN", dossierRegister: "> REGISTER", dossierSignOut: "> SIGN OUT",

        signupTitle: "NEW RECRUIT", emailPlaceholder: "EMAIL",
        regSubscribeLabel: "🔔 I WANT NOTIFICATIONS FOR NEW DROPS", signupBtn: "REGISTER",

        forgotTitle: "RECOVERY PROTOCOL", forgotBtn: "SEND TOKEN",
        resetTitle: "NEW CREDENTIALS", resetTokenPlaceholder: "Token", resetNewPassPlaceholder: "New Password", resetBtn: "UPDATE SYSTEM",

        achievementsTitle: "AGENT RECORD", compareTitle: "VS MODE",
        voteInfoTitle: "HOW IT WORKS", voteInfoText: "1. Voting opens at the specified date.<br>2. Reach target votes to unlock drops.",

        rulesTitle: "TERMS & CONDITIONS",
        rules1: "1. Available quantities are shown in real time; an order is completed once payment is confirmed.",
        rules2: "2. Prices include VAT unless stated otherwise.",
        rules3: "3. A 14-day right of withdrawal and a 2-year statutory warranty apply (see Trust Protocols).",
        rules4: "4. For full terms of use and our privacy policy, please contact us.",

        helpTitle: "SUPPORT",
        helpText: "For questions about orders, warranty, or technical support, contact us at <strong>d.codexphoenix@gmail.com</strong> or via the chat in the bottom left.",

        cartYourLoot: "YOUR LOOT", cartTotalLabel: "TOTAL", cartCheckoutBtn: "SECURE CHECKOUT",
        tickerDelivery: "⚡ 24H SECURE DELIVERY ACROSS SKG ⚡", tickerAssembled: "SYSTEMS FULLY ASSEMBLED & TESTED",

        classifiedBrief: ">// CLASSIFIED_BRIEF", inspectSystemBtn: "INSPECT SYSTEM", addedToVs: "ADDED TO VS", compareBtn: "COMPARE",
        descFallback: "Detailed specifications for this system.", taglineFallback: "AUTHORIZED SYSTEM BUILD", systemDetailsFallback: "System Details"
    }
};

let currentLang = localStorage.getItem('codex_lang') || 'el';

export function applyLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const v = translations[lang]?.[el.dataset.i18n];
        if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const v = translations[lang]?.[el.dataset.i18nPlaceholder];
        if (v !== undefined) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const v = translations[lang]?.[el.dataset.i18nTitle];
        if (v !== undefined) el.title = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const v = translations[lang]?.[el.dataset.i18nHtml];
        if (v !== undefined) el.innerHTML = v;
    });

    currentLang = lang;
    localStorage.setItem('codex_lang', lang);
    document.documentElement.lang = lang;

    const btn = document.getElementById('lang-toggle-btn');
    if (btn) btn.textContent = lang.toUpperCase();

    // Re-render JS-templated chrome (card buttons / brief heading) so it flips instantly too
    if (window.renderCard) window.renderCard();
}

export function toggleLanguage() {
    applyLanguage(currentLang === 'el' ? 'en' : 'el');
}

export function t(key) {
    return translations[currentLang]?.[key] ?? translations.el[key] ?? key;
}

window.toggleLanguage = toggleLanguage;
window.applyLanguage = applyLanguage;
window.t = t;
