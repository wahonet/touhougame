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
        // Fallback: generate programmatic portrait if none loaded
        if (!Assets.portraits[char].normal) {
            Assets.portraits[char].normal = generateFallbackPortrait(char);
            Assets.portraits[char].happy = Assets.portraits[char].normal;
            Assets.portraits[char].angry = Assets.portraits[char].normal;
            Assets.portraits[char].sad = Assets.portraits[char].normal;
        }
    }
}

/**
 * Generate a simple programmatic portrait canvas for characters without image assets
 */
function generateFallbackPortrait(charName) {
    const w = 400, h = 500;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const palettes = {
        reimu: { hair: '#442222', outfit: '#ff3344', ribbon: '#ffffff', skin: '#ffe4c4' },
        marisa: { hair: '#ffdd44', outfit: '#222222', ribbon: '#ffffff', skin: '#ffe4c4' },
        yuyuko: { hair: '#ccaaff', outfit: '#ff88cc', ribbon: '#4466cc', skin: '#ffeedd' },
        youmu: { hair: '#aaddcc', outfit: '#44ddaa', ribbon: '#88ccff', skin: '#ffeedd' }
    };
    const p = palettes[charName] || palettes.reimu;

    // Background glow
    const grad = ctx.createRadialGradient(w / 2, h / 2 - 30, 50, w / 2, h / 2, 250);
    grad.addColorStop(0, p.outfit + '44');
    grad.addColorStop(1, 'rgba(10,5,20,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Body (simple dress shape)
    ctx.fillStyle = p.outfit;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 50, h / 2 + 20);
    ctx.lineTo(w / 2 - 80, h - 20);
    ctx.lineTo(w / 2 + 80, h - 20);
    ctx.lineTo(w / 2 + 50, h / 2 + 20);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 40, 55, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 55, 58, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Side hair
    ctx.fillRect(w / 2 - 60, h / 2 - 40, 20, 80);
    ctx.fillRect(w / 2 + 40, h / 2 - 40, 20, 80);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 18, h / 2 - 35, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w / 2 + 18, h / 2 - 35, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2 - 16, h / 2 - 38, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2 + 20, h / 2 - 38, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#cc8866';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 20, 8, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Character-specific accessory
    if (charName === 'reimu') {
        // Ribbon (bow)
        ctx.fillStyle = '#ff2244';
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2 - 90);
        ctx.lineTo(w / 2 - 25, h / 2 - 105);
        ctx.lineTo(w / 2, h / 2 - 95);
        ctx.lineTo(w / 2 + 25, h / 2 - 105);
        ctx.closePath();
        ctx.fill();
    } else if (charName === 'marisa') {
        // Witch hat
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2 - 140);
        ctx.lineTo(w / 2 - 50, h / 2 - 70);
        ctx.lineTo(w / 2 + 50, h / 2 - 70);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffdd44';
        ctx.fillRect(w / 2 - 55, h / 2 - 75, 110, 8);
    } else if (charName === 'yuyuko') {
        // Cherry blossom crown
        ctx.fillStyle = '#ff88cc';
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const bx = w / 2 + Math.cos(angle) * 30;
            const by = h / 2 - 80 + Math.sin(angle) * 15;
            ctx.beginPath();
            ctx.arc(bx, by, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#ffccdd';
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const bx = w / 2 + Math.cos(angle) * 30;
            const by = h / 2 - 80 + Math.sin(angle) * 15;
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (charName === 'youmu') {
        // Ghost half (floating spirit)
        ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(w / 2 + 70, h / 2 - 30, 20, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(w / 2 + 65, h / 2 - 38, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w / 2 + 75, h / 2 - 38, 3, 0, Math.PI * 2);
        ctx.fill();
        // Sword (Myon)
        ctx.strokeStyle = '#aaddcc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 60, h / 2 + 10);
        ctx.lineTo(w / 2 - 100, h / 2 - 40);
        ctx.stroke();
    }

    // Name label
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = p.outfit;
    ctx.shadowBlur = 10;
    const names = { reimu: '灵梦', marisa: '魔理沙', yuyuko: '幽幽子', youmu: '妖梦' };
    ctx.fillText(names[charName] || charName, w / 2, h - 30);
    ctx.shadowBlur = 0;

    return canvas;
}

function getFallbackPalette(charName) {
    const palettes = {
        reimu: { body: '#ff3344', trim: '#ffffff', hair: '#442222', accent: '#ff99aa' },
        marisa: { body: '#222222', trim: '#ffdd44', hair: '#ffdd44', accent: '#ffffff' },
        yuyuko: { body: '#ff88cc', trim: '#ccaaff', hair: '#ddbbff', accent: '#ffccdd' },
        youmu: { body: '#44ddaa', trim: '#ddffff', hair: '#aaddcc', accent: '#88ccff' }
    };
    return palettes[charName] || palettes.reimu;
}

function generateFallbackActionSprite(charName, pose, frameIndex = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = SPRITE_DISPLAY_H;
    const ctx = canvas.getContext('2d');
    const p = getFallbackPalette(charName);
    const cx = canvas.width / 2;
    const groundY = canvas.height - 4;
    const bob = pose === 'walk' ? Math.sin(frameIndex * Math.PI / 2) * 3 : 0;
    const attackReach = pose === 'attack' ? 22 : 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, groundY, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(cx - 20, 58 + bob);
    ctx.lineTo(cx - 28, groundY - 12);
    ctx.lineTo(cx + 28, groundY - 12);
    ctx.lineTo(cx + 20, 58 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 14, 68 + bob);
    ctx.lineTo(cx + 14, 68 + bob);
    ctx.stroke();

    ctx.fillStyle = '#ffe6cc';
    ctx.beginPath();
    ctx.arc(cx, 40 + bob, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(cx, 34 + bob, 18, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 8, 72 + bob);
    ctx.lineTo(cx - 20 - bob, groundY - 12);
    ctx.moveTo(cx + 8, 72 + bob);
    ctx.lineTo(cx + 20 + bob, groundY - 12);
    ctx.stroke();

    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 14, 70 + bob);
    ctx.lineTo(cx + 28 + attackReach, 60 + bob);
    ctx.stroke();

    if (pose === 'attack') {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx + 28, 60 + bob);
        ctx.lineTo(cx + 52, 48 + bob);
        ctx.stroke();
    }

    ctx.fillStyle = p.accent;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(charName.slice(0, 2).toUpperCase(), cx, groundY - 28);

    return canvas;
}

function generateFallbackSkillIcon(charName, index) {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    const p = getFallbackPalette(charName);

    const grad = ctx.createLinearGradient(0, 0, 48, 48);
    grad.addColorStop(0, p.body);
    grad.addColorStop(1, p.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 42, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), 24, 25);

    return canvas;
}

async function loadActionSprites() {
    for (const char of CHARACTER_IDS) {
        const standImg = await loadImage(`action/${char}_stand.png`);
        if (standImg) {
            const scaled = scaleImage(standImg, SPRITE_DISPLAY_H);
            Assets.sprites[char].left.stand = scaled;
            Assets.sprites[char].right.stand = flipImage(scaled);
        } else {
            const fallback = generateFallbackActionSprite(char, 'stand');
            Assets.sprites[char].left.stand = fallback;
            Assets.sprites[char].right.stand = flipImage(fallback);
        }

        const walkFrames = [];
        for (let i = 1; i <= 4; i++) {
            const img = await loadImage(`action/${char}_walk${i}.png`);
            if (img) {
                walkFrames.push(scaleImage(img, SPRITE_DISPLAY_H));
            }
        }
        if (walkFrames.length === 0) {
            for (let i = 0; i < 4; i++) {
                walkFrames.push(generateFallbackActionSprite(char, 'walk', i));
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
        if (attackFrames.length === 0) {
            for (let i = 0; i < 4; i++) {
                attackFrames.push(generateFallbackActionSprite(char, 'attack', i));
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
            } else {
                Assets.skillIcons[char].push(generateFallbackSkillIcon(char, i));
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
