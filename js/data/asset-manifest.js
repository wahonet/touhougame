export const CHARACTER_IDS = [
    'reimu',
    'marisa',
    'yuyuko',
    'youmu',
    'sanae',
    'flandre',
    'sakuya',
    'reisen',
    'cirno',
    'yukari',
    'suwako',
    'kaguya'
];
export const PORTRAIT_EXPRESSIONS = ['normal', 'happy', 'angry', 'sad'];
export const ACTION_FRAME_LIMITS = {
    walk: 8,
    attack: 4
};

export const SFX_FILES = [
    'sfx_hit',
    'sfx_skill',
    'sfx_damage',
    'sfx_death',
    'sfx_jump',
    'sfx_land',
    'sfx_pickup',
    'sfx_shield',
    'sfx_laser',
    'sfx_click',
    'sfx_ready',
    'sfx_seal',
    'sfx_stars',
    'sfx_gameover'
];

export const EFFECT_FRAME_SETS = {
    spellcard: {
        pattern: index => `assets/effects/spellcard_${index}.png`,
        count: 4
    },
    star: {
        pattern: index => `assets/effects/star_${index}.png`,
        count: 4
    },
    seal: {
        pattern: index => `assets/effects/seal_${index}.png`,
        count: 4
    },
    reimuDreamSealRelease: {
        pattern: index => `assets/effects/reimu_dream_seal_release_${index}.png`,
        count: 8
    },
    reimuDoubleBarrierRelease: {
        pattern: index => `assets/effects/reimu_double_barrier_release_${index}.png`,
        count: 8
    },
    reimuYinYangOrbRelease: {
        pattern: index => `assets/effects/reimu_yin_yang_orb_release_${index}.png`,
        count: 8
    },
    reimuBindingCircleRelease: {
        pattern: index => `assets/effects/reimu_binding_circle_release_${index}.png`,
        count: 8
    }
};
