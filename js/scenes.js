/**
 * scenes.js - All scene rendering functions
 * Handles: character select, dialogue, battle, game over
 */

const FONT_FAMILY = '"Microsoft YaHei", "SimHei", "simsun", sans-serif';

// ===================== CHARACTER SELECT =====================
const SelectScene = {
    selectedIndex: -1, // 0=reimu, 1=marisa

    reset() {
        this.selectedIndex = -1;
    },

    handleClick(mx, my) {
        // Check if clicking on reimu portrait area (left half)
        if (mx < 640 && mx > 80 && my > 100 && my < 620) {
            this.selectedIndex = 0;
        }
        // Check if clicking on marisa portrait area (right half)
        if (mx >= 640 && mx < 1200 && my > 100 && my < 620) {
            this.selectedIndex = 1;
        }
        // Check if clicking Start button (only when selected)
        if (this.selectedIndex >= 0) {
            const btnW = 280, btnH = 56;
            const btnX = 1280 / 2 - btnW / 2;
            const btnY = 720 - 90;
            if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
                Game.playerChar = this.selectedIndex === 0 ? 'reimu' : 'marisa';
                Game.aiChar = this.selectedIndex === 0 ? 'marisa' : 'reimu';
                Game.state = 'dialogue';
                DialogueScene.reset();
            }
        }
    },

    handleKey(key) {
        if (key === '1') this.selectedIndex = 0;
        if (key === '2') this.selectedIndex = 1;
        if ((key === 'Enter' || key === ' ') && this.selectedIndex >= 0) {
            Game.playerChar = this.selectedIndex === 0 ? 'reimu' : 'marisa';
            Game.aiChar = this.selectedIndex === 0 ? 'marisa' : 'reimu';
            Game.state = 'dialogue';
            DialogueScene.reset();
        }
    },

    draw(ctx) {
        const W = 1280, H = 720;

        // Background - dramatic dark gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.5, '#1a0a2e');
        bgGrad.addColorStop(1, '#0a1a2e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Decorative particles / stars
        ctx.save();
        for (let i = 0; i < 60; i++) {
            const sx = (Math.sin(i * 7.3 + Date.now() * 0.0003) * 0.5 + 0.5) * W;
            const sy = (Math.cos(i * 5.1 + Date.now() * 0.0002) * 0.5 + 0.5) * H;
            const sr = 1 + Math.sin(i * 3.7 + Date.now() * 0.002) * 0.8;
            const alpha = 0.3 + Math.sin(i * 2.1 + Date.now() * 0.003) * 0.2;
            ctx.fillStyle = `rgba(255, 255, 220, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.5, sr), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Title
        ctx.save();
        ctx.font = `bold 52px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title glow
        ctx.shadowColor = '#ff6b9d';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('东方横版战斗 Demo', W / 2, 55);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.font = `20px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('选择你的角色  Select Your Character', W / 2, 90);
        ctx.restore();

        // Character panels
        const panelW = 480, panelH = 480;
        const reimuX = W / 4 - panelW / 2;
        const marisaX = 3 * W / 4 - panelW / 2;
        const panelY = 120;

        // Draw panels
        this._drawCharPanel(ctx, reimuX, panelY, panelW, panelH, 'reimu', '灵梦 (Reimu)', this.selectedIndex === 0, '#ff4466');
        this._drawCharPanel(ctx, marisaX, panelY, panelW, panelH, 'marisa', '魔理沙 (Marisa)', this.selectedIndex === 1, '#ffcc00');

        // Instructions
        ctx.save();
        ctx.font = `18px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('点击角色或按 1/2 选择  |  Enter 确认开始', W / 2, H - 30);
        ctx.restore();

        // Start button if selected
        if (this.selectedIndex >= 0) {
            ctx.save();
            const btnW = 280, btnH = 56;
            const btnX = W / 2 - btnW / 2;
            const btnY = H - 90;

            // Button glow
            ctx.shadowColor = '#ff6b9d';
            ctx.shadowBlur = 20;

            const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
            btnGrad.addColorStop(0, '#ff4466');
            btnGrad.addColorStop(1, '#ff6b9d');
            ctx.fillStyle = btnGrad;

            // Rounded rect
            const r = 12;
            ctx.beginPath();
            ctx.moveTo(btnX + r, btnY);
            ctx.lineTo(btnX + btnW - r, btnY);
            ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + r);
            ctx.lineTo(btnX + btnW, btnY + btnH - r);
            ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH);
            ctx.lineTo(btnX + r, btnY + btnH);
            ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - r);
            ctx.lineTo(btnX, btnY + r);
            ctx.quadraticCurveTo(btnX, btnY, btnX + r, btnY);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.font = `bold 24px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('开始战斗 START', btnX + btnW / 2, btnY + btnH / 2);
            ctx.restore();
        }
    },

    _drawCharPanel(ctx, x, y, w, h, charName, displayName, selected, accentColor) {
        ctx.save();

        // Panel background
        const panelGrad = ctx.createLinearGradient(x, y, x, y + h);
        panelGrad.addColorStop(0, 'rgba(30, 20, 50, 0.8)');
        panelGrad.addColorStop(1, 'rgba(20, 15, 40, 0.9)');
        ctx.fillStyle = panelGrad;
        ctx.beginPath();
        const r = 16;
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

        // Portrait
        const portrait = Assets.portraits[charName].normal;
        if (portrait) {
            const maxH = 360;
            const scale = maxH / portrait.height;
            const pw = portrait.width * scale;
            const ph = maxH;
            const px = x + (w - pw) / 2;
            const py = y + 20;

            if (selected) {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = 0.7;
            }
            ctx.drawImage(portrait, px, py, pw, ph);
            ctx.globalAlpha = 1;
        }

        // Name
        ctx.font = `bold 26px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = selected ? accentColor : 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(displayName, x + w / 2, y + h - 50);

        // Key hint
        ctx.font = `16px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(charName === 'reimu' ? '按 1 选择' : '按 2 选择', x + w / 2, y + h - 22);

        ctx.restore();
    }
};

// ===================== DIALOGUE SCENE =====================
const DialogueScene = {
    lines: [
        { speaker: 'reimu', expr: 'normal', text: '魔理沙，你又把我的东西拿走了吗？' },
        { speaker: 'marisa', expr: 'happy', text: '只是借用一下啦，别这么小气。' },
        { speaker: 'reimu', expr: 'angry', text: '这次一定要让你还回来！' },
        { speaker: 'marisa', expr: 'happy', text: '那就来试试看吧！' },
        { speaker: 'reimu', expr: 'normal', text: '准备战斗！' }
    ],
    currentLine: 0,
    blinkTimer: 0,

    reset() {
        this.currentLine = 0;
        this.blinkTimer = 0;
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
        if (key === 'Enter' || key === ' ') {
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

        // Draw portraits
        this._drawPortrait(ctx, 'reimu', 30, 40, line.speaker === 'reimu', line.speaker === 'reimu' ? line.expr : 'normal', 500);
        this._drawPortrait(ctx, 'marisa', W - 430, 40, line.speaker === 'marisa', line.speaker === 'marisa' ? line.expr : 'normal', 500);

        // Dialogue box
        const boxY = H - 200;
        const boxH = 170;
        const boxMargin = 40;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
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

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Speaker name
        const isReimu = line.speaker === 'reimu';
        const speakerColor = isReimu ? '#ff6b8a' : '#ffcc00';
        const speakerName = isReimu ? '灵梦' : '魔理沙';

        ctx.font = `bold 28px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = speakerColor;
        ctx.fillText(speakerName, boxMargin + 30, boxY + 20);

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
            ctx.shadowBlur = 30;
        }

        ctx.drawImage(portrait, x, y, pw, ph);
        ctx.restore();
    }
};

// ===================== BATTLE SCENE =====================
const BattleScene = {
    init() {
        const groundY = 580;
        // Player starts on left, AI on right
        Game.player = new Fighter(Game.playerChar, 350, groundY, 'right', false);
        Game.enemy = new Fighter(Game.aiChar, 930, groundY, 'left', true);
        Game.winner = null;
    },

    update(dt) {
        if (!Game.player || !Game.enemy) return;

        // Read player input
        const keys = Game.keys;
        const player = Game.player;
        const enemy = Game.enemy;

        player.update(dt, keys, Game.attackPressed, Game.jumpPressed, enemy);
        enemy.update(dt, {}, false, false, player);

        // Hit detection
        checkHit(player, enemy);
        checkHit(enemy, player);

        // Collision
        resolveCollision(player, enemy);

        // Check game over
        if (player.state === 'dead' || enemy.state === 'dead') {
            if (!Game.winner) {
                Game.winner = player.state === 'dead' ? enemy.name : player.name;
                // Small delay before game over
                setTimeout(() => {
                    if (Game.state === 'battle') {
                        Game.state = 'gameover';
                    }
                }, 1500);
            }
        }
    },

    draw(ctx) {
        const W = 1280, H = 720;
        const groundY = 580;

        // Sky background
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, '#0a0a2e');
        skyGrad.addColorStop(0.3, '#1a1050');
        skyGrad.addColorStop(0.6, '#3a2a6a');
        skyGrad.addColorStop(1, '#5a4a8a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, groundY);

        // Ground
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
        groundGrad.addColorStop(0, '#4a6a2a');
        groundGrad.addColorStop(0.3, '#3a5a1a');
        groundGrad.addColorStop(1, '#2a3a0a');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, W, H - groundY);

        // Ground line
        ctx.strokeStyle = 'rgba(100, 180, 60, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(W, groundY);
        ctx.stroke();

        // Draw fighters
        if (Game.player) Game.player.draw(ctx);
        if (Game.enemy) Game.enemy.draw(ctx);

        // HP bars
        this._drawHPBar(ctx, Game.player, 30, 20, true);
        this._drawHPBar(ctx, Game.enemy, W - 350, 20, false);

        // Controls hint
        ctx.save();
        ctx.font = `15px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('A/D: Move   W/Space: Jump   J: Attack   R: Restart', W / 2, H - 12);
        ctx.restore();
    },

    _drawHPBar(ctx, fighter, x, y, isLeft) {
        if (!fighter) return;
        const barW = 300, barH = 28;
        const maxHP = 100;
        const hpRatio = fighter.hp / maxHP;

        // Name
        const displayName = fighter.name === 'reimu' ? '灵梦 Reimu' : '魔理沙 Marisa';
        const nameColor = fighter.name === 'reimu' ? '#ff6b8a' : '#ffcc00';

        ctx.save();
        ctx.font = `bold 18px ${FONT_FAMILY}`;
        ctx.textAlign = isLeft ? 'left' : 'right';
        ctx.fillStyle = nameColor;
        const nameX = isLeft ? x : x + barW;
        ctx.fillText(displayName, nameX, y);

        // Bar background
        const barY = y + 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        const r = 4;
        ctx.moveTo(x + r, barY);
        ctx.lineTo(x + barW - r, barY);
        ctx.quadraticCurveTo(x + barW, barY, x + barW, barY + r);
        ctx.lineTo(x + barW, barY + barH - r);
        ctx.quadraticCurveTo(x + barW, barY + barH, x + barW - r, barY + barH);
        ctx.lineTo(x + r, barY + barH);
        ctx.quadraticCurveTo(x, barY + barH, x, barY + barH - r);
        ctx.lineTo(x, barY + r);
        ctx.quadraticCurveTo(x, barY, x + r, barY);
        ctx.closePath();
        ctx.fill();

        // HP bar fill
        let barColor;
        if (hpRatio > 0.5) barColor = '#4ade80';
        else if (hpRatio > 0.25) barColor = '#fb923c';
        else barColor = '#ef4444';

        const fillW = Math.max(0, barW * hpRatio);
        ctx.fillStyle = barColor;
        ctx.beginPath();
        ctx.moveTo(x + r, barY);
        ctx.lineTo(x + fillW - r, barY);
        ctx.quadraticCurveTo(x + fillW, barY, x + fillW, barY + r);
        ctx.lineTo(x + fillW, barY + barH - r);
        ctx.quadraticCurveTo(x + fillW, barY + barH, x + fillW - r, barY + barH);
        ctx.lineTo(x + r, barY + barH);
        ctx.quadraticCurveTo(x, barY + barH, x, barY + barH - r);
        ctx.lineTo(x, barY + r);
        ctx.quadraticCurveTo(x, barY, x + r, barY);
        ctx.closePath();
        ctx.fill();

        // HP text
        ctx.font = `bold 16px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${fighter.hp}/${maxHP}`, x + barW / 2, barY + barH - 8);

        ctx.restore();
    }
};

// ===================== GAME OVER SCENE =====================
const GameOverScene = {
    draw(ctx) {
        const W = 1280, H = 720;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, W, H);

        // Winner text
        const winner = Game.winner;
        const displayName = winner === 'reimu' ? '灵梦 (Reimu)' : '魔理沙 (Marisa)';
        const accentColor = winner === 'reimu' ? '#ff6b8a' : '#ffcc00';

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
