# AI組織会議コマンド

AI Virtual Corporationの組織会議を開催します。

会議タイプ: $ARGUMENTS

## 会議の流れ

1. **会議アジェンダの作成**
   - 現在のプロジェクト状況の確認
   - MULTI_AGENT_PLAN.mdから進捗を読み取り
   - 議題の優先順位付け

2. **参加者の決定**
   - 会議タイプに応じて関連するエージェントを選定
   - CEOは戦略会議、CTOは技術会議、PMはスプリント会議

3. **会議の実施**
   - 各エージェントからの報告
   - 課題と解決策の議論
   - 意思決定とアクションアイテムの設定

4. **議事録の作成**
   - 決定事項の記録
   - アクションアイテムの TodoWrite への登録
   - 次回会議日程の設定

## 使用例
- `/org-meeting strategy` - 戦略会議（CEO主導）
- `/org-meeting tech` - 技術会議（CTO主導）  
- `/org-meeting sprint` - スプリント会議（PM主導）
- `/org-meeting all-hands` - 全体会議（全員参加）

@MULTI_AGENT_PLAN.md
@.claude/agents/USAGE_GUIDE.md