/**
 * ASCII Charts for Claude Agent Monitor
 * CLIでデータを視覚的に表示するためのチャート生成
 */

import chalk from 'chalk';
import { AgentPerformance, ToolUsage } from '../types/index.js';

export class Charts {
  
  /**
   * 水平棒グラフを生成
   */
  static createBarChart(data: Array<{ label: string; value: number; color?: string }>, options: {
    width?: number;
    showValues?: boolean;
    title?: string;
  } = {}): string {
    const { width = 50, showValues = true, title } = options;
    const maxValue = Math.max(...data.map(d => d.value));
    
    let chart = '';
    
    if (title) {
      chart += chalk.bold(title) + '\n\n';
    }
    
    data.forEach(item => {
      const barLength = Math.round((item.value / maxValue) * width);
      const bar = '█'.repeat(barLength);
      const padding = ' '.repeat(width - barLength);
      const label = item.label.padEnd(20);
      
      const coloredBar = item.color ? chalk.hex(item.color)(bar) : chalk.cyan(bar);
      const value = showValues ? ` ${item.value}` : '';
      
      chart += `${label} ${coloredBar}${padding}${value}\n`;
    });
    
    return chart;
  }

  /**
   * エージェント効率チャートを生成
   */
  static createEfficiencyChart(agents: AgentPerformance[]): string {
    const data = agents.map(agent => ({
      label: this.getShortAgentName(agent.agentType),
      value: agent.efficiency,
      color: this.getEfficiencyColor(agent.efficiency)
    }));
    
    return this.createBarChart(data, {
      title: '📊 Agent Efficiency Score',
      width: 40,
      showValues: true
    });
  }

  /**
   * タスク完了数チャートを生成
   */
  static createTaskCompletionChart(agents: AgentPerformance[]): string {
    const data = agents.map(agent => ({
      label: this.getShortAgentName(agent.agentType),
      value: agent.tasksCompleted,
      color: '#00ff00'
    }));
    
    return this.createBarChart(data, {
      title: '✅ Tasks Completed',
      width: 40,
      showValues: true
    });
  }

  /**
   * トークン使用量チャートを生成
   */
  static createTokenUsageChart(agents: AgentPerformance[]): string {
    const data = agents.map(agent => ({
      label: this.getShortAgentName(agent.agentType),
      value: agent.tokenUsage.total,
      color: '#ffaa00'
    }));
    
    return this.createBarChart(data, {
      title: '🔤 Token Usage',
      width: 40,
      showValues: true
    });
  }

  /**
   * ツール使用頻度チャートを生成
   */
  static createToolUsageChart(tools: ToolUsage[]): string {
    const sortedTools = [...tools].sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
    
    const data = sortedTools.map(tool => ({
      label: tool.toolName,
      value: tool.usageCount,
      color: '#00aaff'
    }));
    
    return this.createBarChart(data, {
      title: '🛠️ Tool Usage Frequency',
      width: 35,
      showValues: true
    });
  }

  /**
   * 時系列アクティビティチャートを生成
   */
  static createActivityTimeline(hourlyData: Array<{ hour: number; count: number }>): string {
    const maxCount = Math.max(...hourlyData.map(d => d.count));
    const height = 10;
    
    let chart = chalk.bold('📈 24-Hour Activity Timeline\n\n');
    
    // Y軸ラベル
    for (let y = height; y >= 0; y--) {
      const threshold = (y / height) * maxCount;
      const label = y === height ? maxCount.toString().padStart(4) : 
                    y === 0 ? '   0' : '    ';
      
      chart += label + ' ';
      
      // グラフ本体
      for (let x = 0; x < 24; x++) {
        const hour = hourlyData.find(h => h.hour === x);
        const count = hour ? hour.count : 0;
        const barHeight = Math.round((count / maxCount) * height);
        
        if (barHeight >= y) {
          chart += chalk.cyan('█');
        } else {
          chart += ' ';
        }
        chart += ' ';
      }
      chart += '\n';
    }
    
    // X軸ラベル
    chart += '     ';
    for (let x = 0; x < 24; x++) {
      chart += x.toString().padStart(2);
    }
    chart += '\n     ';
    chart += chalk.gray('Hour of Day');
    
    return chart;
  }

  /**
   * 成功率ゲージを生成
   */
  static createSuccessGauge(successRate: number): string {
    const percentage = Math.round(successRate * 100);
    const gaugeWidth = 30;
    const filledLength = Math.round((percentage / 100) * gaugeWidth);
    
    let gauge = '';
    
    // ゲージバー
    gauge += '[';
    for (let i = 0; i < gaugeWidth; i++) {
      if (i < filledLength) {
        if (percentage >= 90) {
          gauge += chalk.green('█');
        } else if (percentage >= 70) {
          gauge += chalk.yellow('█');
        } else {
          gauge += chalk.red('█');
        }
      } else {
        gauge += chalk.gray('░');
      }
    }
    gauge += '] ';
    
    // パーセンテージ表示
    if (percentage >= 90) {
      gauge += chalk.green.bold(`${percentage}%`);
    } else if (percentage >= 70) {
      gauge += chalk.yellow.bold(`${percentage}%`);
    } else {
      gauge += chalk.red.bold(`${percentage}%`);
    }
    
    return gauge;
  }

  /**
   * スパークラインチャートを生成
   */
  static createSparkline(values: number[], width: number = 20): string {
    if (values.length === 0) return '';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    
    // 値を指定幅にリサンプリング
    const step = Math.max(1, Math.floor(values.length / width));
    const resampled: number[] = [];
    
    for (let i = 0; i < values.length; i += step) {
      const slice = values.slice(i, i + step);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      resampled.push(avg);
    }
    
    // スパークライン生成
    return resampled.map(value => {
      const normalized = (value - min) / range;
      const index = Math.min(Math.floor(normalized * chars.length), chars.length - 1);
      return chars[index];
    }).join('');
  }

  /**
   * 比較チャートを生成（2つのエージェント）
   */
  static createComparisonChart(agent1: AgentPerformance, agent2: AgentPerformance): string {
    let chart = chalk.bold(`⚖️  Agent Comparison: ${this.getShortAgentName(agent1.agentType)} vs ${this.getShortAgentName(agent2.agentType)}\n\n`);
    
    const metrics = [
      { name: 'Tasks Completed', val1: agent1.tasksCompleted, val2: agent2.tasksCompleted },
      { name: 'Success Rate', val1: agent1.successRate * 100, val2: agent2.successRate * 100 },
      { name: 'Efficiency', val1: agent1.efficiency, val2: agent2.efficiency },
      { name: 'Avg Duration (s)', val1: agent1.averageTaskDuration, val2: agent2.averageTaskDuration },
      { name: 'Total Tokens', val1: agent1.tokenUsage.total, val2: agent2.tokenUsage.total }
    ];
    
    metrics.forEach(metric => {
      const label = metric.name.padEnd(20);
      const max = Math.max(metric.val1, metric.val2);
      const barWidth = 20;
      
      const bar1Length = max > 0 ? Math.round((metric.val1 / max) * barWidth) : 0;
      const bar2Length = max > 0 ? Math.round((metric.val2 / max) * barWidth) : 0;
      
      const bar1 = chalk.cyan('█'.repeat(bar1Length));
      const bar2 = chalk.magenta('█'.repeat(bar2Length));
      
      chart += `${label}\n`;
      chart += `  ${chalk.cyan('A1')} ${bar1} ${metric.val1}\n`;
      chart += `  ${chalk.magenta('A2')} ${bar2} ${metric.val2}\n\n`;
    });
    
    return chart;
  }

  /**
   * ヘルパー関数群
   */
  private static getShortAgentName(agentType: string): string {
    const nameMap: Record<string, string> = {
      'ceo': 'CEO',
      'cto': 'CTO',
      'project-manager': 'PM',
      'frontend-developer': 'Frontend',
      'backend-developer': 'Backend',
      'qa-engineer': 'QA',
      'ai-security-specialist': 'Security',
      'deep-researcher': 'Research'
    };
    
    return nameMap[agentType] || agentType;
  }

  private static getEfficiencyColor(efficiency: number): string {
    if (efficiency >= 80) return '#00ff00';
    if (efficiency >= 60) return '#ffff00';
    return '#ff0000';
  }
}