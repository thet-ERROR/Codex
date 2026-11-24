// game/hero.js — the hero and the companion drone (RAM RUSH, step 3).
//
// The art is one sheet (assets/sprites.webp) with a map of frames (assets/sprites.json); each frame has its
// rectangle and an anchor (bottom-centre for the hero, centre for the drone), so frames of different sizes
// still stand on the same spot. The run is two frames plus a small bob drawn in code; the drone is a
// separate piece that eases after the hero instead of being glued to him.

export const GROUND = 460;            // y of the hero's feet (from parallax-preview.html)
const HERO_X = 230;                   // where the hero runs, in the game's 960-wide coordinates
const HERO_SCALE = 0.66;              // the sheet is drawn at 200px for run1; in the world he is ~130px
const DRONE_SCALE = 0.62;
const STEP = 0.12;                    // seconds per run frame
const BOB = 4;                        // px the body lifts mid-stride
const DRONE_OFFSET = { x: -78, y: -150 };   // where the drone wants to be, from the hero's feet
const DRONE_EASE = 5;                 // how fast it catches up (per second)

export function createHero(sheet, frames) {
    const h = {
        x: HERO_X, y: GROUND, t: 0, frame: 'run0',
        drone: { x: HERO_X + DRONE_OFFSET.x, y: GROUND + DRONE_OFFSET.y, t: 0 }
    };

    h.update = (dt) => {
        h.t += dt;
        h.frame = Math.floor(h.t / STEP) % 2 ? 'run1' : 'run0';
        // the bob: feet on the road at each footfall, lifted mid-stride (never sunk into the road)
        h.bob = Math.abs(Math.sin((h.t / STEP) * Math.PI)) * BOB;

        const d = h.drone;
        d.t += dt;
        const k = 1 - Math.exp(-DRONE_EASE * dt);       // frame-rate independent easing
        const tx = h.x + DRONE_OFFSET.x;
        const ty = h.y + DRONE_OFFSET.y + Math.sin(d.t * 2.4) * 6;   // a slow hover
        d.x += (tx - d.x) * k;
        d.y += (ty - d.y) * k;
    };

    function drawFrame(ctx, name, x, y, scale) {
        const f = frames[name];
        ctx.drawImage(sheet, f.x, f.y, f.w, f.h, x - f.ax * scale, y - f.ay * scale, f.w * scale, f.h * scale);
    }

    h.draw = (ctx) => {
        // a soft shadow keeps him on the road
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + 2, 34, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawFrame(ctx, h.frame, h.x, h.y - h.bob, HERO_SCALE);
        drawFrame(ctx, 'drone', h.drone.x, h.drone.y, DRONE_SCALE);
    };

    return h;
}
