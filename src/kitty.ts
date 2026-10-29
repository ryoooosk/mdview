const CHUNK_SIZE = 4096;

export function kittyImage(
  png: Uint8Array,
  columns: number,
  rows?: number,
): string {
  const base64 = Buffer.from(png).toString('base64');
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }
  // 行数が分かるときにカーソル移動を端末に任せないのは、Ghostty が画像の後に動かす行数を「画面の下端まで + 1 画面分」で打ち切り、それより高い図に後ろの本文が重なるため
  const cursor = rows === undefined ? '' : ',C=1';
  const image = chunks
    .map((chunk, i) => {
      const more = i < chunks.length - 1 ? 1 : 0;
      const control =
        i === 0 ? `f=100,a=T,q=2,c=${columns}${cursor},m=${more}` : `m=${more}`;
      return `\x1b_G${control};${chunk}\x1b\\`;
    })
    .join('');
  return rows === undefined ? image : `${image}${'\n'.repeat(rows - 1)}`;
}

export function pngWidth(png: Uint8Array): number {
  return pngView(png).getUint32(16);
}

export function pngHeight(png: Uint8Array): number {
  return pngView(png).getUint32(20);
}

function pngView(png: Uint8Array): DataView {
  return new DataView(png.buffer, png.byteOffset, png.byteLength);
}
