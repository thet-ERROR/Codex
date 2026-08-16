// js/ui/ui-lock.js

// Η λογική του ελέγχου μπαίνει σε μια συνάρτηση
const checkUILock = () => {
    const cli = document.getElementById('cli-overlay');
    const rightSidebar = document.querySelector('.right-sidebar');
    const gallery = document.getElementById('gallery-overlay');
    const anyModalOpen = document.querySelector('.modal-overlay.active');
    
    const isTerminalOpen = cli && (cli.style.display === 'flex' || cli.style.display === 'block' || cli.classList.contains('active'));
    const isReviewsOpen = rightSidebar && rightSidebar.classList.contains('mobile-active');
    const isGalleryOpen = gallery && gallery.style.display === 'flex';
    
    if (isTerminalOpen || isReviewsOpen || isGalleryOpen || anyModalOpen) {
        document.body.classList.add('ui-locked');
        const socialMenu = document.getElementById('social-menu');
        if (socialMenu) socialMenu.classList.remove('active'); 
    } else {
        document.body.classList.remove('ui-locked');
    }
};

// Αντί για setInterval, δημιουργούμε έναν Observer.
// Θα τρέχει την checkUILock ΜΟΝΟ όταν υπάρχει αλλαγή στο DOM.
const observer = new MutationObserver(() => {
    checkUILock();
});

document.addEventListener('DOMContentLoaded', () => {
    // Ξεκινάμε την παρακολούθηση του body για αλλαγές σε 'class' ή 'style'
    observer.observe(document.body, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['class', 'style'] 
    });

    // Κρατάμε τον καθαρισμό σου στα κουμπιά για άμεση, εγγυημένη απόκριση στα κλικ
    document.querySelectorAll('.yg-close-btn, .close-modal, .modal-close, .yg-close-back').forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.remove('ui-locked');
            
            const socialMenu = document.getElementById('social-menu');
            if (socialMenu) socialMenu.classList.remove('active');
            
            const targetLockBtn = document.querySelector('.yg-target-lock');
            if(targetLockBtn) {
                targetLockBtn.classList.remove('locked');
            }
        });
    });
});