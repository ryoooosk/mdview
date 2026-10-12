import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { extractMermaidBlocks } from './extract.ts';

function extract(markdown: string) {
  return extractMermaidBlocks(markdown).map(({ source, start, end }) => ({
    source,
    text: markdown.slice(start, end),
  }));
}

describe('extractMermaidBlocks', () => {
  test(' ``` のフェンスを含む範囲と、図のソースを返す', () => {
    const markdown =
      '# 見出し\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n本文\n';
    assert.deepEqual(extract(markdown), [
      {
        source: 'flowchart LR\n  A --> B',
        text: '```mermaid\nflowchart LR\n  A --> B\n```',
      },
    ]);
  });

  test('~~~ のフェンスも対象にする', () => {
    const markdown = '~~~mermaid\nflowchart LR\n  A --> B\n~~~\n';
    assert.deepEqual(extract(markdown), [
      {
        source: 'flowchart LR\n  A --> B',
        text: '~~~mermaid\nflowchart LR\n  A --> B\n~~~',
      },
    ]);
  });

  test('4つ以上のバッククォートのフェンスでは、中の ``` で閉じない', () => {
    const markdown = '````mermaid\nflowchart LR\n```\n  A --> B\n````\n';
    assert.deepEqual(extract(markdown), [
      {
        source: 'flowchart LR\n```\n  A --> B',
        text: '````mermaid\nflowchart LR\n```\n  A --> B\n````',
      },
    ]);
  });

  test('リスト内のフェンスは、インデントを除いたソースを返す', () => {
    const markdown =
      '- 項目\n  ```mermaid\n  flowchart LR\n    A --> B\n  ```\n  続き\n';
    assert.deepEqual(extract(markdown), [
      {
        source: 'flowchart LR\n  A --> B',
        text: '```mermaid\n  flowchart LR\n    A --> B\n  ```',
      },
    ]);
  });

  test('閉じていないフェンスは、文書の末尾までを図にする', () => {
    const markdown = '本文\n\n```mermaid\nflowchart LR\n  A --> B\n';
    assert.deepEqual(extract(markdown), [
      {
        source: 'flowchart LR\n  A --> B',
        text: '```mermaid\nflowchart LR\n  A --> B\n',
      },
    ]);
  });

  test('mermaid 以外のコードブロックとインラインコードは対象にしない', () => {
    const markdown = '```js\nconst a = 1;\n```\n\n`mermaid` と書く\n';
    assert.deepEqual(extract(markdown), []);
  });

  test('複数の図を文書の順に返す', () => {
    const markdown =
      '```mermaid\nflowchart LR\n```\n\n```mermaid\nsequenceDiagram\n```\n';
    assert.deepEqual(
      extract(markdown).map(({ source }) => source),
      ['flowchart LR', 'sequenceDiagram'],
    );
  });
});
