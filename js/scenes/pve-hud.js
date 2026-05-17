/**
 * PvE HUD drawing functions
 * Extracted from pve-scene.js for modularity.
 */
import {
    FONT_FAMILY,
    SCREEN_HEIGHT,
    SCREEN_WIDTH
} from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';
import { getCharacterDefinition } from '../data/characters.js';
import { PVE_LEVELS } from '../data/level-data.js';

// ========== HUD ==========

export function drawHUD(ctx, player, levelConfig, score, killCount) {
    if (!player) return;

    const character = getCharacterDefinition(player.name);
    const barW = 300, barH = 24;
    const maxHp = player.maxHp || 1000;
    const hpRatio = player.hp / maxHp;

    // Background panel
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(15, 12, 350, 50);

    // Character name + level name
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.fillStyle = character.accentColor;
    ctx.textAlign = 'left';
    ctx.fillText(character.uiName, 25, 30);

    // Level name
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(levelConfig.name, 25, 48);

    // HP bar
    const barX = 25, barY = 38;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barW, barH);

    let hpColor = '#44ff66';
    if (hpRatio < 0.5) hpColor = '#ffaa44';
    if (hpRatio < 0.25) hpColor = '#ff4444';

    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, player.hp)} / ${maxHp}`, barX + barW / 2, barY + 16);

    // Score & kills (top right)
    ctx.textAlign = 'right';
    ctx.font = `bold 20px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`Score: ${score}`, SCREEN_WIDTH - 25, 30);
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Kills: ${killCount}`, SCREEN_WIDTH - 25, 52);

    // Progress bar (bottom)
    const progressW = SCREEN_WIDTH - 100;
    const progressH = 8;
    const progressX = 50;
    const progressY = SCREEN_HEIGHT - 22;
    const progress = Math.min(1, player.cx / levelConfig.endX);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(progressX, progressY, progressW, progressH);
    ctx.fillStyle = '#66ccff';
    ctx.fillRect(progressX, progressY, progressW * progress, progressH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(progressX, progressY, progressW, progressH);

    // Player dot on progress bar
    const dotX = progressX + progressW * progress;
    ctx.fillStyle = character.accentColor;
    ctx.shadowColor = character.accentColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(dotX, progressY + progressH / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Controls hint
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('A/D: Move  W/Space: Jump  J: Attack  1-4: Skills  R: Restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 4);

    // ========== SKILL UI ==========
    drawSkillUI(ctx, player);

    ctx.restore();
}

// ========== SKILL UI (same style as PvP BattleScene) ==========

export function drawSkillUI(ctx, fighter) {
    if (!fighter) return;

    const boxSize = 46;
    const gap = 6;
    const radius = boxSize / 2 - 2;
    const startX = 25;
    const startY = 68;

    const character = getCharacterDefinition(fighter.name);
    const colors = character.skillColors;
    const icons = Assets.skillIcons[fighter.name] || [];

    for (let i = 0; i < 4; i++) {
        const skill = fighter.skills[i];
        const bx = startX + i * (boxSize + gap);
        const by = startY;
        const cx = bx + boxSize / 2;
        const cy = by + boxSize / 2;

        const isReady = skill.cooldown <= 0 && !skill.active;
        const isActive = skill.active;
        const onCooldown = skill.cooldown > 0;

        ctx.save();

        // Circular dark background
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();

        // Draw icon image clipped to circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const iconImg = icons[i];
        if (iconImg) {
            if (onCooldown) ctx.globalAlpha = 0.4;
            ctx.drawImage(iconImg, cx - radius, cy - radius, radius * 2, radius * 2);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = colors[i];
            ctx.globalAlpha = isReady ? 0.8 : 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.font = `bold 10px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(skill.name.substring(0, 2), cx, cy);
        }

        ctx.restore();
        ctx.save();

        // Circular sweep cooldown overlay
        if (onCooldown) {
            const cdRatio = skill.cooldown / skill.maxCooldown;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius + 1, -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2, false);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill();

            ctx.font = `bold 14px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(`${skill.cooldown.toFixed(1)}`, cx, cy);
        }

        // Border
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();

        if (isActive) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (isReady) {
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = 2;
            ctx.shadowColor = colors[i];
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Key number badge
        const keyNum = i + 1;
        const badgeR = 8;
        const badgeCx = bx + boxSize - badgeR - 1;
        const badgeCy = by + badgeR + 1;
        ctx.beginPath();
        ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();
        ctx.font = `bold 11px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isReady ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(`${keyNum}`, badgeCx, badgeCy);

        ctx.restore();
    }
}

// ========== COMBO & DAMAGE NUMBERS ==========

export function drawDamageNumbers(ctx, damageNumbers, cam) {
    for (const d of damageNumbers) {
        const alpha = Math.min(1, d.life * 2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${d.amount >= 50 ? 20 : 16}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(`${d.amount}`, d.x - cam, d.y);
        ctx.fillStyle = d.color;
        ctx.fillText(`${d.amount}`, d.x - cam, d.y);
        ctx.restore();
    }
}

export function drawCombo(ctx, comboCount, comboTimer) {
    if (comboCount < 2) return;
    const alpha = Math.min(1, comboTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold 36px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const comboColor = comboCount >= 10 ? '#ff4444' : (comboCount >= 5 ? '#ffcc00' : '#ffffff');
    ctx.shadowColor = comboColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = comboColor;
    ctx.fillText(`${comboCount} COMBO!`, SCREEN_WIDTH - 30, 65);
    ctx.shadowBlur = 0;
    ctx.restore();
}

export function drawPowerBoost(ctx, player) {
    if (!player._powerBoost || player._powerBoost <= 0) return;
    const ratio = player._powerBoost / 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(25, 118, 200, 6);
    ctx.fillStyle = '#ffaa44';
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 6;
    ctx.fillRect(25, 118, 200 * ratio, 6);
    ctx.shadowBlur = 0;
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffaa44';
    ctx.textAlign = 'left';
    ctx.fillText('POWER UP!', 25, 115);
    ctx.restore();
}

export function calculateRating(player, killCount, levelConfig) {
    const hp = player ? player.hp : 0;
    const maxHp = player ? (player.maxHp || 1000) : 1000;
    const hpRatio = hp / maxHp;
    if (hpRatio > 0.8 && killCount >= levelConfig.enemies.length * 0.9) return 'S';
    if (hpRatio > 0.5 && killCount >= levelConfig.enemies.length * 0.7) return 'A';
    if (hpRatio > 0.2 && killCount >= levelConfig.enemies.length * 0.5) return 'B';
    return 'C';
}

export function drawVictory(ctx, player, levelConfig, score, killCount, currentLevel) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.font = `bold 64px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`${levelConfig.name} — STAGE CLEAR!`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);

    ctx.shadowBlur = 0;
    ctx.font = `bold 28px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Score: ${score}   Kills: ${killCount}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

    // Rating
    const rating = calculateRating(player, killCount, levelConfig);
    ctx.font = `bold 36px ${FONT_FAMILY}`;
    ctx.fillStyle = rating === 'S' ? '#ffcc00' : (rating === 'A' ? '#44ff66' : '#ffffff');
    ctx.fillText(`Rating: ${rating}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60);

    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    // Show "next level" option if available
    const hasNextLevel = currentLevel < PVE_LEVELS.length - 1;
    if (hasNextLevel) {
        ctx.fillText('N: 下一关  |  R: 返回选角', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 95);
    } else {
        ctx.fillText('全部通关！ R: 返回选角', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 95);
    }
    ctx.restore();
}

export function drawDefeat(ctx, score, killCount) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.font = `bold 56px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff4444';
    ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 30);

    ctx.shadowBlur = 0;
    ctx.font = `24px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Score: ${score}   Kills: ${killCount}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.fillText('Press R to return', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60);
    ctx.restore();
}
