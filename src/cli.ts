#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';
import { parseArgs } from 'node:util';
import { cacheKey, readCache, writeCache } from './cache.ts';
import { extractMermaidBlocks } from './extract.ts';
import { insertMarkers, replaceMarkers, runGlow } from './glow.ts';
import { kittyImage, pngWidth } from './kitty.ts';
import {
  createRenderer,
  DEVICE_SCALE_FACTOR,
  MERMAID_VERSION,
  RENDER_OPTIONS,
  type Renderer,
} from './render.ts';
import {
  CELL_WIDTH,
  supportsKittyGraphics,
  terminalColumns,
} from './terminal.ts';

const USAGE = 'Usage: mdview [-w <columns>] <file.md | ->';

async function main(): Promise<void> {
  const { values, positionals } = parseCommandLine();
  const [input] = positionals;
  if (input === undefined || positionals.length > 1) throw new UsageError();

  const columns =
    values.width === undefined
      ? terminalColumns(process.stdout)
      : parseColumns(values.width);
  const markdown =
    input === '-' ? await text(process.stdin) : await readFile(input, 'utf8');

  if (!supportsKittyGraphics(process.env, process.stdout.isTTY)) {
    process.stdout.write(await runGlow(markdown, columns));
    return;
  }
  const { markdown: marked, images } = await renderDiagrams(markdown, columns);
  process.stdout.write(replaceMarkers(await runGlow(marked, columns), images));
}

async function renderDiagrams(
  markdown: string,
  columns: number,
): Promise<{ markdown: string; images: Map<number, string> }> {
  const blocks = extractMermaidBlocks(markdown);
  const renderer = createRenderer();
  const images = new Map<number, string>();
  try {
    for (const [index, block] of blocks.entries()) {
      const png = await loadDiagram(
        block.source,
        cacheKey(block.source, MERMAID_VERSION, RENDER_OPTIONS),
        renderer,
        index,
      );
      if (png) images.set(index, kittyImage(png, imageColumns(png, columns)));
    }
  } finally {
    await renderer.close();
  }
  const targets = blocks.flatMap((block, index) =>
    images.has(index) ? [{ ...block, index }] : [],
  );
  return { markdown: insertMarkers(markdown, targets), images };
}

async function loadDiagram(
  source: string,
  key: string,
  renderer: Renderer,
  index: number,
): Promise<Uint8Array | undefined> {
  const cached = await readCache(key);
  if (cached) return cached;
  let png: Uint8Array;
  try {
    png = await renderer.render(source);
  } catch (error) {
    console.error(
      `mdview: diagram ${index + 1} could not be rendered: ${errorMessage(error)}`,
    );
    return undefined;
  }
  await writeCache(key, png);
  return png;
}

function imageColumns(png: Uint8Array, columns: number): number {
  return Math.min(
    Math.ceil(pngWidth(png) / DEVICE_SCALE_FACTOR / CELL_WIDTH),
    columns,
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
    if (error.message) console.error(`mdview: ${error.message}`);
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  console.error(`mdview: ${errorMessage(error)}`);
  process.exitCode = 1;
});
