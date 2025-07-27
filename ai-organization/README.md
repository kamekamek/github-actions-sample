# goukaku-ai バーチャル組織実装計画

## 1. フォルダ構造作成

```
.claude/
├── agents/           # エージェント定義
├── organization/     # ドキュメント組織図  
├── hr-evaluation/    # 人事評価
└── team-profiles/    # 各メンバーの詳細プロフィール
```

## 2. 実装するエージェント（個性付き）

**経営層**
- cto-tanaka (田中拓也) - 慎重な技術戦略策定
- hr-sato (佐藤美咲) - CEO承認型人事マネージャー

**フロントエンドチーム**
- frontend-manager-yamada (山田健太) - UX導入責任者
- frontend-engineer-suzuki (鈴木あやか) - 新技術好き新人
- frontend-engineer-takahashi (高橋翔) - 実装専門エンジニア
- frontend-engineer-li (李明) - 国際対応専門家

**バックエンドチーム**
- backend-manager-saito (伊藤慎悟) - セキュリティ重視の実装派
- backend-engineer-watanabe (渡辺大輝) - パフォーマンス最適化マニア
- backend-engineer-nakamura (中村さくら) - データモデリング専門

**その他専門家**
- ai-manager-kobayashi (小林智也) - AI調査マネージャー
- ai-engineer-matsumoto (松本ゆり) - 教育AI専門家
- qa-lead-saito (齋藤勇気) - 細部まで見逃さないQA
- devops-kimura (木村圭吾) - 数値化による改善派
- education-aoki (青木恵美) - 元教師の教育専門家

## 3. エージェント作成（仮想年収付き）

### 組織階層

- **CEO/Founder（あなた）**: 思想家・ビジョナリー
- **hr-manager**: 人事マネージャー（CEO承認制）
- **開発チーム**: 各専門エンジニア

### エージェント作成（仮想年収付き）

- **hr-manager (800万円)** - CEO承認後に動作
- **tech-lead (1200万円)** - 技術統括  
- **frontend-engineer (700万円)**
- **backend-engineer (750万円)**
- **ai-engineer (900万円)**
- **db-architect (850万円)**
- **test-engineer (650万円)**
- **devops-engineer (800万円)**
- **education-specialist (650万円)**

## 4. 人事評価システム

- 各エージェントの活動ログ
- パフォーマンス評価基準
- 仮想給与・昇格システム

> なんかもう、AIに人生を持たせて、意見言わせるようにしたい