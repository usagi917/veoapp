import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('複数顔のときの顔選択UI', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('複数顔があると選択UIを表示し、未選択で生成するとエラー→選択後は生成可能', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page __test_faces={3} />);

    // フォーム必須を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    // 顔選択UIが表示される（ラジオが3つ）
    const radios = screen.getAllByRole('radio', { name: /顔 \d+/ });
    expect(radios).toHaveLength(3);

    // 未選択で生成を押すとエラー
    fireEvent.click(screen.getByRole('button', { name: '生成' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('顔を1つ選択してください。');
    expect(spy).not.toHaveBeenCalled();

    // 顔2を選択
    fireEvent.click(screen.getByRole('radio', { name: '顔 2' }));

    // 再度 生成 → 成功（fetchが呼ばれる、エラーメッセージは消える）
    fireEvent.click(screen.getByRole('button', { name: '生成' }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
