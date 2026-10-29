#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';
import { parseArgs } from 'node:util';
import { cacheKey, pruneCache, readCache, writeCache } from './cache.ts';
import { extractMermaidBlocks } from './extract.ts';
import {
  fileExtension,
  insertMarkers,
  isMarkdownFile,
  replaceMarkers,
  runGlow,
  runGlowCode,
} from './glow.ts';
import { kittyImage, pngHeight, pngWidth } from './kitty.ts';
import {
  createRenderer,
  DEVICE_SCALE_FACTOR,
  MERMAID_VERSION,
  RENDER_OPTIONS,
  type Renderer,
} from './render.ts';
import {
  CELL_WIDTH,
  type CellSize,
  queryCellSize,
  supportsKittyGraphics,
  terminalColumns,
} from './terminal.ts';

const USAGE = 'Usage: mdv [-w <columns>] <file.md | ->';

async function main(): Promise<void> {
  const { values, positionals } = parseCommandLine();
  const [input] = positionals;
  if (input === undefined || positionals.length > 1) throw new UsageError();

  const columns =
    values.width === undefined
      ? terminalColumns(process.stdout)
      : parseColumns(values.width);

  if (input !== '-' && !isMarkdownFile(input)) {
    const source = await readFile(input, 'utf8');
    const language = fileExtension(input).slice(1);
    process.stdout.write(await runGlowCode(source, language, columns));
    return;
  }
  const markdown =
    input === '-' ? await text(process.stdin) : await readFile(input, 'utf8');

  if (!supportsKittyGraphics(process.env, process.stdout.isTTY)) {
    process.stdout.write(await runGlow(markdown, columns));
    return;
  }
  const {
    markdown: marked,
    images,
    saved,
  } = await renderDiagrams(markdown, columns);
  process.stdout.write(replaceMarkers(await runGlow(marked, columns), images));
  // 出力の前に消さないのは、古いキャッシュの削除を待たずに表示するため
  if (saved) await pruneCache();
}

async function renderDiagrams(
  markdown: string,
  columns: number,
): Promise<{ markdown: string; images: Map<number, string>; saved: boolean }> {
  const blocks = extractMermaidBlocks(markdown);
  const renderer = createRenderer();
  const images = new Map<number, string>();
  let saved = false;
  // 描画の前に待たないのは、問い合わせの応答を待つ間に図の描画を進めるため
  const cellSize =
    blocks.length > 0 ? queryCellSize() : Promise.resolve(undefined);
  try {
    for (const [index, block] of blocks.entries()) {
      const key = cacheKey(block.source, MERMAID_VERSION, RENDER_OPTIONS);
      let png = await readCache(key);
      if (!png) {
        png = await renderDiagram(renderer, block.source, index);
        if (png) {
          await writeCache(key, png);
          saved = true;
        }
      }
      if (png) {
        const imageWidth = imageColumns(png, columns);
        images.set(
          index,
          kittyImage(
            png,
            imageWidth,
            imageRows(png, imageWidth, await cellSize),
          ),
        );
      }
    }
  } finally {
    await renderer.close();
  }
  const targets = blocks.flatMap((block, index) =>
    images.has(index) ? [{ ...block, index }] : [],
  );
  return { markdown: insertMarkers(markdown, targets), images, saved };
}

async function renderDiagram(
  renderer: Renderer,
  source: string,
  index: number,
): Promise<Uint8Array | undefined> {
  try {
    return await renderer.render(source);
  } catch (error) {
    console.error(
      `mdv: diagram ${index + 1} could not be rendered: ${errorMessage(error)}`,
    );
    return undefined;
  }
}

function imageColumns(png: Uint8Array, columns: number): number {
  return Math.min(
    Math.ceil(pngWidth(png) / DEVICE_SCALE_FACTOR / CELL_WIDTH),
    columns,
  );
}

function imageRows(
  png: Uint8Array,
  columns: number,
  cell: CellSize | undefined,
): number | undefined {
  if (!cell) return undefined;
  return Math.ceil(
    (pngHeight(png) * columns * cell.width) / (pngWidth(png) * cell.height),
  );
}

function parseCommandLine() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: { width: { type: 'string', short: 'w' } },
    });
  } catch (error) {
    throw new UsageError(errorMessage(error));
  }
}

function parseColumns(value: string): number {
  const columns = Number(value);
  if (!Number.isInteger(columns) || columns <= 0)
    throw new UsageError(`invalid width: ${value}`);
  return columns;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class UsageError extends Error {}

main().catch((error: unknown) => {
  if (error instanceof UsageError) {
    if (error.message) console.error(`mdv: ${error.message}`);
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  console.error(`mdv: ${errorMessage(error)}`);
  process.exitCode = 1;
});
