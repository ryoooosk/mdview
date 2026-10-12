const CHUNK_SIZE = 4096;

export function kittyImage(png: Uint8Array, columns: number): string {
  const base64 = Buffer.from(png).toString('base64');
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }
  return chunks
    .map((chunk, i) => {
      const more = i < chunks.length - 1 ? 1 : 0;
      const control =
        i === 0 ? `f=100,a=T,q=2,c=${columns},m=${more}` : `m=${more}`;
      return `\x1b_G${control};${chunk}\x1b\\`;
    })
    .join('');
}

export function pngWidth(png: Uint8Array): number {
  return new DataView(png.buffer, png.byteOffset, png.byteLength).getUint32(16);
}
