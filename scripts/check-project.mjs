import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHARACTER_IDS, EFFECT_FRAME_SETS, SFX_FILES } from '../js/data/asset-manifest.js';
import { CHARACTER_DEFINITIONS } from '../js/data/characters.js';
import { PVE_LEVELS } from '../js/data/level-data.js';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const textExtensions = new Set(['.css', '.html', '.js', '.md']);
const jsFiles = [];
const textFiles = [];
const errors = [];

function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(path);
            continue;
        }

        const ext = extname(entry.name);
        if (ext === '.js') jsFiles.push(path);
        if (textExtensions.has(ext)) textFiles.push(path);
    }
}

function rel(path) {
    return relative(root, path).replace(/\\/g, '/');
}

function checkSyntax() {
    for (const file of jsFiles) {
        try {
            execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
        } catch (error) {
            errors.push(`Syntax check failed: ${rel(file)}\n${error.stderr || error.message}`);
        }
    }
}

function checkTextEncoding() {
    const badPatterns = [
        /\uFFFD/,
        /涓滄柟|妯増|鐏垫ⅵ|榄旂悊娌|鈥|€/
    ];

    for (const file of textFiles) {
        const text = readFileSync(file, 'utf8');
        for (const pattern of badPatterns) {
            if (pattern.test(text)) {
                errors.push(`Possible mojibake in ${rel(file)}: matched ${pattern}`);
                break;
            }
        }
    }
}

function checkCharacterData() {
    for (const id of CHARACTER_IDS) {
        const character = CHARACTER_DEFINITIONS[id];
        if (!character) {
            errors.push(`Missing character definition for "${id}"`);
            continue;
        }
        if (!Array.isArray(character.skills) || character.skills.length !== 4) {
            errors.push(`Character "${id}" must define exactly 4 skills`);
        }
        for (const [index, skill] of character.skills.entries()) {
            if (!skill.name || typeof skill.maxCooldown !== 'number' || !skill.type || !skill.description) {
                errors.push(`Invalid skill ${index + 1} for character "${id}"`);
            }
        }
    }
}

function checkLevelData() {
    if (!Array.isArray(PVE_LEVELS) || PVE_LEVELS.length === 0) {
        errors.push('PVE_LEVELS must contain at least one level');
        return;
    }

    for (const [levelIndex, level] of PVE_LEVELS.entries()) {
        const label = level.id || `#${levelIndex}`;
        if (!level.width || !level.endX || level.endX > level.width) {
            errors.push(`Invalid width/endX for level "${label}"`);
        }
        if (!Array.isArray(level.platforms) || !Array.isArray(level.enemies) || !Array.isArray(level.spawnZones)) {
            errors.push(`Level "${label}" must define platforms, enemies, and spawnZones arrays`);
            continue;
        }

        for (const zone of level.spawnZones) {
            for (const index of zone.spawnIndices || []) {
                if (!level.enemies[index]) {
                    errors.push(`Level "${label}" spawn zone ${zone.triggerX} references missing enemy index ${index}`);
                }
            }
        }
    }
}

function checkAssets() {
    const requiredSingleEffects = [
        'assets/effects/spellcard_hit.png',
        'assets/effects/seal_hit.png',
        'assets/effects/laser_beam.png',
        'assets/effects/laser_head.png',
        'assets/effects/laser_charge.png',
        'assets/effects/shield.png',
        'assets/effects/big_laser_beam.png',
        'assets/effects/big_laser_head.png',
        'assets/effects/youmu_spirit_slash.png',
        'assets/effects/youmu_ghost_blade.png',
        'assets/effects/youmu_ghost_trail.png',
        'assets/effects/youmu_spirit_shield.png',
        'assets/stage/platform.png',
        'assets/stage/platform_small.png',
        'assets/pickups/cd.png',
        'assets/pickups/hp.png'
    ];

    for (const name of SFX_FILES) {
        if (!existsSync(join(root, 'audio', `${name}.wav`))) {
            errors.push(`Missing SFX file: audio/${name}.wav`);
        }
    }

    for (const frameSet of Object.values(EFFECT_FRAME_SETS)) {
        for (let i = 1; i <= frameSet.count; i++) {
            const path = frameSet.pattern(i);
            if (!existsSync(join(root, path))) {
                errors.push(`Missing effect frame: ${path}`);
            }
        }
    }

    const reimuReleaseFrameSets = [
        { prefix: 'assets/effects/reimu_dream_seal_release_', count: 8 },
        { prefix: 'assets/effects/reimu_double_barrier_release_', count: 8 },
        { prefix: 'assets/effects/reimu_yin_yang_orb_release_', count: 8 },
        { prefix: 'assets/effects/reimu_binding_circle_release_', count: 8 }
    ];
    for (const frameSet of reimuReleaseFrameSets) {
        for (let i = 1; i <= frameSet.count; i++) {
            const path = `${frameSet.prefix}${i}.png`;
            if (!existsSync(join(root, path))) {
                errors.push(`Missing reimu release frame: ${path}`);
            }
        }
    }

    for (const path of requiredSingleEffects) {
        if (!existsSync(join(root, path))) {
            errors.push(`Missing effect asset: ${path}`);
        }
    }

    for (const char of CHARACTER_IDS) {
        for (const expr of ['normal', 'happy', 'angry', 'sad']) {
            if (!existsSync(join(root, 'character', char, `${expr}.png`))) {
                errors.push(`Missing portrait: character/${char}/${expr}.png`);
            }
        }

        const requiredActionFrames = [
            'stand',
            ...Array.from({ length: 8 }, (_, index) => `walk${index + 1}`),
            ...Array.from({ length: 4 }, (_, index) => `attack${index + 1}`)
        ];
        for (const frame of requiredActionFrames) {
            if (!existsSync(join(root, 'action', char, `${frame}.png`))) {
                errors.push(`Missing action sprite: action/${char}/${frame}.png`);
            }
        }

        for (let i = 1; i <= 4; i++) {
            if (!existsSync(join(root, 'assets', 'icons', char, `${i}.png`))) {
                errors.push(`Missing skill icon: assets/icons/${char}/${i}.png`);
            }
        }
    }
}

walk(root);
checkSyntax();
checkTextEncoding();
checkCharacterData();
checkLevelData();
checkAssets();

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(`Project check passed: ${jsFiles.length} JS files, ${PVE_LEVELS.length} PvE levels, ${CHARACTER_IDS.length} characters.`);
