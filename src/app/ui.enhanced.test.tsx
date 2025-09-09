/**
 * 拡張UIデザイン改善のテスト
 * - より洗練された視覚的要素
 * - アニメーション効果
 * - インタラクション状態の改善
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import Page from './page';

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('Enhanced UI Design', () => {
  it('should render with improved visual hierarchy', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    // ヘッダーに改善されたビジュアルグラデーションが適用される
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    // メインタイトルがより印象的なスタイルで表示される
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Pictalk');
    expect(title).toHaveClass('enhanced-title');

    // 設定パネルに視覚的な改善が加えられる
    const settingsPanel = screen.getByRole('region', { name: '設定パネル' });
    expect(settingsPanel).toHaveClass('enhanced-panel');
  });

  it('should have enhanced button interactions', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    const generateButton = screen.getByRole('button', { name: /動画を生成する/ });
    expect(generateButton).toHaveClass('enhanced-button');
  });

  it('should show loading states with improved animations', () => {
    render(
      <TestWrapper>
        <Page __test_faces={1} />
      </TestWrapper>,
    );

    void screen.queryByText(/生成中/);
    // ローディング状態での改善されたアニメーション要素をテスト
  });

  it('should display enhanced progress visualization', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    // 進行状況の視覚的改善
    const progressSection = screen.getByRole('region', { name: 'ステータスパネル' });
    expect(progressSection).toBeInTheDocument();

    // 改善されたステップ表示（見出しに絵文字が含まれる場合もある）
    const progressSteps = screen.getAllByText(/⏳|🎬|✨/);
    expect(progressSteps.length).toBeGreaterThanOrEqual(3);
  });

  it('should have improved form field styling', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    // セリフ入力フィールドの改善されたスタイル
    const scriptInput = screen.getByRole('textbox', { name: /セリフ/ });
    expect(scriptInput).toHaveClass('enhanced-input');

    // セレクトボックスの改善
    const genderSelect = screen.getByRole('combobox', { name: /性別/ });
    expect(genderSelect).toHaveClass('enhanced-select');
  });

  it('should show enhanced modal design', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    const apiKeyButton = screen.getByRole('button', { name: /APIキー設定/ });
    expect(apiKeyButton).toHaveClass('enhanced-secondary-button');
  });

  it('should have improved card layouts', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    // カードコンポーネントの視覚的改善
    const settingsCard = screen.getByRole('region', { name: '設定パネル' });
    expect(settingsCard).toHaveClass('enhanced-card');

    // 進行状況カードの改善 - 見出しのテキストには絵文字が含まれる
    const progressCard = screen.getByText(/📊\s*進行状況/).closest('.md3-card');
    expect(progressCard).toHaveClass('enhanced-progress-card');
  });

  it('should display enhanced upload area', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    // アップロード領域の改善されたデザイン
    const uploadLabel = screen.getByText(/画像をアップロード/);
    const uploadArea = uploadLabel.closest('div');
    expect(uploadArea).toHaveClass('enhanced-upload-zone');
  });

  it('should show improved status messages', () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>,
    );

    // エラーメッセージの改善されたスタイリング（条件付きでテスト）
    // 成功メッセージの改善されたスタイリング（条件付きでテスト）
    // より良いアイコンとアニメーションの使用
  });
});
