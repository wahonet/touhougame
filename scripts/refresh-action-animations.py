from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image


CHARACTERS = [
    "reimu",
    "marisa",
    "yuyuko",
    "youmu",
    "sanae",
    "flandre",
    "sakuya",
    "reisen",
    "cirno",
    "yukari",
    "suwako",
    "kaguya",
]

ACTION_DIR = Path("action")
QA_DIR = Path("tmp/animation_refresh/qa")
BACKUP_DIR = Path("tmp/animation_refresh/backup_action")

EDGE_COMPONENT_MAX_RATIO = 0.18
EDGE_COMPONENT_MAX_PIXELS = 2600
ALPHA_THRESHOLD = 8
PADDING = 24
WALK_TARGET_FRAMES = 8


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def crop_to_alpha(image: Image.Image, padding: int = PADDING) -> Image.Image:
    bbox = alpha_bbox(image)
    if not bbox:
        return image
    cropped = image.crop(bbox)
    canvas = Image.new("RGBA", (cropped.width + padding * 2, cropped.height + padding * 2), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, (padding, padding))
    return canvas


def remove_small_edge_components(image: Image.Image) -> Image.Image:
    """Remove small detached alpha islands that touch the source canvas edge."""
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    components: list[tuple[list[tuple[int, int]], bool]] = []

    def index(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            i = index(x, y)
            if seen[i] or pixels[x, y] <= ALPHA_THRESHOLD:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[i] = 1
            coords: list[tuple[int, int]] = []
            touches_edge = False

            while queue:
                cx, cy = queue.popleft()
                coords.append((cx, cy))
                if cx == 0 or cy == 0 or cx == width - 1 or cy == height - 1:
                    touches_edge = True
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    ni = index(nx, ny)
                    if seen[ni] or pixels[nx, ny] <= ALPHA_THRESHOLD:
                        continue
                    seen[ni] = 1
                    queue.append((nx, ny))

            components.append((coords, touches_edge))

    if not components:
        return image

    largest = max(len(coords) for coords, _ in components)
    out = image.copy()
    out_pixels = out.load()
    for coords, touches_edge in components:
        if not touches_edge:
            continue
        too_small = len(coords) <= EDGE_COMPONENT_MAX_PIXELS or len(coords) / largest <= EDGE_COMPONENT_MAX_RATIO
        if not too_small:
            continue
        for x, y in coords:
            out_pixels[x, y] = (0, 0, 0, 0)
    return out


def normalize_to_canvas(frames: Iterable[Image.Image], padding: int = PADDING) -> list[Image.Image]:
    cropped = [crop_to_alpha(frame, padding) for frame in frames]
    max_width = max(frame.width for frame in cropped)
    max_height = max(frame.height for frame in cropped)
    normalized: list[Image.Image] = []
    for frame in cropped:
        canvas = Image.new("RGBA", (max_width, max_height), (0, 0, 0, 0))
        x = (max_width - frame.width) // 2
        y = max_height - frame.height
        canvas.alpha_composite(frame, (x, y))
        normalized.append(canvas)
    return normalized


def _cv_rgba(image: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(image.convert("RGBA")), cv2.COLOR_RGBA2BGRA)


def _pil_from_cv(image: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA))


def midpoint_frame(a: Image.Image, b: Image.Image) -> Image.Image:
    """Warp the previous pose halfway toward the next pose.

    This avoids the obvious double-exposure that a simple alpha blend creates,
    while giving the walk cycle a real transition frame between source poses.
    """
    if a.size != b.size:
        raise ValueError("midpoint frames must share a canvas")

    arr_a = _cv_rgba(a)
    arr_b = _cv_rgba(b)
    gray_a = cv2.cvtColor(arr_a, cv2.COLOR_BGRA2GRAY)
    gray_b = cv2.cvtColor(arr_b, cv2.COLOR_BGRA2GRAY)
    gray_a = np.maximum(gray_a, arr_a[:, :, 3] // 2)
    gray_b = np.maximum(gray_b, arr_b[:, :, 3] // 2)

    flow = cv2.calcOpticalFlowFarneback(
        gray_a,
        gray_b,
        None,
        pyr_scale=0.5,
        levels=3,
        winsize=21,
        iterations=3,
        poly_n=5,
        poly_sigma=1.2,
        flags=0,
    )

    height, width = gray_a.shape
    grid_x, grid_y = np.meshgrid(np.arange(width), np.arange(height))
    map_x = (grid_x + flow[:, :, 0] * 0.5).astype(np.float32)
    map_y = (grid_y + flow[:, :, 1] * 0.5).astype(np.float32)
    warped = cv2.remap(arr_a, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_TRANSPARENT)

    alpha = warped[:, :, 3]
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
    warped[:, :, 3] = alpha
    return crop_to_alpha(_pil_from_cv(warped), PADDING)


def process_static_frame(path: Path, *, clean_edge_fragments: bool) -> None:
    image = Image.open(path).convert("RGBA")
    if clean_edge_fragments:
        image = remove_small_edge_components(image)
    image = crop_to_alpha(image, PADDING)
    image.save(path)


def process_walk_cycle(character: str) -> None:
    character_dir = ACTION_DIR / character
    source_paths = [character_dir / f"walk{i}.png" for i in range(1, 5)]
    if not all(path.exists() for path in source_paths):
        return

    frames = []
    for path in source_paths:
        backup = BACKUP_DIR / character / path.name
        source = backup if backup.exists() else path
        image = Image.open(source).convert("RGBA")
        frames.append(remove_small_edge_components(image))

    normalized = normalize_to_canvas(frames, PADDING)
    expanded: list[Image.Image] = []
    for index, frame in enumerate(normalized):
        next_frame = normalized[(index + 1) % len(normalized)]
        expanded.append(frame)
        expanded.append(midpoint_frame(frame, next_frame))

    for index, frame in enumerate(expanded[:WALK_TARGET_FRAMES], start=1):
        frame.save(character_dir / f"walk{index}.png")


def make_contact_sheet() -> None:
    QA_DIR.mkdir(parents=True, exist_ok=True)
    frames = ["stand"] + [f"walk{i}" for i in range(1, WALK_TARGET_FRAMES + 1)] + [f"attack{i}" for i in range(1, 5)]
    thumb_w, thumb_h = 126, 142
    label_h = 18
    margin = 8
    sheet_w = margin * 2 + len(frames) * thumb_w
    sheet_h = margin * 2 + len(CHARACTERS) * (thumb_h + label_h)
    out = Image.new("RGBA", (sheet_w, sheet_h), (30, 30, 34, 255))

    from PIL import ImageDraw

    draw = ImageDraw.Draw(out)
    for row, character in enumerate(CHARACTERS):
        y0 = margin + row * (thumb_h + label_h)
        draw.text((2, y0 + 4), character, fill=(255, 255, 255, 255))
        for col, frame_name in enumerate(frames):
            path = ACTION_DIR / character / f"{frame_name}.png"
            x0 = margin + col * thumb_w
            y1 = y0 + label_h
            draw.rectangle([x0, y1, x0 + thumb_w - 4, y1 + thumb_h - 4], outline=(80, 80, 90, 255))
            draw.text((x0 + 4, y0 + 2), frame_name, fill=(220, 220, 225, 255))
            if not path.exists():
                draw.text((x0 + 15, y1 + 60), "MISSING", fill=(255, 80, 80, 255))
                continue
            image = Image.open(path).convert("RGBA")
            bbox = alpha_bbox(image)
            if bbox:
                image = image.crop(bbox)
            image.thumbnail((thumb_w - 12, thumb_h - 14), Image.Resampling.LANCZOS)
            out.alpha_composite(image, (x0 + (thumb_w - image.width) // 2, y1 + thumb_h - image.height - 7))

    out.save(QA_DIR / "refreshed_action_grid.png")


def edge_report() -> None:
    lines: list[str] = []
    for character in CHARACTERS:
        risky = []
        character_dir = ACTION_DIR / character
        for path in sorted(character_dir.glob("*.png")):
            image = Image.open(path).convert("RGBA")
            alpha = image.getchannel("A")
            bbox = alpha_bbox(image)
            if not bbox:
                continue
            margin = min(bbox[0], bbox[1], image.width - bbox[2], image.height - bbox[3])
            edge_alpha = (
                sum(1 for x in range(image.width) if alpha.getpixel((x, 0)) > 0 or alpha.getpixel((x, image.height - 1)) > 0)
                + sum(1 for y in range(image.height) if alpha.getpixel((0, y)) > 0 or alpha.getpixel((image.width - 1, y)) > 0)
            )
            if margin <= 1 or edge_alpha > 0:
                risky.append(f"{path.name}: margin={margin}, edge_alpha={edge_alpha}")
        lines.append(f"{character}: {len(risky)} edge-risk frames")
        lines.extend(f"  {item}" for item in risky)
    (QA_DIR / "edge_report.txt").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    for path in ACTION_DIR.glob("*/*.png"):
        backup = BACKUP_DIR / path.parent.name / path.name
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            backup.write_bytes(path.read_bytes())

    for character in CHARACTERS:
        character_dir = ACTION_DIR / character
        stand = character_dir / "stand.png"
        if stand.exists():
            process_static_frame(stand, clean_edge_fragments=True)

        process_walk_cycle(character)

        for index in range(1, 5):
            attack = character_dir / f"attack{index}.png"
            if attack.exists():
                process_static_frame(attack, clean_edge_fragments=False)

    make_contact_sheet()
    edge_report()
    print(QA_DIR / "refreshed_action_grid.png")
    print(QA_DIR / "edge_report.txt")


if __name__ == "__main__":
    main()
