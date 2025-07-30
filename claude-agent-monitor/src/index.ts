/**
 * Claude Agent Monitor - メインエントリーポイント
 * エージェント活動追跡システムの統合インターフェース
 * セキュリティファーストで高性能なエージェント監視を提供
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import os from 'os';
import path from 'path';
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
    const workingDirectory = options.logPath || process.cwd();
    
    // セキュリティファーストでコンポーネントを初期化
    this.dataManager = new DataManager({
      baseDirectory: `${workingDirectory}/.agent-monitor-data`,
      compression: true,
      encryption: false, // 本番環境では有効化を検討
      retentionDays: 30
    });
    
    this.sessionAnalyzer = new SessionAnalyzer(this.dataManager);
    
    // Support environment variable for Claude projects directory
    let claudeProjectsDir = process.env.CLAUDE_PROJECTS_DIR;
    
    // Expand tilde (~) to home directory if present
    if (claudeProjectsDir && claudeProjectsDir.startsWith('~/')) {
      claudeProjectsDir = claudeProjectsDir.replace('~', os.homedir());
    }
    
    this.logParser = new ClaudeLogParser(claudeProjectsDir);
  }

  /**
   * リアルタイム監視を開始
   */
  async startMonitoring(options: CLIOptions): Promise<void> {
    const spinner = ora('エージェント追跡システムを初期化中...').start();
    
    try {
      // データマネージャーを初期化
      await this.dataManager.initialize();
      
      // Claude projects directory for monitoring
      let claudeProjectsDir = process.env.CLAUDE_PROJECTS_DIR;
      if (claudeProjectsDir && claudeProjectsDir.startsWith('~/')) {
        claudeProjectsDir = claudeProjectsDir.replace('~', os.homedir());
      }
      if (!claudeProjectsDir) {
        claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
      }
      
      // エージェントトラッカーを作成
      this.agentTracker = AgentTrackerFactory.create(
        claudeProjectsDir,
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
      
      // Claude Codeログからセッションデータを取得
      const sessions = await this.logParser.parseSessionLogs();
      spinner.text = `${sessions.length}件のセッションを解析中...`;
      
      // セッションデータをDataManagerに保存
      for (const session of sessions) {
        await this.dataManager.saveSession(session);
      }
      
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
      
      // Claude Codeログからセッションデータを取得
      const sessions = await this.logParser.parseSessionLogs();
      
      // セッションデータをDataManagerに保存
      for (const session of sessions) {
        await this.dataManager.saveSession(session);
      }
      
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
      // Claude Codeログから直接セッションデータを取得
      const sessions = await this.logParser.parseSessionLogs();
      
      // フィルター適用
      const filters = this.buildFilters(options);
      let filteredSessions = sessions;
      
      if (filters?.agents) {
        filteredSessions = sessions.filter(s => 
          s.agents.some(a => filters.agents!.includes(a.agentType))
        );
      }
      
      if (filters?.timeRange) {
        filteredSessions = filteredSessions.filter(s => 
          s.startTime >= filters.timeRange!.start && s.startTime <= filters.timeRange!.end
        );
      }
      
      spinner.succeed(`${filteredSessions.length}件のセッションを取得`);
      
      // セッション一覧を表示
      this.displaySessionList(filteredSessions, options);
      
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
      
      // Claude Codeログから統計データを取得
      const sessions = await this.logParser.parseSessionLogs();
      spinner.text = `${sessions.length}件のセッションを分析中...`;
      
      const storageMetrics = this.dataManager.getStorageMetrics();
      
      // セッション統計を計算
      const sessionsWithAgents = sessions.filter(s => s.agents.length > 0);
      const totalAgentActivities = sessions.reduce((sum, s) => sum + s.agents.length, 0);
      const agentTypes = new Set(sessions.flatMap(s => s.agents.map(a => a.agentType)));
      
      // トラッカーが動作中の場合はトラッキング統計も取得
      let trackingStatus: any = null;
      let performanceMetrics: any = null;
      
      if (this.agentTracker) {
        trackingStatus = this.agentTracker.getTrackingStatus();
        performanceMetrics = this.agentTracker.getPerformanceMetrics();
      }
      
      spinner.succeed('統計取得完了');
      
      // 統計を表示（セッション統計も含む）
      this.displaySystemStats(storageMetrics, trackingStatus, performanceMetrics, {
        totalSessions: sessions.length,
        sessionsWithAgents: sessionsWithAgents.length,
        totalAgentActivities,
        uniqueAgentTypes: agentTypes.size,
        agentTypes: Array.from(agentTypes)
      });
      
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
    performanceMetrics: any,
    sessionStats?: any
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
    
    // セッション統計（利用可能な場合）
    if (sessionStats) {
      console.log('\n' + chalk.green('📊 セッション統計'));
      
      const sessionTable = new Table({
        head: ['項目', '値'],
        style: { head: ['green'] }
      });
      
      sessionTable.push(
        ['総セッション数', sessionStats.totalSessions.toString()],
        ['エージェント活動セッション', sessionStats.sessionsWithAgents.toString()],
        ['総エージェント活動数', sessionStats.totalAgentActivities.toString()],
        ['エージェント種類', sessionStats.uniqueAgentTypes.toString()],
        ['利用エージェント', sessionStats.agentTypes.slice(0, 5).join(', ') + (sessionStats.agentTypes.length > 5 ? '...' : '')]
      );
      
      console.log(sessionTable.toString());
    }
    
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