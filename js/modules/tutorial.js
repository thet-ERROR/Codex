// js/modules/tutorial.js

// .add-review-btn (desktop right-sidebar) and .mobile-reviews-btn swap visibility at 1024px
// (css/responsive/tablet.css), not 768px — must match that breakpoint exactly or this step
// points at a hidden element on tablet-width / larger-phone screens.
const isMobile = () => window.innerWidth <= 1024;

const STEPS = {
    en: [
        { popover: { title: 'WELCOME AGENT', description: 'Initiating System Override. Let us give you a quick tour of the CODEX Terminal.', side: "over", align: 'center' } },
        { element: '.logo', popover: { title: 'IDENTITY CHECK', description: "Click the logo anytime to see who's really running this operation.", side: "bottom", align: 'start' } },
        { element: '#tab-live', popover: { title: 'LIVE DROPS', description: 'Here you will find the currently available, custom-built gaming rigs ready for deployment.', side: "bottom", align: 'start' } },
        { element: '#tab-vault', popover: { title: 'LAST CALL', description: 'Access classified systems that are either sold out or incoming. Keep an eye out for legendary drops.', side: "bottom", align: 'start' } },
        { element: '.cart-btn', popover: { title: 'YOUR LOOT', description: 'Your secured items are stored here. Check your total and proceed to secure checkout.', side: "bottom", align: 'end' } },
        { element: '.cli-btn', popover: { title: 'THE TERMINAL', description: 'Click here or press the [`] key to open the command line interface. Try typing "hack" inside it.', side: "bottom", align: 'end' } },
        { element: '.profile-btn', popover: { title: 'AGENT PROFILE', description: 'Sign in or register here to save your wishlist, track your rank, and unlock rewards.', side: "bottom", align: 'end' } },
        { element: '[data-i18n-title="sideSettings"]', popover: { title: 'SYSTEM PREFERENCES', description: 'Customize your accent color here.', side: "right", align: 'center' } },
        { element: '[data-i18n-title="sideWheel"]', popover: { title: 'DAILY SPIN', description: 'Spin the wheel once a day for a chance to unlock premium accent colors or a discount coupon.', side: "right", align: 'center' } },
        { element: '#lang-toggle-btn', popover: { title: 'LANGUAGE', description: 'Switch between Greek and English anytime — the whole site updates instantly.', side: "right", align: 'center' } },
        { element: isMobile() ? '.mobile-reviews-btn' : '.add-review-btn', popover: { title: 'MISSION CODES', description: 'Found a physical code in your PC box? Enter it here to validate your system and unlock achievements.', side: isMobile() ? "top" : "left", align: 'center' } }
    ],
    el: [
        { popover: { title: 'ΚΑΛΩΣΟΡΙΣΕΣ, ΠΡΑΚΤΟΡΑ', description: 'Ενεργοποιείται παράκαμψη συστήματος. Ας σου κάνουμε μια γρήγορη ξενάγηση στο CODEX Terminal.', side: "over", align: 'center' } },
        { element: '.logo', popover: { title: 'ΕΛΕΓΧΟΣ ΤΑΥΤΟΤΗΤΑΣ', description: 'Πάτα το λογότυπο όποτε θες, για να δεις ποιος πραγματικά τρέχει αυτή την επιχείρηση.', side: "bottom", align: 'start' } },
        { element: '#tab-live', popover: { title: 'LIVE DROPS', description: 'Εδώ θα βρεις τα διαθέσιμα, χειροποίητα gaming rigs, έτοιμα για παράδοση.', side: "bottom", align: 'start' } },
        { element: '#tab-vault', popover: { title: 'LAST CALL', description: 'Πρόσβαση σε απόρρητα συστήματα που είναι είτε εξαντλημένα είτε έρχονται σύντομα. Πρόσεχε για θρυλικά drops.', side: "bottom", align: 'start' } },
        { element: '.cart-btn', popover: { title: 'Η ΛΕΙΑ ΣΟΥ', description: 'Εδώ αποθηκεύονται τα προϊόντα που έχεις επιλέξει. Έλεγξε το σύνολο και προχώρα σε ασφαλή ολοκλήρωση.', side: "bottom", align: 'end' } },
        { element: '.cli-btn', popover: { title: 'ΤΟ ΤΕΡΜΑΤΙΚΟ', description: 'Πάτα εδώ ή το πλήκτρο [`] για να ανοίξεις τη γραμμή εντολών. Δοκίμασε να γράψεις "hack" μέσα.', side: "bottom", align: 'end' } },
        { element: '.profile-btn', popover: { title: 'ΠΡΟΦΙΛ ΠΡΑΚΤΟΡΑ', description: 'Συνδέσου ή κάνε εγγραφή εδώ για να αποθηκεύσεις τη λίστα επιθυμιών σου, να παρακολουθείς το rank σου και να ξεκλειδώνεις έπαθλα.', side: "bottom", align: 'end' } },
        { element: '[data-i18n-title="sideSettings"]', popover: { title: 'ΡΥΘΜΙΣΕΙΣ ΣΥΣΤΗΜΑΤΟΣ', description: 'Προσάρμοσε το χρώμα τονισμού σου εδώ.', side: "right", align: 'center' } },
        { element: '[data-i18n-title="sideWheel"]', popover: { title: 'ΚΑΘΗΜΕΡΙΝΗ ΠΕΡΙΣΤΡΟΦΗ', description: 'Γύρνα τον τροχό μία φορά τη μέρα για να ξεκλειδώσεις premium χρώματα ή κουπόνι έκπτωσης.', side: "right", align: 'center' } },
        { element: '#lang-toggle-btn', popover: { title: 'ΓΛΩΣΣΑ', description: 'Άλλαξε ανά πάσα στιγμή μεταξύ ελληνικών και αγγλικών — όλο το site ενημερώνεται αμέσως.', side: "right", align: 'center' } },
        { element: isMobile() ? '.mobile-reviews-btn' : '.add-review-btn', popover: { title: 'ΚΩΔΙΚΟΙ ΑΠΟΣΤΟΛΗΣ', description: 'Βρήκες φυσικό κωδικό στο κουτί του PC σου; Καταχώρησέ τον εδώ για να επικυρώσεις το σύστημά σου και να ξεκλειδώσεις επιτεύγματα.', side: isMobile() ? "top" : "left", align: 'center' } }
    ]
};

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
        steps: STEPS[isEl ? 'el' : 'en']
    });

    setTimeout(() => tour.drive(), 300);
}

export function skipTutorial() {
    if (window.closeModal) window.closeModal('tutorial-lang-modal');
    localStorage.setItem('codex_tutorial_done', 'true');
}

window.startTutorialTour = startTutorialTour;
window.skipTutorial = skipTutorial;
