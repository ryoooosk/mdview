import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { kittyImage, pngWidth } from './kitty.ts';

const ESC = '\x1b';

function parseChunks(sequence: string) {
  return sequence
    .split(`${ESC}\\`)
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      assert.ok(chunk.startsWith(`${ESC}_G`));
      const [control, payload] = chunk.slice(`${ESC}_G`.length).split(';');
      return { control, payload };
    });
}

describe('kittyImage', () => {
  test('base64 が 4096 バイト以下なら、1つのチャンクで送り m=0 にする', () => {
    const png = new Uint8Array(3072);
    const chunks = parseChunks(kittyImage(png, 40));
    assert.deepEqual(chunks, [
      {
        control: 'f=100,a=T,q=2,c=40,m=0',
        payload: Buffer.from(png).toString('base64'),
      },
    ]);
  });

  test('4096 バイトを超えたら区切り、最後のチャンクだけ m=0 にする', () => {
    const png = new Uint8Array(7000).map((_, i) => i % 256);
    const chunks = parseChunks(kittyImage(png, 40));
    assert.deepEqual(
      chunks.map(({ control }) => control),
      ['f=100,a=T,q=2,c=40,m=1', 'm=1', 'm=0'],
    );
    assert.deepEqual(
      chunks.map(({ payload }) => payload?.length),
      [4096, 4096, 1144],
    );
    assert.equal(
      chunks.map(({ payload }) => payload).join(''),
      Buffer.from(png).toString('base64'),
    );
  });
});

describe('pngWidth', () => {
  function pngHeader(width: number): Uint8Array {
    const header = new Uint8Array(24);
    new DataView(header.buffer).setUint32(16, width);
    return header;
  }

  test('IHDR チャンクから幅を読む', () => {
    assert.equal(pngWidth(pngHeader(1234)), 1234);
  });

  test('byteOffset が 0 でない Uint8Array でも幅を読む', () => {
    const buffer = new Uint8Array(32);
    buffer.set(pngHeader(1234), 8);
    assert.equal(pngWidth(buffer.subarray(8)), 1234);
  });
});
