# Claude Code `/agents` 機能 詳細ガイド

## `/agents` コマンドとは

Claude Code の `/agents` は、**特定のタスクに特化したカスタムAIサブエージェントを管理するインタラクティブスラッシュコマンド**です。このコマンドにより、専門的な知識を持つ AI アシスタントを作成・設定・管理し、複雑な開発ワークフローを効率化できます。

## 基本構文と機能

### コマンド構文
```bash
/agents
```

### 主要機能
1. **インタラクティブ管理インターフェース**の提供
2. **利用可能なツール一覧**の表示（MCPサーバーツールを含む）
3. **新しいサブエージェントの作成**
4. **既存エージェント設定の変更**
5. **ツール選択と権限管理**

## サブエージェントの詳細構造

### ファイル配置場所（優先順位順）

```
1. プロジェクトレベル（最高優先度）
   .claude/agents/

2. ユーザーレベル（低優先度）  
   ~/.claude/agents/
```

### サブエージェント定義ファイル構造

```markdown
---
name: エージェント名
description: "このエージェントをいつ呼び出すか、何をするかの説明"
tools: tool1, tool2, tool3  # オプション - 省略時は全ツールを継承
color: green               # オプション - 視覚的識別子
priority: high             # オプション - 実行優先度
environment: production    # オプション - 環境設定
context_mode: minimal      # オプション - 初期化時間の短縮
---

# システムプロンプトコンテンツ
エージェントの動作と専門知識に関する詳細な指示。
```

## 具体的な使用例

### 例1: セキュリティ特化コードレビューエージェント

```markdown
---
name: security-reviewer
description: "セキュリティ脆弱性に特化したコードレビュー。OWASP準拠とセキュアコーディングプラクティスに焦点を当てる"
tools: Read, Grep, Glob, Bash
color: red
priority: high
---

あなたはセキュリティ専門のコードレビュアーです。以下の観点でコードを分析してください：

## 分析項目
1. **認証・認可の問題**
   - 不適切な認証メカニズム
   - 権限昇格の脆弱性
   - セッション管理の問題

2. **入力検証**
   - SQLインジェクション
   - XSS（クロスサイトスクリプティング）
   - コマンドインジェクション

3. **データ保護**
   - 機密情報の平文保存
   - 不適切な暗号化実装
   - ログでの機密情報漏洩

4. **OWASP Top 10 準拠性**
   - 最新のOWASP脆弱性リストとの照合
   - セキュリティ設定の不備

## レビュー手順
1. コード全体の構造分析
2. 各脆弱性カテゴリーでの詳細検査
3. 修正提案とベストプラクティスの提示
4. セキュリティテストの推奨
```

### 例2: パフォーマンス最適化エージェント

```markdown
---
name: performance-optimizer
description: "コードパフォーマンスの分析と最適化。ボトルネックの特定と改善提案を行う"
tools: Read, Grep, Glob, Bash
color: blue
---

パフォーマンス最適化の専門家として、以下の手順でコードを分析します：

## 分析手順
1. **プロファイリング**
   - CPU使用率の分析
   - メモリ消費パターンの確認
   - I/O操作の効率性評価

2. **ボトルネック特定**
   - 実行時間の長い処理の特定
   - 非効率なアルゴリズムの検出
   - データベースクエリの最適化機会

3. **最適化提案**
   - アルゴリズムの改善案
   - データ構造の最適化
   - キャッシュ戦略の提案
   - 並列処理の機会

4. **ベンチマーク**
   - 最適化前後の性能比較
   - 測定方法の提案
```

### 例3: テスト自動実行エージェント

```markdown
---
name: test-runner
description: "コード変更時に自動的にテストを実行し、失敗時は分析・修正を行う"
tools: Read, Write, Bash, Grep
color: green
priority: high
---

テスト自動化の専門家として、以下のワークフローを実行します：

## 自動実行タスク
1. **テスト検出**
   - 変更されたファイルに関連するテストの特定
   - テストスイート全体の必要性判断

2. **テスト実行**
   - 単体テストの実行
   - 統合テストの実行
   - カバレッジレポートの生成

3. **失敗分析**
   - エラーメッセージの詳細分析
   - 失敗原因の特定
   - 修正方針の提案

4. **修正実装**
   - テストの意図を保持した修正
   - リグレッション防止の確認
   - 修正後の再実行
```

## 高度な設定オプション

### settings.local.json での権限管理

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test, npm run lint)",
      "WebFetch(domain:*.github.com)",
      "Read",
      "Write",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf)",
      "WebFetch(domain:untrusted.com)"
    ]
  },
  "agents": {
    "auto_delegate": true,
    "parallel_limit": 5,
    "context_preservation": "minimal"
  }
}
```

### 引数付きエージェント

```markdown
---
name: github-issue-fixer
description: "GitHub イシューを分析して修正。使用例: /agents github-issue-fixer 1234"
tools: Read, Write, Bash, WebFetch
---

GitHub イシュー #$ARGUMENTS を分析し、以下の手順で修正を行います：

1. イシューの詳細取得と分析
2. 関連コードの特定
3. 修正方針の策定
4. 実装とテスト
5. PR作成の準備
```

## 使用パターンと戦略

### 1. 自動委任パターン
```javascript
// コード変更後、Claude Code が自動的に適切なエージェントを選択
// 例: セキュリティ関連の変更 → security-reviewer が自動起動
```

### 2. 明示的呼び出しパターン
```bash
# 特定のエージェントを明示的に呼び出し
> security-reviewer を使って最新の変更をチェックして
> performance-optimizer でこの関数を最適化して
> test-runner でテストを実行して失敗を修正して
```

### 3. 並列マルチエージェントパターン
```bash
# 複数のエージェントを並列実行
> security-reviewer と performance-optimizer を並列で実行して、
> 結果を統合して包括的な分析レポートを作成して
```

### 4. カスタムコマンド統合パターン

`.claude/commands/comprehensive-review.md`:
```markdown
以下のエージェントを順次実行して包括的なコードレビューを実施：

1. security-reviewer でセキュリティ分析
2. performance-optimizer でパフォーマンス分析  
3. test-runner でテスト実行と検証
4. 結果の統合と改善提案の作成
```

## エージェント管理のベストプラクティス

### 1. エージェント設計原則
- **単一責任**: 1つのエージェントは1つの専門分野に集中
- **明確な境界**: 役割と責任の明確な定義
- **再利用性**: プロジェクト間で再利用可能な設計

### 2. 命名規則
```
形式: 目的-機能
例:
- security-reviewer（セキュリティレビュー）
- performance-optimizer（パフォーマンス最適化）
- test-automation（テスト自動化）
- docs-generator（文書生成）
```

### 3. ツール制限戦略
```yaml
# セキュリティ重視の制限例
tools: Read, Grep, Glob  # 読み取り専用操作のみ

# 実装エージェントの場合
tools: Read, Write, Bash, Grep, Glob  # 実装に必要な全ツール

# 研究特化エージェントの場合  
tools: WebFetch, Read, Grep  # 情報収集に特化
```

### 4. コンテキスト最適化
```yaml
context_mode: minimal  # 初期化高速化
context_mode: full     # 完全なコンテキスト保持
context_mode: selective # 選択的コンテキスト保持
```

## 実装例：プロダクション向けエージェント

### フルスタック開発エージェント

```markdown
---
name: fullstack-developer
description: "フロントエンドからバックエンドまで包括的な開発支援"
tools: Read, Write, Bash, Grep, Glob, WebFetch
color: purple
---

フルスタック開発者として、以下の技術スタックに対応します：

## フロントエンド
- React/Vue/Angular
- TypeScript/JavaScript
- CSS/SCSS/Tailwind
- 状態管理（Redux, Vuex等）

## バックエンド  
- Node.js/Python/Java/Go
- RESTful API/GraphQL
- データベース設計・最適化
- 認証・認可システム

## DevOps・インフラ
- CI/CD パイプライン
- コンテナ化（Docker/Kubernetes）
- クラウドサービス（AWS/GCP/Azure）
- モニタリング・ログ管理

## 開発ワークフロー
1. 要件分析と技術選定
2. アーキテクチャ設計
3. 段階的実装
4. テスト・品質保証
5. デプロイ・運用サポート
```

## トラブルシューティング

### よくある問題と解決策

1. **エージェントが認識されない**
   ```bash
   # ファイル配置確認
   ls -la .claude/agents/
   
   # YAML形式の確認
   cat .claude/agents/your-agent.md
   ```

2. **ツール権限エラー**
   ```json
   // settings.local.json で権限確認
   {
     "permissions": {
       "allow": ["必要なツール名"]
     }
   }
   ```

3. **パフォーマンス低下**
   ```yaml
   # context_mode を最適化
   context_mode: minimal
   
   # 不要なツールを除外
   tools: Read, Grep  # 必要最小限に限定
   ```

## まとめ

Claude Code の `/agents` 機能は、専門的なAIアシスタントを通じて開発ワークフローを大幅に効率化する強力なツールです。適切な設計と実装により、コードレビュー、テスト自動化、パフォーマンス最適化、セキュリティ分析など、あらゆる開発タスクを専門家レベルで自動化できます。

プロジェクトの要件に応じてカスタマイズされたエージェントを作成し、チーム全体での一貫した品質と効率性を実現することが可能になります。