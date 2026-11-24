// game/enemies.js — RAM RUSH's enemies (plan §6). The Orange Bot first; the others join one by one.
//
// Every enemy comes from a fixed pool (nothing is created while the game runs) and goes back to it when it
// leaves the screen on the left or dies. What each one is (hp, speed, damage, score, xp, size, hitbox) is in
// config.js; this file only reads it. The spawner picks from the zone's list (a zone every SPAWNS.zoneM
// metres) and never spawns closer than SPAWNS.gapM[0] metres apart.
//
// Art: one sheet (assets/enemies.webp) and its frame map (enemies.json): x, y, w, h, anchor [0.5, 1] (the
// feet), faces left. The white hit flash is the same frame drawn from a whitened copy of the sheet, made
// once at load, so no extra art and no per-frame work.
//
// Plan 5b, the attacks: each enemy runs its own state machine (attacks.js), and a director lets only one
// attack at a time. Here: what that means on screen (the curl and its blinking eye, the bouncing ball,
// the dust where it lands, the spark when a RAM glances off the armour).

import { ENEMIES, SPAWNS, HIT_FLASH, POWERUPS, ATTACKS } from './config.js';
import { GROUND } from './hero.js';
import { PATROL, TELEGRAPH, ATTACK, RECOVER, createDirector, step, vulnerable, animOf, damageOf, chanceOf, hurt } from './attacks.js';

const W = 960;
const DIE_T = 0.25;                    // the death pop
const CLINK_T = 0.14;                  // the spark of a glancing RAM
const DUST_T = 0.3;                    // the puff where a bounce lands
const LINES = 7;                       // speed lines behind a charge
const ATTACKS_CHARGE_T = ATTACKS.charge.telegraph;

// The sheet in white, for the flash: drawn once, the shape kept by its alpha
function whiten(sheet) {
    const c = document.createElement('canvas');
    c.width = sheet.width; c.height = sheet.height;
    const x = c.getContext('2d');
    x.drawImage(sheet, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    return c;
}

export function createEnemies(sheet, frames, { rng = Math.random, reducedMotion = false } = {}) {
    const white = sheet ? whiten(sheet) : null;
    const pool = Array.from({ length: SPAWNS.pool }, () => ({
        on: false, id: '', def: null, x: 0, y: GROUND, hp: 0, t: 0, flash: 0, dying: 0, hitHero: false,
        state: PATROL, st: 0, attacks: false, h: 0, vx: 0, hop: 0, hops: 0, spin: 0, goal: 0,
        clink: 0, clinkX: 0, clinkY: 0, dust: 0, dustX: 0
    }));
    const director = createDirector();
    const link = { dt: 0, scroll: 0, heroX: null, rng, director };   // handed to the attacks, reused
    const e = {
        nextAtM: SPAWNS.firstM,
        killed: 0, score: 0, xp: 0,
        natural: true                  // the tests can turn the spawner off
    };
    const gap = () => SPAWNS.gapM[0] + rng() * (SPAWNS.gapM[1] - SPAWNS.gapM[0]);

    // attacks: whether this one will attack at all (left out, the chance in config.js decides)
    e.spawn = (id, x, attacks) => {
        const def = ENEMIES[id];
        const s = pool.find(q => !q.on);
        if (!def || !s) return false;
        Object.assign(s, { on: true, id, def, x, y: GROUND, hp: def.hp, t: 0, flash: 0, dying: 0, hitHero: false,
            state: PATROL, st: 0, attacks: attacks === undefined ? rng() < chanceOf(def) : !!attacks,
            h: 0, vx: 0, hop: 0, hops: 0, spin: 0, clink: 0, dust: 0 });
        return true;
    };
    const free = (s) => { s.on = false; director.release(s); };

    // how many frames each animation has, counted once ('orangeBot.walk' → 3)
    const count = {};
    for (const k of Object.keys(frames)) { const a = k.slice(0, k.lastIndexOf('.')); count[a] = (count[a] || 0) + 1; }
    const names = {};                  // 'orangeBot.walk' → ['orangeBot.walk.0', …], so no string is built per frame
    for (const a of Object.keys(count)) names[a] = Array.from({ length: count[a] }, (_, i) => `${a}.${i}`);
    function frameOf(s) {
        const list = names[animOf(s)];
        // only on the move does it step through its frames; warning, attack pose and rest hold the first
        return frames[list[s.state === PATROL ? Math.floor(s.t / s.def.frameTime) % list.length : 0]];
    }

    // The hitbox: a share of the drawn frame, centred on it, standing on its feet (the ball: centred on it)
    e.box = (s) => {
        const f = frameOf(s);
        const w = f.w * s.def.scale, h = f.h * s.def.scale, k = s.def.hitbox, kw = s.def.hitboxW || k;
        const lift = s.state === ATTACK && s.def.attack === 'roll' ? h * (1 - k) / 2 : 0;
        return { x: s.x - w * kw / 2, y: s.y - h * k - lift, w: w * kw, h: h * k };
    };

    // dt: s; scroll: px the road moved; distM: metres run; hero: { box, hit(damage) }; rams: hit(box),
    // deflect(box); powerups: spawn(id, x, y) for the drops
    e.update = (dt, scroll, distM, hero, rams, powerups) => {
        director.update(dt);
        link.dt = dt; link.scroll = scroll;
        link.heroX = hero && hero.box ? hero.box.x + hero.box.w / 2 : null;
        if (e.natural && distM >= e.nextAtM) {
            const zone = SPAWNS.zones[Math.min(SPAWNS.zones.length - 1, Math.floor(distM / SPAWNS.zoneM))];
            if (e.spawn(zone[Math.floor(rng() * zone.length)], W + 60)) e.nextAtM = distM + gap();
        }
        for (const s of pool) {
            if (!s.on) continue;
            s.t += dt;
            s.clink = Math.max(0, s.clink - dt);
            s.dust = Math.max(0, s.dust - dt);
            if (s.dying > 0) {
                s.dying -= dt;
                s.x -= scroll;
                if (s.dying <= 0) free(s);
                continue;
            }
            s.flash = Math.max(0, s.flash - dt);
            if (step(s, link)) { s.dust = DUST_T; s.dustX = s.x; }
            s.y = GROUND - s.h;
            const box = e.box(s);
            // a RAM: hurt, flash, and at 0 hp the pop, the score, maybe a drop. The ball in the air is
            // armoured: the RAM glances off with a spark and does nothing.
            const open = vulnerable(s);
            if (rams && !open && rams.deflect) {
                const at = rams.deflect(box);
                if (at) { s.clink = CLINK_T; s.clinkX = at.x; s.clinkY = at.y; }
            }
            const dmg = rams && open ? rams.hit(box) : 0;
            if (dmg) {
                s.hp -= dmg;
                s.flash = HIT_FLASH;
                if (s.hp <= 0) {
                    s.dying = DIE_T;
                    director.release(s);
                    e.killed++; e.score += s.def.score; e.xp += s.def.xp;
                    if (powerups && rng() < POWERUPS.xmp.dropChance) powerups.spawn('xmp', s.x, GROUND - 70);
                    continue;
                }
                hurt(s, link);                         // e.g. a charge stopped short
            }
            // touching the hero: one hit per enemy (it goes on through him)
            if (hero && !s.hitHero) {
                const h = hero.box;
                if (h.x < box.x + box.w && h.x + h.w > box.x && h.y < box.y + box.h && h.y + h.h > box.y) {
                    if (hero.hit(damageOf(s))) s.hitHero = true;
                }
            }
            if (s.x < -120) free(s);
        }
    };

    // Centres of what can be hit, for the RAMs' auto-aim (not the armoured ball in the air: aiming at it
    // would only waste the throw)
    e.targets = () => pool.filter(s => s.on && s.dying <= 0 && vulnerable(s)).map(s => { const b = e.box(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
    e.list = () => pool.filter(s => s.on).map(s => ({ id: s.id, x: s.x, y: s.y, hp: s.hp, flash: s.flash, dying: s.dying,
        box: e.box(s), state: s.state, attacks: s.attacks, h: s.h, hop: s.hop, hops: s.hops, vulnerable: vulnerable(s),
        clink: s.clink }));
    e.clear = () => { for (const s of pool) s.on = false; director.clear(); e.nextAtM = SPAWNS.firstM; e.killed = e.score = e.xp = 0; };

    e.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            const f = frameOf(s);
            let sc = s.def.scale, alpha = 1, sx = 1, sy = 1;
            // a small step bob while walking, the pop when it dies
            let bob = s.state === PATROL ? Math.abs(Math.sin(s.t / s.def.frameTime * Math.PI)) * 3 : 0;
            if (s.state === TELEGRAPH && !reducedMotion) {
                // winding up: it squashes lower and lower
                const k = Math.min(1, s.st / 0.5);
                sx = 1 + 0.12 * k; sy = 1 - 0.14 * k;
            }
            if (s.state === ATTACK && s.def.attack === 'roll' && s.h < 14) { sx = 1.14; sy = 0.86; }   // the ball squashes on the road
            // the Blue Runner pants after its charge: a slow heave
            if (s.state === RECOVER && s.def.attack === 'charge' && !reducedMotion) sy = 1 - 0.04 * Math.abs(Math.sin(s.st * 9));
            if (s.dying > 0) { const k = 1 - s.dying / DIE_T; sc *= 1 + 0.35 * k; alpha = 1 - k; bob = 0; }
            const w = f.w * sc * sx, h = f.h * sc * sy;
            const shake = s.state === TELEGRAPH && !reducedMotion ? Math.sin(s.t * 70) * 1.5 : 0;   // and trembles
            ctx.save();
            ctx.globalAlpha = alpha;
            // shadow: smaller and fainter the higher the ball is
            const up = Math.min(1, s.h / 160);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - up * 0.5)})`;
            ctx.beginPath();
            ctx.ellipse(s.x, GROUND + 2, f.w * sc * 0.32 * (1 - up * 0.4), 6 * (1 - up * 0.4), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (s.def.attack === 'charge' && s.dying <= 0) drawLines(ctx, s, w, h);
            ctx.save();
            ctx.globalAlpha = alpha;
            const img = s.flash > 0 || s.dying > 0 ? white : sheet;
            if (s.state === ATTACK && s.def.attack === 'roll') {
                // the ball rolls: turned about its own centre
                ctx.translate(s.x, s.y - h / 2);
                ctx.rotate(s.spin);
                ctx.drawImage(img, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h);
            } else {
                const dx = s.x + shake - w * f.anchor[0], dy = s.y - bob - h * f.anchor[1];
                ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, w, h);
                // the warning: the eye (the visor) blinks red-hot while it winds up (steady with reduced motion)
                if (s.state === TELEGRAPH && s.dying <= 0 && s.def.eye && (reducedMotion || Math.floor(s.st * 12) % 2 === 0)) {
                    const ex = dx + w * s.def.eye[0], ey = dy + h * s.def.eye[1];
                    ctx.globalCompositeOperation = 'lighter';
                    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 22);
                    g.addColorStop(0, 'rgba(255, 240, 170, 1)');
                    g.addColorStop(0.35, 'rgba(255, 90, 40, 0.85)');
                    g.addColorStop(1, 'rgba(255, 40, 0, 0)');
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(ex, ey, 22, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
            drawBits(ctx, s);
        }
    };

    // Speed lines behind a charge (to its right: it runs left): faint and gathering while it crouches,
    // long and bright while it runs. Fixed lanes, so nothing random per frame.
    function drawLines(ctx, s, w, h) {
        const k = s.state === TELEGRAPH ? Math.min(1, s.st / ATTACKS_CHARGE_T) : s.state === ATTACK ? 1 : 0;
        if (k <= 0) return;
        const long = s.state === ATTACK ? 1 : 0.4;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let n = 0; n < LINES; n++) {
            const y = s.y - h * (0.12 + 0.72 * n / (LINES - 1));
            const x0 = s.x + w * 0.2 + ((n * 37) % 23);
            const len = (80 + ((n * 53) % 60)) * long * k;
            ctx.strokeStyle = n % 2 ? `rgba(200, 245, 255, ${0.8 * k})` : `rgba(80, 200, 255, ${0.75 * k})`;
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke();
        }
        ctx.restore();
    }

    // The dust where a bounce landed, and the spark where a RAM glanced off the ball
    function drawBits(ctx, s) {
        if (s.dust > 0) {
            const k = 1 - s.dust / DUST_T;
            ctx.save();
            ctx.fillStyle = `rgba(210, 200, 230, ${0.45 * (1 - k)})`;
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.ellipse(s.dustX + side * (18 + 30 * k), GROUND - 4 - 6 * k, 10 + 10 * k, 5 + 3 * k, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        if (s.clink > 0) {
            const k = 1 - s.clink / CLINK_T;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(255, 245, 200, ${1 - k})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const ang = a * Math.PI / 3 + 0.3, r0 = 4 + 6 * k, r1 = 12 + 14 * k;
                ctx.moveTo(s.clinkX + Math.cos(ang) * r0, s.clinkY + Math.sin(ang) * r0);
                ctx.lineTo(s.clinkX + Math.cos(ang) * r1, s.clinkY + Math.sin(ang) * r1);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    return e;
}
