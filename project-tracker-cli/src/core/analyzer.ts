/**
 * Project Analysis Engine
 * プロジェクト分析コアエンジン - セキュリティファーストな設計
 * 
 * @author Yamada Kenta - Backend Developer
 * @security Data validation, integrity checks, performance optimization
 */

import crypto from 'crypto';
import {
  GitHubRepository,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  ProjectAnalysis,
  ProjectMetrics,
  ProjectTrends,
  AnalysisConfig,
  TrackerError,
} from '../types/index.js';
import { GitHubApiClient } from '../api/github.js';

/**
 * プロジェクト分析エンジン
 * パフォーマンス測定してみましょう - 効率的な分析アルゴリズム実装
 */
export class ProjectAnalyzer {
  private readonly apiClient: GitHubApiClient;
  private readonly config: AnalysisConfig;

  constructor(apiClient: GitHubApiClient, config: AnalysisConfig) {
    this.apiClient = apiClient;
    this.config = this.validateConfig(config);
  }

  /**
   * 設定の検証とサニタイズ
   * セキュリティファーストで実装
   */
  private validateConfig(config: AnalysisConfig): AnalysisConfig {
    let validatedConfig: AnalysisConfig = {
      time_range_days: Math.min(Math.max(config.time_range_days, 1), 365), // 1-365日の範囲
      include_weekends: Boolean(config.include_weekends),
      exclude_merge_commits: Boolean(config.exclude_merge_commits),
      minimum_commit_message_length: Math.max(config.minimum_commit_message_length, 0),
      health_score_weights: {
        activity: Math.max(0, Math.min(1, config.health_score_weights.activity)),
        code_quality: Math.max(0, Math.min(1, config.health_score_weights.code_quality)),
        collaboration: Math.max(0, Math.min(1, config.health_score_weights.collaboration)),
        issue_management: Math.max(0, Math.min(1, config.health_score_weights.issue_management)),
      },
    };

    // 重みの合計が1になるように正規化
    const totalWeight = Object.values(validatedConfig.health_score_weights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight > 0) {
      const normalizedWeights = {
        activity: validatedConfig.health_score_weights.activity / totalWeight,
        code_quality: validatedConfig.health_score_weights.code_quality / totalWeight,
        collaboration: validatedConfig.health_score_weights.collaboration / totalWeight,
        issue_management: validatedConfig.health_score_weights.issue_management / totalWeight,
      };
      validatedConfig = { ...validatedConfig, health_score_weights: normalizedWeights };
    }

    return validatedConfig;
  }

  /**
   * 包括的なプロジェクト分析実行
   * パフォーマンス測定してみましょう - 並列処理で高速化
   */
  async analyzeProject(): Promise<ProjectAnalysis> {
    const startTime = Date.now();
    console.log('プロジェクト分析を開始します...');

    try {
      // 分析期間の設定
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - this.config.time_range_days);

      // セキュリティファーストで: 並列でデータ取得（API制限に配慮）
      console.log('リポジトリ情報を取得中...');
      const repositoryResponse = await this.apiClient.getRepository();
      const repository = repositoryResponse.data;

      // 段階的なデータ取得（レート制限対策）
      console.log('コミット情報を取得中...');
      const commits = await this.getAllCommitsInRange(startDate, endDate);
      
      console.log('プルリクエスト情報を取得中...');
      const pullRequests = await this.getAllPullRequests();
      
      console.log('イシュー情報を取得中...');
      const issues = await this.getAllIssues();

      // データ整合性チェック
      const dataIntegrityHash = this.calculateDataIntegrityHash({
        commits,
        pullRequests,
        issues,
        repository,
      });

      // 分析実行
      console.log('メトリクス分析中...');
      const metrics = this.calculateMetrics(commits, pullRequests, issues);
      
      console.log('トレンド分析中...');
      const trends = this.calculateTrends(commits, pullRequests, issues, startDate, endDate);
      
      console.log('ヘルススコア計算中...');
      const healthScore = this.calculateHealthScore(metrics, trends);

      const recommendations = this.generateRecommendations(metrics, trends, healthScore);

      const analysis: ProjectAnalysis = {
        repository: repository.full_name,
        analysis_date: new Date(),
        time_range: {
          start: startDate,
          end: endDate,
        },
        metrics,
        trends,
        health_score: healthScore,
        recommendations,
        data_integrity_hash: dataIntegrityHash,
      };

      const duration = Date.now() - startTime;
      console.log(`プロジェクト分析完了 (${duration}ms)`);

      return analysis;
    } catch (error) {
      throw this.createTrackerError(error as Error, 'analyzer');
    }
  }

  /**
   * 指定期間のコミット全件取得
   * パフォーマンス測定してみましょう
   */
  private async getAllCommitsInRange(since: Date, until: Date): Promise<GitHubCommit[]> {
    const commits: GitHubCommit[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.apiClient.getCommits({
        since,
        until,
        per_page: perPage,
        page,
      });

      if (response.data.length === 0) break;

      // フィルタリング（設定に基づく）
      const filteredCommits = response.data.filter(commit => {
        if (this.config.exclude_merge_commits && this.isMergeCommit(commit)) {
          return false;
        }
        
        if (commit.commit.message.length < this.config.minimum_commit_message_length) {
          return false;
        }

        return true;
      });

      commits.push(...filteredCommits);
      page++;

      // セキュリティ: 無限ループ防止
      if (page > 100) {
        console.warn('最大ページ数に達しました。処理を中断します');
        break;
      }
    }

    return commits;
  }

  /**
   * 全プルリクエスト取得
   */
  private async getAllPullRequests(): Promise<GitHubPullRequest[]> {
    return this.apiClient.getAllPages(
      (page) => this.apiClient.getPullRequests({ state: 'all', page, per_page: 100 })
    );
  }

  /**
   * 全イシュー取得
   */
  private async getAllIssues(): Promise<GitHubIssue[]> {
    return this.apiClient.getAllPages(
      (page) => this.apiClient.getIssues({ state: 'all', page, per_page: 100 })
    );
  }

  /**
   * マージコミットの判定
   */
  private isMergeCommit(commit: GitHubCommit): boolean {
    return commit.commit.message.toLowerCase().startsWith('merge ') ||
           commit.commit.message.includes('Merge pull request') ||
           commit.commit.message.includes('Merge branch');
  }

  /**
   * プロジェクトメトリクス計算
   * パフォーマンス測定してみましょう - 効率的な集計処理
   */
  private calculateMetrics(
    commits: GitHubCommit[],
    pullRequests: GitHubPullRequest[],
    issues: GitHubIssue[]
  ): ProjectMetrics {
    // コミット分析
    const commitsByAuthor: Record<string, number> = {};
    const commitsByDate: Record<string, number> = {};
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalFilesChanged = 0;

    commits.forEach(commit => {
      const author = commit.author?.login || commit.commit.author.name;
      commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;

      const date = new Date(commit.commit.author.date).toISOString().split('T')[0];
      commitsByDate[date] = (commitsByDate[date] || 0) + 1;

      if (commit.stats) {
        totalAdditions += commit.stats.additions;
        totalDeletions += commit.stats.deletions;
      }
    });

    // プルリクエスト分析
    const mergedPRs = pullRequests.filter(pr => pr.merged);
    const totalMergeTime = mergedPRs.reduce((sum, pr) => {
      if (pr.merged_at && pr.created_at) {
        const mergeTime = new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime();
        return sum + mergeTime;
      }
      return sum;
    }, 0);

    // イシュー分析
    const closedIssues = issues.filter(issue => issue.state === 'closed');
    const totalResolutionTime = closedIssues.reduce((sum, issue) => {
      if (issue.closed_at && issue.created_at) {
        const resolutionTime = new Date(issue.closed_at).getTime() - new Date(issue.created_at).getTime();
        return sum + resolutionTime;
      }
      return sum;
    }, 0);

    // トップコントリビューター分析
    const topContributors = Object.entries(commitsByAuthor)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, commits]) => ({
        name,
        commits,
        additions: 0, // TODO: コミット詳細から取得
        deletions: 0,
      }));

    return {
      commits: {
        total: commits.length,
        by_author: commitsByAuthor,
        by_date: commitsByDate,
        average_per_day: commits.length / this.config.time_range_days,
      },
      pull_requests: {
        total: pullRequests.length,
        open: pullRequests.filter(pr => pr.state === 'open').length,
        closed: pullRequests.filter(pr => pr.state === 'closed').length,
        merged: mergedPRs.length,
        average_merge_time_hours: mergedPRs.length > 0 ? totalMergeTime / mergedPRs.length / (1000 * 60 * 60) : 0,
      },
      issues: {
        total: issues.length,
        open: issues.filter(issue => issue.state === 'open').length,
        closed: closedIssues.length,
        resolution_time_average_hours: closedIssues.length > 0 ? totalResolutionTime / closedIssues.length / (1000 * 60 * 60) : 0,
      },
      code_changes: {
        total_additions: totalAdditions,
        total_deletions: totalDeletions,
        files_changed: totalFilesChanged,
        lines_per_commit_average: commits.length > 0 ? (totalAdditions + totalDeletions) / commits.length : 0,
      },
      contributors: {
        total: Object.keys(commitsByAuthor).length,
        active_last_30_days: this.getActiveContributorsCount(commits, 30),
        top_contributors: topContributors,
      },
    };
  }

  /**
   * トレンド分析
   */
  private calculateTrends(
    commits: GitHubCommit[],
    pullRequests: GitHubPullRequest[],
    issues: GitHubIssue[],
    startDate: Date,
    endDate: Date
  ): ProjectTrends {
    // 週別アクティビティ計算
    const weeklyActivity = this.calculateWeeklyActivity(commits, pullRequests, issues, startDate, endDate);
    
    // トレンド計算
    const activityTrend = this.calculateActivityTrend(weeklyActivity);
    const velocityTrend = this.calculateVelocityTrend(commits);
    const issueResolutionTrend = this.calculateIssueResolutionTrend(issues);
    const contributorEngagement = this.calculateContributorEngagement(commits);

    return {
      activity_trend: activityTrend,
      velocity_trend: velocityTrend,
      issue_resolution_trend: issueResolutionTrend,
      contributor_engagement: contributorEngagement,
      weekly_activity: weeklyActivity,
    };
  }

  /**
   * 週別アクティビティ計算
   */
  private calculateWeeklyActivity(
    commits: GitHubCommit[],
    pullRequests: GitHubPullRequest[],
    issues: GitHubIssue[],
    startDate: Date,
    endDate: Date
  ): ProjectTrends['weekly_activity'] {
    const weekly: Record<string, { commits: number; prs: number; issues_closed: number }> = {};

    // 各週の初期化
    const current = new Date(startDate);
    while (current <= endDate) {
      const weekStart = this.getWeekStart(current);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekly[weekKey]) {
        weekly[weekKey] = { commits: 0, prs: 0, issues_closed: 0 };
      }
      
      current.setDate(current.getDate() + 7);
    }

    // コミットのカウント
    commits.forEach(commit => {
      const date = new Date(commit.commit.author.date);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (weekly[weekKey]) {
        weekly[weekKey].commits++;
      }
    });

    // PRのカウント
    pullRequests.forEach(pr => {
      if (pr.merged_at) {
        const date = new Date(pr.merged_at);
        const weekStart = this.getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (weekly[weekKey]) {
          weekly[weekKey].prs++;
        }
      }
    });

    // クローズされたイシューのカウント
    issues.forEach(issue => {
      if (issue.closed_at) {
        const date = new Date(issue.closed_at);
        const weekStart = this.getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (weekly[weekKey]) {
          weekly[weekKey].issues_closed++;
        }
      }
    });

    return Object.entries(weekly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        ...data,
      }));
  }

  /**
   * 週の開始日を取得（月曜日基準）
   */
  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 月曜日を週の開始とする
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * アクティビティトレンド計算
   */
  private calculateActivityTrend(weeklyActivity: ProjectTrends['weekly_activity']): ProjectTrends['activity_trend'] {
    if (weeklyActivity.length < 2) return 'stable';

    const recentWeeks = weeklyActivity.slice(-4); // 直近4週
    const earlierWeeks = weeklyActivity.slice(0, Math.max(1, weeklyActivity.length - 4));

    const recentAvg = recentWeeks.reduce((sum, week) => sum + week.commits + week.prs, 0) / recentWeeks.length;
    const earlierAvg = earlierWeeks.reduce((sum, week) => sum + week.commits + week.prs, 0) / earlierWeeks.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * ベロシティトレンド計算
   */
  private calculateVelocityTrend(commits: GitHubCommit[]): ProjectTrends['velocity_trend'] {
    // 簡易実装: コミット間隔の変化を分析
    if (commits.length < 10) return 'consistent';

    const intervals: number[] = [];
    for (let i = 1; i < commits.length; i++) {
      const current = new Date(commits[i].commit.author.date).getTime();
      const previous = new Date(commits[i - 1].commit.author.date).getTime();
      intervals.push(Math.abs(current - previous));
    }

    const recentIntervals = intervals.slice(-10);
    const earlierIntervals = intervals.slice(0, 10);

    const recentAvg = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    const earlierAvg = earlierIntervals.reduce((sum, interval) => sum + interval, 0) / earlierIntervals.length;

    if (recentAvg < earlierAvg * 0.9) return 'accelerating';
    if (recentAvg > earlierAvg * 1.1) return 'decelerating';
    return 'consistent';
  }

  /**
   * イシュー解決トレンド計算
   */
  private calculateIssueResolutionTrend(issues: GitHubIssue[]): ProjectTrends['issue_resolution_trend'] {
    const closedIssues = issues.filter(issue => issue.closed_at);
    if (closedIssues.length < 5) return 'stable';

    const resolutionTimes = closedIssues.map(issue => {
      const created = new Date(issue.created_at).getTime();
      const closed = new Date(issue.closed_at!).getTime();
      return closed - created;
    });

    const recentTimes = resolutionTimes.slice(-5);
    const earlierTimes = resolutionTimes.slice(0, 5);

    const recentAvg = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
    const earlierAvg = earlierTimes.reduce((sum, time) => sum + time, 0) / earlierTimes.length;

    if (recentAvg < earlierAvg * 0.9) return 'improving';
    if (recentAvg > earlierAvg * 1.1) return 'degrading';
    return 'stable';
  }

  /**
   * コントリビューターエンゲージメント計算
   */
  private calculateContributorEngagement(commits: GitHubCommit[]): ProjectTrends['contributor_engagement'] {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);

    const recentContributors = new Set(
      commits
        .filter(commit => new Date(commit.commit.author.date).getTime() > thirtyDaysAgo)
        .map(commit => commit.author?.login || commit.commit.author.name)
    );

    const earlierContributors = new Set(
      commits
        .filter(commit => {
          const date = new Date(commit.commit.author.date).getTime();
          return date > sixtyDaysAgo && date <= thirtyDaysAgo;
        })
        .map(commit => commit.author?.login || commit.commit.author.name)
    );

    const recentCount = recentContributors.size;
    const earlierCount = earlierContributors.size;

    if (recentCount > earlierCount) return 'growing';
    if (recentCount < earlierCount) return 'shrinking';
    return 'stable';
  }

  /**
   * アクティブコントリビューター数取得
   */
  private getActiveContributorsCount(commits: GitHubCommit[], days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const activeContributors = new Set(
      commits
        .filter(commit => new Date(commit.commit.author.date) > cutoffDate)
        .map(commit => commit.author?.login || commit.commit.author.name)
    );

    return activeContributors.size;
  }

  /**
   * ヘルススコア計算
   * パフォーマンス測定してみましょう - 重み付きスコア計算
   */
  private calculateHealthScore(metrics: ProjectMetrics, _trends: ProjectTrends): number {
    const weights = this.config.health_score_weights;

    // アクティビティスコア (0-100)
    const activityScore = Math.min(100, (metrics.commits.average_per_day * 10) + 
                                        (metrics.pull_requests.merged / metrics.pull_requests.total * 100) || 0);

    // コード品質スコア (0-100)
    const qualityScore = Math.min(100, 
      (metrics.pull_requests.total > 0 ? 80 : 60) + // PR使用で+20点
      (metrics.commits.average_per_day < 10 ? 20 : 0) // 適度なコミット頻度で+20点
    );

    // コラボレーションスコア (0-100)
    const collaborationScore = Math.min(100,
      (metrics.contributors.active_last_30_days * 10) +
      (metrics.pull_requests.average_merge_time_hours < 48 ? 30 : 0) // 2日以内のマージで+30点
    );

    // イシュー管理スコア (0-100)
    const issueScore = Math.min(100,
      (metrics.issues.resolution_time_average_hours < 168 ? 50 : 0) + // 1週間以内の解決で+50点
      (metrics.issues.open / Math.max(1, metrics.issues.total) < 0.3 ? 50 : 0) // 未解決率30%未満で+50点
    );

    const totalScore = 
      (activityScore * weights.activity) +
      (qualityScore * weights.code_quality) +
      (collaborationScore * weights.collaboration) +
      (issueScore * weights.issue_management);

    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  /**
   * 推奨事項生成
   */
  private generateRecommendations(
    metrics: ProjectMetrics,
    trends: ProjectTrends,
    healthScore: number
  ): string[] {
    const recommendations: string[] = [];

    // ヘルススコアベース
    if (healthScore < 50) {
      recommendations.push('プロジェクトの健康度が低下しています。定期的なレビューと改善が必要です。');
    }

    // アクティビティベース
    if (metrics.commits.average_per_day < 1) {
      recommendations.push('コミット頻度が低いです。小さな単位でのコミットを推奨します。');
    }

    // プルリクエストベース
    if (metrics.pull_requests.average_merge_time_hours > 72) {
      recommendations.push('PRのマージ時間が長すぎます。レビュープロセスの改善を検討してください。');
    }

    // イシュー管理ベース
    if (metrics.issues.open / Math.max(1, metrics.issues.total) > 0.5) {
      recommendations.push('未解決のイシューが多すぎます。優先度を明確にして対応してください。');
    }

    // トレンドベース
    if (trends.activity_trend === 'decreasing') {
      recommendations.push('アクティビティが減少傾向にあります。チームのモチベーション確認が推奨されます。');
    }

    if (trends.contributor_engagement === 'shrinking') {
      recommendations.push('コントリビューターの参加が減少しています。新規参加者の支援を強化してください。');
    }

    return recommendations.length > 0 ? recommendations : ['プロジェクトは良好な状態です。現在の取り組みを継続してください。'];
  }

  /**
   * データ整合性ハッシュ計算
   * セキュリティファーストで実装
   */
  private calculateDataIntegrityHash(data: {
    commits: GitHubCommit[];
    pullRequests: GitHubPullRequest[];
    issues: GitHubIssue[];
    repository: GitHubRepository;
  }): string {
    const hashInput = JSON.stringify({
      commits_count: data.commits.length,
      prs_count: data.pullRequests.length,
      issues_count: data.issues.length,
      repo_id: data.repository.id,
      timestamp: new Date().toISOString().split('T')[0], // 日付のみ
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }

  /**
   * TrackerError生成
   */
  private createTrackerError(error: Error, source: TrackerError['source']): TrackerError {
    return {
      code: 'ANALYSIS_ERROR',
      message: error.message.substring(0, 500),
      details: {
        name: error.name,
        stack: error.stack?.substring(0, 1000),
      },
      timestamp: new Date(),
      source,
    };
  }
}