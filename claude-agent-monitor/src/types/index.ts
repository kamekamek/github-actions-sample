/**
 * Claude Agent Monitor - Type Definitions
 * Claude Codeエージェントログ管理システム用の型定義
 */

// エージェント基本情報
export interface AgentInfo {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  color?: string;
  tools: string[];
}

// エージェントタイプ
export type AgentType = 
  | 'ceo'
  | 'cto' 
  | 'project-manager'
  | 'frontend-developer'
  | 'backend-developer'
  | 'qa-engineer'
  | 'ai-security-specialist'
  | 'deep-researcher'
  | 'general-purpose';

// Claude Codeセッション情報
export interface ClaudeSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  workingDirectory: string;
  totalTasks: number;
  completedTasks: number;
  agents: AgentActivity[];
  metadata?: Record<string, any>;
}

// エージェント活動記録
export interface AgentActivity {
  agentId: string;
  agentType: AgentType;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: TaskStatus;
  inputTokens: number;
  outputTokens: number;
  toolsUsed: string[];
  files: FileOperation[];
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// タスク状態
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// ファイル操作記録
export interface FileOperation {
  type: 'read' | 'write' | 'edit' | 'create' | 'delete';
  path: string;
  timestamp: Date;
  success: boolean;
  size?: number;
}

// ログエントリ
export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'claude' | 'agent' | 'system';
  agentId?: string;
  message: string;
  metadata?: Record<string, any>;
}

// 分析結果
export interface AnalysisResult {
  sessionSummary: SessionSummary;
  agentPerformance: AgentPerformance[];
  insights: Insight[];
  recommendations: string[];
}

// セッションサマリー
export interface SessionSummary {
  totalSessions: number;
  averageSessionDuration: number;
  totalTasks: number;
  successRate: number;
  mostActiveAgent: string;
  toolUsageStats: ToolUsage[];
}

// エージェントパフォーマンス
export interface AgentPerformance {
  agentId: string;
  agentType: AgentType;
  tasksCompleted: number;
  successRate: number;
  averageTaskDuration: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  efficiency: number; // 0-100の効率スコア
}

// ツール使用統計
export interface ToolUsage {
  toolName: string;
  usageCount: number;
  successRate: number;
  averageDuration: number;
}

// インサイト
export interface Insight {
  type: 'performance' | 'efficiency' | 'pattern' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedAgents: string[];
  recommendations: string[];
}

// 設定
export interface MonitorConfig {
  logDirectory: string;
  watchMode: boolean;
  outputFormat: 'json' | 'table' | 'csv';
  analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  realTimeUpdates: boolean;
  retentionDays: number;
}

// CLI コマンドオプション
export interface CLIOptions {
  logPath?: string;
  output?: string;
  format?: 'json' | 'table' | 'csv';
  watch?: boolean;
  verbose?: boolean;
  agent?: string;
  timeRange?: string;
  live?: boolean;
}

// レポート設定
export interface ReportConfig {
  title: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  includeAgents: string[];
  sections: ReportSection[];
  format: 'html' | 'pdf' | 'markdown';
}

export type ReportSection = 
  | 'summary'
  | 'agent-performance' 
  | 'tool-usage'
  | 'insights'
  | 'timeline'
  | 'recommendations';

// フィルター条件
export interface FilterCriteria {
  agents?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  status?: TaskStatus[];
  tools?: string[];
  minDuration?: number;
  maxDuration?: number;
}

// ダッシュボード設定
export interface DashboardConfig {
  refreshInterval: number; // seconds
  widgets: Widget[];
  theme: 'light' | 'dark';
  autoRefresh: boolean;
}

export interface Widget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'timeline';
  title: string;
  data: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// エクスポート設定
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  includeCharts: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: FilterCriteria;
}