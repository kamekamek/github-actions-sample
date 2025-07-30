/**
 * Claude Agent Monitor - メインエントリーポイント
 * エージェント活動追跡システムの統合インターフェース
 * セキュリティファーストで高性能なエージェント監視を提供
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
// @ts-ignore - cli-table3の型定義が利用できない場合
import dayjs from 'dayjs';

// 中核システムコンポーネント
import { AgentTracker, AgentTrackerFactory } from './tracker/agent-tracker.js';
import { SessionAnalyzer } from './analytics/session-analyzer.js';
import { DataManager } from './storage/data-manager.js';
import { ClaudeLogParser } from './parser/log-parser.js';

// 型定義
import {
  CLIOptions,
  FilterCriteria,
  AgentType
} from './types/index.js';

/**
 * Claude Agent Monitor CLI アプリケーション
 */
class ClaudeAgentMonitor {
  private dataManager: DataManager;
  private agentTracker: AgentTracker | null = null;
  private sessionAnalyzer: SessionAnalyzer;
  private logParser: ClaudeLogParser;
  
  constructor(options: CLIOptions) {
    const logDirectory = options.logPath || process.cwd();
    
    // セキュリティファーストでコンポーネントを初期化
    this.dataManager = new DataManager({
      baseDirectory: `${logDirectory}/.agent-monitor-data`,
      compression: true,
      encryption: false, // 本番環境では有効化を検討
      retentionDays: 30
    });
    
    this.sessionAnalyzer = new SessionAnalyzer(this.dataManager);
    this.logParser = new ClaudeLogParser(logDirectory);
  }

  /**
   * リアルタイム監視を開始
   */
  async startMonitoring(options: CLIOptions): Promise<void> {
    const spinner = ora('エージェント追跡システムを初期化中...').start();
    
    try {
      // データマネージャーを初期化
      await this.dataManager.initialize();
      
      // エージェントトラッカーを作成
      this.agentTracker = AgentTrackerFactory.create(
        options.logPath || process.cwd(),
        this.dataManager,
        {
          enableRealTimeMetrics: true,
          enableSecurity: true,
          logLevel: options.verbose ? 'debug' : 'info'
        }
      );
      
      // トラッキングを開始
      await this.agentTracker.startTracking();
      
      spinner.succeed('エージェント追跡システムが開始されました');
      
      // イベントリスナーを設定
      this.setupEventListeners();
      
      // ライブダッシュボードを表示
      if (options.live) {
        await this.startLiveDashboard();
      } else {
        console.log(chalk.green('\n監視中... Ctrl+C で終了'));
        
        // 終了処理を設定
        process.on('SIGINT', async () => {
          await this.shutdown();
          process.exit(0);
        });
      }
      
    } catch (error) {
      spinner.fail(`監視開始エラー: ${error}`);
      throw error;
    }
  }

  /**
   * 分析レポートを生成
   */
  async generateReport(options: CLIOptions): Promise<void> {
    const spinner = ora('セッションデータを分析中...').start();
    
    try {
      await this.dataManager.initialize();
      
      // フィルター条件を構築
      const filters = this.buildFilters(options);
      
      // 分析を実行
      const analysisResult = await this.sessionAnalyzer.analyzeSessionData(filters);
      
      spinner.succeed('分析完了');
      
      // 結果を表示
      this.displayAnalysisResult(analysisResult, options);
      
    } catch (error) {
      spinner.fail(`分析エラー: ${error}`);
      throw error;
    }
  }

  /**
   * エージェント比較レポートを生成
   */
  async compareAgents(agentIds: string[], options: CLIOptions): Promise<void> {
    const spinner = ora('エージェント比較分析中...').start();
    
    try {
      await this.dataManager.initialize();
      
      const timeRange = this.parseTimeRange(options.timeRange);
      const comparison = await this.sessionAnalyzer.compareAgents(agentIds, timeRange);
      
      spinner.succeed('比較分析完了');
      
      // 比較結果を表示
      this.displayAgentComparison(comparison, options);
      
    } catch (error) {
      spinner.fail(`比較分析エラー: ${error}`);
      throw error;
    }
  }

  /**
   * セッション履歴を表示
   */
  async listSessions(options: CLIOptions): Promise<void> {
    const spinner = ora('セッション履歴を取得中...').start();
    
    try {
      await this.dataManager.initialize();
      
      const filters = this.buildFilters(options);
      const sessions = await this.dataManager.getSessions(filters);
      
      spinner.succeed(`${sessions.length}件のセッションを取得`);
      
      // セッション一覧を表示
      this.displaySessionList(sessions, options);
      
    } catch (error) {
      spinner.fail(`セッション取得エラー: ${error}`);
      throw error;
    }
  }

  /**
   * システム統計を表示
   */
  async showStats(): Promise<void> {
    const spinner = ora('システム統計を取得中...').start();
    
    try {
      await this.dataManager.initialize();
      
      const storageMetrics = this.dataManager.getStorageMetrics();
      
      // トラッカーが動作中の場合はトラッキング統計も取得
      let trackingStatus: any = null;
      let performanceMetrics: any = null;
      
      if (this.agentTracker) {
        trackingStatus = this.agentTracker.getTrackingStatus();
        performanceMetrics = this.agentTracker.getPerformanceMetrics();
      }
      
      spinner.succeed('統計取得完了');
      
      // 統計を表示
      this.displaySystemStats(storageMetrics, trackingStatus, performanceMetrics);
      
    } catch (error) {
      spinner.fail(`統計取得エラー: ${error}`);
      throw error;
    }
  }

  /**
   * システムをシャットダウン
   */
  async shutdown(): Promise<void> {
    console.log(chalk.yellow('\nシステムをシャットダウン中...'));
    
    if (this.agentTracker) {
      await this.agentTracker.stopTracking();
      AgentTrackerFactory.destroy();
    }
    
    await this.dataManager.shutdown();
    
    console.log(chalk.green('シャットダウン完了'));
  }

  // プライベートメソッド

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    if (!this.agentTracker) return;
    
    this.agentTracker.on('agent.activity.start', (activity) => {
      if (process.env.VERBOSE) {
        console.log(chalk.cyan(`🚀 ${activity.agentId}: タスク開始 - ${activity.taskId}`));
      }
    });
    
    this.agentTracker.on('agent.activity.complete', (activity) => {
      const status = activity.success ? '✅' : '❌';
      const duration = activity.duration ? `(${activity.duration}s)` : '';
      
      if (process.env.VERBOSE) {
        console.log(chalk.green(`${status} ${activity.agentId}: タスク完了 - ${activity.taskId} ${duration}`));
      }
    });
    
    this.agentTracker.on('session.start', (session) => {
      console.log(chalk.blue(`📊 新しいセッションを開始: ${session.sessionId}`));
    });
    
    this.agentTracker.on('session.end', (session) => {
      const duration = session.duration ? `(${session.duration}s)` : '';
      console.log(chalk.blue(`📊 セッション終了: ${session.sessionId} ${duration}`));
    });
    
    this.agentTracker.on('performance.warning', (metric) => {
      console.log(chalk.yellow(`⚠️  パフォーマンス警告: ${metric.context} - ${metric.value} > ${metric.threshold}`));
    });
    
    this.agentTracker.on('error', (error) => {
      console.error(chalk.red(`❌ エラー: ${error.message}`));
    });
  }

  /**
   * ライブダッシュボードを開始
   */
  private async startLiveDashboard(): Promise<void> {
    console.clear();
    console.log(chalk.blue('🎯 Claude Agent Monitor - ライブダッシュボード\n'));
    
    const updateInterval = setInterval(async () => {
      try {
        if (!this.agentTracker) return;
        
        const status = this.agentTracker.getTrackingStatus();
        const metrics = this.agentTracker.getPerformanceMetrics();
        
        // 画面をクリア
        process.stdout.write('\x1b[H\x1b[2J');
        
        // ヘッダー
        console.log(chalk.blue('🎯 Claude Agent Monitor - ライブダッシュボード'));
        console.log(chalk.gray(`更新時刻: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n`));
        
        // ステータステーブル
        const statusTable = new Table({
          head: ['項目', '値'],
          style: { head: ['cyan'] }
        });
        
        statusTable.push(
          ['追跡状態', status.isTracking ? chalk.green('監視中') : chalk.red('停止中')],
          ['アクティブセッション', status.activeSessions.toString()],
          ['実行中タスク', status.totalActivities.toString()],
          ['メモリ使用量', `${status.memoryUsage} MB`],
          ['稼働時間', `${Math.floor(status.uptime / 60)} 分`]
        );
        
        console.log(statusTable.toString());
        
        // パフォーマンスメトリクス
        if (Object.keys(metrics).length > 0) {
          console.log('\n' + chalk.yellow('📊 パフォーマンスメトリクス'));
          
          const metricsTable = new Table({
            head: ['メトリクス', '平均', '最大', '回数'],
            style: { head: ['yellow'] }
          });
          
          for (const [key, data] of Object.entries(metrics)) {
            metricsTable.push([
              key,
              `${data.avg}ms`,
              `${data.max}ms`,
              data.count.toString()
            ]);
          }
          
          console.log(metricsTable.toString());
        }
        
        console.log('\n' + chalk.gray('Ctrl+C で終了'));
        
      } catch (error) {
        console.error(chalk.red(`ダッシュボード更新エラー: ${error}`));
      }
    }, 5000); // 5秒間隔で更新
    
    // 終了処理
    process.on('SIGINT', () => {
      clearInterval(updateInterval);
      this.shutdown().then(() => process.exit(0));
    });
  }

  /**
   * フィルター条件を構築
   */
  private buildFilters(options: CLIOptions): FilterCriteria | undefined {
    const filters: FilterCriteria = {};
    
    if (options.agent) {
      filters.agents = [options.agent];
    }
    
    if (options.timeRange) {
      filters.timeRange = this.parseTimeRange(options.timeRange);
    }
    
    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  /**
   * 時間範囲を解析
   */
  private parseTimeRange(timeRange?: string): { start: Date; end: Date } | undefined {
    if (!timeRange) return undefined;
    
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        return {
          start: new Date(now.getTime() - 60 * 60 * 1000),
          end: now
        };
      case '24h':
      case '1d':
        return {
          start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          end: now
        };
      case '7d':
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        };
      case '30d':
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now
        };
      default:
        // ISO形式の日付範囲 (2024-01-01~2024-01-31)
        const [startStr, endStr] = timeRange.split('~');
        if (startStr && endStr) {
          return {
            start: new Date(startStr),
            end: new Date(endStr)
          };
        }
        return undefined;
    }
  }

  /**
   * 分析結果を表示
   */
  private displayAnalysisResult(result: any, options: CLIOptions): void {
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    
    console.log(chalk.blue('\n📊 分析レポート\n'));
    
    // セッションサマリー
    const summaryTable = new Table({
      head: ['項目', '値'],
      style: { head: ['blue'] }
    });
    
    const summary = result.sessionSummary;
    summaryTable.push(
      ['総セッション数', summary.totalSessions.toString()],
      ['平均セッション時間', `${summary.averageSessionDuration}秒`],
      ['総タスク数', summary.totalTasks.toString()],
      ['成功率', `${(summary.successRate * 100).toFixed(1)}%`],
      ['最もアクティブなエージェント', summary.mostActiveAgent]
    );
    
    console.log(summaryTable.toString());
    
    // エージェントパフォーマンス
    if (result.agentPerformance.length > 0) {
      console.log('\n' + chalk.yellow('👥 エージェントパフォーマンス'));
      
      const perfTable = new Table({
        head: ['エージェント', 'タスク数', '成功率', '平均時間', '効率スコア'],
        style: { head: ['yellow'] }
      });
      
      for (const agent of result.agentPerformance.slice(0, 10)) {
        perfTable.push([
          agent.agentId,
          agent.tasksCompleted.toString(),
          `${(agent.successRate * 100).toFixed(1)}%`,
          `${agent.averageTaskDuration}s`,
          agent.efficiency.toString()
        ]);
      }
      
      console.log(perfTable.toString());
    }
    
    // インサイト
    if (result.insights.length > 0) {
      console.log('\n' + chalk.magenta('💡 インサイト'));
      
      for (const insight of result.insights.slice(0, 5)) {
        const icon = insight.severity === 'critical' ? '🚨' : 
                     insight.severity === 'warning' ? '⚠️' : '💡';
        
        console.log(`\n${icon} ${chalk.bold(insight.title)}`);
        console.log(`   ${insight.description}`);
        
        if (insight.recommendations.length > 0) {
          console.log('   推奨事項:');
          for (const rec of insight.recommendations) {
            console.log(`   • ${rec}`);
          }
        }
      }
    }
    
    // 推奨事項
    if (result.recommendations.length > 0) {
      console.log('\n' + chalk.green('📋 推奨事項'));
      
      for (let i = 0; i < result.recommendations.length; i++) {
        console.log(`${i + 1}. ${result.recommendations[i]}`);
      }
    }
  }

  /**
   * エージェント比較結果を表示
   */
  private displayAgentComparison(comparison: any, options: CLIOptions): void {
    if (options.format === 'json') {
      console.log(JSON.stringify(comparison, null, 2));
      return;
    }
    
    console.log(chalk.blue('\n🏆 エージェント比較レポート\n'));
    
    // ランキング表示
    for (const ranking of comparison.rankings) {
      console.log(chalk.yellow(`📊 ${ranking.metric.replace('_', ' ').toUpperCase()} ランキング`));
      
      const rankTable = new Table({
        head: ['順位', 'エージェント', '値'],
        style: { head: ['yellow'] }
      });
      
      ranking.ranking.slice(0, 5).forEach((item: any, index: number) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        rankTable.push([
          medal,
          item.agentId,
          item.value.toString()
        ]);
      });
      
      console.log(rankTable.toString() + '\n');
    }
  }

  /**
   * セッション一覧を表示
   */
  private displaySessionList(sessions: any[], options: CLIOptions): void {
    if (options.format === 'json') {
      console.log(JSON.stringify(sessions, null, 2));
      return;
    }
    
    console.log(chalk.blue('\n📋 セッション履歴\n'));
    
    const sessionTable = new Table({
      head: ['セッションID', '開始時刻', '期間', 'タスク数', '完了数', '成功率'],
      style: { head: ['blue'] }
    });
    
    for (const session of sessions.slice(0, 20)) {
      const successRate = session.totalTasks > 0 ? 
        ((session.completedTasks / session.totalTasks) * 100).toFixed(1) + '%' : 'N/A';
      
      sessionTable.push([
        session.sessionId.substring(0, 20) + '...',
        dayjs(session.startTime).format('MM-DD HH:mm'),
        session.duration ? `${session.duration}s` : 'N/A',
        session.totalTasks.toString(),
        session.completedTasks.toString(),
        successRate
      ]);
    }
    
    console.log(sessionTable.toString());
  }

  /**
   * システム統計を表示
   */
  private displaySystemStats(
    storageMetrics: any,
    trackingStatus: any,
    performanceMetrics: any
  ): void {
    console.log(chalk.blue('\n📈 システム統計\n'));
    
    // ストレージ統計
    const storageTable = new Table({
      head: ['ストレージ統計', '値'],
      style: { head: ['blue'] }
    });
    
    storageTable.push(
      ['総ファイル数', storageMetrics.totalFiles.toString()],
      ['総データサイズ', this.formatBytes(storageMetrics.totalSize)],
      ['平均ファイルサイズ', this.formatBytes(storageMetrics.averageFileSize)],
      ['読み取り操作数', storageMetrics.readOperations.toString()],
      ['書き込み操作数', storageMetrics.writeOperations.toString()],
      ['最終クリーンアップ', dayjs(storageMetrics.lastCleanup).format('YYYY-MM-DD HH:mm')]
    );
    
    console.log(storageTable.toString());
    
    // トラッキング統計（実行中の場合）
    if (trackingStatus) {
      console.log('\n' + chalk.yellow('🎯 トラッキング統計'));
      
      const trackingTable = new Table({
        head: ['項目', '値'],
        style: { head: ['yellow'] }
      });
      
      trackingTable.push(
        ['追跡状態', trackingStatus.isTracking ? '監視中' : '停止中'],
        ['アクティブセッション', trackingStatus.activeSessions.toString()],
        ['実行中タスク', trackingStatus.totalActivities.toString()],
        ['メモリ使用量', `${trackingStatus.memoryUsage} MB`],
        ['稼働時間', `${Math.floor(trackingStatus.uptime / 60)} 分`]
      );
      
      console.log(trackingTable.toString());
    }
    
    // パフォーマンスメトリクス（利用可能な場合）
    if (performanceMetrics && Object.keys(performanceMetrics).length > 0) {
      console.log('\n' + chalk.magenta('⚡ パフォーマンスメトリクス'));
      
      const perfTable = new Table({
        head: ['メトリクス', '平均', '最大', '回数'],
        style: { head: ['magenta'] }
      });
      
      for (const [key, data] of Object.entries(performanceMetrics)) {
        perfTable.push([
          key,
          `${(data as any).avg}ms`,
          `${(data as any).max}ms`,
          (data as any).count.toString()
        ]);
      }
      
      console.log(perfTable.toString());
    }
  }

  /**
   * バイト数をフォーマット
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * CLI コマンドを設定
 */
function setupCLI(): void {
  const program = new Command();
  
  program
    .name('claude-monitor')
    .description('Claude Code エージェント活動監視・分析システム')
    .version('1.0.0');
  
  // 監視開始コマンド
  program
    .command('start')
    .description('リアルタイム監視を開始')
    .option('-p, --log-path <path>', 'ログディレクトリのパス', process.cwd())
    .option('-l, --live', 'ライブダッシュボードを表示')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async (options: CLIOptions) => {
      try {
        const monitor = new ClaudeAgentMonitor(options);
        await monitor.startMonitoring(options);
      } catch (error) {
        console.error(chalk.red(`❌ 監視開始エラー: ${error}`));
        process.exit(1);
      }
    });
  
  // 分析コマンド
  program
    .command('analyze')
    .description('セッションデータを分析')
    .option('-p, --log-path <path>', 'ログディレクトリのパス', process.cwd())
    .option('-a, --agent <agent>', '特定のエージェントのみ分析')
    .option('-t, --time-range <range>', '時間範囲 (1h, 24h, 7d, 30d, YYYY-MM-DD~YYYY-MM-DD)')
    .option('-f, --format <format>', '出力形式 (table, json)', 'table')
    .option('-o, --output <file>', '出力ファイルパス')
    .action(async (options: CLIOptions) => {
      try {
        const monitor = new ClaudeAgentMonitor(options);
        await monitor.generateReport(options);
      } catch (error) {
        console.error(chalk.red(`❌ 分析エラー: ${error}`));
        process.exit(1);
      }
    });
  
  // エージェント比較コマンド
  program
    .command('compare <agents...>')
    .description('エージェント間のパフォーマンスを比較')
    .option('-p, --log-path <path>', 'ログディレクトリのパス', process.cwd())
    .option('-t, --time-range <range>', '時間範囲 (1h, 24h, 7d, 30d, YYYY-MM-DD~YYYY-MM-DD)')
    .option('-f, --format <format>', '出力形式 (table, json)', 'table')
    .action(async (agents: string[], options: CLIOptions) => {
      try {
        const monitor = new ClaudeAgentMonitor(options);
        await monitor.compareAgents(agents, options);
      } catch (error) {
        console.error(chalk.red(`❌ 比較分析エラー: ${error}`));
        process.exit(1);
      }
    });
  
  // セッション一覧コマンド
  program
    .command('list')
    .description('セッション履歴を表示')
    .option('-p, --log-path <path>', 'ログディレクトリのパス', process.cwd())
    .option('-a, --agent <agent>', '特定のエージェントのセッション')
    .option('-t, --time-range <range>', '時間範囲 (1h, 24h, 7d, 30d, YYYY-MM-DD~YYYY-MM-DD)')
    .option('-f, --format <format>', '出力形式 (table, json)', 'table')
    .action(async (options: CLIOptions) => {
      try {
        const monitor = new ClaudeAgentMonitor(options);
        await monitor.listSessions(options);
      } catch (error) {
        console.error(chalk.red(`❌ セッション取得エラー: ${error}`));
        process.exit(1);
      }
    });
  
  // 統計コマンド
  program
    .command('stats')
    .description('システム統計を表示')
    .option('-p, --log-path <path>', 'ログディレクトリのパス', process.cwd())
    .action(async (options: CLIOptions) => {
      try {
        const monitor = new ClaudeAgentMonitor(options);
        await monitor.showStats();
      } catch (error) {
        console.error(chalk.red(`❌ 統計取得エラー: ${error}`));
        process.exit(1);
      }
    });
  
  // バージョン情報
  program
    .command('version')
    .description('バージョン情報を表示')
    .action(() => {
      console.log(chalk.blue('Claude Agent Monitor v1.0.0'));
      console.log(chalk.gray('Claude Code エージェント活動監視・分析システム'));
      console.log(chalk.gray('Developed by AI Virtual Corporation'));
    });
  
  program.parse();
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCLI();
}

export { ClaudeAgentMonitor, setupCLI };
export * from './tracker/agent-tracker.js';
export * from './analytics/session-analyzer.js';
export * from './storage/data-manager.js';
export * from './parser/log-parser.js';
export * from './types/index.js';