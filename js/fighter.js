/**
 * Fighter - Character entity with physics, AI, hit detection, skills, and rendering
 * 4-skill system with independent cooldowns per character.
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

        // Hurtbox / hitbox dimensions (120px sprite)
        this.hurtboxW = 50;
        this.hurtboxH = 100;
        this.hitboxW = 100;
        this.hitboxH = 70;

        // Movement
        this.moveSpeed = 3.5;

        // 4-skill system with independent cooldowns
        if (name === 'reimu') {
            this.skills = [
                { name: '梦想天生', cooldown: 0, maxCooldown: 15, active: false, data: {} },
                { name: '梦想封印', cooldown: 0, maxCooldown: 30, active: false, data: {} },
                { name: '二重结界', cooldown: 0, maxCooldown: 20, active: false, data: {} },
                { name: '飞行',     cooldown: 0, maxCooldown: 25, active: false, data: {} }
            ];
        } else {
            this.skills = [
                { name: '魔法炮',     cooldown: 0, maxCooldown: 15, active: false, data: {} },
                { name: '二重魔法炮', cooldown: 0, maxCooldown: 30, active: false, data: {} },
                { name: '群星闪耀',   cooldown: 0, maxCooldown: 20, active: false, data: {} },
                { name: '防护罩',     cooldown: 0, maxCooldown: 20, active: false, data: {} }
            ];
        }

        // Shield state (used by skill 2 for reimu, skill 3 for marisa barrier)
        this.shield = null; // { hp, maxHp, duration, timer, flashTimer }

        // Flying state (reimu skill 4)
        this.flying = { active: false, timer: 0, duration: 5 };

        // Normal attack damage
        this.attackDamage = 10;

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
        if (this.state === 'dead') return;

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
        if (typeof BattleScene !== 'undefined' && BattleScene) {
            BattleScene.shakeAmount = Math.min(15, BattleScene.shakeAmount + amount * 0.15);
            BattleScene._spawnHitParticles(this.cx, this.cy - this.hurtboxH / 2, '#ffcc44');
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this._syncAnim();
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

        // Skill activation (any non-dead state, any skill key)
        for (let i = 0; i < 4; i++) {
            const keyIndex = i + 1;
            if (skillPressed[keyIndex]) {
                this.activateSkill(i, opponent);
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
                // Resume normal anim sync
                this._syncAnim();
            }
        }

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

        // Flying: vertical movement with W/S
        if (this.flying.active) {
            if (keys.w) {
                this.cy -= 4;
            }
            if (keys.s) {
                this.cy += 3;
            }
        }

        // State transitions
        if (moving && this.state !== 'walk') {
            this.state = 'walk';
            this._syncAnim();
        } else if (!moving && this.state === 'walk') {
            this.state = 'idle';
            this._syncAnim();
        }

        // Jump (skip during flight)
        if (!this.flying.active && jumpPressed && this.isOnGround) {
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

    /** AI logic with 4-skill usage and pickup seeking */
    _updateAI(dt, opponent, platforms, pickups) {
        if (this.state === 'attack') return;

        // Face toward opponent
        if (opponent.cx > this.cx) {
            this.setFacing('right');
        } else {
            this.setFacing('left');
        }

        const dist = Math.abs(this.cx - opponent.cx);
        const hpRatio = this.hp / MAX_HP;

        // Skill 1 (main attack): 25% when medium range
        if (this.skills[0].cooldown <= 0 && !this.skills[0].active && Math.random() < 0.25) {
            if (this.name === 'marisa') {
                const dy = Math.abs(this.cy - opponent.cy);
                if (dy > 150) {
                    // skip if not aligned
                } else {
                    this.activateSkill(0, opponent);
                    return;
                }
            } else {
                this.activateSkill(0, opponent);
                return;
            }
        }

        // Skill 2 (heavy): 15% when close or aligned
        if (this.skills[1].cooldown <= 0 && !this.skills[1].active && Math.random() < 0.15) {
            this.activateSkill(1, opponent);
            return;
        }

        // Skill 3 (shield/stars): 20% when HP < 50%
        if (this.skills[2].cooldown <= 0 && !this.skills[2].active && hpRatio < 0.5 && Math.random() < 0.20) {
            this.activateSkill(2, opponent);
            return;
        }

        // Skill 4 (fly for reimu, shield for marisa): 10% when HP < 30%
        if (this.skills[3].cooldown <= 0 && !this.skills[3].active && (hpRatio < 0.3 || Math.random() < 0.10)) {
            this.activateSkill(3, opponent);
            return;
        }

        // Cooldown
        if (this.aiCooldown > 0) {
            this.aiCooldown--;
            return;
        }

        this.aiTimer++;

        // Make decision every 40-80 frames
        if (this.aiTimer >= this.aiActionTimer) {
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
                if (this.isOnGround && !this.flying.active) {
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

    /**
     * Activate a skill by index
     * @param {number} index - Skill index 0-3
     * @param {Fighter} opponent
     */
    activateSkill(index, opponent) {
        const skill = this.skills[index];
        if (skill.cooldown > 0 || skill.active || this.state === 'dead') return;

        skill.active = true;
        skill.cooldown = skill.maxCooldown;

        if (this.name === 'reimu') {
            switch (index) {
                case 0: this._activateReimuSpellCards(skill); break;
                case 1: this._activateReimuSealStrike(skill, opponent); break;
                case 2: this._activateReimuBarrier(skill); break;
                case 3: this._activateReimuFlight(skill); break;
            }
        } else {
            switch (index) {
                case 0: this._activateMarisaLaser(skill); break;
                case 1: this._activateMarisaBigLaser(skill); break;
                case 2: this._activateMarisaStarStorm(skill); break;
                case 3: this._activateMarisaBarrier(skill); break;
            }
        }
    }

    // ---- REIMU SKILLS ----

    /** Skill 0: 梦想天生 - 8 spread projectiles, 15 dmg each */
    _activateReimuSpellCards(skill) {
        skill.data = {
            projectiles: [],
            hitEffects: [],
            age: 0
        };

        const dir = this.facing === 'right' ? 1 : -1;
        for (let i = 0; i < 8; i++) {
            const angle = (-30 + (60 / 7) * i) * Math.PI / 180;
            skill.data.projectiles.push({
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

    /** Skill 1: 梦想封印 - Tracking seal, 150 dmg */
    _activateReimuSealStrike(skill, opponent) {
        const dir = this.facing === 'right' ? 1 : -1;
        skill.data = {
            seal: {
                x: this.cx + dir * 30,
                y: this.cy - this.hurtboxH / 2,
                active: true,
                frame: 0,
                hit: false
            },
            hitEffects: [],
            hitTimer: 0
        };
    }

    /** Skill 2: 二重结界 - Shield 300 HP, 10s duration */
    _activateReimuBarrier(skill) {
        this.shield = {
            hp: 300,
            maxHp: 300,
            duration: 10,
            timer: 0,
            flashTimer: 0,
            shatterTimer: 0
        };
        skill.data = { done: false };
    }

    /** Skill 3: 飞行 - 5 seconds of flight */
    _activateReimuFlight(skill) {
        this.flying.active = true;
        this.flying.timer = 0;
        // Cancel any downward velocity
        if (this.velocityY > 0) this.velocityY = 0;
        skill.data = { done: false };
    }

    // ---- MARISA SKILLS ----

    /** Skill 0: 魔法炮 - Regular laser, 30 total dmg */
    _activateMarisaLaser(skill) {
        skill.data = {
            phase: 'charge',
            chargeTimer: 0,
            fireTimer: 0,
            damageTicks: [false, false, false],
            beamDir: this.facing === 'right' ? 1 : -1
        };
    }

    /** Skill 1: 二重魔法炮 - Bigger laser, 100 total dmg */
    _activateMarisaBigLaser(skill) {
        skill.data = {
            phase: 'charge',
            chargeTimer: 0,
            fireTimer: 0,
            damageTicks: [false, false, false, false],
            beamDir: this.facing === 'right' ? 1 : -1,
            big: true
        };
    }

    /** Skill 2: 群星闪耀 - 16 stars in 360°, 20 dmg each */
    _activateMarisaStarStorm(skill) {
        const stars = [];
        for (let i = 0; i < 16; i++) {
            const angle = (360 / 16) * i * Math.PI / 180;
            stars.push({
                x: this.cx,
                y: this.cy - this.hurtboxH / 2,
                vx: Math.cos(angle) * 8,
                vy: Math.sin(angle) * 8,
                active: true,
                frame: 0,
                hitTargets: [] // track which fighters already hit
            });
        }
        skill.data = { stars: stars };
    }

    /** Skill 3: 防护罩 - Shield 300 HP, 10s */
    _activateMarisaBarrier(skill) {
        this.shield = {
            hp: 300,
            maxHp: 300,
            duration: 10,
            timer: 0,
            flashTimer: 0,
            shatterTimer: 0
        };
        skill.data = { done: false };
    }

    // ===================== BEAM RECT HELPERS =====================

    /** Get the beam rectangle for regular laser */
    getBeamRect() {
        const laserSkill = this.skills[0];
        if (!laserSkill.active || !laserSkill.data || laserSkill.data.phase !== 'fire') return null;
        return this._calcBeamRect(laserSkill.data.beamDir, 40, 800);
    }

    /** Get the beam rectangle for big laser */
    getBigBeamRect() {
        const bigSkill = this.skills[1];
        if (!bigSkill.active || !bigSkill.data || bigSkill.data.phase !== 'fire') return null;
        return this._calcBeamRect(bigSkill.data.beamDir, 64, 1000);
    }

    _calcBeamRect(dir, beamHeight, beamRange) {
        const beamY = this.cy - this.hurtboxH / 2 - beamHeight / 2;
        let beamStartX, beamEndX;
        if (dir === 1) {
            beamStartX = this.cx + this.hurtboxW / 2;
            beamEndX = Math.min(beamStartX + beamRange, ARENA_WIDTH);
        } else {
            beamEndX = this.cx - this.hurtboxW / 2;
            beamStartX = Math.max(beamEndX - beamRange, 0);
        }
        return { x: beamStartX, y: beamY, w: beamEndX - beamStartX, h: beamHeight };
    }

    // ===================== SKILL UPDATE =====================

    /** Route skill update by index */
    _updateSkillByIndex(index, dt, opponent) {
        const skill = this.skills[index];

        if (this.name === 'reimu') {
            switch (index) {
                case 0: this._updateReimuSpellCards(skill, dt, opponent); break;
                case 1: this._updateReimuSealStrike(skill, dt, opponent); break;
                case 2: this._updateReimuBarrier(skill, dt); break;
                case 3: this._updateReimuFlight(skill, dt); break;
            }
        } else {
            switch (index) {
                case 0: this._updateMarisaLaser(skill, dt, opponent); break;
                case 1: this._updateMarisaBigLaser(skill, dt, opponent); break;
                case 2: this._updateMarisaStarStorm(skill, dt, opponent); break;
                case 3: this._updateMarisaBarrier(skill, dt); break;
            }
        }
    }

    // ---- REIMU SKILL UPDATES ----

    /** Update Reimu spell card projectiles */
    _updateReimuSpellCards(skill, dt, opponent) {
        const data = skill.data;
        data.age++;

        for (const proj of data.projectiles) {
            if (!proj.active) continue;

            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.frame++;

            if (!proj.hitTarget && opponent.state !== 'dead') {
                const hurtbox = opponent.getHurtbox();
                if (proj.x > hurtbox.x && proj.x < hurtbox.x + hurtbox.w &&
                    proj.y > hurtbox.y && proj.y < hurtbox.y + hurtbox.h) {
                    proj.hitTarget = true;
                    opponent.damage(15);
                    data.hitEffects.push({ x: proj.x, y: proj.y, timer: 10 });
                    proj.active = false;
                }
            }

            if (proj.x < -50 || proj.x > ARENA_WIDTH + 50 ||
                proj.y < -50 || proj.y > SCREEN_HEIGHT + 50) {
                proj.active = false;
            }

            if (proj.frame > 120) {
                proj.active = false;
            }
        }

        for (let i = data.hitEffects.length - 1; i >= 0; i--) {
            data.hitEffects[i].timer--;
            if (data.hitEffects[i].timer <= 0) {
                data.hitEffects.splice(i, 1);
            }
        }

        if (data.projectiles.every(p => !p.active) && data.hitEffects.length === 0) {
            skill.active = false;
            skill.data = {};
        }
    }

    /** Update Reimu seal strike */
    _updateReimuSealStrike(skill, dt, opponent) {
        const data = skill.data;
        const seal = data.seal;

        if (seal.active) {
            seal.frame++;

            // Move toward opponent
            const dx = opponent.cx - seal.x;
            const dy = (opponent.cy - opponent.hurtboxH / 2) - seal.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                seal.x += (dx / dist) * 6;
                seal.y += (dy / dist) * 6;
            }

            // Hit check
            if (!seal.hit && opponent.state !== 'dead') {
                const hurtbox = opponent.getHurtbox();
                if (seal.x > hurtbox.x && seal.x < hurtbox.x + hurtbox.w &&
                    seal.y > hurtbox.y && seal.y < hurtbox.y + hurtbox.h) {
                    seal.hit = true;
                    seal.active = false;
                    opponent.damage(150);
                    data.hitEffects.push({ x: seal.x, y: seal.y, timer: 30 });
                    data.hitTimer = 0;
                }
            }

            // Timeout
            if (seal.frame > 120) {
                seal.active = false;
                if (!seal.hit) {
                    skill.active = false;
                    skill.data = {};
                    return;
                }
            }
        }

        // Update hit effects (seal animation at impact)
        if (data.hitEffects.length > 0) {
            data.hitTimer++;
            for (let i = data.hitEffects.length - 1; i >= 0; i--) {
                data.hitEffects[i].timer--;
                if (data.hitEffects[i].timer <= 0) {
                    data.hitEffects.splice(i, 1);
                }
            }
            if (data.hitEffects.length === 0) {
                skill.active = false;
                skill.data = {};
            }
        }
    }

    /** Update Reimu barrier (shield ticks handled in main update) */
    _updateReimuBarrier(skill, dt) {
        if (!this.shield) {
            skill.active = false;
            skill.data = {};
        }
    }

    /** Update Reimu flight */
    _updateReimuFlight(skill, dt) {
        if (!this.flying.active) {
            skill.active = false;
            skill.data = {};
        }
    }

    // ---- MARISA SKILL UPDATES ----

    /** Update Marisa regular laser */
    _updateMarisaLaser(skill, dt, opponent) {
        const data = skill.data;

        if (data.phase === 'charge') {
            data.chargeTimer += dt;
            if (data.chargeTimer >= 0.5) {
                data.phase = 'fire';
                data.fireTimer = 0;
                data.beamDir = this.facing === 'right' ? 1 : -1;
            }
        } else if (data.phase === 'fire') {
            data.fireTimer += dt;

            const tickTimes = [0, 0.33, 0.66];
            for (let i = 0; i < 3; i++) {
                if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                    data.damageTicks[i] = true;
                    const beamRect = this._calcBeamRect(data.beamDir, 40, 800);
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
                skill.active = false;
                skill.data = {};
            }
        }
    }

    /** Update Marisa big laser */
    _updateMarisaBigLaser(skill, dt, opponent) {
        const data = skill.data;

        if (data.phase === 'charge') {
            data.chargeTimer += dt;
            if (data.chargeTimer >= 0.7) {
                data.phase = 'fire';
                data.fireTimer = 0;
                data.beamDir = this.facing === 'right' ? 1 : -1;
            }
        } else if (data.phase === 'fire') {
            data.fireTimer += dt;

            const tickTimes = [0, 0.3, 0.6, 0.9];
            for (let i = 0; i < 4; i++) {
                if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                    data.damageTicks[i] = true;
                    const beamRect = this._calcBeamRect(data.beamDir, 64, 1000);
                    if (beamRect && opponent.state !== 'dead') {
                        const hurtbox = opponent.getHurtbox();
                        if (rectsOverlap(beamRect, hurtbox)) {
                            opponent.damage(25);
                        }
                    }
                }
            }

            if (data.fireTimer >= 1.2) {
                data.phase = 'done';
                skill.active = false;
                skill.data = {};
            }
        }
    }

    /** Update Marisa star storm */
    _updateMarisaStarStorm(skill, dt, opponent) {
        const data = skill.data;
        let anyActive = false;

        for (const star of data.stars) {
            if (!star.active) continue;
            anyActive = true;

            star.x += star.vx;
            star.y += star.vy;
            star.frame++;

            // Hit check on opponent
            if (opponent.state !== 'dead' && !star.hitTargets.includes(opponent)) {
                const hurtbox = opponent.getHurtbox();
                if (star.x > hurtbox.x && star.x < hurtbox.x + hurtbox.w &&
                    star.y > hurtbox.y && star.y < hurtbox.y + hurtbox.h) {
                    star.hitTargets.push(opponent);
                    opponent.damage(20);
                }
            }

            // Also check self-hit (stars can hit the caster too)
            if (this.state !== 'dead' && !star.hitTargets.includes(this)) {
                const selfHurtbox = this.getHurtbox();
                if (star.x > selfHurtbox.x && star.x < selfHurtbox.x + selfHurtbox.w &&
                    star.y > selfHurtbox.y && star.y < selfHurtbox.y + selfHurtbox.h) {
                    star.hitTargets.push(this);
                    this.damage(20);
                }
            }

            // Out of bounds
            if (star.x < -50 || star.x > ARENA_WIDTH + 50 ||
                star.y < -50 || star.y > SCREEN_HEIGHT + 50) {
                star.active = false;
            }

            // Lifetime
            if (star.frame > 90) {
                star.active = false;
            }
        }

        if (!anyActive) {
            skill.active = false;
            skill.data = {};
        }
    }

    /** Update Marisa barrier */
    _updateMarisaBarrier(skill, dt) {
        if (!this.shield) {
            skill.active = false;
            skill.data = {};
        }
    }

    // ===================== DRAW SKILL EFFECTS =====================

    /** Draw all active skill effects */
    drawSkill(ctx) {
        for (let i = 0; i < 4; i++) {
            if (!this.skills[i].active) continue;
            if (this.name === 'reimu') {
                switch (i) {
                    case 0: this._drawReimuSpellCards(ctx, this.skills[i].data); break;
                    case 1: this._drawReimuSealStrike(ctx, this.skills[i].data); break;
                }
            } else {
                switch (i) {
                    case 0: this._drawMarisaLaser(ctx, this.skills[i].data); break;
                    case 1: this._drawMarisaBigLaser(ctx, this.skills[i].data); break;
                    case 2: this._drawMarisaStarStorm(ctx, this.skills[i].data); break;
                }
            }
        }

        // Draw shield if active
        if (this.shield && this.shield.hp > 0) {
            this._drawShield(ctx);
        }

        // Draw flying aura
        if (this.flying.active) {
            this._drawFlyAura(ctx);
        }
    }

    // ---- REIMU DRAW ----

    _drawReimuSpellCards(ctx, data) {
        // Draw projectiles
        for (const proj of data.projectiles) {
            if (!proj.active) continue;
            const frameIndex = Math.floor(proj.frame / 8) % 4;
            const sprite = Assets.effects.spellcard[frameIndex];
            if (sprite) {
                ctx.drawImage(sprite, proj.x - 16, proj.y - 16, 32, 32);
            } else {
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

    _drawReimuSealStrike(ctx, data) {
        const seal = data.seal;

        // Draw traveling seal
        if (seal.active) {
            const frameIndex = Math.floor(seal.frame / 6) % 4;
            const sealSprite = Assets.effects.seal[frameIndex];
            if (sealSprite) {
                // Growing/shrinking effect
                const size = 40 + Math.sin(seal.frame * 0.15) * 10;
                ctx.save();
                ctx.drawImage(sealSprite, seal.x - size / 2, seal.y - size / 2, size, size);
                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = '#ff4466';
                ctx.shadowColor = '#ff4466';
                ctx.shadowBlur = 15;
                const size = 20 + Math.sin(seal.frame * 0.15) * 5;
                ctx.beginPath();
                ctx.arc(seal.x, seal.y, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Draw hit effects at impact
        for (const effect of data.hitEffects) {
            const remaining = effect.timer;
            if (remaining > 15) {
                // Show seal animation
                const idx = Math.min(3, Math.floor((30 - remaining) / 4));
                const sealSprite = Assets.effects.seal[idx];
                if (sealSprite) {
                    const size = 60 + (30 - remaining) * 2;
                    ctx.drawImage(sealSprite, effect.x - size / 2, effect.y - size / 2, size, size);
                }
            } else {
                // Show seal_hit
                const hitSprite = Assets.effects.sealHit;
                if (hitSprite) {
                    const size = 80 * (remaining / 15);
                    ctx.drawImage(hitSprite, effect.x - size / 2, effect.y - size / 2, size, size);
                } else {
                    ctx.save();
                    ctx.fillStyle = `rgba(255, 200, 100, ${remaining / 15})`;
                    ctx.shadowColor = '#ffcc66';
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, 30 * (remaining / 15), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
    }

    // ---- MARISA DRAW ----

    _drawMarisaLaser(ctx, data) {
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
            const beamRect = this._calcBeamRect(data.beamDir, 40, 800);
            if (!beamRect) return;

            const dir = data.beamDir;
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
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 20;
                ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
                ctx.restore();
            }

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

    _drawMarisaBigLaser(ctx, data) {
        if (data.phase === 'charge') {
            const chargeScale = 1 + data.chargeTimer * 4;
            const sprite = Assets.effects.laserCharge;
            const dir = data.beamDir;
            const cx = this.cx + dir * (this.hurtboxW / 2 + 10);
            const cy = this.cy - this.hurtboxH / 2;

            if (sprite) {
                const drawW = 64 * chargeScale;
                const drawH = 64 * chargeScale;
                ctx.drawImage(sprite, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
            } else {
                ctx.save();
                const radius = 30 * chargeScale;
                ctx.fillStyle = `rgba(255, 200, 0, ${0.6 + data.chargeTimer})`;
                ctx.shadowColor = '#ffaa00';
                ctx.shadowBlur = 40;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        } else if (data.phase === 'fire') {
            const beamRect = this._calcBeamRect(data.beamDir, 64, 1000);
            if (!beamRect) return;

            const dir = data.beamDir;
            const beamSprite = Assets.effects.bigLaserBeam;
            if (beamSprite) {
                const tileW = beamSprite.width || 128;
                for (let bx = beamRect.x; bx < beamRect.x + beamRect.w; bx += tileW) {
                    const drawW = Math.min(tileW, beamRect.x + beamRect.w - bx);
                    if (drawW > 0) {
                        ctx.drawImage(beamSprite, bx, beamRect.y, drawW, beamRect.h);
                    }
                }
            } else {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 220, 50, 0.9)';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 30;
                ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
                ctx.restore();
            }

            const headSprite = Assets.effects.bigLaserHead;
            if (headSprite) {
                const headX = dir === 1 ? beamRect.x + beamRect.w - 80 : beamRect.x;
                ctx.drawImage(headSprite, headX, beamRect.y - 8, 80, 80);
            }

            // Extra dramatic glow
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.03) * 0.15;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(beamRect.x, beamRect.y + 16, beamRect.w, beamRect.h - 32);
            ctx.restore();

            // Outer glow
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(beamRect.x, beamRect.y - 10, beamRect.w, beamRect.h + 20);
            ctx.restore();
        }
    }

    _drawMarisaStarStorm(ctx, data) {
        for (const star of data.stars) {
            if (!star.active) continue;
            const frameIndex = Math.floor(star.frame / 6) % 4;
            const sprite = Assets.effects.star[frameIndex];
            if (sprite) {
                ctx.drawImage(sprite, star.x - 12, star.y - 12, 24, 24);
            } else {
                ctx.save();
                ctx.fillStyle = '#ffdd44';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(star.x, star.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // ---- COMMON DRAW ----

    _drawShield(ctx) {
        const shield = this.shield;
        const sprite = Assets.effects.shield;
        const size = Math.max(this.hurtboxW, this.hurtboxH) * 1.4;
        const cx = this.cx;
        const cy = this.cy - this.hurtboxH / 2;

        ctx.save();

        // Pulsing alpha
        const alpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.15;
        ctx.globalAlpha = alpha;

        // Flash on damage
        if (shield.flashTimer > 0) {
            ctx.globalAlpha = 0.8;
        }

        // Shatter effect (flash white)
        if (shield.shatterTimer > 0) {
            ctx.globalAlpha = shield.shatterTimer / 0.3;
        }

        if (sprite) {
            ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
        } else {
            // Fallback: draw bubble
            ctx.strokeStyle = '#66ccff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#66ccff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
            ctx.fill();
        }

        ctx.restore();

        // Shield HP bar (small)
        const barW = 40;
        const barH = 4;
        const barX = cx - barW / 2;
        const barY = cy - size / 2 - 10;
        const ratio = shield.hp / shield.maxHp;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#66ccff';
        ctx.fillRect(barX, barY, barW * ratio, barH);
        ctx.restore();
    }

    _drawFlyAura(ctx) {
        const sprite = Assets.effects.flyAura;
        const cx = this.cx;
        const cy = this.cy + 5; // beneath feet

        if (sprite) {
            const w = sprite.width * 0.5;
            const h = sprite.height * 0.5;
            ctx.save();
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.2;
            ctx.drawImage(sprite, cx - w / 2, cy - h / 2, w, h);
            ctx.restore();
        } else {
            // Fallback: draw glowing circle
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.008) * 0.15;
            ctx.fillStyle = '#cc88ff';
            ctx.shadowColor = '#cc88ff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 30, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ===================== DRAW FIGHTER =====================

    /**
     * Draw the fighter on canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // Drop shadow on ground
        const groundYRef = this.groundY || 580;
        const heightAboveGround = groundYRef - this.cy;
        const shadowScale = Math.max(0.3, 1 - heightAboveGround / 300);
        const shadowAlpha = Math.max(0.05, 0.25 * shadowScale);
        const shadowWidth = 30 * shadowScale + 10;
        const shadowHeight = 6 * shadowScale + 2;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(this.cx, groundYRef, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Defeated: rotate the stand sprite 90° to lay flat on the ground
        if (this.state === 'dead') {
            const standFrame = this.anims.idle ? this.anims.idle.frames[0] : null;
            if (standFrame) {
                const fw = standFrame.width;
                const fh = standFrame.height;
                ctx.save();
                ctx.translate(this.cx, this.groundY - fh * 0.3);
                ctx.rotate(Math.PI / 2);
                ctx.globalAlpha = 0.8;
                ctx.drawImage(standFrame, -fw / 2, -fh);
                ctx.restore();
            }
            return;
        }

        // During flying state and not attacking, use fly sprite
        if (this.flying.active && this.state !== 'attack') {
            const dir = this.facing;
            const flySprite = Assets.sprites[this.name] &&
                Assets.sprites[this.name][dir] &&
                Assets.sprites[this.name][dir].fly;

            if (flySprite) {
                const fw = flySprite.width;
                const fh = flySprite.height;
                const x = this.cx - fw / 2;
                const y = this.cy - fh;

                ctx.drawImage(flySprite, x, y);

                // Hit flash overlay
                if (this.hitFlash > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.fillRect(x, y, fw, fh);
                    ctx.restore();
                }
                return;
            }
        }

        const frame = this.currentAnim.currentFrame;
        if (!frame) return;

        const fw = frame.width;
        const fh = frame.height;
        const x = this.cx - fw / 2;
        const y = this.cy - fh;

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

            // Debug beam rects
            const beamRect = this.getBeamRect();
            if (beamRect) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
                ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
                ctx.strokeRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
            }

            const bigBeamRect = this.getBigBeamRect();
            if (bigBeamRect) {
                ctx.strokeStyle = 'rgba(255, 150, 0, 0.6)';
                ctx.fillStyle = 'rgba(255, 150, 0, 0.1)';
                ctx.fillRect(bigBeamRect.x, bigBeamRect.y, bigBeamRect.w, bigBeamRect.h);
                ctx.strokeRect(bigBeamRect.x, bigBeamRect.y, bigBeamRect.w, bigBeamRect.h);
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

    if (rectsOverlap(hitbox, hurtbox)) {
        attacker._atkHit = true;
        target.damage(10);

        // Trigger screen shake and hit particles
        if (typeof BattleScene !== 'undefined') {
            BattleScene.shakeAmount = Math.min(12, (BattleScene.shakeAmount || 0) + 10 * 0.12);
            BattleScene._spawnHitParticles(
                target.cx, target.cy - (target.hurtboxH || 50) / 2,
                '#ffcc44'
            );
        }
    }
}

/**
 * Push fighters apart to prevent overlapping
 * @param {Fighter} f1
 * @param {Fighter} f2
 */
function resolveCollision(f1, f2) {
    const verticalDist = Math.abs(f1.cy - f2.cy);
    if (verticalDist > 60) return;

    const dist = Math.abs(f1.cx - f2.cx);
    if (dist < 40) {
        const push = (40 - dist) / 2;
        if (f1.cx < f2.cx) {
            f1.cx -= push;
            f2.cx += push;
        } else {
            f1.cx += push;
            f2.cx -= push;
        }
    }
}
