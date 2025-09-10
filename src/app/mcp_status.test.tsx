import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { McpStatus } from './McpStatus';

describe('McpStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('MCPのヘルスチェックが200のとき「MCP接続: OK」を表示する', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as unknown as Response);

    render(<McpStatus baseUrl="http://localhost:9999" />);

    // 初期はローディング表示
    expect(screen.getByTestId('mcp-status')).toHaveTextContent('接続確認中');

    // 成功表示に変わる
    await waitFor(() => {
      expect(screen.getByTestId('mcp-status')).toHaveTextContent('MCP接続: OK');
    });
  });

  it('MCPのヘルスチェックが失敗したら「MCP接続: NG」を表示する', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: false, status: 503 } as unknown as Response);

    render(<McpStatus baseUrl="http://localhost:9999" />);

    await waitFor(() => {
      expect(screen.getByTestId('mcp-status')).toHaveTextContent('MCP接続: NG');
    });
  });
});
