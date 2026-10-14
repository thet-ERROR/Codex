// js/modules/blocks.js
// The "heatsink" architecture of the cards: a layer (`.bk`) dropped inside the PC card and around the
// INSPECT card. Heatsink fins on both sides with a dashed lit spine, heat pipes along the top and
// bottom edges, and a bracket with a screw and a lit slit in each corner — so the card reads as one
// machined object and the photo as a window in it. Styled in css/components/blocks.css.
//
// Cheap on purpose (the swipe clones the card): ~14 empty elements, no filters, no blur, nothing
// animated, and the finished layer is a cached string.
let layer = null;

export function blocksHTML() {
    if (!layer) {
        layer = '<div class="bk" aria-hidden="true">'
            + '<i class="bk-fins bk-fl"></i><i class="bk-fins bk-fr"></i>'
            + '<i class="bk-spine bk-sl"></i><i class="bk-spine bk-sr"></i>'
            + '<i class="bk-pipe bk-pt"></i><i class="bk-pipe bk-pb"></i>'
            + '<i class="bk-corner bk-ctl"></i><i class="bk-corner bk-ctr"></i><i class="bk-corner bk-cbl"></i><i class="bk-corner bk-cbr"></i>'
            + '<i class="bk-screw bk-s1"></i><i class="bk-screw bk-s2"></i><i class="bk-screw bk-s3"></i><i class="bk-screw bk-s4"></i>'
            + '</div>';
    }
    return layer;
}
