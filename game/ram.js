// game/ram.js — the hero's weapon: RAM sticks thrown ahead (RAM RUSH, step 5).
//
// A throw flies straight ahead, or toward where the visitor clicked or tapped on the world (only forward, at
// most THROW_CONE either side). In flight a light auto-aim bends it toward the nearest target ahead of it,
// within AIM_CONE of where it is heading, by at most AIM_TURN a second: it helps, it never chases. A stick
// spins as it flies and leaves a purple glow behind; it is drawn in code (board, black chips, gold
// contacts), no image. A fixed pool: nothing is created while the game runs.
//
// The numbers are in one place (STATS) so the power-ups (XMP: faster, more often, harder) and the upgrades
// can multiply them later.

export const STATS = {
    speed: 900,        // px/s
    cooldown: 0.4,     // s between throws
    damage: 1,
    range: 1100        // px a stick flies before it is spent
};
const POOL = 8;
const THROW_CONE = 35 * Math.PI / 180;   // how far up or down a click may send it
const AIM_CONE = 30 * Math.PI / 180;     // auto-aim looks this far either side of the heading
const AIM_RANGE = 520;                   // … and this far ahead
const AIM_TURN = 2.4;                    // rad/s at most
const SPIN = 13;                         // rad/s
const TRAIL = 11;                        // points in the glow trail
const W = 960, H = 540;

export function createRams() {
    const pool = Array.from({ length: POOL }, () => ({
        on: false, x: 0, y: 0, vx: 0, vy: 0, a: 0, flown: 0, damage: 0,
        trail: Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 })), tn: 0
    }));
    const r = { cooldown: 0, thrown: 0 };

    // Throws one from (x, y), straight or toward (tx, ty). False while cooling down or with no stick free.
    r.throw = (x, y, tx, ty, mult = {}) => {
        if (r.cooldown > 0) return false;
        const s = pool.find(p => !p.on);
        if (!s) return false;
        let ang = 0;
        if (tx !== undefined && tx > x) ang = Math.max(-THROW_CONE, Math.min(THROW_CONE, Math.atan2(ty - y, tx - x)));
        const v = STATS.speed * (mult.speed || 1);
        Object.assign(s, { on: true, x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: 0, flown: 0, tn: 0,
            damage: STATS.damage * (mult.damage || 1) });
        r.cooldown = STATS.cooldown * (mult.cooldown || 1);
        r.thrown++;
        return true;
    };

    // targets: [{ x, y }] centres of what may be hit (the enemies, from step 6)
    r.update = (dt, targets = []) => {
        r.cooldown = Math.max(0, r.cooldown - dt);
        for (const s of pool) {
            if (!s.on) continue;
            const v = Math.hypot(s.vx, s.vy);
            let heading = Math.atan2(s.vy, s.vx);
            let best = null, bestD = AIM_RANGE;
            for (const t of targets) {
                const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy);
                if (dx <= 0 || d >= bestD) continue;
                let off = Math.atan2(dy, dx) - heading;
                off = Math.atan2(Math.sin(off), Math.cos(off));
                if (Math.abs(off) > AIM_CONE) continue;
                best = off; bestD = d;
            }
            if (best !== null) {
                heading += Math.max(-AIM_TURN * dt, Math.min(AIM_TURN * dt, best));
                s.vx = Math.cos(heading) * v; s.vy = Math.sin(heading) * v;
            }
            // the glow trail: a ring of the last few positions
            const p = s.trail[s.tn % TRAIL]; p.x = s.x; p.y = s.y; s.tn++;
            s.x += s.vx * dt; s.y += s.vy * dt;
            s.flown += v * dt;
            s.a += SPIN * dt;
            if (s.flown > STATS.range || s.x > W + 60 || s.y < -60 || s.y > H + 60) s.on = false;
        }
    };

    // Step 6: the first live stick inside the box is spent on it; returns its damage, or 0
    r.hit = (box) => {
        for (const s of pool) {
            if (s.on && s.x > box.x - 10 && s.x < box.x + box.w + 10 && s.y > box.y - 6 && s.y < box.y + box.h + 6) {
                s.on = false;
                return s.damage;
            }
        }
        return 0;
    };

    r.active = () => pool.filter(s => s.on).map(s => ({ x: s.x, y: s.y, vx: s.vx, vy: s.vy }));
    r.clear = () => { for (const s of pool) s.on = false; r.cooldown = 0; };

    r.draw = (ctx) => {
        for (const s of pool) {
            if (!s.on) continue;
            // the trail first, under the stick: oldest faintest. Added light ('lighter'), so it glows even
            // over the purple sky, where a plain purple was lost
            const n = Math.min(s.tn, TRAIL);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let k = 0; k < n; k++) {
                const p = s.trail[(s.tn - 1 - k) % TRAIL];
                const f = 1 - k / TRAIL;
                ctx.fillStyle = `rgba(217, 70, 239, ${0.6 * f})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3 + 8 * f, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.a);
            ctx.scale(1.2, 1.2);
            ctx.shadowColor = 'rgba(217, 70, 239, 1)';
            ctx.shadowBlur = 14;
            // the board
            ctx.fillStyle = '#17803f';
            ctx.fillRect(-23, -7, 46, 14);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#0b4d25';
            ctx.lineWidth = 1;
            ctx.strokeRect(-23, -7, 46, 14);
            // four black chips
            ctx.fillStyle = '#111318';
            for (let c = 0; c < 4; c++) ctx.fillRect(-20 + c * 10.5, -5, 8, 6);
            // the gold contacts along the edge, with the notch
            ctx.fillStyle = '#e3b341';
            ctx.fillRect(-21, 3, 42, 3);
            ctx.fillStyle = '#17803f';
            ctx.fillRect(-3, 3, 2, 4);
            ctx.restore();
        }
    };

    return r;
}
