/**
 * scenes.js - All scene rendering functions
 * Handles: character select, dialogue, battle, game over
 */

const FONT_FAMILY = '"Microsoft YaHei", "SimHei", "simsun", sans-serif';

// ===================== PLATFORM LAYOUT =====================
const PLATFORM_LAYOUT = [
    // Left section
    { x: 200,  y: 460, w: 192, h: 48, type: 'large' },
    { x: 480,  y: 370, w: 128, h: 36, type: 'small' },
    { x: 750,  y: 440, w: 192, h: 48, type: 'large' },
    { x: 580,  y: 280, w: 128, h: 36, type: 'small' },
    // Center-left
    { x: 1050, y: 400, w: 192, h: 48, type: 'large' },
    { x: 1250, y: 310, w: 128, h: 36, type: 'small' },
    { x: 900,  y: 250, w: 192, h: 48, type: 'large' },
    // Center
    { x: 1500, y: 440, w: 192, h: 48, type: 'large' },
    { x: 1700, y: 340, w: 192, h: 48, type: 'large' },
    { x: 1450, y: 240, w: 128, h: 36, type: 'small' },
    // Center-right
    { x: 1950, y: 390, w: 128, h: 36, type: 'small' },
    { x: 2150, y: 300, w: 192, h: 48, type: 'large' },
    { x: 2050, y: 210, w: 128, h: 36, type: 'small' },
    // Right section
    { x: 2450, y: 440, w: 192, h: 48, type: 'large' },
    { x: 2700, y: 350, w: 128, h: 36, type: 'small' },
    { x: 2900, y: 460, w: 192, h: 48, type: 'large' }
];

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
        if ((key === 'enter' || key === ' ') && this.selectedIndex >= 0) {
            Game.playerChar = this.selectedIndex === 0 ? 'reimu' : 'marisa';
            Game.aiChar = this.selectedIndex === 0 ? 'marisa' : 'reimu';
            Game.state = 'dialogue';
            DialogueScene.reset();
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
        for (let i = 0; i < 30; i++) {
            const px = (Math.sin(i * 4.7 + Date.now() * 0.001) * 0.5 + 0.5) * W;
            const py = (Math.cos(i * 3.2 + Date.now() * 0.0008) * 0.5 + 0.5) * H;
            const alpha = 0.2 + Math.sin(i * 2.3 + Date.now() * 0.002) * 0.15;
            ctx.fillStyle = `rgba(255, 180, 220, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
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
            ctx.font = `bold 28px ${FONT_FAMILY}`;
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
            ctx.shadowBlur = 20;
        }

        ctx.drawImage(portrait, x, y, pw, ph);
        ctx.restore();
    }
};

// ===================== BATTLE SCENE =====================
const BattleScene = {
    platforms: [],
    pickups: [],
    pickupPopups: [],
    pickupSpawnTimer: 5,
    parallaxStars: [],
    mountainSeed: 0,

    init() {
        const groundY = 580;
        // Player starts on left, AI on right (world coordinates)
        Game.player = new Fighter(Game.playerChar, 400, groundY, 'right', false);
        Game.enemy = new Fighter(Game.aiChar, 2800, groundY, 'left', true);
        Game.winner = null;

        // Reset camera
        Game.camera = { x: 0, targetX: 0 };

        // Build platforms
        this.platforms = PLATFORM_LAYOUT.map(p => ({
            x: p.x, y: p.y, w: p.w, h: p.h, type: p.type
        }));

        // Reset pickups
        this.pickups = [];
        this.pickupPopups = [];
        this.pickupSpawnTimer = 5;

        // Generate parallax stars
        this.parallaxStars = [];
        for (let i = 0; i < 120; i++) {
            this.parallaxStars.push({
                x: Math.random() * ARENA_WIDTH * 2,
                y: Math.random() * 450,
                size: 0.5 + Math.random() * 2,
                brightness: 0.2 + Math.random() * 0.6,
                twinkleSpeed: 0.001 + Math.random() * 0.004
            });
        }
        this.mountainSeed = Math.random() * 1000;
    },

    update(dt) {
        if (!Game.player || !Game.enemy) return;

        const player = Game.player;
        const enemy = Game.enemy;

        // Update camera
        const midX = (player.cx + enemy.cx) / 2;
        Game.camera.targetX = midX - SCREEN_WIDTH / 2;
        Game.camera.x += (Game.camera.targetX - Game.camera.x) * 0.08;
        Game.camera.x = Math.max(0, Math.min(ARENA_WIDTH - SCREEN_WIDTH, Game.camera.x));

        // Update fighters (with platforms and pickups)
        const keys = Game.keys;
        player.update(dt, keys, Game.attackPressed, Game.jumpPressed, Game.skillPressed, enemy, this.platforms, this.pickups);
        enemy.update(dt, {}, false, false, {}, player, this.platforms, this.pickups);

        // Hit detection
        checkHit(player, enemy);
        checkHit(enemy, player);

        // Collision
        resolveCollision(player, enemy);

        // Update pickups
        this._updatePickups(dt);

        // Check game over
        if (player.state === 'dead' || enemy.state === 'dead') {
            if (!Game.winner) {
                Game.winner = player.state !== 'dead' ? player.name : enemy.name;
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
        const W = SCREEN_WIDTH, H = SCREEN_HEIGHT;
        const groundY = 580;
        const cam = Game.camera.x;

        // ========== PARALLAX BACKGROUND ==========

        // Sky gradient (screen-fixed)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, '#050510');
        skyGrad.addColorStop(0.2, '#0a0a2e');
        skyGrad.addColorStop(0.4, '#1a1050');
        skyGrad.addColorStop(0.7, '#2a1a5a');
        skyGrad.addColorStop(1, '#3a2a6a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, groundY);

        // Stars (parallax 0.05)
        ctx.save();
        const starParallax = 0.05;
        for (const star of this.parallaxStars) {
            const sx = star.x - cam * starParallax;
            // Wrap to keep visible
            const wrappedX = ((sx % (W + 100)) + (W + 100)) % (W + 100) - 50;
            const twinkle = star.brightness * (0.6 + Math.sin(Date.now() * star.twinkleSpeed + star.x) * 0.4);
            ctx.fillStyle = `rgba(255, 255, 220, ${twinkle})`;
            ctx.beginPath();
            ctx.arc(wrappedX, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Distant mountains (parallax 0.2)
        ctx.save();
        const mtnParallax = 0.2;
        const mtnOffset = -cam * mtnParallax;
        this._drawMountains(ctx, mtnOffset, groundY, 0.7, 'rgba(15, 10, 30, 0.6)', 120, 0.003);
        this._drawMountains(ctx, mtnOffset * 1.3, groundY, 0.85, 'rgba(20, 15, 40, 0.7)', 90, 0.005);
        ctx.restore();

        // Distant tree silhouettes (parallax 0.35)
        ctx.save();
        const treeParallax = 0.35;
        const treeOffset = -cam * treeParallax;
        this._drawTreeSilhouettes(ctx, treeOffset, groundY);
        ctx.restore();

        // ========== WORLD SPACE (camera translated) ==========
        ctx.save();
        ctx.translate(-cam, 0);

        // Ground tiles across full arena
        this._drawGround(ctx, groundY);

        // Draw platforms
        this._drawPlatforms(ctx);

        // Draw pickups
        this._drawPickups(ctx);

        // Draw fighters
        if (Game.player) Game.player.draw(ctx);
        if (Game.enemy) Game.enemy.draw(ctx);

        // Draw skill effects
        if (Game.player) Game.player.drawSkill(ctx);
        if (Game.enemy) Game.enemy.drawSkill(ctx);

        // Draw pickup popups
        this._drawPickupPopups(ctx);

        ctx.restore();

        // ========== HUD (screen space) ==========

        // HP bars
        this._drawHPBar(ctx, Game.player, 30, 20, true);
        this._drawHPBar(ctx, Game.enemy, W - 350, 20, false);

        // Skill UI (4 boxes per fighter)
        this._drawSkillUI(ctx, Game.player, 30, 58, true);
        this._drawSkillUI(ctx, Game.enemy, W - 250, 58, false);

        // Controls hint
        ctx.save();
        ctx.font = `15px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('A/D: Move   W/Space: Jump   J: Attack   1-4: Skills   R: Restart', W / 2, H - 12);
        ctx.restore();
    },

    // ========== BACKGROUND HELPERS ==========

    _drawMountains(ctx, offset, groundY, heightFactor, color, maxHeight, freq) {
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
    },

    _drawTreeSilhouettes(ctx, offset, groundY) {
        ctx.fillStyle = 'rgba(15, 25, 10, 0.6)';
        for (let i = 0; i < 30; i++) {
            const baseX = (i * 120 + 30) + offset;
            if (baseX < -50 || baseX > SCREEN_WIDTH + 50) continue;
            const treeH = 30 + (Math.sin(i * 3.7 + this.mountainSeed) * 0.5 + 0.5) * 50;
            const treeW = 15 + (Math.sin(i * 5.3 + this.mountainSeed) * 0.5 + 0.5) * 20;

            ctx.beginPath();
            ctx.moveTo(baseX, groundY);
            ctx.lineTo(baseX - treeW, groundY);
            ctx.lineTo(baseX - treeW / 2, groundY - treeH);
            ctx.lineTo(baseX + treeW / 2, groundY - treeH);
            ctx.lineTo(baseX + treeW, groundY);
            ctx.closePath();
            ctx.fill();
        }
    },

    _drawGround(ctx, groundY) {
        // Main ground fill
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, SCREEN_HEIGHT);
        groundGrad.addColorStop(0, '#4a6a2a');
        groundGrad.addColorStop(0.15, '#3a5a1a');
        groundGrad.addColorStop(0.5, '#2a4a10');
        groundGrad.addColorStop(1, '#1a3a08');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, ARENA_WIDTH, SCREEN_HEIGHT - groundY);

        // Ground line with grass color
        ctx.strokeStyle = 'rgba(100, 180, 60, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(ARENA_WIDTH, groundY);
        ctx.stroke();

        // Grass tufts at intervals
        ctx.save();
        ctx.strokeStyle = 'rgba(80, 160, 50, 0.4)';
        ctx.lineWidth = 2;
        for (let gx = 20; gx < ARENA_WIDTH; gx += 40 + Math.sin(gx * 0.1) * 15) {
            const h = 5 + Math.sin(gx * 0.3) * 3;
            ctx.beginPath();
            ctx.moveTo(gx, groundY);
            ctx.lineTo(gx - 3, groundY - h);
            ctx.moveTo(gx, groundY);
            ctx.lineTo(gx + 3, groundY - h - 1);
            ctx.stroke();
        }
        ctx.restore();

        // Subtle grid lines on ground for depth
        ctx.save();
        ctx.strokeStyle = 'rgba(60, 100, 30, 0.15)';
        ctx.lineWidth = 1;
        for (let gy = groundY + 30; gy < SCREEN_HEIGHT; gy += 30) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(ARENA_WIDTH, gy);
            ctx.stroke();
        }
        ctx.restore();
    },

    // ========== PLATFORM HELPERS ==========

    _drawPlatforms(ctx) {
        for (const plat of this.platforms) {
            const asset = plat.type === 'large' ? Assets.platform : Assets.platformSmall;
            if (asset) {
                ctx.drawImage(asset, plat.x, plat.y, plat.w, plat.h);
            } else {
                ctx.save();
                ctx.fillStyle = plat.type === 'large' ? 'rgba(80, 60, 40, 0.8)' : 'rgba(60, 50, 35, 0.8)';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = 'rgba(120, 90, 60, 0.6)';
                ctx.lineWidth = 2;
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.restore();
            }

            // Platform surface highlight
            ctx.save();
            ctx.strokeStyle = 'rgba(150, 120, 80, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(plat.x + 2, plat.y + 2);
            ctx.lineTo(plat.x + plat.w - 2, plat.y + 2);
            ctx.stroke();
            ctx.restore();
        }
    },

    // ========== PICKUP SYSTEM ==========

    _updatePickups(dt) {
        // Spawn timer
        this.pickupSpawnTimer -= dt;
        if (this.pickupSpawnTimer <= 0 && this.pickups.length < 3) {
            this._spawnPickup();
            this.pickupSpawnTimer = 10 + Math.random() * 5; // 10-15 seconds
        }

        // Check collection
        const fighters = [Game.player, Game.enemy];
        for (const fighter of fighters) {
            if (!fighter || fighter.state === 'dead') continue;
            const hurtbox = fighter.getHurtbox();

            for (let i = this.pickups.length - 1; i >= 0; i--) {
                const p = this.pickups[i];
                const pickupRect = { x: p.x, y: p.y, w: p.width, h: p.height };
                if (rectsOverlap(hurtbox, pickupRect)) {
                    this._collectPickup(fighter, p);
                    this.pickups.splice(i, 1);
                }
            }
        }

        // Update popups
        for (let i = this.pickupPopups.length - 1; i >= 0; i--) {
            const popup = this.pickupPopups[i];
            popup.y -= 50 * dt;
            popup.timer -= dt;
            if (popup.timer <= 0) {
                this.pickupPopups.splice(i, 1);
            }
        }
    },

    _spawnPickup() {
        const type = Math.random() < 0.5 ? 'cd' : 'hp';
        const spawnOnGround = Math.random() < 0.3;
        let x, y;

        if (spawnOnGround) {
            x = 200 + Math.random() * (ARENA_WIDTH - 400);
            y = 580 - 32; // Just above ground
        } else {
            const plat = this.platforms[Math.floor(Math.random() * this.platforms.length)];
            x = plat.x + 10 + Math.random() * (plat.w - 52);
            y = plat.y - 36; // Just above platform
        }

        this.pickups.push({
            x: x,
            y: y,
            type: type,
            width: 32,
            height: 32,
            bobOffset: Math.random() * Math.PI * 2,
            spawnTime: Date.now()
        });
    },

    _collectPickup(fighter, pickup) {
        if (pickup.type === 'cd') {
            // Reset all skill cooldowns
            for (const skill of fighter.skills) {
                skill.cooldown = 0;
            }
            this.pickupPopups.push({
                x: pickup.x + 16,
                y: pickup.y,
                text: 'CD Reset!',
                color: '#66ccff',
                timer: 1.5
            });
        } else if (pickup.type === 'hp') {
            const healAmount = Math.round(MAX_HP * 0.2); // 200 HP
            fighter.hp = Math.min(MAX_HP, fighter.hp + healAmount);
            this.pickupPopups.push({
                x: pickup.x + 16,
                y: pickup.y,
                text: `+${healAmount} HP`,
                color: '#66ff88',
                timer: 1.5
            });
        }
    },

    _drawPickups(ctx) {
        for (const p of this.pickups) {
            const bobY = Math.sin(Date.now() * 0.003 + p.bobOffset) * 8;
            const drawX = p.x;
            const drawY = p.y + bobY;

            ctx.save();
            const glowColor = p.type === 'cd' ? 'rgba(100, 180, 255, 0.3)' : 'rgba(100, 255, 130, 0.3)';
            ctx.shadowColor = p.type === 'cd' ? '#66ccff' : '#66ff88';
            ctx.shadowBlur = 15;

            const asset = p.type === 'cd' ? Assets.pickupCd : Assets.pickupHp;
            if (asset) {
                ctx.drawImage(asset, drawX, drawY, p.width, p.height);
            } else {
                if (p.type === 'cd') {
                    ctx.fillStyle = '#4488ff';
                    ctx.beginPath();
                    ctx.moveTo(drawX + 16, drawY);
                    ctx.lineTo(drawX + 32, drawY + 16);
                    ctx.lineTo(drawX + 16, drawY + 32);
                    ctx.lineTo(drawX, drawY + 16);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#88bbff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#44ff66';
                    ctx.beginPath();
                    ctx.arc(drawX + 16, drawY + 16, 14, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(drawX + 13, drawY + 8, 6, 16);
                    ctx.fillRect(drawX + 8, drawY + 13, 16, 6);
                }
            }
            ctx.restore();
        }
    },

    _drawPickupPopups(ctx) {
        for (const popup of this.pickupPopups) {
            const alpha = Math.min(1, popup.timer / 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold 20px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = popup.color;
            ctx.shadowColor = popup.color;
            ctx.shadowBlur = 8;
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        }
    },

    // ========== HP BAR ==========

    _drawHPBar(ctx, fighter, x, y, isLeft) {
        if (!fighter) return;
        const barW = 300, barH = 28;
        const hpRatio = fighter.hp / MAX_HP;

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
        ctx.fillText(`${Math.ceil(fighter.hp)}/${MAX_HP}`, x + barW / 2, barY + barH - 8);

        ctx.restore();
    },

    // ========== SKILL UI (4 boxes) ==========

    _drawSkillUI(ctx, fighter, x, y, isPlayer) {
        if (!fighter) return;

        const boxSize = 48;
        const gap = 6;
        const totalW = boxSize * 4 + gap * 3;

        // Skill icon colors per character
        const reimuColors = ['#cc3333', '#991133', '#6644aa', '#aa77dd'];
        const marisaColors = ['#ddaa00', '#cc8800', '#cccc44', '#88cc44'];
        const colors = fighter.name === 'reimu' ? reimuColors : marisaColors;

        for (let i = 0; i < 4; i++) {
            const skill = fighter.skills[i];
            const bx = isPlayer ? x + i * (boxSize + gap) : x + (3 - i) * (boxSize + gap);
            const by = y;

            const isReady = skill.cooldown <= 0 && !skill.active;
            const isActive = skill.active;

            ctx.save();

            // Box background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            const r = 6;
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + boxSize - r, by);
            ctx.quadraticCurveTo(bx + boxSize, by, bx + boxSize, by + r);
            ctx.lineTo(bx + boxSize, by + boxSize - r);
            ctx.quadraticCurveTo(bx + boxSize, by + boxSize, bx + boxSize - r, by + boxSize);
            ctx.lineTo(bx + r, by + boxSize);
            ctx.quadraticCurveTo(bx, by + boxSize, bx, by + boxSize - r);
            ctx.lineTo(bx, by + r);
            ctx.quadraticCurveTo(bx, by, bx + r, by);
            ctx.closePath();
            ctx.fill();

            // Skill icon color block
            const iconPad = 6;
            ctx.fillStyle = colors[i];
            ctx.globalAlpha = isReady ? 0.8 : 0.3;
            ctx.fillRect(bx + iconPad, by + iconPad, boxSize - iconPad * 2, boxSize - iconPad * 2 - 12);
            ctx.globalAlpha = 1;

            if (isActive) {
                // Active: pulsing border
                const pulse = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
                ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Skill name (truncated)
                ctx.font = `bold 9px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(skill.name.substring(0, 3), bx + boxSize / 2, by + boxSize - 8);
            } else if (isReady) {
                // Ready: bright glowing border
                ctx.strokeStyle = colors[i];
                ctx.lineWidth = 2;
                ctx.shadowColor = colors[i];
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Skill name (truncated)
                ctx.font = `bold 9px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = colors[i];
                ctx.fillText(skill.name.substring(0, 3), bx + boxSize / 2, by + boxSize - 8);
            } else {
                // On cooldown: darkened overlay with timer
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Cooldown fill
                const cdRatio = skill.cooldown / skill.maxCooldown;
                const cdFillH = (boxSize - 12) * cdRatio;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(bx + iconPad, by + iconPad, boxSize - iconPad * 2, cdFillH);

                // Cooldown text
                ctx.font = `bold 14px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(`${skill.cooldown.toFixed(1)}s`, bx + boxSize / 2, by + boxSize / 2 - 2);

                // Dimmed skill name
                ctx.font = `bold 9px ${FONT_FAMILY}`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillText(skill.name.substring(0, 3), bx + boxSize / 2, by + boxSize - 8);
            }

            // Key number badge (player only)
            if (isPlayer) {
                const keyNum = i + 1;
                const badgeSize = 16;
                const badgeX = bx + boxSize - badgeSize - 2;
                const badgeY = by + 2;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
                ctx.font = `bold 11px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isReady ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
                ctx.fillText(`${keyNum}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2);
            }

            ctx.restore();
        }
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
