/**
 * Fighter - Character entity with physics, AI, hit detection, skills, and rendering
 */

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

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
        this.hp = MAX_HP;
        this.state = 'idle'; // idle, walk, attack, dead
        this.velocityY = 0;
        this.isOnGround = true;
        this._atkHit = false;
        this.hitFlash = 0;
        this.prevCy = groundY;

        // Platform tracking
        this._currentPlatform = null;

        // Hurtbox / hitbox dimensions
        this.hurtboxW = 70;
        this.hurtboxH = 140;
        this.hitboxW = 140;
        this.hitboxH = 100;

        // Movement
        this.moveSpeed = 5;

        // Skill system
        this.skillCooldown = 0;
        this.skillActive = false;
        this.skillData = null;

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
     * @param {Object} keys - Currently held keys {a, d, w, space, j, k}
     * @param {boolean} attackPressed - J key just pressed this frame
     * @param {boolean} jumpPressed - W/Space just pressed this frame
     * @param {boolean} skillPressed - K key just pressed this frame
     * @param {Fighter} opponent - The other fighter (for AI targeting)
     * @param {Array} platforms - Platform objects for physics
     * @param {Array} pickups - Pickup objects for AI targeting
     */
    update(dt, keys, attackPressed, jumpPressed, skillPressed, opponent, platforms, pickups) {
        if (this.state === 'dead') {
            this.currentAnim.update(dt);
            // Still tick down skill cooldown
            if (this.skillCooldown > 0) {
                this.skillCooldown -= dt;
                if (this.skillCooldown < 0) this.skillCooldown = 0;
            }
            return;
        }

        // Skill activation (any non-dead state)
        if (skillPressed && this.skillCooldown <= 0 && !this.skillActive) {
            this.activateSkill();
        }

        // Update skill effects
        this.updateSkill(dt, opponent);

        // AI or player input
        if (this.isAI) {
            this._updateAI(dt, opponent, platforms, pickups);
        } else {
            this._updatePlayer(dt, keys, attackPressed, jumpPressed);
        }

        // Check if walked off platform
        if (this.isOnGround && this._currentPlatform) {
            const plat = this._currentPlatform;
            if (this.cx <= plat.x || this.cx >= plat.x + plat.w) {
                this.isOnGround = false;
                this._currentPlatform = null;
            }
        }

        // Physics - gravity (with platform support)
        this.prevCy = this.cy;
        if (!this.isOnGround) {
            this.velocityY += 0.55;
            this.cy += this.velocityY;

            // Check platform landing (only when falling)
            if (this.velocityY > 0 && platforms) {
                // Sort platforms by y ascending (highest first = smallest y)
                const sortedPlatforms = [...platforms].sort((a, b) => a.y - b.y);
                for (const plat of sortedPlatforms) {
                    if (this.prevCy <= plat.y && this.cy >= plat.y) {
                        // Check horizontal overlap
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

        // Attack animation finished
        if (this.state === 'attack' && this.currentAnim.isFinished) {
            this.state = 'idle';
            this._atkHit = false;
            this._syncAnim();
        }

        // Clamp position to arena bounds
        const halfW = this.hurtboxW / 2;
        if (this.cx < halfW) this.cx = halfW;
        if (this.cx > ARENA_WIDTH - halfW) this.cx = ARENA_WIDTH - halfW;

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
            this.velocityY = -18;
            this.isOnGround = false;
            this._currentPlatform = null;
        }

        // Attack
        if (attackPressed) {
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
        }
    }

    /** Simple AI logic with skill usage and pickup seeking */
    _updateAI(dt, opponent, platforms, pickups) {
        if (this.state === 'attack') return;

        // Face toward opponent
        if (opponent.cx > this.cx) {
            this.setFacing('right');
        } else {
            this.setFacing('left');
        }

        // Skill usage
        if (this.skillCooldown <= 0 && !this.skillActive && Math.random() < 0.3) {
            let useSkill = true;
            if (this.name === 'marisa') {
                // Roughly aligned horizontally with opponent
                const dy = Math.abs(this.cy - opponent.cy);
                if (dy > 150) useSkill = false;
            }
            if (useSkill) {
                this.activateSkill();
                return;
            }
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

            // Pickup seeking (10% chance)
            if (pickups && pickups.length > 0 && r < 0.10) {
                let nearest = null;
                let nearestDist = Infinity;
                for (const pickup of pickups) {
                    const d = Math.abs(this.cx - (pickup.x + pickup.width / 2));
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = pickup;
                    }
                }
                if (nearest && nearestDist < 800) {
                    this.aiAction = 'seekPickup';
                    this.aiActionTarget = nearest;
                    this.aiActionTimer = 30;
                }
            } else if (dist < 250 && r < 0.4) {
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
                    this.velocityY = -18;
                    this.isOnGround = false;
                    this._currentPlatform = null;
                }
                this.aiTimer = 0;
                this.aiActionTimer = 0;
                break;
            }
            case 'seekPickup': {
                if (this.aiActionTarget) {
                    const targetX = this.aiActionTarget.x + this.aiActionTarget.width / 2;
                    const dir = targetX > this.cx ? 1 : -1;
                    this.cx += dir * this.moveSpeed;
                    if (this.state !== 'walk') {
                        this.state = 'walk';
                        this._syncAnim();
                    }
                }
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

    // ===================== SKILL SYSTEM =====================

    /** Activate the fighter's unique skill */
    activateSkill() {
        this.skillActive = true;
        this.skillCooldown = 15;
        this.skillData = {};

        if (this.name === 'reimu') {
            this._activateSpellCards();
        } else if (this.name === 'marisa') {
            this._activateLaser();
        }
    }

    /** Reimu: Spell Cards - 8 projectiles in a fan */
    _activateSpellCards() {
        this.skillData = {
            projectiles: [],
            hitEffects: [],
            age: 0
        };

        const dir = this.facing === 'right' ? 1 : -1;
        for (let i = 0; i < 8; i++) {
            const angle = (-30 + (60 / 7) * i) * Math.PI / 180;
            this.skillData.projectiles.push({
                x: this.cx + dir * 30,
                y: this.cy - this.hurtboxH / 2,
                vx: Math.cos(angle) * 10 * dir,
                vy: Math.sin(angle) * 10,
                active: true,
                frame: 0,
                hitTarget: false
            });
        }
    }

    /** Marisa: Laser Beam - Master Spark */
    _activateLaser() {
        this.skillData = {
            phase: 'charge',
            chargeTimer: 0,
            fireTimer: 0,
            damageTicks: [false, false, false],
            beamDir: this.facing === 'right' ? 1 : -1
        };
    }

    /** Get the beam rectangle for Marisa's laser */
    getBeamRect() {
        if (!this.skillData || this.skillData.phase !== 'fire') return null;
        const dir = this.skillData.beamDir;
        const beamHeight = 40;
        const beamY = this.cy - this.hurtboxH / 2 - beamHeight / 2;
        let beamStartX, beamEndX;
        if (dir === 1) {
            beamStartX = this.cx + this.hurtboxW / 2;
            beamEndX = Math.min(beamStartX + 800, ARENA_WIDTH);
        } else {
            beamEndX = this.cx - this.hurtboxW / 2;
            beamStartX = Math.max(beamEndX - 800, 0);
        }
        return { x: beamStartX, y: beamY, w: beamEndX - beamStartX, h: beamHeight };
    }

    /** Update skill effects each frame */
    updateSkill(dt, opponent) {
        // Cooldown tick
        if (this.skillCooldown > 0) {
            this.skillCooldown -= dt;
            if (this.skillCooldown < 0) this.skillCooldown = 0;
        }

        if (!this.skillActive || !this.skillData) return;

        if (this.name === 'reimu') {
            this._updateSpellCards(dt, opponent);
        } else if (this.name === 'marisa') {
            this._updateLaser(dt, opponent);
        }
    }

    /** Update Reimu spell card projectiles */
    _updateSpellCards(dt, opponent) {
        const data = this.skillData;
        data.age++;

        for (const proj of data.projectiles) {
            if (!proj.active) continue;

            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.frame++;

            // Check hit on opponent
            if (!proj.hitTarget && opponent.state !== 'dead') {
                const hurtbox = opponent.getHurtbox();
                // Point-in-rect check for projectile center
                if (proj.x > hurtbox.x && proj.x < hurtbox.x + hurtbox.w &&
                    proj.y > hurtbox.y && proj.y < hurtbox.y + hurtbox.h) {
                    proj.hitTarget = true;
                    opponent.damage(15);
                    data.hitEffects.push({
                        x: proj.x, y: proj.y, timer: 10
                    });
                    proj.active = false;
                }
            }

            // Out of bounds
            if (proj.x < -50 || proj.x > ARENA_WIDTH + 50 ||
                proj.y < -50 || proj.y > SCREEN_HEIGHT + 50) {
                proj.active = false;
            }

            // Lifetime
            if (proj.frame > 120) {
                proj.active = false;
            }
        }

        // Update hit effects
        for (let i = data.hitEffects.length - 1; i >= 0; i--) {
            data.hitEffects[i].timer--;
            if (data.hitEffects[i].timer <= 0) {
                data.hitEffects.splice(i, 1);
            }
        }

        // All done?
        if (data.projectiles.every(p => !p.active) && data.hitEffects.length === 0) {
            this.skillActive = false;
            this.skillData = null;
        }
    }

    /** Update Marisa laser beam */
    _updateLaser(dt, opponent) {
        const data = this.skillData;

        if (data.phase === 'charge') {
            data.chargeTimer += dt;
            if (data.chargeTimer >= 0.5) {
                data.phase = 'fire';
                data.fireTimer = 0;
                data.beamDir = this.facing === 'right' ? 1 : -1;
            }
        } else if (data.phase === 'fire') {
            data.fireTimer += dt;

            // Damage ticks at 0s, 0.33s, 0.66s
            const tickTimes = [0, 0.33, 0.66];
            for (let i = 0; i < 3; i++) {
                if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                    data.damageTicks[i] = true;
                    const beamRect = this.getBeamRect();
                    if (beamRect && opponent.state !== 'dead') {
                        const hurtbox = opponent.getHurtbox();
                        if (rectsOverlap(beamRect, hurtbox)) {
                            opponent.damage(10);
                        }
                    }
                }
            }

            if (data.fireTimer >= 1.0) {
                data.phase = 'done';
                this.skillActive = false;
                this.skillData = null;
            }
        }
    }

    /** Draw skill effects at world coordinates */
    drawSkill(ctx) {
        if (!this.skillActive || !this.skillData) return;

        if (this.name === 'reimu') {
            this._drawSpellCards(ctx);
        } else if (this.name === 'marisa') {
            this._drawLaser(ctx);
        }
    }

    /** Draw Reimu spell card projectiles and hit effects */
    _drawSpellCards(ctx) {
        const data = this.skillData;

        // Draw projectiles
        for (const proj of data.projectiles) {
            if (!proj.active) continue;
            const frameIndex = Math.floor(proj.frame / 8) % 4;
            const sprite = Assets.effects.spellcard[frameIndex];
            if (sprite) {
                ctx.drawImage(sprite, proj.x - 16, proj.y - 16, 32, 32);
            } else {
                // Fallback: draw a colored circle
                ctx.save();
                ctx.fillStyle = '#ff6b8a';
                ctx.shadowColor = '#ff6b8a';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Draw hit effects
        for (const effect of data.hitEffects) {
            const sprite = Assets.effects.spellcardHit;
            if (sprite) {
                ctx.drawImage(sprite, effect.x - 24, effect.y - 24, 48, 48);
            } else {
                // Fallback: draw explosion circle
                ctx.save();
                ctx.fillStyle = 'rgba(255, 100, 50, 0.7)';
                ctx.shadowColor = '#ff6633';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    /** Draw Marisa laser beam */
    _drawLaser(ctx) {
        const data = this.skillData;

        if (data.phase === 'charge') {
            const chargeScale = 1 + data.chargeTimer * 3;
            const sprite = Assets.effects.laserCharge;
            const dir = data.beamDir;
            const cx = this.cx + dir * (this.hurtboxW / 2 + 10);
            const cy = this.cy - this.hurtboxH / 2;

            if (sprite) {
                const drawW = 48 * chargeScale;
                const drawH = 48 * chargeScale;
                ctx.drawImage(sprite, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
            } else {
                // Fallback: draw growing energy circle
                ctx.save();
                const radius = 20 * chargeScale;
                ctx.fillStyle = `rgba(255, 255, 0, ${0.5 + data.chargeTimer})`;
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        } else if (data.phase === 'fire') {
            const beamRect = this.getBeamRect();
            if (!beamRect) return;

            const dir = data.beamDir;

            // Draw beam body by tiling laser_beam.png
            const beamSprite = Assets.effects.laserBeam;
            if (beamSprite) {
                const tileW = beamSprite.width || 96;
                for (let bx = beamRect.x; bx < beamRect.x + beamRect.w; bx += tileW) {
                    const drawW = Math.min(tileW, beamRect.x + beamRect.w - bx);
                    if (drawW > 0) {
                        ctx.drawImage(beamSprite, bx, beamRect.y, drawW, beamRect.h);
                    }
                }
            } else {
                // Fallback: draw solid beam
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 20;
                ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
                ctx.restore();
            }

            // Draw beam head at tip
            const headSprite = Assets.effects.laserHead;
            if (headSprite) {
                const headX = dir === 1 ? beamRect.x + beamRect.w - 64 : beamRect.x;
                ctx.drawImage(headSprite, headX, beamRect.y - 4, 64, 48);
            }

            // Beam glow overlay
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.02) * 0.1;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(beamRect.x, beamRect.y + 10, beamRect.w, beamRect.h - 20);
            ctx.restore();
        }
    }

    /**
     * Draw the fighter on canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // Defeated: rotate the stand sprite 90° to lay flat on the ground
        if (this.state === 'dead') {
            const standFrame = this.anims.idle ? this.anims.idle.frames[0] : null;
            if (standFrame) {
                const fw = standFrame.width;
                const fh = standFrame.height;
                ctx.save();
                ctx.translate(this.cx, this.groundY - fh * 0.3);
                // Rotate 90° clockwise: standing → lying face-forward
                ctx.rotate(Math.PI / 2);
                ctx.globalAlpha = 0.8;
                ctx.drawImage(standFrame, -fw / 2, -fh);
                ctx.restore();
            }
            return;
        }

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

            // Debug beam rect
            if (this.skillActive && this.name === 'marisa' && this.skillData && this.skillData.phase === 'fire') {
                const beamRect = this.getBeamRect();
                if (beamRect) {
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
                    ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
                    ctx.strokeRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
                }
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
    if (rectsOverlap(hitbox, hurtbox)) {
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
    // Only push apart if fighters are at similar vertical level
    // (prevents ground walkers from pushing platform standers)
    const verticalDist = Math.abs(f1.cy - f2.cy);
    if (verticalDist > 60) return;

    const dist = Math.abs(f1.cx - f2.cx);
    if (dist < 60) {
        const push = (60 - dist) / 2;
        if (f1.cx < f2.cx) {
            f1.cx -= push;
            f2.cx += push;
        } else {
            f1.cx += push;
            f2.cx -= push;
        }
    }
}
