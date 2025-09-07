import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('顔検出に関するUI文言', () => {
  it('顔検出0件のとき「顔が検出できません。単一人物・正面の写真をご利用ください。」を表示', () => {
    render(<Page __test_faces={0} />);
    // 入力を満たしてボタンを有効化
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '顔が検出できません。単一人物・正面の写真をご利用ください。',
    );
  });

  it('複数顔で未選択のとき「顔を1つ選択してください。」を表示', () => {
    render(<Page __test_faces={2} />);
    // 入力を満たしてボタンを有効化
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    expect(screen.getByRole('alert')).toHaveTextContent('顔を1つ選択してください。');
  });
});
