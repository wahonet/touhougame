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

        // Track landing (before physics)
        this._wasOnGround = this.isOnGround;

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
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
        }

        // Attack
        if (attackPressed) {
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
        }
    }

    /** AI logic - priority-based tactical decision system */
    _updateAI(dt, opponent, platforms, pickups) {
        if (this.state === 'attack') return;
        if (this.state === 'dead') return;

        // Face toward opponent
        if (opponent.cx > this.cx) {
            this.setFacing('right');
        } else {
            this.setFacing('left');
        }

        const dist = Math.abs(this.cx - opponent.cx);
        const hpRatio = this.hp / MAX_HP;
        const oppHpRatio = opponent.hp / MAX_HP;
        const dy = Math.abs(this.cy - opponent.cy);

        // Tick cooldowns
        if (this.aiCooldown > 0) this.aiCooldown--;
        if (this.aiDodgeCooldown > 0) this.aiDodgeCooldown--;
        if (this.aiRetreatTimer > 0) this.aiRetreatTimer--;
        this.aiTimer++;

        // ================================================================
        // LAYER 1: THREAT DETECTION (every frame, highest priority)
        // ================================================================

        var threat = this._detectThreats(opponent, platforms);

        // React to threats with 3-5 frame delay (stored in aiDodgeCooldown)
        if (threat.level >= 2 && this.aiDodgeCooldown <= 0) {
            this._executeDodge(threat, opponent, platforms);
            return;
        }

        // Track threat level for decision-making
        this.aiThreatLevel = threat.level;

        // ================================================================
        // LAYER 2: SURVIVAL CHECK (every frame)
        // ================================================================

        if (this._checkSurvival(dt, opponent, pickups, hpRatio, dist, platforms)) return;

        // ================================================================
        // LAYER 3: COMBO FOLLOW-UP (immediate after landing hit)
        // ================================================================

        if (this.aiComboFollowUp) {
            this.aiComboFollowUp = false;
            // After landing a melee hit, chase and follow up
            if (dist < 200) {
                // Close enough for skill follow-up
                var comboSkill = this._pickComboSkill(opponent, dist, dy);
                if (comboSkill >= 0) {
                    this.activateSkill(comboSkill, opponent);
                    this.aiComboCount++;
                    this.aiLastSkillUsed = comboSkill;
                    this.aiCooldown = 5;
                    return;
                }
                // No skill ready, chase for another melee
                if (dist < 120 && this.aiComboCount < 3) {
                    this.state = 'attack';
                    this._atkHit = false;
                    this._syncAnim();
                    this.aiComboCount++;
                    this.aiCooldown = 8;
                    this.aiComboFollowUp = true;
                    return;
                }
            } else {
                // Chase toward opponent
                this._moveToward(opponent.cx, this.moveSpeed);
                this.aiCooldown = 3;
                if (this.aiComboCount < 2) this.aiComboFollowUp = true;
            }
            this.aiComboCount = Math.min(this.aiComboCount, 3);
            return;
        }

        // ================================================================
        // LAYER 4: TACTICAL DECISIONS (every 8-15 frames)
        // ================================================================

        if (this.aiTimer < this.aiActionTimer) return;
        this.aiTimer = 0;

        // Add slight randomness to decision interval so AI feels human
        this.aiActionTimer = 8 + Math.floor(Math.random() * 7);

        // Occasionally make a suboptimal decision (12% chance)
        if (Math.random() < 0.12) {
            this._makeSuboptimalDecision(opponent, platforms, pickups, dist);
            return;
        }

        // ================================================================
        // TACTICAL SKILL USAGE
        // ================================================================

        if (this._tryTacticalSkills(opponent, dist, dy, hpRatio, oppHpRatio, platforms)) return;

        // ================================================================
        // PICKUP AWARENESS
        // ================================================================

        if (this._trySeekPickup(pickups, hpRatio, oppHpRatio, opponent)) return;

        // ================================================================
        // PLATFORM TACTICS
        // ================================================================

        if (this._tryPlatformTactic(opponent, platforms, hpRatio, dy, dist)) return;

        // ================================================================
        // CORE BEHAVIOR (HP-based stance)
        // ================================================================

        this._executeStance(hpRatio, oppHpRatio, dist, dy, opponent, platforms, pickups);
    }

    // ---- AI HELPER METHODS ----

    /** Detect incoming threats from opponent */
    _detectThreats(opponent, platforms) {
        var threat = { level: 0, type: 'none', direction: 0, sourceX: 0, sourceY: 0 };

        // Check opponent melee attack
        if (opponent.state === 'attack' && !opponent._atkHit) {
            var hitbox = opponent.getHitbox();
            if (hitbox) {
                var myHurtbox = this.getHurtbox();
                var attackDist = Math.abs(opponent.cx - this.cx);
                if (attackDist < 180) {
                    threat.level = 2;
                    threat.type = 'melee';
                    threat.direction = opponent.cx < this.cx ? 1 : -1;
                    threat.sourceX = opponent.cx;
                    return threat;
                }
            }
        }

        // Check opponent projectiles (Reimu spell cards)
        var spellCards = opponent.skills[0];
        if (opponent.name === 'reimu' && spellCards.active && spellCards.data && spellCards.data.projectiles) {
            for (var i = 0; i < spellCards.data.projectiles.length; i++) {
                var proj = spellCards.data.projectiles[i];
                if (!proj.active) continue;
                var pdx = proj.x - this.cx;
                var pdy = proj.y - (this.cy - this.hurtboxH / 2);
                var projDist = Math.sqrt(pdx * pdx + pdy * pdy);
                if (projDist < 200) {
                    // Check if projectile is heading toward us
                    var dotProduct = pdx * proj.vx + pdy * proj.vy;
                    if (dotProduct < 0) {
                        threat.level = 2;
                        threat.type = 'projectile';
                        threat.direction = proj.vx > 0 ? 1 : -1;
                        threat.sourceX = proj.x;
                        threat.sourceY = proj.y;
                        return threat;
                    }
                }
            }
        }

        // Check opponent seal (Reimu skill 1)
        var sealSkill = opponent.skills[1];
        if (opponent.name === 'reimu' && sealSkill.active && sealSkill.data && sealSkill.data.seal) {
            var seal = sealSkill.data.seal;
            if (seal.active) {
                var sealDist = Math.sqrt(
                    Math.pow(seal.x - this.cx, 2) +
                    Math.pow(seal.y - (this.cy - this.hurtboxH / 2), 2)
                );
                if (sealDist < 200) {
                    threat.level = 2;
                    threat.type = 'projectile';
                    threat.direction = seal.x < this.cx ? -1 : 1;
                    threat.sourceX = seal.x;
                    threat.sourceY = seal.y;
                    return threat;
                }
            }
        }

        // Check opponent star storm (Marisa skill 2)
        var starSkill = opponent.skills[2];
        if (opponent.name === 'marisa' && starSkill.active && starSkill.data && starSkill.data.stars) {
            for (var j = 0; j < starSkill.data.stars.length; j++) {
                var star = starSkill.data.stars[j];
                if (!star.active) continue;
                var sdx = star.x - this.cx;
                var sdy = star.y - (this.cy - this.hurtboxH / 2);
                var starDist = Math.sqrt(sdx * sdx + sdy * sdy);
                if (starDist < 180) {
                    threat.level = 2;
                    threat.type = 'projectile';
                    threat.direction = star.vx > 0 ? 1 : -1;
                    threat.sourceX = star.x;
                    threat.sourceY = star.y;
                    return threat;
                }
            }
        }

        // Check opponent lasers (Marisa)
        if (opponent.name === 'marisa') {
            var beamRect = opponent.getBeamRect();
            if (!beamRect) beamRect = opponent.getBigBeamRect();
            if (beamRect) {
                var myHb = this.getHurtbox();
                // If beam is close to overlapping us, it's a threat
                if (Math.abs(myHb.y + myHb.h / 2 - (beamRect.y + beamRect.h / 2)) < beamRect.h + 30) {
                    if (beamRect.x < this.cx + this.hurtboxW / 2 + 150 &&
                        beamRect.x + beamRect.w > this.cx - this.hurtboxW / 2 - 50) {
                        threat.level = 2;
                        threat.type = 'laser';
                        threat.direction = opponent.cx < this.cx ? 1 : -1;
                        threat.sourceX = opponent.cx;
                        return threat;
                    }
                }
            }
        }

        // Low-level caution: opponent is close and facing us
        var dist = Math.abs(opponent.cx - this.cx);
        if (dist < 200 && opponent.state !== 'dead') {
            threat.level = 1;
            threat.type = 'proximity';
            threat.direction = opponent.cx < this.cx ? 1 : -1;
        }

        return threat;
    }

    /** Execute a dodge maneuver based on threat */
    _executeDodge(threat, opponent, platforms) {
        this.aiDodgeCooldown = 4 + Math.floor(Math.random() * 3);

        // Too close to react (under 50px) — sometimes fail to dodge
        var threatDist = Math.abs(threat.sourceX - this.cx);
        if (threatDist < 50 && Math.random() < 0.5) return;

        switch (threat.type) {
            case 'melee':
                // Jump over or back off from melee
                if (this.isOnGround && Math.random() < 0.6) {
                    this.velocityY = -18;
                    this.isOnGround = false;
                    this._currentPlatform = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                    // Jump toward a safe direction (away from threat)
                    var dodgeDir = threat.direction;
                    this.cx += dodgeDir * this.moveSpeed * 3;
                } else {
                    // Back off
                    this.cx += threat.direction * this.moveSpeed * 2;
                }
                this.aiAction = 'dodge';
                this.aiCooldown = 2;
                break;

            case 'projectile':
                // Dodge perpendicular to projectile direction
                if (this.isOnGround && Math.random() < 0.7) {
                    this.velocityY = -16 - Math.random() * 4;
                    this.isOnGround = false;
                    this._currentPlatform = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                    // Move sideways away from projectile source
                    this.cx += threat.direction * this.moveSpeed * 2;
                } else {
                    // Horizontal dodge
                    this.cx += threat.direction * this.moveSpeed * 3;
                }
                this.aiAction = 'dodge';
                this.aiCooldown = 3;
                break;

            case 'laser':
                // Move out of beam path — jump or move vertically
                if (this.isOnGround) {
                    this.velocityY = -18;
                    this.isOnGround = false;
                    this._currentPlatform = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                } else {
                    // Already airborne, try to land on a platform
                    var bestPlat = this._findNearestPlatform(platforms, 'above');
                    if (bestPlat) {
                        var platCx = bestPlat.x + bestPlat.w / 2;
                        var platDir = platCx > this.cx ? 1 : -1;
                        this.cx += platDir * this.moveSpeed;
                    }
                }
                this.aiAction = 'dodge';
                this.aiCooldown = 5;
                break;

            default:
                break;
        }

        // Update walk state
        if (this.state !== 'idle' && this.state !== 'walk') {
            this.state = 'idle';
            this._syncAnim();
        }
    }

    /** Survival check: shield, retreat, pickup seeking when low HP */
    _checkSurvival(dt, opponent, pickups, hpRatio, dist, platforms) {
        // Critical HP — activate shield if available
        if (hpRatio < 0.2) {
            var shieldIdx = this.name === 'reimu' ? 2 : 3;
            if (this.skills[shieldIdx].cooldown <= 0 && !this.skills[shieldIdx].active && !this.shield) {
                this.activateSkill(shieldIdx, opponent);
                this.aiRetreatTimer = 30;
                return true;
            }

            // Use fly to escape (Reimu)
            if (this.name === 'reimu' && this.skills[3].cooldown <= 0 && !this.skills[3].active && !this.flying.active) {
                this.activateSkill(3, opponent);
                this.aiRetreatTimer = 25;
                return true;
            }

            // Seek HP pickup when critically low
            if (pickups && pickups.length > 0) {
                var hpPickup = this._findBestPickup(pickups, 'hp');
                if (hpPickup) {
                    var pickupDist = Math.abs(this.cx - (hpPickup.x + hpPickup.width / 2));
                    if (pickupDist < 600) {
                        this._moveToward(hpPickup.x + hpPickup.width / 2, this.moveSpeed);
                        this.aiAction = 'seekPickup';
                        this.aiActionTarget = hpPickup;
                        this.aiActionTimer = 5;
                        return true;
                    }
                }
            }

            // Retreat to nearest platform
            if (this.aiRetreatTimer > 0 || dist < 250) {
                var retreatDir = opponent.cx < this.cx ? 1 : -1;
                this.cx += retreatDir * this.moveSpeed;
                if (this.state !== 'walk') {
                    this.state = 'walk';
                    this._syncAnim();
                }
                // Jump to platform if being chased
                if (this.isOnGround && dist < 200 && Math.random() < 0.3) {
                    this.velocityY = -18;
                    this.isOnGround = false;
                    this._currentPlatform = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                }
                return true;
            }
        }

        // Medium HP — proactive shield before engaging
        if (hpRatio < 0.5 && dist < 300) {
            var shieldIdx2 = this.name === 'reimu' ? 2 : 3;
            if (this.skills[shieldIdx2].cooldown <= 0 && !this.skills[shieldIdx2].active && !this.shield && Math.random() < 0.15) {
                this.activateSkill(shieldIdx2, opponent);
                return true;
            }
        }

        return false;
    }

    /** Pick best skill for combo follow-up */
    _pickComboSkill(opponent, dist, dy) {
        // Try offensive skills first
        if (this.name === 'reimu') {
            // Spell cards for spread damage
            if (this.skills[0].cooldown <= 0 && !this.skills[0].active && dist < 400) return 0;
            // Seal strike for tracking kill
            if (this.skills[1].cooldown <= 0 && !this.skills[1].active) return 1;
        } else {
            // Star storm when close
            if (this.skills[2].cooldown <= 0 && !this.skills[2].active && dist < 250) return 2;
            // Laser when aligned
            if (this.skills[0].cooldown <= 0 && !this.skills[0].active && dy < 80 && dist > 150) return 0;
            // Big laser for kill pressure
            if (this.skills[1].cooldown <= 0 && !this.skills[1].active && dy < 100) return 1;
        }
        return -1;
    }

    /** Try tactical skill usage based on situation */
    _tryTacticalSkills(opponent, dist, dy, hpRatio, oppHpRatio, platforms) {
        if (this.name === 'reimu') {
            return this._tryReimuSkills(opponent, dist, dy, hpRatio, oppHpRatio);
        } else {
            return this._tryMarisaSkills(opponent, dist, dy, hpRatio, oppHpRatio);
        }
    }

    /** Tactical skill usage for Reimu */
    _tryReimuSkills(opponent, dist, dy, hpRatio, oppHpRatio) {
        // Skill 0: Spell cards — best at medium range, when roughly aligned
        if (this.skills[0].cooldown <= 0 && !this.skills[0].active) {
            if (dist > 200 && dist < 500 && dy < 120 && Math.random() < 0.35) {
                this.activateSkill(0, opponent);
                this.aiLastSkillUsed = 0;
                this.aiCooldown = 5;
                return true;
            }
            // Also use when closing in and opponent is on platform
            if (dist < 350 && dy > 50 && dy < 200 && Math.random() < 0.2) {
                this.activateSkill(0, opponent);
                this.aiLastSkillUsed = 0;
                this.aiCooldown = 5;
                return true;
            }
        }

        // Skill 1: Seal strike — kill pressure when opponent low HP, or when opponent is stuck
        if (this.skills[1].cooldown <= 0 && !this.skills[1].active) {
            if (oppHpRatio < 0.3 && Math.random() < 0.5) {
                this.activateSkill(1, opponent);
                this.aiLastSkillUsed = 1;
                this.aiCooldown = 8;
                return true;
            }
            // Use when opponent is far and we can't reach
            if (dist > 400 && Math.random() < 0.2) {
                this.activateSkill(1, opponent);
                this.aiLastSkillUsed = 1;
                this.aiCooldown = 8;
                return true;
            }
        }

        // Skill 3: Fly — escape pressure, reach platforms, dodge horizontal attacks
        if (this.skills[3].cooldown <= 0 && !this.skills[3].active && !this.flying.active) {
            // Use when pressured on ground
            if (hpRatio < 0.4 && dist < 200 && Math.random() < 0.3) {
                this.activateSkill(3, opponent);
                this.aiLastSkillUsed = 3;
                this.aiCooldown = 5;
                return true;
            }
            // Use to approach when opponent is on high platform
            if (dy > 150 && Math.random() < 0.25) {
                this.activateSkill(3, opponent);
                this.aiLastSkillUsed = 3;
                this.aiCooldown = 5;
                return true;
            }
        }

        return false;
    }

    /** Tactical skill usage for Marisa */
    _tryMarisaSkills(opponent, dist, dy, hpRatio, oppHpRatio) {
        // Skill 0: Regular laser — best when aligned vertically, medium+ range
        if (this.skills[0].cooldown <= 0 && !this.skills[0].active) {
            if (dy < 80 && dist > 250 && dist < 600 && Math.random() < 0.3) {
                this.activateSkill(0, opponent);
                this.aiLastSkillUsed = 0;
                this.aiCooldown = 8;
                return true;
            }
        }

        // Skill 1: Big laser — kill pressure or when aligned
        if (this.skills[1].cooldown <= 0 && !this.skills[1].active) {
            if (oppHpRatio < 0.3 && dy < 100 && Math.random() < 0.4) {
                this.activateSkill(1, opponent);
                this.aiLastSkillUsed = 1;
                this.aiCooldown = 10;
                return true;
            }
            if (dy < 60 && dist > 200 && Math.random() < 0.2) {
                this.activateSkill(1, opponent);
                this.aiLastSkillUsed = 1;
                this.aiCooldown = 10;
                return true;
            }
        }

        // Skill 2: Star storm — best when close (maximum hits)
        if (this.skills[2].cooldown <= 0 && !this.skills[2].active) {
            if (dist < 200 && Math.random() < 0.4) {
                this.activateSkill(2, opponent);
                this.aiLastSkillUsed = 2;
                this.aiCooldown = 5;
                return true;
            }
            // Use defensively when surrounded
            if (dist < 300 && hpRatio < 0.5 && Math.random() < 0.25) {
                this.activateSkill(2, opponent);
                this.aiLastSkillUsed = 2;
                this.aiCooldown = 5;
                return true;
            }
        }

        return false;
    }

    /** Try seeking pickups based on HP and situation */
    _trySeekPickup(pickups, hpRatio, oppHpRatio, opponent) {
        if (!pickups || pickups.length === 0) return false;

        // Don't chase pickups when opponent is low HP — go for kill
        if (oppHpRatio < 0.2) return false;

        // Seek HP pickup when moderately low
        if (hpRatio < 0.5) {
            var hpPickup = this._findBestPickup(pickups, 'hp');
            if (hpPickup) {
                var pickupDist = Math.abs(this.cx - (hpPickup.x + hpPickup.width / 2));
                if (pickupDist < 500 && Math.random() < 0.3) {
                    this.aiAction = 'seekPickup';
                    this.aiActionTarget = hpPickup;
                    this.aiActionTimer = 8;
                    this._moveToward(hpPickup.x + hpPickup.width / 2, this.moveSpeed);
                    return true;
                }
            }
        }

        // Consider CD pickup if important skill is on cooldown
        if (this.skills[1].cooldown > 10) {
            var cdPickup = this._findBestPickup(pickups, 'cd');
            if (cdPickup) {
                var cdDist = Math.abs(this.cx - (cdPickup.x + cdPickup.width / 2));
                if (cdDist < 400 && Math.random() < 0.15) {
                    this.aiAction = 'seekPickup';
                    this.aiActionTarget = cdPickup;
                    this.aiActionTimer = 8;
                    this._moveToward(cdPickup.x + cdPickup.width / 2, this.moveSpeed);
                    return true;
                }
            }
        }

        return false;
    }

    /** Platform navigation tactics */
    _tryPlatformTactic(opponent, platforms, hpRatio, dy, dist) {
        if (!platforms || platforms.length === 0) return false;

        // When low HP, retreat to highest nearby platform
        if (hpRatio < 0.3 && Math.random() < 0.2) {
            var safePlat = this._findNearestPlatform(platforms, 'high');
            if (safePlat) {
                var platCx = safePlat.x + safePlat.w / 2;
                var platDx = Math.abs(this.cx - platCx);
                if (platDx > 30) {
                    this._moveToward(platCx, this.moveSpeed);
                    // Jump if platform is above
                    if (safePlat.y < this.cy - 50 && this.isOnGround) {
                        this.velocityY = -18;
                        this.isOnGround = false;
                        this._currentPlatform = null;
                        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                    }
                    this.aiActionTimer = 5;
                    return true;
                }
            }
        }

        // When opponent is on a high platform, jump to reach them
        if (dy > 80 && opponent.cy < this.cy && dist < 500) {
            var approachPlat = this._findNearestPlatform(platforms, 'above');
            if (approachPlat && this.isOnGround && Math.random() < 0.3) {
                var aPlatCx = approachPlat.x + approachPlat.w / 2;
                this._moveToward(aPlatCx, this.moveSpeed);
                this.velocityY = -18;
                this.isOnGround = false;
                this._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                this.aiActionTimer = 5;
                return true;
            }
        }

        // Use platforms to dodge ground-level pressure
        if (dist < 250 && this.aiThreatLevel >= 1 && this.isOnGround && Math.random() < 0.2) {
            var dodgePlat = this._findNearestPlatform(platforms, 'above');
            if (dodgePlat) {
                var dPlatCx = dodgePlat.x + dodgePlat.w / 2;
                this._moveToward(dPlatCx, this.moveSpeed * 1.2);
                this.velocityY = -18;
                this.isOnGround = false;
                this._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                this.aiActionTimer = 5;
                return true;
            }
        }

        return false;
    }

    /** Execute behavior based on HP stance */
    _executeStance(hpRatio, oppHpRatio, dist, dy, opponent, platforms, pickups) {
        // AGGRESSIVE: High HP or opponent low HP
        if (hpRatio > 0.6 || oppHpRatio < 0.3) {
            this._aggressiveBehavior(opponent, dist, dy, platforms);
        }
        // BALANCED: Medium HP
        else if (hpRatio > 0.3) {
            this._balancedBehavior(opponent, dist, dy, platforms);
        }
        // DEFENSIVE: Low HP
        else {
            this._defensiveBehavior(opponent, dist, platforms, pickups);
        }
    }

    /** Aggressive stance: approach, attack, pressure */
    _aggressiveBehavior(opponent, dist, dy, platforms) {
        if (dist < 120) {
            // Melee range — attack
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
            this.aiCooldown = 5;
            this.aiComboFollowUp = true;
            this.aiComboCount = 1;
        } else if (dist < 300) {
            // Close range — approach with jump mixup
            if (Math.random() < 0.25 && this.isOnGround) {
                this.velocityY = -16 - Math.random() * 4;
                this.isOnGround = false;
                this._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                // Air approach
                this._moveToward(opponent.cx, this.moveSpeed);
            } else {
                this._moveToward(opponent.cx, this.moveSpeed);
            }
            this.aiActionTimer = 3;
        } else {
            // Long range — fast approach
            this._moveToward(opponent.cx, this.moveSpeed);
            this.aiActionTimer = 5;
        }
    }

    /** Balanced stance: approach cautiously, dodge more */
    _balancedBehavior(opponent, dist, dy, platforms) {
        if (dist < 100) {
            // Melee range — attack but be ready to dodge
            this.state = 'attack';
            this._atkHit = false;
            this._syncAnim();
            this.aiCooldown = 8;
            this.aiComboFollowUp = true;
            this.aiComboCount = 1;
        } else if (dist < 300) {
            // Approach with more caution
            if (this.aiThreatLevel >= 1 && Math.random() < 0.4) {
                // Back off slightly then re-approach
                var awayDir = opponent.cx < this.cx ? 1 : -1;
                this.cx += awayDir * this.moveSpeed * 0.5;
                this._moveToward(opponent.cx, this.moveSpeed * 0.7);
            } else {
                this._moveToward(opponent.cx, this.moveSpeed);
            }
            this.aiActionTimer = 6;
        } else {
            this._moveToward(opponent.cx, this.moveSpeed * 0.9);
            this.aiActionTimer = 8;
        }
    }

    /** Defensive stance: keep distance, look for pickups/shield */
    _defensiveBehavior(opponent, dist, platforms, pickups) {
        // Keep distance from opponent
        if (dist < 250) {
            var retreatDir = opponent.cx < this.cx ? 1 : -1;
            this.cx += retreatDir * this.moveSpeed;
            if (this.state !== 'walk') {
                this.state = 'walk';
                this._syncAnim();
            }
            // Jump away if being chased
            if (this.isOnGround && dist < 180 && Math.random() < 0.4) {
                this.velocityY = -18;
                this.isOnGround = false;
                this._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            }
        } else if (dist > 400) {
            // Safe distance — stay put or approach slowly
            if (this.state !== 'idle') {
                this.state = 'idle';
                this._syncAnim();
            }
        } else {
            // Maintain distance
            if (this.state !== 'walk' && this.state !== 'idle') {
                this.state = 'idle';
                this._syncAnim();
            }
        }
        this.aiActionTimer = 5;
    }

    /** Occasionally make a suboptimal decision to feel human */
    _makeSuboptimalDecision(opponent, platforms, pickups, dist) {
        var r = Math.random();
        if (r < 0.3) {
            // Idle for a moment
            if (this.state !== 'idle') {
                this.state = 'idle';
                this._syncAnim();
            }
            this.aiActionTimer = 10 + Math.floor(Math.random() * 15);
        } else if (r < 0.6) {
            // Random jump
            if (this.isOnGround && !this.flying.active) {
                this.velocityY = -18;
                this.isOnGround = false;
                this._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            }
            this.aiActionTimer = 8;
        } else {
            // Walk in random direction briefly
            var randomDir = Math.random() < 0.5 ? -1 : 1;
            this.cx += randomDir * this.moveSpeed;
            if (this.state !== 'walk') {
                this.state = 'walk';
                this._syncAnim();
            }
            this.aiActionTimer = 5 + Math.floor(Math.random() * 10);
        }
    }

    /** Move toward a target X position */
    _moveToward(targetX, speed) {
        var dir = targetX > this.cx ? 1 : -1;
        this.cx += dir * speed;
        if (this.state !== 'walk') {
            this.state = 'walk';
            this._syncAnim();
        }
    }

    /** Find nearest platform by type: 'above', 'high', 'nearest' */
    _findNearestPlatform(platforms, type) {
        if (!platforms || platforms.length === 0) return null;

        var best = null;
        var bestScore = Infinity;

        for (var i = 0; i < platforms.length; i++) {
            var plat = platforms[i];
            var platCx = plat.x + plat.w / 2;
            var dx = Math.abs(this.cx - platCx);
            var dy = plat.y - this.cy; // negative = above

            var score = dx; // base score is horizontal distance

            if (type === 'above' && dy < -30) {
                score = dx + Math.abs(dy) * 0.5;
                if (score < bestScore) {
                    bestScore = score;
                    best = plat;
                }
            } else if (type === 'high' && dy < -50) {
                // Prefer higher platforms (lower y = higher on screen)
                score = dx - dy * 2;
                if (score < bestScore) {
                    bestScore = score;
                    best = plat;
                }
            } else if (type === 'nearest') {
                score = Math.sqrt(dx * dx + dy * dy);
                if (score < bestScore) {
                    bestScore = score;
                    best = plat;
                }
            }
        }

        return best;
    }

    /** Find best pickup by type: 'hp', 'cd', or null for any */
    _findBestPickup(pickups, type) {
        if (!pickups || pickups.length === 0) return null;

        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < pickups.length; i++) {
            var pickup = pickups[i];
            var pickupCx = pickup.x + (pickup.width || 30) / 2;
            var d = Math.abs(this.cx - pickupCx);

            if (type === 'hp' && pickup.type === 'hp' && d < bestDist) {
                bestDist = d;
                best = pickup;
            } else if (type === 'cd' && pickup.type === 'cd' && d < bestDist) {
                bestDist = d;
                best = pickup;
            } else if (!type && d < bestDist) {
                bestDist = d;
                best = pickup;
            }
        }

        return best;
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_seal');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
        this.flying.active = true;
        this.flying.timer = 0;
        // Cancel any downward velocity
        if (this.velocityY > 0) this.velocityY = 0;
        skill.data = { done: false };
    }

    // ---- MARISA SKILLS ----

    /** Skill 0: 魔法炮 - Regular laser, 30 total dmg */
    _activateMarisaLaser(skill) {
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_laser');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_laser');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
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
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_hit');
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_damage', 0.3);

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
