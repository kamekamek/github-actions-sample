# AI Organization Documentation Repository

このディレクトリは、AI Virtual Corporationの全組織ドキュメントを体系的に管理するためのものです。

## 📁 ディレクトリ構造

```
docs/
├── strategy/           # 戦略文書 (CEO作成)
├── technical/          # 技術文書 (CTO作成)
├── projects/           # プロジェクト文書 (PM作成)
├── meeting-notes/      # 会議録
├── reports/            # 各種レポート
├── specifications/     # 要件定義書
├── architecture/       # アーキテクチャ図・設計書
└── testing/           # テスト文書 (QA作成)
```

## 🎯 各ディレクトリの用途

### strategy/ - 戦略文書
**作成者**: CEO
- ビジネス戦略
- 市場分析
- 競合分析
- ロードマップ
- 投資方針

### technical/ - 技術文書
**作成者**: CTO
- 技術戦略
- アーキテクチャ決定記録 (ADR)
- 技術選定理由
- セキュリティ方針
- パフォーマンス基準

### projects/ - プロジェクト文書
**作成者**: Project Manager
- プロジェクト計画書
- スプリント計画
- 進捗レポート
- リスク管理文書
- 完了レポート

### meeting-notes/ - 会議録
**作成者**: 各会議主催者
- 経営会議
- 技術レビュー会議
- スプリントレビュー
- 意思決定記録

### reports/ - 各種レポート
**作成者**: 各部門
- 月次レポート
- 四半期レビュー
- KPI分析
- パフォーマンス報告

### specifications/ - 要件定義書
**作成者**: PM + 開発チーム
- 機能要件
- 非機能要件
- API仕様書
- データベース設計

### architecture/ - アーキテクチャ文書
**作成者**: CTO + アーキテクト
- システム構成図
- ネットワーク図
- データフロー図
- インフラ構成

### testing/ - テスト文書
**作成者**: QA Engineer
- テスト計画
- テストケース
- テスト結果
- バグレポート
- 品質レポート

## 📝 ファイル命名規則

### 基本形式
```
YYYY-MM-DD_category_title.md
```

### 例
- `2024-01-26_strategy_ecommerce-platform-roadmap.md`
- `2024-01-26_technical_microservices-architecture.md`
- `2024-01-26_project_todo-app-sprint-plan.md`

## 📋 ドキュメントテンプレート

各カテゴリには標準テンプレートを使用してください：

- **戦略文書**: `templates/strategy-template.md`
- **技術文書**: `templates/technical-template.md`
- **プロジェクト文書**: `templates/project-template.md`
- **レポート**: `templates/report-template.md`

## 🔄 更新フロー

1. **ドキュメント作成/更新** → 適切なディレクトリに保存
2. **ファイル名を規則に従って設定**
3. **必要に応じて関連ドキュメントを更新**
4. **チームに共有/レビュー依頼**

## 📊 ドキュメント管理責任者

| ディレクトリ | 主責任者 | 更新頻度 | レビュー者 |
|-------------|----------|----------|-----------|
| strategy/ | CEO | 月次 | 経営陣 |
| technical/ | CTO | 週次 | 技術チーム |
| projects/ | PM | 日次 | ステークホルダー |
| testing/ | QA | スプリント毎 | 開発チーム |

## 🔍 検索とアクセス

```bash
# 特定の文書を検索
grep -r "keyword" docs/

# 最新の戦略文書を確認
ls -la docs/strategy/ | head -10

# プロジェクト関連文書を一覧
find docs/projects/ -name "*.md" -type f
```

このディレクトリ構造に従って、組織の知識資産を体系的に管理しましょう。