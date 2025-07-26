# AI Organization - Claude Codeサブエージェント組織

Claude Codeのサブエージェント機能を使用した仮想AI組織の実装です。実際の企業組織構造をモデルに、各エージェントが協調して複雑なタスクを遂行します。

## 🏢 組織構造

```
CEO (最高経営責任者)
├── COO (最高執行責任者)
├── CTO (最高技術責任者)
│   ├── 開発部門
│   ├── インフラ・DevOps部門
│   └── セキュリティ部門
├── CMO (最高マーケティング責任者)
└── CPO (最高プロダクト責任者)
```

## 🚀 クイックスタート

### 1. 基本的な使い方

```bash
# CEOエージェントを起動してプロジェクトを開始
Task(
  description="CEOとして新規プロジェクトを立ち上げる",
  prompt="ai-organization/agents/executive/ceo.yamlの定義に従って、新規Webアプリ開発プロジェクトを開始してください",
  subagent_type="general-purpose"
)
```

### 2. 実践的な例：TODO管理アプリの開発

```bash
# ステップ1: CEOが戦略決定
Task(
  description="CEOとしてTODOアプリ開発の戦略立案",
  prompt="""
  ai-organization/agents/executive/ceo.yamlに従ってCEOとして行動し、
  以下の要件でTODO管理アプリの開発戦略を立案してください：
  
  - ターゲット: 個人ユーザー
  - 主要機能: タスク作成、編集、削除、完了管理
  - 技術要件: React + Node.js
  - 期限: 2週間
  
  CTOへの技術要件の伝達も含めてください。
  """,
  subagent_type="general-purpose"
)

# ステップ2: CTOが技術設計
Task(
  description="CTOとして技術アーキテクチャ設計",
  prompt="""
  ai-organization/agents/executive/cto.yamlに従ってCTOとして、
  TODO管理アプリの技術設計を行ってください：
  
  1. 技術スタックの詳細決定
  2. システムアーキテクチャ図
  3. 開発タスクの分解
  4. 各チームへの作業割り当て案
  """,
  subagent_type="general-purpose"
)

# ステップ3: PMがスプリント計画
Task(
  description="PMとしてスプリント計画作成",
  prompt="""
  ai-organization/agents/development/project-manager.yamlに従って、
  TODO管理アプリの2週間スプリント計画を作成してください。
  
  必ずTodoWriteツールを使用してタスクを管理し、
  優先度と期限を明確に設定してください。
  """,
  subagent_type="general-purpose"
)
```

### 3. 並列開発の例

```bash
# フロントエンドとバックエンドを並列で開発
Task(
  description="フロントエンド開発",
  prompt="""
  ai-organization/agents/development/frontend-developer.yamlに従って、
  TODO管理アプリのReactフロントエンドを実装してください：
  - タスク一覧コンポーネント
  - タスク追加フォーム
  - タスク編集・削除機能
  """,
  subagent_type="general-purpose"
)

# 同時に別のターミナルで
Task(
  description="バックエンドAPI開発",
  prompt="""
  バックエンド開発者として、TODO管理アプリのREST APIを実装：
  - GET /api/todos
  - POST /api/todos
  - PUT /api/todos/:id
  - DELETE /api/todos/:id
  """,
  subagent_type="general-purpose"
)
```

## 📁 ディレクトリ構造

```
ai-organization/
├── README.md                  # このファイル
├── CLAUDE.md                  # Claude Code用ガイドライン
├── org-structure.yaml         # 組織構造定義
├── agents/                    # エージェント定義
│   ├── executive/            # 経営層
│   │   ├── ceo.yaml
│   │   └── cto.yaml
│   └── development/          # 開発部門
│       ├── project-manager.yaml
│       └── frontend-developer.yaml
└── templates/                # テンプレート
    └── agent-prompt-template.yaml
```

## 🎯 活用シナリオ

### シナリオ1: 新機能開発

1. **CEO**: ビジネス要件と戦略の決定
2. **CTO**: 技術要件と設計
3. **PM**: タスク分解とスケジューリング
4. **開発チーム**: 並列実装
5. **QA**: テストと品質保証

### シナリオ2: バグ修正フロー

1. **QA**: バグの発見と報告
2. **PM**: 優先度判定とアサイン
3. **開発者**: 原因調査と修正
4. **QA**: 修正確認
5. **PM**: リリース調整

### シナリオ3: 技術調査

1. **CTO**: 新技術の評価指示
2. **アーキテクト**: 技術調査と比較
3. **開発者**: プロトタイプ作成
4. **CTO**: 導入判断

## 💡 ベストプラクティス

### 1. 明確な役割定義
- 各エージェントの責任範囲を明確に
- 重複を避け、専門性を活かす

### 2. 効果的な並列処理
- 独立したタスクは並列実行
- 依存関係を考慮した順序付け

### 3. コンテキスト管理
- MULTI_AGENT_PLAN.mdで全体管理
- 定期的な状態同期

### 4. 品質保証
- コードレビューの自動化
- テストカバレッジの維持

## 🔧 カスタマイズ

### 新しいエージェントの追加

1. `templates/agent-prompt-template.yaml`をコピー
2. 役割に応じてカスタマイズ
3. `agents/`配下に配置
4. `org-structure.yaml`に追加

### 組織構造の変更

`org-structure.yaml`を編集して、部門や階層を調整できます。

## 📊 パフォーマンス指標

- **タスク完了率**: 95%以上
- **並列実行効率**: 80%以上
- **品質スコア**: 90%以上
- **レスポンス時間**: 2時間以内

## 🚨 注意事項

1. **トークン管理**: 大規模プロジェクトでは計画的に使用
2. **セキュリティ**: 機密情報は扱わない
3. **エラー処理**: 適切なエラーハンドリング
4. **ドキュメント**: 重要な決定は必ず記録

## 📚 関連ドキュメント

- [AI_ORGANIZATION_PLAN.md](../AI_ORGANIZATION_PLAN.md) - 詳細な実装計画
- [CLAUDE.md](CLAUDE.md) - Claude Code運用ガイド
- [エージェント定義](agents/) - 各エージェントの詳細

## 🤝 貢献方法

1. 新しいエージェントタイプの提案
2. ワークフローの改善
3. ベストプラクティスの共有
4. バグ報告とフィードバック

---

このAI組織システムを使用して、効率的で高品質なソフトウェア開発を実現しましょう！