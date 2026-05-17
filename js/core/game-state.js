import { DEBUG_MODE } from '../config/game-config.js';

export function createCamera() {
    return { x: 0, targetX: 0 };
}

export const Game = {
    state: 'loading',
    canvas: null,
    ctx: null,
    playerChar: null,
    aiChar: null,
    gameMode: 'pvp', // 'pvp' or 'pve'
    pveLevelWidth: 8000, // Used by Fighter for PvE boundary checks
    currentLevel: 0, // Level index for PvE mode
    player: null,
    enemy: null,
    winner: null,
    keys: {},
    attackPressed: false,
    jumpPressed: false,
    skillPressed: { 1: false, 2: false, 3: false, 4: false },
    debugMode: DEBUG_MODE,
    lastTime: 0,
    camera: createCamera()
};

export function resetBattleState() {
    Game.player = null;
    Game.enemy = null;
    Game.winner = null;
    Game.camera = createCamera();
}

export function resetOneShotInput() {
    Game.attackPressed = false;
    Game.jumpPressed = false;
    Game.skillPressed = { 1: false, 2: false, 3: false, 4: false };
}
