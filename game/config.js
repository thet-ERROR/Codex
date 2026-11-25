// game/config.js — RAM RUSH's numbers that balance the game, in one place. Changing the feel of a
// power-up (or later an enemy) means changing a number here, not code.

// The world scrolls in px; distances the player reads (and the spacing of pickups) are in metres
export const PX_PER_M = 30;          // the road moves 300 px/s = 10 m/s

// Power-ups (plan §4b). mults multiply the hero's stats while it is on; picking up the same one again
// only refills its time (no stacking). The colour is its icon's and its glow's; label is the word under
// the pickup. dropChance: from a fallen enemy; road: how often it is the one on the road (a weight).
export const POWERUPS = {
    xmp: {
        name: 'XMP / EXPO', label: 'XMP',
        duration: 10,                 // s
        mults: { speedMult: 1.6, rofMult: 0.6, damageMult: 1.5 },   // throw speed, time between throws, damage
        color: '#22d3ee',
        dropChance: 0.08,             // from an enemy (step 6)
        road: 3,
        mhz: [3200, 6000]             // the HUD meter: from, to (only for show)
    },
    // a shield that takes the next hit for him, then breaks
    cooling: {
        name: 'Liquid Cooling', label: 'COOLING',
        duration: 8,
        mults: {},
        shield: 1,                    // hits it takes
        breakSafe: 0.8,               // s he is safe after it breaks (so the same blow does not land at once)
        color: '#60a5fa',
        dropChance: 0.06,
        road: 2
    },
    // the drone fires by itself at the nearest enemy ahead of it
    drone: {
        name: 'Drone Assist', label: 'DRONE',
        duration: 8,
        mults: {},
        color: '#a3e635',
        dropChance: 0.05,
        road: 2,
        every: 0.8,                   // s between its shots
        range: 620,                   // px: how far from the drone it looks for a target
        speed: 1000,                  // px/s of its bolt
        damage: 1
    }
};
export const POWERUP_WARN = 2;       // s: the last seconds blink
// However many things multiply a stat later (upgrades × power-up), it never goes past these
export const STAT_CAPS = { speedMult: [0.5, 2.2], rofMult: [0.4, 2], damageMult: [0.5, 2.5] };

// Pickups on the road
export const PICKUPS = {
    gapM: [400, 700],                 // metres between two, never closer than the first number
    heights: [70, 175],               // px above the road: reached running, or with a jump
    radius: 22
};

// XP and levels (plan §4, step 7), per run. To go from level L to the next: base × L^power XP.
// XP comes from the enemies and parries (their numbers above / below) and perM for each metre run.
export const XP = { base: 100, power: 1.5, perM: 0.1 };
// Each level up raises his RAM one tier: its damage multiplies the throws (under XMP's, and the result
// stays inside STAT_CAPS). The last tier holds for every level after it.
export const RAM_TIERS = [
    { name: 'DDR3', damage: 1 },
    { name: 'DDR4', damage: 1.25 },
    { name: 'DDR5', damage: 1.5 },
    { name: 'DDR5-6400', damage: 1.75 },
    { name: 'DDR5-8000', damage: 2 }
];

// The hero's life (plan §6, §5b)
export const HERO = {
    maxHp: 3,                         // hearts: 1 each; the HUD lays out up to 5
    invuln: 1.2                       // s of safety after a hit; he blinks meanwhile
};

// Enemies (plan §6). Each one's numbers live here; enemies.js only reads them. The hitbox is a share of
// the drawn sprite (smaller, so a touch is a fair one).
export const ENEMIES = {
    orangeBot: {
        hp: 2, speed: 70,             // px/s it walks toward the hero, on top of the road's own scroll
        damage: 1, score: 10, xp: 5,
        scale: 0.8,                   // the frames are ~111px tall: drawn ~89px, about 2/3 of the hero
        hitbox: 0.7,
        frameTime: 0.14,              // s per walk frame
        behaviour: 'walk',
        anims: { walk: 'orangeBot.walk', curl: 'orangeBot.curl', ball: 'orangeBot.ball' },
        attack: 'roll',               // its own attack (plan §5b), in ATTACKS below
        eye: [0.34, 0.61]             // where its eye glows in the warning (share of the curl frame)
    },
    blueRunner: {
        hp: 2, speed: 120,            // a runner: faster than the Orange Bot
        damage: 1, score: 20, xp: 10,
        scale: 0.7,                   // the frames are 170px tall: drawn ~119px, about the hero's height
        hitbox: 0.7, hitboxW: 0.45,   // its arms and legs stretch wide: the box is narrower than tall
        frameTime: 0.1,
        behaviour: 'run',
        anims: { walk: 'blueRunner.run', crouch: 'blueRunner.run', charge: 'blueRunner.charge' },
        attack: 'charge',
        eye: [0.25, 0.25]             // its visor (share of the run frame)
    },
    spyDrone: {
        hp: 1, speed: 90,
        damage: 1, score: 15, xp: 8,
        scale: 0.6,                   // the frames are 155×115: drawn ~93×69
        hitbox: 0.65,
        frameTime: 0.06,              // the propellers: they spin whatever it does
        loop: true,
        behaviour: 'fly',
        fly: 150,                     // px above the road it flies (its bottom): over the hero's head
        anims: { walk: 'spyDrone.fly' },
        attack: 'laser',
        eye: [0.36, 0.55]             // its red eye (share of the frame): where the laser leaves from
    },
    fireCrawler: {
        hp: 2, speed: 60,             // slow, low, burning
        damage: 1, score: 25, xp: 12,
        scale: 0.7,                   // the frames are 170×115: drawn ~119×80
        hitbox: 0.7,
        frameTime: 0.09,
        behaviour: 'crawl',
        anims: { walk: 'fireCrawler.crawl' },
        attack: 'spikes',
        eye: [0.26, 0.57]
    },
    // The mini-boss (plan §6, §5b): walks in, holds its ground at holdX, and fires its cannons again and
    // again until it is down. Out of the hero's reach: only RAMs settle it.
    mechBoss: {
        hp: 16, speed: 160,           // px/s it walks in, on screen
        damage: 2, score: 200, xp: 100,
        scale: 0.75,                  // the frames are ~223–241px tall: drawn ~170–180px, well over the hero
        hitbox: 0.6, hitboxW: 0.5,
        frameTime: 0.16,
        behaviour: 'boss', boss: true,
        holdX: 760,                   // where it stands and fights (the hero goes no further than 620)
        anims: { walk: 'mechBoss.walk', charge: 'mechBoss.charge', fire: 'mechBoss.fire', stunned: 'mechBoss.stunned' },
        attack: 'beam',
        muzzle: [0.24, 0.22]          // its front cannon's mouth (share of the charge frame): where the beam leaves
    }
};

// The enemies' attacks (plan §5b): PATROL → TELEGRAPH → ATTACK → RECOVER. The warning always lasts long
// enough to react to; after the attack the enemy is open for a while.
export const ATTACKS = {
    // Orange Bot: curls up, then bounces toward the hero as a ball. The armoured ball only takes a RAM
    // while it touches the road; in the air the RAMs glance off it.
    roll: {
        chance: 0.75,                 // how many Orange Bots attack at all (the rest only walk)
        triggerAhead: [430, 620],     // px ahead of the hero where it curls up
        telegraph: 0.5,               // s curled up, the eye blinking
        hops: [2, 3],                 // bounces, at random
        hopT: 0.42,                   // s per bounce
        hopH: 135,                    // px high, the first one; each next is a little lower
        hopDecay: 0.12,
        landBehind: 80,               // px past the hero where the last bounce lands
        minSpeed: 220,                // px/s on screen, however close it already was
        vulnerableBelow: 24,          // px off the road: only then can a RAM hurt it
        recover: 0.6,                 // s it lies curled after the last bounce, open to RAMs
        spin: 9,                      // rad/s while rolling
        damage: 1
    },
    // Blue Runner: stops and crouches, its visor turns red and speed lines gather, then it charges at
    // three times its speed. Jump over it, or a RAM stops the charge (and it staggers, open).
    charge: {
        chance: 0.8,
        triggerAhead: [420, 600],
        telegraph: 0.6,               // s crouched, the visor red
        speed: 3,                     // × its run speed, on top of the road (on screen ~660 px/s)
        pastHero: 220,                // px past the hero where the charge runs out
        maxT: 1.4,                    // s at most, wherever the hero is
        recover: 0.7,                 // s it stands panting after, open to RAMs
        knock: 40,                    // px a RAM that stops the charge throws it back
        damage: 1
    },
    // Spy Drone: stops in the air, its eye charges (a red dot that grows, a thin aiming line on the hero),
    // the aim locks a moment before it fires a straight laser. Slide under it, jump, step aside, or RAM it
    // first.
    laser: {
        chance: 0.85,
        triggerAhead: [380, 560],
        telegraph: 0.7,               // s the eye charges
        lock: 0.25,                   // s before firing the aim stops following the hero: the time to dodge
        aimAt: 0.2,                   // where on the hero it aims, from the top: his head, so a slide passes under
        fire: 0.35,                   // s the beam lasts
        width: 14,                    // px, the beam (what hurts)
        length: 1200,
        recover: 0.6,
        damage: 1
    },
    // Fire Crawler: stops, and the road cracks and glows orange where spikes will come up, in a row ahead
    // of the hero; then they burst out and stay a while, riding the road toward him. Jump them (the row is
    // long: a double jump, or step forward); a slide does not help. They are part of the road: RAMs do
    // nothing to them, and they hurt no enemy.
    spikes: {
        chance: 0.85,
        triggerAhead: [420, 620],
        telegraph: 0.6,               // s the cracks glow
        count: 3,
        erupt: 220,                   // px ahead of the hero the first spike comes up, at any speed: the crack
                                      // opens that much further on as the road runs during the warning, and
                                      // the road brings them to him (seen coming: time to jump)
        gap: 50,                      // px between two
        rise: 0.12,                   // s to come up
        stay: 1.5,                    // s up
        sink: 0.2,                    // s back down
        scale: 0.6,                   // the frames are up to 112px tall: ~67px
        hitbox: [0.6, 0.7],           // share of the drawn frame: width, height (from the road up)
        recover: 1.4,                 // s it stays while its spikes are up, open to RAMs; then it crawls on
        damage: 1
    },
    // Malware Core: its cannons glow magenta and a warning line shows where the beam will go, high (slide
    // under it) or low (jump it), in turn; then a thick beam. (Parry comes next.)
    beam: {
        chance: 1,
        telegraph: 0.9,               // s: the cannons charge (the laser_charge sound is as long)
        fire: 0.5,                    // s the beam lasts
        recover: 0.8,
        cooldown: 1.4,                // s between the end of one and the warning of the next
        first: 0.8,                   // s after it takes its place before the first
        lanes: { high: 100, low: 28 },   // px above the road where the beam crosses the hero
        width: 30,
        length: 1400,
        damage: 2
    }
};
// Parry (plan §5b): E or the right mouse button (on a touch screen, the button at the bottom right).
// Pressed in the last WINDOW seconds before the boss's beam: the shot never comes, the boss is stunned
// (RAMs hurt it STUN_MULT times), a short freeze, a flash, bonus XP. Pressed at any other time: the parry
// rests for COOLDOWN, so it cannot be spammed. Parry alone never kills it: it does no damage.
export const PARRY = {
    window: 0.25,
    cooldown: 1,
    stun: 1.5,
    stunMult: 2,
    hitStop: 0.08,
    xp: 20,
    button: { x: 888, y: 440, r: 46, hit: 80 }   // the touch button, in the game's 960×540 (hit: its reach)
};
// The hearts (plan §8c.3): how long they shake when he loses one, pop when he gains one, and the pace of
// the pulse of the last heart (turns per second). With reduced motion none of them moves: only colours change.
export const HEARTS = { shake: 0.3, pop: 0.3, popScale: 1.3, pulse: 0.8, spacing: 32, radius: 11 };
// The XP bar (plan §8c.4), under the hearts: where, how big, how fast it fills; the LEVEL UP! banner's time
// and the bar's flash. A level up fills it to the end first, then it starts again from the rest.
export const XP_BAR = { x: 19, y: 50, w: 170, h: 14, fill: 8, color: '#d946ef', banner: 1.2, flash: 0.25 };
// The pause button (plan §8c.2), top right of the world: its size in the game's 960×540, and the least its
// reach may be on the screen in CSS px (a finger needs 44), whatever the size the canvas is shown at.
export const PAUSE_BUTTON = { x: 927, y: 33, size: 34, minHit: 44 };
export const DIRECTOR = {
    rest: 0.8                         // s after one attack ends before another may start (one at a time)
};

// What comes, and when. Zones every zoneM metres; each zone lists who may appear in it (the last entry
// holds for every later zone). Spawns never closer than gapM[0] metres, and not before firstM.
export const SPAWNS = {
    firstM: 60,
    gapM: [25, 45],
    zoneM: 500,
    // from 500 m one in three a Blue Runner; from 1000 m the Spy Drones too
    zones: [['orangeBot'], ['orangeBot', 'orangeBot', 'blueRunner'], ['orangeBot', 'orangeBot', 'blueRunner', 'spyDrone'],
        ['orangeBot', 'blueRunner', 'spyDrone', 'fireCrawler']],      // from 1500 m the Fire Crawlers
    pool: 6,
    boss: { firstM: 1000, everyM: 1000 },   // a Malware Core every 1000 m; while it stands, nothing else comes
    spikes: 6                       // spikes on the road at once (two rows)
};
export const HIT_FLASH = 0.08;

// Difficulty (plan §5, step 8): over the first rampM metres the road speeds up and the enemies come closer
// together, then it holds (the zones above bring the new kinds). Every warning stays as long in seconds,
// and the spikes keep their distance whatever the speed, so it gets faster, never unfair.
export const DIFFICULTY = {
    speed: [300, 450],                // px/s of the road: at the start, at its fastest
    rampM: 3000,
    gapScale: [1, 0.75]               // × the metres between two enemies (SPAWNS.gapM)
};
// How hard it is at distM metres: { speed, gapScale }; one object, reused
const level = { speed: 0, gapScale: 1 };
export function difficulty(distM) {
    const k = Math.min(1, Math.max(0, distM / DIFFICULTY.rampM));
    level.speed = DIFFICULTY.speed[0] + (DIFFICULTY.speed[1] - DIFFICULTY.speed[0]) * k;
    level.gapScale = DIFFICULTY.gapScale[0] + (DIFFICULTY.gapScale[1] - DIFFICULTY.gapScale[0]) * k;
    return level;
}        // s an enemy shows white when hit
