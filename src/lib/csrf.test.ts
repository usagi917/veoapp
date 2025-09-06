import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import process from 'node:process';
import { issueCsrfToken, verifyCsrfToken } from './csrf';

describe('csrf', () => {
  const SID = 'sid-123';

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret-xyz';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('発行したトークンは同じsidで検証に通る', () => {
    const token = issueCsrfToken(SID);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(2); // ts.signature

    const ok = verifyCsrfToken(SID, token);
    expect(ok).toBe(true);
  });

  it('異なるsidでは検証NG', () => {
    const token = issueCsrfToken(SID);
    const ok = verifyCsrfToken('other-sid', token);
    expect(ok).toBe(false);
  });

  it('署名を改ざんするとNG', () => {
    const token = issueCsrfToken(SID);
    const [ts, sig] = token.split('.');
    // 末尾の文字を別文字に置換（簡易改ざん）
    const tamperedSig = sig.slice(0, -1) + (sig.slice(-1) === 'A' ? 'B' : 'A');
    const bad = `${ts}.${tamperedSig}`;
    expect(verifyCsrfToken(SID, bad)).toBe(false);
  });

  it('TTL(15分)を超えたトークンは期限切れでNG', () => {
    const token = issueCsrfToken(SID);
    // 15分 + 1秒 先に進める
    vi.setSystemTime(new Date('2025-01-01T00:15:01.000Z'));
    expect(verifyCsrfToken(SID, token)).toBe(false);
  });
});
