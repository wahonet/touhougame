export function rectsOverlap(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export function resolveCollision(f1, f2) {
    const verticalDist = Math.abs(f1.cy - f2.cy);
    if (verticalDist > 60) return;

    const dist = Math.abs(f1.cx - f2.cx);
    if (dist < 40) {
        const push = (40 - dist) / 2;
        if (f1.cx < f2.cx) {
            f1.cx -= push;
            f2.cx += push;
        } else {
            f1.cx += push;
            f2.cx -= push;
        }
    }
}
