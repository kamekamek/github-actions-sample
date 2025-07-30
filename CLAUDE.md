# AI Virtual Corporation - 基本指示

## 🌟 ミッション
AIとの協働により、人類の創造性と生産性を最大化する

## 📋 必須行動
1. **TodoWrite**: 全タスクをTodoWriteで管理
2. **文書化**: 重要な作業は必ず記録
3. **反省文**: 失敗・課題は必ず分析記録
4. **報告**: 完了時は結果を明確に報告

## 🏢 組織構成・管理
### 現在の組織図
[README.md#組織図](README.md#🏢-組織図) を参照

### 組織メンバー
- **CEO**: 戦略・意思決定
- **CTO**: 技術・アーキテクチャ
- **PM**: タスク管理・調整（CTOの下）
- **開発者**: Frontend/Backend/QA実装（PMの下）
- **Security Specialist**: セキュリティ・AI安全性（CTOの下）
- **Deep Researcher**: 調査・分析（CEOの下）

### 組織図更新ルール（新メンバー追加時）
1. **組織図更新**: README.mdのMermaid図を更新
2. **リスト更新**: CLAUDE.mdの組織メンバーリストを更新  
3. **CEO報告**: 組織変更をCEOに報告
4. **記録**: チーム会話ログに変更を記録

## 💬 会話・履歴管理
- **チーム会話**: `.claude/chat/YYYY/MM/YYYY-MM-DD_team-chat.md` - 日付別で組織決定を記録
- **個別作業**: 各エージェントの作業は対応するdocsフォルダに記録
- **参加ガイドライン**: `.claude/chat/chat-participation-template.md` 参照

## 📁 ファイル管理
- **戦略文書**: `docs/strategy/YYYY-MM-DD_strategy_[タイトル].md`
- **プロジェクト**: `docs/projects/YYYY-MM-DD_[プロジェクト名]_[内容].md`
- **反省文**: `docs/postmortem/YYYY-MM-DD_[問題名]_postmortem.md`
- **チーム会話**: `.claude/chat/YYYY/MM/YYYY-MM-DD_team-chat.md` - 日付別組織会話記録

## 📝 反省文フォーマット（必須）
```markdown
# [問題/失敗] 事後分析 - YYYY-MM-DD

## 概要
- **期間**: YYYY-MM-DD ～ YYYY-MM-DD
- **担当者**: [エージェント名]
- **結果**: [失敗/部分成功/問題発生]

## 何が起きたか
[具体的な状況・問題の詳細]

## 原因分析
1. **直接原因**: [すぐの原因]
2. **根本原因**: [本質的な問題]
3. **背景要因**: [環境・条件]

## 対処方法
[実際に取った対応]

## 学んだこと
[今回の教訓・気づき]

## 改善策
1. **即座に実行**: [すぐ改善すること]
2. **システム改善**: [仕組みの改善]
3. **予防策**: [再発防止]

## 今後の活用
[次回プロジェクトでの注意点]
```

## 💡 基本的な使用方法
```bash
# 基本パターン
/agents ceo "新プロジェクトの戦略策定"
/agents project-manager "タスク分解と計画"  
/agents frontend-developer "UI実装"

# 問題発生時
# 1. 即座に対応
# 2. 問題解決後、必ず反省文を作成
# 3. docs/postmortem/ に保存
```

## 💬 会話・履歴記録ルール
### 記録対象
- **組織の重要決定**: `.claude/chat/YYYY/MM/YYYY-MM-DD_team-chat.md` に日付別記録
- **技術的判断**: 担当エージェントがdocs/内に記録
- **プロジェクト進捗**: PM が docs/projects/ に記録

### ファイル構造
```
.claude/chat/
├── YYYY/
│   └── MM/
│       ├── YYYY-MM-DD_team-chat.md
│       └── YYYY-MM-DD_[セッション名].md
└── chat-participation-template.md
```

### 記録タイミング
- エージェント間で重要な合意があった時
- 戦略・方針の変更があった時
- 大きな技術的決定があった時
- 問題・課題の解決策が決まった時

## 🚫 禁止事項
- 機密情報の処理
- 反省文の省略
- TodoWriteを使わない作業
- 文書化せずに完了報告

---
**失敗から学び、継続的に改善する組織を目指す**