/**
 * Configuration Management
 * セキュリティファーストな設定管理ユーティリティ
 * 
 * @author Yamada Kenta - Backend Developer
 * @security Environment variable validation, secure defaults
 */

import { config } from 'dotenv';
import { GitHubConfig, AnalysisConfig } from '../types/index.js';

// 環境変数を読み込み
config();

/**
 * 環境変数から設定を構築
 * セキュリティファーストで実装 - デフォルト値と検証
 */
export function createGitHubConfig(owner?: string, repo?: string): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('セキュリティファーストで: GITHUB_TOKEN環境変数が設定されていません');
  }

  const gitHubConfig: GitHubConfig = {
    token,
    owner: owner || process.env.GITHUB_OWNER || '',
    repo: repo || process.env.GITHUB_REPO || '',
    base_url: process.env.GITHUB_BASE_URL || 'https://api.github.com',
    timeout_ms: parseInt(process.env.GITHUB_TIMEOUT_MS || '10000', 10),
    retry_attempts: parseInt(process.env.GITHUB_RETRY_ATTEMPTS || '3', 10),
    rate_limit_buffer: parseInt(process.env.GITHUB_RATE_LIMIT_BUFFER || '10', 10),
  };

  return gitHubConfig;
}

/**
 * デフォルト分析設定を作成
 * パフォーマンス測定してみましょう - 最適化された設定値
 */
export function createDefaultAnalysisConfig(): AnalysisConfig {
  return {
    time_range_days: parseInt(process.env.ANALYSIS_TIME_RANGE_DAYS || '30', 10),
    include_weekends: process.env.ANALYSIS_INCLUDE_WEEKENDS === 'true',
    exclude_merge_commits: process.env.ANALYSIS_EXCLUDE_MERGE_COMMITS !== 'false',
    minimum_commit_message_length: parseInt(process.env.ANALYSIS_MIN_COMMIT_MESSAGE_LENGTH || '10', 10),
    health_score_weights: {
      activity: parseFloat(process.env.HEALTH_WEIGHT_ACTIVITY || '0.3'),
      code_quality: parseFloat(process.env.HEALTH_WEIGHT_CODE_QUALITY || '0.25'),
      collaboration: parseFloat(process.env.HEALTH_WEIGHT_COLLABORATION || '0.25'),
      issue_management: parseFloat(process.env.HEALTH_WEIGHT_ISSUE_MANAGEMENT || '0.2'),
    },
  };
}

/**
 * 設定値の検証
 * セキュリティファーストで実装
 */
export function validateEnvironment(): void {
  const required = ['GITHUB_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`セキュリティファーストで: 必須環境変数が不足しています: ${missing.join(', ')}`);
  }
}