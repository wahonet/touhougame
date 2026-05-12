import { SPRITE_DISPLAY_H } from '../config/game-config.js';
import { Assets } from './asset-store.js';
import {
    CHARACTER_IDS,
    EFFECT_FRAME_SETS,
    PORTRAIT_EXPRESSIONS
} from '../data/asset-manifest.js';

export function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`Failed to load: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

export function flipImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);

    return canvas;
}

export function scaleImage(img, targetH) {
    const scale = targetH / img.height;
    const w = Math.round(img.width * scale);
    const h = targetH;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    return canvas;
}

export async function preloadAssets() {
    await Promise.all([
        loadPortraits(),
        loadActionSprites(),
        loadEffectAssets(),
        loadSkillIcons(),
        loadStageAssets(),
        loadPickupAssets(),
        loadDefeatedSprites()
    ]);
}

async function loadPortraits() {
    for (const char of CHARACTER_IDS) {
        for (const expr of PORTRAIT_EXPRESSIONS) {
            const img = await loadImage(`character/${char}_${expr}.png`);
            if (img) {
                Assets.portraits[char][expr] = scaleImage(img, 500);
            }
        }
    }
}

async function loadActionSprites() {
    for (const char of CHARACTER_IDS) {
        const standImg = await loadImage(`action/${char}_stand.png`);
        if (standImg) {
            const scaled = scaleImage(standImg, SPRITE_DISPLAY_H);
            Assets.sprites[char].left.stand = scaled;
            Assets.sprites[char].right.stand = flipImage(scaled);
        }

        const walkFrames = [];
        for (let i = 1; i <= 4; i++) {
            const img = await loadImage(`action/${char}_walk${i}.png`);
            if (img) {
                walkFrames.push(scaleImage(img, SPRITE_DISPLAY_H));
            }
        }
        Assets.sprites[char].left.walk = walkFrames;
        Assets.sprites[char].right.walk = walkFrames.map(frame => flipImage(frame));

        const attackFrames = [];
        for (let i = 1; i <= 4; i++) {
            const img = await loadImage(`action/${char}_attack${i}.png`);
            if (img) {
                attackFrames.push(scaleImage(img, SPRITE_DISPLAY_H));
            }
        }
        Assets.sprites[char].left.attack = attackFrames;
        Assets.sprites[char].right.attack = attackFrames.map(frame => flipImage(frame));
    }

    const reimuFlyImg = await loadImage('action/reimu_fly.png');
    if (reimuFlyImg) {
        const scaledFly = scaleImage(reimuFlyImg, SPRITE_DISPLAY_H);
        Assets.sprites.reimu.left.fly = scaledFly;
        Assets.sprites.reimu.right.fly = flipImage(scaledFly);
    }
}

async function loadEffectAssets() {
    for (const [key, frameSet] of Object.entries(EFFECT_FRAME_SETS)) {
        Assets.effects[key] = [];
        for (let i = 1; i <= frameSet.count; i++) {
            const img = await loadImage(frameSet.pattern(i));
            if (img) {
                Assets.effects[key].push(img);
            }
        }
    }

    const singleEffects = [
        ['spellcardHit', 'assets/spellcard_hit.png'],
        ['laserBeam', 'assets/laser_beam.png'],
        ['laserHead', 'assets/laser_head.png'],
        ['laserCharge', 'assets/laser_charge.png'],
        ['shield', 'assets/shield.png'],
        ['sealHit', 'assets/seal_hit.png'],
        ['bigLaserBeam', 'assets/big_laser_beam.png'],
        ['bigLaserHead', 'assets/big_laser_head.png'],
        ['flyAura', 'assets/fly_aura.png']
    ];

    for (const [key, path] of singleEffects) {
        const img = await loadImage(path);
        if (img) {
            Assets.effects[key] = img;
        }
    }
}

async function loadSkillIcons() {
    for (const char of CHARACTER_IDS) {
        Assets.skillIcons[char] = [];
        for (let i = 1; i <= 4; i++) {
            const iconImg = await loadImage(`assets/icon_${char}_${i}.png`);
            if (iconImg) {
                Assets.skillIcons[char].push(iconImg);
            }
        }
    }
}

async function loadStageAssets() {
    const platformImg = await loadImage('assets/platform.png');
    if (platformImg) {
        Assets.platform = platformImg;
    }

    const platformSmallImg = await loadImage('assets/platform_small.png');
    if (platformSmallImg) {
        Assets.platformSmall = platformSmallImg;
    }
}

async function loadPickupAssets() {
    const pickupCdImg = await loadImage('assets/pickup_cd.png');
    if (pickupCdImg) {
        Assets.pickupCd = pickupCdImg;
    }

    const pickupHpImg = await loadImage('assets/pickup_hp.png');
    if (pickupHpImg) {
        Assets.pickupHp = pickupHpImg;
    }
}

async function loadDefeatedSprites() {
    for (const char of CHARACTER_IDS) {
        const defImg = await loadImage(`assets/${char}_defeated.png`);
        if (defImg) {
            const scale = SPRITE_DISPLAY_H / Math.max(defImg.height, 1);
            Assets.defeated[char] = scaleImage(defImg, Math.round(defImg.height * scale));
        }
    }
}
