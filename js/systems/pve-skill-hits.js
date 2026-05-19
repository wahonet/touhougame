import { rectsOverlap } from './collision.js';

function pointInRect(x, y, rect) {
    return x > rect.x && x < rect.x + rect.w &&
           y > rect.y && y < rect.y + rect.h;
}

function ensureSet(data, key) {
    if (!data[key]) data[key] = new Set();
    return data[key];
}

function getEnemyCenter(enemy) {
    const hurtbox = enemy.getHurtbox();
    return {
        x: hurtbox.x + hurtbox.w / 2,
        y: hurtbox.y + hurtbox.h / 2,
        hurtbox
    };
}

const PVE_SKILL_HIT_HANDLERS = {
    reimu: [
        hitReimuDreamSeal,
        hitReimuDoubleBarrier,
        hitReimuYinYangOrb,
        hitReimuBindingCircle
    ],
    marisa: [
        hitMarisaLasers,
        hitMarisaStarStorm
    ],
    yuyuko: [
        hitYuyukoSoulButterfly,
        hitYuyukoDeathInvitation,
        hitYuyukoCherryBlossomStorm
    ],
    youmu: [
        hitYoumuSpiritSlash,
        hitYoumuGhostBlade
    ],
    sanae: [
        hitSanaeWind,
        hitSanaeMiracleStar
    ],
    flandre: [
        hitFlandreLaevatein,
        hitFlandreDestructionEye
    ],
    sakuya: [
        hitSakuyaKnifeArray,
        hitSakuyaKillingDoll,
        hitSakuyaWorld
    ],
    reisen: [
        hitReisenLunarBeam,
        hitReisenMindWave,
        hitReisenLunaticEyes
    ],
    cirno: [
        hitCirnoIcicleScatter,
        hitCirnoPerfectFreeze,
        hitCirnoFrostDash
    ],
    yukari: [
        hitYukariGapBlades,
        hitYukariBoundaryCollapse,
        hitYukariGapStep
    ],
    suwako: [
        hitSuwakoFrogStone,
        hitSuwakoMishagujiPillar,
        hitSuwakoWaterDomain
    ],
    kaguya: [
        hitKaguyaJewelShot,
        hitKaguyaFiveJewels,
        hitKaguyaImpossibleRequest
    ]
};

export function applyPlayerSkillHitsToEnemy(player, enemy) {
    if (!enemy || enemy.state === 'dead') return;

    const handlers = PVE_SKILL_HIT_HANDLERS[player.name];
    if (!handlers) return;

    for (const handler of handlers) {
        handler(player, enemy);
    }
}

function hitReimuDreamSeal(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.projectiles) return;

    const hurtbox = enemy.getHurtbox();
    for (const proj of skill.data.projectiles) {
        if (!proj.active || proj.hitTarget) continue;
        if (!pointInRect(proj.x, proj.y, hurtbox)) continue;

        proj.hitTarget = true;
        enemy.damage(18);
        skill.data.hitEffects.push({ x: proj.x, y: proj.y, timer: 10 });
        proj.active = false;
    }
}

function hitReimuDoubleBarrier(player, enemy) {
    const skill = player.skills[1];
    const wave = skill.data?.shockwave;
    if (!skill.active || !wave) return;

    const center = getEnemyCenter(enemy);
    const dx = center.x - wave.x;
    const dy = center.y - wave.y;
    if (dx * dx + dy * dy > wave.radius * wave.radius) return;

    const hitEnemies = ensureSet(skill.data, '_pveHitEnemies');
    if (hitEnemies.has(enemy)) return;

    hitEnemies.add(enemy);
    enemy.damage(60);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.3);
    enemy.velocityX = (enemy.velocityX || 0) + Math.sign(center.x - wave.x) * 2;
}

function hitReimuYinYangOrb(player, enemy) {
    const skill = player.skills[2];
    const orb = skill.data?.orb;
    if (!skill.active || !orb || !orb.active) return;

    const orbRect = { x: orb.x - orb.radius, y: orb.y - orb.radius, w: orb.radius * 2, h: orb.radius * 2 };
    if (!rectsOverlap(orbRect, enemy.getHurtbox())) return;

    const hitEnemies = ensureSet(skill.data, '_pveHitEnemies');
    if (hitEnemies.has(enemy)) return;

    hitEnemies.add(enemy);
    enemy.damage(105);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.28);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.45);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.7);
}

function hitReimuBindingCircle(player, enemy) {
    const skill = player.skills[3];
    const data = skill.data;
    if (!skill.active || !data) return;

    const center = getEnemyCenter(enemy);
    const dx = center.x - data.cx;
    const dy = center.y - data.cy;
    if (dx * dx + dy * dy > data.radius * data.radius) return;

    const tickTimes = [0.18, 0.48, 0.78, 1.08];
    const tickDamage = [12, 12, 14, 24];
    const hitMap = data._pveBindingHits || (data._pveBindingHits = new Map());
    let enemyHits = hitMap.get(enemy);
    if (!enemyHits) {
        enemyHits = new Set();
        hitMap.set(enemy, enemyHits);
    }

    for (let i = 0; i < tickTimes.length; i++) {
        if (enemyHits.has(i) || data.timer < tickTimes[i]) continue;
        enemyHits.add(i);
        enemy.damage(tickDamage[i]);
        enemy.stunTimer = Math.max(enemy.stunTimer || 0, i < 3 ? 0.16 : 0.3);
        enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.55);
        enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.55);
    }
}

function hitMarisaLasers(player, enemy) {
    for (let index = 0; index <= 1; index++) {
        const skill = player.skills[index];
        if (!skill.active || skill.data?.phase !== 'fire') continue;

        const beamHeight = index === 0 ? 40 : 64;
        const beamRange = index === 0 ? 800 : 1000;
        const tickDamage = index === 0 ? 20 : 100;
        const beamRect = player._calcBeamRect(skill.data.beamDir, beamHeight, beamRange, skill.data.aimY);
        if (!beamRect || !rectsOverlap(beamRect, enemy.getHurtbox())) continue;

        const hitEnemies = ensureSet(skill.data, '_hitEnemies');
        const tickIndex = skill.data.damageTicks.filter(Boolean).length - 1;
        const tickKey = `${index}_${enemy.cx}_${enemy.cy}_${tickIndex}`;
        if (hitEnemies.has(tickKey)) continue;

        hitEnemies.add(tickKey);
        enemy.damage(tickDamage);
    }
}

function hitMarisaStarStorm(player, enemy) {
    const skill = player.skills[2];
    if (!skill.active || !skill.data?.stars) return;

    const hurtbox = enemy.getHurtbox();
    for (const star of skill.data.stars) {
        if (!star.active || !pointInRect(star.x, star.y, hurtbox)) continue;
        if (star.hitTargets.includes(enemy)) continue;

        star.hitTargets.push(enemy);
        enemy.stunTimer = Math.max(enemy.stunTimer || 0, 3);
        star.active = false;
    }
}

function hitYuyukoSoulButterfly(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.projectiles) return;

    const hurtbox = enemy.getHurtbox();
    for (const proj of skill.data.projectiles) {
        if (!proj.active || proj.hitTarget) continue;
        if (!pointInRect(proj.x, proj.y, hurtbox)) continue;

        proj.hitTarget = true;
        proj.active = false;
        enemy.damage(18);
        skill.data.hitEffects.push({ x: proj.x, y: proj.y, timer: 10 });
    }
}

function hitYuyukoDeathInvitation(player, enemy) {
    const skill = player.skills[1];
    const orb = skill.data?.orb;
    if (!skill.active || !orb || !orb.active || orb.hit) return;
    if (!pointInRect(orb.x, orb.y, enemy.getHurtbox())) return;

    orb.hit = true;
    orb.active = false;
    enemy.damage(140);
    skill.data.hitEffects.push({ x: orb.x, y: orb.y, timer: 30 });
}

function hitYuyukoCherryBlossomStorm(player, enemy) {
    const skill = player.skills[3];
    if (!skill.active || !skill.data) return;

    const data = skill.data;
    const center = getEnemyCenter(enemy);
    const dx = center.x - data.cx;
    const dy = center.y - data.cy;
    if (dx * dx + dy * dy > data.radius * data.radius) return;

    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.35);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.25);

    const snaredEnemies = ensureSet(data, '_pveSnaredEnemies');
    if (snaredEnemies.has(enemy)) return;

    snaredEnemies.add(enemy);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 1.2);
}

function hitYoumuSpiritSlash(player, enemy) {
    const skill = player.skills[0];
    const spirit = skill.data?.spirit;
    if (!skill.active || !spirit || !spirit.active || spirit.hit) return;
    if (!pointInRect(spirit.x, spirit.y, enemy.getHurtbox())) return;

    spirit.hit = true;
    spirit.active = false;
    enemy.damage(90);
    skill.data.hitEffects.push({ x: spirit.x, y: spirit.y, timer: 24 });
}

function hitYoumuGhostBlade(player, enemy) {
    const skill = player.skills[1];
    const blade = skill.data?.blade;
    if (!skill.active || !blade?.active) return;

    const bladeRect = { x: blade.x - 28, y: blade.y - 28, w: 56, h: 56 };
    if (!rectsOverlap(bladeRect, enemy.getHurtbox())) return;

    const hitEnemies = ensureSet(skill.data, '_pveHitEnemies');
    if (hitEnemies.has(enemy)) return;

    hitEnemies.add(enemy);
    enemy.damage(120);
}

function hitSanaeWind(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.blades) return;

    const hurtbox = enemy.getHurtbox();
    for (const blade of skill.data.blades) {
        if (!blade.active || blade.hit) continue;

        const bladeRect = { x: blade.x - 28, y: blade.y - 22, w: 56, h: 44 };
        if (!rectsOverlap(bladeRect, hurtbox)) continue;

        blade.hit = true;
        blade.active = false;
        enemy.damage(42);
        enemy.velocityX = (enemy.velocityX || 0) + Math.sign(blade.vx) * 3;
        skill.data.hitEffects.push({ x: blade.x, y: blade.y, timer: 16 });
    }
}

function hitSanaeMiracleStar(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.62) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const starRect = { x: data.x - 62, y: data.y - 145, w: 124, h: 190 };
    if (hitEnemies.has(enemy) || !rectsOverlap(starRect, enemy.getHurtbox())) return;

    hitEnemies.add(enemy);
    enemy.damage(145);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.35);
}

function hitFlandreLaevatein(player, enemy) {
    const skill = player.skills[0];
    const slash = skill.data?.slash;
    if (!skill.active || !slash?.active || slash._pveHit) return;

    const slashRect = { x: slash.x - 52, y: slash.y - 44, w: 104, h: 88 };
    if (!rectsOverlap(slashRect, enemy.getHurtbox())) return;

    slash._pveHit = true;
    slash.active = false;
    enemy.damage(120);
}

function hitFlandreDestructionEye(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.75) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const center = getEnemyCenter(enemy);
    const dx = center.x - data.x;
    const dy = center.y - data.y;
    if (hitEnemies.has(enemy) || dx * dx + dy * dy > data.radius * data.radius) return;

    hitEnemies.add(enemy);
    enemy.damage(180);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.5);
}

function hitSakuyaKnifeArray(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.knives) return;

    const hurtbox = enemy.getHurtbox();
    for (const knife of skill.data.knives) {
        if (!knife.active || knife.hit) continue;

        const knifeRect = { x: knife.x - 18, y: knife.y - 6, w: 36, h: 12 };
        if (!rectsOverlap(knifeRect, hurtbox)) continue;

        knife.hit = true;
        knife.active = false;
        enemy.damage(24);
        skill.data.hitEffects.push({ x: knife.x, y: knife.y, timer: 10 });
    }
}

function hitSakuyaKillingDoll(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.18) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const crossRect = { x: data.x - 70, y: data.y - 58, w: 140, h: 116 };
    if (hitEnemies.has(enemy) || !rectsOverlap(crossRect, enemy.getHurtbox())) return;

    hitEnemies.add(enemy);
    enemy.damage(150);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.55);
}

function hitSakuyaWorld(player, enemy) {
    const skill = player.skills[3];
    if (!skill.active) return;

    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.2);
}

function hitReisenLunarBeam(player, enemy) {
    const skill = player.skills[0];
    const data = skill.data;
    if (!skill.active || !data || data.phase !== 'fire') return;

    const beamRect = player._calcBeamRect(data.beamDir, 28, 900, data.aimY);
    if (!beamRect || !rectsOverlap(beamRect, enemy.getHurtbox())) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const tickIndex = data.damageTicks.filter(Boolean).length - 1;
    const tickKey = `${enemy.cx}_${enemy.cy}_${tickIndex}`;
    if (hitEnemies.has(tickKey)) return;

    hitEnemies.add(tickKey);
    enemy.damage(22);
}

function hitReisenMindWave(player, enemy) {
    const skill = player.skills[1];
    const wave = skill.data?.wave;
    if (!skill.active || !wave?.active || wave.hitTargets.includes(enemy)) return;

    const waveRect = { x: wave.x - 42, y: wave.y - 32, w: 84, h: 64 };
    if (!rectsOverlap(waveRect, enemy.getHurtbox())) return;

    wave.hitTargets.push(enemy);
    enemy.damage(110);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.8);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.6);
}

function hitReisenLunaticEyes(player, enemy) {
    const skill = player.skills[3];
    const data = skill.data;
    if (!skill.active || !data) return;

    const center = getEnemyCenter(enemy);
    const dx = center.x - data.cx;
    const dy = center.y - data.cy;
    if (dx * dx + dy * dy > data.radius * data.radius) return;

    const stunnedEnemies = ensureSet(data, '_pveStunnedEnemies');
    if (stunnedEnemies.has(enemy)) return;

    stunnedEnemies.add(enemy);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 3);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.8);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.35);
}

function hitCirnoIcicleScatter(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.shards) return;

    const hurtbox = enemy.getHurtbox();
    for (const shard of skill.data.shards) {
        if (!shard.active || shard.hit) continue;
        const rect = { x: shard.x - 12, y: shard.y - 12, w: 24, h: 24 };
        if (!rectsOverlap(rect, hurtbox)) continue;

        shard.hit = true;
        shard.active = false;
        enemy.damage(14);
        enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.18);
        enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.35);
        enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.75);
        skill.data.hitEffects.push({ x: shard.x, y: shard.y, timer: 12 });
    }
}

function hitCirnoPerfectFreeze(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.5) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const center = getEnemyCenter(enemy);
    const dx = center.x - data.x;
    const dy = center.y - data.y;
    if (hitEnemies.has(enemy) || dx * dx + dy * dy > data.radius * data.radius) return;

    hitEnemies.add(enemy);
    enemy.damage(155);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 1.15);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.8);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.5);
}

function hitCirnoFrostDash(player, enemy) {
    const skill = player.skills[3];
    const data = skill.data;
    if (!skill.active || !data || !data.timer) return;

    const dashRect = {
        x: player.cx - player.hurtboxW / 2 - 18,
        y: player.cy - player.hurtboxH + 10,
        w: player.hurtboxW + 36,
        h: player.hurtboxH - 8
    };
    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    if (hitEnemies.has(enemy) || !rectsOverlap(dashRect, enemy.getHurtbox())) return;

    hitEnemies.add(enemy);
    enemy.damage(60);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.32);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.45);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.7);
}

function hitYukariGapBlades(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.blades) return;

    const hurtbox = enemy.getHurtbox();
    for (const blade of skill.data.blades) {
        if (!blade.active || blade.hit) continue;
        const rect = { x: blade.x - 18, y: blade.y - 6, w: 36, h: 12 };
        if (!rectsOverlap(rect, hurtbox)) continue;

        blade.hit = true;
        blade.active = false;
        enemy.damage(24);
        enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.22);
        skill.data.hitEffects.push({ x: blade.x, y: blade.y, timer: 12 });
    }
}

function hitYukariBoundaryCollapse(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.72) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const center = getEnemyCenter(enemy);
    const dx = center.x - data.x;
    const dy = center.y - data.y;
    if (hitEnemies.has(enemy) || dx * dx + dy * dy > data.radius * data.radius) return;

    hitEnemies.add(enemy);
    enemy.damage(180);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.55);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.55);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.55);
}

function hitYukariGapStep(player, enemy) {
    const skill = player.skills[3];
    const data = skill.data;
    if (!skill.active || !data) return;

    if (data.timer >= data.duration * 0.5) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const rect = {
        x: player.cx - player.hurtboxW / 2 - 24,
        y: player.cy - player.hurtboxH + 12,
        w: player.hurtboxW + 48,
        h: player.hurtboxH - 12
    };
    if (hitEnemies.has(enemy) || !rectsOverlap(rect, enemy.getHurtbox())) return;

    hitEnemies.add(enemy);
    enemy.damage(44);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.28);
}

function hitSuwakoFrogStone(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.stone) return;

    const stone = skill.data.stone;
    if (!stone.active || stone.hit) return;

    const rect = { x: stone.x - 18, y: stone.y - 18, w: 36, h: 36 };
    if (!rectsOverlap(rect, enemy.getHurtbox())) return;

    stone.hit = true;
    stone.active = false;
    enemy.damage(58);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.28);
}

function hitSuwakoMishagujiPillar(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.5) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const center = getEnemyCenter(enemy);
    const dx = center.x - data.x;
    const dy = center.y - data.y;
    if (hitEnemies.has(enemy) || dx * dx + dy * dy > data.radius * data.radius) return;

    hitEnemies.add(enemy);
    enemy.damage(165);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.45);
}

function hitSuwakoWaterDomain(player, enemy) {
    const skill = player.skills[3];
    const data = skill.data;
    if (!skill.active || !data) return;

    const center = getEnemyCenter(enemy);
    const dx = center.x - data.cx;
    const dy = center.y - data.cy;
    if (dx * dx + dy * dy > data.radius * data.radius) return;

    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.0);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.6);
    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    if (hitEnemies.has(enemy)) return;

    hitEnemies.add(enemy);
    enemy.damage(34);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.2);
}

function hitKaguyaJewelShot(player, enemy) {
    const skill = player.skills[0];
    if (!skill.active || !skill.data?.jewels) return;

    const hurtbox = enemy.getHurtbox();
    for (const jewel of skill.data.jewels) {
        if (!jewel.active || jewel.hit) continue;
        const rect = { x: jewel.x - 12, y: jewel.y - 12, w: 24, h: 24 };
        if (!rectsOverlap(rect, hurtbox)) continue;

        jewel.hit = true;
        jewel.active = false;
        enemy.damage(16);
        enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.16);
        skill.data.hitEffects.push({ x: jewel.x, y: jewel.y, timer: 12 });
    }
}

function hitKaguyaFiveJewels(player, enemy) {
    const skill = player.skills[1];
    const data = skill.data;
    if (!skill.active || !data || data.timer < 0.62) return;

    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    const center = getEnemyCenter(enemy);
    const dx = center.x - data.x;
    const dy = center.y - data.y;
    if (hitEnemies.has(enemy) || dx * dx + dy * dy > data.radius * data.radius) return;

    hitEnemies.add(enemy);
    enemy.damage(175);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.55);
}

function hitKaguyaImpossibleRequest(player, enemy) {
    const skill = player.skills[3];
    const data = skill.data;
    if (!skill.active || !data) return;

    const center = getEnemyCenter(enemy);
    const dx = center.x - data.cx;
    const dy = center.y - data.cy;
    if (dx * dx + dy * dy > data.radius * data.radius) return;

    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.2);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier || 1, 0.45);
    const hitEnemies = ensureSet(data, '_pveHitEnemies');
    if (hitEnemies.has(enemy) || data.timer < 0.45) return;

    hitEnemies.add(enemy);
    enemy.damage(52);
    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.3);
}
