import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

// glow の IsMarkdownFile と同じ拡張子にしないと、glow で開いたときとコードで表示するファイルが変わってしまう
const MARKDOWN_EXTENSIONS = ['.md', '.mdown', '.mkdn', '.mkd', '.markdown'];

// glow の dark をそのまま使わないのは、標準入力から渡したコードブロックの左に 2 桁の余白が付き、glow でファイルを開いたときより右にずれるため
const CODE_STYLE = fileURLToPath(
  new URL('../styles/code.json', import.meta.url),
);

// glow は `_` の位置で語を分割して装飾するため、マーカーは英数字だけにする
// 固定の文字列にしないのは、同じ文字列が本文にあると、その行まで画像に置き換わってしまうため
const MARKER_PREFIX = `MDVIEW${randomBytes(4).toString('hex')}X`;
const MARKER_PATTERN = new RegExp(`${MARKER_PREFIX}(\\d+)`);

export type MarkerTarget = {
  index: number;
  start: number;
  end: number;
};

export function isMarkdownFile(path: string): boolean {
  const extension = fileExtension(path).toLowerCase();
  return extension === '' || MARKDOWN_EXTENSIONS.includes(extension);
}

// node:path の extname を使わないのは、.zshrc のようにドットで始まるファイル名の拡張子を空にし、glow と判定が変わるため
export function fileExtension(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot);
}

export function codeBlock(source: string, language: string): string {
  // バッククォート 3 つで固定しないのは、中身の行頭に ``` があると、そこでコードブロックが閉じてしまうため
  const longest =
    source.match(/`+/g)?.reduce((max, run) => Math.max(max, run.length), 0) ??
    0;
  const fence = '`'.repeat(Math.max(3, longest + 1));
  const body = source.endsWith('\n') ? source : `${source}\n`;
  return `${fence}${language}\n${body}${fence}\n`;
}

export function insertMarkers(
  markdown: string,
  targets: readonly MarkerTarget[],
): string {
  // 前から置き換えないのは、置き換えた分だけ後ろの図の位置がずれるため
  const fromLast = targets.toSorted((a, b) => b.start - a.start);
  let result = markdown;
  for (const { index, start, end } of fromLast) {
    const lineStart = result.lastIndexOf('\n', start - 1) + 1;
    // リストの記号を空白にした行頭を付けないと、マーカーがリストや引用の外に出てしまう
    const prefix = result.slice(lineStart, start).replace(/[^>\s]/g, ' ');
    // 段落にしないのは、glow がリスト項目内の段落を改行せずに前後の段落とつなげて表示するため
    const marker = [
      '```',
      `${prefix}${MARKER_PREFIX}${index}`,
      `${prefix}\`\`\``,
    ].join('\n');
    result = `${result.slice(0, start)}${marker}${result.slice(end)}`;
  }
  return result;
}

export function replaceMarkers(
  output: string,
  images: ReadonlyMap<number, string>,
): string {
  return output
    .split('\n')
    .map((line) => {
      const match = MARKER_PATTERN.exec(stripVTControlCharacters(line));
      return (match && images.get(Number(match[1]))) ?? line;
    })
    .join('\n');
}

export function runGlowCode(
  source: string,
  language: string,
  columns: number,
): Promise<string> {
  return runGlow(codeBlock(source, language), columns, CODE_STYLE);
}

export function runGlow(
  markdown: string,
  columns: number,
  style = 'dark',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const glow = spawn('glow', ['-s', style, '-w', String(columns), '-'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      // 制御端末を引き継がないのは、glow が /dev/tty でターミナルに色とカーソル位置を問い合わせ、応答がないと約 10 秒待つため
      detached: true,
    });
    const chunks: Buffer[] = [];
    glow.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    glow.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'ENOENT'
          ? new Error('glow not found. Install it with `brew install glow`.')
          : error,
      );
    });
    glow.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new Error(`glow exited with code ${code}`));
    });
    glow.stdin.on('error', reject);
    glow.stdin.end(markdown);
  });
}
