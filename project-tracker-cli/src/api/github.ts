/**
 * GitHub API Client
 * セキュリティファーストなGitHub API統合クライアント
 * 
 * @author Yamada Kenta - Backend Developer
 * @author AI Security Specialist - Security Enhancement  
 * @security Rate limiting, token validation, request sanitization, HTTPS enforcement
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
import { authManager } from '../security/auth.js';
import { securityValidator, validate } from '../security/validator.js';

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
        'Authorization': `Bearer ${this.getSecureToken()}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'project-tracker-cli/1.0.0',
        'X-GitHub-Api-Version': '2022-11-28',
        'X-Requested-With': 'XMLHttpRequest', // CSRF保護
        'Cache-Control': 'no-cache', // キャッシュ攻撃防止
      },
    });

    this.setupInterceptors();
  }

  /**
   * セキュアなトークン取得
   * セキュリティ: 認証マネージャーを使用した安全なトークン取得
   */
  private getSecureToken(): string {
    try {
      return authManager.getSecureToken();
    } catch (error) {
      throw new Error(`セキュリティファーストで: トークン取得に失敗しました - ${error}`);
    }
  }

  /**
   * 設定の検証とサニタイズ
   * セキュリティ: より厳密な検証と入力サニタイズ
   */
  private validateConfig(config: GitHubConfig): GitHubConfig {
    // HTTPS接続の強制チェック
    const baseUrl = config.base_url || 'https://api.github.com';
    authManager.validateSecureConnection(baseUrl);

    // リポジトリ名の検証
    const repositoryString = `${config.owner}/${config.repo}`;
    const repoValidationErrors = validate.githubRepo(repositoryString);
    if (repoValidationErrors.length > 0) {
      const errorMessages = repoValidationErrors.map(e => e.message).join(', ');
      throw new Error(`セキュリティファーストで: リポジトリ名の検証に失敗しました - ${errorMessages}`);
    }

    // 所有者名の検証
    const ownerErrors = validate.string(config.owner, 'owner', {
      required: true,
      pattern: /^[a-zA-Z0-9\-_.]+$/,
      maxLength: 100
    });
    if (ownerErrors.length > 0) {
      throw new Error(`セキュリティファーストで: 所有者名が不正です - ${ownerErrors[0].message}`);
    }

    // リポジトリ名の検証
    const repoErrors = validate.string(config.repo, 'repo', {
      required: true,
      pattern: /^[a-zA-Z0-9\-_.]+$/,
      maxLength: 100
    });
    if (repoErrors.length > 0) {
      throw new Error(`セキュリティファーストで: リポジトリ名が不正です - ${repoErrors[0].message}`);
    }

    return {
      ...config,
      owner: securityValidator.sanitizeString(config.owner, { removeSpecialChars: true }),
      repo: securityValidator.sanitizeString(config.repo, { removeSpecialChars: true }),
      base_url: baseUrl,
      timeout_ms: Math.min(Math.max(config.timeout_ms, 1000), 30000), // 1秒-30秒
      retry_attempts: Math.min(Math.max(config.retry_attempts, 1), 5), // 1-5回
      rate_limit_buffer: Math.min(Math.max(config.rate_limit_buffer, 5), 100), // 5-100
    };
  }

  /**
   * リクエスト/レスポンスインターセプター設定
   * セキュリティ強化: レート制限、入力検証、HTTPS強制
   */
  private setupInterceptors(): void {
    // リクエストインターセプター
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // HTTPS接続の強制確認
        if (config.baseURL && !config.baseURL.startsWith('https://')) {
          throw new Error('セキュリティファーストで: HTTPS接続が必要です');
        }

        // URLパスの検証
        if (config.url) {
          const pathErrors = validate.string(config.url, 'url_path', {
            maxLength: 2000,
            blockedChars: '<>"`{}'
          });
          if (pathErrors.length > 0) {
            throw new Error(`セキュリティファーストで: 不正なURL - ${pathErrors[0].message}`);
          }
        }

        // リクエストパラメータの検証
        if (config.params) {
          for (const [key, value] of Object.entries(config.params)) {
            if (typeof value === 'string') {
              const paramErrors = validate.string(value, key, {
                maxLength: 1000
              });
              if (paramErrors.length > 0) {
                console.warn(`パラメータ ${key} の検証警告:`, paramErrors[0].message);
              }
            }
          }
        }

        // レート制限チェック
        if (this.rateLimitInfo && this.rateLimitInfo.remaining < this.config.rate_limit_buffer) {
          const resetTime = this.rateLimitInfo.reset.getTime();
          const now = Date.now();
          
          if (now < resetTime) {
            const waitTime = resetTime - now;
            console.warn(`🚨 レート制限近づき中。${Math.ceil(waitTime / 1000)}秒待機します`);
            return new Promise((resolve) => {
              setTimeout(() => resolve(config), waitTime);
            });
          }
        }

        // セキュリティヘッダーの追加
        Object.assign(config.headers, {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        });
        
        return config;
      },
      (error) => Promise.reject(this.createTrackerError(error, 'github_api'))
    );

    // レスポンスインターセプター
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // レスポンスデータの検証
        this.validateResponseData(response);
        
        // レート制限情報の更新
        this.updateRateLimitInfo(response);
        
        // セキュリティヘッダーの確認
        this.validateSecurityHeaders(response);
        
        return response;
      },
      async (error) => {
        // セキュリティエラーの詳細ログ
        if (error.response?.status === 401) {
          console.error('🚨 認証エラー: トークンが無効または期限切れです');
        } else if (error.response?.status === 403) {
          console.error('🚨 権限エラー: APIアクセス権限が不足しています');
        }

        // レート制限エラーの場合は自動リトライ
        if (error.response?.status === 429) {
          const retryAfter = Math.min(
            parseInt(error.response.headers['retry-after'] || '60', 10),
            300 // 最大5分に制限
          );
          console.warn(`🚨 レート制限に達しました。${retryAfter}秒後にリトライします`);
          
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.axiosInstance.request(error.config);
        }

        return Promise.reject(this.createTrackerError(error, 'github_api'));
      }
    );
  }

  /**
   * レスポンスデータの検証
   * セキュリティ: 悪意のあるレスポンスの検出
   */
  private validateResponseData(response: AxiosResponse): void {
    if (!response.data) {
      return;
    }

    // レスポンスサイズの制限チェック
    const responseSize = JSON.stringify(response.data).length;
    if (responseSize > 10 * 1024 * 1024) { // 10MB制限
      console.warn('🚨 レスポンスサイズが大きすぎます:', responseSize);
    }

    // 文字列フィールドの検証
    if (typeof response.data === 'object') {
      this.validateObjectFields(response.data);
    }
  }

  /**
   * オブジェクトフィールドの再帰的検証
   */
  private validateObjectFields(obj: any, depth: number = 0): void {
    if (depth > 10) { // 循環参照対策
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // 悪意のあるスクリプトや危険なコンテンツの検出
        const validationErrors = validate.string(value, key, {
          maxLength: 10000
        });
        
        if (validationErrors.some(e => e.rule.includes('injection') || e.rule.includes('xss'))) {
          console.warn(`🚨 レスポンスフィールド ${key} に潜在的なセキュリティ脅威を検出`);
        }
      } else if (typeof value === 'object' && value !== null) {
        this.validateObjectFields(value, depth + 1);
      }
    }
  }

  /**
   * セキュリティヘッダーの確認
   */
  private validateSecurityHeaders(response: AxiosResponse): void {
    const headers = response.headers;
    
    // Content-Type ヘッダーの確認
    if (!headers['content-type']?.includes('application/json')) {
      console.warn('🚨 予期しないContent-Type:', headers['content-type']);
    }

    // セキュリティ関連ヘッダーの確認
    const securityHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-github-request-id'
    ];

    for (const header of securityHeaders) {
      if (!headers[header]) {
        console.warn(`🚨 セキュリティヘッダー ${header} が不足`);
      }
    }
  }

  /**
   * レート制限情報の更新
   * セキュリティ強化: 異常な制限値の検出
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers;
    
    if (headers['x-ratelimit-limit']) {
      const limit = parseInt(headers['x-ratelimit-limit'], 10);
      const remaining = parseInt(headers['x-ratelimit-remaining'], 10);
      const reset = parseInt(headers['x-ratelimit-reset'], 10);
      const used = parseInt(headers['x-ratelimit-used'], 10);

      // 異常な値の検出
      if (limit < 0 || remaining < 0 || used < 0) {
        console.warn('🚨 異常なレート制限値を検出:', { limit, remaining, used });
      }

      if (remaining > limit) {
        console.warn('🚨 残りリクエスト数が制限値を超過:', { limit, remaining });
      }

      this.rateLimitInfo = {
        limit,
        remaining,
        reset: new Date(reset * 1000),
        used,
      };

      // レート制限警告
      if (remaining < this.config.rate_limit_buffer) {
        console.warn(`⚠️ レート制限警告: 残り${remaining}/${limit}リクエスト`);
      }
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