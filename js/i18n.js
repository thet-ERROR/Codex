// js/i18n.js
const translations = {
    el: {
        sideSettings: "Ρυθμίσεις συστήματος", sideTrust: "Εγγύηση & αξιοπιστία", sideRules: "Κανόνες", sideHelp: "Βοήθεια",
        sideWheel: "Καθημερινή περιστροφή", sideLang: "Αλλαγή γλώσσας", sideSocial: "Κοινωνικά δίκτυα", sideDiscord: "Discord",
        sideInstagram: "Instagram", sideDropAlerts: "Ειδοποιήσεις νέων PC", sideReviews: "Κριτικές", sideTerminal: "Τερματικό",

        reviewsLabel: "Κριτικές", writeReviewBtn: "[+] Γράψε κριτική", cartLabel: "Καλάθι",
        packGaming: "GAMING", packStreaming: "STREAMING", packCoding: "CODING",
        armoryLocked: "Οπλοστάσιο κλειδωμένο", voteCommunityDrop: "Κοινοτικό drop!", voteProgressLabel: "Πρόοδος",
        vsModeReady: "Λειτουργία VS έτοιμη", chatTop: "CODEX AI",

        extrasLabel: "Επιπλέον επιλογές",
        storageLabel: "Επέκταση αποθηκευτικού χώρου", storageOptStandard: "Στάνταρ (χωρίς επιπλέον)",
        storageOptHdd: "+ 1TB HDD", storageOptSsd: "+ 1TB SSD",

        proConfigTitle: "Pro Configuration",
        proConfigInfoTitle: "Τι περιλαμβάνει το Pro Configuration",
        proConfigInfoText: "Το σύστημα παραδίδεται ρυθμισμένο από εμάς, έτοιμο για χρήση:<br><br>✓ <strong>Ενεργοποίηση XMP/EXPO</strong> — η μνήμη RAM τρέχει στην πραγματική της ταχύτητα και όχι στην υποβαθμισμένη προεπιλογή.<br>✓ <strong>Καθαρισμός startup</strong> — αφαίρεση περιττών προγραμμάτων εκκίνησης για γρηγορότερο άνοιγμα.<br>✓ <strong>Πλάνο High Performance</strong> — ενεργοποίηση του σχεδίου υψηλών επιδόσεων στις ρυθμίσεις ενέργειας.<br>✓ <strong>Αφαίρεση διαφημίσεων Windows</strong> — απενεργοποίηση προτεινόμενου περιεχομένου και ειδοποιήσεων προώθησης.<br><br><em>Καμία αλλαγή δεν επηρεάζει την εγγύηση του συστήματος.</em>",

        paintTitle: "Custom βαφή",
        paintLeadTime: "⏱ Χρόνος προετοιμασίας: +{hours} ώρες για τη σωστή σκλήρυνση της βαφής (+2–3 εργάσιμες στην παράδοση).",
        paintNoReturnText: "⚠ Εξατομικευμένο προϊόν: κατασκευάζεται βάσει της δικής σου επιλογής. Σύμφωνα με τον ν. 2251/1994 και την Οδηγία 2011/83/ΕΕ, τα προϊόντα κατά παραγγελία <strong>εξαιρούνται από το δικαίωμα αναιτιολόγητης υπαναχώρησης 14 ημερών</strong>. Η <strong>νόμιμη εγγύηση 2 ετών για ελαττώματα ισχύει κανονικά</strong>.",
        paintDeclineBtn: "ΑΚΥΡΩΣΗ", paintAcceptBtn: "ΑΠΟΔΟΧΗ & ΕΦΑΡΜΟΓΗ",

        priceBaseLabel: "Βάση", priceTotalLabel: "Σύνολο",
        cartOptStandard: "Στάνταρ",
        orderMsgIntro: "Γεια σας! Θέλω να παραγγείλω από το PHOENIX CODEX:",
        orderMsgTotal: "ΣΥΝΟΛΟ",
        orderMsgPaintAck: "Αποδέχομαι τους όρους εξατομίκευσης για τη custom βαφή (εξαίρεση από υπαναχώρηση 14 ημερών).",

        wheelTitle: "Γύρισε τον τροχό", wheelLegendTitle: "Πιθανά έπαθλα",
        rewardCyberGold: "Skin Cyber Gold", rewardToxicOrange: "Skin Toxic Orange", rewardNeonPink: "Skin Neon Pink",
        rewardMatrixGreen: "Skin Matrix Green", rewardCoupon: "Κουπόνι 5%",

        trustTitle: "Πρωτόκολλα εμπιστοσύνης",
        trustWarrantyTitle: "Νόμιμη εγγύηση 2 ετών",
        trustWarrantyText: "Κάθε σύστημα καλύπτεται από τη νόμιμη εγγύηση 2 ετών για ελαττώματα, σύμφωνα με την ισχύουσα νομοθεσία περί προστασίας καταναλωτή.",
        trustReturnTitle: "Δικαίωμα υπαναχώρησης 14 ημερών",
        trustReturnText: "Έχετε δικαίωμα υπαναχώρησης εντός 14 ημερολογιακών ημερών από την παραλαβή, χωρίς αιτιολόγηση, σύμφωνα με την ενωσιακή νομοθεσία εξ αποστάσεως πωλήσεων.",
        trustShippingTitle: "Αποστολή εντός Ελλάδας",
        trustShippingText: "Ασφαλής συσκευασία και παράδοση σε όλη την Ελλάδα, με πλήρη έλεγχο λειτουργίας πριν την αποστολή.",

        settingsTitle: "Ρυθμίσεις συστήματος", accentColorLabel: "Χρώμα τονισμού",

        newsletterTitle: "Ειδοποιήσεις νέων PC", newsletterDesc: "Ειδοποιήσου μόλις βγει νέο PC ή ξεκινήσει ψηφοφορία.", newsletterBtn: "Ενεργοποίηση ειδοποιήσεων",
        reviewCodeTitle: "Επιβεβαιωμένη κριτική", reviewCodeBtn: "Αποστολή", rcUserPlaceholder: "Όνομα πράκτορα", rcTextPlaceholder: "Απόδοση συστήματος...",

        missionTitle: "Επικύρωση συστήματος", missionWindowLabel: "Ο χρόνος επικύρωσης λήγει σε:",
        missionKeepBtn: "Το σύστημα λειτουργεί (κράτα & αξιολόγησε)", missionReportTitle: "Αναφορά βλάβης συστήματος",
        missionSelectReason: "Επίλεξε πρωτόκολλο σφάλματος...", missionReason1: "1. Απόκλιση FPS", missionReason2: "2. Βλάβη υλικού (DOA)",
        missionReturnBtn: "Έναρξη επιστροφής",

        loginTitle: "Σύνδεση", usernamePlaceholder: "Όνομα χρήστη", passwordPlaceholder: "Κωδικός",
        loginBtn: "Σύνδεση", lostAccessLink: "[ Ξέχασες τον κωδικό; ]",

        dossierProfileLabel: "[Προφίλ]", dossierOrdersHeading: ">// Οι παραγγελίες μου", dossierNoOrders: "> Δεν υπάρχουν παραγγελίες ακόμα.",
        dossierWishlistHeading: ">// Λίστα επιθυμιών", dossierWishlistSub: "(Αποθηκευμένα συστήματα)",
        dossierAchievementsHeading: ">// Επιτεύγματα", dossierSignIn: "> Σύνδεση", dossierRegister: "> Εγγραφή", dossierSignOut: "> Αποσύνδεση",

        signupTitle: "Νέα εγγραφή", emailPlaceholder: "Email",
        regSubscribeLabel: "🔔 Θέλω ειδοποιήσεις για νέα drops", signupBtn: "Εγγραφή",

        forgotTitle: "Πρωτόκολλο ανάκτησης", forgotBtn: "Αποστολή κωδικού",
        resetTitle: "Νέα στοιχεία πρόσβασης", resetTokenPlaceholder: "Κωδικός", resetNewPassPlaceholder: "Νέος κωδικός", resetBtn: "Ενημέρωση συστήματος",

        achievementsTitle: "Αρχείο πράκτορα", compareTitle: "Λειτουργία VS",
        voteInfoTitle: "Πώς λειτουργεί", voteInfoText: "Το Vote είναι ένα κοινοτικό σύστημα: η ομάδα ψηφίζει ποιο μυστηριώδες PC θα ξεκλειδωθεί για αγορά.<br><br>1. Η ψηφοφορία ανοίγει στην καθορισμένη ημερομηνία.<br>2. Συγκεντρώστε τις απαιτούμενες ψήφους για να ξεκλειδώσει το drop.<br>3. Μόνο συνδεδεμένοι πράκτορες μπορούν να ψηφίσουν.<br>4. Αν το σύστημα δεν εξασφαλιστεί πριν λήξει το χρονόμετρο, μεταφέρεται αυτόματα στα Live Drops.",

        rulesTitle: "Όροι & προϋποθέσεις",
        rules1: "1. Οι διαθέσιμες ποσότητες εμφανίζονται σε πραγματικό χρόνο· η παραγγελία ολοκληρώνεται με την επιβεβαίωση πληρωμής.",
        rules2: "2. Οι τιμές περιλαμβάνουν ΦΠΑ, εκτός αν αναφέρεται διαφορετικά.",
        rules3: "3. Ισχύει δικαίωμα υπαναχώρησης 14 ημερών και νόμιμη εγγύηση 2 ετών (βλ. Trust Protocols).",
        rules4: "4. Σε περιπτώσεις custom βαφής ή άλλης τροποποίησης κατόπιν επιλογής του πελάτη, το προϊόν θεωρείται εξατομικευμένο και κατασκευάζεται κατά παραγγελία. Δεν γίνεται δεκτή επιστροφή χρημάτων λόγω αλλαγής γνώμης (εξαίρεση από το δικαίωμα υπαναχώρησης 14 ημερών, ν. 2251/1994 & Οδηγία 2011/83/ΕΕ). Η νόμιμη εγγύηση 2 ετών για ελαττώματα ισχύει κανονικά.",
        rules5: "5. Για πλήρεις όρους χρήσης και πολιτική απορρήτου, επικοινωνήστε μαζί μας.",

        helpTitle: "Υποστήριξη",
        helpText: "Για ερωτήσεις σχετικά με παραγγελίες, εγγύηση ή τεχνική υποστήριξη, επικοινωνήστε στο <strong>d.codexphoenix@gmail.com</strong> ή μέσω του chat κάτω αριστερά.",

        cartYourLoot: "Η λεία σου", cartTotalLabel: "Σύνολο", cartCheckoutBtn: "Ασφαλής ολοκλήρωση",
        tickerDelivery: "⚡ Ασφαλής παράδοση 24H σε όλη τη Θεσσαλονίκη ⚡", tickerAssembled: "Συστήματα πλήρως συναρμολογημένα & ελεγμένα",
        tickerProcessed: "⚡ Οι παραγγελίες επεξεργάζονται εντός 24 ωρών ⚡", tickerDiagnostic: "Πλήρης διαγνωστικός έλεγχος πριν από κάθε αποστολή",

        classifiedBrief: ">// ΣΤΟΙΧΕΙΑ ΜΟΝΑΔΑΣ", inspectSystemBtn: "Επιθεώρηση συστήματος", addedToVs: "Προστέθηκε στο VS", compareBtn: "Σύγκριση",
        descFallback: "Αναλυτικές προδιαγραφές για αυτό το σύστημα.", taglineFallback: "Εξουσιοδοτημένη κατασκευή συστήματος", systemDetailsFallback: "Στοιχεία συστήματος",

        menuDashboard: "Πίνακας ελέγχου", menuSignOut: "Αποσύνδεση", menuSignIn: "Σύνδεση", menuRegister: "Εγγραφή",
        rankOperative: "Πράκτορας", rankRecruit: "Νεοσύλλεκτος", unknownUser: "Άγνωστος χρήστης", agentFallback: "Πράκτορας",
        purchasedLabel: "Αγορασμένο",

        alertBothFields: "Προσοχή: Συμπλήρωσε όνομα χρήστη και κωδικό", alertInvalidCreds: "Λανθασμένα στοιχεία σύνδεσης",
        alertAllFieldsRecruit: "Προσοχή: Όλα τα πεδία είναι υποχρεωτικά", alertRegistrationFailed: "Η εγγραφή απέτυχε",
        alertSoldOut: "Εξαντλήθηκε!", alertCartEmpty: "Το καλάθι είναι άδειο!", alertMaxCompare: "Μέγιστο 2 συστήματα στη σύγκριση",
        missionPromptCode: "Εισάγετε τον κωδικό αποστολής (βρίσκεται στο κουτί):",
        missionExpiredAlert: "⚠️ Η αποστολή έληξε. Πέρασαν 48 ώρες.",
        connectionErrorAlert: "⚠️ Σφάλμα σύνδεσης!\nΟ διακομιστής δεν ανταποκρίνεται.",
        alertAllFieldsReview: "Προσοχή: Όλα τα πεδία είναι υποχρεωτικά", alertTransmissionFailed: "Η αποστολή απέτυχε",
        alertServerError: "Σφάλμα διακομιστή", alertSelectErrorProtocol: "⚠️ Προσοχή: Επίλεξε έγκυρο πρωτόκολλο σφάλματος.",
        loreFallback: "Σύστημα τακτικών επιχειρήσεων. Οι πλήρεις προδιαγραφές βρίσκονται στον φάκελο INSPECT. Απαιτείται εξουσιοδότηση.",
        backToPacksBtn: "Πίσω στα packs", voteAlmostThere: "ΚΟΝΤΑ ΣΤΟ ΣΤΟΧΟ", voteRemaining: "ψήφοι ακόμα"
    },
    en: {
        sideSettings: "System Settings", sideTrust: "Warranty & Trust", sideRules: "Rules", sideHelp: "Help",
        sideWheel: "Daily Spin", sideLang: "Toggle Language", sideSocial: "Social Networks", sideDiscord: "Discord",
        sideInstagram: "Instagram", sideDropAlerts: "Drop Alerts", sideReviews: "Reviews", sideTerminal: "Terminal",

        reviewsLabel: "REVIEWS", writeReviewBtn: "[+] WRITE REVIEW", cartLabel: "CART",
        packGaming: "GAMING", packStreaming: "STREAMING", packCoding: "CODING",
        armoryLocked: "ARMORY LOCKED", voteCommunityDrop: "COMMUNITY DROP!", voteProgressLabel: "PROGRESS",
        vsModeReady: "VS MODE READY", chatTop: "CODEX AI",

        extrasLabel: "EXTRAS",
        storageLabel: "Storage Expansion", storageOptStandard: "Standard (No Extra)",
        storageOptHdd: "+ 1TB HDD", storageOptSsd: "+ 1TB SSD",

        proConfigTitle: "Pro Configuration",
        proConfigInfoTitle: "What Pro Configuration includes",
        proConfigInfoText: "The system ships already tuned by us, ready to use:<br><br>✓ <strong>XMP/EXPO enabled</strong> — your RAM runs at its rated speed instead of the downclocked default.<br>✓ <strong>Startup cleanup</strong> — unnecessary startup programs removed for a faster boot.<br>✓ <strong>High Performance power plan</strong> — the high performance profile enabled in power settings.<br>✓ <strong>Windows ads removed</strong> — suggested content and promotional notifications turned off.<br><br><em>None of these changes affect your system warranty.</em>",

        paintTitle: "Custom Paint",
        paintLeadTime: "⏱ Preparation time: +{hours} hours for the paint to cure properly (+2–3 working days on delivery).",
        paintNoReturnText: "⚠ Personalised product: built to your own specification. Under Greek law 2251/1994 and EU Directive 2011/83/EU, made-to-order goods are <strong>exempt from the 14-day right of withdrawal</strong>. The <strong>2-year statutory warranty against defects still applies in full</strong>.",
        paintDeclineBtn: "CANCEL", paintAcceptBtn: "ACCEPT & APPLY",

        priceBaseLabel: "Base", priceTotalLabel: "Total",
        cartOptStandard: "Standard",
        orderMsgIntro: "Hello! I'd like to order from PHOENIX CODEX:",
        orderMsgTotal: "TOTAL",
        orderMsgPaintAck: "I accept the personalisation terms for the custom paint (exempt from the 14-day withdrawal right).",

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

        loginTitle: "AGENT SIGN-IN", usernamePlaceholder: "USERNAME", passwordPlaceholder: "PASSWORD",
        loginBtn: "AUTHENTICATE", lostAccessLink: "[ LOST ACCESS? ]",

        dossierProfileLabel: "[AGENT PROFILE]", dossierOrdersHeading: ">// MY ORDERS", dossierNoOrders: "> NO ORDERS YET.",
        dossierWishlistHeading: ">// WISHLIST", dossierWishlistSub: "(SAVED SYSTEMS)",
        dossierAchievementsHeading: ">// ACHIEVEMENTS", dossierSignIn: "> SIGN IN", dossierRegister: "> REGISTER", dossierSignOut: "> SIGN OUT",

        signupTitle: "AGENT REGISTRATION", emailPlaceholder: "EMAIL",
        regSubscribeLabel: "🔔 I WANT NOTIFICATIONS FOR NEW DROPS", signupBtn: "REGISTER",

        forgotTitle: "RECOVERY PROTOCOL", forgotBtn: "SEND TOKEN",
        resetTitle: "NEW CREDENTIALS", resetTokenPlaceholder: "Token", resetNewPassPlaceholder: "New Password", resetBtn: "UPDATE SYSTEM",

        achievementsTitle: "AGENT RECORD", compareTitle: "VS MODE",
        voteInfoTitle: "HOW IT WORKS", voteInfoText: "Vote is a community system: the network votes on which mystery PC gets unlocked for purchase.<br><br>1. Voting opens at the specified date.<br>2. Reach target votes to unlock drops.<br>3. Only signed-in agents can vote.<br>4. If the system isn't secured before the timer runs out, it automatically moves to Live Drops.",

        rulesTitle: "TERMS & CONDITIONS",
        rules1: "1. Available quantities are shown in real time; an order is completed once payment is confirmed.",
        rules2: "2. Prices include VAT unless stated otherwise.",
        rules3: "3. A 14-day right of withdrawal and a 2-year statutory warranty apply (see Trust Protocols).",
        rules4: "4. Where a custom paint job or any other customer-specified modification is ordered, the product is considered personalised and made to order. Refunds for change of mind are not accepted (exempt from the 14-day right of withdrawal under Greek law 2251/1994 & EU Directive 2011/83/EU). The 2-year statutory warranty against defects still applies in full.",
        rules5: "5. For full terms of use and our privacy policy, please contact us.",

        helpTitle: "SUPPORT",
        helpText: "For questions about orders, warranty, or technical support, contact us at <strong>d.codexphoenix@gmail.com</strong> or via the chat in the bottom left.",

        cartYourLoot: "YOUR LOOT", cartTotalLabel: "TOTAL", cartCheckoutBtn: "SECURE CHECKOUT",
        tickerDelivery: "⚡ 24H SECURE DELIVERY ACROSS SKG ⚡", tickerAssembled: "SYSTEMS FULLY ASSEMBLED & TESTED",
        tickerProcessed: "⚡ ORDERS PROCESSED WITHIN 24 HOURS ⚡", tickerDiagnostic: "FULL DIAGNOSTIC CHECK BEFORE EVERY SHIPMENT",

        classifiedBrief: ">// UNIT_DATA", inspectSystemBtn: "INSPECT SYSTEM", addedToVs: "ADDED TO VS", compareBtn: "COMPARE",
        descFallback: "Detailed specifications for this system.", taglineFallback: "AUTHORIZED SYSTEM BUILD", systemDetailsFallback: "System Details",

        menuDashboard: "DASHBOARD", menuSignOut: "SIGN OUT", menuSignIn: "SIGN IN", menuRegister: "REGISTER",
        rankOperative: "OPERATIVE", rankRecruit: "RECRUIT", unknownUser: "UNKNOWN_USER", agentFallback: "AGENT",
        purchasedLabel: "PURCHASED",

        alertBothFields: "SYSTEM ALERT: ENTER BOTH USERNAME & PASSWORD", alertInvalidCreds: "ACCESS DENIED: INVALID CREDENTIALS",
        alertAllFieldsRecruit: "SYSTEM ALERT: ALL FIELDS REQUIRED FOR RECRUITMENT", alertRegistrationFailed: "REGISTRATION FAILED",
        alertSoldOut: "SOLD OUT!", alertCartEmpty: "Cart is empty!", alertMaxCompare: "MAX 2 ITEMS ALLOWED IN VS MODE",
        missionPromptCode: "ENTER MISSION CODE (Found in Box):",
        missionExpiredAlert: "⚠️ MISSION EXPIRED. 48 HOURS HAVE PASSED.",
        connectionErrorAlert: "⚠️ CONNECTION ERROR!\nThe server is not responding.",
        alertAllFieldsReview: "SYSTEM ALERT: ALL FIELDS REQUIRED", alertTransmissionFailed: "TRANSMISSION FAILED",
        alertServerError: "SERVER ERROR", alertSelectErrorProtocol: "⚠️ SYSTEM ALERT: Please select a valid Error Protocol.",
        loreFallback: "Tactical operations system. Full specifications are available in the INSPECT file. Authorization required.",
        backToPacksBtn: "BACK TO PACKS", voteAlmostThere: "ALMOST THERE", voteRemaining: "votes to go"
    }
};

let currentLang = localStorage.getItem('codex_lang') || 'en';

// Small "pixel art" flag icons (hard-edged rects, shape-rendering:crispEdges) — shown for the
// language you'd switch TO, not the currently active one.
const FLAG_GR = `<svg width="24" height="16" viewBox="0 0 27 18" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <rect width="27" height="18" fill="#fff"/>
    <rect y="0" width="27" height="2" fill="#0D5EAF"/><rect y="4" width="27" height="2" fill="#0D5EAF"/>
    <rect y="8" width="27" height="2" fill="#0D5EAF"/><rect y="12" width="27" height="2" fill="#0D5EAF"/>
    <rect y="16" width="27" height="2" fill="#0D5EAF"/>
    <rect x="0" y="0" width="10" height="10" fill="#0D5EAF"/>
    <rect x="4" y="0" width="2" height="10" fill="#fff"/><rect x="0" y="4" width="10" height="2" fill="#fff"/>
</svg>`;
// Union Jack, second attempt: built layer-by-layer like the real flag (blue field -> white
// diagonal saltire -> red diagonal saltire -> white straight cross -> red straight cross), each
// diagonal as a 4-step staircase of plain rects (crispEdges won't pixelate an actual diagonal
// line/polygon, only axis-aligned rects, hence the staircase). Still unverified without a
// browser — flag if it looks wrong and I'll adjust the step coordinates.
const FLAG_UK = `<svg width="24" height="16" viewBox="0 0 24 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="16" fill="#00247D"/>
    <rect x="0" y="0" width="6" height="4" fill="#fff"/><rect x="6" y="4" width="6" height="4" fill="#fff"/>
    <rect x="12" y="8" width="6" height="4" fill="#fff"/><rect x="18" y="12" width="6" height="4" fill="#fff"/>
    <rect x="18" y="0" width="6" height="4" fill="#fff"/><rect x="12" y="4" width="6" height="4" fill="#fff"/>
    <rect x="6" y="8" width="6" height="4" fill="#fff"/><rect x="0" y="12" width="6" height="4" fill="#fff"/>
    <rect x="2" y="0" width="2" height="4" fill="#CF142B"/><rect x="8" y="4" width="2" height="4" fill="#CF142B"/>
    <rect x="14" y="8" width="2" height="4" fill="#CF142B"/><rect x="20" y="12" width="2" height="4" fill="#CF142B"/>
    <rect x="20" y="0" width="2" height="4" fill="#CF142B"/><rect x="14" y="4" width="2" height="4" fill="#CF142B"/>
    <rect x="8" y="8" width="2" height="4" fill="#CF142B"/><rect x="2" y="12" width="2" height="4" fill="#CF142B"/>
    <rect x="0" y="6" width="24" height="4" fill="#fff"/><rect x="10" y="0" width="4" height="16" fill="#fff"/>
    <rect x="0" y="7" width="24" height="2" fill="#CF142B"/><rect x="11" y="0" width="2" height="16" fill="#CF142B"/>
</svg>`;

export function applyLanguage(lang) {
    document.body.classList.toggle('lang-el', lang === 'el');

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
    if (btn) btn.innerHTML = lang === 'el' ? FLAG_UK : FLAG_GR;

    // Re-render JS-templated chrome (card buttons / brief heading / profile menu) so it flips instantly too
    if (window.renderCard) window.renderCard();
    if (window.updateAuthUI) window.updateAuthUI(localStorage.getItem('codex_username'));
    if (window.renderGlobalReviews) window.renderGlobalReviews();
    // Extras rows carry prices/hours baked into their text, so they're built in JS, not data-i18n
    if (window.renderExtras) window.renderExtras();
    if (window.updateCartUI) window.updateCartUI();
}

export function toggleLanguage() {
    applyLanguage(currentLang === 'el' ? 'en' : 'el');
}

// t('paintLeadTime', { hours: 48 }) fills {hours} in the string. Values are inserted as-is, so
// only pass numbers/trusted labels — never raw user input into a key rendered with innerHTML.
export function t(key, vars) {
    const str = translations[currentLang]?.[key] ?? translations.el[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? vars[name] : m));
}

window.toggleLanguage = toggleLanguage;
window.applyLanguage = applyLanguage;
window.t = t;
