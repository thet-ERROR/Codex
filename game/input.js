// game/input.js — RAM RUSH's controls: the keyboard and the touch swipes, turned into a few plain actions.
//
// The hero reads them once per frame (consume()): what is held (left / right) and what happened since the
// last frame (a jump pressed or released, down pressed, a swipe sideways, a tap, pause). Keys are read by
// position (e.code), so a Greek layout plays the same; while the game is open its keys are its own and never
// reach the page behind (the PC carousel also listens to ← / →).

const KEYS = {
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyP: 'pause',
    KeyJ: 'throw', KeyX: 'throw',
    KeyE: 'parry'
};
const SWIPE = 28;          // CSS px a finger travels before it counts as a swipe
const TAP_MS = 300;        // a touch shorter than this that did not travel is a tap

// isParry(clientX, clientY): whether a touch there is on the parry button (main.js knows where it is)
export function createInput(surface, { isParry = () => false } = {}) {
    const held = { left: false, right: false };
    let ev = fresh();
    // jumpUp: a release before this frame's press (it ends the jump already under way); jumpUpAfter: a
    // release after it (a quick tap: it ends the new jump). Kept apart, a quick second press can't be cut
    // by the first one's release arriving in the same frame.
    // throw: a throw asked for; aim: where on the screen (clientX/Y) the click or tap was, or null (a key: straight)
    function fresh() { return { jump: 0, jumpUp: false, jumpUpAfter: false, down: 0, nudge: 0, throw: 0, aim: null, pause: 0, parry: 0 }; }

    function onKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const a = KEYS[e.code];
        if (!a) return;
        e.preventDefault();             // no page scroll, no button "click" on Space
        e.stopPropagation();            // the page behind never sees the game's keys
        if (a === 'left' || a === 'right') { held[a] = true; return; }
        if (e.repeat) return;
        if (a === 'jump') ev.jump++;
        else if (a === 'down') ev.down++;
        else if (a === 'pause') ev.pause++;
        else if (a === 'throw') { ev.throw++; ev.aim = null; }
        else if (a === 'parry') ev.parry++;
    }
    function onKeyUp(e) {
        const a = KEYS[e.code];
        if (!a) return;
        e.stopPropagation();
        if (a === 'left' || a === 'right') held[a] = false;
        else if (a === 'jump') { if (ev.jump) ev.jumpUpAfter = true; else ev.jumpUp = true; }   // let go early = a shorter jump
    }
    function onBlur() { held.left = held.right = false; }

    // The mouse throws at once, toward the click. Touch: a swipe fires as soon as the finger has travelled
    // far enough, not on release, so a jump feels instant. Up = jump, down = slide, sideways = a step that
    // way. A short still touch is a tap: a throw, toward where it touched.
    let touch = null;
    // The right button parries (its menu is kept off the game); a touch on the parry button parries at once
    // and is not a tap (no throw)
    function onPointerDown(e) {
        if (e.pointerType === 'mouse' && e.button === 2) { ev.parry++; return; }
        if (e.button > 0) return;
        if (e.pointerType === 'mouse') { ev.throw++; ev.aim = { x: e.clientX, y: e.clientY }; return; }
        if (isParry(e.clientX, e.clientY)) { ev.parry++; return; }
        touch = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), fired: false };
    }
    function onPointerMove(e) {
        if (!touch || touch.fired || e.pointerId !== touch.id) return;
        const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
        if (Math.hypot(dx, dy) < SWIPE) return;
        touch.fired = true;
        if (Math.abs(dy) >= Math.abs(dx)) { if (dy < 0) ev.jump++; else ev.down++; }
        else ev.nudge += dx > 0 ? 1 : -1;
    }
    function onPointerUp(e) {
        if (!touch || e.pointerId !== touch.id) return;
        onPointerMove(e);                // a quick flick may end before a move event reported it
        if (!touch.fired && performance.now() - touch.t < TAP_MS) { ev.throw++; ev.aim = { x: touch.x, y: touch.y }; }
        touch = null;
    }
    function onPointerCancel() { touch = null; }
    function onContextMenu(e) { e.preventDefault(); }

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerup', onPointerUp);
    surface.addEventListener('pointercancel', onPointerCancel);
    surface.addEventListener('contextmenu', onContextMenu);

    return {
        // What the hero needs this frame; the one-off events are handed over once and then cleared
        consume() {
            const out = { ...ev, left: held.left, right: held.right };
            ev = fresh();
            return out;
        },
        destroy() {
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            window.removeEventListener('blur', onBlur);
            surface.removeEventListener('pointerdown', onPointerDown);
            surface.removeEventListener('pointermove', onPointerMove);
            surface.removeEventListener('pointerup', onPointerUp);
            surface.removeEventListener('pointercancel', onPointerCancel);
            surface.removeEventListener('contextmenu', onContextMenu);
        }
    };
}
