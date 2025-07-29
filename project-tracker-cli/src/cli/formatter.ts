/**
 * CLI Formatter - ユーザーフレンドリーな出力フォーマッター
 * フロントエンド開発者による美しく使いやすいCLI出力の実装
 * 
 * @author Frontend Developer - AI Virtual Corporation
 * @focus User experience, readability, accessibility
 */

import chalk from 'chalk';
import { ProjectAnalysis } from '../types/index.js';

/**
 * CLI出力フォーマッタークラス
 * ユーザーエクスペリエンスを重視した表示機能
 */
export class CLIFormatter {
  
  /**
   * ステータス表示（簡潔版）
   * 日々の確認に適した軽量な情報表示
   */
  displayStatus(analysis: ProjectAnalysis, _options: any = {}): void {
    console.log(chalk.bold.blue(`\n📊 ${analysis.repository} - 現在のステータス`));
    console.log(chalk.gray(`分析期間: ${analysis.time_range.start.toLocaleDateString()} ～ ${analysis.time_range.end.toLocaleDateString()}`));
    
    // ヘルススコア
    const healthColor = this.getHealthColor(analysis.health_score);
    console.log(chalk.bold(`\n❤️  プロジェクト健康度: ${chalk[healthColor](analysis.health_score + '/100')}`));
    
    // アクティビティサマリー
    const metrics = analysis.metrics;
    console.log(chalk.bold('\n🚀 アクティビティサマリー:'));
    console.log(`  📝 コミット: ${chalk.cyan(metrics.commits.total)} (平均 ${chalk.cyan(metrics.commits.average_per_day.toFixed(1))}/日)`);
    console.log(`  🔄 PR: ${chalk.yellow(metrics.pull_requests.open)} オープン, ${chalk.green(metrics.pull_requests.merged)} マージ済み`);
    console.log(`  🐛 イシュー: ${chalk.yellow(metrics.issues.open)} オープン, ${chalk.green(metrics.issues.closed)} 解決済み`);
    console.log(`  👥 アクティブ開発者: ${chalk.cyan(metrics.contributors.active_last_30_days)}人`);

    // トレンドアラート
    this.displayTrendAlerts(analysis.trends);
    
    // 重要な推奨事項（最大3件）
    if (analysis.recommendations.length > 0) {
      console.log(chalk.bold('\n💡 注目すべき点:'));
      analysis.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
      
      if (analysis.recommendations.length > 3) {
        console.log(chalk.gray(`     その他 ${analysis.recommendations.length - 3} 件の推奨事項があります`));
      }
    }
    
    console.log(chalk.gray(`\n最終更新: ${analysis.analysis_date.toLocaleString()}`));
  }

  /**
   * テーブル表示（完全版）
   * 詳細分析結果の美しいテーブル表示
   */
  displayTable(analysis: ProjectAnalysis): void {
    console.log(chalk.bold.blue(`\n🔍 ${analysis.repository} - プロジェクト分析結果`));
    console.log(chalk.gray(`分析期間: ${analysis.time_range.start.toLocaleDateString()} ～ ${analysis.time_range.end.toLocaleDateString()}`));
    console.log(chalk.gray(`分析日時: ${analysis.analysis_date.toLocaleString()}`));

    // ヘルススコア（大きく表示）
    const healthColor = this.getHealthColor(analysis.health_score);
    console.log(chalk.bold(`\n📊 プロジェクト健康度: ${chalk[healthColor](analysis.health_score + '/100')}`));
    this.displayHealthBar(analysis.health_score);

    // コミット統計
    console.log(chalk.bold('\n📝 コミット統計:'));
    console.log(`  ${chalk.cyan('総コミット数:')} ${analysis.metrics.commits.total.toLocaleString()}`);
    console.log(`  ${chalk.cyan('1日平均:')} ${analysis.metrics.commits.average_per_day.toFixed(1)}`);
    console.log(`  ${chalk.cyan('アクティブコントリビューター:')} ${analysis.metrics.contributors.active_last_30_days}人`);

    // プルリクエスト統計
    console.log(chalk.bold('\n🔄 プルリクエスト統計:'));
    console.log(`  ${chalk.cyan('総PR数:')} ${analysis.metrics.pull_requests.total}`);
    console.log(`  ${chalk.green('マージ済み:')} ${analysis.metrics.pull_requests.merged}`);
    console.log(`  ${chalk.yellow('オープン中:')} ${analysis.metrics.pull_requests.open}`);
    console.log(`  ${chalk.cyan('平均マージ時間:')} ${this.formatHours(analysis.metrics.pull_requests.average_merge_time_hours)}`);

    // イシュー統計
    console.log(chalk.bold('\n🐛 イシュー統計:'));
    console.log(`  ${chalk.cyan('総イシュー数:')} ${analysis.metrics.issues.total}`);
    console.log(`  ${chalk.green('解決済み:')} ${analysis.metrics.issues.closed}`);
    console.log(`  ${chalk.yellow('未解決:')} ${analysis.metrics.issues.open}`);
    console.log(`  ${chalk.cyan('平均解決時間:')} ${this.formatHours(analysis.metrics.issues.resolution_time_average_hours)}`);

    // コード変更統計
    console.log(chalk.bold('\n📈 コード変更統計:'));
    console.log(`  ${chalk.green('追加行数:')} +${analysis.metrics.code_changes.total_additions.toLocaleString()}`);
    console.log(`  ${chalk.red('削除行数:')} -${analysis.metrics.code_changes.total_deletions.toLocaleString()}`);
    console.log(`  ${chalk.cyan('コミット平均行数:')} ${analysis.metrics.code_changes.lines_per_commit_average.toFixed(1)}`);

    // トレンド分析
    console.log(chalk.bold('\n📊 トレンド分析:'));
    console.log(`  ${chalk.cyan('アクティビティ:')} ${this.getTrendEmoji(analysis.trends.activity_trend)} ${this.getTrendDescription(analysis.trends.activity_trend)}`);
    console.log(`  ${chalk.cyan('開発速度:')} ${this.getTrendEmoji(analysis.trends.velocity_trend)} ${this.getTrendDescription(analysis.trends.velocity_trend)}`);
    console.log(`  ${chalk.cyan('イシュー解決:')} ${this.getTrendEmoji(analysis.trends.issue_resolution_trend)} ${this.getTrendDescription(analysis.trends.issue_resolution_trend)}`);
    console.log(`  ${chalk.cyan('コントリビューター:')} ${this.getTrendEmoji(analysis.trends.contributor_engagement)} ${this.getTrendDescription(analysis.trends.contributor_engagement)}`);

    // 週別アクティビティ（最近4週間）
    if (analysis.trends.weekly_activity.length > 0) {
      console.log(chalk.bold('\n📅 最近の週別アクティビティ:'));
      const recentWeeks = analysis.trends.weekly_activity.slice(-4);
      recentWeeks.forEach(week => {
        const weekStr = new Date(week.week).toLocaleDateString();
        console.log(`  ${chalk.gray(weekStr)}: ${chalk.cyan(week.commits)}コミット, ${chalk.yellow(week.prs)}PR, ${chalk.green(week.issues_closed)}解決`);
      });
    }

    // 推奨事項
    if (analysis.recommendations.length > 0) {
      console.log(chalk.bold('\n💡 推奨事項:'));
      analysis.recommendations.forEach((recommendation, index) => {
        console.log(`  ${chalk.cyan((index + 1) + '.')} ${recommendation}`);
      });
    }

    // トップコントリビューター
    if (analysis.metrics.contributors.top_contributors.length > 0) {
      console.log(chalk.bold('\n🏆 トップコントリビューター:'));
      analysis.metrics.contributors.top_contributors.slice(0, 5).forEach((contributor, index) => {
        const medal = this.getMedalEmoji(index);
        console.log(`  ${medal} ${chalk.cyan(contributor.name)} - ${contributor.commits}コミット`);
      });
    }

    console.log(chalk.gray(`\nデータ整合性ハッシュ: ${analysis.data_integrity_hash}`));
  }

  /**
   * トレンドアラートの表示
   */
  private displayTrendAlerts(trends: any): void {
    const alerts: string[] = [];
    
    if (trends.activity_trend === 'decreasing') {
      alerts.push('📉 アクティビティが減少中');
    }
    if (trends.velocity_trend === 'decelerating') {
      alerts.push('🐌 開発速度が低下中');
    }
    if (trends.issue_resolution_trend === 'degrading') {
      alerts.push('⚠️  イシュー解決が遅延中');
    }
    if (trends.contributor_engagement === 'shrinking') {
      alerts.push('👥 開発者の参加が減少中');
    }
    
    if (alerts.length > 0) {
      console.log(chalk.bold.yellow('\n⚠️  注意が必要な傾向:'));
      alerts.forEach(alert => console.log(`  ${alert}`));
    } else {
      console.log(chalk.bold.green('\n✅ すべてのトレンドが良好です'));
    }
  }

  /**
   * ヘルススコアのプログレスバー表示
   */
  private displayHealthBar(score: number): void {
    const barLength = 20;
    const filled = Math.round((score / 100) * barLength);
    const empty = barLength - filled;
    
    let bar = '';
    for (let i = 0; i < filled; i++) {
      bar += '█';
    }
    for (let i = 0; i < empty; i++) {
      bar += '░';
    }
    
    const color = this.getHealthColor(score);
    console.log(`${chalk[color](bar)} ${score}%`);
  }

  /**
   * ヘルススコアに基づく色の取得
   */
  private getHealthColor(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  }

  /**
   * 時間のフォーマット（時間単位を見やすく）
   */
  private formatHours(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}時間`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days}日${remainingHours > 0 ? remainingHours + '時間' : ''}`;
    }
  }

  /**
   * トレンド表示用絵文字取得
   */
  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'increasing':
      case 'accelerating':
      case 'improving':
      case 'growing':
        return '📈';
      case 'decreasing':
      case 'decelerating':
      case 'degrading':
      case 'shrinking':
        return '📉';
      case 'stable':
      case 'consistent':
      default:
        return '➡️';
    }
  }

  /**
   * トレンドの説明文取得
   */
  private getTrendDescription(trend: string): string {
    const descriptions: { [key: string]: string } = {
      increasing: '増加中',
      decreasing: '減少中',
      stable: '安定',
      accelerating: '加速中',
      decelerating: '減速中',
      consistent: '一定',
      improving: '改善中',
      degrading: '悪化中',
      growing: '成長中',
      shrinking: '縮小中'
    };
    
    return descriptions[trend] || trend;
  }

  /**
   * メダル絵文字の取得
   */
  private getMedalEmoji(index: number): string {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  }
}