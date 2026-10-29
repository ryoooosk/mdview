import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { kittyImage, pngHeight, pngWidth } from './kitty.ts';

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

  test('行数を渡したら C=1 でカーソルを動かさず、画像の後に行数 - 1 個の改行を付ける', () => {
    const png = new Uint8Array(7000).map((_, i) => i % 256);
    const sequence = kittyImage(png, 40, 5);
    assert.ok(sequence.endsWith(`${ESC}\\\n\n\n\n`));
    assert.deepEqual(
      parseChunks(sequence.trimEnd()).map(({ control }) => control),
      ['f=100,a=T,q=2,c=40,C=1,m=1', 'm=1', 'm=0'],
    );
  });
});

function pngHeader(width: number, height: number): Uint8Array {
  const header = new Uint8Array(24);
  const view = new DataView(header.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return header;
}

describe('pngWidth', () => {
  test('IHDR チャンクから幅を読む', () => {
    assert.equal(pngWidth(pngHeader(1234, 567)), 1234);
  });

  test('byteOffset が 0 でない Uint8Array でも幅を読む', () => {
    const buffer = new Uint8Array(32);
    buffer.set(pngHeader(1234, 567), 8);
    assert.equal(pngWidth(buffer.subarray(8)), 1234);
  });
});

describe('pngHeight', () => {
  test('IHDR チャンクから高さを読む', () => {
    assert.equal(pngHeight(pngHeader(1234, 567)), 567);
  });

  test('byteOffset が 0 でない Uint8Array でも高さを読む', () => {
    const buffer = new Uint8Array(32);
    buffer.set(pngHeader(1234, 567), 8);
    assert.equal(pngHeight(buffer.subarray(8)), 567);
  });
});
