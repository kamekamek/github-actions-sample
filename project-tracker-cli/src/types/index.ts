/**
 * Project Tracker CLI - Type Definitions
 * セキュリティファーストなバックエンド型定義
 * 
 * @author Yamada Kenta - Backend Developer
 * @security Strict type validation for all external API data
 */

// ============================================================================
// Base Types - セキュリティを重視した基本型定義
// ============================================================================

/**
 * APIレスポンスの基本型
 * セキュリティ: unknown型を使用して型安全性を確保
 */
export interface ApiResponse<T = unknown> {
  readonly data: T;
  readonly status: number;
  readonly message?: string;
  readonly errors?: string[];
}

/**
 * エラーハンドリング用の型
 * セキュリティ: エラー情報の漏洩を防ぐためのサニタイズ対応
 */
export interface TrackerError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly source: 'github_api' | 'analyzer' | 'system';
}

// ============================================================================
// GitHub API Types - GitHub APIレスポンス型定義
// ============================================================================

/**
 * GitHubリポジトリ情報
 * セキュリティ: 機密情報を除外した必要最小限のフィールド
 */
export interface GitHubRepository {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly private: boolean;
  readonly html_url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly pushed_at: string;
  readonly language: string | null;
  readonly size: number;
  readonly stargazers_count: number;
  readonly watchers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly default_branch: string;
}

/**
 * GitHubコミット情報
 * セキュリティ: ユーザー情報は最小限に制限
 */
export interface GitHubCommit {
  readonly sha: string;
  readonly commit: {
    readonly author: {
      readonly name: string;
      readonly email: string;
      readonly date: string;
    };
    readonly committer: {
      readonly name: string;
      readonly email: string;
      readonly date: string;
    };
    readonly message: string;
  };
  readonly author: {
    readonly login: string;
    readonly id: number;
    readonly avatar_url: string;
  } | null;
  readonly stats?: {
    readonly total: number;
    readonly additions: number;
    readonly deletions: number;
  };
}

/**
 * GitHubプルリクエスト情報
 */
export interface GitHubPullRequest {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly merged: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
  readonly merged_at: string | null;
  readonly user: {
    readonly login: string;
    readonly id: number;
  };
  readonly base: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly head: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly additions: number;
  readonly deletions: number;
  readonly changed_files: number;
}

/**
 * GitHubイシュー情報
 */
export interface GitHubIssue {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
  readonly user: {
    readonly login: string;
    readonly id: number;
  };
  readonly assignees: Array<{
    readonly login: string;
    readonly id: number;
  }>;
  readonly labels: Array<{
    readonly name: string;
    readonly color: string;
  }>;
}

// ============================================================================
// Analysis Types - 分析結果の型定義
// ============================================================================

/**
 * プロジェクト分析結果
 * セキュリティ: 分析データの整合性チェック用フィールドを含む
 */
export interface ProjectAnalysis {
  readonly repository: string;
  readonly analysis_date: Date;
  readonly time_range: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly metrics: ProjectMetrics;
  readonly trends: ProjectTrends;
  readonly health_score: number; // 0-100
  readonly recommendations: string[];
  readonly data_integrity_hash: string; // データ整合性チェック用
}

/**
 * プロジェクトメトリクス
 * パフォーマンス測定してみましょう - 各種指標を数値化
 */
export interface ProjectMetrics {
  readonly commits: {
    readonly total: number;
    readonly by_author: Record<string, number>;
    readonly by_date: Record<string, number>;
    readonly average_per_day: number;
  };
  readonly pull_requests: {
    readonly total: number;
    readonly open: number;
    readonly closed: number;
    readonly merged: number;
    readonly average_merge_time_hours: number;
  };
  readonly issues: {
    readonly total: number;
    readonly open: number;
    readonly closed: number;
    readonly resolution_time_average_hours: number;
  };
  readonly code_changes: {
    readonly total_additions: number;
    readonly total_deletions: number;
    readonly files_changed: number;
    readonly lines_per_commit_average: number;
  };
  readonly contributors: {
    readonly total: number;
    readonly active_last_30_days: number;
    readonly top_contributors: Array<{
      readonly name: string;
      readonly commits: number;
      readonly additions: number;
      readonly deletions: number;
    }>;
  };
}

/**
 * プロジェクトトレンド分析
 */
export interface ProjectTrends {
  readonly activity_trend: 'increasing' | 'decreasing' | 'stable';
  readonly velocity_trend: 'accelerating' | 'decelerating' | 'consistent';
  readonly issue_resolution_trend: 'improving' | 'degrading' | 'stable';
  readonly contributor_engagement: 'growing' | 'shrinking' | 'stable';
  readonly weekly_activity: Array<{
    readonly week: string;
    readonly commits: number;
    readonly prs: number;
    readonly issues_closed: number;
  }>;
}

// ============================================================================
// Configuration Types - 設定関連型定義
// ============================================================================

/**
 * GitHub API設定
 * セキュリティ: トークンは別途環境変数で管理
 */
export interface GitHubConfig {
  readonly token: string; // 環境変数から読み込み
  readonly owner: string;
  readonly repo: string;
  readonly base_url?: string; // GitHub Enterpriseサポート
  readonly timeout_ms: number;
  readonly retry_attempts: number;
  readonly rate_limit_buffer: number; // API制限対策
}

/**
 * 分析設定
 */
export interface AnalysisConfig {
  readonly time_range_days: number;
  readonly include_weekends: boolean;
  readonly exclude_merge_commits: boolean;
  readonly minimum_commit_message_length: number;
  readonly health_score_weights: {
    readonly activity: number;
    readonly code_quality: number;
    readonly collaboration: number;
    readonly issue_management: number;
  };
}

/**
 * CLIオプション
 */
export interface TrackerOptions {
  readonly repository: string;
  readonly days?: number;
  readonly format?: 'json' | 'table' | 'markdown';
  readonly output?: string;
  readonly verbose?: boolean;
  readonly include_private?: boolean;
}

// ============================================================================
// Utility Types - ユーティリティ型
// ============================================================================

/**
 * API制限情報
 * セキュリティ: API使用量の監視用
 */
export interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: Date;
  readonly used: number;
}

/**
 * キャッシュエントリ
 * パフォーマンス測定してみましょう - キャッシュ効率の向上
 */
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: Date;
  readonly ttl_seconds: number;
  readonly key: string;
}

/**
 * 処理進捗情報
 */
export interface ProcessingProgress {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly estimated_remaining_ms: number;
  readonly current_task: string;
}