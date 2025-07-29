/**
 * GitHub API Client
 * セキュリティファーストなGitHub API統合クライアント
 * 
 * @author Yamada Kenta - Backend Developer
 * @security Rate limiting, token validation, request sanitization
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  GitHubRepository,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  GitHubConfig,
  ApiResponse,
  TrackerError,
  RateLimitInfo,
} from '../types/index.js';

/**
 * GitHub APIクライアント
 * セキュリティファーストで実装 - レート制限、認証、エラーハンドリング
 */
export class GitHubApiClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly config: GitHubConfig;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: GitHubConfig) {
    this.config = this.validateConfig(config);
    
    // セキュリティファーストで axios インスタンスを設定
    this.axiosInstance = axios.create({
      baseURL: config.base_url || 'https://api.github.com',
      timeout: config.timeout_ms,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'project-tracker-cli/1.0.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 設定の検証とサニタイズ
   * セキュリティ: 不正な設定値をチェック
   */
  private validateConfig(config: GitHubConfig): GitHubConfig {
    if (!config.token || config.token.length < 10) {
      throw new Error('セキュリティファーストで: 有効なGitHubトークンが必要です');
    }
    
    if (!config.owner || !config.repo) {
      throw new Error('オーナーとリポジトリ名が必要です');
    }

    // セキュリティ: 不正な文字を除去
    const sanitizedOwner = config.owner.replace(/[^a-zA-Z0-9\-_.]/g, '');
    const sanitizedRepo = config.repo.replace(/[^a-zA-Z0-9\-_.]/g, '');

    return {
      ...config,
      owner: sanitizedOwner,
      repo: sanitizedRepo,
      timeout_ms: Math.min(config.timeout_ms, 30000), // 最大30秒
      retry_attempts: Math.min(config.retry_attempts, 5), // 最大5回
    };
  }

  /**
   * リクエスト/レスポンスインターセプター設定
   * パフォーマンス測定してみましょう - レート制限とエラーハンドリング
   */
  private setupInterceptors(): void {
    // リクエストインターセプター
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // レート制限チェック
        if (this.rateLimitInfo && this.rateLimitInfo.remaining < this.config.rate_limit_buffer) {
          const resetTime = this.rateLimitInfo.reset.getTime();
          const now = Date.now();
          
          if (now < resetTime) {
            const waitTime = resetTime - now;
            console.warn(`レート制限近づき中。${Math.ceil(waitTime / 1000)}秒待機します`);
            return new Promise((resolve) => {
              setTimeout(() => resolve(config), waitTime);
            });
          }
        }
        
        return config;
      },
      (error) => Promise.reject(this.createTrackerError(error, 'github_api'))
    );

    // レスポンスインターセプター
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response);
        return response;
      },
      async (error) => {
        // レート制限エラーの場合は自動リトライ
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          console.warn(`レート制限に達しました。${retryAfter}秒後にリトライします`);
          
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.axiosInstance.request(error.config);
        }

        return Promise.reject(this.createTrackerError(error, 'github_api'));
      }
    );
  }

  /**
   * レート制限情報の更新
   * パフォーマンス測定してみましょう
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers;
    
    if (headers['x-ratelimit-limit']) {
      this.rateLimitInfo = {
        limit: parseInt(headers['x-ratelimit-limit'], 10),
        remaining: parseInt(headers['x-ratelimit-remaining'], 10),
        reset: new Date(parseInt(headers['x-ratelimit-reset'], 10) * 1000),
        used: parseInt(headers['x-ratelimit-used'], 10),
      };
    }
  }

  /**
   * TrackerError生成
   * セキュリティ: エラー情報のサニタイズ
   */
  private createTrackerError(error: any, source: TrackerError['source']): TrackerError {
    const sanitizedMessage = error.response?.data?.message || error.message || 'Unknown error';
    
    return {
      code: error.response?.status?.toString() || 'UNKNOWN',
      message: sanitizedMessage.substring(0, 500), // メッセージ長制限
      details: {
        status: error.response?.status,
        url: error.config?.url,
      },
      timestamp: new Date(),
      source,
    };
  }

  /**
   * リポジトリ情報取得
   * セキュリティファーストで実装
   */
  async getRepository(): Promise<ApiResponse<GitHubRepository>> {
    try {
      const response = await this.axiosInstance.get<GitHubRepository>(
        `/repos/${this.config.owner}/${this.config.repo}`
      );

      return {
        data: response.data,
        status: response.status,
        message: 'リポジトリ情報を取得しました',
      };
    } catch (error) {
      throw this.createTrackerError(error, 'github_api');
    }
  }

  /**
   * コミット履歴取得
   * パフォーマンス測定してみましょう - ページネーション対応
   */
  async getCommits(options: {
    since?: Date;
    until?: Date;
    per_page?: number;
    page?: number;
  } = {}): Promise<ApiResponse<GitHubCommit[]>> {
    try {
      const params: Record<string, string | number> = {
        per_page: Math.min(options.per_page || 100, 100), // セキュリティ: 最大100件
        page: Math.max(options.page || 1, 1),
      };

      if (options.since) {
        params.since = options.since.toISOString();
      }
      if (options.until) {
        params.until = options.until.toISOString();
      }

      const response = await this.axiosInstance.get<GitHubCommit[]>(
        `/repos/${this.config.owner}/${this.config.repo}/commits`,
        { params }
      );

      return {
        data: response.data,
        status: response.status,
        message: `${response.data.length}件のコミットを取得しました`,
      };
    } catch (error) {
      throw this.createTrackerError(error, 'github_api');
    }
  }

  /**
   * プルリクエスト取得
   */
  async getPullRequests(options: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
    page?: number;
  } = {}): Promise<ApiResponse<GitHubPullRequest[]>> {
    try {
      const params: Record<string, string | number> = {
        state: options.state || 'all',
        per_page: Math.min(options.per_page || 100, 100),
        page: Math.max(options.page || 1, 1),
      };

      const response = await this.axiosInstance.get<GitHubPullRequest[]>(
        `/repos/${this.config.owner}/${this.config.repo}/pulls`,
        { params }
      );

      return {
        data: response.data,
        status: response.status,
        message: `${response.data.length}件のプルリクエストを取得しました`,
      };
    } catch (error) {
      throw this.createTrackerError(error, 'github_api');
    }
  }

  /**
   * イシュー取得
   */
  async getIssues(options: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
    page?: number;
  } = {}): Promise<ApiResponse<GitHubIssue[]>> {
    try {
      const params: Record<string, string | number> = {
        state: options.state || 'all',
        per_page: Math.min(options.per_page || 100, 100),
        page: Math.max(options.page || 1, 1),
      };

      const response = await this.axiosInstance.get<GitHubIssue[]>(
        `/repos/${this.config.owner}/${this.config.repo}/issues`,
        { params }
      );

      return {
        data: response.data,
        status: response.status,
        message: `${response.data.length}件のイシューを取得しました`,
      };
    } catch (error) {
      throw this.createTrackerError(error, 'github_api');
    }
  }

  /**
   * 特定コミットの詳細情報取得
   * パフォーマンス測定してみましょう - 統計情報付き
   */
  async getCommitDetails(sha: string): Promise<ApiResponse<GitHubCommit>> {
    try {
      // セキュリティ: SHA値の検証
      if (!/^[a-f0-9]{40}$/i.test(sha)) {
        throw new Error('セキュリティファーストで: 不正なSHA値です');
      }

      const response = await this.axiosInstance.get<GitHubCommit>(
        `/repos/${this.config.owner}/${this.config.repo}/commits/${sha}`
      );

      return {
        data: response.data,
        status: response.status,
        message: 'コミット詳細を取得しました',
      };
    } catch (error) {
      throw this.createTrackerError(error, 'github_api');
    }
  }

  /**
   * レート制限情報取得
   * パフォーマンス測定してみましょう
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * API接続テスト
   * セキュリティファーストで実装
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/user');
      return response.status === 200;
    } catch (error) {
      console.error('GitHub API接続テストに失敗:', error);
      return false;
    }
  }

  /**
   * 全ページのデータを取得するヘルパー関数
   * パフォーマンス測定してみましょう - 効率的な全件取得
   */
  async getAllPages<T>(
    fetchFunction: (page: number) => Promise<ApiResponse<T[]>>,
    maxPages: number = 10 // セキュリティ: 最大ページ数制限
  ): Promise<T[]> {
    const allData: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      try {
        const response = await fetchFunction(page);
        
        if (response.data.length === 0) {
          hasMore = false;
        } else {
          allData.push(...response.data);
          page++;
          
          // レート制限チェック
          if (this.rateLimitInfo && this.rateLimitInfo.remaining < 5) {
            console.warn('レート制限近づき中。処理を中断します');
            break;
          }
        }
      } catch (error) {
        console.error(`ページ ${page} の取得に失敗:`, error);
        break;
      }
    }

    return allData;
  }
}