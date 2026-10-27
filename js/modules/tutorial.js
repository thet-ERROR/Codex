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
        welcome: ['WELCOME TO PHOENIX!', "I'm the guardian of this place. Let me show you around — this is where we build your ultimate gaming PC."],
        mascot: ["I'M RIGHT HERE", 'Whenever you need help, tap me: I take you to the right PC or the ones in your budget, or put you in touch with the admin.'],
        logo: ['IDENTITY CHECK', "Tap the logo anytime to see who's really running this operation."],
        live: ['LIVE DROPS', 'Every custom-built rig, ready for deployment. A blinking red badge means only one unit is left; COMING SOON builds wait at the end of the list.'],
        vote: ['VOTE', "The community votes to unlock a mystery PC — one vote per signed-in agent with a verified email. Reach the target and it unlocks straight into Live Drops — members can order it first."],
        browsePhone: ['BROWSE SYSTEMS', 'Swipe the card left or right (or tap the arrows on the photo) to see the next PC — the dots show where you are. The tabs switch between the unit data and the extras; INSPECT SYSTEM opens full specs, FPS and options.'],
        browseDesktop: ['BROWSE SYSTEMS', 'Use the arrows on the photo to see the next PC — the dots show where you are. The tabs switch between the unit data and the extras; INSPECT SYSTEM opens full specs, FPS and options.'],
        cart: ['YOUR LOOT', 'Everything you pick lands here. Check your total, then send the order straight to us on WhatsApp.'],
        cli: ['THE TERMINAL', 'Tap here (or press [`] on a keyboard) to open the command line. Tap a command inside it — try "theme" or "color".'],
        profile: ['AGENT PROFILE', 'Sign in or register here to save your wishlist, track your rank, and unlock rewards.'],
        settings: ['SYSTEM PREFERENCES', 'Sound, language and your accent colour — and you can replay this tour from here.'],
        info: ['INFORMATION', 'Warranty & returns, terms and support live here. Need to send something back? Press Return and we handle it by email.'],
        wheel: ['DAILY SPIN', 'Spin the wheel once a day for a chance at a premium accent colour or a discount coupon — coupons wait in your profile and your cart.'],
        lang: ['LANGUAGE', 'Switch between Greek and English anytime. The button shows the language you\'ll switch TO — the whole site updates instantly.'],
        reviews: ['MISSION CODES', 'Found a code in your PC box? Enter it here to leave a review — or to start a return if something\'s wrong.']
    },
    el: {
        welcome: ['ΚΑΛΩΣ ΗΡΘΕΣ ΣΤΗΝ PHOENIX!', 'Είμαι ο φύλακας του site. Έλα να σου δείξω γρήγορα πού είναι τι — εδώ φτιάχνουμε το δικό σου απόλυτο gaming PC.'],
        mascot: ['ΕΓΩ ΕΙΜΑΙ ΕΔΩ', 'Όποτε χρειαστείς βοήθεια, πάτα με: σε πάω στο σωστό PC ή σε όσα χωράνε στο budget σου, ή σε φέρνω σε επαφή με τον admin.'],
        logo: ['ΕΛΕΓΧΟΣ ΤΑΥΤΟΤΗΤΑΣ', 'Πάτα το λογότυπο όποτε θες, για να δεις ποιος πραγματικά τρέχει αυτή την επιχείρηση.'],
        live: ['LIVE DROPS', 'Όλα τα χειροποίητα gaming rigs, έτοιμα για παράδοση. Κόκκινο badge που αναβοσβήνει σημαίνει ότι έμεινε μόνο ένα τεμάχιο· όσα έρχονται ΣΥΝΤΟΜΑ είναι στο τέλος της λίστας.'],
        vote: ['VOTE', 'Η κοινότητα ψηφίζει για να ξεκλειδώσει ένα μυστηριώδες PC — μία ψήφος ανά συνδεδεμένο πράκτορα με επιβεβαιωμένο email. Μόλις μαζευτούν οι ψήφοι, ξεκλειδώνει και μπαίνει αμέσως στα Live Drops — με προτεραιότητα για τα μέλη.'],
        browsePhone: ['ΠΕΡΙΗΓΗΣΗ', 'Σύρε την κάρτα αριστερά ή δεξιά (ή πάτα τα βελάκια στη φωτογραφία) για να δεις το επόμενο PC — οι τελίτσες δείχνουν πού βρίσκεσαι. Οι καρτέλες αλλάζουν ανάμεσα στα στοιχεία και στις επιπλέον επιλογές· το ΕΠΙΘΕΩΡΗΣΗ ΣΥΣΤΗΜΑΤΟΣ δείχνει πλήρη specs, FPS και επιλογές.'],
        browseDesktop: ['ΠΕΡΙΗΓΗΣΗ', 'Με τα βελάκια στη φωτογραφία βλέπεις το επόμενο PC — οι τελίτσες δείχνουν πού βρίσκεσαι. Οι καρτέλες αλλάζουν ανάμεσα στα στοιχεία και στις επιπλέον επιλογές· το ΕΠΙΘΕΩΡΗΣΗ ΣΥΣΤΗΜΑΤΟΣ δείχνει πλήρη specs, FPS και επιλογές.'],
        cart: ['Η ΛΕΙΑ ΣΟΥ', 'Ό,τι διαλέγεις μπαίνει εδώ. Δες το σύνολο και στείλε μας την παραγγελία κατευθείαν στο WhatsApp.'],
        cli: ['ΤΟ ΤΕΡΜΑΤΙΚΟ', 'Πάτα εδώ (ή το πλήκτρο [`] σε πληκτρολόγιο) για να ανοίξεις τη γραμμή εντολών. Πάτα μια εντολή μέσα — δοκίμασε το "theme" ή το "color".'],
        profile: ['ΠΡΟΦΙΛ ΠΡΑΚΤΟΡΑ', 'Συνδέσου ή κάνε εγγραφή εδώ για να αποθηκεύσεις τη λίστα επιθυμιών σου, να παρακολουθείς το rank σου και να ξεκλειδώνεις έπαθλα.'],
        settings: ['ΡΥΘΜΙΣΕΙΣ ΣΥΣΤΗΜΑΤΟΣ', 'Ήχος, γλώσσα και χρώμα τονισμού — κι από εδώ μπορείς να δεις ξανά αυτή την ξενάγηση.'],
        info: ['ΠΛΗΡΟΦΟΡΙΕΣ', 'Εδώ βρίσκεις εγγύηση & επιστροφές, όρους και υποστήριξη. Θες να επιστρέψεις κάτι; Πάτα «Επιστροφή» και τα λέμε με email.'],
        wheel: ['ΚΑΘΗΜΕΡΙΝΗ ΠΕΡΙΣΤΡΟΦΗ', 'Γύρνα τον τροχό μία φορά τη μέρα για premium χρώμα ή κουπόνι έκπτωσης — τα κουπόνια σε περιμένουν στο προφίλ και στο καλάθι σου.'],
        lang: ['ΓΛΩΣΣΑ', 'Άλλαξε ανά πάσα στιγμή μεταξύ ελληνικών και αγγλικών. Το κουμπί δείχνει τη γλώσσα στην οποία θα ΠΑΣ — όλο το site ενημερώνεται αμέσως.'],
        reviews: ['ΚΩΔΙΚΟΙ ΑΠΟΣΤΟΛΗΣ', 'Βρήκες κωδικό στο κουτί του PC σου; Βάλ\' τον εδώ για να γράψεις κριτική — ή για να ξεκινήσεις επιστροφή αν κάτι δεν πάει καλά.']
    }
};

function buildSteps(lang) {
    const c = COPY[lang];
    const phone = isPhone();
    const bar = hasBottomBar();
    const step = (element, key, side, align = 'center', popoverClass = '') => ({
        ...(element ? { element } : {}),
        popover: { title: c[key][0], description: c[key][1], side, align, ...(popoverClass ? { popoverClass } : {}) }
    });

    const tabs = [
        step('#tab-live', 'live', 'bottom', 'start'),
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
        step('.side-btn-info', 'info', sideSide),
        step('[data-i18n-title="sideWheel"]', 'wheel', sideSide),
        step('#lang-toggle-btn', 'lang', sideSide),
        // .add-review-btn (desktop right sidebar) and .mobile-reviews-btn swap at 1024px, not 768px
        step(bar ? '.mobile-reviews-btn' : '.add-review-btn', 'reviews', bar ? 'top' : 'left')
    ];

    // The phoenix opens the tour (it greets you) and closes it on its own button — the help button
    // (css/components/mascot.css), at the end of the bottom bar / foot of the desktop rail.
    return [
        step(null, 'welcome', 'over', 'center', 'tour-mascot'),
        ...header,
        ...sidebar,
        step('.mascot-btn', 'mascot', sideSide, bar ? 'end' : 'center', 'tour-mascot tour-mascot-sm')
    ];
}

// The phoenix stands on top of its steps' popovers. driver.js reuses one popover element for every
// step, so the picture is taken out again on the others.
function mascotOnPopover(popover) {
    const wrap = popover && popover.wrapper;
    if (!wrap) return;
    wrap.querySelectorAll('.tour-mascot-img').forEach(n => n.remove());
    if (!wrap.classList.contains('tour-mascot')) return;
    const img = document.createElement('img');
    img.className = 'tour-mascot-img';
    img.src = 'assets/mascot/phoenix-full.png';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    wrap.prepend(img);
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
    // Picking Ελληνικά used to give a Greek tour over an English site (the tour said «ΕΠΙΘΕΩΡΗΣΗ
    // ΣΥΣΤΗΜΑΤΟΣ» while the button on screen read INSPECT SYSTEM) — the choice now sets the site too.
    if (window.setLanguage) window.setLanguage(lang === 'el' ? 'el' : 'en');

    const driver = window.driver.js.driver;
    if (window.preloadMascot) window.preloadMascot(); // the phoenix greets on the first step
    const isEl = lang === 'el';

    const tour = driver({
        showProgress: true,
        allowClose: true,
        doneBtnText: isEl ? 'ΤΕΛΟΣ' : 'FINISH',
        nextBtnText: isEl ? 'ΕΠΟΜΕΝΟ >' : 'NEXT >',
        prevBtnText: isEl ? '< ΠΙΣΩ' : '< PREV',
        onPopoverRendered: mascotOnPopover,
        onDestroyed: () => {
            if (window.showToast) window.showToast(isEl ? 'Η ΞΕΝΑΓΗΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ' : 'ONBOARDING COMPLETE', 'achievement');
        },
        steps: buildSteps(isEl ? 'el' : 'en')
    });

    setTimeout(() => tour.drive(), 300);
}

// Settings → "Replay the tour". Once codex_tutorial_done is set the first-visit modal never appears
// again, so without this there was no way back to the tour.
export function replayTour() {
    if (window.openModal) window.openModal('tutorial-lang-modal');
}

export function skipTutorial() {
    if (window.closeModal) window.closeModal('tutorial-lang-modal');
    localStorage.setItem('codex_tutorial_done', 'true');
}

window.startTutorialTour = startTutorialTour;
window.replayTour = replayTour;
window.skipTutorial = skipTutorial;
