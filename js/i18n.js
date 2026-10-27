// js/i18n.js
const translations = {
    el: {
        sideSettings: "Ρυθμίσεις συστήματος", sideInfo: "Πληροφορίες: εγγύηση, όροι, υποστήριξη",
        sideWheel: "Καθημερινή περιστροφή", sideLang: "Αλλαγή γλώσσας", sideSocial: "Κοινωνικά δίκτυα", sideDiscord: "Discord",
        mascotAdminTitle: "Ο admin σε περιμένει!", mascotAdminText: "Πάτα από κάτω και γράψ' του στο WhatsApp.", mascotAdminGo: "Πάμε στο WhatsApp",
        sideQr: "QR για το κινητό", qrTitle: "Άνοιξέ το στο κινητό", qrText: "Σκάναρε τον κωδικό με την κάμερα του κινητού σου και το site ανοίγει εκεί.",
        qrCopy: "Αντιγραφή συνδέσμου", qrShare: "Κοινοποίηση", qrLoading: "Φόρτωση…", qrFailed: "Ο κωδικός QR δεν φόρτωσε. Αντέγραψε τον σύνδεσμο από κάτω.",
        sideInstagram: "Instagram", sideDropAlerts: "Ειδοποιήσεις νέων PC", sideReviews: "Κριτικές", sideTerminal: "Τερματικό",
        termHint: "Γράψε 'help' ή πάτα μια εντολή από κάτω.", termHelpHead: "ΔΙΑΘΕΣΙΜΕΣ ΕΝΤΟΛΕΣ:",
        termH_help: "αυτή η λίστα", termH_theme: "νύχτα / ημέρα", termH_color: "χρώμα accent",
        termH_sound: "ήχος on / off", termH_lang: "γλώσσα el / en", termH_vote: "η ψηφοφορία τώρα",
        termH_cart: "τι έχει το καλάθι", termH_tour: "ξανά η ξενάγηση", termH_clear: "καθαρισμός", termH_exit: "κλείσιμο",
        termThemeUsage: "Χρήση: theme night | day | auto", termThemeSet: "Λειτουργία: {mode}",
        termMode_night: "ΝΥΧΤΑ", termMode_day: "ΗΜΕΡΑ", termMode_auto: "ΑΥΤΟΜΑΤΗ (ανάλογα με την ώρα)",
        termColorList: "Διάλεξε χρώμα (🔒 = κλειδωμένο, ξεκλειδώνει από τη ρόδα):", termColorSet: "Accent: {name}",
        termColorUnknown: "Άγνωστο χρώμα. Δοκίμασε: {list}",
        termSoundUsage: "Χρήση: sound on | off", termSoundOn: "Ήχος: ΑΝΟΙΧΤΟΣ", termSoundOff: "Ήχος: ΚΛΕΙΣΤΟΣ",
        termLangUsage: "Χρήση: lang el | en", termLangSet: "Γλώσσα: {lang}",
        termVoteCount: "{votes} / {target} ψήφοι", termVoteTime: "Κλείνει σε {time}", termVoteVoted: "Έχεις ήδη ψηφίσει.",
        termCartEmpty: "Το καλάθι είναι άδειο.", termCartTotal: "ΣΥΝΟΛΟ: {total}", termTour: "Ξεκινά η ξενάγηση...",
        termUnknown: "Άγνωστη εντολή: {cmd}. Γράψε 'help'.", termDidYouMean: "Εννοούσες '{cmd}';",

        reviewsLabel: "Κριτικές", writeReviewBtn: "[+] Γράψε κριτική", cartLabel: "Καλάθι",
        packGaming: "GAMING", packStreaming: "STREAMING", packCoding: "CODING",
        armoryLocked: "Οπλοστάσιο κλειδωμένο", voteProgressLabel: "Πρόοδος",
        vsModeReady: "Λειτουργία VS έτοιμη", vsHalf: "1/2 · πρόσθεσε άλλο ένα", vsAddOne: "Διάλεξε ακόμα ένα σύστημα για να τα συγκρίνεις", chatTop: "Βοήθεια επιλογής", chatBack: "ΠΙΣΩ",

        extrasLabel: "Επιπλέον επιλογές", inspectTabLore: "Στοιχεία μονάδας",
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

        trustWarrantyTitle: "Νόμιμη εγγύηση 2 ετών",
        trustWarrantyText: "Κάθε σύστημα καλύπτεται από τη νόμιμη εγγύηση 2 ετών για ελαττώματα, σύμφωνα με την ισχύουσα νομοθεσία περί προστασίας καταναλωτή.",
        trustReturnTitle: "Δικαίωμα υπαναχώρησης 14 ημερών",
        trustReturnText: "Έχεις δικαίωμα υπαναχώρησης εντός 14 ημερολογιακών ημερών από την παραλαβή, χωρίς αιτιολόγηση, σύμφωνα με την ενωσιακή νομοθεσία εξ αποστάσεως πωλήσεων. Εξαίρεση: η custom βαφή, που φτιάχνεται κατά παραγγελία.",
        trustShippingTitle: "Αποστολή εντός Ελλάδας",
        trustShippingText: "Ασφαλής συσκευασία και παράδοση σε όλη την Ελλάδα, με πλήρη έλεγχο λειτουργίας πριν την αποστολή.",

        settingsTitle: "Ρυθμίσεις συστήματος", accentColorLabel: "Χρώμα τονισμού",
        settingsSound: "Ήχος & μουσική", settingsLanguage: "Γλώσσα", settingsReplayTour: "Δες ξανά την ξενάγηση",
        colorsLockedNote: "Η 2η σειρά ξεκλειδώνει στον Ημερήσιο Τροχό, η 3η ανεβαίνοντας επίπεδο στο προφίλ σου (απαιτείται σύνδεση).", colorsSpinBtn: "Γύρνα τον τροχό",
        toastColorLocked: "Κλειδωμένο χρώμα — γύρνα τον Ημερήσιο Τροχό για να το ξεκλειδώσεις.", toastColorRankLocked: "Κλειδωμένο χρώμα — ξεκλειδώνει στο επίπεδο {rank}.", toastColorRankLockedAny: "Κλειδωμένο χρώμα — ξεκλειδώνει ανεβαίνοντας επίπεδο στο προφίλ σου.",
        rankUpToast: "ΝΕΟ ΕΠΙΠΕΔΟ: {rank}",
        cardExtraFrom: "από +{price}", rankLadderTitle: "Επίπεδα", rankInfoTitle: "Πώς δουλεύουν τα επίπεδα", rankStepNow: "ΤΩΡΑ", rankStepLeft: "{n} XP ακόμα", rankStepSpins: "+{n} περιστρ.",
        rankInfoIntro: "Κάθε επίτευγμα που ξεκλειδώνεις δίνει XP, και τα XP ανεβάζουν το επίπεδό σου.",
        rankInfoXp: "Κέρδισε XP από τα επιτεύγματα: επιβεβαίωσε το email σου, αποθήκευσε συστήματα στη λίστα επιθυμιών, ψήφισε, γράψε κριτική και άλλα.",
        rankInfoRank: "Κάθε επίπεδο έχει ένα όριο XP. Η μπάρα δείχνει πόσο μακριά είσαι από το επόμενο.",
        rankInfoSpins: "Κάποια επίπεδα δίνουν έξτρα περιστροφές στον τροχό. Φυλάσσονται για σένα και χρησιμοποιούνται μετά τις 3 ημερήσιες προσπάθειες, χωρίς να τις καθυστερούν.",
        rankInfoColors: "Κάποια επίπεδα ξεκλειδώνουν ένα χρώμα τονισμού — Ultraviolet, Arctic, Phantom — που το παίρνεις μόνο έτσι, ποτέ από τον τροχό.",
        rankInfoBadge: "Το επίπεδό σου φαίνεται ως σήμα στο προφίλ σου και δίπλα στο όνομά σου στις κριτικές που γράφεις συνδεδεμένος.",
        rankInfoOnce: "Κάθε ανταμοιβή δίνεται μία φορά — την πρώτη φορά που φτάνεις σε εκείνο το επίπεδο.", rankUpSpins: "+{n} περιστροφές στον τροχό", rankUpColor: "χρώμα {name}",
        rewardUltraviolet: "Skin Ultraviolet", rewardArctic: "Skin Arctic", rewardPhantom: "Skin Phantom",
        colorLime: "Lime", colorCyan: "Cyan", colorRed: "Κόκκινο", colorPurple: "Μωβ",
        closeLabel: "Κλείσιμο",

        // Ενιαίο παράθυρο Πληροφοριών (index.html #info-modal): Εγγύηση & Επιστροφές / Όροι / Υποστήριξη
        infoTitle: "Πληροφορίες", infoTabReturns: "Εγγύηση & Επιστροφές", infoTabTerms: "Όροι", infoTabSupport: "Υποστήριξη",
        returnHowTitle: "Πώς κάνω επιστροφή",
        returnHowText: "Πάτα «Επιστροφή» και θα ανοίξει το email σου με έτοιμο μήνυμα. Συμπλήρωσε τα στοιχεία και στείλ' το μέσα σε 14 ημέρες από την παραλαβή· θα σου απαντήσουμε με τα επόμενα βήματα.",
        returnBtn: "Επιστροφή", returnCopyBtn: "Αντιγραφή email", returnCopied: "Το email αντιγράφηκε",
        returnMailSubject: "Αίτημα επιστροφής — PHOENIX CODEX",
        returnMailBody: "Γεια σας,\n\nθέλω να κάνω επιστροφή.\n\nΌνομα:\nΣύστημα (PC):\nΗμερομηνία παραλαβής:\nΛόγος επιστροφής:\n\nΕυχαριστώ",
        returnMailBodyCode: "Γεια σας,\n\nθέλω να κάνω επιστροφή.\n\nΣύστημα: {pc}\nΚωδικός κουτιού: {code}\nΛόγος: {reason}\n\nΌνομα:\nΗμερομηνία παραλαβής:\n\nΕυχαριστώ",
        supportFaqTitle: "Βοήθεια επιλογής PC", supportFaqText: "Πες μας τι κάνεις ή πόσα θες να δώσεις και σε πάμε στο σωστό σύστημα",
        budgetUnder: "Έως €{max}", budgetOver: "Πάνω από €{min}", budgetClear: "Καθάρισε το φίλτρο",
        supportEmailTitle: "Στείλε μας email", supportCodeTitle: "Έχεις κωδικό από το κουτί;",
        supportCodeText: "Γράψε κριτική για το PC σου· ο κωδικός ισχύει 2 ημέρες από την πρώτη χρήση.",

        newsletterTitle: "Ειδοποιήσεις νέων PC", newsletterDesc: "Ειδοποιήσου μόλις βγει νέο PC ή ξεκινήσει ψηφοφορία.", newsletterBtn: "Ενεργοποίηση ειδοποιήσεων",
        reviewCodeTitle: "Επιβεβαιωμένη κριτική", reviewCodeBtn: "Αποστολή", rcUserPlaceholder: "Όνομα πράκτορα", rcTextPlaceholder: "Απόδοση συστήματος...",

        missionTitle: "Πώς πάει το νέο σου PC;", missionWindowLabel: "Το παράθυρο κλείνει σε",
        missionKeepTitle: "Όλα δουλεύουν τέλεια", missionKeepText: "Κράτα το σύστημα και πες στους άλλους πώς τρέχει.",
        missionKeepBtn: "Γράψε κριτική",
        missionReportTitle: "Κάτι δεν πάει καλά;", missionReportText: "Διάλεξε τι συμβαίνει και θα ανοίξει το email σου με έτοιμο μήνυμα επιστροφής.",
        missionSelectReason: "Διάλεξε το πρόβλημα...", missionReason1: "Χαμηλότερα FPS από όσα γράφει", missionReason2: "Βλάβη υλικού / δεν ανοίγει",
        missionReason3: "Τα specs δεν ταιριάζουν με την αγγελία", missionReason4: "Κάτι άλλο",
        missionReturnBtn: "Ξεκίνα επιστροφή",

        loginTitle: "Σύνδεση", usernamePlaceholder: "Όνομα χρήστη", passwordPlaceholder: "Κωδικός",
        loginBtn: "Σύνδεση", lostAccessLink: "[ Ξέχασες τον κωδικό; ]",

        dossierProfileLabel: "[Προφίλ]", dossierOrdersHeading: "Οι παραγγελίες μου", dossierNoOrders: "Δεν υπάρχουν παραγγελίες ακόμα.", dossierNoOrdersSub: "Ξεκίνησε τις αγορές σου και θα βλέπεις εδώ τις παραγγελίες σου.", dossierJourney: "Το ταξίδι σου ξεκινά εδώ",
        dossierWishlistHeading: "Λίστα επιθυμιών", dossierWishlistSub: "(Αποθηκευμένα συστήματα)",
        dossierAchievementsHeading: "Επιτεύγματα", dossierSignIn: "> Σύνδεση", dossierRegister: "> Εγγραφή", dossierSignOut: "Αποσύνδεση",
        dossierNoTargets: "> Κανένας στόχος κλειδωμένος.", dossierRemoveTarget: "Αφαίρεση από τη λίστα",

        // Προόδος πράκτορα. Τα ονόματα των βαθμίδων ζουν στο CONFIG.RANK_NAMES, όχι εδώ — τα
        // κατεβάζει ο server με το id τους και το config κρατά μόνο την εμφάνιση.
        achUnlocked: "ΞΕΚΛΕΙΔΩΤΟ", achLocked: "ΚΛΕΙΔΩΜΕΝΟ", achUnlockedPrefix: "ΕΠΙΤΕΥΓΜΑ",
        xpToNextRank: "{xp} XP → {next} XP για {rank}", xpMaxRank: "{xp} XP — ανώτατη βαθμίδα",
        chipWishlist: "ΛΙΣΤΑ", chipAchievements: "ΕΠΙΤΕΥΓΜΑΤΑ", chipInCart: "ΣΤΟ ΚΑΛΑΘΙ",
        achViewAll: "ΟΛΑ ΤΑ ΕΠΙΤΕΥΓΜΑΤΑ",

        signupTitle: "Νέα εγγραφή", emailPlaceholder: "Email",
        regSubscribeLabel: "🔔 Θέλω ειδοποιήσεις για νέα drops", signupBtn: "Εγγραφή",

        forgotTitle: "Πρωτόκολλο ανάκτησης", forgotBtn: "Αποστολή κωδικού",
        resetTitle: "Νέα στοιχεία πρόσβασης", resetTokenPlaceholder: "Κωδικός", resetNewPassPlaceholder: "Νέος κωδικός", resetBtn: "Ενημέρωση συστήματος",

        achievementsTitle: "Αρχείο πράκτορα", compareTitle: "Λειτουργία VS",
        // The body text moved to SiteConfig.voteInfoTextEl (admin-editable) — only the modal's
        // title stays a translation-file string, see openVoteInfo() in js/modules/vote.js.
        voteInfoTitle: "Πώς λειτουργεί",
        // VOTE tab (js/modules/vote.js) — μία κάρτα, ένα κουμπί ανά κατάσταση
        voteStatus_none: "ΧΩΡΙΣ ΨΗΦΟΦΟΡΙΑ", voteStatus_upcoming: "ΕΡΧΕΤΑΙ ΣΥΝΤΟΜΑ", voteStatus_open: "ΨΗΦΟΦΟΡΙΑ ΑΝΟΙΧΤΗ",
        voteStatus_unlocked: "ΞΕΚΛΕΙΔΩΘΗΚΕ", voteStatus_closed: "ΕΚΛΕΙΣΕ", voteStatus_loading: "ΦΟΡΤΩΣΗ...",
        voteHowItWorks: "Πώς λειτουργεί", voteNoneTitle: "Καμία ψηφοφορία τώρα",
        voteMsgNone: "Το επόμενο κοινοτικό drop έρχεται σύντομα. Θες να μάθεις πρώτος πότε ανοίγει η ψηφοφορία;",
        voteMsgUnlocked: "Η κοινότητα το ξεκλείδωσε! Το PC είναι πλέον στα Live Drops, έτοιμο για παραγγελία.",
        voteMsgClosed: "Ο χρόνος έληξε πριν μαζευτούν οι ψήφοι — το PC βρίσκεται πλέον στα Live Drops.",
        voteEstPrice: "~{price} · εκτίμηση", votePriceTbd: "Τιμή: σύντομα",
        voteCount: "{n} / {target} ψήφοι", voteRemainingOne: "1 ψήφος ακόμα", voteRemainingMany: "{n} ψήφοι ακόμα",
        voteOpensIn: "Ανοίγει σε {time}", voteClosesIn: "Κλείνει σε {time}",
        voteNotifyBtn: "Ειδοποίησέ με", voteLoginBtn: "Σύνδεση για να ψηφίσεις", voteVerifyBtn: "Επιβεβαίωσε το email σου",
        voteCastBtn: "Ψήφισε · +50 XP", voteDoneBtn: "✓ Η ψήφος σου μετρήθηκε", voteSeeLiveBtn: "Δες το στα Live Drops",
        voteHelpUpcoming: "Θα μπορείς να ψηφίσεις μόλις ανοίξει η ψηφοφορία.",
        voteHelpGuest: "Δωρεάν λογαριασμός · 1 ψήφος ανά πράκτορα.", voteSignupLink: "Εγγραφή",
        voteHelpVerify: "Η ψήφος σου ξεκλειδώνει μόλις επιβεβαιώσεις το email σου.",
        voteHelpCan: "1 ψήφος ανά πράκτορα — μετράει αμέσως.",
        voteHelpVoted: "Φέρε κι άλλους για να ξεκλειδώσει πιο γρήγορα.", voteShareLink: "Μοιράσου",
        voteHelpUnlocked: "1 τεμάχιο — όποιος προλάβει.",
        voteToastCounted: "Η ψήφος σου μετρήθηκε!", voteToastAlready: "Έχεις ήδη ψηφίσει σε αυτό το drop.",
        voteToastFailed: "Η ψήφος δεν πέρασε — δοκίμασε ξανά σε λίγο.",
        voteUnlockedToast: "🔓 Το {name} ξεκλειδώθηκε — είναι στα Live Drops!",
        voteShareText: "Ψήφισε για να ξεκλειδώσει το {name} στο PHOENIX CODEX!", linkCopied: "Ο σύνδεσμος αντιγράφηκε",
        voteInfoDefault: "Κοινοτικά drops: η κοινότητα ψηφίζει για να ξεκλειδώσει ένα μυστηριώδες PC.\n\n1. Η ψηφοφορία ανοίγει την ημερομηνία που φαίνεται.\n2. Κάθε συνδεδεμένος πράκτορας με επιβεβαιωμένο email έχει μία ψήφο.\n3. Αν μαζευτούν οι ψήφοι πριν λήξει ο χρόνος, το PC ξεκλειδώνει και μπαίνει αμέσως στα Live Drops, έτοιμο για παραγγελία.\n4. Αν λήξει πρώτα ο χρόνος, το PC έρχεται κι αυτό στα Live Drops με το κλείσιμο της ψηφοφορίας.",
        communityDropBadge: "ΚΟΙΝΟΤΙΚΟ DROP",
        // Τροχός + κουπόνια (wheel.js, dashboard, καλάθι)
        wheelSpinsLeft: "ΠΡΟΣΠΑΘΕΙΕΣ: {n}/{max}", wheelBonusSpins: " · +{n} ΜΠΟΝΟΥΣ", wheelLoginRequired: "Συνδέσου για να γυρίσεις τον τροχό.",
        wheelError: "Ο τροχός δεν απάντησε — δοκίμασε ξανά σε λίγο.", wheelNoSpins: "Τελείωσαν οι προσπάθειες — ξανά σε {time}.",
        wheelSkinNew: "> ΞΕΚΛΕΙΔΩΣΕΣ ΤΟ SKIN {name} — ΕΦΑΡΜΟΣΤΗΚΕ ΣΤΟ SITE.", wheelSkinAgain: "> ΤΟ SKIN {name} ΤΟ ΕΙΧΕΣ ΗΔΗ — ΕΦΑΡΜΟΣΤΗΚΕ ΞΑΝΑ.",
        wheelCouponWon: "> ΚΕΡΔΙΣΕΣ ΚΟΥΠΟΝΙ -{p}%: {code} — ισχύει έως {until}. Το βρίσκεις στο προφίλ σου και στο καλάθι.",
        wheelCouponToast: "🎟 Κέρδισες κουπόνι -{p}%!", wheelBlank: "> ΤΙΠΟΤΑ ΑΥΤΗ ΤΗ ΦΟΡΑ — ΔΟΚΙΜΑΣΕ ΞΑΝΑ.", wheelBlankLast: "> ΤΙΠΟΤΑ ΑΥΤΗ ΤΗ ΦΟΡΑ — ΤΕΛΕΙΩΣΑΝ ΟΙ ΠΡΟΣΠΑΘΕΙΕΣ.",
        dossierCouponsHeading: "Κουπόνια", dossierNoCoupons: "> Κανένα κουπόνι ακόμα — κέρδισε ένα στον Ημερήσιο Τροχό.",
        couponUsed: "Χρησιμοποιήθηκε", couponValidUntil: "Ισχύει έως {until}", couponCopy: "Αντιγραφή κωδικού", couponCopied: "Ο κωδικός {code} αντιγράφηκε",
        cartCouponLabel: "Κουπόνι", cartCouponNone: "Χωρίς κουπόνι", cartCouponLine: "Έκπτωση κουπονιού (-{p}%)",
        orderMsgCoupon: "Κουπόνι", orderMsgAccount: "Λογαριασμός",
        // Τίτλος πάνω από την κάρτα (renderStageHeading στο catalog.js)
        stageLive: "Διαθέσιμα συστήματα", stageStarter: "Διάλεξε πακέτο", stagePack: "Πακέτο {pack}", stageVote: "Κοινοτική ψηφοφορία",
        packGamingDesc: "Esports και βαριά AAA παιχνίδια", packStreamingDesc: "Παίζεις και κάνεις stream μαζί", packCodingDesc: "Development, πολλά παράθυρα, αθόρυβο",
        packSoon: "Έρχονται σύντομα",
        stageCountOne: "1 σύστημα", stageCountMany: "{n} συστήματα", stageEmpty: "Δεν υπάρχουν συστήματα εδώ ακόμα — έρχονται σύντομα.",
        membersOnlyBadge: "ΠΡΟΤΕΡΑΙΟΤΗΤΑ ΜΕΛΩΝ ΕΩΣ {until}", membersOnlyBtn: "Σύνδεση για πρόσβαση μελών",
        membersOnlyAlert: "Μέχρι {until} το παραγγέλνουν μόνο τα μέλη — συνδέσου για να το πάρεις πρώτος.",
        voteHelpUnlockedMembers: "Προτεραιότητα για τα μέλη έως {until}, μετά για όλους · 1 τεμάχιο.",

        // Όροι — HTML (data-i18n-html): ο τίτλος του κάθε σημείου είναι <strong>, τα data-info-go είναι συνδέσεις προς άλλη καρτέλα
        rules1: "<strong>Παραγγελίες.</strong> Το απόθεμα ενημερώνεται όταν φορτώνει η σελίδα. Η παραγγελία στέλνεται μέσω WhatsApp και ολοκληρώνεται όταν την επιβεβαιώσουμε μαζί σου.",
        rules2: "<strong>Τιμές.</strong> Οι τιμές περιλαμβάνουν ΦΠΑ, εκτός αν αναφέρεται διαφορετικά.",
        rules3: "<strong>Επιστροφές & εγγύηση.</strong> Ισχύει δικαίωμα υπαναχώρησης 14 ημερών και νόμιμη εγγύηση 2 ετών — δες την καρτέλα <a href=\"#\" data-info-go=\"returns\">Εγγύηση & Επιστροφές</a>.",
        rules4: "<strong>Custom βαφή.</strong> Η βαφή φτιάχνεται κατά παραγγελία, με βάση τη δική σου επιλογή. Για αυτήν δεν γίνεται επιστροφή λόγω αλλαγής γνώμης (εξαίρεση από το δικαίωμα υπαναχώρησης 14 ημερών, ν. 2251/1994 & Οδηγία 2011/83/ΕΕ). Η νόμιμη εγγύηση 2 ετών για ελαττώματα ισχύει κανονικά.",
        rules5: "<strong>Επικοινωνία.</strong> Για πλήρεις όρους χρήσης και πολιτική απορρήτου, επικοινωνήστε μαζί μας από την καρτέλα <a href=\"#\" data-info-go=\"support\">Υποστήριξη</a>.",

        cartYourLoot: "Η λεία σου", cartTotalLabel: "Σύνολο", cartCheckoutBtn: "Στείλε την παραγγελία στο WhatsApp",
        compareSpecs: "Προδιαγραφές", compareFps: "Απόδοση (FPS)", compareView: "Δες το",
        briefMore: "Περισσότερα ▾", briefLess: "Λιγότερα ▴",
        cartHintTitle: "Προστέθηκε στο καλάθι", cartHintText: "Το καλάθι σου είναι εδώ — πάτα όποτε είσαι έτοιμος.",
        tickerDelivery: "⚡ Ασφαλής παράδοση 24H σε όλη τη Θεσσαλονίκη ⚡", tickerAssembled: "Συστήματα πλήρως συναρμολογημένα & ελεγμένα",
        tickerProcessed: "⚡ Οι παραγγελίες επεξεργάζονται εντός 24 ωρών ⚡", tickerDiagnostic: "Πλήρης διαγνωστικός έλεγχος πριν από κάθε αποστολή",

        classifiedBrief: ">// ΣΤΟΙΧΕΙΑ ΜΟΝΑΔΑΣ", inspectSystemBtn: "Επιθεώρηση συστήματος", addedToVs: "Προστέθηκε στο VS", compareBtn: "Σύγκριση",
        descFallback: "Αναλυτικές προδιαγραφές για αυτό το σύστημα.", taglineFallback: "Εξουσιοδοτημένη κατασκευή συστήματος", systemDetailsFallback: "Στοιχεία συστήματος",

        menuDashboard: "Πίνακας ελέγχου", menuSignOut: "Αποσύνδεση", menuSignIn: "Σύνδεση", menuRegister: "Εγγραφή",
        menuVerifyEmail: "Επιβεβαίωση email",
        // rankOperative/rankRecruit lived here and were written straight into the dossier for
        // anyone logged in. Ranks now come from the API's XP total, so their display names sit in
        // CONFIG.RANK_NAMES next to the rest of the ladder.
        unknownUser: "Άγνωστος χρήστης", agentFallback: "Πράκτορας",
        purchasedLabel: "Αγορασμένο",

        alertEnterEmail: "Συμπλήρωσε το email σου.",
        alertTokenAndPassword: "Συμπλήρωσε και τον κωδικό ανάκτησης και τον νέο κωδικό πρόσβασης.",
        toastResetSent: "📧 Αν υπάρχει λογαριασμός με αυτό το email, στάλθηκε κωδικός ανάκτησης",
        toastPasswordUpdated: "✅ Ο κωδικός ενημερώθηκε — συνδέσου με τον νέο",

        toastVerifyReminder: "⚠ Επιβεβαίωσε το email σου για να ξεκλειδώσεις wishlist, επιτεύγματα & ψηφοφορία",
        toastCheckEmailToVerify: "📧 Έλεγξε το email σου για να επιβεβαιώσεις τον λογαριασμό σου",
        toastAlreadyVerified: "Το email σου είναι ήδη επιβεβαιωμένο",
        toastVerificationSent: "📧 Το email επιβεβαίωσης στάλθηκε — έλεγξε τα εισερχόμενά σου",
        // Cooldown πάνω στο "resend" — βλ. RESEND_COOLDOWN_MS στο js/modules/auth.js
        toastResendCooldown: "Περίμενε {s}s πριν ζητήσεις άλλο email",
        // Boot — βλ. BOOT_BUDGET_MS στο js/main.js
        bootWakingServer: "ΕΝΕΡΓΟΠΟΙΗΣΗ SERVER...", bootDataArrived: "Ο ΚΑΤΑΛΟΓΟΣ ΦΟΡΤΩΘΗΚΕ",
        dossierResendBtn: "ΕΠΑΝΑΠΟΣΤΟΛΗ EMAIL", dossierResendCountdown: "ΕΠΑΝΑΠΟΣΤΟΛΗ ΣΕ {s}s",

        alertBothFields: "Προσοχή: Συμπλήρωσε όνομα χρήστη και κωδικό", alertInvalidCreds: "Λανθασμένα στοιχεία σύνδεσης",
        alertAllFieldsRecruit: "Προσοχή: Όλα τα πεδία είναι υποχρεωτικά", alertRegistrationFailed: "Η εγγραφή απέτυχε",
        alertSoldOut: "Εξαντλήθηκε!", alertCartEmpty: "Το καλάθι είναι άδειο!", alertMaxCompare: "Μέγιστο 2 συστήματα στη σύγκριση",
        // Badges αποθέματος — κάρτα (renderCard) και inspect (gallery.js)
        stockIn: "ΔΙΑΘΕΣΙΜΟ", stockLow: "ΛΙΓΑ ΚΟΜΜΑΤΙΑ: {n}", stockLast: "ΜΟΝΟ 1 ΤΕΜΑΧΙΟ", stockOut: "ΕΞΑΝΤΛΗΘΗΚΕ", stockSoon: "ΣΥΝΤΟΜΑ",
        cartEmpty: "ΤΟ ΚΑΛΑΘΙ ΕΙΝΑΙ ΑΔΕΙΟ", cartRemove: "Αφαίρεση",
        addToCartBtn: "Στο καλάθι", flipToSpecs: "Δες τα specs", flipToFront: "Πίσω στην κάρτα",
        alertComingSoon: "Έρχεται σύντομα — δεν είναι ακόμα διαθέσιμο", alertStockLimit: "Έχεις ήδη στο καλάθι όσα κομμάτια υπάρχουν",
        missionPromptCode: "Εισάγετε τον κωδικό αποστολής (βρίσκεται στο κουτί):",
        missionExpiredAlert: "Ο κωδικός έληξε (ισχύει 2 ημέρες από την πρώτη χρήση). Αν έχεις θέμα με το PC σου, κάνε επιστροφή από τις Πληροφορίες.",
        connectionErrorAlert: "⚠️ Σφάλμα σύνδεσης!\nΟ διακομιστής δεν ανταποκρίνεται.",
        alertAllFieldsReview: "Προσοχή: Όλα τα πεδία είναι υποχρεωτικά", alertTransmissionFailed: "Η αποστολή απέτυχε",
        alertServerError: "Σφάλμα διακομιστή", alertSelectErrorProtocol: "⚠️ Προσοχή: Επίλεξε έγκυρο πρωτόκολλο σφάλματος.",
        loreFallback: "Σύστημα τακτικών επιχειρήσεων. Οι πλήρεις προδιαγραφές βρίσκονται στον φάκελο INSPECT. Απαιτείται εξουσιοδότηση.",
        backToPacksBtn: "Πίσω στα packs"
    },
    en: {
        sideSettings: "System Settings", sideInfo: "Information: warranty, terms, support",
        sideWheel: "Daily Spin", sideLang: "Toggle Language", sideSocial: "Social Networks", sideDiscord: "Discord",
        mascotAdminTitle: "The admin is waiting for you!", mascotAdminText: "Tap below to message them on WhatsApp.", mascotAdminGo: "Go to WhatsApp",
        sideQr: "QR for your phone", qrTitle: "Open it on your phone", qrText: "Scan the code with your phone's camera and the site opens there.",
        qrCopy: "Copy link", qrShare: "Share", qrLoading: "Loading…", qrFailed: "The QR code didn't load. Copy the link below instead.",
        sideInstagram: "Instagram", sideDropAlerts: "Drop Alerts", sideReviews: "Reviews", sideTerminal: "Terminal",
        termHint: "Type 'help' or tap a command below.", termHelpHead: "AVAILABLE COMMANDS:",
        termH_help: "this list", termH_theme: "night / day", termH_color: "accent colour",
        termH_sound: "sound on / off", termH_lang: "language el / en", termH_vote: "the vote right now",
        termH_cart: "what's in the cart", termH_tour: "replay the tour", termH_clear: "clear the screen", termH_exit: "close",
        termThemeUsage: "Usage: theme night | day | auto", termThemeSet: "Mode: {mode}",
        termMode_night: "NIGHT", termMode_day: "DAY", termMode_auto: "AUTO (follows the clock)",
        termColorList: "Pick a colour (🔒 = locked, unlock it on the wheel):", termColorSet: "Accent: {name}",
        termColorUnknown: "Unknown colour. Try: {list}",
        termSoundUsage: "Usage: sound on | off", termSoundOn: "Sound: ON", termSoundOff: "Sound: OFF",
        termLangUsage: "Usage: lang el | en", termLangSet: "Language: {lang}",
        termVoteCount: "{votes} / {target} votes", termVoteTime: "Closes in {time}", termVoteVoted: "You have already voted.",
        termCartEmpty: "The cart is empty.", termCartTotal: "TOTAL: {total}", termTour: "Starting the tour...",
        termUnknown: "Unknown command: {cmd}. Type 'help'.", termDidYouMean: "Did you mean '{cmd}'?",

        reviewsLabel: "REVIEWS", writeReviewBtn: "[+] WRITE REVIEW", cartLabel: "CART",
        packGaming: "GAMING", packStreaming: "STREAMING", packCoding: "CODING",
        armoryLocked: "ARMORY LOCKED", voteProgressLabel: "PROGRESS",
        vsModeReady: "VS MODE READY", vsHalf: "1/2 · ADD ONE MORE", vsAddOne: "Pick one more system to compare them", chatTop: "Buying help", chatBack: "BACK",

        extrasLabel: "EXTRAS", inspectTabLore: "UNIT DATA",
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

        trustWarrantyTitle: "2-YEAR LEGAL WARRANTY",
        trustWarrantyText: "Every system is covered by the 2-year statutory warranty against defects, in accordance with current consumer protection law.",
        trustReturnTitle: "14-DAY RIGHT OF WITHDRAWAL",
        trustReturnText: "You have the right to withdraw within 14 calendar days of receipt, without justification, in accordance with EU distance-selling law. Exception: custom paint, which is made to order.",
        trustShippingTitle: "GR SHIPPING",
        trustShippingText: "Secure packaging and delivery across Greece, with a full functionality check before shipping.",

        settingsTitle: "SYSTEM PREFERENCES", accentColorLabel: "ACCENT COLOR",
        settingsSound: "Sound & music", settingsLanguage: "Language", settingsReplayTour: "Replay the tour",
        colorsLockedNote: "Row 2 unlocks on the Daily Spin, row 3 by ranking up on your profile (sign-in required).", colorsSpinBtn: "Spin the wheel",
        toastColorLocked: "Locked colour — spin the Daily Wheel to unlock it.", toastColorRankLocked: "Locked colour — it unlocks at rank {rank}.", toastColorRankLockedAny: "Locked colour — it unlocks as you rank up on your profile.",
        rankUpToast: "NEW RANK: {rank}",
        cardExtraFrom: "from +{price}", rankLadderTitle: "Ranks", rankInfoTitle: "How ranks work", rankStepNow: "NOW", rankStepLeft: "{n} XP to go", rankStepSpins: "+{n} spins",
        rankInfoIntro: "Every achievement you unlock gives XP, and XP raises your rank.",
        rankInfoXp: "Earn XP from achievements: confirm your email, save systems to your wishlist, vote, write a review and more.",
        rankInfoRank: "Each rank has an XP threshold. The bar shows how far you are from the next one.",
        rankInfoSpins: "Some ranks give bonus wheel spins. They are saved for you and used after your 3 daily attempts, without delaying them.",
        rankInfoColors: "Some ranks unlock an accent colour — Ultraviolet, Arctic, Phantom — that you can only get this way, never on the wheel.",
        rankInfoBadge: "Your rank shows as a badge on your profile and next to your name on the reviews you write while signed in.",
        rankInfoOnce: "Each reward is given once — the first time you reach that rank.", rankUpSpins: "+{n} wheel spins", rankUpColor: "{name} colour",
        rewardUltraviolet: "ULTRAVIOLET SKIN", rewardArctic: "ARCTIC SKIN", rewardPhantom: "PHANTOM SKIN",
        colorLime: "Lime", colorCyan: "Cyan", colorRed: "Red", colorPurple: "Purple",
        closeLabel: "Close",

        // Combined Information window (index.html #info-modal): Warranty & Returns / Terms / Support
        infoTitle: "Information", infoTabReturns: "Warranty & Returns", infoTabTerms: "Terms", infoTabSupport: "Support",
        returnHowTitle: "How to return an item",
        returnHowText: "Press “Return” and your email app opens with a ready-made message. Fill in the details and send it within 14 days of receiving the item; we'll reply with the next steps.",
        returnBtn: "Return", returnCopyBtn: "Copy email", returnCopied: "Email copied",
        returnMailSubject: "Return request — PHOENIX CODEX",
        returnMailBody: "Hello,\n\nI would like to return an item.\n\nName:\nSystem (PC):\nDate received:\nReason for return:\n\nThank you",
        returnMailBodyCode: "Hello,\n\nI would like to return an item.\n\nSystem: {pc}\nBox code: {code}\nReason: {reason}\n\nName:\nDate received:\n\nThank you",
        supportFaqTitle: "PC picking help", supportFaqText: "Tell us what you do or your budget and we take you to the right system",
        budgetUnder: "Up to €{max}", budgetOver: "Over €{min}", budgetClear: "Clear the filter",
        supportEmailTitle: "Email us", supportCodeTitle: "Got a code from the box?",
        supportCodeText: "Write a review for your PC; the code is valid for 2 days after you first use it.",

        newsletterTitle: "DROP ALERTS", newsletterDesc: "Get notified the moment a new PC drops or a vote starts.", newsletterBtn: "ACTIVATE ALERTS",
        reviewCodeTitle: "VERIFIED REVIEW", reviewCodeBtn: "SUBMIT TRANSMISSION", rcUserPlaceholder: "Agent Name", rcTextPlaceholder: "System performance...",

        missionTitle: "HOW'S YOUR NEW RIG?", missionWindowLabel: "Window closes in",
        missionKeepTitle: "Everything works", missionKeepText: "Keep your system and tell others how it runs.",
        missionKeepBtn: "WRITE A REVIEW",
        missionReportTitle: "Something's not right?", missionReportText: "Pick what's wrong and your email app opens with a ready-made return message.",
        missionSelectReason: "Choose the problem...", missionReason1: "FPS lower than advertised", missionReason2: "Hardware defect / won't start",
        missionReason3: "Specs don't match the listing", missionReason4: "Something else",
        missionReturnBtn: "START A RETURN",

        loginTitle: "AGENT SIGN-IN", usernamePlaceholder: "USERNAME", passwordPlaceholder: "PASSWORD",
        loginBtn: "AUTHENTICATE", lostAccessLink: "[ LOST ACCESS? ]",

        dossierProfileLabel: "[AGENT PROFILE]", dossierOrdersHeading: "My orders", dossierNoOrders: "No orders yet.", dossierNoOrdersSub: "Start shopping and your orders will show up here.", dossierJourney: "Your journey begins here",
        dossierWishlistHeading: "Wishlist", dossierWishlistSub: "(SAVED SYSTEMS)",
        dossierAchievementsHeading: "Achievements", dossierSignIn: "> SIGN IN", dossierRegister: "> REGISTER", dossierSignOut: "SIGN OUT",
        dossierNoTargets: "> NO TARGETS LOCKED.", dossierRemoveTarget: "Remove from wishlist",

        // Agent progression. Rank display names live in CONFIG.RANK_NAMES, not here — the API
        // reports a rank by id and the config holds only its presentation.
        achUnlocked: "UNLOCKED", achLocked: "LOCKED", achUnlockedPrefix: "ACHIEVEMENT UNLOCKED",
        xpToNextRank: "{xp} XP → {next} XP for {rank}", xpMaxRank: "{xp} XP — max rank",
        chipWishlist: "WISHLIST", chipAchievements: "ACHIEVEMENTS", chipInCart: "IN CART",
        achViewAll: "VIEW ALL RECORDS",

        signupTitle: "AGENT REGISTRATION", emailPlaceholder: "EMAIL",
        regSubscribeLabel: "🔔 I WANT NOTIFICATIONS FOR NEW DROPS", signupBtn: "REGISTER",

        forgotTitle: "RECOVERY PROTOCOL", forgotBtn: "SEND TOKEN",
        resetTitle: "NEW CREDENTIALS", resetTokenPlaceholder: "Token", resetNewPassPlaceholder: "New Password", resetBtn: "UPDATE SYSTEM",

        achievementsTitle: "AGENT RECORD", compareTitle: "VS MODE",
        // The body text moved to SiteConfig.voteInfoText (admin-editable) — only the modal's title
        // stays a translation-file string, see openVoteInfo() in js/modules/vote.js.
        voteInfoTitle: "HOW IT WORKS",
        // VOTE tab (js/modules/vote.js) — one card, one button per state
        voteStatus_none: "NO VOTE RUNNING", voteStatus_upcoming: "COMING SOON", voteStatus_open: "VOTING OPEN",
        voteStatus_unlocked: "UNLOCKED", voteStatus_closed: "CLOSED", voteStatus_loading: "LOADING...",
        voteHowItWorks: "How it works", voteNoneTitle: "No vote right now",
        voteMsgNone: "The next community drop is on its way. Want to be the first to know when voting opens?",
        voteMsgUnlocked: "The community unlocked it! The PC is now in Live Drops, ready to order.",
        voteMsgClosed: "Time ran out before the target was reached — the PC is now in Live Drops.",
        voteEstPrice: "~{price} · estimate", votePriceTbd: "Price: coming soon",
        voteCount: "{n} / {target} votes", voteRemainingOne: "1 vote to go", voteRemainingMany: "{n} votes to go",
        voteOpensIn: "Opens in {time}", voteClosesIn: "Closes in {time}",
        voteNotifyBtn: "Notify me", voteLoginBtn: "Sign in to vote", voteVerifyBtn: "Verify your email",
        voteCastBtn: "Vote · +50 XP", voteDoneBtn: "✓ Your vote counts", voteSeeLiveBtn: "See it in Live Drops",
        voteHelpUpcoming: "You can vote as soon as voting opens.",
        voteHelpGuest: "Free account · 1 vote per agent.", voteSignupLink: "Sign up",
        voteHelpVerify: "Your vote unlocks once you verify your email.",
        voteHelpCan: "1 vote per agent — it counts straight away.",
        voteHelpVoted: "Bring others in to unlock it faster.", voteShareLink: "Share",
        voteHelpUnlocked: "1 unit — first come, first served.",
        voteToastCounted: "Your vote counts!", voteToastAlready: "You've already voted on this drop.",
        voteToastFailed: "Your vote didn't go through — try again in a moment.",
        voteUnlockedToast: "🔓 {name} is unlocked — it's in Live Drops!",
        voteShareText: "Vote to unlock {name} at PHOENIX CODEX!", linkCopied: "Link copied",
        voteInfoDefault: "Community drops: the network votes to unlock a mystery PC.\n\n1. Voting opens on the date shown.\n2. Every signed-in agent with a verified email gets one vote.\n3. Reach the target before time runs out and the PC unlocks — it goes straight to Live Drops, ready to order.\n4. If time runs out first, the PC still comes to Live Drops when voting closes.",
        communityDropBadge: "COMMUNITY DROP",
        // Wheel + coupons (wheel.js, dashboard, cart)
        wheelSpinsLeft: "SPINS LEFT: {n}/{max}", wheelBonusSpins: " · +{n} BONUS", wheelLoginRequired: "Sign in to spin the wheel.",
        wheelError: "The wheel didn't respond — try again in a moment.", wheelNoSpins: "No spins left — next in {time}.",
        wheelSkinNew: "> SKIN {name} UNLOCKED — APPLIED TO THE SITE.", wheelSkinAgain: "> YOU ALREADY HAD SKIN {name} — RE-APPLIED.",
        wheelCouponWon: "> YOU WON A -{p}% COUPON: {code} — valid until {until}. It's in your profile and your cart.",
        wheelCouponToast: "🎟 You won a -{p}% coupon!", wheelBlank: "> NOTHING THIS TIME — TRY AGAIN.", wheelBlankLast: "> NOTHING THIS TIME — NO SPINS LEFT.",
        dossierCouponsHeading: "Coupons", dossierNoCoupons: "> No coupons yet — win one on the Daily Wheel.",
        couponUsed: "Used", couponValidUntil: "Valid until {until}", couponCopy: "Copy code", couponCopied: "Code {code} copied",
        cartCouponLabel: "Coupon", cartCouponNone: "No coupon", cartCouponLine: "Coupon discount (-{p}%)",
        orderMsgCoupon: "Coupon", orderMsgAccount: "Account",
        // Heading over the card (renderStageHeading in catalog.js)
        stageLive: "Available systems", stageStarter: "Choose a pack", stagePack: "{pack} pack", stageVote: "Community vote",
        packGamingDesc: "Esports and heavy AAA games", packStreamingDesc: "Play and stream at the same time", packCodingDesc: "Development, many windows, quiet",
        packSoon: "Coming soon",
        stageCountOne: "1 system", stageCountMany: "{n} systems", stageEmpty: "No systems here yet — more are on the way.",
        membersOnlyBadge: "MEMBERS FIRST UNTIL {until}", membersOnlyBtn: "Sign in for member access",
        membersOnlyAlert: "Until {until} only members can order this — sign in to get it first.",
        voteHelpUnlockedMembers: "Members first until {until}, then everyone · 1 unit.",

        rules1: "<strong>Orders.</strong> Stock is refreshed when the page loads. Your order is sent over WhatsApp and is complete once we confirm it with you.",
        rules2: "<strong>Prices.</strong> Prices include VAT unless stated otherwise.",
        rules3: "<strong>Returns & warranty.</strong> A 14-day right of withdrawal and a 2-year statutory warranty apply — see the <a href=\"#\" data-info-go=\"returns\">Warranty & Returns</a> tab.",
        rules4: "<strong>Custom paint.</strong> Paint is made to order from your own choice. It cannot be returned for change of mind (exempt from the 14-day right of withdrawal under Greek law 2251/1994 & EU Directive 2011/83/EU). The 2-year statutory warranty against defects still applies in full.",
        rules5: "<strong>Contact.</strong> For full terms of use and our privacy policy, please contact us from the <a href=\"#\" data-info-go=\"support\">Support</a> tab.",

        cartYourLoot: "YOUR LOOT", cartTotalLabel: "TOTAL", cartCheckoutBtn: "SEND YOUR ORDER ON WHATSAPP",
        compareSpecs: "SPECS", compareFps: "PERFORMANCE (FPS)", compareView: "VIEW",
        briefMore: "MORE ▾", briefLess: "LESS ▴",
        cartHintTitle: "ADDED TO CART", cartHintText: "Your cart is right here — tap it whenever you're ready.",
        tickerDelivery: "⚡ 24H SECURE DELIVERY ACROSS SKG ⚡", tickerAssembled: "SYSTEMS FULLY ASSEMBLED & TESTED",
        tickerProcessed: "⚡ ORDERS PROCESSED WITHIN 24 HOURS ⚡", tickerDiagnostic: "FULL DIAGNOSTIC CHECK BEFORE EVERY SHIPMENT",

        classifiedBrief: ">// UNIT_DATA", inspectSystemBtn: "INSPECT SYSTEM", addedToVs: "ADDED TO VS", compareBtn: "COMPARE",
        descFallback: "Detailed specifications for this system.", taglineFallback: "AUTHORIZED SYSTEM BUILD", systemDetailsFallback: "System Details",

        menuDashboard: "DASHBOARD", menuSignOut: "SIGN OUT", menuSignIn: "SIGN IN", menuRegister: "REGISTER",
        menuVerifyEmail: "VERIFY EMAIL",
        // Rank names moved to CONFIG.RANK_NAMES — see the note in the el block above.
        unknownUser: "UNKNOWN_USER", agentFallback: "AGENT",
        purchasedLabel: "PURCHASED",

        alertEnterEmail: "Please enter your email address.",
        alertTokenAndPassword: "Please enter both the recovery token and your new password.",
        toastResetSent: "📧 IF AN ACCOUNT EXISTS FOR THAT EMAIL, A RECOVERY TOKEN HAS BEEN SENT",
        toastPasswordUpdated: "✅ PASSWORD UPDATED — SIGN IN WITH YOUR NEW ONE",

        toastVerifyReminder: "⚠ VERIFY YOUR EMAIL TO UNLOCK WISHLIST, ACHIEVEMENTS & VOTING",
        toastCheckEmailToVerify: "📧 CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT",
        toastAlreadyVerified: "YOUR EMAIL IS ALREADY VERIFIED",
        toastVerificationSent: "📧 VERIFICATION EMAIL SENT — CHECK YOUR INBOX",
        // Cooldown on the "resend" button — see RESEND_COOLDOWN_MS in js/modules/auth.js
        toastResendCooldown: "WAIT {s}s BEFORE RESENDING",
        // Boot — see BOOT_BUDGET_MS in js/main.js
        bootWakingServer: "WAKING UP SERVER...", bootDataArrived: "CATALOGUE LOADED",
        dossierResendBtn: "RESEND EMAIL", dossierResendCountdown: "RESEND IN {s}s",

        alertBothFields: "SYSTEM ALERT: ENTER BOTH USERNAME & PASSWORD", alertInvalidCreds: "ACCESS DENIED: INVALID CREDENTIALS",
        alertAllFieldsRecruit: "SYSTEM ALERT: ALL FIELDS REQUIRED FOR RECRUITMENT", alertRegistrationFailed: "REGISTRATION FAILED",
        alertSoldOut: "SOLD OUT!", alertCartEmpty: "Cart is empty!", alertMaxCompare: "MAX 2 ITEMS ALLOWED IN VS MODE",
        // Stock badges — card (renderCard) and inspect view (gallery.js)
        stockIn: "IN STOCK", stockLow: "LOW STOCK: {n} UNITS", stockLast: "ONLY 1 UNIT LEFT", stockOut: "SOLD OUT", stockSoon: "COMING SOON",
        cartEmpty: "CART IS EMPTY", cartRemove: "Remove",
        addToCartBtn: "Add to Cart", flipToSpecs: "Flip to Specs", flipToFront: "Flip to Front",
        alertComingSoon: "Coming soon — not available to order yet", alertStockLimit: "You already have every unit in stock in your cart",
        missionPromptCode: "ENTER MISSION CODE (Found in Box):",
        missionExpiredAlert: "This code has expired (it is valid for 2 days after first use). If something is wrong with your PC, start a return from Information.",
        connectionErrorAlert: "⚠️ CONNECTION ERROR!\nThe server is not responding.",
        alertAllFieldsReview: "SYSTEM ALERT: ALL FIELDS REQUIRED", alertTransmissionFailed: "TRANSMISSION FAILED",
        alertServerError: "SERVER ERROR", alertSelectErrorProtocol: "⚠️ SYSTEM ALERT: Please select a valid Error Protocol.",
        loreFallback: "Tactical operations system. Full specifications are available in the INSPECT file. Authorization required.",
        backToPacksBtn: "BACK TO PACKS"
    }
};

let currentLang = localStorage.getItem('codex_lang') || 'en';

// Flag icons, shown for the language you'd switch TO, not the currently active one — the neon bar
// icons (assets/icons/bar, see .side-ico in sidebars.css).
const FLAG_GR = `<img class="side-ico" src="assets/icons/bar/flag-gr.png" alt="" aria-hidden="true">`;
const FLAG_UK = `<img class="side-ico" src="assets/icons/bar/flag-uk.png" alt="" aria-hidden="true">`;

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
    // Name for icon-only controls (colour swatches, close buttons) — read by screen readers, and the
    // fallback label when a phone has no hover tooltip
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const v = translations[lang]?.[el.dataset.i18nAria];
        if (v !== undefined) el.setAttribute('aria-label', v);
    });

    currentLang = lang;
    localStorage.setItem('codex_lang', lang);
    document.documentElement.lang = lang;

    const btn = document.getElementById('lang-toggle-btn');
    // Shows the language you'd switch TO, which is the usual convention but reads backwards to many
    // people ("why is there a UK flag on a Greek page?"). The code under the flag makes it read as
    // "tap for EN" rather than "you are in English".
    if (btn) btn.innerHTML = lang === 'el'
        ? `${FLAG_UK}<span class="lang-code">EN</span>`
        : `${FLAG_GR}<span class="lang-code">ΕΛ</span>`;

    // Re-render JS-templated chrome (card buttons / brief heading / profile menu) so it flips instantly too
    if (window.renderCard) window.renderCard();
    if (window.updateAuthUI) window.updateAuthUI(localStorage.getItem('codex_username'));
    if (window.renderGlobalReviews) window.renderGlobalReviews();
    // Badge titles/descriptions come from CONFIG.ACHIEVEMENTS_LIST rather than data-i18n, so the
    // grids and the rank line have to be rebuilt by hand on a language switch.
    if (window.refreshProgressionUI) window.refreshProgressionUI();
    // Extras rows carry prices/hours baked into their text, so they're built in JS, not data-i18n
    if (window.renderExtras) window.renderExtras();
    if (window.updateCartUI) window.updateCartUI();
    if (window.renderChat) window.renderChat();
    if (window.syncSettingsUI) window.syncSettingsUI();
    // For anything built outside data-i18n that needs to follow the language (modal close labels, …)
    document.dispatchEvent(new CustomEvent('codex:lang', { detail: { lang } }));
}

export function toggleLanguage() {
    applyLanguage(currentLang === 'el' ? 'en' : 'el');
    // Switching the language is one of the badges the API can't observe for itself
    if (window.checkAchievement) window.checkAchievement('polyglot');
}

// An explicit choice (the ΕΛ | EN switch in Settings, the tour's language pick) rather than a flip
export function setLanguage(lang) {
    if (lang !== 'el' && lang !== 'en') return;
    const changed = lang !== currentLang;
    applyLanguage(lang);
    if (changed && window.checkAchievement) window.checkAchievement('polyglot');
}

// For the few places that hold their own {en, el} tables rather than i18n keys — the achievement
// catalogue in config.js is tabular data tied to an id, so it can't go through t().
export function getLang() { return currentLang; }

// t('paintLeadTime', { hours: 48 }) fills {hours} in the string. Values are inserted as-is, so
// only pass numbers/trusted labels — never raw user input into a key rendered with innerHTML.
export function t(key, vars) {
    const str = translations[currentLang]?.[key] ?? translations.el[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? vars[name] : m));
}

window.toggleLanguage = toggleLanguage;
window.applyLanguage = applyLanguage;
window.setLanguage = setLanguage;
window.t = t;
