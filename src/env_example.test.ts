import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('.env.example の整備', () => {
  it('リポジトリ直下に存在し、必要なキーが定義されている', async () => {
    const buf = await fs.readFile(path.join('.env.example'));
    const text = buf.toString('utf8');
    // 必須キー（値は空でよいが、キー行が存在すること）
    expect(text).toMatch(/^SESSION_SECRET=.*$/m);
    expect(text).toMatch(/^KV_URL=.*$/m);
    expect(text).toMatch(/^KV_TOKEN=.*$/m);
    // BYOK方式の説明コメントが含まれていると親切
    expect(text).toMatch(/BYOK/);
  });
});
