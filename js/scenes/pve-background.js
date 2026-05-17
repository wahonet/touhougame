/**
 * PvE background/world drawing functions
 * Extracted from pve-scene.js for modularity.
 */
import {
    SCREEN_HEIGHT,
    SCREEN_WIDTH
} from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';

export function drawMountains(ctx, offset, groundY, heightFactor, color, maxHeight, freq) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(offset - 50, groundY);
    for (let x = -50; x < SCREEN_WIDTH + 100; x += 4) {
        const worldX = x - offset;
        const h = (Math.sin(worldX * freq) * 0.5 + 0.5) * maxHeight * heightFactor +
                  (Math.sin(worldX * freq * 2.7 + 1) * 0.3 + 0.3) * maxHeight * 0.3 * heightFactor;
        ctx.lineTo(x + offset, groundY - h);
    }
    ctx.lineTo(SCREEN_WIDTH + 100 + offset, groundY);
    ctx.closePath();
    ctx.fill();
}

export function drawGround(ctx, groundY, levelConfig) {
    const theme = levelConfig.theme;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, SCREEN_HEIGHT);
    groundGrad.addColorStop(0, theme.groundTop);
    groundGrad.addColorStop(0.15, theme.groundBot);
    groundGrad.addColorStop(1, theme.groundBot);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, levelConfig.width, SCREEN_HEIGHT - groundY);

    // Ground surface glow
    const surfGlow = ctx.createLinearGradient(0, groundY - 4, 0, groundY + 8);
    surfGlow.addColorStop(0, theme.groundLine.replace('0.6', '0.3'));
    surfGlow.addColorStop(1, 'rgba(60, 120, 30, 0)');
    ctx.fillStyle = surfGlow;
    ctx.fillRect(0, groundY - 4, levelConfig.width, 12);

    // Ground line
    ctx.strokeStyle = levelConfig.theme.groundLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(levelConfig.width, groundY);
    ctx.stroke();
}

export function drawPlatforms(ctx, platforms) {
    for (const plat of platforms) {
        const isMoving = plat.moveType && plat.moveType !== 'static';
        const asset = plat.type === 'large' ? Assets.platform : Assets.platformSmall;
        if (asset) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.ellipse(plat.x + plat.w / 2, plat.y + plat.h + 6, plat.w * 0.45, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (isMoving) {
                // Tint moving platforms with a blue overlay
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.drawImage(asset, plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = 'rgba(80, 160, 255, 0.25)';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.restore();
            } else {
                ctx.drawImage(asset, plat.x, plat.y, plat.w, plat.h);
            }
        } else {
            ctx.save();
            const platGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
            if (isMoving) {
                platGrad.addColorStop(0, 'rgba(80, 140, 200, 0.9)');
                platGrad.addColorStop(1, 'rgba(40, 80, 140, 0.8)');
            } else {
                platGrad.addColorStop(0, plat.type === 'large' ? 'rgba(120, 90, 55, 0.9)' : 'rgba(100, 80, 50, 0.85)');
                platGrad.addColorStop(1, plat.type === 'large' ? 'rgba(60, 45, 30, 0.8)' : 'rgba(50, 40, 28, 0.75)');
            }
            ctx.fillStyle = platGrad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.strokeStyle = isMoving ? 'rgba(100, 180, 255, 0.6)' : 'rgba(180, 150, 100, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(plat.x + 3, plat.y + 1);
            ctx.lineTo(plat.x + plat.w - 3, plat.y + 1);
            ctx.stroke();
            ctx.restore();
        }

        // Draw direction arrows for moving platforms
        if (isMoving) {
            ctx.save();
            const cx = plat.x + plat.w / 2;
            const cy = plat.y + plat.h / 2;
            ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.7)';
            ctx.lineWidth = 2;
            if (plat.moveType === 'horizontal') {
                // Left arrow
                ctx.beginPath();
                ctx.moveTo(cx - 16, cy);
                ctx.lineTo(cx - 8, cy - 5);
                ctx.lineTo(cx - 8, cy + 5);
                ctx.closePath();
                ctx.fill();
                // Right arrow
                ctx.beginPath();
                ctx.moveTo(cx + 16, cy);
                ctx.lineTo(cx + 8, cy - 5);
                ctx.lineTo(cx + 8, cy + 5);
                ctx.closePath();
                ctx.fill();
            } else if (plat.moveType === 'vertical') {
                // Up arrow
                ctx.beginPath();
                ctx.moveTo(cx, cy - 8);
                ctx.lineTo(cx - 5, cy);
                ctx.lineTo(cx + 5, cy);
                ctx.closePath();
                ctx.fill();
                // Down arrow
                ctx.beginPath();
                ctx.moveTo(cx, cy + 8);
                ctx.lineTo(cx - 5, cy);
                ctx.lineTo(cx + 5, cy);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

// ========== AMBIENT EFFECTS ==========

/**
 * Create ambient particle pool for a specific level theme
 * @param {number} levelIndex - 0, 1, or 2
 * @param {number} levelWidth - Total level width in pixels
 * @returns {Array} particle array
 */
export function createAmbientParticles(levelIndex, levelWidth) {
    const particles = [];
    const count = levelIndex === 1 ? 40 : 30; // More particles for fire level

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * levelWidth,
            y: Math.random() * SCREEN_HEIGHT,
            size: 2 + Math.random() * 4,
            speed: 0.3 + Math.random() * 1.2,
            drift: (Math.random() - 0.5) * 0.5,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.2 + Math.random() * 0.5
        });
    }
    return particles;
}

/**
 * Update and draw ambient particles based on level theme
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} particles - Ambient particle array
 * @param {number} levelIndex - 0, 1, or 2
 * @param {number} cam - Camera X offset
 * @param {number} dt - Delta time
 * @param {number} groundY - Ground Y position
 */
export function drawAmbientEffects(ctx, particles, levelIndex, cam, dt, groundY) {
    if (!particles || particles.length === 0) return;

    ctx.save();
    for (const p of particles) {
        // Update position based on level theme
        switch (levelIndex) {
            case 0: // 迷途竹林 - Falling cherry blossom petals
                p.y += p.speed * 30 * dt;
                p.x += Math.sin(Date.now() * 0.001 + p.phase) * 0.3 + p.drift;
                if (p.y > groundY) { p.y = -10; p.x = cam + Math.random() * SCREEN_WIDTH; }

                // Draw petal
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = '#ffaacc';
                ctx.beginPath();
                ctx.ellipse(p.x - cam * 0.3, p.y, p.size, p.size * 0.6, Math.sin(Date.now() * 0.002 + p.phase), 0, Math.PI * 2);
                ctx.fill();
                break;

            case 1: // 灼熱地獄 - Rising fire embers
                p.y -= p.speed * 40 * dt;
                p.x += Math.sin(Date.now() * 0.002 + p.phase) * 0.5;
                if (p.y < -10) { p.y = groundY + 10; p.x = cam + Math.random() * SCREEN_WIDTH; }

                // Draw ember
                const emberAlpha = p.alpha * (0.5 + Math.sin(Date.now() * 0.005 + p.phase) * 0.5);
                ctx.globalAlpha = emberAlpha;
                ctx.fillStyle = p.size > 3 ? '#ff6622' : '#ffaa44';
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x - cam * 0.2, p.y, p.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;

            case 2: // 白玉京 - Floating golden sparkles
                p.y += Math.sin(Date.now() * 0.0008 + p.phase) * 0.4;
                p.x += p.drift * 20 * dt;
                // Wrap around
                if (p.x > cam + SCREEN_WIDTH + 50) p.x = cam - 50;
                if (p.x < cam - 50) p.x = cam + SCREEN_WIDTH + 50;

                // Draw sparkle
                const sparkle = 0.3 + Math.sin(Date.now() * 0.003 + p.phase) * 0.7;
                ctx.globalAlpha = p.alpha * Math.max(0, sparkle);
                ctx.fillStyle = '#ffdd88';
                ctx.shadowColor = '#ffcc44';
                ctx.shadowBlur = 8;
                // Cross sparkle shape
                const sx = p.x - cam * 0.15;
                const sy = p.y;
                const ss = p.size * 0.8;
                ctx.fillRect(sx - ss, sy - 1, ss * 2, 2);
                ctx.fillRect(sx - 1, sy - ss, 2, ss * 2);
                ctx.shadowBlur = 0;
                break;
        }
    }
    ctx.restore();
}
