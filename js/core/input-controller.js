import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../config/game-config.js';
import { Game } from './game-state.js';

const keyState = {
    a: false,
    d: false,
    w: false,
    space: false,
    j: false,
    s: false
};

export function setupInput({ canvas, selectScene, dialogueScene, resetGame, audioManager }) {
    document.addEventListener('keydown', event => {
        const key = event.key.toLowerCase();

        if (key === 'a') keyState.a = true;
        if (key === 'd') keyState.d = true;
        if (key === 'w') keyState.w = true;
        if (key === 's') keyState.s = true;
        if (key === ' ') {
            keyState.space = true;
            event.preventDefault();
        }
        if (key === 'j') keyState.j = true;

        if (key === 'j') Game.attackPressed = true;
        if (key === 'w' || key === ' ') Game.jumpPressed = true;

        if (key === '1') Game.skillPressed[1] = true;
        if (key === '2') Game.skillPressed[2] = true;
        if (key === '3') Game.skillPressed[3] = true;
        if (key === '4') Game.skillPressed[4] = true;

        if (Game.state === 'select') {
            selectScene.handleKey(key);
        } else if (Game.state === 'dialogue') {
            dialogueScene.handleKey(key);
        } else if ((Game.state === 'gameover' || Game.state === 'battle') && key === 'r') {
            resetGame();
        }

        if (key === 'm') {
            audioManager.toggleMute();
        }
    });

    document.addEventListener('keyup', event => {
        const key = event.key.toLowerCase();

        if (key === 'a') keyState.a = false;
        if (key === 'd') keyState.d = false;
        if (key === 'w') keyState.w = false;
        if (key === 's') keyState.s = false;
        if (key === ' ') keyState.space = false;
        if (key === 'j') keyState.j = false;
    });

    canvas.addEventListener('click', event => {
        if (Game.state !== 'select') return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = SCREEN_WIDTH / rect.width;
        const scaleY = SCREEN_HEIGHT / rect.height;
        const mx = (event.clientX - rect.left) * scaleX;
        const my = (event.clientY - rect.top) * scaleY;

        selectScene.handleClick(mx, my);
    });
}

export function readHeldKeys() {
    return { ...keyState };
}
