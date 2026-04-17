# Matchmaking-app

エンジニア向けマッチングアプリのMVPフロントエンドです。`claude.md`の要件に沿い、Reactとローカルストレージを利用したサンプルアプリを構成しました。

## 主な機能
- GitHubユーザ名入力によるローカルログイン（OIDC連携を想定したデモUI）
- 年齢確認（18歳以上のみ）
- プロフィール登録・編集（必須項目不足時の入力誘導）
- プロフィール画面にGitHub草を表示
- Tinder風カードUI（LIKE / NOPE / スーパーライク / 巻き戻し）
- Boost操作のデモアラート
- 設定タブでの技術タグ部分一致・経験年数フィルタ
- いいね / スーパーライクとマッチ成立処理
- 通常いいね同士で成立した場合のマッチ成立モーダル
- マッチ一覧の検索・未読バッジ
- マッチング済みユーザとのチャット（既読管理、BroadcastChannel + localStorage によるブラウザ内同期）

## 使い方

1. 依存をインストール

```bash
npm install
```

2. 開発サーバーを起動

```bash
npm start
```

3. テストを実行

```bash
npm test
```

## 環境変数

`.env.example`を参考に、必要な値を `.env` に設定してください。

```text
REACT_APP_GITHUB_OIDC_ISSUER=https://github.com
```

## フォルダ構成

- `src/components/` - Reactコンポーネント
- `src/hooks/` - カスタムフック
- `src/services/` - ローカルストレージと認証サービス
- `src/utils/` - フィルタ・マッチングロジック
- `src/tests/`, `tests/` - Jestテスト
