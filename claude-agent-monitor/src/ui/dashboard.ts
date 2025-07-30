/**
 * Real-time Dashboard for Claude Agent Monitor
 * リアルタイムでエージェント活動を表示するCLIダッシュボード
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { AgentActivity, AgentPerformance, SessionSummary } from '../types/index.js';

export class Dashboard {
  private refreshInterval: number = 1000; // 1秒ごとに更新
  private intervalId?: NodeJS.Timeout;
  private currentView: 'overview' | 'agents' | 'timeline' = 'overview';

  /**
   * ダッシュボードを開始
   */
  start(dataCallback: () => Promise<any>): void {
    this.clearScreen();
    this.renderHeader();
    
    // 初回レンダリング
    this.render(dataCallback);
    
    // 定期的な更新
    this.intervalId = setInterval(async () => {
      await this.render(dataCallback);
    }, this.refreshInterval);

    // キー入力処理
    this.setupKeyHandlers();
  }

  /**
   * ダッシュボードを停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.clearScreen();
  }

  /**
   * 画面をクリア
   */
  private clearScreen(): void {
    console.clear();
  }

  /**
   * ヘッダーを表示
   */
  private renderHeader(): void {
    console.log(chalk.bgBlue.white.bold(' Claude Agent Monitor - Real-time Dashboard '));
    console.log(chalk.gray('Press [q] to quit, [1-3] to switch views'));
    console.log('');
  }

  /**
   * メインレンダリング
   */
  private async render(dataCallback: () => Promise<any>): Promise<void> {
    const data = await dataCallback();
    
    // カーソルを先頭に移動（画面をクリアせずに上書き）
    process.stdout.write('\x1B[3;0H'); // 3行目から開始
    
    switch (this.currentView) {
      case 'overview':
        this.renderOverview(data);
        break;
      case 'agents':
        this.renderAgentDetails(data);
        break;
      case 'timeline':
        this.renderTimeline(data);
        break;
    }
  }

  /**
   * 概要ビューを表示
   */
  private renderOverview(data: any): void {
    const { summary, agents, recentActivities } = data;
    
    // サマリー統計
    this.renderSummaryStats(summary);
    
    // エージェントパフォーマンステーブル
    this.renderAgentPerformanceTable(agents);
    
    // 最近のアクティビティ
    this.renderRecentActivities(recentActivities);
  }

  /**
   * サマリー統計を表示
   */
  private renderSummaryStats(summary: SessionSummary): void {
    console.log(chalk.yellow.bold('📊 Session Summary'));
    
    const statsTable = new Table({
      chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      style: { 'padding-left': 1, 'padding-right': 1 }
    });

    statsTable.push(
      [
        { content: chalk.cyan('Total Sessions'), hAlign: 'left' },
        { content: chalk.white.bold(summary.totalSessions.toString()), hAlign: 'right' }
      ],
      [
        { content: chalk.cyan('Average Duration'), hAlign: 'left' },
        { content: chalk.white.bold(this.formatDuration(summary.averageSessionDuration)), hAlign: 'right' }
      ],
      [
        { content: chalk.cyan('Tasks Completed'), hAlign: 'left' },
        { content: chalk.white.bold(summary.totalTasks.toString()), hAlign: 'right' }
      ],
      [
        { content: chalk.cyan('Success Rate'), hAlign: 'left' },
        { content: this.formatPercentage(summary.successRate), hAlign: 'right' }
      ],
      [
        { content: chalk.cyan('Most Active Agent'), hAlign: 'left' },
        { content: chalk.magenta.bold(summary.mostActiveAgent), hAlign: 'right' }
      ]
    );

    console.log(statsTable.toString());
    console.log('');
  }

  /**
   * エージェントパフォーマンステーブルを表示
   */
  private renderAgentPerformanceTable(agents: AgentPerformance[]): void {
    console.log(chalk.yellow.bold('🤖 Agent Performance'));
    
    const perfTable = new Table({
      head: [
        chalk.gray('Agent'),
        chalk.gray('Tasks'),
        chalk.gray('Success'),
        chalk.gray('Avg Time'),
        chalk.gray('Efficiency'),
        chalk.gray('Tokens')
      ],
      colWidths: [20, 10, 12, 12, 12, 15]
    });

    agents.forEach(agent => {
      perfTable.push([
        this.getAgentDisplayName(agent.agentType),
        agent.tasksCompleted.toString(),
        this.formatPercentage(agent.successRate),
        this.formatDuration(agent.averageTaskDuration),
        this.formatEfficiency(agent.efficiency),
        `${this.formatNumber(agent.tokenUsage.total)}`
      ]);
    });

    console.log(perfTable.toString());
    console.log('');
  }

  /**
   * 最近のアクティビティを表示
   */
  private renderRecentActivities(activities: AgentActivity[]): void {
    console.log(chalk.yellow.bold('⚡ Recent Activities'));
    
    const activityTable = new Table({
      head: [
        chalk.gray('Time'),
        chalk.gray('Agent'),
        chalk.gray('Task'),
        chalk.gray('Status'),
        chalk.gray('Duration')
      ],
      colWidths: [12, 20, 25, 12, 10]
    });

    activities.slice(0, 5).forEach(activity => {
      activityTable.push([
        this.formatTime(activity.startTime),
        this.getAgentDisplayName(activity.agentType),
        activity.taskId,
        this.formatStatus(activity.status),
        activity.duration ? this.formatDuration(activity.duration) : '-'
      ]);
    });

    console.log(activityTable.toString());
  }

  /**
   * エージェント詳細ビュー
   */
  private renderAgentDetails(data: any): void {
    console.log(chalk.yellow.bold('🔍 Agent Details View'));
    
    const { agents } = data;
    
    agents.forEach((agent: AgentPerformance) => {
      console.log('');
      console.log(chalk.cyan.bold(`▶ ${this.getAgentDisplayName(agent.agentType)}`));
      
      const detailTable = new Table({
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
      });

      detailTable.push(
        ['Tasks Completed', agent.tasksCompleted],
        ['Success Rate', this.formatPercentage(agent.successRate)],
        ['Average Duration', this.formatDuration(agent.averageTaskDuration)],
        ['Efficiency Score', this.formatEfficiency(agent.efficiency)],
        ['Input Tokens', this.formatNumber(agent.tokenUsage.input)],
        ['Output Tokens', this.formatNumber(agent.tokenUsage.output)]
      );

      console.log(detailTable.toString());
    });
  }

  /**
   * タイムラインビュー
   */
  private renderTimeline(data: any): void {
    console.log(chalk.yellow.bold('📅 Timeline View'));
    
    const { recentActivities } = data;
    const timeline = this.generateTimeline(recentActivities);
    
    console.log(timeline);
  }

  /**
   * タイムラインを生成
   */
  private generateTimeline(activities: AgentActivity[]): string {
    let timeline = '';
    
    activities.slice(0, 10).forEach((activity, index) => {
      const time = this.formatTime(activity.startTime);
      const agent = this.getAgentDisplayName(activity.agentType);
      const status = activity.status === 'completed' ? '✓' : '○';
      const statusColor = activity.status === 'completed' ? chalk.green : chalk.yellow;
      
      timeline += `${chalk.gray(time)} ${statusColor(status)} ${chalk.cyan(agent)}\n`;
      timeline += `${chalk.gray('│')}   ${activity.taskId}\n`;
      
      if (index < activities.length - 1) {
        timeline += `${chalk.gray('│')}\n`;
      }
    });
    
    return timeline;
  }

  /**
   * キー入力ハンドラーをセットアップ
   */
  private setupKeyHandlers(): void {
    if (!process.stdin.isTTY) return;
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key: string) => {
      switch (key) {
        case 'q':
        case '\x03': // Ctrl+C
          this.stop();
          process.exit(0);
          break;
        case '1':
          this.currentView = 'overview';
          this.clearScreen();
          this.renderHeader();
          break;
        case '2':
          this.currentView = 'agents';
          this.clearScreen();
          this.renderHeader();
          break;
        case '3':
          this.currentView = 'timeline';
          this.clearScreen();
          this.renderHeader();
          break;
      }
    });
  }

  /**
   * ヘルパー関数群
   */
  private getAgentDisplayName(agentType: string): string {
    const nameMap: Record<string, string> = {
      'ceo': '👔 CEO',
      'cto': '💻 CTO',
      'project-manager': '📋 Project Manager',
      'frontend-developer': '🎨 Frontend Dev',
      'backend-developer': '⚙️ Backend Dev',
      'qa-engineer': '🧪 QA Engineer',
      'ai-security-specialist': '🔒 Security',
      'deep-researcher': '🔬 Researcher'
    };
    
    return nameMap[agentType] || agentType;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  private formatPercentage(value: number): string {
    const percentage = Math.round(value * 100);
    if (percentage >= 90) return chalk.green(`${percentage}%`);
    if (percentage >= 70) return chalk.yellow(`${percentage}%`);
    return chalk.red(`${percentage}%`);
  }

  private formatEfficiency(value: number): string {
    if (value >= 80) return chalk.green.bold(`${value}%`);
    if (value >= 60) return chalk.yellow(`${value}%`);
    return chalk.red(`${value}%`);
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'completed': chalk.green('✓ Complete'),
      'in_progress': chalk.yellow('⟳ Running'),
      'failed': chalk.red('✗ Failed'),
      'pending': chalk.gray('○ Pending')
    };
    
    return statusMap[status] || status;
  }
}