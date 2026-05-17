/**
 * Pickup - Collectible items in PvE mode
 * Types: hp (health restore), cd (cooldown reset), power (damage boost)
 */
import { AudioManager } from '../core/audio-manager.js';
import { GROUND_Y } from '../data/stage-data.js';

const PICKUP_STATS = {
    hp:    { width: 28, height: 28, bobSpeed: 3, glowColor: '#44ff66' },
    cd:    { width: 28, height: 28, bobSpeed: 2.5, glowColor: '#66ccff' },
    power: { width: 28, height: 28, bobSpeed: 3.5, glowColor: '#ffaa44' },
    bomb:  { width: 32, height: 32, bobSpeed: 2, glowColor: '#ff4466' }
};

export class Pickup {
    /**
     * @param {string} type - 'hp', 'cd', 'power', 'bomb'
     * @param {number} x - World X position
     * @param {number} y - World Y position ('ground' for ground level)
     */
    constructor(type, x, y) {
        const stats = PICKUP_STATS[type];
        this.type = type;
        this.x = x;
        this.y = y === 'ground' ? GROUND_Y - stats.height / 2 : y;
        this.width = stats.width;
        this.height = stats.height;
        this.baseY = this.y;
        this.bobSpeed = stats.bobSpeed;
        this.glowColor = stats.glowColor;
        this.collected = false;
        this.spawnTimer = 0;
        this.fadeTimer = 0;

        // Canvas for sprite (programmatic pixel art)
        this._sprite = this._generateSprite(type);
    }

    getHurtbox() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            w: this.width,
            h: this.height
        };
    }

    update(dt) {
        this.spawnTimer += dt;

        // Bob up and down
        this.y = this.baseY + Math.sin(this.spawnTimer * this.bobSpeed) * 6;

        // Auto-despawn after 15 seconds
        if (this.spawnTimer > 15) {
            this.fadeTimer += dt;
            if (this.fadeTimer > 1) {
                this.collected = true; // Remove
            }
        }
    }

    /**
     * Apply pickup effect to player
     * @param {Fighter} player
     * @param {object} context - { enemies: Enemy[] }
     */
    collect(player, context) {
        if (this.collected) return;
        this.collected = true;

        if (typeof AudioManager !== 'undefined') AudioManager.play('sfx_pickup');

        switch (this.type) {
            case 'hp':
                player.hp = Math.min(player.hp + 300, player.maxHp || 1000);
                break;
            case 'cd':
                for (const skill of player.skills) {
                    skill.cooldown = 0;
                }
                break;
            case 'power':
                // Temporary damage boost stored as a timer on the player
                player._powerBoost = 10; // 10 seconds
                player._powerMultiplier = 2; // 2x damage
                break;
            case 'bomb':
                // Damage all enemies on screen
                if (context && context.enemies) {
                    for (const enemy of context.enemies) {
                        if (enemy.state !== 'dead') {
                            enemy.damage(200);
                        }
                    }
                }
                break;
        }
    }

    draw(ctx) {
        if (this.collected) return;

        const alpha = this.fadeTimer > 0 ? Math.max(0, 1 - this.fadeTimer) : 1;
        ctx.save();
        ctx.globalAlpha = alpha;

        const x = this.x - this.width / 2;
        const y = this.y - this.height / 2;

        // Glow
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 12 + Math.sin(this.spawnTimer * 4) * 4;

        // Background circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        // Sprite
        if (this._sprite) {
            ctx.drawImage(this._sprite, x, y, this.width, this.height);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _generateSprite(type) {
        const s = 3; // pixel scale
        const w = 28, h = 28;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        const px = (x, y, pw, ph, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, pw, ph);
        };

        switch (type) {
            case 'hp':
                // Green cross
                px(ctx, 5 * s, 2 * s, 2 * s, 6 * s, '#44ff66');
                px(ctx, 3 * s, 4 * s, 6 * s, 2 * s, '#44ff66');
                px(ctx, 5 * s, 3 * s, 2 * s, 4 * s, '#88ffaa');
                break;
            case 'cd':
                // Blue clock
                px(ctx, 3 * s, 3 * s, 6 * s, 6 * s, '#4488ff');
                px(ctx, 4 * s, 2 * s, 4 * s, s, '#4488ff');
                px(ctx, 4 * s, 8 * s, 4 * s, s, '#4488ff');
                px(ctx, 2 * s, 4 * s, s, 4 * s, '#4488ff');
                px(ctx, 9 * s, 4 * s, s, 4 * s, '#4488ff');
                // Hands
                px(ctx, 5 * s, 4 * s, s, 2 * s, '#ffffff');
                px(ctx, 5 * s, 5 * s, 2 * s, s, '#ffffff');
                break;
            case 'power':
                // Orange star
                px(ctx, 4 * s, 2 * s, 3 * s, s, '#ffaa44');
                px(ctx, 3 * s, 3 * s, 5 * s, s, '#ffaa44');
                px(ctx, 2 * s, 4 * s, 7 * s, s, '#ffcc66');
                px(ctx, 3 * s, 5 * s, 5 * s, s, '#ffaa44');
                px(ctx, 4 * s, 6 * s, 3 * s, s, '#ff8822');
                break;
            case 'bomb':
                // Red bomb
                px(ctx, 4 * s, 4 * s, 4 * s, 4 * s, '#ff4444');
                px(ctx, 3 * s, 5 * s, 6 * s, 2 * s, '#ff4444');
                px(ctx, 5 * s, 3 * s, 2 * s, s, '#ffaa00');
                px(ctx, 6 * s, 2 * s, s, s, '#ffff44');
                break;
        }

        return canvas;
    }
}
