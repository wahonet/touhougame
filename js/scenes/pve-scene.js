/**
 * PvEScene - Side-scrolling action mode (Contra/Metal Slug style)
 * Player selects character, walks left to right, fights enemies, reaches the end.
 */
import {
    ARENA_WIDTH,
    FONT_FAMILY,
    MAX_HP,
    SCREEN_HEIGHT,
    SCREEN_WIDTH
} from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';
import { AudioManager } from '../core/audio-manager.js';
import { Game, createCamera } from '../core/game-state.js';
import { registerBattleHooks } from '../core/battle-events.js';
import { Fighter } from '../entities/fighter.js';
import { Enemy } from '../entities/enemy.js';
import { checkHit } from '../systems/combat.js';
import { rectsOverlap, resolveCollision } from '../systems/collision.js';
import { getCharacterDefinition } from '../data/characters.js';
import {
    GROUND_Y,
    PLATFORM_LAYOUT
} from '../data/stage-data.js';
import {
    PVE_LEVEL_WIDTH,
    PVE_LEVEL_END_X,
    PVE_PLATFORMS,
    PVE_ENEMY_SPAWNS,
    PVE_SPAWN_ZONES
} from '../data/pve-level-data.js';

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

    init() {
        const groundY = GROUND_Y;

        // Create player at level start
        this.player = new Fighter(Game.playerChar, 200, groundY, 'right', false);
        this.player.hp = MAX_HP;

        this.enemies = [];
        this.platforms = PVE_PLATFORMS.map(p => ({
            x: p.x, y: p.y, w: p.w, h: p.h, type: p.type
        }));
        this.particles = [];
        this.shakeAmount = 0;
        this.score = 0;
        this.killCount = 0;
        this.spawnedZones = new Set();
        this.victoryTriggered = false;
        this.defeatTriggered = false;

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
                x: Math.random() * PVE_LEVEL_WIDTH * 2,
                y: Math.random() * 450,
                size: 0.5 + Math.random() * 2,
                brightness: 0.2 + Math.random() * 0.6,
                twinkleSpeed: 0.001 + Math.random() * 0.004
            });
        }
        this.mountainSeed = Math.random() * 1000;

        if (typeof AudioManager !== 'undefined') AudioManager.playBGM('bgm_battle');
    },

    update(dt) {
        if (!this.player) return;

        const player = this.player;

        // --- Enemy spawning based on player position ---
        for (const zone of PVE_SPAWN_ZONES) {
            if (this.spawnedZones.has(zone.triggerX)) continue;
            if (player.cx >= zone.triggerX - 200) {
                this.spawnedZones.add(zone.triggerX);
                for (const idx of zone.spawnIndices) {
                    const spawn = PVE_ENEMY_SPAWNS[idx];
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

        // --- Update camera (follows player only) ---
        Game.camera.targetX = player.cx - SCREEN_WIDTH * 0.35;
        Game.camera.targetX = Math.max(0, Math.min(PVE_LEVEL_WIDTH - SCREEN_WIDTH, Game.camera.targetX));
        Game.camera.x += (Game.camera.targetX - Game.camera.x) * 0.1;
        Game.camera.x = Math.max(0, Math.min(PVE_LEVEL_WIDTH - SCREEN_WIDTH, Game.camera.x));

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

            // Player attack hits enemy (melee)
            if (player.state === 'attack' && !player._atkHit) {
                const pHitbox = player.getHitbox();
                const eHurtbox = enemy.getHurtbox();
                if (pHitbox && rectsOverlap(pHitbox, eHurtbox)) {
                    player._atkHit = true;
                    enemy.damage(20);
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
                }
            }

            // Player skill projectiles hit enemies
            this._checkPlayerSkillsHitEnemy(player, enemy);

            // Remove dead enemies after fade
            if (enemy.state === 'dead' && enemy.deathTimer <= 0) {
                this.score += enemy.score;
                this.killCount++;
                this.enemies.splice(i, 1);
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

        // --- Victory check ---
        if (player.cx >= PVE_LEVEL_END_X && !this.victoryTriggered && !this.defeatTriggered) {
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
    },

    draw(ctx) {
        const W = SCREEN_WIDTH, H = SCREEN_HEIGHT;
        const groundY = GROUND_Y;
        const cam = Game.camera.x;

        // ========== PARALLAX BACKGROUND ==========
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, '#050510');
        skyGrad.addColorStop(0.2, '#0a0a2e');
        skyGrad.addColorStop(0.4, '#1a1050');
        skyGrad.addColorStop(0.7, '#2a1a5a');
        skyGrad.addColorStop(1, '#3a2a6a');
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
        this._drawMountains(ctx, mtnOffset, groundY, 0.7, 'rgba(15, 10, 30, 0.6)', 120, 0.003);
        this._drawMountains(ctx, mtnOffset * 1.3, groundY, 0.85, 'rgba(20, 15, 40, 0.7)', 90, 0.005);
        ctx.restore();

        // ========== WORLD SPACE ==========
        ctx.save();

        if (this.shakeAmount > 0.5) {
            const shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
            const shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
            ctx.translate(shakeX, shakeY);
        }

        ctx.translate(-cam, 0);

        // Ground
        this._drawGround(ctx, groundY);

        // Platforms
        this._drawPlatforms(ctx);

        // Enemies
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }

        // Player
        if (this.player) {
            this.player.draw(ctx);
            this.player.drawSkill(ctx);
        }

        // Particles
        this._drawParticles(ctx);

        // Victory flag at end
        if (PVE_LEVEL_END_X) {
            const flagX = PVE_LEVEL_END_X;
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
        this._drawHUD(ctx);

        // Victory / Defeat overlay
        if (this.victoryTriggered) {
            this._drawVictory(ctx);
        }
        if (this.defeatTriggered && this.player && this.player.state === 'dead') {
            this._drawDefeat(ctx);
        }
    },

    // ========== HUD ==========

    _drawHUD(ctx) {
        const player = this.player;
        if (!player) return;

        const character = getCharacterDefinition(player.name);
        const barW = 300, barH = 24;
        const hpRatio = player.hp / MAX_HP;

        // Background panel
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(15, 12, 350, 50);

        // Character name
        ctx.font = `bold 16px ${FONT_FAMILY}`;
        ctx.fillStyle = character.accentColor;
        ctx.textAlign = 'left';
        ctx.fillText(character.uiName, 25, 30);

        // HP bar
        const barX = 25, barY = 38;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barW, barH);

        let hpColor = '#44ff66';
        if (hpRatio < 0.5) hpColor = '#ffaa44';
        if (hpRatio < 0.25) hpColor = '#ff4444';

        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, player.hp)} / ${MAX_HP}`, barX + barW / 2, barY + 16);

        // Score & kills (top right)
        ctx.textAlign = 'right';
        ctx.font = `bold 20px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`Score: ${this.score}`, SCREEN_WIDTH - 25, 30);
        ctx.font = `16px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`Kills: ${this.killCount}`, SCREEN_WIDTH - 25, 52);

        // Progress bar (bottom)
        const progressW = SCREEN_WIDTH - 100;
        const progressH = 8;
        const progressX = 50;
        const progressY = SCREEN_HEIGHT - 22;
        const progress = Math.min(1, this.player.cx / PVE_LEVEL_END_X);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(progressX, progressY, progressW, progressH);
        ctx.fillStyle = '#66ccff';
        ctx.fillRect(progressX, progressY, progressW * progress, progressH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(progressX, progressY, progressW, progressH);

        // Player dot on progress bar
        const dotX = progressX + progressW * progress;
        ctx.fillStyle = character.accentColor;
        ctx.shadowColor = character.accentColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(dotX, progressY + progressH / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Controls hint
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillText('A/D: Move  W/Space: Jump  J: Attack  1-4: Skills  R: Restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 4);

        // ========== SKILL UI ==========
        this._drawSkillUI(ctx, player);

        ctx.restore();
    },

    // ========== SKILL UI (same style as PvP BattleScene) ==========

    _drawSkillUI(ctx, fighter) {
        if (!fighter) return;

        const boxSize = 46;
        const gap = 6;
        const radius = boxSize / 2 - 2;
        const startX = 25;
        const startY = 68;

        const character = getCharacterDefinition(fighter.name);
        const colors = character.skillColors;
        const icons = Assets.skillIcons[fighter.name] || [];

        for (let i = 0; i < 4; i++) {
            const skill = fighter.skills[i];
            const bx = startX + i * (boxSize + gap);
            const by = startY;
            const cx = bx + boxSize / 2;
            const cy = by + boxSize / 2;

            const isReady = skill.cooldown <= 0 && !skill.active;
            const isActive = skill.active;
            const onCooldown = skill.cooldown > 0;

            ctx.save();

            // Circular dark background
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();

            // Draw icon image clipped to circle
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            const iconImg = icons[i];
            if (iconImg) {
                if (onCooldown) ctx.globalAlpha = 0.4;
                ctx.drawImage(iconImg, cx - radius, cy - radius, radius * 2, radius * 2);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = colors[i];
                ctx.globalAlpha = isReady ? 0.8 : 0.3;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.font = `bold 10px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(skill.name.substring(0, 2), cx, cy);
            }

            ctx.restore();
            ctx.save();

            // Circular sweep cooldown overlay
            if (onCooldown) {
                const cdRatio = skill.cooldown / skill.maxCooldown;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius + 1, -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2, false);
                ctx.closePath();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                ctx.fill();

                ctx.font = `bold 14px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(`${skill.cooldown.toFixed(1)}`, cx, cy);
            }

            // Border
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();

            if (isActive) {
                const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (isReady) {
                ctx.strokeStyle = colors[i];
                ctx.lineWidth = 2;
                ctx.shadowColor = colors[i];
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Key number badge
            const keyNum = i + 1;
            const badgeR = 8;
            const badgeCx = bx + boxSize - badgeR - 1;
            const badgeCy = by + badgeR + 1;
            ctx.beginPath();
            ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();
            ctx.font = `bold 11px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isReady ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(`${keyNum}`, badgeCx, badgeCy);

            ctx.restore();
        }
    },

    _drawVictory(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.font = `bold 64px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#ffcc00';
        ctx.fillText('STAGE CLEAR!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);

        ctx.shadowBlur = 0;
        ctx.font = `bold 28px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Score: ${this.score}   Kills: ${this.killCount}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

        ctx.font = `20px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Press R to return', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 70);
        ctx.restore();
    },

    _drawDefeat(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.font = `bold 56px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff4444';
        ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 30);

        ctx.shadowBlur = 0;
        ctx.font = `24px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`Score: ${this.score}   Kills: ${this.killCount}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

        ctx.font = `20px ${FONT_FAMILY}`;
        ctx.fillText('Press R to return', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60);
        ctx.restore();
    },

    // ========== BACKGROUND HELPERS (same pattern as BattleScene) ==========

    _drawMountains(ctx, offset, groundY, heightFactor, color, maxHeight, freq) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(offset - 50, groundY);
        for (let x = -50; x < SCREEN_WIDTH + 100; x += 4) {
            const worldX = x - offset;
            const h = (Math.sin(worldX * freq) * 0.5 + 0.5) * maxHeight * heightFactor +
                      (Math.sin(worldX * freq * 2.7 + 1) * 0.3 + 0.3) * maxHeight * 0.3 * heightFactor;
            ctx.lineTo(x + offset, groundY - h);
        }
        ctx.lineTo(SCREEN_WIDTH + 100 + offset, groundY);
        ctx.closePath();
        ctx.fill();
    },

    _drawGround(ctx, groundY) {
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, SCREEN_HEIGHT);
        groundGrad.addColorStop(0, '#4a6a2a');
        groundGrad.addColorStop(0.15, '#3a5a1a');
        groundGrad.addColorStop(0.5, '#2a4a10');
        groundGrad.addColorStop(1, '#1a3a08');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, PVE_LEVEL_WIDTH, SCREEN_HEIGHT - groundY);

        // Ground surface glow
        const surfGlow = ctx.createLinearGradient(0, groundY - 4, 0, groundY + 8);
        surfGlow.addColorStop(0, 'rgba(100, 200, 60, 0.3)');
        surfGlow.addColorStop(1, 'rgba(60, 120, 30, 0)');
        ctx.fillStyle = surfGlow;
        ctx.fillRect(0, groundY - 4, PVE_LEVEL_WIDTH, 12);

        // Ground line
        ctx.strokeStyle = 'rgba(100, 180, 60, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(PVE_LEVEL_WIDTH, groundY);
        ctx.stroke();
    },

    _drawPlatforms(ctx) {
        for (const plat of this.platforms) {
            const asset = plat.type === 'large' ? Assets.platform : Assets.platformSmall;
            if (asset) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                ctx.beginPath();
                ctx.ellipse(plat.x + plat.w / 2, plat.y + plat.h + 6, plat.w * 0.45, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.drawImage(asset, plat.x, plat.y, plat.w, plat.h);
            } else {
                ctx.save();
                const platGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
                platGrad.addColorStop(0, plat.type === 'large' ? 'rgba(120, 90, 55, 0.9)' : 'rgba(100, 80, 50, 0.85)');
                platGrad.addColorStop(1, plat.type === 'large' ? 'rgba(60, 45, 30, 0.8)' : 'rgba(50, 40, 28, 0.75)');
                ctx.fillStyle = platGrad;
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = 'rgba(180, 150, 100, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(plat.x + 3, plat.y + 1);
                ctx.lineTo(plat.x + plat.w - 3, plat.y + 1);
                ctx.stroke();
                ctx.restore();
            }
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
