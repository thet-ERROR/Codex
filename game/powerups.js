// game/powerups.js — RAM RUSH's power-ups (plan §4b): what is on, the pickups on the road, and their HUD.
//
// One of each kind on at a time: picking up the same again refills its time and adds nothing (no
// stacking). Each is { id, remaining }; its time runs down with the loop, so a pause (P, another tab,
// the game closed) freezes it. The rest of the game reads the effects through one getStat(name), which
// multiplies whatever is on and keeps the result inside STAT_CAPS.
//
// Pickups float over the road at a height reached running or with a jump, scroll with it, and are taken
// by running into them or hitting them with a RAM. Never closer than PICKUPS.gapM[0] metres apart. A small
// fixed pool; icons and glow drawn in code, no images.

import { POWERUPS, POWERUP_WARN, STAT_CAPS, PICKUPS, PX_PER_M } from './config.js';

const W = 960;
const POOL = 3;

export function createPowerups({ rng = Math.random, reducedMotion = false } = {}) {
    const p = {
        active: new Map(),                 // id → { id, remaining }
        nextAtM: PICKUPS.gapM[0] + rng() * (PICKUPS.gapM[1] - PICKUPS.gapM[0]),
        mhz: POWERUPS.xmp.mhz[0],
        taken: 0,
        t: 0
    };
    const pool = Array.from({ length: POOL }, () => ({ on: false, id: '', x: 0, y: 0 }));

    p.activate = (id) => {
        const def = POWERUPS[id];
        if (!def) return;
        const cur = p.active.get(id);
        if (cur) cur.remaining = def.duration;          // the same again: more time, no more effect
        else p.active.set(id, { id, remaining: def.duration });
    };
    p.isOn = (id) => p.active.has(id);
    p.remaining = (id) => (p.active.get(id) || { remaining: 0 }).remaining;

    p.getStat = (name) => {
        let v = 1;
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
            if (p.spawn('xmp', W + 40, 460 - h)) {
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

    p.pickups = () => pool.filter(s => s.on).map(s => ({ id: s.id, x: s.x, y: s.y }));
    p.clear = () => { for (const s of pool) s.on = false; p.active.clear(); };

    // the last POWERUP_WARN seconds blink (not with reduced motion)
    const blinkOff = (remaining) => !reducedMotion && remaining < POWERUP_WARN && Math.floor(p.t * 8) % 2 === 0;

    // A small RAM stick in a ring: the pickup in the world, and the icon in the HUD
    function icon(ctx, x, y, r, color) {
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
        const s = r / 22;
        ctx.fillStyle = '#17803f';
        ctx.fillRect(-14 * s, -6 * s, 28 * s, 11 * s);
        ctx.fillStyle = '#111318';
        for (let c = 0; c < 3; c++) ctx.fillRect((-12 + c * 8.5) * s, -4 * s, 6 * s, 5 * s);
        ctx.fillStyle = '#e3b341';
        ctx.fillRect(-13 * s, 2.5 * s, 26 * s, 2.5 * s);
        ctx.restore();
    }

    p.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            const bob = reducedMotion ? 0 : Math.sin(p.t * 3 + s.x * 0.01) * 5;
            icon(ctx, s.x, s.y + bob, PICKUPS.radius, POWERUPS[s.id].color);
            ctx.save();
            // white with a dark edge: a cyan label vanished against the cyan clouds
            ctx.font = '800 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(13, 12, 29, 0.85)';
            ctx.strokeText('XMP', s.x, s.y + bob + PICKUPS.radius + 15);
            ctx.fillStyle = '#f1f0f7';
            ctx.fillText('XMP', s.x, s.y + bob + PICKUPS.radius + 15);
            ctx.restore();
        }
    };

    // The aura around the hero while XMP is on: a soft cyan glow
    p.drawAura = (ctx, box) => {
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

    // Top left: each power-up on, its icon and a bar that empties; under XMP the MHz meter
    p.drawHud = (ctx) => {
        let y = 34;
        for (const a of p.active.values()) {
            const def = POWERUPS[a.id];
            if (!blinkOff(a.remaining)) icon(ctx, 34, y, 18, def.color);
            ctx.fillStyle = 'rgba(13, 12, 29, 0.7)';
            ctx.fillRect(60, y - 5, 120, 10);
            ctx.fillStyle = def.color;
            ctx.fillRect(60, y - 5, 120 * Math.max(0, a.remaining / def.duration), 10);
            ctx.font = '700 12px system-ui, sans-serif';
            ctx.fillStyle = '#f1f0f7';
            ctx.textAlign = 'left';
            ctx.fillText(def.name, 60, y - 10);
            y += 46;
        }
        if (p.isOn('xmp') || p.mhz > POWERUPS.xmp.mhz[0] + 5) {
            ctx.font = '800 15px ui-monospace, monospace';
            ctx.fillStyle = POWERUPS.xmp.color;
            ctx.textAlign = 'left';
            ctx.fillText(`${Math.round(p.mhz)} MHz`, 60, y - 18);
        }
    };

    return p;
}

export { PX_PER_M };
