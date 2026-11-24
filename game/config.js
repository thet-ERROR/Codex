// game/config.js — RAM RUSH's numbers that balance the game, in one place. Changing the feel of a
// power-up (or later an enemy) means changing a number here, not code.

// The world scrolls in px; distances the player reads (and the spacing of pickups) are in metres
export const PX_PER_M = 30;          // the road moves 300 px/s = 10 m/s

// Power-ups (plan §4b). mults multiply the hero's stats while it is on; picking up the same one again
// only refills its time (no stacking). The colour is its icon's and its glow's.
export const POWERUPS = {
    xmp: {
        name: 'XMP / EXPO',
        duration: 10,                 // s
        mults: { speedMult: 1.6, rofMult: 0.6, damageMult: 1.5 },   // throw speed, time between throws, damage
        color: '#22d3ee',
        dropChance: 0.08,             // from an enemy (step 6)
        mhz: [3200, 6000]             // the HUD meter: from, to (only for show)
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

// The hero's life (plan §6, §5b)
export const HERO = {
    maxHp: 3,
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
        ahead: 400,                   // px ahead of the hero the first crack opens: they come up ~220px ahead
                                      // of him, and the road brings them to him (seen coming: time to jump)
        gap: 50,                      // px between two
        rise: 0.12,                   // s to come up
        stay: 1.5,                    // s up
        sink: 0.2,                    // s back down
        scale: 0.6,                   // the frames are up to 112px tall: ~67px
        hitbox: [0.6, 0.7],           // share of the drawn frame: width, height (from the road up)
        recover: 1.4,                 // s it stays while its spikes are up, open to RAMs; then it crawls on
        damage: 1
    }
};
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
    spikes: 6                       // spikes on the road at once (two rows)
};
export const HIT_FLASH = 0.08;        // s an enemy shows white when hit
