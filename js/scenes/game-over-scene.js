/**
 * game-over-scene.js - Game over / victory screen
 * Handles: winner display, restart prompt
 */
import { FONT_FAMILY } from '../config/game-config.js';
import { Game } from '../core/game-state.js';
import { getCharacterDefinition } from '../data/characters.js';

// ===================== GAME OVER SCENE =====================
export const GameOverScene = {
    draw(ctx) {
        const W = 1280, H = 720;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, W, H);

        // Winner text
        const winner = Game.winner;
        const character = getCharacterDefinition(winner);
        const displayName = character.resultName;
        const accentColor = character.accentColor;

        // Glow effect
        ctx.save();
        ctx.font = `bold 64px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 40;
        ctx.fillStyle = accentColor;
        ctx.fillText(`${displayName} Win!`, W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;

        // Restart prompt
        ctx.font = `28px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('按 R 重新开始  Press R to Restart', W / 2, H / 2 + 40);
        ctx.restore();
    }
};
