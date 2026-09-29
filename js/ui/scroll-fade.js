// js/ui/scroll-fade.js
//
// On phones two strips scroll sideways: the tab bar (VOTE sits off-screen to the right) and the
// bottom bar (share and reviews do). Nothing said they could be swiped — the same reason the cart
// used to go unfound. This fades whichever edge still has more to show, via .fade-left /
// .fade-right (styled in css/responsive/mobile.css), and clears it once you reach that end.
// Desktop layouts don't overflow, so both classes simply never get added there.

const STRIPS = ['.nav-bar', '.left-sidebar .side-group'];

function update(el) {
    const max = el.scrollWidth - el.clientWidth;
    // 2px of slack: sub-pixel widths otherwise leave a permanent fade on a strip that's at its end
    el.classList.toggle('fade-left', el.scrollLeft > 2);
    el.classList.toggle('fade-right', max - el.scrollLeft > 2);
}

export function initScrollFades() {
    const strips = STRIPS.map(sel => document.querySelector(sel)).filter(Boolean);
    strips.forEach(el => {
        el.addEventListener('scroll', () => update(el), { passive: true });
        update(el);
    });
    window.addEventListener('resize', () => strips.forEach(update));
    // Late-loading fonts change button widths after first paint, which changes what overflows
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => strips.forEach(update));
}
