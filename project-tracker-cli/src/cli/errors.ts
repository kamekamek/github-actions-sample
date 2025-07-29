/**
 * Error Handler - ユーザーフレンドリーなエラーハンドリング
 * フロントエンド開発者による理解しやすいエラー表示
 * 
 * @author Frontend Developer - AI Virtual Corporation
 * @focus Error messaging, user guidance, troubleshooting
 */

import chalk from 'chalk';

/**
 * エラーハンドラークラス
 * ユーザーにとって分かりやすいエラーメッセージを提供
 */
export class CLIErrorHandler {
  
  /**
   * メインエラーハンドラー
   */
  static handleError(error: any, context?: string): void {
    console.log(); // 空行で視覚的な分離
    
    if (error && (error.source || error.code)) {
      this.handleTrackerError(error, context);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      this.handleNetworkError(error, context);
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      this.handleRateLimitError(error, context);
    } else if (error.status === 401 || error.message?.includes('Bad credentials')) {
      this.handleAuthenticationError(error, context);
    } else if (error.status === 403) {
      this.handlePermissionError(error, context);
    } else if (error.status === 404) {
      this.handleNotFoundError(error, context);
    } else {
      this.handleGenericError(error, context);
    }
    
    // デバッグ情報の表示（環境変数で制御）
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      this.displayDebugInfo(error);
    }
  }

  /**
   * TrackerErrorの処理
   */
  private static handleTrackerError(error: any, context?: string): void {
    console.error(chalk.red.bold('❌ エラーが発生しました'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    console.error(chalk.red(`メッセージ: ${error.message}`));
    console.error(chalk.gray(`エラーコード: ${error.code}`));
    console.error(chalk.gray(`発生時刻: ${error.timestamp.toLocaleString()}`));
    console.error(chalk.gray(`ソース: ${error.source}`));
    
    // ソース別のアドバイス
    this.provideTroubleshootingAdvice(error.source, error.code);
  }

  /**
   * ネットワークエラーの処理
   */
  private static handleNetworkError(_error: any, context?: string): void {
    console.error(chalk.red.bold('🌐 ネットワーク接続エラー'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    console.error(chalk.yellow('原因:'));
    console.error('  • インターネット接続が不安定');
    console.error('  • GitHub APIサーバーの一時的な障害');
    console.error('  • ファイアウォールやプロキシの制限');
    
    console.error(chalk.blue('\n解決方法:'));
    console.error('  1. インターネット接続を確認してください');
    console.error('  2. 数分後に再試行してください');
    console.error('  3. VPNやプロキシの設定を確認してください');
  }

  /**
   * レート制限エラーの処理
   */
  private static handleRateLimitError(error: any, context?: string): void {
    console.error(chalk.yellow.bold('⏱️  GitHub APIレート制限に達しました'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    const resetTime = error.response?.headers?.['x-ratelimit-reset'];
    if (resetTime) {
      const resetDate = new Date(parseInt(resetTime) * 1000);
      console.error(chalk.yellow(`リセット時刻: ${resetDate.toLocaleString()}`));
    }
    
    console.error(chalk.blue('\n解決方法:'));
    console.error('  1. 数分待ってから再試行してください');
    console.error('  2. GitHub Personal Access Tokenの権限を確認してください');
    console.error('  3. --days オプションで分析期間を短くしてください');
  }

  /**
   * 認証エラーの処理
   */
  private static handleAuthenticationError(_error: any, context?: string): void {
    console.error(chalk.red.bold('🔒 GitHub認証エラー'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    console.error(chalk.yellow('原因:'));
    console.error('  • GitHub Personal Access Tokenが無効または期限切れ');
    console.error('  • GITHUB_TOKEN環境変数が未設定');
    console.error('  • トークンの権限が不十分');
    
    console.error(chalk.blue('\n解決方法:'));
    console.error('  1. GitHubで新しいPersonal Access Tokenを作成:');
    console.error(chalk.gray('     https://github.com/settings/tokens'));
    console.error('  2. 環境変数を設定:');
    console.error(chalk.gray('     export GITHUB_TOKEN=your_token_here'));
    console.error('  3. 必要な権限を確認: repo, read:user');
  }

  /**
   * 権限エラーの処理
   */
  private static handlePermissionError(_error: any, context?: string): void {
    console.error(chalk.red.bold('🚫 アクセス権限エラー'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    console.error(chalk.yellow('原因:'));
    console.error('  • プライベートリポジトリへのアクセス権限が不十分');
    console.error('  • トークンのスコープが限定的');
    console.error('  • 組織のセキュリティ設定による制限');
    
    console.error(chalk.blue('\n解決方法:'));
    console.error('  1. リポジトリのアクセス権限を確認してください');
    console.error('  2. GitHub Personal Access Tokenのスコープを確認してください');
    console.error('  3. 組織管理者にアクセス許可を依頼してください');
  }

  /**
   * リソースが見つからないエラーの処理
   */
  private static handleNotFoundError(_error: any, context?: string): void {
    console.error(chalk.red.bold('🔍 リソースが見つかりません'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    console.error(chalk.yellow('原因:'));
    console.error('  • リポジトリ名が間違っている');
    console.error('  • リポジトリが削除されたまたは移動された');
    console.error('  • プライベートリポジトリでアクセス権限がない');
    
    console.error(chalk.blue('\n解決方法:'));
    console.error('  1. リポジトリ名のスペルを確認してください (owner/repo)');
    console.error('  2. GitHubでリポジトリの存在を確認してください');
    console.error('  3. プライベートリポジトリの場合はアクセス権限を確認してください');
  }

  /**
   * 一般的なエラーの処理
   */
  private static handleGenericError(error: any, context?: string): void {
    console.error(chalk.red.bold('⚠️  予期しないエラーが発生しました'));
    
    if (context) {
      console.error(chalk.gray(`コンテキスト: ${context}`));
    }
    
    console.error(chalk.red(`メッセージ: ${error.message || '不明なエラー'}`));
    
    console.error(chalk.blue('\nトラブルシューティング:'));
    console.error('  1. コマンドを再実行してみてください');
    console.error('  2. --verbose オプションで詳細ログを確認してください');
    console.error('  3. GitHubのAPI状況を確認してください: https://www.githubstatus.com/');
    console.error('  4. 問題が継続する場合はサポートにお問い合わせください');
  }

  /**
   * ソース別のトラブルシューティングアドバイス
   */
  private static provideTroubleshootingAdvice(source: string, _code: string): void {
    console.error(chalk.blue('\n💡 トラブルシューティングアドバイス:'));
    
    switch (source) {
      case 'github_api':
        console.error('  • GitHub APIレスポンスを確認してください');
        console.error('  • リクエストのパラメータを確認してください');
        break;
      case 'analyzer':
        console.error('  • データ分析の設定を確認してください');
        console.error('  • メモリ使用量が高い可能性があります');
        break;
      case 'system':
        console.error('  • システムリソースを確認してください');
        console.error('  • ファイルシステムの権限を確認してください');
        break;
    }
  }

  /**
   * デバッグ情報の表示
   */
  private static displayDebugInfo(error: any): void {
    console.error(chalk.gray('\n--- デバッグ情報 ---'));
    
    if (error.stack) {
      console.error(chalk.gray('スタックトレース:'));
      console.error(chalk.gray(error.stack));
    }
    
    if (error.response) {
      console.error(chalk.gray('HTTPレスポンス:'));
      console.error(chalk.gray(JSON.stringify(error.response.data, null, 2)));
    }
    
    if (error.config) {
      console.error(chalk.gray('リクエスト設定:'));
      console.error(chalk.gray(JSON.stringify({
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      }, null, 2)));
    }
    
    console.error(chalk.gray('--- デバッグ情報終了 ---'));
  }

  /**
   * 成功メッセージの表示
   */
  static displaySuccess(message: string, details?: string[]): void {
    console.log(chalk.green.bold(`\n✅ ${message}`));
    
    if (details && details.length > 0) {
      details.forEach(detail => {
        console.log(chalk.gray(`  • ${detail}`));
      });
    }
  }

  /**
   * 警告メッセージの表示
   */
  static displayWarning(message: string, suggestions?: string[]): void {
    console.log(chalk.yellow.bold(`\n⚠️  ${message}`));
    
    if (suggestions && suggestions.length > 0) {
      console.log(chalk.blue('推奨される対応:'));
      suggestions.forEach(suggestion => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
    }
  }

  /**
   * 情報メッセージの表示
   */
  static displayInfo(message: string, additionalInfo?: string[]): void {
    console.log(chalk.blue(`\n📊 ${message}`));
    
    if (additionalInfo && additionalInfo.length > 0) {
      additionalInfo.forEach(info => {
        console.log(chalk.gray(`  ${info}`));
      });
    }
  }
}