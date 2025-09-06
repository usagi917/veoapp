import { describe, it, expect } from 'vitest';
import { fitScriptAndSplit, estimateCps } from './script';

const isNaturalEnding = (s: string) => /[。．.!！?？…]$/.test(s);

describe('fitScriptAndSplit', () => {
  it('8秒: 文字数が収まる場合はそのまま返す', () => {
    const text = 'こんにちは、世界。Pictalkだっちゃ。';
    const { segments } = fitScriptAndSplit(text, 8, 'normal');
    expect(segments).toHaveLength(1);
    expect(segments[0]).toBe(text);
    expect(isNaturalEnding(segments[0])).toBe(true);
  });

  it('8秒: 長文はCPSに合わせて要約し、自然な語尾で終える', () => {
    const text =
      '今日はとてもいい天気ですね。これから友だちと公園でピクニックをする予定なんです。サンドイッチとお茶と、ちょっとしたお菓子も持っていきます。写真もたくさん撮りたいなと思っています。楽しみだっちゃ。';
    const cps = estimateCps('normal');
    const max = cps * 8;
    const { segments } = fitScriptAndSplit(text, 8, 'normal');
    expect(segments).toHaveLength(1);
    expect(segments[0].length).toBeLessThanOrEqual(max);
    expect(segments[0].length).toBeLessThan(text.length);
    expect(isNaturalEnding(segments[0])).toBe(true);
  });

  it('16秒: 2つに分割し、それぞれがCPS範囲内で自然に終わる', () => {
    const text =
      '自己紹介するね。わたしはラムだっちゃ。電撃ビビビの星から来たの。地球の文化は面白いね。今日はピクトークのデモを見せるっちゃ。まずは台本を短く整えるよ。次に8秒ごとに分けるんだっちゃ。最後に楽しく話して完成だっちゃ。準備はいいかや？';
    const cps = estimateCps('normal');
    const maxEach = cps * 8;
    const { segments } = fitScriptAndSplit(text, 16, 'normal');
    expect(segments).toHaveLength(2);
    expect(segments[0].length).toBeGreaterThan(0);
    expect(segments[1].length).toBeGreaterThan(0);
    expect(segments[0].length).toBeLessThanOrEqual(maxEach);
    expect(segments[1].length).toBeLessThanOrEqual(maxEach);
    expect(isNaturalEnding(segments[0])).toBe(true);
    expect(isNaturalEnding(segments[1])).toBe(true);
  });

  it('トーンslowはnormalより短く要約される', () => {
    const longText =
      'これはかなり長い説明文だっちゃ。速度に応じて話す文字数を調整する必要があるっちゃ。ゆっくり話す場合は短く、早口なら少し長くてもいいっちゃ。台本を自然な語尾で整えるのがコツなんだっちゃ。';
    const slow = fitScriptAndSplit(longText, 8, 'slow');
    const normal = fitScriptAndSplit(longText, 8, 'normal');
    expect(slow.segments[0].length).toBeLessThanOrEqual(normal.segments[0].length);
  });
});
