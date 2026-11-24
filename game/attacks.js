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

    damage(s) { return s.state === ATTACK ? this.cfg.damage : s.def.damage; }
};

export const KINDS = { roll };

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
export const chanceOf = (def) => (ATTACKS[def.attack] ? ATTACKS[def.attack].chance : 0);
