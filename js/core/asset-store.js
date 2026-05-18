import { CHARACTER_IDS } from '../data/asset-manifest.js';

function createCharacterMap(factory) {
    return Object.fromEntries(CHARACTER_IDS.map(id => [id, factory(id)]));
}

export const Assets = {
    portraits: createCharacterMap(() => ({})),
    sprites: createCharacterMap(() => ({ left: {}, right: {} })),
    effects: {
        spellcard: [],
        spellcardHit: null,
        laserBeam: null,
        laserHead: null,
        laserCharge: null,
        shield: null,
        star: [],
        seal: [],
        sealHit: null,
        bigLaserBeam: null,
        bigLaserHead: null,
        flyAura: null,
        youmuSpiritSlash: null,
        youmuGhostBlade: null,
        youmuGhostTrail: null,
        youmuSpiritShield: null
    },
    platform: null,
    platformSmall: null,
    pickupCd: null,
    pickupHp: null,
    defeated: createCharacterMap(() => null),
    skillIcons: createCharacterMap(() => [])
};
