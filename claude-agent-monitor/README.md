# Claude Agent Monitor

Claude Codeエージェント活動ログ管理・分析CLI

## 概要

**Claude Agent Monitor**は、Claude Codeでのエージェント活動を追跡・分析するための包括的な監視システムです。リアルタイムでエージェントの活動を監視し、パフォーマンス分析とインサイトを提供します。

## 特徴

- **リアルタイム監視**: エージェント活動をリアルタイムで追跡
- **パフォーマンス分析**: 効率性、成功率、実行時間などの詳細分析
- **視覚的ダッシュボード**: CLIベースの美しいダッシュボード
- **セキュリティファースト**: セキュリティを重視した設計
- **拡張可能**: モジュラー設計で簡単に拡張可能

## インストール

```bash
# プロジェクトをクローン
git clone <repository-url>
cd claude-agent-monitor

# 依存関係をインストール
npm install

# ビルド
npm run build
```

## 使用方法

### 基本コマンド

```bash
# ヘルプを表示
claude-monitor --help

# リアルタイム監視を開始
claude-monitor start

# ライブダッシュボード付きで監視開始
claude-monitor start --live

# セッションデータを分析
claude-monitor analyze

# 特定の時間範囲で分析
claude-monitor analyze --time-range 24h

# JSON形式で出力
claude-monitor analyze --format json

# エージェント比較
claude-monitor compare frontend-developer backend-developer

# セッション履歴を表示
claude-monitor list

# システム統計を表示
claude-monitor stats
```

### 高度な使用例

```bash
# 特定のエージェントの7日間の活動を分析
claude-monitor analyze --agent backend-developer --time-range 7d

# 複数のエージェントを比較（過去30日間）
claude-monitor compare ceo project-manager --time-range 30d

# カスタム日付範囲での分析
claude-monitor analyze --time-range 2024-01-01~2024-01-31

# 結果をファイルに出力
claude-monitor analyze --format json --output analysis.json
```

## アーキテクチャ

### コアコンポーネント

1. **Log Parser** - Claude Codeセッションログの解析
2. **Agent Tracker** - エージェント活動のリアルタイム追跡
3. **Session Analyzer** - パフォーマンス分析エンジン
4. **Data Manager** - 高性能データストレージ管理
5. **Dashboard** - CLI視覚化システム

### ディレクトリ構成

```
src/
├── analytics/          # 分析エンジン
├── parser/             # ログパーサー
├── storage/            # データ管理
├── tracker/            # エージェント追跡
├── ui/                 # ユーザーインターフェース
├── utils/              # ユーティリティ
└── types/              # 型定義
```

## 設定

### 環境変数

```bash
# 詳細ログを有効化
export VERBOSE=true

# デバッグモードを有効化
export DEBUG=true
```

### データストレージ

デフォルトでは、データは`./claude-monitor-data`ディレクトリに保存されます。
設定により以下をカスタマイズ可能：

- データ保存期間（デフォルト30日）
- 圧縮の有効/無効
- 暗号化設定
- バックアップ設定

## 開発

### 開発環境のセットアップ

```bash
# 開発サーバーを起動
npm run dev

# テストを実行
npm test

# リンターを実行
npm run lint

# 型チェック
npm run build
```

### カスタムエージェントの追加

新しいエージェントタイプを追加するには：

1. `src/types/index.ts`に新しい`AgentType`を追加
2. `src/tracker/agent-tracker.ts`でエージェント情報を登録
3. `src/utils/formatter.ts`でカラーテーマを設定

## API

### プログラマティック使用

```typescript
import { ClaudeAgentMonitor } from 'claude-agent-monitor';

const monitor = new ClaudeAgentMonitor('./logs', './data');

// 監視開始
await monitor.start({ enableDashboard: true });

// 分析実行
const result = await monitor.analyze({
  timeRange: { start: new Date('2024-01-01'), end: new Date() }
});

// 監視停止
await monitor.stop();
```

## トラブルシューティング

### 一般的な問題

1. **ログファイルが見つからない**
   - `.claude/chat`ディレクトリが存在することを確認
   - 適切な権限があることを確認

2. **メモリ使用量が多い**
   - データ保存期間を短縮
   - 圧縮を有効化

3. **パフォーマンスが遅い**
   - インデックス機能を有効化
   - SSDストレージを使用

## ライセンス

MIT License

## 貢献

バグ報告や機能要求は、GitHubのIssuesを通じてお寄せください。

## 開発者

AI Virtual Corporation

## バージョン履歴

### v1.0.0
- 初回リリース
- リアルタイム監視機能
- パフォーマンス分析機能
- CLIダッシュボード
- データ永続化機能