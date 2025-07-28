---
name: project-start
description: 新しいプロジェクトを開始します。戦略立案から技術設計、チーム編成、タスク分解まで、プロジェクト開始に必要な全工程を統括します。
---

# 新プロジェクト開始 (Project Start)

## 🚀 プロジェクト開始フロー

### Phase 1: 戦略策定 (CEO)
```bash
/agents ceo "新プロジェクト「[プロジェクト名]」の戦略立案

要件:
- [要件1]
- [要件2]
- [要件3]

期限: [期限]
予算: [予算]"
```

### Phase 2: 技術設計 (CTO)
```bash
/agents cto "プロジェクト「[プロジェクト名]」の技術アーキテクチャ設計

CEO戦略: [CEOの出力内容]

検討事項:
- 技術スタック選定
- システム構成
- セキュリティ要件
- パフォーマンス要件"
```

### Phase 3: プロジェクト計画 (PM)
```bash
/agents project-manager "プロジェクト「[プロジェクト名]」の開発計画策定

技術仕様: [CTOの出力内容]

作成物:
- WBSとタスク分解
- スケジュール
- リソース配分
- リスク分析"
```

### Phase 4: チーム編成・キックオフ
並列実行でチーム全体に情報共有:
```bash
/agents frontend-developer "プロジェクト参加・フロントエンド要件確認"
/agents backend-developer "プロジェクト参加・バックエンド要件確認"  
/agents qa-engineer "プロジェクト参加・品質基準確認"
```

## 📁 プロジェクト管理構造

### ディレクトリ作成
```
docs/projects/active/[プロジェクト名]/
├── 01_strategy/
│   ├── business-requirements.md
│   ├── technical-architecture.md
│   └── project-plan.md
├── 02_development/
│   ├── frontend/
│   ├── backend/
│   └── qa/
├── 03_meetings/
│   ├── kickoff.md
│   ├── daily-standups/
│   └── sprint-reviews/
└── 04_deliverables/
    ├── specifications/
    ├── code/
    └── documentation/
```

## 📝 プロジェクト基本情報テンプレート

```markdown
# プロジェクト: [プロジェクト名]

## 基本情報
- **開始日**: YYYY-MM-DD
- **期限**: YYYY-MM-DD  
- **予算**: [予算]万円
- **責任者**: [プロジェクトマネージャー]

## 目的・背景
[プロジェクトの目的と背景]

## 成果物
1. [成果物1]
2. [成果物2]
3. [成果物3]

## チーム構成
- **PM**: [担当者] - 全体進行・調整
- **Frontend**: [担当者] - UI/UX実装
- **Backend**: [担当者] - API・DB実装
- **QA**: [担当者] - 品質保証・テスト

## 主要マイルストーン
- **要件定義完了**: MM/DD
- **設計完了**: MM/DD
- **開発完了**: MM/DD
- **テスト完了**: MM/DD
- **リリース**: MM/DD

## リスク・課題
1. [リスク1] - 対策: [対策内容]
2. [リスク2] - 対策: [対策内容]

## 成功基準
- [定量的指標]
- [定性的指標]
```

## 🎯 使用方法

```bash
# 新プロジェクト開始
/project-start "[プロジェクト名]" "[要件概要]"

# プロジェクト情報は docs/projects/active/ に自動保存
# 各エージェントのTodoWriteに自動的にタスク追加
```

---

このコマンドにより、プロジェクト開始の標準化とドキュメント管理の一元化を実現します。