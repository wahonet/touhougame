/**
 * Anim - Sprite animation controller
 * Manages frame-by-frame animation with configurable duration and looping.
 */
export class Anim {
    /**
     * @param {Array<HTMLCanvasElement|HTMLImageElement>} frames - Array of sprite surfaces
     * @param {number} frameDuration - Seconds per frame (default 0.1)
     * @param {boolean} loop - Whether animation loops (default true)
     */
    constructor(frames, frameDuration = 0.1, loop = true) {
        this.frames = frames;
        this.frameDuration = frameDuration;
        this.loop = loop;
        this.currentIndex = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    /**
     * Advance animation by delta time
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this.finished) return;

        this.elapsed += dt;
        while (this.elapsed >= this.frameDuration) {
            this.elapsed -= this.frameDuration;
            this.currentIndex++;
            if (this.currentIndex >= this.frames.length) {
                if (this.loop) {
                    this.currentIndex = 0;
                } else {
                    this.currentIndex = this.frames.length - 1;
                    this.finished = true;
                    return;
                }
            }
        }
    }

    /** Reset animation to first frame */
    reset() {
        this.currentIndex = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    /** @returns {HTMLCanvasElement|HTMLImageElement} Current frame surface */
    get currentFrame() {
        return this.frames[this.currentIndex];
    }

    /** @returns {boolean} Whether animation has finished (non-looping only) */
    get isFinished() {
        return this.finished;
    }

    /**
     * Whether current frame is a hit/damage frame (indices 1-2 for 4-frame attacks)
     * @returns {boolean}
     */
    get isHitFrame() {
        return this.currentIndex >= 1 && this.currentIndex <= 2;
    }
}
