---
name: create-agent
description: 組織エージェント最小構成を自動生成します。4-9の最適役割集合を生成し、CLAUDE.md更新、エージェントファイル作成、チャット基盤準備を実行。
---

# 組織エージェント最小構成 生成コマンド

本コマンドは、プロジェクト要件に基づいて **最小必須構成** を自動生成します。  
生成対象は以下の3点のみ：

1. `.claude/agents/{role}.md` … 4-9の最適役割
2. `CLAUDE.md` … 更新・統合
3. `.claude/chat/` … 会話履歴・チャット基盤（既存の場合は更新なし）

---

## 自動判断による役割設計

以下の基準で **4-9の最適役割集合** を自動提案・生成：

- **職能の重複を避けた責務境界**
- **セキュリティ・品質・運用** の視点を必ず含有
- **ドメイン特化** 要素の適切な配置
- **倫理/法令/プライバシー** ガードレール組み込み

### 生成される標準役割例
- **CEO**: 戦略・意思決定・組織調整
- **CTO**: 技術アーキテクチャ・開発統括
- **PM**: プロジェクト管理・進捗調整
- **Frontend/Backend Developer**: 実装担当
- **QA Engineer**: 品質保証・テスト
- **Security Specialist**: セキュリティ・コンプライアンス
- **DevOps**: 運用・インフラ・デプロイ

---

## 生成手順

1. **現在の組織構成を分析**
2. **不足役割・重複を特定**
3. **最適4-9役割集合を決定**
4. **CLAUDE.md統合更新**
5. **各エージェントファイル生成**
6. **チャット基盤作成**

---

## エージェントファイル仕様

### Frontmatter
```yaml
---
name: <role-id>
description: <1行説明> # "Use PROACTIVELY for ..." 形式推奨
color: <color>         # blue, indigo, green, red等
tools: <tools>         # Read, Write, Edit, Bash, WebSearch等
---
```

### 本文構成
```markdown
# 役割要約
# 人物像（背景・価値観・強み）
# 責務（詳細）
# 主要シナリオ（3-6項目）
# ツールと権限
# セキュリティと法令順守
# コミュニケーションスタイル（チーム会話参加を含む）
# 成功条件・KPI
```

---

## CLAUDE.md更新内容

- **プロジェクト概要**更新
- **原則**（5-8項目）統合
- **共通オペレーション**テンプレート
- **セキュリティ・プライバシー**方針
- **評価ポリシー**統合
- **チャット・会話履歴**管理方針追加

---

## 安全機能

- **バックアップ**: 既存ファイルを `.bak` 保存
- **差分確認**: 生成前に変更内容表示
- **個人情報保護**: 機密情報の自動伏字
- **整合性チェック**: 役割重複・漏れの検証

---

## 実行方法

```bash
/create-agent
```

**対話不要**: 現在の構成を分析し、最適構成を自動生成

---

## 出力例

```
### 生成完了
status: success
roles_count: 7
files:
  - CLAUDE.md (updated)
  - .claude/agents/ceo.md
  - .claude/agents/cto.md
  - .claude/agents/project-manager.md
  - .claude/agents/frontend-developer.md
  - .claude/agents/backend-developer.md
  - .claude/agents/qa-engineer.md
  - .claude/agents/security-specialist.md
  - .claude/chat/team-chat.md
  - .claude/chat/chat-participation-template.md
```

このコマンドにより、プロジェクトに最適化された組織構成が自動生成されます。