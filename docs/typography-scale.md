# Typography Scale

このプロジェクトで使う文字サイズの基準です。  
基本は `src/App.css` の `:root` にある CSS 変数を利用します。

## Base Scale

- `--font-size-2xs`: `0.75rem` (12px)
- `--font-size-xs`: `0.8125rem` (13px)
- `--font-size-sm`: `0.875rem` (14px)
- `--font-size-md`: `1rem` (16px)
- `--font-size-lg`: `1.125rem` (18px)
- `--font-size-xl`: `1.25rem` (20px)
- `--font-size-2xl`: `1.5rem` (24px)
- `--font-size-3xl`: `1.875rem` (30px)
- `--font-size-4xl`: `2.25rem` (36px)

## Semantic Tokens

- `--text-caption`: 補助情報（時刻、既読、注釈）
- `--text-body`: 通常本文
- `--text-body-strong`: 入力欄や強調本文
- `--text-subtitle`: セクション見出し
- `--text-title`: 画面タイトル（レスポンシブ）
- `--text-hero`: 大きめタイトル（レスポンシブ）
- `--text-display`: 戻るボタンなどの大きな記号テキスト（レスポンシブ）

## Usage Rules

- 新規実装では `font-size` の直接指定を避け、上記トークンを優先する。
- 画面タイトルは `--text-title`、セクション見出しは `--text-subtitle` を基本にする。
- リストの本文は `--text-body`、補助テキストは `--text-caption` または `--font-size-sm` を使う。
- モバイル個別調整が必要な場合も、トークン同士の切り替えで対応する。
