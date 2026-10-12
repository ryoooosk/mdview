import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { extractMermaidBlocks } from './extract.ts';
import { insertMarkers, replaceMarkers } from './glow.ts';

const MARKER_PREFIX = /MDVIEW[0-9a-f]{8}X/g;

function insertAll(markdown: string): string {
  const targets = extractMermaidBlocks(markdown).map((block, index) => ({
    ...block,
    index,
  }));
  return insertMarkers(markdown, targets).replace(MARKER_PREFIX, 'MARKER');
}

function markerPrefix(): string {
  const markdown = '```mermaid\n```';
  const marked = insertMarkers(markdown, [
    { index: 0, start: 0, end: markdown.length },
  ]);
  const prefix = marked.match(MARKER_PREFIX)?.[0];
  assert.ok(prefix);
  return prefix;
}

describe('insertMarkers', () => {
  test('図をマーカーだけのコードブロックに置き換える', () => {
    assert.equal(
      insertAll('説明:\n```mermaid\nflowchart LR\n```\n続き\n'),
      '説明:\n```\nMARKER0\n```\n続き\n',
    );
  });

  test('リスト内の図は、マーカーもリストの中に入れる', () => {
    assert.equal(
      insertAll('- 項目\n  ```mermaid\n  flowchart LR\n  ```\n  続き\n'),
      '- 項目\n  ```\n  MARKER0\n  ```\n  続き\n',
    );
  });

  test('リストの記号と同じ行の図は、記号を空白にした行頭を付ける', () => {
    assert.equal(
      insertAll('- ```mermaid\n  flowchart LR\n  ```\n'),
      '- ```\n  MARKER0\n  ```\n',
    );
  });

  test('引用内の図は、マーカーにも > を付ける', () => {
    assert.equal(
      insertAll('> 引用\n> ```mermaid\n> flowchart LR\n> ```\n'),
      '> 引用\n> ```\n> MARKER0\n> ```\n',
    );
  });

  test('対象に含まれない図はそのまま残す', () => {
    const markdown =
      '```mermaid\nflowchart LR\n```\n\n```mermaid\nsequenceDiagram\n```\n';
    const [, second] = extractMermaidBlocks(markdown);
    assert.ok(second);
    assert.equal(
      insertMarkers(markdown, [{ ...second, index: 1 }]).replace(
        MARKER_PREFIX,
        'MARKER',
      ),
      '```mermaid\nflowchart LR\n```\n\n```\nMARKER1\n```\n',
    );
  });
});

describe('replaceMarkers', () => {
  const prefix = markerPrefix();
  const images = new Map([[0, 'IMAGE0']]);

  test('ANSI エスケープシーケンスで装飾されたマーカーの行を、画像に置き換える', () => {
    const output = `本文\n    \x1b[38;5;252m${prefix}0\x1b[0m  \n続き`;
    assert.equal(replaceMarkers(output, images), '本文\nIMAGE0\n続き');
  });

  test('リストや引用の記号が付いた行も置き換える', () => {
    const output = `  • ${prefix}0\n  │ ${prefix}0`;
    assert.equal(replaceMarkers(output, images), 'IMAGE0\nIMAGE0');
  });

  test('画像がない番号のマーカーは置き換えない', () => {
    const output = `    ${prefix}1`;
    assert.equal(replaceMarkers(output, images), output);
  });

  test('本文に書かれたマーカーに似た文字列は置き換えない', () => {
    const output = '  `MDVIEWMERMAID0` のようなマーカー';
    assert.equal(replaceMarkers(output, images), output);
  });
});
