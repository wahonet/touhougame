let hooks = {
    addShake: null,
    spawnHitParticles: null
};

export function registerBattleHooks(nextHooks) {
    hooks = {
        addShake: nextHooks.addShake || null,
        spawnHitParticles: nextHooks.spawnHitParticles || null
    };
}

export function clearBattleHooks() {
    hooks = {
        addShake: null,
        spawnHitParticles: null
    };
}

export function emitHitImpact({ x, y, color = '#ffcc44', shake = 0, maxShake = 15 }) {
    if (hooks.addShake && shake > 0) {
        hooks.addShake(shake, maxShake);
    }

    if (hooks.spawnHitParticles) {
        hooks.spawnHitParticles(x, y, color);
    }
}
