/**
 * 台本の長さを、話し方のトーンに基づくCPS(Chars Per Second)で見積もる。
 * - normal: 約6cps（日本語の自然な読み上げを想定）
 * - slow: 約4cps（ゆっくり）
 * - fast: 約8cps（早口）
 */
export function estimateCps(tone?: string): number {
  const t = (tone || 'normal').toLowerCase();
  if (/(slow|ゆっくり|遅)/.test(t)) return 4;
  if (/(fast|energetic|元気|ハキハキ|速|早口)/.test(t)) return 8;
  return 6;
}

const END_PUNCT = /[。．.!！?？…]$/;
const SENTENCE_SPLIT = /(?<=[。．.!！?？…])\s*/u; // 句点や終端記号の直後で分割

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\t\r\f\v]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNaturalEnding(s: string): boolean {
  return END_PUNCT.test(s);
}

function naturalizeEnding(s: string, wasTruncated = false): string {
  let out = s.trim();
  // 語尾が読点で終わっていたら句点に揃える
  if (/[,、]$/.test(out)) out = out.replace(/[,、]+$/, '');
  // トリミングが発生した場合は三点リーダで示す
  if (wasTruncated) {
    if (!/[。．.!！?？…]$/.test(out)) out += '…';
    return out;
  }
  if (!isNaturalEnding(out)) out += '。';
  return out;
}

function splitIntoSentences(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  const parts = normalized.split(SENTENCE_SPLIT).filter(Boolean);
  return parts;
}

function composeWithinLimit(sentences: string[], startIdx: number, maxChars: number) {
  let acc = '';
  let i = startIdx;
  while (i < sentences.length) {
    const next = (acc ? acc + ' ' : '') + sentences[i];
    if (next.length > maxChars) break;
    acc = next;
    i += 1;
  }

  if (!acc) {
    // 1文も入らない場合：その1文が長すぎる。
    // まずは読点（、，,）の直前での自然な切断を試み、無ければサブストリング＋省略記号へ。
    const raw = sentences[startIdx] ?? '';
    const limit = Math.max(0, maxChars);
    let cut = -1;
    for (let p = Math.min(limit, raw.length) - 1; p >= 0; p--) {
      const ch = raw[p];
      if (ch === '、' || ch === '，' || ch === ',') {
        cut = p; // 読点優先
        break;
      }
    }

    if (cut >= 0) {
      const before = raw.slice(0, cut + 1).trim();
      return {
        // 読点は句点に自然化する（省略記号は付けない）
        text: naturalizeEnding(before, false),
        nextIndex: Math.min(startIdx + 1, sentences.length),
      };
    }

    // 読点で切れないときはハードに切って省略記号
    const slice = raw.slice(0, limit).trim();
    return {
      text: naturalizeEnding(slice, true),
      nextIndex: Math.min(startIdx + 1, sentences.length),
    };
  }

  return { text: naturalizeEnding(acc), nextIndex: i };
}

export type FitResult = { segments: string[]; cps: number };

/**
 * 指定秒数（8 or 16）に収まるようにテキストを整形・分割する。
 * 16秒時は8秒×2本に分ける。
 */
export function fitScriptAndSplit(
  text: string,
  lengthSec: 8 | 16,
  tone: string = 'normal',
): FitResult {
  const cps = estimateCps(tone);
  const sentences = splitIntoSentences(text);
  const maxEach = cps * 8; // 8秒あたりの許容量

  if (lengthSec === 8) {
    if (sentences.length === 0) return { segments: [''], cps };
    const raw = text.trim();
    if (raw.length <= maxEach) {
      return { segments: [naturalizeEnding(raw)], cps };
    }
    const first = composeWithinLimit(sentences, 0, maxEach);
    return { segments: [first.text], cps };
  }

  // 16秒: 8秒×2で分割
  if (sentences.length === 0) return { segments: ['', ''], cps };
  const first = composeWithinLimit(sentences, 0, maxEach);
  const second = composeWithinLimit(sentences, first.nextIndex, maxEach);

  // セーフガード： secondが空になったら残り全文を再評価
  if (!second.text.trim()) {
    const rest = sentences.slice(first.nextIndex).join(' ');
    const restSentences = splitIntoSentences(rest);
    const fallback = composeWithinLimit(restSentences, 0, maxEach);
    return { segments: [first.text, fallback.text], cps };
  }

  return { segments: [first.text, second.text], cps };
}
