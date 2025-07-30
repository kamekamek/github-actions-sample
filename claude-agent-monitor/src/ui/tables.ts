/**
 * Table Display Components
 * 美しいCLI表形データ表示コンポーネント
 * 虹色夢愛 (Frontend Developer) - アクセシビリティ重視の実装
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import { 
  ColorTheme, 
  Icons, 
  formatAgentName, 
  formatRelativeTime, 
  formatBytes, 
  formatPercentage,
  formatTableCell,
  createSparkline,
  getRankingMedal
} from '../utils/formatter.js';
import type {
  ClaudeSession,
  AgentActivity,
  AgentPerformance,
  SessionSummary,
  ToolUsage,
  Insight,
  LogEntry
} from '../types/index.js';

/**
 * テーブルスタイル設定
 */
interface TableStyle {
  borderColor: string;
  headerColor: string;
  evenRowColor?: string;
  oddRowColor?: string;
  compact: boolean;
  showBorders: boolean;
  maxWidth?: number;
}

/**
 * デフォルトテーブルスタイル
 */
const DEFAULT_TABLE_STYLE: TableStyle = {
  borderColor: ColorTheme.primary,
  headerColor: ColorTheme.accent,
  compact: false,
  showBorders: true
};

/**
 * ソート設定
 */
interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * セッション一覧テーブルの生成
 */
export function createSessionsTable(
  sessions: ClaudeSession[],
  style: Partial<TableStyle> = {},
  limit?: number
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  const displaySessions = limit ? sessions.slice(0, limit) : sessions;
  
  if (displaySessions.length === 0) {
    return chalk.hex(ColorTheme.muted)(`${Icons.session} No sessions found`);
  }
  
  const table = new Table({
    head: [
      'Session ID',
      'Start Time', 
      'Duration',
      'Tasks',
      'Success Rate',
      'Agents',
      'Status'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  displaySessions.forEach((session, index) => {
    const sessionId = session.sessionId.substring(0, 12) + '...';
    const startTime = formatRelativeTime(session.startTime);
    const duration = session.duration ? 
      (session.duration > 3600 ? 
        `${Math.floor(session.duration / 3600)}h ${Math.floor((session.duration % 3600) / 60)}m` :
        `${Math.floor(session.duration / 60)}m ${session.duration % 60}s`) :
      chalk.hex(ColorTheme.muted)('Running');
    
    const tasks = `${session.completedTasks}/${session.totalTasks}`;
    const successRate = session.totalTasks > 0 ? 
      formatPercentage(session.completedTasks / session.totalTasks) :
      chalk.hex(ColorTheme.muted)('N/A');
    
    const uniqueAgents = [...new Set(session.agents.map(a => a.agentId))].length;
    const agentCount = chalk.hex(ColorTheme.info)(`${uniqueAgents} agent${uniqueAgents !== 1 ? 's' : ''}`);
    
    const status = session.endTime ? 
      chalk.hex(ColorTheme.success)(`${Icons.success} Complete`) :
      chalk.hex(ColorTheme.warning)(`${Icons.loading} Running`);
    
    // 交互色を適用（オプション）
    const rowColor = index % 2 === 0 ? tableStyle.evenRowColor : tableStyle.oddRowColor;
    const formatCell = (text: string) => rowColor ? chalk.hex(rowColor)(text) : text;
    
    table.push([
      formatCell(sessionId),
      formatCell(startTime),
      formatCell(duration),
      formatCell(tasks),
      successRate,
      formatCell(agentCount),
      status
    ]);
  });
  
  const title = chalk.hex(ColorTheme.accent).bold(`${Icons.session} Sessions Overview`);
  const summary = chalk.hex(ColorTheme.muted)(
    `Showing ${displaySessions.length} of ${sessions.length} sessions`
  );
  
  return `${title}\n${summary}\n\n${table.toString()}`;
}

/**
 * エージェントパフォーマンステーブルの生成
 */
export function createAgentPerformanceTable(
  agents: AgentPerformance[],
  style: Partial<TableStyle> = {},
  sortBy?: SortConfig
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  
  if (agents.length === 0) {
    return chalk.hex(ColorTheme.muted)(`${Icons.agent} No agent performance data found`);
  }
  
  // ソート処理
  let sortedAgents = [...agents];
  if (sortBy) {
    sortedAgents.sort((a, b) => {
      const aValue = (a as any)[sortBy.field];
      const bValue = (b as any)[sortBy.field];
      
      if (sortBy.direction === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
  }
  
  const table = new Table({
    head: [
      'Rank',
      'Agent',
      'Tasks',
      'Success Rate',
      'Avg Duration',
      'Efficiency', 
      'Tokens',
      'Trend'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  sortedAgents.forEach((agent, index) => {
    const ranking = getRankingMedal(index + 1);
    const agentName = formatAgentName(agent.agentId, agent.agentType);
    const tasks = chalk.hex(ColorTheme.info)(agent.tasksCompleted.toString());
    const successRate = formatPercentage(agent.successRate);
    const avgDuration = chalk.hex(ColorTheme.accent)(`${agent.averageTaskDuration}s`);
    const efficiency = agent.efficiency >= 80 ? 
      chalk.hex(ColorTheme.success)(`${agent.efficiency}/100`) :
      agent.efficiency >= 60 ? 
      chalk.hex(ColorTheme.warning)(`${agent.efficiency}/100`) :
      chalk.hex(ColorTheme.error)(`${agent.efficiency}/100`);
    
    const tokens = formatBytes(agent.tokenUsage.total);
    
    // トレンド表示（サンプルデータ）
    const trendData = Array.from({ length: 7 }, () => Math.random() * agent.efficiency);
    const trend = createSparkline(trendData, 8);
    
    table.push([
      ranking,
      agentName,
      tasks,
      successRate,
      avgDuration,
      efficiency,
      tokens,
      trend
    ]);
  });
  
  const title = chalk.hex(ColorTheme.accent).bold(`${Icons.trophy} Agent Performance Ranking`);
  const summary = chalk.hex(ColorTheme.muted)(
    `Top ${sortedAgents.length} performing agents`
  );
  
  return `${title}\n${summary}\n\n${table.toString()}`;
}

/**
 * ツール使用統計テーブルの生成
 */
export function createToolUsageTable(
  tools: ToolUsage[],
  style: Partial<TableStyle> = {},
  limit: number = 15
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  const displayTools = tools.slice(0, limit);
  
  if (displayTools.length === 0) {
    return chalk.hex(ColorTheme.muted)(`${Icons.file} No tool usage data found`);
  }
  
  const table = new Table({
    head: [
      'Tool',
      'Usage Count',
      'Success Rate',
      'Avg Duration',
      'Reliability',
      'Usage Trend'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  displayTools.forEach((tool, index) => {
    const toolName = chalk.hex(ColorTheme.primary)(`🔧 ${tool.toolName}`);
    const usageCount = chalk.hex(ColorTheme.info)(tool.usageCount.toString());
    const successRate = formatPercentage(tool.successRate);
    const avgDuration = chalk.hex(ColorTheme.accent)(`${tool.averageDuration.toFixed(1)}s`);
    
    // 信頼性スコア（成功率と使用回数を組み合わせ）
    const reliabilityScore = Math.round((tool.successRate * 0.7 + Math.min(tool.usageCount / 100, 1) * 0.3) * 100);
    const reliability = reliabilityScore >= 80 ? 
      chalk.hex(ColorTheme.success)(`${reliabilityScore}%`) :
      reliabilityScore >= 60 ? 
      chalk.hex(ColorTheme.warning)(`${reliabilityScore}%`) :
      chalk.hex(ColorTheme.error)(`${reliabilityScore}%`);
    
    // 使用トレンド（サンプルデータ）
    const trendData = Array.from({ length: 10 }, (_, i) => 
      Math.max(0, tool.usageCount * (0.8 + Math.random() * 0.4) - i * 2)
    );
    const trend = createSparkline(trendData, 10);
    
    table.push([
      toolName,
      usageCount,
      successRate,
      avgDuration,
      reliability,
      trend
    ]);
  });
  
  const title = chalk.hex(ColorTheme.accent).bold(`🔧 Tool Usage Statistics`);
  const summary = chalk.hex(ColorTheme.muted)(
    `Top ${displayTools.length} most used tools`
  );
  
  return `${title}\n${summary}\n\n${table.toString()}`;
}

/**
 * インサイトテーブルの生成
 */
export function createInsightsTable(
  insights: Insight[],
  style: Partial<TableStyle> = {},
  limit: number = 10
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  const displayInsights = insights.slice(0, limit);
  
  if (displayInsights.length === 0) {
    return chalk.hex(ColorTheme.muted)(`${Icons.info} No insights found`);
  }
  
  const table = new Table({
    head: [
      'Severity',
      'Type',
      'Title',
      'Affected Agents',
      'Recommendations'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  displayInsights.forEach(insight => {
    // セベリティアイコン
    const severityIcon = insight.severity === 'critical' ? '🚨' :
                         insight.severity === 'warning' ? '⚠️' : '💡';
    const severityColor = insight.severity === 'critical' ? ColorTheme.error :
                          insight.severity === 'warning' ? ColorTheme.warning :
                          ColorTheme.info;
    const severity = `${severityIcon} ${chalk.hex(severityColor)(insight.severity.toUpperCase())}`;
    
    const type = chalk.hex(ColorTheme.primary)(insight.type);
    const title = insight.title.length > 30 ? 
      insight.title.substring(0, 27) + '...' : 
      insight.title;
    
    const affectedAgents = insight.affectedAgents.length > 3 ? 
      `${insight.affectedAgents.slice(0, 3).join(', ')}... (+${insight.affectedAgents.length - 3})` :
      insight.affectedAgents.join(', ');
    
    const recommendations = insight.recommendations.length > 0 ? 
      `${insight.recommendations.length} suggestion${insight.recommendations.length !== 1 ? 's' : ''}` :
      chalk.hex(ColorTheme.muted)('None');
    
    table.push([
      severity,
      type,
      chalk.hex(ColorTheme.primary)(title),
      chalk.hex(ColorTheme.muted)(affectedAgents),
      chalk.hex(ColorTheme.accent)(recommendations)
    ]);
  });
  
  const title = chalk.hex(ColorTheme.accent).bold(`${Icons.info} System Insights`);
  const summary = chalk.hex(ColorTheme.muted)(
    `Showing ${displayInsights.length} insights ordered by severity`
  );
  
  return `${title}\n${summary}\n\n${table.toString()}`;
}

/**
 * リアルタイムアクティビティテーブルの生成
 */
export function createRealTimeActivityTable(
  activities: AgentActivity[],
  style: Partial<TableStyle> = {},
  limit: number = 10
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  const recentActivities = activities
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit);
  
  if (recentActivities.length === 0) {
    return chalk.hex(ColorTheme.muted)(`${Icons.loading} No recent activity`);
  }
  
  const table = new Table({
    head: [
      'Agent',
      'Task ID',
      'Started',
      'Duration',
      'Status',
      'Tools Used',
      'Files'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  recentActivities.forEach(activity => {
    const agentName = formatAgentName(activity.agentId, activity.agentType);
    const taskId = activity.taskId.substring(0, 12) + '...';
    const startTime = formatRelativeTime(activity.startTime);
    
    const duration = activity.duration ? 
      chalk.hex(ColorTheme.accent)(`${activity.duration}s`) :
      chalk.hex(ColorTheme.warning)('Running');
    
    const status = activity.success ? 
      chalk.hex(ColorTheme.success)(`${Icons.success} Success`) :
      activity.errorMessage ? 
      chalk.hex(ColorTheme.error)(`${Icons.error} Failed`) :
      activity.status === 'in_progress' ? 
      chalk.hex(ColorTheme.warning)(`${Icons.loading} Running`) :
      chalk.hex(ColorTheme.muted)(activity.status);
    
    const toolsUsed = activity.toolsUsed.length > 0 ? 
      activity.toolsUsed.slice(0, 3).join(', ') + 
      (activity.toolsUsed.length > 3 ? `... (+${activity.toolsUsed.length - 3})` : '') :
      chalk.hex(ColorTheme.muted)('None');
    
    const filesCount = activity.files.length > 0 ? 
      chalk.hex(ColorTheme.info)(`${activity.files.length} file${activity.files.length !== 1 ? 's' : ''}`) :
      chalk.hex(ColorTheme.muted)('None');
    
    table.push([
      agentName,
      chalk.hex(ColorTheme.info)(taskId),
      startTime,
      duration,
      status,
      chalk.hex(ColorTheme.muted)(toolsUsed),
      filesCount
    ]);
  });
  
  const title = chalk.hex(ColorTheme.accent).bold(`${Icons.loading} Real-time Activity`);
  const summary = chalk.hex(ColorTheme.muted)(
    `Latest ${recentActivities.length} activities`
  );
  
  return `${title}\n${summary}\n\n${table.toString()}`;
}

/**
 * システム統計テーブルの生成
 */
export function createSystemStatsTable(
  stats: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    activeSessions: number;
    totalActivities: number;
    cpuUsage?: number;
  },
  style: Partial<TableStyle> = {}
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  
  const table = new Table({
    head: [
      'Metric',
      'Current Value',
      'Status',
      'Trend'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  // メモリ使用量
  const memoryUsedMB = Math.round(stats.memoryUsage.heapUsed / 1024 / 1024);
  const memoryTotalMB = Math.round(stats.memoryUsage.heapTotal / 1024 / 1024);
  const memoryUsage = `${memoryUsedMB} / ${memoryTotalMB} MB`;
  const memoryStatus = memoryUsedMB < 100 ? 
    chalk.hex(ColorTheme.success)('Good') :
    memoryUsedMB < 500 ? 
    chalk.hex(ColorTheme.warning)('Moderate') :
    chalk.hex(ColorTheme.error)('High');
  
  // 稼働時間
  const uptimeHours = Math.floor(stats.uptime / 3600);
  const uptimeMinutes = Math.floor((stats.uptime % 3600) / 60);
  const uptimeDisplay = `${uptimeHours}h ${uptimeMinutes}m`;
  
  // トレンドデータ（サンプル）
  const memoryTrend = createSparkline(
    Array.from({ length: 10 }, (_, i) => memoryUsedMB + (Math.random() - 0.5) * 20),
    8
  );
  
  const sessionTrend = createSparkline(
    Array.from({ length: 10 }, (_, i) => stats.activeSessions + Math.floor((Math.random() - 0.5) * 4)),
    8
  );
  
  const activityTrend = createSparkline(
    Array.from({ length: 10 }, (_, i) => stats.totalActivities + Math.floor((Math.random() - 0.5) * 10)),
    8
  );
  
  table.push(
    [
      `${Icons.memory} Memory Usage`,
      chalk.hex(ColorTheme.info)(memoryUsage),
      memoryStatus,
      memoryTrend
    ],
    [
      `${Icons.time} System Uptime`,
      chalk.hex(ColorTheme.accent)(uptimeDisplay),
      chalk.hex(ColorTheme.success)('Stable'),
      '→→→→→→→→'
    ],
    [
      `${Icons.session} Active Sessions`,
      chalk.hex(ColorTheme.primary)(stats.activeSessions.toString()),
      stats.activeSessions > 0 ? 
        chalk.hex(ColorTheme.success)('Active') : 
        chalk.hex(ColorTheme.muted)('Idle'),
      sessionTrend
    ],
    [
      `${Icons.task} Total Activities`,
      chalk.hex(ColorTheme.info)(stats.totalActivities.toString()),
      stats.totalActivities > 0 ? 
        chalk.hex(ColorTheme.success)('Processing') : 
        chalk.hex(ColorTheme.muted)('Waiting'),
      activityTrend
    ]
  );
  
  if (stats.cpuUsage !== undefined) {
    const cpuStatus = stats.cpuUsage < 50 ? 
      chalk.hex(ColorTheme.success)('Low') :
      stats.cpuUsage < 80 ? 
      chalk.hex(ColorTheme.warning)('Moderate') :
      chalk.hex(ColorTheme.error)('High');
    
    const cpuTrend = createSparkline(
      Array.from({ length: 10 }, (_, i) => stats.cpuUsage! + (Math.random() - 0.5) * 20),
      8
    );
    
    table.push([
      `${Icons.cpu} CPU Usage`,
      chalk.hex(ColorTheme.warning)(`${stats.cpuUsage.toFixed(1)}%`),
      cpuStatus,
      cpuTrend
    ]);
  }
  
  const title = chalk.hex(ColorTheme.accent).bold(`${Icons.dashboard} System Statistics`);
  const timestamp = chalk.hex(ColorTheme.muted)(
    `Last updated: ${new Date().toLocaleTimeString()}`
  );
  
  return `${title}\n${timestamp}\n\n${table.toString()}`;
}

/**
 * エラーログテーブルの生成
 */
export function createErrorLogTable(
  errors: LogEntry[],
  style: Partial<TableStyle> = {},
  limit: number = 10
): string {
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  const recentErrors = errors
    .filter(entry => entry.level === 'error')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
  
  if (recentErrors.length === 0) {
    return chalk.hex(ColorTheme.success)(`${Icons.success} No recent errors found`);
  }
  
  const table = new Table({
    head: [
      'Time',
      'Source',
      'Agent',
      'Message',
      'Metadata'
    ],
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  recentErrors.forEach(error => {
    const timestamp = formatRelativeTime(error.timestamp);
    const source = chalk.hex(ColorTheme.primary)(error.source);
    const agent = error.agentId ? 
      formatAgentName(error.agentId) : 
      chalk.hex(ColorTheme.muted)('System');
    
    const message = error.message.length > 50 ? 
      error.message.substring(0, 47) + '...' : 
      error.message;
    
    const metadata = error.metadata ? 
      Object.keys(error.metadata).length > 0 ? 
        chalk.hex(ColorTheme.info)(`${Object.keys(error.metadata).length} field${Object.keys(error.metadata).length !== 1 ? 's' : ''}`) :
        chalk.hex(ColorTheme.muted)('None') :
      chalk.hex(ColorTheme.muted)('None');
    
    table.push([
      timestamp,
      source,
      agent,
      chalk.hex(ColorTheme.error)(message),
      metadata
    ]);
  });
  
  const title = chalk.hex(ColorTheme.error).bold(`${Icons.error} Recent Errors`);
  const summary = chalk.hex(ColorTheme.muted)(
    `Showing ${recentErrors.length} most recent errors`
  );
  
  return `${title}\n${summary}\n\n${table.toString()}`;
}

/**
 * カスタムテーブルの生成
 */
export function createCustomTable(
  headers: string[],
  rows: string[][],
  options: {
    title?: string;
    style?: Partial<TableStyle>;
    sortColumn?: number;
    sortDirection?: 'asc' | 'desc';
    filterEmpty?: boolean;
  } = {}
): string {
  const { title, style = {}, sortColumn, sortDirection = 'desc', filterEmpty = false } = options;
  const tableStyle = { ...DEFAULT_TABLE_STYLE, ...style };
  
  let processedRows = [...rows];
  
  // 空の行をフィルタリング
  if (filterEmpty) {
    processedRows = processedRows.filter(row => 
      row.some(cell => cell && cell.trim().length > 0)
    );
  }
  
  // ソート処理
  if (sortColumn !== undefined && sortColumn < headers.length) {
    processedRows.sort((a, b) => {
      const aValue = a[sortColumn] || '';
      const bValue = b[sortColumn] || '';
      
      // 数値として比較できるかチェック
      const aNum = parseFloat(aValue.replace(/[^\d.-]/g, ''));
      const bNum = parseFloat(bValue.replace(/[^\d.-]/g, ''));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'desc' ? bNum - aNum : aNum - bNum;
      } else {
        return sortDirection === 'desc' ? 
          bValue.localeCompare(aValue) : 
          aValue.localeCompare(bValue);
      }
    });
  }
  
  if (processedRows.length === 0) {
    return chalk.hex(ColorTheme.muted)('No data available');
  }
  
  const table = new Table({
    head: headers,
    style: {
      head: [],
      border: tableStyle.showBorders ? [chalk.hex(tableStyle.borderColor)] : [],
      compact: tableStyle.compact
    }
  });
  
  processedRows.forEach(row => {
    table.push(row.map(cell => cell || chalk.hex(ColorTheme.muted)('N/A')));
  });
  
  let result = table.toString();
  
  if (title) {
    const titleLine = chalk.hex(ColorTheme.accent).bold(title);
    const summary = chalk.hex(ColorTheme.muted)(
      `${processedRows.length} row${processedRows.length !== 1 ? 's' : ''}`
    );
    result = `${titleLine}\n${summary}\n\n${result}`;
  }
  
  return result;
}

/**
 * テーブルのページネーション
 */
export function paginateTable(
  content: string,
  currentPage: number,
  totalPages: number,
  itemsPerPage: number
): string {
  const paginationInfo = chalk.hex(ColorTheme.muted)(
    `Page ${currentPage} of ${totalPages} (${itemsPerPage} items per page)`
  );
  
  const navigation: string[] = [];
  if (currentPage > 1) {
    navigation.push('[P] Previous');
  }
  if (currentPage < totalPages) {
    navigation.push('[N] Next');
  }
  navigation.push('[Q] Quit');
  
  const navigationBar = navigation.join('  ');
  
  return `${content}\n\n${paginationInfo}\n${navigationBar}`;
}

/**
 * テーブルのエクスポート（CSV形式）
 */
export function exportTableAsCSV(
  headers: string[],
  rows: string[][],
  filename?: string
): string {
  const csvHeaders = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
  const csvRows = rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""').replace(/\x1b\[[0-9;]*m/g, '')}"`).join(',')
  );
  
  const csvContent = [csvHeaders, ...csvRows].join('\n');
  
  if (filename) {
    return `# Exported from Claude Agent Monitor\n# Filename: ${filename}\n# Generated: ${new Date().toISOString()}\n\n${csvContent}`;
  }
  
  return csvContent;
}

/**
 * テーブルのフィルタリング
 */
export function filterTable(
  headers: string[],
  rows: string[][],
  filters: { column: number; value: string; type: 'contains' | 'equals' | 'startsWith' | 'endsWith' }[]
): string[][] {
  return rows.filter(row => {
    return filters.every(filter => {
      if (filter.column >= row.length) return true;
      
      const cellValue = row[filter.column].toLowerCase();
      const filterValue = filter.value.toLowerCase();
      
      switch (filter.type) {
        case 'equals':
          return cellValue === filterValue;
        case 'startsWith':
          return cellValue.startsWith(filterValue);
        case 'endsWith':
          return cellValue.endsWith(filterValue);
        case 'contains':
        default:
          return cellValue.includes(filterValue);
      }
    });
  });
}

/**
 * テーブルの検索機能
 */
export function searchTable(
  headers: string[],
  rows: string[][],
  searchTerm: string
): { rows: string[][]; matches: number } {
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  const matchedRows = rows.filter(row => 
    row.some(cell => cell.toLowerCase().includes(lowerSearchTerm))
  );
  
  return {
    rows: matchedRows,
    matches: matchedRows.length
  };
}

/**
 * レスポンシブテーブル幅の計算
 */
export function calculateResponsiveTableWidth(): number {
  const terminalWidth = process.stdout.columns || 80;
  return Math.max(60, Math.min(120, terminalWidth - 10));
}

/**
 * テーブルカラムの自動幅調整
 */
export function adjustColumnWidths(
  headers: string[],
  rows: string[][],
  maxWidth: number
): { headers: string[]; rows: string[][] } {
  const columnCount = headers.length;
  const maxColumnWidth = Math.floor((maxWidth - columnCount * 3) / columnCount);
  
  const adjustedHeaders = headers.map(header => 
    header.length > maxColumnWidth ? 
      header.substring(0, maxColumnWidth - 3) + '...' : 
      header
  );
  
  const adjustedRows = rows.map(row => 
    row.map(cell => 
      cell.length > maxColumnWidth ? 
        cell.substring(0, maxColumnWidth - 3) + '...' : 
        cell
    )
  );
  
  return { headers: adjustedHeaders, rows: adjustedRows };
}