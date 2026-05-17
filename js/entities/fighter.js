/**
 * Fighter - Character entity with physics, AI, hit detection, skills, and rendering
 * 4-skill system with independent cooldowns per character.
 */
import { ARENA_WIDTH, MAX_HP } from '../config/game-config.js';
import { Anim } from './animation.js';
import { Assets } from '../core/asset-store.js';
import { AudioManager } from '../core/audio-manager.js';
import { Game } from '../core/game-state.js';
import { createSkillSlots, getCharacterDefinition } from '../data/characters.js';
import { emitHitImpact } from '../core/battle-events.js';
import * as SkillSystem from './fighter-skills.js';
import * as AISystem from './fighter-ai.js';
import * as Renderer from './fighter-renderer.js';

export class Fighter {
    /**
     * @param {string} name - "reimu" or "marisa"
     * @param {number} cx - Center x position
     * @param {number} groundY - Y coordinate of ground
     * @param {string} facing - "left" or "right"
     * @param {boolean} isAI - Whether this fighter is AI-controlled
     */
    constructor(name, cx, groundY, facing, isAI) {
        this.name = name;
        this.cx = cx;
        this.groundY = groundY;
        this.cy = groundY;
        this.facing = facing;
        this.isAI = isAI;
        const character = getCharacterDefinition(name) || {};
        this.maxHp = character.maxHp || MAX_HP;
        this.hp = this.maxHp;
        this.state = 'idle'; // idle, walk, attack, dead
        this.velocityY = 0;
        this.velocityX = 0;
        this.isOnGround = true;
        this._atkHit = false;
        this.hitFlash = 0;
        this.prevCy = groundY;

        // Platform tracking
        this._currentPlatform = null;

        // Hurtbox / hitbox dimensions (120px sprite)
        this.hurtboxW = 50;
        this.hurtboxH = 100;
        this.hitboxW = character.attackRange || 100;
        this.hitboxH = 70;

        // Movement
        this.moveSpeed = 3.5;

        // 4-skill system with independent cooldowns
        this.skills = createSkillSlots(name);

        // Shield state (used by skill 2 for reimu, skill 3 for marisa barrier)
        this.shield = null; // { hp, maxHp, duration, timer, flashTimer }

        // Flying state (reimu skill 4)
        this.flying = { active: false, timer: 0, duration: 5 };

        // Normal attack damage
        this.attackDamage = character.attackDamage || 10;
        this.nextAttackBonus = 0;

        // Status effects
        this.stunTimer = 0;
        this.slowTimer = 0;
        this.slowMultiplier = 1;
        this.invincible = false;
        this.timeStopTimer = 0;
        this.confuseTimer = 0;

        // Animations
        this.anims = {};
        this._buildAnims(facing);
        this.currentAnim = this.anims.idle;

        // AI state
        if (this.isAI) {
            this.aiTimer = 0;
            this.aiAction = 'idle';
            this.aiActionTimer = 0;
            this.aiCooldown = 0;
            this.aiActionTarget = null;
            this.aiLastDamageTaken = 0;
            this.aiComboCount = 0;
            this.aiLastSkillUsed = -1;
            this.aiThreatLevel = 0;
            this.aiDodgeCooldown = 0;
            this.aiComboFollowUp = false;
            this.aiRetreatTimer = 0;
        }
    }

    /** Build animation objects from global Assets for current facing direction */
    _buildAnims(facing) {
        const dir = facing;
        const sprites = Assets.sprites[this.name][dir];

        this.anims.idle = new Anim([sprites.stand], 0.1, true);
        this.anims.walk = new Anim(sprites.walk, 0.1, true);
        this.anims.attack = new Anim(sprites.attack, 0.1, false);
        this.anims.dead = new Anim([sprites.stand], 0.5, true);
    }

    /** Switch facing direction and rebuild animations */
    setFacing(facing) {
        if (this.facing === facing) return;
        this.facing = facing;
        this._buildAnims(facing);
        this._syncAnim();
    }

    /** Sync current animation to current state */
    _syncAnim() {
        // Don't change anim while flying (uses fly sprite directly)
        if (this.flying.active && this.state !== 'attack') return;

        switch (this.state) {
            case 'idle':
            case 'walk':
                this.currentAnim = this.anims[this.state];
                break;
            case 'attack':
                this.currentAnim = this.anims.attack;
                this.currentAnim.reset();
                break;
            case 'dead':
                this.currentAnim = this.anims.dead;
                break;
        }
    }

    /** Get the hurtbox rectangle */
    getHurtbox() {
        return {
            x: this.cx - this.hurtboxW / 2,
            y: this.cy - this.hurtboxH,
            w: this.hurtboxW,
            h: this.hurtboxH
        };
    }

    /** Get the hitbox rectangle during attack (or null) */
    getHitbox() {
        if (this.state !== 'attack') return null;
        const hb = this.getHurtbox();
        let hx, hy;
        if (this.facing === 'right') {
            hx = hb.x + hb.w;
        } else {
            hx = hb.x - this.hitboxW;
        }
        hy = hb.y + (hb.h - this.hitboxH) / 2;
        return { x: hx, y: hy, w: this.hitboxW, h: this.hitboxH };
    }

    /**
     * Apply damage to this fighter (shield absorbs first)
     * @param {number} amount - Damage amount
     */
    damage(amount) {
        if (this.state === 'dead' || this.invincible) return;

        // Shield absorbs damage first
        if (this.shield) {
            if (this.shield.hp > amount) {
                this.shield.hp -= amount;
                this.shield.flashTimer = 0.15;
                return;
            } else {
                // Shield breaks
                const remaining = amount - this.shield.hp;
                this.shield.hp = 0;
                this.shield.shatterTimer = 0.3; // brief shatter visual
                // Apply remaining damage to HP
                if (remaining > 0) {
                    this.hp -= remaining;
                }
            }
        } else {
            this.hp -= amount;
        }

        this.hitFlash = 0.15;
        // Trigger screen shake and hit particles
        emitHitImpact({
            x: this.cx,
            y: this.cy - this.hurtboxH / 2,
            color: '#ffcc44',
            shake: amount * 0.15,
            maxShake: 15
        });
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this._syncAnim();
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_death');
        }
    }

    /**
     * Main update loop
     * @param {number} dt - Delta time in seconds
     * @param {Object} keys - Currently held keys {a, d, w, s, space, j}
     * @param {boolean} attackPressed - J key just pressed this frame
     * @param {boolean} jumpPressed - W/Space just pressed this frame
     * @param {Object} skillPressed - {1: bool, 2: bool, 3: bool, 4: bool}
     * @param {Fighter} opponent - The other fighter
     * @param {Array} platforms - Platform objects
     * @param {Array} pickups - Pickup objects
     */
    update(dt, keys, attackPressed, jumpPressed, skillPressed, opponent, platforms, pickups) {
        if (this.state === 'dead') {
            this.currentAnim.update(dt);
            // Tick down all skill cooldowns
            for (const skill of this.skills) {
                if (skill.cooldown > 0) {
                    skill.cooldown -= dt;
                    if (skill.cooldown < 0) skill.cooldown = 0;
                }
            }
            return;
        }

        if (this.timeStopTimer > 0) {
            this.timeStopTimer -= dt;
            if (this.timeStopTimer < 0) this.timeStopTimer = 0;
            return;
        }

        this._updateStatusTimers(dt);

        // Track landing (before physics)
        this._wasOnGround = this.isOnGround;

        const canAct = this.stunTimer <= 0;

        // Skill activation (blocked while stunned)
        if (canAct) {
            for (let i = 0; i < 4; i++) {
                const keyIndex = i + 1;
                if (skillPressed[keyIndex]) {
                    this.activateSkill(i, opponent);
                }
            }
        }

        // Update all active skills
        for (let i = 0; i < 4; i++) {
            if (this.skills[i].cooldown > 0) {
                this.skills[i].cooldown -= dt;
                if (this.skills[i].cooldown < 0) this.skills[i].cooldown = 0;
            }
            if (this.skills[i].active) {
                this._updateSkillByIndex(i, dt, opponent);
            }
        }

        // Update shield
        if (this.shield) {
            this.shield.timer += dt;
            if (this.shield.flashTimer > 0) {
                this.shield.flashTimer -= dt;
            }
            if (this.shield.shatterTimer > 0) {
                this.shield.shatterTimer -= dt;
                if (this.shield.shatterTimer <= 0) {
                    this.shield = null;
                }
            } else if (this.shield && (this.shield.hp <= 0 || this.shield.timer >= this.shield.duration)) {
                this.shield = null;
            }
        }

        // Update flying
        if (this.flying.active) {
            this.flying.timer += dt;
            if (this.flying.timer >= this.flying.duration) {
                this.flying.active = false;
                this.flying.timer = 0;
                // If at or below ground, snap to ground and mark as grounded
                if (this.cy >= this.groundY) {
                    this.cy = this.groundY;
                    this.velocityY = 0;
                    this.isOnGround = true;
                    this._currentPlatform = null;
                } else {
                    // In the air after flight ends — start falling
                    this.isOnGround = false;
                    this._currentPlatform = null;
                }
                // Resume normal anim sync
                this._syncAnim();
            }
        }

        if (this.velocityX !== 0) {
            this.cx += this.velocityX;
            this.velocityX *= 0.82;
            if (Math.abs(this.velocityX) < 0.05) this.velocityX = 0;
        }

        // AI or player input
        if (!canAct) {
            if (this.state === 'walk' || this.state === 'attack') {
                this.state = 'idle';
                this._atkHit = false;
                this._syncAnim();
            }
        } else {
            const baseSpeed = this.moveSpeed;
            this.moveSpeed = baseSpeed * (this.slowMultiplier || 1);
            if (this.isAI) {
                this._updateAI(dt, opponent, platforms, pickups);
            } else {
                this._updatePlayer(dt, keys, attackPressed, jumpPressed);
            }
            this.moveSpeed = baseSpeed;
        }

        // Check if walked off platform
        if (this.isOnGround && this._currentPlatform) {
            const plat = this._currentPlatform;
            if (this.cx <= plat.x || this.cx >= plat.x + plat.w) {
                this.isOnGround = false;
                this._currentPlatform = null;
            }
        }

        // Physics - gravity (skip during flight)
        this.prevCy = this.cy;
        if (!this.isOnGround && !this.flying.active) {
            this.velocityY += 0.55;
            this.cy += this.velocityY;

            // Check platform landing (only when falling)
            if (this.velocityY > 0 && platforms) {
                const sortedPlatforms = [...platforms].sort((a, b) => a.y - b.y);
                for (const plat of sortedPlatforms) {
                    if (this.prevCy <= plat.y && this.cy >= plat.y) {
                        if (this.cx > plat.x - 10 && this.cx < plat.x + plat.w + 10) {
                            this.cy = plat.y;
                            this.velocityY = 0;
                            this.isOnGround = true;
                            this._currentPlatform = plat;
                            break;
                        }
                    }
                }
            }

            // Check ground
            if (!this.isOnGround && this.cy >= this.groundY) {
                this.cy = this.groundY;
                this.velocityY = 0;
                this.isOnGround = true;
                this._currentPlatform = null;
            }
        }

        // Landing sound
        if (this.isOnGround && !this._wasOnGround) {
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_land', 0.3);
        }

        // Attack animation finished
        if (this.state === 'attack' && this.currentAnim.isFinished) {
            this.state = 'idle';
            this._atkHit = false;
            this._syncAnim();
        }

        this.clampToBounds();

        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
            if (this.hitFlash < 0) this.hitFlash = 0;
        }

        // Update animation
        this.currentAnim.update(dt);
    }

    _updateStatusTimers(dt) {
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.stunTimer < 0) this.stunTimer = 0;
        }

        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowTimer = 0;
                this.slowMultiplier = 1;
            }
        } else {
            this.slowMultiplier = 1;
        }

        if (this.confuseTimer > 0) {
            this.confuseTimer -= dt;
            if (this.confuseTimer < 0) this.confuseTimer = 0;
        }
    }

    /** Player input handling */
    _updatePlayer(dt, keys, attackPressed, jumpPressed) {
        // Can't move or start actions during attack
        if (this.state === 'attack') return;

        if (this.flying.active) {
            this._updateFlightControls(keys, attackPressed);
            return;
        }

        // Movement
        let moving = false;
        const reverse = this.confuseTimer > 0;
        const moveLeft = reverse ? keys.d : keys.a;
        const moveRight = reverse ? keys.a : keys.d;

        if (moveLeft) {
            this.cx -= this.moveSpeed;
            this.setFacing('left');
            moving = true;
        }
        if (moveRight) {
            this.cx += this.moveSpeed;
            this.setFacing('right');
            moving = true;
        }

        // Flying: vertical movement with W/S
        if (this.flying.active) {
            if (keys.w) {
                this.cy -= 4;
                if (this.isOnGround) {
                    this.isOnGround = false;
                    this._currentPlatform = null;
                }
            }
            if (keys.s) {
                this.cy += 4;
            }
        }

        // Walking state
        if (moving && this.state !== 'walk') {
            this.state = 'walk';
            this._syncAnim();
        } else if (!moving && this.state === 'walk') {
            this.state = 'idle';
            this._syncAnim();
        }

        // Jump
        if (jumpPressed && this.isOnGround) {
            this.velocityY = -18;
            this.isOnGround = false;
            this._currentPlatform = null;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
        }

        // Attack
        if (attackPressed) {
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
        }
    }

    _updateFlightControls(keys, attackPressed) {
        const flightSpeed = 4.2 * (this.slowMultiplier || 1);
        let dx = 0;
        let dy = 0;

        if (keys.a) dx -= 1;
        if (keys.d) dx += 1;
        if (keys.w) dy -= 1;
        if (keys.s) dy += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
        }

        if (dx < 0) this.setFacing('left');
        if (dx > 0) this.setFacing('right');

        this.cx += dx * flightSpeed;
        this.cy += dy * flightSpeed;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isOnGround = false;
        this._currentPlatform = null;

        const minY = this.hurtboxH + 20;
        const maxY = this.groundY;
        if (this.cy < minY) this.cy = minY;
        if (this.cy > maxY) this.cy = maxY;

        if (attackPressed) {
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
        } else if (this.state !== 'idle') {
            this.state = 'idle';
            this._syncAnim();
        }
    }

    clampToBounds() {
        const halfW = this.hurtboxW / 2;
        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (this.cx < halfW) this.cx = halfW;
        if (this.cx > boundX - halfW) this.cx = boundX - halfW;

        const minY = this.hurtboxH + 20;
        if (this.cy < minY) {
            this.cy = minY;
            if (this.velocityY < 0) this.velocityY = 0;
        }
        if (this.cy > this.groundY) {
            this.cy = this.groundY;
            this.velocityY = 0;
            this.isOnGround = true;
            this._currentPlatform = null;
        }
    }

    // ===================== DELEGATE WRAPPERS =====================

    /** AI update (delegates to fighter-ai.js) */
    _updateAI(dt, opponent, platforms, pickups) {
        AISystem.updateAI(this, dt, opponent, platforms, pickups);
    }

    /** Activate a skill by index (delegates to fighter-skills.js) */
    activateSkill(index, opponent) {
        SkillSystem.activateSkill(this, index, opponent);
    }

    /** Update skill by index (delegates to fighter-skills.js) */
    _updateSkillByIndex(index, dt, opponent) {
        SkillSystem.updateSkillByIndex(this, index, dt, opponent);
    }

    /** Draw all active skill effects (delegates to fighter-skills.js) */
    drawSkill(ctx) {
        SkillSystem.drawSkill(this, ctx);
    }

    /** Get the beam rectangle for regular laser (delegates to fighter-skills.js) */
    getBeamRect() {
        return SkillSystem.getBeamRect(this);
    }

    /** Get the beam rectangle for big laser (delegates to fighter-skills.js) */
    getBigBeamRect() {
        return SkillSystem.getBigBeamRect(this);
    }

    /** Calculate beam rectangle for given direction/size (delegates to fighter-skills.js) */
    _calcBeamRect(dir, beamHeight, beamRange, centerY) {
        return SkillSystem.calcBeamRect(this, dir, beamHeight, beamRange, centerY);
    }

    /** Draw the fighter on canvas (delegates to fighter-renderer.js) */
    draw(ctx) {
        Renderer.draw(this, ctx);
    }
}
