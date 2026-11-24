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

import { ENEMIES, SPAWNS, HIT_FLASH, POWERUPS } from './config.js';
import { GROUND } from './hero.js';

const W = 960;
const DIE_T = 0.25;                    // the death pop

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

export function createEnemies(sheet, frames, { rng = Math.random } = {}) {
    const white = sheet ? whiten(sheet) : null;
    const pool = Array.from({ length: SPAWNS.pool }, () => ({
        on: false, id: '', def: null, x: 0, y: GROUND, hp: 0, t: 0, flash: 0, dying: 0, hitHero: false
    }));
    const e = {
        nextAtM: SPAWNS.firstM,
        killed: 0, score: 0, xp: 0,
        natural: true                  // the tests can turn the spawner off
    };
    const gap = () => SPAWNS.gapM[0] + rng() * (SPAWNS.gapM[1] - SPAWNS.gapM[0]);

    e.spawn = (id, x) => {
        const def = ENEMIES[id];
        const s = pool.find(q => !q.on);
        if (!def || !s) return false;
        Object.assign(s, { on: true, id, def, x, y: GROUND, hp: def.hp, t: 0, flash: 0, dying: 0, hitHero: false });
        return true;
    };

    // how many frames each animation has, counted once ('orangeBot.walk' → 3)
    const count = {};
    for (const k of Object.keys(frames)) { const a = k.slice(0, k.lastIndexOf('.')); count[a] = (count[a] || 0) + 1; }
    const names = {};                  // 'orangeBot.walk' → ['orangeBot.walk.0', …], so no string is built per frame
    for (const a of Object.keys(count)) names[a] = Array.from({ length: count[a] }, (_, i) => `${a}.${i}`);
    function frameOf(s) {
        const list = names[s.def.anim];
        return frames[list[Math.floor(s.t / s.def.frameTime) % list.length]];
    }

    // The hitbox: a share of the drawn frame, centred on it, standing on its feet
    e.box = (s) => {
        const f = frameOf(s);
        const w = f.w * s.def.scale, h = f.h * s.def.scale, k = s.def.hitbox;
        return { x: s.x - w * k / 2, y: s.y - h * k, w: w * k, h: h * k };
    };

    // dt: s; scroll: px the road moved; distM: metres run; hero: { box, hit(damage) }; rams: hit(box);
    // powerups: spawn(id, x, y) for the drops
    e.update = (dt, scroll, distM, hero, rams, powerups) => {
        if (e.natural && distM >= e.nextAtM) {
            const zone = SPAWNS.zones[Math.min(SPAWNS.zones.length - 1, Math.floor(distM / SPAWNS.zoneM))];
            if (e.spawn(zone[Math.floor(rng() * zone.length)], W + 60)) e.nextAtM = distM + gap();
        }
        for (const s of pool) {
            if (!s.on) continue;
            s.t += dt;
            if (s.dying > 0) {
                s.dying -= dt;
                s.x -= scroll;
                if (s.dying <= 0) s.on = false;
                continue;
            }
            s.flash = Math.max(0, s.flash - dt);
            s.x -= scroll + s.def.speed * dt;
            const box = e.box(s);
            // a RAM: hurt, flash, and at 0 hp the pop, the score, maybe a drop
            const dmg = rams ? rams.hit(box) : 0;
            if (dmg) {
                s.hp -= dmg;
                s.flash = HIT_FLASH;
                if (s.hp <= 0) {
                    s.dying = DIE_T;
                    e.killed++; e.score += s.def.score; e.xp += s.def.xp;
                    if (powerups && rng() < POWERUPS.xmp.dropChance) powerups.spawn('xmp', s.x, GROUND - 70);
                    continue;
                }
            }
            // touching the hero: one hit per enemy (it walks on through him)
            if (hero && !s.hitHero) {
                const h = hero.box;
                if (h.x < box.x + box.w && h.x + h.w > box.x && h.y < box.y + box.h && h.y + h.h > box.y) {
                    if (hero.hit(s.def.damage)) s.hitHero = true;
                }
            }
            if (s.x < -120) s.on = false;
        }
    };

    // Centres of what can be hit, for the RAMs' auto-aim
    e.targets = () => pool.filter(s => s.on && s.dying <= 0).map(s => { const b = e.box(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
    e.list = () => pool.filter(s => s.on).map(s => ({ id: s.id, x: s.x, y: s.y, hp: s.hp, flash: s.flash, dying: s.dying, box: e.box(s) }));
    e.clear = () => { for (const s of pool) s.on = false; e.nextAtM = SPAWNS.firstM; e.killed = e.score = e.xp = 0; };

    e.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            const f = frameOf(s);
            let sc = s.def.scale, alpha = 1;
            // a small step bob while walking, the pop when it dies
            let bob = Math.abs(Math.sin(s.t / s.def.frameTime * Math.PI)) * 3;
            if (s.dying > 0) { const k = 1 - s.dying / DIE_T; sc *= 1 + 0.35 * k; alpha = 1 - k; bob = 0; }
            const w = f.w * sc, h = f.h * sc;
            const dx = s.x - w * f.anchor[0], dy = s.y - bob - h * f.anchor[1];
            ctx.save();
            ctx.globalAlpha = alpha;
            // shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(s.x, GROUND + 2, w * 0.32, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.drawImage(s.flash > 0 || s.dying > 0 ? white : sheet, f.x, f.y, f.w, f.h, dx, dy, w, h);
            ctx.restore();
        }
    };

    return e;
}
