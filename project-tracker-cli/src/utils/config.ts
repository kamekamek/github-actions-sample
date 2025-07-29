/**
 * Configuration Management
 * セキュリティファーストな設定管理ユーティリティ
 * 
 * @author Yamada Kenta - Backend Developer
 * @author AI Security Specialist - Security Enhancement
 * @security Environment variable validation, secure defaults, input sanitization
 */

import { config } from 'dotenv';
import { GitHubConfig, AnalysisConfig } from '../types/index.js';
import { authManager } from '../security/auth.js';
import { validate, securityValidator } from '../security/validator.js';

// 環境変数を読み込み
config();

/**
 * 環境変数から設定を構築
 * セキュリティ強化 - 厳密な検証、サニタイズ、安全なデフォルト値
 */
export function createGitHubConfig(owner?: string, repo?: string): GitHubConfig {
  // セキュアなトークン取得
  const token = authManager.getSecureToken();

  // 所有者とリポジトリ名の取得と検証
  const ownerName = owner || process.env.GITHUB_OWNER || '';
  const repoName = repo || process.env.GITHUB_REPO || '';

  // 所有者名の検証
  if (ownerName) {
    const ownerErrors = validate.string(ownerName, 'owner', {
      required: true,
      pattern: /^[a-zA-Z0-9\-_.]+$/,
      maxLength: 100
    });
    if (ownerErrors.length > 0) {
      throw new Error(`セキュリティファーストで: 所有者名が不正です - ${ownerErrors[0].message}`);
    }
  }

  // リポジトリ名の検証
  if (repoName) {
    const repoErrors = validate.string(repoName, 'repo', {
      required: true,
      pattern: /^[a-zA-Z0-9\-_.]+$/,
      maxLength: 100
    });
    if (repoErrors.length > 0) {
      throw new Error(`セキュリティファーストで: リポジトリ名が不正です - ${repoErrors[0].message}`);
    }
  }

  // ベースURLの検証
  const baseUrl = process.env.GITHUB_BASE_URL || 'https://api.github.com';
  const urlErrors = validate.url(baseUrl);
  if (urlErrors.length > 0) {
    throw new Error(`セキュリティファーストで: ベースURLが不正です - ${urlErrors[0].message}`);
  }

  // 数値設定の検証と安全な範囲への制限
  const timeoutMs = validateNumericConfig(
    process.env.GITHUB_TIMEOUT_MS,
    'GITHUB_TIMEOUT_MS',
    10000,
    1000,
    30000
  );

  const retryAttempts = validateNumericConfig(
    process.env.GITHUB_RETRY_ATTEMPTS,
    'GITHUB_RETRY_ATTEMPTS',
    3,
    1,
    5
  );

  const rateLimitBuffer = validateNumericConfig(
    process.env.GITHUB_RATE_LIMIT_BUFFER,
    'GITHUB_RATE_LIMIT_BUFFER',
    10,
    5,
    100
  );

  const gitHubConfig: GitHubConfig = {
    token: token,
    owner: securityValidator.sanitizeString(ownerName, { removeSpecialChars: true }),
    repo: securityValidator.sanitizeString(repoName, { removeSpecialChars: true }),
    base_url: baseUrl,
    timeout_ms: timeoutMs,
    retry_attempts: retryAttempts,
    rate_limit_buffer: rateLimitBuffer,
  };

  return gitHubConfig;
}

/**
 * 数値設定の検証
 * セキュリティ: 数値の範囲制限と検証
 */
function validateNumericConfig(
  value: string | undefined,
  name: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (!value) {
    return defaultValue;
  }

  const numericErrors = validate.number(value, name, min, max);
  if (numericErrors.length > 0) {
    console.warn(`設定警告 ${name}: ${numericErrors[0].message} - デフォルト値 ${defaultValue} を使用`);
    return defaultValue;
  }

  const parsedValue = parseFloat(value);
  return Math.min(Math.max(parsedValue, min), max);
}

/**
 * 重み設定の検証
 * セキュリティ: 重みの合計が1.0になることを確認
 */
function validateWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  
  if (Math.abs(total - 1.0) > 0.01) {
    console.warn(`ヘルススコア重みの合計が1.0ではありません (${total.toFixed(3)}). 正規化します。`);
    
    // 重みを正規化
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(weights)) {
      normalized[key] = value / total;
    }
    return normalized;
  }
  
  return weights;
}

/**
 * デフォルト分析設定を作成
 * セキュリティ強化 - 設定値の検証と安全な範囲への制限
 */
export function createDefaultAnalysisConfig(): AnalysisConfig {
  // 時間範囲の検証
  const timeRangeDays = validateNumericConfig(
    process.env.ANALYSIS_TIME_RANGE_DAYS,
    'ANALYSIS_TIME_RANGE_DAYS',
    30,
    1,
    365
  );

  // コミットメッセージ長の検証
  const minCommitMessageLength = validateNumericConfig(
    process.env.ANALYSIS_MIN_COMMIT_MESSAGE_LENGTH,
    'ANALYSIS_MIN_COMMIT_MESSAGE_LENGTH',
    10,
    1,
    100
  );

  // ブール値の安全な解析
  const includeWeekends = process.env.ANALYSIS_INCLUDE_WEEKENDS?.toLowerCase() === 'true';
  const excludeMergeCommits = process.env.ANALYSIS_EXCLUDE_MERGE_COMMITS?.toLowerCase() !== 'false';

  // ヘルススコア重みの検証
  const rawWeights = {
    activity: validateNumericConfig(
      process.env.HEALTH_WEIGHT_ACTIVITY,
      'HEALTH_WEIGHT_ACTIVITY',
      0.3,
      0.0,
      1.0
    ),
    code_quality: validateNumericConfig(
      process.env.HEALTH_WEIGHT_CODE_QUALITY,
      'HEALTH_WEIGHT_CODE_QUALITY',
      0.25,
      0.0,
      1.0
    ),
    collaboration: validateNumericConfig(
      process.env.HEALTH_WEIGHT_COLLABORATION,
      'HEALTH_WEIGHT_COLLABORATION',
      0.25,
      0.0,
      1.0
    ),
    issue_management: validateNumericConfig(
      process.env.HEALTH_WEIGHT_ISSUE_MANAGEMENT,
      'HEALTH_WEIGHT_ISSUE_MANAGEMENT',
      0.2,
      0.0,
      1.0
    ),
  };

  const validatedWeights = validateWeights(rawWeights);

  return {
    time_range_days: timeRangeDays,
    include_weekends: includeWeekends,
    exclude_merge_commits: excludeMergeCommits,
    minimum_commit_message_length: minCommitMessageLength,
    health_score_weights: {
      activity: validatedWeights.activity,
      code_quality: validatedWeights.code_quality,
      collaboration: validatedWeights.collaboration,
      issue_management: validatedWeights.issue_management,
    },
  };
}

/**
 * 設定値の包括的検証
 * セキュリティ強化 - 全環境変数の安全性チェック
 */
export function validateEnvironment(): void {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 必須環境変数のチェック
  try {
    authManager.getSecureToken();
  } catch (error) {
    errors.push('GITHUB_TOKEN: 有効なトークンが設定されていません');
  }

  // セキュリティ設定の検証
  const securityRequireHttps = process.env.SECURITY_REQUIRE_HTTPS;
  if (securityRequireHttps?.toLowerCase() === 'false') {
    warnings.push('SECURITY_REQUIRE_HTTPS: HTTPS強制が無効です（セキュリティリスク）');
  }

  // デバッグモードの警告
  const debugMode = process.env.DEBUG_MODE;
  if (debugMode?.toLowerCase() === 'true') {
    warnings.push('DEBUG_MODE: デバッグモードが有効です（本番環境では無効にしてください）');
  }

  // API設定の検証
  const baseUrl = process.env.GITHUB_BASE_URL;
  if (baseUrl) {
    const urlErrors = validate.url(baseUrl);
    if (urlErrors.length > 0) {
      errors.push(`GITHUB_BASE_URL: ${urlErrors[0].message}`);
    }
  }

  // 数値設定の範囲チェック
  const timeoutMs = process.env.GITHUB_TIMEOUT_MS;
  if (timeoutMs) {
    const timeoutErrors = validate.number(timeoutMs, 'GITHUB_TIMEOUT_MS', 1000, 30000);
    if (timeoutErrors.length > 0) {
      warnings.push(`GITHUB_TIMEOUT_MS: ${timeoutErrors[0].message}`);
    }
  }

  // セキュリティ診断の実行
  const securityDiagnosis = authManager.diagnoseSecurityState();
  if (securityDiagnosis.securityLevel === 'low') {
    warnings.push('セキュリティレベルが低です。設定を見直してください。');
  }

  // エラーがある場合は例外をスロー
  if (errors.length > 0) {
    throw new Error(`セキュリティファーストで: 設定エラー - ${errors.join('; ')}`);
  }

  // 警告の表示
  if (warnings.length > 0) {
    console.warn('⚠️ 設定警告:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // セキュリティレポートの表示
  if (securityDiagnosis.recommendations.length > 0) {
    console.log('\n🛡️  セキュリティ推奨事項:');
    securityDiagnosis.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}

/**
 * 設定の安全性スコアを計算
 * セキュリティ: 現在の設定の安全性を0-100で評価
 */
export function calculateConfigSecurityScore(): {
  score: number;
  details: Record<string, { score: number; reason: string }>;
} {
  const details: Record<string, { score: number; reason: string }> = {};

  // トークン設定の評価
  try {
    authManager.getSecureToken();
    const securityDiagnosis = authManager.diagnoseSecurityState();
    
    switch (securityDiagnosis.securityLevel) {
      case 'high':
        details.token = { score: 100, reason: '安全なトークン設定' };
        break;
      case 'medium':
        details.token = { score: 70, reason: 'トークン設定に改善の余地あり' };
        break;
      default:
        details.token = { score: 30, reason: 'トークン設定に問題あり' };
    }
  } catch {
    details.token = { score: 0, reason: 'トークンが設定されていない' };
  }

  // HTTPS設定の評価
  const httpsRequired = process.env.SECURITY_REQUIRE_HTTPS?.toLowerCase() !== 'false';
  details.https = {
    score: httpsRequired ? 100 : 0,
    reason: httpsRequired ? 'HTTPS接続が強制されている' : 'HTTPS接続が強制されていない'
  };

  // 暗号化設定の評価
  const encryptionEnabled = process.env.SECURITY_ENCRYPT_TOKENS?.toLowerCase() !== 'false';
  details.encryption = {
    score: encryptionEnabled ? 100 : 50,
    reason: encryptionEnabled ? 'トークン暗号化が有効' : 'トークン暗号化が無効'
  };

  // デバッグモードの評価
  const debugMode = process.env.DEBUG_MODE?.toLowerCase() === 'true';
  details.debug = {
    score: debugMode ? 20 : 100,
    reason: debugMode ? 'デバッグモードが有効（セキュリティリスク）' : 'デバッグモードが無効'
  };

  // 総合スコアの計算
  const scores = Object.values(details).map(d => d.score);
  const totalScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return {
    score: Math.round(totalScore),
    details
  };
}