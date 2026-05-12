import { AudioManager } from '../core/audio-manager.js';
import { emitHitImpact } from '../core/battle-events.js';
import { rectsOverlap } from './collision.js';

export function checkHit(attacker, target) {
    if (attacker.state !== 'attack' || attacker._atkHit) return;
    if (target.state === 'dead') return;
    if (!attacker.currentAnim.isHitFrame) return;

    const hitbox = attacker.getHitbox();
    const hurtbox = target.getHurtbox();
    if (!hitbox) return;

    if (rectsOverlap(hitbox, hurtbox)) {
        attacker._atkHit = true;
        target.damage(10);
        AudioManager.play('sfx_hit');
        AudioManager.play('sfx_damage', 0.3);

        emitHitImpact({
            x: target.cx,
            y: target.cy - (target.hurtboxH || 50) / 2,
            color: '#ffcc44',
            shake: 10 * 0.12,
            maxShake: 12
        });
    }
}
