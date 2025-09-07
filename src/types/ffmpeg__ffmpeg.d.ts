declare module '@ffmpeg/ffmpeg' {
  export function createFFmpeg(opts: { log?: boolean }): {
    load(): Promise<void>;
    FS(op: 'writeFile' | 'readFile', path: string, data?: Uint8Array): void | Uint8Array;
    run: (...args: string[]) => Promise<void>;
  };
}
