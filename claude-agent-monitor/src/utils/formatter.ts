/**
 * Output Formatter Utilities
 * CLIでの美しい出力フォーマットを提供
 * 虹色夢愛 (Frontend Developer) - UI/UX重視の実装
 */

import chalk from 'chalk';
import dayjs from 'dayjs';
import boxen from 'boxen';
import type {
  AgentActivity,
  ClaudeSession,
  SessionSummary,
  AgentPerformance,
  Insight,
  ToolUsage
} from '../types/index.js';

/**
 * カラーテーマ定義
 */
export const ColorTheme = {
  primary: '#45B7D1',
  secondary: '#96CEB4',
  accent: '#FFEAA7',
  warning: '#FDCB6E',
  error: '#E17055',
  success: '#00B894',
  info: '#74B9FF',
  muted: '#636E72',
  
  // エージェント別カラー
  agents: {
    'ceo': '#FF6B6B',
    'cto': '#4ECDC4',
    'project-manager': '#FFA07A',
    'frontend-developer': '#45B7D1',
    'backend-developer': '#4ECDC4',
    'qa-engineer': '#96CEB4',
    'ai-security-specialist': '#6C5CE7',
    'deep-researcher': '#A29BFE',
    'default': '#DDD'
  }
} as const;

/**
 * アイコン定義
 */
export const Icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: '💡',
  loading: '⏳',
  agent: '🤖',
  task: '📋',
  session: '📊',
  chart: '📈',
  dashboard: '🎯',
  time: '⏰',
  memory: '💾',
  cpu: '⚡',
  network: '🌐',
  file: '📄',
  folder: '📁',
  star: '⭐',
  trophy: '🏆',
  medal: ['🥇', '🥈', '🥉'],
  arrow: {
    up: '↗️',
    down: '↘️',
    stable: '→'
  }
} as const;

/**
 * 進捗バーの生成
 */
export function createProgressBar(
  current: number,
  total: number,
  width: number = 20,
  style: 'default' | 'rainbow' | 'gradient' = 'default'
): string {
  if (total === 0) return '█'.repeat(width);
  
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;
  
  let fillChar: string;
  let emptyChar = chalk.gray('░');
  
  switch (style) {
    case 'rainbow':
      fillChar = chalk.red('█');
      break;
    case 'gradient':
      fillChar = chalk.hex(percentage > 0.7 ? ColorTheme.success : 
                          percentage > 0.4 ? ColorTheme.warning : 
                          ColorTheme.error)('█');
      break;
    default:
      fillChar = chalk.hex(ColorTheme.primary)('█');
  }
  
  return fillChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * スパークライン（簡易グラフ）の生成
 */
export function createSparkline(
  data: number[],
  width: number = 20,
  colored: boolean = true
): string {
  if (data.length === 0) return '';
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return data.slice(-width).map(value => {
    const normalized = (value - min) / range;
    const index = Math.floor(normalized * (sparkChars.length - 1));
    return chalk.hex(ColorTheme.info)(sparkChars[index]);
  }).join('');
}

/**
 * ステータスバッジの生成
 */
export function createStatusBadge(
  status: 'success' | 'error' | 'warning' | 'info' | 'pending',
  text: string
): string {
  const colors = {
    success: ColorTheme.success,
    error: ColorTheme.error,
    warning: ColorTheme.warning,
    info: ColorTheme.info,
    pending: ColorTheme.muted
  };
  
  const icons = {
    success: Icons.success,
    error: Icons.error,
    warning: Icons.warning,
    info: Icons.info,
    pending: Icons.loading
  };
  
  return chalk.hex(colors[status])(`${icons[status]} ${text}`);
}

/**
 * エージェント名の美しい表示
 */
export function formatAgentName(agentId: string, agentType?: string): string {
  const color = ColorTheme.agents[agentId as keyof typeof ColorTheme.agents] || 
                ColorTheme.agents.default;
  
  const displayName = agentId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return chalk.hex(color)(`${Icons.agent} ${displayName}`);
}

/**
 * 時間の相対表示
 */
export function formatRelativeTime(date: Date): string {
  const now = dayjs();
  const target = dayjs(date);
  const diff = now.diff(target, 'minute');
  
  if (diff < 1) return chalk.hex(ColorTheme.success)('just now');
  if (diff < 60) return chalk.hex(ColorTheme.info)(`${diff}m ago`);
  if (diff < 1440) return chalk.hex(ColorTheme.warning)(`${Math.floor(diff/60)}h ago`);
  return chalk.hex(ColorTheme.muted)(target.format('MM-DD HH:mm'));
}

/**
 * ファイルサイズのフォーマット
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return chalk.hex(ColorTheme.muted)('0 B');
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  
  // カラー付きサイズ表示
  const color = i >= 3 ? ColorTheme.error :   // GB以上は赤
                i >= 2 ? ColorTheme.warning : // MB以上は黄
                i >= 1 ? ColorTheme.info :     // KB以上は青
                ColorTheme.success;            // B単位は緑
  
  return chalk.hex(color)(`${size} ${sizes[i]}`);
}

/**
 * パーセンテージの美しい表示
 */
export function formatPercentage(
  value: number,
  showColor: boolean = true,
  precision: number = 1
): string {
  const percentage = (value * 100).toFixed(precision);
  
  if (!showColor) return `${percentage}%`;
  
  const color = value >= 0.9 ? ColorTheme.success :
                value >= 0.7 ? ColorTheme.info :
                value >= 0.5 ? ColorTheme.warning :
                ColorTheme.error;
  
  return chalk.hex(color)(`${percentage}%`);
}

/**
 * トレンド表示用矢印
 */
export function formatTrend(
  trend: 'improving' | 'declining' | 'stable',
  value?: number
): string {
  const arrows = {
    improving: { icon: Icons.arrow.up, color: ColorTheme.success },
    declining: { icon: Icons.arrow.down, color: ColorTheme.error },
    stable: { icon: Icons.arrow.stable, color: ColorTheme.info }
  };
  
  const { icon, color } = arrows[trend];
  const displayValue = value !== undefined ? ` ${Math.abs(value).toFixed(1)}%` : '';
  
  return chalk.hex(color)(`${icon}${displayValue}`);
}

/**
 * 美しいヘッダーの生成
 */
export function createHeader(
  title: string,
  subtitle?: string,
  width: number = 80
): string {
  const lines = [];
  
  // タイトル行
  const titleLine = chalk.hex(ColorTheme.primary).bold(`${Icons.dashboard} ${title}`);
  lines.push(titleLine);
  
  // サブタイトル行
  if (subtitle) {
    const subtitleLine = chalk.hex(ColorTheme.muted)(subtitle);
    lines.push(subtitleLine);
  }
  
  // 現在時刻
  const timestamp = chalk.hex(ColorTheme.info)(
    `${Icons.time} ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
  );
  lines.push(timestamp);
  
  return boxen(lines.join('\n'), {
    padding: 1,
    borderStyle: 'round' as any,
    borderColor: ColorTheme.primary as any,
    backgroundColor: 'black' as any
  });
}

/**
 * セクション区切りの生成
 */
export function createSection(
  title: string,
  icon?: string,
  width: number = 80
): string {
  const displayIcon = icon || Icons.info;
  const sectionTitle = chalk.hex(ColorTheme.accent).bold(`\n${displayIcon} ${title}`);
  const separator = chalk.hex(ColorTheme.muted)('─'.repeat(Math.max(0, width - title.length - 4)));
  
  return `${sectionTitle}\n${separator}`;
}

/**
 * ダッシュボード統計カードの生成
 */
export function createMetricCard(
  title: string,
  value: string | number,
  icon: string,
  trend?: { direction: 'up' | 'down' | 'stable'; value?: number },
  color?: string
): string {
  const displayColor = color || ColorTheme.primary;
  const cardTitle = chalk.hex(ColorTheme.muted)(title);
  const cardValue = chalk.hex(displayColor).bold(value.toString());
  const cardIcon = chalk.hex(displayColor)(icon);
  
  let trendDisplay = '';
  if (trend) {
    const trendColor = trend.direction === 'up' ? ColorTheme.success :
                       trend.direction === 'down' ? ColorTheme.error :
                       ColorTheme.info;
    const trendIcon = trend.direction === 'up' ? '↗' :
                      trend.direction === 'down' ? '↘' : '→';
    const trendValue = trend.value ? ` ${Math.abs(trend.value).toFixed(1)}%` : '';
    trendDisplay = ` ${chalk.hex(trendColor)(`${trendIcon}${trendValue}`)}`;
  }
  
  return `${cardIcon} ${cardTitle}: ${cardValue}${trendDisplay}`;
}

/**
 * セッション情報の美しい表示
 */
export function formatSessionInfo(session: ClaudeSession): string[] {
  const lines = [];
  
  lines.push(`${chalk.hex(ColorTheme.primary).bold('Session ID')}: ${chalk.hex(ColorTheme.info)(session.sessionId.substring(0, 20))}...`);
  lines.push(`${chalk.hex(ColorTheme.primary).bold('Started')}: ${formatRelativeTime(session.startTime)}`);
  
  if (session.endTime) {
    lines.push(`${chalk.hex(ColorTheme.primary).bold('Ended')}: ${formatRelativeTime(session.endTime)}`);
  }
  
  if (session.duration) {
    const duration = session.duration > 3600 ? 
      `${Math.floor(session.duration / 3600)}h ${Math.floor((session.duration % 3600) / 60)}m` :
      `${Math.floor(session.duration / 60)}m ${session.duration % 60}s`;
    lines.push(`${chalk.hex(ColorTheme.primary).bold('Duration')}: ${chalk.hex(ColorTheme.accent)(duration)}`);
  }
  
  lines.push(`${chalk.hex(ColorTheme.primary).bold('Tasks')}: ${chalk.hex(ColorTheme.success)(session.completedTasks)}/${chalk.hex(ColorTheme.info)(session.totalTasks)} ${formatPercentage(session.totalTasks > 0 ? session.completedTasks / session.totalTasks : 0)}`);
  
  return lines;
}

/**
 * エージェントパフォーマンス情報の表示
 */
export function formatAgentPerformance(agent: AgentPerformance): string[] {
  const lines = [];
  
  lines.push(formatAgentName(agent.agentId, agent.agentType));
  lines.push(`  ${chalk.hex(ColorTheme.muted)('Tasks')}: ${chalk.hex(ColorTheme.info)(agent.tasksCompleted)} | ${chalk.hex(ColorTheme.muted)('Success')}: ${formatPercentage(agent.successRate)}`);
  lines.push(`  ${chalk.hex(ColorTheme.muted)('Avg Time')}: ${chalk.hex(ColorTheme.accent)(agent.averageTaskDuration)}s | ${chalk.hex(ColorTheme.muted)('Efficiency')}: ${chalk.hex(ColorTheme.success)(agent.efficiency)}/100`);
  lines.push(`  ${chalk.hex(ColorTheme.muted)('Tokens')}: ${formatBytes(agent.tokenUsage.total)} (${chalk.hex(ColorTheme.info)(agent.tokenUsage.input)}/${chalk.hex(ColorTheme.warning)(agent.tokenUsage.output)})`);
  
  return lines;
}

/**
 * インサイト情報の美しい表示
 */
export function formatInsight(insight: Insight): string[] {
  const lines = [];
  
  // セベリティアイコン
  const severityIcon = insight.severity === 'critical' ? '🚨' :
                       insight.severity === 'warning' ? '⚠️' : '💡';
  
  // セベリティカラー
  const severityColor = insight.severity === 'critical' ? ColorTheme.error :
                        insight.severity === 'warning' ? ColorTheme.warning :
                        ColorTheme.info;
  
  lines.push(`${severityIcon} ${chalk.hex(severityColor).bold(insight.title)}`);
  lines.push(`   ${chalk.hex(ColorTheme.muted)(insight.description)}`);
  
  if (insight.affectedAgents.length > 0) {
    lines.push(`   ${chalk.hex(ColorTheme.primary)('Affected')}: ${insight.affectedAgents.map(id => formatAgentName(id)).join(', ')}`);
  }
  
  if (insight.recommendations.length > 0) {
    lines.push(`   ${chalk.hex(ColorTheme.accent)('Recommendations')}:`);
    insight.recommendations.forEach(rec => {
      lines.push(`   • ${chalk.hex(ColorTheme.muted)(rec)}`);
    });
  }
  
  return lines;
}

/**
 * ツール使用統計の表示
 */
export function formatToolUsage(tool: ToolUsage): string {
  const successColor = tool.successRate >= 0.9 ? ColorTheme.success :
                       tool.successRate >= 0.7 ? ColorTheme.info :
                       tool.successRate >= 0.5 ? ColorTheme.warning :
                       ColorTheme.error;
  
  return `${chalk.hex(ColorTheme.primary)(tool.toolName)}: ` +
         `${chalk.hex(ColorTheme.info)(tool.usageCount)} uses, ` +
         `${chalk.hex(successColor)(formatPercentage(tool.successRate))} success, ` +
         `${chalk.hex(ColorTheme.accent)(tool.averageDuration.toFixed(1))}s avg`;
}

/**
 * エラーメッセージのフォーマット
 */
export function formatError(error: string | Error): string {
  const message = error instanceof Error ? error.message : error;
  return chalk.hex(ColorTheme.error)(`${Icons.error} ${message}`);
}

/**
 * 成功メッセージのフォーマット
 */
export function formatSuccess(message: string): string {
  return chalk.hex(ColorTheme.success)(`${Icons.success} ${message}`);
}

/**
 * 警告メッセージのフォーマット
 */
export function formatWarning(message: string): string {
  return chalk.hex(ColorTheme.warning)(`${Icons.warning} ${message}`);
}

/**
 * 情報メッセージのフォーマット
 */
export function formatInfo(message: string): string {
  return chalk.hex(ColorTheme.info)(`${Icons.info} ${message}`);
}

/**
 * ローディングメッセージのフォーマット
 */
export function formatLoading(message: string): string {
  return chalk.hex(ColorTheme.muted)(`${Icons.loading} ${message}`);
}

/**
 * CLI引数のバリデーション結果表示
 */
export function formatValidationResult(
  isValid: boolean,
  field: string,
  value: any,
  error?: string
): string {
  if (isValid) {
    return `${Icons.success} ${chalk.hex(ColorTheme.success)(field)}: ${chalk.hex(ColorTheme.info)(value)}`;
  } else {
    return `${Icons.error} ${chalk.hex(ColorTheme.error)(field)}: ${chalk.hex(ColorTheme.muted)(value)} - ${chalk.hex(ColorTheme.error)(error || 'Invalid')}`;
  }
}

/**
 * デバッグ情報の表示
 */
export function formatDebug(message: string, data?: any): string {
  const debugMessage = chalk.hex(ColorTheme.muted)(`[DEBUG] ${message}`);
  if (data) {
    return `${debugMessage}\n${chalk.hex(ColorTheme.muted)(JSON.stringify(data, null, 2))}`;
  }
  return debugMessage;
}

/**
 * メモリ使用量の表示
 */
export function formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string[] {
  const lines = [];
  
  lines.push(`${Icons.memory} ${chalk.hex(ColorTheme.primary).bold('Memory Usage')}`);
  lines.push(`  ${chalk.hex(ColorTheme.info)('Heap Used')}: ${formatBytes(memoryUsage.heapUsed)}`);
  lines.push(`  ${chalk.hex(ColorTheme.info)('Heap Total')}: ${formatBytes(memoryUsage.heapTotal)}`);
  lines.push(`  ${chalk.hex(ColorTheme.info)('RSS')}: ${formatBytes(memoryUsage.rss)}`);
  lines.push(`  ${chalk.hex(ColorTheme.info)('External')}: ${formatBytes(memoryUsage.external)}`);
  
  return lines;
}

/**
 * システム稼働時間の表示
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return chalk.hex(ColorTheme.accent)(parts.join(' '));
}

/**
 * パフォーマンスメトリクスの表示
 */
export function formatPerformanceMetric(
  name: string,
  value: number,
  unit: string,
  trend?: 'up' | 'down' | 'stable'
): string {
  const trendIcon = trend ? 
    (trend === 'up' ? Icons.arrow.up : 
     trend === 'down' ? Icons.arrow.down : 
     Icons.arrow.stable) : '';
  
  const trendColor = trend ? 
    (trend === 'up' ? ColorTheme.success : 
     trend === 'down' ? ColorTheme.error : 
     ColorTheme.info) : ColorTheme.primary;
  
  return `${chalk.hex(ColorTheme.primary)(name)}: ${chalk.hex(trendColor).bold(value.toFixed(2))} ${chalk.hex(ColorTheme.muted)(unit)} ${chalk.hex(trendColor)(trendIcon)}`;
}

/**
 * テーブルセルの値をフォーマット
 */
export function formatTableCell(
  value: any,
  type: 'string' | 'number' | 'percentage' | 'bytes' | 'time' | 'status' = 'string'
): string {
  switch (type) {
    case 'number':
      return chalk.hex(ColorTheme.info)(value.toString());
    case 'percentage':
      return formatPercentage(typeof value === 'number' ? value : parseFloat(value));
    case 'bytes':
      return formatBytes(typeof value === 'number' ? value : parseInt(value));
    case 'time':
      return formatRelativeTime(value instanceof Date ? value : new Date(value));
    case 'status':
      const statusColor = value === 'completed' ? ColorTheme.success :
                          value === 'failed' ? ColorTheme.error :
                          value === 'in_progress' ? ColorTheme.warning :
                          ColorTheme.muted;
      return chalk.hex(statusColor)(value);
    default:
      return chalk.hex(ColorTheme.primary)(value.toString());
  }
}

/**
 * ランキング表示用のメダル取得
 */
export function getRankingMedal(rank: number): string {
  if (rank <= 3) {
    return Icons.medal[rank - 1] || `${rank}.`;
  }
  return `${rank}.`;
}

// キーボードショートカットヘルプの表示
export function formatKeyboardHelp(): string {
  const shortcuts = [
    { key: 'q', description: 'Quit' },
    { key: 'r', description: 'Refresh' },
    { key: 'h', description: 'Help' },
    { key: '↑/↓', description: 'Navigate' },
    { key: 'Enter', description: 'Select' },
    { key: 'Tab', description: 'Switch View' }
  ];
  
  const lines = [chalk.hex(ColorTheme.accent).bold('⌨️  Keyboard Shortcuts')];
  shortcuts.forEach(({ key, description }) => {
    lines.push(`  ${chalk.hex(ColorTheme.primary).bold(key)}: ${chalk.hex(ColorTheme.muted)(description)}`);
  });
  
  return boxen(lines.join('\n'), {
    padding: 1,
    borderStyle: 'round' as any,
    borderColor: ColorTheme.accent as any
  });
}