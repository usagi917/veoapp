import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enableMetrics, resetMetrics, begin, snapshotGenerateByModel } from './metrics';

describe('metrics: model context fields (duration/fps)', () => {
  beforeEach(() => {
    enableMetrics(true);
    resetMetrics();
  });

  afterEach(() => {
    enableMetrics(false);
  });

  it('records lastDurationSec and lastFps for the model bucket', () => {
    const end = begin('generate').end;
    end(true, { model: 'veo-3.0-fast-generate-preview', durationSeconds: 8, fps: 24 });

    const snap = snapshotGenerateByModel();
    const fast = snap['veo-3.0-fast-generate-preview'];
    expect(fast).toBeTruthy();
    expect(fast.lastDurationSec).toBe(8);
    expect(fast.lastFps).toBe(24);
  });
});
