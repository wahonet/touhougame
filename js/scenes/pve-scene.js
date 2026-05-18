/**
 * PvEScene - Side-scrolling action mode (Contra/Metal Slug style)
 * Player selects character, walks left to right, fights enemies, reaches the end.
 */
import {
    FONT_FAMILY,
    MAX_HP,
    SCREEN_HEIGHT,
    SCREEN_WIDTH
} from '../config/game-config.js';
import { AudioManager } from '../core/audio-manager.js';
import { Game, createCamera } from '../core/game-state.js';
import { registerBattleHooks } from '../core/battle-events.js';
import { Fighter } from '../entities/fighter.js';
import { Enemy } from '../entities/enemy.js';
import { Pickup } from '../entities/pickup.js';
import { rectsOverlap } from '../systems/collision.js';
import { applyPlayerSkillHitsToEnemy } from '../systems/pve-skill-hits.js';
import {
    GROUND_Y
} from '../data/stage-data.js';
import { PVE_LEVELS } from '../data/level-data.js';
import {
    drawHUD,
    drawSkillUI,
    drawDamageNumbers,
    drawCombo,
    drawPowerBoost,
    drawVictory,
    drawDefeat
} from './pve-hud.js';
import {
    drawMountains,
    drawGround,
    drawPlatforms,
    createAmbientParticles,
    drawAmbientEffects
} from './pve-background.js';

export const PvEScene = {
    player: null,
    enemies: [],
    platforms: [],
    particles: [],
    shakeAmount: 0,
    shakeDecay: 0.9,
    score: 0,
    killCount: 0,
    parallaxStars: [],
    mountainSeed: 0,
    spawnedZones: new Set(),
    victoryTriggered: false,
    defeatTriggered: false,
    pickups: [],
    comboCount: 0,
    comboTimer: 0,
    damageNumbers: [],
    killExplosions: [],
    currentLevel: null,
    levelConfig: null,
    ambientParticles: [],
    pickupSpawnTimer: 8,

    init(levelIndex) {
        const groundY = GROUND_Y;

        // Default to the first level for backward compatibility.
        this.currentLevel = levelIndex || 0;
        this.levelConfig = PVE_LEVELS[this.currentLevel] || PVE_LEVELS[0];
        const level = this.levelConfig;
        const levelWidth = level.width;
        const levelEndX = level.endX;

        // Update global level width for Fighter boundary checks
        Game.pveLevelWidth = levelWidth;

        // Create player at level start
        this.player = new Fighter(Game.playerChar, 200, groundY, 'right', false);
        this.player.hp = this.player.maxHp || MAX_HP;

        this._platformTime = 0;
        this._playerPlatform = null;
        this.enemies = [];
        this.platforms = level.platforms.map(p => ({
            x: p.x, y: p.y, w: p.w, h: p.h, type: p.type,
            moveType: p.moveType || 'static',
            moveRange: p.moveRange || 0,
            moveSpeed: p.moveSpeed || 0,
            _origX: p.x,
            _origY: p.y
        }));
        this.particles = [];
        this.shakeAmount = 0;
        this.score = 0;
        this.killCount = 0;
        this.spawnedZones = new Set();
        this.victoryTriggered = false;
        this.defeatTriggered = false;
        this.pickups = [];
        this.pickupSpawnTimer = 6;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.damageNumbers = [];
        this.killExplosions = [];

        // Camera follows player
        Game.camera = createCamera();
        Game.camera.x = 0;
        Game.camera.targetX = 0;

        registerBattleHooks({
            addShake: (amount, maxShake) => {
                this.shakeAmount = Math.min(maxShake, this.shakeAmount + amount);
            },
            spawnHitParticles: (x, y, color) => {
                this._spawnHitParticles(x, y, color);
            }
        });

        // Generate parallax background
        this.parallaxStars = [];
        for (let i = 0; i < 150; i++) {
            this.parallaxStars.push({
                x: Math.random() * levelWidth * 2,
                y: Math.random() * 450,
                size: 0.5 + Math.random() * 2,
                brightness: 0.2 + Math.random() * 0.6,
                twinkleSpeed: 0.001 + Math.random() * 0.004
            });
        }
        this.mountainSeed = Math.random() * 1000;

        // Generate ambient particles (level theme effects)
        this.ambientParticles = createAmbientParticles(this.currentLevel, levelWidth);
        this.ambientParticles = createAmbientParticles(this.currentLevel, level.width);

        if (typeof AudioManager !== 'undefined') AudioManager.playBGM('bgm_battle');
    },

    update(dt) {
        if (!this.player) return;

        const player = this.player;

        // --- Enemy spawning based on player position ---
        const level = this.levelConfig;
        for (const zone of level.spawnZones) {
            if (this.spawnedZones.has(zone.triggerX)) continue;
            if (player.cx >= zone.triggerX - 200) {
                this.spawnedZones.add(zone.triggerX);
                for (const idx of zone.spawnIndices) {
                    const spawn = level.enemies[idx];
                    const ey = spawn.y === 'ground' ? GROUND_Y : spawn.y;
                    const enemy = new Enemy(
                        spawn.type,
                        spawn.x,
                        ey,
                        GROUND_Y,
                        spawn.patrolLeft,
                        spawn.patrolRight
                    );
                    this.enemies.push(enemy);
                }
            }
        }

        // --- Spawn pickups from killed enemies ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.state === 'dead' && enemy.deathTimer <= 0 && !enemy._droppedPickup) {
                enemy._droppedPickup = true;
                // 30% chance to drop a pickup
                if (Math.random() < 0.3) {
                    const types = ['hp', 'hp', 'cd', 'power', 'power'];
                    // Boss always drops bomb
                    const pickupType = enemy.type === 'boss' ? 'bomb' : types[Math.floor(Math.random() * types.length)];
                    this.pickups.push(new Pickup(pickupType, enemy.cx, enemy.cy - 20));
                }
            }
        }

        // --- Update moving platforms ---
        this._platformTime += dt;
        const platTime = this._platformTime;
        // Track which platform player is standing on (check BEFORE position update)
        const pHurt = player.getHurtbox();
        this._playerPlatform = null;
        if (pHurt && player.isOnGround) {
            for (const plat of this.platforms) {
                if (pHurt.x + pHurt.w > plat.x && pHurt.x < plat.x + plat.w &&
                    pHurt.y + pHurt.h >= plat.y - 4 && pHurt.y + pHurt.h <= plat.y + 8) {
                    this._playerPlatform = plat;
                    break;
                }
            }
        }

        for (const plat of this.platforms) {
            if (plat.moveType === 'static') continue;
            const oldX = plat.x;
            const oldY = plat.y;
            if (plat.moveType === 'horizontal') {
                plat.x = plat._origX + Math.sin(platTime * plat.moveSpeed) * plat.moveRange;
            } else if (plat.moveType === 'vertical') {
                plat.y = plat._origY + Math.sin(platTime * plat.moveSpeed) * (-plat.moveRange);
            }
            // Carry player with platform delta
            if (this._playerPlatform === plat) {
                player.cx += (plat.x - oldX);
                player.cy += (plat.y - oldY);
            }
        }

        // --- Update camera (follows player only) ---
        Game.camera.targetX = player.cx - SCREEN_WIDTH * 0.35;
        Game.camera.targetX = Math.max(0, Math.min(level.width - SCREEN_WIDTH, Game.camera.targetX));
        Game.camera.x += (Game.camera.targetX - Game.camera.x) * 0.1;
        Game.camera.x = Math.max(0, Math.min(level.width - SCREEN_WIDTH, Game.camera.x));

        // --- Update player ---
        const keys = Game.keys;
        player.update(dt, keys, Game.attackPressed, Game.jumpPressed, Game.skillPressed, this._getDummyOpponent(), this.platforms, []);
        player.clampToBounds();

        // --- Update enemies ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, player.cx, player.cy);

            // Enemy attack hits player
            if (enemy.state === 'attack' && !enemy._atkHit) {
                const hitbox = enemy.getHitbox();
                const hurtbox = player.getHurtbox();
                if (hitbox && rectsOverlap(hitbox, hurtbox)) {
                    enemy._atkHit = true;
                    player.damage(enemy.atkDamage);
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
                }
            }

            // Boss projectile hits player
            if (enemy.projectiles && enemy.projectiles.length > 0) {
                const hurtbox = player.getHurtbox();
                for (let j = enemy.projectiles.length - 1; j >= 0; j--) {
                    const p = enemy.projectiles[j];
                    const bBox = { x: p.x - p.radius, y: p.y - p.radius, w: p.radius * 2, h: p.radius * 2 };
                    if (rectsOverlap(bBox, hurtbox)) {
                        player.damage(p.damage);
                        enemy.projectiles.splice(j, 1);
                        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
                        this._spawnHitParticles(p.x, p.y, p.color);
                    }
                }
            }

            // Player attack hits enemy (melee)
            if (player.state === 'attack' && !player._atkHit) {
                const pHitbox = player.getHitbox();
                const eHurtbox = enemy.getHurtbox();
                if (pHitbox && rectsOverlap(pHitbox, eHurtbox)) {
                    player._atkHit = true;
                    const bonus = player.nextAttackBonus || 0;
                    const dmg = (player._powerMultiplier || 1) * ((player.attackDamage || 10) * 2 + bonus);
                    player.nextAttackBonus = 0;
                    enemy.damage(dmg);
                    this._addDamageNumber(enemy.cx, enemy.cy - enemy.height, dmg);
                    this._addCombo();
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
                }
            }

            // Player skill projectiles hit enemies
            applyPlayerSkillHitsToEnemy(player, enemy);

            // Remove dead enemies after fade
            if (enemy.state === 'dead' && enemy.deathTimer <= 0 && !enemy._counted) {
                enemy._counted = true;
                this.score += enemy.score;
                this.killCount++;
                this._addKillExplosion(enemy.cx, enemy.cy - enemy.height / 2);
            }
            if (enemy.state === 'dead' && enemy.deathTimer <= 0) {
                this.enemies.splice(i, 1);
            }
        }

        // --- Boss projectile to player collision ---
        for (const enemy of this.enemies) {
            if (!enemy.projectiles || enemy.projectiles.length === 0) continue;
            const hurtbox = player.getHurtbox();
            if (!hurtbox) continue;
            for (let j = enemy.projectiles.length - 1; j >= 0; j--) {
                const p = enemy.projectiles[j];
                const bulletBox = {
                    x: p.x - p.radius,
                    y: p.y - p.radius,
                    w: p.radius * 2,
                    h: p.radius * 2
                };
                if (rectsOverlap(bulletBox, hurtbox)) {
                    player.damage(p.damage);
                    this._addDamageNumber(player.cx, player.cy - 60, p.damage);
                    this.shakeAmount = Math.min(8, this.shakeAmount + 3);
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
                    enemy.projectiles.splice(j, 1);
                }
            }
        }

        // --- Screen shake ---
        if (this.shakeAmount > 0.5) {
            this.shakeAmount *= this.shakeDecay;
        } else {
            this.shakeAmount = 0;
        }

        // --- Particles ---
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= dt;
            return p.life > 0;
        });

        // --- Update pickups ---
        this.pickupSpawnTimer -= dt;
        if (this.pickupSpawnTimer <= 0 && this.pickups.length < 4) {
            this._spawnTimedPickup();
            this.pickupSpawnTimer = 10 + Math.random() * 6;
        }

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            pickup.update(dt);
            // Check collection
            if (!pickup.collected) {
                const hurtbox = player.getHurtbox();
                const pickupBox = pickup.getHurtbox();
                if (rectsOverlap(hurtbox, pickupBox)) {
                    pickup.collect(player, { enemies: this.enemies });
                }
            }
            if (pickup.collected) {
                this.pickups.splice(i, 1);
            }
        }

        // --- Combo timer ---
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }

        // --- Power boost timer ---
        if (player._powerBoost && player._powerBoost > 0) {
            player._powerBoost -= dt;
            if (player._powerBoost <= 0) {
                player._powerBoost = 0;
                player._powerMultiplier = 1;
            }
        }

        // --- Update damage numbers ---
        this.damageNumbers = this.damageNumbers.filter(d => {
            d.y -= 1.5;
            d.life -= dt;
            return d.life > 0;
        });

        // --- Update kill explosions ---
        this.killExplosions = this.killExplosions.filter(e => {
            e.life -= dt;
            return e.life > 0;
        });

        // --- Victory check ---
        if (player.cx >= level.endX && !this.victoryTriggered && !this.defeatTriggered) {
            // Check if boss is dead
            const bossAlive = this.enemies.some(e => e.type === 'boss' && e.state !== 'dead');
            if (!bossAlive) {
                this.victoryTriggered = true;
                setTimeout(() => {
                    if (Game.state === 'pve') {
                        Game.state = 'pve_victory';
                    }
                }, 1000);
            }
        }

        // --- Defeat check ---
        if (player.state === 'dead' && !this.defeatTriggered) {
            this.defeatTriggered = true;
            setTimeout(() => {
                if (Game.state === 'pve') {
                    Game.state = 'pve_defeat';
                }
            }, 1500);
        }
    },

    /** Dummy opponent for Fighter update compatibility */
    _getDummyOpponent() {
        // Always return the far-away dummy so Fighter's internal skill updates
        // don't deal double damage to enemies. All PvE enemy damage goes through
        // systems/pve-skill-hits.js exclusively.
        if (!this._dummyOpponent) {
            this._dummyOpponent = {
                cx: 99999,
                cy: GROUND_Y,
                hurtboxW: 50,
                hurtboxH: 100,
                state: 'idle',
                _atkHit: false,
                getHurtbox: () => ({
                    x: this._dummyOpponent.cx - this._dummyOpponent.hurtboxW / 2,
                    y: this._dummyOpponent.cy - this._dummyOpponent.hurtboxH,
                    w: this._dummyOpponent.hurtboxW,
                    h: this._dummyOpponent.hurtboxH
                }),
                getHitbox: () => null,
                damage: () => {}
            };
        }
        const nearest = this.enemies
            .filter(enemy => enemy.state !== 'dead')
            .sort((a, b) => Math.abs(a.cx - this.player.cx) - Math.abs(b.cx - this.player.cx))[0];
        if (nearest) {
            this._dummyOpponent.cx = nearest.cx;
            this._dummyOpponent.cy = nearest.cy;
            this._dummyOpponent.hurtboxW = nearest.width || 50;
            this._dummyOpponent.hurtboxH = nearest.height || 100;
        } else {
            this._dummyOpponent.cx = 99999;
            this._dummyOpponent.cy = GROUND_Y;
            this._dummyOpponent.hurtboxW = 50;
            this._dummyOpponent.hurtboxH = 100;
        }
        return this._dummyOpponent;
    },

    draw(ctx) {
        const W = SCREEN_WIDTH, H = SCREEN_HEIGHT;
        const groundY = GROUND_Y;
        const cam = Game.camera.x;

        // ========== PARALLAX BACKGROUND ==========
        const theme = this.levelConfig.theme;
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, theme.skyTop);
        skyGrad.addColorStop(0.2, theme.skyMid);
        skyGrad.addColorStop(1, theme.skyBot);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, groundY);

        // Stars (parallax 0.05)
        ctx.save();
        const starParallax = 0.05;
        for (const star of this.parallaxStars) {
            const sx = star.x - cam * starParallax;
            const wrappedX = ((sx % (W + 100)) + (W + 100)) % (W + 100) - 50;
            const twinkle = star.brightness * (0.6 + Math.sin(Date.now() * star.twinkleSpeed + star.x) * 0.4);
            ctx.fillStyle = `rgba(255, 255, 220, ${twinkle})`;
            ctx.beginPath();
            ctx.arc(wrappedX, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Moon
        const moonX = W - 180, moonY = 100, moonR = 45;
        ctx.save();
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = '#e8e0d0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 15, moonY - 8, moonR * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 10, 40, 0.3)';
        ctx.fill();
        ctx.restore();

        // Mountains (parallax 0.15)
        ctx.save();
        const mtnOffset = -cam * 0.15;
        drawMountains(ctx, mtnOffset, groundY, 0.7, theme.mountainColor1, 120, 0.003);
        drawMountains(ctx, mtnOffset * 1.3, groundY, 0.85, theme.mountainColor2, 90, 0.005);
        ctx.restore();

        // Ambient particles (parallax between mountains and world)
        drawAmbientEffects(ctx, this.ambientParticles, this.currentLevel, cam, 0, groundY);

        // ========== WORLD SPACE ==========
        ctx.save();

        if (this.shakeAmount > 0.5) {
            const shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
            const shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
            ctx.translate(shakeX, shakeY);
        }

        ctx.translate(-cam, 0);

        // Ground
        drawGround(ctx, groundY, this.levelConfig);

        // Platforms
        drawPlatforms(ctx, this.platforms);

        // Enemies
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }

        // Pickups
        for (const pickup of this.pickups) {
            pickup.draw(ctx);
        }

        // Player
        if (this.player) {
            this.player.draw(ctx);
            this.player.drawSkill(ctx);
        }

        // Particles
        this._drawParticles(ctx);

        // Damage numbers (world space)
        drawDamageNumbers(ctx, this.damageNumbers, cam);

        // Victory flag at end
        const endX = this.levelConfig.endX;
        if (endX) {
            const flagX = endX;
            ctx.save();
            // Flag pole
            ctx.strokeStyle = '#ccaa66';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(flagX, groundY);
            ctx.lineTo(flagX, groundY - 120);
            ctx.stroke();
            // Flag
            const wave = Math.sin(Date.now() * 0.003) * 5;
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(flagX, groundY - 120);
            ctx.lineTo(flagX + 50 + wave, groundY - 105);
            ctx.lineTo(flagX, groundY - 90);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Text
            ctx.font = `bold 16px ${FONT_FAMILY}`;
            ctx.fillStyle = '#ffcc00';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL', flagX + 20, groundY - 125);
            ctx.restore();
        }

        ctx.restore();

        // ========== HUD (screen space) ==========
        drawHUD(ctx, this.player, this.levelConfig, this.score, this.killCount);

        // Combo counter (screen space)
        drawCombo(ctx, this.comboCount, this.comboTimer);

        // Power boost bar (screen space)
        if (this.player) drawPowerBoost(ctx, this.player);

        // Victory / Defeat overlay
        if (this.victoryTriggered) {
            drawVictory(ctx, this.player, this.levelConfig, this.score, this.killCount, this.currentLevel);
        }
        if (this.defeatTriggered && this.player && this.player.state === 'dead') {
            drawDefeat(ctx, this.score, this.killCount);
        }
    },

    _spawnHitParticles(x, y, color) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const life = 0.3 + Math.random() * 0.3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life, maxLife: life,
                size: 2 + Math.random() * 3,
                color: color || '#ffcc44'
            });
        }
    },

    _addDamageNumber(x, y, amount) {
        this.damageNumbers.push({
            x, y, amount,
            life: 1.0,
            color: amount >= 50 ? '#ffdd44' : '#ffffff'
        });
    },

    _addCombo() {
        this.comboCount++;
        this.comboTimer = 2;
    },

    _addKillExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 0.6,
                maxLife: 0.6,
                size: 4 + Math.random() * 4,
                color: ['#ffcc44', '#ff6644', '#ffaa22', '#ffffff'][Math.floor(Math.random() * 4)]
            });
        }
    },

    _spawnTimedPickup() {
        const types = ['hp', 'cd', 'power'];
        const type = types[Math.floor(Math.random() * types.length)];
        const level = this.levelConfig;
        const minX = Math.max(140, this.player.cx + 180);
        const maxX = Math.min(level.width - 140, this.player.cx + SCREEN_WIDTH * 0.85);
        let x = minX < maxX ? minX + Math.random() * (maxX - minX) : this.player.cx + 240;
        let y = GROUND_Y - 34;

        const visiblePlatforms = this.platforms.filter(platform =>
            platform.x > Game.camera.x - 80 &&
            platform.x < Game.camera.x + SCREEN_WIDTH + 220 &&
            platform.y < GROUND_Y - 60
        );

        if (visiblePlatforms.length > 0 && Math.random() < 0.45) {
            const platform = visiblePlatforms[Math.floor(Math.random() * visiblePlatforms.length)];
            x = platform.x + 20 + Math.random() * Math.max(20, platform.w - 40);
            y = platform.y - 24;
        }

        x = Math.max(80, Math.min(level.width - 80, x));
        this.pickups.push(new Pickup(type, x, y));
    },

    _drawDamageNumbers(ctx, cam) {
        for (const d of this.damageNumbers) {
            ctx.save();
            ctx.globalAlpha = d.life;
            ctx.font = `bold ${16 + (d.amount >= 50 ? 4 : 0)}px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.fillStyle = d.color;
            ctx.shadowColor = d.color;
            ctx.shadowBlur = 4;
            ctx.fillText(`-${d.amount}`, d.x, d.y);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    _drawParticles(ctx) {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
};
