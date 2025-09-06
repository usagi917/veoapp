export type BuildPromptInput = {
  script: string[]; // 8秒×1 or 8秒×2（16秒）
  voice: { gender?: string; tone?: string };
  motion?: string;
  microPan?: boolean;
};

export type BuildPromptResult = {
  prompt: string;
  negative: string;
};

function genderJa(g?: string): string {
  const t = (g || '').toLowerCase();
  if (/^f(emale)?$|女性/.test(t)) return '女性の声';
  if (/^m(ale)?$|男性/.test(t)) return '男性の声';
  return '声の性別は任意';
}

function motionCue(m?: string): string {
  const key = (m || 'neutral').toLowerCase();
  if (/smile|笑/.test(key)) return '穏やかな笑顔で、自然な表情。';
  if (/energetic|元気|ハキハキ/.test(key)) return 'やや活発な表情と抑揚で、明るく。';
  if (/serene|calm|落ち着/.test(key)) return '落ち着いた表情と穏やかな抑揚。';
  if (/nod|うなず|頷/.test(key)) return '適度にうなずき、自然な相槌。';
  return '自然で落ち着いた表情、過度な動きは避ける。';
}

function microPanCue(enabled?: boolean): string {
  return enabled ? 'ごく軽いパンのみ許可し、被写体をフレーム内に保つ。' : '';
}

function negativeCue(): string {
  return [
    '極端な変形や歪み、背景の暴走や過度なカメラ移動は避ける。',
    '顔の形状を保ち、自然な口パクとまばたきに留める。',
    '衣服や背景のテクスチャが不自然に変化しないようにする。',
  ].join(' ');
}

export function buildPrompt(input: BuildPromptInput): BuildPromptResult {
  const { script, voice, motion, microPan } = input;
  const tone = voice?.tone || 'normal';

  const segments = (script || []).filter(Boolean);
  const joined = segments.map((s, i) => (segments.length > 1 ? `[#${i + 1}] ${s}` : s)).join(' ');

  const parts = [
    '与えられた台本に忠実に、日本語で自然に話す。',
    `${genderJa(voice?.gender)}・トーン: ${tone}。`,
    motionCue(motion),
    microPanCue(microPan),
    `台本: ${joined}`,
  ].filter(Boolean);

  const prompt = parts.join(' ');
  const negative = negativeCue();

  return { prompt, negative };
}
