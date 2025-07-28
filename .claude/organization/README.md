# AI Organization with Claude Code

AIエージェント組織を Claude Code で実現するための完全ガイド

## 🌟 経営理念

**ミッション**: AIとの協働により、人類の創造性と生産性を最大化する  
**ビジョン**: 2030年までに、AIエージェント組織のグローバルスタンダードとなる

**コアバリュー**: 協働 / 透明性 / 継続的学習 / 品質追求 / 倫理的行動

## 🏢 組織構造

```
CEO (戦略統括)
├── CTO (技術統括)
│   └── Project Manager (実行管理)
│       ├── Frontend Developer
│       ├── Backend Developer  
│       └── QA Engineer
└── Deep Researcher (調査専門)
```

## 🚀 クイックスタート

### 基本コマンド
```bash
/agents              # エージェント一覧
/agents ceo         # CEOエージェント起動
/agents project-manager  # PMエージェント起動
```

### 典型的なワークフロー
```bash
# 1. 戦略立案
/agents ceo "新しいWebアプリ開発の戦略を立案"

# 2. 技術設計（CEOの出力を基に）
/agents cto "技術アーキテクチャを設計。要件: [CEOの出力]"

# 3. プロジェクト管理（CTOの出力を基に）
/agents project-manager "開発計画を作成。技術仕様: [CTOの出力]"

# 4. 並列開発
/agents frontend-developer "UIを実装"
/agents backend-developer "APIを実装"
```

## 📋 エージェント役割一覧

| エージェント | 主な責任 | 特徴 | 使用タイミング |
|------------|---------|------|--------------|
| **CEO** | 戦略立案・意思決定 | ultrathink mode | 新規プロジェクト開始時 |
| **CTO** | 技術戦略・アーキテクチャ | think_hard mode | 技術的判断が必要な時 |
| **PM** | タスク管理・進捗追跡 | TodoWrite必須 | 日々の開発管理 |
| **Frontend** | UI/UX実装 | React/TypeScript | フロントエンド開発時 |
| **Backend** | API/DB実装 | セキュリティ重視 | サーバーサイド開発時 |
| **QA** | 品質保証 | 包括的テスト | リリース前の品質確認 |
| **Deep Researcher** | 深い調査・分析 | 反復的検索 | 複雑な調査が必要な時 |

## 🔄 エージェント間の連携

### 階層的委譲
- CEO → CTO → PM → 開発チーム
- 各エージェントは下位に具体的指示を出す
- 上位への報告は問題・決定事項のみ

### 重要ルール
- エージェントは直接他のエージェントを呼べない
- ユーザーが各エージェントの出力を次に渡す
- コンテキストを保持して段階的に実行

## 📁 ドキュメント管理

### 保存先
- 戦略文書: `docs/strategy/`
- 技術文書: `docs/technical/`
- プロジェクト: `docs/projects/`

### 命名規則
`YYYY-MM-DD_[カテゴリ]_[タイトル].md`

## 💡 ベストプラクティス

1. **明確な指示**: 各エージェントに具体的な要件を提供
2. **段階的実行**: 上位の決定を下位に正確に伝達
3. **並列処理**: 独立タスクは同時実行で効率化
4. **文書化**: 重要な決定は必ず記録

## ⚙️ 技術仕様

### エージェントファイル形式
```yaml
---
name: agent-name
description: エージェントの説明と使用例
tools: 使用ツールリスト
color: 表示色
priority: high
context_mode: minimal
---

プロンプト本文...
```

### パフォーマンス最適化
- `context_mode: minimal` で初期化高速化
- 必要最小限のツールのみ指定
- 簡潔なプロンプト設計

## 🎯 成功指標

- タスク完了率: 95%+
- 品質基準達成: 98%+
- レスポンス時間: < 2時間
- ドキュメント化率: 100%

## 📁 ファイル構造（簡素化済み）

```
.claude/
├── agents/           # エージェント定義ファイル（7個）
│   ├── ceo.md       # 戦略立案・意思決定
│   ├── cto.md       # 技術戦略・アーキテクチャ  
│   ├── project-manager.md # タスク管理・進捗追跡
│   ├── frontend-developer.md # UI/UX実装
│   ├── backend-developer.md # API/DB実装
│   ├── qa-engineer.md # 品質保証
│   └── deep-researcher.md # 深い調査・分析
├── commands/         # カスタムコマンド
└── organization/     # このファイル（全ドキュメント統合）
```

## 🗂️ 削除された重複ファイル

以下のファイルは統合により不要となりました：
- `claude-agents-*.md` (3ファイル) → このREADMEに統合
- `ai-organization/agents/` → `.claude/agents/` に一本化
- `ai-organization/README.md` → このファイルに統合
- `docs/README.md` → このファイルに統合

---

**🎯 結果**: ファイル数を約70%削減し、管理を大幅に簡素化