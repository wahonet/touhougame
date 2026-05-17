/**
 * Enemy - PvE mode enemy entity with pixel art rendering and simple AI
 * Types: slime (ground walker), bat (flyer), skeleton (tank), boss
 */
import { MAX_HP, SCREEN_HEIGHT } from '../config/game-config.js';
import { AudioManager } from '../core/audio-manager.js';
import { emitHitImpact } from '../core/battle-events.js';
import { rectsOverlap } from '../systems/collision.js';
import { createSpreadBullets, createRingBullets, createSpiralBullets } from './bullet.js';

// ===================== PIXEL ART SPRITE GENERATORS =====================

function createPixelCanvas(width, height, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    return canvas;
}

function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

/** Blue slime — 80x80 bouncy blob */
function generateSlimeSprite(frame) {
    const s = 5; // pixel scale
    return createPixelCanvas(80, 80, (ctx) => {
        const squash = frame % 2 === 0 ? 0 : 1;
        // Shadow
        px(ctx, 3 * s, 12 * s + squash, 10 * s, s, 'rgba(0,0,0,0.2)');
        // Body
        px(ctx, 3 * s, 6 * s + squash, 10 * s, 6 * s - squash, '#4488ff');
        px(ctx, 2 * s, 7 * s + squash, 12 * s, 4 * s - squash, '#4488ff');
        px(ctx, 4 * s, 5 * s + squash, 8 * s, s, '#66aaff');
        // Highlight
        px(ctx, 4 * s, 6 * s + squash, 6 * s, s, '#88ccff');
        // Eyes
        px(ctx, 4 * s, 8 * s + squash, s, 2 * s, '#ffffff');
        px(ctx, 9 * s, 8 * s + squash, s, 2 * s, '#ffffff');
        px(ctx, 4 * s, 8 * s + squash, s, s, '#222244');
        px(ctx, 9 * s, 8 * s + squash, s, s, '#222244');
    });
}

/** Red bat — 64x64 flying enemy */
function generateBatSprite(frame) {
    const s = 4;
    return createPixelCanvas(64, 64, (ctx) => {
        const wingUp = frame % 2 === 0;
        // Body
        px(ctx, 6 * s, 6 * s, 4 * s, 4 * s, '#cc4444');
        // Head
        px(ctx, 7 * s, 5 * s, 2 * s, 2 * s, '#cc4444');
        // Eyes
        px(ctx, 7 * s, 5 * s, s, s, '#ffff44');
        px(ctx, 8 * s, 5 * s, s, s, '#ffff44');
        // Wings
        if (wingUp) {
            px(ctx, 2 * s, 4 * s, 4 * s, 2 * s, '#aa3333');
            px(ctx, 1 * s, 3 * s, 3 * s, s, '#993333');
            px(ctx, 10 * s, 4 * s, 4 * s, 2 * s, '#aa3333');
            px(ctx, 12 * s, 3 * s, 3 * s, s, '#993333');
        } else {
            px(ctx, 2 * s, 8 * s, 4 * s, 2 * s, '#aa3333');
            px(ctx, 1 * s, 9 * s, 3 * s, s, '#993333');
            px(ctx, 10 * s, 8 * s, 4 * s, 2 * s, '#aa3333');
            px(ctx, 12 * s, 9 * s, 3 * s, s, '#993333');
        }
        // Fangs
        px(ctx, 7 * s, 7 * s, s, s, '#ffffff');
        px(ctx, 8 * s, 7 * s, s, s, '#ffffff');
    });
}

/** Skeleton warrior — 64x80 ground tank */
function generateSkeletonSprite(frame) {
    const s = 4;
    return createPixelCanvas(64, 80, (ctx) => {
        // Skull
        px(ctx, 5 * s, 0, 6 * s, 5 * s, '#ddd8cc');
        px(ctx, 6 * s, 0, 4 * s, s, '#eee8dd');
        // Eye sockets
        px(ctx, 6 * s, s, s, 2 * s, '#332211');
        px(ctx, 9 * s, s, s, 2 * s, '#332211');
        // Eye glow
        px(ctx, 6 * s, 2 * s, s, s, '#ff4444');
        px(ctx, 9 * s, 2 * s, s, s, '#ff4444');
        // Jaw
        px(ctx, 6 * s, 4 * s, 4 * s, s, '#bbb5a8');
        // Spine
        px(ctx, 7 * s, 5 * s, 2 * s, 5 * s, '#ccc8bb');
        // Ribs
        px(ctx, 5 * s, 6 * s, 6 * s, s, '#ccc8bb');
        px(ctx, 5 * s, 8 * s, 6 * s, s, '#ccc8bb');
        // Arms
        const armOffset = frame % 2 === 0 ? 0 : 1;
        px(ctx, 3 * s, (6 + armOffset) * s, 2 * s, 4 * s, '#bbb5a8');
        px(ctx, 11 * s, (6 - armOffset) * s, 2 * s, 4 * s, '#bbb5a8');
        // Sword in right hand
        px(ctx, 13 * s, (4 - armOffset) * s, s, 6 * s, '#aabbcc');
        px(ctx, 13 * s, (3 - armOffset) * s, s, s, '#ffffff');
        // Pelvis
        px(ctx, 5 * s, 10 * s, 6 * s, 2 * s, '#ccc8bb');
        // Legs
        px(ctx, 5 * s, 12 * s, 2 * s, 6 * s, '#bbb5a8');
        px(ctx, 9 * s, 12 * s, 2 * s, 6 * s, '#bbb5a8');
        // Feet
        px(ctx, 4 * s, 18 * s, 3 * s, s, '#aaa59a');
        px(ctx, 9 * s, 18 * s, 3 * s, s, '#aaa59a');
    });
}

/** Skullman — 64x64 small skeleton pixel figure (slightly tougher than slime) */
function generateSkullmanSprite(frame) {
    const s = 4;
    return createPixelCanvas(64, 64, (ctx) => {
        const bob = frame % 2 === 0 ? 0 : 1;
        // Skull head
        px(ctx, 3 * s, (0 + bob) * s, 4 * s, 4 * s, '#e8e0d0');
        px(ctx, 2 * s, (1 + bob) * s, 6 * s, 3 * s, '#e8e0d0');
        // Eye sockets
        px(ctx, 3 * s, (1 + bob) * s, s, 2 * s, '#221100');
        px(ctx, 5 * s, (1 + bob) * s, s, 2 * s, '#221100');
        // Red eyes
        px(ctx, 3 * s, (2 + bob) * s, s, s, '#ff3333');
        px(ctx, 5 * s, (2 + bob) * s, s, s, '#ff3333');
        // Mouth
        px(ctx, 3 * s, (3 + bob) * s, 4 * s, s, '#bbb5a8');
        px(ctx, 4 * s, (3 + bob) * s, s, s, '#221100');
        // Neck/spine
        px(ctx, 4 * s, (4 + bob) * s, 2 * s, 3 * s, '#d0c8bb');
        // Ribs
        px(ctx, 2 * s, (5 + bob) * s, 6 * s, s, '#c8c0b3');
        px(ctx, 3 * s, (6 + bob) * s, 4 * s, s, '#c8c0b3');
        px(ctx, 2 * s, (7 + bob) * s, 6 * s, s, '#c8c0b3');
        // Arms
        px(ctx, 0, (5 + bob) * s, 2 * s, 4 * s, '#b8b0a3');
        px(ctx, 8 * s, (5 - bob) * s, 2 * s, 4 * s, '#b8b0a3');
        // Bone hands
        px(ctx, 0, (8 + bob) * s, 2 * s, s, '#a8a098');
        px(ctx, 8 * s, (8 - bob) * s, 2 * s, s, '#a8a098');
        // Pelvis
        px(ctx, 3 * s, (8 + bob) * s, 4 * s, 2 * s, '#c0b8ab');
        // Legs
        px(ctx, 2 * s, (10 + bob) * s, 2 * s, 4 * s, '#b0a898');
        px(ctx, 6 * s, (10 - bob) * s, 2 * s, 4 * s, '#b0a898');
        // Feet
        px(ctx, 1 * s, (13 + bob) * s, 3 * s, s, '#a09888');
        px(ctx, 5 * s, (13 - bob) * s, 3 * s, s, '#a09888');
    });
}

/** Boss — large 96x112 demon */
function generateBossSprite(frame) {
    const s = 4;
    return createPixelCanvas(96, 112, (ctx) => {        // Horns
        px(ctx, 3 * s, 0, 2 * s, 4 * s, '#882222');
        px(ctx, 19 * s, 0, 2 * s, 4 * s, '#882222');
        // Head
        px(ctx, 5 * s, 2 * s, 14 * s, 6 * s, '#661111');
        px(ctx, 6 * s, s, 12 * s, s, '#772222');
        // Eyes
        px(ctx, 7 * s, 4 * s, 2 * s, 2 * s, '#ff4444');
        px(ctx, 15 * s, 4 * s, 2 * s, 2 * s, '#ff4444');
        px(ctx, 8 * s, 4 * s, s, s, '#ffff88');
        px(ctx, 16 * s, 4 * s, s, s, '#ffff88');
        // Mouth
        px(ctx, 9 * s, 7 * s, 6 * s, s, '#440000');
        // Body
        px(ctx, 6 * s, 8 * s, 12 * s, 8 * s, '#551111');
        px(ctx, 7 * s, 8 * s, 10 * s, 2 * s, '#773333');
        // Arms
        const armOff = frame % 2 === 0 ? 0 : 1;
        px(ctx, 2 * s, (9 + armOff) * s, 4 * s, 6 * s, '#551111');
        px(ctx, 18 * s, (9 - armOff) * s, 4 * s, 6 * s, '#551111');
        // Claws
        px(ctx, s, (14 + armOff) * s, 3 * s, 2 * s, '#882222');
        px(ctx, 20 * s, (14 - armOff) * s, 3 * s, 2 * s, '#882222');
        // Legs
        px(ctx, 7 * s, 16 * s, 4 * s, 8 * s, '#441111');
        px(ctx, 13 * s, 16 * s, 4 * s, 8 * s, '#441111');
        // Feet
        px(ctx, 6 * s, 24 * s, 5 * s, 2 * s, '#331111');
        px(ctx, 13 * s, 24 * s, 5 * s, 2 * s, '#331111');
        // Chest symbol
        px(ctx, 10 * s, 10 * s, 4 * s, s, '#ffcc00');
        px(ctx, 11 * s, 11 * s, 2 * s, s, '#ffcc00');
    });
}

// Pre-generate sprite frames
const SPRITE_CACHE = {};

function getEnemySprites(type) {
    if (SPRITE_CACHE[type]) return SPRITE_CACHE[type];
    const frames = [];
    switch (type) {
        case 'slime':
            frames.push(generateSlimeSprite(0), generateSlimeSprite(1));
            break;
        case 'bat':
            frames.push(generateBatSprite(0), generateBatSprite(1));
            break;
        case 'skeleton':
            frames.push(generateSkeletonSprite(0), generateSkeletonSprite(1));
            break;
        case 'skullman':
            frames.push(generateSkullmanSprite(0), generateSkullmanSprite(1));
            break;
        case 'boss':
            frames.push(generateBossSprite(0), generateBossSprite(1));
            break;
    }
    SPRITE_CACHE[type] = frames;
    return frames;
}

// ===================== ENEMY CLASS =====================

const ENEMY_STATS = {
    slime:    { hp: 60,  speed: 1.2, atkDamage: 8,  score: 100, width: 80, height: 80 },
    skullman: { hp: 90,  speed: 1.5, atkDamage: 12, score: 150, width: 64, height: 64 },
    bat:      { hp: 40,  speed: 1.8, atkDamage: 10, score: 150, width: 64, height: 64 },
    skeleton: { hp: 150, speed: 1.0, atkDamage: 15, score: 300, width: 64, height: 80 },
    boss:     { hp: 800, speed: 0.8, atkDamage: 25, score: 1000, width: 96, height: 112 }
};

export class Enemy {
    /**
     * @param {string} type - 'slime', 'bat', 'skeleton', 'boss'
     * @param {number} cx - Center x position
     * @param {number} cy - Center y position (bottom)
     * @param {number} groundY - Ground Y
     * @param {number} patrolLeft - Left patrol boundary
     * @param {number} patrolRight - Right patrol boundary
     */
    constructor(type, cx, cy, groundY, patrolLeft, patrolRight) {
        const stats = ENEMY_STATS[type];
        this.type = type;
        this.cx = cx;
        this.cy = cy;
        this.groundY = groundY;
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.speed = stats.speed;
        this.atkDamage = stats.atkDamage;
        this.score = stats.score;
        this.width = stats.width;
        this.height = stats.height;

        this.state = 'idle'; // idle, walk, attack, dead, hurt
        this.facing = 'left';
        this.velocityY = 0;
        this.isOnGround = true;
        this.hitFlash = 0;
        this._atkHit = false;

        // AI
        this.aiTimer = 0;
        this.aiDir = -1; // -1 left, 1 right
        this.patrolLeft = patrolLeft || cx - 100;
        this.patrolRight = patrolRight || cx + 100;
        this.aggroRange = type === 'boss' ? 500 : 300;
        this.attackRange = type === 'bat' ? 70 : (type === 'slime' ? 60 : 75);
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.deathTimer = 0;

        // Animation
        this.sprites = getEnemySprites(type);
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 0.15; // seconds per frame switch

        // Bat-specific: floating pattern
        this.floatBaseY = cy;
        this.floatTimer = Math.random() * Math.PI * 2;

        // Skeleton-specific: block state
        this.blocking = false;
        this.blockTimer = 0;

        // Boss-specific
        this.phaseTwo = false;
        this.specialCooldown = 0;
        this.projectiles = [];
        this.attackPattern = 0;
        this.patternTimer = 0;
    }

    getHurtbox() {
        return {
            x: this.cx - this.width / 2,
            y: this.cy - this.height,
            w: this.width,
            h: this.height
        };
    }

    getHitbox() {
        if (this.state !== 'attack') return null;
        const hb = this.getHurtbox();
        let hx, hy;
        const hitW = this.type === 'boss' ? 100 : 60;
        const hitH = this.type === 'boss' ? 80 : 50;
        if (this.facing === 'right') {
            hx = hb.x + hb.w;
        } else {
            hx = hb.x - hitW;
        }
        hy = hb.y + (hb.h - hitH) / 2;
        return { x: hx, y: hy, w: hitW, h: hitH };
    }

    damage(amount) {
        if (this.state === 'dead') return;
        this.hp -= amount;
        this.hitFlash = 0.15;
        emitHitImpact({
            x: this.cx,
            y: this.cy - this.height / 2,
            color: '#ff6644',
            shake: amount * 0.1,
            maxShake: 10
        });
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.deathTimer = 0.6;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_death', 0.5);
        } else {
            // Boss enters phase 2 at 50% HP
            if (this.type === 'boss' && !this.phaseTwo && this.hp <= this.maxHp / 2) {
                this.phaseTwo = true;
                this.speed *= 1.5;
            }
        }
    }

    update(dt, playerCx, playerCy) {
        if (this.state === 'dead') {
            this.deathTimer -= dt;
            return;
        }

        // Animation
        this.animTimer += dt;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer -= this.animSpeed;
            this.animFrame = (this.animFrame + 1) % this.sprites.length;
        }

        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
            if (this.hitFlash < 0) this.hitFlash = 0;
        }

        // Attack cooldown
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.specialCooldown > 0) this.specialCooldown -= dt;

        // Face toward player
        if (playerCx > this.cx) {
            this.facing = 'right';
        } else {
            this.facing = 'left';
        }

        const distToPlayer = Math.abs(this.cx - playerCx);

        // AI behavior by type
        switch (this.type) {
            case 'slime': this._aiSlime(dt, distToPlayer, playerCx, playerCy); break;
            case 'skullman': this._aiSkullman(dt, distToPlayer, playerCx, playerCy); break;
            case 'bat': this._aiBat(dt, distToPlayer, playerCx, playerCy); break;
            case 'skeleton': this._aiSkeleton(dt, distToPlayer, playerCx, playerCy); break;
            case 'boss': this._aiBoss(dt, distToPlayer, playerCx, playerCy); break;
        }

        // Physics (gravity for non-bats)
        if (this.type !== 'bat') {
            if (!this.isOnGround) {
                this.velocityY += 0.55;
                this.cy += this.velocityY;
                if (this.cy >= this.groundY) {
                    this.cy = this.groundY;
                    this.velocityY = 0;
                    this.isOnGround = true;
                }
            }
        }

        // Attack animation finish
        if (this.state === 'attack') {
            this._atkHit = false;
            // Attack lasts 0.4s
            this.aiTimer += dt;
            if (this.aiTimer >= 0.4) {
                this.state = 'idle';
                this.attackCooldown = this.type === 'boss' ? 0.8 : 1.2;
            }
        }

        // Boss projectile update
        if (this.type === 'boss') {
            this._updateBossProjectiles(dt, playerCx, playerCy);
        }
    }

    _aiSlime(dt, dist, playerCx, playerCy) {
        if (this.state === 'attack') return;

        if (dist < this.attackRange) {
            this.state = 'attack';
            this.aiTimer = 0;
            return;
        }

        if (dist < this.aggroRange) {
            // Chase player
            const dir = playerCx > this.cx ? 1 : -1;
            this.cx += dir * this.speed;
            this.state = 'walk';
        } else {
            // Patrol
            this.cx += this.aiDir * this.speed * 0.5;
            if (this.cx <= this.patrolLeft) this.aiDir = 1;
            if (this.cx >= this.patrolRight) this.aiDir = -1;
            this.state = 'walk';
        }
    }

    _aiSkullman(dt, dist, playerCx, playerCy) {
        if (this.state === 'attack') return;

        if (dist < this.attackRange) {
            this.state = 'attack';
            this.aiTimer = 0;
            return;
        }

        if (dist < this.aggroRange) {
            // Chase player — faster than slime
            const dir = playerCx > this.cx ? 1 : -1;
            this.cx += dir * this.speed;
            this.state = 'walk';
        } else {
            // Patrol — wider range
            this.cx += this.aiDir * this.speed * 0.6;
            if (this.cx <= this.patrolLeft) this.aiDir = 1;
            if (this.cx >= this.patrolRight) this.aiDir = -1;
            this.state = 'walk';
        }
    }

    _aiBat(dt, dist, playerCx, playerCy) {
        if (this.state === 'attack') return;

        // Float up and down
        this.floatTimer += dt * 3;
        this.cy = this.floatBaseY + Math.sin(this.floatTimer) * 30;

        if (dist < this.attackRange) {
            this.state = 'attack';
            this.aiTimer = 0;
            return;
        }

        if (dist < this.aggroRange) {
            const dir = playerCx > this.cx ? 1 : -1;
            this.cx += dir * this.speed;
            // Also adjust height toward player
            const targetY = playerCy - 40;
            this.floatBaseY += (targetY - this.floatBaseY) * 0.02;
            this.state = 'walk';
        } else {
            // Circle patrol
            this.cx += this.aiDir * this.speed * 0.4;
            if (this.cx <= this.patrolLeft) this.aiDir = 1;
            if (this.cx >= this.patrolRight) this.aiDir = -1;
            this.state = 'walk';
        }
    }

    _aiSkeleton(dt, dist, playerCx, playerCy) {
        if (this.state === 'attack') return;

        if (dist < this.attackRange) {
            this.state = 'attack';
            this.aiTimer = 0;
            return;
        }

        if (dist < this.aggroRange) {
            const dir = playerCx > this.cx ? 1 : -1;
            this.cx += dir * this.speed;
            this.state = 'walk';
        } else {
            // Patrol
            this.cx += this.aiDir * this.speed * 0.3;
            if (this.cx <= this.patrolLeft) this.aiDir = 1;
            if (this.cx >= this.patrolRight) this.aiDir = -1;
            this.state = 'walk';
        }
    }

    _aiBoss(dt, dist, playerCx, playerCy) {
        if (this.state === 'attack') return;

        // Pattern timer
        this.patternTimer += dt;

        // Boss is always aggressive
        if (dist < this.attackRange && this.attackCooldown <= 0) {
            this.state = 'attack';
            this.aiTimer = 0;
            return;
        }

        // Phase-based projectile attacks
        if (this.phaseTwo) {
            // Phase 2: More aggressive, shorter cooldowns
            if (this.specialCooldown <= 0) {
                this._bossSpecialAttack(playerCx, playerCy);
                this.specialCooldown = 2;
            }
            // Jump slam
            if (this.patternTimer > 6 && this.isOnGround) {
                this.velocityY = -15;
                this.isOnGround = false;
                this.patternTimer = 0;
            }
        } else {
            // Phase 1: Periodic projectile attacks
            if (this.specialCooldown <= 0) {
                this._bossRangedAttack(playerCx, playerCy);
                this.specialCooldown = 3;
            }
        }

        const dir = playerCx > this.cx ? 1 : -1;
        const moveSpeed = this.phaseTwo ? this.speed * 1.5 : this.speed;
        this.cx += dir * moveSpeed;
        this.state = 'walk';
    }

    /** Phase 1: Fire spread of projectiles */
    _bossRangedAttack(playerCx, playerCy) {
        const count = 5;
        const spreadAngle = Math.PI * 0.4; // 72 degree spread
        const baseAngle = Math.atan2(playerCy - this.cy, playerCx - this.cx);
        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spreadAngle / 2 + (spreadAngle / (count - 1)) * i;
            this.projectiles.push({
                x: this.cx,
                y: this.cy - this.height / 2,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                radius: 8,
                damage: 15,
                life: 3,
                color: '#ff4444'
            });
        }
    }

    /** Phase 2: Circular burst + aimed shot */
    _bossSpecialAttack(playerCx, playerCy) {
        // Circular burst of 12 projectiles
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.projectiles.push({
                x: this.cx,
                y: this.cy - this.height / 2,
                vx: Math.cos(angle) * 3.5,
                vy: Math.sin(angle) * 3.5,
                radius: 10,
                damage: 20,
                life: 4,
                color: '#ffcc00'
            });
        }
        // Plus an aimed fast shot
        const aimAngle = Math.atan2(playerCy - this.cy, playerCx - this.cx);
        this.projectiles.push({
            x: this.cx,
            y: this.cy - this.height / 2,
            vx: Math.cos(aimAngle) * 6,
            vy: Math.sin(aimAngle) * 6,
            radius: 12,
            damage: 30,
            life: 3,
            color: '#ff8800'
        });
    }

    /** Update boss projectiles */
    _updateBossProjectiles(dt, playerCx, playerCy) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (this.state === 'dead') {
            // Death fade
            const alpha = Math.max(0, this.deathTimer / 0.6);
            ctx.save();
            ctx.globalAlpha = alpha;
            const sprite = this.sprites[0];
            ctx.drawImage(sprite, this.cx - this.width / 2, this.cy - this.height);
            ctx.restore();
            return;
        }

        const sprite = this.sprites[this.animFrame];
        const x = this.cx - this.width / 2;
        const y = this.cy - this.height;

        ctx.save();

        // Flip based on facing
        if (this.facing === 'left') {
            ctx.translate(this.cx, 0);
            ctx.scale(-1, 1);
            ctx.translate(-this.cx, 0);
        }

        ctx.drawImage(sprite, x, y);

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x, y, this.width, this.height);
        }

        ctx.restore();

        // Draw boss projectiles
        if (this.projectiles && this.projectiles.length > 0) {
            for (const p of this.projectiles) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color || '#ff4444';
                ctx.shadowColor = p.color || '#ff4444';
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
                // Bright core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.restore();
            }
        }

        // HP bar (only when damaged)
        if (this.hp < this.maxHp) {
            const barW = this.type === 'boss' ? 100 : 50;
            const barH = 6;
            const barX = this.cx - barW / 2;
            const barY = this.cy - this.height - 8;
            const ratio = this.hp / this.maxHp;

            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX, barY, barW, barH);
            const hpColor = ratio > 0.5 ? '#44ff44' : (ratio > 0.25 ? '#ffaa44' : '#ff4444');
            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barW * ratio, barH);
            ctx.restore();
        }

        // Boss projectiles
        for (const p of this.projectiles) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            // Inner bright core
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.restore();
        }
    }
}
