import React from 'react';
import { checkHealth } from '../lib/mcpClient';

type Props = {
  baseUrl?: string;
};

export function McpStatus({ baseUrl }: Props) {
  const [state, setState] = React.useState<'loading' | 'ok' | 'ng'>('loading');

  React.useEffect(() => {
    const url = baseUrl ?? getDefaultBaseUrl();
    if (!url) {
      setState('ng');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ok = await checkHealth(url);
        if (!cancelled) setState(ok ? 'ok' : 'ng');
      } catch {
        if (!cancelled) setState('ng');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  // Nuxt UI Badge風のスタイルとアイコン
  const getBadgeProps = () => {
    switch (state) {
      case 'loading':
        return {
          className:
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: '🔄',
          text: '接続確認中...',
          color: 'info',
        };
      case 'ok':
        return {
          className:
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: '✅',
          text: 'MCP接続済み',
          color: 'success',
        };
      case 'ng':
        return {
          className:
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: '❌',
          text: 'MCP未接続',
          color: 'error',
        };
    }
  };

  const badge = getBadgeProps();

  return (
    <div aria-live="polite" data-testid="mcp-status" className="flex items-center gap-2">
      <span className={badge.className}>
        <span className="mr-1.5" role="img" aria-hidden="true">
          {badge.icon}
        </span>
        {badge.text}
      </span>
      {state === 'ng' && (
        <span className="text-xs text-gray-500 dark:text-gray-400">設定を確認してください</span>
      )}
    </div>
  );
}

function getDefaultBaseUrl(): string | undefined {
  // Vite (browser) 環境
  const viteEnv =
    typeof import.meta !== 'undefined'
      ? ((import.meta as unknown as { env?: Record<string, string> }).env ?? undefined)
      : undefined;
  if (viteEnv && typeof viteEnv.VITE_MCP_BASE_URL === 'string' && viteEnv.VITE_MCP_BASE_URL) {
    return viteEnv.VITE_MCP_BASE_URL;
  }
  // Node/Vitest 環境
  const nodeEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process
    ?.env;
  if (nodeEnv?.MCP_BASE_URL) return nodeEnv.MCP_BASE_URL;
  return undefined;
}
