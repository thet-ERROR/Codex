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

// The transform last written, so an unchanged fit costs nothing (no style write, no restyle).
let applied = null;

// animate: ease into the new scale instead of jumping — used when the CONTENT changed size (a PC with
// longer lore, a tab switch), so the whole stage doesn't visibly snap mid-swipe. Never on window
// resize or the first fit, where following the window instantly is what's wanted.
export function fitStage({ animate = false } = {}) {
    const stage = document.querySelector('.stage');
    if (!stage) return;
    const next = targetTransform(stage);
    if (next === applied) return;
    stage.classList.toggle('fit-animate', animate && applied !== null);
    stage.style.transformOrigin = 'center center';
    stage.style.transform = next;
    applied = next;
}

function targetTransform(stage) {
    // Only the fixed, no-scroll desktop layout needs this. Below 1024px tablet.css switches .stage
    // to `position: relative` and gives body `overflow-y: auto` — the page scrolls there, so there
    // is nothing to fit, and mobile.css already applies its own scale to #carousel-wrapper which
    // this would compound with. Reading the computed position tests for that layout directly
    // rather than duplicating the breakpoint's magic number here. Returning 'none' also drops a
    // stale transform when the window crosses that breakpoint.
    if (getComputedStyle(stage).position !== 'fixed') return 'none';

    // offsetParent is null for display:none elements, which is how the inactive tab views (and the
    // BACK TO PACKS button) are hidden — .hidden sets `display: none !important`.
    const visible = Array.from(stage.children).filter(el => el.offsetParent !== null);
    if (!visible.length) return 'none';

    // Layout offsets, not getBoundingClientRect: offsets ignore the transform already on .stage, so
    // there's no need to clear it and re-measure (which restyled the whole stage on every fit, right
    // in the frame a swipe animation starts). .stage is fixed at inset 0, so its children's offsets
    // are viewport coordinates of the untransformed layout.
    let top = Infinity;
    let bottom = -Infinity;
    for (const el of visible) {
        if (el.offsetHeight === 0) continue;
        top = Math.min(top, el.offsetTop);
        bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
    }
    const contentHeight = bottom - top;
    if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 'none';

    // Read the chrome heights off the DOM instead of hardcoding them, so this keeps working if the
    // header or ticker is ever resized (including by the width-based responsive tiers).
    const header = document.querySelector('header');
    const ticker = document.querySelector('.delivery-ticker');
    const headerH = header ? header.offsetHeight : 0;
    const bottomH = (ticker ? ticker.offsetHeight : 0) + BOTTOM_GAP;

    const available = window.innerHeight - headerH - bottomH;
    if (available <= 0) return 'none';

    // Already fits: no transform, so this is a no-op everywhere it isn't needed.
    if (contentHeight <= available) return 'none';

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

    // Rounded so sub-pixel noise doesn't count as a change (and restart the easing) on every fit
    return `translateY(${shift.toFixed(1)}px) scale(${scale.toFixed(4)})`;
}

let scheduled = false;
let resizedAt = 0;
function onResize() {
    resizedAt = performance.now();
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

    window.addEventListener('resize', onResize);

    // Watches the SIZE of each top-level block on the stage (card carousel, packs, vote, labels)
    // rather than every DOM change inside it. A card re-render with different lore, a tab switch
    // (display:none ↔ shown) and a language switch all change a size and refit; the things that don't
    // — the swipe's flying snapshot, class flips, the position pills, the vote timer ticking once a
    // second — no longer trigger a full measure. The callback runs after layout and before paint, so
    // the new scale lands in the same frame; writing a transform on .stage can't resize its children,
    // so this can't loop. While the window itself is being resized, follow it instantly.
    if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => fitStage({ animate: performance.now() - resizedAt > 250 }));
        Array.from(stage.children).forEach(el => ro.observe(el));
    } else {
        new MutationObserver(onResize).observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    fitStage();
}

window.fitStage = fitStage;
