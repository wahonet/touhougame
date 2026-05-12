import { SFX_FILES } from '../data/asset-manifest.js';

export const AudioManager = {
    ctx: null,
    buffers: {},
    bgm: null,
    bgmVolume: 0.3,
    sfxVolume: 0.5,
    muted: false,

    async init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported', error);
            return;
        }

        for (const name of SFX_FILES) {
            try {
                const resp = await fetch(`audio/${name}.wav`);
                const arrayBuf = await resp.arrayBuffer();
                this.buffers[name] = await this.ctx.decodeAudioData(arrayBuf);
            } catch (error) {
                console.warn(`Failed to load audio: ${name}`, error);
            }
        }
    },

    play(name, volume) {
        if (this.muted || !this.ctx || !this.buffers[name]) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];

        const gain = this.ctx.createGain();
        gain.gain.value = volume !== undefined ? volume : this.sfxVolume;

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
    },

    playBGM(name) {
        if (this.bgm && this.bgm.src && this.bgm.src.includes(name)) {
            if (!this.muted && this.bgm.paused) {
                this.bgm.play().catch(() => {});
            }
            return;
        }

        this.stopBGM();
        const audio = new Audio(`audio/${name}.wav`);
        audio.loop = true;
        audio.volume = this.muted ? 0 : this.bgmVolume;
        audio.play().catch(() => {});
        this.bgm = audio;
    },

    stopBGM() {
        if (!this.bgm) return;

        this.bgm.pause();
        this.bgm.currentTime = 0;
        this.bgm = null;
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this.bgm) {
            this.bgm.volume = this.muted ? 0 : this.bgmVolume;
        }
    },

    resumeOnFirstGesture() {
        document.addEventListener('click', () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }, { once: true });
    }
};
