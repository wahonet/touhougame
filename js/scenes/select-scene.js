/**
 * select-scene.js - Character selection screen
 * Handles: character portrait display, PvP/PvE mode selection
 */
import { FONT_FAMILY } from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';
import { AudioManager } from '../core/audio-manager.js';
import { Game } from '../core/game-state.js';
import { CHARACTER_DEFINITIONS } from '../data/characters.js';
import { PvEScene } from './pve-scene.js';
import { DialogueScene } from './dialogue-scene.js';

// ===================== CHARACTER SELECT =====================
const CHAR_IDS = ['reimu', 'marisa', 'yuyuko', 'youmu'];

export const SelectScene = {
    selectedIndex: -1,

    reset() {
        this.selectedIndex = -1;
    },

    handleClick(mx, my) {
        // 2x2 grid: 4 character panels
        const panelW = 560, panelH = 230;
        const gapX = 40, gapY = 20;
        const gridW = panelW * 2 + gapX;
        const startX = (1280 - gridW) / 2;
        const startY = 115;

        for (let i = 0; i < 4; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const px = startX + col * (panelW + gapX);
            const py = startY + row * (panelH + gapY);
            if (mx >= px && mx <= px + panelW && my >= py && my <= py + panelH) {
                this.selectedIndex = i;
                if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click');
                break;
            }
        }

        // Check mode buttons (only when character selected)
        if (this.selectedIndex >= 0) {
            const btnW = 200, btnH = 50;
            const btnY = 720 - 80;
            const pvpBtnX = 1280 / 2 - btnW - 20;
            const pveBtnX = 1280 / 2 + 20;
            if (mx >= pvpBtnX && mx <= pvpBtnX + btnW && my >= btnY && my <= btnY + btnH) {
                this._startPvP();
            }
            if (mx >= pveBtnX && mx <= pveBtnX + btnW && my >= btnY && my <= btnY + btnH) {
                this._startPvE();
            }
        }
    },

    _startPvP() {
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click');
        const charId = CHAR_IDS[this.selectedIndex];
        Game.playerChar = charId;
        // AI picks a different character
        const aiOptions = CHAR_IDS.filter(c => c !== charId);
        Game.aiChar = aiOptions[Math.floor(Math.random() * aiOptions.length)];
        Game.gameMode = 'pvp';
        Game.state = 'dialogue';
        DialogueScene.reset();
    },

    _startPvE(levelIndex) {
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click');
        Game.playerChar = CHAR_IDS[this.selectedIndex];
        Game.gameMode = 'pve';
        Game.currentLevel = levelIndex || 0;
        Game.state = 'pve';
        PvEScene.init(levelIndex || 0);
    },

    handleKey(key) {
        if (key === '1') { this.selectedIndex = 0; if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click'); }
        if (key === '2') { this.selectedIndex = 1; if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click'); }
        if (key === '3') { this.selectedIndex = 2; if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click'); }
        if (key === '4') { this.selectedIndex = 3; if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click'); }
        if ((key === 'enter' || key === ' ') && this.selectedIndex >= 0) {
            this._startPvP();
        }
        if (key === '5' && this.selectedIndex >= 0) {
            this._startPvE();
        }
    },

    draw(ctx) {
        const W = 1280, H = 720;

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0a0520');
        bgGrad.addColorStop(0.5, '#1a0a3a');
        bgGrad.addColorStop(1, '#0a0a2e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Decorative particles
        ctx.save();
        for (let i = 0; i < 50; i++) {
            const px = (Math.sin(i * 4.7 + Date.now() * 0.001) * 0.5 + 0.5) * W;
            const py = (Math.cos(i * 3.2 + Date.now() * 0.0008) * 0.5 + 0.5) * H;
            const alpha = 0.15 + Math.sin(i * 2.3 + Date.now() * 0.002) * 0.12;
            const size = 1 + Math.sin(i * 1.7 + Date.now() * 0.003) * 1;
            const colors = ['rgba(255, 180, 220, ', 'rgba(180, 160, 255, ', 'rgba(255, 220, 150, '];
            ctx.fillStyle = colors[i % 3] + alpha + ')';
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Title
        ctx.save();
        ctx.font = `bold 52px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#cc66ff';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('东方横版战斗 Demo', W / 2, 55);
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#cc66ff';
        ctx.shadowBlur = 60;
        ctx.globalAlpha = 0.3;
        ctx.fillText('东方横版战斗 Demo', W / 2, 55);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.font = `20px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('选择你的角色  Select Your Character', W / 2, 90);
        ctx.restore();

        // Character panels (2x2 grid)
        const panelW = 560, panelH = 230;
        const gapX = 40, gapY = 20;
        const gridW = panelW * 2 + gapX;
        const startX = (W - gridW) / 2;
        const startY = 115;

        for (let i = 0; i < CHAR_IDS.length; i++) {
            const charId = CHAR_IDS[i];
            const charDef = CHARACTER_DEFINITIONS[charId];
            if (!charDef) continue;
            const col = i % 2;
            const row = Math.floor(i / 2);
            const px = startX + col * (panelW + gapX);
            const py = startY + row * (panelH + gapY);
            this._drawCharPanel(ctx, px, py, panelW, panelH, charId, charDef.selectName, this.selectedIndex === i, charDef.selectAccentColor, i + 1);
        }

        // Instructions
        ctx.save();
        ctx.font = `16px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('点击角色选择 → 然后点击模式按钮  |  1-4: 选择角色  |  Enter: PvP  |  5: PvE', W / 2, H - 100);
        ctx.restore();

        // Mode buttons if selected
        if (this.selectedIndex >= 0) {
            ctx.save();
            const btnW = 200, btnH = 50;
            const btnY = H - 80;

            // PvP button
            const pvpX = W / 2 - btnW - 15;
            ctx.shadowColor = '#ff6b9d';
            ctx.shadowBlur = 15;
            const pvpGrad = ctx.createLinearGradient(pvpX, btnY, pvpX + btnW, btnY + btnH);
            pvpGrad.addColorStop(0, '#ff4466');
            pvpGrad.addColorStop(1, '#ff6b9d');
            ctx.fillStyle = pvpGrad;
            this._roundRect(ctx, pvpX, btnY, btnW, btnH, 10);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.font = `bold 22px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('PvP 对战', pvpX + btnW / 2, btnY + btnH / 2);

            // PvE button
            const pveX = W / 2 + 15;
            ctx.shadowColor = '#66ccff';
            ctx.shadowBlur = 15;
            const pveGrad = ctx.createLinearGradient(pveX, btnY, pveX + btnW, btnY + btnH);
            pveGrad.addColorStop(0, '#3366ff');
            pveGrad.addColorStop(1, '#66aaff');
            ctx.fillStyle = pveGrad;
            this._roundRect(ctx, pveX, btnY, btnW, btnH, 10);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.font = `bold 22px ${FONT_FAMILY}`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText('PvE 过关', pveX + btnW / 2, btnY + btnH / 2);

            ctx.restore();
        }
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _drawCharPanel(ctx, x, y, w, h, charName, displayName, selected, accentColor, keyNum) {
        ctx.save();

        // Panel background
        const panelGrad = ctx.createLinearGradient(x, y, x, y + h);
        panelGrad.addColorStop(0, 'rgba(30, 20, 50, 0.8)');
        panelGrad.addColorStop(1, 'rgba(20, 15, 40, 0.9)');
        ctx.fillStyle = panelGrad;
        this._roundRect(ctx, x, y, w, h, 12);
        ctx.fill();

        // Selection glow border
        if (selected) {
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 4;
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 25;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Portrait (left side of panel)
        const portrait = Assets.portraits[charName] && Assets.portraits[charName].normal;
        if (portrait) {
            const portraitArea = h - 20;
            const scale = portraitArea / Math.max(portrait.height, 1);
            const pw = portrait.width * scale;
            const ph = portraitArea;
            const px = x + 15;
            const py = y + 10;

            ctx.save();
            if (!selected) ctx.globalAlpha = 0.7;
            // Clip to rounded rect
            ctx.beginPath();
            ctx.rect(px, py, pw, ph);
            ctx.clip();
            ctx.drawImage(portrait, px, py, pw, ph);
            ctx.restore();
        } else {
            // Color placeholder
            ctx.fillStyle = accentColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x + 15, y + 10, 100, h - 20);
            ctx.globalAlpha = 1;
        }

        // Name (right side)
        ctx.font = `bold 24px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? accentColor : 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(displayName, x + 160, y + 50);

        // Skills preview
        const charDef = CHARACTER_DEFINITIONS[charName];
        if (charDef) {
            ctx.font = `14px ${FONT_FAMILY}`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            charDef.skills.forEach((skill, i) => {
                ctx.fillText(`[${i + 1}] ${skill.name}  CD: ${skill.maxCooldown}s`, x + 160, y + 80 + i * 22);
            });
        }

        // Key hint
        ctx.font = `14px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillText(`按 ${keyNum} 选择`, x + w - 15, y + h - 12);

        ctx.restore();
    }
};
