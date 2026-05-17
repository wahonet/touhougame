/**
 * Bullet - Projectile entity for boss and enemy ranged attacks
 * Used in PvE mode for boss bullet patterns (danmaku)
 */
export class Bullet {
    /**
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} vx - Velocity X per frame
     * @param {number} vy - Velocity Y per frame
     * @param {object} opts - { radius, color, damage, lifetime }
     */
    constructor(x, y, vx, vy, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = opts.radius || 6;
        this.color = opts.color || '#ff4444';
        this.damage = opts.damage || 20;
        this.lifetime = opts.lifetime || 3;
        this.age = 0;
        this.active = true;
        this.glowColor = opts.glowColor || this.color;
    }

    getHitbox() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            w: this.radius * 2,
            h: this.radius * 2
        };
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.age += dt;
        if (this.age > this.lifetime) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner bright core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Create a spread pattern of bullets (fan shape)
 * @param {number} x - Origin X
 * @param {number} y - Origin Y
 * @param {number} angle - Center angle in radians (0 = right)
 * @param {number} count - Number of bullets
 * @param {number} spread - Total spread angle in radians
 * @param {number} speed - Bullet speed
 * @param {object} opts - Bullet options
 */
export function createSpreadBullets(x, y, angle, count, spread, speed, opts = {}) {
    const bullets = [];
    const startAngle = angle - spread / 2;
    for (let i = 0; i < count; i++) {
        const a = count === 1 ? angle : startAngle + (spread / (count - 1)) * i;
        bullets.push(new Bullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, opts));
    }
    return bullets;
}

/**
 * Create a ring pattern of bullets (360 degrees)
 * @param {number} x - Origin X
 * @param {number} y - Origin Y
 * @param {number} count - Number of bullets
 * @param {number} speed - Bullet speed
 * @param {object} opts - Bullet options
 */
export function createRingBullets(x, y, count, speed, opts = {}) {
    const bullets = [];
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        bullets.push(new Bullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, opts));
    }
    return bullets;
}

/**
 * Create spiral bullet pattern (danmaku style)
 * @param {number} x - Origin X
 * @param {number} y - Origin Y
 * @param {number} arms - Number of spiral arms
 * @param {number} baseAngle - Starting angle offset
 * @param {number} speed - Bullet speed
 * @param {object} opts - Bullet options
 */
export function createSpiralBullets(x, y, arms, baseAngle, speed, opts = {}) {
    const bullets = [];
    for (let i = 0; i < arms; i++) {
        const a = baseAngle + (i / arms) * Math.PI * 2;
        bullets.push(new Bullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, opts));
    }
    return bullets;
}
