/* eslint-disable @typescript-eslint/no-explicit-any */
// 最小のMD3テーマ適用ユーティリティ
// - JSDOMでも検証できるように <style id="md3-theme"> を挿入
// - html 要素に data-ui-theme="md3" を付与

export function ensureMd3ThemeInstalled(doc?: unknown) {
  const d = (doc ?? document) as any;
  if (!d.getElementById('md3-theme')) {
    const style = d.createElement('style');
    style.id = 'md3-theme';
    // 必要最小限のトークン＋ざっくりした見た目（実ブラウザ用）
    style.textContent = `
      :root {
        --md3-color-primary: #6750A4;
        --md3-color-on-primary: #ffffff;
        --md3-color-surface: #FFFBFE;
        --md3-color-on-surface: #1C1B1F;
        --md3-color-outline: #79747E;
        --md3-radius: 12px;
        --md3-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
      }

      [data-ui-theme="md3"] { background: var(--md3-color-surface); color: var(--md3-color-on-surface); font-family: var(--md3-font); }

      [data-ui-theme="md3"] button {
        appearance: none;
        border: none;
        padding: 10px 16px;
        border-radius: var(--md3-radius);
        background: var(--md3-color-primary);
        color: var(--md3-color-on-primary);
        font-weight: 600;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08);
        cursor: pointer;
      }
      [data-ui-theme="md3"] button[disabled] { opacity: .5; cursor: default; }

      [data-ui-theme="md3"] input, [data-ui-theme="md3"] select, [data-ui-theme="md3"] textarea {
        background: white;
        color: var(--md3-color-on-surface);
        border: 1px solid var(--md3-color-outline);
        border-radius: var(--md3-radius);
        padding: 10px 12px;
        outline: none;
      }
      [data-ui-theme="md3"] textarea { min-height: 96px; }

      [data-ui-theme="md3"] label { font-weight: 600; }

      /* ヘッダ右上のキー操作ボタン用軽い位置調整 */
      [data-ui-theme="md3"] .top-actions { display:flex; justify-content:flex-end; margin-bottom: 8px; }
    `;
    d.head.appendChild(style);
  }
  const html = d.documentElement;
  if (html.getAttribute('data-ui-theme') !== 'md3') {
    html.setAttribute('data-ui-theme', 'md3');
  }
}
