import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('script/voice/motion/negative を含むプロンプトを生成する（8秒・neutral）', () => {
    const res = buildPrompt({
      script: ['こんにちは、世界。'],
      voice: { gender: 'female', tone: 'normal' },
      motion: 'neutral',
      microPan: false,
    });

    expect(res.prompt).toContain('こんにちは、世界。');
    expect(res.prompt).toContain('女性の声');
    expect(res.prompt).toContain('normal');
    expect(res.prompt).toContain('自然で落ち着いた');

    expect(res.negative).toContain('極端な変形');
    expect(res.negative).toContain('背景の暴走');
  });

  it('16秒相当の2セグメントは両方が含まれる', () => {
    const seg1 = '自己紹介するね。わたしはラムだっちゃ。';
    const seg2 = '今日はピクトークのデモを見せるっちゃ。';
    const res = buildPrompt({
      script: [seg1, seg2],
      voice: { gender: 'male', tone: 'energetic' },
      motion: 'smile',
      microPan: true,
    });

    expect(res.prompt).toContain(seg1);
    expect(res.prompt).toContain(seg2);
    expect(res.prompt).toContain('男性の声');
    expect(res.prompt).toContain('energetic');
    expect(res.prompt).toContain('笑顔');
    expect(res.prompt).toContain('軽いパン');

    // negativeは常に含まれる
    expect(res.negative).toMatch(/歪み|変形/);
  });
});
