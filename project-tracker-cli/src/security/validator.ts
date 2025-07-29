/**
 * Input Validation and Sanitization
 * セキュリティファーストな入力検証・サニタイズ機能
 * 
 * @author AI Security Specialist
 * @security Input validation, XSS prevention, injection protection
 */

import { createHash } from 'crypto';

/**
 * 検証ルール設定
 */
export interface ValidationRules {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly allowedChars?: string;
  readonly blockedChars?: string;
  readonly customValidator?: (value: string) => boolean;
}

/**
 * 検証エラー情報
 */
export interface ValidationError {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly value: string;
  readonly severity: 'low' | 'medium' | 'high';
}

/**
 * サニタイズオプション
 */
export interface SanitizeOptions {
  readonly removeHtml?: boolean;
  readonly removeScripts?: boolean;
  readonly removeSpecialChars?: boolean;
  readonly normalizeWhitespace?: boolean;
  readonly maxLength?: number;
  readonly allowedTags?: string[];
}

/**
 * セキュリティファーストな入力検証・サニタイズクラス
 */
export class SecurityValidator {
  private readonly securityPatterns = {
    // 悪意のあるパターンの検出
    xssPatterns: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ],
    
    // SQLインジェクションパターン
    sqlInjectionPatterns: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/)/gi,
      /(\bEXEC\b|\bEXECUTE\b)/gi
    ],

    // コマンドインジェクションパターン
    commandInjectionPatterns: [
      /[;&|`$(){}[\]]/g,
      /\b(rm|cat|ls|wget|curl|nc|telnet)\b/gi
    ],

    // 安全なGitHubリポジトリ名パターン
    githubRepoPattern: /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/,
    
    // 安全なファイル名パターン
    safeFilenamePattern: /^[a-zA-Z0-9\-_.]+$/,
    
    // 安全なURL パターン
    safeUrlPattern: /^https:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/
  };

  /**
   * 文字列の包括的検証
   */
  public validateString(
    value: string,
    field: string,
    rules: ValidationRules = {}
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // null/undefined チェック
    if (value === null || value === undefined) {
      if (rules.required) {
        errors.push({
          field,
          rule: 'required',
          message: `${field}は必須です`,
          value: String(value),
          severity: 'high'
        });
      }
      return errors;
    }

    const stringValue = String(value);

    // 必須チェック
    if (rules.required && stringValue.trim().length === 0) {
      errors.push({
        field,
        rule: 'required',
        message: `${field}は必須です`,
        value: stringValue,
        severity: 'high'
      });
    }

    // 長さチェック
    if (rules.minLength && stringValue.length < rules.minLength) {
      errors.push({
        field,
        rule: 'minLength',
        message: `${field}は${rules.minLength}文字以上である必要があります`,
        value: stringValue,
        severity: 'medium'
      });
    }

    if (rules.maxLength && stringValue.length > rules.maxLength) {
      errors.push({
        field,
        rule: 'maxLength',
        message: `${field}は${rules.maxLength}文字以下である必要があります`,
        value: stringValue.substring(0, 50) + '...',
        severity: 'high'
      });
    }

    // パターンマッチング
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      errors.push({
        field,
        rule: 'pattern',
        message: `${field}の形式が正しくありません`,
        value: stringValue,
        severity: 'medium'
      });
    }

    // 許可文字チェック
    if (rules.allowedChars) {
      const allowedPattern = new RegExp(`^[${rules.allowedChars}]*$`);
      if (!allowedPattern.test(stringValue)) {
        errors.push({
          field,
          rule: 'allowedChars',
          message: `${field}に不正な文字が含まれています`,
          value: stringValue,
          severity: 'high'
        });
      }
    }

    // 禁止文字チェック
    if (rules.blockedChars) {
      const blockedPattern = new RegExp(`[${rules.blockedChars}]`);
      if (blockedPattern.test(stringValue)) {
        errors.push({
          field,
          rule: 'blockedChars',
          message: `${field}に禁止文字が含まれています`,
          value: stringValue,
          severity: 'high'
        });
      }
    }

    // カスタムバリデーター
    if (rules.customValidator && !rules.customValidator(stringValue)) {
      errors.push({
        field,
        rule: 'custom',
        message: `${field}がカスタム検証に失敗しました`,
        value: stringValue,
        severity: 'medium'
      });
    }

    // セキュリティ脅威検証
    errors.push(...this.validateSecurityThreats(stringValue, field));

    return errors;
  }

  /**
   * セキュリティ脅威の検証
   */
  private validateSecurityThreats(value: string, field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // XSS攻撃検出
    for (const pattern of this.securityPatterns.xssPatterns) {
      if (pattern.test(value)) {
        errors.push({
          field,
          rule: 'xss_detection',
          message: `${field}にXSS攻撃の可能性があるコードが検出されました`,
          value: value.substring(0, 50) + '...',
          severity: 'high'
        });
        break;
      }
    }

    // SQLインジェクション検出
    for (const pattern of this.securityPatterns.sqlInjectionPatterns) {
      if (pattern.test(value)) {
        errors.push({
          field,
          rule: 'sql_injection_detection',
          message: `${field}にSQLインジェクション攻撃の可能性があるコードが検出されました`,
          value: value.substring(0, 50) + '...',
          severity: 'high'
        });
        break;
      }
    }

    // コマンドインジェクション検出
    for (const pattern of this.securityPatterns.commandInjectionPatterns) {
      if (pattern.test(value)) {
        errors.push({
          field,
          rule: 'command_injection_detection',  
          message: `${field}にコマンドインジェクション攻撃の可能性があるコードが検出されました`,
          value: value.substring(0, 50) + '...',
          severity: 'high'
        });
        break;
      }
    }

    return errors;
  }

  /**
   * 文字列のサニタイズ
   */
  public sanitizeString(value: string, options: SanitizeOptions = {}): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    let sanitized = value;

    // HTMLタグの除去
    if (options.removeHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // スクリプトタグの除去
    if (options.removeScripts) {
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    }

    // 特殊文字の除去
    if (options.removeSpecialChars) {
      sanitized = sanitized.replace(/[<>\"'&]/g, '');
    }

    // ホワイトスペースの正規化
    if (options.normalizeWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }

    // 長さ制限
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * GitHubリポジトリ名の検証
   */
  public validateGitHubRepository(repository: string): ValidationError[] {
    return this.validateString(repository, 'repository', {
      required: true,
      pattern: this.securityPatterns.githubRepoPattern,
      maxLength: 100,
      allowedChars: 'a-zA-Z0-9\\-_./\\s'
    });
  }

  /**
   * ファイル名の検証
   */
  public validateFilename(filename: string): ValidationError[] {
    return this.validateString(filename, 'filename', {
      required: true,
      pattern: this.securityPatterns.safeFilenamePattern,
      maxLength: 255,
      blockedChars: '<>:\"/\\\\|?*'
    });
  }

  /**
   * URLの検証
   */
  public validateUrl(url: string): ValidationError[] {
    const errors = this.validateString(url, 'url', {
      required: true,
      maxLength: 2000
    });

    // HTTPS強制チェック
    if (url && !url.startsWith('https://')) {
      errors.push({
        field: 'url',
        rule: 'https_required',
        message: 'URLはHTTPS接続である必要があります',
        value: url,
        severity: 'high'
      });
    }

    // URL形式チェック
    if (url && !this.securityPatterns.safeUrlPattern.test(url)) {
      errors.push({
        field: 'url',
        rule: 'invalid_url_format',
        message: 'URLの形式が不正です',
        value: url,
        severity: 'medium'
      });
    }

    return errors;
  }

  /**
   * 数値の検証
   */
  public validateNumber(
    value: number | string,
    field: string,
    min?: number,
    max?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      errors.push({
        field,
        rule: 'invalid_number',
        message: `${field}は有効な数値である必要があります`,
        value: String(value),
        severity: 'medium'
      });
      return errors;
    }

    if (min !== undefined && numValue < min) {
      errors.push({
        field,
        rule: 'min_value',
        message: `${field}は${min}以上である必要があります`,
        value: String(value),
        severity: 'medium'
      });
    }

    if (max !== undefined && numValue > max) {
      errors.push({
        field,
        rule: 'max_value',
        message: `${field}は${max}以下である必要があります`,
        value: String(value),
        severity: 'medium'
      });
    }

    return errors;
  }

  /**
   * バッチ検証
   */
  public validateBatch(
    data: Record<string, unknown>,
    rules: Record<string, ValidationRules>
  ): ValidationError[] {
    const allErrors: ValidationError[] = [];

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field];
      if (typeof value === 'string' || value === null || value === undefined) {
        const errors = this.validateString(String(value), field, fieldRules);
        allErrors.push(...errors);
      }
    }

    return allErrors;
  }

  /**
   * 検証エラーの分析とレポート
   */
  public analyzeValidationErrors(errors: ValidationError[]): {
    totalErrors: number;
    criticalErrors: number;
    errorsByField: Record<string, number>;
    securityThreats: ValidationError[];
    recommendations: string[];
  } {
    const errorsByField: Record<string, number> = {};
    const securityThreats = errors.filter(error => 
      error.rule.includes('injection') || 
      error.rule.includes('xss') || 
      error.severity === 'high'
    );

    errors.forEach(error => {
      errorsByField[error.field] = (errorsByField[error.field] || 0) + 1;
    });

    const criticalErrors = errors.filter(error => error.severity === 'high').length;
    const recommendations: string[] = [];

    if (criticalErrors > 0) {
      recommendations.push(`${criticalErrors}件の重要なセキュリティエラーを修正してください`);
    }

    if (securityThreats.length > 0) {
      recommendations.push(`${securityThreats.length}件のセキュリティ脅威が検出されました`);
    }

    const mostProblematicField = Object.entries(errorsByField)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostProblematicField) {
      recommendations.push(`'${mostProblematicField[0]}'フィールドに最も多くのエラーがあります (${mostProblematicField[1]}件)`);
    }

    return {
      totalErrors: errors.length,
      criticalErrors,
      errorsByField,
      securityThreats,
      recommendations
    };
  }

  /**
   * セキュリティハッシュの生成
   * データ整合性の確認用
   */
  public generateSecurityHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * 入力データの正規化
   */
  public normalizeInput(input: string): string {
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 制御文字の除去
      .substring(0, 10000); // 最大長制限
  }
}

/**
 * デフォルトのセキュリティバリデーターインスタンス
 */
export const securityValidator = new SecurityValidator();

/**
 * 高頻度で使用される検証関数のショートカット
 */
export const validate = {
  /**
   * GitHubリポジトリ名の検証
   */
  githubRepo: (repo: string): ValidationError[] => 
    securityValidator.validateGitHubRepository(repo),

  /**
   * 安全なファイル名の検証
   */
  filename: (filename: string): ValidationError[] => 
    securityValidator.validateFilename(filename),

  /**
   * 安全なURLの検証
   */
  url: (url: string): ValidationError[] => 
    securityValidator.validateUrl(url),

  /**
   * 文字列の基本検証
   */
  string: (value: string, field: string, rules?: ValidationRules): ValidationError[] =>
    securityValidator.validateString(value, field, rules || {}),

  /**
   * 数値の検証
   */
  number: (value: number | string, field: string, min?: number, max?: number): ValidationError[] =>
    securityValidator.validateNumber(value, field, min, max)
};

/**
 * サニタイズ関数のショートカット
 */
export const sanitize = {
  /**
   * 基本的な文字列サニタイズ
   */
  string: (value: string, options?: SanitizeOptions): string =>
    securityValidator.sanitizeString(value, options),

  /**
   * HTMLの安全な除去
   */
  html: (value: string): string =>
    securityValidator.sanitizeString(value, { 
      removeHtml: true, 
      removeScripts: true, 
      normalizeWhitespace: true 
    }),

  /**
   * 入力データの正規化
   */
  normalize: (input: string): string =>
    securityValidator.normalizeInput(input)
};