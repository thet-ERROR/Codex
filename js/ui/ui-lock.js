// js/ui/ui-lock.js

const checkUILock = () => {
    const cli = document.getElementById('cli-overlay');
    const rightSidebar = document.querySelector('.right-sidebar');
    const gallery = document.getElementById('gallery-overlay');
    const anyModalOpen = document.querySelector('.modal-overlay.active');
    
    const isTerminalOpen = cli && (cli.style.display === 'flex' || cli.style.display === 'block' || cli.classList.contains('active'));
    const isReviewsOpen = rightSidebar && rightSidebar.classList.contains('mobile-active');
    const isGalleryOpen = gallery && gallery.style.display === 'flex';
    
    const shouldLock = isTerminalOpen || isReviewsOpen || isGalleryOpen || anyModalOpen;
    const isLocked = document.body.classList.contains('ui-locked');

    // Αν δεν αλλάζει τίποτα, μην κάνεις τίποτα — αποφεύγουμε άσκοπο mutation
    if (shouldLock === isLocked) return;

    // Σταματάμε προσωρινά την παρακολούθηση πριν αλλάξουμε το body
    observer.disconnect();

    if (shouldLock) {
        document.body.classList.add('ui-locked');
        const socialMenu = document.getElementById('social-menu');
        if (socialMenu) socialMenu.classList.remove('active'); 
    } else {
        document.body.classList.remove('ui-locked');
    }

    // Ξανασυνδέουμε τον observer
    observer.observe(document.body, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['class', 'style'] 
    });
};

const observer = new MutationObserver(() => {
    checkUILock();
});

document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['class', 'style'] 
    });

    document.querySelectorAll('.yg-close-btn, .close-modal, .modal-close, .yg-close-back').forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.remove('ui-locked');
            const socialMenu = document.getElementById('social-menu');
            if (socialMenu) socialMenu.classList.remove('active');
            const targetLockBtn = document.querySelector('.yg-target-lock');
            if(targetLockBtn) targetLockBtn.classList.remove('locked');
        });
    });
});