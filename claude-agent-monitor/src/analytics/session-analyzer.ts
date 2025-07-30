/**
 * Session Analysis Engine
 * セッション分析とパフォーマンス評価エンジン
 * セキュリティファーストで高度な分析機能を提供
 */

import {
  ClaudeSession,
  AgentActivity,
  AnalysisResult,
  SessionSummary,
  AgentPerformance,
  Insight,
  ToolUsage,
  AgentType,
  FilterCriteria
} from '../types/index.js';
import { DataManager } from '../storage/data-manager.js';
import { performance } from 'perf_hooks';

/**
 * 分析設定
 */
interface AnalyzerConfig {
  minSessionDuration: number; // 最小セッション時間（秒）
  maxAnalysisDepth: number; // 最大分析深度
  anomalyThreshold: number; // 異常検知の閾値
  performanceBaseline: {
    avgTaskDuration: number; // 平均タスク時間（秒）
    successRate: number; // 成功率
    tokensPerMinute: number; // 分あたりトークン数
  };
  insightLevels: {
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * 時系列データポイント
 */
interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  agentId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * 異常検知結果
 */
interface AnomalyDetection {
  type: 'performance' | 'behavior' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSessions: string[];
  confidence: number; // 0-1の信頼度
  recommendations: string[];
}

/**
 * パフォーマンストレンド
 */
interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number; // 変化率（%）
  timeWindow: {
    start: Date;
    end: Date;
  };
  dataPoints: TimeSeriesPoint[];
}

/**
 * SessionAnalyzer - セッション分析エンジン
 */
export class SessionAnalyzer {
  private dataManager: DataManager;
  private config: AnalyzerConfig;
  private analysisCache: Map<string, AnalysisResult> = new Map();
  private performanceBaseline: Map<string, number> = new Map();
  private anomalyDetector: AnomalyDetector;
  
  constructor(
    dataManager: DataManager,
    config: Partial<AnalyzerConfig> = {}
  ) {
    this.dataManager = dataManager;
    
    // デフォルト設定
    this.config = {
      minSessionDuration: 60, // 1分
      maxAnalysisDepth: 1000, // 最大1000セッション
      anomalyThreshold: 2.0, // 2標準偏差
      performanceBaseline: {
        avgTaskDuration: 120, // 2分
        successRate: 0.85, // 85%
        tokensPerMinute: 100
      },
      insightLevels: {
        critical: 0.8,
        warning: 0.6,
        info: 0.4
      },
      ...config
    };
    
    this.anomalyDetector = new AnomalyDetector(
      this.config.anomalyThreshold,
      this.config.performanceBaseline
    );
    
    // パフォーマンスベースラインを初期化
    this.initializePerformanceBaseline();
  }

  /**
   * 包括的なセッション分析を実行
   */
  async analyzeSessionData(
    filters?: FilterCriteria,
    cacheKey?: string
  ): Promise<AnalysisResult> {
    const startTime = performance.now();
    
    try {
      // キャッシュチェック
      if (cacheKey && this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey)!;
        console.log(`[SessionAnalyzer] キャッシュから結果を取得: ${cacheKey}`);
        return cached;
      }
      
      // セッションデータを取得
      const sessions = await this.dataManager.getSessions(filters);
      
      if (sessions.length === 0) {
        return this.createEmptyAnalysisResult();
      }
      
      // 分析の実行
      const [sessionSummary, agentPerformance, insights] = await Promise.all([
        this.generateSessionSummary(sessions),
        this.analyzeAgentPerformance(sessions),
        this.generateInsights(sessions)
      ]);
      
      // 推奨事項を生成
      const recommendations = await this.generateRecommendations(sessions, insights);
      
      const result: AnalysisResult = {
        sessionSummary,
        agentPerformance,
        insights,
        recommendations
      };
      
      // 結果をキャッシュ
      if (cacheKey) {
        this.analysisCache.set(cacheKey, result);
        // キャッシュサイズ制限
        if (this.analysisCache.size > 100) {
          const firstKey = this.analysisCache.keys().next().value;
          if (firstKey) {
            this.analysisCache.delete(firstKey);
          }
        }
      }
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[SessionAnalyzer] 分析完了: ${sessions.length}セッション, ${elapsedTime.toFixed(2)}ms`);
      
      return result;
      
    } catch (error) {
      console.error('[SessionAnalyzer] 分析エラー:', error);
      throw new Error(`セッション分析に失敗しました: ${error}`);
    }
  }

  /**
   * リアルタイム分析を実行
   */
  async analyzeRealTime(
    recentSessions: ClaudeSession[],
    windowSize: number = 10
  ): Promise<{
    currentMetrics: Record<string, number>;
    trends: PerformanceTrend[];
    anomalies: AnomalyDetection[];
    alerts: string[];
  }> {
    try {
      // 最新のメトリクスを計算
      const currentMetrics = this.calculateCurrentMetrics(recentSessions);
      
      // パフォーマンストレンドを分析
      const trends = await this.analyzePerformanceTrends(
        recentSessions.slice(-windowSize)
      );
      
      // 異常検知
      const anomalies = await this.anomalyDetector.detectAnomalies(
        recentSessions,
        this.performanceBaseline
      );
      
      // アラート生成
      const alerts = this.generateAlerts(currentMetrics, anomalies);
      
      return {
        currentMetrics,
        trends,
        anomalies,
        alerts
      };
      
    } catch (error) {
      console.error('[SessionAnalyzer] リアルタイム分析エラー:', error);
      throw error;
    }
  }

  /**
   * エージェント比較分析
   */
  async compareAgents(
    agentIds: string[],
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    comparison: Record<string, AgentPerformance>;
    rankings: { metric: string; ranking: { agentId: string; value: number }[] }[];
    insights: Insight[];
  }> {
    try {
      const filters: FilterCriteria = {
        agents: agentIds,
        timeRange
      };
      
      const sessions = await this.dataManager.getSessions(filters);
      const agentPerformance = await this.analyzeAgentPerformance(sessions);
      
      // エージェント比較データを構築
      const comparison: Record<string, AgentPerformance> = {};
      for (const perf of agentPerformance) {
        if (agentIds.includes(perf.agentId)) {
          comparison[perf.agentId] = perf;
        }
      }
      
      // ランキングを生成
      const rankings = this.generateAgentRankings(agentPerformance);
      
      // 比較インサイトを生成
      const insights = this.generateComparisonInsights(comparison, rankings);
      
      return {
        comparison,
        rankings,
        insights
      };
      
    } catch (error) {
      console.error('[SessionAnalyzer] エージェント比較エラー:', error);
      throw error;
    }
  }

  /**
   * セッションサマリーを生成
   */
  private async generateSessionSummary(sessions: ClaudeSession[]): Promise<SessionSummary> {
    const totalSessions = sessions.length;
    
    // 平均セッション時間を計算
    const durations = sessions
      .filter(s => s.duration && s.duration > 0)
      .map(s => s.duration!);
    const averageSessionDuration = durations.length > 0 ? 
      durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    // 総タスク数と成功率を計算
    const totalTasks = sessions.reduce((sum, s) => sum + s.totalTasks, 0);
    const completedTasks = sessions.reduce((sum, s) => sum + s.completedTasks, 0);
    const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    // 最もアクティブなエージェントを特定
    const agentActivityCount: Record<string, number> = {};
    for (const session of sessions) {
      for (const activity of session.agents) {
        agentActivityCount[activity.agentId] = 
          (agentActivityCount[activity.agentId] || 0) + 1;
      }
    }
    
    const mostActiveAgent = Object.entries(agentActivityCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    
    // ツール使用統計を生成
    const toolUsageStats = await this.calculateToolUsageStats(sessions);
    
    return {
      totalSessions,
      averageSessionDuration: Math.round(averageSessionDuration),
      totalTasks,
      successRate: Math.round(successRate * 100) / 100,
      mostActiveAgent,
      toolUsageStats
    };
  }

  /**
   * エージェントパフォーマンスを分析
   */
  private async analyzeAgentPerformance(sessions: ClaudeSession[]): Promise<AgentPerformance[]> {
    const agentMetrics: Record<string, {
      activities: AgentActivity[];
      totalDuration: number;
      tokenUsage: { input: number; output: number };
    }> = {};
    
    // エージェント別にデータを集約
    for (const session of sessions) {
      for (const activity of session.agents) {
        if (!agentMetrics[activity.agentId]) {
          agentMetrics[activity.agentId] = {
            activities: [],
            totalDuration: 0,
            tokenUsage: { input: 0, output: 0 }
          };
        }
        
        const metrics = agentMetrics[activity.agentId];
        metrics.activities.push(activity);
        metrics.totalDuration += activity.duration || 0;
        metrics.tokenUsage.input += activity.inputTokens || 0;
        metrics.tokenUsage.output += activity.outputTokens || 0;
      }
    }
    
    // パフォーマンス指標を計算
    const performance: AgentPerformance[] = [];
    
    for (const [agentId, metrics] of Object.entries(agentMetrics)) {
      const activities = metrics.activities;
      const successfulActivities = activities.filter(a => a.success);
      
      const tasksCompleted = activities.length;
      const successRate = tasksCompleted > 0 ? successfulActivities.length / tasksCompleted : 0;
      const averageTaskDuration = tasksCompleted > 0 ? metrics.totalDuration / tasksCompleted : 0;
      
      const totalTokens = metrics.tokenUsage.input + metrics.tokenUsage.output;
      
      // 効率スコア計算（成功率、速度、トークン効率を考慮）
      const efficiency = this.calculateEfficiencyScore(
        successRate,
        averageTaskDuration,
        totalTokens,
        tasksCompleted
      );
      
      // エージェントタイプを取得
      const agentType = activities[0]?.agentType || 'general-purpose';
      
      performance.push({
        agentId,
        agentType,
        tasksCompleted,
        successRate: Math.round(successRate * 100) / 100,
        averageTaskDuration: Math.round(averageTaskDuration),
        tokenUsage: {
          input: metrics.tokenUsage.input,
          output: metrics.tokenUsage.output,
          total: totalTokens
        },
        efficiency: Math.round(efficiency)
      });
    }
    
    return performance.sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * インサイトを生成
   */
  private async generateInsights(sessions: ClaudeSession[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // パフォーマンス異常の検出
      const performanceInsights = await this.detectPerformanceIssues(sessions);
      insights.push(...performanceInsights);
      
      // 効率パターンの検出
      const efficiencyInsights = await this.detectEfficiencyPatterns(sessions);
      insights.push(...efficiencyInsights);
      
      // 異常パターンの検出
      const anomalyInsights = await this.detectAnomalyPatterns(sessions);
      insights.push(...anomalyInsights);
      
      // インサイトを重要度順にソート
      insights.sort((a, b) => {
        const severityOrder = { 'critical': 3, 'warning': 2, 'info': 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
      
      return insights.slice(0, 20); // 上位20個のインサイトを返す
      
    } catch (error) {
      console.error('[SessionAnalyzer] インサイト生成エラー:', error);
      return [];
    }
  }

  /**
   * 推奨事項を生成
   */
  private async generateRecommendations(
    sessions: ClaudeSession[],
    insights: Insight[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // インサイトベースの推奨事項
    for (const insight of insights) {
      recommendations.push(...insight.recommendations);
    }
    
    // 一般的なパフォーマンス推奨事項
    const generalRecommendations = this.generateGeneralRecommendations(sessions);
    recommendations.push(...generalRecommendations);
    
    // 重複を除去して返す
    return [...new Set(recommendations)].slice(0, 10);
  }

  /**
   * 効率スコアを計算
   */
  private calculateEfficiencyScore(
    successRate: number,
    avgDuration: number,
    totalTokens: number,
    taskCount: number
  ): number {
    // 基準値
    const baseline = this.config.performanceBaseline;
    
    // 成功率スコア (0-40点)
    const successScore = Math.min(successRate / baseline.successRate * 40, 40);
    
    // 速度スコア (0-30点)
    const speedScore = avgDuration > 0 ? 
      Math.min(baseline.avgTaskDuration / avgDuration * 30, 30) : 0;
    
    // トークン効率スコア (0-20点)
    const tokenEfficiency = taskCount > 0 ? totalTokens / taskCount : 0;
    const tokenScore = tokenEfficiency > 0 ? 
      Math.min(baseline.tokensPerMinute / tokenEfficiency * 20, 20) : 0;
    
    // アクティビティボーナス (0-10点)
    const activityBonus = Math.min(taskCount / 10 * 10, 10);
    
    return Math.max(0, Math.min(100, successScore + speedScore + tokenScore + activityBonus));
  }

  /**
   * ツール使用統計を計算
   */
  private async calculateToolUsageStats(sessions: ClaudeSession[]): Promise<ToolUsage[]> {
    const toolMetrics: Record<string, {
      count: number;
      successes: number;
      totalDuration: number;
    }> = {};
    
    for (const session of sessions) {
      for (const activity of session.agents) {
        for (const tool of activity.toolsUsed) {
          if (!toolMetrics[tool]) {
            toolMetrics[tool] = {
              count: 0,
              successes: 0,
              totalDuration: 0
            };
          }
          
          const metrics = toolMetrics[tool];
          metrics.count++;
          if (activity.success) {
            metrics.successes++;
          }
          metrics.totalDuration += activity.duration || 0;
        }
      }
    }
    
    return Object.entries(toolMetrics).map(([toolName, metrics]) => ({
      toolName,
      usageCount: metrics.count,
      successRate: metrics.count > 0 ? metrics.successes / metrics.count : 0,
      averageDuration: metrics.count > 0 ? metrics.totalDuration / metrics.count : 0
    })).sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * パフォーマンス問題を検出
   */
  private async detectPerformanceIssues(sessions: ClaudeSession[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // 低い成功率のエージェントを検出
    const agentPerformance = await this.analyzeAgentPerformance(sessions);
    const lowPerformanceAgents = agentPerformance.filter(a => a.successRate < 0.7);
    
    if (lowPerformanceAgents.length > 0) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        title: '低パフォーマンスエージェントの検出',
        description: `${lowPerformanceAgents.length}個のエージェントが低い成功率を示しています`,
        affectedAgents: lowPerformanceAgents.map(a => a.agentId),
        recommendations: [
          'エージェントの設定を見直してください',
          'タスクの複雑さを調整してください',
          'エラーログを確認してください'
        ]
      });
    }
    
    // 長時間実行タスクを検出
    const longRunningTasks = sessions
      .flatMap(s => s.agents)
      .filter(a => (a.duration || 0) > this.config.performanceBaseline.avgTaskDuration * 2);
    
    if (longRunningTasks.length > 0) {
      insights.push({
        type: 'performance',
        severity: 'info',
        title: '長時間実行タスクの検出',
        description: `${longRunningTasks.length}個のタスクが異常に長時間実行されています`,
        affectedAgents: [...new Set(longRunningTasks.map(t => t.agentId))],
        recommendations: [
          'タスクの分割を検討してください',
          'パフォーマンスボトルネックを調査してください'
        ]
      });
    }
    
    return insights;
  }

  /**
   * 効率パターンを検出
   */
  private async detectEfficiencyPatterns(sessions: ClaudeSession[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // 高効率エージェントを特定
    const agentPerformance = await this.analyzeAgentPerformance(sessions);
    const highEfficiencyAgents = agentPerformance.filter(a => a.efficiency > 80);
    
    if (highEfficiencyAgents.length > 0) {
      insights.push({
        type: 'efficiency',
        severity: 'info',
        title: '高効率エージェントパターン',
        description: `${highEfficiencyAgents.length}個のエージェントが高い効率を示しています`,
        affectedAgents: highEfficiencyAgents.map(a => a.agentId),
        recommendations: [
          '高効率エージェントの設定を他のエージェントに適用してください',
          '成功パターンを分析して標準化してください'
        ]
      });
    }
    
    return insights;
  }

  /**
   * 異常パターンを検出
   */
  private async detectAnomalyPatterns(sessions: ClaudeSession[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // 異常検知を実行
    const anomalies = await this.anomalyDetector.detectAnomalies(
      sessions,
      this.performanceBaseline
    );
    
    for (const anomaly of anomalies) {
      if (anomaly.confidence > 0.7) {
        insights.push({
          type: 'anomaly',
          severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
          title: `異常パターン: ${anomaly.type}`,
          description: anomaly.description,
          affectedAgents: anomaly.affectedSessions,
          recommendations: anomaly.recommendations
        });
      }
    }
    
    return insights;
  }

  /**
   * 一般的な推奨事項を生成
   */
  private generateGeneralRecommendations(sessions: ClaudeSession[]): string[] {
    const recommendations: string[] = [];
    
    if (sessions.length < 10) {
      recommendations.push('より多くのデータが必要です。継続的な監視を推奨します。');
    }
    
    const avgSessionDuration = sessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + s.duration!, 0) / sessions.length;
    
    if (avgSessionDuration > 3600) { // 1時間
      recommendations.push('長時間セッションが多いため、タスクの分割を検討してください。');
    }
    
    return recommendations;
  }

  /**
   * 現在のメトリクスを計算
   */
  private calculateCurrentMetrics(sessions: ClaudeSession[]): Record<string, number> {
    const recentSessions = sessions.slice(-10); // 最新10セッション
    
    const totalTasks = recentSessions.reduce((sum, s) => sum + s.totalTasks, 0);
    const completedTasks = recentSessions.reduce((sum, s) => sum + s.completedTasks, 0);
    const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    const avgDuration = recentSessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + s.duration!, 0) / recentSessions.length;
    
    return {
      sessionCount: recentSessions.length,
      totalTasks,
      completedTasks,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration)
    };
  }

  /**
   * パフォーマンストレンドを分析
   */
  private async analyzePerformanceTrends(
    sessions: ClaudeSession[]
  ): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];
    
    if (sessions.length < 3) {
      return trends; // データが不足
    }
    
    // 成功率のトレンド
    const successRatePoints = sessions.map(s => ({
      timestamp: s.startTime,
      value: s.totalTasks > 0 ? s.completedTasks / s.totalTasks : 0,
      sessionId: s.sessionId
    }));
    
    trends.push(this.calculateTrend('success_rate', successRatePoints));
    
    // セッション時間のトレンド
    const durationPoints = sessions
      .filter(s => s.duration)
      .map(s => ({
        timestamp: s.startTime,
        value: s.duration!,
        sessionId: s.sessionId
      }));
    
    if (durationPoints.length > 0) {
      trends.push(this.calculateTrend('session_duration', durationPoints));
    }
    
    return trends;
  }

  /**
   * トレンドを計算
   */
  private calculateTrend(
    metric: string,
    dataPoints: TimeSeriesPoint[]
  ): PerformanceTrend {
    if (dataPoints.length < 2) {
      return {
        metric,
        trend: 'stable',
        changeRate: 0,
        timeWindow: {
          start: new Date(),
          end: new Date()
        },
        dataPoints: []
      };
    }
    
    const sortedPoints = dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstValue = sortedPoints[0].value;
    const lastValue = sortedPoints[sortedPoints.length - 1].value;
    
    const changeRate = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(changeRate) > 5) {
      trend = changeRate > 0 ? 'improving' : 'declining';
    }
    
    return {
      metric,
      trend,
      changeRate: Math.round(changeRate * 100) / 100,
      timeWindow: {
        start: sortedPoints[0].timestamp,
        end: sortedPoints[sortedPoints.length - 1].timestamp
      },
      dataPoints: sortedPoints
    };
  }

  /**
   * エージェントランキングを生成
   */
  private generateAgentRankings(
    agentPerformance: AgentPerformance[]
  ): { metric: string; ranking: { agentId: string; value: number }[] }[] {
    const rankings = [
      {
        metric: 'efficiency',
        ranking: agentPerformance
          .map(a => ({ agentId: a.agentId, value: a.efficiency }))
          .sort((a, b) => b.value - a.value)
      },
      {
        metric: 'success_rate',
        ranking: agentPerformance
          .map(a => ({ agentId: a.agentId, value: a.successRate }))
          .sort((a, b) => b.value - a.value)
      },
      {
        metric: 'tasks_completed',
        ranking: agentPerformance
          .map(a => ({ agentId: a.agentId, value: a.tasksCompleted }))
          .sort((a, b) => b.value - a.value)
      }
    ];
    
    return rankings;
  }

  /**
   * 比較インサイトを生成
   */
  private generateComparisonInsights(
    comparison: Record<string, AgentPerformance>,
    rankings: { metric: string; ranking: { agentId: string; value: number }[] }[]
  ): Insight[] {
    const insights: Insight[] = [];
    
    // トップパフォーマーを特定
    const efficiencyRanking = rankings.find(r => r.metric === 'efficiency');
    if (efficiencyRanking && efficiencyRanking.ranking.length > 0) {
      const topPerformer = efficiencyRanking.ranking[0];
      
      insights.push({
        type: 'performance',
        severity: 'info',
        title: 'トップパフォーマーエージェント',
        description: `${topPerformer.agentId}が最高の効率スコア（${topPerformer.value}）を記録しています`,
        affectedAgents: [topPerformer.agentId],
        recommendations: [
          'このエージェントの設定を他のエージェントに適用することを検討してください',
          '成功要因を分析して標準化してください'
        ]
      });
    }
    
    return insights;
  }

  /**
   * アラートを生成
   */
  private generateAlerts(
    currentMetrics: Record<string, number>,
    anomalies: AnomalyDetection[]
  ): string[] {
    const alerts: string[] = [];
    
    // パフォーマンスアラート
    if (currentMetrics.successRate < 0.5) {
      alerts.push('警告: 成功率が50%を下回っています');
    }
    
    if (currentMetrics.avgDuration > this.config.performanceBaseline.avgTaskDuration * 2) {
      alerts.push('警告: 平均セッション時間が異常に長くなっています');
    }
    
    // 異常検知アラート
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        alerts.push(`${anomaly.severity.toUpperCase()}: ${anomaly.description}`);
      }
    }
    
    return alerts;
  }

  /**
   * パフォーマンスベースラインを初期化
   */
  private initializePerformanceBaseline(): void {
    const baseline = this.config.performanceBaseline;
    
    this.performanceBaseline.set('avg_task_duration', baseline.avgTaskDuration);
    this.performanceBaseline.set('success_rate', baseline.successRate);
    this.performanceBaseline.set('tokens_per_minute', baseline.tokensPerMinute);
  }

  /**
   * 空の分析結果を作成
   */
  private createEmptyAnalysisResult(): AnalysisResult {
    return {
      sessionSummary: {
        totalSessions: 0,
        averageSessionDuration: 0,
        totalTasks: 0,
        successRate: 0,
        mostActiveAgent: 'none',
        toolUsageStats: []
      },
      agentPerformance: [],
      insights: [],
      recommendations: ['データが不足しています。より多くのセッションを実行してください。']
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.analysisCache.clear();
    console.log('[SessionAnalyzer] 分析キャッシュをクリアしました');
  }
}

/**
 * 異常検知クラス
 */
class AnomalyDetector {
  private threshold: number;
  private baseline: {
    avgTaskDuration: number;
    successRate: number;
    tokensPerMinute: number;
  };
  
  constructor(
    threshold: number,
    baseline: { avgTaskDuration: number; successRate: number; tokensPerMinute: number }
  ) {
    this.threshold = threshold;
    this.baseline = baseline;
  }

  /**
   * 異常を検知
   */
  async detectAnomalies(
    sessions: ClaudeSession[],
    performanceBaseline: Map<string, number>
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    if (sessions.length < 5) {
      return anomalies; // データが不足している場合はスキップ
    }
    
    // 統計的異常検知
    const statisticalAnomalies = this.detectStatisticalAnomalies(sessions);
    anomalies.push(...statisticalAnomalies);
    
    // パフォーマンス異常検知
    const performanceAnomalies = this.detectPerformanceAnomalies(sessions);
    anomalies.push(...performanceAnomalies);
    
    // 行動パターン異常検知
    const behaviorAnomalies = this.detectBehaviorAnomalies(sessions);
    anomalies.push(...behaviorAnomalies);
    
    return anomalies;
  }

  /**
   * 統計的異常検知
   */
  private detectStatisticalAnomalies(sessions: ClaudeSession[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    // セッション時間の異常検知
    const durations = sessions.filter(s => s.duration).map(s => s.duration!);
    if (durations.length > 0) {
      const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      
      const outliers = durations.filter(d => Math.abs(d - mean) > this.threshold * stdDev);
      
      if (outliers.length > 0) {
        anomalies.push({
          type: 'performance',
          severity: outliers.length > durations.length * 0.1 ? 'high' : 'medium',
          description: `${outliers.length}個のセッションが異常な実行時間を示しています`,
          affectedSessions: [], // セッションIDは省略
          confidence: Math.min(outliers.length / durations.length, 1),
          recommendations: [
            'セッション時間の異常値を調査してください',
            'リソース使用量を確認してください'
          ]
        });
      }
    }
    
    return anomalies;
  }

  /**
   * パフォーマンス異常検知
   */
  private detectPerformanceAnomalies(sessions: ClaudeSession[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    // 成功率の異常検知
    const successRates = sessions.map(s => s.totalTasks > 0 ? s.completedTasks / s.totalTasks : 0);
    const avgSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
    
    if (avgSuccessRate < this.baseline.successRate * 0.7) {
      anomalies.push({
        type: 'performance',
        severity: avgSuccessRate < this.baseline.successRate * 0.5 ? 'critical' : 'high',
        description: `平均成功率が基準値を大幅に下回っています: ${(avgSuccessRate * 100).toFixed(1)}%`,
        affectedSessions: sessions.map(s => s.sessionId),
        confidence: 0.9,
        recommendations: [
          'システム設定を確認してください',
          'エラーログを詳細に調査してください',
          'リソース不足がないか確認してください'
        ]
      });
    }
    
    return anomalies;
  }

  /**
   * 行動パターン異常検知
   */
  private detectBehaviorAnomalies(sessions: ClaudeSession[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    // エージェント活動パターンの分析
    const hourlyActivity: Record<number, number> = {};
    
    for (const session of sessions) {
      const hour = session.startTime.getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    }
    
    // 異常な活動時間を検出
    const unusualHours = Object.entries(hourlyActivity)
      .filter(([hour, count]) => {
        const h = parseInt(hour);
        return (h < 6 || h > 22) && count > sessions.length * 0.1; // 深夜早朝の活動が10%以上
      });
    
    if (unusualHours.length > 0) {
      anomalies.push({
        type: 'behavior',
        severity: 'medium',
        description: `異常な時間帯での活動が検出されました: ${unusualHours.map(([h]) => h + '時').join(', ')}`,
        affectedSessions: [],
        confidence: 0.7,
        recommendations: [
          '夜間・早朝の自動実行スケジュールを確認してください',
          'セキュリティログを確認してください'
        ]
      });
    }
    
    return anomalies;
  }
}