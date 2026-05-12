import { FONT_FAMILY, SCREEN_HEIGHT, SCREEN_WIDTH } from '../config/game-config.js';

export function drawLoadingScreen(ctx, progress) {
    const W = SCREEN_WIDTH;
    const H = SCREEN_HEIGHT;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.font = `bold 36px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Loading... 载入中', W / 2, H / 2 - 30);

    const barW = 400;
    const barH = 12;
    const barX = (W - barW) / 2;
    const barY = H / 2 + 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.restore();
}
