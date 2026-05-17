/**
 * Fighter AI - Priority-based tactical decision system
 * Extracted from Fighter class to modularize AI logic.
 */
import { AudioManager } from '../core/audio-manager.js';
import { MAX_HP } from '../config/game-config.js';

/**
 * Main AI update loop
 * @param {Fighter} fighter
 * @param {number} dt
 * @param {Fighter} opponent
 * @param {Array} platforms
 * @param {Array} pickups
 */
export function updateAI(fighter, dt, opponent, platforms, pickups) {
    if (fighter.state === 'attack') return;
    if (fighter.state === 'dead') return;

    // Face toward opponent
    if (opponent.cx > fighter.cx) {
        fighter.setFacing('right');
    } else {
        fighter.setFacing('left');
    }

    const dist = Math.abs(fighter.cx - opponent.cx);
    const hpRatio = fighter.hp / MAX_HP;
    const oppHpRatio = opponent.hp / MAX_HP;
    const dy = Math.abs(fighter.cy - opponent.cy);

    // Tick cooldowns
    if (fighter.aiCooldown > 0) fighter.aiCooldown--;
    if (fighter.aiDodgeCooldown > 0) fighter.aiDodgeCooldown--;
    if (fighter.aiRetreatTimer > 0) fighter.aiRetreatTimer--;
    fighter.aiTimer++;

    // ================================================================
    // LAYER 1: THREAT DETECTION (every frame, highest priority)
    // ================================================================

    var threat = _detectThreats(fighter, opponent, platforms);

    // React to threats with 3-5 frame delay (stored in aiDodgeCooldown)
    if (threat.level >= 2 && fighter.aiDodgeCooldown <= 0) {
        _executeDodge(fighter, threat, opponent, platforms);
        return;
    }

    // Track threat level for decision-making
    fighter.aiThreatLevel = threat.level;

    // ================================================================
    // LAYER 2: SURVIVAL CHECK (every frame)
    // ================================================================

    if (_checkSurvival(fighter, dt, opponent, pickups, hpRatio, dist, platforms)) return;

    // ================================================================
    // LAYER 3: COMBO FOLLOW-UP (immediate after landing hit)
    // ================================================================

    if (fighter.aiComboFollowUp) {
        fighter.aiComboFollowUp = false;
        // After landing a melee hit, chase and follow up
        if (dist < 200) {
            // Close enough for skill follow-up
            var comboSkill = _pickComboSkill(fighter, opponent, dist, dy);
            if (comboSkill >= 0) {
                fighter.activateSkill(comboSkill, opponent);
                fighter.aiComboCount++;
                fighter.aiLastSkillUsed = comboSkill;
                fighter.aiCooldown = 5;
                return;
            }
            // No skill ready, chase for another melee
            if (dist < 120 && fighter.aiComboCount < 3) {
                fighter.state = 'attack';
                fighter._atkHit = false;
                fighter._syncAnim();
                fighter.aiComboCount++;
                fighter.aiCooldown = 8;
                fighter.aiComboFollowUp = true;
                return;
            }
        } else {
            // Chase toward opponent
            _moveToward(fighter, opponent.cx, fighter.moveSpeed);
            fighter.aiCooldown = 3;
            if (fighter.aiComboCount < 2) fighter.aiComboFollowUp = true;
        }
        fighter.aiComboCount = Math.min(fighter.aiComboCount, 3);
        return;
    }

    // ================================================================
    // LAYER 4: TACTICAL DECISIONS (every 8-15 frames)
    // ================================================================

    if (fighter.aiTimer < fighter.aiActionTimer) return;
    fighter.aiTimer = 0;

    // Add slight randomness to decision interval so AI feels human
    fighter.aiActionTimer = 8 + Math.floor(Math.random() * 7);

    // Occasionally make a suboptimal decision (12% chance)
    if (Math.random() < 0.12) {
        _makeSuboptimalDecision(fighter, opponent, platforms, pickups, dist);
        return;
    }

    // ================================================================
    // TACTICAL SKILL USAGE
    // ================================================================

    if (_tryTacticalSkills(fighter, opponent, dist, dy, hpRatio, oppHpRatio, platforms)) return;

    // ================================================================
    // PICKUP AWARENESS
    // ================================================================

    if (_trySeekPickup(fighter, pickups, hpRatio, oppHpRatio, opponent)) return;

    // ================================================================
    // PLATFORM TACTICS
    // ================================================================

    if (_tryPlatformTactic(fighter, opponent, platforms, hpRatio, dy, dist)) return;

    // ================================================================
    // CORE BEHAVIOR (HP-based stance)
    // ================================================================

    _executeStance(fighter, hpRatio, oppHpRatio, dist, dy, opponent, platforms, pickups);
}

// ---- AI HELPER METHODS ----

/** Detect incoming threats from opponent */
function _detectThreats(fighter, opponent, platforms) {
    var threat = { level: 0, type: 'none', direction: 0, sourceX: 0, sourceY: 0 };

    // Check opponent melee attack
    if (opponent.state === 'attack' && !opponent._atkHit) {
        var hitbox = opponent.getHitbox();
        if (hitbox) {
            var attackDist = Math.abs(opponent.cx - fighter.cx);
            if (attackDist < 180) {
                threat.level = 2;
                threat.type = 'melee';
                threat.direction = opponent.cx < fighter.cx ? 1 : -1;
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
            var pdx = proj.x - fighter.cx;
            var pdy = proj.y - (fighter.cy - fighter.hurtboxH / 2);
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
                Math.pow(seal.x - fighter.cx, 2) +
                Math.pow(seal.y - (fighter.cy - fighter.hurtboxH / 2), 2)
            );
            if (sealDist < 200) {
                threat.level = 2;
                threat.type = 'projectile';
                threat.direction = seal.x < fighter.cx ? -1 : 1;
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
            var sdx = star.x - fighter.cx;
            var sdy = star.y - (fighter.cy - fighter.hurtboxH / 2);
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
            var myHb = fighter.getHurtbox();
            // If beam is close to overlapping us, it's a threat
            if (Math.abs(myHb.y + myHb.h / 2 - (beamRect.y + beamRect.h / 2)) < beamRect.h + 30) {
                if (beamRect.x < fighter.cx + fighter.hurtboxW / 2 + 150 &&
                    beamRect.x + beamRect.w > fighter.cx - fighter.hurtboxW / 2 - 50) {
                    threat.level = 2;
                    threat.type = 'laser';
                    threat.direction = opponent.cx < fighter.cx ? 1 : -1;
                    threat.sourceX = opponent.cx;
                    return threat;
                }
            }
        }
    }

    // Low-level caution: opponent is close and facing us
    var dist = Math.abs(opponent.cx - fighter.cx);
    if (dist < 200 && opponent.state !== 'dead') {
        threat.level = 1;
        threat.type = 'proximity';
        threat.direction = opponent.cx < fighter.cx ? 1 : -1;
    }

    return threat;
}

/** Execute a dodge maneuver based on threat */
function _executeDodge(fighter, threat, opponent, platforms) {
    fighter.aiDodgeCooldown = 4 + Math.floor(Math.random() * 3);

    // Too close to react (under 50px) — sometimes fail to dodge
    var threatDist = Math.abs(threat.sourceX - fighter.cx);
    if (threatDist < 50 && Math.random() < 0.5) return;

    switch (threat.type) {
        case 'melee':
            // Jump over or back off from melee
            if (fighter.isOnGround && Math.random() < 0.6) {
                fighter.velocityY = -18;
                fighter.isOnGround = false;
                fighter._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                // Jump toward a safe direction (away from threat)
                var dodgeDir = threat.direction;
                fighter.cx += dodgeDir * fighter.moveSpeed * 3;
            } else {
                // Back off
                fighter.cx += threat.direction * fighter.moveSpeed * 2;
            }
            fighter.aiAction = 'dodge';
            fighter.aiCooldown = 2;
            break;

        case 'projectile':
            // Dodge perpendicular to projectile direction
            if (fighter.isOnGround && Math.random() < 0.7) {
                fighter.velocityY = -16 - Math.random() * 4;
                fighter.isOnGround = false;
                fighter._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                // Move sideways away from projectile source
                fighter.cx += threat.direction * fighter.moveSpeed * 2;
            } else {
                // Horizontal dodge
                fighter.cx += threat.direction * fighter.moveSpeed * 3;
            }
            fighter.aiAction = 'dodge';
            fighter.aiCooldown = 3;
            break;

        case 'laser':
            // Move out of beam path — jump or move vertically
            if (fighter.isOnGround) {
                fighter.velocityY = -18;
                fighter.isOnGround = false;
                fighter._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            } else {
                // Already airborne, try to land on a platform
                var bestPlat = _findNearestPlatform(fighter, platforms, 'above');
                if (bestPlat) {
                    var platCx = bestPlat.x + bestPlat.w / 2;
                    var platDir = platCx > fighter.cx ? 1 : -1;
                    fighter.cx += platDir * fighter.moveSpeed;
                }
            }
            fighter.aiAction = 'dodge';
            fighter.aiCooldown = 5;
            break;

        default:
            break;
    }

    // Update walk state
    if (fighter.state !== 'idle' && fighter.state !== 'walk') {
        fighter.state = 'idle';
        fighter._syncAnim();
    }
}

/** Survival check: shield, retreat, pickup seeking when low HP */
function _checkSurvival(fighter, dt, opponent, pickups, hpRatio, dist, platforms) {
    // Critical HP — activate shield if available
    if (hpRatio < 0.2) {
        var shieldIdx = fighter.name === 'reimu' ? 2 : 3;
        if (fighter.skills[shieldIdx].cooldown <= 0 && !fighter.skills[shieldIdx].active && !fighter.shield) {
            fighter.activateSkill(shieldIdx, opponent);
            fighter.aiRetreatTimer = 30;
            return true;
        }

        // Use fly to escape (Reimu)
        if (fighter.name === 'reimu' && fighter.skills[3].cooldown <= 0 && !fighter.skills[3].active && !fighter.flying.active) {
            fighter.activateSkill(3, opponent);
            fighter.aiRetreatTimer = 25;
            return true;
        }

        // Seek HP pickup when critically low
        if (pickups && pickups.length > 0) {
            var hpPickup = _findBestPickup(fighter, pickups, 'hp');
            if (hpPickup) {
                var pickupDist = Math.abs(fighter.cx - (hpPickup.x + hpPickup.width / 2));
                if (pickupDist < 600) {
                    _moveToward(fighter, hpPickup.x + hpPickup.width / 2, fighter.moveSpeed);
                    fighter.aiAction = 'seekPickup';
                    fighter.aiActionTarget = hpPickup;
                    fighter.aiActionTimer = 5;
                    return true;
                }
            }
        }

        // Retreat to nearest platform
        if (fighter.aiRetreatTimer > 0 || dist < 250) {
            var retreatDir = opponent.cx < fighter.cx ? 1 : -1;
            fighter.cx += retreatDir * fighter.moveSpeed;
            if (fighter.state !== 'walk') {
                fighter.state = 'walk';
                fighter._syncAnim();
            }
            // Jump to platform if being chased
            if (fighter.isOnGround && dist < 200 && Math.random() < 0.3) {
                fighter.velocityY = -18;
                fighter.isOnGround = false;
                fighter._currentPlatform = null;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            }
            return true;
        }
    }

    // Medium HP — proactive shield before engaging
    if (hpRatio < 0.5 && dist < 300) {
        var shieldIdx2 = fighter.name === 'reimu' ? 2 : 3;
        if (fighter.skills[shieldIdx2].cooldown <= 0 && !fighter.skills[shieldIdx2].active && !fighter.shield && Math.random() < 0.15) {
            fighter.activateSkill(shieldIdx2, opponent);
            return true;
        }
    }

    return false;
}

/** Pick best skill for combo follow-up */
function _pickComboSkill(fighter, opponent, dist, dy) {
    // Try offensive skills first
    if (fighter.name === 'reimu') {
        // Spell cards for spread damage
        if (fighter.skills[0].cooldown <= 0 && !fighter.skills[0].active && dist < 400) return 0;
        // Seal strike for tracking kill
        if (fighter.skills[1].cooldown <= 0 && !fighter.skills[1].active) return 1;
    } else {
        // Star storm when close
        if (fighter.skills[2].cooldown <= 0 && !fighter.skills[2].active && dist < 250) return 2;
        // Laser when aligned
        if (fighter.skills[0].cooldown <= 0 && !fighter.skills[0].active && dy < 80 && dist > 150) return 0;
        // Big laser for kill pressure
        if (fighter.skills[1].cooldown <= 0 && !fighter.skills[1].active && dy < 100) return 1;
    }
    return -1;
}

/** Try tactical skill usage based on situation */
function _tryTacticalSkills(fighter, opponent, dist, dy, hpRatio, oppHpRatio, platforms) {
    if (fighter.name === 'reimu') {
        return _tryReimuSkills(fighter, opponent, dist, dy, hpRatio, oppHpRatio);
    } else {
        return _tryMarisaSkills(fighter, opponent, dist, dy, hpRatio, oppHpRatio);
    }
}

/** Tactical skill usage for Reimu */
function _tryReimuSkills(fighter, opponent, dist, dy, hpRatio, oppHpRatio) {
    // Skill 0: Spell cards — best at medium range, when roughly aligned
    if (fighter.skills[0].cooldown <= 0 && !fighter.skills[0].active) {
        if (dist > 200 && dist < 500 && dy < 120 && Math.random() < 0.35) {
            fighter.activateSkill(0, opponent);
            fighter.aiLastSkillUsed = 0;
            fighter.aiCooldown = 5;
            return true;
        }
        // Also use when closing in and opponent is on platform
        if (dist < 350 && dy > 50 && dy < 200 && Math.random() < 0.2) {
            fighter.activateSkill(0, opponent);
            fighter.aiLastSkillUsed = 0;
            fighter.aiCooldown = 5;
            return true;
        }
    }

    // Skill 1: Seal strike — kill pressure when opponent low HP, or when opponent is stuck
    if (fighter.skills[1].cooldown <= 0 && !fighter.skills[1].active) {
        if (oppHpRatio < 0.3 && Math.random() < 0.5) {
            fighter.activateSkill(1, opponent);
            fighter.aiLastSkillUsed = 1;
            fighter.aiCooldown = 8;
            return true;
        }
        // Use when opponent is far and we can't reach
        if (dist > 400 && Math.random() < 0.2) {
            fighter.activateSkill(1, opponent);
            fighter.aiLastSkillUsed = 1;
            fighter.aiCooldown = 8;
            return true;
        }
    }

    // Skill 3: Fly — escape pressure, reach platforms, dodge horizontal attacks
    if (fighter.skills[3].cooldown <= 0 && !fighter.skills[3].active && !fighter.flying.active) {
        // Use when pressured on ground
        if (hpRatio < 0.4 && dist < 200 && Math.random() < 0.2) {
            fighter.activateSkill(3, opponent);
            fighter.aiLastSkillUsed = 3;
            fighter.aiCooldown = 5;
            return true;
        }
        // Use to approach when opponent is on high platform
        if (dy > 150 && Math.random() < 0.25) {
            fighter.activateSkill(3, opponent);
            fighter.aiLastSkillUsed = 3;
            fighter.aiCooldown = 5;
            return true;
        }
    }

    return false;
}

/** Tactical skill usage for Marisa */
function _tryMarisaSkills(fighter, opponent, dist, dy, hpRatio, oppHpRatio) {
    // Skill 0: Regular laser — best when aligned vertically, medium+ range
    if (fighter.skills[0].cooldown <= 0 && !fighter.skills[0].active) {
        if (dy < 80 && dist > 250 && dist < 600 && Math.random() < 0.3) {
            fighter.activateSkill(0, opponent);
            fighter.aiLastSkillUsed = 0;
            fighter.aiCooldown = 8;
            return true;
        }
    }

    // Skill 1: Big laser — kill pressure or when aligned
    if (fighter.skills[1].cooldown <= 0 && !fighter.skills[1].active) {
        if (oppHpRatio < 0.3 && dy < 100 && Math.random() < 0.4) {
            fighter.activateSkill(1, opponent);
            fighter.aiLastSkillUsed = 1;
            fighter.aiCooldown = 10;
            return true;
        }
        if (dy < 60 && dist > 200 && Math.random() < 0.2) {
            fighter.activateSkill(1, opponent);
            fighter.aiLastSkillUsed = 1;
            fighter.aiCooldown = 10;
            return true;
        }
    }

    // Skill 2: Star storm — best when close (maximum hits)
    if (fighter.skills[2].cooldown <= 0 && !fighter.skills[2].active) {
        if (dist < 200 && Math.random() < 0.4) {
            fighter.activateSkill(2, opponent);
            fighter.aiLastSkillUsed = 2;
            fighter.aiCooldown = 5;
            return true;
        }
        // Use defensively when surrounded
        if (dist < 300 && hpRatio < 0.5 && Math.random() < 0.25) {
            fighter.activateSkill(2, opponent);
            fighter.aiLastSkillUsed = 2;
            fighter.aiCooldown = 5;
            return true;
        }
    }

    return false;
}

/** Try seeking pickups based on HP and situation */
function _trySeekPickup(fighter, pickups, hpRatio, oppHpRatio, opponent) {
    if (!pickups || pickups.length === 0) return false;

    // Don't chase pickups when opponent is low HP — go for kill
    if (oppHpRatio < 0.2) return false;

    // Seek HP pickup when moderately low
    if (hpRatio < 0.5) {
        var hpPickup = _findBestPickup(fighter, pickups, 'hp');
        if (hpPickup) {
            var pickupDist = Math.abs(fighter.cx - (hpPickup.x + hpPickup.width / 2));
            if (pickupDist < 500 && Math.random() < 0.3) {
                fighter.aiAction = 'seekPickup';
                fighter.aiActionTarget = hpPickup;
                fighter.aiActionTimer = 8;
                _moveToward(fighter, hpPickup.x + hpPickup.width / 2, fighter.moveSpeed);
                return true;
            }
        }
    }

    // Consider CD pickup if important skill is on cooldown
    if (fighter.skills[1].cooldown > 10) {
        var cdPickup = _findBestPickup(fighter, pickups, 'cd');
        if (cdPickup) {
            var cdDist = Math.abs(fighter.cx - (cdPickup.x + cdPickup.width / 2));
            if (cdDist < 400 && Math.random() < 0.15) {
                fighter.aiAction = 'seekPickup';
                fighter.aiActionTarget = cdPickup;
                fighter.aiActionTimer = 8;
                _moveToward(fighter, cdPickup.x + cdPickup.width / 2, fighter.moveSpeed);
                return true;
            }
        }
    }

    return false;
}

/** Platform navigation tactics */
function _tryPlatformTactic(fighter, opponent, platforms, hpRatio, dy, dist) {
    if (!platforms || platforms.length === 0) return false;

    // When low HP, retreat to highest nearby platform
    if (hpRatio < 0.3 && Math.random() < 0.2) {
        var safePlat = _findNearestPlatform(fighter, platforms, 'high');
        if (safePlat) {
            var platCx = safePlat.x + safePlat.w / 2;
            var platDx = Math.abs(fighter.cx - platCx);
            if (platDx > 30) {
                _moveToward(fighter, platCx, fighter.moveSpeed);
                // Jump if platform is above
                if (safePlat.y < fighter.cy - 50 && fighter.isOnGround) {
                    fighter.velocityY = -18;
                    fighter.isOnGround = false;
                    fighter._currentPlatform = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
                }
                fighter.aiActionTimer = 5;
                return true;
            }
        }
    }

    // When opponent is on a high platform, jump to reach them
    if (dy > 80 && opponent.cy < fighter.cy && dist < 500) {
        var approachPlat = _findNearestPlatform(fighter, platforms, 'above');
        if (approachPlat && fighter.isOnGround && Math.random() < 0.3) {
            var aPlatCx = approachPlat.x + approachPlat.w / 2;
            _moveToward(fighter, aPlatCx, fighter.moveSpeed);
            fighter.velocityY = -18;
            fighter.isOnGround = false;
            fighter._currentPlatform = null;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            fighter.aiActionTimer = 5;
            return true;
        }
    }

    // Use platforms to dodge ground-level pressure
    if (dist < 250 && fighter.aiThreatLevel >= 1 && fighter.isOnGround && Math.random() < 0.2) {
        var dodgePlat = _findNearestPlatform(fighter, platforms, 'above');
        if (dodgePlat) {
            var dPlatCx = dodgePlat.x + dodgePlat.w / 2;
            _moveToward(fighter, dPlatCx, fighter.moveSpeed * 1.2);
            fighter.velocityY = -18;
            fighter.isOnGround = false;
            fighter._currentPlatform = null;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            fighter.aiActionTimer = 5;
            return true;
        }
    }

    return false;
}

/** Execute behavior based on HP stance */
function _executeStance(fighter, hpRatio, oppHpRatio, dist, dy, opponent, platforms, pickups) {
    // AGGRESSIVE: High HP or opponent low HP
    if (hpRatio > 0.6 || oppHpRatio < 0.3) {
        _aggressiveBehavior(fighter, opponent, dist, dy, platforms);
    }
    // BALANCED: Medium HP
    else if (hpRatio > 0.3) {
        _balancedBehavior(fighter, opponent, dist, dy, platforms);
    }
    // DEFENSIVE: Low HP
    else {
        _defensiveBehavior(fighter, opponent, dist, platforms, pickups);
    }
}

/** Aggressive stance: approach, attack, pressure */
function _aggressiveBehavior(fighter, opponent, dist, dy, platforms) {
    if (dist < 120) {
        // Melee range — attack
        fighter.state = 'attack';
        fighter._atkHit = false;
        fighter._syncAnim();
        fighter.aiCooldown = 5;
        fighter.aiComboFollowUp = true;
        fighter.aiComboCount = 1;
    } else if (dist < 300) {
        // Close range — approach with jump mixup
        if (Math.random() < 0.25 && fighter.isOnGround) {
            fighter.velocityY = -16 - Math.random() * 4;
            fighter.isOnGround = false;
            fighter._currentPlatform = null;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
            // Air approach
            _moveToward(fighter, opponent.cx, fighter.moveSpeed);
        } else {
            _moveToward(fighter, opponent.cx, fighter.moveSpeed);
        }
        fighter.aiActionTimer = 3;
    } else {
        // Long range — fast approach
        _moveToward(fighter, opponent.cx, fighter.moveSpeed);
        fighter.aiActionTimer = 5;
    }
}

/** Balanced stance: approach cautiously, dodge more */
function _balancedBehavior(fighter, opponent, dist, dy, platforms) {
    if (dist < 100) {
        // Melee range — attack but be ready to dodge
        fighter.state = 'attack';
        fighter._atkHit = false;
        fighter._syncAnim();
        fighter.aiCooldown = 8;
        fighter.aiComboFollowUp = true;
        fighter.aiComboCount = 1;
    } else if (dist < 300) {
        // Approach with more caution
        if (fighter.aiThreatLevel >= 1 && Math.random() < 0.4) {
            // Back off slightly then re-approach
            var awayDir = opponent.cx < fighter.cx ? 1 : -1;
            fighter.cx += awayDir * fighter.moveSpeed * 0.5;
            _moveToward(fighter, opponent.cx, fighter.moveSpeed * 0.7);
        } else {
            _moveToward(fighter, opponent.cx, fighter.moveSpeed);
        }
        fighter.aiActionTimer = 6;
    } else {
        _moveToward(fighter, opponent.cx, fighter.moveSpeed * 0.9);
        fighter.aiActionTimer = 8;
    }
}

/** Defensive stance: keep distance, look for pickups/shield */
function _defensiveBehavior(fighter, opponent, dist, platforms, pickups) {
    // Keep distance from opponent
    if (dist < 250) {
        var retreatDir = opponent.cx < fighter.cx ? 1 : -1;
        fighter.cx += retreatDir * fighter.moveSpeed;
        if (fighter.state !== 'walk') {
            fighter.state = 'walk';
            fighter._syncAnim();
        }
        // Jump away if being chased
        if (fighter.isOnGround && dist < 180 && Math.random() < 0.4) {
            fighter.velocityY = -18;
            fighter.isOnGround = false;
            fighter._currentPlatform = null;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
        }
    } else if (dist > 400) {
        // Safe distance — stay put or approach slowly
        if (fighter.state !== 'idle') {
            fighter.state = 'idle';
            fighter._syncAnim();
        }
    } else {
        // Maintain distance
        if (fighter.state !== 'walk' && fighter.state !== 'idle') {
            fighter.state = 'idle';
            fighter._syncAnim();
        }
    }
    fighter.aiActionTimer = 5;
}

/** Occasionally make a suboptimal decision to feel human */
function _makeSuboptimalDecision(fighter, opponent, platforms, pickups, dist) {
    var r = Math.random();
    if (r < 0.3) {
        // Idle for a moment
        if (fighter.state !== 'idle') {
            fighter.state = 'idle';
            fighter._syncAnim();
        }
        fighter.aiActionTimer = 10 + Math.floor(Math.random() * 15);
    } else if (r < 0.6) {
        // Random jump
        if (fighter.isOnGround && !fighter.flying.active) {
            fighter.velocityY = -18;
            fighter.isOnGround = false;
            fighter._currentPlatform = null;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_jump');
        }
        fighter.aiActionTimer = 8;
    } else {
        // Walk in random direction briefly
        var randomDir = Math.random() < 0.5 ? -1 : 1;
        fighter.cx += randomDir * fighter.moveSpeed;
        if (fighter.state !== 'walk') {
            fighter.state = 'walk';
            fighter._syncAnim();
        }
        fighter.aiActionTimer = 5 + Math.floor(Math.random() * 10);
    }
}

/** Move toward a target X position */
function _moveToward(fighter, targetX, speed) {
    var dir = targetX > fighter.cx ? 1 : -1;
    fighter.cx += dir * speed;
    if (fighter.state !== 'walk') {
        fighter.state = 'walk';
        fighter._syncAnim();
    }
}

/** Find nearest platform by strategy: 'high', 'above', or 'near' */
function _findNearestPlatform(fighter, platforms, strategy) {
    if (!platforms || platforms.length === 0) return null;

    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < platforms.length; i++) {
        var plat = platforms[i];
        var platCx = plat.x + plat.w / 2;
        var dx = Math.abs(fighter.cx - platCx);
        var dy = plat.y - fighter.cy;

        var score;
        if (strategy === 'high') {
            // Higher platforms preferred (lower y = higher)
            score = dy + dx * 0.3;
        } else if (strategy === 'above') {
            // Only platforms above us
            if (dy >= 0) continue;
            score = Math.abs(dy) + dx * 0.5;
        } else {
            // Nearest by distance
            score = Math.sqrt(dx * dx + (dy * dy));
        }

        if (score < bestScore) {
            bestScore = score;
            best = plat;
        }
    }

    return best;
}

/** Find best pickup by type: 'hp', 'cd', or null for any */
function _findBestPickup(fighter, pickups, type) {
    if (!pickups || pickups.length === 0) return null;

    var best = null;
    var bestDist = Infinity;

    for (var i = 0; i < pickups.length; i++) {
        var pickup = pickups[i];
        var pickupCx = pickup.x + (pickup.width || 30) / 2;
        var d = Math.abs(fighter.cx - pickupCx);

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
