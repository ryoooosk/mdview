import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseCellSize } from './terminal.ts';

describe('parseCellSize', () => {
  test('CSI 6 ; 高さ ; 幅 t からセルの大きさを読む', () => {
    assert.deepEqual(parseCellSize('\x1b[6;34;16t'), { width: 16, height: 34 });
  });

  test('応答の前に別の入力があっても読む', () => {
    assert.deepEqual(parseCellSize('a\x1b[6;34;16t'), {
      width: 16,
      height: 34,
    });
  });

  test('応答が途中までなら undefined を返す', () => {
    assert.equal(parseCellSize('\x1b[6;34;1'), undefined);
  });

  test('大きさが 0 なら undefined を返す', () => {
    assert.equal(parseCellSize('\x1b[6;0;0t'), undefined);
  });
});
