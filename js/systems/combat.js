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
        const bonus = attacker.nextAttackBonus || 0;
        const damage = (attacker.attackDamage || 10) + bonus;
        attacker.nextAttackBonus = 0;
        target.damage(damage);
        AudioManager.play('sfx_hit');
        AudioManager.play('sfx_damage', 0.3);

        emitHitImpact({
            x: target.cx,
            y: target.cy - (target.hurtboxH || 50) / 2,
            color: '#ffcc44',
            shake: damage * 0.12,
            maxShake: 12
        });
    }
}
