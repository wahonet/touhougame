# New Character Asset Preview Pack

This folder contains review-only generated assets for four planned characters. The official `character/`, `action/`, and `assets/` folders are not modified by this preview pack.

## Characters

- `cirno`
- `yukari`
- `suwako`
- `kaguya`

## Generated Files

- `sources/`: original generated 2x2 portrait sheets and 3x3 action sheets.
- `character/`: sliced portrait expressions, all `620x660` RGBA PNG.
- `action/`: sliced action sprites, all RGBA PNG with `400px` height and variable width.
- `assets/`: preview skill icons, `96x96` RGBA PNG.
- `review_contact_sheet.png`: quick visual review sheet for portraits and action sprites.

## Naming

Portrait expressions:

1. `{id}_normal.png`
2. `{id}_happy.png`
3. `{id}_angry.png`
4. `{id}_sad.png`

Action sprites:

1. `{id}_stand.png`
2. `{id}_walk1.png`
3. `{id}_walk2.png`
4. `{id}_walk3.png`
5. `{id}_walk4.png`
6. `{id}_attack1.png`
7. `{id}_attack2.png`
8. `{id}_attack3.png`
9. `{id}_attack4.png`

Skill icons:

1. `icon_{id}_1.png`
2. `icon_{id}_2.png`
3. `icon_{id}_3.png`
4. `icon_{id}_4.png`

## Notes

The assets were generated against the current `character/` and `action/` visual conventions, then chroma-key processed locally. They should be reviewed before copying into the official runtime folders and adding the corresponding character definitions.
