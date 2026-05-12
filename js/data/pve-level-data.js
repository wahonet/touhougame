/**
 * PvE Level Data — Side-scrolling stage layout
 * Inspired by Contra/Metal Slug progression
 */

export const PVE_LEVEL_WIDTH = 8000;
export const PVE_LEVEL_END_X = 7500; // Victory trigger position

/**
 * Platform layout for PvE level
 * { x, y, w, h, type }
 */
export const PVE_PLATFORMS = [
    // Section 1: Intro area (0 - 1500) — flat ground, easy enemies
    { x: 300,  y: 460, w: 192, h: 48, type: 'large' },
    { x: 700,  y: 400, w: 128, h: 36, type: 'small' },
    { x: 1100, y: 430, w: 192, h: 48, type: 'large' },

    // Section 2: Gap jumps (1500 - 3000) — need platforming
    { x: 1600, y: 500, w: 96,  h: 36, type: 'small' },
    { x: 1850, y: 460, w: 96,  h: 36, type: 'small' },
    { x: 2100, y: 420, w: 128, h: 36, type: 'small' },
    { x: 2400, y: 460, w: 192, h: 48, type: 'large' },
    { x: 2700, y: 380, w: 128, h: 36, type: 'small' },

    // Section 3: Cave area (3000 - 5000) — dense enemies
    { x: 3100, y: 460, w: 192, h: 48, type: 'large' },
    { x: 3400, y: 400, w: 128, h: 36, type: 'small' },
    { x: 3700, y: 350, w: 192, h: 48, type: 'large' },
    { x: 4000, y: 300, w: 128, h: 36, type: 'small' },
    { x: 4200, y: 440, w: 192, h: 48, type: 'large' },
    { x: 4500, y: 380, w: 128, h: 36, type: 'small' },
    { x: 4800, y: 460, w: 192, h: 48, type: 'large' },

    // Section 4: Vertical section (5000 - 6500) — mixed threats
    { x: 5100, y: 500, w: 128, h: 36, type: 'small' },
    { x: 5350, y: 440, w: 128, h: 36, type: 'small' },
    { x: 5600, y: 380, w: 192, h: 48, type: 'large' },
    { x: 5900, y: 320, w: 128, h: 36, type: 'small' },
    { x: 6100, y: 400, w: 192, h: 48, type: 'large' },
    { x: 6400, y: 460, w: 128, h: 36, type: 'small' },

    // Section 5: Boss arena (6500 - 8000) — open area
    { x: 6700, y: 430, w: 192, h: 48, type: 'large' },
    { x: 7000, y: 370, w: 128, h: 36, type: 'small' },
    { x: 7300, y: 430, w: 192, h: 48, type: 'large' }
];

/**
 * Enemy spawn points
 * { type, x, y, patrolLeft, patrolRight }
 * y: 'ground' = walk on ground, or a specific Y value
 */
export const PVE_ENEMY_SPAWNS = [
    // Section 1: Easy slimes + skullmen
    { type: 'slime', x: 500,  y: 'ground', patrolLeft: 350,  patrolRight: 650 },
    { type: 'skullman', x: 900,  y: 'ground', patrolLeft: 750,  patrolRight: 1050 },
    { type: 'slime', x: 1300, y: 'ground', patrolLeft: 1150, patrolRight: 1400 },

    // Section 2: Mix of slimes + skullmen + bats
    { type: 'skullman', x: 1700, y: 'ground', patrolLeft: 1550, patrolRight: 1800 },
    { type: 'bat',   x: 2000, y: 320,      patrolLeft: 1800, patrolRight: 2200 },
    { type: 'slime', x: 2300, y: 'ground', patrolLeft: 2100, patrolRight: 2500 },
    { type: 'bat',   x: 2600, y: 300,      patrolLeft: 2400, patrolRight: 2800 },
    { type: 'skullman', x: 2850, y: 'ground', patrolLeft: 2700, patrolRight: 2950 },

    // Section 3: Skeletons + skullmen appear
    { type: 'skeleton', x: 3200, y: 'ground', patrolLeft: 3050, patrolRight: 3350 },
    { type: 'bat',      x: 3500, y: 300,      patrolLeft: 3300, patrolRight: 3700 },
    { type: 'skullman', x: 3800, y: 'ground', patrolLeft: 3600, patrolRight: 3900 },
    { type: 'skeleton', x: 4100, y: 'ground', patrolLeft: 3950, patrolRight: 4250 },
    { type: 'bat',      x: 4400, y: 280,      patrolLeft: 4200, patrolRight: 4600 },
    { type: 'skullman', x: 4600, y: 'ground', patrolLeft: 4450, patrolRight: 4750 },
    { type: 'skeleton', x: 4900, y: 'ground', patrolLeft: 4750, patrolRight: 5050 },

    // Section 4: Dense combat
    { type: 'skeleton', x: 5200, y: 'ground', patrolLeft: 5050, patrolRight: 5350 },
    { type: 'bat',      x: 5400, y: 300,      patrolLeft: 5200, patrolRight: 5600 },
    { type: 'slime',    x: 5550, y: 'ground', patrolLeft: 5400, patrolRight: 5700 },
    { type: 'skeleton', x: 5800, y: 'ground', patrolLeft: 5600, patrolRight: 5900 },
    { type: 'bat',      x: 6100, y: 280,      patrolLeft: 5900, patrolRight: 6200 },
    { type: 'skeleton', x: 6300, y: 'ground', patrolLeft: 6100, patrolRight: 6450 },

    // Section 5: Boss arena — minions + boss
    { type: 'skeleton', x: 6800, y: 'ground', patrolLeft: 6650, patrolRight: 6950 },
    { type: 'bat',      x: 7100, y: 300,      patrolLeft: 6950, patrolRight: 7200 },
    { type: 'boss',     x: 7600, y: 'ground', patrolLeft: 7100, patrolRight: 7900 }
];

/** Spawn trigger zones — enemies spawn when player enters these zones */
export const PVE_SPAWN_ZONES = [
    { triggerX: 300,  spawnIndices: [0, 1, 2] },       // Section 1
    { triggerX: 1500, spawnIndices: [3, 4, 5, 6, 7] }, // Section 2
    { triggerX: 3000, spawnIndices: [8, 9, 10, 11, 12, 13, 14] }, // Section 3
    { triggerX: 5000, spawnIndices: [15, 16, 17, 18, 19, 20] }, // Section 4
    { triggerX: 6500, spawnIndices: [21, 22, 23] }      // Boss
];
