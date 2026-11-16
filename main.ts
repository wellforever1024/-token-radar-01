// Token Radar's entrypoint: one sealed snapshot in, one complete package out.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
//
// The output keeps the shape the scorer expects: /output/board.json carries
// the ranked rows, /output/data.js carries the dashboard's dataset,
// /output/dashboard/ carries the page, /output/screenshots/ carries three
// screenshots of that page, and /output/dossier.json is written last by the
// kit's own buildDossier, so the dossier is exactly the library's output
// from those files. Running main.ts twice writes the same bytes twice: no
// clock, no random number, no network anywhere in the program.

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { buildRadar, parseSnapshot, boardIssue, dataScript } from './lib/model.ts';
import type { Snapshot } from './lib/model.ts';

export { buildDossier };

/** Where the program writes, and where the snapshot is read from. */
function settings(): { input: string | undefined; outDir: string } {
  let input: string | undefined;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--input') {
      input = args[i + 1]!;
      i += 1;
    } else if (a.startsWith('--input=')) {
      input = a.slice('--input='.length);
    } else if (a === '--input-dir') {
      const dir = args[i + 1]!;
      input = join(dir, 'snapshot.json');
      i += 1;
    }
  }
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  const outDir = fromEnv === undefined || fromEnv === '' ? join(process.cwd(), 'out') : fromEnv;
  return { input, outDir };
}

/** The snapshot document: a file, or the kit's input/ directory. */
function loadSnapshot(input: string | undefined, here: string): Snapshot {
  const file = input ?? join(here, 'input', 'snapshot.json');
  return parseSnapshot(readFileSync(file, 'utf8'));
}

/** How many screenshots the dossier accepts, at most, and how large each may be. */
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 524_288;
/** The whole dashboard's file and byte budget. */
const MAX_DASHBOARD_FILES = 400;
const MAX_DASHBOARD_BYTES = 4_194_304;

export function main(): void {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const { input, outDir } = settings();
  const snapshot = loadSnapshot(input, here);
  const { board, radar } = buildRadar(snapshot);

  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Error(`refusing to write the board: ${issue}`);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board }, null, 2)}\n`);
  writeFileSync(join(outDir, 'data.js'), dataScript(radar));
  // The dashboard is the page the screenshots are taken from, in this
  // repository's own files, and the screenshots are taken from it, so the
  // dossier's text and the dossier's images agree by construction.
  cpSync(join(here, 'dashboard'), join(outDir, 'dashboard'), { recursive: true });
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  // The dossier is the last file written, and the only dossier this program
  // produces: it is buildDossier's own output from the files above, capped at
  // 65,536 bytes of dashboard text, 4 screenshots of 512 KiB each, 400 dashboard
  // files of 4 MiB total, and a dossier no larger than 1.5 MiB. buildDossier
  // returns the dossier's bytes themselves, so they are written as-is.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 65_536,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    dashboard: { max_files: MAX_DASHBOARD_FILES, max_bytes: MAX_DASHBOARD_BYTES },
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`board rows: ${board.length}, watchlist: ${radar.watchlist_size}, live set aside: ${radar.live_size}, wrote ${outDir}`);
}

main();
