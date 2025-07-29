/**
 * Authentication Security Manager
 * セキュリティファーストなGitHub Token認証管理
 * 
 * @author AI Security Specialist
 * @security Token encryption, secure storage, validation
 */

import { createHash, createCipher, createDecipher } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * セキュリティ設定インターフェース
 */
export interface SecurityConfig {
  readonly tokenEncryption: boolean;
  readonly validateTokenFormat: boolean;
  readonly logSecurityEvents: boolean;
  readonly maxTokenAge: number; // seconds
  readonly requireHttps: boolean;
}

/**
 * トークン情報インターフェース
 */
export interface TokenInfo {
  readonly token: string;
  readonly created: Date;
  readonly lastUsed: Date;
  readonly encrypted: boolean;
  readonly hash: string;
}

/**
 * セキュリティイベント
 */
export interface SecurityEvent {
  readonly type: 'token_validation' | 'token_creation' | 'token_access' | 'security_violation';
  readonly timestamp: Date;
  readonly details: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * GitHub Token認証管理クラス
 * セキュリティファーストアプローチで実装
 */
export class AuthenticationManager {
  private readonly configPath: string;
  private readonly securityConfig: SecurityConfig;
  private securityEvents: SecurityEvent[] = [];

  constructor(config?: Partial<SecurityConfig>) {
    this.configPath = join(homedir(), '.project-tracker', 'auth.json');
    this.securityConfig = {
      tokenEncryption: true,
      validateTokenFormat: true,
      logSecurityEvents: true,
      maxTokenAge: 86400 * 30, // 30 days
      requireHttps: true,
      ...config
    };

    this.logSecurityEvent('token_access', { action: 'auth_manager_initialized' }, 'low');
  }

  /**
   * GitHub Tokenの安全な取得
   * セキュリティ: 環境変数優先、暗号化ストレージフォールバック
   */
  public getSecureToken(): string {
    // 1. 環境変数から取得（最優先）
    const envToken = process.env.GITHUB_TOKEN;
    if (envToken) {
      this.validateTokenFormat(envToken);
      this.logSecurityEvent('token_access', { source: 'environment' }, 'low');
      return envToken;
    }

    // 2. 暗号化されたローカルストレージから取得
    const storedToken = this.getStoredToken();
    if (storedToken) {
      this.validateTokenFormat(storedToken.token);
      this.logSecurityEvent('token_access', { source: 'encrypted_storage' }, 'low');
      return storedToken.token;
    }

    throw new Error('セキュリティファーストで: GitHub Tokenが見つかりません。環境変数GITHUB_TOKENを設定するか、`auth setup`コマンドを実行してください');
  }

  /**
   * GitHub Tokenの安全な保存
   * セキュリティ: AES-256暗号化でローカル保存
   */
  public storeSecureToken(token: string, passphrase?: string): void {
    this.validateTokenFormat(token);

    const tokenInfo: TokenInfo = {
      token: this.securityConfig.tokenEncryption ? this.encryptToken(token, passphrase) : token,
      created: new Date(),
      lastUsed: new Date(),
      encrypted: this.securityConfig.tokenEncryption,
      hash: this.createTokenHash(token)
    };

    try {
      this.ensureConfigDirectory();
      writeFileSync(this.configPath, JSON.stringify(tokenInfo, null, 2), { mode: 0o600 });
      this.logSecurityEvent('token_creation', { encrypted: tokenInfo.encrypted }, 'medium');
      console.log('✅ トークンが安全に保存されました');
    } catch (error) {
      this.logSecurityEvent('security_violation', { error: 'token_storage_failed' }, 'high');
      throw new Error('セキュリティファーストで: トークンの保存に失敗しました');
    }
  }

  /**
   * トークンの検証
   * セキュリティ: GitHub Token形式の厳密な検証
   */
  private validateTokenFormat(token: string): void {
    if (!this.securityConfig.validateTokenFormat) {
      return;
    }

    // GitHub Personal Access Token形式の検証
    const githubTokenPatterns = [
      /^ghp_[A-Za-z0-9]{36}$/, // Personal Access Token
      /^gho_[A-Za-z0-9]{36}$/, // OAuth Token
      /^ghu_[A-Za-z0-9]{36}$/, // User Token
      /^ghs_[A-Za-z0-9]{36}$/, // Server Token
      /^ghr_[A-Za-z0-9]{76}$/  // Refresh Token
    ];

    const isValidFormat = githubTokenPatterns.some(pattern => pattern.test(token));
    
    if (!isValidFormat) {
      this.logSecurityEvent('security_violation', { error: 'invalid_token_format' }, 'high');
      throw new Error('セキュリティファーストで: 無効なGitHub Token形式です');
    }

    // トークンの長さチェック
    if (token.length < 10 || token.length > 100) {
      this.logSecurityEvent('security_violation', { error: 'invalid_token_length' }, 'high');
      throw new Error('セキュリティファーストで: トークンの長さが不正です');
    }

    this.logSecurityEvent('token_validation', { result: 'valid' }, 'low');
  }

  /**
   * トークンの暗号化
   * セキュリティ: AES-256-CBC暗号化
   */
  private encryptToken(token: string, passphrase?: string): string {
    try {
      const key = passphrase || this.generateDefaultKey();
      const cipher = createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return encrypted;
    } catch (error) {
      this.logSecurityEvent('security_violation', { error: 'encryption_failed' }, 'critical');
      throw new Error('セキュリティファーストで: トークンの暗号化に失敗しました');
    }
  }

  /**
   * トークンの復号化
   * セキュリティ: AES-256-CBC復号化
   */
  private decryptToken(encryptedToken: string, passphrase?: string): string {
    try {
      const key = passphrase || this.generateDefaultKey();
      const decipher = createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logSecurityEvent('security_violation', { error: 'decryption_failed' }, 'critical');
      throw new Error('セキュリティファーストで: トークンの復号化に失敗しました');
    }
  }

  /**
   * 保存されたトークンの取得
   */
  private getStoredToken(): TokenInfo | null {
    try {
      if (!existsSync(this.configPath)) {
        return null;
      }

      const data = readFileSync(this.configPath, 'utf8');
      const tokenInfo = JSON.parse(data) as TokenInfo;

      // トークンの有効期限チェック
      const tokenAge = (Date.now() - new Date(tokenInfo.created).getTime()) / 1000;
      if (tokenAge > this.securityConfig.maxTokenAge) {
        this.logSecurityEvent('security_violation', { error: 'token_expired' }, 'medium');
        return null;
      }

      // 暗号化されている場合は復号化
      if (tokenInfo.encrypted) {
        const decryptedToken = this.decryptToken(tokenInfo.token);
        return {
          ...tokenInfo,
          token: decryptedToken,
          lastUsed: new Date()
        };
      }

      return tokenInfo;
    } catch (error) {
      this.logSecurityEvent('security_violation', { error: 'token_retrieval_failed' }, 'high');
      return null;
    }
  }

  /**
   * トークンハッシュの生成
   * セキュリティ: SHA-256ハッシュでトークンの整合性確認
   */
  private createTokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * デフォルト暗号化キーの生成
   * セキュリティ: マシン固有の情報を使用
   */
  private generateDefaultKey(): string {
    const machineInfo = `${homedir()}-${process.platform}-${process.arch}`;
    return createHash('sha256').update(machineInfo).digest('hex');
  }

  /**
   * 設定ディレクトリの確保
   */
  private ensureConfigDirectory(): void {
    const configDir = join(homedir(), '.project-tracker');
    if (!existsSync(configDir)) {
      const fs = require('fs');
      fs.mkdirSync(configDir, { mode: 0o700, recursive: true });
    }
  }

  /**
   * セキュリティイベントのログ
   */
  private logSecurityEvent(
    type: SecurityEvent['type'],
    details: Record<string, unknown>,
    severity: SecurityEvent['severity']
  ): void {
    if (!this.securityConfig.logSecurityEvents) {
      return;
    }

    const event: SecurityEvent = {
      type,
      timestamp: new Date(),
      details,
      severity
    };

    this.securityEvents.push(event);

    // 重要度が高い場合は即座に出力
    if (severity === 'high' || severity === 'critical') {
      console.warn(`🚨 セキュリティイベント [${severity.toUpperCase()}]: ${type}`, details);
    }

    // イベント数制限（メモリ保護）
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }
  }

  /**
   * セキュリティイベント履歴の取得
   */
  public getSecurityEvents(limit?: number): SecurityEvent[] {
    return limit ? this.securityEvents.slice(-limit) : [...this.securityEvents];
  }

  /**
   * HTTPS接続の強制チェック
   */
  public validateSecureConnection(url: string): void {
    if (!this.securityConfig.requireHttps) {
      return;
    }

    if (!url.startsWith('https://')) {
      this.logSecurityEvent('security_violation', { url, error: 'non_https_connection' }, 'high');
      throw new Error('セキュリティファーストで: HTTPS接続が必要です');
    }
  }

  /**
   * トークンの削除
   * セキュリティ: 安全な削除処理
   */
  public revokeToken(): boolean {
    try {
      if (existsSync(this.configPath)) {
        // ファイルをゼロで上書きしてから削除
        const fileSize = readFileSync(this.configPath).length;
        writeFileSync(this.configPath, Buffer.alloc(fileSize, 0));
        
        const fs = require('fs');
        fs.unlinkSync(this.configPath);
      }

      this.logSecurityEvent('token_creation', { action: 'token_revoked' }, 'medium');
      return true;
    } catch (error) {
      this.logSecurityEvent('security_violation', { error: 'token_revocation_failed' }, 'high');
      return false;
    }
  }

  /**
   * セキュリティ状態の診断
   */
  public diagnoseSecurityState(): {
    tokenSource: 'environment' | 'encrypted_storage' | 'none';
    securityLevel: 'high' | 'medium' | 'low';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let securityLevel: 'high' | 'medium' | 'low' = 'high';
    let tokenSource: 'environment' | 'encrypted_storage' | 'none' = 'none';

    // トークンソースの確認
    if (process.env.GITHUB_TOKEN) {
      tokenSource = 'environment';
      recommendations.push('✅ 環境変数からトークンを取得中（推奨）');
    } else if (existsSync(this.configPath)) {
      tokenSource = 'encrypted_storage';
      recommendations.push('⚠️ ローカルストレージからトークンを取得中');
      securityLevel = 'medium';
    } else {
      tokenSource = 'none';
      recommendations.push('❌ トークンが設定されていません');
      securityLevel = 'low';
    }

    // セキュリティ設定の評価
    if (!this.securityConfig.tokenEncryption) {
      recommendations.push('⚠️ トークン暗号化が無効です');
      securityLevel = 'medium';
    }

    if (!this.securityConfig.requireHttps) {
      recommendations.push('⚠️ HTTPS強制が無効です');
      securityLevel = 'medium';
    }

    // セキュリティイベントの確認
    const recentCriticalEvents = this.securityEvents.filter(
      event => event.severity === 'critical' && 
      (Date.now() - event.timestamp.getTime()) < 3600000 // 1時間以内
    );

    if (recentCriticalEvents.length > 0) {
      recommendations.push(`❌ 直近1時間で${recentCriticalEvents.length}件の重要なセキュリティイベントが発生`);
      securityLevel = 'low';
    }

    return { tokenSource, securityLevel, recommendations };
  }
}

/**
 * デフォルトの認証マネージャーインスタンス
 */
export const authManager = new AuthenticationManager();

/**
 * セキュリティファーストな認証設定の作成
 */
export function createSecureAuthConfig(): SecurityConfig {
  return {
    tokenEncryption: true,
    validateTokenFormat: true,
    logSecurityEvents: true,
    maxTokenAge: 86400 * 30, // 30 days
    requireHttps: true
  };
}