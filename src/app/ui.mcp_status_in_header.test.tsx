import { render, screen, waitFor, cleanup } from '@testing-library/react';
import process from 'node:process';
import React from 'react';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import Page from './page';

describe('ヘッダにMCP接続ステータスを表示', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // テスト用のMCP_BASE_URLを注入（McpStatusはこれを既定で参照）
    process.env = { ...OLD_ENV, MCP_BASE_URL: 'http://localhost:9999' };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env = OLD_ENV;
  });

  it('ヘルスチェック200なら「MCP接続: OK」を表示する', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as unknown as Response);

    render(<Page />);

    // 初期はローディング表示
    expect(screen.getByTestId('mcp-status')).toHaveTextContent('接続確認中');

    await waitFor(() => {
      expect(screen.getByTestId('mcp-status')).toHaveTextContent('MCP接続: OK');
    });
  });

  it('ヘルスチェック失敗なら「MCP接続: NG」を表示する', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: false, status: 503 } as unknown as Response);

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByTestId('mcp-status')).toHaveTextContent('MCP接続: NG');
    });
  });
});
