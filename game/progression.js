// game/progression.js — RAM RUSH's XP, levels and records (plan §4, step 7).
//
// Per run (decided 2026-11-24): every run starts at level 1 with DDR3. XP comes from the enemies (and a
// perfect parry), counted in enemies.js, plus the distance run; the level follows from the total, with
// xpNeeded(level) = XP.base × level^XP.power to go from that level to the next. Each level up raises the
// hero's RAM one tier (DDR3 → DDR4 → DDR5 → …, in config.js), which makes his throws hit harder; there is
// no choice to make, the game never stops for it.
//
// Only the records outlive a run: best score, best level, longest distance, in localStorage. Every read and
// write is in try/catch (a private window, blocked storage): without it the game plays the same, it only
// forgets.

import { XP, RAM_TIERS } from './config.js';

const KEY = 'ramrush-records';

export const xpNeeded = (level) => Math.round(XP.base * Math.pow(level, XP.power));

export function readRecords() {
    try {
        const r = JSON.parse(localStorage.getItem(KEY) || '{}');
        return { score: +r.score || 0, level: +r.level || 0, distance: +r.distance || 0 };
    } catch { return { score: 0, level: 0, distance: 0 }; }
}

// Keeps whatever of this run beats the record; says which did
export function saveRecords(run) {
    const old = readRecords();
    const beat = { score: run.score > old.score, level: run.level > old.level, distance: run.distance > old.distance };
    const best = {
        score: Math.max(old.score, run.score), level: Math.max(old.level, run.level), distance: Math.max(old.distance, run.distance)
    };
    try { localStorage.setItem(KEY, JSON.stringify(best)); } catch { /* storage refused: the record is only lost */ }
    return { best, beat };
}

export function createProgression() {
    const p = { total: 0, level: 1, into: 0, need: xpNeeded(1), ups: 0 };

    p.tier = () => RAM_TIERS[Math.min(RAM_TIERS.length - 1, p.level - 1)];

    // total: all the XP of this run so far. Returns how many levels it went up by (usually 0, rarely more)
    p.set = (total) => {
        if (total <= p.total) return 0;
        p.total = total;
        let rest = total, level = 1;
        while (rest >= xpNeeded(level)) { rest -= xpNeeded(level); level++; }
        const up = level - p.level;
        p.level = level; p.into = rest; p.need = xpNeeded(level);
        p.ups += up;
        return up;
    };

    // XP of a run: the enemies' (and parries'), and so much per metre run
    p.fromRun = (enemyXp, metres) => enemyXp + Math.floor(metres * XP.perM);

    return p;
}
