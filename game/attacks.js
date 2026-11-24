// game/attacks.js — the enemies' own attacks (RAM RUSH, plan §5b). Each one is a small state machine:
//
//   PATROL ──(in range, the director says yes)──▶ TELEGRAPH ──▶ ATTACK ──▶ RECOVER ──▶ PATROL
//
// TELEGRAPH is the warning (never under 0.5 s, with a clear sign), so every attack can be dodged;
// RECOVER is the opening after it. The director lets only one enemy attack at a time, with a short rest
// between two, so the screen never turns into a mess. All the numbers are in config.js (ATTACKS).
//
// An attack only moves its enemy (x, height above the road, spin) and says when it may be hurt; touching
// the hero, the RAMs and the drawing stay in enemies.js.

import { ATTACKS, DIRECTOR } from './config.js';
import { GROUND } from './hero.js';

export const PATROL = 'patrol', TELEGRAPH = 'telegraph', ATTACK = 'attack', RECOVER = 'recover';

export function createDirector() {
    const d = { holder: null, rest: 0 };
    d.update = (dt) => { d.rest = Math.max(0, d.rest - dt); };
    d.free = () => !d.holder && d.rest <= 0;
    d.claim = (s) => { if (!d.free()) return false; d.holder = s; return true; };
    d.release = (s) => { if (d.holder === s) { d.holder = null; d.rest = DIRECTOR.rest; } };
    d.clear = () => { d.holder = null; d.rest = 0; };
    return d;
}

// The Orange Bot's Roll & Bounce. s: the enemy; ctx: { dt, scroll, heroX, rng, director }.
// Returns true on the frame a bounce touches down (for the dust puff).
const roll = {
    cfg: ATTACKS.roll,

    patrol(s, c) {
        s.x -= c.scroll + s.def.speed * c.dt;
        if (!s.attacks || c.heroX === null) return;
        const ahead = s.x - c.heroX;
        if (ahead >= this.cfg.triggerAhead[0] && ahead <= this.cfg.triggerAhead[1] && c.director.claim(s)) {
            s.state = TELEGRAPH; s.st = 0;
        }
    },

    telegraph(s, c) {
        s.x -= c.scroll;                               // curled up, it stays where it is on the road
        if (s.st < this.cfg.telegraph) return;
        const [a, b] = this.cfg.hops;
        s.hops = a + Math.floor(c.rng() * (b - a + 1));
        s.hop = 0; s.st = 0; s.state = ATTACK;
        // fast enough that the last bounce lands just past the hero (where he was when it set off)
        const to = c.heroX === null ? 0 : s.x - c.heroX + this.cfg.landBehind;
        s.vx = Math.max(this.cfg.minSpeed, to / (s.hops * this.cfg.hopT));
    },

    attack(s, c) {
        const cfg = this.cfg;
        s.x -= s.vx * c.dt;                            // on screen speed: it is in the air most of the time
        s.spin -= cfg.spin * c.dt;                     // rolling to the left
        let landed = false;
        if (s.st >= cfg.hopT) { s.st -= cfg.hopT; s.hop++; landed = true; }
        if (s.hop >= s.hops) {
            s.h = 0; s.spin = 0; s.state = RECOVER; s.st = 0;
            c.director.release(s);
            return true;
        }
        const p = s.st / cfg.hopT;
        s.h = 4 * cfg.hopH * (1 - cfg.hopDecay * s.hop) * p * (1 - p);
        return landed;
    },

    recover(s, c) {
        s.x -= c.scroll;
        if (s.st >= this.cfg.recover) { s.state = PATROL; s.st = 0; s.attacks = false; }   // one attack each
    },

    // A RAM hurts it everywhere but in the air as a ball
    vulnerable(s) { return s.state !== ATTACK || s.h < this.cfg.vulnerableBelow; },

    // Which animation shows now (names from config: walk, curl, ball)
    anim(s) { return s.state === ATTACK ? s.def.anims.ball : s.state === PATROL ? s.def.anims.walk : s.def.anims.curl; },

    damage(s) { return s.state === ATTACK ? this.cfg.damage : s.def.damage; },

    hurt() {}                                          // a RAM does not stop a bouncing ball (it glances off)
};

// The Blue Runner's Charge. Crouches with its visor red, then runs at the hero at CHARGE × its speed, on
// past him; a RAM in the charge stops it short, throws it back a little, and it stands open.
const charge = {
    cfg: ATTACKS.charge,

    patrol(s, c) { roll.patrol.call(this, s, c); },   // run on, and in range (with the director's yes) warn

    telegraph(s, c) {
        s.x -= c.scroll;
        if (s.st < this.cfg.telegraph) return;
        s.state = ATTACK; s.st = 0;
        s.goal = (c.heroX === null ? 230 : c.heroX) - this.cfg.pastHero;
    },

    attack(s, c) {
        s.x -= c.scroll + s.def.speed * this.cfg.speed * c.dt;
        if (s.x <= s.goal || s.st >= this.cfg.maxT) this.stop(s, c.director);
        return false;
    },

    stop(s, director) { s.state = RECOVER; s.st = 0; director.release(s); },

    recover(s, c) { roll.recover.call(this, s, c); },

    vulnerable() { return true; },

    anim(s) { return s.state === ATTACK ? s.def.anims.charge : s.state === PATROL ? s.def.anims.walk : s.def.anims.crouch; },

    damage(s) { return s.state === ATTACK ? this.cfg.damage : s.def.damage; },

    hurt(s, c) { if (s.state === ATTACK) { s.x += this.cfg.knock; this.stop(s, c.director); } }
};

// The Spy Drone's Laser. It flies over the hero's head; in range it stops in the air (it holds its place on
// screen, the road goes on under it) and its eye charges, aiming at the hero, following him until LOCK
// before the shot; then a straight beam along that line. What the beam touches is hurt once.
const laser = {
    cfg: ATTACKS.laser,

    patrol(s, c) { roll.patrol.call(this, s, c); },

    telegraph(s, c) {
        // aim: from the eye to the hero's head (a slide goes under it), until the lock
        if (s.st <= this.cfg.telegraph - this.cfg.lock && c.heroBox) {
            const e = c.eyeOf(s), b = c.heroBox;
            const dx = b.x + b.w / 2 - e.x, dy = b.y + b.h * this.cfg.aimAt - e.y, d = Math.hypot(dx, dy) || 1;
            s.ax = dx / d; s.ay = dy / d;
        }
        if (s.st < this.cfg.telegraph) return;
        s.state = ATTACK; s.st = 0; s.zapped = false;
    },

    attack(s, c) {
        if (!s.zapped && c.hero && c.heroBox && beamHits(c.eyeOf(s), s.ax, s.ay, this.cfg, c.heroBox)) {
            if (c.hero.hit(this.cfg.damage)) s.zapped = true;
        }
        if (s.st >= this.cfg.fire) { s.state = RECOVER; s.st = 0; c.director.release(s); }
        return false;
    },

    recover(s, c) { if (s.st >= this.cfg.recover) { s.state = PATROL; s.st = 0; s.attacks = false; } },

    vulnerable() { return true; },
    anim(s) { return s.def.anims.walk; },
    damage(s) { return s.def.damage; },
    hurt() {}                                          // one RAM is the end of it anyway (1 hp)
};

// Does a beam from e along (ax, ay) touch box b? The box grown by half the beam's width, against the ray
// (the slab test): exact, and no points sampled along it.
export function beamHits(e, ax, ay, cfg, b) {
    const r = cfg.width / 2;
    let t0 = 0, t1 = cfg.length;
    for (const [o, d, lo, hi] of [[e.x, ax, b.x - r, b.x + b.w + r], [e.y, ay, b.y - r, b.y + b.h + r]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
        let a = (lo - o) / d, z = (hi - o) / d;
        if (a > z) [a, z] = [z, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, z);
        if (t0 > t1) return false;
    }
    return true;
}

// The Fire Crawler's Spikes. It stops; the cracks open in a row ahead of the hero (enemies.js keeps the
// spikes: they belong to the road, and outlive it); when the warning is over they burst out. It stays
// while they are up, then moves on.
const spikes = {
    cfg: ATTACKS.spikes,

    patrol(s, c) { roll.patrol.call(this, s, c); },

    telegraph(s, c) {
        s.x -= c.scroll;
        if (!s.placed) { s.placed = true; c.spikes.place(s, c.heroX === null ? 230 : c.heroX); }
        if (s.st >= this.cfg.telegraph) { s.state = ATTACK; s.st = 0; }
    },

    attack(s, c) {
        s.x -= c.scroll;
        if (s.st >= this.cfg.rise) { s.state = RECOVER; s.st = 0; }
        return false;
    },

    // it lets the next attack come only once its spikes have had their time (one at a time)
    recover(s, c) {
        s.x -= c.scroll;
        if (s.st >= this.cfg.recover) { s.state = PATROL; s.st = 0; s.attacks = false; c.director.release(s); }
    },

    vulnerable() { return true; },
    anim(s) { return s.def.anims.walk; },
    damage(s) { return s.def.damage; },
    hurt() {}
};

// The Malware Core's Beam. It walks in to its place and holds it (the road runs on under it); then, again
// and again until it is down: the cannons charge while a warning line shows the beam's path, high or low
// in turn; the beam; a moment's rest; a cooldown.
const beam = {
    cfg: ATTACKS.beam,

    patrol(s, c) {
        if (s.x > s.def.holdX) { s.x = Math.max(s.def.holdX, s.x - s.def.speed * c.dt); return; }
        s.cool -= c.dt;
        if (s.cool > 0 || c.heroX === null || !c.director.claim(s)) return;
        s.lane = s.lane === 'high' ? 'low' : s.lane === 'low' ? 'high' : (c.rng() < 0.5 ? 'high' : 'low');
        const m = c.muzzleOf(s);
        const dx = c.heroX - m.x, dy = GROUND - this.cfg.lanes[s.lane] - m.y, d = Math.hypot(dx, dy) || 1;
        s.ax = dx / d; s.ay = dy / d;
        s.state = TELEGRAPH; s.st = 0;
    },

    telegraph(s) { if (s.st >= this.cfg.telegraph) { s.state = ATTACK; s.st = 0; s.zapped = false; } },

    attack(s, c) {
        if (!s.zapped && c.hero && c.heroBox && beamHits(c.muzzleOf(s), s.ax, s.ay, this.reach(s, c.muzzleOf(s)), c.heroBox)) {
            if (c.hero.hit(this.cfg.damage)) s.zapped = true;
        }
        if (s.st >= this.cfg.fire) { s.state = RECOVER; s.st = 0; c.director.release(s); }
        return false;
    },

    recover(s) { if (s.st >= this.cfg.recover) { s.state = PATROL; s.st = 0; s.cool = this.cfg.cooldown; } },

    // the beam ends where it meets the road
    reach(s, m) {
        const toRoad = s.ay > 0 ? (GROUND - m.y) / s.ay : this.cfg.length;
        this._reach.width = this.cfg.width; this._reach.length = Math.min(this.cfg.length, toRoad);
        return this._reach;
    },
    _reach: { width: 0, length: 0 },

    vulnerable() { return true; },
    anim(s) { return s.state === TELEGRAPH ? s.def.anims.charge : s.state === ATTACK ? s.def.anims.fire : s.def.anims.walk; },
    damage(s) { return s.def.damage; },
    hurt() {}
};

export const KINDS = { roll, charge, laser, spikes, beam };

// One step of the enemy's machine; returns true when a bounce touched the road
export function step(s, c) {
    const k = KINDS[s.def.attack];
    s.st += c.dt;
    if (!k) { s.x -= c.scroll + s.def.speed * c.dt; return false; }
    if (s.state === PATROL) k.patrol(s, c);
    else if (s.state === TELEGRAPH) k.telegraph(s, c);
    else if (s.state === ATTACK) return k.attack(s, c);
    else if (s.state === RECOVER) k.recover(s, c);
    return false;
}

export const vulnerable = (s) => { const k = KINDS[s.def.attack]; return k ? k.vulnerable(s) : true; };
export const animOf = (s) => { const k = KINDS[s.def.attack]; return k ? k.anim(s) : s.def.anims.walk; };
export const damageOf = (s) => { const k = KINDS[s.def.attack]; return k ? k.damage(s) : s.def.damage; };
// A RAM hit it (and it lives on): what that does to its attack
export const hurt = (s, c) => { const k = KINDS[s.def.attack]; if (k) k.hurt(s, c); };
export const chanceOf = (def) => (ATTACKS[def.attack] ? ATTACKS[def.attack].chance : 0);
