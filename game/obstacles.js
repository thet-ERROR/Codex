// game/obstacles.js — RAM RUSH's obstacles on the road, and the flying cars far behind (plan §6, §6c).
//
// A barrier is jumped; a boom gate, hanging cables, a hanging sign and a laser grid are slid under. Only the
// hitbox in config.js OBSTACLES hurts: a post or a pillar stands at the far edge of the road. They ride the
// road (parallax 1) and hit once each, like an enemy (his safe time then carries him through). Under a slide
// obstacle he cannot stand up: overhead(x) tells hero.js to keep him down until he is out.
//
// The laser grid: off, its lenses blinking (the warning), then the beam on; it hurts only while on.
// Fairness: never while a boss stands; a slide one never while a laser (Spy Drone, boss) is about, and the
// enemies hold back their lasers while one is on the road (blocksLasers()); minGap px between any two.
//
// The cars: a few flying cars far behind the road (between the middle city and the rail), some coming back
// the other way; decor only. Everything is pooled: nothing is made per frame.

import { OBSTACLES, OBSTACLE_SPAWNS as SP, CLEARANCE, SPAWNS, PX_PER_M, difficulty } from './config.js';
import { GROUND } from './hero.js';

const W = 960;
const ENTER = 40;                    // px past the right edge where one comes in

export function createObstacles(sheet, frames, { rng = Math.random, reducedMotion = false } = {}) {
    const pool = Array.from({ length: SP.pool }, () => ({ on: false, id: '', def: null, x: 0, y: 0, w: 0, h: 0, k: 1, t: 0, hitHero: false }));
    const cars = Array.from({ length: SP.cars.pool }, () => ({ on: false, frame: '', x: 0, y: 0, k: 1, v: 0, back: false }));
    const hazard = { x: 0, y: 0, w: 0, h: 0 };     // one object, reused
    const o = { nextAtM: SP.firstM, carT: 1, natural: true, hits: 0 };

    // its frame's top left, so that its feet stand on the road, or (hanging) its hitbox ends CLEARANCE over it
    function place(s) {
        const f = frames[s.def.frame], hb = s.def.hit, k = s.k = s.def.scale || 1;
        s.w = f.w * k; s.h = f.h * k;
        s.y = s.def.hang ? GROUND - CLEARANCE - (hb[1] + hb[3]) * k : GROUND - s.h;
    }
    // the part that hurts, where it is now
    o.hazard = (s) => {
        const hb = s.def.hit, k = s.k;
        hazard.x = s.x + hb[0] * k; hazard.y = s.y + hb[1] * k; hazard.w = hb[2] * k; hazard.h = hb[3] * k;
        return hazard;
    };
    // the laser grid's moment: 'off', 'warn' (blinking) or 'on'
    const phase = (s) => {
        const c = s.def.cycle;
        if (!c) return 'on';
        const t = s.t % (c.off + c.on);
        return t < c.off - c.warn ? 'off' : t < c.off ? 'warn' : 'on';
    };
    o.phase = phase;

    o.spawn = (id, x = W + ENTER) => {
        const def = OBSTACLES[id];
        const s = pool.find(q => !q.on);
        if (!def || !s) return false;
        Object.assign(s, { on: true, id, def, x, t: 0, hitHero: false });
        place(s);
        return true;
    };
    const right = () => { let r = -Infinity; for (const s of pool) if (s.on) r = Math.max(r, s.x + s.w); return r; };
    const gap = (distM) => (SP.gapM[0] + rng() * (SP.gapM[1] - SP.gapM[0])) * difficulty(distM).gapScale;

    // Is a slide obstacle over x (his middle)? Then he stays down. The laser grid counts on or off (it may light).
    o.overhead = (x) => {
        for (const s of pool) {
            if (!s.on || s.def.role !== 'slide') continue;
            const b = o.hazard(s);
            if (x + 30 > b.x && x - 30 < b.x + b.w) return true;
        }
        return false;
    };
    // a slide obstacle on the road: the enemies hold back their lasers meanwhile
    o.blocksLasers = () => pool.some(s => s.on && s.def.role === 'slide' && s.x < W + ENTER + 1);

    // dt: s; scroll: px the road moved; distM: metres run; hero: { box, hit(damage) }; enemies: the enemies
    // module (whether a boss stands, a laser is about, an enemy just came in; hold() keeps the next one back)
    o.update = (dt, scroll, distM, hero, enemies) => {
        // a new one, when it is time and it is fair
        if (o.natural && distM >= o.nextAtM && right() < W + ENTER - SP.minGap) {
            const zone = SP.zones[Math.min(SP.zones.length - 1, Math.floor(distM / SPAWNS.zoneM))];
            let id = zone[Math.floor(rng() * zone.length)];
            const busy = enemies && (enemies.boss() || enemies.justIn());
            if (id !== 'barrier' && enemies && enemies.lasersAbout()) id = 'barrier';
            if (!busy && o.spawn(id)) {
                o.nextAtM = distM + gap(distM);
                // the next enemy keeps its distance: not on top of it
                if (enemies) enemies.hold(distM + (right() - W + SP.minGap / 2) / PX_PER_M);
            }
        }
        for (const s of pool) {
            if (!s.on) continue;
            s.t += dt; s.x -= scroll;
            if (s.x + s.w < -40) { s.on = false; continue; }
            if (!hero || s.hitHero || (s.def.cycle && phase(s) !== 'on')) continue;
            const b = o.hazard(s), h = hero.box;
            if (h.x < b.x + b.w && h.x + h.w > b.x && h.y < b.y + b.h && h.y + h.h > b.y && hero.hit(s.def.damage)) { s.hitHero = true; o.hits++; }
        }
        // the cars, far behind: one now and then
        const C = SP.cars;
        o.carT -= dt;
        if (o.carT <= 0) {
            o.carT = C.every[0] + rng() * (C.every[1] - C.every[0]);
            const c = cars.find(q => !q.on);
            if (c) {
                c.back = rng() < C.back;                 // this one goes the other way
                c.frame = rng() < 0.5 ? 'car_blue' : 'car_orange';
                c.k = C.scale[0] + rng() * (C.scale[1] - C.scale[0]);
                c.y = C.y[0] + rng() * (C.y[1] - C.y[0]);
                c.v = C.speed[0] + rng() * (C.speed[1] - C.speed[0]);
                const w = frames[c.frame].w * c.k;
                c.x = c.back ? -w : W + w;
                c.on = true;
            }
        }
        for (const c of cars) {
            if (!c.on) continue;
            // the far road drifts by at its parallax and a car flies along it; one coming back the other way
            // outruns that drift (else it would slip away backwards at once)
            c.x += c.back ? c.v * dt : -scroll * C.parallax - c.v * dt;
            const w = frames[c.frame].w * c.k;
            if (c.x < -w - 10 || c.x > W + w + 10) c.on = false;
        }
    };

    function drawFrame(ctx, name, x, y, k = 1, flip = false) {
        const f = frames[name];
        if (!flip) { ctx.drawImage(sheet, f.x, f.y, f.w, f.h, x, y, f.w * k, f.h * k); return; }
        ctx.save();
        ctx.translate(x + f.w * k, y); ctx.scale(-1, 1);
        ctx.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w * k, f.h * k);
        ctx.restore();
    }

    // The cars, drawn between the middle city and the rail; dimmed a little, they are far
    o.drawCars = (ctx) => {
        ctx.save();
        ctx.globalAlpha = 0.85;
        for (const c of cars) {
            if (!c.on) continue;
            const f = frames[c.frame];
            // the art faces left: one going right is mirrored
            drawFrame(ctx, c.frame, c.x - f.w * c.k / 2, c.y - f.h * c.k / 2, c.k, c.back);
        }
        ctx.restore();
    };

    o.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            const p = s.def.cycle ? phase(s) : '';
            // the hanging ones: a soft shadow on the road under them, so their height reads
            if (s.def.hang) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
                ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, GROUND + 3, s.w * 0.4, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            // the laser's lenses: lit while on, and blinking in the warning (steady with reduced motion)
            const lit = p === 'on' || (p === 'warn' && (reducedMotion || Math.floor(s.t * 14) % 2 === 0));
            drawFrame(ctx, lit ? s.def.lit : s.def.frame, s.x, s.y, s.k);
            if (p === 'on') {
                const b = o.hazard(s), cy = b.y + b.h / 2;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const flick = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(s.t * 60);
                ctx.fillStyle = `rgba(255, 45, 85, ${0.35 * flick})`;
                ctx.fillRect(b.x, cy - 9, b.w, 18);
                ctx.fillStyle = `rgba(255, 120, 150, ${0.9 * flick})`;
                ctx.fillRect(b.x, cy - 3, b.w, 6);
                ctx.fillStyle = 'rgba(255, 240, 245, 0.95)';
                ctx.fillRect(b.x, cy - 1, b.w, 2);
                ctx.restore();
            }
        }
    };

    // For the tests
    o.list = () => pool.filter(s => s.on).map(s => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, t: s.t, role: s.def.role,
        phase: s.def.cycle ? phase(s) : null, hazard: { ...o.hazard(s) } }));
    o.cars = () => cars.filter(c => c.on).map(c => ({ x: c.x, y: c.y, back: c.back }));
    o.clear = () => { for (const s of pool) s.on = false; for (const c of cars) c.on = false; o.nextAtM = SP.firstM; };
    return o;
}
