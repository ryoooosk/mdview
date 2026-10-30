import { openSync, writeSync } from 'node:fs';
import { ReadStream } from 'node:tty';

export const CELL_WIDTH = 8;

const DEFAULT_COLUMNS = 80;

const CELL_SIZE_QUERY = '\x1b[16t';
// ESC を正規表現に入れないのは、biome の noControlCharactersInRegex に当たるため
const ESC = '\x1b';
const CELL_SIZE_REPLY = /^\[6;(\d+);(\d+)t/;
// 長くしないのは、応答しないターミナルでは、この時間だけ表示が遅れるため
const CELL_SIZE_TIMEOUT_MS = 200;

export type CellSize = {
  width: number;
  height: number;
};

export function supportsKittyGraphics(
  env: NodeJS.ProcessEnv,
  isTTY: boolean,
): boolean {
  if (!isTTY || env.TMUX !== undefined) return false;
  const term = env.TERM ?? '';
  return (
    env.TERM_PROGRAM === 'ghostty' ||
    term.includes('xterm-ghostty') ||
    term.includes('xterm-kitty') ||
    env.KITTY_WINDOW_ID !== undefined
  );
}

export function terminalColumns(stream: NodeJS.WriteStream): number {
  return stream.columns > 0 ? stream.columns : DEFAULT_COLUMNS;
}

export async function queryCellSize(): Promise<CellSize | undefined> {
  let fd: number;
  try {
    fd = openSync('/dev/tty', 'r+');
  } catch {
    return undefined;
  }
  const tty = new ReadStream(fd);
  try {
    tty.setRawMode(true);
    return await new Promise((resolve) => {
      let reply = '';
      const timer = setTimeout(() => resolve(undefined), CELL_SIZE_TIMEOUT_MS);
      tty.on('data', (chunk: Buffer) => {
        reply += chunk.toString('latin1');
        const size = parseCellSize(reply);
        if (!size) return;
        clearTimeout(timer);
        resolve(size);
      });
      writeSync(fd, CELL_SIZE_QUERY);
    });
  } catch {
    // 投げないのは、セルの大きさが分からなくても、行数を端末に任せて図を表示できるため
    return undefined;
  } finally {
    if (tty.isRaw) tty.setRawMode(false);
    tty.destroy();
  }
}

export function parseCellSize(reply: string): CellSize | undefined {
  const start = reply.indexOf(`${ESC}[6;`);
  if (start === -1) return undefined;
  const match = CELL_SIZE_REPLY.exec(reply.slice(start + ESC.length));
  if (!match) return undefined;
  const height = Number(match[1]);
  const width = Number(match[2]);
  return height > 0 && width > 0 ? { width, height } : undefined;
}
