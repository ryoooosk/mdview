import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CACHE_DIR = join(homedir(), 'Library', 'Caches', 'mdview');

export function cacheKey(...parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export async function readCache(key: string): Promise<Uint8Array | undefined> {
  try {
    return await readFile(cachePath(key));
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

export async function writeCache(key: string, png: Uint8Array): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  // 直接書き込まないのは、書き込み中に別の mdview が同じキーを読むと途中までの PNG を表示してしまうため
  const temporary = `${cachePath(key)}.${process.pid}.tmp`;
  await writeFile(temporary, png);
  await rename(temporary, cachePath(key));
}

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.png`);
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
