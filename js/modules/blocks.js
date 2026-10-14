// js/modules/blocks.js
// The block architecture the PC card (and the INSPECT card) is "built" from: clusters of isometric
// cubes that grow out of the card's corners and edges, and lit slits in its sides in the visitor's
// accent colour. One layer, `.bk`, dropped inside a card — it sits on the card's own box, so it is
// the same object, not decoration inside the photo. Styled in css/components/blocks.css.
//
// Cheap on purpose (the swipe clones the card): no filters, no blur, nothing animated here. A cube is
// defined once, in a hidden sprite, and each cluster only holds a handful of <use> references; the
// finished layer is a cached string, so building a card costs one string concatenation.

// One cube, drawn in a 100 x 112 box: top face, left face, right face (three shades, see the CSS).
// A seam is a lit slit down the middle of one side face, with a wider faint stroke behind it for glow.
const FACES = '<polygon class="bk-top" points="50,0 100,25 50,50 0,25"/>'
    + '<polygon class="bk-left" points="0,25 50,50 50,112 0,87"/>'
    + '<polygon class="bk-right" points="50,50 100,25 100,87 50,112"/>';
const seam = (x) => `<line class="bk-glow" x1="${x}" y1="50" x2="${x}" y2="92"/><line class="bk-seam" x1="${x}" y1="50" x2="${x}" y2="92"/>`;

const SPRITE = '<svg id="bk-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
    + `<symbol id="bk-c" viewBox="0 0 100 112">${FACES}</symbol>`
    + `<symbol id="bk-cl" viewBox="0 0 100 112">${FACES}${seam(25)}</symbol>`
    + `<symbol id="bk-cr" viewBox="0 0 100 112">${FACES}${seam(75)}</symbol>`
    + '</defs></svg>';

// [centre x, top y, width, seam] in a 100 x 100 box. The card's corner sits at (20, 20) for the top
// cluster and (20, 80) for the bottom one; the right-hand clusters are these mirrored. A cube reaches
// at most ~15px in over the card, so it never covers the photo window or the text.
const TOP = [
    [21, 42, 28, 'R'],   // block hugging the left edge
    [34, 2, 24, 'L'],    // block on the corner
    [8, 5, 12, null],    // broken off, floating
    [60, 2, 10, null],
    [11, 80, 16, 'L'],
    [4, 66, 9, null]
];
const BOTTOM = [
    [21, 62, 28, 'L'],
    [42, 80, 18, 'R'],
    [8, 36, 12, null],
    [12, 14, 9, null],
    [60, 86, 9, null]
];

const cluster = (cubes, pos) => {
    const uses = [...cubes].sort((a, b) => a[1] - b[1]).map(([x, y, w, s]) =>
        `<use href="#bk-c${s ? s.toLowerCase() : ''}" x="${x - w / 2}" y="${y}" width="${w}" height="${(w * 1.12).toFixed(1)}"/>`).join('');
    return `<svg class="bk-cl bk-${pos}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${uses}</svg>`;
};

let layer = null;

export function blocksHTML() {
    if (!document.getElementById('bk-sprite')) document.body.insertAdjacentHTML('afterbegin', SPRITE);
    if (!layer) {
        layer = '<div class="bk" aria-hidden="true">'
            + cluster(TOP, 'tl') + cluster(TOP, 'tr') + cluster(BOTTOM, 'bl') + cluster(BOTTOM, 'br')
            + '<i class="bk-slit bk-sl1"></i><i class="bk-slit bk-sl2"></i><i class="bk-slit bk-sr1"></i><i class="bk-slit bk-sr2"></i>'
            + '</div>';
    }
    return layer;
}
