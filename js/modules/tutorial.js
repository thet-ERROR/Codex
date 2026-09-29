// js/modules/tutorial.js

// Built when the tour starts, not at load: which elements exist, where they sit and which side a
// popover can open on all depend on the layout at that moment — and the layouts differ a lot.
//
//   <= 768px  phone: tabs on top, then [logo][terminal][profile][cart] (mobile.css), cart is the
//             round .cart-btn-mobile (the nav bar's is hidden), swipe between PCs.
//   <= 1024px the sidebar becomes a bottom bar (tablet.css), so its popovers must open ABOVE it —
//             "right" put them off-screen — and reviews move to .mobile-reviews-btn.
//   desktop   logo | centred tabs with CART | terminal, profile; sidebar is a left rail.
//
// Steps are listed in the order they appear on screen for that layout, so the tour reads top to
// bottom instead of jumping around. Keep this in sync with any change to those areas.
const isPhone = () => window.matchMedia('(max-width: 768px)').matches;
const hasBottomBar = () => window.matchMedia('(max-width: 1024px)').matches;

const COPY = {
    en: {
        welcome: ['WELCOME AGENT', 'Initiating System Override. Let us give you a quick tour of the CODEX Terminal.'],
        logo: ['IDENTITY CHECK', "Tap the logo anytime to see who's really running this operation."],
        live: ['LIVE DROPS', 'Here you will find the currently available, custom-built gaming rigs ready for deployment.'],
        vault: ['LAST CALL', 'Access classified systems that are either sold out or incoming. Keep an eye out for legendary drops.'],
        vote: ['VOTE', "The network votes on which mystery PC gets unlocked for purchase. Only signed-in agents can vote — if it isn't secured before time runs out, it automatically moves to Live Drops."],
        browsePhone: ['BROWSE SYSTEMS', 'Swipe the card left or right to see the next PC. Tap INSPECT SYSTEM for full specs, FPS and options.'],
        browseDesktop: ['BROWSE SYSTEMS', 'Use the arrows either side of the card to see the next PC. INSPECT SYSTEM opens full specs, FPS and options.'],
        cart: ['YOUR LOOT', 'Everything you pick lands here. Check your total, then send the order straight to us on WhatsApp.'],
        cli: ['THE TERMINAL', 'Tap here (or press [`] on a keyboard) to open the command line. Try typing "hack" inside it.'],
        profile: ['AGENT PROFILE', 'Sign in or register here to save your wishlist, track your rank, and unlock rewards.'],
        settings: ['SYSTEM PREFERENCES', 'Customize your accent color here.'],
        wheel: ['DAILY SPIN', 'Spin the wheel once a day for a chance to unlock premium accent colors or a discount coupon.'],
        lang: ['LANGUAGE', 'Switch between Greek and English anytime. The button shows the language you\'ll switch TO — the whole site updates instantly.'],
        reviews: ['MISSION CODES', 'Found a code in your PC box? Enter it here to leave a review — or to start a return if something\'s wrong.']
    },
    el: {
        welcome: ['ΚΑΛΩΣΟΡΙΣΕΣ, ΠΡΑΚΤΟΡΑ', 'Ενεργοποιείται παράκαμψη συστήματος. Ας σου κάνουμε μια γρήγορη ξενάγηση στο CODEX Terminal.'],
        logo: ['ΕΛΕΓΧΟΣ ΤΑΥΤΟΤΗΤΑΣ', 'Πάτα το λογότυπο όποτε θες, για να δεις ποιος πραγματικά τρέχει αυτή την επιχείρηση.'],
        live: ['LIVE DROPS', 'Εδώ θα βρεις τα διαθέσιμα, χειροποίητα gaming rigs, έτοιμα για παράδοση.'],
        vault: ['LAST CALL', 'Πρόσβαση σε απόρρητα συστήματα που είναι είτε εξαντλημένα είτε έρχονται σύντομα. Πρόσεχε για θρυλικά drops.'],
        vote: ['VOTE', 'Το δίκτυο ψηφίζει ποιο μυστηριώδες PC θα ξεκλειδωθεί για αγορά. Μόνο συνδεδεμένοι πράκτορες μπορούν να ψηφίσουν — αν δεν εξασφαλιστεί πριν λήξει ο χρόνος, μεταφέρεται αυτόματα στα Live Drops.'],
        browsePhone: ['ΠΕΡΙΗΓΗΣΗ', 'Σύρε την κάρτα αριστερά ή δεξιά για να δεις το επόμενο PC. Το ΕΠΙΘΕΩΡΗΣΗ ΣΥΣΤΗΜΑΤΟΣ δείχνει πλήρη specs, FPS και επιλογές.'],
        browseDesktop: ['ΠΕΡΙΗΓΗΣΗ', 'Με τα βελάκια δεξιά κι αριστερά της κάρτας βλέπεις το επόμενο PC. Το ΕΠΙΘΕΩΡΗΣΗ ΣΥΣΤΗΜΑΤΟΣ δείχνει πλήρη specs, FPS και επιλογές.'],
        cart: ['Η ΛΕΙΑ ΣΟΥ', 'Ό,τι διαλέγεις μπαίνει εδώ. Δες το σύνολο και στείλε μας την παραγγελία κατευθείαν στο WhatsApp.'],
        cli: ['ΤΟ ΤΕΡΜΑΤΙΚΟ', 'Πάτα εδώ (ή το πλήκτρο [`] σε πληκτρολόγιο) για να ανοίξεις τη γραμμή εντολών. Δοκίμασε να γράψεις "hack" μέσα.'],
        profile: ['ΠΡΟΦΙΛ ΠΡΑΚΤΟΡΑ', 'Συνδέσου ή κάνε εγγραφή εδώ για να αποθηκεύσεις τη λίστα επιθυμιών σου, να παρακολουθείς το rank σου και να ξεκλειδώνεις έπαθλα.'],
        settings: ['ΡΥΘΜΙΣΕΙΣ ΣΥΣΤΗΜΑΤΟΣ', 'Προσάρμοσε το χρώμα τονισμού σου εδώ.'],
        wheel: ['ΚΑΘΗΜΕΡΙΝΗ ΠΕΡΙΣΤΡΟΦΗ', 'Γύρνα τον τροχό μία φορά τη μέρα για να ξεκλειδώσεις premium χρώματα ή κουπόνι έκπτωσης.'],
        lang: ['ΓΛΩΣΣΑ', 'Άλλαξε ανά πάσα στιγμή μεταξύ ελληνικών και αγγλικών. Το κουμπί δείχνει τη γλώσσα στην οποία θα ΠΑΣ — όλο το site ενημερώνεται αμέσως.'],
        reviews: ['ΚΩΔΙΚΟΙ ΑΠΟΣΤΟΛΗΣ', 'Βρήκες κωδικό στο κουτί του PC σου; Βάλ\' τον εδώ για να γράψεις κριτική — ή για να ξεκινήσεις επιστροφή αν κάτι δεν πάει καλά.']
    }
};

function buildSteps(lang) {
    const c = COPY[lang];
    const phone = isPhone();
    const bar = hasBottomBar();
    const step = (element, key, side, align = 'center') => ({
        ...(element ? { element } : {}),
        popover: { title: c[key][0], description: c[key][1], side, align }
    });

    const tabs = [
        step('#tab-live', 'live', 'bottom', 'start'),
        step('#tab-vault', 'vault', 'bottom', 'start'),
        step('#tab-vote', 'vote', 'bottom', 'start')
    ];
    // The card sits mid-screen; "top" keeps the popover off the card it's describing
    const browse = step('#carousel-wrapper', phone ? 'browsePhone' : 'browseDesktop', 'top');

    const header = phone
        ? [...tabs,
           step('.logo', 'logo', 'bottom', 'start'),
           step('.cli-btn', 'cli', 'bottom'),
           step('.profile-btn', 'profile', 'bottom'),
           step('.cart-btn-mobile', 'cart', 'bottom', 'end'),
           browse]
        : [step('.logo', 'logo', 'bottom', 'start'),
           ...tabs,
           step('.cart-btn', 'cart', 'bottom', 'end'),
           step('.cli-btn', 'cli', 'bottom', 'end'),
           step('.profile-btn', 'profile', 'bottom', 'end'),
           browse];

    // On the bottom bar a popover has to open upwards; on the desktop rail, to the right
    const sideSide = bar ? 'top' : 'right';
    const sidebar = [
        step('[data-i18n-title="sideSettings"]', 'settings', sideSide),
        step('[data-i18n-title="sideWheel"]', 'wheel', sideSide),
        step('#lang-toggle-btn', 'lang', sideSide),
        // .add-review-btn (desktop right sidebar) and .mobile-reviews-btn swap at 1024px, not 768px
        step(bar ? '.mobile-reviews-btn' : '.add-review-btn', 'reviews', bar ? 'top' : 'left')
    ];

    return [step(null, 'welcome', 'over'), ...header, ...sidebar];
}

export function initInteractiveTutorial() {
    // Ελέγχουμε αν ο χρήστης (Agent) έχει ήδη ολοκληρώσει το tutorial στο παρελθόν
    if (!localStorage.getItem('codex_tutorial_done')) {
        setTimeout(() => {
            if (window.openModal) window.openModal('tutorial-lang-modal');
        }, 800);
    }
}

export function startTutorialTour(lang) {
    if (window.closeModal) window.closeModal('tutorial-lang-modal');
    localStorage.setItem('codex_tutorial_done', 'true');

    const driver = window.driver.js.driver;
    const isEl = lang === 'el';

    const tour = driver({
        showProgress: true,
        allowClose: true,
        doneBtnText: isEl ? 'ΤΕΛΟΣ' : 'FINISH',
        nextBtnText: isEl ? 'ΕΠΟΜΕΝΟ >' : 'NEXT >',
        prevBtnText: isEl ? '< ΠΙΣΩ' : '< PREV',
        onDestroyed: () => {
            if (window.showToast) window.showToast(isEl ? 'Η ΞΕΝΑΓΗΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ' : 'ONBOARDING COMPLETE', 'achievement');
        },
        steps: buildSteps(isEl ? 'el' : 'en')
    });

    setTimeout(() => tour.drive(), 300);
}

export function skipTutorial() {
    if (window.closeModal) window.closeModal('tutorial-lang-modal');
    localStorage.setItem('codex_tutorial_done', 'true');
}

window.startTutorialTour = startTutorialTour;
window.skipTutorial = skipTutorial;
