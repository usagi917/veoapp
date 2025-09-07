import { describe, it, expect } from 'vitest';
import { sanitizeGenerateInput, logEvent } from './log';

describe('log: sanitizeGenerateInput', () => {
  it('画像データURLや生のセリフを含めず、最小情報のみを返す', () => {
    const script = 'これは秘密のセリフです';
    const body: Record<string, unknown> = {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      script,
      voice: { gender: 'female', tone: 'normal' },
      motion: 'neutral',
      microPan: true,
      lengthSec: 8,
      consent: true,
      csrf: 'test',
      // 想定外のプロパティ（入っていても落とす）
      apiKey: 'sk-should-not-appear',
    };

    const s = sanitizeGenerateInput(body);

    // 危険な生情報は含めない
    const o = s as unknown as Record<string, unknown>;
    expect('image' in o).toBe(false);
    expect('script' in o).toBe(false);
    expect('apiKey' in o).toBe(false);

    // 最小のメタ情報のみ
    expect(s.hasImage).toBe(true);
    expect(s.scriptChars).toBe(script.length);
    expect(s.lengthSec).toBe(8);
    expect(s.consent).toBe(true);
    expect(s.voice?.gender).toBe('female');
    expect(s.voice?.tone).toBe('normal');
    expect(s.motion).toBe('neutral');
    expect(s.microPan).toBe(true);
  });
});

describe('log: logEvent', () => {
  it('ログ文字列にPII（画像dataURL/生セリフ/APIキー）を含めない', () => {
    const safe = sanitizeGenerateInput({
      image: 'data:image/png;base64,AAA',
      script: 'ユーザーのとても長いセリフ',
      voice: { gender: 'male', tone: 'energetic' },
      motion: 'smile',
      microPan: false,
      lengthSec: 16,
      consent: true,
      csrf: 'x',
      apiKey: 'sk-real-key',
    } as unknown as Record<string, unknown>);

    const line = logEvent('generate_request', safe);

    // 最低限のフィールドが含まれる
    expect(line).toMatch(/"type":"generate_request"/);
    expect(line).toMatch(/"lengthSec":16/);
    expect(line).toMatch(/"scriptChars":\d+/);

    // PIIが混じっていない
    expect(line).not.toContain('data:image');
    expect(line).not.toContain('ユーザーのとても長いセリフ');
    expect(line).not.toContain('sk-real-key');
  });
});
