// game/hero.js — the hero and the companion drone (RAM RUSH, steps 3–4).
//
// The art is one sheet (assets/sprites.webp) with a map of frames (assets/sprites.json); each frame has its
// rectangle and an anchor (bottom-centre for the hero, centre for the drone), so frames of different sizes
// still stand on the same spot. The run is two frames plus a small bob drawn in code; the drone is a
// separate piece that eases after the hero instead of being glued to him.
//
// Step 4, the moves (input.js hands them over each frame):
//   jump        — a second press in the air is the double jump, with the boost frame (flames)
//               — letting go early cuts the rise, so a tap is a hop and a hold is a full jump
//               — pressed a moment before landing, it still counts (jump buffer)
//   down        — on the road a slide (low, under head-height things); in the air a fast fall
//   left/right  — held keys move him along the road; a sideways swipe steps him over
//
// Plan §6b, the platforms (platforms.js, h.floors): he lands on one from above and runs on it; ↓ on one drops
// him through; when it goes from under him (its end, or a breakable one falling) he falls, the double jump
// still his.
//
// Step 6, his life: HERO.maxHp hits (config.js); after one he is safe for HERO.invuln seconds and blinks
// (with reduced motion he is only dimmed, no blinking).

import { HERO } from './config.js';

export const GROUND = 460;            // y of the hero's feet (from parallax-preview.html)
const HOME_X = 230;                   // where the hero runs, in the game's 960-wide coordinates
const MIN_X = 110, MAX_X = 620;       // how far back and forward he may go
const HERO_SCALE = 0.66;              // the sheet is drawn at 200px for run1; in the world he is ~130px
const DRONE_SCALE = 0.62;
const STEP = 0.12;                    // seconds per run frame
const BOB = 4;                        // px the body lifts mid-stride
const DRONE_OFFSET = { x: -78, y: -150 };   // where the drone wants to be, from the hero's feet
const DRONE_EASE = 5;                 // how fast it catches up (per second)

// The feel. Gravity and launch speeds in px/s: a full jump peaks ~185px up (well over his height), the
// double jump adds ~140px more. Tuned to land in about 0.75s, quick enough for a runner.
const GRAVITY = 2600;
const JUMP_V = 980;
const DOUBLE_V = 860;
const CUT = 0.45;                     // let go while rising: the speed up is cut to this
const FAST_FALL_V = 700;              // down in the air: at least this fast, and heavier
const FAST_FALL_G = 2.2;
const BUFFER = 0.12;                  // a jump pressed this long before landing still happens
const SLIDE_T = 0.55;                 // a slide lasts this long
const LAND_T = 0.09;                  // the landing crouch
const BOOST_T = 0.35;                 // the boost frame after a double jump
const MOVE_V = 320;                   // held left/right
const NUDGE = 150;                    // one sideways swipe
const FOLLOW = 14;                    // how fast he reaches where the controls put him

export function createHero(sheet, frames, { reducedMotion = false } = {}) {
    const h = {
        hp: HERO.maxHp, invuln: 0,
        x: HOME_X, targetX: HOME_X, y: GROUND, vy: 0, t: 0, bob: 0, frame: 'run0',
        onGround: true, jumps: 0, buffer: 0, slideT: 0, landT: 0, boostT: 0, fastFall: false, ceiling: false,
        drone: { x: HOME_X + DRONE_OFFSET.x, y: GROUND + DRONE_OFFSET.y, t: 0 }
    };

    function jump() {
        if (h.onGround) {
            h.vy = -JUMP_V; h.onGround = false; h.jumps = 1; h.slideT = 0; h.landT = 0;
        } else if (h.jumps < 2) {
            h.vy = -DOUBLE_V; h.jumps = 2; h.boostT = BOOST_T; h.fastFall = false;
        } else return false;
        h.holding = true;      // its release (and only its) may cut this rise short
        return true;
    }

    // A hit: false while he is still safe from the last one (or already down)
    h.hit = (damage) => {
        if (h.invuln > 0 || h.hp <= 0) return false;
        h.hp = Math.max(0, h.hp - damage);
        h.invuln = HERO.invuln;
        return true;
    };

    h.update = (dt, input) => {
        const i = input || {};
        h.t += dt;
        h.invuln = Math.max(0, h.invuln - dt);

        // along the road: held keys move the target, a swipe steps it; he eases to it
        const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
        h.targetX += dir * MOVE_V * dt + (i.nudge || 0) * NUDGE;
        h.targetX = Math.min(MAX_X, Math.max(MIN_X, h.targetX));
        h.x += (h.targetX - h.x) * (1 - Math.exp(-FOLLOW * dt));

        // the early release, the jump (buffered), a quick tap's release, down. A press that launched nothing
        // (a third one in the air) has no rise to cut.
        const release = () => { if (h.holding) { h.holding = false; if (h.vy < 0) h.vy *= CUT; } };
        if (i.jumpUp) release();
        if (i.jump) h.buffer = BUFFER;
        if (h.buffer > 0 && jump()) h.buffer = 0;
        h.buffer = Math.max(0, h.buffer - dt);
        if (i.jumpUpAfter) release();
        const fl = h.floors;
        const up = h.onGround && h.y < GROUND - 0.5;       // on a platform, not the road
        const fall = () => { h.onGround = false; h.vy = 0; h.jumps = Math.max(h.jumps, 1); h.slideT = 0; };
        if (i.down) {
            if (up) { fl.drop(); fall(); }                  // through the platform, down
            else if (h.onGround) { if (h.slideT <= 0) h.slideT = SLIDE_T; }
            else { h.fastFall = true; h.vy = Math.max(h.vy, FAST_FALL_V); }
        }
        // a platform gone from under him (its end passed, or it gave way): he falls
        if (h.onGround && h.y < GROUND - 0.5 && !(fl && fl.holds(h.x, h.y))) fall();

        // in the air
        if (!h.onGround) {
            h.vy += GRAVITY * (h.fastFall ? FAST_FALL_G : 1) * dt;
            const from = h.y;
            h.y += h.vy * dt;
            const top = h.vy > 0 && fl ? fl.land(h.x, from, h.y) : null;
            if (top !== null || h.y >= GROUND) {
                h.y = top !== null ? top : GROUND; h.vy = 0; h.onGround = true; h.jumps = 0; h.fastFall = false;
                h.landT = LAND_T;
                if (h.buffer > 0 && jump()) h.buffer = 0;   // pressed just before touching down
            }
        }
        // under a slide obstacle (h.ceiling, from obstacles.js) he cannot stand up: the slide goes on until he is out
        const sliding = h.slideT > 0;
        h.slideT = Math.max(0, h.slideT - dt);
        if (sliding && h.slideT <= 0 && h.onGround && h.ceiling) h.slideT = 0.05;
        h.landT = Math.max(0, h.landT - dt);
        h.boostT = Math.max(0, h.boostT - dt);

        // the frame
        h.bob = 0;
        if (!h.onGround) h.frame = h.boostT > 0 ? 'boost' : 'jump';
        else if (h.slideT > 0) h.frame = 'slide';
        else if (h.landT > 0) h.frame = 'land';
        else {
            h.frame = Math.floor(h.t / STEP) % 2 ? 'run1' : 'run0';
            // the bob: feet on the road at each footfall, lifted mid-stride (never sunk into the road)
            h.bob = Math.abs(Math.sin((h.t / STEP) * Math.PI)) * BOB;
        }

        const d = h.drone;
        d.t += dt;
        const k = 1 - Math.exp(-DRONE_EASE * dt);       // frame-rate independent easing
        const tx = h.x + DRONE_OFFSET.x;
        const ty = h.y + DRONE_OFFSET.y + Math.sin(d.t * 2.4) * 6;   // a slow hover
        d.x += (tx - d.x) * k;
        d.y += (ty - d.y) * k;
    };

    // What can be hit (step 6): his body standing, or low and long while sliding
    h.box = () => h.slideT > 0 && h.onGround
        ? { x: h.x - 55, y: h.y - 62, w: 110, h: 62 }
        : { x: h.x - 26, y: h.y - 118, w: 52, h: 118 };

    // Where a thrown RAM leaves from: his front hand, lower while sliding
    h.hand = () => h.slideT > 0 && h.onGround ? { x: h.x + 48, y: h.y - 40 } : { x: h.x + 34, y: h.y - 80 };

    function drawFrame(ctx, name, x, y, scale) {
        const f = frames[name];
        ctx.drawImage(sheet, f.x, f.y, f.w, f.h, x - f.ax * scale, y - f.ay * scale, f.w * scale, f.h * scale);
    }

    h.draw = (ctx) => {
        // a soft shadow keeps him on the road; it shrinks and fades as he rises
        // (standing on a platform: under his feet there)
        const floor = h.onGround ? h.y : GROUND;
        const up = Math.min(1, (floor - h.y) / 260);
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * (1 - up * 0.6)})`;
        ctx.beginPath();
        ctx.ellipse(h.x, floor + 2, 34 * (1 - up * 0.5), 7 * (1 - up * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        if (h.invuln > 0) ctx.globalAlpha = reducedMotion ? 0.55 : (Math.floor(h.invuln * 12) % 2 ? 0.3 : 1);
        drawFrame(ctx, h.frame, h.x, h.y - h.bob, HERO_SCALE);
        ctx.restore();
        drawFrame(ctx, 'drone', h.drone.x, h.drone.y, DRONE_SCALE);
    };

    return h;
}
