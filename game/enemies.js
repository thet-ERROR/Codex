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

import { ENEMIES, SPAWNS, HIT_FLASH, POWERUPS, ATTACKS, PARRY, difficulty } from './config.js';
import { GROUND } from './hero.js';
import { PATROL, TELEGRAPH, ATTACK, RECOVER, STUNNED, createDirector, step, vulnerable, animOf, damageOf, chanceOf, hurt, landsIn, stun } from './attacks.js';

const W = 960;
// a fallen enemy drops a power-up with the sum of their chances; which one, weighed by each
const DROP_TOTAL = Object.values(POWERUPS).reduce((a, d) => a + (d.dropChance || 0), 0);
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

// onXp(x, y, n): told where XP was won and how much (a kill, a perfect parry), for the HUD's floating "+XP"
// sound(name): a sound to play (audio.js): a hit, a pop, a glance, an attack's warning and its start
export function createEnemies(sheet, frames, { rng = Math.random, reducedMotion = false, onXp = null, sound = () => {} } = {}) {
    const white = sheet ? whiten(sheet) : null;
    const pool = Array.from({ length: SPAWNS.pool }, () => ({
        on: false, id: '', def: null, x: 0, y: GROUND, hp: 0, t: 0, flash: 0, dying: 0, hitHero: false,
        state: PATROL, st: 0, attacks: false, h: 0, vx: 0, hop: 0, hops: 0, spin: 0, goal: 0,
        clink: 0, clinkX: 0, clinkY: 0, dust: 0, dustX: 0, ax: -1, ay: 0, zapped: false, placed: false
    }));
    // The Fire Crawler's spikes: part of the road (they ride it, outlive their crawler, hurt no enemy).
    // t counts from the crack opening: crack until the warning ends, then rise, stay, sink.
    const SP = ATTACKS.spikes;
    const spikePool = Array.from({ length: SPAWNS.spikes }, () => ({ on: false, x: 0, t: 0, owner: null, hit: false }));
    const spikes = {
        place(owner, heroX) {
            for (let n = 0; n < SP.count; n++) {
                const p = spikePool.find(q => !q.on);
                if (!p) return;
                // where the first comes up (SP.erupt), plus what the road runs in the warning at this speed
                Object.assign(p, { on: true, x: heroX + SP.erupt + link.speed * SP.telegraph + n * SP.gap, t: 0, owner, hit: false });
            }
        },
        // its crawler died before they came out: the cracks close
        cancel(owner) { for (const p of spikePool) if (p.on && p.owner === owner && p.t < SP.telegraph) p.on = false; },
        // how far up, 0..1
        up(p) {
            const t = p.t - SP.telegraph;
            if (t < 0) return 0;
            if (t < SP.rise) return t / SP.rise;
            if (t < SP.rise + SP.stay) return 1;
            return Math.max(0, 1 - (t - SP.rise - SP.stay) / SP.sink);
        },
        box(p) {
            const k = spikes.up(p), f = frames[spikeFrame(k)];
            const w = f.w * SP.scale * SP.hitbox[0], h = f.h * SP.scale * SP.hitbox[1] * Math.min(1, k * 1.5);
            return { x: p.x - w / 2, y: GROUND - h, w, h };
        },
        update(dt, scroll, hero) {
            let erupt = false;
            for (const p of spikePool) {
                if (!p.on) continue;
                if (p.t < SP.telegraph && p.t + dt >= SP.telegraph) erupt = true;   // out of the ground now
                p.t += dt; p.x -= scroll;
                if (p.t > SP.telegraph + SP.rise + SP.stay + SP.sink || p.x < -120) { p.on = false; continue; }
                // up past half: it hurts (once each)
                if (hero && !p.hit && spikes.up(p) > 0.5) {
                    const b = spikes.box(p), h = hero.box;
                    if (h.x < b.x + b.w && h.x + h.w > b.x && h.y < b.y + b.h && h.y + h.h > b.y && hero.hit(SP.damage)) p.hit = true;
                }
            }
            if (erupt) sound('spikes_erupt');                 // one for the row
        }
    };
    const spikeFrame = (k) => (k < 0.4 ? 'spikes.rise.0' : k < 0.8 ? 'spikes.rise.1' : 'spikes.rise.2');
    const director = createDirector();
    const eyeAt = { x: 0, y: 0 };
    // where its eye is now (the Spy Drone's laser leaves from it); one object, reused
    const eyeOf = (s) => {
        const f = frameOf(s), w = f.w * s.def.scale, h = f.h * s.def.scale;
        eyeAt.x = s.x - w * f.anchor[0] + w * s.def.eye[0];
        eyeAt.y = s.y + bobOf(s) - h * f.anchor[1] + h * s.def.eye[1];
        return eyeAt;
    };
    // a flyer hovers up and down a little (drawn, and its eye with it; not its hitbox)
    const bobOf = (s) => (s.def.fly ? Math.sin(s.t * 3) * 5 : 0);
    // where the boss's front cannon is (its beam leaves from it): from the charge frame, which the shot is
    // lined up with in the sheet; one object, reused
    const muzzleAt = { x: 0, y: 0 };
    const muzzleOf = (s) => {
        const f = frames[`${s.def.anims.charge}.0`], w = f.w * s.def.scale, h = f.h * s.def.scale;
        muzzleAt.x = s.x - w * f.anchor[0] + w * s.def.muzzle[0];
        muzzleAt.y = s.y - h * f.anchor[1] + h * s.def.muzzle[1];
        return muzzleAt;
    };
    const link = { dt: 0, scroll: 0, speed: 0, heroX: null, heroBox: null, hero: null, rng, director, eyeOf, muzzleOf, spikes };   // handed to the attacks, reused
    const e = {
        nextAtM: SPAWNS.firstM,
        bossAtM: SPAWNS.boss.firstM,
        parries: 0,
        killed: 0, score: 0, xp: 0,
        natural: true                  // the tests can turn the spawner off
    };
    const dropOf = () => {
        let r = rng() * DROP_TOTAL;
        for (const [id, d] of Object.entries(POWERUPS)) { r -= d.dropChance || 0; if (r < 0) return id; }
        return 'xmp';
    };
    // the metres to the next one: closer together the further it goes (config DIFFICULTY)
    const gap = (distM) => (SPAWNS.gapM[0] + rng() * (SPAWNS.gapM[1] - SPAWNS.gapM[0])) * difficulty(distM).gapScale;

    // The sound of an attack's step: the lasers' charge (as long as the warning) and their shot; the dash
    const cue = (s) => {
        const k = s.def.attack;
        if (s.state === TELEGRAPH && k === 'laser') sound('laser_charge_short');
        else if (s.state === TELEGRAPH && k === 'beam') sound('laser_charge');
        else if (s.state === ATTACK && (k === 'laser' || k === 'beam')) sound('laser_fire');
        else if (s.state === ATTACK && k === 'charge') sound('enemy_dash');
    };

    // attacks: whether this one will attack at all (left out, the chance in config.js decides)
    e.spawn = (id, x, attacks) => {
        const def = ENEMIES[id];
        const s = pool.find(q => !q.on);
        if (!def || !s) return false;
        Object.assign(s, { on: true, id, def, x, y: GROUND, hp: def.hp, t: 0, flash: 0, dying: 0, hitHero: false,
            state: PATROL, st: 0, attacks: attacks === undefined ? rng() < chanceOf(def) : !!attacks,
            h: def.fly || 0, vx: 0, hop: 0, hops: 0, spin: 0, clink: 0, dust: 0, ax: -1, ay: 0, zapped: false, placed: false, cool: ATTACKS.beam.first, lane: '' });
        s.y = GROUND - s.h;
        return true;
    };
    const free = (s) => { s.on = false; director.release(s); spikes.cancel(s); };

    // how many frames each animation has, counted once ('orangeBot.walk' → 3)
    const count = {};
    for (const k of Object.keys(frames)) { const a = k.slice(0, k.lastIndexOf('.')); count[a] = (count[a] || 0) + 1; }
    const names = {};                  // 'orangeBot.walk' → ['orangeBot.walk.0', …], so no string is built per frame
    for (const a of Object.keys(count)) names[a] = Array.from({ length: count[a] }, (_, i) => `${a}.${i}`);
    function frameOf(s) {
        const list = names[animOf(s)];
        // only on the move does it step through its frames; warning, attack pose and rest hold the first
        return frames[list[s.state === PATROL || s.def.loop ? Math.floor(s.t / s.def.frameTime) % list.length : 0]];
    }

    // The hitbox: a share of the drawn frame, centred on it, standing on its feet (the ball: centred on it)
    e.box = (s) => {
        const f = frameOf(s);
        const w = f.w * s.def.scale, h = f.h * s.def.scale, k = s.def.hitbox, kw = s.def.hitboxW || k;
        const lift = s.state === ATTACK && s.def.attack === 'roll' ? h * (1 - k) / 2 : 0;
        return { x: s.x - w * f.anchor[0] + w * (1 - kw) / 2, y: s.y - h * k - lift, w: w * kw, h: h * k };
    };

    // dt: s; scroll: px the road moved; distM: metres run; hero: { box, hit(damage) }; rams: hit(box),
    // deflect(box); powerups: spawn(id, x, y) for the drops
    e.update = (dt, scroll, distM, hero, rams, powerups) => {
        director.update(dt);
        link.dt = dt; link.scroll = scroll; link.speed = dt > 0 ? scroll / dt : 0;
        link.heroX = hero && hero.box ? hero.box.x + hero.box.w / 2 : null;
        link.heroBox = hero ? hero.box : null; link.hero = hero;
        spikes.update(dt, scroll, hero);
        // the boss: every so many metres; while it stands nothing else comes
        const boss = pool.some(s => s.on && s.def.boss && s.dying <= 0);
        if (e.natural && !boss && distM >= e.bossAtM && e.spawn('mechBoss', W + 120, true)) e.bossAtM += SPAWNS.boss.everyM;
        else if (e.natural && !boss && distM >= e.nextAtM) {
            const zone = SPAWNS.zones[Math.min(SPAWNS.zones.length - 1, Math.floor(distM / SPAWNS.zoneM))];
            if (e.spawn(zone[Math.floor(rng() * zone.length)], W + 60)) e.nextAtM = distM + gap(distM);
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
            const was = s.state;
            if (step(s, link)) { s.dust = DUST_T; s.dustX = s.x; sound('ball_bounce'); }
            if (s.state !== was) cue(s);
            s.y = GROUND - s.h;
            const box = e.box(s);
            // a RAM: hurt, flash, and at 0 hp the pop, the score, maybe a drop. The ball in the air is
            // armoured: the RAM glances off with a spark and does nothing.
            const open = vulnerable(s);
            if (rams && !open && rams.deflect) {
                const at = rams.deflect(box);
                if (at) { s.clink = CLINK_T; s.clinkX = at.x; s.clinkY = at.y; sound('ram_ricochet'); }
            }
            const dmg = rams && open ? rams.hit(box) : 0;
            if (dmg) {
                s.hp -= dmg * (s.state === STUNNED ? PARRY.stunMult : 1);   // dazed by a parry: it takes double
                s.flash = HIT_FLASH;
                if (s.hp <= 0) {
                    s.dying = DIE_T;
                    director.release(s);
                    spikes.cancel(s);
                    e.killed++; e.score += s.def.score; e.xp += s.def.xp;
                    if (onXp) onXp(box.x + box.w / 2, box.y, s.def.xp);
                    sound('enemy_pop');
                    if (powerups && rng() < DROP_TOTAL) powerups.spawn(dropOf(), s.x, GROUND - 70);
                    continue;
                }
                sound('enemy_hit');
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
        if (pool.some(s => s.on && s.def.boss && s.dying <= 0)) e.nextAtM = Math.max(e.nextAtM, distM + SPAWNS.gapM[0]);
    };

    // A parry: 'perfect' if an attack lands within the window (it is stunned, flashes, bonus XP), else 'miss'
    e.parry = () => {
        for (const s of pool) {
            if (!s.on || s.dying > 0 || landsIn(s) > PARRY.window) continue;
            stun(s, link);
            s.flash = 0.15;
            e.xp += PARRY.xp;
            e.parries++;
            if (onXp) { const b = e.box(s); onXp(b.x + b.w / 2, b.y, PARRY.xp); }
            return 'perfect';
        }
        return 'miss';
    };

    // Centres of what can be hit, for the RAMs' auto-aim (not the armoured ball in the air: aiming at it
    // would only waste the throw)
    e.targets = () => pool.filter(s => s.on && s.dying <= 0 && vulnerable(s)).map(s => { const b = e.box(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
    e.list = () => pool.filter(s => s.on).map(s => ({ id: s.id, x: s.x, y: s.y, hp: s.hp, flash: s.flash, dying: s.dying,
        box: e.box(s), state: s.state, attacks: s.attacks, h: s.h, hop: s.hop, hops: s.hops, vulnerable: vulnerable(s),
        clink: s.clink, st: s.st, ax: s.ax, ay: s.ay, lane: s.lane }));
    // The boss standing now (not dying), or null: the HUD draws its life bar over its head (s.drawH: how
    // tall it was drawn this frame)
    e.boss = () => { for (const s of pool) if (s.on && s.def.boss && s.dying <= 0) return s; return null; };
    e.spikes = () => spikePool.filter(p => p.on).map(p => ({ x: p.x, t: p.t, up: spikes.up(p), box: spikes.box(p) }));
    e.clear = () => { for (const s of pool) s.on = false; for (const p of spikePool) p.on = false; director.clear(); e.nextAtM = SPAWNS.firstM; e.bossAtM = SPAWNS.boss.firstM; e.killed = e.score = e.xp = e.parries = 0; };

    e.draw = (ctx) => {
        drawSpikes(ctx);
        for (const s of pool) {
            if (!s.on) continue;
            const f = frameOf(s);
            let sc = s.def.scale, alpha = 1, sx = 1, sy = 1;
            // a small step bob while walking, the pop when it dies
            let bob = s.def.fly ? -bobOf(s) : s.state === PATROL ? Math.abs(Math.sin(s.t / s.def.frameTime * Math.PI)) * 3 : 0;
            if (s.state === TELEGRAPH && !reducedMotion && !s.def.fly && !s.def.boss) {
                // winding up: it squashes lower and lower
                const k = Math.min(1, s.st / 0.5);
                sx = 1 + 0.12 * k; sy = 1 - 0.14 * k;
            }
            if (s.state === ATTACK && s.def.attack === 'roll' && s.h < 14) { sx = 1.14; sy = 0.86; }   // the ball squashes on the road
            // the Blue Runner pants after its charge: a slow heave
            if (s.state === RECOVER && s.def.attack === 'charge' && !reducedMotion) sy = 1 - 0.04 * Math.abs(Math.sin(s.st * 9));
            if (s.dying > 0) { const k = 1 - s.dying / DIE_T; sc *= 1 + 0.35 * k; alpha = 1 - k; bob = 0; }
            const w = f.w * sc * sx, h = f.h * sc * sy;
            s.drawH = h + bob;
            const shake = reducedMotion ? 0 : s.state === TELEGRAPH && !s.def.fly && !s.def.boss ? Math.sin(s.t * 70) * 1.5
                : s.state === STUNNED ? Math.sin(s.t * 18) * 3 : 0;   // a dazed boss sways   // and trembles
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
                if (s.state === TELEGRAPH && s.dying <= 0 && s.def.eye && s.def.attack !== 'laser' && (reducedMotion || Math.floor(s.st * 12) % 2 === 0)) {
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
            if (s.def.attack === 'laser' && s.dying <= 0) drawLaser(ctx, s);
            if (s.def.boss && s.dying <= 0) drawBeam(ctx, s);
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

    // The Spy Drone's laser: while it charges, a red dot in its eye that grows and a thin aiming line
    // (dashed while it still follows the hero, solid once locked: now dodge); then the beam, a white core
    // in a red glow; after, the eye cools down.
    function drawLaser(ctx, s) {
        const cfg = ATTACKS.laser;
        const e = eyeOf(s);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (s.state === TELEGRAPH) {
            const k = Math.min(1, s.st / cfg.telegraph);
            const locked = s.st > cfg.telegraph - cfg.lock;
            ctx.strokeStyle = locked ? 'rgba(255, 70, 70, 0.85)' : 'rgba(255, 60, 60, 0.45)';
            ctx.lineWidth = locked ? 2 : 1.2;
            if (!locked) ctx.setLineDash([10, 8]);
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + s.ax * cfg.length, e.y + s.ay * cfg.length); ctx.stroke();
            ctx.setLineDash([]);
            glow(ctx, e.x, e.y, 4 + 14 * k, 0.6 + 0.4 * k);
        } else if (s.state === ATTACK) {
            const x1 = e.x + s.ax * cfg.length, y1 = e.y + s.ay * cfg.length;
            const fade = reducedMotion ? 1 : 1 - 0.3 * Math.sin(s.st * 60) ** 2;   // a slight flicker
            ctx.lineCap = 'round';
            ctx.strokeStyle = `rgba(255, 40, 60, ${0.45 * fade})`;
            ctx.lineWidth = cfg.width * 2.2;
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = `rgba(255, 120, 120, ${0.8 * fade})`;
            ctx.lineWidth = cfg.width;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = cfg.width * 0.35;
            ctx.stroke();
            glow(ctx, e.x, e.y, 20, 1);
        } else if (s.state === RECOVER) {
            glow(ctx, e.x, e.y, 10 * (1 - s.st / cfg.recover), 0.5);
        }
        ctx.restore();
    }
    function glow(ctx, x, y, r, a, [cr, cg, cb] = [255, 40, 40]) {
        if (r <= 0) return;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255, 235, 245, ${a})`);
        g.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, ${0.8 * a})`);
        g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // The spikes: first a crack in the road that glows hotter and pulses, then the spikes out of it
    function drawSpikes(ctx) {
        for (const p of spikePool) {
            if (!p.on) continue;
            const k = spikes.up(p);
            // hot from the first moment, hotter as they come; fading while they are up
            const heat = p.t < SP.telegraph ? 0.55 + 0.45 * p.t / SP.telegraph : Math.max(0, 1 - (p.t - SP.telegraph) / (SP.rise + SP.stay + SP.sink));
            const pulse = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(p.t * 30);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(p.x, GROUND, 0, p.x, GROUND, 56);
            g.addColorStop(0, `rgba(255, 200, 80, ${heat * pulse})`);
            g.addColorStop(0.5, `rgba(255, 110, 20, ${0.7 * heat * pulse})`);
            g.addColorStop(1, 'rgba(255, 60, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(p.x, GROUND, 56, 18, 0, 0, Math.PI * 2); ctx.fill();
            // the crack: a jagged line across the road (fixed shape)
            ctx.strokeStyle = `rgba(255, 235, 150, ${heat})`;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(p.x - 34, GROUND + 1); ctx.lineTo(p.x - 18, GROUND - 3); ctx.lineTo(p.x - 6, GROUND + 3);
            ctx.lineTo(p.x + 8, GROUND - 2); ctx.lineTo(p.x + 20, GROUND + 2); ctx.lineTo(p.x + 34, GROUND - 1);
            ctx.stroke();
            ctx.restore();
            if (k > 0 && sheet) {
                const f = frames[spikeFrame(k)];
                const w = f.w * SP.scale, h = f.h * SP.scale;
                ctx.save();
                // rising out of the road: what is still under it is cut off
                ctx.beginPath(); ctx.rect(p.x - w, 0, w * 2, GROUND + 4); ctx.clip();
                ctx.drawImage(sheet, f.x, f.y, f.w, f.h, p.x - w / 2, GROUND + 4 - h * Math.min(1, k * 1.2), w, h);
                ctx.restore();
            }
        }
    }

    // The Malware Core's beam: while the cannons charge, a magenta warning line along the path (pulsing,
    // brighter as it comes); then the thick beam, white in a magenta glow, to where it meets the road
    function drawBeam(ctx, s) {
        if (s.state !== TELEGRAPH && s.state !== ATTACK) return;
        const cfg = ATTACKS.beam, m = muzzleOf(s);
        const len = s.ay > 0 ? Math.min(cfg.length, (GROUND - m.y) / s.ay) : cfg.length;
        const x1 = m.x + s.ax * len, y1 = m.y + s.ay * len;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        if (s.state === TELEGRAPH) {
            const k = Math.min(1, s.st / cfg.telegraph);
            const pulse = reducedMotion ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(s.st * 14));
            // the lane the beam will fill, faint, and a bright dashed line down its middle
            ctx.strokeStyle = `rgba(236, 72, 255, ${(0.12 + 0.18 * k) * pulse})`;
            ctx.lineWidth = cfg.width;
            ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = `rgba(250, 170, 255, ${(0.6 + 0.4 * k) * pulse})`;
            ctx.lineWidth = 2.5 + 2 * k;
            ctx.setLineDash([16, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
            glow(ctx, m.x, m.y, 10 + 22 * k, 0.9, [236, 72, 255]);
        } else {
            const fade = reducedMotion ? 1 : 1 - 0.25 * Math.sin(s.st * 50) ** 2;
            for (const [wk, col] of [[2.2, `rgba(217, 70, 239, ${0.45 * fade})`], [1, `rgba(244, 140, 255, ${0.85 * fade})`], [0.35, 'rgba(255, 255, 255, 0.95)']]) {
                ctx.strokeStyle = col; ctx.lineWidth = cfg.width * wk;
                ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x1, y1); ctx.stroke();
            }
            glow(ctx, m.x, m.y, 34, 1, [236, 72, 255]);
            glow(ctx, x1, y1, 30, 0.8, [236, 72, 255]);           // where it burns the road
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
