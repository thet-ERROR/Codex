// js/modules/stagefit.js
//
// The site is a deliberately fixed-viewport layout — css/base/variables.css sets
// `body { height: 100vh; overflow: hidden }` and .stage is `position: fixed; inset: 0`, flex-
// centring its content. That works when the viewport is tall enough, which in practice meant
// fullscreen: browser chrome (tabs + address bar + bookmarks) eats 100-150px, and on a laptop at
// its default OS display scale (125% is the Windows default on most 14"/15" panels) the effective
// CSS viewport is already only ~720-864px tall before the browser takes its share. The card then
// overflows and, with no scroll by design, there is no way to reach what didn't fit.
//
// The first attempt at this shrank individual properties per breakpoint (image height, padding,
// font sizes) which changed the card's PROPORTIONS — it read as "squashed to make the buttons
// fit" rather than smaller. This scales uniformly instead: one transform on .stage, so every
// dimension shrinks together and the card looks identical, just further away.
//
// Measured rather than guessed: a fixed per-breakpoint scale factor can't know how much browser
// chrome is present, what the OS scale is, or how long this particular build's lore text runs.
// This reads the real numbers and applies exactly the scale needed — and never more than 1, so a
// viewport that already fits (fullscreen, desktop monitors) is left completely untouched.

// If even this much shrinking isn't enough the content will still overflow, but staying legible
// beats scaling into illegibility — at that point the viewport is smaller than anything this
// layout is meant for and the width-based tiers in tablet.css/mobile.css take over anyway.
const MIN_SCALE = 0.6;

// Breathing room below the content so it never sits flush against the ticker.
const BOTTOM_GAP = 10;

export function fitStage() {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    // Cleared first, before any early return, so crossing a breakpoint on resize drops a stale
    // transform instead of leaving it applied. Also means every bail-out path below is a no-op.
    stage.style.transform = 'none';

    // Only the fixed, no-scroll desktop layout needs this. Below 1024px tablet.css switches .stage
    // to `position: relative` and gives body `overflow-y: auto` — the page scrolls there, so there
    // is nothing to fit, and mobile.css already applies its own scale to #carousel-wrapper which
    // this would compound with. Reading the computed position tests for that layout directly
    // rather than duplicating the breakpoint's magic number here.
    if (getComputedStyle(stage).position !== 'fixed') return;

    // offsetParent is null for display:none elements, which is how the inactive tab views (and the
    // BACK TO PACKS button) are hidden — .hidden sets `display: none !important`.
    const visible = Array.from(stage.children).filter(el => el.offsetParent !== null);
    if (!visible.length) return;

    let top = Infinity;
    let bottom = -Infinity;
    for (const el of visible) {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0) continue;
        top = Math.min(top, rect.top);
        bottom = Math.max(bottom, rect.bottom);
    }
    const contentHeight = bottom - top;
    if (!Number.isFinite(contentHeight) || contentHeight <= 0) return;

    // Read the chrome heights off the DOM instead of hardcoding them, so this keeps working if the
    // header or ticker is ever resized (including by the width-based responsive tiers).
    const header = document.querySelector('header');
    const ticker = document.querySelector('.delivery-ticker');
    const headerH = header ? header.offsetHeight : 0;
    const bottomH = (ticker ? ticker.offsetHeight : 0) + BOTTOM_GAP;

    const available = window.innerHeight - headerH - bottomH;
    if (available <= 0) return;

    // Already fits: leave transform at 'none' so this is a no-op everywhere it isn't needed.
    if (contentHeight <= available) return;

    const scale = Math.max(MIN_SCALE, available / contentHeight);

    // .stage spans the whole viewport and centres content on the viewport's midpoint, but the
    // usable band sits between the header and the ticker — without correcting for that, the top of
    // the content keeps hiding behind the header, which is opaque at its top edge.
    //
    // Derived from the measured centre rather than assuming it equals the viewport centre: content
    // that overflows a `justify-content: center` flex container isn't guaranteed to stay perfectly
    // symmetric about it. Transforms apply right-to-left, so scale() runs about the origin first,
    // then translateY() — a point at `contentCentre` lands at
    // `origin + scale * (contentCentre - origin)`, and this solves for the translate that puts it
    // on the band's centre. Reduces to (headerH - bottomH) / 2 in the symmetric case.
    const origin = window.innerHeight / 2;
    const contentCentre = (top + bottom) / 2;
    const bandCentre = headerH + available / 2;
    const shift = bandCentre - origin - scale * (contentCentre - origin);

    stage.style.transformOrigin = 'center center';
    stage.style.transform = `translateY(${shift}px) scale(${scale})`;
}

let scheduled = false;
function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
        scheduled = false;
        fitStage();
    });
}

export function initStageFit() {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    window.addEventListener('resize', schedule);

    // Catches a card re-render (innerHTML replaced -> childList), a tab switch (.hidden toggled ->
    // class attribute) and a language switch (re-renders the card). attributeFilter is what keeps
    // this from looping on its own output: fitStage() writes `style`, which is not observed.
    new MutationObserver(schedule).observe(stage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    fitStage();
}

window.fitStage = fitStage;
