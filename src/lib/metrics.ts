// 匿名メトリクス（最小実装）: 生成の成功率/所要時間、ダウンロード回数
// デフォルトでは無効（テストで enableMetrics(true) を呼ぶ）。

export type MetricsSnapshot = {
  generate: { count: number; success: number; failure: number; totalMs: number; avgMs: number };
  download: { count: number; success: number; failure: number };
};

export type GenerateModelSnapshot = Record<
  string,
  {
    count: number;
    success: number;
    failure: number;
    avgMs: number;
    p99Ms: number;
    lastDurationSec?: number;
    lastFps?: number;
  }
>;

let enabled = false;
let state: MetricsSnapshot = {
  generate: { count: 0, success: 0, failure: 0, totalMs: 0, avgMs: 0 },
  download: { count: 0, success: 0, failure: 0 },
};

type ModelStateItem = {
  count: number;
  success: number;
  failure: number;
  totalMs: number;
  avgMs: number;
  durations: number[];
  p99Ms: number;
  lastDurationSec?: number;
  lastFps?: number;
};

let generateByModel: Record<string, ModelStateItem> = {};

export function enableMetrics(v: boolean): void {
  enabled = v;
}

export function resetMetrics(): void {
  state = {
    generate: { count: 0, success: 0, failure: 0, totalMs: 0, avgMs: 0 },
    download: { count: 0, success: 0, failure: 0 },
  };
  generateByModel = {};
}

export function snapshotMetrics(): MetricsSnapshot {
  return JSON.parse(JSON.stringify(state)) as MetricsSnapshot;
}

export function snapshotGenerateByModel(): GenerateModelSnapshot {
  const out: GenerateModelSnapshot = {};
  for (const [model, v] of Object.entries(generateByModel)) {
    out[model] = {
      count: v.count,
      success: v.success,
      failure: v.failure,
      avgMs: v.avgMs,
      p99Ms: v.p99Ms,
      lastDurationSec: v.lastDurationSec,
      lastFps: v.lastFps,
    };
  }
  return out;
}

function updateAvg() {
  const g = state.generate;
  g.avgMs = g.count > 0 ? g.totalMs / g.count : 0;
}

type EndCtx = { model?: string; durationSeconds?: number; fps?: number };

export function begin(label: 'generate' | 'download') {
  if (!enabled) return { end: (_ok: boolean, _ctx?: EndCtx) => {} };
  const start = Date.now();
  // 開始時点で count を増やす（downloadは遅延増加でも可だが簡単に統一）
  if (label === 'download') {
    state.download.count += 1;
  } else if (label === 'generate') {
    state.generate.count += 1;
  }
  return {
    end(ok: boolean, ctx?: EndCtx) {
      if (!enabled) return;
      const dur = Math.max(0, Date.now() - start);
      if (label === 'generate') {
        state.generate.totalMs += dur;
        if (ok) state.generate.success += 1;
        else state.generate.failure += 1;
        updateAvg();

        // モデル別集計
        const model = ctx?.model;
        if (model) {
          const item = (generateByModel[model] ||= {
            count: 0,
            success: 0,
            failure: 0,
            totalMs: 0,
            avgMs: 0,
            durations: [],
            p99Ms: 0,
            lastDurationSec: undefined,
            lastFps: undefined,
          });
          item.count += 1;
          if (ok) item.success += 1;
          else item.failure += 1;
          item.totalMs += dur;
          item.avgMs = item.count > 0 ? item.totalMs / item.count : 0;
          // durations は簡易に末尾へ追加。必要に応じて上限を設ける。
          if (item.durations.length > 2000) item.durations.shift();
          item.durations.push(dur);
          const sorted = [...item.durations].sort((a, b) => a - b);
          const n = sorted.length;
          const idx = Math.max(0, Math.ceil(0.99 * n) - 1);
          item.p99Ms = sorted[idx] ?? 0;
          if (typeof ctx?.durationSeconds === 'number') item.lastDurationSec = ctx.durationSeconds;
          if (typeof ctx?.fps === 'number') item.lastFps = ctx.fps;
        }
      } else {
        if (ok) state.download.success += 1;
        else state.download.failure += 1;
      }
      // 任意でログ出力（最小の集計のみ）
      try {
        // 動的import（テスト容易性）
        import('./log').then((m) => {
          const logEvent = (m as unknown as { logEvent: (t: string, p: unknown) => void }).logEvent;
          const base = { label, ok, durMs: dur } as Record<string, unknown>;
          if (label === 'generate' && ctx?.model) {
            base.model = ctx.model;
            if (typeof ctx.durationSeconds === 'number') base.durationSeconds = ctx.durationSeconds;
            if (typeof ctx.fps === 'number') base.fps = ctx.fps;
          }
          logEvent?.('metrics', base);
        });
      } catch {
        // ignore
      }
    },
  };
}
