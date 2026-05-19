import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { CHARACTER_IDS } from '../js/data/asset-manifest.js';
import { CHARACTER_DEFINITIONS } from '../js/data/characters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'refactor_assets');

const PORTRAIT_FILES = ['normal.png', 'happy.png', 'angry.png', 'sad.png'];
const ACTION_FILES = [
  'stand.png',
  ...Array.from({ length: 8 }, (_, i) => `walk${i + 1}.png`),
  ...Array.from({ length: 4 }, (_, i) => `attack${i + 1}.png`)
];
const ICON_FILES = ['1.png', '2.png', '3.png', '4.png'];

const EFFECT_FILES_BY_CHARACTER = {
  reimu: ['spellcard_1.png', 'spellcard_2.png', 'spellcard_3.png', 'spellcard_4.png', 'shield.png'],
  marisa: [
    'laser_charge.png',
    'laser_beam.png',
    'laser_head.png',
    'big_laser_beam.png',
    'big_laser_head.png',
    'star_1.png',
    'star_2.png',
    'star_3.png',
    'star_4.png',
    'shield.png'
  ],
  yuyuko: ['spellcard_1.png', 'spellcard_2.png', 'spellcard_3.png', 'spellcard_4.png', 'shield.png'],
  youmu: ['youmu_spirit_slash.png', 'youmu_ghost_blade.png', 'youmu_ghost_trail.png', 'youmu_spirit_shield.png', 'shield.png'],
  sanae: ['shield.png'],
  flandre: ['shield.png'],
  sakuya: ['shield.png'],
  reisen: ['shield.png'],
  cirno: ['shield.png'],
  yukari: ['shield.png'],
  suwako: ['shield.png'],
  kaguya: ['shield.png']
};

function ensureCleanDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyNamedFiles(sourceDir, targetDir, filenames, label, { allowMissing = false } = {}) {
  ensureDir(targetDir);
  const missing = [];

  for (const filename of filenames) {
    const source = path.join(sourceDir, filename);
    const target = path.join(targetDir, filename);
    if (!existsSync(source)) {
      missing.push(filename);
      continue;
    }
    copyFileSync(source, target);
  }

  if (missing.length && !allowMissing) {
    throw new Error(`${label} missing files in ${sourceDir}: ${missing.join(', ')}`);
  }

  return filenames.map(filename => ({
    name: filename,
    source: path.relative(repoRoot, path.join(sourceDir, filename)).replaceAll('\\', '/'),
    target: path.relative(repoRoot, path.join(targetDir, filename)).replaceAll('\\', '/'),
    exists: existsSync(path.join(sourceDir, filename))
  }));
}

function buildCharacterBundle(characterId) {
  const definition = CHARACTER_DEFINITIONS[characterId];
  if (!definition) {
    throw new Error(`Unknown character definition: ${characterId}`);
  }

  const bundleRoot = path.join(outputRoot, characterId);
  const portraitSource = path.join(repoRoot, 'character', characterId);
  const actionSource = path.join(repoRoot, 'action', characterId);
  const iconSource = path.join(repoRoot, 'assets', 'icons', characterId);
  const effectSource = path.join(repoRoot, 'assets', 'effects');
  const portraitTarget = path.join(bundleRoot, 'portraits');
  const actionTarget = path.join(bundleRoot, 'actions');
  const iconTarget = path.join(bundleRoot, 'icons');
  const effectTarget = path.join(bundleRoot, 'effects');

  ensureDir(bundleRoot);

  const portraits = copyNamedFiles(portraitSource, portraitTarget, PORTRAIT_FILES, `${characterId} portraits`);
  const actions = copyNamedFiles(actionSource, actionTarget, ACTION_FILES, `${characterId} actions`);
  const icons = copyNamedFiles(iconSource, iconTarget, ICON_FILES, `${characterId} icons`);
  const effects = copyNamedFiles(
    effectSource,
    effectTarget,
    EFFECT_FILES_BY_CHARACTER[characterId] || [],
    `${characterId} effects`
  );

  const bundle = {
    id: characterId,
    definition,
    assets: {
      portraits,
      actions,
      icons,
      effects
    }
  };

  writeFileSync(path.join(bundleRoot, 'manifest.json'), `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  return {
    id: characterId,
    portraits: portraits.length,
    actions: actions.length,
    icons: icons.length,
    effects: effects.length
  };
}

function writeRootReadme() {
  const text = `# Refactor Assets

Each character bundle is self-contained and mirrors the runtime asset split used by the game.

Layout:

- \`refactor_assets/<id>/portraits/\`
- \`refactor_assets/<id>/actions/\`
- \`refactor_assets/<id>/icons/\`
- \`refactor_assets/<id>/effects/\`
- \`refactor_assets/<id>/manifest.json\`

Run \`npm run export:refactor-assets\` to rebuild this directory from the source asset folders.
`;
  writeFileSync(path.join(outputRoot, 'README.md'), text, 'utf8');
}

function main() {
  ensureCleanDir(outputRoot);

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceLayout: {
      portraits: 'character/<id>/',
      actions: 'action/<id>/',
      icons: 'assets/icons/<id>/',
      effects: 'assets/effects/'
    },
    characters: []
  };

  for (const characterId of CHARACTER_IDS) {
    summary.characters.push(buildCharacterBundle(characterId));
  }

  writeRootReadme();
  writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(path.relative(repoRoot, path.join(outputRoot, 'manifest.json')));
}

main();
