/**
 * dialogue-scene.js - Pre-battle dialogue screen
 * Handles: character dialogue display, portrait rendering, scene advancement
 */
import { FONT_FAMILY } from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';
import { Game } from '../core/game-state.js';
import { getCharacterDefinition } from '../data/characters.js';
import { DIALOGUE_LINES, getDialogue } from '../data/dialogue-data.js';
import { BattleScene } from './battle-scene.js';

// ===================== DIALOGUE SCENE =====================
export const DialogueScene = {
    lines: DIALOGUE_LINES,
    currentLine: 0,
    blinkTimer: 0,

    reset() {
        this.currentLine = 0;
        this.blinkTimer = 0;
        // Load dialogue for current matchup
        this.lines = getDialogue(Game.playerChar, Game.aiChar);
    },

    advance() {
        this.currentLine++;
        if (this.currentLine >= this.lines.length) {
            // Transition to battle
            Game.state = 'battle';
            BattleScene.init();
        }
    },

    handleKey(key) {
        if (key === 'enter' || key === ' ') {
            this.advance();
        }
    },

    draw(ctx, dt) {
        const W = 1280, H = 720;

        if (this.currentLine >= this.lines.length) return;
        const line = this.lines[this.currentLine];

        // Background gradient sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, '#1a0533');
        skyGrad.addColorStop(0.3, '#2d1b69');
        skyGrad.addColorStop(0.6, '#4a3f8a');
        skyGrad.addColorStop(0.8, '#6b5fa8');
        skyGrad.addColorStop(1, '#2a3a1a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // Stars
        ctx.save();
        for (let i = 0; i < 40; i++) {
            const sx = (Math.sin(i * 7.3) * 0.5 + 0.5) * W;
            const sy = (Math.cos(i * 5.1) * 0.5 + 0.5) * H * 0.6;
            const sr = 1 + Math.sin(i * 3.7 + Date.now() * 0.002) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 220, ${0.3 + Math.sin(i * 2.1 + Date.now() * 0.003) * 0.2})`;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.5, sr), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Ground silhouette
        ctx.fillStyle = '#1a1a0a';
        ctx.fillRect(0, H - 80, W, 80);
        const groundGrad = ctx.createLinearGradient(0, H - 80, 0, H);
        groundGrad.addColorStop(0, '#2a3a1a');
        groundGrad.addColorStop(1, '#1a1a0a');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, H - 80, W, 80);

        // Draw portraits (dynamic based on selected characters)
        const char1 = Game.playerChar || 'reimu';
        const char2 = Game.aiChar || 'marisa';
        this._drawPortrait(ctx, char1, 30, 40, line.speaker === char1, line.speaker === char1 ? line.expr : 'normal', 500);
        this._drawPortrait(ctx, char2, W - 430, 40, line.speaker === char2, line.speaker === char2 ? line.expr : 'normal', 500);

        // Dialogue box
        const boxY = H - 200;
        const boxH = 170;
        const boxMargin = 40;

        ctx.save();

        // Gradient background
        const boxGrad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH);
        boxGrad.addColorStop(0, 'rgba(20, 10, 40, 0.9)');
        boxGrad.addColorStop(1, 'rgba(10, 5, 25, 0.95)');
        ctx.fillStyle = boxGrad;
        ctx.beginPath();
        const br = 12;
        ctx.moveTo(boxMargin + br, boxY);
        ctx.lineTo(W - boxMargin - br, boxY);
        ctx.quadraticCurveTo(W - boxMargin, boxY, W - boxMargin, boxY + br);
        ctx.lineTo(W - boxMargin, boxY + boxH - br);
        ctx.quadraticCurveTo(W - boxMargin, boxY + boxH, W - boxMargin - br, boxY + boxH);
        ctx.lineTo(boxMargin + br, boxY + boxH);
        ctx.quadraticCurveTo(boxMargin, boxY + boxH, boxMargin, boxY + boxH - br);
        ctx.lineTo(boxMargin, boxY + br);
        ctx.quadraticCurveTo(boxMargin, boxY, boxMargin + br, boxY);
        ctx.closePath();
        ctx.fill();

        // Gradient border
        const borderGrad = ctx.createLinearGradient(boxMargin, boxY, W - boxMargin, boxY + boxH);
        borderGrad.addColorStop(0, 'rgba(180, 130, 255, 0.5)');
        borderGrad.addColorStop(0.5, 'rgba(200, 150, 255, 0.3)');
        borderGrad.addColorStop(1, 'rgba(180, 130, 255, 0.5)');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Speaker name
        const speaker = getCharacterDefinition(line.speaker);
        const speakerColor = speaker.accentColor;
        const speakerName = speaker.displayName;

        ctx.font = `bold 28px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = speakerColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = speakerColor;
        ctx.fillText(speakerName, boxMargin + 30, boxY + 20);
        ctx.shadowBlur = 0;
        ctx.shadowBlur = 0;

        // Dialogue text
        ctx.font = `24px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line.text, boxMargin + 30, boxY + 65);

        // Blinking prompt
        this.blinkTimer += dt;
        const blink = Math.sin(this.blinkTimer * 4) > 0;
        if (blink) {
            ctx.font = `18px ${FONT_FAMILY}`;
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText('▼ Enter / Space', W - boxMargin - 30, boxY + boxH - 35);
        }

        ctx.restore();
    },

    _drawPortrait(ctx, charName, x, y, active, expr, targetHeight) {
        const portrait = Assets.portraits[charName][expr] || Assets.portraits[charName].normal;
        if (!portrait) return;

        ctx.save();
        if (!active) {
            ctx.globalAlpha = 0.4;
        }

        const scale = targetHeight / portrait.height;
        const pw = portrait.width * scale;
        const ph = targetHeight;

        // Subtle glow for active speaker
        if (active) {
            ctx.shadowColor = charName === 'reimu' ? '#ff6b8a' : '#ffcc00';
            ctx.shadowBlur = 20;
        }

        ctx.drawImage(portrait, x, y, pw, ph);
        ctx.restore();
    }
};
