/**
 * Agent Activity Tracker
 * エージェント活動をリアルタイムで追跡・記録するクラス
 * セキュリティファーストで高性能なエージェント監視を提供
 */

import { EventEmitter } from 'events';
import { ClaudeLogParser } from '../parser/log-parser.js';
import { DataManager } from '../storage/data-manager.js';
import {
  AgentActivity,
  ClaudeSession,
  LogEntry,
  AgentType,
  TaskStatus,
  FileOperation,
  AgentInfo
} from '../types/index.js';
import fs from 'fs-extra';
import path from 'path';
import { performance } from 'perf_hooks';

/**
 * エージェント追跡イベント定義
 */
export interface TrackerEvents {
  'agent.activity.start': (activity: AgentActivity) => void;
  'agent.activity.update': (activity: AgentActivity) => void;
  'agent.activity.complete': (activity: AgentActivity) => void;
  'session.start': (session: ClaudeSession) => void;
  'session.end': (session: ClaudeSession) => void;
  'error': (error: Error) => void;
  'performance.warning': (metric: PerformanceMetric) => void;
}

/**
 * パフォーマンスメトリクス
 */
interface PerformanceMetric {
  type: 'memory' | 'cpu' | 'response_time' | 'throughput';
  value: number;
  threshold: number;
  timestamp: Date;
  context: string;
}

/**
 * 追跡設定
 */
interface TrackerConfig {
  maxConcurrentSessions: number;
  memoryThreshold: number; // MB
  responseTimeThreshold: number; // ms
  retentionPeriod: number; // days
  enableRealTimeMetrics: boolean;
  enableSecurity: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * セッション状態管理
 */
interface SessionState {
  session: ClaudeSession;
  activeActivities: Map<string, AgentActivity>;
  startTime: number;
  lastActivity: number;
  memoryUsage: number;
}

/**
 * AgentTracker - エージェント活動追跡システム
 */
export class AgentTracker extends EventEmitter {
  private logParser: ClaudeLogParser;
  private dataManager: DataManager;
  private config: TrackerConfig;
  private isTracking: boolean = false;
  private activeSessions: Map<string, SessionState> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private securityViolations: LogEntry[] = [];
  private agentRegistry: Map<string, AgentInfo> = new Map();
  
  // パフォーマンス監視
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(
    logDirectory: string,
    dataManager: DataManager,
    config: Partial<TrackerConfig> = {}
  ) {
    super();
    
    // デフォルト設定
    this.config = {
      maxConcurrentSessions: 10,
      memoryThreshold: 512, // 512MB
      responseTimeThreshold: 1000, // 1秒
      retentionPeriod: 30, // 30日
      enableRealTimeMetrics: true,
      enableSecurity: true,
      logLevel: 'info',
      ...config
    };
    
    this.logParser = new ClaudeLogParser(logDirectory);
    this.dataManager = dataManager;
    
    // エージェント情報を初期化
    this.initializeAgentRegistry();
    
    // セキュリティファーストでエラーハンドリング設定
    this.setupErrorHandling();
    
    // パフォーマンス監視開始
    if (this.config.enableRealTimeMetrics) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * エージェント追跡を開始
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) {
      throw new Error('追跡は既に開始されています');
    }

    try {
      const startTime = performance.now();
      
      // セキュリティチェック
      if (this.config.enableSecurity) {
        await this.performSecurityCheck();
      }
      
      // 既存セッションを読み込み
      await this.loadExistingSessions();
      
      // リアルタイム監視を開始
      await this.startRealtimeMonitoring();
      
      this.isTracking = true;
      
      const elapsedTime = performance.now() - startTime;
      this.log('info', `エージェント追跡を開始しました (${elapsedTime.toFixed(2)}ms)`);
      
      // パフォーマンス記録
      this.recordMetric('startup_time', elapsedTime);
      
    } catch (error) {
      this.log('error', `追跡開始エラー: ${error}`);
      throw error;
    }
  }

  /**
   * エージェント追跡を停止
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      // アクティブセッションを終了処理
      for (const [sessionId, state] of this.activeSessions) {
        await this.endSession(sessionId);
      }
      
      // 監視インターバルをクリア
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // 最終データを保存
      await this.dataManager.flush();
      
      this.isTracking = false;
      this.log('info', 'エージェント追跡を停止しました');
      
    } catch (error) {
      this.log('error', `追跡停止エラー: ${error}`);
      throw error;
    }
  }

  /**
   * 新しいエージェント活動を追跡開始
   */
  async trackAgentActivity(
    agentId: string,
    agentType: AgentType,
    taskDescription: string,
    sessionId?: string
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      // セッションIDが未指定の場合は新規作成
      if (!sessionId) {
        sessionId = await this.createNewSession();
      }
      
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const activity: AgentActivity = {
        agentId,
        agentType,
        taskId,
        startTime: new Date(),
        status: 'in_progress',
        inputTokens: 0,
        outputTokens: 0,
        toolsUsed: [],
        files: [],
        success: false
      };
      
      // セッション状態を更新
      const sessionState = this.activeSessions.get(sessionId);
      if (sessionState) {
        sessionState.activeActivities.set(taskId, activity);
        sessionState.lastActivity = Date.now();
        sessionState.session.totalTasks++;
        sessionState.session.agents.push(activity);
      }
      
      // データストレージに保存
      await this.dataManager.saveActivity(activity);
      
      // イベント発行
      this.emit('agent.activity.start', activity);
      
      const elapsedTime = performance.now() - startTime;
      this.recordMetric('track_activity_time', elapsedTime);
      
      this.log('debug', `エージェント活動追跡開始: ${agentId} - ${taskDescription} (${elapsedTime.toFixed(2)}ms)`);
      
      return taskId;
      
    } catch (error) {
      this.log('error', `活動追跡エラー: ${error}`);
      throw error;
    }
  }

  /**
   * エージェント活動を更新
   */
  async updateAgentActivity(
    taskId: string,
    updates: Partial<AgentActivity>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      // アクティブセッションから活動を検索
      let targetActivity: AgentActivity | null = null;
      let targetSessionId: string | null = null;
      
      for (const [sessionId, state] of this.activeSessions) {
        const activity = state.activeActivities.get(taskId);
        if (activity) {
          targetActivity = activity;
          targetSessionId = sessionId;
          break;
        }
      }
      
      if (!targetActivity || !targetSessionId) {
        throw new Error(`タスクが見つかりません: ${taskId}`);
      }
      
      // 活動を更新
      Object.assign(targetActivity, updates);
      targetActivity.duration = updates.endTime ? 
        Math.floor((updates.endTime.getTime() - targetActivity.startTime.getTime()) / 1000) : 
        undefined;
      
      // セッション状態を更新
      const sessionState = this.activeSessions.get(targetSessionId)!;
      sessionState.lastActivity = Date.now();
      
      // データストレージに保存
      await this.dataManager.updateActivity(targetActivity);
      
      // イベント発行
      this.emit('agent.activity.update', targetActivity);
      
      const elapsedTime = performance.now() - startTime;
      this.recordMetric('update_activity_time', elapsedTime);
      
      this.log('debug', `エージェント活動更新: ${taskId} (${elapsedTime.toFixed(2)}ms)`);
      
    } catch (error) {
      this.log('error', `活動更新エラー: ${error}`);
      throw error;
    }
  }

  /**
   * エージェント活動を完了
   */
  async completeAgentActivity(
    taskId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const endTime = new Date();
    
    try {
      await this.updateAgentActivity(taskId, {
        endTime,
        status: success ? 'completed' : 'failed',
        success,
        errorMessage
      });
      
      // アクティブセッションから活動を削除
      for (const [sessionId, state] of this.activeSessions) {
        const activity = state.activeActivities.get(taskId);
        if (activity) {
          state.activeActivities.delete(taskId);
          if (success) {
            state.session.completedTasks++;
          }
          
          // 完了イベント発行
          this.emit('agent.activity.complete', activity);
          break;
        }
      }
      
      this.log('debug', `エージェント活動完了: ${taskId} - 成功: ${success}`);
      
    } catch (error) {
      this.log('error', `活動完了エラー: ${error}`);
      throw error;
    }
  }

  /**
   * ファイル操作を記録
   */
  async recordFileOperation(
    taskId: string,
    operation: Omit<FileOperation, 'timestamp'>
  ): Promise<void> {
    try {
      const fileOp: FileOperation = {
        ...operation,
        timestamp: new Date()
      };
      
      // セキュリティチェック - 機密ファイルパスの検出
      if (this.config.enableSecurity && this.isSensitivePath(operation.path)) {
        this.recordSecurityViolation('file_access', `機密ファイルアクセス: ${operation.path}`);
      }
      
      // アクティブセッションから該当タスクを検索
      for (const [sessionId, state] of this.activeSessions) {
        const activity = state.activeActivities.get(taskId);
        if (activity) {
          activity.files.push(fileOp);
          break;
        }
      }
      
      this.log('debug', `ファイル操作記録: ${operation.type} - ${operation.path}`);
      
    } catch (error) {
      this.log('error', `ファイル操作記録エラー: ${error}`);
    }
  }

  /**
   * 現在のトラッキング状態を取得
   */
  getTrackingStatus(): {
    isTracking: boolean;
    activeSessions: number;
    totalActivities: number;
    memoryUsage: number;
    uptime: number;
  } {
    const memoryUsage = process.memoryUsage();
    let totalActivities = 0;
    
    for (const state of this.activeSessions.values()) {
      totalActivities += state.activeActivities.size;
    }
    
    return {
      isTracking: this.isTracking,
      activeSessions: this.activeSessions.size,
      totalActivities,
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      uptime: process.uptime()
    };
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getPerformanceMetrics(): Record<string, { avg: number; max: number; count: number }> {
    const metrics: Record<string, { avg: number; max: number; count: number }> = {};
    
    for (const [key, values] of this.performanceMetrics) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      
      metrics[key] = {
        avg: Math.round(avg * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: values.length
      };
    }
    
    return metrics;
  }

  // プライベートメソッド

  /**
   * エージェントレジストリを初期化
   */
  private initializeAgentRegistry(): void {
    const defaultAgents: AgentInfo[] = [
      {
        id: 'ceo',
        name: 'CEO',
        type: 'ceo',
        description: '戦略立案・意思決定責任者',
        color: '#FF6B6B',
        tools: ['TodoWrite', 'WebSearch', 'Read']
      },
      {
        id: 'backend-developer',
        name: 'Backend Developer',
        type: 'backend-developer',
        description: 'バックエンド開発・セキュリティ専門',
        color: '#4ECDC4',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'MultiEdit']
      },
      {
        id: 'frontend-developer',
        name: 'Frontend Developer',
        type: 'frontend-developer',
        description: 'フロントエンド開発・UI/UX',
        color: '#45B7D1',
        tools: ['Read', 'Write', 'Edit', 'WebSearch']
      },
      {
        id: 'project-manager',
        name: 'Project Manager',
        type: 'project-manager',
        description: 'プロジェクト管理・進捗調整',
        color: '#FFA07A',
        tools: ['TodoWrite', 'Read', 'Write']
      }
    ];
    
    for (const agent of defaultAgents) {
      this.agentRegistry.set(agent.id, agent);
    }
  }

  /**
   * セキュリティチェックを実行
   */
  private async performSecurityCheck(): Promise<void> {
    // メモリ使用量チェック
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryUsageMB > this.config.memoryThreshold) {
      throw new Error(`メモリ使用量が閾値を超過: ${memoryUsageMB.toFixed(2)}MB > ${this.config.memoryThreshold}MB`);
    }
    
    // 同時セッション数チェック
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      throw new Error(`同時セッション数が上限に達しています: ${this.activeSessions.size}`);
    }
  }

  /**
   * 既存セッションを読み込み
   */
  private async loadExistingSessions(): Promise<void> {
    try {
      const sessions = await this.logParser.parseSessionLogs();
      
      for (const session of sessions) {
        // 最近のセッションのみアクティブとして扱う
        const sessionAge = Date.now() - session.startTime.getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24時間
        
        if (sessionAge < maxAge && !session.endTime) {
          const sessionState: SessionState = {
            session,
            activeActivities: new Map(),
            startTime: session.startTime.getTime(),
            lastActivity: Date.now(),
            memoryUsage: 0
          };
          
          this.activeSessions.set(session.sessionId, sessionState);
        }
      }
      
      this.log('info', `既存セッション読み込み完了: ${sessions.length}セッション`);
      
    } catch (error) {
      this.log('warn', `既存セッション読み込みエラー: ${error}`);
    }
  }

  /**
   * リアルタイム監視を開始
   */
  private async startRealtimeMonitoring(): Promise<void> {
    try {
      await this.logParser.startWatching((session) => {
        this.handleNewSession(session);
      });
      
      this.log('info', 'リアルタイム監視を開始しました');
      
    } catch (error) {
      this.log('error', `リアルタイム監視開始エラー: ${error}`);
      throw error;
    }
  }

  /**
   * 新しいセッションを作成
   */
  private async createNewSession(): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ClaudeSession = {
      sessionId,
      startTime: new Date(),
      workingDirectory: process.cwd(),
      totalTasks: 0,
      completedTasks: 0,
      agents: []
    };
    
    const sessionState: SessionState = {
      session,
      activeActivities: new Map(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      memoryUsage: 0
    };
    
    this.activeSessions.set(sessionId, sessionState);
    
    // データストレージに保存
    await this.dataManager.saveSession(session);
    
    // イベント発行
    this.emit('session.start', session);
    
    this.log('info', `新しいセッションを作成: ${sessionId}`);
    
    return sessionId;
  }

  /**
   * セッションを終了
   */
  private async endSession(sessionId: string): Promise<void> {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return;
    }
    
    // アクティブな活動を強制完了
    for (const [taskId, activity] of sessionState.activeActivities) {
      await this.completeAgentActivity(taskId, false, 'セッション終了により中断');
    }
    
    // セッション終了時刻を設定
    sessionState.session.endTime = new Date();
    sessionState.session.duration = Math.floor(
      (sessionState.session.endTime.getTime() - sessionState.session.startTime.getTime()) / 1000
    );
    
    // データストレージに保存
    await this.dataManager.updateSession(sessionState.session);
    
    // セッション状態から削除
    this.activeSessions.delete(sessionId);
    
    // イベント発行
    this.emit('session.end', sessionState.session);
    
    this.log('info', `セッション終了: ${sessionId}`);
  }

  /**
   * 新しいセッションを処理
   */
  private handleNewSession(session: ClaudeSession): void {
    // セッション制限チェック
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      this.log('warn', `セッション数上限に達しているため、新しいセッションをスキップ: ${session.sessionId}`);
      return;
    }
    
    const sessionState: SessionState = {
      session,
      activeActivities: new Map(),
      startTime: session.startTime.getTime(),
      lastActivity: Date.now(),
      memoryUsage: 0
    };
    
    this.activeSessions.set(session.sessionId, sessionState);
    
    this.emit('session.start', session);
    
    this.log('info', `新しいセッションを検出: ${session.sessionId}`);
  }

  /**
   * パフォーマンス監視を開始
   */
  private startPerformanceMonitoring(): void {
    // メトリクス収集インターバル
    this.metricsInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 5000); // 5秒間隔
    
    // クリーンアップインターバル
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // 1分間隔
  }

  /**
   * パフォーマンスメトリクスを収集
   */
  private collectPerformanceMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    // メモリ使用量を記録
    this.recordMetric('memory_usage', memoryUsageMB);
    
    // 閾値チェック
    if (memoryUsageMB > this.config.memoryThreshold) {
      const metric: PerformanceMetric = {
        type: 'memory',
        value: memoryUsageMB,
        threshold: this.config.memoryThreshold,
        timestamp: new Date(),
        context: 'メモリ使用量が閾値を超過'
      };
      
      this.emit('performance.warning', metric);
    }
    
    // セッション状態をチェック
    for (const [sessionId, state] of this.activeSessions) {
      const sessionAge = Date.now() - state.lastActivity;
      const maxIdleTime = 30 * 60 * 1000; // 30分
      
      if (sessionAge > maxIdleTime) {
        this.log('warn', `非アクティブセッションを検出: ${sessionId}`);
        this.endSession(sessionId);
      }
    }
  }

  /**
   * クリーンアップを実行
   */
  private performCleanup(): void {
    // 古いメトリクスデータを削除
    const maxMetricsCount = 1000;
    
    for (const [key, values] of this.performanceMetrics) {
      if (values.length > maxMetricsCount) {
        values.splice(0, values.length - maxMetricsCount);
      }
    }
    
    // 古いセキュリティ違反ログを削除
    const maxViolations = 100;
    if (this.securityViolations.length > maxViolations) {
      this.securityViolations.splice(0, this.securityViolations.length - maxViolations);
    }
  }

  /**
   * メトリクスを記録
   */
  private recordMetric(key: string, value: number): void {
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }
    
    this.performanceMetrics.get(key)!.push(value);
  }

  /**
   * セキュリティ違反を記録
   */
  private recordSecurityViolation(type: string, message: string): void {
    const violation: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      source: 'agent',
      message: `セキュリティ違反: ${type} - ${message}`,
      metadata: { type, violation: true }
    };
    
    this.securityViolations.push(violation);
    this.log('warn', violation.message);
  }

  /**
   * 機密パスかどうかをチェック
   */
  private isSensitivePath(filePath: string): boolean {
    const sensitivePaths = [
      '/.env',
      '/config/secrets',
      '/private',
      '/.ssh',
      '/credentials',
      '/tokens'
    ];
    
    return sensitivePaths.some(path => filePath.includes(path));
  }

  /**
   * エラーハンドリング設定
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      this.log('error', `追跡システムエラー: ${error.message}`);
    });
    
    // 未処理例外のキャッチ
    process.on('uncaughtException', (error) => {
      this.log('error', `未処理例外: ${error.message}`);
      this.emit('error', error);
    });
    
    process.on('unhandledRejection', (reason) => {
      this.log('error', `未処理Promise拒否: ${reason}`);
      this.emit('error', new Error(String(reason)));
    });
  }

  /**
   * ログ出力
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= configLevelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] AgentTracker: ${message}`);
    }
  }
}

/**
 * トラッカーファクトリー - シングルトンパターン
 */
export class AgentTrackerFactory {
  private static instance: AgentTracker | null = null;
  
  static create(
    logDirectory: string,
    dataManager: DataManager,
    config?: Partial<TrackerConfig>
  ): AgentTracker {
    if (!this.instance) {
      this.instance = new AgentTracker(logDirectory, dataManager, config);
    }
    
    return this.instance;
  }
  
  static getInstance(): AgentTracker | null {
    return this.instance;
  }
  
  static destroy(): void {
    if (this.instance) {
      this.instance.stopTracking();
      this.instance = null;
    }
  }
}