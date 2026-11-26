// game/platforms.js — RAM RUSH's platforms in the air (plan §6b).
//
// One-way: he lands on one from above (his feet were over its top the frame before) and passes up through it
// from below. They ride the road. Each is a left end, some middles and a right end (its length varies), at a
// low or a high height (config.js PLATFORMS); some are breakable: stepped on, they crack, and a moment later
// fall (and he with it). ↓ on one: he drops through. Never over an obstacle. The art is in
// assets/obstacles.webp; the engines' glow and the shadow on the road are drawn in code.
//
// The hero asks two things (hero.js): land(x, fromY, toY) — the top he lands on as his feet go from fromY to
// toY, or null; and holds(x, y) — whether one still holds him up there.

import { PLATFORMS as P, OBSTACLE_SPAWNS, PX_PER_M, difficulty } from './config.js';
import { GROUND } from './hero.js';

const W = 960;
const ENTER = 40;
const EDGE = 12;            // px of each end that is rounded off: no footing there
const FEET = 14;            // half his footing: he stands while this much of him is over it

export function createPlatforms(sheet, frames, { rng = Math.random, reducedMotion = false } = {}) {
    const pool = Array.from({ length: P.pool }, () => ({ on: false, x: 0, top: 0, w: 0, n: 0, breakable: false, stepped: -1, vy: 0, t: 0 }));
    const p = { nextAtM: P.firstM, natural: true, dropT: 0 };
    const L = frames.platform_left, M = frames.platform_middle, R = frames.platform_right, WHOLE = frames.platform;
    const SURFACE = 19;     // px from the breakable one's picture top down to its top (its sparks go above)

    // n pieces (≥ 3), or a breakable one (one picture); top: px over the road
    p.spawn = (x = W + ENTER, height = P.heights[0], n = 3, breakable = false) => {
        const s = pool.find(q => !q.on);
        if (!s) return false;
        Object.assign(s, { on: true, x, top: GROUND - height, n: breakable ? 0 : n, breakable, stepped: -1, vy: 0, t: 0,
            w: breakable ? WHOLE.w : L.w + (n - 2) * M.w + R.w });
        return true;
    };
    const right = () => { let r = -Infinity; for (const s of pool) if (s.on) r = Math.max(r, s.x + s.w); return r; };
    const over = (s, x) => x + FEET > s.x + EDGE && x - FEET < s.x + s.w - EDGE;
    const solid = (s) => s.on && s.vy === 0;               // a falling one holds nothing

    // His feet going from fromY to toY (falling) at x: the top he lands on, or null. One stepped on: noted.
    p.land = (x, fromY, toY) => {
        if (p.dropT > 0) return null;
        let best = null;
        for (const s of pool) {
            if (!solid(s) || !over(s, x) || fromY > s.top + 0.5 || toY < s.top) continue;
            if (!best || s.top < best.top) best = s;
        }
        if (!best) return null;
        if (best.breakable && best.stepped < 0) best.stepped = 0;
        return best.top;
    };
    // whether one still holds him with his feet at y
    p.holds = (x, y) => p.dropT <= 0 && pool.some(s => solid(s) && Math.abs(s.top - y) < 1 && over(s, x));
    // ↓ on one: he drops through for a moment
    p.drop = () => { p.dropT = P.drop; };

    // dt: s; scroll: px the road moved; distM: metres run; obstacles: to keep clear of
    p.update = (dt, scroll, distM, obstacles) => {
        p.dropT = Math.max(0, p.dropT - dt);
        if (p.natural && distM >= p.nextAtM && right() < W + ENTER - 200) {
            const clear = !obstacles || obstacles.list().every(o => o.x + o.w < W - 60);
            if (clear) {
                const n = P.pieces[0] + Math.floor(rng() * (P.pieces[1] - P.pieces[0] + 1));
                const h = P.heights[Math.floor(rng() * P.heights.length)];
                if (p.spawn(W + ENTER, h, n, rng() < P.breakable.chance)) {
                    p.nextAtM = distM + (P.gapM[0] + rng() * (P.gapM[1] - P.gapM[0])) * difficulty(distM).gapScale;
                    // an obstacle keeps off from under it
                    if (obstacles) obstacles.nextAtM = Math.max(obstacles.nextAtM, distM + (right() - W + OBSTACLE_SPAWNS.minGap) / PX_PER_M);
                }
            }
        }
        for (const s of pool) {
            if (!s.on) continue;
            s.t += dt; s.x -= scroll;
            if (s.stepped >= 0) {
                s.stepped += dt;
                if (s.stepped >= P.breakable.crack && s.vy === 0) s.vy = 1;    // it gives way
            }
            if (s.vy > 0) { s.vy += P.breakable.fall * dt; s.top += s.vy * dt; }
            if (s.x + s.w < -40 || s.top > GROUND + 200) s.on = false;
        }
    };

    function piece(ctx, f, x, y) { ctx.drawImage(sheet, f.x, f.y, f.w, f.h, x, y, f.w, f.h); }
    p.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            // its shadow on the road: fainter the higher it is
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${0.28 * (1 - (GROUND - s.top) / 260)})`;
            ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, GROUND + 3, s.w * 0.42, 6, 0, 0, Math.PI * 2); ctx.fill();
            // its engines: a soft cyan glow, pulsing (steady with reduced motion)
            ctx.globalCompositeOperation = 'lighter';
            const k = reducedMotion ? 0.8 : 0.65 + 0.35 * Math.sin(s.t * 7);
            ctx.fillStyle = `rgba(34, 211, 238, ${0.28 * k})`;
            // (under its two end thrusters; the breakable one's sit lower in its picture)
            const ty = s.breakable ? s.top + 50 : s.top + 36;
            for (const tx of [s.x + 55, s.x + s.w - 58]) {
                ctx.beginPath(); ctx.ellipse(tx, ty, 9, 4 + 3 * k, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            if (s.breakable) {
                const f = s.vy > 0 ? frames.platform_broken : s.stepped >= 0 ? frames.platform_cracked : WHOLE;
                piece(ctx, f, s.x, s.top - SURFACE);
            } else {
                piece(ctx, L, s.x, s.top);
                for (let i = 0; i < s.n - 2; i++) piece(ctx, M, s.x + L.w + i * M.w, s.top);
                piece(ctx, R, s.x + L.w + (s.n - 2) * M.w, s.top);
            }
        }
    };

    p.list = () => pool.filter(s => s.on).map(s => ({ x: s.x, top: s.top, w: s.w, n: s.n, breakable: s.breakable, stepped: s.stepped, falling: s.vy > 0 }));
    return p;
}
