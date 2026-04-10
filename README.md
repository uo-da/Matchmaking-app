# Matchmaking-app

エンジニア向けマッチングアプリのMVPフロントエンドです。`claude.md`の要件に沿い、Reactとローカルストレージを利用したサンプルアプリを構成しました。

## 主な機能
- GitHub連携ログイン（OIDCを想定した入力UI）
- 年齢確認（18歳以上のみ）
- プロフィール登録・編集
- プロフィール画面にGitHub草を表示
- ユーザ一覧・検索・フィルタリング
- いいね / スーパーライク
- マッチング済みユーザとのチャット（ブラウザ内ストレージとBroadcastChannelで実装）

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
- `tests/` - Jestテスト
