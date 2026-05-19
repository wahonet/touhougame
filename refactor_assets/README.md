# Refactor Assets

Each character bundle is self-contained and mirrors the runtime asset split used by the game.

Layout:

- `refactor_assets/<id>/portraits/`
- `refactor_assets/<id>/actions/`
- `refactor_assets/<id>/icons/`
- `refactor_assets/<id>/effects/`
- `refactor_assets/<id>/manifest.json`

Run `npm run export:refactor-assets` to rebuild this directory from the source asset folders.
