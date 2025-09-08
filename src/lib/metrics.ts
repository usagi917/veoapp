// 匿名メトリクス（最小実装）: 生成の成功率/所要時間、ダウンロード回数
// デフォルトでは無効（テストで enableMetrics(true) を呼ぶ）。

export type MetricsSnapshot = {
  generate: { count: number; success: number; failure: number; totalMs: number; avgMs: number };
  download: { count: number; success: number; failure: number };
};

let enabled = false;
let state: MetricsSnapshot = {
  generate: { count: 0, success: 0, failure: 0, totalMs: 0, avgMs: 0 },
  download: { count: 0, success: 0, failure: 0 },
};

export function enableMetrics(v: boolean): void {
  enabled = v;
}

export function resetMetrics(): void {
  state = {
    generate: { count: 0, success: 0, failure: 0, totalMs: 0, avgMs: 0 },
    download: { count: 0, success: 0, failure: 0 },
  };
}

export function snapshotMetrics(): MetricsSnapshot {
  return JSON.parse(JSON.stringify(state)) as MetricsSnapshot;
}

function updateAvg() {
  const g = state.generate;
  g.avgMs = g.count > 0 ? g.totalMs / g.count : 0;
}

export function begin(label: 'generate' | 'download') {
  if (!enabled) return { end: (_ok: boolean) => {} };
  const start = Date.now();
  // 開始時点で count を増やす（downloadは遅延増加でも可だが簡単に統一）
  if (label === 'download') {
    state.download.count += 1;
  } else if (label === 'generate') {
    state.generate.count += 1;
  }
  return {
    end(ok: boolean) {
      if (!enabled) return;
      const dur = Math.max(0, Date.now() - start);
      if (label === 'generate') {
        state.generate.totalMs += dur;
        if (ok) state.generate.success += 1;
        else state.generate.failure += 1;
        updateAvg();
      } else {
        if (ok) state.download.success += 1;
        else state.download.failure += 1;
      }
      // 任意でログ出力（最小の集計のみ）
      try {
        // 動的import（テスト容易性）
        import('./log').then((m) => {
          const logEvent = (m as unknown as { logEvent: (t: string, p: unknown) => void })
            .logEvent;
          logEvent?.('metrics', { label, ok, durMs: dur });
        });
      } catch {
        // ignore
      }
    },
  };
}

