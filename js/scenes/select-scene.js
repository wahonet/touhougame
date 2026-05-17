/**
 * select-scene.js - Arcade-style character selection screen.
 */
import { FONT_FAMILY } from '../config/game-config.js';
import { Assets } from '../core/asset-store.js';
import { AudioManager } from '../core/audio-manager.js';
import { Game } from '../core/game-state.js';
import { CHARACTER_DEFINITIONS } from '../data/characters.js';
import { BattleScene } from './battle-scene.js';
import { PvEScene } from './pve-scene.js';

const CHAR_IDS = ['reimu', 'marisa', 'yuyuko', 'youmu'];

export const SelectScene = {
    selectedIndex: 0,
    step: 'player',
    playerIndex: -1,

    reset() {
        this.selectedIndex = 0;
        this.step = 'player';
        this.playerIndex = -1;
    },

    handleClick(mx, my) {
        const cell = this._hitAvatar(mx, my);
        if (cell >= 0) {
            this.selectedIndex = cell;
            this._chooseCurrent();
            return;
        }

        const pve = this._pveButtonRect();
        if (mx >= pve.x && mx <= pve.x + pve.w && my >= pve.y && my <= pve.y + pve.h) {
            const index = this.playerIndex >= 0 ? this.playerIndex : this.selectedIndex;
            this._startPvE(index);
        }

        const back = this._backButtonRect();
        if (this.step === 'opponent' && mx >= back.x && mx <= back.x + back.w && my >= back.y && my <= back.y + back.h) {
            this.step = 'player';
            this.playerIndex = -1;
            this.selectedIndex = 0;
            if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click');
        }
    },

    handleKey(key) {
        if (['1', '2', '3', '4'].includes(key)) {
            this.selectedIndex = Number(key) - 1;
            this._chooseCurrent();
        }

        if (key === 'arrowleft' || key === 'a') this._moveSelection(-1, 0);
        if (key === 'arrowright' || key === 'd') this._moveSelection(1, 0);
        if (key === 'arrowup' || key === 'w') this._moveSelection(0, -1);
        if (key === 'arrowdown' || key === 's') this._moveSelection(0, 1);

        if (key === 'enter' || key === ' ') this._chooseCurrent();
        if (key === '5') {
            const index = this.playerIndex >= 0 ? this.playerIndex : this.selectedIndex;
            this._startPvE(index);
        }
        if (key === 'escape' || key === 'backspace') {
            this.step = 'player';
            this.playerIndex = -1;
            this.selectedIndex = 0;
        }
    },

    _moveSelection(dx, dy) {
        const col = this.selectedIndex % 2;
        const row = Math.floor(this.selectedIndex / 2);
        const nextCol = Math.max(0, Math.min(1, col + dx));
        const nextRow = Math.max(0, Math.min(1, row + dy));
        this.selectedIndex = nextRow * 2 + nextCol;
    },

    _chooseCurrent() {
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click');
        if (this.step === 'player') {
            this.playerIndex = this.selectedIndex;
            this.step = 'opponent';
            this.selectedIndex = this.selectedIndex === 0 ? 1 : 0;
        } else {
            this._startPvP(this.playerIndex, this.selectedIndex);
        }
    },

    _startPvP(playerIndex, opponentIndex) {
        Game.playerChar = CHAR_IDS[playerIndex];
        Game.aiChar = CHAR_IDS[opponentIndex];
        Game.gameMode = 'pvp';
        Game.state = 'battle';
        BattleScene.init();
    },

    _startPvE(index) {
        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_click');
        Game.playerChar = CHAR_IDS[index];
        Game.gameMode = 'pve';
        Game.currentLevel = 0;
        Game.state = 'pve';
        PvEScene.init(0);
    },

    draw(ctx) {
        const W = 1280, H = 720;
        const activeChar = CHAR_IDS[this.selectedIndex];
        const activeDef = CHARACTER_DEFINITIONS[activeChar];

        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#100716');
        bg.addColorStop(0.45, '#251126');
        bg.addColorStop(1, '#101c28');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        this._drawHeader(ctx, W);
        this._drawVersusStrip(ctx);
        this._drawAvatarGrid(ctx);
        this._drawSkillPanel(ctx, activeChar, activeDef);
        this._drawFooter(ctx, W, H);
    },

    _drawHeader(ctx, W) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 42px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff66aa';
        ctx.shadowBlur = 24;
        ctx.fillText('角色选择', W / 2, 48);
        ctx.shadowBlur = 0;
        ctx.font = `18px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.58)';
        ctx.fillText(this.step === 'player' ? '选择己方角色' : '选择对方角色', W / 2, 84);
        ctx.restore();
    },

    _drawVersusStrip(ctx) {
        const y = 112;
        const pChar = this.playerIndex >= 0 ? CHAR_IDS[this.playerIndex] : null;
        const oChar = this.step === 'opponent' ? CHAR_IDS[this.selectedIndex] : null;
        this._drawPickSlot(ctx, 220, y, '1P', pChar, '#ff6b8a');
        this._drawPickSlot(ctx, 880, y, 'CPU', oChar, '#66ccff');

        ctx.save();
        ctx.font = `bold 46px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.fillText('VS', 640, y + 56);
        ctx.restore();
    },

    _drawPickSlot(ctx, x, y, label, charId, color) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        this._roundRect(ctx, x, y, 180, 108, 8);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = `bold 18px ${FONT_FAMILY}`;
        ctx.fillStyle = color;
        ctx.fillText(label, x + 16, y + 26);

        if (charId) {
            this._drawSquarePortrait(ctx, charId, x + 100, y + 16, 76, 76);
            ctx.font = `bold 18px ${FONT_FAMILY}`;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(CHARACTER_DEFINITIONS[charId].displayName, x + 16, y + 70);
        } else {
            ctx.font = `bold 34px ${FONT_FAMILY}`;
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText('?', x + 86, y + 72);
        }
        ctx.restore();
    },

    _drawAvatarGrid(ctx) {
        const size = 138;
        const gap = 22;
        const startX = 86;
        const startY = 278;

        for (let i = 0; i < CHAR_IDS.length; i++) {
            const charId = CHAR_IDS[i];
            const def = CHARACTER_DEFINITIONS[charId];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + col * (size + gap);
            const y = startY + row * (size + gap);
            const selected = i === this.selectedIndex;
            const locked = i === this.playerIndex;

            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            this._roundRect(ctx, x, y, size, size, 8);
            ctx.fill();
            ctx.strokeStyle = selected ? def.selectAccentColor : (locked ? '#ffffff' : 'rgba(255,255,255,0.18)');
            ctx.lineWidth = selected ? 4 : 2;
            ctx.shadowColor = selected ? def.selectAccentColor : 'transparent';
            ctx.shadowBlur = selected ? 18 : 0;
            ctx.stroke();
            ctx.shadowBlur = 0;

            this._drawSquarePortrait(ctx, charId, x + 10, y + 10, size - 20, size - 38);
            ctx.font = `bold 15px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.fillStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.72)';
            ctx.fillText(`${i + 1}. ${def.displayName}`, x + size / 2, y + size - 13);
            ctx.restore();
        }
    },

    _drawSkillPanel(ctx, charId, def) {
        const x = 445, y = 245, w = 735, h = 390;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = `${def.selectAccentColor}88`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = `bold 32px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = def.selectAccentColor;
        ctx.fillText(def.selectName, x + 28, y + 48);

        ctx.font = `bold 18px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.fillText(`HP ${def.maxHp}`, x + 30, y + 82);

        const icons = Assets.skillIcons[charId] || [];
        for (let i = 0; i < def.skills.length; i++) {
            const skill = def.skills[i];
            const rowY = y + 118 + i * 62;
            const icon = icons[i];
            const color = def.skillColors[i];

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + 52, rowY + 24, 23, 0, Math.PI * 2);
            ctx.clip();
            if (icon) ctx.drawImage(icon, x + 29, rowY + 1, 46, 46);
            else {
                ctx.fillStyle = color;
                ctx.fillRect(x + 29, rowY + 1, 46, 46);
            }
            ctx.restore();

            ctx.font = `bold 17px ${FONT_FAMILY}`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${i + 1}. ${skill.name}`, x + 88, rowY + 18);
            ctx.font = `14px ${FONT_FAMILY}`;
            ctx.fillStyle = 'rgba(255,255,255,0.56)';
            ctx.fillText(`${this._typeLabel(skill.type)}  CD ${skill.maxCooldown}s`, x + 88, rowY + 39);
            ctx.fillStyle = 'rgba(255,255,255,0.76)';
            ctx.fillText(skill.description, x + 255, rowY + 30);
        }
        ctx.restore();
    },

    _drawFooter(ctx, W, H) {
        ctx.save();
        ctx.font = `15px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('1-4/方向键选择  Enter确认  5进入PvE', W / 2, H - 30);
        ctx.restore();

        const pve = this._pveButtonRect();
        this._drawButton(ctx, pve, 'PvE 过关', '#5ba7ff');
        if (this.step === 'opponent') {
            this._drawButton(ctx, this._backButtonRect(), '重选己方', '#ffffff');
        }
    },

    _drawButton(ctx, rect, label, color) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        this._roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = `bold 16px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.restore();
    },

    _drawSquarePortrait(ctx, charId, x, y, size, h = size) {
        const portrait = Assets.portraits[charId] && Assets.portraits[charId].normal;
        if (!portrait) {
            ctx.fillStyle = CHARACTER_DEFINITIONS[charId].selectAccentColor;
            ctx.fillRect(x, y, size, h);
            return;
        }

        const srcSize = Math.min(portrait.width, portrait.height);
        const sx = Math.max(0, (portrait.width - srcSize) / 2);
        const sy = Math.max(0, (portrait.height - srcSize) * 0.18);
        ctx.drawImage(portrait, sx, sy, srcSize, srcSize, x, y, size, h);
    },

    _hitAvatar(mx, my) {
        const size = 138;
        const gap = 22;
        const startX = 86;
        const startY = 278;
        for (let i = 0; i < CHAR_IDS.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + col * (size + gap);
            const y = startY + row * (size + gap);
            if (mx >= x && mx <= x + size && my >= y && my <= y + size) return i;
        }
        return -1;
    },

    _typeLabel(type) {
        if (type === 'damage') return '伤害';
        if (type === 'shield') return '防护';
        return '功能';
    },

    _pveButtonRect() {
        return { x: 945, y: 650, w: 120, h: 42 };
    },

    _backButtonRect() {
        return { x: 1080, y: 650, w: 120, h: 42 };
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
    }
};
