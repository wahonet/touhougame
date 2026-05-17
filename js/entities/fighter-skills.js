/**
 * Fighter Skills - Skill activation, update, drawing, and beam helpers
 * Extracted from Fighter class to modularize the skill system.
 */
import { ARENA_WIDTH, SCREEN_HEIGHT } from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';
import { AudioManager } from '../core/audio-manager.js';
import { Game } from '../core/game-state.js';
import { emitHitImpact } from '../core/battle-events.js';
import { rectsOverlap } from '../systems/collision.js';

// ===================== SKILL ACTIVATION =====================

/**
 * Activate a skill by index
 * @param {Fighter} fighter
 * @param {number} index - Skill index 0-3
 * @param {Fighter} opponent
 */
export function activateSkill(fighter, index, opponent) {
    const skill = fighter.skills[index];
    if (skill.cooldown > 0 || skill.active || fighter.state === 'dead') return;

    skill.active = true;
    skill.cooldown = skill.maxCooldown;

    if (fighter.name === 'reimu') {
        switch (index) {
            case 0: _activateReimuSpellCards(fighter, skill); break;
            case 1: _activateReimuSealStrike(fighter, skill, opponent); break;
            case 2: _activateReimuBarrier(fighter, skill); break;
            case 3: _activateReimuFlight(fighter, skill); break;
        }
    } else if (fighter.name === 'marisa') {
        switch (index) {
            case 0: _activateMarisaLaser(fighter, skill); break;
            case 1: _activateMarisaBigLaser(fighter, skill); break;
            case 2: _activateMarisaStarStorm(fighter, skill); break;
            case 3: _activateMarisaBarrier(fighter, skill); break;
        }
    } else if (fighter.name === 'yuyuko') {
        switch (index) {
            case 0: _activateYuyukoSoulButterfly(fighter, skill); break;
            case 1: _activateYuyukoDeathInvitation(fighter, skill, opponent); break;
            case 2: _activateYuyukoSpiritGuide(fighter, skill); break;
            case 3: _activateYuyukoCherryBlossomStorm(fighter, skill); break;
        }
    } else if (fighter.name === 'youmu') {
        switch (index) {
            case 0: _activateYoumuRoukanken(fighter, skill, opponent); break;
            case 1: _activateYoumuHakuroukenSlash(fighter, skill); break;
            case 2: _activateYoumuHalfSpiritDash(fighter, skill); break;
            case 3: _activateYoumuSlashOfPresentWorld(fighter, skill); break;
        }
    }
}

// ---- REIMU SKILLS ----

/** Skill 0: 梦想天生 - 8 spread projectiles, 15 dmg each */
function _activateReimuSpellCards(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    skill.data = {
        projectiles: [],
        hitEffects: [],
        age: 0
    };

    const dir = fighter.facing === 'right' ? 1 : -1;
    for (let i = 0; i < 8; i++) {
        const angle = (-30 + (60 / 7) * i) * Math.PI / 180;
        skill.data.projectiles.push({
            x: fighter.cx + dir * 30,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: Math.cos(angle) * 10 * dir,
            vy: Math.sin(angle) * 10,
            active: true,
            frame: 0,
            hitTarget: false
        });
    }
}

/** Skill 1: 梦想封印 - Tracking seal, 150 dmg */
function _activateReimuSealStrike(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_seal');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        seal: {
            x: fighter.cx + dir * 30,
            y: fighter.cy - fighter.hurtboxH / 2,
            active: true,
            frame: 0,
            hit: false
        },
        hitEffects: [],
        hitTimer: 0
    };
}

/** Skill 2: 二重结界 - Shield 300 HP, 10s duration */
function _activateReimuBarrier(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
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
function _activateReimuFlight(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    fighter.flying.active = true;
    fighter.flying.timer = 0;
    // Cancel any downward velocity
    if (fighter.velocityY > 0) fighter.velocityY = 0;
    skill.data = { done: false };
}

// ---- MARISA SKILLS ----

/** Skill 0: 魔法炮 - Regular laser, 30 total dmg */
function _activateMarisaLaser(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_laser');
    skill.data = {
        phase: 'charge',
        chargeTimer: 0,
        fireTimer: 0,
        damageTicks: [false, false, false],
        beamDir: fighter.facing === 'right' ? 1 : -1
    };
}

/** Skill 1: 二重魔法炮 - Bigger laser, 100 total dmg */
function _activateMarisaBigLaser(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_laser');
    skill.data = {
        phase: 'charge',
        chargeTimer: 0,
        fireTimer: 0,
        damageTicks: [false, false, false, false],
        beamDir: fighter.facing === 'right' ? 1 : -1,
        big: true
    };
}

/** Skill 2: 群星闪耀 - 16 stars in 360°, 20 dmg each */
function _activateMarisaStarStorm(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const stars = [];
    for (let i = 0; i < 16; i++) {
        const angle = (360 / 16) * i * Math.PI / 180;
        stars.push({
            x: fighter.cx,
            y: fighter.cy - fighter.hurtboxH / 2,
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
function _activateMarisaBarrier(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 300,
        maxHp: 300,
        duration: 10,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

// ---- YUYUKO SKILLS ----

/** Skill 0: 反魂蝶 - Fan of 6 pink butterfly projectiles, 12 dmg each */
function _activateYuyukoSoulButterfly(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    skill.data = {
        projectiles: [],
        hitEffects: [],
        age: 0
    };

    const dir = fighter.facing === 'right' ? 1 : -1;
    for (let i = 0; i < 6; i++) {
        const angle = (-20 + (40 / 5) * i) * Math.PI / 180;
        skill.data.projectiles.push({
            x: fighter.cx + dir * 30,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: Math.cos(angle) * 9 * dir,
            vy: Math.sin(angle) * 9,
            active: true,
            frame: 0,
            hitTarget: false
        });
    }
}

/** Skill 1: 幽雅地死去 - Slow homing ghost orb, 100 dmg */
function _activateYuyukoDeathInvitation(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_seal');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        orb: {
            x: fighter.cx + dir * 30,
            y: fighter.cy - fighter.hurtboxH / 2,
            speed: 3.5,
            active: true,
            frame: 0,
            hit: false
        },
        hitEffects: [],
        hitTimer: 0
    };
}

/** Skill 2: 死出之导 - Shield absorbing 200 dmg, 5s */
function _activateYuyukoSpiritGuide(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 200,
        maxHp: 200,
        duration: 5,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

/** Skill 3: 樱舞幻阵 - Area effect radius 120, 8 dmg/tick for 3s */
function _activateYuyukoCherryBlossomStorm(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    skill.data = {
        cx: fighter.cx,
        cy: fighter.cy - fighter.hurtboxH / 2,
        radius: 120,
        duration: 3,
        timer: 0,
        tickInterval: 0.3,
        tickTimer: 0,
        petals: []
    };
    // Spawn initial petals
    for (let i = 0; i < 20; i++) {
        skill.data.petals.push({
            angle: Math.random() * Math.PI * 2,
            dist: Math.random() * skill.data.radius,
            speed: 0.5 + Math.random() * 1.5,
            size: 3 + Math.random() * 5,
            alpha: 0.3 + Math.random() * 0.7
        });
    }
}

// ---- YOUMU SKILLS ----

/** Skill 0: 楼观剑 - Wide sword slash, 90x70 hitbox, 50 dmg */
function _activateYoumuRoukanken(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        slashX: fighter.cx + dir * (fighter.hurtboxW / 2 + 10),
        slashY: fighter.cy - fighter.hurtboxH / 2,
        width: 90,
        height: 70,
        dir: dir,
        duration: 0.3,
        timer: 0,
        hitTarget: false,
        slashArc: 0
    };
}

/** Skill 1: 白楼剑斩 - Dash forward speed 14, 80 dmg, invulnerable, 0.5s */
function _activateYoumuHakuroukenSlash(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    fighter.velocityX = dir * 14;
    fighter.velocityY = 0;
    fighter.invincible = true;
    skill.data = {
        dir: dir,
        duration: 0.5,
        timer: 0,
        hitTarget: false,
        trailParticles: []
    };
}

/** Skill 2: 半灵冲刺 - Quick dash speed 16, no damage, invulnerable, 0.3s */
function _activateYoumuHalfSpiritDash(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    fighter.velocityX = dir * 16;
    fighter.velocityY = 0;
    fighter.invincible = true;
    skill.data = {
        dir: dir,
        duration: 0.3,
        timer: 0,
        trailParticles: []
    };
}

/** Skill 3: 现世斩 - Powerful beam, 120 dmg, 1s */
function _activateYoumuSlashOfPresentWorld(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_laser');
    skill.data = {
        phase: 'charge',
        chargeTimer: 0,
        fireTimer: 0,
        damageTicks: [false, false, false],
        beamDir: fighter.facing === 'right' ? 1 : -1
    };
}

// ===================== BEAM RECT HELPERS =====================

/** Get the beam rectangle for regular laser */
export function getBeamRect(fighter) {
    const laserSkill = fighter.skills[0];
    if (!laserSkill.active || !laserSkill.data || laserSkill.data.phase !== 'fire') return null;
    return calcBeamRect(fighter, laserSkill.data.beamDir, 40, 800);
}

/** Get the beam rectangle for big laser */
export function getBigBeamRect(fighter) {
    const bigSkill = fighter.skills[1];
    if (!bigSkill.active || !bigSkill.data || bigSkill.data.phase !== 'fire') return null;
    return calcBeamRect(fighter, bigSkill.data.beamDir, 64, 1000);
}

export function calcBeamRect(fighter, dir, beamHeight, beamRange) {
    const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
    const beamY = fighter.cy - fighter.hurtboxH / 2 - beamHeight / 2;
    let beamStartX, beamEndX;
    if (dir === 1) {
        beamStartX = fighter.cx + fighter.hurtboxW / 2;
        beamEndX = Math.min(beamStartX + beamRange, boundX);
    } else {
        beamEndX = fighter.cx - fighter.hurtboxW / 2;
        beamStartX = Math.max(beamEndX - beamRange, 0);
    }
    return { x: beamStartX, y: beamY, w: beamEndX - beamStartX, h: beamHeight };
}

// ===================== SKILL UPDATE =====================

/** Route skill update by index */
export function updateSkillByIndex(fighter, index, dt, opponent) {
    const skill = fighter.skills[index];

    if (fighter.name === 'reimu') {
        switch (index) {
            case 0: _updateReimuSpellCards(fighter, skill, dt, opponent); break;
            case 1: _updateReimuSealStrike(fighter, skill, dt, opponent); break;
            case 2: _updateReimuBarrier(fighter, skill, dt); break;
            case 3: _updateReimuFlight(fighter, skill, dt); break;
        }
    } else if (fighter.name === 'marisa') {
        switch (index) {
            case 0: _updateMarisaLaser(fighter, skill, dt, opponent); break;
            case 1: _updateMarisaBigLaser(fighter, skill, dt, opponent); break;
            case 2: _updateMarisaStarStorm(fighter, skill, dt, opponent); break;
            case 3: _updateMarisaBarrier(fighter, skill, dt); break;
        }
    } else if (fighter.name === 'yuyuko') {
        switch (index) {
            case 0: _updateYuyukoSoulButterfly(fighter, skill, dt, opponent); break;
            case 1: _updateYuyukoDeathInvitation(fighter, skill, dt, opponent); break;
            case 2: _updateYuyukoSpiritGuide(fighter, skill, dt); break;
            case 3: _updateYuyukoCherryBlossomStorm(fighter, skill, dt, opponent); break;
        }
    } else if (fighter.name === 'youmu') {
        switch (index) {
            case 0: _updateYoumuRoukanken(fighter, skill, dt, opponent); break;
            case 1: _updateYoumuHakuroukenSlash(fighter, skill, dt, opponent); break;
            case 2: _updateYoumuHalfSpiritDash(fighter, skill, dt); break;
            case 3: _updateYoumuSlashOfPresentWorld(fighter, skill, dt, opponent); break;
        }
    }
}

// ---- REIMU SKILL UPDATES ----

/** Update Reimu spell card projectiles */
function _updateReimuSpellCards(fighter, skill, dt, opponent) {
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

        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (proj.x < -50 || proj.x > boundX + 50 ||
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
function _updateReimuSealStrike(fighter, skill, dt, opponent) {
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
function _updateReimuBarrier(fighter, skill, dt) {
    if (!fighter.shield) {
        skill.active = false;
        skill.data = {};
    }
}

/** Update Reimu flight */
function _updateReimuFlight(fighter, skill, dt) {
    if (!fighter.flying.active) {
        skill.active = false;
        skill.data = {};
    }
}

// ---- MARISA SKILL UPDATES ----

/** Update Marisa regular laser */
function _updateMarisaLaser(fighter, skill, dt, opponent) {
    const data = skill.data;

    if (data.phase === 'charge') {
        data.chargeTimer += dt;
        if (data.chargeTimer >= 0.5) {
            data.phase = 'fire';
            data.fireTimer = 0;
            data.beamDir = fighter.facing === 'right' ? 1 : -1;
        }
    } else if (data.phase === 'fire') {
        data.fireTimer += dt;

        const tickTimes = [0, 0.33, 0.66];
        for (let i = 0; i < 3; i++) {
            if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                data.damageTicks[i] = true;
                const beamRect = calcBeamRect(fighter, data.beamDir, 40, 800);
                if (beamRect && opponent.state !== 'dead') {
                    const hurtbox = opponent.getHurtbox();
                    if (rectsOverlap(beamRect, hurtbox)) {
                        opponent.damage(20);
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
function _updateMarisaBigLaser(fighter, skill, dt, opponent) {
    const data = skill.data;

    if (data.phase === 'charge') {
        data.chargeTimer += dt;
        if (data.chargeTimer >= 0.7) {
            data.phase = 'fire';
            data.fireTimer = 0;
            data.beamDir = fighter.facing === 'right' ? 1 : -1;
        }
    } else if (data.phase === 'fire') {
        data.fireTimer += dt;

        const tickTimes = [0, 0.3, 0.6, 0.9];
        for (let i = 0; i < 4; i++) {
            if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                data.damageTicks[i] = true;
                const beamRect = calcBeamRect(fighter, data.beamDir, 64, 1000);
                if (beamRect && opponent.state !== 'dead') {
                    const hurtbox = opponent.getHurtbox();
                    if (rectsOverlap(beamRect, hurtbox)) {
                        opponent.damage(100);
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
function _updateMarisaStarStorm(fighter, skill, dt, opponent) {
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

        // Out of bounds
        const starBoundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (star.x < -50 || star.x > starBoundX + 50 ||
            star.y < -50 || star.y > SCREEN_HEIGHT + 50) {
            star.active = false;
        }

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
function _updateMarisaBarrier(fighter, skill, dt) {
    if (!fighter.shield) {
        skill.active = false;
        skill.data = {};
    }
}

// ---- YUYUKO SKILL UPDATES ----

/** Update Yuyuko soul butterfly projectiles */
function _updateYuyukoSoulButterfly(fighter, skill, dt, opponent) {
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
                opponent.damage(12);
                emitHitImpact({ x: proj.x, y: proj.y, color: '#ff66aa' });
                data.hitEffects.push({ x: proj.x, y: proj.y, timer: 10 });
                proj.active = false;
            }
        }

        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (proj.x < -50 || proj.x > boundX + 50 ||
            proj.y < -50 || proj.y > SCREEN_HEIGHT + 50) {
            proj.active = false;
        }

        if (proj.frame > 90) {
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

/** Update Yuyuko death invitation (homing ghost orb) */
function _updateYuyukoDeathInvitation(fighter, skill, dt, opponent) {
    const data = skill.data;
    const orb = data.orb;

    if (orb.active) {
        orb.frame++;

        // Homing toward opponent
        if (opponent.state !== 'dead') {
            const hurtbox = opponent.getHurtbox();
            const targetX = hurtbox.x + hurtbox.w / 2;
            const targetY = hurtbox.y + hurtbox.h / 2;
            const dx = targetX - orb.x;
            const dy = targetY - orb.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                orb.x += (dx / dist) * orb.speed;
                orb.y += (dy / dist) * orb.speed;
            }

            // Hit check
            if (orb.x > hurtbox.x && orb.x < hurtbox.x + hurtbox.w &&
                orb.y > hurtbox.y && orb.y < hurtbox.y + hurtbox.h) {
                orb.active = false;
                orb.hit = true;
                opponent.damage(100);
                emitHitImpact({ x: orb.x, y: orb.y, color: '#cc88ff' });
                data.hitEffects.push({ x: orb.x, y: orb.y, timer: 30 });
                data.hitTimer = 0;
            }
        }

        // Timeout
        if (orb.frame > 120) {
            orb.active = false;
            if (!orb.hit) {
                skill.active = false;
                skill.data = {};
                return;
            }
        }
    }

    // Update hit effects
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

/** Update Yuyuko spirit guide (shield) */
function _updateYuyukoSpiritGuide(fighter, skill, dt) {
    if (!fighter.shield) {
        skill.active = false;
        skill.data = {};
    }
}

/** Update Yuyuko cherry blossom storm */
function _updateYuyukoCherryBlossomStorm(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;
    data.tickTimer += dt;

    // Center follows fighter loosely
    data.cx = fighter.cx;
    data.cy = fighter.cy - fighter.hurtboxH / 2;

    // Damage tick
    if (data.tickTimer >= data.tickInterval && opponent.state !== 'dead') {
        data.tickTimer = 0;
        const hurtbox = opponent.getHurtbox();
        const ocx = hurtbox.x + hurtbox.w / 2;
        const ocy = hurtbox.y + hurtbox.h / 2;
        const dx = ocx - data.cx;
        const dy = ocy - data.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < data.radius) {
            opponent.damage(8);
            emitHitImpact({ x: ocx, y: ocy, color: '#ffaadd' });
        }
    }

    // Update petals
    for (const petal of data.petals) {
        petal.angle += petal.speed * dt * 2;
        petal.alpha = 0.3 + Math.sin(data.timer * 3 + petal.angle) * 0.3;
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

// ---- YOUMU SKILL UPDATES ----

/** Update Youmu roukanken (sword slash) */
function _updateYoumuRoukanken(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;
    data.slashArc = Math.min(1, data.timer / data.duration);

    if (!data.hitTarget && opponent.state !== 'dead') {
        const slashRect = {
            x: data.dir === 1 ? data.slashX : data.slashX - data.width,
            y: data.slashY - data.height / 2,
            w: data.width,
            h: data.height
        };
        const hurtbox = opponent.getHurtbox();
        if (rectsOverlap(slashRect, hurtbox)) {
            data.hitTarget = true;
            opponent.damage(50);
            emitHitImpact({
                x: data.dir === 1 ? slashRect.x + slashRect.w : slashRect.x,
                y: slashRect.y + slashRect.h / 2,
                color: '#44ddaa'
            });
        }
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

/** Update Youmu hakurouken slash (dash + damage) */
function _updateYoumuHakuroukenSlash(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    // Add trail particle
    data.trailParticles.push({
        x: fighter.cx,
        y: fighter.cy - fighter.hurtboxH / 2,
        alpha: 0.8,
        size: 15 + Math.random() * 10
    });

    // Hit check during dash
    if (!data.hitTarget && opponent.state !== 'dead') {
        const hurtbox = opponent.getHurtbox();
        const dashRect = fighter.getHurtbox();
        if (rectsOverlap(dashRect, hurtbox)) {
            data.hitTarget = true;
            opponent.damage(80);
            emitHitImpact({
                x: (dashRect.x + dashRect.w / 2 + hurtbox.x + hurtbox.w / 2) / 2,
                y: (dashRect.y + dashRect.h / 2 + hurtbox.y + hurtbox.h / 2) / 2,
                color: '#88ccff'
            });
        }
    }

    // Fade trail particles
    for (let i = data.trailParticles.length - 1; i >= 0; i--) {
        data.trailParticles[i].alpha -= dt * 3;
        if (data.trailParticles[i].alpha <= 0) {
            data.trailParticles.splice(i, 1);
        }
    }

    if (data.timer >= data.duration) {
        fighter.invincible = false;
        if (data.trailParticles.length === 0) {
            skill.active = false;
            skill.data = {};
        }
    }
}

/** Update Youmu half-spirit dash (mobility) */
function _updateYoumuHalfSpiritDash(fighter, skill, dt) {
    const data = skill.data;
    data.timer += dt;

    // Add trail particle
    data.trailParticles.push({
        x: fighter.cx,
        y: fighter.cy - fighter.hurtboxH / 2,
        alpha: 0.6,
        size: 12 + Math.random() * 8
    });

    // Fade trail particles
    for (let i = data.trailParticles.length - 1; i >= 0; i--) {
        data.trailParticles[i].alpha -= dt * 4;
        if (data.trailParticles[i].alpha <= 0) {
            data.trailParticles.splice(i, 1);
        }
    }

    if (data.timer >= data.duration) {
        fighter.invincible = false;
        if (data.trailParticles.length === 0) {
            skill.active = false;
            skill.data = {};
        }
    }
}

/** Update Youmu slash of present world (beam) */
function _updateYoumuSlashOfPresentWorld(fighter, skill, dt, opponent) {
    const data = skill.data;

    if (data.phase === 'charge') {
        data.chargeTimer += dt;
        if (data.chargeTimer >= 0.4) {
            data.phase = 'fire';
            data.fireTimer = 0;
            data.beamDir = fighter.facing === 'right' ? 1 : -1;
        }
    } else if (data.phase === 'fire') {
        data.fireTimer += dt;

        const tickTimes = [0, 0.33, 0.66];
        for (let i = 0; i < 3; i++) {
            if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                data.damageTicks[i] = true;
                const beamRect = calcBeamRect(fighter, data.beamDir, 48, 800);
                if (beamRect && opponent.state !== 'dead') {
                    const hurtbox = opponent.getHurtbox();
                    if (rectsOverlap(beamRect, hurtbox)) {
                        opponent.damage(40);
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

// ===================== DRAW SKILL EFFECTS =====================

/** Draw all active skill effects */
export function drawSkill(fighter, ctx) {
    for (let i = 0; i < 4; i++) {
        if (!fighter.skills[i].active) continue;
        if (fighter.name === 'reimu') {
            switch (i) {
                case 0: _drawReimuSpellCards(fighter, ctx, fighter.skills[i].data); break;
                case 1: _drawReimuSealStrike(fighter, ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'marisa') {
            switch (i) {
                case 0: _drawMarisaLaser(fighter, ctx, fighter.skills[i].data); break;
                case 1: _drawMarisaBigLaser(fighter, ctx, fighter.skills[i].data); break;
                case 2: _drawMarisaStarStorm(fighter, ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'yuyuko') {
            switch (i) {
                case 0: _drawYuyukoSoulButterfly(fighter, ctx, fighter.skills[i].data); break;
                case 1: _drawYuyukoDeathInvitation(fighter, ctx, fighter.skills[i].data); break;
                case 3: _drawYuyukoCherryBlossomStorm(fighter, ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'youmu') {
            switch (i) {
                case 0: _drawYoumuRoukanken(fighter, ctx, fighter.skills[i].data); break;
                case 1: _drawYoumuHakuroukenSlash(fighter, ctx, fighter.skills[i].data); break;
                case 3: _drawYoumuSlashOfPresentWorld(fighter, ctx, fighter.skills[i].data); break;
            }
        }
    }

    // Draw shield if active
    if (fighter.shield && fighter.shield.hp > 0) {
        _drawShield(fighter, ctx);
    }

    // Draw flying aura
    if (fighter.flying.active) {
        _drawFlyAura(fighter, ctx);
    }
}

// ---- REIMU DRAW ----

function _drawReimuSpellCards(fighter, ctx, data) {
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

function _drawReimuSealStrike(fighter, ctx, data) {
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

function _drawMarisaLaser(fighter, ctx, data) {
    if (data.phase === 'charge') {
        const chargeScale = 1 + data.chargeTimer * 3;
        const sprite = Assets.effects.laserCharge;
        const dir = data.beamDir;
        const cx = fighter.cx + dir * (fighter.hurtboxW / 2 + 10);
        const cy = fighter.cy - fighter.hurtboxH / 2;

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
        const beamRect = calcBeamRect(fighter, data.beamDir, 40, 800);
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
            if (dir === 1) {
                ctx.drawImage(headSprite, headX, beamRect.y - 4, 64, 48);
            } else {
                ctx.save();
                ctx.translate(headX + 64, beamRect.y - 4);
                ctx.scale(-1, 1);
                ctx.drawImage(headSprite, 0, 0, 64, 48);
                ctx.restore();
            }
        }

        // Beam glow overlay
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.02) * 0.1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(beamRect.x, beamRect.y + 10, beamRect.w, beamRect.h - 20);
        ctx.restore();
    }
}

function _drawMarisaBigLaser(fighter, ctx, data) {
    if (data.phase === 'charge') {
        const chargeScale = 1 + data.chargeTimer * 4;
        const sprite = Assets.effects.laserCharge;
        const dir = data.beamDir;
        const cx = fighter.cx + dir * (fighter.hurtboxW / 2 + 10);
        const cy = fighter.cy - fighter.hurtboxH / 2;

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
        const beamRect = calcBeamRect(fighter, data.beamDir, 64, 1000);
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
            if (dir === 1) {
                ctx.drawImage(headSprite, headX, beamRect.y - 8, 80, 80);
            } else {
                ctx.save();
                ctx.translate(headX + 80, beamRect.y - 8);
                ctx.scale(-1, 1);
                ctx.drawImage(headSprite, 0, 0, 80, 80);
                ctx.restore();
            }
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

function _drawMarisaStarStorm(fighter, ctx, data) {
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

// ---- YUYUKO DRAW ----

function _drawYuyukoSoulButterfly(fighter, ctx, data) {
    for (const proj of data.projectiles) {
        if (!proj.active) continue;
        const frameIndex = Math.floor(proj.frame / 8) % 4;
        const sprite = Assets.effects.spellcard ? Assets.effects.spellcard[frameIndex] : null;
        if (sprite) {
            ctx.drawImage(sprite, proj.x - 16, proj.y - 16, 32, 32);
        } else {
            ctx.save();
            ctx.fillStyle = '#ff66aa';
            ctx.shadowColor = '#ff66aa';
            ctx.shadowBlur = 12;
            // Butterfly shape
            const wingPhase = Math.sin(proj.frame * 0.3) * 0.3;
            ctx.beginPath();
            ctx.ellipse(proj.x - 5, proj.y - 3, 6 * (1 + wingPhase), 8, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(proj.x + 5, proj.y - 3, 6 * (1 + wingPhase), 8, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    for (const effect of data.hitEffects) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 102, 170, 0.7)';
        ctx.shadowColor = '#ff66aa';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 15 * (effect.timer / 10), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function _drawYuyukoDeathInvitation(fighter, ctx, data) {
    const orb = data.orb;

    if (orb.active) {
        const pulse = 0.8 + Math.sin(orb.frame * 0.15) * 0.2;
        ctx.save();
        ctx.fillStyle = '#cc88ff';
        ctx.shadowColor = '#cc88ff';
        ctx.shadowBlur = 20 * pulse;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 14 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Inner glow
        ctx.fillStyle = '#ffaadd';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 7 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Trailing wisps
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff66aa';
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(orb.x - (orb.x - fighter.cx) * 0.05 * i,
                     orb.y - (orb.y - (fighter.cy - fighter.hurtboxH / 2)) * 0.05 * i + Math.sin(orb.frame * 0.2 + i) * 5,
                     6 - i, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    for (const effect of data.hitEffects) {
        const remaining = effect.timer;
        ctx.save();
        ctx.fillStyle = `rgba(204, 136, 255, ${remaining / 30})`;
        ctx.shadowColor = '#cc88ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 40 * (1 - remaining / 30) + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function _drawYuyukoCherryBlossomStorm(fighter, ctx, data) {
    const progress = data.timer / data.duration;
    const alpha = progress < 0.1 ? progress / 0.1 : (progress > 0.8 ? (1 - progress) / 0.2 : 1);

    // Area circle
    ctx.save();
    ctx.globalAlpha = 0.15 * alpha;
    ctx.fillStyle = '#ffaadd';
    ctx.shadowColor = '#ffaadd';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(data.cx, data.cy, data.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ring outline
    ctx.save();
    ctx.globalAlpha = 0.4 * alpha;
    ctx.strokeStyle = '#ff66aa';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff66aa';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(data.cx, data.cy, data.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Petals
    for (const petal of data.petals) {
        const px = data.cx + Math.cos(petal.angle) * petal.dist;
        const py = data.cy + Math.sin(petal.angle) * petal.dist;
        ctx.save();
        ctx.globalAlpha = petal.alpha * alpha;
        ctx.fillStyle = '#ffaadd';
        ctx.shadowColor = '#ffaadd';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.ellipse(px, py, petal.size, petal.size * 0.6, petal.angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ---- YOUMU DRAW ----

function _drawYoumuRoukanken(fighter, ctx, data) {
    const progress = data.slashArc;
    const dir = data.dir;
    const cx = data.slashX;
    const cy = data.slashY;

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.5;

    // Sword slash arc
    const arcStart = dir === 1 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
    const arcEnd = arcStart + dir * (Math.PI * 0.8 * progress);

    ctx.strokeStyle = '#44ddaa';
    ctx.shadowColor = '#44ddaa';
    ctx.shadowBlur = 15 + progress * 10;
    ctx.lineWidth = 6 - progress * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, arcStart, arcEnd);
    ctx.stroke();

    // Inner bright slash
    ctx.strokeStyle = '#aaffcc';
    ctx.shadowColor = '#aaffcc';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, arcStart, arcEnd);
    ctx.stroke();

    ctx.restore();
}

function _drawYoumuHakuroukenSlash(fighter, ctx, data) {
    // Trail particles
    for (const particle of data.trailParticles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#88ccff';
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Sword slash effect at front of dash
    if (data.timer < data.duration) {
        const dir = data.dir;
        const slashX = fighter.cx + dir * (fighter.hurtboxW / 2 + 15);
        const slashY = fighter.cy - fighter.hurtboxH / 2;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#aaffcc';
        ctx.shadowColor = '#aaffcc';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(slashX, slashY - 30);
        ctx.lineTo(slashX + dir * 20, slashY);
        ctx.lineTo(slashX, slashY + 30);
        ctx.stroke();
        ctx.restore();
    }
}

function _drawYoumuSlashOfPresentWorld(fighter, ctx, data) {
    if (data.phase === 'charge') {
        const chargeScale = 1 + data.chargeTimer * 3;
        const dir = data.beamDir;
        const cx = fighter.cx + dir * (fighter.hurtboxW / 2 + 10);
        const cy = fighter.cy - fighter.hurtboxH / 2;

        ctx.save();
        const radius = 20 * chargeScale;
        ctx.fillStyle = `rgba(68, 221, 170, ${0.5 + data.chargeTimer})`;
        ctx.shadowColor = '#44ddaa';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (data.phase === 'fire') {
        const beamRect = calcBeamRect(fighter, data.beamDir, 48, 800);
        if (!beamRect) return;

        const dir = data.beamDir;
        ctx.save();
        ctx.fillStyle = 'rgba(68, 221, 170, 0.85)';
        ctx.shadowColor = '#44ddaa';
        ctx.shadowBlur = 25;
        ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
        ctx.restore();

        // Inner glow
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.02) * 0.1;
        ctx.fillStyle = '#aaffcc';
        ctx.fillRect(beamRect.x, beamRect.y + 10, beamRect.w, beamRect.h - 20);
        ctx.restore();

        // Outer glow
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#66ffdd';
        ctx.fillRect(beamRect.x, beamRect.y - 8, beamRect.w, beamRect.h + 16);
        ctx.restore();
    }
}

// ---- COMMON DRAW ----

function _drawShield(fighter, ctx) {
    const shield = fighter.shield;
    const sprite = Assets.effects.shield;
    const size = Math.max(fighter.hurtboxW, fighter.hurtboxH) * 1.4;
    const cx = fighter.cx;
    const cy = fighter.cy - fighter.hurtboxH / 2;

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

function _drawFlyAura(fighter, ctx) {
    const sprite = Assets.effects.flyAura;
    const cx = fighter.cx;
    const cy = fighter.cy + 5; // beneath feet

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
