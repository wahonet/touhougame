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

const drawDataOnly = draw => (fighter, ctx, data) => draw(ctx, data);
const updateSkillOnly = update => (fighter, skill, dt) => update(skill, dt);

const SKILL_REGISTRY = {
    reimu: [
        { activate: _activateReimuSpellCards, update: _updateReimuSpellCards, draw: _drawReimuSpellCards },
        { activate: _activateReimuSealStrike, update: _updateReimuSealStrike, draw: _drawReimuSealStrike },
        { activate: _activateReimuBarrier, update: _updateReimuBarrier },
        { activate: _activateReimuFlight, update: _updateReimuFlight }
    ],
    marisa: [
        { activate: _activateMarisaLaser, update: _updateMarisaLaser, draw: _drawMarisaLaser },
        { activate: _activateMarisaBigLaser, update: _updateMarisaBigLaser, draw: _drawMarisaBigLaser },
        { activate: _activateMarisaStarStorm, update: _updateMarisaStarStorm, draw: _drawMarisaStarStorm },
        { activate: _activateMarisaBarrier, update: _updateMarisaBarrier }
    ],
    yuyuko: [
        { activate: _activateYuyukoSoulButterfly, update: _updateYuyukoSoulButterfly, draw: _drawYuyukoSoulButterfly },
        { activate: _activateYuyukoDeathInvitation, update: _updateYuyukoDeathInvitation, draw: _drawYuyukoDeathInvitation },
        { activate: _activateYuyukoSpiritGuide, update: _updateYuyukoSpiritGuide },
        { activate: _activateYuyukoCherryBlossomStorm, update: _updateYuyukoCherryBlossomStorm, draw: _drawYuyukoCherryBlossomStorm }
    ],
    youmu: [
        { activate: _activateYoumuSpiritSlash, update: _updateYoumuSpiritSlash, draw: _drawYoumuSpiritSlash },
        { activate: _activateYoumuGhostBlade, update: _updateYoumuGhostBlade, draw: _drawYoumuGhostBlade },
        { activate: _activateYoumuHalfSpiritShield, update: _updateYoumuHalfSpiritShield },
        { activate: _activateYoumuGhostStep, update: _updateYoumuGhostStep, draw: _drawYoumuGhostStep }
    ],
    sanae: [
        { activate: _activateSanaeWind, update: _updateSanaeWind, draw: drawDataOnly(_drawSanaeWind) },
        { activate: _activateSanaeMiracleStar, update: _updateSanaeMiracleStar, draw: drawDataOnly(_drawSanaeMiracleStar) },
        { activate: _activateSanaeMoriyaWard, update: _updateGenericShield },
        { activate: _activateSanaeMiraclePrayer, update: updateSkillOnly(_updateTimedAura), draw: _drawSanaePrayer }
    ],
    flandre: [
        { activate: _activateFlandreLaevatein, update: _updateFlandreLaevatein, draw: drawDataOnly(_drawFlandreLaevatein) },
        { activate: _activateFlandreDestructionEye, update: _updateFlandreDestructionEye, draw: drawDataOnly(_drawFlandreDestructionEye) },
        { activate: _activateFlandreScarletShield, update: _updateGenericShield },
        { activate: _activateFlandreFourOfAKind, update: updateSkillOnly(_updateTimedAura), draw: _drawFlandreFourOfAKind }
    ],
    sakuya: [
        { activate: _activateSakuyaKnifeArray, update: _updateSakuyaKnifeArray, draw: drawDataOnly(_drawSakuyaKnifeArray) },
        { activate: _activateSakuyaKillingDoll, update: _updateSakuyaKillingDoll, draw: drawDataOnly(_drawSakuyaKillingDoll) },
        { activate: _activateSakuyaWatchWard, update: _updateGenericShield },
        { activate: _activateSakuyaWorld, update: _updateSakuyaWorld, draw: drawDataOnly(_drawSakuyaWorld) }
    ],
    reisen: [
        { activate: _activateReisenLunarBeam, update: _updateReisenLunarBeam, draw: _drawReisenLunarBeam },
        { activate: _activateReisenMindWave, update: _updateReisenMindWave, draw: drawDataOnly(_drawReisenMindWave) },
        { activate: _activateReisenWaveShield, update: _updateGenericShield },
        { activate: _activateReisenLunaticEyes, update: _updateReisenLunaticEyes, draw: drawDataOnly(_drawReisenLunaticEyes) }
    ],
    cirno: [
        { activate: _activateCirnoIcicleScatter, update: _updateCirnoIcicleScatter, draw: drawDataOnly(_drawCirnoIcicleScatter) },
        { activate: _activateCirnoPerfectFreeze, update: _updateCirnoPerfectFreeze, draw: drawDataOnly(_drawCirnoPerfectFreeze) },
        { activate: _activateCirnoIceShield, update: _updateGenericShield },
        { activate: _activateCirnoFrostDash, update: _updateCirnoFrostDash, draw: _drawCirnoFrostDash }
    ],
    yukari: [
        { activate: _activateYukariGapBlades, update: _updateYukariGapBlades, draw: drawDataOnly(_drawYukariGapBlades) },
        { activate: _activateYukariBoundaryCollapse, update: _updateYukariBoundaryCollapse, draw: drawDataOnly(_drawYukariBoundaryCollapse) },
        { activate: _activateYukariBoundaryWard, update: _updateGenericShield },
        { activate: _activateYukariGapStep, update: _updateYukariGapStep, draw: _drawYukariGapStep }
    ],
    suwako: [
        { activate: _activateSuwakoFrogStone, update: _updateSuwakoFrogStone, draw: drawDataOnly(_drawSuwakoFrogStone) },
        { activate: _activateSuwakoMishagujiPillar, update: _updateSuwakoMishagujiPillar, draw: drawDataOnly(_drawSuwakoMishagujiPillar) },
        { activate: _activateSuwakoNativeWard, update: _updateGenericShield },
        { activate: _activateSuwakoWaterDomain, update: _updateSuwakoWaterDomain, draw: drawDataOnly(_drawSuwakoWaterDomain) }
    ],
    kaguya: [
        { activate: _activateKaguyaJewelShot, update: _updateKaguyaJewelShot, draw: drawDataOnly(_drawKaguyaJewelShot) },
        { activate: _activateKaguyaFiveJewels, update: _updateKaguyaFiveJewels, draw: drawDataOnly(_drawKaguyaFiveJewels) },
        { activate: _activateKaguyaEternalWard, update: _updateGenericShield },
        { activate: _activateKaguyaImpossibleRequest, update: _updateKaguyaImpossibleRequest, draw: _drawKaguyaImpossibleRequest }
    ]
};

function getSkillEntry(characterId, index) {
    return SKILL_REGISTRY[characterId]?.[index] || null;
}

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

    const entry = getSkillEntry(fighter.name, index);
    if (!entry || !entry.activate) return;

    skill.active = true;
    skill.cooldown = skill.maxCooldown;
    entry.activate(fighter, skill, opponent);
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
        radius: 245,
        timer: 0,
        duration: 1.35,
        affected: [],
        sparks: []
    };
    for (let i = 0; i < 18; i++) {
        skill.data.sparks.push({
            angle: Math.random() * Math.PI * 2,
            radius: 35 + Math.random() * 170,
            speed: 1.2 + Math.random() * 2.8,
            size: 3 + Math.random() * 5
        });
    }
}

// ---- CIRNO SKILLS ----

function _activateCirnoIcicleScatter(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = { shards: [], hitEffects: [] };
    for (let i = 0; i < 7; i++) {
        const angle = (-28 + i * 9.5) * Math.PI / 180;
        skill.data.shards.push({
            x: fighter.cx + dir * 38,
            y: fighter.cy - fighter.hurtboxH * 0.58,
            vx: Math.cos(angle) * 9.2 * dir,
            vy: Math.sin(angle) * 5.2,
            dir,
            frame: i * 2,
            active: true,
            hit: false
        });
    }
}

function _activateCirnoPerfectFreeze(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        x: target ? target.x + target.w / 2 : fighter.cx + dir * 230,
        y: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 115,
        timer: 0,
        duration: 1.05,
        hit: false,
        crystals: Array.from({ length: 12 }, (_, i) => ({
            angle: i * Math.PI * 2 / 12,
            radius: 24 + Math.random() * 38,
            size: 5 + Math.random() * 7
        }))
    };
}

function _activateCirnoIceShield(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 280,
        maxHp: 280,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateCirnoFrostDash(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    fighter.invincible = true;
    skill.data = {
        dir,
        timer: 0,
        duration: 0.34,
        trailParticles: []
    };
}

// ---- YUKARI SKILLS ----

function _activateYukariGapBlades(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = { blades: [], hitEffects: [] };
    for (let i = 0; i < 5; i++) {
        skill.data.blades.push({
            x: fighter.cx + dir * (48 + i * 18),
            y: fighter.cy - fighter.hurtboxH * (0.76 - i * 0.09),
            vx: dir * (8.4 + i * 0.7),
            vy: (i - 2) * 0.7,
            dir,
            frame: i * 4,
            active: true,
            hit: false
        });
    }
}

function _activateYukariBoundaryCollapse(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_seal');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        x: target ? target.x + target.w / 2 : fighter.cx + dir * 260,
        y: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 145,
        timer: 0,
        duration: 1.25,
        hit: false,
        eyes: Array.from({ length: 7 }, (_, i) => ({
            angle: i * Math.PI * 2 / 7,
            offset: 42 + Math.random() * 48
        }))
    };
}

function _activateYukariBoundaryWard(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 340,
        maxHp: 340,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateYukariGapStep(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const hb = _getActivationHurtbox(opponent);
    fighter.invincible = true;
    if (hb) {
        fighter.cx = hb.x + hb.w / 2 - dir * 125;
        fighter.cy = Math.min(fighter.groundY, Math.max(fighter.hurtboxH + 20, hb.y + hb.h));
        fighter.setFacing(dir === 1 ? 'right' : 'left');
        if (typeof fighter.clampToBounds === 'function') fighter.clampToBounds();
    } else {
        fighter.cx += dir * 260;
        if (typeof fighter.clampToBounds === 'function') fighter.clampToBounds();
    }
    fighter.nextAttackBonus = Math.max(fighter.nextAttackBonus || 0, 40);
    skill.data = {
        timer: 0,
        duration: 0.75,
        x: fighter.cx,
        y: fighter.cy - fighter.hurtboxH / 2,
        rings: [
            { radius: 28, phase: 0 },
            { radius: 52, phase: 1.7 },
            { radius: 76, phase: 3.1 }
        ]
    };
}

// ---- SUWAKO SKILLS ----

function _activateSuwakoFrogStone(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        stone: {
            x: fighter.cx + dir * 38,
            y: fighter.cy - fighter.hurtboxH * 0.42,
            vx: dir * 7.8,
            vy: -6.5,
            dir,
            frame: 0,
            active: true
        },
        hitEffects: [],
        hitTargets: []
    };
}

function _activateSuwakoMishagujiPillar(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_seal');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        x: target ? target.x + target.w / 2 : fighter.cx + dir * 240,
        y: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 120,
        timer: 0,
        duration: 1.15,
        hit: false
    };
}

function _activateSuwakoNativeWard(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 320,
        maxHp: 320,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateSuwakoWaterDomain(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        cx: target ? target.x + target.w / 2 : fighter.cx + dir * 210,
        cy: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 190,
        timer: 0,
        duration: 3.2,
        affected: [],
        ripples: Array.from({ length: 5 }, (_, i) => ({ radius: 35 + i * 28, phase: i * 0.7 }))
    };
}

// ---- KAGUYA SKILLS ----

function _activateKaguyaJewelShot(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_skill');
    const dir = fighter.facing === 'right' ? 1 : -1;
    skill.data = {
        jewels: [],
        hitEffects: []
    };
    for (let i = 0; i < 5; i++) {
        skill.data.jewels.push({
            x: fighter.cx + dir * 36,
            y: fighter.cy - fighter.hurtboxH * (0.76 - i * 0.08),
            vx: dir * (8.5 + i * 0.35),
            vy: (i - 2) * 0.55,
            color: ['#ffd166', '#ff8ab3', '#9d7cff', '#7fd7ff', '#ffffff'][i],
            frame: i * 5,
            active: true,
            hit: false
        });
    }
}

function _activateKaguyaFiveJewels(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    skill.data = {
        x: target ? target.x + target.w / 2 : fighter.cx + dir * 250,
        y: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 150,
        timer: 0,
        duration: 1.25,
        hit: false,
        jewels: Array.from({ length: 5 }, (_, i) => ({
            angle: -Math.PI / 2 + i * Math.PI * 2 / 5,
            color: ['#ffd166', '#ff8ab3', '#9d7cff', '#7fd7ff', '#7dff9a'][i]
        }))
    };
}

function _activateKaguyaEternalWard(fighter, skill) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_shield');
    fighter.shield = {
        hp: 330,
        maxHp: 330,
        duration: 8,
        timer: 0,
        flashTimer: 0,
        shatterTimer: 0
    };
    skill.data = { done: false };
}

function _activateKaguyaImpossibleRequest(fighter, skill, opponent) {
    if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_stars');
    const dir = fighter.facing === 'right' ? 1 : -1;
    const target = _getActivationHurtbox(opponent);
    fighter.nextAttackBonus = Math.max(fighter.nextAttackBonus || 0, 35);
    skill.data = {
        cx: target ? target.x + target.w / 2 : fighter.cx + dir * 220,
        cy: target ? target.y + target.h / 2 : fighter.cy - fighter.hurtboxH / 2,
        radius: 175,
        timer: 0,
        duration: 2.8,
        affected: [],
        jewels: Array.from({ length: 6 }, (_, i) => ({
            angle: i * Math.PI * 2 / 6,
            radius: 70 + Math.random() * 55,
            color: ['#ffd166', '#ff8ab3', '#9d7cff', '#7fd7ff', '#7dff9a', '#ffffff'][i]
        }))
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
    const entry = getSkillEntry(fighter.name, index);
    if (entry && entry.update) entry.update(fighter, skill, dt, opponent);
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
            if (!data.affected.includes(opponent)) {
                data.affected.push(opponent);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 3);
                opponent.slowTimer = Math.max(opponent.slowTimer || 0, 0.8);
                opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.35);
                emitHitImpact({ x, y, color: '#ff5fa8', shake: 8, maxShake: 12 });
            }
        }
    }
    for (const spark of data.sparks) {
        spark.angle += spark.speed * dt;
        spark.radius += 18 * dt;
    }
    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateCirnoIcicleScatter(fighter, skill, dt, opponent) {
    const data = skill.data;
    let anyActive = false;

    for (const shard of data.shards || []) {
        if (!shard.active) continue;
        anyActive = true;

        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += 0.16;
        shard.frame++;

        if (!shard.hit && opponent.state !== 'dead') {
            const rect = { x: shard.x - 12, y: shard.y - 12, w: 24, h: 24 };
            if (rectsOverlap(rect, opponent.getHurtbox())) {
                shard.hit = true;
                shard.active = false;
                opponent.damage(14);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.18);
                opponent.slowTimer = Math.max(opponent.slowTimer || 0, 0.35);
                opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.75);
                emitHitImpact({ x: shard.x, y: shard.y, color: '#8eeaff', shake: 2, maxShake: 6 });
                data.hitEffects.push({ x: shard.x, y: shard.y, timer: 12 });
            }
        }

        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (shard.frame > 90 || shard.x < -80 || shard.x > boundX + 80 || shard.y < -80 || shard.y > SCREEN_HEIGHT + 80) {
            shard.active = false;
        }
    }

    _tickHitEffects(data.hitEffects);

    if (!anyActive && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateCirnoPerfectFreeze(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    if (!data.hit && data.timer >= 0.5 && opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.x;
        const dy = y - data.y;
        if (dx * dx + dy * dy <= data.radius * data.radius) {
            data.hit = true;
            opponent.damage(155);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 1.15);
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 0.8);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.5);
            emitHitImpact({ x: data.x, y: data.y, color: '#bfefff', shake: 6, maxShake: 10 });
        }
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateCirnoFrostDash(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    const dashing = data.timer <= data.duration;
    fighter.invincible = dashing;

    if (dashing) {
        fighter.cx += data.dir * 920 * dt;
        if (typeof fighter.clampToBounds === 'function') fighter.clampToBounds();
        data.trailParticles.push({
            x: fighter.cx - data.dir * 12,
            y: fighter.cy - fighter.hurtboxH / 2,
            alpha: 0.65,
            size: 12 + Math.random() * 10
        });
    }

    if (!data.hit && opponent.state !== 'dead') {
        const dashRect = {
            x: fighter.cx - fighter.hurtboxW / 2 - 18,
            y: fighter.cy - fighter.hurtboxH + 10,
            w: fighter.hurtboxW + 36,
            h: fighter.hurtboxH - 8
        };
        if (rectsOverlap(dashRect, opponent.getHurtbox())) {
            data.hit = true;
            opponent.damage(60);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.32);
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 0.45);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.7);
            emitHitImpact({ x: fighter.cx, y: fighter.cy - fighter.hurtboxH / 2, color: '#8eeaff', shake: 4, maxShake: 8 });
        }
    }

    for (let i = data.trailParticles.length - 1; i >= 0; i--) {
        data.trailParticles[i].alpha -= dt * 4.2;
        if (data.trailParticles[i].alpha <= 0) {
            data.trailParticles.splice(i, 1);
        }
    }

    if (!dashing && data.trailParticles.length === 0) {
        fighter.invincible = false;
        skill.active = false;
        skill.data = {};
    }
}

function _updateYukariGapBlades(fighter, skill, dt, opponent) {
    const data = skill.data;
    let anyActive = false;

    for (const blade of data.blades || []) {
        if (!blade.active) continue;
        anyActive = true;

        blade.x += blade.vx;
        blade.y += blade.vy;
        blade.frame++;

        if (!blade.hit && opponent.state !== 'dead') {
            const rect = { x: blade.x - 18, y: blade.y - 6, w: 36, h: 12 };
            if (rectsOverlap(rect, opponent.getHurtbox())) {
                blade.hit = true;
                blade.active = false;
                opponent.damage(24);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.22);
                data.hitEffects.push({ x: blade.x, y: blade.y, timer: 12 });
                emitHitImpact({ x: blade.x, y: blade.y, color: '#c48cff', shake: 3, maxShake: 6 });
            }
        }

        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (blade.frame > 80 || blade.x < -80 || blade.x > boundX + 80) blade.active = false;
    }

    _tickHitEffects(data.hitEffects);

    if (!anyActive && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateYukariBoundaryCollapse(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    if (!data.hit && data.timer >= 0.72 && opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.x;
        const dy = y - data.y;
        if (dx * dx + dy * dy <= data.radius * data.radius) {
            data.hit = true;
            opponent.damage(180);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.55);
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 0.55);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.55);
            emitHitImpact({ x: data.x, y: data.y, color: '#b36bff', shake: 7, maxShake: 12 });
        }
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateYukariGapStep(fighter, skill, dt) {
    const data = skill.data;
    data.timer += dt;
    fighter.invincible = data.timer < data.duration * 0.5;

    if (data.timer >= data.duration) {
        fighter.invincible = false;
        skill.active = false;
        skill.data = {};
    }
}

function _updateSuwakoFrogStone(fighter, skill, dt, opponent) {
    const data = skill.data;
    const stone = data.stone;
    if (!stone || !stone.active) {
        _tickHitEffects(data.hitEffects);
        if ((data.hitEffects || []).length === 0) {
            skill.active = false;
            skill.data = {};
        }
        return;
    }

    stone.x += stone.vx;
    stone.y += stone.vy;
    stone.vy += 0.45;
    stone.frame++;

    if (!stone.hit && opponent.state !== 'dead') {
        const rect = { x: stone.x - 18, y: stone.y - 18, w: 36, h: 36 };
        if (rectsOverlap(rect, opponent.getHurtbox())) {
            stone.hit = true;
            stone.active = false;
            opponent.damage(58);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.28);
            data.hitEffects.push({ x: stone.x, y: stone.y, timer: 14 });
            emitHitImpact({ x: stone.x, y: stone.y, color: '#7ed957', shake: 4, maxShake: 8 });
        }
    }

    const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
    if (stone.x < -80 || stone.x > boundX + 80 || stone.y > fighter.groundY + 40 || stone.y < -120 || stone.frame > 120) {
        stone.active = false;
    }

    _tickHitEffects(data.hitEffects);

    if (!stone.active && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateSuwakoMishagujiPillar(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    if (!data.hit && data.timer >= 0.5 && opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.x;
        const dy = y - data.y;
        if (dx * dx + dy * dy <= data.radius * data.radius) {
            data.hit = true;
            opponent.damage(165);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.45);
            emitHitImpact({ x: data.x, y: data.y, color: '#7ed957', shake: 7, maxShake: 12 });
        }
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateSuwakoWaterDomain(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    if (opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.cx;
        const dy = y - data.cy;
        const inside = dx * dx + dy * dy <= data.radius * data.radius;

        if (inside) {
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 1.0);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.6);
            if (!data.affected.includes(opponent)) {
                data.affected.push(opponent);
                opponent.damage(34);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.2);
                emitHitImpact({ x, y, color: '#7fd7ff', shake: 3, maxShake: 6 });
            }
        }
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateKaguyaJewelShot(fighter, skill, dt, opponent) {
    const data = skill.data;
    let anyActive = false;

    for (const jewel of data.jewels || []) {
        if (!jewel.active) continue;
        anyActive = true;

        jewel.x += jewel.vx;
        jewel.y += jewel.vy;
        jewel.frame++;

        if (!jewel.hit && opponent.state !== 'dead') {
            const rect = { x: jewel.x - 12, y: jewel.y - 12, w: 24, h: 24 };
            if (rectsOverlap(rect, opponent.getHurtbox())) {
                jewel.hit = true;
                jewel.active = false;
                opponent.damage(16);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.16);
                data.hitEffects.push({ x: jewel.x, y: jewel.y, timer: 12 });
                emitHitImpact({ x: jewel.x, y: jewel.y, color: jewel.color || '#ffd166', shake: 3, maxShake: 6 });
            }
        }

        const boundX = Game.gameMode === 'pve' ? (Game.pveLevelWidth || 8000) : ARENA_WIDTH;
        if (jewel.frame > 90 || jewel.x < -80 || jewel.x > boundX + 80 || jewel.y < -80 || jewel.y > SCREEN_HEIGHT + 80) {
            jewel.active = false;
        }
    }

    _tickHitEffects(data.hitEffects);

    if (!anyActive && data.hitEffects.length === 0) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateKaguyaFiveJewels(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    if (!data.hit && data.timer >= 0.62 && opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.x;
        const dy = y - data.y;
        if (dx * dx + dy * dy <= data.radius * data.radius) {
            data.hit = true;
            opponent.damage(175);
            opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.55);
            emitHitImpact({ x: data.x, y: data.y, color: '#ffd166', shake: 7, maxShake: 12 });
        }
    }

    if (data.timer >= data.duration) {
        skill.active = false;
        skill.data = {};
    }
}

function _updateKaguyaImpossibleRequest(fighter, skill, dt, opponent) {
    const data = skill.data;
    data.timer += dt;

    if (opponent.state !== 'dead') {
        const { x, y } = _targetCenter(opponent);
        const dx = x - data.cx;
        const dy = y - data.cy;
        const inside = dx * dx + dy * dy <= data.radius * data.radius;

        if (inside) {
            opponent.slowTimer = Math.max(opponent.slowTimer || 0, 1.2);
            opponent.slowMultiplier = Math.min(opponent.slowMultiplier || 1, 0.45);
            if (!data.affected.includes(opponent) && data.timer >= 0.45) {
                data.affected.push(opponent);
                opponent.damage(52);
                opponent.stunTimer = Math.max(opponent.stunTimer || 0, 0.3);
                emitHitImpact({ x, y, color: '#9d7cff', shake: 5, maxShake: 10 });
            }
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
        const skill = fighter.skills[i];
        if (!skill.active) continue;

        const entry = getSkillEntry(fighter.name, i);
        if (entry && entry.draw) entry.draw(fighter, ctx, skill.data);
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
    const p = Math.min(1, data.timer / data.duration);
    const pulse = Math.sin(data.timer * 26) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = p < 0.16 ? p / 0.16 : 1 - Math.max(0, p - 0.72) / 0.28;
    ctx.strokeStyle = '#ff5fa8';
    ctx.shadowColor = '#ff445f';
    ctx.shadowBlur = 30;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(data.cx, data.cy, data.radius * (0.55 + p * 0.45), 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
        const r = data.radius * (0.24 + i * 0.16 + pulse * 0.03);
        ctx.beginPath();
        ctx.ellipse(data.cx, data.cy, r, data.radius * 0.13, i * Math.PI / 4 + data.timer * 2.4, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 95, 168, 0.22)';
    ctx.beginPath();
    ctx.ellipse(data.cx, data.cy, 64 + pulse * 10, 34 + pulse * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(data.cx, data.cy, 16 + pulse * 4, 25 + pulse * 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffe85a';
    ctx.fillStyle = '#ffe85a';
    ctx.shadowColor = '#ffe85a';
    for (const spark of data.sparks || []) {
        const sx = data.cx + Math.cos(spark.angle) * spark.radius;
        const sy = data.cy + Math.sin(spark.angle) * spark.radius * 0.62;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
            const r = i % 2 === 0 ? spark.size : spark.size * 0.42;
            ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function _drawCirnoIcicleScatter(ctx, data) {
    for (const shard of data.shards || []) {
        if (!shard.active) continue;
        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(Math.atan2(shard.vy, shard.vx));
        ctx.fillStyle = '#8eeaff';
        ctx.shadowColor = '#8eeaff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _drawSparkEffects(ctx, data.hitEffects, '#bfefff');
}

function _drawCirnoPerfectFreeze(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    const pulse = 0.85 + Math.sin(data.timer * 14) * 0.15;

    ctx.save();
    ctx.globalAlpha = p < 0.18 ? p / 0.18 : 1 - Math.max(0, p - 0.72) / 0.28;
    ctx.strokeStyle = '#bfefff';
    ctx.fillStyle = 'rgba(142, 234, 255, 0.14)';
    ctx.shadowColor = '#8eeaff';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.radius * (0.65 + p * 0.35), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const crystal of data.crystals || []) {
        const angle = crystal.angle + data.timer * 1.7;
        const r = crystal.radius + Math.sin(data.timer * 4 + crystal.angle) * 4;
        const x = data.x + Math.cos(angle) * r;
        const y = data.y + Math.sin(angle) * r * 0.7;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#8eeaff';
        ctx.shadowBlur = 12;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.moveTo(x, y - crystal.size);
        ctx.lineTo(x + crystal.size * 0.55, y);
        ctx.lineTo(x, y + crystal.size);
        ctx.lineTo(x - crystal.size * 0.55, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function _drawCirnoFrostDash(fighter, ctx, data) {
    for (const particle of data.trailParticles || []) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#bfefff';
        ctx.shadowColor = '#8eeaff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#8eeaff';
    ctx.shadowColor = '#8eeaff';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(fighter.cx, fighter.cy - fighter.hurtboxH / 2, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawYukariGapBlades(ctx, data) {
    for (const blade of data.blades || []) {
        if (!blade.active) continue;
        ctx.save();
        ctx.translate(blade.x, blade.y);
        ctx.rotate(Math.atan2(blade.vy, blade.vx));
        ctx.strokeStyle = '#c48cff';
        ctx.shadowColor = '#c48cff';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-8, -6);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-8, 6);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    _drawSparkEffects(ctx, data.hitEffects, '#c48cff');
}

function _drawYukariBoundaryCollapse(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = p < 0.2 ? p / 0.2 : 1 - Math.max(0, p - 0.75) / 0.25;
    ctx.strokeStyle = '#b36bff';
    ctx.fillStyle = 'rgba(179, 107, 255, 0.12)';
    ctx.shadowColor = '#b36bff';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 3 + p * 4;
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.radius * (0.7 + p * 0.3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    for (const eye of data.eyes || []) {
        const angle = eye.angle + data.timer * 1.2;
        const x = data.x + Math.cos(angle) * eye.offset;
        const y = data.y + Math.sin(angle) * eye.offset * 0.6;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#f5d0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function _drawYukariGapStep(fighter, ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    const x = data.x || fighter.cx;
    const y = data.y || (fighter.cy - fighter.hurtboxH / 2);

    ctx.save();
    ctx.globalAlpha = 0.8 - p * 0.35;
    ctx.strokeStyle = '#ffd166';
    ctx.shadowColor = '#b36bff';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3;
    for (const ring of data.rings || []) {
        ctx.beginPath();
        ctx.arc(x, y, ring.radius + Math.sin(data.timer * 8 + ring.phase) * 4, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = 'rgba(195, 140, 255, 0.18)';
    ctx.arc(x, y, 28 + p * 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _drawSuwakoFrogStone(ctx, data) {
    const stone = data.stone;
    if (!stone || !stone.active) return;
    ctx.save();
    ctx.translate(stone.x, stone.y);
    ctx.rotate(stone.frame * 0.18);
    ctx.fillStyle = '#7ed957';
    ctx.shadowColor = '#7ed957';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(4, -12);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-16, 4);
    ctx.lineTo(-4, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    _drawSparkEffects(ctx, data.hitEffects, '#7ed957');
}

function _drawSuwakoMishagujiPillar(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = p < 0.2 ? p / 0.2 : 1 - Math.max(0, p - 0.8) / 0.2;
    ctx.strokeStyle = '#7ed957';
    ctx.fillStyle = 'rgba(126, 217, 87, 0.18)';
    ctx.shadowColor = '#7ed957';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(data.x - 30, data.y + 70);
    ctx.lineTo(data.x, data.y - 120);
    ctx.lineTo(data.x + 30, data.y + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function _drawSuwakoWaterDomain(ctx, data) {
    ctx.save();
    ctx.globalAlpha = 0.14 + Math.sin(data.timer * 5) * 0.03;
    ctx.fillStyle = '#7fd7ff';
    ctx.strokeStyle = '#7fd7ff';
    ctx.shadowColor = '#7fd7ff';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(data.cx, data.cy, data.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const ripple of data.ripples || []) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(data.timer * 6 + ripple.phase) * 0.1;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#7fd7ff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(data.cx, data.cy, ripple.radius + Math.sin(data.timer * 4 + ripple.phase) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function _drawKaguyaJewelShot(ctx, data) {
    for (const jewel of data.jewels || []) {
        if (!jewel.active) continue;
        ctx.save();
        ctx.translate(jewel.x, jewel.y);
        ctx.rotate(jewel.frame * 0.12);
        ctx.fillStyle = jewel.color || '#ffd166';
        ctx.shadowColor = jewel.color || '#ffd166';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(0, -10);
        ctx.lineTo(-12, 0);
        ctx.lineTo(0, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _drawSparkEffects(ctx, data.hitEffects, '#ffd166');
}

function _drawKaguyaFiveJewels(ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = p < 0.16 ? p / 0.16 : 1 - Math.max(0, p - 0.72) / 0.28;
    ctx.strokeStyle = '#ffd166';
    ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const jewel of data.jewels || []) {
        const angle = jewel.angle + data.timer * 2.4;
        const x = data.x + Math.cos(angle) * (data.radius * 0.72);
        const y = data.y + Math.sin(angle) * (data.radius * 0.5);
        ctx.save();
        ctx.fillStyle = jewel.color || '#ffd166';
        ctx.shadowColor = jewel.color || '#ffd166';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(x, y - 11);
        ctx.lineTo(x + 8, y);
        ctx.lineTo(x, y + 11);
        ctx.lineTo(x - 8, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function _drawKaguyaImpossibleRequest(fighter, ctx, data) {
    const p = Math.min(1, data.timer / data.duration);
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(data.timer * 6) * 0.05;
    ctx.fillStyle = '#9d7cff';
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#9d7cff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(data.cx, data.cy, data.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const jewel of data.jewels || []) {
        ctx.save();
        const angle = jewel.angle + data.timer * 1.5;
        const x = data.cx + Math.cos(angle) * jewel.radius;
        const y = data.cy + Math.sin(angle) * jewel.radius * 0.72;
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = jewel.color || '#ffffff';
        ctx.shadowColor = jewel.color || '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(0, -8);
        ctx.lineTo(-9, 0);
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.65 - p * 0.2;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#9d7cff';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fighter.cx, fighter.cy - fighter.hurtboxH / 2, 24 + p * 18, 0, Math.PI * 2);
    ctx.stroke();
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
