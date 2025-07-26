# Claude Code AI組織 運用ガイド

このドキュメントはClaude Codeのサブエージェント機能を使用してAI組織を運用する際のガイドラインです。

## AI組織の概要

このプロジェクトでは、実際の企業組織をモデルにした仮想AI組織を構築しています。各エージェントは明確な役割と責任を持ち、Claude Codeのサブエージェント機能を通じて協調的に動作します。

## エージェントの起動方法

### 1. CEOエージェントの起動（組織全体の統括）

```bash
# CEOエージェントを起動してプロジェクトを開始
Task(
  description="CEOとして新規Webアプリ開発プロジェクトを立ち上げる",
  prompt="""
  ai-organization/agents/executive/ceo.yamlの定義に従ってCEOとして行動してください。
  
  タスク: 新規Webアプリケーション開発プロジェクトの立ち上げ
  要件:
  - ユーザー認証機能
  - データベース設計
  - RESTful API
  - Reactフロントエンド
  
  以下を実行してください:
  1. プロジェクト戦略の策定
  2. CTOへの技術要件の伝達
  3. 必要なリソースの配分決定
  """,
  subagent_type="general-purpose"
)
```

### 2. 部門別エージェントの起動

```bash
# CTOエージェント - 技術戦略
Task(
  description="CTOとして技術アーキテクチャを設計",
  prompt="""
  ai-organization/agents/executive/cto.yamlの定義に従ってCTOとして行動してください。
  
  CEOからの要件を基に:
  1. 技術スタックの選定
  2. アーキテクチャ設計
  3. 開発チームへのタスク配分
  """,
  subagent_type="general-purpose"
)

# プロジェクトマネージャー - タスク管理
Task(
  description="PMとしてスプリント計画を作成",
  prompt="""
  ai-organization/agents/development/project-manager.yamlの定義に従ってPMとして行動してください。
  
  必ずTodoWriteツールを使用してタスクを管理し、
  MULTI_AGENT_PLAN.mdを更新してください。
  """,
  subagent_type="general-purpose"
)
```

### 3. 並列実行の例

```bash
# フロントエンドとバックエンドの並列開発
[
  Task(
    description="フロントエンド開発者としてUIを実装",
    prompt="ai-organization/agents/development/frontend-developer.yamlに従ってReactコンポーネントを実装",
    subagent_type="general-purpose"
  ),
  Task(
    description="バックエンド開発者としてAPIを実装",
    prompt="バックエンドAPIの実装（認証、データベース接続）",
    subagent_type="general-purpose"
  )
]
```

## 組織運用のベストプラクティス

### 1. 階層的なタスク配分

1. **CEO** → 戦略的決定とビジョン設定
2. **CTO/CMO/CPO** → 部門戦略と実行計画
3. **Directors** → チーム管理と調整
4. **Individual Contributors** → 具体的な実装

### 2. 効果的な並列処理

- 独立したタスクは並列実行
- 依存関係のあるタスクは順次実行
- クリティカルパスを意識した計画

### 3. コミュニケーションフロー

```yaml
報告ライン:
  - 日次: チームメンバー → マネージャー
  - 週次: マネージャー → ディレクター
  - 月次: ディレクター → C-Suite
  
エスカレーション:
  - ブロッカー: 2時間以内
  - 重要決定: 24時間以内
  - 緊急事態: 即座
```

### 4. 品質管理

- コードレビュー: 別のエージェントによるクロスチェック
- テスト: QAエージェントによる自動テスト
- セキュリティ: セキュリティエージェントによる監査

## トークン管理

### 効率的な使用方法

1. **コンテキスト共有**: MULTI_AGENT_PLAN.mdで状態管理
2. **要約と圧縮**: 長い出力は要点を抽出
3. **定期的なクリア**: 長時間セッションでは/clearを活用

### 推奨制限

- 単一エージェント: 100-200トークン時間/タスク
- 並列実行: 最大5エージェント同時
- プロジェクト全体: 1000トークン時間/週

## トラブルシューティング

### よくある問題

1. **エージェントが応答しない**
   - プロンプトが明確か確認
   - 役割定義ファイルのパスが正しいか確認
   - タスクの粒度が適切か確認

2. **タスクの重複**
   - MULTI_AGENT_PLAN.mdを確認
   - TodoWriteでタスク状態を確認
   - 通信ログを確認

3. **パフォーマンス低下**
   - 並列実行数を減らす
   - タスクを小さく分割
   - 不要なコンテキストをクリア

## 実行例

### 新機能開発の流れ

```bash
# 1. CEOが戦略決定
/agent ceo "ユーザーダッシュボード機能の追加を決定"

# 2. CTOが技術設計
/agent cto "ダッシュボード機能の技術要件定義"

# 3. PMがタスク分解
/agent pm "ダッシュボード開発のスプリント計画作成"

# 4. 開発チームが並列実装
/agent parallel frontend backend qa

# 5. レビューとデプロイ
/agent review-and-deploy
```

## 重要な注意事項

1. **セキュリティ**: 機密情報は扱わない
2. **倫理**: AIエージェントの行動は倫理的ガイドラインに従う
3. **透明性**: すべての決定と行動を記録
4. **品質**: 高い品質基準を維持

## 関連ファイル

- `ai-organization/org-structure.yaml`: 組織構造定義
- `ai-organization/agents/`: 個別エージェント定義
- `ai-organization/templates/`: テンプレート集
- `MULTI_AGENT_PLAN.md`: 実行計画とログ

このガイドラインに従って、効率的で協調的なAI組織を運用してください。