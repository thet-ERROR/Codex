// game/powerups.js — RAM RUSH's power-ups (plan §4b): what is on, the pickups on the road, and their HUD.
//
// One of each kind on at a time: picking up the same again refills its time and adds nothing (no
// stacking). Each is { id, remaining }; its time runs down with the loop, so a pause (P, another tab,
// the game closed) freezes it. The rest of the game reads the effects through one getStat(name), which
// multiplies whatever is on and keeps the result inside STAT_CAPS.
//
// Pickups float over the road at a height reached running or with a jump, scroll with it, and are taken
// by running into them or hitting them with a RAM. Never closer than PICKUPS.gapM[0] metres apart; which
// one comes is weighed by its `road` number. A small fixed pool; icons and glow drawn in code, no images.
//
// Liquid Cooling: a shield. While it is on, the next hit is taken by it instead (absorb()), and it breaks.
// Drone Assist: while it is on, the drone fires by itself at the nearest enemy ahead (droneStep()).

import { POWERUPS, POWERUP_WARN, STAT_CAPS, PICKUPS, PX_PER_M } from './config.js';

const W = 960;
const POOL = 3;

export function createPowerups({ rng = Math.random, reducedMotion = false } = {}) {
    const p = {
        active: new Map(),                 // id → { id, remaining }
        nextAtM: PICKUPS.gapM[0] + rng() * (PICKUPS.gapM[1] - PICKUPS.gapM[0]),
        mhz: POWERUPS.xmp.mhz[0],
        taken: 0,
        t: 0,
        breakT: 0,                         // the shield's shatter, drawn for a moment
        droneCool: 0, droneFlash: 0        // the drone's time to its next shot, and its muzzle flash
    };
    const ids = Object.keys(POWERUPS);
    // one of them, weighed by `key` (road: on the road; dropChance: from an enemy)
    const pick = (key) => {
        const total = ids.reduce((a, id) => a + (POWERUPS[id][key] || 0), 0);
        let r = rng() * total;
        for (const id of ids) { r -= POWERUPS[id][key] || 0; if (r < 0) return id; }
        return ids[0];
    };
    p.pick = pick;
    const pool = Array.from({ length: POOL }, () => ({ on: false, id: '', x: 0, y: 0 }));

    p.activate = (id) => {
        const def = POWERUPS[id];
        if (!def) return;
        const cur = p.active.get(id);
        // the same again: more time, no more effect (at: when it was taken, for the HUD's pop)
        if (cur) { cur.remaining = def.duration; cur.shield = def.shield || 0; cur.at = p.t; }
        else p.active.set(id, { id, remaining: def.duration, shield: def.shield || 0, at: p.t });
    };
    // A blow is coming: if a shield is on, it takes it (and breaks when it has taken all it can)
    p.absorb = () => {
        for (const a of p.active.values()) {
            if (!a.shield) continue;
            a.shield--;
            if (a.shield <= 0) { p.active.delete(a.id); p.breakT = 0.35; }
            return POWERUPS[a.id].breakSafe || 0;
        }
        return 0;
    };
    p.isOn = (id) => p.active.has(id);
    p.remaining = (id) => (p.active.get(id) || { remaining: 0 }).remaining;

    // What the hero has of his own (his RAM tier, from progression.js): multiplied under the power-ups
    p.base = {};
    p.getStat = (name) => {
        let v = p.base[name] || 1;
        for (const { id } of p.active.values()) v *= POWERUPS[id].mults[name] || 1;
        const cap = STAT_CAPS[name];
        return cap ? Math.min(cap[1], Math.max(cap[0], v)) : v;
    };

    // A pickup of `id` at (x, y) in the world; false if none is free
    p.spawn = (id, x, y) => {
        const s = pool.find(q => !q.on);
        if (!s) return false;
        Object.assign(s, { on: true, id, x, y });
        return true;
    };

    // dt: seconds; scroll: px the road moved this frame; distM: metres run so far;
    // heroBox: what touches a pickup; rams: hit(box) spends a stick on one
    p.update = (dt, scroll, distM, heroBox, rams) => {
        p.t += dt;
        p.breakT = Math.max(0, p.breakT - dt);
        p.droneFlash = Math.max(0, p.droneFlash - dt);
        for (const a of [...p.active.values()]) {
            a.remaining -= dt;
            if (a.remaining <= 0) p.active.delete(a.id);
        }
        // the MHz meter climbs fast when XMP comes on, falls back when it ends
        const [lo, hi] = POWERUPS.xmp.mhz;
        const target = p.isOn('xmp') ? hi : lo;
        p.mhz += (target - p.mhz) * (1 - Math.exp(-4 * dt));

        // a new pickup once far enough along the road
        if (distM >= p.nextAtM) {
            const h = PICKUPS.heights[Math.floor(rng() * PICKUPS.heights.length)];
            if (p.spawn(pick('road'), W + 40, 460 - h)) {
                p.nextAtM = distM + PICKUPS.gapM[0] + rng() * (PICKUPS.gapM[1] - PICKUPS.gapM[0]);
            }
        }
        const r = PICKUPS.radius;
        for (const s of pool) {
            if (!s.on) continue;
            s.x -= scroll;
            const box = { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
            const touched = heroBox && heroBox.x < box.x + box.w && heroBox.x + heroBox.w > box.x
                && heroBox.y < box.y + box.h && heroBox.y + heroBox.h > box.y;
            if (touched || (rams && rams.hit(box))) {
                s.on = false;
                p.activate(s.id);
                p.taken++;
            } else if (s.x < -r * 2) s.on = false;
        }
    };

    // Drone Assist: every POWERUPS.drone.every s, one bolt at the nearest target ahead of the drone and within
    // its range. targets: [{ x, y }] (the enemies' centres); rams.bolt() puts the shot in flight.
    p.droneStep = (dt, drone, targets, rams) => {
        if (!p.isOn('drone')) { p.droneCool = 0; return; }
        const d = POWERUPS.drone;
        p.droneCool = Math.max(0, p.droneCool - dt);
        if (p.droneCool > 0) return;
        let best = null, bestD = d.range;
        for (const t of targets) {
            const dx = t.x - drone.x, dist = Math.hypot(dx, t.y - drone.y);
            if (dx > 20 && dist < bestD) { best = t; bestD = dist; }
        }
        if (best && rams.bolt(drone.x + 12, drone.y, best.x, best.y, d.speed, d.damage)) {
            p.droneCool = d.every; p.droneFlash = 0.12; p.droneShots = (p.droneShots || 0) + 1;
        }
    };

    // The drone glows while the power-up is on, and flashes as it fires
    p.drawDrone = (ctx, drone) => {
        if (!p.isOn('drone') || blinkOff(p.remaining('drone'))) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const r = 34 + (p.droneFlash > 0 ? 16 : 0);
        const g = ctx.createRadialGradient(drone.x, drone.y, 2, drone.x, drone.y, r);
        g.addColorStop(0, `rgba(190, 242, 100, ${p.droneFlash > 0 ? 0.8 : reducedMotion ? 0.3 : 0.4})`);
        g.addColorStop(1, 'rgba(163, 230, 53, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(drone.x - r, drone.y - r, r * 2, r * 2);
        ctx.restore();
    };

    p.pickups = () => pool.filter(s => s.on).map(s => ({ id: s.id, x: s.x, y: s.y }));
    p.clear = () => { for (const s of pool) s.on = false; p.active.clear(); };

    // the last POWERUP_WARN seconds blink (not with reduced motion)
    const blinkOff = (remaining) => !reducedMotion && remaining < POWERUP_WARN && Math.floor(p.t * 8) % 2 === 0;

    // What is in each ring: XMP a RAM stick, Liquid Cooling a drop of coolant with its bubble
    const GLYPHS = {
        xmp(ctx, s) {
            ctx.fillStyle = '#17803f';
            ctx.fillRect(-14 * s, -6 * s, 28 * s, 11 * s);
            ctx.fillStyle = '#111318';
            for (let c = 0; c < 3; c++) ctx.fillRect((-12 + c * 8.5) * s, -4 * s, 6 * s, 5 * s);
            ctx.fillStyle = '#e3b341';
            ctx.fillRect(-13 * s, 2.5 * s, 26 * s, 2.5 * s);
        },
        drone(ctx, s) {
            ctx.fillStyle = '#a3e635';
            ctx.beginPath(); ctx.arc(0, 0, 8 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1a2e05';
            ctx.beginPath(); ctx.arc(0, 0, 3.6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#a3e635'; ctx.lineWidth = 2.5 * s;
            ctx.beginPath(); ctx.moveTo(-14 * s, -9 * s); ctx.lineTo(-6 * s, -5 * s); ctx.moveTo(14 * s, -9 * s); ctx.lineTo(6 * s, -5 * s); ctx.stroke();
        },
        cooling(ctx, s) {
            ctx.fillStyle = '#60a5fa';
            ctx.beginPath();
            ctx.moveTo(0, -13 * s);
            ctx.bezierCurveTo(7 * s, -3 * s, 10 * s, 2 * s, 10 * s, 5 * s);
            ctx.arc(0, 5 * s, 10 * s, 0, Math.PI);
            ctx.bezierCurveTo(-10 * s, 2 * s, -7 * s, -3 * s, 0, -13 * s);
            ctx.fill();
            ctx.fillStyle = 'rgba(240, 249, 255, 0.85)';
            ctx.beginPath(); ctx.arc(-4 * s, 4 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
        }
    };

    // The ring with its glyph: the pickup in the world, and the icon in the HUD
    function icon(ctx, x, y, r, color, id = 'xmp') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(13, 12, 29, 0.85)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        (GLYPHS[id] || GLYPHS.xmp)(ctx, r / 22);
        ctx.restore();
    }

    p.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            const bob = reducedMotion ? 0 : Math.sin(p.t * 3 + s.x * 0.01) * 5;
            const def = POWERUPS[s.id];
            icon(ctx, s.x, s.y + bob, PICKUPS.radius, def.color, s.id);
            ctx.save();
            // white with a dark edge: a cyan label vanished against the cyan clouds
            ctx.font = '800 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(13, 12, 29, 0.85)';
            ctx.strokeText(def.label, s.x, s.y + bob + PICKUPS.radius + 15);
            ctx.fillStyle = '#f1f0f7';
            ctx.fillText(def.label, s.x, s.y + bob + PICKUPS.radius + 15);
            ctx.restore();
        }
    };

    // Around the hero: the Liquid Cooling bubble (and its shatter when it takes a blow), the XMP glow
    p.drawAura = (ctx, box) => {
        drawShield(ctx, box);
        if (!p.isOn('xmp')) return;
        if (blinkOff(p.remaining('xmp'))) return;
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
        const R = Math.max(box.w, box.h) * 0.85;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
        g.addColorStop(0, `rgba(34, 211, 238, ${reducedMotion ? 0.2 : 0.38})`);
        g.addColorStop(0.6, `rgba(34, 211, 238, ${reducedMotion ? 0.08 : 0.16})`);
        g.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();
    };

    function drawShield(ctx, box) {
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.max(box.w, box.h) * 0.62;
        if (p.isOn('cooling') && !blinkOff(p.remaining('cooling'))) {
            const wob = reducedMotion ? 0 : Math.sin(p.t * 5) * 2;
            ctx.save();
            const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R + wob);
            g.addColorStop(0, 'rgba(219, 234, 254, 0.28)');
            g.addColorStop(0.75, 'rgba(96, 165, 250, 0.12)');
            g.addColorStop(1, 'rgba(96, 165, 250, 0.4)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, R + wob, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.85)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        if (p.breakT > 0) {
            // the bubble shatters: shards fly out and fade
            const k = 1 - p.breakT / 0.35;
            ctx.save();
            ctx.strokeStyle = `rgba(191, 219, 254, ${1 - k})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let n = 0; n < 10; n++) {
                const a = n * Math.PI / 5 + 0.2, r0 = R * (0.9 + 0.6 * k), r1 = r0 + 10;
                ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
                ctx.lineTo(cx + Math.cos(a + 0.15) * r1, cy + Math.sin(a + 0.15) * r1);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // For the HUD (hud.js): the ring icon, and whether a power-up in its last seconds blinks off now
    p.icon = icon;
    p.blinkOff = blinkOff;

    return p;
}

export { PX_PER_M };
