/**
 * main.js - Game initialization, asset preloading, game loop, state machine
 */

// ===================== CONSTANTS =====================
const ARENA_WIDTH = 3200;
const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;
const MAX_HP = 1000;

// ===================== AUDIO MANAGER =====================
const AudioManager = {
    ctx: null,
    buffers: {},
    bgm: null,
    bgmVolume: 0.3,
    sfxVolume: 0.5,
    muted: false,

    async init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.warn('Web Audio API not supported');
            return;
        }
        const sfxFiles = [
            'sfx_hit', 'sfx_skill', 'sfx_damage', 'sfx_death',
            'sfx_jump', 'sfx_land', 'sfx_pickup', 'sfx_shield',
            'sfx_laser', 'sfx_click', 'sfx_ready', 'sfx_seal',
            'sfx_stars', 'sfx_gameover'
        ];
        for (const name of sfxFiles) {
            try {
                const resp = await fetch(`audio/${name}.wav`);
                const arrayBuf = await resp.arrayBuffer();
                this.buffers[name] = await this.ctx.decodeAudioData(arrayBuf);
            } catch(e) {
                console.warn(`Failed to load audio: ${name}`, e);
            }
        }
    },

    play(name, volume) {
        if (this.muted || !this.ctx || !this.buffers[name]) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        const gain = this.ctx.createGain();
        gain.gain.value = (volume !== undefined ? volume : this.sfxVolume);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
    },

    playBGM(name) {
        this.stopBGM();
        const audio = new Audio(`audio/${name}.wav`);
        audio.loop = true;
        audio.volume = this.bgmVolume;
        audio.play().catch(() => {});
        this.bgm = audio;
    },

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
            this.bgm = null;
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this.bgm) {
            this.bgm.volume = this.muted ? 0 : this.bgmVolume;
        }
    }
};

// ===================== GLOBALS =====================
const Game = {
    state: 'loading', // loading → select → dialogue → battle → gameover
    canvas: null,
    ctx: null,
    playerChar: null,
    aiChar: null,
    player: null,
    enemy: null,
    winner: null,
    keys: {},
    attackPressed: false,
    jumpPressed: false,
    skillPressed: { 1: false, 2: false, 3: false, 4: false },
    debugMode: true,
    lastTime: 0,
    camera: { x: 0, targetX: 0 }
};

// Asset storage
const Assets = {
    portraits: {
        reimu: {},
        marisa: {}
    },
    sprites: {
        reimu: { left: {}, right: {} },
        marisa: { left: {}, right: {} }
    },
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
        flyAura: null
    },
    platform: null,
    platformSmall: null,
    pickupCd: null,
    pickupHp: null,
    defeated: { reimu: null, marisa: null },
    skillIcons: {
        reimu: [],
        marisa: []
    }
};

// ===================== ASSET LOADING =====================
const SPRITE_DISPLAY_H = 120;

/**
 * Load a single image
 * @param {string} src - Relative path to image
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`Failed to load: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

/**
 * Flip an image horizontally and return as canvas
 * @param {HTMLImageElement} img
 * @returns {HTMLCanvasElement}
 */
function flipImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    return canvas;
}

/**
 * Scale image to target height, return as canvas
 * @param {HTMLImageElement} img
 * @param {number} targetH
 * @returns {HTMLCanvasElement}
 */
function scaleImage(img, targetH) {
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

/**
 * Preload all assets
 */
async function preloadAssets() {
    const ctx = Game.ctx;

    // ---- Portraits ----
    const portraitNames = ['normal', 'happy', 'angry', 'sad'];
    const chars = ['reimu', 'marisa'];

    for (const char of chars) {
        for (const expr of portraitNames) {
            const img = await loadImage(`character/${char}_${expr}.png`);
            if (img) {
                Assets.portraits[char][expr] = scaleImage(img, 500);
            }
        }
    }

    // ---- Action Sprites ----
    for (const char of chars) {
        const standImg = await loadImage(`action/${char}_stand.png`);
        if (standImg) {
            const scaled = scaleImage(standImg, SPRITE_DISPLAY_H);
            Assets.sprites[char].left.stand = scaled;
            Assets.sprites[char].right.stand = flipImage(scaled);
        }

        // Walk 1-4
        const walkFrames = [];
        for (let i = 1; i <= 4; i++) {
            const img = await loadImage(`action/${char}_walk${i}.png`);
            if (img) {
                walkFrames.push(scaleImage(img, SPRITE_DISPLAY_H));
            }
        }
        Assets.sprites[char].left.walk = walkFrames;
        Assets.sprites[char].right.walk = walkFrames.map(f => flipImage(f));

        // Attack 1-4
        const attackFrames = [];
        for (let i = 1; i <= 4; i++) {
            const img = await loadImage(`action/${char}_attack${i}.png`);
            if (img) {
                attackFrames.push(scaleImage(img, SPRITE_DISPLAY_H));
            }
        }
        Assets.sprites[char].left.attack = attackFrames;
        Assets.sprites[char].right.attack = attackFrames.map(f => flipImage(f));
    }

    // ---- Reimu fly sprite ----
    const reimuFlyImg = await loadImage('action/reimu_fly.png');
    if (reimuFlyImg) {
        const scaledFly = scaleImage(reimuFlyImg, SPRITE_DISPLAY_H);
        Assets.sprites.reimu.left.fly = scaledFly;
        Assets.sprites.reimu.right.fly = flipImage(scaledFly);
    }

    // ---- Effect Assets ----
    // Spell card frames 1-4
    for (let i = 1; i <= 4; i++) {
        const img = await loadImage(`assets/spellcard_${i}.png`);
        if (img) {
            Assets.effects.spellcard.push(img);
        }
    }

    // Spell card hit effect
    const spellHitImg = await loadImage('assets/spellcard_hit.png');
    if (spellHitImg) {
        Assets.effects.spellcardHit = spellHitImg;
    }

    // Laser assets
    const laserBeamImg = await loadImage('assets/laser_beam.png');
    if (laserBeamImg) {
        Assets.effects.laserBeam = laserBeamImg;
    }

    const laserHeadImg = await loadImage('assets/laser_head.png');
    if (laserHeadImg) {
        Assets.effects.laserHead = laserHeadImg;
    }

    const laserChargeImg = await loadImage('assets/laser_charge.png');
    if (laserChargeImg) {
        Assets.effects.laserCharge = laserChargeImg;
    }

    // Shield
    const shieldImg = await loadImage('assets/shield.png');
    if (shieldImg) {
        Assets.effects.shield = shieldImg;
    }

    // Star frames 1-4
    for (let i = 1; i <= 4; i++) {
        const img = await loadImage(`assets/star_${i}.png`);
        if (img) {
            Assets.effects.star.push(img);
        }
    }

    // Seal frames 1-4
    for (let i = 1; i <= 4; i++) {
        const img = await loadImage(`assets/seal_${i}.png`);
        if (img) {
            Assets.effects.seal.push(img);
        }
    }

    // Seal hit
    const sealHitImg = await loadImage('assets/seal_hit.png');
    if (sealHitImg) {
        Assets.effects.sealHit = sealHitImg;
    }

    // Big laser assets
    const bigLaserBeamImg = await loadImage('assets/big_laser_beam.png');
    if (bigLaserBeamImg) {
        Assets.effects.bigLaserBeam = bigLaserBeamImg;
    }

    const bigLaserHeadImg = await loadImage('assets/big_laser_head.png');
    if (bigLaserHeadImg) {
        Assets.effects.bigLaserHead = bigLaserHeadImg;
    }

    // Fly aura
    const flyAuraImg = await loadImage('assets/fly_aura.png');
    if (flyAuraImg) {
        Assets.effects.flyAura = flyAuraImg;
    }

    // Skill icons
    for (const char of ['reimu', 'marisa']) {
        for (let i = 1; i <= 4; i++) {
            const iconImg = await loadImage(`assets/icon_${char}_${i}.png`);
            if (iconImg) {
                Assets.skillIcons[char].push(iconImg);
            }
        }
    }

    // Platform assets
    const platformImg = await loadImage('assets/platform.png');
    if (platformImg) {
        Assets.platform = platformImg;
    }

    const platformSmallImg = await loadImage('assets/platform_small.png');
    if (platformSmallImg) {
        Assets.platformSmall = platformSmallImg;
    }

    // Pickup assets
    const pickupCdImg = await loadImage('assets/pickup_cd.png');
    if (pickupCdImg) {
        Assets.pickupCd = pickupCdImg;
    }

    const pickupHpImg = await loadImage('assets/pickup_hp.png');
    if (pickupHpImg) {
        Assets.pickupHp = pickupHpImg;
    }

    // Defeated sprites
    for (const char of ['reimu', 'marisa']) {
        const defImg = await loadImage(`assets/${char}_defeated.png`);
        if (defImg) {
            const scale = SPRITE_DISPLAY_H / Math.max(defImg.height, 1);
            Assets.defeated[char] = scaleImage(defImg, Math.round(defImg.height * scale));
        }
    }
}

// ===================== LOADING SCREEN =====================
function drawLoadingScreen(ctx, progress) {
    const W = 1280, H = 720;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.font = `bold 36px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Loading... 载入中', W / 2, H / 2 - 30);

    const barW = 400, barH = 12;
    const barX = (W - barW) / 2;
    const barY = H / 2 + 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.restore();
}

// ===================== INPUT =====================
const keyState = {
    a: false, d: false, w: false, space: false, j: false, s: false
};

function setupInput() {
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        // Track held keys
        if (key === 'a') keyState.a = true;
        if (key === 'd') keyState.d = true;
        if (key === 'w') keyState.w = true;
        if (key === 's') keyState.s = true;
        if (key === ' ') { keyState.space = true; e.preventDefault(); }
        if (key === 'j') keyState.j = true;

        // One-shot presses
        if (key === 'j') Game.attackPressed = true;
        if (key === 'w' || key === ' ') Game.jumpPressed = true;

        // Skill keys 1-4
        if (key === '1') Game.skillPressed[1] = true;
        if (key === '2') Game.skillPressed[2] = true;
        if (key === '3') Game.skillPressed[3] = true;
        if (key === '4') Game.skillPressed[4] = true;

        // Scene-specific
        if (Game.state === 'select') {
            SelectScene.handleKey(key);
        } else if (Game.state === 'dialogue') {
            DialogueScene.handleKey(key);
        } else if (Game.state === 'gameover') {
            if (key === 'r') {
                resetGame();
            }
        } else if (Game.state === 'battle') {
            if (key === 'r') {
                resetGame();
            }
        }

        // Mute toggle
        if (key === 'm') AudioManager.toggleMute();
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'a') keyState.a = false;
        if (key === 'd') keyState.d = false;
        if (key === 'w') keyState.w = false;
        if (key === 's') keyState.s = false;
        if (key === ' ') keyState.space = false;
        if (key === 'j') keyState.j = false;
    });

    // Mouse clicks for select screen
    Game.canvas.addEventListener('click', (e) => {
        if (Game.state !== 'select') return;
        const rect = Game.canvas.getBoundingClientRect();
        const scaleX = 1280 / rect.width;
        const scaleY = 720 / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        SelectScene.handleClick(mx, my);
    });
}

function resetGame() {
    Game.player = null;
    Game.enemy = null;
    Game.winner = null;
    Game.camera = { x: 0, targetX: 0 };
    Game.state = 'select';
    SelectScene.reset();
    if (typeof AudioManager !== 'undefined') AudioManager.playBGM('bgm_select');
}

// ===================== GAME LOOP =====================
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - Game.lastTime) / 1000, 0.05); // cap at 50ms
    Game.lastTime = timestamp;

    const ctx = Game.ctx;

    // Copy key state
    Game.keys = { ...keyState };

    switch (Game.state) {
        case 'loading':
            drawLoadingScreen(ctx, 0.5);
            break;

        case 'select':
            SelectScene.draw(ctx);
            if (typeof AudioManager !== 'undefined' && (!AudioManager.bgm || !AudioManager.bgm.src || !AudioManager.bgm.src.includes('bgm_select'))) {
                AudioManager.playBGM('bgm_select');
            }
            break;

        case 'dialogue':
            DialogueScene.draw(ctx, dt);
            break;

        case 'battle':
            BattleScene.update(dt);
            BattleScene.draw(ctx);
            break;

        case 'gameover':
            // Still draw battle underneath
            BattleScene.draw(ctx);
            GameOverScene.draw(ctx);
            break;
    }

    // Reset one-shot inputs
    Game.attackPressed = false;
    Game.jumpPressed = false;
    Game.skillPressed = { 1: false, 2: false, 3: false, 4: false };

    requestAnimationFrame(gameLoop);
}

// ===================== INIT =====================
async function init() {
    Game.canvas = document.getElementById('gameCanvas');
    Game.ctx = Game.canvas.getContext('2d');
    Game.canvas.width = SCREEN_WIDTH;
    Game.canvas.height = SCREEN_HEIGHT;

    setupInput();

    // Draw initial loading screen
    drawLoadingScreen(Game.ctx, 0);

    // Preload assets
    await preloadAssets();

    // Load audio
    await AudioManager.init();

    // Resume AudioContext on first user interaction (browser autoplay policy)
    document.addEventListener('click', function resumeAudio() {
        if (AudioManager.ctx && AudioManager.ctx.state === 'suspended') {
            AudioManager.ctx.resume();
        }
        document.removeEventListener('click', resumeAudio);
    }, { once: true });

    // Transition to select
    Game.state = 'select';
    Game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Start
window.addEventListener('DOMContentLoaded', init);
