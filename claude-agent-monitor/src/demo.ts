/**
 * Claude Agent Monitor - Demo/Test Script
 * エージェント追跡システムのデモンストレーション
 * セキュリティファーストでシンプルな動作確認
 */

import { ClaudeLogParser } from './parser/log-parser.js';
import { DataManager } from './storage/data-manager.js';
import { SessionAnalyzer } from './analytics/session-analyzer.js';
import { AgentTracker } from './tracker/agent-tracker.js';
import { AgentType } from './types/index.js';
import { performance } from 'perf_hooks';

/**
 * デモンストレーション実行
 */
async function runDemo(): Promise<void> {
  console.log('🚀 Claude Agent Monitor デモンストレーション開始\n');
  
  const startTime = performance.now();
  
  try {
    // 1. データマネージャーを初期化
    console.log('📁 データマネージャーを初期化中...');
    const dataManager = new DataManager({
      baseDirectory: './demo-data',
      compression: true,
      retentionDays: 7
    });
    
    await dataManager.initialize();
    console.log('✅ データマネージャー初期化完了\n');
    
    // 2. ログパーサーでセッションを読み込み
    console.log('📜 セッションログを解析中...');
    const logParser = new ClaudeLogParser(process.cwd());
    const sessions = await logParser.parseSessionLogs();
    
    console.log(`✅ ${sessions.length}個のセッションを発見\n`);
    
    // 3. セッションデータを保存
    if (sessions.length > 0) {
      console.log('💾 セッションデータを保存中...');
      
      for (const session of sessions.slice(0, 3)) { // 最初の3セッションのみテスト
        await dataManager.saveSession(session);
      }
      
      console.log('✅ セッションデータ保存完了\n');
    }
    
    // 4. セッション分析を実行
    console.log('📊 セッション分析を実行中...');
    const sessionAnalyzer = new SessionAnalyzer(dataManager);
    
    const analysisResult = await sessionAnalyzer.analyzeSessionData();
    
    console.log('✅ 分析完了\n');
    
    // 5. 結果を表示
    console.log('📊 分析結果:');
    console.log('=' .repeat(50));
    
    const summary = analysisResult.sessionSummary;
    console.log(`総セッション数: ${summary.totalSessions}`);
    console.log(`平均セッション時間: ${summary.averageSessionDuration}秒`);
    console.log(`総タスク数: ${summary.totalTasks}`);
    console.log(`成功率: ${(summary.successRate * 100).toFixed(1)}%`);
    console.log(`最もアクティブなエージェント: ${summary.mostActiveAgent}`);
    
    if (analysisResult.agentPerformance.length > 0) {
      console.log('\n👥 エージェントパフォーマンス (上位5名):');
      
      for (let i = 0; i < Math.min(5, analysisResult.agentPerformance.length); i++) {
        const agent = analysisResult.agentPerformance[i];
        console.log(`  ${i + 1}. ${agent.agentId}:`);
        console.log(`     タスク数: ${agent.tasksCompleted}, 成功率: ${(agent.successRate * 100).toFixed(1)}%, 効率: ${agent.efficiency}`);
      }
    }
    
    if (analysisResult.insights.length > 0) {
      console.log('\n💡 主要なインサイト:');
      
      for (let i = 0; i < Math.min(3, analysisResult.insights.length); i++) {
        const insight = analysisResult.insights[i];
        console.log(`  • ${insight.title}: ${insight.description}`);
      }
    }
    
    if (analysisResult.recommendations.length > 0) {
      console.log('\n📋 推奨事項:');
      
      for (let i = 0; i < Math.min(3, analysisResult.recommendations.length); i++) {
        console.log(`  ${i + 1}. ${analysisResult.recommendations[i]}`);
      }
    }
    
    // 6. エージェントトラッカーのデモ（簡易版）
    console.log('\n🎯 エージェントトラッカーデモを開始...');
    
    const tracker = new AgentTracker(
      process.cwd(),
      dataManager,
      {
        enableRealTimeMetrics: true,
        enableSecurity: true,
        logLevel: 'info'
      }
    );
    
    await tracker.startTracking();
    
    // テスト用のエージェント活動をシミュレート
    const taskId = await tracker.trackAgentActivity(
      'backend-developer',
      'backend-developer' as AgentType,
      'デモタスク: API開発'
    );
    
    console.log(`✅ エージェントタスク開始: ${taskId}`);
    
    // 2秒待機してタスクを完了
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await tracker.completeAgentActivity(taskId, true);
    console.log(`✅ エージェントタスク完了: ${taskId}`);
    
    // トラッキング状態を表示
    const trackingStatus = tracker.getTrackingStatus();
    console.log('\n📈 トラッキング状態:');
    console.log(`  追跡中: ${trackingStatus.isTracking}`);
    console.log(`  アクティブセッション: ${trackingStatus.activeSessions}`);
    console.log(`  実行中タスク: ${trackingStatus.totalActivities}`);
    console.log(`  メモリ使用量: ${trackingStatus.memoryUsage} MB`);
    
    const performanceMetrics = tracker.getPerformanceMetrics();
    if (Object.keys(performanceMetrics).length > 0) {
      console.log('\n⚡ パフォーマンスメトリクス:');
      for (const [key, metrics] of Object.entries(performanceMetrics)) {
        console.log(`  ${key}: 平均 ${metrics.avg}ms, 最大 ${metrics.max}ms, 回数 ${metrics.count}`);
      }
    }
    
    // トラッカーを停止
    await tracker.stopTracking();
    console.log('✅ エージェントトラッカー停止');
    
    // 7. ストレージメトリクスを表示
    const storageMetrics = dataManager.getStorageMetrics();
    console.log('\n💾 ストレージ統計:');
    console.log(`  総ファイル数: ${storageMetrics.totalFiles}`);
    console.log(`  総データサイズ: ${formatBytes(storageMetrics.totalSize)}`);
    console.log(`  読み取り操作: ${storageMetrics.readOperations}`);
    console.log(`  書き込み操作: ${storageMetrics.writeOperations}`);
    
    // クリーンアップ
    await dataManager.shutdown();
    
    const elapsedTime = performance.now() - startTime;
    console.log('\n' + '='.repeat(50));
    console.log(`✅ デモンストレーション完了! (実行時間: ${elapsedTime.toFixed(2)}ms)`);
    console.log('\n📚 結論: Claude Agent Monitor の中核機能が正常に動作しています。');
    console.log('🚀 セキュリティファーストで高性能なエージェント追跡システムの完成です！');
    
  } catch (error) {
    console.error('❌ デモンストレーションエラー:', error);
    process.exit(1);
  }
}

/**
 * バイト数をフォーマット
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };