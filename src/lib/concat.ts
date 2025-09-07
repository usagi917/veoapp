export type InputFile = { name: string; data: Uint8Array };

export interface FFmpegLike {
  FS: (op: 'writeFile' | 'readFile', path: string, data?: Uint8Array) => void | Uint8Array;
  run: (...args: string[]) => Promise<void>;
}

export function buildConcatList(names: string[]): string {
  return names.map((n) => `file '${n}'`).join('\n') + '\n';
}

async function writeInputs(ffmpeg: FFmpegLike, inputs: InputFile[]) {
  for (const f of inputs) {
    ffmpeg.FS('writeFile', f.name, f.data);
  }
}

function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// reserved for future debugging
// function decodeBytes(bytes: Uint8Array): string {
//   return new TextDecoder().decode(bytes);
// }

export async function concatMp4Copy(
  ffmpeg: FFmpegLike,
  inputs: InputFile[],
  outName = 'out.mp4',
): Promise<{ outName: string; bytes: Uint8Array; listText: string }> {
  if (inputs.length < 2) {
    throw new Error('at least 2 inputs required');
  }
  await writeInputs(ffmpeg, inputs);

  const listText = buildConcatList(inputs.map((i) => i.name));
  ffmpeg.FS('writeFile', 'list.txt', encodeText(listText));

  // ストリームコピー（再エンコード回避）
  try {
    await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', outName);
  } catch {
    // 失敗時は filter concat（再エンコード）
    const args = inputs.flatMap((i) => ['-i', i.name]);
    const filter = `concat=n=${inputs.length}:v=1:a=1`;
    // 再エンコード時も24fpsを維持
    await ffmpeg.run(...args, '-filter_complex', filter, '-r', '24', outName);
  }

  const bytes = ffmpeg.FS('readFile', outName) as Uint8Array;
  // 返却に listText も添える（デバッグ/テスト用）
  return { outName, bytes, listText };
}
