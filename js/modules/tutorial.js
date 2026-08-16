// js/modules/tutorial.js

export function initInteractiveTutorial() {
    // Ελέγχουμε αν ο χρήστης (Agent) έχει ήδη ολοκληρώσει το tutorial στο παρελθόν
    if (!localStorage.getItem('codex_tutorial_done')) {
        
        // Το driver υπάρχει ήδη στο global scope από το CDN στο index.html
        const driver = window.driver.js.driver;
        
        const tour = driver({
            showProgress: true,
            allowClose: true,
            doneBtnText: 'FINISH',
            nextBtnText: 'NEXT >',
            prevBtnText: '< PREV',
            onDestroyed: () => {
                // Αποθηκεύουμε την ολοκλήρωση ώστε να μην ξαναβγεί
                localStorage.setItem('codex_tutorial_done', 'true');
                if (window.showToast) {
                    window.showToast("ONBOARDING COMPLETE", "achievement");
                }
            },
            steps: [
                { popover: { title: 'WELCOME AGENT', description: 'Initiating System Override. Let us give you a quick tour of the CODEX Terminal.', side: "over", align: 'center' } },
                { element: '#tab-live', popover: { title: 'LIVE DROPS', description: 'Here you will find the currently available, custom-built gaming rigs ready for deployment.', side: "bottom", align: 'start' } },
                { element: '#tab-vault', popover: { title: 'THE VAULT', description: 'Access classified systems that are either sold out or incoming. Keep an eye out for legendary drops.', side: "bottom", align: 'start' } },
                { element: '.cart-btn', popover: { title: 'YOUR LOOT', description: 'Your secured items are stored here. Check your total and proceed to secure checkout.', side: "bottom", align: 'end' } },
                { element: '.cli-btn', popover: { title: 'THE TERMINAL', description: 'Click here or press the [`] key to open the command line interface. Try typing "hack" inside it.', side: "bottom", align: 'end' } },
                { element: '.add-review-btn', popover: { title: 'MISSION CODES', description: 'Found a physical code in your PC box? Enter it here to validate your system and unlock achievements.', side: "left", align: 'center' } }
            ]
        });
        
        // Ξεκινάει το tutorial με καθυστέρηση (για να έχει ολοκληρωθεί το loading splash screen)
        setTimeout(() => { tour.drive(); }, 2000);
    }
}