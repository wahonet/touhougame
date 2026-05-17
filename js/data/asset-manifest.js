export const CHARACTER_IDS = [
    'reimu',
    'marisa',
    'yuyuko',
    'youmu',
    'sanae',
    'flandre',
    'sakuya',
    'reisen'
];
export const PORTRAIT_EXPRESSIONS = ['normal', 'happy', 'angry', 'sad'];

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
        pattern: index => `assets/spellcard_${index}.png`,
        count: 4
    },
    star: {
        pattern: index => `assets/star_${index}.png`,
        count: 4
    },
    seal: {
        pattern: index => `assets/seal_${index}.png`,
        count: 4
    }
};
