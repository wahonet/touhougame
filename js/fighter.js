/**
 * Fighter - Character entity with physics, AI, hit detection, and rendering
 */
class Fighter {
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
        this.hp = 100;
        this.state = 'idle'; // idle, walk, attack, dead
        this.velocityY = 0;
        this.isOnGround = true;
        this._atkHit = false;
        this.hitFlash = 0;

        // Sprites are pre-scaled to SPRITE_DISPLAY_H (250px)
        // We use actual frame dimensions for drawing (preserves aspect ratio)

        // Hurtbox / hitbox dimensions
        this.hurtboxW = 120;
        this.hurtboxH = 200;
        this.hitboxW = 200;
        this.hitboxH = 160;

        // Movement
        this.moveSpeed = 5;

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
        }
    }

    /** Build animation objects from global Assets for current facing direction */
    _buildAnims(facing) {
        const dir = facing; // "left" or "right"
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
        // Reset current animation based on state
        this._syncAnim();
    }

    /** Sync current animation to current state */
    _syncAnim() {
        const prevState = this.currentAnim;
        this.currentAnim = this.anims[this.state] || this.anims.idle;
        if (this.currentAnim !== prevState) {
            this.currentAnim.reset();
        }
    }

    /** Get the hurtbox rectangle {x, y, w, h} */
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
     * Apply damage to this fighter
     * @param {number} amount - Damage amount
     */
    damage(amount) {
        if (this.state === 'dead') return;
        this.hp -= amount;
        this.hitFlash = 0.15;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this._syncAnim();
        }
    }

    /**
     * Main update loop
     * @param {number} dt - Delta time in seconds
     * @param {Object} keys - Currently held keys {a, d, w, space, j}
     * @param {boolean} attackPressed - J key just pressed this frame
     * @param {boolean} jumpPressed - W/Space just pressed this frame
     * @param {Fighter} opponent - The other fighter (for AI targeting)
     */
    update(dt, keys, attackPressed, jumpPressed, opponent) {
        if (this.state === 'dead') {
            this.currentAnim.update(dt);
            return;
        }

        if (this.isAI) {
            this._updateAI(dt, opponent);
        } else {
            this._updatePlayer(dt, keys, attackPressed, jumpPressed);
        }

        // Physics - gravity
        if (!this.isOnGround) {
            this.velocityY += 0.7;
            this.cy += this.velocityY;
            if (this.cy >= this.groundY) {
                this.cy = this.groundY;
                this.velocityY = 0;
                this.isOnGround = true;
            }
        }

        // Attack animation finished
        if (this.state === 'attack' && this.currentAnim.isFinished) {
            this.state = 'idle';
            this._atkHit = false;
            this._syncAnim();
        }

        // Clamp position
        const halfW = this.hurtboxW / 2;
        if (this.cx < halfW) this.cx = halfW;
        if (this.cx > 1280 - halfW) this.cx = 1280 - halfW;

        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
            if (this.hitFlash < 0) this.hitFlash = 0;
        }

        // Update animation
        this.currentAnim.update(dt);
    }

    /** Player input handling */
    _updatePlayer(dt, keys, attackPressed, jumpPressed) {
        // Can't move or start actions during attack
        if (this.state === 'attack') return;

        // Movement
        let moving = false;
        if (keys.a) {
            this.cx -= this.moveSpeed;
            this.setFacing('left');
            moving = true;
        }
        if (keys.d) {
            this.cx += this.moveSpeed;
            this.setFacing('right');
            moving = true;
        }

        // State transitions
        if (moving && this.state !== 'walk') {
            this.state = 'walk';
            this._syncAnim();
        } else if (!moving && this.state === 'walk') {
            this.state = 'idle';
            this._syncAnim();
        }

        // Jump
        if (jumpPressed && this.isOnGround) {
            this.velocityY = -14;
            this.isOnGround = false;
        }

        // Attack
        if (attackPressed) {
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
        }
    }

    /** Simple AI logic */
    _updateAI(dt, opponent) {
        if (this.state === 'attack') return;

        // Face toward opponent
        if (opponent.cx > this.cx) {
            this.setFacing('right');
        } else {
            this.setFacing('left');
        }

        // Cooldown
        if (this.aiCooldown > 0) {
            this.aiCooldown--;
            return;
        }

        this.aiTimer++;

        // Make decision every 40-80 frames
        if (this.aiTimer >= this.aiActionTimer) {
            const dist = Math.abs(this.cx - opponent.cx);
            const r = Math.random();

            if (dist < 250 && r < 0.4) {
                // Attack if close
                this.aiAction = 'attack';
                this.aiActionTimer = 1;
            } else if (r < 0.7) {
                this.aiAction = 'approach';
                this.aiActionTimer = 30;
            } else if (r < 0.85) {
                this.aiAction = 'jump';
                this.aiActionTimer = 1;
            } else {
                this.aiAction = 'idle';
                this.aiActionTimer = 20 + Math.floor(Math.random() * 20);
            }
            this.aiTimer = 0;
        }

        // Execute action
        switch (this.aiAction) {
            case 'approach': {
                const dir = opponent.cx > this.cx ? 1 : -1;
                this.cx += dir * this.moveSpeed;
                if (this.state !== 'walk') {
                    this.state = 'walk';
                    this._syncAnim();
                }
                break;
            }
            case 'attack': {
                this.state = 'attack';
                this._atkHit = false;
                this._syncAnim();
                this.aiCooldown = 30;
                this.aiTimer = 0;
                this.aiActionTimer = 0;
                break;
            }
            case 'jump': {
                if (this.isOnGround) {
                    this.velocityY = -14;
                    this.isOnGround = false;
                }
                this.aiTimer = 0;
                this.aiActionTimer = 0;
                break;
            }
            case 'idle':
            default: {
                if (this.state !== 'idle') {
                    this.state = 'idle';
                    this._syncAnim();
                }
                break;
            }
        }
    }

    /**
     * Draw the fighter on canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        const frame = this.currentAnim.currentFrame;
        if (!frame) return;

        const fw = frame.width;
        const fh = frame.height;
        const x = this.cx - fw / 2;
        const y = this.cy - fh;

        // Draw sprite (frame is already pre-scaled to ~250px height)
        ctx.drawImage(frame, x, y);

        // Hit flash overlay
        if (this.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(x, y, fw, fh);
            ctx.restore();
        }

        // Debug hurtbox
        if (Game.debugMode) {
            const hb = this.getHurtbox();
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.lineWidth = 2;
            ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
            ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);

            // Debug hitbox
            const hitb = this.getHitbox();
            if (hitb) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
                ctx.fillRect(hitb.x, hitb.y, hitb.w, hitb.h);
                ctx.strokeRect(hitb.x, hitb.y, hitb.w, hitb.h);
            }
            ctx.restore();
        }
    }
}

/**
 * Check and resolve hit between attacker and target
 * @param {Fighter} attacker
 * @param {Fighter} target
 */
function checkHit(attacker, target) {
    if (attacker.state !== 'attack' || attacker._atkHit) return;
    if (target.state === 'dead') return;
    if (!attacker.currentAnim.isHitFrame) return;

    const hitbox = attacker.getHitbox();
    const hurtbox = target.getHurtbox();
    if (!hitbox) return;

    // AABB collision
    if (hitbox.x < hurtbox.x + hurtbox.w &&
        hitbox.x + hitbox.w > hurtbox.x &&
        hitbox.y < hurtbox.y + hurtbox.h &&
        hitbox.y + hitbox.h > hurtbox.y) {
        attacker._atkHit = true;
        target.damage(10);
    }
}

/**
 * Push fighters apart to prevent overlapping
 * @param {Fighter} f1
 * @param {Fighter} f2
 */
function resolveCollision(f1, f2) {
    const dist = Math.abs(f1.cx - f2.cx);
    if (dist < 100) {
        const push = (100 - dist) / 2;
        if (f1.cx < f2.cx) {
            f1.cx -= push;
            f2.cx += push;
        } else {
            f1.cx += push;
            f2.cx -= push;
        }
    }
}
