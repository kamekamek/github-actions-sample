#!/usr/bin/env node
/**
 * Claude Agent Monitor CLI Entry Point
 * Claude Codeエージェント監視ツールのエントリーポイント
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ClaudeLogParser } from '../dist/parser/log-parser.js';
import { AgentTracker } from '../dist/tracker/agent-tracker.js';
import { SessionAnalyzer } from '../dist/analytics/session-analyzer.js';
import { DataManager } from '../dist/storage/data-manager.js';
import { Dashboard } from '../dist/ui/dashboard.js';
import { Charts } from '../dist/ui/charts.js';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パッケージ情報を読み込み
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('claude-monitor')
  .description('Claude Code エージェント活動ログ管理・分析CLI')
  .version(packageJson.version);

// startコマンド：リアルタイム監視開始
program
  .command('start')
  .description('エージェント活動のリアルタイム監視を開始')
  .option('-d, --directory <path>', 'プロジェクトディレクトリ', process.cwd())
  .option('-l, --live', 'ライブダッシュボードを表示')
  .option('-s, --storage <path>', 'データ保存先ディレクトリ', './claude-monitor-data')
  .action(async (options) => {
    const spinner = ora('監視を開始しています...').start();
    
    try {
      // コンポーネントの初期化
      const parser = new ClaudeLogParser(options.directory);
      const dataManager = new DataManager(options.storage);
      const tracker = new AgentTracker({
        enableMetrics: true,
        bufferSize: 100,
        flushInterval: 5000
      });
      const analyzer = new SessionAnalyzer();
      
      // 既存のログを解析
      spinner.text = '既存のログを解析中...';
      const sessions = await parser.parseSessionLogs();
      
      for (const session of sessions) {
        await dataManager.saveSession(session);
        for (const activity of session.agents) {
          tracker.trackActivity(activity);
        }
      }
      
      spinner.succeed(`${sessions.length}個のセッションを読み込みました`);
      
      // ライブダッシュボード
      if (options.live) {
        const dashboard = new Dashboard();
        
        dashboard.start(async () => {
          const activeSessions = tracker.getActiveSessions();
          const recentActivities = tracker.getRecentActivities(10);
          const metrics = tracker.getMetrics();
          const agents = analyzer.analyzeAgentPerformance(sessions);
          const summary = analyzer.generateSessionSummary(sessions);
          
          return {
            summary,
            agents,
            recentActivities,
            metrics,
            activeSessions
          };
        });
        
        // 監視を開始
        parser.startWatching(async (session) => {
          await dataManager.saveSession(session);
          for (const activity of session.agents) {
            tracker.trackActivity(activity);
          }
        });
      } else {
        console.log(chalk.green('✓ 監視を開始しました'));
        console.log(chalk.gray('ライブダッシュボードを表示するには --live オプションを使用してください'));
        
        // バックグラウンドで監視
        parser.startWatching(async (session) => {
          await dataManager.saveSession(session);
          console.log(chalk.blue(`新しいセッションを検出: ${session.sessionId}`));
        });
      }
      
    } catch (error) {
      spinner.fail('監視の開始に失敗しました');
      console.error(error);
      process.exit(1);
    }
  });

// analyzeコマンド：セッション分析
program
  .command('analyze')
  .description('保存されたセッションデータを分析')
  .option('-s, --storage <path>', 'データ保存先ディレクトリ', './claude-monitor-data')
  .option('-t, --time-range <range>', '分析期間 (例: 24h, 7d, 30d)', '7d')
  .option('-a, --agent <type>', '特定のエージェントのみ分析')
  .option('-f, --format <type>', '出力形式 (table|json|chart)', 'table')
  .action(async (options) => {
    const spinner = ora('データを分析中...').start();
    
    try {
      const dataManager = new DataManager(options.storage);
      const analyzer = new SessionAnalyzer();
      
      // 時間範囲を解析
      const now = new Date();
      const rangeMatch = options.timeRange.match(/(\d+)([hd])/);
      if (!rangeMatch) {
        throw new Error('無効な時間範囲形式です');
      }
      
      const amount = parseInt(rangeMatch[1]);
      const unit = rangeMatch[2];
      const start = new Date(now);
      
      if (unit === 'h') {
        start.setHours(start.getHours() - amount);
      } else if (unit === 'd') {
        start.setDate(start.getDate() - amount);
      }
      
      // セッションを読み込み
      const sessions = await dataManager.getSessions({
        timeRange: { start, end: now },
        agents: options.agent ? [options.agent] : undefined
      });
      
      spinner.succeed(`${sessions.length}個のセッションを分析しました`);
      
      // 分析結果を生成
      const summary = analyzer.generateSessionSummary(sessions);
      const agents = analyzer.analyzeAgentPerformance(sessions);
      const trends = analyzer.analyzeTrends(sessions);
      const insights = analyzer.generateInsights(sessions);
      
      // 出力形式に応じて表示
      if (options.format === 'chart') {
        console.log('\n' + Charts.createEfficiencyChart(agents));
        console.log('\n' + Charts.createTaskCompletionChart(agents));
        console.log('\n' + Charts.createTokenUsageChart(agents));
        console.log('\n' + Charts.createToolUsageChart(summary.toolUsageStats));
      } else if (options.format === 'json') {
        console.log(JSON.stringify({
          summary,
          agents,
          trends,
          insights
        }, null, 2));
      } else {
        // テーブル形式で表示
        console.log(chalk.bold('\n📊 Session Summary'));
        console.log(`Total Sessions: ${summary.totalSessions}`);
        console.log(`Average Duration: ${Math.round(summary.averageSessionDuration / 60)}分`);
        console.log(`Total Tasks: ${summary.totalTasks}`);
        console.log(`Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
        console.log(`Most Active Agent: ${summary.mostActiveAgent}`);
        
        console.log(chalk.bold('\n🤖 Agent Performance'));
        agents.forEach(agent => {
          console.log(`\n${chalk.cyan(agent.agentType)}`);
          console.log(`  Tasks: ${agent.tasksCompleted}`);
          console.log(`  Success Rate: ${(agent.successRate * 100).toFixed(1)}%`);
          console.log(`  Efficiency: ${agent.efficiency}%`);
          console.log(`  Tokens: ${agent.tokenUsage.total.toLocaleString()}`);
        });
        
        if (insights.length > 0) {
          console.log(chalk.bold('\n💡 Insights'));
          insights.forEach(insight => {
            const icon = insight.severity === 'critical' ? '🔴' :
                        insight.severity === 'warning' ? '🟡' : '🟢';
            console.log(`${icon} ${insight.title}`);
            console.log(`   ${chalk.gray(insight.description)}`);
          });
        }
      }
      
    } catch (error) {
      spinner.fail('分析に失敗しました');
      console.error(error);
      process.exit(1);
    }
  });

// compareコマンド：エージェント比較
program
  .command('compare <agent1> <agent2>')
  .description('2つのエージェントのパフォーマンスを比較')
  .option('-s, --storage <path>', 'データ保存先ディレクトリ', './claude-monitor-data')
  .option('-t, --time-range <range>', '比較期間 (例: 24h, 7d, 30d)', '7d')
  .action(async (agent1, agent2, options) => {
    const spinner = ora('データを比較中...').start();
    
    try {
      const dataManager = new DataManager(options.storage);
      const analyzer = new SessionAnalyzer();
      
      // セッションを読み込み
      const sessions = await dataManager.getSessions();
      const agents = analyzer.compareAgents(sessions, agent1, agent2);
      
      if (!agents) {
        spinner.fail('指定されたエージェントのデータが見つかりません');
        return;
      }
      
      spinner.succeed('比較が完了しました');
      
      // 比較チャートを表示
      console.log('\n' + Charts.createComparisonChart(agents.agent1, agents.agent2));
      
    } catch (error) {
      spinner.fail('比較に失敗しました');
      console.error(error);
      process.exit(1);
    }
  });

// historyコマンド：セッション履歴
program
  .command('history')
  .description('セッション履歴を表示')
  .option('-s, --storage <path>', 'データ保存先ディレクトリ', './claude-monitor-data')
  .option('-l, --limit <number>', '表示件数', '10')
  .action(async (options) => {
    try {
      const dataManager = new DataManager(options.storage);
      const sessions = await dataManager.getSessions();
      
      const limit = parseInt(options.limit);
      const recentSessions = sessions.slice(-limit).reverse();
      
      console.log(chalk.bold('\n📜 Session History\n'));
      
      recentSessions.forEach(session => {
        const duration = session.duration ? Math.round(session.duration / 60) : 0;
        const status = session.completedTasks === session.totalTasks ? 
                      chalk.green('✓') : chalk.yellow('⟳');
        
        console.log(`${status} ${chalk.cyan(session.sessionId)}`);
        console.log(`   Time: ${new Date(session.startTime).toLocaleString()}`);
        console.log(`   Duration: ${duration}分`);
        console.log(`   Tasks: ${session.completedTasks}/${session.totalTasks}`);
        console.log(`   Directory: ${session.workingDirectory}`);
        console.log('');
      });
      
    } catch (error) {
      console.error(chalk.red('履歴の取得に失敗しました:'), error);
      process.exit(1);
    }
  });

// statsコマンド：システム統計
program
  .command('stats')
  .description('システム統計を表示')
  .option('-s, --storage <path>', 'データ保存先ディレクトリ', './claude-monitor-data')
  .action(async (options) => {
    try {
      const dataManager = new DataManager(options.storage);
      const stats = await dataManager.getStorageStats();
      
      console.log(chalk.bold('\n📈 System Statistics\n'));
      console.log(`Total Sessions: ${stats.totalSessions}`);
      console.log(`Storage Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Oldest Data: ${new Date(stats.oldestSession).toLocaleDateString()}`);
      console.log(`Newest Data: ${new Date(stats.newestSession).toLocaleDateString()}`);
      
      if (stats.agentStats && stats.agentStats.length > 0) {
        console.log(chalk.bold('\n🤖 Agent Activity\n'));
        stats.agentStats.forEach(agent => {
          console.log(`${agent.agentType}: ${agent.sessionCount} sessions`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('統計の取得に失敗しました:'), error);
      process.exit(1);
    }
  });

// cleanコマンド：古いデータのクリーンアップ
program
  .command('clean')
  .description('古いデータをクリーンアップ')
  .option('-s, --storage <path>', 'データ保存先ディレクトリ', './claude-monitor-data')
  .option('-d, --days <number>', '保持日数', '30')
  .action(async (options) => {
    const spinner = ora('データをクリーンアップ中...').start();
    
    try {
      const dataManager = new DataManager(options.storage);
      const days = parseInt(options.days);
      
      const cleaned = await dataManager.cleanOldData(days);
      
      spinner.succeed(`${cleaned}個の古いセッションを削除しました`);
      
    } catch (error) {
      spinner.fail('クリーンアップに失敗しました');
      console.error(error);
      process.exit(1);
    }
  });

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('エラーが発生しました:'), error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n監視を終了しています...'));
  process.exit(0);
});

// コマンドを実行
program.parse();