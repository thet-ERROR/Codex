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
        anim: 'orangeBot.walk'
    }
};

// What comes, and when. Zones every zoneM metres; each zone lists who may appear in it (the last entry
// holds for every later zone). Spawns never closer than gapM[0] metres, and not before firstM.
export const SPAWNS = {
    firstM: 60,
    gapM: [25, 45],
    zoneM: 500,
    zones: [['orangeBot']],
    pool: 6
};
export const HIT_FLASH = 0.08;        // s an enemy shows white when hit
