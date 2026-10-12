import { createHash } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CACHE_DIR = join(homedir(), 'Library', 'Caches', 'mdview');
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export function cacheKey(...parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export async function readCache(key: string): Promise<Uint8Array | undefined> {
  let png: Uint8Array;
  try {
    png = await readFile(cachePath(key));
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
  // 更新日時を使った日時にしないと、よく使う図も保存から 14 日で消えてしまう
  const now = new Date();
  await ignoreNotFound(utimes(cachePath(key), now, now));
  return png;
}

export async function pruneCache(): Promise<void> {
  const now = Date.now();
  for (const name of await readdir(CACHE_DIR)) {
    await ignoreNotFound(removeIfStale(join(CACHE_DIR, name), now));
  }
}

async function removeIfStale(path: string, now: number): Promise<void> {
  const { mtimeMs } = await stat(path);
  if (now - mtimeMs > RETENTION_MS) await unlink(path);
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

// 別の mdview が同時に消したファイルは、すでに消えていれば目的を果たしているので無視する
async function ignoreNotFound(operation: Promise<unknown>): Promise<void> {
  try {
    await operation;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
