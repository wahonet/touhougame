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
import { checkHit } from '../systems/combat.js';
import { rectsOverlap, resolveCollision } from '../systems/collision.js';
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
import { calcBeamRect } from '../entities/fighter-skills.js';

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

    init(levelIndex) {
        const groundY = GROUND_Y;

        // Load level config — default to first level (forest) for backward compat
        this.currentLevel = levelIndex || 0;
        this.levelConfig = PVE_LEVELS[this.currentLevel] || PVE_LEVELS[0];
        const level = this.levelConfig;
        const levelWidth = level.width;
        const levelEndX = level.endX;

        // Update global level width for Fighter boundary checks
        Game.pveLevelWidth = levelWidth;

        // Create player at level start
        this.player = new Fighter(Game.playerChar, 200, groundY, 'right', false);
        this.player.hp = MAX_HP;

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
                    const dmg = (player._powerMultiplier || 1) * 20;
                    enemy.damage(dmg);
                    this._addDamageNumber(enemy.cx, enemy.cy - enemy.height, dmg);
                    this._addCombo();
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
                }
            }

            // Player skill projectiles hit enemies
            this._checkPlayerSkillsHitEnemy(player, enemy);

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

        // --- Boss projectile → player collision ---
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
        // _checkPlayerSkillsHitEnemy exclusively.
        if (!this._dummyOpponent) {
            this._dummyOpponent = {
                cx: 99999, cy: GROUND_Y, state: 'idle',
                _atkHit: false,
                getHurtbox: () => ({ x: 99999, y: GROUND_Y - 100, w: 50, h: 100 }),
                getHitbox: () => null,
                damage: () => {}
            };
        }
        return this._dummyOpponent;
    },

    /** Check player skill effects against an enemy */
    _checkPlayerSkillsHitEnemy(player, enemy) {
        if (!enemy || enemy.state === 'dead') return;

        // Spell cards (Reimu skill 0)
        const spellSkill = player.skills[0];
        if (player.name === 'reimu' && spellSkill.active && spellSkill.data && spellSkill.data.projectiles) {
            for (const proj of spellSkill.data.projectiles) {
                if (!proj.active || proj.hitTarget) continue;
                const hurtbox = enemy.getHurtbox();
                if (proj.x > hurtbox.x && proj.x < hurtbox.x + hurtbox.w &&
                    proj.y > hurtbox.y && proj.y < hurtbox.y + hurtbox.h) {
                    proj.hitTarget = true;
                    enemy.damage(15);
                    spellSkill.data.hitEffects.push({ x: proj.x, y: proj.y, timer: 10 });
                    proj.active = false;
                }
            }
        }

        // Seal strike (Reimu skill 1)
        const sealSkill = player.skills[1];
        if (player.name === 'reimu' && sealSkill.active && sealSkill.data && sealSkill.data.seal) {
            const seal = sealSkill.data.seal;
            if (seal.active && !seal.hit) {
                const hurtbox = enemy.getHurtbox();
                if (seal.x > hurtbox.x && seal.x < hurtbox.x + hurtbox.w &&
                    seal.y > hurtbox.y && seal.y < hurtbox.y + hurtbox.h) {
                    seal.hit = true;
                    seal.active = false;
                    enemy.damage(150);
                    sealSkill.data.hitEffects.push({ x: seal.x, y: seal.y, timer: 30 });
                }
            }
        }

        // Lasers (Marisa skills 0 & 1)
        for (let si = 0; si <= 1; si++) {
            const laserSkill = player.skills[si];
            if (player.name === 'marisa' && laserSkill.active && laserSkill.data && laserSkill.data.phase === 'fire') {
                const beamHeight = si === 0 ? 40 : 64;
                const beamRange = si === 0 ? 800 : 1000;
                const tickDamage = si === 0 ? 20 : 100;
                const beamRect = player._calcBeamRect(laserSkill.data.beamDir, beamHeight, beamRange);
                if (beamRect) {
                    const hurtbox = enemy.getHurtbox();
                    if (rectsOverlap(beamRect, hurtbox)) {
                        // Apply damage per tick — track via a Set on the data
                        if (!laserSkill.data._hitEnemies) laserSkill.data._hitEnemies = new Set();
                        const key = `${si}_${enemy.cx}_${enemy.cy}`;
                        const tickIdx = laserSkill.data.damageTicks.filter(Boolean).length - 1;
                        const tickKey = `${key}_${tickIdx}`;
                        if (!laserSkill.data._hitEnemies.has(tickKey)) {
                            laserSkill.data._hitEnemies.add(tickKey);
                            enemy.damage(tickDamage);
                        }
                    }
                }
            }
        }

        // Star storm (Marisa skill 2)
        const starSkill = player.skills[2];
        if (player.name === 'marisa' && starSkill.active && starSkill.data && starSkill.data.stars) {
            for (const star of starSkill.data.stars) {
                if (!star.active) continue;
                const hurtbox = enemy.getHurtbox();
                if (star.x > hurtbox.x && star.x < hurtbox.x + hurtbox.w &&
                    star.y > hurtbox.y && star.y < hurtbox.y + hurtbox.h) {
                    if (!star.hitTargets.includes(enemy)) {
                        star.hitTargets.push(enemy);
                        enemy.damage(20);
                    }
                }
            }
        }

        // ---- YUYUKO SKILLS ----

        // Soul Butterfly (Yuyuko skill 0) - spread projectiles
        const yuyukoSkill0 = player.skills[0];
        if (player.name === 'yuyuko' && yuyukoSkill0.active && yuyukoSkill0.data && yuyukoSkill0.data.projectiles) {
            for (const proj of yuyukoSkill0.data.projectiles) {
                if (!proj.active || proj.hitTarget) continue;
                const hurtbox = enemy.getHurtbox();
                if (proj.x > hurtbox.x && proj.x < hurtbox.x + hurtbox.w &&
                    proj.y > hurtbox.y && proj.y < hurtbox.y + hurtbox.h) {
                    proj.hitTarget = true;
                    proj.active = false;
                    enemy.damage(12);
                    yuyukoSkill0.data.hitEffects.push({ x: proj.x, y: proj.y, timer: 10 });
                }
            }
        }

        // Death Invitation (Yuyuko skill 1) - homing orb
        const yuyukoSkill1 = player.skills[1];
        if (player.name === 'yuyuko' && yuyukoSkill1.active && yuyukoSkill1.data && yuyukoSkill1.data.orb) {
            const orb = yuyukoSkill1.data.orb;
            if (orb.active && !orb.hit) {
                const hurtbox = enemy.getHurtbox();
                if (orb.x > hurtbox.x && orb.x < hurtbox.x + hurtbox.w &&
                    orb.y > hurtbox.y && orb.y < hurtbox.y + hurtbox.h) {
                    orb.hit = true;
                    orb.active = false;
                    enemy.damage(100);
                    yuyukoSkill1.data.hitEffects.push({ x: orb.x, y: orb.y, timer: 30 });
                }
            }
        }

        // Cherry Blossom Storm (Yuyuko skill 3) - AoE tick
        const yuyukoSkill3 = player.skills[3];
        if (player.name === 'yuyuko' && yuyukoSkill3.active && yuyukoSkill3.data) {
            const data = yuyukoSkill3.data;
            if (data.tickTimer !== undefined && data.tickTimer >= data.tickInterval) {
                const hurtbox = enemy.getHurtbox();
                const ecx = hurtbox.x + hurtbox.w / 2;
                const ecy = hurtbox.y + hurtbox.h / 2;
                const dx = ecx - data.cx;
                const dy = ecy - data.cy;
                if (dx * dx + dy * dy <= data.radius * data.radius) {
                    if (!data._hitEnemies) data._hitEnemies = new Set();
                    const tickKey = `${enemy.cx}_${enemy.cy}_${Math.floor(data.timer / data.tickInterval)}`;
                    if (!data._hitEnemies.has(tickKey)) {
                        data._hitEnemies.add(tickKey);
                        enemy.damage(8);
                    }
                }
            }
        }

        // ---- YOUMU SKILLS ----

        // Roukanken (Youmu skill 0) - wide slash
        const youmuSkill0 = player.skills[0];
        if (player.name === 'youmu' && youmuSkill0.active && youmuSkill0.data && !youmuSkill0.data.hitTarget) {
            const data = youmuSkill0.data;
            const slashRect = { x: data.slashX - data.width / 2, y: data.slashY - data.height / 2, w: data.width, h: data.height };
            const hurtbox = enemy.getHurtbox();
            if (rectsOverlap(slashRect, hurtbox)) {
                youmuSkill0.data.hitTarget = true;
                enemy.damage(50);
            }
        }

        // Hakurouken Slash (Youmu skill 1) - dash hit
        const youmuSkill1 = player.skills[1];
        if (player.name === 'youmu' && youmuSkill1.active && youmuSkill1.data && !youmuSkill1.data.hitTarget) {
            const data = youmuSkill1.data;
            const dashRect = {
                x: player.cx - 30,
                y: player.cy - player.hurtboxH,
                w: 60,
                h: player.hurtboxH
            };
            const hurtbox = enemy.getHurtbox();
            if (rectsOverlap(dashRect, hurtbox)) {
                youmuSkill1.data.hitTarget = true;
                enemy.damage(80);
            }
        }

        // Slash of Present World (Youmu skill 3) - beam
        const youmuSkill3 = player.skills[3];
        if (player.name === 'youmu' && youmuSkill3.active && youmuSkill3.data && youmuSkill3.data.phase === 'fire') {
            const data = youmuSkill3.data;
            const beamRect = calcBeamRect(player, data.beamDir, 48, 800);
            if (beamRect) {
                const hurtbox = enemy.getHurtbox();
                if (rectsOverlap(beamRect, hurtbox)) {
                    if (!data._hitEnemies) data._hitEnemies = new Set();
                    const tickIdx = data.damageTicks.filter(Boolean).length - 1;
                    const tickKey = `${enemy.cx}_${enemy.cy}_${tickIdx}`;
                    if (!data._hitEnemies.has(tickKey)) {
                        data._hitEnemies.add(tickKey);
                        enemy.damage(40);
                    }
                }
            }
        }
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
