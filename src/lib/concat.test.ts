import { describe, it, expect, beforeEach } from 'vitest';
import { buildConcatList, concatMp4Copy, type FFmpegLike } from './concat';

function makeFs() {
  const store = new Map<string, Uint8Array>();
  return {
    writeFile(path: string, data: Uint8Array) {
      store.set(path, data);
    },
    readFile(path: string) {
      const d = store.get(path);
      if (!d) throw new Error('ENOENT: ' + path);
      return d;
    },
    has(path: string) {
      return store.has(path);
    },
    dump(path: string) {
      const d = store.get(path);
      return d ? new TextDecoder().decode(d) : undefined;
    },
  };
}

describe('ffmpeg concat demuxer（-c copy → 失敗時 filter concat）', () => {
  let fs: ReturnType<typeof makeFs>;
  let ffmpeg: FFmpegLike;

  beforeEach(() => {
    fs = makeFs();
  });

  it('list.txt を正しく生成する（単純2本）', () => {
    const list = buildConcatList(['a.mp4', 'b.mp4']);
    expect(list).toBe("file 'a.mp4'\nfile 'b.mp4'\n");
  });

  it('copyモードで結合コマンドを実行し、出力が得られる', async () => {
    const calls: string[][] = [];
    ffmpeg = {
      FS: (op, path, data) => {
        if (op === 'writeFile') fs.writeFile(path, data as Uint8Array);
        if (op === 'readFile') return fs.readFile(path);
      },
      run: async (...args: string[]) => {
        calls.push(args);
        // 疑似的に出力ファイルを書き込む
        if (args.includes('-c') && args.includes('copy')) {
          fs.writeFile('out.mp4', new Uint8Array([1, 2, 3]));
        }
      },
    };

    const out = await concatMp4Copy(
      ffmpeg,
      [
        { name: 'a.mp4', data: new Uint8Array([0]) },
        { name: 'b.mp4', data: new Uint8Array([0]) },
      ],
      'out.mp4',
    );

    expect(fs.dump('list.txt')).toBe("file 'a.mp4'\nfile 'b.mp4'\n");
    expect(calls[0]).toEqual([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'list.txt',
      '-c',
      'copy',
      'out.mp4',
    ]);
    expect(out.bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('copyが失敗した場合は filter concat にフォールバックし、24fpsを明示する', async () => {
    const calls: string[][] = [];
    let first = true;
    ffmpeg = {
      FS: (op, path, data) => {
        if (op === 'writeFile') fs.writeFile(path, data as Uint8Array);
        if (op === 'readFile') return fs.readFile(path);
      },
      run: async (...args: string[]) => {
        calls.push(args);
        if (first) {
          first = false;
          throw new Error('copy-failed');
        }
        // fallback時に出力生成
        fs.writeFile('out.mp4', new Uint8Array([9, 9]));
      },
    };

    const out = await concatMp4Copy(
      ffmpeg,
      [
        { name: 'a.mp4', data: new Uint8Array([0]) },
        { name: 'b.mp4', data: new Uint8Array([0]) },
      ],
      'out.mp4',
    );

    // 1回目は copy のコマンド
    expect(calls[0]).toEqual([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'list.txt',
      '-c',
      'copy',
      'out.mp4',
    ]);
    // 2回目は filter concat のコマンド（24fpsを維持するため -r 24 を付与）
    expect(calls[1]).toEqual([
      '-i',
      'a.mp4',
      '-i',
      'b.mp4',
      '-filter_complex',
      'concat=n=2:v=1:a=1',
      '-r',
      '24',
      'out.mp4',
    ]);
    expect(out.bytes).toEqual(new Uint8Array([9, 9]));
  });
});
