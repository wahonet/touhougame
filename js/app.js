/**
 * main.js - Application composition, game loop, and state transitions.
 */
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './config/game-config.js';
import { AudioManager } from './core/audio-manager.js';
import { preloadAssets } from './core/asset-loader.js';
import { Game, resetBattleState, resetOneShotInput } from './core/game-state.js';
import { readHeldKeys, setupInput } from './core/input-controller.js';
import { drawLoadingScreen } from './render/loading-screen.js';
import { BattleScene, DialogueScene, GameOverScene, SelectScene } from './scenes/index.js';

function resetGame() {
    resetBattleState();
    Game.state = 'select';
    SelectScene.reset();
    AudioManager.playBGM('bgm_select');
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - Game.lastTime) / 1000, 0.05);
    Game.lastTime = timestamp;

    const ctx = Game.ctx;
    Game.keys = readHeldKeys();

    switch (Game.state) {
        case 'loading':
            drawLoadingScreen(ctx, 0.5);
            break;

        case 'select':
            SelectScene.draw(ctx);
            AudioManager.playBGM('bgm_select');
            break;

        case 'dialogue':
            DialogueScene.draw(ctx, dt);
            break;

        case 'battle':
            BattleScene.update(dt);
            BattleScene.draw(ctx);
            break;

        case 'gameover':
            BattleScene.draw(ctx);
            GameOverScene.draw(ctx);
            break;
    }

    resetOneShotInput();
    requestAnimationFrame(gameLoop);
}

async function init() {
    Game.canvas = document.getElementById('gameCanvas');
    Game.ctx = Game.canvas.getContext('2d');
    Game.canvas.width = SCREEN_WIDTH;
    Game.canvas.height = SCREEN_HEIGHT;

    setupInput({
        canvas: Game.canvas,
        selectScene: SelectScene,
        dialogueScene: DialogueScene,
        resetGame,
        audioManager: AudioManager
    });

    drawLoadingScreen(Game.ctx, 0);

    await preloadAssets();
    await AudioManager.init();
    AudioManager.resumeOnFirstGesture();

    Game.state = 'select';
    Game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function start() {
    if (window.__VB_TOUHOU_APP_STARTED__) return;
    window.__VB_TOUHOU_APP_STARTED__ = true;
    init();
}

window.addEventListener('DOMContentLoaded', start);
