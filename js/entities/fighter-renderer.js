/**
 * Fighter Renderer - Main fighter draw logic
 * Extracted from Fighter class to modularize rendering.
 */
import { Assets } from '../core/asset-store.js';
import { Game } from '../core/game-state.js';

/**
 * Draw the fighter on canvas
 * @param {Fighter} fighter
 * @param {CanvasRenderingContext2D} ctx
 */
export function draw(fighter, ctx) {
    // Drop shadow on ground
    const groundYRef = fighter.groundY || 580;
    const heightAboveGround = groundYRef - fighter.cy;
    const shadowScale = Math.max(0.3, 1 - heightAboveGround / 300);
    const shadowAlpha = Math.max(0.05, 0.25 * shadowScale);
    const shadowWidth = 30 * shadowScale + 10;
    const shadowHeight = 6 * shadowScale + 2;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(fighter.cx, groundYRef, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Defeated: rotate the stand sprite 90° to lay flat on the ground
    if (fighter.state === 'dead') {
        const standFrame = fighter.anims.idle ? fighter.anims.idle.frames[0] : null;
        if (standFrame) {
            const fw = standFrame.width;
            const fh = standFrame.height;
            ctx.save();
            ctx.translate(fighter.cx, fighter.groundY - fh * 0.3);
            ctx.rotate(Math.PI / 2);
            ctx.globalAlpha = 0.8;
            ctx.drawImage(standFrame, -fw / 2, -fh);
            ctx.restore();
        }
        return;
    }

    // During flying state and not attacking, use fly sprite
    if (fighter.flying.active && fighter.state !== 'attack') {
        const dir = fighter.facing;
        const flySprite = Assets.sprites[fighter.name] &&
            Assets.sprites[fighter.name][dir] &&
            Assets.sprites[fighter.name][dir].fly;

        if (flySprite) {
            const fw = flySprite.width;
            const fh = flySprite.height;
            const x = fighter.cx - fw / 2;
            const y = fighter.cy - fh;

            ctx.drawImage(flySprite, x, y);

            // Hit flash overlay
            if (fighter.hitFlash > 0) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(x, y, fw, fh);
                ctx.restore();
            }
            return;
        }
    }

    const frame = fighter.currentAnim.currentFrame;
    if (!frame) return;

    const fw = frame.width;
    const fh = frame.height;
    const x = fighter.cx - fw / 2;
    const y = fighter.cy - fh;

    ctx.drawImage(frame, x, y);

    // Hit flash overlay
    if (fighter.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x, y, fw, fh);
        ctx.restore();
    }

    // Debug hurtbox
    if (Game.debugMode) {
        const hb = fighter.getHurtbox();
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.lineWidth = 2;
        ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
        ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);

        // Debug hitbox
        const hitb = fighter.getHitbox();
        if (hitb) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.fillRect(hitb.x, hitb.y, hitb.w, hitb.h);
            ctx.strokeRect(hitb.x, hitb.y, hitb.w, hitb.h);
        }

        // Debug beam rects
        const beamRect = fighter.getBeamRect();
        if (beamRect) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            ctx.fillRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
            ctx.strokeRect(beamRect.x, beamRect.y, beamRect.w, beamRect.h);
        }

        const bigBeamRect = fighter.getBigBeamRect();
        if (bigBeamRect) {
            ctx.strokeStyle = 'rgba(255, 150, 0, 0.6)';
            ctx.fillStyle = 'rgba(255, 150, 0, 0.1)';
            ctx.fillRect(bigBeamRect.x, bigBeamRect.y, bigBeamRect.w, bigBeamRect.h);
            ctx.strokeRect(bigBeamRect.x, bigBeamRect.y, bigBeamRect.w, bigBeamRect.h);
        }

        ctx.restore();
    }
}
