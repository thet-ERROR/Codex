// js/ui/ui-lock.js

// The background video plays only while it can be seen. Behind a window (95% black) or INSPECT (solid)
// it can't, yet every frame of it was still decoded and composited under the window — measured
// 2026-11-12: closing a window on a slow laptop drew 5 frames with the video running, 27 without. The
// terminal and the phone's reviews don't cover the screen, so the video keeps playing behind those.
// This is the one place that pauses and resumes it (reduced motion keeps it paused: main.js).
const bgVideo = document.querySelector('.bg-video');
let videoPausedByCover = false;
function videoBehindCover(covered) {
    if (!bgVideo) return;
    if (covered && !bgVideo.paused) { videoPausedByCover = true; bgVideo.pause(); }
    else if (!covered && videoPausedByCover) { videoPausedByCover = false; bgVideo.play().catch(() => {}); }
}

const checkUILock = () => {
    const cli = document.getElementById('cli-overlay');
    const rightSidebar = document.querySelector('.right-sidebar');
    const gallery = document.getElementById('gallery-overlay');
    const anyModalOpen = document.querySelector('.modal-overlay.active');

    const isTerminalOpen = cli && (cli.style.display === 'flex' || cli.style.display === 'block' || cli.classList.contains('active'));
    const isReviewsOpen = rightSidebar && rightSidebar.classList.contains('mobile-active');
    const isGalleryOpen = gallery && gallery.style.display === 'flex';

    videoBehindCover(!!(anyModalOpen || isGalleryOpen));

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