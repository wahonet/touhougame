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
            case 3: _activateYuyukoCherryBlossomStorm(fighter, skill, opponent); break;
        }
    } else if (fighter.name === 'youmu') {
        switch (index) {
            case 0: _activateYoumuSpiritSlash(fighter, skill); break;
            case 1: _activateYoumuGhostBlade(fighter, skill); break;
            case 2: _activateYoumuHalfSpiritShield(fighter, skill); break;
            case 3: _activateYoumuGhostStep(fighter, skill); break;
        }
    } else if (fighter.name === 'sanae') {
        switch (index) {
            case 0: _activateSanaeWind(fighter, skill); break;
            case 1: _activateSanaeMiracleStar(fighter, skill, opponent); break;
            case 2: _activateSanaeMoriyaWard(fighter, skill); break;
            case 3: _activateSanaeMiraclePrayer(fighter, skill); break;
        }
    } else if (fighter.name === 'flandre') {
        switch (index) {
            case 0: _activateFlandreLaevatein(fighter, skill); break;
            case 1: _activateFlandreDestructionEye(fighter, skill, opponent); break;
            case 2: _activateFlandreScarletShield(fighter, skill); break;
            case 3: _activateFlandreFourOfAKind(fighter, skill); break;
        }
    } else if (fighter.name === 'sakuya') {
        switch (index) {
            case 0: _activateSakuyaKnifeArray(fighter, skill); break;
            case 1: _activateSakuyaKillingDoll(fighter, skill, opponent); break;
            case 2: _activateSakuyaWatchWard(fighter, skill); break;
            case 3: _activateSakuyaWorld(fighter, skill, opponent); break;
        }
    } else if (fighter.name === 'reisen') {
        switch (index) {
            case 0: _activateReisenLunarBeam(fighter, skill); break;
            case 1: _activateReisenMindWave(fighter, skill); break;
            case 2: _activateReisenWaveShield(fighter, skill); break;
            case 3: _activateReisenLunaticEyes(fighter, skill, opponent); break;
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
    fighter.state = 'idle';
    fighter._atkHit = false;
    fighter.velocityX = 0;
    fighter.velocityY = 0;
    fighter.isOnGround = false;
    fighter._currentPlatform = null;
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
        beamDir: fighter.facing === 'right' ? 1 : -1,
        aimY: fighter.cy - fighter.hurtboxH / 2
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
    for (let i = 0; i < 8; i++) {
        const angle = (-24 + (48 / 7) * i) * Math.PI / 180;
        skill.data.projectiles.push({
            x: fighter.cx + dir * 30,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: Math.cos(angle) * 8.8 * dir,
            vy: Math.sin(angle) * 8.8,
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
            speed: 4.2,
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
        hp: 360,
        maxHp: 360,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

/** Skill 3: 樱舞幻阵 - Area effect radius 120, 8 dmg/tick for 3s */
function _activateYuyukoCherryBlossomStorm(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const targetBox = _getActivationHurtbox(opponent);
    const targetX = targetBox ? targetBox.x + targetBox.w / 2 : fighter.cx + dir * 220;
    const targetY = targetBox ? targetBox.y + targetBox.h / 2 : fighter.cy - fighter.hurtboxH / 2;
    skill.data = {
        cx: targetX,
        cy: targetY,
        radius: 170,
        duration: 4,
        timer: 0,
        snaredTargets: [],
        petals: []
    };
    // Spawn initial petals
    for (let i = 0; i < 20; i++) {
        skill.data.petals.push({
            angle: Math.random() * Math.PI * 2,
            dist: Math.random() * skill.data.radius,
            speed: 0.6 + Math.random() * 1.8,
            size: 4 + Math.random() * 6,
            alpha: 0.3 + Math.random() * 0.7
        });
    }
}

// ---- YOUMU SKILLS ----

/** Skill 0: 半灵追斩 - homing spirit slash, 90 dmg */
function _activateYoumuSpiritSlash(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        spirit: {
            x: fighter.cx + dir * 35,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: dir * 7,
            vy: 0,
            active: true,
            frame: 0,
            hit: false
        },
        hitEffects: []
    };
}

/** Skill 1: 幽魂回刃 - returning ghost blade, 120 dmg */
function _activateYoumuGhostBlade(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        blade: {
            x: fighter.cx + dir * 36,
            y: fighter.cy - fighter.hurtboxH / 2,
            startX: fighter.cx,
            dir,
            phase: 'out',
            frame: 0,
            active: true
        },
        hitTargets: [],
        trailParticles: []
    };
}

/** Skill 2: 半灵护佑 - shield 260 HP, 8s */
function _activateYoumuHalfSpiritShield(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 260,
        maxHp: 260,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

/** Skill 3: 幽体步 - invulnerable ghost dash, no damage */
function _activateYoumuGhostStep(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    fighter.invincible = true;
    skill.data = {
        dir,
        timer: 0,
        duration: 0.45,
        trailParticles: []
    };
}

function _getActivationHurtbox(opponent) {
    if (!opponent) return null;
    let box = opponent.getHurtbox ? opponent.getHurtbox() : null;
    if (box && box.x < 9000) return box;
    if (opponent.cx !== undefined && opponent.cy !== undefined) {
        const w = opponent.hurtboxW || 50;
        const h = opponent.hurtboxH || 100;
        box = { x: opponent.cx - w / 2, y: opponent.cy - h, w, h };
    }
    return box;
}

// ---- SANAE SKILLS ----

function _activateSanaeWind(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = { blades: [], hitEffects: [] };
    for (let i = 0; i < 3; i++) {
        skill.data.blades.push({
            x: fighter.cx + dir * 38,
            y: fighter.cy - fighter.hurtboxH * (0.72 - i * 0.16),
            vx: dir * (8.5 + i * 0.9),
            vy: (i - 1) * 1.05,
            frame: i * 7,
            active: true,
            hit: false
        });
    }
}

function _activateSanaeMiracleStar(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        x: target ? target.x + target.w / 2 : fighter.cx + dir * 260,
        y: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        timer: 0,
        duration: 1.05,
        hit: false
    };
}

function _activateSanaeMoriyaWard(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 300,
        maxHp: 300,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateSanaeMiraclePrayer(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const hpRatio = fighter.hp / fighter.maxHp;
    const highCooldown = fighter.skills.find(s => s !== skill && s.cooldown > 8);
    let miracle = 'power';
    if (hpRatio < 0.55) {
        miracle = 'heal';
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + 150);
    } else if (highCooldown) {
        miracle = 'cooldown';
        for (const other of fighter.skills) {
            if (other !== skill && other.cooldown > 0) other.cooldown = Math.max(0, other.cooldown - 7);
        }
    } else {
        fighter.nextAttackBonus = Math.max(fighter.nextAttackBonus || 0, 35);
    }
    skill.data = { timer: 0, duration: 1.35, miracle };
}

// ---- FLANDRE SKILLS ----

function _activateFlandreLaevatein(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        slash: {
            x: fighter.cx + dir * 55,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: dir * 10.5,
            dir,
            frame: 0,
            active: true,
            hit: false
        }
    };
}

function _activateFlandreDestructionEye(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        x: target ? target.x + target.w / 2 : fighter.cx + dir * 230,
        y: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 125,
        timer: 0,
        duration: 1.15,
        hit: false
    };
}

function _activateFlandreScarletShield(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 420,
        maxHp: 420,
        duration: 5,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateFlandreFourOfAKind(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    fighter.nextAttackBonus = Math.max(fighter.nextAttackBonus || 0, 45);
    skill.data = {
        timer: 0,
        duration: 5,
        clones: [
            { ox: -70, oy: -8, phase: 0 },
            { ox: 70, oy: -8, phase: 1.7 },
            { ox: 0, oy: -46, phase: 3.2 }
        ]
    };
}

// ---- SAKUYA SKILLS ----

function _activateSakuyaKnifeArray(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = { knives: [], hitEffects: [] };
    for (let i = 0; i < 7; i++) {
        const angle = (-24 + i * 8) * Math.PI / 180;
        skill.data.knives.push({
            x: fighter.cx + dir * 42,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: Math.cos(angle) * 12 * dir,
            vy: Math.sin(angle) * 4.5,
            frame: i * 2,
            active: true,
            hit: false
        });
    }
}

function _activateSakuyaKillingDoll(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const hb = _getActivationHurtbox(opponent);
    if (hb) {
        fighter.cx = hb.x + hb.w / 2 - dir * 95;
        fighter.setFacing(dir === 1 ? 'right' : 'left');
        if (typeof fighter.clampToBounds === 'function') fighter.clampToBounds();
    }
    skill.data = {
        x: fighter.cx + dir * 80,
        y: fighter.cy - fighter.hurtboxH / 2,
        dir,
        timer: 0,
        duration: 0.58,
        hit: false
    };
}

function _activateSakuyaWatchWard(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 260,
        maxHp: 260,
        duration: 7,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateSakuyaWorld(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    if (opponent && opponent.state !== 'dead') {
        opponent.timeStopTimer = Math.max(opponent.timeStopTimer || 0, 2.1);
    }
    skill.data = {
        x: fighter.cx,
        y: fighter.cy - fighter.hurtboxH / 2,
        timer: 0,
        duration: 2.1,
        rings: []
    };
    for (let i = 0; i < 14; i++) {
        skill.data.rings.push({ angle: Math.random() * Math.PI * 2, radius: 45 + Math.random() * 150 });
    }
}

// ---- REISEN SKILLS ----

function _activateReisenLunarBeam(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_laser');
    skill.data = {
        phase: 'charge',
        chargeTimer: 0,
        fireTimer: 0,
        damageTicks: [false, false, false],
        beamDir: fighter.facing === 'right' ? 1 : -1,
        aimY: fighter.cy - fighter.hurtboxH / 2
    };
}

function _activateReisenMindWave(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        wave: {
            x: fighter.cx + dir * 45,
            y: fighter.cy - fighter.hurtboxH / 2,
            vx: dir * 8.2,
            dir,
            frame: 0,
            active: true,
            hitTargets: []
        }
    };
}

function _activateReisenWaveShield(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 300,
        maxHp: 300,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateReisenLunaticEyes(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        cx: target ? target.x + target.w / 2 : fighter.cx + dir * 180,
        cy: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 230,
        timer: 0,
        duration: 3.2,
        affected: []
    };
}

// ===================== BEAM RECT HELPERS =====================

/** Get the beam rectangle for regular laser */
export function getBeamRect(fighter) {
    const laserSkill = fighter.skills[0];
    if (!laserSkill.active || !laserSkill.data || laserSkill.data.phase !== 'fire') return null;
    return calcBeamRect(fighter, laserSkill.data.beamDir, 40, 800, laserSkill.data.aimY);
}

/** Get the beam rectangle for big laser */
export function getBigBeamRect(fighter) {
    const bigSkill = fighter.skills[1];
    if (!bigSkill.active || !bigSkill.data || bigSkill.data.phase !== 'fire') return null;
    return calcBeamRect(fighter, bigSkill.data.beamDir, 64, 1000);
}

export function calcBeamRect(fighter, dir, beamHeight, beamRange, centerY) {
    const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
    const beamCenterY = centerY || fighter.cy - fighter.hurtboxH / 2;
    const beamY = beamCenterY - beamHeight / 2;
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
            case 0: _updateYoumuSpiritSlash(fighter, skill, dt, opponent); break;
            case 1: _updateYoumuGhostBlade(fighter, skill, dt, opponent); break;
            case 2: _updateYoumuHalfSpiritShield(fighter, skill, dt); break;
            case 3: _updateYoumuGhostStep(fighter, skill, dt); break;
        }
    } else if (fighter.name === 'sanae') {
        switch (index) {
            case 0: _updateSanaeWind(fighter, skill, dt, opponent); break;
            case 1: _updateSanaeMiracleStar(fighter, skill, dt, opponent); break;
            case 2: _updateGenericShield(fighter, skill); break;
            case 3: _updateTimedAura(skill, dt); break;
        }
    } else if (fighter.name === 'flandre') {
        switch (index) {
            case 0: _updateFlandreLaevatein(fighter, skill, dt, opponent); break;
            case 1: _updateFlandreDestructionEye(fighter, skill, dt, opponent); break;
            case 2: _updateGenericShield(fighter, skill); break;
            case 3: _updateTimedAura(skill, dt); break;
        }
    } else if (fighter.name === 'sakuya') {
        switch (index) {
            case 0: _updateSakuyaKnifeArray(fighter, skill, dt, opponent); break;
            case 1: _updateSakuyaKillingDoll(fighter, skill, dt, opponent); break;
            case 2: _updateGenericShield(fighter, skill); break;
            case 3: _updateSakuyaWorld(fighter, skill, dt); break;
        }
    } else if (fighter.name === 'reisen') {
        switch (index) {
            case 0: _updateReisenLunarBeam(fighter, skill, dt, opponent); break;
            case 1: _updateReisenMindWave(fighter, skill, dt, opponent); break;
            case 2: _updateGenericShield(fighter, skill); break;
            case 3: _updateReisenLunaticEyes(fighter, skill, dt, opponent); break;
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
    const targetY = opponent && opponent.cy !== undefined
        ? opponent.cy - ((opponent.hurtboxH || 100) / 2)
        : fighter.cy - fighter.hurtboxH / 2;
    const trackRate = data.phase === 'fire' ? 0.08 : 0.18;
    data.aimY += (targetY - data.aimY) * trackRate;

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
                const beamRect = calcBeamRect(fighter, data.beamDir, 40, 800, data.aimY);
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
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 3);
                emitHitImpact({ x: star.x, y: star.y, color: '#ffdd44', shake: 4, maxShake: 8 });
                star.active = false;
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
                opponent.damage(18);
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
                opponent.damage(140);
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

    // Functional field: snare and heavily slow targets inside the petals, no damage.
    if (opponent.state !== 'dead') {
        const hurtbox = opponent.getHurtbox();
        const ocx = hurtbox.x + hurtbox.w / 2;
        const ocy = hurtbox.y + hurtbox.h / 2;
        const dx = ocx - data.cx;
        const dy = ocy - data.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < data.radius) {
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 0.35);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.25);
            if (!data.snaredTargets.includes(opponent)) {
                data.snaredTargets.push(opponent);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 1.2);
            }
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
function _updateYoumuSpiritSlash(fighter, skill, dt, opponent) {
    const data = skill.data;
    const spirit = data.spirit;
    if (!spirit || !spirit.active) {
        if (!data.hitEffects || data.hitEffects.length === 0) {
            skill.active = false;
            skill.data = {};
        }
        return;
    }

    spirit.frame++;

    if (opponent.state !== 'dead') {
        const hurtbox = opponent.getHurtbox();
        const targetX = hurtbox.x + hurtbox.w / 2;
        const targetY = hurtbox.y + hurtbox.h / 2;
        const dx = targetX - spirit.x;
        const dy = targetY - spirit.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        spirit.vx = spirit.vx * 0.85 + (dx / dist) * 2.2;
        spirit.vy = spirit.vy * 0.85 + (dy / dist) * 2.2;
        const speed = Math.sqrt(spirit.vx * spirit.vx + spirit.vy * spirit.vy) || 1;
        const maxSpeed = 9;
        if (speed > maxSpeed) {
            spirit.vx = spirit.vx / speed * maxSpeed;
            spirit.vy = spirit.vy / speed * maxSpeed;
        }
    }

    spirit.x += spirit.vx;
    spirit.y += spirit.vy;

    if (!spirit.hit && opponent.state !== 'dead') {
        const hurtbox = opponent.getHurtbox();
        if (spirit.x > hurtbox.x && spirit.x < hurtbox.x + hurtbox.w &&
            spirit.y > hurtbox.y && spirit.y < hurtbox.y + hurtbox.h) {
            spirit.hit = true;
            spirit.active = false;
            opponent.damage(90);
            emitHitImpact({ x: spirit.x, y: spirit.y, color: '#88eebb', shake: 10, maxShake: 14 });
            data.hitEffects.push({ x: spirit.x, y: spirit.y, timer: 24 });
        }
    }

    const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
    if (spirit.frame > 120 || spirit.x < -80 || spirit.x > boundX + 80 || spirit.y < -80 || spirit.y > SCREEN_HEIGHT + 80) {
        spirit.active = false;
    }

    for (let i = data.hitEffects.length - 1; i >= 0; i--) {
        data.hitEffects[i].timer--;
        if (data.hitEffects[i].timer <= 0) data.hitEffects.splice(i, 1);
    }

    if (!spirit.active && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

/** Update Youmu hakurouken slash (dash + damage) */
function _updateYoumuGhostBlade(fighter, skill, dt, opponent) {
    const data = skill.data;
    const blade = data.blade;
    if (!blade || !blade.active) {
        skill.active = false;
        skill.data = {};
        return;
    }

    blade.frame++;
    blade.x += blade.dir * (blade.phase === 'out' ? 11 : -13);
    blade.y += Math.sin(blade.frame * 0.18) * 1.5;

    data.trailParticles.push({
        x: blade.x,
        y: blade.y,
        alpha: 0.65,
        size: 10 + Math.random() * 8
    });

    if (blade.phase === 'out' && Math.abs(blade.x - blade.startX) > 360) {
        blade.phase = 'back';
    }

    if (opponent.state !== 'dead' && !data.hitTargets.includes(opponent)) {
        const hurtbox = opponent.getHurtbox();
        const bladeRect = { x: blade.x - 28, y: blade.y - 28, w: 56, h: 56 };
        if (rectsOverlap(bladeRect, hurtbox)) {
            data.hitTargets.push(opponent);
            opponent.damage(120);
            emitHitImpact({ x: blade.x, y: blade.y, color: '#88ccff', shake: 12, maxShake: 16 });
        }
    }

    for (let i = data.trailParticles.length - 1; i >= 0; i--) {
        data.trailParticles[i].alpha -= dt * 3.5;
        if (data.trailParticles[i].alpha <= 0) {
            data.trailParticles.splice(i, 1);
        }
    }

    if (blade.phase === 'back' && Math.abs(blade.x - fighter.cx) < 35) {
        blade.active = false;
    }

    if ((!blade.active || blade.frame > 150) && data.trailParticles.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

/** Update Youmu half-spirit dash (mobility) */
function _updateYoumuHalfSpiritShield(fighter, skill, dt) {
    if (!fighter.shield) {
        skill.active = false;
        skill.data = {};
    }
}

/** Update Youmu slash of present world (beam) */
function _updateYoumuGhostStep(fighter, skill, dt) {
    const data = skill.data;
    data.timer += dt;

    const dashing = data.timer <= data.duration;
    fighter.invincible = dashing;
    if (dashing) {
        fighter.cx += data.dir * 760 * dt;
        if (typeof fighter.clampToBounds === 'function') fighter.clampToBounds();
    }

    data.trailParticles.push({
        x: fighter.cx,
        y: fighter.cy - fighter.hurtboxH / 2,
        alpha: 0.65,
        size: 18 + Math.random() * 10
    });

    for (let i = data.trailParticles.length - 1; i >= 0; i--) {
        data.trailParticles[i].alpha -= dt * 4;
        if (data.trailParticles[i].alpha <= 0) {
            data.trailParticles.splice(i, 1);
        }
    }

    if (data.timer >= data.duration) fighter.invincible = false;
    if (data.timer >= data.duration && data.trailParticles.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

// ---- NEW CHARACTER SKILL UPDATES ----

function _updateGenericShield(fighter, skill) {
    if (!fighter.shield) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateTimedAura(skill, dt) {
    const data = skill.data;
    data.timer += dt;
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _targetCenter(target) {
    const hb = target.getHurtbox();
    return { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2, hb };
}

function _updateSanaeWind(fighter, skill, dt, opponent) {
    const data = skill.data;
    for (const blade of data.blades) {
        if (!blade.active) continue;
        blade.x += blade.vx;
        blade.y += blade.vy + Math.sin(blade.frame * 0.13) * 0.7;
        blade.frame++;
        if (!blade.hit && opponent.state !== 'dead') {
            const hb = opponent.getHurtbox();
            const rect = { x: blade.x - 28, y: blade.y - 22, w: 56, h: 44 };
            if (rectsOverlap(rect, hb)) {
                blade.hit = true;
                blade.active = false;
                opponent.damage(42);
                opponent.velocityX = (opponent.velocityX || 0) + Math.sign(blade.vx) * 4;
                data.hitEffects.push({ x: blade.x, y: blade.y, timer: 16 });
            }
        }
        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (blade.frame > 90 || blade.x < -80 || blade.x > boundX + 80) blade.active = false;
    }
    _tickHitEffects(data.hitEffects);
    if (data.blades.every(b => !b.active) && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateSanaeMiracleStar(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;
    if (!data.hit && data.timer >= 0.62 && opponent.state !== 'dead') {
        const hb = opponent.getHurtbox();
        const rect = { x: data.x - 62, y: data.y - 145, w: 124, h: 190 };
        if (rectsOverlap(rect, hb)) {
            data.hit = true;
            opponent.damage(145);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.35);
        }
    }
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateFlandreLaevatein(fighter, skill, dt, opponent) {
    const slash = skill.data.slash;
    slash.x += slash.vx;
    slash.frame++;
    slash.y += Math.sin(slash.frame * 0.22) * 0.4;
    if (!slash.hit && opponent.state !== 'dead') {
        const rect = { x: slash.x - 52, y: slash.y - 44, w: 104, h: 88 };
        if (rectsOverlap(rect, opponent.getHurtbox())) {
            slash.hit = true;
            slash.active = false;
            opponent.damage(120);
        }
    }
    const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
    if (slash.frame > 70 || slash.x < -80 || slash.x > boundX + 80) slash.active = false;
    if (!slash.active) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateFlandreDestructionEye(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;
    if (!data.hit && data.timer >= 0.75 && opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.x;
        const dy = y - data.y;
        if (dx * dx + dy * dy <= data.radius * data.radius) {
            data.hit = true;
            opponent.damage(180);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.5);
        }
    }
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateSakuyaKnifeArray(fighter, skill, dt, opponent) {
    const data = skill.data;
    for (const knife of data.knives) {
        if (!knife.active) continue;
        knife.x += knife.vx;
        knife.y += knife.vy;
        knife.frame++;
        if (!knife.hit && opponent.state !== 'dead') {
            const hb = opponent.getHurtbox();
            const rect = { x: knife.x - 18, y: knife.y - 6, w: 36, h: 12 };
            if (rectsOverlap(rect, hb)) {
                knife.hit = true;
                knife.active = false;
                opponent.damage(24);
                data.hitEffects.push({ x: knife.x, y: knife.y, timer: 10 });
            }
        }
        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (knife.frame > 75 || knife.x < -80 || knife.x > boundX + 80) knife.active = false;
    }
    _tickHitEffects(data.hitEffects);
    if (data.knives.every(k => !k.active) && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateSakuyaKillingDoll(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;
    if (!data.hit && data.timer >= 0.18 && opponent.state !== 'dead') {
        const rect = { x: data.x - 70, y: data.y - 58, w: 140, h: 116 };
        if (rectsOverlap(rect, opponent.getHurtbox())) {
            data.hit = true;
            opponent.damage(150);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.55);
        }
    }
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateSakuyaWorld(fighter, skill, dt) {
    const data = skill.data;
    data.timer += dt;
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateReisenLunarBeam(fighter, skill, dt, opponent) {
    const data = skill.data;
    const targetY = opponent && opponent.cy !== undefined
        ? opponent.cy - ((opponent.hurtboxH || 100) / 2)
        : fighter.cy - fighter.hurtboxH / 2;
    data.aimY += (targetY - data.aimY) * (data.phase === 'fire' ? 0.09 : 0.2);

    if (data.phase === 'charge') {
        data.chargeTimer += dt;
        if (data.chargeTimer >= 0.42) {
            data.phase = 'fire';
            data.fireTimer = 0;
            data.beamDir = fighter.facing === 'right' ? 1 : -1;
        }
        return;
    }

    if (data.phase === 'fire') {
        data.fireTimer += dt;
        const tickTimes = [0, 0.24, 0.48];
        for (let i = 0; i < tickTimes.length; i++) {
            if (!data.damageTicks[i] && data.fireTimer >= tickTimes[i]) {
                data.damageTicks[i] = true;
                const rect = calcBeamRect(fighter, data.beamDir, 28, 900, data.aimY);
                if (opponent.state !== 'dead' && rectsOverlap(rect, opponent.getHurtbox())) {
                    opponent.damage(22);
                }
            }
        }
        if (data.fireTimer >= 0.82) {
            skill.active = false;
            skill.data = {};
        }
    }
}

function _updateReisenMindWave(fighter, skill, dt, opponent) {
    const wave = skill.data.wave;
    wave.x += wave.vx;
    wave.frame++;
    if (opponent.state !== 'dead' && !wave.hitTargets.includes(opponent)) {
        const rect = { x: wave.x - 42, y: wave.y - 32, w: 84, h: 64 };
        if (rectsOverlap(rect, opponent.getHurtbox())) {
            wave.hitTargets.push(opponent);
            opponent.damage(110);
            opponent.confuseTimer = Math.max(opponent.confuseTimer || 0, 2.2);
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 2.2);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.65);
        }
    }
    const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
    if (wave.frame > 95 || wave.x < -100 || wave.x > boundX + 100) wave.active = false;
    if (!wave.active) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateReisenLunaticEyes(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;
    if (opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.cx;
        const dy = y - data.cy;
        if (dx * dx + dy * dy <= data.radius * data.radius) {
            opponent.confuseTimer = Math.max(opponent.confuseTimer || 0, 2.6);
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 2.6);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.5);
            if (!data.affected.includes(opponent)) data.affected.push(opponent);
        }
    }
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _tickHitEffects(effects) {
    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].timer--;
        if (effects[i].timer <= 0) effects.splice(i, 1);
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
                case 0: _drawYoumuSpiritSlash(fighter, ctx, fighter.skills[i].data); break;
                case 1: _drawYoumuGhostBlade(fighter, ctx, fighter.skills[i].data); break;
                case 3: _drawYoumuGhostStep(fighter, ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'sanae') {
            switch (i) {
                case 0: _drawSanaeWind(ctx, fighter.skills[i].data); break;
                case 1: _drawSanaeMiracleStar(ctx, fighter.skills[i].data); break;
                case 3: _drawSanaePrayer(fighter, ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'flandre') {
            switch (i) {
                case 0: _drawFlandreLaevatein(ctx, fighter.skills[i].data); break;
                case 1: _drawFlandreDestructionEye(ctx, fighter.skills[i].data); break;
                case 3: _drawFlandreFourOfAKind(fighter, ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'sakuya') {
            switch (i) {
                case 0: _drawSakuyaKnifeArray(ctx, fighter.skills[i].data); break;
                case 1: _drawSakuyaKillingDoll(ctx, fighter.skills[i].data); break;
                case 3: _drawSakuyaWorld(ctx, fighter.skills[i].data); break;
            }
        } else if (fighter.name === 'reisen') {
            switch (i) {
                case 0: _drawReisenLunarBeam(fighter, ctx, fighter.skills[i].data); break;
                case 1: _drawReisenMindWave(ctx, fighter.skills[i].data); break;
                case 3: _drawReisenLunaticEyes(ctx, fighter.skills[i].data); break;
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
        const beamRect = calcBeamRect(fighter, data.beamDir, 40, 800, data.aimY);
        if (!beamRect) return;

        const dir = data.beamDir;
        const beamSprite = Assets.effects.laserBeam;
        if (beamSprite) {
            ctx.drawImage(beamSprite, beamRect.x, beamRect.y - 6, beamRect.w, beamRect.h + 12);
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
        const pulse = 0.35 + Math.sin(Date.now() * 0.02) * 0.08;
        const glow = ctx.createLinearGradient(0, beamRect.y, 0, beamRect.y + beamRect.h);
        glow.addColorStop(0, 'rgba(255,255,255,0)');
        glow.addColorStop(0.5, `rgba(255,255,255,${pulse})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(beamRect.x, beamRect.y - 4, beamRect.w, beamRect.h + 8);
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
            ctx.drawImage(beamSprite, beamRect.x, beamRect.y - 10, beamRect.w, beamRect.h + 20);
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
        const pulse = 0.42 + Math.sin(Date.now() * 0.03) * 0.12;
        const glow = ctx.createLinearGradient(0, beamRect.y, 0, beamRect.y + beamRect.h);
        glow.addColorStop(0, 'rgba(255,255,255,0)');
        glow.addColorStop(0.5, `rgba(255,255,255,${pulse})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(beamRect.x, beamRect.y - 8, beamRect.w, beamRect.h + 16);
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

function _drawYoumuSpiritSlash(fighter, ctx, data) {
    const spirit = data.spirit;
    if (spirit && spirit.active) {
        const sprite = Assets.effects.youmuSpiritSlash;
        const size = 54 + Math.sin(spirit.frame * 0.2) * 6;
        if (sprite) {
            ctx.save();
            ctx.translate(spirit.x, spirit.y);
            ctx.rotate(Math.atan2(spirit.vy, spirit.vx));
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            ctx.restore();
        } else {
            ctx.save();
            ctx.strokeStyle = '#88eebb';
            ctx.shadowColor = '#88eebb';
            ctx.shadowBlur = 18;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(spirit.x, spirit.y, size / 2, -0.9, 0.9);
            ctx.stroke();
            ctx.restore();
        }
    }

    for (const effect of data.hitEffects || []) {
        const alpha = Math.max(0, effect.timer / 24);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#aaffcc';
        ctx.shadowColor = '#aaffcc';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 50 * (1 - alpha) + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function _drawYoumuGhostBlade(fighter, ctx, data) {
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

    const blade = data.blade;
    if (blade && blade.active) {
        const sprite = Assets.effects.youmuGhostBlade;
        const size = 60;
        if (sprite) {
            ctx.save();
            ctx.translate(blade.x, blade.y);
            ctx.rotate(blade.frame * 0.18 * blade.dir);
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            ctx.restore();
        } else {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.strokeStyle = '#aaffcc';
            ctx.shadowColor = '#aaffcc';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(blade.x - blade.dir * 28, blade.y - 18);
            ctx.lineTo(blade.x + blade.dir * 28, blade.y);
            ctx.lineTo(blade.x - blade.dir * 28, blade.y + 18);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function _drawYoumuGhostStep(fighter, ctx, data) {
    const sprite = Assets.effects.youmuGhostTrail;
    for (const particle of data.trailParticles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        if (sprite) {
            const size = particle.size * 2.3;
            ctx.drawImage(sprite, particle.x - size / 2, particle.y - size / 2, size, size);
        } else {
            ctx.fillStyle = '#66ffdd';
            ctx.shadowColor = '#66ffdd';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// ---- NEW CHARACTER DRAW ----

function _drawSanaeWind(ctx, data) {
    for (const blade of data.blades || []) {
        if (!blade.active) continue;
        ctx.save();
        ctx.translate(blade.x, blade.y);
        ctx.rotate(Math.atan2(blade.vy, blade.vx));
        ctx.strokeStyle = '#7df5bd';
        ctx.shadowColor = '#7df5bd';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 28 + Math.sin(blade.frame * 0.2) * 4, -0.8, 0.8);
        ctx.stroke();
        ctx.restore();
    }
    _drawSparkEffects(ctx, data.hitEffects, '#7df5bd');
}

function _drawSanaeMiracleStar(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - Math.max(0, p - 0.82) / 0.18;
    ctx.strokeStyle = '#ffe86b';
    ctx.fillStyle = 'rgba(255, 232, 107, 0.18)';
    ctx.shadowColor = '#9affd2';
    ctx.shadowBlur = 22;
    const radius = 32 + p * 58;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 === 0 ? radius : radius * 0.45;
        const x = data.x + Math.cos(a) * r;
        const y = data.y - 70 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(125, 245, 189, 0.16)';
    ctx.fillRect(data.x - 45, data.y - 160, 90, 205);
    ctx.restore();
}

function _drawSanaePrayer(fighter, ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.4;
    ctx.strokeStyle = data.miracle === 'heal' ? '#9affd2' : (data.miracle === 'cooldown' ? '#68b8ff' : '#ffe86b');
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(fighter.cx, fighter.cy - fighter.hurtboxH / 2, 38 + i * 22 + p * 24, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawFlandreLaevatein(ctx, data) {
    const slash = data.slash;
    if (!slash || !slash.active) return;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.scale(slash.dir, 1);
    ctx.strokeStyle = '#ff4a3f';
    ctx.shadowColor = '#ff4a3f';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-46, 34);
    ctx.quadraticCurveTo(6, -38, 62, -14);
    ctx.stroke();
    ctx.strokeStyle = '#ffcc66';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
}

function _drawFlandreDestructionEye(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = p < 0.7 ? 0.7 : 1 - (p - 0.7) / 0.3;
    ctx.strokeStyle = p < 0.65 ? '#ff9a2f' : '#ff3344';
    ctx.shadowColor = '#ff3344';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3 + p * 5;
    for (let i = 0; i < 9; i++) {
        const a = i * Math.PI * 2 / 9 + p * 1.7;
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        ctx.lineTo(data.x + Math.cos(a) * data.radius * p, data.y + Math.sin(a) * data.radius * p);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.radius * p, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawFlandreFourOfAKind(fighter, ctx, data) {
    const p = data.timer / data.duration;
    for (const clone of data.clones || []) {
        ctx.save();
        ctx.globalAlpha = 0.28 + Math.sin(data.timer * 8 + clone.phase) * 0.08;
        ctx.fillStyle = '#f06cff';
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(
            fighter.cx + clone.ox + Math.sin(data.timer * 4 + clone.phase) * 10,
            fighter.cy - fighter.hurtboxH / 2 + clone.oy,
            26 + p * 4,
            46,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    }
}

function _drawSakuyaKnifeArray(ctx, data) {
    for (const knife of data.knives || []) {
        if (!knife.active) continue;
        _drawKnife(ctx, knife.x, knife.y, Math.atan2(knife.vy, knife.vx));
    }
    _drawSparkEffects(ctx, data.hitEffects, '#dcefff');
}

function _drawSakuyaKillingDoll(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.35;
    ctx.strokeStyle = '#dcefff';
    ctx.shadowColor = '#7fc9ff';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(data.x - 70, data.y - 50);
    ctx.lineTo(data.x + 70, data.y + 50);
    ctx.moveTo(data.x + 70, data.y - 50);
    ctx.lineTo(data.x - 70, data.y + 50);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
        const ox = -58 + i * 23;
        _drawKnife(ctx, data.x + ox, data.y - 44 + i * 18, data.dir > 0 ? 0 : Math.PI);
    }
    ctx.restore();
}

function _drawSakuyaWorld(ctx, data) {
    const p = data.timer / data.duration;
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(data.timer * 8) * 0.08;
    ctx.strokeStyle = '#d8f2ff';
    ctx.shadowColor = '#7fc9ff';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(data.x, data.y, 95 + p * 45, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI * 2 / 12 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(data.x + Math.cos(a) * 78, data.y + Math.sin(a) * 78);
        ctx.lineTo(data.x + Math.cos(a) * 88, data.y + Math.sin(a) * 88);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
    ctx.lineTo(data.x + Math.cos(-Math.PI / 2 + p * 0.2) * 62, data.y + Math.sin(-Math.PI / 2 + p * 0.2) * 62);
    ctx.moveTo(data.x, data.y);
    ctx.lineTo(data.x + Math.cos(-Math.PI / 2 + p * 0.6) * 42, data.y + Math.sin(-Math.PI / 2 + p * 0.6) * 42);
    ctx.stroke();
    ctx.restore();
}

function _drawReisenLunarBeam(fighter, ctx, data) {
    if (data.phase === 'charge') {
        ctx.save();
        ctx.strokeStyle = '#ff445f';
        ctx.shadowColor = '#ff445f';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fighter.cx, data.aimY, 24 + data.chargeTimer * 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
    }
    if (data.phase !== 'fire') return;
    const rect = calcBeamRect(fighter, data.beamDir, 28, 900, data.aimY);
    ctx.save();
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
    grad.addColorStop(0, 'rgba(255, 68, 95, 0.15)');
    grad.addColorStop(0.5, 'rgba(255, 80, 170, 0.85)');
    grad.addColorStop(1, 'rgba(99, 109, 255, 0.2)');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff445f';
    ctx.shadowBlur = 20;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rect.x, rect.y + rect.h / 2 - 2, rect.w, 4);
    ctx.restore();
}

function _drawReisenMindWave(ctx, data) {
    const wave = data.wave;
    if (!wave || !wave.active) return;
    ctx.save();
    ctx.strokeStyle = '#636dff';
    ctx.shadowColor = '#ff5fa8';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(wave.x - wave.dir * i * 18, wave.y, 38 + i * 10, 25 + Math.sin(wave.frame * 0.18 + i) * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawReisenLunaticEyes(ctx, data) {
    const p = data.timer / data.duration;
    ctx.save();
    ctx.globalAlpha = 0.72 - p * 0.22;
    ctx.strokeStyle = '#ff5fa8';
    ctx.shadowColor = '#ff445f';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(data.cx, data.cy, data.radius, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(data.cx, data.cy, data.radius * (0.28 + i * 0.11), data.radius * 0.17, i * Math.PI / 6 + data.timer, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawKnife(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#eef7ff';
    ctx.strokeStyle = '#7fc9ff';
    ctx.shadowColor = '#dcefff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function _drawSparkEffects(ctx, effects = [], color = '#ffffff') {
    for (const effect of effects) {
        const alpha = Math.max(0, effect.timer / 16);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 26 * (1 - alpha) + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ---- COMMON DRAW ----

function _drawShield(fighter, ctx) {
    const shield = fighter.shield;
    const sprite = fighter.name === 'youmu' && Assets.effects.youmuSpiritShield
        ? Assets.effects.youmuSpiritShield
        : Assets.effects.shield;
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
