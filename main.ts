// STORM SURGE — a gta6-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, Three.js r160
// vendored under game/vendor/three.min.js, no network request at runtime).
// This program hands it in: it copies game/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library (vendor/makefun-game.ts,
// byte for byte the scorer's own copy).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, enforced here before anything is handed in so a bad
// build fails loudly on this machine instead of in front of the judge.
const CAPS = {
  indexHtmlMaxBytes: 1024 * 1024,
  screenshotMaxBytes: 262144,
  screenshotMax: 4,
  dossierMaxBytes: 1536 * 1024,
};

// Fail fast with a clear message instead of handing in a half-built entry:
// the playable game, its logic and at least one real screenshot must exist.
for (const required of [
  'game/index.html',
  'game/vendor/three.min.js',
  'game/src/main.js',
  'game/src/world.js',
  'game/src/logic.js',
  'game/src/audio.js',
  'game/src/shots.js',
  'screenshots',
]) {
  if (!existsSync(join(here, required))) {
    throw new Error(`STORM SURGE entry is incomplete: missing ${required}`);
  }
}

const indexBytes = statSync(join(here, 'game/index.html')).size;
if (indexBytes > CAPS.indexHtmlMaxBytes) {
  throw new Error(`game/index.html is ${indexBytes} bytes, over the ${CAPS.indexHtmlMaxBytes} cap`);
}

// Every screenshot must be a real render under the byte cap.
const shotNames = readdirSync(join(here, 'screenshots'))
  .filter((n) => !n.startsWith('.'))
  .sort();
if (shotNames.length < 3 || shotNames.length > CAPS.screenshotMax) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const bytes = statSync(join(here, 'screenshots', name)).size;
  if (bytes > CAPS.screenshotMaxBytes) {
    throw new Error(`screenshots/${name} is ${bytes} bytes, over the ${CAPS.screenshotMaxBytes} cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Verify the dossier we just wrote: it must fit the scorer's own cap, and
// the game tree must stay inside the file/byte budget. Count recursively so
// a stray file added later fails loudly here instead of at the gate.
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > CAPS.dossierMaxBytes) {
  throw new Error(`dossier.json is ${dossierBytes} bytes, over the ${CAPS.dossierMaxBytes} cap`);
}
let gameFiles = 0;
let gameBytes = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else { gameFiles++; gameBytes += statSync(p).size; }
  }
};
walk(join(out, 'game'));
if (gameFiles > 993) throw new Error(`game/ holds ${gameFiles} files, over the 993 cap`);
if (gameBytes > 50331648) throw new Error(`game/ is ${gameBytes} bytes, over the 48 MiB cap`);
// The dossier is canonical JSON; parse it back to prove it is well-formed.
JSON.parse(readFileSync(dossierPath, 'utf8'));

console.log(`STORM SURGE handed in: ${shotNames.length} screenshots (${shotNames.join(', ')}) -> ${out}`);
console.log(`game/: ${gameFiles} files, ${gameBytes} bytes · dossier.json: ${dossierBytes} bytes`);
